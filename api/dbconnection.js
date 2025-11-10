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
    requestTimeout: 60000,
    connectionTimeout: 60000, 
    packetSize: 32768,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  }
};

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
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
    pool = await sql.connect(config);
    
    // Query with LEFT JOINs to include recurrence, application fields, and approval status
    const query = `
      SELECT 
        le.id,
        le.incident,
        le.district,
        le.log_date,
        le.maintenance_event,
        le.incident_event,
        le.business_impact,
        le.root_call_analysis,
        le.estimated_time,
        
        -- FIXED: Cast time fields as VARCHAR to preserve exact values
        CAST(le.time_start AS VARCHAR(8)) as time_start,
        CAST(le.time_end AS VARCHAR(8)) as time_end,
        
        le.real_business_impact,
        le.duration,
        le.ticket_number,
        le.assigned,
        le.log_status,
        le.note,
        le.risk_level,
        le.expected_down_time,
        le.log_type,
        le.uploader,
        
        -- Recurrence info
        CASE WHEN ler.day_of_the_week IS NOT NULL OR ler.day_of_the_month IS NOT NULL THEN 1 ELSE 0 END as is_recurring,
        ler.recurrence_type,
        ler.day_of_the_week as recurrence_day_of_week,
        ler.day_of_the_month as recurrence_day_of_month,
        ler.monthly_pattern as recurrence_monthly_pattern,
        
        -- Application Fields (will be null if no application data exists)
        af.company as app_company,
        af.ticket_number as app_ticket_number,
        af.project_name as app_project_name,
        af.identified_user_impact,
        af.post_maintenance_testing,
        af.rollback_plan,
        af.wiki_diagram_updated,
        af.communication_to_user,
        af.s3_support_ready,
        af.created_by as app_created_by,
        af.created_at as app_created_at,
        
        -- Approval information
        appr.status as approval_status,
        appr.submitted_by as approval_submitted_by,
        appr.submitted_at as approval_submitted_at,
        appr.reviewed_by as approval_reviewed_by,
        appr.reviewed_at as approval_reviewed_at,
        appr.review_comments as approval_comments,
        CASE WHEN appr.id IS NOT NULL THEN 1 ELSE 0 END as has_approval_record
        
      FROM LOG_ENTRIES le
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.log_entry_id
      LEFT JOIN LOG_ENTRIES_APPLICATION_FIELDS af ON le.id = af.log_entry_id
      LEFT JOIN APPROVALS appr ON le.id = appr.log_entry_id
      ORDER BY le.log_date DESC, le.id DESC
    `;
    
    const result = await pool.request().query(query);
    let data = result.recordset;
    
    // Get column info for the main LOG_ENTRIES table
    const columnQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES'
      ORDER BY ORDINAL_POSITION
    `;
    
    const columnResult = await pool.request().query(columnQuery);
    
    // Separate query to get pending approvals count for admin users
    const pendingApprovalsQuery = `
      SELECT COUNT(*) as pending_count
      FROM APPROVALS
      WHERE status = 'pending'
    `;
    
    const pendingResult = await pool.request().query(pendingApprovalsQuery);
    const pendingCount = pendingResult.recordset[0].pending_count;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: data,
        columns: columnResult.recordset,
        totalRecords: data.length,
        pendingApprovals: pendingCount,
        server: config.server,
        database: config.database,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Database error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        code: error.code,
        originalError: error.originalError?.message,
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