// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { useLocation } from 'react-router-dom';

type Props = {
  children: React.ReactNode;
};

const LayoutConfiguration: React.FC<Props> = ({ children }) => {
  const location = useLocation();
  
  const getTitle = (pathname: string) => {
    switch (pathname) {
      case '/configuration/models':
        return 'Model Settings';
      case '/configuration/rss':
        return 'RSS Settings';
      default:
        return 'Model Settings';
    }
  };

  const title = getTitle(location.pathname);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between p-10 bg-gray-300 dark:bg-gray-925 sticky top-0 z-50">
        <h1 className="text-3xl">{title}</h1>
      </div>
      <div className="p-10 z-0 ">
        {children}
      </div>
    </div>
  );
};

export default LayoutConfiguration;
