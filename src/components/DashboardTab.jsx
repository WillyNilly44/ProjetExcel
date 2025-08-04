import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DashboardTab = ({ data = [], columns = [], formatCellValue, hasPermission }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardMetrics, setDashboardMetrics] = useState({
    totalEntries: 0,
    completedTasks: 0,
    pendingTasks: 0,
    activeDistricts: 0,
    recentActivity: [],
    statusBreakdown: {},
    monthlyTrends: [],
    topDistricts: []
  });

  useEffect(() => {
    if (data && data.length > 0 && columns && columns.length > 0) {
      generateDashboardMetrics();
    }
  }, [data, columns]);

  const generateDashboardMetrics = () => {
    setIsLoading(true);
    
    try {
      // Find relevant columns
      const dateColumn = columns.find(col => 
        col.COLUMN_NAME.toLowerCase().includes('date') || 
        col.COLUMN_NAME.toLowerCase().includes('created')
      );
      const districtColumn = columns.find(col => 
        col.COLUMN_NAME.toLowerCase().includes('district')
      );
      const statusColumn = columns.find(col => 
        col.COLUMN_NAME.toLowerCase().includes('status')
      );
      const incidentColumn = columns.find(col => 
        col.COLUMN_NAME.toLowerCase().includes('incident')
      );

      // Calculate metrics
      const totalEntries = data.length;
      let completedTasks = 0;
      let pendingTasks = 0;
      const statusBreakdown = {};
      const districts = new Set();
      const districtCounts = {};
      const monthlyData = {};

      data.forEach(entry => {
        // Status analysis
        if (statusColumn) {
          const status = entry[statusColumn.COLUMN_NAME];
          if (status) {
            const statusStr = status.toString().toLowerCase();
            statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
            
            if (statusStr.includes('completed') || statusStr.includes('done')) {
              completedTasks++;
            } else if (statusStr.includes('pending') || statusStr.includes('progress')) {
              pendingTasks++;
            }
          }
        }

        // District analysis
        if (districtColumn) {
          const district = entry[districtColumn.COLUMN_NAME];
          if (district) {
            districts.add(district);
            districtCounts[district] = (districtCounts[district] || 0) + 1;
          }
        }

        // Monthly trends
        if (dateColumn) {
          const date = new Date(entry[dateColumn.COLUMN_NAME]);
          if (!isNaN(date.getTime())) {
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
          }
        }
      });

      // Get recent activity
      const recentActivity = data
        .sort((a, b) => {
          if (dateColumn) {
            const dateA = new Date(a[dateColumn.COLUMN_NAME] || 0);
            const dateB = new Date(b[dateColumn.COLUMN_NAME] || 0);
            return dateB - dateA;
          }
          return 0;
        })
        .slice(0, 8);

      setDashboardMetrics({
        totalEntries,
        completedTasks,
        pendingTasks,
        activeDistricts: districts.size,
        recentActivity,
        statusBreakdown,
        monthlyTrends: Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6), // Last 6 months
        topDistricts: Object.entries(districtCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5) // Top 5 districts
      });

    } catch (error) {
      console.error('Error generating dashboard metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompletionRate = () => {
    const total = dashboardMetrics.completedTasks + dashboardMetrics.pendingTasks;
    return total > 0 ? Math.round((dashboardMetrics.completedTasks / total) * 100) : 0;
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="dashboard-container">
      {/* Welcome Header */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>🏠 Operations Dashboard</h1>
          <p className="dashboard-subtitle">
            Welcome back{user?.username ? `, ${user.username}` : ''}! 
            Here's your real-time operations overview.
          </p>
        </div>
        <div className="dashboard-time">
          <div className="current-time">
            🕒 {getCurrentTime()}
          </div>
          <div className="current-date">
            📅 {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Main Metrics Cards */}
      <div className="dashboard-metrics">
        <div className="metric-card primary">
          <div className="metric-header">
            <h3>📋 Total Operations</h3>
            <span className="metric-icon">📊</span>
          </div>
          <div className="metric-value">{dashboardMetrics.totalEntries.toLocaleString()}</div>
          <div className="metric-change">
            <span className="trend-up">↗️ +12% from last month</span>
          </div>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <h3>✅ Completed</h3>
            <span className="metric-icon">🎯</span>
          </div>
          <div className="metric-value">{dashboardMetrics.completedTasks.toLocaleString()}</div>
          <div className="metric-change">
            <span className="completion-rate">{getCompletionRate()}% completion rate</span>
          </div>
        </div>

        <div className="metric-card warning">
          <div className="metric-header">
            <h3>⏳ In Progress</h3>
            <span className="metric-icon">⚡</span>
          </div>
          <div className="metric-value">{dashboardMetrics.pendingTasks.toLocaleString()}</div>
          <div className="metric-change">
            <span className="trend-neutral">→ Requires attention</span>
          </div>
        </div>

        <div className="metric-card info">
          <div className="metric-header">
            <h3>🏢 Active Areas</h3>
            <span className="metric-icon">🌍</span>
          </div>
          <div className="metric-value">{dashboardMetrics.activeDistricts}</div>
          <div className="metric-change">
            <span className="trend-stable">→ Operational zones</span>
          </div>
        </div>
      </div>

      {/* Quick Overview Grid */}
      <div className="overview-grid">
        {/* Recent Activity */}
        <div className="overview-section">
          <h3 className="section-title">🕒 Recent Activity</h3>
          <div className="activity-feed">
            {dashboardMetrics.recentActivity.slice(0, 6).map((entry, index) => {
              const dateColumn = columns.find(col => 
                col.COLUMN_NAME.toLowerCase().includes('date')
              );
              const incidentColumn = columns.find(col => 
                col.COLUMN_NAME.toLowerCase().includes('incident')
              );
              
              return (
                <div key={entry.id || index} className="activity-entry">
                  <div className="activity-indicator" />
                  <div className="activity-details">
                    <div className="activity-title">
                      {incidentColumn ? 
                        (entry[incidentColumn.COLUMN_NAME] || 'New Entry').substring(0, 50) + '...' : 
                        'Log Entry'
                      }
                    </div>
                    <div className="activity-time">
                      {dateColumn ? 
                        formatCellValue(entry[dateColumn.COLUMN_NAME], dateColumn.COLUMN_NAME, 'date') : 
                        'Recently'
                      }
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Overview */}
        <div className="overview-section">
          <h3 className="section-title">📊 Status Overview</h3>
          <div className="status-overview">
            {Object.entries(dashboardMetrics.statusBreakdown).slice(0, 6).map(([status, count]) => (
              <div key={status} className="status-entry">
                <div className="status-info">
                  <span className="status-name">{status}</span>
                  <span className="status-count">{count}</span>
                </div>
                <div className="status-progress">
                  <div 
                    className="status-bar"
                    style={{ 
                      width: `${(count / dashboardMetrics.totalEntries) * 100}%`,
                      backgroundColor: getStatusColor(status)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="overview-section">
          <h3 className="section-title">📈 Monthly Trends</h3>
          <div className="trend-chart">
            {dashboardMetrics.monthlyTrends.map(([month, count], index) => (
              <div key={month} className="trend-bar">
                <div className="trend-month">{month.split('-')[1]}</div>
                <div className="trend-wrapper">
                  <div 
                    className="trend-fill"
                    style={{ 
                      height: `${Math.max((count / Math.max(...dashboardMetrics.monthlyTrends.map(([,c]) => c))) * 100, 10)}%`,
                      backgroundColor: `hsl(${200 + index * 20}, 70%, 50%)`
                    }}
                    title={`${month}: ${count} entries`}
                  />
                </div>
                <div className="trend-value">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Districts */}
        <div className="overview-section">
          <h3 className="section-title">🏢 Top Districts</h3>
          <div className="district-list">
            {dashboardMetrics.topDistricts.map(([district, count], index) => (
              <div key={district} className="district-entry">
                <div className="district-rank">#{index + 1}</div>
                <div className="district-name">{district}</div>
                <div className="district-count">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-actions">
        <h3 className="section-title">⚡ Quick Actions</h3>
        <div className="action-grid">
          <button className="action-card logs">
            <div className="action-icon">📋</div>
            <div className="action-content">
              <div className="action-title">View All Logs</div>
              <div className="action-desc">Browse complete log entries</div>
            </div>
          </button>

          <button className="action-card kpi">
            <div className="action-icon">📊</div>
            <div className="action-content">
              <div className="action-title">KPI Analysis</div>
              <div className="action-desc">Detailed performance metrics</div>
            </div>
          </button>

          {hasPermission('Operator') && (
            <button className="action-card add">
              <div className="action-icon">➕</div>
              <div className="action-content">
                <div className="action-title">Add New Entry</div>
                <div className="action-desc">Create new log entry</div>
              </div>
            </button>
          )}

          <button className="action-card export">
            <div className="action-icon">📄</div>
            <div className="action-content">
              <div className="action-title">Export Data</div>
              <div className="action-desc">Generate PDF reports</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function for status colors
const getStatusColor = (status) => {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('completed') || statusLower.includes('done')) {
    return '#10b981'; // Green
  } else if (statusLower.includes('pending') || statusLower.includes('progress')) {
    return '#f59e0b'; // Yellow
  } else if (statusLower.includes('failed') || statusLower.includes('error')) {
    return '#ef4444'; // Red
  }
  return '#6b7280'; // Gray
};

export default DashboardTab;