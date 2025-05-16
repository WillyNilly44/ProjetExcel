import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';

// Liste statique des mois (en français)
const MONTH_OPTIONS = [
  'Tous', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

export default function DashboardPage({ workbook }) {
  const [summaryData, setSummaryData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [weeklyHeaders, setWeeklyHeaders] = useState([]);
  const [averageLine, setAverageLine] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('Tous');

  useEffect(() => {
    if (!workbook) return;

    const dashboardSheetName = workbook.SheetNames.find(name =>
      name.toLowerCase().includes('dashboard')
    );
    if (!dashboardSheetName) return;

    const sheet = workbook.Sheets[dashboardSheetName];

    // === TABLEAU 1 : Statistiques globales
    const summaryRaw = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: 'F2:H11',
      defval: ''
    });
    const [summaryHeaders, ...summaryRows] = summaryRaw;
    const formattedSummary = summaryRows.map(row => {
      const obj = {};
      summaryHeaders.forEach((h, i) => obj[h] = row[i]);
      return obj;
    });
    setSummaryData(formattedSummary);

    // === TABLEAU 2 : Détails hebdomadaires
    const weeklyHeadersRow = [
      "Month", "Week",
      "Maintenance (count)", "Maintenance (hrs)",
      "Incidents (count)", "Incidents (hrs)",
      "Business Impact (count)", "Business Impact (hrs)"
    ];

    const fullSheet = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    const weeklyStartIndex = 10;

    const rawAvgRow = fullSheet[weeklyStartIndex + 1] || [];
    const averageLineFixed = weeklyHeadersRow.map((_, idx) => rawAvgRow[idx] ?? '');

    const dataRows = fullSheet
      .slice(weeklyStartIndex + 2)
      .filter(row => row.some(cell => cell !== ''));

    const formattedWeekly = dataRows.map(row => {
      const obj = {};
      weeklyHeadersRow.forEach((h, i) => {
        obj[h] = row[i];
      });
      return obj;
    });

    // Tri du plus récent au plus ancien (basé sur la valeur Month brute)
    formattedWeekly.sort((a, b) => {
      const dateA = new Date(a["Month"]);
      const dateB = new Date(b["Month"]);
      return dateB - dateA;
    });

    setWeeklyHeaders(weeklyHeadersRow);
    setAverageLine(averageLineFixed);
    setWeeklyData(formattedWeekly);
    setFilteredData(formattedWeekly);
  }, [workbook]);

  useEffect(() => {
    if (selectedMonth === "Tous") {
      setFilteredData(weeklyData);
    } else {
      const moisMinuscule = selectedMonth.toLowerCase();
      setFilteredData(
        weeklyData.filter(row =>
          row["Month"]?.toString().toLowerCase().includes(moisMinuscule)
        )
      );
    }
  }, [selectedMonth, weeklyData]);

  return (
    <div style={{ padding: 20 }}>
      <h2>📊 Feuille Dashboard</h2>

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
      ) : <p style={{ color: 'gray' }}>Aucune donnée trouvée pour les statistiques globales.</p>}

      {/* === Tableau 2 === */}
      <h3>Détails hebdomadaires</h3>

      {/* Menu filtre par mois */}
      <div style={{ marginBottom: 10 }}>
        <label>Filtrer par mois : </label>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
          {MONTH_OPTIONS.map((m, i) => (
            <option key={i} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {filteredData.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {weeklyHeaders.map((col, idx) => (
                <th key={idx} style={{ border: '1px solid #ccc', background: '#f0f4f8', padding: 8 }}>
                  {col}
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
                  {val}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row, rIdx) => (
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
