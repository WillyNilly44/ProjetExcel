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

export default function MainPage({ workbook, setWorkbook, sheetNames, setSheetNames, adminNotes }) {
    const [selectedSheet, setSelectedSheet] = useState('');
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize] = useState(50);
    const [viewMode, setViewMode] = useState('table');
    const [dataSource, setDataSource] = useState('fusion');
    const [isMonthSelected, setIsMonthSelected] = useState(false);
    const [calendarStartDate, setCalendarStartDate] = useState(null);
    

    const handleWorkbookLoaded = (wb, validSheets) => {
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

    return (
        <div className="App" style={{ padding: 20 }}>
            <h2>📁 Operational & Application Logs</h2>
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
                                        : sheetNames.filter(s => !s.toLowerCase().includes('dashboard'));
                            loadDataFromSheets(workbook, sheetsToLoad);
                        }}
                    >
                        <option value="fusion">Fusionnées</option>
                        <option value="operational">Operational Logs</option>
                        <option value="application">Application Logs</option>
                    </select>
                </div>
            )}

            {sheetNames.length > 0 && (
                <>
                    <Filters
                        originalData={data}
                        setFilteredData={setFilteredData}
                        setCurrentPage={setCurrentPage}
                        onMonthFilterChange={setIsMonthSelected}
                        onMonthYearChange={setCalendarStartDate}
                    />
                    {viewMode === 'table' ? (
                        <>
                            <ExportPdfBtn
                                filteredData={filteredData}
                                currentPage={currentPage}
                                pageSize={isMonthSelected ? -1 : pageSize}
                                adminNotes={adminNotes}
                            />
                            <div style={{ margin: '10px 0' }}>
                                <button onClick={() => setViewMode(viewMode === 'table' ? 'calendar' : 'table')}>
                                    {viewMode === 'table' ? '📅 Afficher Calendrier' : '📋 Afficher Tableau'}
                                </button>
                            </div>
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
