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
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  let pool;
  let transaction;

  try {
    const { 
      isRecurrence, 
      recurrence_type, 
      day_of_the_week, 
      day_of_the_month,
      ...formData 
    } = JSON.parse(event.body);
    
    // Clean up any legacy fields
    delete formData.dayOfWeek;
    
    // Connect to database
    pool = await sql.connect(config);
    
    // Check if recurrence columns exist in LOG_ENTRIES table
    const checkColumnsQuery = `
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES' 
      AND COLUMN_NAME IN ('recurrence_type', 'day_of_the_month', 'monthly_pattern')
    `;
    
    const columnCheck = await pool.request().query(checkColumnsQuery);
    const existingColumns = columnCheck.recordset.map(row => row.COLUMN_NAME);
    
    const hasRecurrenceColumns = existingColumns.includes('recurrence_type');
    
    // Start transaction
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      let enhancedFormData = { ...formData };
      
      // Only add recurrence fields if the columns exist
      if (hasRecurrenceColumns) {
        enhancedFormData.recurrence_type = isRecurrence ? recurrence_type : null;
        
        // Handle monthly recurrence fields
        if (isRecurrence && recurrence_type === 'monthly') {
          if (day_of_the_month === 'last' || day_of_the_month === 'last-weekday') {
            enhancedFormData.day_of_the_month = null;
            enhancedFormData.monthly_pattern = day_of_the_month;
          } else {
            enhancedFormData.day_of_the_month = parseInt(day_of_the_month);
            enhancedFormData.monthly_pattern = null;
          }
        } else {
          enhancedFormData.day_of_the_month = null;
          enhancedFormData.monthly_pattern = null;
        }
      }
      
      const columns = Object.keys(enhancedFormData).join(', ');
      const placeholders = Object.keys(enhancedFormData).map((_, index) => `@param${index}`).join(', ');
      
      const insertQuery = `
        INSERT INTO LOG_ENTRIES (${columns})
        OUTPUT INSERTED.id
        VALUES (${placeholders})
      `;
      
      const request = new sql.Request(transaction);
      
      Object.values(enhancedFormData).forEach((value, index) => {
        request.input(`param${index}`, value);
      });
      
      const result = await request.query(insertQuery);
      const insertedId = result.recordset[0].id;
      
      // Insert recurrence data into LOG_ENTRIES_RECURRENCES table if applicable
      if (isRecurrence && insertedId && (recurrence_type === 'weekly' || recurrence_type === 'monthly')) {
        // Check if LOG_ENTRIES_RECURRENCES table exists
        const checkTableQuery = `
          SELECT COUNT(*) as table_count
          FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = 'LOG_ENTRIES_RECURRENCES'
        `;
        
        const tableCheck = await transaction.request().query(checkTableQuery);
        const tableExists = tableCheck.recordset[0].table_count > 0;
        
        if (tableExists) {
          const recurrenceQuery = `
            INSERT INTO LOG_ENTRIES_RECURRENCES (
              log_entry_id, 
              recurrence_type, 
              day_of_the_week, 
              day_of_the_month, 
              monthly_pattern
            )
            VALUES (@logEntryId, @recurrenceType, @dayOfWeek, @dayOfMonth, @monthlyPattern)
          `;
          
          const recurrenceRequest = new sql.Request(transaction);
          recurrenceRequest.input('logEntryId', sql.Int, insertedId);
          recurrenceRequest.input('recurrenceType', sql.VarChar(10), recurrence_type);
          
          // Set weekly recurrence parameters
          if (recurrence_type === 'weekly') {
            recurrenceRequest.input('dayOfWeek', sql.VarChar(12), day_of_the_week);
            recurrenceRequest.input('dayOfMonth', sql.Int, null);
            recurrenceRequest.input('monthlyPattern', sql.VarChar(20), null);
          } 
          // Set monthly recurrence parameters
          else if (recurrence_type === 'monthly') {
            recurrenceRequest.input('dayOfWeek', sql.VarChar(12), null);
            
            if (day_of_the_month === 'last' || day_of_the_month === 'last-weekday') {
              recurrenceRequest.input('dayOfMonth', sql.Int, null);
              recurrenceRequest.input('monthlyPattern', sql.VarChar(20), day_of_the_month);
            } else {
              recurrenceRequest.input('dayOfMonth', sql.Int, parseInt(day_of_the_month));
              recurrenceRequest.input('monthlyPattern', sql.VarChar(20), null);
            }
          }
          
          await recurrenceRequest.query(recurrenceQuery);
        } else {
          console.warn('LOG_ENTRIES_RECURRENCES table does not exist. Recurrence data not saved.');
        }
      }
      
      await transaction.commit();
      
      // Create response message based on recurrence type
      let message = 'Entry created successfully';
      let recurrenceInfo = null;
      
      if (isRecurrence && hasRecurrenceColumns) {
        if (recurrence_type === 'weekly') {
          message = `Entry created with weekly recurrence on ${day_of_the_week}s`;
          recurrenceInfo = {
            type: 'weekly',
            day_of_week: day_of_the_week
          };
        } else if (recurrence_type === 'monthly') {
          if (day_of_the_month === 'last') {
            message = 'Entry created with monthly recurrence on the last day of each month';
            recurrenceInfo = {
              type: 'monthly',
              pattern: 'last day'
            };
          } else if (day_of_the_month === 'last-weekday') {
            message = 'Entry created with monthly recurrence on the last weekday of each month';
            recurrenceInfo = {
              type: 'monthly',
              pattern: 'last weekday'
            };
          } else {
            const ordinalSuffix = getOrdinalSuffix(parseInt(day_of_the_month));
            message = `Entry created with monthly recurrence on the ${day_of_the_month}${ordinalSuffix} of each month`;
            recurrenceInfo = {
              type: 'monthly',
              day_of_month: parseInt(day_of_the_month)
            };
          }
        }
      } else if (isRecurrence && !hasRecurrenceColumns) {
        message = 'Entry created successfully (recurrence features require database migration)';
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message,
          id: insertedId,
          recurrence: recurrenceInfo,
          warning: !hasRecurrenceColumns && isRecurrence ? 'Recurrence features require database migration' : null
        })
      };
      
    } catch (error) {
      if (transaction) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError);
        }
      }
      throw error;
    }
    
  } catch (error) {
    console.error('API Error:', error);
    
    // More detailed error information
    let errorMessage = error.message;
    let errorDetails = 'Unknown error occurred';
    
    if (error.originalError) {
      errorDetails = error.originalError.info?.message || error.originalError.message || errorDetails;
    }
    
    // Check for specific database issues
    if (errorMessage.includes('Invalid column name')) {
      errorMessage = 'Database schema needs to be updated for recurrence features';
      errorDetails = 'Please run the database migration scripts to add recurrence columns';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: errorDetails,
        suggestion: errorMessage.includes('schema') ? 'Run database migration scripts first' : 'Check server logs for details'
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

// Helper function to get ordinal suffix
function getOrdinalSuffix(num) {
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return 'th';
  }
  
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}