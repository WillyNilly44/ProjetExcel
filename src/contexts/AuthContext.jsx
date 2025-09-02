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
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Add role definitions
  const roleDefinitions = {
    'Administrator': '👑',
    'Updater': '⚡',
    'Viewer': '👨‍💼'
  };

  // Load user from localStorage on app start
  useEffect(() => {
    const loadStoredUser = () => {
      try {
        const storedUser = localStorage.getItem('logViewerUser');
        const storedTimestamp = localStorage.getItem('logViewerUserTimestamp');
        
        if (storedUser && storedTimestamp) {
          const userObj = JSON.parse(storedUser);
          const timestamp = parseInt(storedTimestamp);
          const now = Date.now();
          
          // Check if the stored session is less than 24 hours old
          const sessionAge = now - timestamp;
          const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
          
          if (sessionAge < maxSessionAge) {
            setUser(userObj);
            setIsAuthenticated(true); // ADD THIS LINE
          } else {
            localStorage.removeItem('logViewerUser');
            localStorage.removeItem('logViewerUserTimestamp');
          }
        }
      } catch (error) {
        localStorage.removeItem('logViewerUser');
        localStorage.removeItem('logViewerUserTimestamp');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();
  }, []);

  // Save user to localStorage whenever user state changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('logViewerUser', JSON.stringify(user));
        localStorage.setItem('logViewerUserTimestamp', Date.now().toString());
        setIsAuthenticated(true); // ADD THIS LINE
      } catch (error) {
      }
    } else {
      // Clear localStorage when user logs out
      localStorage.removeItem('logViewerUser');
      localStorage.removeItem('logViewerUserTimestamp');
      setIsAuthenticated(false); // ADD THIS LINE
    }
  }, [user]);

  const login = async (username, password) => {
    try {
      const response = await fetch('/api/loginuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const userData = await response.json();
      
      if (userData.success && userData.user) {
        setUser(userData.user);
        setIsAuthenticated(true); // ADD THIS LINE
        return { success: true, user: userData.user };
      } else {
        throw new Error(userData.error || 'Login failed');
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false); // ADD THIS LINE
  };

  const hasPermission = (requiredRole) => {
    if (!user || !isAuthenticated) {
      return false;
    }

    // Check by level_Name (your current system)
    if (requiredRole === 'Administrator') {
      return user.level_Name === 'Administrator' || user.level_Name === 'Super Admin';
    }
    
    if (requiredRole === 'Operator') {
      return ['Administrator', 'Super Admin', 'Manager', 'Operator'].includes(user.level_Name);
    }

    if (requiredRole === 'Manager') {
      return ['Administrator', 'Super Admin', 'Manager'].includes(user.level_Name);
    }

    // Also check by role field (new system)
    if (user.role) {
      if (requiredRole === 'Administrator') {
        return user.role === 'Administrator';
      }
      
      if (requiredRole === 'Operator') {
        return user.role === 'Administrator' || user.role === 'Updater';
      }
    }
    
    return true;
  };

  // Add helper function to get role display
  const getRoleDisplay = (roleName = null) => {
    const role = roleName || user?.role || user?.level_Name;
    const icon = roleDefinitions[role] || getLevelIcon(role) || '❓';
    return `${icon} ${role}`;
  };

  // Helper function for level icons (from your existing code)
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

  const value = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission,
    getRoleDisplay,
    roleDefinitions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};