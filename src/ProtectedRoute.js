import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './auth';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
