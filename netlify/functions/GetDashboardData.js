const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { filters = {} } = JSON.parse(event.body);

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

    await sql.connect(config);

    // Get table structure
    const columnsResult = await sql.query`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'LOG_ENTRIES_DASHBOARD' 
      ORDER BY ORDINAL_POSITION
    `;

    // Build dynamic WHERE clause based on filters
    let whereClause = '';
    const queryParams = [];

    if (filters.dateRange) {
      switch (filters.dateRange) {
        case 'today':
          whereClause += whereClause ? ' AND ' : ' WHERE ';
          whereClause += 'CAST(created_date AS DATE) = CAST(GETDATE() AS DATE)';
          break;
        case 'week':
          whereClause += whereClause ? ' AND ' : ' WHERE ';
          whereClause += 'created_date >= DATEADD(week, -1, GETDATE())';
          break;
        case 'month':
          whereClause += whereClause ? ' AND ' : ' WHERE ';
          whereClause += 'created_date >= DATEADD(month, -1, GETDATE())';
          break;
        case 'quarter':
          whereClause += whereClause ? ' AND ' : ' WHERE ';
          whereClause += 'created_date >= DATEADD(quarter, -1, GETDATE())';
          break;
        case 'year':
          whereClause += whereClause ? ' AND ' : ' WHERE ';
          whereClause += 'created_date >= DATEADD(year, -1, GETDATE())';
          break;
      }
    }

    if (filters.category) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'category = @category';
      queryParams.push({ name: 'category', type: sql.NVarChar, value: filters.category });
    }

    if (filters.status) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'status = @status';
      queryParams.push({ name: 'status', type: sql.NVarChar, value: filters.status });
    }

    // Build and execute main query
    const query = `
      SELECT * 
      FROM LOG_ENTRIES_DASHBOARD 
      ${whereClause}
      ORDER BY created_date DESC
    `;

    const request = new sql.Request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.recordset,
        columns: columnsResult.recordset,
        metadata: {
          totalRecords: result.recordset.length,
          appliedFilters: filters,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    
    // Handle specific error cases
    let errorMessage = 'Failed to fetch dashboard data';
    
    if (error.message.includes('Invalid object name')) {
      errorMessage = 'LOG_ENTRIES_DASHBOARD table not found. Please ensure the table exists.';
    } else if (error.message.includes('Login failed')) {
      errorMessage = 'Database connection failed. Please check credentials.';
    } else {
      errorMessage = error.message;
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  } finally {
    await sql.close();
  }
};