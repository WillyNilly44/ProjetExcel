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
    const { name, username, password, level_id, must_change_password } = JSON.parse(event.body);

    if (!name || !username || !password || !level_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Name, username, password, and level_id are required'
        })
      };
    }

    // Validate field lengths
    if (name.length > 25) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Name must be 25 characters or less'
        })
      };
    }

    if (username.length > 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Username must be 10 characters or less'
        })
      };
    }

    if (password.length > 25) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Password must be 25 characters or less'
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

    // Check if username already exists
    const checkRequest = new sql.Request(pool);
    checkRequest.input('username', sql.VarChar(10), username.toUpperCase());
    
    const existingUser = await checkRequest.query(`
      SELECT COUNT(*) as count 
      FROM LOG_ENTRIES_USER 
      WHERE username = @username
    `);

    if (existingUser.recordset[0].count > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Username already exists'
        })
      };
    }

    // Check if level_id exists
    const levelRequest = new sql.Request(pool);
    levelRequest.input('levelId', sql.Int, parseInt(level_id));
    
    const levelExists = await levelRequest.query(`
      SELECT COUNT(*) as count 
      FROM LOG_ENTRIES_LEVELS 
      WHERE id = @levelId
    `);

    if (levelExists.recordset[0].count === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid level_id'
        })
      };
    }

    // Hash the password
    let hashedPassword = null;
    try {
      const saltRounds = 12;
      hashedPassword = await bcrypt.hash(password, saltRounds);
    } catch (hashError) {
      console.log('Could not hash password, storing as plain text:', hashError.message);
    }

    // Insert new user
    const insertRequest = new sql.Request(pool);
    insertRequest.input('name', sql.VarChar(25), name);
    insertRequest.input('username', sql.VarChar(10), username.toUpperCase());
    insertRequest.input('password', sql.VarChar(25), password);
    insertRequest.input('passwordHash', sql.VarChar(255), hashedPassword);
    insertRequest.input('levelId', sql.Int, parseInt(level_id));
    insertRequest.input('mustChangePassword', sql.Bit, must_change_password !== undefined ? must_change_password : 1);

    const insertQuery = `
      INSERT INTO LOG_ENTRIES_USER 
      (name, username, password, password_hash, level_id, must_change_password)
      VALUES 
      (@name, @username, @password, @passwordHash, @levelId, @mustChangePassword);
      
      SELECT SCOPE_IDENTITY() as newUserId;
    `;

    const result = await insertRequest.query(insertQuery);
    const newUserId = result.recordset[0].newUserId;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUserId,
          name: name,
          username: username.toUpperCase(),
          level_id: parseInt(level_id),
          must_change_password: must_change_password !== undefined ? must_change_password : 1
        }
      })
    };

  } catch (error) {
    console.error('Add user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create user: ' + error.message
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