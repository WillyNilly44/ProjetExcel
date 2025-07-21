import React, { createContext, useContext, useState } from 'react';

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
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const login = async (username, password) => {
    try {
      console.log('Attempting login for:', username);
      
      const response = await fetch('/api/loginuser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUser(result.user);
        setIsAuthenticated(true);
        console.log('Login successful:', result.user);
        return { success: true };
      } else {
        console.log('Login failed:', result.error);
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    console.log('User logged out');
  };

  // Add permission checking function
  const hasPermission = (requiredLevel) => {
    if (!user || !user.level_Name) return false;
    
    const levels = {
      'Guest': 0,
      'Viewer': 1,
      'Operator': 2,
      'Manager': 3,
      'Administrator': 4,
      'Super Admin': 5
    };
    
    const userLevel = levels[user.level_Name] || 0;
    const required = levels[requiredLevel] || 0;
    
    return userLevel >= required;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};