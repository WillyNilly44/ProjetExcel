import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

const ProtectedRoute = ({ children, requiredLevel = null }) => {
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth();

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🔄</div>
        <div className="loading-text">Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (requiredLevel && !hasPermission(requiredLevel)) {
    return (
      <div className="access-denied">
        <div className="access-denied-content">
          <h1>🚫 Access Denied</h1>
          <p>You don't have permission to access this feature.</p>
          <p>Required level: <strong>{requiredLevel}</strong></p>
          <p>Your level: <strong>{user?.level_Name || 'Unknown'}</strong></p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;