const sql = require('mssql');
const bcrypt = require('bcrypt');

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

    pool = await sql.connect(config);

    // Check if LOG_ENTRIES_USER has the new columns
    const checkColumnsQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES_USER' 
      AND COLUMN_NAME IN ('password_hash', 'must_change_password', 'level_id')
    `;
    
    const columnCheck = await pool.request().query(checkColumnsQuery);
    const existingColumns = columnCheck.recordset.map(row => row.COLUMN_NAME);
    
    const hasNewColumns = existingColumns.includes('password_hash');

    // Build query based on available columns
    let getUserQuery;
    if (hasNewColumns) {
      getUserQuery = `
        SELECT u.id, u.name, u.username, u.password, u.password_hash,
               u.must_change_password, u.password_changed_at, u.level_id,
               l.level_Name 
        FROM LOG_ENTRIES_USER u
        LEFT JOIN LOG_ENTRIES_LEVELS l ON u.level_id = l.id
        WHERE u.username = @username
      `;
    } else {
      getUserQuery = `
        SELECT id, name, username, password
        FROM LOG_ENTRIES_USER
        WHERE username = @username
      `;
    }

    const request = new sql.Request(pool);
    request.input('username', sql.VarChar(10), username);
    const result = await request.query(getUserQuery);

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

    // Handle both old plain text and new hashed passwords
    if (hasNewColumns && user.password_hash) {
      // New hashed password system
      isPasswordValid = await bcrypt.compare(password, user.password_hash);

    } else if (user.password) {
      // Legacy plain text password system
      isPasswordValid = (password === user.password);
      // If login successful with plain text, hash the password for future use
      if (isPasswordValid && hasNewColumns) {
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const updateQuery = `
          UPDATE LOG_ENTRIES_USER 
          SET password_hash = @passwordHash 
          WHERE id = @userId
        `;
        
        const updateRequest = new sql.Request(pool);
        updateRequest.input('passwordHash', sql.VarChar(255), hashedPassword);
        updateRequest.input('userId', sql.Int, user.id);
        await updateRequest.query(updateQuery);
      }
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

    // Prepare user data for response
    const userData = {
      id: user.id,
      name: user.name,
      username: user.username,
      level_id: user.level_id || 1,
      level_Name: user.level_Name || 'Viewer',
      must_change_password: hasNewColumns ? !!user.must_change_password : false,
      password_changed_at: user.password_changed_at || null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        user: userData,
        message: 'Login successful'
      })
    };

  } catch (error) {
    console.error('Login error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Login failed',
        details: error.message
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