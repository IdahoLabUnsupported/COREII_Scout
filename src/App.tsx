// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import MainScaffold from './layouts/MainScaffold';
import { isAuthenticated as checkAuthentication, removeToken } from '../app/utils/authUtils';
import PageLogin from './pages/PageLogin';

const App: React.FC = () => {
  const [isAuthenticatedState, setIsAuthenticatedState] = useState(checkAuthentication());
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticatedState) {
      navigate('/login');
    }
  }, [isAuthenticatedState, navigate]);

  const handleAuthenticate = () => {
    setIsAuthenticatedState(true);
    navigate('/');
  };

  const handleLogout = () => {
    removeToken();
    setIsAuthenticatedState(false);
    navigate('/login');
  };

  return (
    <div className="App h-screen">
      {isAuthenticatedState ? (
        <MainScaffold onLogout={handleLogout}>
          <Outlet />
        </MainScaffold>
      ) : (
        <PageLogin onAuthenticate={handleAuthenticate} />
      )}
    </div>
  );
};

export default App;
