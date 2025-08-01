import React, { useState, useEffect } from 'react';


const ThresholdManager = ({ isOpen, onClose, columns = [], onSave }) => {
  const [thresholds, setThresholds] = useState({
    maintenance_yellow: 3,
    maintenance_red: 7,
    incident_yellow: 2,
    incident_red: 5,
    impact: 5
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch thresholds from database
  const fetchThresholds = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/getthresholds', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        // Use the first threshold record (assuming one row)
        const dbThresholds = result.data[0];
        setThresholds({
          maintenance_yellow: dbThresholds.maintenance_yellow || 3,
          maintenance_red: dbThresholds.maintenance_red || 7,
          incident_yellow: dbThresholds.incident_yellow || 2,
          incident_red: dbThresholds.incident_red || 5,
          impact: dbThresholds.impact || 5
        });
      } else {

      }

    } catch (error) {
      console.error('❌ Failed to fetch thresholds:', error);
      setError(`Failed to load thresholds: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Save thresholds to database
  const saveThresholds = async () => {
    setIsSaving(true);
    setError('');
    
    try {
      const response = await fetch('/api/savethresholds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(thresholds)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (result.success) {
        // Call parent save function to update dashboard
        if (onSave) {
          onSave(thresholds);
        }
        onClose();
      } else {
        throw new Error(result.error || 'Failed to save thresholds');
      }

    } catch (error) {
      console.error('❌ Failed to save thresholds:', error);
      setError(`Failed to save thresholds: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Load thresholds when component opens
  useEffect(() => {
    if (isOpen) {
      fetchThresholds();
    }
  }, [isOpen]);

  const handleThresholdChange = (field, value) => {
    setThresholds(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  const resetToDefaults = () => {
    setThresholds({
      maintenance_yellow: 3,
      maintenance_red: 7,
      incident_yellow: 2,
      incident_red: 5,
      impact: 5
    });
  };

  const getColorForValue = (value, yellowThreshold, redThreshold) => {
    if (value <= yellowThreshold) return '#28a745'; // Green
    if (value <= redThreshold) return '#ffc107';    // Yellow
    return '#dc3545';                               // Red
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="threshold-manager-modal">
        <div className="modal-header">
          <h2>Threshold Manager</h2>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="threshold-content">
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>⏳ Loading thresholds...</p>
            </div>
          ) : (
            <>

              {/* Maintenance Thresholds */}
              <div className="threshold-section">
                <h3> Maintenance Thresholds</h3>
                <div className="threshold-row">
                  <div className="threshold-input-group">
                    <label>🟡 Yellow Threshold (≤)</label>
                    <input
                      type="number"
                      value={thresholds.maintenance_yellow}
                      onChange={(e) => handleThresholdChange('maintenance_yellow', e.target.value)}
                      className="threshold-value"
                      min="0"
                    />
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: '#ffc107' }}
                      title="Yellow color preview"
                    ></div>
                  </div>
                  <div className="threshold-input-group">
                    <label>🔴 Red Threshold (≤)</label>
                    <input
                      type="number"
                      value={thresholds.maintenance_red}
                      onChange={(e) => handleThresholdChange('maintenance_red', e.target.value)}
                      className="threshold-value"
                      min="0"
                    />
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: '#dc3545' }}
                      title="Red color preview"
                    ></div>
                  </div>
                </div>
              </div>

              {/* Incident Thresholds */}
              <div className="threshold-section">
                <h3>Incident Thresholds</h3>
                <div className="threshold-row">
                  <div className="threshold-input-group">
                    <label>🟡 Yellow Threshold (≤)</label>
                    <input
                      type="number"
                      value={thresholds.incident_yellow}
                      onChange={(e) => handleThresholdChange('incident_yellow', e.target.value)}
                      className="threshold-value"
                      min="0"
                    />
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: '#ffc107' }}
                      title="Yellow color preview"
                    ></div>
                  </div>
                  <div className="threshold-input-group">
                    <label>🔴 Red Threshold (≤)</label>
                    <input
                      type="number"
                      value={thresholds.incident_red}
                      onChange={(e) => handleThresholdChange('incident_red', e.target.value)}
                      className="threshold-value"
                      min="0"
                    />
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: '#dc3545' }}
                      title="Red color preview"
                    ></div>
                  </div>
                </div>
              </div>

              {/* Impact Threshold */}
              <div className="threshold-section">
                <h3>Impact Threshold</h3>
                <div className="threshold-row">
                  <div className="threshold-input-group">
                    <label>Impact</label>
                    <input
                      type="number"
                      value={thresholds.impact}
                      onChange={(e) => handleThresholdChange('impact', e.target.value)}
                      className="threshold-value"
                      min="1"
                      max="10"
                    />
                    <div 
                      className="color-preview" 
                      style={{ backgroundColor: thresholds.impact > 7 ? '#dc3545' : thresholds.impact > 4 ? '#ffc107' : '#28a745' }}
                      title="Impact color preview"
                    ></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <button onClick={resetToDefaults} className="reset-btn" disabled={isLoading || isSaving}>
              🔄 Reset to Defaults
            </button>
          </div>
          <div className="footer-right">
            <button onClick={onClose} className="cancel-btn" disabled={isSaving}>
              Cancel
            </button>
            <button onClick={saveThresholds} className="save-btn" disabled={isLoading || isSaving}>
              {isSaving ? ' Saving...' : ' Save Thresholds'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThresholdManager;