const sql = require('mssql');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, error: 'Method not allowed' })
    };
  }

  try {
    
    const requiredEnvVars = ['AWS_RDS_HOST', 'AWS_RDS_DATABASE', 'AWS_RDS_USER', 'AWS_RDS_PASSWORD'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }


    const requestData = JSON.parse(event.body);

    // Extract and filter out non-database fields
    const { applicationFields, isRecurrence, recurrence_type, day_of_the_week, day_of_the_month, userLevel, userId, ...logData } = requestData;

    console.log('Filtered log data:', logData);
    console.log('Application fields:', applicationFields);
    console.log('User level:', userLevel);
    console.log('User ID:', userId);

    // Set pending approval flag for 3rd party users
    if (userLevel === '3rd Party') {
      logData.pending_approval = true;
      
      // Ensure the pending_approval column exists
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
                        WHERE TABLE_NAME = 'LOG_ENTRIES' AND COLUMN_NAME = 'pending_approval')
          BEGIN
            ALTER TABLE LOG_ENTRIES ADD pending_approval BIT DEFAULT 0
          END
        `);
      } catch (columnError) {
        console.log('Column check/creation error (may be normal):', columnError.message);
      }
    } else {
      logData.pending_approval = false;
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

    const pool = await sql.connect(config);

   
    const columns = Object.keys(logData).filter(key => 
      logData[key] !== undefined && 
      logData[key] !== '' && 
      key !== 'applicationFields' && 
      key !== 'isRecurrence' && 
      key !== 'recurrence_type' && 
      key !== 'day_of_the_week' && 
      key !== 'day_of_the_month'
    );
    const columnNames = columns.map(col => `[${col}]`).join(', ');
    const placeholders = columns.map((_, index) => `@param${index}`).join(', ');
    
    const insertQuery = `
      INSERT INTO LOG_ENTRIES (${columnNames})
      VALUES (${placeholders});
      SELECT SCOPE_IDENTITY() as newId;
    `;

    
    const request = pool.request();
    columns.forEach((column, index) => {
      let value = logData[column];
      const columnName = column.toLowerCase();
      
      console.log(`Processing column ${column} (${columnName}): "${value}" (${typeof value})`);
      
      if (typeof value === 'boolean') {
        request.input(`param${index}`, sql.Bit, value);
      } 
      else if (typeof value === 'number' || (!isNaN(parseFloat(value)) && isFinite(value))) {
        request.input(`param${index}`, sql.Int, parseInt(value));
      } 
      else if (typeof value === 'string') {
        // Date-time handling
        if (value.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
          request.input(`param${index}`, sql.DateTime, new Date(value));
        }
        // Date handling
        else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          request.input(`param${index}`, sql.Date, new Date(value + 'T00:00:00'));
        }
        // Time handling - FIXED: Store as string to avoid timezone conversion
        else if ((columnName.includes('time_start') || columnName.includes('time_end') || 
                  columnName.includes('start_time') || columnName.includes('end_time')) &&
                 value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
        
          let timeValue = value;
          
          // Ensure HH:MM:SS format
          if (value.match(/^\d{1,2}:\d{2}$/)) {
            timeValue = value + ':00';
          }
          
          // Pad single digit hours
          if (timeValue.match(/^\d:\d{2}:\d{2}$/)) {
            timeValue = '0' + timeValue;
          }
          
          console.log(`Time field ${columnName}: "${value}" -> "${timeValue}"`);
          
          // FIXED: Use VARCHAR to store time as string - no timezone conversion
          request.input(`param${index}`, sql.VarChar(10), timeValue);
        }
        // Regular string handling
        else {
          request.input(`param${index}`, sql.NVarChar, value);
        }
      } 
      else if (value instanceof Date) {
        request.input(`param${index}`, sql.DateTime, value);
      } 
      else {
        // Convert everything else to string
        const stringValue = value ? value.toString() : '';
        console.log(`Converting ${column} to string: "${stringValue}"`);
        request.input(`param${index}`, sql.NVarChar, stringValue);
      }
    });

    const result = await request.query(insertQuery);
    const newId = result.recordset[0]?.newId;
    
    // If this is a 3rd party user, create a pending entry record
    if (userLevel === '3rd Party' && newId && userId) {
      try {
        // First, ensure the LOG_ENTRIES_PENDING table exists
        const checkTableRequest = pool.request();
        const tableExistsResult = await checkTableRequest.query(`
          SELECT COUNT(*) as count 
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'LOG_ENTRIES_PENDING'
        `);
        
        if (tableExistsResult.recordset[0].count === 0) {
          // Create the table if it doesn't exist
          await pool.request().query(`
            CREATE TABLE LOG_ENTRIES_PENDING (
              id INT IDENTITY(1,1) PRIMARY KEY,
              log_entry_id INT NOT NULL,
              submitted_by INT NOT NULL,
              submitted_at DATETIME2 DEFAULT GETDATE(),
              status NVARCHAR(20) DEFAULT 'pending',
              reviewed_by INT NULL,
              reviewed_at DATETIME2 NULL,
              notes NVARCHAR(MAX) NULL,
              FOREIGN KEY (log_entry_id) REFERENCES LOG_ENTRIES(id)
            )
          `);
          console.log('Created LOG_ENTRIES_PENDING table');
        }
        
        // Now create the pending entry record
        const pendingRequest = pool.request();
        pendingRequest.input('logEntryId', sql.Int, newId);
        pendingRequest.input('submittedBy', sql.Int, userId);
        
        await pendingRequest.query(`
          INSERT INTO LOG_ENTRIES_PENDING (log_entry_id, submitted_by, submitted_at, status)
          VALUES (@logEntryId, @submittedBy, GETDATE(), 'pending')
        `);
        
        console.log(`Created pending entry record for log_entry_id: ${newId}`);
      } catch (pendingError) {
        console.error('Error creating pending entry:', pendingError);
        // Don't fail the whole operation, just log the error
      }
    }

    // Close connection
    await pool.close();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: userLevel === '3rd Party' ? 'Entry submitted for approval successfully' : 'Log entry created successfully',
        id: newId, // Frontend expects this field name
        newId: newId, // Keep for compatibility
        isApplicationLog: logData.log_type === 'Application',
        applicationFields: applicationFields, // Pass through for second API call
        isPending: userLevel === '3rd Party',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {

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