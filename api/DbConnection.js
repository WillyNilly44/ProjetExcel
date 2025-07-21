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
    requestTimeout: 60000, // Increased for Vercel
    connectionTimeout: 60000, // Increased for Vercel
    packetSize: 32768,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  }
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let pool;

  try {
    console.log('🔌 Connecting to database...');
    console.log('Server:', config.server);
    console.log('Database:', config.database);
    
    pool = await sql.connect(config);
    console.log('✅ Database connected successfully');
    
    // Main query with recurrence data
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
    
    const columnResult = await pool.request().query(columnQuery);
    
    console.log(`✅ Retrieved ${data.length} records`);
    
    return res.status(200).json({
      success: true,
      data: data,
      columns: columnResult.recordset,
      totalRecords: data.length,
      server: config.server,
      database: config.database,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      originalError: error.originalError?.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('⚠️ Error closing connection:', closeError);
      }
    }
  }
}