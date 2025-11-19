import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserManagement = () => {
  const { hasPermission, user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // ADD SEARCH STATE
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    level_id: ''
  });
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    password: '',
    level_id: ''
  });

  // Define user levels that match your LOG_ENTRIES_LEVELS table
  const userLevels = [
    { id: 1, name: 'Viewer', icon: '👨‍💼', color: '#3b82f6' },
    { id: 2, name: 'Operator', icon: '⚡', color: '#f97316' },
    { id: 3, name: 'Administrator', icon: '👑', color: '#ef4444' },
    { id: 4, name: '3rd Party', icon: '🏢', color: '#8b5cf6' }
  ];

  useEffect(() => {
    fetchUsers();
    fetchLevels();
  }, []);

  // ADD SEARCH FILTER EFFECT
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.level_Name && user.level_Name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

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
        setFilteredUsers(result.users); // Initialize filtered users
      } else {
        setError(result.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ADD CLEAR SEARCH FUNCTION
  const clearSearch = () => {
    setSearchTerm('');
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
      console.error('Error fetching levels:', err);
      setLevels(userLevels);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!newUser.name || !newUser.username || !newUser.password || !newUser.level_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const userData = {
        name: newUser.name,
        username: newUser.username,
        password: newUser.password,
        level_id: parseInt(newUser.level_id),
        must_change_password: 1
      };
      
      const response = await fetch('/api/adduser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setNewUser({ name: '', username: '', password: '', level_id: '' });
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

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      level_id: user.level_id || ''
    });
  };

  const handleUpdateUser = async () => {
    if (!formData.name || !formData.username || !formData.level_id) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        id: editingUser.id,
        name: formData.name,
        username: formData.username,
        level_id: parseInt(formData.level_id)
      };

      const response = await fetch('/api/updateuser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setEditingUser(null);
        setFormData({ name: '', username: '', level_id: '' });
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
    setFormData({ name: '', username: '', level_id: '' });
    setError(null);
  };

  const handleDeleteUser = async (userId, username) => {
    if (currentUser && currentUser.id === userId) {
      setError('You cannot delete your own account');
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/deleteuser', {
        method: 'DELETE',
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

  const getLevelInfo = (levelId, levelName) => {
    let level = userLevels.find(l => l.id === levelId);
    
    if (!level && levelName) {
      level = userLevels.find(l => l.name.toLowerCase() === levelName.toLowerCase());
    }
    
    if (!level) {
      level = { id: 1, name: levelName || 'Viewer', icon: '👤', color: '#6b7280' };
    }
    
    return level;
  };

  const resetPasswordForUser = async (userId, username) => {
    if (!confirm(`Reset password for "${username}"? They will need to change it on next login.`)) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/updateuser', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          id: userId,
          reset_password: true,
          password: 'temp123',
          must_change_password: 1
        }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        alert(`Password reset successfully for ${username}. New temporary password: SanimaxTemp`);
        fetchUsers();
        setError(null);
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
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

      {/* SEARCH BAR */}
      <div className="search-controls">
        <div className="search-bar">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search users by name, username, or level..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="search-clear"
                type="button"
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* SEARCH RESULTS INFO */}
        <div className="search-info">
          {searchTerm ? (
            <span className="search-results">
              Found {filteredUsers.length} of {users.length} users
              {filteredUsers.length === 0 && (
                <span className="no-results"> - Try a different search term</span>
              )}
            </span>
          ) : (
            <span className="total-users">
              Total: {users.length} users
            </span>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-error">
          ⚠️ {error}
          <button 
            onClick={() => setError(null)}
            className="alert-close"
          >
            ✕
          </button>
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
              <th>Level</th>
              <th>Password Status</th>
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
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  {searchTerm ? (
                    <>🔍 No users found matching "{searchTerm}"</>
                  ) : (
                    <>👤 No users found</>
                  )}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => {
                const levelInfo = getLevelInfo(user.level_id, user.level_Name);
                const isCurrentUser = currentUser && currentUser.id === user.id;
                
                return (
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
                          maxLength="25"
                        />
                      ) : (
                        <span>
                          {user.name}
                          {isCurrentUser && <span className="current-user-badge"> (You)</span>}
                        </span>
                      )}
                    </td>
                    
                    <td>
                      {editingUser?.id === user.id ? (
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toUpperCase() }))}
                          className="inline-input"
                          placeholder="Username"
                          maxLength="25"
                        />
                      ) : (
                        user.username
                      )}
                    </td>
                    
                    <td>
                      {editingUser?.id === user.id ? (
                        <select
                          value={formData.level_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, level_id: e.target.value }))}
                          className="inline-select"
                        >
                          <option value="">Select Level</option>
                          {userLevels.map(level => (
                            <option key={level.id} value={level.id}>
                              {level.icon} {level.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span 
                          className="level-badge"
                          style={{ backgroundColor: levelInfo.color }}
                        >
                          {levelInfo.icon} {levelInfo.name}
                        </span>
                      )}
                    </td>
                    
                    <td>
                      <span className={`password-status ${user.must_change_password ? 'must-change' : 'normal'}`}>
                        {user.must_change_password ? (
                          <>🔒 Must Change</>
                        ) : user.password_changed_at ? (
                          <>✅ Changed {new Date(user.password_changed_at).toLocaleDateString()}</>
                        ) : (
                          <>⚠️ Not Set</>
                        )}
                      </span>
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
                            onClick={() => resetPasswordForUser(user.id, user.username)}
                            disabled={loading}
                            className="btn btn-warning"
                          >
                            🔑 Reset Password
                          </button>
                          {!isCurrentUser && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              disabled={loading}
                              className="btn btn-delete"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal - Keep unchanged */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add New User</h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setNewUser({ name: '', username: '', password: '', level_id: '' });
                  setError(null);
                }}
                className="modal-close"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="user-form">
              <div className="form-group">
                <label>Full Name: *</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({...prev, name: e.target.value}))}
                  className="form-input"
                  required
                  maxLength="25"
                  autoComplete="off"
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label>Username: *</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({...prev, username: e.target.value.toUpperCase()}))}
                  className="form-input"
                  required
                  maxLength="25"
                  autoComplete="off"
                  placeholder="Enter username (max 25 chars)"
                />
              </div>

              <div className="form-group">
                <label>Temporary Password: *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({...prev, password: e.target.value}))}
                  className="form-input"
                  required
                  maxLength="25"
                  autoComplete="new-password"
                  placeholder="User will change this on first login"
                />
                <small className="form-hint">
                  User will be required to change this password on first login
                </small>
              </div>

              <div className="form-group">
                <label>Access Level: *</label>
                <select
                  value={newUser.level_id}
                  onChange={(e) => setNewUser(prev => ({...prev, level_id: e.target.value}))}
                  className="form-input"
                  required
                >
                  <option value="">Select Access Level</option>
                  {userLevels.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.icon} {level.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddModal(false);
                    setNewUser({ name: '', username: '', password: '', level_id: '' });
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
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