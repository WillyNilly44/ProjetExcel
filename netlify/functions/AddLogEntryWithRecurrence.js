const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true
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

  try {
    const { isRecurrence, day_of_the_week, ...formData } = JSON.parse(event.body);
    
    // ✅ Remove fields that shouldn't be in LOG_ENTRIES
    delete formData.dayOfWeek; // Remove if present
    
    console.log('📝 Inserting log entry:', formData);
    console.log('🔄 Recurrence data:', { isRecurrence, day_of_the_week });
    
    await sql.connect(config);
    
    const transaction = new sql.Transaction();
    await transaction.begin();
    
    try {
      // 1. Insert into LOG_ENTRIES
      const columns = Object.keys(formData).join(', ');
      const placeholders = Object.keys(formData).map((_, index) => `@param${index}`).join(', ');
      
      const insertQuery = `
        INSERT INTO LOG_ENTRIES (${columns})
        OUTPUT INSERTED.id
        VALUES (${placeholders})
      `;
      
      const request = new sql.Request(transaction);
      
      // Add parameters with proper types
      Object.values(formData).forEach((value, index) => {
        request.input(`param${index}`, value);
      });
      
      const result = await request.query(insertQuery);
      const insertedId = result.recordset[0].id;
      
      console.log('✅ Log entry created with ID:', insertedId);
      
      // 2. Insert recurrence if enabled
      if (isRecurrence && day_of_the_week && insertedId) {
        const recurrenceQuery = `
          INSERT INTO LOG_ENTRIES_RECURRENCES (log_entry_id, day_of_the_week)
          VALUES (@logEntryId, @dayOfWeek)
        `;
        
        const recurrenceRequest = new sql.Request(transaction);
        recurrenceRequest.input('logEntryId', sql.Int, insertedId);
        recurrenceRequest.input('dayOfWeek', sql.VarChar(12), day_of_the_week);
        
        await recurrenceRequest.query(recurrenceQuery);
        console.log('🔄 Recurrence created for:', day_of_the_week);
      }
      
      await transaction.commit();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: isRecurrence 
            ? `Entry created with recurrence on ${day_of_the_week}s`
            : 'Entry created successfully',
          id: insertedId,
          isRecurrence,
          day_of_the_week: isRecurrence ? day_of_the_week : null
        })
      };
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.originalError?.info?.message || 'Unknown database error'
      })
    };
  } finally {
    await sql.close();
  }
};