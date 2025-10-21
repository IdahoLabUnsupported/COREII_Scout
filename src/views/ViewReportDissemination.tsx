// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  useUpdateReportMutation,
  useGetCurrentReportTextQuery,
  useCallLlmQuery,
  useGetJobStatusQuery,
  useKillJobMutation,
  useGetVersionRecordsQuery,
  useUpdateCurrentTextVersionIdMutation,
  useSaveVersionMutation
} from '../../app/services/client';
import { useOutletContext } from 'react-router-dom';
import { AppReport } from '../../app/types/types';
import ButtonBasic from '../components/elements/ButtonBasic';
import CardStatusNested from '../components/cards/CardStatusNested';
import Editor from '../components/elements/Editor';
import DOMPurify from 'dompurify';
import Quill from 'quill';
import { useDirtyContext } from '../contexts/DirtyContext';
import '../quill.dark.css';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

const Delta = Quill.import('delta');

const ViewReportDissemination: React.FC = () => {
  const { reportSelected, setRefresh, setIsDirty: setGlobalIsDirty } = useOutletContext<{
    reportSelected: AppReport,
    setRefresh: (value: boolean) => void,
    setIsDirty: (value: boolean) => void
  }>();

  const [updateReport] = useUpdateReportMutation();
  const [killJob] = useKillJobMutation();
  const [updateCurrentTextVersionId] = useUpdateCurrentTextVersionIdMutation();
  const [saveVersion] = useSaveVersionMutation();
  const { isDirty, setIsDirty } = useDirtyContext();
  const [saveStatus, setSaveStatus] = useState<{ color: string, icon: string, message: string }>({ color: '', icon: '', message: '' });
  const quillRef = useRef<Quill | null>(null);

  const { data: reportText, isSuccess: isReportSuccess, error: reportTextFetchError, refetch: refetchReportText } = useGetCurrentReportTextQuery(reportSelected.id);
  const [llmCall, setLlmCall] = useState(false);

  const { data: llmResponse, isFetching, isSuccess: isLlmSuccess, error, refetch } = useCallLlmQuery(reportSelected.id, {
    skip: !llmCall,
  });

  const { data: jobStatus, isLoading: jobStatusLoading, refetch: refetchJobStatus } = useGetJobStatusQuery(reportSelected.id.toString(), {
    pollingInterval: 2000, // Poll every 2 seconds
  });

  const { data: versionRecords, refetch: refetchVersions, error: versionError, isLoading: versionLoading } = useGetVersionRecordsQuery(reportSelected.id);

  const [editorContent, setEditorContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>('Current');

  // Helper function to format time duration
  const formatDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.max(0, Math.floor(diffMs / 1000)); // Ensure non-negative
    const minutes = Math.floor(diffSeconds / 60);
    const seconds = diffSeconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  // Helper function to format time
  const formatTime = (timeString: string) => {
    return new Date(timeString).toLocaleTimeString();
  };

  // Handle report text loading
  // Note: titles are passed with md asterisks and we have just parsed them out...
  useEffect(() => {
    if (isReportSuccess && reportText !== undefined) {
      if (!reportText || reportText === "" || reportTextFetchError) {
        // Don't automatically trigger LLM call, wait for user interaction
        setLoading(false);
        setEditorContent(null);
      } else {
        // Handle different data formats
        let processedContent;
        try {
          if (typeof reportText === 'string') {
            // If it's a string, check if it's Quill Delta JSON
            const parsed = JSON.parse(reportText);
            if (parsed.ops) {
              // It's Quill Delta JSON, use it directly
              processedContent = new Delta(parsed);
            } else {
              // It's plain text
              processedContent = new Delta().insert(reportText.replace(/\*\*|\*/g, ''));
            }
          } else if (reportText && typeof reportText === 'object' && reportText.ops) {
            // It's already a Quill Delta object
            processedContent = new Delta(reportText);
          } else {
            // Fallback to plain text
            processedContent = new Delta().insert(String(reportText).replace(/\*\*|\*/g, ''));
          }
          setEditorContent(processedContent);
        } catch (error) {
          console.error('Error processing report text:', error);
          setEditorContent(null);
        }
        setLoading(false);
      }
    }
  }, [isReportSuccess, reportText, reportTextFetchError]);

  // Type guard to check if the error is a FetchBaseQueryError
  const isFetchBaseQueryError = (error: any): error is FetchBaseQueryError => {
    return error && typeof error.status === 'number';
  };

  // Handle LLM call response and job status
  useEffect(() => {
    if (error && isFetchBaseQueryError(error) && error.status === 401) {
      setLlmCall(false);
      setLoading(false);
      return;
    }
    else if (error && isFetchBaseQueryError(error)) {
      setLlmCall(false);
      setLoading(false);
      return;
    }

    if (isLlmSuccess && llmResponse && !isFetching) {
      const { llmText } = llmResponse;

      if (llmText) {
        // Handle different data formats - same logic as existing report text
        let processedContent;
        try {
          if (typeof llmText === 'string') {
            // If it's a string, check if it's Quill Delta JSON
            const parsed = JSON.parse(llmText);
            if (parsed.ops) {
              // It's Quill Delta JSON, use it directly
              processedContent = new Delta(parsed);
            } else {
              // It's plain text
              processedContent = new Delta().insert(llmText.replace(/\*\*|\*/g, ''));
            }
          } else if (llmText && typeof llmText === 'object' && llmText.ops) {
            // It's already a Quill Delta object
            processedContent = new Delta(llmText);
          } else {
            // Fallback to plain text
            processedContent = new Delta().insert(String(llmText).replace(/\*\*|\*/g, ''));
          }
          setEditorContent(processedContent);
          // Create a new version for the LLM-generated content
          createVersionFromLlm(llmText);
        } catch (error) {
          console.error('Error processing llmText:', error);
          setEditorContent(null);
        }
      } else {
        console.error('llmText not found in response:', llmResponse);
        setEditorContent(null);
      }

      setLlmCall(false);
      setLoading(false);
    }
  }, [isLlmSuccess, llmResponse, isFetching, error, versionRecords]);

  // Check job status on mount to handle page refreshes
  useEffect(() => {
    if (jobStatus && (jobStatus.status === 'started' || jobStatus.status === 'running')) {
      setLlmCall(true);
      setLoading(true);
    } else if (jobStatus && jobStatus.status === 'completed') {
      setLlmCall(false);
      setLoading(false);
    } else if (jobStatus && jobStatus.status === 'failed') {
      setLlmCall(false);
      setLoading(false);
    }
  }, [jobStatus]);

  const initializeEditor = useCallback(() => {
    if (quillRef.current && editorContent) {
      quillRef.current.setContents(editorContent);
    }
  }, [editorContent]);

  useEffect(() => {
    initializeEditor();
  }, [initializeEditor]);

  const handleChange = () => {
    if (quillRef.current) {
      setGlobalIsDirty(true);
      setSaveStatus({ color: 'text-gray', icon: '', message: 'Unsaved changes' });
    }
  };

  const handleSave = (isAutoSave = false) => {
    if (quillRef.current) {
      const quill = quillRef.current;
      const sanitizedHtmlContent = DOMPurify.sanitize(quill.root.innerHTML);
      const sanitizedDelta = quill.clipboard.convert({ html: sanitizedHtmlContent });

      updateReport({ ...reportSelected, version: JSON.stringify(sanitizedDelta) })
        .unwrap()
        .then(async () => {
          if (!isAutoSave) {
            try {
              await saveVersion({ id: reportSelected.id, derivedFromSourceId: null }).unwrap();
              refetchVersions(); // Refresh the version dropdown
              setCurrentVersion(`Version ${(versionRecords?.length || 0) + 1}`);
            } catch (versionError) {
              console.error('Failed to create version:', versionError);
            }
          }

          setSaveStatus({
            color: 'text-success',
            icon: 'check_circle',
            message: isAutoSave ? 'Autosaved' : 'Saved & Versioned'
          });
          setRefresh(true);
          setIsDirty(false);
          setGlobalIsDirty(false);
        })
        .catch(() => {
          setSaveStatus({ color: 'text-error', icon: 'error', message: 'Error saving. Please try again.' });
        });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) {
        handleSave(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleClick = () => {
    // Prevent multiple submissions if already running
    if (isJobRunning || loading) {
      return;
    }
    setLlmCall(true);
    setLoading(true);
    refetchJobStatus(); // Ensure we get the latest job status
  };

  const handleRegenerateClick = () => {
    // Prevent multiple submissions if already running
    if (isJobRunning || loading) {
      return;
    }
    setLlmCall(true);
    setLoading(true);
    refetchJobStatus(); // Ensure we get the latest job status
    setTimeout(() => refetch(), 0);
  };

  const handleKillJob = async () => {
    try {
      await killJob(reportSelected.id.toString()).unwrap();
      setLlmCall(false);
      setLoading(false);
      refetchJobStatus(); // Refresh job status after killing
    } catch (error) {
      console.error('Failed to kill job:', error);
    }
  };

  // Check if a job is currently running
  const isJobRunning = jobStatus && (jobStatus.status === 'started' || jobStatus.status === 'running');

  const handleVersionLoad = async (versionId: string) => {
    if (!versionId) return;

    try {
      if (versionId === 'current') {
        setCurrentVersion('Current');
        // Reset to current version by clearing currentTextVersionId
        await updateCurrentTextVersionId({ id: reportSelected.id, newCurrentVersionId: 0 }).unwrap();
      } else {
        await updateCurrentTextVersionId({ id: reportSelected.id, newCurrentVersionId: parseInt(versionId) }).unwrap();
        setCurrentVersion(`Version ${versionId}`);
      }
      // Refetch the report text to get the selected version
      await refetchReportText();
    } catch (error) {
      console.error('Failed to load version:', error);
    }
  };

  const createVersionFromLlm = async (llmText: string) => {
    try {
      // First save the LLM text to the report
      const sanitizedDelta = new Delta().insert(llmText);
      await updateReport({ ...reportSelected, version: JSON.stringify(sanitizedDelta) }).unwrap();

      // Then create a version
      await saveVersion({ id: reportSelected.id, derivedFromSourceId: null }).unwrap();
      refetchVersions(); // Refresh the version dropdown
      setCurrentVersion(`Version ${(versionRecords?.length || 0) + 1}`);
    } catch (error) {
      console.error('Failed to create version from LLM:', error);
      // Fallback to just updating the version label
      setCurrentVersion(`Version ${(versionRecords?.length || 0) + 1}`);
    }
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-row justify-between bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex items-center">
          <h2 className="flex-col text-2xl mr-3">Dissemination</h2>
          <span className="text-sm text-gray-600 dark:text-gray-400 mr-4">({currentVersion})</span>
          <div className="flex items-center mr-4">
            <label htmlFor="select-saved-versions" className="sr-only">Saved Versions</label>
            <select
              id="select-saved-versions"
              className="select-sm select select-bordered input-secondary w-full bg-gray-300 dark:bg-gray-800 !border !border-solid !border-gray-400 dark:border dark:border-solid dark:!border-gray-400 dark:text-gray-300 text-gray-500"
              value=""
              onChange={(e) => handleVersionLoad(e.target.value)}
            >
              <option value="" disabled hidden>Load Version</option>
              <option value="current">Current Version</option>
              {versionLoading && <option disabled>Loading versions...</option>}
              {versionError && <option disabled>Error loading versions</option>}
              {versionRecords?.map((record: any) => (
                <option key={record.version} value={record.version.toString()}>
                  Version {record.version}
                </option>
              ))}
              {!versionLoading && !versionError && (!versionRecords || versionRecords.length === 0) && (
                <option disabled>No saved versions</option>
              )}
            </select>
          </div>
        </div>
        <div className="flex items-center">
          <div style={{ marginRight: '1rem' }}>
            {editorContent && !isJobRunning ? (
              <ButtonBasic
                label={"Regenerate"}
                color={'btn-primary'}
                buttonSize="btn-sm"
                onClick={handleRegenerateClick}
              />
            ) : null}
          </div>
          {isJobRunning && (
            <div style={{ marginRight: '1rem' }}>
              <ButtonBasic
                label={"Kill Job"}
                color={'btn-error'}
                buttonSize="btn-sm"
                onClick={handleKillJob}
              />
            </div>
          )}
          <div className={`flex items-center mr-3 ${saveStatus.color}`}>
            <span className="material-icons scale-75">{saveStatus.icon}</span><span>{saveStatus.message}</span>
          </div>
          <ButtonBasic
            label={editorContent ? "Save" : "Call LLM"}
            color={'btn-primary'}
            buttonSize="btn-sm"
            onClick={editorContent ? () => handleSave(false) : handleClick}
            disabled={isJobRunning && !editorContent}
          />
        </div>
      </div>
      <div className="view-pane-component p-6 flex flex-col w-full flex-1">
        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            <CardStatusNested title={'Analyzing report...'} type="normal" className="h-full">
              <div className="space-y-4">
                <div>Large language model is currently performing report analysis.</div>
                {jobStatus && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>
                      <strong>Status:</strong> {jobStatus.status === 'started' ? 'Starting...' :
                        jobStatus.status === 'running' ? 'Running...' :
                          jobStatus.status}
                    </div>
                    <div>
                      <strong>Started:</strong> {formatTime(jobStatus.startTime)}
                    </div>
                    <div>
                      <strong>Duration:</strong> {formatDuration(jobStatus.startTime, jobStatus.endTime)}
                    </div>
                    {jobStatus.error && !isJobRunning && (
                      <div className="text-red-600 dark:text-red-400">
                        <strong>Error:</strong> {jobStatus.error}
                      </div>
                    )}
                  </div>
                )}
                {isJobRunning && (
                  <div>
                    <ButtonBasic
                      label="Kill Job"
                      color={'btn-error'}
                      buttonSize="btn-sm"
                      onClick={handleKillJob}
                    />
                  </div>
                )}
              </div>
            </CardStatusNested>
          </div>
        ) : (
          editorContent ? (
            <div className="grid grid-cols-1 gap-4 flex-1">
              <CardStatusNested title={'Generated Report from LLM'} type="normal" className="h-full">
                <Editor
                  ref={quillRef}
                  readOnly={false}
                  defaultValue={editorContent}
                  onSelectionChange={() => { }}
                  onTextChange={handleChange}
                />
              </CardStatusNested>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              <CardStatusNested title={'No Report Data'} type="normal" className="h-full">
                <ButtonBasic
                  label="Call LLM"
                  color={'btn-primary'}
                  buttonSize="btn-sm"
                  onClick={handleClick}
                  disabled={isJobRunning}
                />
              </CardStatusNested>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default ViewReportDissemination;
