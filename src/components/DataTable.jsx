import React from 'react';
import { FixedSizeList as List } from 'react-window';

export default function DataTable({ data, pageSize, currentPage }) {
  const excludedColumns = ["Maint. (#)", "Maint. (hrs)", "Incid. (#)", "Incid. (hrs.)", "Bus. Imp.", "Bus. Imp. (hrs)", "Event App", "isAdmin"];
  const start = currentPage * pageSize;
  const pageData = pageSize === -1 ? data : data.slice(start, start + pageSize);

  if (pageData.length === 0) return <p style={{ color: 'red' }}>Aucune donnée disponible.</p>;

  const headers = Object.keys(pageData[0]).filter(h => !excludedColumns.includes(h));
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

  const columnCount = headers.length;
  const columnWidth = 180; // or dynamic

  const Row = ({ index, style }) => {
    const row = pageData[index];
    return (
      <div style={{ ...style, display: 'grid', gridTemplateColumns: `repeat(${columnCount}, ${columnWidth}px)` }}>
        {headers.map((h, i) => (
          <div
            key={i}
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columnCount}, ${columnWidth}px)`,
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
        itemSize={40}
        width={columnCount * columnWidth}
      >
        {Row}
      </List>
    </div>
  );
}
