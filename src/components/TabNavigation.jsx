import React from 'react';

const TabNavigation = ({ activeTab, onTabChange, hasPermission }) => {
  const tabs = [

    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📈',
      description: 'Current Week Overview',
      public: true
    },
    {
      id: 'logs',
      label: 'Logs',
      icon: '📋',
      description: 'Log Entries Management',
      public: true
    },
    {
      id: 'kpi',
      label: 'KPI',
      icon: '📊',
      description: 'Key Performance Indicators - Landing Page',
      public: true
    },
    ...(hasPermission('Administrator') ? [
      {
        id: 'users',
        label: 'Users',
        icon: '👥',
        description: 'User Management',
        public: false,
        requiredPermission: 'Administrator'
      }
    ] : [])
  ];

  return (
    <div className="tab-navigation">
      <div className="tab-list">
        {tabs.map(tab => {
          const isVisible = tab.public || hasPermission(tab.requiredPermission);
          const isActive = activeTab === tab.id;
          const isDisabled = !tab.public && !hasPermission(tab.requiredPermission);

          if (!isVisible && !tab.public) {
            return (
              <button
                key={tab.id}
                className="tab-item disabled"
                disabled={true}
                title={`Login required (${tab.requiredPermission} level)`}
              >
                <span className="tab-icon">🔒</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-item ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              disabled={isDisabled}
              title={tab.description}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
              {isDisabled && <span className="tab-lock">🔒</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;