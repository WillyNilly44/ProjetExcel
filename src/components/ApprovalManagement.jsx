import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const ApprovalManagement = () => {
  const { user } = useAuth();
  const [pendingEntries, setPendingEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (user && user.level_Name === 'Administrator') {
      fetchPendingEntries();
    }
  }, [user]);

  const fetchPendingEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/getpendingentries', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setPendingEntries(data.entries || []);
      } else {
        throw new Error(data.error || 'Failed to fetch pending entries');
      }
    } catch (error) {
      console.error('Error fetching pending entries:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pendingId) => {
    if (!user?.id) return;
    
    // Find the entry with this pendingId to get the log_entry_id
    console.log('Looking for pendingId:', pendingId);
    console.log('Available pending entries:', pendingEntries);
    const entry = pendingEntries.find(e => e.pending_id === pendingId);
    console.log('Found entry:', entry);
    
    if (!entry) {
      alert('Entry not found');
      return;
    }
    
    const requestBody = {
      action: 'approve',
      entryId: entry.id,
      pendingId: pendingId,
      adminUserId: user.id
    };
    
    console.log('Sending request body:', requestBody);
    
    try {
      setProcessing(true);
      const response = await fetch('/api/approveentry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        await fetchPendingEntries();
        setSelectedEntry(null);
        alert('Entry approved successfully!');
      } else {
        throw new Error(data.error || 'Failed to approve entry');
      }
    } catch (error) {
      console.error('Error approving entry:', error);
      alert('Failed to approve entry: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (pendingId) => {
    if (!user?.id || !rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    // Find the entry with this pendingId to get the log_entry_id
    const entry = pendingEntries.find(e => e.pending_id === pendingId);
    if (!entry) {
      alert('Entry not found');
      return;
    }
    
    try {
      setProcessing(true);
      const response = await fetch('/api/approveentry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'reject',
          entryId: entry.id,
          pendingId: pendingId,
          adminUserId: user.id,
          reason: rejectionReason.trim()
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (data.success) {
        await fetchPendingEntries();
        setSelectedEntry(null);
        setRejectionReason('');
        alert('Entry rejected successfully!');
      } else {
        throw new Error(data.error || 'Failed to reject entry');
      }
    } catch (error) {
      console.error('Error rejecting entry:', error);
      alert('Failed to reject entry: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatValue = (value) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (value === '') return 'Empty';
    return String(value);
  };

  // Check if user is Administrator
  if (user?.level_Name !== 'Administrator') {
    return (
      <div className="approval-management">
        <div className="access-denied">
          <h2>🔒 Access Denied</h2>
          <p>Only administrators can access the approval management system.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="approval-management">
      <div className="approval-header">
        <h2>📋 Pending Entry Approvals</h2>
        <button 
          onClick={fetchPendingEntries}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ Error: {error}</p>
          <button onClick={fetchPendingEntries}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <p>⏳ Loading pending entries...</p>
        </div>
      ) : pendingEntries.length === 0 ? (
        <div className="no-entries">
          <p>✅ No pending entries for approval</p>
          <p className="subtitle">All 3rd party submissions have been processed.</p>
        </div>
      ) : (
        <div className="entries-container">
          <div className="entries-summary">
            <p><strong>Total pending entries:</strong> {pendingEntries.length}</p>
          </div>

          <div className="entries-grid">
            {pendingEntries.map((entry) => (
              <div key={entry.pending_id} className="entry-card">
                <div className="entry-header">
                  <h3>Entry #{entry.id}</h3>
                  <span className="entry-status">Pending</span>
                </div>
                
                <div className="entry-details">
                  <div className="detail-row">
                    <strong>Incident:</strong> {formatValue(entry.incident)}
                  </div>
                  <div className="detail-row">
                    <strong>District:</strong> {formatValue(entry.district)}
                  </div>
                  <div className="detail-row">
                    <strong>Date:</strong> {formatValue(entry.log_date)}
                  </div>
                  <div className="detail-row">
                    <strong>Type:</strong> {formatValue(entry.log_type)}
                  </div>
                  <div className="detail-row">
                    <strong>Submitted by:</strong> {entry.submitted_by_name} ({entry.submitted_by_username})
                  </div>
                  <div className="detail-row">
                    <strong>Submitted at:</strong> {formatDate(entry.submitted_at)}
                  </div>
                  {entry.note && (
                    <div className="detail-row">
                      <strong>Notes:</strong> {formatValue(entry.note)}
                    </div>
                  )}
                </div>

                <div className="entry-actions">
                  <button
                    onClick={() => setSelectedEntry(entry)}
                    className="view-btn"
                    disabled={processing}
                  >
                    👁️ View Details
                  </button>
                  <button
                    onClick={() => handleApprove(entry.pending_id)}
                    className="approve-btn"
                    disabled={processing}
                  >
                    ✅ Approve
                  </button>
                  <button
                    onClick={() => {
                      setSelectedEntry(entry);
                      setRejectionReason('');
                    }}
                    className="reject-btn"
                    disabled={processing}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Entry Details - #{selectedEntry.id}</h3>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="close-btn"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-section">
                  <h4>Basic Information</h4>
                  <div className="detail-item">
                    <span className="label">Incident:</span>
                    <span className="value">{formatValue(selectedEntry.incident)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">District:</span>
                    <span className="value">{formatValue(selectedEntry.district)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Date:</span>
                    <span className="value">{formatValue(selectedEntry.log_date)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Start Time:</span>
                    <span className="value">{formatValue(selectedEntry.time_start)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">End Time:</span>
                    <span className="value">{formatValue(selectedEntry.time_end)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Duration:</span>
                    <span className="value">{formatValue(selectedEntry.duration)}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h4>Additional Details</h4>
                  <div className="detail-item">
                    <span className="label">Ticket Number:</span>
                    <span className="value">{formatValue(selectedEntry.ticket_number)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Assigned:</span>
                    <span className="value">{formatValue(selectedEntry.assigned)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Status:</span>
                    <span className="value">{formatValue(selectedEntry.log_status)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Risk Level:</span>
                    <span className="value">{formatValue(selectedEntry.risk_level)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Type:</span>
                    <span className="value">{formatValue(selectedEntry.log_type)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Uploader:</span>
                    <span className="value">{formatValue(selectedEntry.uploader)}</span>
                  </div>
                </div>

                {selectedEntry.note && (
                  <div className="detail-section full-width">
                    <h4>Notes</h4>
                    <div className="notes-content">
                      {selectedEntry.note}
                    </div>
                  </div>
                )}

                <div className="detail-section full-width">
                  <h4>Submission Information</h4>
                  <div className="detail-item">
                    <span className="label">Submitted by:</span>
                    <span className="value">{selectedEntry.submitted_by_name} ({selectedEntry.submitted_by_username})</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Submitted at:</span>
                    <span className="value">{formatDate(selectedEntry.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {/* Rejection Form */}
              <div className="rejection-section">
                <h4>Rejection Reason</h4>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection (required for rejection)"
                  className="rejection-textarea"
                  rows={3}
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => handleApprove(selectedEntry.pending_id)}
                className="approve-btn"
                disabled={processing}
              >
                ✅ Approve Entry
              </button>
              <button
                onClick={() => handleReject(selectedEntry.pending_id)}
                className="reject-btn"
                disabled={processing || !rejectionReason.trim()}
              >
                ❌ Reject Entry
              </button>
              <button
                onClick={() => setSelectedEntry(null)}
                className="cancel-btn"
                disabled={processing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalManagement;