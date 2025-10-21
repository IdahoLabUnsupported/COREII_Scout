// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import App from './App';
import './index.css';
import { DirtyProvider } from './contexts/DirtyContext';
import { store } from '../app/store/index';

import PageMainLanding from './pages/PageMainLanding';
import PageAccount from './pages/PageAccount';
import PageReport from './pages/PageReport';
import ViewReportCollectionProcessing from './views/ViewReportCollectionProcessing';
import ViewReportDirection from './views/ViewReportDirection';
import ViewReportAnalysis from './views/ViewReportAnalysis';
import ViewReportDissemination from './views/ViewReportDissemination';
import ViewReportSummary from './views/ViewReportSummary';
import ViewReportSettings from './views/ViewReportSettings';
import PageRSS from './pages/PageRSS';
import PageConfiguration from './pages/PageConfiguration';
import ViewSettingsModels from './views/ViewConfigurationModels';
import ViewConfigurationRSSNew from './views/ViewConfigurationRSS';
import PageTopicModeling from './pages/PageTopicModeling';
import ViewTopicsEmerging from './views/ViewTopicsEmerging';
import ViewModelSelector from './views/ViewModelSelector';
import ViewTopicsUserSpecific from './views/ViewTopicsUserSpecific';
import ProtectedRoute from './pages/ProtectedRoute';
import PageLogin from './pages/PageLogin';

import 'material-icons';
import 'material-symbols';
import "@fontsource/source-sans-pro/400.css"; // Specify weight
import "@fontsource/source-sans-pro/400-italic.css"; // Specify weight and style
import "@fontsource/source-sans-pro/600.css"; // Specify weight
import "@fontsource/source-sans-pro/700.css"; // Specify weight
import "@fontsource/source-sans-pro/900.css"; // Specify weight

const apiUrl = import.meta.env.MODE === 'production' ? '/' : '/coreii-scout';

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        { path: "", element: <ProtectedRoute><PageMainLanding /></ProtectedRoute> },
        { path: "account", element: <ProtectedRoute><PageAccount /></ProtectedRoute> },
        { path: "rss-feeds", element: <ProtectedRoute><PageRSS /></ProtectedRoute> },
        {
          path: "configuration", 
          element: <ProtectedRoute><PageConfiguration /></ProtectedRoute>,
          children: [
            {
              index: true,
              element: <Navigate to="models" replace />
            },
            {
              path: "models",
              element: <ProtectedRoute><ViewSettingsModels /></ProtectedRoute>
            },
            {
              path: "rss",
              element: <ProtectedRoute><ViewConfigurationRSSNew /></ProtectedRoute>
            },
          ]
        },
        {
          path: "topics", 
          element: <ProtectedRoute><PageTopicModeling /></ProtectedRoute>,
          children: [
            {
              index: true,
              element: <Navigate to="emerging" replace />
            },
            {
              path: "emerging",
              element: <ProtectedRoute><ViewTopicsEmerging /></ProtectedRoute>
            },
            {
              path: "my-topics",
              element: <ProtectedRoute><ViewTopicsUserSpecific /></ProtectedRoute>
            },
          ]
        },
        {
          path: "reports/:reportTitle",
          element: <ProtectedRoute><PageReport /></ProtectedRoute>,
          children: [
            { index: true, element: <ProtectedRoute><ViewReportSummary /></ProtectedRoute> },
            { path: "summary", element: <ProtectedRoute><ViewReportSummary /></ProtectedRoute> },
            { path: "direction", element: <ProtectedRoute><ViewReportDirection /></ProtectedRoute> },
            { path: "collection-processing", element: <ProtectedRoute><ViewReportCollectionProcessing /></ProtectedRoute> },
            { path: "analysis", element: <ProtectedRoute><ViewReportAnalysis /></ProtectedRoute> },
            { path: "dissemination", element: <ProtectedRoute><ViewReportDissemination /></ProtectedRoute> },
            { path: "settings", element: <ProtectedRoute><ViewReportSettings /></ProtectedRoute> },
          ],
        },
        { path: "/login", element: <PageLogin onAuthenticate={() => {}} /> },
      ],
    },
  ],
  {
    basename: apiUrl,
  }
);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <DirtyProvider>
        <RouterProvider router={router} />
      </DirtyProvider>
    </Provider>
  </React.StrictMode>
);
