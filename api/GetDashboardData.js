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

    // Filter by month
    if (filters.month) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'month = @month';
      queryParams.push({ name: 'month', type: sql.VarChar, value: filters.month });
    }

    // Filter by week
    if (filters.week) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'week = @week';
      queryParams.push({ name: 'week', type: sql.VarChar, value: filters.week });
    }

    // Filter by maintenance count range
    if (filters.maintenanceMin !== undefined && filters.maintenanceMin !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'maintenance >= @maintenanceMin';
      queryParams.push({ name: 'maintenanceMin', type: sql.Int, value: parseInt(filters.maintenanceMin) });
    }

    if (filters.maintenanceMax !== undefined && filters.maintenanceMax !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'maintenance <= @maintenanceMax';
      queryParams.push({ name: 'maintenanceMax', type: sql.Int, value: parseInt(filters.maintenanceMax) });
    }

    // Filter by incidents count range
    if (filters.incidentsMin !== undefined && filters.incidentsMin !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'incidents >= @incidentsMin';
      queryParams.push({ name: 'incidentsMin', type: sql.Int, value: parseInt(filters.incidentsMin) });
    }

    if (filters.incidentsMax !== undefined && filters.incidentsMax !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'incidents <= @incidentsMax';
      queryParams.push({ name: 'incidentsMax', type: sql.Int, value: parseInt(filters.incidentsMax) });
    }

    // Filter by business impact range
    if (filters.businessImpactMin !== undefined && filters.businessImpactMin !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'business_impacted >= @businessImpactMin';
      queryParams.push({ name: 'businessImpactMin', type: sql.Int, value: parseInt(filters.businessImpactMin) });
    }

    if (filters.businessImpactMax !== undefined && filters.businessImpactMax !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'business_impacted <= @businessImpactMax';
      queryParams.push({ name: 'businessImpactMax', type: sql.Int, value: parseInt(filters.businessImpactMax) });
    }

    // Build and execute main query
    const query = `
      SELECT * 
      FROM LOG_ENTRIES_DASHBOARD 
      ${whereClause}
      ORDER BY id DESC
    `;

    const request = new sql.Request();
    queryParams.forEach(param => {
      request.input(param.name, param.type, param.value);
    });

    const result = await request.query(query);

    // Calculate summary statistics
    const summaryStats = {
      totalRecords: result.recordset.length,
      totalMaintenance: result.recordset.reduce((sum, row) => sum + (row.maintenance || 0), 0),
      totalIncidents: result.recordset.reduce((sum, row) => sum + (row.incidents || 0), 0),
      totalBusinessImpact: result.recordset.reduce((sum, row) => sum + (row.business_impacted || 0), 0),
      avgMaintenance: result.recordset.length > 0 ? 
        (result.recordset.reduce((sum, row) => sum + (row.maintenance || 0), 0) / result.recordset.length).toFixed(1) : 0,
      avgIncidents: result.recordset.length > 0 ? 
        (result.recordset.reduce((sum, row) => sum + (row.incidents || 0), 0) / result.recordset.length).toFixed(1) : 0,
      avgBusinessImpact: result.recordset.length > 0 ? 
        (result.recordset.reduce((sum, row) => sum + (row.business_impacted || 0), 0) / result.recordset.length).toFixed(1) : 0
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: result.recordset,
        columns: columnsResult.recordset,
        summary: summaryStats,
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