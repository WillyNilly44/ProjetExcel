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
  const { loading, user, hasPermission, mustChangePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Ready to load');
  const [connectionInfo, setConnectionInfo] = useState(null);


  // FIXED: Reset to dashboard when user logs out and is on users tab
  useEffect(() => {
    if (!user && activeTab === 'users') {
      setActiveTab('dashboard');
    }
  }, [user, activeTab]);

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
    if (lowerColumnName.includes('time_start') || 
        lowerColumnName.includes('time_end') || 
        lowerColumnName === 'time start' ||
        lowerColumnName === 'time end') {
      
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

  const handleLogout = () => {
    logout();
    // FIXED: Always go back to dashboard after logout
    setActiveTab('dashboard');
  };

  // Show password change modal if user is logged in and must change password
  if (user && mustChangePassword) {
    return (
      <div className="App">
        <div className="user-info-corner">
          <span>✅ {user.name} ({user.level_Name})</span>
          <button onClick={handleLogout} className="logout-btn">
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
        // FIXED: Don't render UserManagement at all if not logged in
        // This prevents the duplicate login buttons
        if (!user) {
          return null; // This will be handled by the corner login
        }
        return <UserManagement />;
      
      default:
        return <DashboardTab {...commonProps} />;
    }
  };

  // Main app content
  return (
    <div className="App">
      {/* FIXED: Only show corner login when NOT on users tab without auth */}
      {!user && activeTab !== 'users' && (
        <div className="login-corner">
          <MiniLogin />
        </div>
      )}

      {/* FIXED: Show special login message when on users tab without auth */}
      {!user && activeTab === 'users' && (
        <div className="login-corner">
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            color: '#fca5a5',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            🔐 Please log in to access User Management
          </div>
          <MiniLogin />
        </div>
      )}

      {/* Show user info and logout if logged in */}
      {user && (
        <div className="user-info-corner">
          <span>✅ {user.name} ({user.level_Name})</span>
          <button onClick={handleLogout} className="logout-btn">
            🚪 Logout
          </button>
        </div>
      )}

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