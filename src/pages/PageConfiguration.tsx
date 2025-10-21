// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';
import { Outlet } from 'react-router-dom';
import LayoutConfiguration from '../layouts/LayoutConfiguration';

type Props = object;

const PageConfiguration: React.FC<Props> = () => {
  return (
    <LayoutConfiguration>
      {/* Render the nested routes */}
      <Outlet />
    </LayoutConfiguration>
  );
}

export default PageConfiguration;
