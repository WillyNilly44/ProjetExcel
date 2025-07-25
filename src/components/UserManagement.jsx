import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    level_id: ''
  });

 
  useEffect(() => {
    fetchUsers();
    fetchLevels();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/getusers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setUsers(result.users);
      } else {
        setError(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await fetch('/api/getuserlevel', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setLevels(result.levels);
      }
    } catch (err) {
      console.error('Failed to fetch levels:', err);
    }
  };

  const handleAddUser = async () => {
    if (!formData.name || !formData.username || !formData.password || !formData.level_id) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/adduser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess('User added successfully');
        setShowAddModal(false);
        setFormData({ name: '', username: '', password: '', level_id: '' });
        fetchUsers();
      } else {
        setError(result.error || 'Failed to add user');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !formData.name || !formData.username || !formData.level_id) {
      setError('Name, username, and level are required');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('api/updateuser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingUser.id,
          ...formData
        })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        setFormData({ name: '', username: '', password: '', level_id: '' });
        fetchUsers();
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/deleteuser', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: userId })
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setSuccess('User deleted successfully');
        fetchUsers();
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '',
      level_id: user.level_id || ''
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', password: '', level_id: '' });
    setError('');
  };

  const getLevelBadgeColor = (levelName) => {
    const colors = {
      'Super Admin': '#dc2626',
      'Administrator': '#ea580c',
      'Manager': '#d97706',
      'Operator': '#059669',
      'Viewer': '#0284c7',
      'Guest': '#6b7280'
    };
    return colors[levelName] || '#6b7280';
  };

  const getLevelIcon = (levelName) => {
    const icons = {
      'Super Admin': '👑',
      'Administrator': '⚡',
      'Manager': '👨‍💼',
      'Operator': '🔧',
      'Viewer': '👀',
      'Guest': '👤'
    };
    return icons[levelName] || '👤';
  };

  const renderUserRow = (user) => (
    <tr key={user.id}>
      <td>{user.name}</td>
      <td>{user.username}</td>
      <td>{user.email}</td>
      <td>{user.department || 'Unknown'}</td>
      <td>{user.job_title || 'Employee'}</td>
      <td>
        <span className={`level-badge level-${user.level_Name?.toLowerCase()}`}>
          {user.level_Name}
        </span>
      </td>
      <td>
        {user.sso_id ? (
          <span style={{ color: '#0078d4', fontSize: '12px' }}>
            🔗 SSO User
          </span>
        ) : (
          <span style={{ color: '#6c757d', fontSize: '12px' }}>
            📝 Local User
          </span>
        )}
      </td>
      <td>
        <button onClick={() => editUser(user)} className="edit-btn">
          ✏️ Edit Level
        </button>
      </td>
    </tr>
  );

  if (!hasPermission('Administrator')) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You need Administrator privileges to access User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div className="header-content">
          <h2>👥 User Management</h2>
          <p>Manage user accounts and permissions</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
          disabled={isLoading}
        >
          ➕ Add New User
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ {success}
        </div>
      )}

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Department</th>
              <th>Job Title</th>
              <th>Access Level</th>
              <th>User Type</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" className="loading-cell">
                  ⏳ Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-cell">
                  👤 No users found
                </td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id} className={editingUser?.id === user.id ? 'editing' : ''}>
                  <td>{user.id}</td>
                  
                  <td>
                    {editingUser?.id === user.id ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="inline-input"
                        placeholder="Full Name"
                      />
                    ) : (
                      user.name
                    )}
                  </td>
                  
                  <td>
                    {editingUser?.id === user.id ? (
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="inline-input"
                        placeholder="Username"
                      />
                    ) : (
                      user.username
                    )}
                  </td>
                  
                  <td>{user.email}</td>
                  <td>{user.department || 'Unknown'}</td>
                  <td>{user.job_title || 'Employee'}</td>
                  
                  <td>
                    {editingUser?.id === user.id ? (
                      <select
                        value={formData.level_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, level_id: e.target.value }))}
                        className="inline-select"
                      >
                        <option value="">Select Level</option>
                        {levels.map(level => (
                          <option key={level.id} value={level.id}>
                            {level.level_Name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="level-badge"
                        style={{ backgroundColor: getLevelBadgeColor(user.level_Name) }}
                      >
                        {getLevelIcon(user.level_Name)} {user.level_Name || 'No Level'}
                      </span>
                    )}
                  </td>
                  
                  <td>
                    {user.sso_id ? (
                      <span style={{ color: '#0078d4', fontSize: '12px' }}>
                        🔗 SSO User
                      </span>
                    ) : (
                      <span style={{ color: '#6c757d', fontSize: '12px' }}>
                        📝 Local User
                      </span>
                    )}
                  </td>
                  
                  <td className="actions-cell">
                    {editingUser?.id === user.id ? (
                      <div className="edit-actions">
                        <button
                          onClick={handleUpdateUser}
                          disabled={isLoading}
                          className="btn btn-save"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isLoading}
                          className="btn btn-cancel"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="view-actions">
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={isLoading}
                          className="btn btn-edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={isLoading}
                          className="btn btn-delete"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>➕ Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Enter username"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Access Level</label>
                <select
                  value={formData.level_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, level_id: e.target.value }))}
                  className="form-select"
                >
                  <option value="">Select Access Level</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.id}>
                      {getLevelIcon(level.level_Name)} {level.level_Name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-cancel"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                className="btn btn-primary"
                disabled={isLoading}
              >
                {isLoading ? '⏳ Adding...' : '➕ Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;