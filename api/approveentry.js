import sql from 'mssql';
import { config } from './dbconnection.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let connection;
  
  try {
    connection = await sql.connect(config);
    
    const { entryId, action, approverUsername, comments } = req.body; 
    
    if (!entryId || !action || !approverUsername) {
      return res.status(400).json({ error: 'Entry ID, action, and approver username are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be either "approve" or "reject"' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update the approval record
    const updateResult = await connection.request()
      .input('entryId', sql.Int, entryId)
      .input('status', sql.VarChar(50), newStatus)
      .input('reviewedBy', sql.VarChar(100), approverUsername)
      .input('reviewedAt', sql.DateTime, new Date())
      .input('comments', sql.Text, comments || null)
      .query(`
        UPDATE APPROVALS 
        SET status = @status,
            reviewed_by = @reviewedBy,
            reviewed_at = @reviewedAt,
            review_comments = @comments
        WHERE log_entry_id = @entryId AND status = 'pending'
      `);

    if (updateResult.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'No pending approval found for this entry' });
    }

    res.status(200).json({ 
      success: true, 
      message: `Entry ${entryId} has been ${action}d successfully!`,
      entryId: entryId,
      action: action,
      approvedBy: approverUsername,
      comments: comments
    });

  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update entry approval status: ' + error.message 
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