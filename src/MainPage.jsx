import React, { useState, useEffect, Suspense, useCallback, useMemo, useRef } from 'react';
import CalendarView from './components/CalendarView';
import PaginationControls from './components/PaginationControls';
import ExportPdfBtn from './components/ExportPdfBtn';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';
import * as XLSX from 'xlsx';

const DataTable = React.lazy(() => import('./components/DataTable'));
const Filters = React.lazy(() => import('./components/Filters'));
const CACHE_KEY = 'excel-buffer-cache';
const DAY_MAP = {
  "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
  "Thursday": 4, "Friday": 5, "Saturday": 6
};
const FIELD_MAPPINGS = {
  "__EMPTY_1": "Incident (event)",
  "__EMPTY_2": "Start (hrs)",
  "__EMPTY_3": "End (hrs)",
  "__EMPTY_4": "Acc. Business Impact",
  "__EMPTY_5": "Real time (hrs)",
  "Business impact ?": "Impact?",
  "Duration (hrs)": "Est. Duration (hrs)",
};
function getRecurringDatesForWeekdayInRange(weekday, startDate, endDate) {
  const result = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (current.getDay() === DAY_MAP[weekday]) {
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return result;
}

function generateRecurringEntries(adminNotes, minDate, maxDate) {
  const entries = [];
  for (const note of adminNotes) {
    if (!note.weekday) continue;
    const dates = getRecurringDatesForWeekdayInRange(note.weekday, minDate, maxDate);
    for (const dateObj of dates) {
      entries.push({
        Incident: note.incident || '',
        District: note.district || '',
        Date: dateObj.toISOString().split('T')[0],
        Event: note.maint_event || '',
        __EMPTY_1: note.incident_event || '',
        "Business impact ?": note.business_impact || '',
        RCA: note.rca || '',
        "Duration (hrs)": note.est_duration_hrs || '',
        __EMPTY_2: note.start_duration_hrs || '',
        __EMPTY_3: note.end_duration_hrs || '',
        __EMPTY_4: note.accumulated_business_impact || '',
        __EMPTY_5: note.real_time_duration_hrs || '',
        "Ticket #": note.ticket_number || '',
        Assigned: note.assigned || '',
        Note: note.note || '',
        __isAdminNote: true
      });
    }
  }
  return entries;
}

function renameField(key) {
  return FIELD_MAPPINGS[key] || key;
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function MainPage({ workbook, setWorkbook, sheetNames, setSheetNames, exportColumns }) {
  const [isLoading, setIsLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(50);
  const [viewMode, setViewMode] = useState('table');
  const [dataSource, setDataSource] = useState('fusion');
  const [isMonthSelected, setIsMonthSelected] = useState(false);
  const [calendarStartDate, setCalendarStartDate] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const filtersRef = useRef();

  const sheetsToLoad = useMemo(() => {
    if (!sheetNames.length) return [];
    
    if (dataSource === 'operational') {
      return [sheetNames.find(s => s.toLowerCase().includes('operational'))].filter(Boolean);
    }
    if (dataSource === 'application') {
      return [sheetNames.find(s => s.toLowerCase().includes('application'))].filter(Boolean);
    }
    return sheetNames.filter(s => !s.toLowerCase().includes('dashboard'));
  }, [dataSource, sheetNames]);

  const loadDataFromSheets = useCallback((wb, sheets) => {
    if (!sheets.length || !adminNotes.length) return;

    const allData = sheets.flatMap((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
      rawData = cleanEmptyValues(rawData, sheetName);
      rawData = removeFirstColumn(rawData);
      return rawData;
    });

    const enrichedAllData = allData.map(row => {
      const dateStr = Object.values(row).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
      return {
        ...row,
        Date: row.Date || dateStr || ''
      };
    });

    const today = new Date();
    const threeMonthsAgo = new Date(today);
    threeMonthsAgo.setMonth(today.getMonth() - 3);

    const filteredAdminNotes = adminNotes.filter(note =>
      !note.weekday || note.log_type === dataSource || dataSource === 'fusion'
    );

    const recurring = generateRecurringEntries(filteredAdminNotes, threeMonthsAgo, today);
    const mergedData = [...enrichedAllData, ...recurring];

    const allKeys = new Set(mergedData.flatMap(row => Object.keys(row)));
    const normalizedMerged = mergedData.map(row => {
      const normalizedRow = {};
      allKeys.forEach(k => {
        normalizedRow[k] = row[k] || '';
      });

      if (normalizedRow.Date) {
        const d = new Date(normalizedRow.Date);
        if (!isNaN(d)) {
          normalizedRow.Date = d.toISOString().split('T')[0];
        }
      }
      return normalizedRow;
    }).sort((a, b) => {
      const dateA = new Date(a.Date);
      const dateB = new Date(b.Date);

      if (isNaN(dateA)) return 1;
      if (isNaN(dateB)) return -1;
      return dateA - dateB;
    });

    setData(normalizedMerged);
    setFilteredData(normalizedMerged);
    setCurrentPage(0);
  }, [adminNotes, dataSource]);

  const fetchAdminNotes = useCallback(async () => {
    try {
      const res = await fetch('/.netlify/functions/getAdminNotes');
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setAdminNotes(json.data || []);
        setIsLoading(false);
      } catch (err) {
        console.error("Invalid content from getAdminNotes:", text);
      }
    } catch (err) {
      console.error('Error loading adminNotes:', err);
    }
  }, []);

  const fetchLatestExcel = useCallback(async () => {

    sessionStorage.removeItem(CACHE_KEY);
    
    const cached = sessionStorage.getItem(CACHE_KEY);
    let arrayBuffer;

    if (cached) {
      arrayBuffer = base64ToArrayBuffer(cached);
    } else {
      try {
        sessionStorage.removeItem(CACHE_KEY);
        
        const timestamp = Date.now();
        const res = await fetch(`/.netlify/functions/getLatestExcel?t=${timestamp}`, {
          cache: 'no-store',  
          headers: {          
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        const { url } = await res.json();
        
        const fileUrlWithCacheBuster = `${url}${url.includes('?') ? '&' : '?'}t=${timestamp}`;
        
        const response = await fetch(fileUrlWithCacheBuster, {
          cache: 'no-store',  
          headers: {          
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        arrayBuffer = await response.arrayBuffer();

        const base64 = arrayBufferToBase64(arrayBuffer);
        sessionStorage.setItem(CACHE_KEY, base64);
      } catch (err) {
        console.error('Error auto-loading from Supabase:', err);
        return;
      }
    }

    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const validSheets = wb.SheetNames.filter(name =>
      name.toLowerCase().includes('operational') ||
      name.toLowerCase().includes('application')
    );

    if (validSheets.length === 0) {
      alert("No valid sheets found.");
      return;
    }

    setWorkbook(wb);
    setSheetNames(validSheets);
    setIsLoading(false);
    setSelectedSheet('fusion');
    loadDataFromSheets(wb, validSheets);
  }, [loadDataFromSheets]);

  const handleDataSourceChange = useCallback((e) => {
    setDataSource(e.target.value);
  }, []);

  const handleViewModeToggle = useCallback(() => {
    setViewMode(prev => prev === 'table' ? 'calendar' : 'table');
  }, []);

  const handleRowClick = useCallback((row) => {
    setSelectedEntry(row);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedEntry(null);
  }, []);

  const handleResetFilters = () => {
    setFilteredData(data);
    setCurrentPage(0);
    setIsMonthSelected(false);
    setCalendarStartDate(new Date());
    
    if (filtersRef.current) {
      filtersRef.current.resetFilters();
    }
  };

  const handleManualRefresh = async () => {
    setIsLoading(true);
    
    sessionStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_KEY);
    
    await fetchLatestExcel();
    
    setIsLoading(false);
    
  };

  useEffect(() => {
    fetchAdminNotes();
  }, [fetchAdminNotes]);

  useEffect(() => {
    fetchLatestExcel();
  }, [fetchLatestExcel]);

  useEffect(() => {
    if (workbook && sheetsToLoad.length > 0 && adminNotes.length > 0) {
      loadDataFromSheets(workbook, sheetsToLoad);
    }
  }, [workbook, sheetsToLoad, adminNotes, loadDataFromSheets]);

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '50px' }}>
        <img src="https://i.gifer.com/ZZ5H.gif" alt="Loading..." style={{ width: '100px' }} />
        <p>Loading data...</p>
      </div>
    );
  }

  return (
    <div className="App" style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>📁 Operational & Application Logs</h2>
      </div>

      {sheetNames.length > 1 && (
        <div
          id="filters-wrapper"
          style={{
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'flex-start',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '0.5rem 0',
            overflowX: 'auto',
            width: '100%'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <label htmlFor="dataSourceSelect" style={{ whiteSpace: 'nowrap', fontSize: '14px' }}>
              Sheets to display:
            </label>
            <select
              id="dataSourceSelect"
              value={dataSource}
              onChange={handleDataSourceChange}
              style={{ height: '32px', minWidth: '120px', fontSize: '14px' }}
            >
              <option value="fusion">Merged</option>
              <option value="operational">Operational Logs</option>
              <option value="application">Application Logs</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Filters
              ref={filtersRef}
              originalData={data}
              setFilteredData={setFilteredData}
              setCurrentPage={setCurrentPage}
              onMonthFilterChange={setIsMonthSelected}
              onMonthYearChange={setCalendarStartDate}
            />

            {/* Reset Filter Button */}
            <button
              onClick={handleResetFilters}
              className="btn-gradient-warning px-4 py-2 text-white font-semibold rounded-xl flex items-center gap-2 text-sm shadow-lg hover-lift"
              style={{
                height: '32px',
                fontSize: '14px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                lineHeight: '1',
                boxSizing: 'border-box'
              }}
            >
              <span>🔄</span>
              Reset Filters
            </button>

            <button
              onClick={handleManualRefresh}
              className="btn-gradient-primary px-4 py-2 text-white font-semibold rounded-xl flex items-center gap-2 text-sm shadow-lg hover-lift"
              style={{
                height: '32px',
                fontSize: '14px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                lineHeight: '1',
                boxSizing: 'border-box'
              }}
            >
              <span>⟳</span>
              Refresh Data
            </button>
          </div>

          <button
            className="accent-button"
            style={{
              height: '32px',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              padding: '0 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              lineHeight: '1',
              boxSizing: 'border-box'
            }}
            onClick={handleViewModeToggle}
          >
            {viewMode === 'table' ? '📅 Show Calendar' : '📋 Show Table'}
          </button>

          <div style={{ height: '32px', display: 'flex', alignItems: 'center' }}>
            <ExportPdfBtn
              filteredData={filteredData}
              currentPage={currentPage}
              pageSize={isMonthSelected ? -1 : pageSize}
              adminNotes={adminNotes}
              selectedColumns={exportColumns}
              style={{
                height: '32px !important',
                fontSize: '14px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                lineHeight: '1',
                boxSizing: 'border-box',
                margin: '0'
              }}
            />
          </div>
        </div>
      )}

      {selectedEntry && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#222',
            color: 'white',
            padding: 20,
            borderRadius: 8,
            maxWidth: '90%',
            maxHeight: '80%',
            overflowY: 'auto'
          }}>
            <h3>Entry Details</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.entries(selectedEntry).map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', verticalAlign: 'top' }}>
                      {renameField(key)}
                    </td>
                    <td style={{ padding: '4px 8px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button onClick={handleCloseModal} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%'
      }}>
        {sheetNames.length > 0 && (
          <div style={{ width: '100%', maxWidth: '1200px' }}>
            {viewMode === 'table' ? (
              <>
                <Suspense fallback={<p>Loading...</p>}>
                  <DataTable
                    data={filteredData}
                    pageSize={-1}
                    currentPage={currentPage}
                    sheetname={selectedSheet}
                    onRowClick={handleRowClick}
                    visibleColumns={exportColumns}
                  />
                </Suspense>

                {filteredData.length === data.length && (
                  <PaginationControls
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalItems={filteredData.length}
                    pageSize={pageSize}
                  />
                )}
              </>
            ) : (
              <CalendarView
                data={filteredData}
                initialDate={calendarStartDate}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}