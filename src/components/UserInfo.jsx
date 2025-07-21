import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserInfo = () => {
  const { user, logout, hasPermission } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const getLevelColor = (level) => {
    const colors = {
      'Super Admin': '#dc2626',
      'Administrator': '#ea580c',
      'Manager': '#d97706',
      'Operator': '#059669',
      'Viewer': '#0284c7',
      'Guest': '#6b7280'
    };
    return colors[level] || '#6b7280';
  };

  const getLevelIcon = (level) => {
    const icons = {
      'Super Admin': '👑',
      'Administrator': '⚡',
      'Manager': '👨‍💼',
      'Operator': '🔧',
      'Viewer': '👀',
      'Guest': '👤'
    };
    return icons[level] || '👤';
  };

  return (
    <div className="user-info">
      <div 
        className="user-info-trigger"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className="user-avatar">
          {getLevelIcon(user.level_Name)}
        </div>
        <div className="user-details">
          <div className="user-name">{user.name}</div>
          <div 
            className="user-level"
            style={{ color: getLevelColor(user.level_Name) }}
          >
            {user.level_Name}
          </div>
        </div>
        <div className={`user-dropdown-arrow ${showDropdown ? 'up' : 'down'}`}>
          ▼
        </div>
      </div>

      {showDropdown && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-avatar">
              {getLevelIcon(user.level_Name)}
            </div>
            <div className="user-dropdown-info">
              <div className="user-dropdown-name">{user.name}</div>
              <div className="user-dropdown-username">@{user.username}</div>
              <div 
                className="user-dropdown-level"
                style={{ color: getLevelColor(user.level_Name) }}
              >
                {user.level_Name}
              </div>
            </div>
          </div>

          <div className="user-dropdown-permissions">
            <h4>Permissions:</h4>
            <div className="permission-list">
              <div className={`permission-item ${hasPermission('Viewer') ? 'granted' : 'denied'}`}>
                {hasPermission('Viewer') ? '✅' : '❌'} View Entries
              </div>
              <div className={`permission-item ${hasPermission('Operator') ? 'granted' : 'denied'}`}>
                {hasPermission('Operator') ? '✅' : '❌'} Add/Edit Entries
              </div>
              <div className={`permission-item ${hasPermission('Manager') ? 'granted' : 'denied'}`}>
                {hasPermission('Manager') ? '✅' : '❌'} Delete Entries
              </div>
              <div className={`permission-item ${hasPermission('Administrator') ? 'granted' : 'denied'}`}>
                {hasPermission('Administrator') ? '✅' : '❌'} Manage Columns
              </div>
            </div>
          </div>

          <div className="user-dropdown-actions">
            <button
              onClick={logout}
              className="logout-button"
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInfo;