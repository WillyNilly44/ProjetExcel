import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { hasPermission, roleDefinitions } = useAuth();
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    level_id: '',
    role: '' // Add role field
  });
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    level_id: '',
    role: '' // Add role field
  });

  // Define the new roles
  const newRoles = [
    { id: 'Administrator', name: 'Administrator', icon: '👑' },
    { id: 'Updater', name: 'Updater', icon: '⚡' },
    { id: 'Viewer', name: 'Viewer', icon: '👨‍💼' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchLevels();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
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
      setLoading(false);
    }
  };

  const fetchLevels = async () => {
    try {
      const response = await fetch('/api/getlevels', {
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
      console.error('Error fetching levels:', err);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.username || !newUser.password || !newUser.role) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      // Send both role and level_id (map role to appropriate level)
      const userData = {
        ...newUser,
        level_id: getLevelIdFromRole(newUser.role)
      };
      
      const response = await fetch('/api/createuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setNewUser({ name: '', username: '', password: '', level_id: '', role: '' });
        setShowAddModal(false);
        fetchUsers();
        setError(null);
      } else {
        setError(result.error || 'Failed to create user');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Map role to level_id for backward compatibility
  const getLevelIdFromRole = (role) => {
    const roleToLevel = {
      'Administrator': '1', // Adjust these IDs based on your database
      'Updater': '2',
      'Viewer': '3'
    };
    return roleToLevel[role] || '3';
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      level_id: user.level_id || '',
      role: user.role || getRoleFromLevel(user.level_Name)
    });
  };

  // Map level back to role
  const getRoleFromLevel = (levelName) => {
    const levelToRole = {
      'Super Admin': 'Administrator',
      'Administrator': 'Administrator',
      'Manager': 'Updater',
      'Operator': 'Updater',
      'Viewer': 'Viewer',
      'Guest': 'Viewer'
    };
    return levelToRole[levelName] || 'Viewer';
  };

  const handleUpdateUser = async () => {
    if (!formData.name || !formData.username || !formData.role) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        id: editingUser.id,
        name: formData.name,
        username: formData.username,
        level_id: getLevelIdFromRole(formData.role),
        role: formData.role
      };

      const response = await fetch('/api/updateuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setEditingUser(null);
        setFormData({ name: '', username: '', level_id: '', role: '' });
        fetchUsers();
        setError(null);
      } else {
        setError(result.error || 'Failed to update user');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', level_id: '', role: '' });
    setError(null);
  };

  const handleDeleteUser = async (userId, username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/deleteuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: userId }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        fetchUsers();
        setError(null);
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getLevelIcon = (level) => {
    const icons = {
      'Super Admin': '👑',
      'Administrator': '👑',
      'Manager': '⚡',
      'Operator': '⚡',
      'Viewer': '👨‍💼',
      'Guest': '👨‍💼'
    };
    return icons[level] || '👤';
  };

  const getLevelBadgeColor = (level) => {
    const colors = {
      'Super Admin': '#ef4444',
      'Administrator': '#ef4444',
      'Manager': '#f97316',
      'Operator': '#f97316',
      'Viewer': '#3b82f6',
      'Guest': '#6b7280'
    };
    return colors[level] || '#6b7280';
  };

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
          disabled={loading}
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

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="loading-cell">
                  ⏳ Loading users...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
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
                  
                  <td>
                    {editingUser?.id === user.id ? (
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        className="inline-select"
                      >
                        <option value="">Select Role</option>
                        {newRoles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.icon} {role.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span 
                        className="level-badge"
                        style={{ backgroundColor: getLevelBadgeColor(user.level_Name) }}
                      >
                        {getLevelIcon(user.level_Name)} {user.role || getRoleFromLevel(user.level_Name)}
                      </span>
                    )}
                  </td>
                  
                  <td>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                  </td>
                  
                  <td className="actions-cell">
                    {editingUser?.id === user.id ? (
                      <div className="edit-actions">
                        <button
                          onClick={handleUpdateUser}
                          disabled={loading}
                          className="btn btn-save"
                        >
                          💾 Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={loading}
                          className="btn btn-cancel"
                        >
                          ❌ Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="view-actions">
                        <button
                          onClick={() => handleEditUser(user)}
                          disabled={loading}
                          className="btn btn-edit"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={loading}
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
              <h3>Add New User</h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="user-form">
              <div className="form-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({...prev, name: e.target.value}))}
                  className="form-input"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({...prev, username: e.target.value}))}
                  className="form-input"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label>Password:</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({...prev, password: e.target.value}))}
                  className="form-input"
                  required
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label>Role:</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({...prev, role: e.target.value}))}
                  className="form-input"
                  required
                >
                  <option value="">Select Role</option>
                  {newRoles.map(role => (
                    <option key={role.id} value={role.id}>
                      {role.icon} {role.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;