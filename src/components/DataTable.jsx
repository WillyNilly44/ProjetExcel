import React from 'react';

export default function DataTable({ data, pageSize, currentPage }) {
  const excludedColumns = ["Maint. (#)", "Maint. (hrs)", "Incid. (#)", "Incid. (hrs.)", "Bus. Imp.", "Bus. Imp. (hrs)", "Event App", "isAdmin"];

  const start = currentPage * pageSize;
  const pageData = pageSize === -1 ? data : data.slice(start, start + pageSize);

  if (pageData.length === 0) {
    return <p style={{ color: 'red' }}>Aucune donnée disponible.</p>;
  }

  const headers = Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));
  const poop = headers.map(h => {
    //console.log("Header:", h);
    switch (h) {
      case "Business impact ?":
        return "Impact?";
      case "Duration (hrs)":
        return "Est. (hrs)";
    }

    if (h.includes("__EMPTY_")) {
      switch (h) {
        case "__EMPTY_1":
          return "Incid."
        case "__EMPTY_2":
          return "Start";
        case "__EMPTY_3":
          return "End";
        case "__EMPTY_4":
          return "Acc. Bus. Imp.";
        case "__EMPTY_5":
          return "Acc. time ";
      }
    }
    return h;
  });

  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <table>
        <thead>
          <tr>
            {poop.map(h =>
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
