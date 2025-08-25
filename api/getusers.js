const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

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

    await sql.connect(config);

    const result = await sql.query`
      SELECT 
        u.id,
        u.name,
        u.username,
        l.id as level_id,
        l.level_Name
      FROM LOG_ENTRIES_USER u
      LEFT JOIN LOG_ENTRIES_USER_LEVEL ul ON u.id = ul.User_id
      LEFT JOIN LOG_ENTRIES_LEVELS l ON ul.level_id = l.id
      ORDER BY u.id ASC
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        users: result.recordset
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch users: ' + error.message 
      })
    };
  } finally {
    await sql.close();
  }
};