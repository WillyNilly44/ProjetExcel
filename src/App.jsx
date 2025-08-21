import React, { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import TabNavigation from './components/TabNavigation';
import DashboardTab from './components/DashboardTab';
import LogEntriesTable from './components/LogEntriesTable';
import KPITab from './components/KPITab';
import UserManagement from './components/UserManagement';
import { useAuth } from './contexts/AuthContext';
import './styles/index.css';

function AppContent() {
  // Set 'dashboard' as the default active tab
  const [activeTab, setActiveTab] = useState('dashboard');
  const { hasPermission } = useAuth();

  useEffect(() => {
    // Save the active tab to localStorage for persistence
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Restore the last active tab from localStorage
    const savedTab = localStorage.getItem('activeTab');
    if (savedTab && ['dashboard', 'logs', 'kpi', 'users'].includes(savedTab)) {
      setActiveTab(savedTab);
    } else {
      // If no saved tab or invalid tab, default to dashboard
      setActiveTab('dashboard');
    }
  }, []);

  // Update document title based on active tab
  useEffect(() => {
    const tabTitles = {
      'dashboard': 'Dashboard - ProjetExcel',
      'logs': 'Log Entries - ProjetExcel', 
      'kpi': 'KPI Management - ProjetExcel',
      'users': 'User Management - ProjetExcel'
    };
    
    document.title = tabTitles[activeTab] || 'ProjetExcel';
  }, [activeTab]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab />;
      case 'logs': // FIXED: Changed from 'log-entries' to 'logs' to match TabNavigation
        return <LogEntriesTable />;
      case 'kpi':
        return <KPITab />;
      case 'users':
        return <UserManagement />;
      default:
        return <DashboardTab />; // Default fallback to Dashboard
    }
  };

  return (
    <div className="app-container">
      <TabNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab} // FIXED: Changed from setActiveTab to onTabChange
        hasPermission={hasPermission}
      />
      <main className="app-main">
        {renderActiveTab()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}

export default App;