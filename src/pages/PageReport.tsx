// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetReportsQuery } from '../../app/services/client';
import { toUrlFriendly } from '../../app/utils/urlHelpers';
import { appStateActions } from '../../app/store';
import useNavigationGuard from '../../app/hooks/useNavigationGuard';
import { DirtyProvider, useDirtyContext } from '../contexts/DirtyContext';
import LayoutReport from '../layouts/LayoutReport';

const PageReport: React.FC = () => {
  const { reportTitle } = useParams<{ reportTitle: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [refresh, setRefresh] = useState(false);
  const { data: reportsList = [], refetch } = useGetReportsQuery();
  const { isDirty, setIsDirty } = useDirtyContext();

  const resetDirty = () => setIsDirty(false);

  const report = reportsList.find(report => toUrlFriendly(report.title) === reportTitle);

  useEffect(() => {
    if (refresh) {
      refetch();
      setRefresh(false);
    }
  }, [refresh, refetch]);

  useEffect(() => {
    if (!report) return;

    const reportIndex = reportsList.findIndex(r => r.id === report.id);
    dispatch(appStateActions.setSelectedReportIndex(reportIndex));

    const segments = location.pathname.split('/');
    const lastSegment = segments[segments.length - 1];

    if (lastSegment === '' || lastSegment === reportTitle) {
      navigate(`${location.pathname}/summary`, { replace: true });
    }
  }, [navigate, location, reportTitle, report, reportsList, dispatch]);

  useNavigationGuard('You have unsaved changes. Are you sure you want to leave?', () => {
    console.log("Navigation caneled.");
  });

  return (
    <DirtyProvider>
      <div className="page-component">
        <LayoutReport report={report} setRefresh={setRefresh} setIsDirty={setIsDirty} />
      </div>
    </DirtyProvider>
  );
};

export default PageReport;