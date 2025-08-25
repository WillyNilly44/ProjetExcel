const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { name, username, password, level_id } = JSON.parse(event.body);

    if (!name || !username || !password || !level_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'All fields are required' 
        })
      };
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

    await sql.connect(config);

    const checkUser = await sql.query`
      SELECT id FROM LOG_ENTRIES_USER WHERE username = ${username}
    `;

    if (checkUser.recordset.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Username already exists' 
        })
      };
    }

    const insertUser = await sql.query`
      INSERT INTO LOG_ENTRIES_USER (name, username, password)
      OUTPUT INSERTED.id
      VALUES (${name}, ${username}, ${password})
    `;

    const userId = insertUser.recordset[0].id;

    await sql.query`
      INSERT INTO LOG_ENTRIES_USER_LEVEL (User_id, level_id)
      VALUES (${userId}, ${level_id})
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User created successfully',
        userId: userId
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to add user: ' + error.message 
      })
    };
  } finally {
    await sql.close();
  }
};