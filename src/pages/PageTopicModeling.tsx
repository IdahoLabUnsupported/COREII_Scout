// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';
import { Outlet } from 'react-router-dom';
import LayoutTopicModeling from '../layouts/LayoutTopicModeling';

type Props = object;

const PageTopicModeling: React.FC<Props> = () => {
  return (
    <LayoutTopicModeling>
      {/* Render the nested routes */}
      <Outlet />
    </LayoutTopicModeling>
  );
}

export default PageTopicModeling;
