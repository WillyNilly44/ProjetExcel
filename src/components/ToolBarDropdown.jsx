import React, { useState, useRef, useEffect } from 'react';

const ToolbarDropdown = ({ 
  isLoading, 
  columnsLength, 
  showVirtualEntries, 
  setShowVirtualEntries,
  showFilters,
  setShowFilters,
  setShowColumnManager,
  setShowAddModal,
  fetchLogEntries,
  exportComponent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const menuItems = [
    {
      id: 'virtual-entries',
      label: '🔄 Recurrences',
      type: 'toggle',
      active: showVirtualEntries,
      action: () => setShowVirtualEntries(!showVirtualEntries),
      disabled: isLoading || columnsLength === 0
    },
    {
      id: 'filters',
      label: '🔍 Filters',
      type: 'toggle',
      active: showFilters,
      action: () => setShowFilters(!showFilters),
      disabled: isLoading || columnsLength === 0
    },
    {
      id: 'divider-1',
      type: 'divider'
    },
    {
      id: 'export',
      label: '📄 Export PDF',
      type: 'component',
      component: exportComponent,
      disabled: isLoading || columnsLength === 0
    },
    {
      id: 'divider-2',
      type: 'divider'
    },
    {
      id: 'columns',
      label: '⚙️ Manage Columns',
      type: 'action',
      action: () => {
        setShowColumnManager(true);
        setIsOpen(false);
      },
      disabled: isLoading || columnsLength === 0
    },
    {
      id: 'add-entry',
      label: '➕ Add Entry',
      type: 'action',
      action: () => {
        setShowAddModal(true);
        setIsOpen(false);
      },
      disabled: isLoading || columnsLength === 0
    },
    {
      id: 'divider-3',
      type: 'divider'
    },
    {
      id: 'refresh',
      label: isLoading ? '⏳ Loading...' : '🔄 Refresh Data',
      type: 'action',
      action: () => {
        fetchLogEntries();
        setIsOpen(false);
      },
      disabled: isLoading
    }
  ];

  return (
    <div className="toolbar-dropdown" ref={dropdownRef}>
      {/* Main Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`toolbar-trigger ${isOpen ? 'active' : ''}`}
        disabled={isLoading}
      >
        <span className="toolbar-trigger-icon">⚙️</span>
        <span className="toolbar-trigger-text">Actions</span>
        <span className={`toolbar-trigger-arrow ${isOpen ? 'up' : 'down'}`}>
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="toolbar-menu">
          <div className="toolbar-menu-header">
            <span className="toolbar-menu-title">📋 Table Actions</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="toolbar-menu-close"
            >
              ✕
            </button>
          </div>
          
          <div className="toolbar-menu-items">
            {menuItems.map((item) => {
              if (item.type === 'divider') {
                return <div key={item.id} className="toolbar-menu-divider" />;
              }

              if (item.type === 'toggle') {
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    disabled={item.disabled}
                    className={`toolbar-menu-item toggle ${item.active ? 'active' : 'inactive'}`}
                  >
                    <span className="toolbar-menu-item-label">{item.label}</span>
                    <span className="toolbar-menu-item-status">
                      {item.active ? '✅' : '❌'}
                    </span>
                  </button>
                );
              }

              if (item.type === 'component') {
                return (
                  <div key={item.id} className="toolbar-menu-component">
                    {item.component}
                  </div>
                );
              }

              if (item.type === 'action') {
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    disabled={item.disabled}
                    className="toolbar-menu-item action"
                  >
                    <span className="toolbar-menu-item-label">{item.label}</span>
                  </button>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolbarDropdown;