const sql = require('mssql');

const config = {
  server: process.env.AWS_RDS_HOST?.replace(',1433', '') || 'sancoreweb.cdoxgz1zznntkn.us-west-2.rds.amazonaws.com',
  database: process.env.AWS_RDS_DATABASE,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD?.replace(/"/g, ''),
  port: parseInt(process.env.AWS_RDS_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 60000,
    connectionTimeout: 60000, 
    packetSize: 32768,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
};

exports.handler = async (event, context) => {

  context.callbackWaitsForEmptyEventLoop = false;
  
  let pool;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔌 Connecting to:', config.server);
    
    pool = await sql.connect(config);
    console.log('✅ Connected successfully');
    
    const query = `
      SELECT 
        le.*,
        CASE WHEN ler.day_of_the_week IS NOT NULL THEN 1 ELSE 0 END as is_recurring,
        ler.day_of_the_week as recurrence_day
      FROM LOG_ENTRIES le
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.log_entry_id
      ORDER BY le.log_date DESC, le.id DESC
    `;
    
    const result = await pool.request().query(query);
    const data = result.recordset;
    
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
    
    const columnResult = await pool.request().query(columnQuery);
    
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
    console.error('❌ Database error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
        originalError: error.originalError?.message,
        timestamp: new Date().toISOString()
      })
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Connection closed');
      } catch (closeError) {
        console.error('⚠️ Error closing connection:', closeError);
      }
    }
  }
};