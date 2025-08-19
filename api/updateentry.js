const sql = require('mssql');

const host = process.env.AWS_RDS_HOST.replace(',1433', '');

const config = {
  server: host,
  database: process.env.AWS_RDS_DATABASE,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD.replace(/"/g, ''),
  port: parseInt(process.env.AWS_RDS_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, entryId, entryData } = JSON.parse(event.body);

    if (action !== 'update' || !entryId || !entryData) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required parameters'
        })
      };
    }

    await sql.connect(config);

    // First, check what columns actually exist in the table
    const columnCheckQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES'
    `;
    
    const columnCheckResult = await sql.query(columnCheckQuery);
    const existingColumns = columnCheckResult.recordset.map(row => row.COLUMN_NAME.toLowerCase());
    

    const updateFields = [];
    const params = [];
    
    // Exclude these fields from updates
    const excludeFields = ['id', 'created_at', 'updated_at', 'is_virtual', 'original_id'];
    
    Object.keys(entryData).forEach((key, index) => {
      if (!excludeFields.includes(key.toLowerCase()) && 
          entryData[key] !== undefined && 
          existingColumns.includes(key.toLowerCase())) {
        updateFields.push(`[${key}] = @param${index}`);
        params.push({ name: `param${index}`, value: entryData[key], columnName: key });
      }
    });

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No valid fields to update'
        })
      };
    }

    // Only add updated timestamp if the column exists
    if (existingColumns.includes('updated_at')) {
      updateFields.push(`[updated_at] = GETDATE()`);
    } else if (existingColumns.includes('updated_date')) {
      updateFields.push(`[updated_date] = GETDATE()`);
    }
    // If neither exists, just don't add a timestamp update

    const query = `
      UPDATE LOG_ENTRIES 
      SET ${updateFields.join(', ')}
      WHERE id = @entryId
    `;


    const request = new sql.Request();
    request.input('entryId', sql.Int, entryId);
    
    params.forEach(param => {
      let sqlType = sql.NVarChar;
      let value = param.value;
      const columnName = param.columnName.toLowerCase();
      
      if (typeof value === 'number') {
        sqlType = Number.isInteger(value) ? sql.Int : sql.Decimal(10, 2);
      } else if (typeof value === 'boolean') {
        sqlType = sql.Bit;
      } else if (value instanceof Date) {
        sqlType = sql.DateTime;
      } else if (value === null || value === '') {
        sqlType = sql.NVarChar;
        value = null;
      } else if (typeof value === 'string') {
        // Handle time fields specifically
        if (columnName.includes('time') && 
            !columnName.includes('estimated') && 
            !columnName.includes('actual') &&
            !columnName.includes('expected') &&
            !columnName.includes('down') &&
            value.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
          sqlType = sql.Time;
        }
        // Handle date fields
        else if (columnName.includes('date') && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          sqlType = sql.Date;
        }
        // Default to NVarChar for strings
        else {
          sqlType = sql.NVarChar;
        }
      }
      
      request.input(param.name, sqlType, value);
    });

    const result = await request.query(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Entry updated successfully',
        rowsAffected: result.rowsAffected[0],
        entryId: entryId,
        updatedFields: updateFields.length
      })
    };

  } catch (error) {
    console.error('❌ Update entry failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code
      })
    };
  } finally {
    try {
      await sql.close();
    } catch (closeError) {
      console.error('⚠️ Error closing database connection:', closeError);
    }
  }
};