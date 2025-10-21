// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';
import { Outlet } from 'react-router-dom';
import LayoutAccount from '../layouts/LayoutAccount';

type Props = object;

const PageAccount: React.FC<Props> = () => {
  return (
    <LayoutAccount />
  );
}

export default PageAccount;
