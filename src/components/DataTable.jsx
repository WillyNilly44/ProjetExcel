import React from 'react';
import { FixedSizeList as List } from 'react-window';

export default function DataTable({ data, pageSize, currentPage, onRowClick, visibleColumns }) {
  const excludedColumns = ["Maint. (#)", "Maint. (hrs)", "Incid. (#)", "Incid. (hrs.)", "Bus. Imp.", "Bus. Imp. (hrs)", "Event App", "isAdmin"];
  const start = currentPage * pageSize;
  const pageData = pageSize === -1 ? data : data.slice(start, start + pageSize);


  if (pageData.length === 0) return <p style={{ color: 'red' }}>No data available</p>;

  const headers = (Array.isArray(visibleColumns) && visibleColumns.length > 0)
    ? visibleColumns
    : Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));


  const displayHeaders = headers.map(h => {
    switch (h) {
      case "Business impact ?": return "Impact?";
      case "Duration (hrs)": return "Est. (hrs)";
      case "__EMPTY_1": return "Incid.";
      case "__EMPTY_2": return "Start";
      case "__EMPTY_3": return "End";
      case "__EMPTY_4": return "Acc. Bus. Imp.";
      case "__EMPTY_5": return "Acc. time";
      default: return h;
    }
  });

  const columnWidths = {
    "Incident": 120,
    "District": 140,
    "Date": 120,
    "Event": 80,
    "Incid.": 70,
    "Impact?": 90,
    "RCA": 70,
    "Est. (hrs)": 110,
    "Start": 90,
    "End": 90,
    "Acc. Bus. Imp.": 95,
    "Acc. time": 95,
    "Assigned": 100,
    "Status": 80,
  };
  const listWidth = headers.reduce((sum, h) => sum + (columnWidths[displayHeaders[headers.indexOf(h)]] || 180), 0);



  const Row = ({ index, style }) => {
  const row = pageData[index];
  const isEven = index % 2 === 0;
  const isAdminNote = row.__isAdminNote; 
  
  
  let backgroundColor;
  if (isAdminNote) {
    backgroundColor = '#2a4a6b'; 
  } else {
    backgroundColor = isEven ? '#1a1a1a' : '#121212'; 
  }
  
  return (
    <div
      style={{
        ...style,
        display: 'grid',
        gridTemplateColumns: headers.map((_, i) =>
          `${columnWidths[displayHeaders[i]] || 180}px`
        ).join(' '),
        backgroundColor: backgroundColor, 
      }}
    >
      {headers.map((h, i) => (
        <div
          key={i}
          onClick={() => onRowClick(row)}
          style={{
            padding: '8px',
            borderBottom: '1px solid #333',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
          title={row[h]}
        >
          {row[h]}
        </div>
      ))}
    </div>
  );
};


  return (
    <div style={{ overflowX: 'auto', marginTop: '20px' }}>
      <div style={{ width: listWidth }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: headers.map(h => `${columnWidths[displayHeaders[headers.indexOf(h)]] || 180}px`).join(' ')
          ,
          backgroundColor: '#1e1e1e',
          color: 'white',
          fontWeight: 'bold'
        }}>
          {displayHeaders.map((h, i) => (
            <div key={i} style={{ padding: '8px', borderBottom: '1px solid #333' }}>
              {h}
            </div>
          ))}
        </div>
        <List
          height={500}
          itemCount={pageData.length}
          itemSize={60}
          width={listWidth}
        >
          {Row}
        </List>
      </div>
    </div>
  );
}
