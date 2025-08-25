/* filepath: c:\Users\William\Documents\ProjetExcel\api\updatekpi.js */

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

// Function to transform week range to readable format
const transformWeekRange = (weekRange, monthString) => {
  try {
    const [startDay, endDay] = weekRange.split('-').map(d => parseInt(d.trim()));
    
    if (isNaN(startDay) || isNaN(endDay)) {
      return weekRange;
    }

    const currentYear = new Date().getFullYear();
    let month, year;
    
    if (monthString.includes(' ')) {
      [month, year] = monthString.split(' ');
      year = parseInt(year) || currentYear;
    } else {
      month = monthString;
      year = currentYear;
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthIndex = monthNames.findIndex(m => 
      m.toLowerCase() === month.toLowerCase()
    );
    
    if (monthIndex === -1) {
      return weekRange;
    }

    const startDate = new Date(year, monthIndex, startDay);
    let endDate;

    if (endDay < startDay) {
      const nextMonth = monthIndex + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;
      
      endDate = new Date(nextYear, adjustedMonth, endDay);
    } else {
      endDate = new Date(year, monthIndex, endDay);
    }

    const formatOptions = { month: 'long', day: 'numeric' };
    const startFormatted = startDate.toLocaleDateString('en-US', formatOptions);
    const endFormatted = endDate.toLocaleDateString('en-US', formatOptions);

    return `${startFormatted} to ${endFormatted}`;

  } catch (error) {
    return weekRange;
  }
};

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'PUT, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { 
      id,
      month, 
      week, 
      maintenance_1, 
      maintenance_2, 
      incidents_1, 
      incidents_2, 
      business_impacted 
    } = JSON.parse(event.body);


    if (!id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'KPI ID is required'
        })
      };
    }

    if (!month || !week) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Month and week are required'
        })
      };
    }

    // Transform the week range to readable format
    const transformedWeek = transformWeekRange(week, month);

    await sql.connect(config);

    // Check if the record exists
    const checkRequest = new sql.Request();
    checkRequest.input('id', sql.Int, id);
    const checkResult = await checkRequest.query('SELECT * FROM LOG_ENTRIES_DASHBOARD WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'KPI entry not found'
        })
      };
    }

    // Update the dashboard entry
    const updateQuery = `
      UPDATE LOG_ENTRIES_DASHBOARD 
      SET 
        month = @month,
        week = @week,
        maintenance_1 = @maintenance_1,
        maintenance_2 = @maintenance_2,
        incidents_1 = @incidents_1,
        incidents_2 = @incidents_2,
        business_impacted = @business_impacted
      WHERE id = @id
    `;


    const request = new sql.Request();
    request.input('id', sql.Int, id);
    request.input('month', sql.VarChar(20), month);
    request.input('week', sql.VarChar(50), transformedWeek);
    request.input('maintenance_1', sql.Int, maintenance_1 || 0);
    request.input('maintenance_2', sql.Int, maintenance_2 || 0);
    request.input('incidents_1', sql.Int, incidents_1 || 0);
    request.input('incidents_2', sql.Int, incidents_2 || 0);
    request.input('business_impacted', sql.Int, business_impacted || 0);

    const result = await request.query(updateQuery);


    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'KPI dashboard entry updated successfully',
        id: id,
        month: month,
        originalWeek: week,
        transformedWeek: transformedWeek,
        rowsAffected: result.rowsAffected[0]
      })
    };

  } catch (error) {
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error.toString()
      })
    };
  } finally {
    try {
      await sql.close();
    } catch (closeError) {
    }
  }
};