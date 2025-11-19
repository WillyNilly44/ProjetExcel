const sql = require('mssql');

// Add explicit dotenv loading
require('dotenv').config();

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
    requestTimeout: 60000,
    connectionTimeout: 60000, 
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  let pool;
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    
    // Query to get all pending entries with user information
    const query = `
      SELECT 
        -- Main log entry data
        le.id,
        le.incident,
        le.district,
        le.log_date,
        le.time_start,
        le.time_end,
        le.duration,
        le.ticket_number,
        le.assigned,
        le.log_status,
        le.note,
        le.risk_level,
        le.expected_down_time,
        le.log_type,
        le.uploader,
        
        -- Pending info
        lep.id as pending_id,
        lep.status,
        lep.submitted_at,
        lep.submitted_by,
        lep.rejection_reason,
        u.name as submitted_by_name,
        u.username as submitted_by_username,
        
        -- Application Fields
        af.company as app_company,
        af.ticket_number as app_ticket_number,
        af.project_name as app_project_name,
        af.identified_user_impact,
        af.post_maintenance_testing,
        af.rollback_plan,
        af.wiki_diagram_updated,
        af.communication_to_user,
        af.s3_support_ready,
        
        -- Recurrence info
        CASE WHEN ler.day_of_the_week IS NOT NULL OR ler.day_of_the_month IS NOT NULL THEN 1 ELSE 0 END as is_recurring,
        ler.recurrence_type,
        ler.day_of_the_week as recurrence_day_of_week,
        ler.day_of_the_month as recurrence_day_of_month
        
      FROM LOG_ENTRIES le
      INNER JOIN LOG_ENTRIES_PENDING lep ON le.id = lep.log_entry_id
      LEFT JOIN LOG_ENTRIES_APPLICATION_FIELDS af ON le.id = af.log_entry_id
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.log_entry_id
      LEFT JOIN LOG_ENTRIES_USER u ON lep.submitted_by = u.id
      WHERE lep.status = 'pending'
      ORDER BY lep.submitted_at DESC
    `;
    
    const result = await pool.request().query(query);
    
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        entries: result.recordset,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get pending entries error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
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