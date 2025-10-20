const sql = require('mssql');

const config = {
  server: process.env.AWS_RDS_HOST?.replace(',1433', ''),
  database: process.env.AWS_RDS_DATABASE,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD?.replace(/"/g, ''),
  port: parseInt(process.env.AWS_RDS_PORT) || 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  }
};

exports.handler = async (event, context) => {
  let pool;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { logEntryId, applicationFields } = JSON.parse(event.body);
    console.log('Adding application fields for entry ID:', logEntryId);
    console.log('Application fields:', applicationFields);

    pool = await sql.connect(config);
    const request = new sql.Request(pool);

    // Simple insert with minimal parameters
    const query = `
      INSERT INTO LOG_ENTRIES_APPLICATION_FIELDS (
        log_entry_id, company, ticket_number, project_name,
        identified_user_impact, post_maintenance_testing, rollback_plan,
        wiki_diagram_updated, communication_to_user, s3_support_ready, 
        created_by
      ) VALUES (
        @logEntryId, @company, @ticketNumber, @projectName,
        @userImpact, @testing, @rollback,
        @wikiUpdated, @communication, @s3Ready,
        @createdBy
      )
    `;

    request.input('logEntryId', sql.Int, logEntryId);
    request.input('company', sql.NVarChar(100), applicationFields.company || '');
    request.input('ticketNumber', sql.NVarChar(50), applicationFields.ticket_number || null);
    request.input('projectName', sql.NVarChar(100), applicationFields.project_name || null);
    request.input('userImpact', sql.NVarChar(sql.MAX), applicationFields.identified_user_impact || null);
    request.input('testing', sql.NVarChar(sql.MAX), applicationFields.post_maintenance_testing || null);
    request.input('rollback', sql.NVarChar(sql.MAX), applicationFields.rollback_plan || null);
    request.input('wikiUpdated', sql.Bit, applicationFields.wiki_diagram_updated || false);
    request.input('communication', sql.NVarChar(sql.MAX), applicationFields.communication_to_user || null);
    request.input('s3Ready', sql.Bit, applicationFields.s3_support_ready || false);
    request.input('createdBy', sql.NVarChar(50), applicationFields.created_by || 'Unknown');

    await request.query(query);
    console.log('Successfully added application fields');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Application fields added successfully'
      })
    };

  } catch (error) {
    console.error('Error adding application fields:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to add application fields: ' + error.message
      })
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing pool:', closeError);
      }
    }
  }
};