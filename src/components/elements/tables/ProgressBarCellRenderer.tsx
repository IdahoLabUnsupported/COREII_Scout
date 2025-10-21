// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';

const ProgressBarCellRenderer: React.FC<ICellRendererParams> = ({ value }) => {
  return (
    <div className="flex items-center h-full w-full">
      <div className="w-full bg-gray-200 dark:bg-gray-900 rounded-full relative h-2">
        <div 
          className="
            bg-primary
            text-xs
            font-medium
            text-blue-100
            text-center
            p-0.5
            leading-none
            rounded-full
            h-full
            transition-width
            duration-200
            flex
            items-center
            justify-center
          " 
          style={{ width: `${value}%` }}
        >
          <span className="block w-full sm:hidden">
            {value}%
          </span>
        </div>
        <div 
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            xs:hidden
            sm:flex
          "
        >
          <span>{value}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProgressBarCellRenderer;
