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

export default function MainPage() {
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50);
  const [viewMode, setViewMode] = useState('table');
  const [adminNotes, setAdminNotes] = useState([]);

  const handleWorkbookLoaded = (wb, validSheets) => {
    setWorkbook(wb);

    // Exclure "Dashboard"
    const filteredSheets = validSheets.filter(name =>
      !name.toLowerCase().includes('dashboard')
    );

    setSheetNames(filteredSheets);

    // expose pour DashboardPage
    window.workbookDashboard = wb;

    if (filteredSheets.length > 0) {
      setSelectedSheet(filteredSheets[0]);
      loadSheet(wb, filteredSheets[0]);
    }
  };

  const loadSheet = (wb, sheetName) => {
    const sheet = wb.Sheets[sheetName];
    let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
    rawData = cleanEmptyValues(rawData, sheetName);
    rawData = removeFirstColumn(rawData);

    // Tri du plus récent au plus ancien
    rawData.sort((a, b) => {
      const dateA = new Date(Object.values(a).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || 0);
      const dateB = new Date(Object.values(b).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) || 0);
      return dateB - dateA;
    });

    setData(rawData);
    setFilteredData(rawData);
    setCurrentPage(0);
  };

  return (
    <div className="App" style={{ padding: 20 }}>
      <h2>📁 Operational & Application Logs</h2>

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
          />

          <div style={{ margin: '10px 0' }}>
            <button onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
              {viewMode === 'table' ? '📅 Afficher Calendrier' : '📋 Afficher Tableau'}
            </button>
          </div>

          {viewMode === 'table' ? (
            <>
              <ExportPdfBtn
                filteredData={filteredData}
                currentPage={currentPage}
                pageSize={pageSize}
                sheetName={selectedSheet}
                adminNotes={adminNotes}
              />
              <DataTable
                data={filteredData}
                pageSize={pageSize}
                currentPage={currentPage}
              />
              <PaginationControls
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                totalItems={filteredData.length}
                pageSize={pageSize}
              />
            </>
          ) : (
            <CalendarView data={filteredData} />
          )}
        </>
      )}
    </div>
  );
}
