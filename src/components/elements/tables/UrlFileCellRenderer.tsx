// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';

const UrlFileCellRenderer: React.FC<ICellRendererParams> = ({ data }) => {
  if (data.url) {
    return <a href={data.url} target="_blank" rel="noopener noreferrer">{data.url}</a>;
  } else if (data.file) {
    return <span>{data.file.name}</span>;
  } else {
    return <span>No URL or File</span>;
  }
};

export default UrlFileCellRenderer;
