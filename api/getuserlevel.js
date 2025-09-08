const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { 
      statusCode: 405, 
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  let pool;

  try {
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

    pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT 
        id,
        level_Name
      FROM LOG_ENTRIES_LEVELS
      ORDER BY id ASC
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        levels: result.recordset
      })
    };

  } catch (error) {
    console.error('Get user levels error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch user levels: ' + error.message 
      })
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Failed to close database connection:', closeError);
      }
    }
  }
};