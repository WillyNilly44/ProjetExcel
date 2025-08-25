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

    // Get column information
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

    // Build WHERE clause for filters
    let whereClause = '';
    const queryParams = [];

    if (filters.month) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'month = @month';
      queryParams.push({ name: 'month', type: sql.VarChar, value: filters.month });
    }

    if (filters.week) {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'week = @week';
      queryParams.push({ name: 'week', type: sql.VarChar, value: filters.week });
    }

    if (filters.maintenanceMin !== undefined && filters.maintenanceMin !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'maintenance_1 >= @maintenanceMin';
      queryParams.push({ name: 'maintenanceMin', type: sql.Int, value: parseInt(filters.maintenanceMin) });
    }

    if (filters.maintenanceMax !== undefined && filters.maintenanceMax !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'maintenance_1 <= @maintenanceMax';
      queryParams.push({ name: 'maintenanceMax', type: sql.Int, value: parseInt(filters.maintenanceMax) });
    }

    if (filters.incidentsMin !== undefined && filters.incidentsMin !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'incidents_1 >= @incidentsMin';
      queryParams.push({ name: 'incidentsMin', type: sql.Int, value: parseInt(filters.incidentsMin) });
    }

    if (filters.incidentsMax !== undefined && filters.incidentsMax !== '') {
      whereClause += whereClause ? ' AND ' : ' WHERE ';
      whereClause += 'incidents_1 <= @incidentsMax';
      queryParams.push({ name: 'incidentsMax', type: sql.Int, value: parseInt(filters.incidentsMax) });
    }

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

    // First, get the actual data
    const dataQuery = `
      SELECT * 
      FROM LOG_ENTRIES_DASHBOARD 
      ${whereClause}
      ORDER BY id 
    `;

    const dataRequest = new sql.Request();
    queryParams.forEach(param => {
      dataRequest.input(param.name, param.type, param.value);
    });

    const dataResult = await dataRequest.query(dataQuery);

    // Calculate averages for maintenance and incident columns
    const columnAverages = {};
    const columns = columnsResult.recordset;
    
    // Find maintenance and incident columns
    const maintenanceColumns = columns.filter(col => 
      col.COLUMN_NAME.toLowerCase().includes('maintenance_') &&
      (col.DATA_TYPE.includes('int') || col.DATA_TYPE.includes('decimal') || col.DATA_TYPE.includes('float'))
    );
    
    const incidentColumns = columns.filter(col => 
      col.COLUMN_NAME.toLowerCase().includes('incidents_') &&
      (col.DATA_TYPE.includes('int') || col.DATA_TYPE.includes('decimal') || col.DATA_TYPE.includes('float'))
    );

    // Calculate averages for each column
    [...maintenanceColumns, ...incidentColumns].forEach(col => {
      const columnName = col.COLUMN_NAME;
      const values = dataResult.recordset
        .map(row => row[columnName])
        .filter(val => val !== null && val !== undefined && !isNaN(val));
      
      if (values.length > 0) {
        const average = values.reduce((sum, val) => sum + parseFloat(val), 0) / values.length;
        columnAverages[columnName] = Math.round(average * 100) / 100; // Round to 2 decimal places
      } else {
        columnAverages[columnName] = 0;
      }
    });

    // Modify column information to include averages in display names
    const modifiedColumns = columns.map(col => {
      const newCol = { ...col };
      
      if (columnAverages[col.COLUMN_NAME] !== undefined) {
        // For maintenance and incident columns, show the average as the header
        newCol.DISPLAY_NAME = `${columnAverages[col.COLUMN_NAME]} Avg`;
        newCol.ORIGINAL_NAME = col.COLUMN_NAME;
        newCol.AVERAGE_VALUE = columnAverages[col.COLUMN_NAME];
        newCol.IS_AVERAGE_COLUMN = true;
      } else {
        // For other columns, keep original name but formatted
        newCol.DISPLAY_NAME = col.COLUMN_NAME;
        newCol.IS_AVERAGE_COLUMN = false;
      }
      
      return newCol;
    });

    // Calculate summary stats
    const summaryStats = {
      totalRecords: dataResult.recordset.length,
      columnAverages,
      appliedFilters: filters,
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        data: dataResult.recordset,
        columns: modifiedColumns,
        summary: summaryStats,
        metadata: {
          totalRecords: dataResult.recordset.length,
          columnAverages,
          appliedFilters: filters,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    
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