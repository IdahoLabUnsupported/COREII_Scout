// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import LayoutRSS from '../layouts/LayoutRSS';
import { useGetSettingsQuery } from '../../app/services/client';

const PageRSS: React.FC = () => {
  return (
    <div className="page-component">
      <LayoutRSS />
    </div>
  );
};

export default PageRSS;
