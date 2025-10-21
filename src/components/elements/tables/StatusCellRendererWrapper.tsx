// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { ICellRendererParams } from 'ag-grid-community';
import { useGetResultQuery, useGetSourceQuery } from '../../../../app/services/client';
import StatusCellRenderer from './StatusCellRenderer';
import { RootState } from '../../../../app/store';
import { createSelector, } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const selectDerivedSourceId = (state: RootState) => state.sourceId.sourceId;
const selectLoading = (state: RootState) => state.sourceId.loading;
const selectResultData = createSelector(
  [selectDerivedSourceId, selectLoading],
  (currentDerivedSourceId, loading) => ({
    currentDerivedSourceId,
    loading,
  })
);

interface StatusCellRendererWrapperProps extends ICellRendererParams {
  sourceId: string;
}

const StatusCellRendererWrapper: React.FC<StatusCellRendererWrapperProps> = (props) => {
  const { sourceId } = props;
  const { currentDerivedSourceId, loading } = useSelector(selectResultData);
  
  // Get source data to check processing status
  const { data: source, error: sourceError, isLoading: sourceLoading, refetch: refetchSource } = useGetSourceQuery(sourceId, {
    skip: !sourceId,
    refetchOnReconnect: true,
  });
  
  const { data: result, error, isLoading, refetch } = useGetResultQuery(sourceId, {
    skip: !sourceId || loading || !source || source.processed !== 1, // Skip result query if source not processed
    refetchOnReconnect: true,
  });

  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("Loading...");

  useEffect(() => {
    let pollInterval: NodeJS.Timeout | undefined;

    // First check source processing status
    if (source) {
      if (source.processed === 0) {
        // Processing
        setStatusMessage("Processing...");
        setProgress(0);
        
        // Poll source status while processing
        pollInterval = setInterval(() => {
          refetchSource();
        }, 2000);
      } else if (source.processed === -1) {
        // Failed
        setStatusMessage("Failed");
        setProgress(0);
      } else if (source.processed === 1) {
        // Completed processing - show "Done"
        setStatusMessage("Done");
        setProgress(100);
      }
    } else if (sourceLoading) {
      setStatusMessage("Loading...");
      setProgress(0);
    }

    return () => clearInterval(pollInterval);
  }, [source, sourceLoading, isLoading, result, error, refetch, refetchSource]);

  return (
    <StatusCellRenderer
      {...props} // Pass all props from ag-grid
      progress={progress}
      isLoading={sourceLoading}
      error={sourceError}
      statusMessage={statusMessage}
    />
  );
};

export default StatusCellRendererWrapper;