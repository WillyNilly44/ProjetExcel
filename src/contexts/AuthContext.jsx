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
  const [isLoading, setIsLoading] = useState(true);

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
          } else {
           
            localStorage.removeItem('logViewerUser');
            localStorage.removeItem('logViewerUserTimestamp');
          }
        }
      } catch (error) {
        console.error('❌ Error loading stored user:', error);
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
      } catch (error) {
        console.error('❌ Error saving user to localStorage:', error);
      }
    } else {
      // Clear localStorage when user logs out
      localStorage.removeItem('logViewerUser');
      localStorage.removeItem('logViewerUserTimestamp');
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
        return { success: true, user: userData.user };
      } else {
        throw new Error(userData.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
  };

  const hasPermission = (requiredLevel) => {
    if (!user || !user.level_Name) {
      return false;
    }

    const levels = {
      'Viewer': 1,
      'Operator': 2,
      'Manager': 3,
      'Administrator': 4,
      'Super Admin': 5
    };

    const userLevel = levels[user.level_Name] || 0;
    const requiredLevelNum = levels[requiredLevel] || 0;

    return userLevel >= requiredLevelNum;
  };

  const updateUser = (updatedUserData) => {
    setUser(prev => ({
      ...prev,
      ...updatedUserData
    }));
  };

  const refreshUserSession = async () => {
    if (!user || !user.id) {
      return false;
    }

    try {
       
      const response = await fetch('/api/validateuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id })
      });

      if (!response.ok) {
        logout();
        return false;
      }

      const userData = await response.json();
      
      if (userData.success && userData.user) {
        setUser(userData.user);
        return true;
      } else {
        logout();
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing user session:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    isLoading,
    login,
    logout,
    hasPermission,
    updateUser,
    refreshUserSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};