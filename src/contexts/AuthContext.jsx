import React, { createContext, useContext, useState, useEffect } from 'react';
import { PublicClientApplication } from '@azure/msal-browser';
import { msalConfig, loginRequest } from '../config/authConfig';

const AuthContext = createContext();

const msalInstance = new PublicClientApplication(msalConfig);

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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeSSO();
  }, []);

  const initializeSSO = async () => {
    try {
      await msalInstance.initialize();
      
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        const ssoAccount = accounts[0];
        const userWithPermissions = await fetchUserPermissions(ssoAccount);
        
        if (userWithPermissions) {
          setUser(userWithPermissions);
          setIsAuthenticated(true);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('❌ SSO initialization failed:', error);
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      console.log('🔐 Starting SSO login...');
      
      const response = await msalInstance.loginPopup(loginRequest);
      const ssoAccount = response.account;
      
      const userWithPermissions = await fetchUserPermissions(ssoAccount);
      
      if (userWithPermissions) {
        setUser(userWithPermissions);
        setIsAuthenticated(true);
        console.log('✅ SSO login successful:', userWithPermissions);
        return { success: true };
      } else {
        console.log('❌ User not authorized');
        return { success: false, error: 'User not authorized for this application' };
      }
      
    } catch (error) {
      console.error('❌ SSO Login error:', error);
      return { success: false, error: 'SSO login failed. Please try again.' };
    }
  };

  const fetchUserPermissions = async (ssoAccount) => {
    try {
      const response = await fetch('/api/sso-auth', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          ssoId: ssoAccount.localAccountId,
          email: ssoAccount.username,
          name: ssoAccount.name || ssoAccount.username,
          department: ssoAccount.idTokenClaims?.department,
          jobTitle: ssoAccount.idTokenClaims?.jobTitle
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        return {
          id: result.user.id,
          name: result.user.name,
          username: result.user.email, // Use email as username
          email: result.user.email,
          level_Name: result.user.level_Name,
          department: result.user.department,
          jobTitle: result.user.jobTitle,
          ssoId: ssoAccount.localAccountId
        };
      } else {
        console.log('❌ User authorization failed:', result.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch user permissions:', error);
      return null;
    }
  };

  const logout = async () => {
    try {
      await msalInstance.logoutPopup();
      setUser(null);
      setIsAuthenticated(false);
      console.log('✅ SSO logout successful');
    } catch (error) {
      console.error('❌ SSO logout failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      window.location.reload();
    }
  };

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
      isLoading,
      login, 
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  );
};