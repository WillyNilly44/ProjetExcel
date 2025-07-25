const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'PUT') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id, name, username, password, level_id, email, department, job_title } = JSON.parse(event.body);

    if (!id || !name || !username || !level_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'ID, name, username, and level are required' 
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

    // Check for duplicate username/email
    const checkUser = await sql.query`
      SELECT id FROM LOG_ENTRIES_USER 
      WHERE (username = ${username} OR email = ${email}) AND id != ${id}
    `;

    if (checkUser.recordset.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          success: false, 
          error: 'Username or email already exists' 
        })
      };
    }

    // Update user information (including SSO fields)
    if (password && password !== 'SSO_USER') {
      // Regular user with password
      await sql.query`
        UPDATE LOG_ENTRIES_USER 
        SET name = ${name}, 
            username = ${username}, 
            password = ${password},
            email = ${email || username},
            department = ${department || 'Unknown'},
            job_title = ${job_title || 'Employee'}
        WHERE id = ${id}
      `;
    } else {
      // SSO user or no password change
      await sql.query`
        UPDATE LOG_ENTRIES_USER 
        SET name = ${name}, 
            username = ${username},
            email = ${email || username},
            department = ${department || 'Unknown'},
            job_title = ${job_title || 'Employee'}
        WHERE id = ${id}
      `;
    }

    // Update user level
    await sql.query`
      UPDATE LOG_ENTRIES_USER_LEVEL 
      SET level_id = ${level_id}
      WHERE User_id = ${id}
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User updated successfully'
      })
    };

  } catch (error) {
    console.error('Update user error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to update user: ' + error.message 
      })
    };
  } finally {
    await sql.close();
  }
};