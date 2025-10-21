// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { createSlice, configureStore, PayloadAction } from '@reduxjs/toolkit';
import { AppState } from '../types/types';
import { clientApi } from '../services/client';
import { bertopicApi } from '../services/bertopicApi';
import sourceIdReducer from './sourceIdReduxSlice';
import reportIdReducer from './reportIdReduxSlice';
import workflowReducer from './workflowReduxSlice';

const initialState: AppState = {
  openDrawerLeft: false,
  openDrawerLeftWidth: 64,
  selectedReportIndex: null,
  reportsSharedList: [],
  commonLinksList: [],
  showNewReportView: false,
};

const appStateSlice = createSlice({
  name: 'appState',
  initialState,
  reducers: {
    toggleDrawer: (state) => {
      state.openDrawerLeft = !state.openDrawerLeft;
    },
    setDrawerLeftWidth: (state, action: PayloadAction<number>) => {
      state.openDrawerLeftWidth = action.payload;
    },
    setSelectedReportIndex: (state, action: PayloadAction<number | null>) => {
      state.selectedReportIndex = action.payload;
      state.showNewReportView = false;
    },
    toggleNewReportView: (state, action: PayloadAction<boolean>) => {
      state.showNewReportView = action.payload;
    },
  },
});

export const { toggleDrawer, setDrawerLeftWidth, setSelectedReportIndex, toggleNewReportView } = appStateSlice.actions;

export const store = configureStore({
  reducer: {
    sourceId: sourceIdReducer,
    reportId: reportIdReducer,
    workflow: workflowReducer,
    appState: appStateSlice.reducer,
    [clientApi.reducerPath]: clientApi.reducer,
    [bertopicApi.reducerPath]: bertopicApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(clientApi.middleware, bertopicApi.middleware),
});

export const appStateActions = appStateSlice.actions;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
