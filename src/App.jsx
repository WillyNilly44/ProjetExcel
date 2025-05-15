import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Filters from './components/Filters';
import DataTable from './components/DataTable';
import CalendarView from './components/CalendarView';
import PaginationControls from './components/PaginationControls';
import ExportPdfBtn from './components/ExportPdfBtn';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';
import * as XLSX from 'xlsx';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import MainPage from './MainPage';


function App() {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [pageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState('table');
  const [isMonthSelected, setIsMonthSelected] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  const [adminView, setAdminView] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => sessionStorage.getItem('admin') === 'true');
  const [dataSource, setDataSource] = useState('fusion');
  const [adminNotes, setAdminNotes] = useState([]);


  const handleWorkbookLoaded = (wb, validSheets) => {
    window.workbookDashboard = workbook;
    setWorkbook(wb);
    setSheetNames(validSheets);
    setSelectedSheet('fusion');
    loadDataFromSheets(wb, validSheets);
  };

  const loadDataFromSheets = (wb, sheets) => {
    const allData = sheets.flatMap((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
      rawData = cleanEmptyValues(rawData, sheetName);
      rawData = removeFirstColumn(rawData);
      return rawData;
    });
    allData.sort((a, b) => {
      const dateA = new Date(Object.values(a).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || 0);
      const dateB = new Date(Object.values(b).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || 0);
      return dateB - dateA;
    });

    setData(allData);
    setFilteredData(allData);
    setCurrentPage(0);
  };


  if (adminView) {
    if (!isAdmin) {
      return <AdminLogin onLogin={() => {
        sessionStorage.setItem('admin', 'true');
        setIsAdmin(true);
      }} />;
    }
    return <AdminPanel onLogout={() => {
      sessionStorage.removeItem('admin');
      setIsAdmin(false);
      setAdminView(false);
    }}
      adminNotes={adminNotes}
      setAdminNotes={setAdminNotes} />;
  }

  return (
    <div className="App">
      <h2>Operational & Application Logs</h2>
      <FileUpload onWorkbookLoaded={handleWorkbookLoaded} />

      {sheetNames.length > 1 && (
        <div style={{ marginBottom: '10px' }}>
          <label>Feuilles à afficher : </label>
          <select
            value={dataSource}
            onChange={(e) => {
              const value = e.target.value;
              setDataSource(value);
              const sheetsToLoad =
                value === 'operational'
                  ? [sheetNames.find(s => s.toLowerCase().includes('operational'))]
                  : value === 'application'
                    ? [sheetNames.find(s => s.toLowerCase().includes('application'))]
                    : sheetNames;
              loadDataFromSheets(workbook, sheetsToLoad);
            }}
          >
            <option value="fusion">Fusionnées</option>
            <option value="operational">Operational Logs</option>
            <option value="application">Application Logs</option>
          </select>
        </div>
      )}

      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setAdminView(true)}>🔒 Page Admin</button>
        {sheetNames.length > 0 && (
          <button onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
            {viewMode === 'table' ? 'Afficher Calendrier' : 'Afficher Tableau'}
          </button>
        )}
      </div>
      <Router>
        <nav style={{ margin: 10 }}>
          <Link to="/" style={{ marginRight: 10 }}>🏠 Logs</Link>
          <Link to="/dashboard">📊 Dashboard</Link>
        </nav>

        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Router>

      {sheetNames.length > 0 && (
        <>
          <Filters
            originalData={data}
            setFilteredData={setFilteredData}
            setCurrentPage={setCurrentPage}
            onMonthFilterChange={(isSelected) => setIsMonthSelected(isSelected)}
            onMonthYearChange={(date) => setCalendarStartDate(date)}
          />
          {viewMode === 'table' ? (
            <>
              <ExportPdfBtn
                filteredData={filteredData}
                currentPage={currentPage}
                pageSize={isMonthSelected ? -1 : pageSize}
                adminNotes={adminNotes}
              />
              <DataTable
                data={filteredData}
                pageSize={isMonthSelected ? -1 : pageSize}
                currentPage={currentPage}
              />
              {!isMonthSelected && (
                <PaginationControls
                  currentPage={currentPage}
                  setCurrentPage={setCurrentPage}
                  totalItems={filteredData.length}
                  pageSize={pageSize}
                />
              )}
            </>
          ) : (
            <CalendarView data={filteredData} initialDate={calendarStartDate} />
          )}
        </>
      )}
    </div>
  );
}

export default App;
