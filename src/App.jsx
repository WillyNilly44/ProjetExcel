import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import DashboardPage from './DashboardPage';
import MainPage from './MainPage';
import { supabase } from '../netflify/functions/supabaseClient';

function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin') === 'true');
  const [adminView, setAdminView] = useState(false);
  const [adminNotes, setAdminNotes] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [thresholds, setThresholds] = useState({
    maintenance_yellow: 15,
    maintenance_red: 25,
    incident_yellow: 5,
    incident_red: 6,
    impact: 0
  });

  useEffect(() => {
    const fetchThresholds = async () => {
      const { data, error } = await supabase
        .from('dashboard_thresholds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1);
      if (!error && data?.length) {
        setThresholds(data[0]);
      }
    };
    fetchThresholds();
  }, []);

  useEffect(() => {
    const fetchAdminNotes = async () => {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*');
      if (!error && data) {
        setAdminNotes(data);
      }
    };
    fetchAdminNotes();
  }, []);

  if (adminView) {
    if (!isAdmin) {
      return (
        <AdminLogin
          onLogin={() => {
            sessionStorage.setItem('admin', 'true');
            setIsAdmin(true);
          }}
        />
      );
    }
    return (
      <Suspense fallback={<p>Interface loading...</p>}>
        <AdminPanel
          onLogout={() => {
            sessionStorage.removeItem('admin');
            setIsAdmin(false);
            setAdminView(false);
          }}
          adminNotes={adminNotes}
          setAdminNotes={setAdminNotes}
          thresholds={thresholds}
          setThresholds={setThresholds}
        />
      </Suspense>
    );
  }

  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <header>
          <nav>
            <Link to="/">🏠 Logs</Link>
            <Link to="/dashboard">📊 Dashboard</Link>
          </nav>
          <button onClick={() => setAdminView(true)} className="admin-button">
            🔒 Admin
          </button>
        </header>

        <Suspense fallback={<p>Chargement...</p>}>
          <Routes>
            <Route
              path="/"
              element={
                <MainPage
                  workbook={workbook}
                  setWorkbook={setWorkbook}
                  sheetNames={sheetNames}
                  setSheetNames={setSheetNames}
                  adminNotes={adminNotes}
                />
              }
            />
            <Route
              path="/dashboard"
              element={<DashboardPage workbook={workbook} thresholds={thresholds} />}
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
