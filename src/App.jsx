import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import './styles/index.css';

function AppContent() {
  const { isLoading } = useAuth();

  // Show loading screen while checking stored authentication
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner">⏳</div>
          <h2>Loading Log Viewer...</h2>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <LogEntriesTable />
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