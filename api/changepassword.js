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
    const { username, currentPassword, newPassword } = JSON.parse(event.body);

    if (!username || !currentPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Username, current password, and new password are required'
        })
      };
    }

    // Password validation
    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'New password must be at least 8 characters long'
        })
      };
    }

    pool = await sql.connect(config);

    // Get user with current password info
    const getUserQuery = `
      SELECT id, username, password, password_hash, must_change_password
      FROM LOG_ENTRIES_USER 
      WHERE username = @username
    `;

    const userRequest = new sql.Request(pool);
    userRequest.input('username', sql.VarChar(10), username);
    const userResult = await userRequest.query(getUserQuery);


    if (userResult.recordset.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found'
        })
      };
    }

    const user = userResult.recordset[0];

    let isCurrentPasswordValid = false;

    // Verify current password (handle both hashed and plain text)
    if (user.password_hash) {
      isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
    } else if (user.password) {
      isCurrentPasswordValid = (currentPassword === user.password);
    }
    
    
    if (!isCurrentPasswordValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Current password is incorrect'
        })
      };
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Check if new columns exist
    const checkColumnsQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES_USER' 
      AND COLUMN_NAME IN ('password_hash', 'must_change_password', 'password_changed_at')
    `;
    
    const columnCheck = await pool.request().query(checkColumnsQuery);
    const existingColumns = columnCheck.recordset.map(row => row.COLUMN_NAME);
    
    
    const hasNewColumns = existingColumns.includes('password_hash');

    // Update password in database
    let updateQuery;
    let updateRequest = new sql.Request(pool);
    
    if (hasNewColumns) {
      // FIXED: Use placeholder instead of NULL to avoid constraint violation
      updateQuery = `
        UPDATE LOG_ENTRIES_USER 
        SET password_hash = @newPasswordHash,
            password = '***HASHED***',
            must_change_password = 0,
            password_changed_at = GETDATE()
        WHERE id = @userId
      `;
      updateRequest.input('newPasswordHash', sql.VarChar(255), newPasswordHash);
    } else {
      // Fallback for old schema - update plain text password
      updateQuery = `
        UPDATE LOG_ENTRIES_USER 
        SET password = @newPassword
        WHERE id = @userId
      `;
      updateRequest.input('newPassword', sql.VarChar(25), newPassword);
    }
    
    updateRequest.input('userId', sql.Int, user.id);
    
    const updateResult = await updateRequest.query(updateQuery);

    // VERIFY THE UPDATE - Let's check what was actually saved
    const verifyQuery = `
      SELECT id, username, password, password_hash, must_change_password
      FROM LOG_ENTRIES_USER 
      WHERE id = @userId
    `;
    
    const verifyRequest = new sql.Request(pool);
    verifyRequest.input('userId', sql.Int, user.id);
    const verifyResult = await verifyRequest.query(verifyQuery);
    

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Password changed successfully',
        debug: {
          hasNewColumns,
          existingColumns,
          userAfterUpdate: verifyResult.recordset[0]
        }
      })
    };

  } catch (error) {
    console.error('Password change error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to change password',
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