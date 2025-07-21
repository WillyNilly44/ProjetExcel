import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import './style.css';

function App() {
  return (
    <AuthProvider>
      <div>
        <LogEntriesTable />
      </div>
    </AuthProvider>
  );
}

export default App;