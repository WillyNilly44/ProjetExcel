const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    console.log('🔄 Adding new log entry...');
    
    const requiredEnvVars = ['AWS_RDS_HOST', 'AWS_RDS_DATABASE', 'AWS_RDS_USER', 'AWS_RDS_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Parse request body
    const requestData = JSON.parse(event.body);
    console.log('📝 Entry data received:', Object.keys(requestData));

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

    console.log('📡 Connecting to database...');
    const pool = await sql.connect(config);
    console.log('✅ Connected to AWS RDS');

    // Build INSERT query dynamically
    const columns = Object.keys(requestData).filter(key => requestData[key] !== undefined && requestData[key] !== '');
    const columnNames = columns.map(col => `[${col}]`).join(', ');
    const placeholders = columns.map((_, index) => `@param${index}`).join(', ');
    
    const insertQuery = `
      INSERT INTO LOG_ENTRIES (${columnNames})
      VALUES (${placeholders});
      SELECT SCOPE_IDENTITY() as newId;
    `;

    console.log('🏗 Building query with columns:', columns);
    
    // Create request and add parameters
    const request = pool.request();
    columns.forEach((column, index) => {
      let value = requestData[column];
      const columnName = column.toLowerCase();
      
      console.log(`🔍 Processing column ${column}: ${value} (type: ${typeof value})`);
      
      // Handle different data types
      if (typeof value === 'boolean') {
        request.input(`param${index}`, sql.Bit, value);
      } else if (typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value))) {
        request.input(`param${index}`, sql.Int, parseInt(value));
      } else if (typeof value === 'string') {
        // Handle datetime strings (date + time)
        if (value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          console.log(`📅 DateTime field: ${column} = ${value}`);
          request.input(`param${index}`, sql.DateTime, new Date(value));
        }
        // Handle date-only strings
        else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          console.log(`📅 Date field: ${column} = ${value}`);
          request.input(`param${index}`, sql.Date, new Date(value + 'T00:00:00'));
        }
        // Handle time-only strings (for pure time fields)
        else if (value.match(/^\d{2}:\d{2}(:\d{2})?$/) && 
                 (columnName.includes('start_time') || columnName.includes('end_time'))) {
          console.log(`⏰ Time field: ${column} = ${value}`);
          request.input(`param${index}`, sql.Time, value);
        }
        // Handle regular strings
        else {
          request.input(`param${index}`, sql.NVarChar, value);
        }
      } else if (value instanceof Date) {
        request.input(`param${index}`, sql.DateTime, value);
      } else {
        request.input(`param${index}`, sql.NVarChar, value ? value.toString() : '');
      }
    });

    console.log('💾 Executing INSERT query...');
    const result = await request.query(insertQuery);
    const newId = result.recordset[0]?.newId;
    
    console.log(`✅ New log entry created with ID: ${newId}`);

    // Close connection
    await pool.close();
    console.log('✅ Connection closed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Log entry created successfully',
        newId: newId,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Failed to add log entry:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      })
    };
  }
};