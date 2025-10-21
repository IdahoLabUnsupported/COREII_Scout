// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import LayoutLogin from '../layouts/LayoutLogin';
import ThemeContextComponent from '../contexts/ThemeContextComponent';

interface PageLoginProps {
  onAuthenticate: () => void;
}

const PageLogin: React.FC<PageLoginProps> = ({ onAuthenticate }) => {
  return (
    <ThemeContextComponent>
      <div className="page-component">
        <LayoutLogin onAuthenticate={onAuthenticate} />
      </div>
    </ThemeContextComponent>
  );
};

export default PageLogin;
