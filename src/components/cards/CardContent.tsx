// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

type Props = {
  children: any,
  customPadding?: string;
  customClass?: string
};

const CardContent: React.FC<Props> = ({ children, customPadding, customClass }) => {

   // Check if customClass contains 'hover' to conditionally add hover classes
  const hoverClass = customClass && customClass.includes('hover') ? 'hover:bg-primary dark:hover:bg-primary-inactive' : '';
  return (
    <div className={`card 
      ${customPadding || 'p-10'} 
      bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 overflow-auto flex align-middle min-h-[10rem]
      ${customClass} 
        ${hoverClass}`}>
      {children}
    </div>
  );
};

export default CardContent;