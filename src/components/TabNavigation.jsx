import React from 'react';

const TabNavigation = ({ activeTab, onTabChange, hasPermission }) => {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      description: 'View overview and analytics',
      public: true
    },
    {
      id: 'logs',
      label: 'Log Entries',
      icon: '📝',
      description: 'Manage maintenance logs',
      public: true
    },
    {
      id: 'kpi',
      label: 'KPI Management',
      icon: '📈',
      description: 'Track key performance indicators',
      public: true
    },
    ...(hasPermission('Administrator') ? [
      {
        id: 'users',
        label: 'User Management',
        icon: '👥',
        description: 'Manage users and permissions',
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