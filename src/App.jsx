import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <LogEntriesTable />
      </div>
    </AuthProvider>
  );
}

export default App;