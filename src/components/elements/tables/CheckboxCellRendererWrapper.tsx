// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { ICellRendererParams } from 'ag-grid-community';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { useGetSourceQuery } from '../../../../app/services/client';
import CheckboxCellRenderer from './CheckboxCellRenderer';
import { RootState } from 'app/store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

interface CheckboxCellRendererWrapperProps extends ICellRendererParams {
  sourceId: string;
}

// Type guard to check if the error is a FetchBaseQueryError
const isFetchBaseQueryError = (error: any): error is FetchBaseQueryError => {
  return typeof error === 'object' && error !== null && 'status' in error;
};

const selectDerivedSourceId = (state: RootState) => state.sourceId.sourceId;
const selectLoading = (state: RootState) => state.sourceId.loading;
const selectResultData = createSelector(
  [selectDerivedSourceId, selectLoading],
  (currentDerivedSourceId, loading) => ({
    currentDerivedSourceId,
    loading,
  })
);

const CheckboxCellRendererWrapper: React.FC<CheckboxCellRendererWrapperProps> = ({ sourceId, ...props }) => {
  const { currentDerivedSourceId, loading } = useSelector(selectResultData);
  const { data: result, error, isLoading, refetch } = useGetSourceQuery(sourceId, {
    skip: !sourceId || loading,
    refetchOnReconnect: true,
  });

  const [checked, setChecked] = useState<boolean>(false);

  useEffect(() => {
    if (result) {
      setChecked(result.enabled); // Assuming `result` has an `enabled` property
    }
  }, [result]);

  useEffect(() => {
    if (error && (!isFetchBaseQueryError(error) || error.status !== 404)) {
      refetch();
    }
  }, [error, refetch]);

  useEffect(() => {
    if (result) {
      setChecked(result.enabled); // Update checked state when result changes
    }
  }, [result]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error && (!isFetchBaseQueryError(error) || error.status !== 404)) {
    return <div>Error fetching data</div>;
  }

  return (
    <CheckboxCellRenderer
      {...props}
      label="Select Source to Include in Report"
      value={sourceId}
      checked={checked}
      name={`selectSource_${sourceId}`}
      labelClassName="sr-only"
      customClass="mt-4"
      sourceId={sourceId}
      onChange={(event) => setChecked(event.target.checked)} // Update checked state on change
    />
  );
};

export default CheckboxCellRendererWrapper;
