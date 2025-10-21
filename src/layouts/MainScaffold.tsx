// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import ThemeContextComponent from '../contexts/ThemeContextComponent';
import Header from '../components/core/Header';
import Drawer from '../components/core/Drawer';

type Props = { 
  children: React.ReactNode; 
  onLogout: () => void;
};

const MainScaffold: React.FC<Props> = ({ children, onLogout }) => {
  return (
    <ThemeContextComponent>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header onLogout={onLogout} />

        <div className="flex flex-1 h-full overflow-hidden">
          <Drawer />

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </ThemeContextComponent>
  );
};

export default MainScaffold;
