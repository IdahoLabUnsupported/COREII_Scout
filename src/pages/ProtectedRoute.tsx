// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated as checkAuthentication } from '../../app/utils/authUtils';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const isAuthenticated = checkAuthentication();

  return isAuthenticated ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;
