const sql = require('mssql');
const bcrypt = require('bcrypt');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let pool;

  try {
    const { username, password } = JSON.parse(event.body);

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Username and password are required'
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

    pool = await sql.connect(config);

    // Get user with level information
    const request = new sql.Request(pool);
    request.input('username', sql.VarChar(10), username.toUpperCase());
    
    const result = await request.query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.password,
        u.password_hash,
        u.level_id,
        u.must_change_password,
        u.password_changed_at,
        l.level_Name
      FROM LOG_ENTRIES_USER u
      LEFT JOIN LOG_ENTRIES_LEVELS l ON u.level_id = l.id
      WHERE u.username = @username
    `);

    if (result.recordset.length === 0) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid username or password'
        })
      };
    }

    const user = result.recordset[0];
    let isPasswordValid = false;

    // Handle both hashed and plain text passwords
    if (user.password_hash) {
      try {
        isPasswordValid = await bcrypt.compare(password, user.password_hash);
      } catch (bcryptError) {
        isPasswordValid = (password === user.password);
      }
    } else if (user.password) {
      isPasswordValid = (password === user.password);
    }

    if (!isPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid username or password'
        })
      };
    }

    // Return user validation result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          level_id: user.level_id,
          level_Name: user.level_Name,
          must_change_password: !!user.must_change_password,
          password_changed_at: user.password_changed_at
        }
      })
    };

  } catch (error) {
    console.error('Validate user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to validate user: ' + error.message
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