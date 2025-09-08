const sql = require('mssql');
const bcrypt = require('bcrypt');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let pool;

  try {
    const { id, name, username, level_id, password, reset_password, must_change_password } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User ID is required'
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

    // Check if user exists
    const checkRequest = new sql.Request(pool);
    checkRequest.input('userId', sql.Int, parseInt(id));
    
    const userExists = await checkRequest.query(`
      SELECT COUNT(*) as count 
      FROM LOG_ENTRIES_USER 
      WHERE id = @userId
    `);

    if (userExists.recordset[0].count === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found'
        })
      };
    }

    // Build update query dynamically based on provided fields
    let updateFields = [];
    const updateRequest = new sql.Request(pool);
    updateRequest.input('userId', sql.Int, parseInt(id));

    if (name !== undefined) {
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
      updateFields.push('name = @name');
      updateRequest.input('name', sql.VarChar(25), name);
    }

    if (username !== undefined) {
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

      // Check if username already exists for other users
      const usernameRequest = new sql.Request(pool);
      usernameRequest.input('username', sql.VarChar(10), username.toUpperCase());
      usernameRequest.input('currentUserId', sql.Int, parseInt(id));
      
      const existingUser = await usernameRequest.query(`
        SELECT COUNT(*) as count 
        FROM LOG_ENTRIES_USER 
        WHERE username = @username AND id != @currentUserId
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

      updateFields.push('username = @username');
      updateRequest.input('username', sql.VarChar(10), username.toUpperCase());
    }

    if (level_id !== undefined) {
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

      updateFields.push('level_id = @levelId');
      updateRequest.input('levelId', sql.Int, parseInt(level_id));
    }

    // Handle password changes and must_change_password flag together
    let passwordChanged = false;
    let mustChangePasswordValue = must_change_password;

    if (password !== undefined || reset_password) {
      const newPassword = password || 'temp123';
      
      if (newPassword.length > 25) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Password must be 25 characters or less'
          })
        };
      }

      // Hash the password
      let hashedPassword = null;
      try {
        const saltRounds = 12;
        hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      } catch (hashError) {
        console.log('Could not hash password, storing as plain text:', hashError.message);
      }

      updateFields.push('password = @password');
      updateRequest.input('password', sql.VarChar(25), newPassword);
      
      if (hashedPassword) {
        updateFields.push('password_hash = @passwordHash');
        updateRequest.input('passwordHash', sql.VarChar(255), hashedPassword);
      }

      passwordChanged = true;

      // If resetting password, force must_change_password to true
      if (reset_password) {
        mustChangePasswordValue = 1;
      }
    }

    // Handle must_change_password flag (only once)
    if (mustChangePasswordValue !== undefined) {
      updateFields.push('must_change_password = @mustChangePassword');
      updateRequest.input('mustChangePassword', sql.Bit, mustChangePasswordValue);
    }

    if (updateFields.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No fields provided for update'
        })
      };
    }

    const updateQuery = `
      UPDATE LOG_ENTRIES_USER 
      SET ${updateFields.join(', ')}
      WHERE id = @userId
    `;

    console.log('Update query:', updateQuery);
    console.log('Update fields:', updateFields);

    await updateRequest.query(updateQuery);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User updated successfully'
      })
    };

  } catch (error) {
    console.error('Update user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to update user: ' + error.message
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