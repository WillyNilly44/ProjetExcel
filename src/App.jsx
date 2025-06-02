import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import DashboardPage from './DashboardPage';
import MainPage from './MainPage';
import MenuDropdown from './components/MenuDropdown';
import * as XLSX from 'xlsx';

function App() {
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin') === 'true');
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

  useEffect(() => {
    fetch('/.netlify/functions/getThresholds')
      .then(res => res.json())
      .then(result => {
        if (result?.data) setThresholds(result.data);
      });
  }, []);

  useEffect(() => {
    fetch('/.netlify/functions/getAdminNotes')
      .then(res => res.json())
      .then(result => {
        if (result?.data) setAdminNotes(result.data);
      });
  }, []);

  useEffect(() => {
    fetch('/.netlify/functions/getExportColumns')
      .then(res => res.json())
      .then(result => {
        if (Array.isArray(result?.columns)) setExportColumns(result.columns);
      });
  }, []);

  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <header style={{ padding: '10px 20px', marginBottom: '20px' }}>
          <MenuDropdown onAdminClick={() => window.location.href = "/admin"} />
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
                  exportColumns={exportColumns}
                />
              }
            />
            <Route
              path="/dashboard"
              element={<DashboardPage workbook={workbook} thresholds={thresholds} />}
            />
            <Route
              path="/admin"
              element={
                isAdmin ? (
                  <AdminPanel
                    onLogout={() => {
                      sessionStorage.removeItem('admin');
                      setIsAdmin(false);
                    }}
                    adminNotes={adminNotes}
                    setAdminNotes={setAdminNotes}
                    thresholds={thresholds}
                    setThresholds={setThresholds}
                    setExportColumns={setExportColumns}
                    allColumns={allColumns}
                  />
                ) : (
                  <AdminLogin onLogin={() => setIsAdmin(true)} />
                )
              }
            />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}

export default App;
