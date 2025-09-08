/* filepath: c:\Users\William\Documents\ProjetExcel\src\components\VirtualTable.jsx */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

const VirtualTable = ({ 
  data, 
  columns, 
  getDisplayColumns, 
  formatColumnName, 
  formatCellValue, 
  onRowClick, 
  hasPermission, 
  getColumnType,
  sortConfig = { key: null, direction: null },
  onSort = () => {},
  getSortIcon = () => '⇅'
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);
  
  const rowHeight = 50;
  const overscan = 10;
  
  // Memoize display columns for performance
  const displayColumns = useMemo(() => getDisplayColumns(), [getDisplayColumns]);
  
  // Helper functions for consistent column sizing
  const getColumnFlex = useCallback((columnName) => {
    const lowerName = columnName.toLowerCase();
    
    if (lowerName.includes('id')) return '0 0 80px';
    if (lowerName.includes('date')) return '0 0 120px';
    if (lowerName.includes('time')) return '0 0 100px';
    if (lowerName.includes('status')) return '0 0 120px';
    if (lowerName.includes('ticket')) return '0 0 130px';
    if (lowerName.includes('district')) return '0 0 100px';
    if (lowerName.includes('assigned')) return '0 0 105px';
    if (lowerName.includes('note') || lowerName.includes('description') || lowerName.includes('incident')) {
      return '2 1 200px';
    }
    
    return '1 1 150px';
  }, []);

  const getColumnMinWidth = useCallback((columnName) => {
    const lowerName = columnName.toLowerCase();
    
    if (lowerName.includes('id')) return '60px';
    if (lowerName.includes('date')) return '100px';
    if (lowerName.includes('time')) return '80px';
    if (lowerName.includes('status')) return '100px';
    if (lowerName.includes('ticket')) return '100px';
    if (lowerName.includes('district')) return '90px';
    if (lowerName.includes('assigned')) return '90px';
    if (lowerName.includes('note') || lowerName.includes('description') || lowerName.includes('incident')) {
      return '150px';
    }
    
    return '80px';
  }, []);
  
  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    data.length,
    Math.ceil((scrollTop + containerHeight) / rowHeight) + overscan
  );
  
  const visibleData = useMemo(() => 
    data.slice(startIndex, endIndex), 
    [data, startIndex, endIndex]
  );
  
  // Update container height when component mounts
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 120;
        setContainerHeight(Math.max(400, Math.min(800, availableHeight)));
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  const totalHeight = data.length * rowHeight;
  const offsetY = startIndex * rowHeight;
  
  if (!data || data.length === 0) {
    return (
      <div className="virtual-table-empty">
        <div className="empty-state">
          📝 No log entries found
        </div>
      </div>
    );
  }
  
  if (!displayColumns || displayColumns.length === 0) {
    return (
      <div className="virtual-table-empty">
        <div className="empty-state">
          🔧 No columns configured
        </div>
      </div>
    );
  }
  
  return (
    <div className="virtual-table-container" ref={containerRef}>
      <div
        ref={scrollElementRef}
        className="virtual-table-scroll"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Sticky Header - using same sizing as rows */}
        <div className="virtual-table-header">
          {displayColumns.map((column) => (
            <div 
              key={column.COLUMN_NAME} 
              className={`virtual-table-header-cell sortable-header ${
                sortConfig.key === column.COLUMN_NAME ? 'active-sort' : ''
              }`}
              onClick={() => onSort(column.COLUMN_NAME)}
              title={`Click to sort by ${formatColumnName(column.COLUMN_NAME)}`}
              style={{
                minWidth: getColumnMinWidth(column.COLUMN_NAME),
                flex: getColumnFlex(column.COLUMN_NAME),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 0.5rem',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              <span className="header-text" style={{ 
                flex: 1, 
                overflow: 'hidden', 
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {formatColumnName(column.COLUMN_NAME)}
              </span>
              <span className="sort-icon" style={{ 
                fontSize: '0.8em', 
                opacity: 0.7, 
                marginLeft: '0.5rem',
                minWidth: '16px',
                textAlign: 'center'
              }}>
                {getSortIcon(column.COLUMN_NAME)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Data Rows */}
        <div style={{ height: totalHeight, position: 'relative', marginTop: '0' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleData.map((entry, virtualIndex) => {
              const actualIndex = startIndex + virtualIndex;
              return (
                <VirtualRow
                  key={entry.id || actualIndex}
                  entry={entry}
                  index={actualIndex}
                  displayColumns={displayColumns}
                  formatCellValue={formatCellValue}
                  getColumnType={getColumnType}
                  onRowClick={onRowClick}
                  hasPermission={hasPermission}
                  rowHeight={rowHeight}
                  getColumnMinWidth={getColumnMinWidth}
                  getColumnFlex={getColumnFlex}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Individual row component with React.memo for performance
const VirtualRow = React.memo(({ 
  entry, 
  index, 
  displayColumns, 
  formatCellValue, 
  getColumnType, 
  onRowClick, 
  hasPermission, 
  rowHeight,
  getColumnMinWidth,
  getColumnFlex
}) => {
  
  const handleRowClick = useCallback(() => {
    onRowClick(entry);
  }, [entry, onRowClick]);
  
  return (
    <div
      className={`virtual-row ${entry.is_virtual ? 'virtual-entry' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
      style={{ height: rowHeight }}
      onClick={handleRowClick}
      title={entry.is_virtual ? 'This is a recurring entry instance' : 'Click to view details'}
    >
      {displayColumns.map(column => {
        const value = entry[column.COLUMN_NAME];
        const formattedValue = formatCellValue(value, column.COLUMN_NAME, column.DATA_TYPE);
        
        return (
          <div
            key={column.COLUMN_NAME}
            className={`virtual-cell ${getColumnType(column.COLUMN_NAME, column.DATA_TYPE)}`}
            style={{
              minWidth: getColumnMinWidth(column.COLUMN_NAME),
              flex: getColumnFlex(column.COLUMN_NAME),
              padding: '0.75rem 0.5rem',
              display: 'flex',
              alignItems: 'center',
              overflow: 'hidden'
            }}
            title={entry.is_virtual ? `🔄 Recurring: ${formattedValue}` : formattedValue}
          >
            {entry.is_virtual && column.COLUMN_NAME.toLowerCase().includes('incident') && (
              <span className="virtual-icon">🔄</span>
            )}
            <span className={entry.is_virtual ? 'virtual-text' : 'normal-text'} style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {formattedValue}
            </span>
          </div>
        );
      })}
    </div>
  );
});

VirtualRow.displayName = 'VirtualRow';

export default VirtualTable;