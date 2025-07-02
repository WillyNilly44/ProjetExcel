import React from 'react';
import LogEntriesTable from './components/LogEntriesTable';
import './styles/App.css';

function App() {
  return (
    <div className="App">
      <header style={{ 
        backgroundColor: '#1f2937', 
        color: 'white', 
        padding: '20px', 
        textAlign: 'center' 
      }}>
        <h1>Log Entries</h1>
      </header>
      
      <main style={{ padding: '20px' }}>
        <LogEntriesTable />
      </main>
    </div>
  );
}

export default App;