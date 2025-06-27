const sql = require('mssql');


const debugEnvironment = () => {
  console.log('🔍 Environment Variables Debug:');
  console.log('- AWS_RDS_HOST:', process.env.AWS_RDS_HOST);
  console.log('- AWS_RDS_PORT:', process.env.AWS_RDS_PORT);
  console.log('- AWS_RDS_DATABASE:', process.env.AWS_RDS_DATABASE);
  console.log('- AWS_RDS_USER:', process.env.AWS_RDS_USER);
  console.log('- AWS_RDS_PASSWORD:', process.env.AWS_RDS_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('- Node.js version:', process.version);
  console.log('- Platform:', process.platform);
};


const parseConnectionString = () => {
  const host = process.env.AWS_RDS_HOST;
  if (host && host.includes(',')) {
    const [server, port] = host.split(',');
    return {
      server: server.trim(),
      port: parseInt(port.trim())
    };
  }
  return {
    server: host,
    port: parseInt(process.env.AWS_RDS_PORT) || 1433
  };
};

const { server, port } = parseConnectionString();

const config = {
  server,
  port,
  user: process.env.AWS_RDS_USER,
  password: process.env.AWS_RDS_PASSWORD,
  database: process.env.AWS_RDS_DATABASE,
  options: {
    encrypt: false, 
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 60000,
    requestTimeout: 60000,
    cancelTimeout: 5000,
    connectTimeout: 60000,
    instanceName: ''
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

exports.handler = async (event, context) => {
  debugEnvironment();
  
  console.log('🔧 Parsed connection details:', {
    server,
    port,
    original: process.env.AWS_RDS_HOST,
    config: {
      ...config,
      user: config.user ? '***SET***' : 'NOT SET',
      password: config.password ? '***SET***' : 'NOT SET'
    }
  });

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  const requiredEnvVars = ['AWS_RDS_HOST', 'AWS_RDS_USER', 'AWS_RDS_PASSWORD', 'AWS_RDS_DATABASE'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing environment variables:', missingVars);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Missing environment variables', 
        details: `Missing: ${missingVars.join(', ')}`,
        success: false
      })
    };
  }

  let pool;

  try {
    const { action, data, query, id } = JSON.parse(event.body || '{}');
    
    console.log('🔄 Attempting SQL Server connection with config:', {
      server,
      port,
      database: process.env.AWS_RDS_DATABASE,
      user: process.env.AWS_RDS_USER,
      encrypt: config.options.encrypt,
      trustServerCertificate: config.options.trustServerCertificate
    });

    console.log('🌐 Testing DNS resolution...');
    const dns = require('dns');
    const { promisify } = require('util');
    const lookup = promisify(dns.lookup);
    
    try {
      const dnsResult = await lookup(server);
    } catch (dnsError) {
      console.error('DNS resolution failed:', dnsError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'DNS resolution failed',
          details: `Cannot resolve hostname: ${server}`,
          dnsError: dnsError.message,
          success: false
        })
      };
    }
    
    pool = await sql.connect(config);

    switch (action) {
      case 'TEST_CONNECTION':
        return await testConnection(pool, headers);
      case 'PING_TEST':
        return await pingTest(pool, headers);
      case 'DEBUG_CONFIG':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            config: {
              original_host: process.env.AWS_RDS_HOST,
              parsed_server: server,
              parsed_port: port,
              database: process.env.AWS_RDS_DATABASE || 'MISSING',
              user: process.env.AWS_RDS_USER ? 'SET' : 'MISSING',
              password: process.env.AWS_RDS_PASSWORD ? 'SET' : 'MISSING',
              encrypt: config.options.encrypt,
              trustServerCertificate: config.options.trustServerCertificate,
              connectionTimeout: config.options.connectionTimeout
            }
          })
        };
      default:
        return await testConnection(pool, headers);
    }
  } catch (error) {
    console.error(' SQL Server Connection Error:', error);
    console.error(' Error details:', {
      message: error.message,
      code: error.code,
      state: error.state,
      class: error.class,
      serverName: error.serverName,
      procName: error.procName,
      lineNumber: error.lineNumber,
      stack: error.stack
    });
    
    let errorMessage = 'Database connection failed';
    let errorDetails = error.message;
    
    if (error.code === 'ESOCKET' || error.code === 'ENOTFOUND') {
      errorMessage = 'Cannot reach database server';
      errorDetails = `Network error: ${error.message}. Possible causes: 1) RDS instance is stopped, 2) Security group blocking access, 3) VPC/networking issues, 4) Incorrect hostname`;
    } else if (error.code === 'ELOGIN') {
      errorMessage = 'Database authentication failed';
      errorDetails = 'Invalid credentials or database name';
    } else if (error.code === 'ETIMEOUT') {
      errorMessage = 'Database connection timeout';
      errorDetails = 'Connection timeout - RDS may be overloaded or network issues';
    }
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: errorMessage,
        details: errorDetails,
        code: error.code,
        server: server,
        port: port,
        raw_error: error.message,
        success: false
      })
    };
  } finally {
    if (pool) {
      try {
        await pool.close();
      } catch (closeError) {
        console.error('Error closing connection pool:', closeError);
      }
    }
  }
};

const pingTest = async (pool, headers) => {
  try {
    const result = await pool.request().query('SELECT 1 as ping');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'Ping successful',
        result: result.recordset[0]
      })
    };
  } catch (error) {
    console.error('Ping test failed:', error);
    throw error;
  }
};


const testConnection = async (pool, headers) => {
  try {
    
    const result = await pool.request().query(`
      SELECT 
        @@VERSION as version, 
        GETDATE() as [current_time],
        DB_NAME() as database_name,
        SUSER_NAME() as user_name,
        @@SERVERNAME as server_name
    `);
    
    const info = result.recordset[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        message: 'SQL Server connection successful',
        info: {
          version: info.version,
          timestamp: info.current_time,
          database: info.database_name,
          user: info.user_name,
          server_name: info.server_name,
          connection_server: `${server}:${port}`
        }
      })
    };
  } catch (error) {
    console.error('Database test failed:', error);
    throw error;
  }
};

const createLogEntry = async (pool, data, headers) => {
  try {
    const request = pool.request();
    
    const logEntry = {
      incident: data.incident || '',
      district: data.district || '',
      log_date: data.log_date || new Date().toISOString().split('T')[0],
      event_main: data.maint_event ? parseInt(data.maint_event) : null,
      event_incid: data.incid_event ? parseInt(data.incid_event) : null,
      business_impact: data.business_impact ? 1 : 0,
      rca: data.rca ? parseInt(data.rca) : null,
      log_start: data.start_duration_hrs || '00:00:00',
      log_end: data.end_duration_hrs || '23:59:59',
      estimated_time: data.est_duration_hrs ? parseInt(data.est_duration_hrs) : null,
      actual_time: data.real_time_duration_hrs ? parseInt(data.real_time_duration_hrs) : null,
      real_bus_impact: data.real_bus_impact ? parseInt(data.real_bus_impact) : null,
      ticket_number: data.ticket_number ? parseInt(data.ticket_number) : null,
      assigned: data.assigned || null,
      log_status: data.log_status || 'ACTIVE',
      note: data.note || '',
      risk_level: data.risk_level || null,
      expected_down_time: data.expected_down_time ? parseInt(data.expected_down_time) : null,
      log_type: data.log_type || 'application',
      uploader: data.uploader || 'admin'
    };

    request.input('incident', sql.VarChar(55), logEntry.incident);
    request.input('district', sql.VarChar(3), logEntry.district);
    request.input('log_date', sql.Date, logEntry.log_date);
    request.input('event_main', sql.Int, logEntry.event_main);
    request.input('event_incid', sql.Int, logEntry.event_incid);
    request.input('business_impact', sql.Bit, logEntry.business_impact);
    request.input('rca', sql.Int, logEntry.rca);
    request.input('log_start', sql.Time, logEntry.log_start);
    request.input('log_end', sql.Time, logEntry.log_end);
    request.input('estimated_time', sql.Int, logEntry.estimated_time);
    request.input('actual_time', sql.Int, logEntry.actual_time);
    request.input('real_bus_impact', sql.Int, logEntry.real_bus_impact);
    request.input('ticket_number', sql.Int, logEntry.ticket_number);
    request.input('assigned', sql.VarChar(255), logEntry.assigned);
    request.input('log_status', sql.VarChar(20), logEntry.log_status);
    request.input('note', sql.Text, logEntry.note);
    request.input('risk_level', sql.VarChar(55), logEntry.risk_level);
    request.input('expected_down_time', sql.Int, logEntry.expected_down_time);
    request.input('log_type', sql.VarChar(15), logEntry.log_type);
    request.input('uploader', sql.VarChar(255), logEntry.uploader);

    const result = await request.query(`
      INSERT INTO LOG_ENTRIES (
        incident, district, log_date, event_main, event_incid, business_impact,
        rca, log_start, log_end, estimated_time, actual_time, real_bus_impact,
        ticket_number, assigned, log_status, note, risk_level, expected_down_time,
        log_type, uploader
      ) OUTPUT INSERTED.id
      VALUES (
        @incident, @district, @log_date, @event_main, @event_incid, @business_impact,
        @rca, @log_start, @log_end, @estimated_time, @actual_time, @real_bus_impact,
        @ticket_number, @assigned, @log_status, @note, @risk_level, @expected_down_time,
        @log_type, @uploader
      )
    `);

    const insertedId = result.recordset[0].id;

    if (data.weekday && data.weekday !== '') {
      await pool.request()
        .input('id', sql.Int, insertedId)
        .input('day_of_the_week', sql.VarChar(12), data.weekday)
        .query(`
          INSERT INTO LOG_ENTRIES_RECURRENCES (id, day_of_the_week)
          VALUES (@id, @day_of_the_week)
        `);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: { ...logEntry, id: insertedId },
        message: 'Log entry created successfully'
      })
    };

  } catch (error) {
    throw error;
  }
};

const readLogEntries = async (pool, queryParams, headers) => {
  try {
    let query = `
      SELECT 
        le.*,
        ler.day_of_the_week
      FROM LOG_ENTRIES le
      LEFT JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.id
    `;
    
    const conditions = [];
    const request = pool.request();

    if (queryParams) {
      if (queryParams.district) {
        conditions.push('le.district = @district');
        request.input('district', sql.VarChar(3), queryParams.district);
      }
      if (queryParams.assigned) {
        conditions.push('le.assigned = @assigned');
        request.input('assigned', sql.VarChar(255), queryParams.assigned);
      }
      if (queryParams.log_type) {
        conditions.push('le.log_type = @log_type');
        request.input('log_type', sql.VarChar(15), queryParams.log_type);
      }
      if (queryParams.date_from) {
        conditions.push('le.log_date >= @date_from');
        request.input('date_from', sql.Date, queryParams.date_from);
      }
      if (queryParams.date_to) {
        conditions.push('le.log_date <= @date_to');
        request.input('date_to', sql.Date, queryParams.date_to);
      }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY le.log_date DESC, le.id DESC';

    const result = await request.query(query);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: result.recordset,
        count: result.recordset.length
      })
    };

  } catch (error) {
    throw error;
  }
};

const updateLogEntry = async (pool, id, data, headers) => {
  try {
    const request = pool.request();
    const updateFields = [];

    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        updateFields.push(`${key} = @${key}`);
        
        switch (key) {
          case 'incident':
            request.input(key, sql.VarChar(55), data[key]);
            break;
          case 'district':
            request.input(key, sql.VarChar(3), data[key]);
            break;
          case 'log_date':
            request.input(key, sql.Date, data[key]);
            break;
          case 'business_impact':
            request.input(key, sql.Bit, data[key] ? 1 : 0);
            break;
          case 'log_start':
          case 'log_end':
            request.input(key, sql.Time, data[key]);
            break;
          case 'note':
            request.input(key, sql.Text, data[key]);
            break;
          case 'assigned':
            request.input(key, sql.VarChar(255), data[key]);
            break;
          case 'log_status':
            request.input(key, sql.VarChar(20), data[key]);
            break;
          case 'log_type':
            request.input(key, sql.VarChar(15), data[key]);
            break;
          default:
            request.input(key, sql.Int, parseInt(data[key]) || null);
        }
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No fields to update');
    }

    request.input('id', sql.Int, id);

    const result = await request.query(`
      UPDATE LOG_ENTRIES 
      SET ${updateFields.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: result.recordset[0],
        message: 'Log entry updated successfully'
      })
    };

  } catch (error) {
    throw error;
  }
};

const deleteLogEntry = async (pool, id, headers) => {
  try {
    const request = pool.request();
    request.input('id', sql.Int, id);
    await request.query('DELETE FROM LOG_ENTRIES_RECURRENCES WHERE id = @id');
    
    const result = await request.query('DELETE FROM LOG_ENTRIES WHERE id = @id');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Log entry deleted successfully',
        rowsAffected: result.rowsAffected[0]
      })
    };

  } catch (error) {
    throw error;
  }
};

const readRecurrences = async (pool, headers) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        le.id, le.incident, le.district, le.note, le.assigned,
        ler.day_of_the_week
      FROM LOG_ENTRIES le
      INNER JOIN LOG_ENTRIES_RECURRENCES ler ON le.id = ler.id
      ORDER BY ler.day_of_the_week, le.incident
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true, 
        data: result.recordset
      })
    };

  } catch (error) {
    throw error;
  }
};

const createRecurrence = async (pool, data, headers) => {
  try {
    const request = pool.request();
    request.input('id', sql.Int, data.id);
    request.input('day_of_the_week', sql.VarChar(12), data.day_of_the_week);

    await request.query(`
      INSERT INTO LOG_ENTRIES_RECURRENCES (id, day_of_the_week)
      VALUES (@id, @day_of_the_week)
    `);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Recurrence created successfully'
      })
    };

  } catch (error) {
    throw error;
  }
};