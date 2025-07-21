import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import './style.css';

function App() {
  const [apiStatus, setApiStatus] = useState('Testing API...');

  React.useEffect(() => {
    // Test API connection
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        setApiStatus(`✅ API Connected! Status: ${data.status}`);
      })
      .catch(err => {
        setApiStatus(`❌ API Error: ${err.message}`);
      });
  }, []);

  return (
    <AuthProvider>
      <div>
        {/* Simple header to show API status */}
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          left: '10px', 
          backgroundColor: 'white', 
          padding: '8px 12px', 
          borderRadius: '4px', 
          fontSize: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          zIndex: 1000,
          border: '1px solid #ddd'
        }}>
          {apiStatus}
        </div>
        
        {/* Your full LogEntriesTable component */}
        <LogEntriesTable />
      </div>
    </AuthProvider>
  );
}

export default App;