import sql from 'mssql';
import { config } from './dbconnection.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  
  try {
    connection = await sql.connect(config);
    
    // Get pending approvals with log entry details
    const result = await connection.request()
      .query(`
        SELECT 
          a.id as approval_id,
          a.log_entry_id,
          a.submitted_by,
          a.submitted_at,
          a.status,
          l.*
        FROM APPROVALS a
        INNER JOIN LOG_ENTRIES l ON a.log_entry_id = l.id
        WHERE a.status = 'pending'
        ORDER BY a.submitted_at DESC
      `);

    res.status(200).json({ 
      success: true, 
      data: result.recordset
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pending approvals: ' + error.message 
    });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
}