const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Database configuration using your exact .env values
const config = {
  server: 'sancoreweb.cdoxgz1zztkn.us-west-2.rds.amazonaws.com',
  database: 'SANCORE',
  user: 'wsauve',
  password: 'zpqhjfW#783',
  port: 1433,
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
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Render.com'
  });
});

// Main database endpoint (replaces your DbConnection.js)
app.post('/api/dbconnection', async (req, res) => {
  let pool;
  
  try {
    console.log('🔌 Connecting to AWS RDS from Render...');
    console.log('- Server:', config.server);
    console.log('- Database:', config.database);
    
    pool = await sql.connect(config);
    console.log('✅ Connected successfully!');
    
    // Your exact query from the Netlify function
    const query = `
      SELECT 
        le.*,
        CASE WHEN ler.day_of_the_week IS NOT NULL THEN 1 ELSE 0 END as is_recurring,
        ler.day_of_the_week as recurrence_day
      FROM LOG_ENTRIES le
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.log_entry_id
      ORDER BY le.log_date DESC, le.id DESC
    `;
    
    const result = await pool.request().query(query);
    const data = result.recordset;
    
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
    
    console.log(`🎉 Success! Retrieved ${data.length} records`);
    
    res.json({
      success: true,
      data: data,
      columns: columnResult.recordset,
      totalRecords: data.length,
      server: config.server,
      database: config.database,
      timestamp: new Date().toISOString(),
      host: 'Render.com'
    });

  } catch (error) {
    console.error('❌ Database error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      server: config.server,
      database: config.database,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Connection closed');
      } catch (closeError) {
        console.error('⚠️ Error closing connection:', closeError);
      }
    }
  }
});

// Add entry endpoint
app.post('/api/addentry', async (req, res) => {
  let pool;

  try {
    const entryData = req.body;
    console.log('📝 Adding new entry:', entryData);

    pool = await sql.connect(config);

    const columns = Object.keys(entryData).filter(key => 
      !['isRecurrence', 'day_of_the_week'].includes(key) && entryData[key] !== undefined
    );
    
    const values = columns.map(col => entryData[col]);
    const placeholders = columns.map((_, index) => `@param${index}`);
    
    const insertQuery = `
      INSERT INTO LOG_ENTRIES (${columns.join(', ')})
      OUTPUT INSERTED.id
      VALUES (${placeholders.join(', ')})
    `;

    const request = pool.request();
    columns.forEach((col, index) => {
      request.input(`param${index}`, values[index]);
    });

    const result = await request.query(insertQuery);
    const newEntryId = result.recordset[0].id;

    if (entryData.isRecurrence && entryData.day_of_the_week) {
      const recurrenceQuery = `
        INSERT INTO LOG_ENTRIES_RECURRENCES (log_entry_id, day_of_the_week)
        VALUES (@entryId, @dayOfWeek)
      `;

      await pool.request()
        .input('entryId', newEntryId)
        .input('dayOfWeek', entryData.day_of_the_week)
        .query(recurrenceQuery);
    }

    console.log(`✅ Entry added successfully with ID: ${newEntryId}`);

    res.json({
      success: true,
      id: newEntryId,
      message: 'Entry added successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error adding entry:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('⚠️ Error closing connection:', closeError);
      }
    }
  }
});

// Delete entry endpoint
app.post('/api/deleteentry', async (req, res) => {
  let pool;

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Entry ID is required'
      });
    }

    console.log(`🗑️ Deleting entry with ID: ${id}`);

    pool = await sql.connect(config);

    await pool.request()
      .input('entryId', id)
      .query('DELETE FROM LOG_ENTRIES_RECURRENCES WHERE log_entry_id = @entryId');

    const result = await pool.request()
      .input('entryId', id)
      .query('DELETE FROM LOG_ENTRIES WHERE id = @entryId');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    console.log(`✅ Entry ${id} deleted successfully`);

    res.json({
      success: true,
      message: 'Entry deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error deleting entry:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('⚠️ Error closing connection:', closeError);
      }
    }
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Ready to connect to AWS RDS database`);
});