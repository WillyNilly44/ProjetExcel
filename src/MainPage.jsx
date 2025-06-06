import React, { useState, useEffect, Suspense } from 'react';
import CalendarView from './components/CalendarView';
import PaginationControls from './components/PaginationControls';
import ExportPdfBtn from './components/ExportPdfBtn';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';
import * as XLSX from 'xlsx';

const DataTable = React.lazy(() => import('./components/DataTable'));
const Filters = React.lazy(() => import('./components/Filters'));

function getRecurringDatesForWeekdayInRange(weekday, startDate, endDate) {
  const dayMap = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
    "Thursday": 4, "Friday": 5, "Saturday": 6
  };
  const result = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (current <= end) {
    if (current.getDay() === dayMap[weekday]) {
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
  const mapping = {
    "__EMPTY_1": "Incident (event)",
    "__EMPTY_2": "Start (hrs)",
    "__EMPTY_3": "End (hrs)",
    "__EMPTY_4": "Acc. Business Impact",
    "__EMPTY_5": "Real time (hrs)",
    "Business impact ?": "Impact?",
    "Duration (hrs)": "Est. Duration (hrs)",
  };
  return mapping[key] || key;
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

  useEffect(() => {
    const fetchAdminNotes = async () => {
      try {
        const res = await fetch('/.netlify/functions/getAdminNotes');
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          setAdminNotes(json.data || []);
          setIsLoading(false);
        } catch (err) {
          console.error("Contenu invalide depuis getAdminNotes:", text);
        }
      } catch (err) {
        console.error('Erreur chargement adminNotes :', err);
      }
    };
    fetchAdminNotes();
  }, []);

  useEffect(() => {
    const fetchLatestExcel = async () => {
      const cacheKey = 'excel-buffer-cache';
      const cached = sessionStorage.getItem(cacheKey);

      let arrayBuffer;

      if (cached) {
        arrayBuffer = base64ToArrayBuffer(cached);
      } else {
        try {
          sessionStorage.removeItem('excel-buffer-cache');
          const res = await fetch('/.netlify/functions/getLatestExcel');
          const { url } = await res.json();
          const response = await fetch(url);
          arrayBuffer = await response.arrayBuffer();

          const base64 = arrayBufferToBase64(arrayBuffer);
          sessionStorage.setItem(cacheKey, base64);
        } catch (err) {
          console.error('Erreur chargement automatique depuis Supabase:', err);
          return;
        }
      }

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const validSheets = workbook.SheetNames.filter(name =>
        name.toLowerCase().includes('operational') ||
        name.toLowerCase().includes('application')
      );

      if (validSheets.length === 0) {
        alert("Aucune feuille valide trouvée.");
        return;
      }

      setWorkbook(workbook);
      setSheetNames(validSheets);
      setIsLoading(false);
      setSelectedSheet('fusion');
      loadDataFromSheets(workbook, validSheets);
    };

    fetchLatestExcel();
  }, []);

  useEffect(() => {
    if (workbook && sheetNames.length > 0 && adminNotes.length > 0) {
      const sheetsToLoad =
        dataSource === 'operational'
          ? [sheetNames.find(s => s.toLowerCase().includes('operational'))]
          : dataSource === 'application'
            ? [sheetNames.find(s => s.toLowerCase().includes('application'))]
            : sheetNames.filter(s => !s.toLowerCase().includes('dashboard'));
      loadDataFromSheets(workbook, sheetsToLoad);
    }
  }, [adminNotes, workbook, sheetNames, dataSource, calendarStartDate, isMonthSelected]);

  const loadDataFromSheets = (wb, sheets) => {
    const allData = sheets.flatMap((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
      rawData = cleanEmptyValues(rawData, sheetName);
      rawData = removeFirstColumn(rawData);
      return rawData;
    });

    console.log('=== loadDataFromSheets DEBUG ===');
    console.log('calendarStartDate:', calendarStartDate);
    console.log('isMonthSelected:', isMonthSelected);

    let minDate, maxDate;

    if (calendarStartDate) {
       console.log('Inside calendarStartDate block');
      if (isMonthSelected) {
        console.log('Taking MONTH path');
        const today = new Date();
        minDate = new Date(calendarStartDate);
        minDate.setDate(1);
        minDate.setHours(0, 0, 0, 0);

        // Find next Sunday from today
        maxDate = new Date(today);
        const daysUntilSunday = (7 - today.getDay()) % 7; // Days until next Sunday
        if (daysUntilSunday === 0 && today.getDay() !== 0) {
          // If today is not Sunday, go to next Sunday
          maxDate.setDate(today.getDate() + 7);
        } else if (today.getDay() === 0) {
          // If today is Sunday, use today
          maxDate = new Date(today);
        } else {
          // Go to next Sunday
          maxDate.setDate(today.getDate() + daysUntilSunday);
        }
        maxDate.setHours(23, 59, 59, 999);
      } else {
        console.log('Taking WEEK path');

        const startDate = new Date(calendarStartDate);
        console.log('Parsed start date:', startDate, 'Day of week:', startDate.getDay());

        // Find the Monday of this week
        const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = dayOfWeek === 0 ? -6 : -(dayOfWeek - 1); // If Sunday, go back 6 days, otherwise go back to Monday

        minDate = new Date(startDate);
        minDate.setDate(startDate.getDate() + daysToMonday);
        minDate.setHours(0, 0, 0, 0);

        // Sunday is 6 days after Monday
        maxDate = new Date(minDate);
        maxDate.setDate(minDate.getDate() + 6);
        maxDate.setHours(23, 59, 59, 999);

        console.log('Adjusted to Monday-Sunday:',
          'Start:', minDate.toISOString().split('T')[0],
          'End:', maxDate.toISOString().split('T')[0]);
      }
    } else {
      console.log('Taking DEFAULT path (no calendarStartDate)');
      const today = new Date();
      maxDate = new Date(today);
      maxDate.setHours(23, 59, 59, 999);

      minDate = new Date(today);
      minDate.setDate(minDate.getDate() - 30);
      minDate.setHours(0, 0, 0, 0);
    }
     console.log('Final date range:', minDate, 'to', maxDate);
  console.log('=== END DEBUG ===');

    const enrichedAllData = allData.map(row => {
      const dateStr = Object.values(row).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
      return {
        ...row,
        Date: row.Date || dateStr || ''
      };
    });

    const filteredAdminNotes = adminNotes.filter(note =>
      !note.weekday || note.log_type === dataSource || dataSource === 'fusion'
    );

    const recurring = generateRecurringEntries(filteredAdminNotes, minDate, maxDate);
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
      return dateB - dateA;
    });

    setData(normalizedMerged);
    setFilteredData(normalizedMerged);
    setCurrentPage(0);
  };
  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', paddingTop: '50px' }}>
        <img src="https://i.gifer.com/ZZ5H.gif" alt="Chargement..." style={{ width: '100px' }} />
        <p>Chargement des données...</p>
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
              Feuilles à afficher :
            </label>
            <select
              id="dataSourceSelect"
              value={dataSource}
              onChange={(e) => setDataSource(e.target.value)}
              style={{ height: '32px', minWidth: '120px', fontSize: '14px' }}
            >
              <option value="fusion">Fusionnées</option>
              <option value="operational">Operational Logs</option>
              <option value="application">Application Logs</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Filters
              originalData={data}
              setFilteredData={setFilteredData}
              setCurrentPage={setCurrentPage}
              onMonthFilterChange={setIsMonthSelected}
              onMonthYearChange={setCalendarStartDate}
            />
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
            onClick={() =>
              setViewMode(viewMode === 'table' ? 'calendar' : 'table')
            }
          >
            {viewMode === 'table' ? '📅 Afficher Calendrier' : '📋 Afficher Tableau'}
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
            <h3>Détails de l'entrée</h3>
            <table style={{ width: '100%' }}>
              <tbody>
                {Object.entries(selectedEntry).map(([key, value]) => (
                  <tr key={key}>
                    <td style={{ fontWeight: 'bold', padding: '4px 8px', verticalAlign: 'top' }}>{renameField(key)}</td>
                    <td style={{ padding: '4px 8px' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 20 }}>
              <button onClick={() => setSelectedEntry(null)} style={{ padding: '6px 12px', cursor: 'pointer' }}>
                Fermer
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
                <Suspense fallback={<p>Chargement...</p>}>
                  <DataTable
                    data={filteredData}
                    pageSize={isMonthSelected ? -1 : pageSize}
                    currentPage={currentPage}
                    sheetname={selectedSheet}
                    onRowClick={(row) => setSelectedEntry(row)}
                    visibleColumns={exportColumns}
                  />
                </Suspense>

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
          </div>
        )}
      </div>
    </div>
  );
}