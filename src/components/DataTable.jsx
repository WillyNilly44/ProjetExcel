import React from 'react';

export default function DataTable({ data, pageSize, currentPage }) {
const excludedColumns = ["Maint. (#)", "Maint. (hrs)", "Incid. (#)","Incid. (hrs.)", "Bus. Imp.", "Bus. Imp. (hrs)"];

  const start = currentPage * pageSize;
  const pageData = data.slice(start, start + pageSize);

  if (pageData.length === 0) {
    return <p style={{ color: 'red' }}>Aucune donnée disponible.</p>;
  }

  const headers = Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));
  const poop = headers.map(h => {
        if (h.includes("__EMPTY_")) {
          switch (h) {
            case "__EMPTY_1":
              return "Incid."
            case "__EMPTY_2":
              return "Est.";
            case "__EMPTY_3":
              return "Start";
            case "__EMPTY_4":
              return "End";
            case "__EMPTY_5":
              return " ";
            case "__EMPTY_6":
              return "Real - Start to finish";
          }
        }
        return h;
      });

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <table>
        <thead>
          <tr>
            {poop.forEach(h =>
              <th key={h}>{h}</th>)}
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
