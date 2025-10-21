// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';

interface StatusCellRendererProps extends ICellRendererParams {
  progress?: number;
  isLoading?: boolean;
  error?: any;
  statusMessage?: string;
}

const StatusCellRenderer: React.FC<StatusCellRendererProps> = ({ 
  progress = 0, 
  isLoading = true, 
  error = null, 
  statusMessage 
}) => {
  return (
    <div className="flex items-center h-full w-full">
      {isLoading ? (
        <span>Loading...</span>
      ) : error ? (
        <span>Error</span>
      ) : statusMessage ? (
        <span>{statusMessage}</span>
      ) : (
        <span>{progress}%</span>
      )}
    </div>
  );
};

export default StatusCellRenderer;
