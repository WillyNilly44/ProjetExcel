const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'DELETE') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { id } = JSON.parse(event.body);

    if (!id) {
      return {
        statusCode: 400,
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

    await sql.connect(config);


    const result = await sql.query`
      DELETE FROM LOG_ENTRIES_USER WHERE id = ${id}
    `;

    if (result.rowsAffected[0] === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ 
          success: false, 
          error: 'User not found' 
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      })
    };

  } catch (error) {
    console.error('Delete user error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to delete user: ' + error.message 
      })
    };
  } finally {
    await sql.close();
  }
};