// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

type Props = {
  children: React.ReactNode;
  title: string | React.ReactNode; // Allow title to be either a string or a ReactNode
  type: string;
  titleAlignment?: string;
  className?: string;
};

const CardStatusNested: React.FC<Props> = ({
  children,
  title,
  type,
  titleAlignment,
  className
}) => {
  return (
    <>
      {type === 'normal' && (
        <div className={`card p-4 bg-gray-100 dark:bg-gray-900 shadow-md text-black dark:text-white ${className}`}>
          <div className='mb-4 flex justify-left'>
            <h4 className={`text-xl ${titleAlignment === 'center' ? 'text-center' : ''}`}>
              {title}
            </h4>
          </div>
          {children}
        </div>
      )}
      {type === 'mitre-col' && (
        <div className={`card p-2 bg-gray-100 dark:bg-gray-900 shadow-md text-gray-800 dark:text-gray-200 ${className}`}>
          <div className='mb-4 flex justify-center items-center h-12 rounded-md dark:bg-gray-950 bg-white'>
            <h4 className={`text-sm ${titleAlignment === 'center' ? 'text-center' : ''}`}>
              {title}
            </h4>
          </div>
          {children}
        </div>
      )}
    </>
  );
};

export default CardStatusNested;
