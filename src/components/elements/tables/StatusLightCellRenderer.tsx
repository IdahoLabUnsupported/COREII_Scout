// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';

interface StatusLightCellRendererProps extends ICellRendererParams {}

const StatusLightCellRenderer: React.FC<StatusLightCellRendererProps> = ({ data }) => {
  const status = data?.status || 'Unknown';

  const getStatusClassName = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center h-full w-full">
      <span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${getStatusClassName(status)}`} />
      <span>{status}</span>
    </div>
  );
};

export default StatusLightCellRenderer;
