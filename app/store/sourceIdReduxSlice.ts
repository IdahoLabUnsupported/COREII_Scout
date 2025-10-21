// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createSlice } from '@reduxjs/toolkit';

interface iDState {
  sourceId: string | null;
  loading: boolean;
}

const initialState: iDState = {
  sourceId: null,
  loading: false,
}

const sourceIdSlice = createSlice ({
  name: 'sourceId',
  initialState,
  reducers: {
    setSourceId: (state, action) => {
      state.sourceId = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    }
  },
});

export const { setSourceId, setLoading } = sourceIdSlice.actions;
export default sourceIdSlice.reducer;