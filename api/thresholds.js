const express = require('express');
const router = express.Router();
const sql = require('mssql');

// GET /api/getthresholds - Fetch thresholds from database
router.get('/getthresholds', async (req, res) => {
  try {

    const request = new sql.Request();
    
    const query = `
      SELECT 
        id,
        maintenance_yellow,
        maintenance_red,
        incident_yellow,
        incident_red,
        impact
      FROM LOG_ENTRIES_THRESHOLDS
      ORDER BY id DESC
    `;

    const result = await request.query(query);


    res.json({
      success: true,
      data: result.recordset,
      message: result.recordset.length > 0 
        ? 'Thresholds loaded successfully' 
        : 'No thresholds found - using defaults'
    });

  } catch (error) {
    console.error('❌ Error fetching thresholds:', error);
    res.status(500).json({
      success: false,
      error: `Database error: ${error.message}`
    });
  }
});

// POST /api/savethresholds - Save thresholds to database
router.post('/savethresholds', async (req, res) => {
  try {

    const { 
      maintenance_yellow, 
      maintenance_red, 
      incident_yellow, 
      incident_red, 
      impact 
    } = req.body;

    // Validate required fields
    if (
      maintenance_yellow === undefined || 
      maintenance_red === undefined || 
      incident_yellow === undefined || 
      incident_red === undefined || 
      impact === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'Missing required threshold values'
      });
    }

    const request = new sql.Request();

    // Check if any thresholds exist
    const checkQuery = 'SELECT COUNT(*) as count FROM LOG_ENTRIES_THRESHOLDS';
    const checkResult = await request.query(checkQuery);
    const hasExistingThresholds = checkResult.recordset[0].count > 0;

    let query;
    if (hasExistingThresholds) {
      // Update existing record (assuming single row)
      query = `
        UPDATE LOG_ENTRIES_THRESHOLDS 
        SET 
          maintenance_yellow = @maintenance_yellow,
          maintenance_red = @maintenance_red,
          incident_yellow = @incident_yellow,
          incident_red = @incident_red,
          impact = @impact
        WHERE id = (SELECT TOP 1 id FROM LOG_ENTRIES_THRESHOLDS ORDER BY id DESC)
      `;
    } else {
      // Insert new record
      query = `
        INSERT INTO LOG_ENTRIES_THRESHOLDS 
        (maintenance_yellow, maintenance_red, incident_yellow, incident_red, impact)
        VALUES 
        (@maintenance_yellow, @maintenance_red, @incident_yellow, @incident_red, @impact)
      `;
    }

    // Add parameters
    request.input('maintenance_yellow', sql.Int, parseInt(maintenance_yellow) || 0);
    request.input('maintenance_red', sql.Int, parseInt(maintenance_red) || 0);
    request.input('incident_yellow', sql.Int, parseInt(incident_yellow) || 0);
    request.input('incident_red', sql.Int, parseInt(incident_red) || 0);
    request.input('impact', sql.Int, parseInt(impact) || 0);

    const result = await request.query(query);

    res.json({
      success: true,
      message: `Thresholds ${hasExistingThresholds ? 'updated' : 'saved'} successfully`,
      rowsAffected: result.rowsAffected[0]
    });

  } catch (error) {
    console.error('❌ Error saving thresholds:', error);
    res.status(500).json({
      success: false,
      error: `Database error: ${error.message}`
    });
  }
});

module.exports = router;