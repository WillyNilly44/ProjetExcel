import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import MiniLogin from './MiniLogin'; // FIXED: Changed from './Login' to './MiniLogin'

const ProtectedRoute = ({ children }) => {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show login
  if (!user) {
    return <MiniLogin />;
  }

  // If user is authenticated, render the protected content
  return children;
};

export default ProtectedRoute;