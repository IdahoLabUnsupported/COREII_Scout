// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { useEffect, useState } from 'react';
import {
  useSubmitReportMutation,
  useSubmitSourceMutation,
  useAddSourceToReportMutation,
  useGetReportsQuery,
  useGetSourcesQuery,
} from '../services/client';
import { AppReport, Source } from '../types/types';

export const useClientApi = () => {
  const [submitReport] = useSubmitReportMutation();
  const [submitSource] = useSubmitSourceMutation();
  const [addSourceToReport] = useAddSourceToReportMutation();

  const { data: reports = [], refetch: refetchReports } = useGetReportsQuery();
  const { data: sources = [], refetch: refetchSources } = useGetSourcesQuery();

  const [report, setReport] = useState<AppReport | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [reportSelected, setReportSelected] = useState<AppReport | null>(null);
  const [enrichedSourceList, setEnrichedSourceList] = useState<Source[]>([]);

  const defaultSource: Source = {
    id: -1,
    title: 'Unknown',
    sourceText: '',
    processed: 0,
    createdOn: '',
    actions: [],
    data: { sourceText: '', annotations: [] },
    authorFirst: '',
    authorLast: '',
    year: '',
    publishedTitle: '',
    placement: '',
    city: '',
    publisher: '',
    enabled: true,
  };

  useEffect(() => {
    if (report) {
      submitReport(report).unwrap()
        .then(() => {
          return refetchReports();
        })
        .catch(error => console.error('Error submitting report:', error));
    }
  }, [report, submitReport, refetchReports]);

  useEffect(() => {
    if (source && reportSelected) {
      submitSource({ outboundSource: source, reportId: reportSelected.id.toString() }).unwrap()
        .then(newSource => {
          return addSourceToReport({ reportId: reportSelected.id, sourceId: newSource.id }).unwrap();
        })
        .then(() => {
          return Promise.all([refetchReports(), refetchSources()]);
        })
        .then(() => {
          const updatedReport = reports.find(r => r.id === reportSelected.id);
          if (updatedReport) {
            setReportSelected(updatedReport);
          }
        })
        .catch(error => console.error('Error during source submission or report update:', error));
    }
  }, [source, reportSelected, submitSource, addSourceToReport, refetchReports, refetchSources, reports]);

  useEffect(() => {
    if (reportSelected && reportSelected.sourceList && sources.length > 0) {
      const combinedSourceList = reportSelected.sourceList.map((id: any) => {
        const source = sources.find(source => source.id.toString() === id.toString());
        return source ? source : { ...defaultSource, id: Number(id) };
      });
      setEnrichedSourceList(combinedSourceList);
    }
  }, [sources, reportSelected]);

  useEffect(() => {
    if (reports.length > 0 && reportSelected) {
      const updatedReport = reports.find(r => r.id === reportSelected.id);
      if (updatedReport) {
        setReportSelected(updatedReport);
      }
    }
  }, [reports, reportSelected]);

  const handleSubmitReport = (report: AppReport) => setReport(report);

  const handleSubmitSource = (source: Source) => setSource(source);

  const handleSelectReport = (selectedReportIndex: number | null) => {
    if (selectedReportIndex !== null && reports.length > 0) {
      const selectedReport = reports[selectedReportIndex];
      setReportSelected(selectedReport);
    } else {
      setReportSelected(null);
    }
  };

  return {
    handleSubmitReport,
    handleSubmitSource,
    handleSelectReport,
    reports,
    sources,
    reportSelected,
    enrichedSourceList,
  };
};
