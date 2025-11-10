/* filepath: c:\Users\William\Documents\ProjetExcel\src\components\VirtualTable.jsx */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

export default function VirtualTable({
  data,
  columns,
  getDisplayColumns,
  formatColumnName,
  formatCellValue,
  onRowClick,
  hasPermission,
  canApproveEntries, // This should be a boolean, not a function
  onApprove,
  getColumnType,
  sortConfig,
  onSort,
  getSortIcon
}) {
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

  const getColumnStyle = useCallback((columnName, dataType) => {
    const baseStyle = {
      padding: '0.75rem 0.5rem',
      verticalAlign: 'middle',
      borderRight: '1px solid #374151',
      backgroundColor: 'inherit'
    };
    
    if (dataType === 'bit' || typeof data[0]?.[columnName] === 'boolean') {
      baseStyle.textAlign = 'center';
    }
    
    if (columnName.toLowerCase().includes('status')) {
      baseStyle.fontWeight = '500';
      baseStyle.color = '#059669';
    }
    
    if (columnName.toLowerCase().includes('note') || columnName.toLowerCase().includes('description')) {
      baseStyle.maxWidth = '200px';
    }
    
    return baseStyle;
  }, [data]);
  
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
  
  const renderCell = (item, column) => {
    const value = item[column.COLUMN_NAME];
    const columnType = getColumnType(column.COLUMN_NAME, column.DATA_TYPE);

    // Check if entry has pending approval (from the main data)
    const hasPendingApproval = item.approval_status === 'pending';

    let cellContent = formatCellValue(value);

    // Handle different column types
    if (columnType === 'boolean') {
      cellContent = value ? '✅' : '❌';
    } else if (columnType === 'status') {
      const statusClass = value === 'Completed' ? 'status-completed' : 
                         value === 'Scheduled' ? 'status-scheduled' : 
                         'status-default';
      cellContent = <span className={statusClass}>{cellContent}</span>;
    }

    // Special handling for approval status fields
    if (column.COLUMN_NAME === 'approval_status') {
      if (value === 'pending') {
        cellContent = <span className="approval-pending">⏳ Pending</span>;
      } else if (value === 'approved') {
        cellContent = <span className="approval-approved">✅ Approved</span>;
      } else if (value === 'rejected') {
        cellContent = <span className="approval-rejected">❌ Rejected</span>;
      } else if (!value) {
        cellContent = <span className="approval-none">— No Review</span>;
      }
    }

    return (
      <td 
        key={column.COLUMN_NAME} 
        style={{
          ...getColumnStyle(column.COLUMN_NAME, column.DATA_TYPE),
          backgroundColor: hasPendingApproval ? '#fef3c7' : 'transparent',
          opacity: hasPendingApproval && !canApproveEntries ? 0.7 : 1
        }}
        onClick={() => onRowClick?.(item)}
      >
        {/* Add pending indicator */}
        {hasPendingApproval && (
          <span style={{ 
            fontSize: '10px', 
            color: '#f59e0b', 
            marginRight: '4px' 
          }}>
            ⏳
          </span>
        )}
        {cellContent}
      </td>
    );
  };

  const renderRow = (item, index) => {
    const hasPendingApproval = item.approval_status === 'pending';
    const isVirtual = item.is_virtual;
    
    return (
      <tr 
        key={item.id || index}
        className={`
          table-row 
          ${isVirtual ? 'virtual-row' : ''} 
          ${hasPendingApproval ? 'pending-approval-row' : ''}
          ${index % 2 === 0 ? 'even' : 'odd'}
        `}
        style={{
          backgroundColor: hasPendingApproval ? '#fffbeb' : undefined,
          borderLeft: hasPendingApproval ? '4px solid #f59e0b' : undefined
        }}
      >
        {getDisplayColumns().map(column => renderCell(item, column))}
        {/* Add approval action column for administrators when viewing pending approvals */}
        {canApproveEntries && hasPendingApproval && (
          <td className="approval-actions">
            <button
              className="approve-btn"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(item.id, 'approve');
              }}
              title="Approve this entry"
            >
              ✅
            </button>
            <button
              className="reject-btn"
              onClick={(e) => {
                e.stopPropagation();
                onApprove?.(item.id, 'reject');
              }}
              title="Reject this entry"
            >
              ❌
            </button>
          </td>
        )}
      </tr>
    );
  };

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
          {/* Add header for approval actions column if needed */}
          {canApproveEntries && data.some(item => item.approval_status === 'pending') && (
            <div 
              className="virtual-table-header-cell"
              style={{
                minWidth: '100px',
                flex: '0 0 100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 0.5rem'
              }}
            >
              ⚖️ Actions
            </div>
          )}
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
                  canApproveEntries={canApproveEntries}
                  onApprove={onApprove}
                  rowHeight={rowHeight}
                  getColumnMinWidth={getColumnMinWidth}
                  getColumnFlex={getColumnFlex}
                  getColumnStyle={getColumnStyle}
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
  canApproveEntries,
  onApprove,
  rowHeight,
  getColumnMinWidth,
  getColumnFlex,
  getColumnStyle
}) => {
  
  const handleRowClick = useCallback(() => {
    onRowClick(entry);
  }, [entry, onRowClick]);
  
  // Check if entry has pending approval
  const hasPendingApproval = entry.approval_status === 'pending';
  
  return (
    <div
     className={`virtual-row ${entry.is_virtual ? 'virtual-entry' : ''} ${hasPendingApproval ? 'pending-approval' : ''} ${index % 2 === 0 ? 'even' : 'odd'}`}
      style={{ height: rowHeight }}
      onClick={handleRowClick}
      title={entry.is_virtual ? 'This is a recurring entry instance' : 'Click to view details'}
    >
      {displayColumns.map(column => {
        const value = entry[column.COLUMN_NAME];
        let formattedValue = formatCellValue(value, column.COLUMN_NAME, column.DATA_TYPE);
        
        // Handle different column types
        const columnType = getColumnType(column.COLUMN_NAME, column.DATA_TYPE);
        if (columnType === 'boolean') {
          formattedValue = value ? '✅' : '❌';
        }
        
        // Special handling for approval status fields
        if (column.COLUMN_NAME === 'approval_status') {
          if (value === 'pending') {
            formattedValue = '⏳ Pending';
          } else if (value === 'approved') {
            formattedValue = '✅ Approved';
          } else if (value === 'rejected') {
            formattedValue = '❌ Rejected';
          } else if (!value) {
            formattedValue = '— No Review';
          }
        }

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
              overflow: 'hidden',
              backgroundColor: hasPendingApproval ? '#fef3c7' : 'transparent',
              opacity: hasPendingApproval && !canApproveEntries ? 0.7 : 1
            }}
            title={entry.is_virtual ? `🔄 Recurring: ${formattedValue}` : formattedValue}
          >
            {/* Add pending indicator for pending entries */}
            {hasPendingApproval && (
              <span style={{ 
                fontSize: '10px', 
                color: '#f59e0b', 
                marginRight: '4px' 
              }}>
                ⏳
              </span>
            )}
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
     {/* Add approval action buttons for administrators when entry is pending */}
     {canApproveEntries && hasPendingApproval && (
       <div 
         className="virtual-cell approval-actions"
         style={{
           minWidth: '100px',
           flex: '0 0 100px',
           padding: '0.75rem 0.5rem',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'center',
           gap: '4px'
         }}
       >
         <button
           className="approve-btn"
           onClick={(e) => {
             e.stopPropagation();
             onApprove?.(entry.id, 'approve');
           }}
           title="Approve this entry"
         >
           ✅
         </button>
         <button
           className="reject-btn"
           onClick={(e) => {
             e.stopPropagation();
             onApprove?.(entry.id, 'reject');
           }}
           title="Reject this entry"
         >
           ❌
         </button>
       </div>
     )}
    </div>
  );
});

VirtualRow.displayName = 'VirtualRow';