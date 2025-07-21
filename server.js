// Load environment variables first
require('dotenv').config();

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

// Database configuration using environment variables
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

// Validate required environment variables
if (!config.server || !config.database || !config.user || !config.password) {
  console.error('❌ Missing required database environment variables!');
  console.error('Required: AWS_RDS_HOST, AWS_RDS_DATABASE, AWS_RDS_USER, AWS_RDS_PASSWORD');
  process.exit(1);
}


// Routes
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

// Import and use your API handlers
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

// Convert your serverless functions to Express routes
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

app.delete('/api/deleteentry', async (req, res) => {
  const event = {
    httpMethod: 'DELETE',
    body: JSON.stringify(req.body),
    headers: req.headers
  };
  const result = await deleteEntryHandler.handler(event, {});
  res.status(result.statusCode).json(JSON.parse(result.body));
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

// Catch-all handler: send back index.html for any non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Ready to connect to AWS RDS database`);
});