// ===============================
// src/App.jsx
import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import SheetSelector from './components/SheetSelector';
import Filters from './components/Filters';
import DataTable from './components/DataTable';
import CalendarView from './components/CalendarView';
import PaginationControls from './components/PaginationControls';
import ExportPdfBtn from './components/ExportPdfBtn';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';
import * as XLSX from 'xlsx';
import AdminLogin from './AdminLogin';
import AdminPanel from './AdminPanel';


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
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('admin') === 'true';
  });



  const handleWorkbookLoaded = (wb, validSheets) => {
    setWorkbook(wb);
    setSheetNames(validSheets);
    setSelectedSheet(validSheets[0]);
    loadSheet(wb, validSheets[0]);
  };

  const loadSheet = (wb, sheetName) => {
    const sheet = wb.Sheets[sheetName];
    let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
    rawData = cleanEmptyValues(rawData, sheetName);
    rawData = removeFirstColumn(rawData);
    setData(rawData);
    setFilteredData(rawData);
    setCurrentPage(0);
  };

  return (
    <div className="App">
      <h2>Operational & Application Logs</h2>
      <Route path="/admin" element={
        isAdmin ? <AdminPanel /> : <AdminLogin onLogin={() => setIsAdmin(true)} />
      } />

      <FileUpload onWorkbookLoaded={handleWorkbookLoaded} />
      {sheetNames.length > 0 && (
        <>
          <SheetSelector
            sheetNames={sheetNames}
            selectedSheet={selectedSheet}
            onSelect={(name) => {
              setSelectedSheet(name);
              loadSheet(workbook, name);
            }}
          />
          <Filters
            originalData={data}
            setFilteredData={setFilteredData}
            setCurrentPage={setCurrentPage}
            onMonthFilterChange={(isSelected) => setIsMonthSelected(isSelected)}
            onMonthYearChange={(date) => setCalendarStartDate(date)}
          />
          <div style={{ marginBottom: '10px' }}>
            <button onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
              {viewMode === 'table' ? 'Afficher Calendrier' : 'Afficher Tableau'}
            </button>
          </div>
          {viewMode === 'table' ? (
            <>
              <ExportPdfBtn
                filteredData={filteredData}
                currentPage={currentPage}
                pageSize={pageSize}
                sheetName={selectedSheet}
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
