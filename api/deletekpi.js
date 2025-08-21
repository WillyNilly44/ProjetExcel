/* filepath: c:\Users\William\Documents\ProjetExcel\api\deletekpi.js */

const sql = require('mssql');

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
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { id, user } = JSON.parse(event.body);


    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'KPI ID is required'
        })
      };
    }

    if (!user || !user.email) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User authentication required'
        })
      };
    }

    await sql.connect(config);

    // Verify user permissions
    const userRequest = new sql.Request();
    userRequest.input('email', sql.NVarChar(255), user.email);
    
    const userResult = await userRequest.query(`
      SELECT u.*, l.level_Name 
      FROM users u 
      LEFT JOIN access_levels l ON u.level_id = l.id 
      WHERE u.username = @email
    `);

    if (userResult.recordset.length === 0) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found in database'
        })
      };
    }

    const dbUser = userResult.recordset[0];
    if (dbUser.level_Name !== 'Administrator') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Administrator privileges required to delete KPI entries'
        })
      };
    }

    // Check if the record exists
    const checkRequest = new sql.Request();
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query('SELECT * FROM LOG_ENTRIES_DASHBOARD WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'KPI entry not found'
        })
      };
    }

    const kpiToDelete = checkResult.recordset[0];

    // Delete the record
    const deleteRequest = new sql.Request();
    deleteRequest.input('id', sql.Int, id);
    const result = await deleteRequest.query('DELETE FROM LOG_ENTRIES_DASHBOARD WHERE id = @id');


    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'KPI dashboard entry deleted successfully',
        id: id,
        deleted_by: user.name || user.email,
        deleted_at: new Date().toISOString(),
        rowsAffected: result.rowsAffected[0]
      })
    };

  } catch (error) {
    console.error('❌ Error deleting dashboard entry:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      })
    };
  } finally {
    try {
      await sql.close();
    } catch (closeError) {
      console.error('⚠️ Error closing database connection:', closeError);
    }
  }
};