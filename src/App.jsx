import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import MenuDropdown from './components/MenuDropdown';
import * as XLSX from 'xlsx';

// 🧩 Lazy loading des pages lourdes
const AdminPanel = React.lazy(() => import('./AdminPanel'));
const DashboardPage = React.lazy(() => import('./DashboardPage'));
const MainPage = React.lazy(() => import('./MainPage'));

function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin') === 'true');
  const [adminView, setAdminView] = useState(false);
  const [adminNotes, setAdminNotes] = useState([]);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [exportColumns, setExportColumns] = useState([]);
  const [allColumns, setAllColumns] = useState([]);
  const [thresholds, setThresholds] = useState({
    maintenance_yellow: 15,
    maintenance_red: 25,
    incident_yellow: 5,
    incident_red: 6,
    impact: 0
  });

  // 🧠 Initialisation des colonnes
  useEffect(() => {
    if (!workbook || sheetNames.length === 0) return;

    const sheet = workbook.Sheets[sheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });

    if (rawData.length > 0) {
      const rawColumns = Object.keys(rawData[0]);
      const columnMap = {
        "Incident": "Incident",
        "District": "District",
        "Date": "Date",
        "Event": "Event",
        "__EMPTY_1": "Incid.",
        "Business impact ?": "Impact ?",
        "RCA": "RCA",
        "Duration (hrs)": "Durée estimée",
        "__EMPTY_2": "Start",
        "__EMPTY_3": "End",
        "__EMPTY_5": "Acc. time",
        "__EMPTY_4": "Acc. Bus. Imp.",
        "Assigned": "Responsable",
        "Note": "Note",
        "Ticket #": "Ticket",
        "Status": "Status",
      };

      const filtered = rawColumns.filter(col => columnMap[col]);
      const renamed = filtered.map(col => ({ key: col, label: columnMap[col] }));
      setAllColumns(renamed);
    }
  }, [workbook, sheetNames]);

  // 🔢 Chargement des données
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

  useEffect(() => {
    const fetchExportColumns = async () => {
      const res = await fetch('/.netlify/functions/getExportColumns');
      const result = await res.json();
      if (res.ok && Array.isArray(result.columns)) {
        setExportColumns(result.columns);
      }
    };
    fetchExportColumns();
  }, []);

  // 🔐 Interface Admin (vue isolée)
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
      <Suspense fallback={<p>Chargement de l'interface admin...</p>}>
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
          setExportColumns={setExportColumns}
          allColumns={allColumns}
        />
      </Suspense>
    );
  }

  // 🌐 Application principale avec routes
  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <header style={{ padding: '10px 20px', marginBottom: '20px' }}>
          <MenuDropdown onAdminClick={() => setAdminView(true)} />
        </header>

        <Suspense fallback={<p>Chargement de la page...</p>}>
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
                  exportColumns={exportColumns}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <DashboardPage
                  workbook={workbook}
                  thresholds={thresholds}
                />
              }
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
