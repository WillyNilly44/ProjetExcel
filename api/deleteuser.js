const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let pool;

  try {
    const { id } = JSON.parse(event.body);

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

    // Check if user exists and get user info
    const checkRequest = new sql.Request(pool);
    checkRequest.input('userId', sql.Int, parseInt(id));
    
    const userResult = await checkRequest.query(`
      SELECT id, name, username 
      FROM LOG_ENTRIES_USER 
      WHERE id = @userId
    `);

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

    // Delete the user
    const deleteRequest = new sql.Request(pool);
    deleteRequest.input('userId', sql.Int, parseInt(id));
    
    await deleteRequest.query(`
      DELETE FROM LOG_ENTRIES_USER 
      WHERE id = @userId
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `User '${user.username}' deleted successfully`,
        deleted_user: {
          id: user.id,
          name: user.name,
          username: user.username
        }
      })
    };

  } catch (error) {
    console.error('Delete user error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to delete user: ' + error.message
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