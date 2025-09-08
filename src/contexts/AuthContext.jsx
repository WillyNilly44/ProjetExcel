import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  useEffect(() => {
    console.log('AuthProvider: Starting auth check...');
    checkExistingAuth();
  }, []);

  const checkExistingAuth = () => {
    console.log('Checking existing auth...');
    try {
      const storedUser = localStorage.getItem('logViewerUser');
      const timestamp = localStorage.getItem('logViewerUserTimestamp');
      
      console.log('Stored user:', storedUser);
      console.log('Timestamp:', timestamp);
      
      if (storedUser && timestamp) {
        const userData = JSON.parse(storedUser);
        const loginTime = parseInt(timestamp);
        const currentTime = Date.now();
        const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours
        
        console.log('Session check:', { loginTime, currentTime, expired: currentTime - loginTime >= sessionDuration });
        
        if (currentTime - loginTime < sessionDuration) {
          console.log('Valid session found, setting user:', userData);
          setUser(userData);
          // Check if user must change password
          if (userData.must_change_password) {
            console.log('User must change password:', userData.must_change_password);
            setMustChangePassword(true);
          }
        } else {
          // Session expired
          console.log('Session expired, logging out');
          logout();
        }
      } else {
        console.log('No stored session found');
      }
    } catch (error) {
      console.error('Error checking existing auth:', error);
      logout();
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    console.log('Attempting login for:', username);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login response:', data);
      
      if (data.success && data.user) {
        const userData = {
          ...data.user,
          role: getUserRole(data.user.level_Name || 'Viewer'),
          must_change_password: data.user.must_change_password || false,
          password_changed_at: data.user.password_changed_at || null
        };
        
        console.log('Login successful, user data:', userData);
        console.log('Must change password:', userData.must_change_password);
        
        setUser(userData);
        localStorage.setItem('logViewerUser', JSON.stringify(userData));
        localStorage.setItem('logViewerUserTimestamp', Date.now().toString());
        
        // Check if user must change password
        if (userData.must_change_password) {
          console.log('Setting mustChangePassword to true');
          setMustChangePassword(true);
        }
        
        return { success: true, user: userData };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const response = await fetch('/api/changepassword', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.username,
          currentPassword: currentPassword,
          newPassword: newPassword
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Update user data to reflect password change
        const updatedUser = {
          ...user,
          must_change_password: false,
          password_changed_at: new Date().toISOString()
        };
        
        setUser(updatedUser);
        localStorage.setItem('logViewerUser', JSON.stringify(updatedUser));
        setMustChangePassword(false);
        
        return { success: true, message: data.message };
      } else {
        return { success: false, error: data.error || 'Password change failed' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    console.log('Logging out user');
    setUser(null);
    setMustChangePassword(false);
    localStorage.removeItem('logViewerUser');
    localStorage.removeItem('logViewerUserTimestamp');
  };

  const getUserRole = (levelName) => {
    switch (levelName?.toLowerCase()) {
      case 'administrator':
        return 'admin';
      case 'operator':
        return 'operator';
      case 'viewer':
      default:
        return 'viewer';
    }
  };

  const hasPermission = (requiredLevel) => {
    if (!user) return false;
    
    const userLevel = user.level_Name?.toLowerCase() || 'viewer';
    
    switch (requiredLevel.toLowerCase()) {
      case 'administrator':
        return userLevel === 'administrator';
      case 'operator':
        return userLevel === 'operator' || userLevel === 'administrator';
      case 'viewer':
        return true; // Everyone can view
      default:
        return false;
    }
  };

  const value = {
    user,
    loading,
    mustChangePassword,
    setMustChangePassword,
    login,
    logout,
    changePassword,
    hasPermission
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};