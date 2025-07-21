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
  const [isLoading, setIsLoading] = useState(false); // ✅ Changed: No loading on startup
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on app load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        // For now, just validate the token format (in production, validate with server)
        try {
          const decoded = Buffer.from(token, 'base64').toString();
          const [userId, timestamp] = decoded.split(':');
          
          // Check if token is not too old (24 hours)
          const tokenAge = Date.now() - parseInt(timestamp);
          if (tokenAge < 24 * 60 * 60 * 1000) {
            setUser(JSON.parse(userData));
            setIsAuthenticated(true);
          } else {
            clearAuthData();
          }
        } catch (e) {
          clearAuthData();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthData();
    }
  };

  const login = async (username, password) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/loginuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const { user: userData, token } = result;
        
        // Store auth data
        localStorage.setItem('authToken', token);
        localStorage.setItem('userData', JSON.stringify(userData));
        
        setUser(userData);
        setIsAuthenticated(true);
        
        return { success: true, user: userData };
      } else {
        return { 
          success: false, 
          error: result.error || 'Login failed' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.' 
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
  };

  const clearAuthData = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  };

  const hasPermission = (requiredLevel) => {
    if (!user || !user.level_Name) return false;
    
    const levels = {
      'Guest': 1,
      'Viewer': 2,
      'Operator': 3,
      'Manager': 4,
      'Administrator': 5,
      'Super Admin': 6
    };
    
    const userLevel = levels[user.level_Name] || 0;
    const required = levels[requiredLevel] || 999;
    
    return userLevel >= required;
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasPermission,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};