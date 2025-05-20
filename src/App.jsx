import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import DashboardPage from './DashboardPage';
import MainPage from './MainPage';
import { supabase } from './supabaseClient';

function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin') === 'true');
  const [adminView, setAdminView] = useState(false);
  const [adminNotes, setAdminNotes] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);


  useEffect(() => {
    const fetchAdminNotes = async () => {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*');

      if (!error) {
        setAdminNotes(data);
      } else {
        console.error("Erreur de chargement des notes admin :", error.message);
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
      <AdminPanel
        onLogout={() => {
          sessionStorage.removeItem('admin');
          setIsAdmin(false);
          setAdminView(false);
        }}
        adminNotes={adminNotes}
        setAdminNotes={setAdminNotes}
      />
    );
  }

  return (
    <Router>
      <nav style={{ margin: 10 }}>
        <Link to="/" style={{ marginRight: 10 }}>🏠 Logs</Link>
        <Link to="/dashboard">📊 Dashboard</Link>
        <button onClick={() => setAdminView(true)} style={{ marginLeft: 10 }}>
          🔒 Admin
        </button>
      </nav>

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
          element={<DashboardPage workbook={workbook} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
