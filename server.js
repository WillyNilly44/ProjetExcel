require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));


const config = {
  server: process.env.AWS_RDS_HOST,
  database: process.env.AWS_RDS_DATABASE,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD,
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
    acquireTimeoutMillis: 60000,
  }
};

if (!config.server || !config.database || !config.user || !config.password) {
  console.error('❌ Missing required database environment variables!');
  console.error('Required: AWS_RDS_HOST, AWS_RDS_DATABASE, AWS_RDS_USER, AWS_RDS_PASSWORD');
  process.exit(1);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    server: 'Render.com',
    database: 'AWS RDS Connected',
    environment: process.env.NODE_ENV || 'development'
  });
});

const loginHandler = require('./api/loginuser');
const dbConnectionHandler = require('./api/dbconnection');
const addEntryHandler = require('./api/addentryrec');
const deleteEntryHandler = require('./api/deleteentry');
const updateEntryHandler = require('./api/updateentry');
const getUsersHandler = require('./api/getusers');
const getUserLevelHandler = require('./api/getuserlevel');
const addUserHandler = require('./api/adduser');
const updateUserHandler = require('./api/updateuser');
const deleteUserHandler = require('./api/deleteuser');
const validateUserHandler = require('./api/validateuser');
const getDashboardHandler = require('./api/getdashboard');
const thresholdRoutes = require('./api/thresholds');

app.post('/api/loginuser', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await loginHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.post('/api/dbconnection', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await dbConnectionHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.post('/api/addentryrec', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await addEntryHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

// Update the delete entry endpoint
app.delete('/api/deleteentry', async (req, res) => {
  try {
    const { id, user } = req.body;
    
    // Verify user information
    if (!user || !user.email) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Check if user has Administrator privileges
    if (!sql.connected) {
      await sql.connect(config);
    }

    const userRequest = new sql.Request();
    userRequest.input('email', sql.NVarChar(255), user.email);
    
    const userResult = await userRequest.query(`
      SELECT u.*, l.level_Name 
      FROM users u 
      LEFT JOIN access_levels l ON u.level_id = l.id 
      WHERE u.username = @email
    `);

    if (userResult.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'User not found in database'
      });
    }

    const dbUser = userResult.recordset[0];
    const userLevel = dbUser.level_Name;

    // Check if user is Administrator
    if (userLevel !== 'Administrator') {
      console.log(`❌ Delete attempt denied for ${user.name} (${user.email}) - Level: ${userLevel}`);
      return res.status(403).json({
        success: false,
        error: 'Administrator privileges required to delete entries'
      });
    }

    // Proceed with deletion
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Entry ID is required'
      });
    }

    const deleteRequest = new sql.Request();
    deleteRequest.input('id', sql.Int, parseInt(id));
    
    // First check if entry exists
    const checkResult = await deleteRequest.query('SELECT * FROM LOG_ENTRIES WHERE id = @id');
    
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    const entryToDelete = checkResult.recordset[0];
    
    // Delete the entry
    await deleteRequest.query('DELETE FROM LOG_ENTRIES WHERE id = @id');
    
    console.log(`✅ Entry ${id} deleted successfully by Administrator ${user.name} (${user.email})`);
    console.log(`📋 Deleted entry details:`, {
      id: entryToDelete.id,
      incident: entryToDelete.incident,
      district: entryToDelete.district,
      log_date: entryToDelete.log_date
    });

    res.json({
      success: true,
      message: `Entry ${id} deleted successfully`,
      deleted_by: user.name,
      deleted_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Delete entry error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/updateentry', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await updateEntryHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.get('/api/getusers', async (req, res) => {
  const event = {
    httpMethod: 'GET',
    headers: req.headers
  };
  const result = await getUsersHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.get('/api/getuserlevel', async (req, res) => {
  const event = {
    httpMethod: 'GET',
    headers: req.headers
  };
  const result = await getUserLevelHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.post('/api/adduser', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await addUserHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.put('/api/updateuser', async (req, res) => {
  const event = {
    httpMethod: 'PUT',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await updateUserHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.delete('/api/deleteuser', async (req, res) => {
  const event = {
    httpMethod: 'DELETE',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await deleteUserHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.post('/api/validateuser', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await validateUserHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

app.post('/api/getdashboard', async (req, res) => {
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await getDashboardHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
});

// Add these routes to your existing API file (e.g., server.js or routes.js)

// GET /api/getthresholds - Fetch thresholds from database
app.get('/api/getthresholds', async (req, res) => {
  try {
    console.log('📊 Fetching thresholds from database...');

    // Ensure we're connected to the database
    if (!sql.connected) {
      await sql.connect(config);
    }

    const request = new sql.Request();
    
    const query = `
      SELECT 
        id,
        maintenance_yellow,
        maintenance_red,
        incident_yellow,
        incident_red,
        impact
      FROM LOG_ENTRIES_THRESHOLDS
      ORDER BY id DESC
    `;

    const result = await request.query(query);

    console.log(`✅ Found ${result.recordset.length} threshold records`);

    res.json({
      success: true,
      data: result.recordset,
      message: result.recordset.length > 0 
        ? 'Thresholds loaded successfully' 
        : 'No thresholds found - using defaults'
    });

  } catch (error) {
    console.error('❌ Error fetching thresholds:', error);
    res.status(500).json({
      success: false,
      error: `Database error: ${error.message}`
    });
  }
});

// POST /api/savethresholds - Save thresholds to database
app.post('/api/savethresholds', async (req, res) => {
  try {
    console.log('💾 Saving thresholds to database...');
    console.log('📊 Threshold data:', req.body);

    const { 
      maintenance_yellow, 
      maintenance_red, 
      incident_yellow, 
      incident_red, 
      impact 
    } = req.body;

    // Validate required fields
    if (
      maintenance_yellow === undefined || 
      maintenance_red === undefined || 
      incident_yellow === undefined || 
      incident_red === undefined || 
      impact === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required threshold values'
      });
    }

    // Ensure we're connected to the database
    if (!sql.connected) {
      await sql.connect(config);
    }

    const request = new sql.Request();

    // Check if any thresholds exist
    const checkQuery = 'SELECT COUNT(*) as count FROM LOG_ENTRIES_THRESHOLDS';
    const checkResult = await request.query(checkQuery);
    const hasExistingThresholds = checkResult.recordset[0].count > 0;

    // Create a new request for the main operation
    const mainRequest = new sql.Request();

    let query;
    if (hasExistingThresholds) {
      // Update existing record (assuming single row)
      query = `
        UPDATE LOG_ENTRIES_THRESHOLDS 
        SET 
          maintenance_yellow = @maintenance_yellow,
          maintenance_red = @maintenance_red,
          incident_yellow = @incident_yellow,
          incident_red = @incident_red,
          impact = @impact
        WHERE id = (SELECT TOP 1 id FROM LOG_ENTRIES_THRESHOLDS ORDER BY id DESC)
      `;
    } else {
      // Insert new record
      query = `
        INSERT INTO LOG_ENTRIES_THRESHOLDS 
        (maintenance_yellow, maintenance_red, incident_yellow, incident_red, impact)
        VALUES 
        (@maintenance_yellow, @maintenance_red, @incident_yellow, @incident_red, @impact)
      `;
    }

    // Add parameters to the main request
    mainRequest.input('maintenance_yellow', sql.Int, parseInt(maintenance_yellow) || 0);
    mainRequest.input('maintenance_red', sql.Int, parseInt(maintenance_red) || 0);
    mainRequest.input('incident_yellow', sql.Int, parseInt(incident_yellow) || 0);
    mainRequest.input('incident_red', sql.Int, parseInt(incident_red) || 0);
    mainRequest.input('impact', sql.Int, parseInt(impact) || 0);

    const result = await mainRequest.query(query);

    console.log(`✅ Thresholds ${hasExistingThresholds ? 'updated' : 'inserted'} successfully`);

    res.json({
      success: true,
      message: `Thresholds ${hasExistingThresholds ? 'updated' : 'saved'} successfully`,
      rowsAffected: result.rowsAffected[0]
    });

  } catch (error) {
    console.error('❌ Error saving thresholds:', error);
    res.status(500).json({
      success: false,
      error: `Database error: ${error.message}`
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Ready to connect to AWS RDS database`);
});