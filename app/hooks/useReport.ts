// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { useGetReportQuery, useGetSourcesQuery } from '../services/client';

interface Source {
  id: number;
}

interface Report {
  sourceList: string[];
}

interface QueryResult<T> {
  data?: T;
  error?: any;
  isLoading: boolean;
}

const useReport = (reportId: string) => {
  const { data: mainReportInfo, error: mainReportError, isLoading: mainReportLoading } = useGetReportQuery(reportId);
  const { data: reportSources, error: reportSourcesError, isLoading: reportSourcesLoading }: QueryResult<Source[]> = useGetSourcesQuery();

  const filteredSources = mainReportInfo && reportSources
    ? reportSources.filter((source: any) => mainReportInfo.sourceList.includes(source.id.toString()))
    : [];

  return {
    mainReportInfo,
    filteredSources,
    isLoading: mainReportLoading || reportSourcesLoading,
    error: mainReportError || reportSourcesError,
  };
};

export default useReport;
