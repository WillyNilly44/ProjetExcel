const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    console.log('🗑 Deleting log entry...');
    
    const requiredEnvVars = ['AWS_RDS_HOST', 'AWS_RDS_DATABASE', 'AWS_RDS_USER', 'AWS_RDS_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Parse request body
    const requestData = JSON.parse(event.body);
    const entryId = requestData.id;

    if (!entryId) {
      throw new Error('Entry ID is required');
    }

    console.log('🔍 Deleting entry with ID:', entryId);

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

    console.log('📡 Connecting to database...');
    const pool = await sql.connect(config);
    console.log('✅ Connected to AWS RDS');

    // First, check if entry exists
    const checkQuery = 'SELECT id FROM LOG_ENTRIES WHERE id = @entryId';
    const checkRequest = pool.request();
    checkRequest.input('entryId', sql.Int, entryId);
    
    const checkResult = await checkRequest.query(checkQuery);
    
    if (checkResult.recordset.length === 0) {
      throw new Error(`Entry with ID ${entryId} not found`);
    }

    // Delete the entry
    const deleteQuery = 'DELETE FROM LOG_ENTRIES WHERE id = @entryId';
    const deleteRequest = pool.request();
    deleteRequest.input('entryId', sql.Int, entryId);
    
    console.log('🗑 Executing DELETE query...');
    const result = await deleteRequest.query(deleteQuery);
    
    console.log(`✅ Entry deleted. Rows affected: ${result.rowsAffected[0]}`);

    // Close connection
    await pool.close();
    console.log('✅ Connection closed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Log entry deleted successfully',
        deletedId: entryId,
        rowsAffected: result.rowsAffected[0],
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Failed to delete log entry:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      })
    };
  }
};