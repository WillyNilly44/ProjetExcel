import React from 'react';

export default function DataTable({ data, pageSize, currentPage }) {
const excludedColumns = ["Maint. (#)", "Maint. (hrs)", "Incid. (#)","Incid. (hrs.)", "Bus. Imp.", "Bus. Imp. (hrs)"];

  const start = currentPage * pageSize;
  const pageData = data.slice(start, start + pageSize);

  if (pageData.length === 0) {
    return <p style={{ color: 'red' }}>Aucune donnée disponible.</p>;
  }

  const headers = Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <table>
        <thead>
          <tr>
            {headers.map(h => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {pageData.map((row, i) => (
            <tr key={i}>
              {headers.map(h => <td key={h}>{row[h]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
