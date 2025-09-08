import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import TabNavigation from './components/TabNavigation';
import UserManagement from './components/UserManagement';
import DashboardTab from './components/DashboardTab';
import KPITab from './components/KPITab';
import MiniLogin from './components/MiniLogin';
import PasswordChangeModal from './components/PasswordChangeModal';
import './styles/index.css';

function AppContent() {
  // FIXED: Get logout function at component level, not inside onClick
  const { loading, user, hasPermission, mustChangePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Ready to load');
  const [connectionInfo, setConnectionInfo] = useState(null);

  console.log('AppContent render:', { loading, user: !!user, mustChangePassword });

  // Fetch data function
  const fetchLogEntries = async () => {
    setIsDataLoading(true);
    setConnectionStatus('Loading log entries...');
    
    try {
      const response = await fetch('/api/dbconnection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setConnectionStatus(`✅ Loaded`);
        setData(result.data || []);
        setColumns(result.columns || []);
        setConnectionInfo({
          server: result.server,
          database: result.database,
          totalRecords: result.totalRecords,
          columnCount: result.columns?.length || 0,
          timestamp: result.timestamp
        });
      } else {
        setConnectionStatus('❌ Failed to load data');
        setConnectionInfo({
          error: result.error,
          code: result.code,
          timestamp: result.timestamp
        });
      }

    } catch (error) {
      setConnectionStatus('❌ Request Failed');
      setConnectionInfo({
        error: error.message,
        type: 'Network/Request Error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsDataLoading(false);
    }
  };

  // Format cell value function
  const formatCellValue = (value, columnName, dataType) => {
    if (value === null || value === undefined) {
      return '';
    }

    const lowerColumnName = columnName ? columnName.toLowerCase() : '';
    
    // Handle log start and log end columns - show only time in 24-hour format
    if (lowerColumnName.includes('log_start') || 
        lowerColumnName.includes('log_end') || 
        lowerColumnName === 'log start' ||
        lowerColumnName === 'log end') {
      
      try {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return value.toString();
        }
        
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      } catch (error) {
        return value.toString();
      }
    }

    const lowerDataType = dataType ? dataType.toLowerCase() : '';

    // Handle boolean/bit values
    if (lowerDataType === 'bit' || typeof value === 'boolean') {
      return value ? '✅ Yes' : '❌ No';
    }

    // Handle status fields
    if (lowerColumnName.includes('status')) {
      const statusValue = value.toString().toLowerCase();
      switch (statusValue) {
        case 'completed':
          return '✅ Completed';
        case 'in progress':
        case 'progress':
          return '🔄 In Progress';
        case 'not completed':
          return '❌ Not Completed';
        case 'scheduled':
          return '📅 Scheduled';
        case 'on hold':
          return '⏸️ On Hold';
        case 'cancelled':
          return '🚫 Cancelled';
        default:
          return value.toString();
      }
    }

    // Handle date fields
    if (lowerDataType.includes('date') || lowerColumnName.includes('date')) {
      let dateString = value.toString();
      
      if (dateString.includes('T')) {
        dateString = dateString.split('T')[0];
      } else if (dateString.includes(' ') && dateString.match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)) {
        dateString = dateString.split(' ')[0];
      }
      
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return dateString;
    }

    // Handle numeric fields
    if (lowerDataType.includes('int') || lowerDataType.includes('decimal') || lowerDataType.includes('float')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toLocaleString();
      }
    }

    return value.toString();
  };

  // Fetch data when component mounts (regardless of auth status)
  useEffect(() => {
    fetchLogEntries();
  }, []);

  // FIXED: Handle logout properly
  const handleLogout = () => {
    logout();
    // Don't force reload - let React handle the state change
  };

  // Show password change modal if user is logged in and must change password
  if (user && mustChangePassword) {
    return (
      <div className="app">
        <div className="app-header" style={{ 
          padding: '1rem', 
          background: '#667eea', 
          color: 'white', 
          textAlign: 'center',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0 }}>📊 Log Viewer - Password Change Required</h1>
            <p style={{ margin: '0.5rem 0 0 0' }}>Welcome, {user.name} ({user.username})</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: '1px solid white', 
              color: 'white', 
              padding: '0.5rem 1rem', 
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🚪 Logout
          </button>
        </div>
        <PasswordChangeModal 
          isOpen={mustChangePassword}
          isRequired={true}
        />
      </div>
    );
  }

  // Render the active tab content
  const renderActiveTab = () => {
    const commonProps = {
      data,
      columns,
      formatCellValue,
      hasPermission,
      isLoading: isDataLoading,
      connectionStatus,
      connectionInfo,
      onRefresh: fetchLogEntries
    };

    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...commonProps} />;
      
      case 'kpi':
        return <KPITab {...commonProps} />;
      
      case 'logs':
        return <LogEntriesTable {...commonProps} />;
      
      case 'users':
        // User Management requires authentication
        if (!user) {
          return (
            <div className="auth-required" style={{ 
              padding: '2rem', 
              textAlign: 'center',
              background: '#f8f9fa',
              margin: '2rem',
              borderRadius: '8px',
              border: '1px solid #dee2e6'
            }}>
              <h2>🔐 Authentication Required</h2>
              <p>Please log in to access User Management.</p>
              <div style={{ marginTop: '1rem' }}>
                <MiniLogin />
              </div>
            </div>
          );
        }
        return <UserManagement />;
      
      default:
        return <DashboardTab {...commonProps} />;
    }
  };

  // Main app content (always show regardless of auth status)
  return (
    <div className="App">
      {/* Header with login status */}
      <div className="app-header" style={{ 
        background: '#f8f9fa', 
        padding: '0.5rem 1rem', 
        borderBottom: '1px solid #dee2e6',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <strong>📊 Log Viewer Application</strong>
          {user && (
            <span style={{ marginLeft: '1rem', color: '#28a745' }}>
              ✅ Logged in as {user.name} ({user.level_Name})
            </span>
          )}
        </div>
        <div>
          {user ? (
            <button 
              onClick={handleLogout}
              style={{ 
                background: '#dc3545', 
                border: 'none', 
                color: 'white', 
                padding: '0.25rem 0.75rem', 
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              🚪 Logout
            </button>
          ) : (
            <MiniLogin />
          )}
        </div>
      </div>

      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        hasPermission={hasPermission}
        user={user}
      />

      <div className="tab-content">
        {renderActiveTab()}
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;