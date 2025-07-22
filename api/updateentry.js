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


    const updateFields = [];
    const params = [];
    
 
    const excludeFields = ['id', 'created_at', 'updated_at', 'is_virtual', 'original_id'];
    
    Object.keys(entryData).forEach((key, index) => {
      if (!excludeFields.includes(key.toLowerCase()) && entryData[key] !== undefined) {
        updateFields.push(`${key} = @param${index}`);
        params.push({ name: `param${index}`, value: entryData[key] });
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

    updateFields.push(`updated_at = GETDATE()`);

    const query = `
      UPDATE LOG_ENTRIES 
      SET ${updateFields.join(', ')}
      WHERE id = @entryId
    `;

    const request = new sql.Request();
    request.input('entryId', sql.Int, entryId);
    
    params.forEach(param => {
      let sqlType = sql.NVarChar;
      if (typeof param.value === 'number') {
        sqlType = Number.isInteger(param.value) ? sql.Int : sql.Decimal;
      } else if (typeof param.value === 'boolean') {
        sqlType = sql.Bit;
      } else if (param.value instanceof Date) {
        sqlType = sql.DateTime;
      }
      
      request.input(param.name, sqlType, param.value);
    });

    const result = await request.query(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Entry updated successfully',
        rowsAffected: result.rowsAffected[0],
        entryId: entryId
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