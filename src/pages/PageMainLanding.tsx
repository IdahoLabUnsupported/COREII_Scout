// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

// Custom Components
import LayoutMainLanding from '../layouts/LayoutMainLanding';

type Props = object;

const PageMainLanding: React.FC<Props> = () => {
  return (
    <div className="page-component">
      <LayoutMainLanding />
    </div>
  );
}

export default PageMainLanding;
