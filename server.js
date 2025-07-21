const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration
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
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
  }
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Render.com',
    database: 'AWS RDS Connected'
  });
});

// 1. LOGIN USER - Convert from LoginUser.js
app.post('/api/loginuser', async (req, res) => {
  let pool;
  
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    console.log('🔐 Login attempt for user:', username);

    pool = await sql.connect(config);

    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .input('password', sql.VarChar, password)
      .query(`
        SELECT 
          u.id,
          u.name,
          u.username,
          l.level_Name
        FROM LOG_ENTRIES_USER u
        LEFT JOIN LOG_ENTRIES_USER_LEVEL ul ON u.id = ul.User_id
        LEFT JOIN LOG_ENTRIES_LEVELS l ON ul.level_id = l.id
        WHERE u.username = @username AND u.password = @password
      `);

    if (result.recordset.length === 0) {
      console.log('❌ Invalid login attempt for:', username);
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password'
      });
    }

    const user = result.recordset[0];
    
    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    console.log('✅ Login successful for user:', username);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        level_Name: user.level_Name || 'Guest'
      },
      token
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
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

// 5. UPDATE ENTRY - Convert from UpdateEntry.js (if you have it)
app.post('/api/updateentry', async (req, res) => {
  let pool;

  try {
    const { id, ...updateData } = req.body;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Entry ID is required'
      });
    }

    console.log(`📝 Updating entry with ID: ${id}`, updateData);

    pool = await sql.connect(config);

    // Build dynamic UPDATE query
    const columns = Object.keys(updateData).filter(key => 
      !['isRecurrence', 'day_of_the_week'].includes(key) && updateData[key] !== undefined
    );
    
    if (columns.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    const setClause = columns.map((col, index) => `${col} = @param${index}`).join(', ');
    
    const updateQuery = `
      UPDATE LOG_ENTRIES 
      SET ${setClause}
      WHERE id = @entryId
    `;

    const request = pool.request();
    request.input('entryId', id);
    columns.forEach((col, index) => {
      request.input(`param${index}`, updateData[col]);
    });

    const result = await request.query(updateQuery);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    // Handle recurrence update
    if (updateData.hasOwnProperty('isRecurrence')) {
      // Delete existing recurrence
      await pool.request()
        .input('entryId', id)
        .query('DELETE FROM LOG_ENTRIES_RECURRENCES WHERE log_entry_id = @entryId');

      // Add new recurrence if specified
      if (updateData.isRecurrence && updateData.day_of_the_week) {
        const recurrenceQuery = `
          INSERT INTO LOG_ENTRIES_RECURRENCES (log_entry_id, day_of_the_week)
          VALUES (@entryId, @dayOfWeek)
        `;

        await pool.request()
          .input('entryId', id)
          .input('dayOfWeek', updateData.day_of_the_week)
          .query(recurrenceQuery);
      }
    }

    console.log(`✅ Entry ${id} updated successfully`);

    res.json({
      success: true,
      message: 'Entry updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error updating entry:', error);
    
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

// 6. GET USER LEVELS - For admin functionality
app.get('/api/userlevels', async (req, res) => {
  let pool;

  try {
    console.log('📋 Fetching user levels...');

    pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT 
        id,
        level_Name,
        description
      FROM LOG_ENTRIES_LEVELS
      ORDER BY id
    `);

    console.log(`✅ Retrieved ${result.recordset.length} user levels`);

    res.json({
      success: true,
      data: result.recordset,
      totalRecords: result.recordset.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching user levels:', error);
    
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

// 7. GET ALL USERS - For admin functionality
app.get('/api/users', async (req, res) => {
  let pool;

  try {
    console.log('👥 Fetching all users...');

    pool = await sql.connect(config);

    const result = await pool.request().query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.created_at,
        l.level_Name
      FROM LOG_ENTRIES_USER u
      LEFT JOIN LOG_ENTRIES_USER_LEVEL ul ON u.id = ul.User_id
      LEFT JOIN LOG_ENTRIES_LEVELS l ON ul.level_id = l.id
      ORDER BY u.created_at DESC
    `);

    console.log(`✅ Retrieved ${result.recordset.length} users`);

    res.json({
      success: true,
      data: result.recordset,
      totalRecords: result.recordset.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error fetching users:', error);
    
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

// 11. VALIDATE USER TOKEN - Missing endpoint
app.post('/api/validateuser', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Simple token validation (in production, use JWT verification)
    try {
      const decoded = Buffer.from(token, 'base64').toString();
      const [userId, timestamp] = decoded.split(':');
      
      // Check if token is not too old (24 hours)
      const tokenAge = Date.now() - parseInt(timestamp);
      if (tokenAge > 24 * 60 * 60 * 1000) {
        return res.status(401).json({ 
          success: false, 
          error: 'Token expired' 
        });
      }

      console.log('✅ Token validated for user:', userId);

      res.json({ success: true });
    } catch (e) {
      console.log('❌ Invalid token format');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token' 
      });
    }

  } catch (error) {
    console.error('❌ Token validation error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Ready to connect to AWS RDS database`);
});