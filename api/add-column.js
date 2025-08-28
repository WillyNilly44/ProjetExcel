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

  try {
    const { columnData, user } = JSON.parse(event.body);

    // Validate required fields
    if (!columnData || !columnData.name || !columnData.dataType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Column name and data type are required'
        })
      };
    }

    // Validate user authentication
    if (!user || (!user.email && !user.username)) {
      console.log('Authentication failed - missing user data:', user);
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User authentication required'
        })
      };
    }

    await sql.connect(config);

    // Verify user permissions - only allow admin users
    const userRequest = new sql.Request();
    const userIdentifier = user.email || user.username;
    console.log('Looking up user:', userIdentifier);
    
    userRequest.input('username', sql.NVarChar(255), userIdentifier);
    
    const userResult = await userRequest.query(`
      SELECT u.*, l.level_Name 
      FROM users u 
      LEFT JOIN access_levels l ON u.level_id = l.id 
      WHERE u.username = @username OR u.email = @username
    `);

    console.log('User query result:', userResult.recordset);

    if (userResult.recordset.length === 0) {
      console.log('User not found in database for identifier:', userIdentifier);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User not found in database'
        })
      };
    }

    const userData = userResult.recordset[0];
    
    // Check if user has admin privileges (Administrator or Super Admin)
    const adminLevels = ['Administrator', 'Super Admin'];
    if (!adminLevels.includes(userData.level_Name)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Admin privileges required to add columns. Your level: ${userData.level_Name}`
        })
      };
    }

    // Build the ALTER TABLE query
    const tableName = 'log_entries'; // Assuming this is your main table
    let dataTypeDefinition = columnData.dataType.toUpperCase();
    
    // Handle data types with length/precision
    if (columnData.maxLength) {
      if (columnData.dataType === 'nvarchar' || columnData.dataType === 'varchar') {
        dataTypeDefinition += `(${columnData.maxLength})`;
      } else if (columnData.dataType === 'decimal') {
        dataTypeDefinition += `(${columnData.maxLength})`;
      }
    }

    // Build the full column definition
    let columnDefinition = `[${columnData.name}] ${dataTypeDefinition}`;
    
    // Add NULL/NOT NULL constraint
    columnDefinition += columnData.isNullable ? ' NULL' : ' NOT NULL';
    
    // Add default value if specified
    if (columnData.defaultValue && columnData.defaultValue.trim() !== '') {
      if (columnData.dataType === 'nvarchar' || columnData.dataType === 'varchar' || columnData.dataType === 'text') {
        columnDefinition += ` DEFAULT '${columnData.defaultValue.replace(/'/g, "''")}'`;
      } else {
        columnDefinition += ` DEFAULT ${columnData.defaultValue}`;
      }
    }

    // Execute the ALTER TABLE command
    const alterRequest = new sql.Request();
    const alterQuery = `ALTER TABLE [${tableName}] ADD ${columnDefinition}`;
    
    console.log('Executing SQL:', alterQuery);
    
    await alterRequest.query(alterQuery);

    // Log the column addition for audit purposes
    const logRequest = new sql.Request();
    logRequest.input('userId', sql.Int, userData.id);
    logRequest.input('action', sql.NVarChar(255), 'ADD_COLUMN');
    logRequest.input('details', sql.NVarChar(sql.MAX), JSON.stringify({
      columnName: columnData.name,
      dataType: columnData.dataType,
      maxLength: columnData.maxLength,
      isNullable: columnData.isNullable,
      defaultValue: columnData.defaultValue,
      description: columnData.description,
      tableName: tableName
    }));
    logRequest.input('timestamp', sql.DateTime, new Date());

    // Try to log the action (don't fail if logging fails)
    try {
      await logRequest.query(`
        INSERT INTO audit_log (user_id, action, details, timestamp)
        VALUES (@userId, @action, @details, @timestamp)
      `);
    } catch (logError) {
      console.warn('Failed to log audit entry:', logError.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Column '${columnData.name}' added successfully to ${tableName}`,
        columnData: {
          name: columnData.name,
          dataType: dataTypeDefinition,
          isNullable: columnData.isNullable,
          defaultValue: columnData.defaultValue,
          description: columnData.description
        }
      })
    };

  } catch (error) {
    console.error('Error adding column:', error);
    
    let errorMessage = 'Failed to add column';
    
    // Handle specific SQL errors
    if (error.message.includes('already exists')) {
      errorMessage = `Column '${columnData?.name}' already exists in the table`;
    } else if (error.message.includes('Invalid column name')) {
      errorMessage = `Invalid column name: '${columnData?.name}'`;
    } else if (error.message.includes('Invalid data type')) {
      errorMessage = `Invalid data type: '${columnData?.dataType}'`;
    } else if (error.originalError) {
      errorMessage = error.originalError.info?.message || error.message;
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  } finally {
    try {
      await sql.close();
    } catch (closeError) {
      console.warn('Error closing SQL connection:', closeError);
    }
  }
};