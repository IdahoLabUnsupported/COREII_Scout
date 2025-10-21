// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';
import { DateTime } from 'luxon';

const DateCellRenderer: React.FC<ICellRendererParams> = ({ value }) => {
  const date = DateTime.fromISO(value);
  return date.isValid ? <span>{date.toFormat('MM/dd/yy')}</span> : <span>{value}</span>;
};

export default DateCellRenderer;
