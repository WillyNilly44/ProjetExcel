const sql = require('mssql');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
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

    const result = await sql.query`
      SELECT id, level_Name 
      FROM LOG_ENTRIES_LEVELS 
      ORDER BY 
        CASE level_Name
          WHEN 'Super Admin' THEN 1
          WHEN 'Administrator' THEN 2
          WHEN 'Manager' THEN 3
          WHEN 'Operator' THEN 4
          WHEN 'Viewer' THEN 5
          WHEN 'Guest' THEN 6
          ELSE 7
        END
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        levels: result.recordset
      })
    };

  } catch (error) {
    console.error('Get levels error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch levels: ' + error.message 
      })
    };
  } finally {
    await sql.close();
  }
};