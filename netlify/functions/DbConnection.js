const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    
    const requiredEnvVars = ['AWS_RDS_HOST', 'AWS_RDS_DATABASE', 'AWS_RDS_USER', 'AWS_RDS_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

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

    const pool = await sql.connect(config);
    
    // ✅ FIXED: Get actual column names from the table
    const columnQuery = `
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columnResult = await pool.request().query(columnQuery);
    const columns = columnResult.recordset;
    
    if (columns.length === 0) {
      throw new Error('No columns found for LOG_ENTRIES table. Check if table exists.');
    }
    
    // ✅ FIXED: Build SELECT query with actual column names
    const columnNames = columns.map(col => `[${col.COLUMN_NAME}]`).join(', ');
    
    const dataQuery = `
      SELECT TOP 100 ${columnNames}
      FROM LOG_ENTRIES
      ORDER BY [id] DESC
    `;
    
    const dataResult = await pool.request().query(dataQuery);
    await pool.close();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully retrieved ${dataResult.recordset.length} log entries`,
        data: dataResult.recordset,
        columns: columns,
        server: config.server,
        database: config.database,
        totalRecords: dataResult.recordset.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Database operation failed:', error);

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