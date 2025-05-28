// ✅ MainPage.jsx avec chargement de adminNotes depuis Supabase
import React, { useState, useEffect } from 'react';
import SheetSelector from './components/SheetSelector';
import Filters from './components/Filters';
import DataTable from './components/DataTable';
import CalendarView from './components/CalendarView';
import PaginationControls from './components/PaginationControls';
import ExportPdfBtn from './components/ExportPdfBtn';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';
import * as XLSX from 'xlsx';

function getRecurringDatesForWeekdayInRange(weekday, startDate, endDate) {
  const dayMap = {
    "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3,
    "Thursday": 4, "Friday": 5, "Saturday": 6
  };
  const result = [];
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  while (d <= endDate) {
    if (d.getDay() === dayMap[weekday]) result.push(new Date(d));
    d.setDate(d.getDate() + 1);
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
      try {
        const res = await fetch('/.netlify/functions/getLatestExcel');
        const { url } = await res.json();
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
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
      } catch (err) {
        console.error('Erreur chargement automatique depuis Supabase:', err);
      }
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
  }, [adminNotes, workbook, sheetNames, dataSource]);

  const loadDataFromSheets = (wb, sheets) => {
    const allData = sheets.flatMap((sheetName) => {
      const sheet = wb.Sheets[sheetName];
      let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
      rawData = cleanEmptyValues(rawData, sheetName);
      rawData = removeFirstColumn(rawData);
      return rawData;
    });

    const minDate = new Date(calendarStartDate || new Date());
    minDate.setMonth(minDate.getMonth() - 1); // 🔁 Inclure le mois précédent

    const maxDate = new Date(minDate);
    maxDate.setMonth(maxDate.getMonth() + 1); // 🔁 Inclure le mois courant + suivant




    const enrichedAllData = allData.map(row => {
      const dateStr = Object.values(row).find(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v));
      return {
        ...row,
        Date: row.Date || dateStr || ''
      };
    });

    const filteredAdminNotes = adminNotes.filter(note => {
      return (
        dataSource === 'fusion' ||
        !note.log_type ||
        note.log_type === dataSource
      );
    });


    const recurring = generateRecurringEntries(filteredAdminNotes, minDate, maxDate);
    const mergedData = [...enrichedAllData, ...recurring];

    const allKeys = new Set(mergedData.flatMap(row => Object.keys(row)));
    const normalizedMerged = mergedData.map(row => {
      const normalizedRow = {};
      allKeys.forEach(k => {
        normalizedRow[k] = row[k] || '';
      });
      return normalizedRow;
    }).sort((a, b) => {
      const dateA = new Date(a.Date || '');
      const dateB = new Date(b.Date || '');
      
      return dateA - dateB;
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
        <div className="top-buttons">
          <button className='accent-button' onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
            {viewMode === 'table' ? '📅 Afficher Calendrier' : '📋 Afficher Tableau'}
          </button>
          <ExportPdfBtn
            filteredData={filteredData}
            currentPage={currentPage}
            pageSize={isMonthSelected ? -1 : pageSize}
            adminNotes={adminNotes}
            selectedColumns={exportColumns}
          />
        </div>
      </div>

      {sheetNames.length > 1 && (
        <div id="filters-wrapper">
          <label>
            Feuilles à afficher :
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
                      : sheetNames.filter(s => !s.toLowerCase().includes('dashboard'));
                setSelectedSheet(sheetsToLoad);
                loadDataFromSheets(workbook, sheetsToLoad);
              }}
              style={{ marginLeft: '0.5rem' }}
            >
              <option value="fusion">Fusionnées</option>
              <option value="operational">Operational Logs</option>
              <option value="application">Application Logs</option>
            </select>
          </label>
          <Filters
            originalData={data}
            setFilteredData={setFilteredData}
            setCurrentPage={setCurrentPage}
            onMonthFilterChange={setIsMonthSelected}
            onMonthYearChange={setCalendarStartDate}
          />
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


      {sheetNames.length > 0 && (
        viewMode === 'table' ? (
          <>
            <DataTable
              data={filteredData}
              pageSize={isMonthSelected ? -1 : pageSize}
              currentPage={currentPage}
              sheetname={selectedSheet}
              onRowClick={(row) => setSelectedEntry(row)}
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
        )
      )}
    </div>
  );
}
