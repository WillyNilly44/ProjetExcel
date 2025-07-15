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
    await sql.connect(config);
    
    // ✅ FIXED: Order by date DESC (newest first)
    const query = `
      SELECT 
        le.*,
        CASE WHEN ler.day_of_the_week IS NOT NULL THEN 1 ELSE 0 END as is_recurring,
        ler.day_of_the_week as recurrence_day
      FROM LOG_ENTRIES le
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.log_entry_id
      ORDER BY le.log_date DESC, le.id DESC
    `;
    
    const result = await sql.query(query);
    const data = result.recordset;
    
    // Get column information
    const columnQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columnResult = await sql.query(columnQuery);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        columns: columnResult.recordset,
        totalRecords: data.length,
        server: config.server,
        database: config.database,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Database query failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
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