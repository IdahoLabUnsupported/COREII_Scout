// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createSlice } from '@reduxjs/toolkit';

interface iDState {
  userId: string | null;
  loading: boolean;
}

const initialState: iDState = {
  userId: null,
  loading: false,
}

const userIdSlice = createSlice ({
  name: 'sourceId',
  initialState,
  reducers: {
    setUserId: (state, action) => {
      state.userId = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    }
  },
});

export const { setUserId, setLoading } = userIdSlice.actions;
export default userIdSlice.reducer;