// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createSlice } from '@reduxjs/toolkit';

interface iDState {
  reportId: string | null;
  loading: boolean;
}

const initialState: iDState = {
    reportId: null,
  loading: false,
}

const reportIdSlice = createSlice ({
  name: 'reportId',
  initialState,
  reducers: {
    setReportId: (state, action) => {
      state.reportId = action.payload
    }
  },
});

export const { setReportId } = reportIdSlice.actions;
export default reportIdSlice.reducer;