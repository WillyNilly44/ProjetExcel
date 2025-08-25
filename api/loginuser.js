
const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { username, password } = JSON.parse(event.body);

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
        l.level_Name
      FROM LOG_ENTRIES_USER u
      LEFT JOIN LOG_ENTRIES_USER_LEVEL ul ON u.id = ul.User_id
      LEFT JOIN LOG_ENTRIES_LEVELS l ON ul.level_id = l.id
      WHERE u.username = ${username} AND u.password = ${password}
    `;

    if (result.recordset.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ 
          success: false, 
          error: 'Invalid username or password' 
        })
      };
    }

    const user = result.recordset[0];
    
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          level_Name: user.level_Name || 'Guest'
        },
        token
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      })
    };
  } finally {
    await sql.close();
  }
};