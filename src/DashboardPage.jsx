import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { cleanEmptyValues, removeFirstColumn } from './utils/excelUtils';

export default function DashboardPage({ workbook }) {
  const [summaryData, setSummaryData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [weeklyHeaders, setWeeklyHeaders] = useState([]);
  const [averageLine, setAverageLine] = useState([]);

  useEffect(() => {
    if (!workbook) return;

    const dashboardSheetName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('dashboard')
    );
    if (!dashboardSheetName) return;

    const sheet = workbook.Sheets[dashboardSheetName];

    // === LECTURE DU TABLEAU 1 : Résumé annuel (Année / Stats)
    const rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const summaryStartIndex = rawMatrix.findIndex(row => row.includes("Année"));
    const summaryHeaders = rawMatrix[summaryStartIndex] || [];
    const summaryRows = rawMatrix
      .slice(summaryStartIndex + 1, summaryStartIndex + 15)
      .filter(row => row.some(cell => cell !== ''));
    const formattedSummary = summaryRows.map(row => {
      const obj = {};
      summaryHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    setSummaryData(formattedSummary);

    // === LECTURE DU TABLEAU 2 : Détails hebdomadaires (format MainPage)
    let rawData = XLSX.utils.sheet_to_json(sheet, { range: 5, defval: '' });
    rawData = cleanEmptyValues(rawData, dashboardSheetName);
    rawData = removeFirstColumn(rawData);

    if (rawData.length > 0) {
      setWeeklyHeaders(Object.keys(rawData[0]));
      setWeeklyData(rawData);
    }

    // === Ligne "Average = ..." (après en-tête)
    const weeklyStartIndex = rawMatrix.findIndex(row => row.includes("Week"));
    const avgRow = rawMatrix[weeklyStartIndex + 1] || [];
    setAverageLine(avgRow);
  }, [workbook]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Dashboard</h2>

      {/* === Tableau 1 === */}
      <h3>Statistiques globales (par année)</h3>
      {summaryData.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 30 }}>
          <thead>
            <tr>
              {Object.keys(summaryData[0]).map((col, idx) => (
                <th key={idx} style={{ border: '1px solid #ccc', background: '#f0f4f8', padding: 8 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, rIdx) => (
              <tr key={rIdx}>
                {Object.values(row).map((val, cIdx) => (
                  <td key={cIdx} style={{ border: '1px solid #eee', padding: 8 }}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les statistiques globales.</p>
      )}

      {/* === Tableau 2 === */}
      <h3>Détails hebdomadaires</h3>
      {weeklyData.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {weeklyHeaders.map((col, idx) => (
                <th key={idx} style={{ border: '1px solid #ccc', background: '#f0f4f8', padding: 8 }}>
                  {col.startsWith('__EMPTY') ? '' : col}
                </th>
              ))}
            </tr>
            <tr>
              {averageLine.map((val, idx) => (
                <td key={idx} style={{
                  border: '1px solid #ddd',
                  background: '#fafafa',
                  fontStyle: 'italic',
                  color: '#888',
                  padding: 6
                }}>
                  {typeof val === 'string' && val.toLowerCase().includes('average') ? val : ''}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeklyData.map((row, rIdx) => (
              <tr key={rIdx}>
                {weeklyHeaders.map((key, cIdx) => {
                  const val = row[key];
                  let backgroundColor;

                  if (typeof val === 'number') {
                    const k = key.toLowerCase();

                    if (k.includes('maintenance')) {
                      if (val > 16) backgroundColor = '#ffcccc'; // rouge
                      else if (val >= 5) backgroundColor = '#fffacc'; // jaune
                      else backgroundColor = '#d5fdd5'; // vert
                    } else if (k.includes('incident')) {
                      backgroundColor = val >= 30 ? '#fffacc' : '#d5fdd5';
                    } else if (k.includes('impact') && val > 0) {
                      backgroundColor = '#ffe0e0';
                    }
                  }

                  return (
                    <td key={cIdx} style={{ border: '1px solid #eee', padding: 8, backgroundColor }}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les semaines.</p>
      )}
    </div>
  );
}
