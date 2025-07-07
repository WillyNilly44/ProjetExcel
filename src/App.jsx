import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import './style.css';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        {/* ✅ No more ProtectedRoute - direct access */}
        <LogEntriesTable />
      </div>
    </AuthProvider>
  );
}

export default App;