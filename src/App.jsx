import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import DashboardPage from './DashboardPage';
import MainPage from './MainPage';
import MenuDropdown from './components/MenuDropdown';

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
      const res = await fetch('/.netlify/functions/getThresholds');
      const result = await res.json();
      if (res.ok) setThresholds(result.data);
    };
    fetchThresholds();
  }, []);

  useEffect(() => {
    const fetchAdminNotes = async () => {
      const res = await fetch('/.netlify/functions/getAdminNotes');
      const result = await res.json();
      if (res.ok) setAdminNotes(result.data);
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
        <header style={{ padding: '10px 20px', marginBottom: '20px' }}>
          <MenuDropdown onAdminClick={() => setAdminView(true)} />
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
