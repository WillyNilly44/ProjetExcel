import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import LogEntriesTable from './components/LogEntriesTable';
import './style.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <LogEntriesTable />
    </AuthProvider>
  </React.StrictMode>
);