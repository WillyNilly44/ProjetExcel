import React, { useState } from 'react';

export default function ColumnManager({ 
  isOpen, 
  onClose, 
  columns, 
  visibleColumns, 
  columnOrder, 
  onSave 
}) {
  const [localVisible, setLocalVisible] = useState(visibleColumns);
  const [localOrder, setLocalOrder] = useState(columnOrder);

  if (!isOpen) return null;

  const handleToggleColumn = (columnName) => {
    setLocalVisible(prev => 
      prev.includes(columnName) 
        ? prev.filter(name => name !== columnName)
        : [...prev, columnName]
    );
  };

  const handleMoveUp = (index) => {
    if (index > 0) {
      const newOrder = [...localOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setLocalOrder(newOrder);
    }
  };

  const handleMoveDown = (index) => {
    if (index < localOrder.length - 1) {
      const newOrder = [...localOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setLocalOrder(newOrder);
    }
  };

  const handleSave = () => {
    onSave(localVisible, localOrder);
    onClose();
  };

  const handleSelectAll = () => {
    setLocalVisible(columns.map(col => col.COLUMN_NAME));
  };

  const handleSelectNone = () => {
    setLocalVisible([]);
  };

  const formatColumnName = (columnName) => {
    return columnName
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8fafc'
        }}>
          <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px' }}>
            ⚙️ Manage Columns
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '28px',
              cursor: 'pointer',
              color: '#6b7280',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Quick Actions */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✅ Select All
            </button>
            <button
              onClick={handleSelectNone}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ❌ Select None
            </button>
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            {localVisible.length} of {columns.length} columns visible
          </div>
        </div>

        {/* Column List */}
        <div style={{
          padding: '16px 24px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>
            💡 Check to show column, use arrows to reorder
          </div>
          
          {localOrder.map((columnName, index) => {
            const column = columns.find(col => col.COLUMN_NAME === columnName);
            const isVisible = localVisible.includes(columnName);
            
            return (
              <div
                key={columnName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: isVisible ? '#f0f9ff' : '#f9fafb',
                  border: `1px solid ${isVisible ? '#0ea5e9' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Visibility Toggle */}
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => handleToggleColumn(columnName)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer'
                  }}
                />

                {/* Column Info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: '500',
                    color: isVisible ? '#0c4a6e' : '#6b7280'
                  }}>
                    {formatColumnName(columnName)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#9ca3af'
                  }}>
                    {column?.DATA_TYPE} {column?.IS_NULLABLE === 'NO' ? '(Required)' : '(Optional)'}
                  </div>
                </div>

                {/* Order Controls */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: index === 0 ? '#f3f4f6' : '#e5e7eb',
                      color: index === 0 ? '#9ca3af' : '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: index === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === localOrder.length - 1}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: index === localOrder.length - 1 ? '#f3f4f6' : '#e5e7eb',
                      color: index === localOrder.length - 1 ? '#9ca3af' : '#374151',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: index === localOrder.length - 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px'
                    }}
                    title="Move down"
                  >
                    ⬇️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '16px',
          justifyContent: 'flex-end',
          backgroundColor: '#f8fafc'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            💾 Apply Changes
          </button>
        </div>
      </div>
    </div>
  );
}