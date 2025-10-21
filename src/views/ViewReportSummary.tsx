// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { useUpdateReportMutation, useGetResultsQuery } from '../../app/services/client';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CardContent from '../components/cards/CardContent';
import CardStatusNested from '../components/cards/CardStatusNested';
import FormElementTextInput from '../components/forms/formElements/FormElementTextInput';
import FormElementDateInput from '../components/forms/formElements/FormElementDateInput';
import ButtonBasic from '../components/elements/ButtonBasic';
import { toUrlFriendly } from '../../app/utils/urlHelpers.ts';
import { DateTime } from 'luxon';
import { useDirtyContext } from '../contexts/DirtyContext';
import { jsFileDump } from '../../app/utils/jsFileDump.ts';
import useReport from '../../app/hooks/useReport';
import { AppReport, Result } from '../../app/types/types';

const ViewReportSummary: React.FC = () => {
  const { reportSelected, setRefresh, setIsDirty: setGlobalIsDirty } = useOutletContext<{ 
    reportSelected: AppReport, 
    setRefresh: (value: boolean) => void,
    setIsDirty: (value: boolean) => void
  }>();
  const { data: allResults } = useGetResultsQuery();

  const navigate = useNavigate();
  const [updateReport] = useUpdateReportMutation();

  const [report, setReport] = useState<AppReport | null>(null);
  const [tempReport, setTempReport] = useState<AppReport | null>(null);
  const { isDirty, setIsDirty } = useDirtyContext();
  const [saveStatus, setSaveStatus] = useState<{ color: string, icon: string, message: string }>({ color: '', icon: '', message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [results, setResults] = useState<{ [key: number]: Result[] }>({});

  const { mainReportInfo, filteredSources, isLoading, error } = useReport(reportSelected.id.toString());

  const [errors, setErrors] = useState({
    titleError: '',
    targetError: '',
    dueDateError: '',
    requestedByError: '',
    createdByError: '',
    createdOnError: '',
  });

  const [warnings, setWarnings] = useState({
    dueDateWarning: '',
  });

  // useEffect(() => {
  //   if (reportSelected) {
  //     setReport(reportSelected);
  //     setTempReport(reportSelected);
  //     setErrors({
  //       titleError: '',
  //       targetError: '',
  //       dueDateError: '',
  //       requestedByError: '',
  //       createdByError: '',
  //       createdOnError: '',
  //     });
  //     setWarnings({
  //       dueDateWarning: '',
  //     });

  //     if (reportSelected.dueDate && new Date(reportSelected.dueDate) < new Date()) {
  //       setWarnings({
  //         dueDateWarning: 'The due date has passed.'
  //       });
  //     }
  //   }
  // }, [reportSelected]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tempReport, isDirty]);

  const isoToMMDDYYYY = (isoString: string) => {
    return DateTime.fromISO(isoString).toFormat('MM/dd/yyyy');
  };

  const validateTitle = (value: string) => {
    const regex = /^[a-zA-Z0-9 :,-]*$/;
    if (value.trim() === '') {
      return 'Title is required';
    } else if (!regex.test(value)) {
      return 'Title contains invalid characters';
    } else {
      return '';
    }
  };

  const validateTarget = (value: string) => {
    const regex = /^[a-zA-Z0-9 ]*$/;
    if (value.trim() === '') {
      return 'Target is required';
    } else if (!regex.test(value)) {
      return 'Target contains invalid characters';
    } else {
      return '';
    }
  };

  const validateRequestedBy = (value: string) => {
    const regex = /^[a-zA-Z0-9 ]*$/;
    if (value.trim() === '') {
      return 'Requested By is required';
    } else if (!regex.test(value)) {
      return 'Requested By contains invalid characters';
    } else {
      return '';
    }
  };

  const validateCreatedBy = (value: string) => {
    const regex = /^[a-zA-Z0-9 ]*$/;
    if (value.trim() === '') {
      return 'Created By is required';
    } else if (!regex.test(value)) {
      return 'Created By contains invalid characters';
    } else {
      return '';
    }
  };

  const validateDate = (value: string) => {
    const parts = value.split('-');
    const year = parts[0];

    if (year.length === 4 && value.length === 10) {
      const date = new Date(value);
      const now = new Date();
      const nextFiveYears = new Date(now.setFullYear(now.getFullYear() + 5));

      if (isNaN(date.getTime())) {
        return 'Date is invalid';
      } else if (date < new Date()) {
        return 'Date must be a future date';
      } else if (date > nextFiveYears) {
        return 'Date must be within the next 5 years';
      } else {
        return '';
      }
    } else {
      return '';
    }
  };

  const handleChange = (field: string, value: string) => {
    if (!tempReport) return;

    let error = '';
    let warning = '';

    switch (field) {
      case 'title':
        error = validateTitle(value);
        setErrors((prevState) => ({ ...prevState, titleError: error }));
        break;
      case 'target':
        error = validateTarget(value);
        setErrors((prevState) => ({ ...prevState, targetError: error }));
        break;
      case 'dueDate':
        error = validateDate(value);
        if (error === 'Date must be a future date') {
          warning = 'The due date has passed.';
          error = '';
        }
        setErrors((prevState) => ({ ...prevState, dueDateError: error }));
        setWarnings((prevState) => ({ ...prevState, dueDateWarning: warning }));
        break;
      case 'requestedBy':
        error = validateRequestedBy(value);
        setErrors((prevState) => ({ ...prevState, requestedByError: error }));
        break;
      case 'createdBy':
        error = validateCreatedBy(value);
        setErrors((prevState) => ({ ...prevState, createdByError: error }));
        break;
      case 'createdOn':
        error = validateDate(value);
        setErrors((prevState) => ({ ...prevState, createdOnError: error }));
        break;
    }

    setTempReport({
      ...tempReport,
      [field]: value,
    });
    setGlobalIsDirty(true);
    setSaveStatus({ color: 'text-gray', icon: '', message: 'Unsaved changes' });
  };

  const handleSave = (isAutoSave = false) => {
    if (!tempReport) return;

    let hasErrors = false;
    const newErrors = { ...errors };
    const newWarnings = { ...warnings };

    newErrors.titleError = validateTitle(tempReport.title ?? '');
    newErrors.targetError = validateTarget(tempReport.target ?? '');
    newErrors.requestedByError = validateRequestedBy(tempReport.requestedBy ?? '');
    newErrors.createdByError = validateCreatedBy(tempReport.createdBy ?? '');
    newErrors.createdOnError = validateDate(tempReport.createdOn ?? '');

    newErrors.dueDateError = '';

    const dueDateError = validateDate(tempReport.dueDate ?? '');
    const isWarning = dueDateError === 'Date must be a future date';
    if (isWarning) {
      newWarnings.dueDateWarning = 'Warning: The due date has passed.';
    } else {
      newWarnings.dueDateWarning = '';
    }

    setErrors(newErrors);
    setWarnings(newWarnings);

    for (const error of Object.values(newErrors)) {
      if (error) {
        hasErrors = true;
        break;
      }
    }

    if (!hasErrors || isWarning) {
      setIsSaving(true);

      updateReport(tempReport)
        .unwrap()
        .then(() => {
          setReport(tempReport);
          setSaveStatus({
            color: 'text-success',
            icon: 'check_circle',
            message: isAutoSave ? 'Autosaved' : 'Saved'
          });
          setRefresh(true);
          setIsDirty(false);
          setGlobalIsDirty(false);
          setIsSaving(false);
          setWarnings(newWarnings);

          if (report?.title !== tempReport.title) {
            const newRoute = `/reports/${toUrlFriendly(tempReport.title)}/summary`;
            navigate(newRoute, { replace: true });
          }
        })
        .catch((error) => {
          console.error('Failed to update report', error);
          setSaveStatus({ color: 'text-error', icon: 'error', message: 'Error saving. Please try again.' });
          setIsSaving(false); // Reset the saving flag in case of error
        });
    } else {
      setSaveStatus({ color: 'text-error', icon: 'error', message: 'Not saved. Fix errors and try again.' });
    }
  };

  const handleExportReport = async () => {

    if (isLoading) {
      return;
    }

    if (error || !mainReportInfo) {
      return;
    }

    await jsFileDump(mainReportInfo, filteredSources);
  };

  useEffect(() => {
    if (reportSelected) {
      
      setReport(reportSelected);
      setTempReport(reportSelected);
  
      setErrors({
        titleError: '',
        targetError: '',
        dueDateError: '',
        requestedByError: '',
        createdByError: '',
        createdOnError: '',
      });
      setWarnings({
        dueDateWarning: '',
      });
  
      if (reportSelected.dueDate && new Date(reportSelected.dueDate) < new Date()) {
        setWarnings({
          dueDateWarning: 'The due date has passed.'
        });
      }
  
      if (allResults && reportSelected.sourceList) {
  
        const filteredResults: { [key: number]: Result[] } = {};
        for (const result of allResults) {
          if (reportSelected.sourceList.includes(result.derivedFromSourceId as any)) {
            console.log(`Matching result found for sourceId: ${result.derivedFromSourceId}`);
            if (!filteredResults[result.derivedFromSourceId]) {
              filteredResults[result.derivedFromSourceId] = [];
            }
            filteredResults[result.derivedFromSourceId].push(result);
          }
        }
        setResults(filteredResults);
      }
    }
  }, [reportSelected, allResults]);
  
  // If the report is not yet fetched, show a loading state
  if (!report) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading report: {error.status} - {error.data?.message || 'Internal Server Error'}</div>;
  }

  return (
    <>
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex-col"><h2 className="text-2xl mr-3">Summary</h2></div>
        <div className="flex-col grow">
          <div className="flex flex-row-reverse">
            <div className="flex space-x-3">
              <div className="flex items-center">
                <div className={`flex items-center mr-3 ${saveStatus.color}`}>
                  <span className="material-icons scale-75">{saveStatus.icon}</span><span>{saveStatus.message}</span>
                </div>
                <ButtonBasic
                  label="Save"
                  color={'btn-primary'}
                  buttonSize="btn-sm"
                  onClick={() => handleSave(false)} // Manual save
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 flex flex-col w-full gap-4">
        <CardStatusNested title={'Basic Info'} type="normal">
          <CardContent customPadding="">
            <div className="h-100 grid md:grid-cols-2 gap-4 md:gap-x-10">
              <FormElementTextInput
                label="Report Name"
                value={tempReport?.title ?? ''}
                onChange={(e) => handleChange('title', e.target.value)}
                isInvalid={!!errors.titleError}
                errorMessage={errors.titleError}
              />
              <FormElementTextInput
                label="Target"
                value={tempReport?.target ?? ''}
                onChange={(e) => handleChange('target', e.target.value)}
                isInvalid={!!errors.targetError}
                errorMessage={errors.targetError}
              />
              <FormElementDateInput
                label="Due Date"
                value={tempReport?.dueDate ?? ''}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                isInvalid={!!errors.dueDateError && !warnings.dueDateWarning}
                isWarning={!!warnings.dueDateWarning}
                errorMessage={errors.dueDateError || warnings.dueDateWarning}
              />
              <FormElementTextInput
                label="Requested By"
                value={tempReport?.requestedBy ?? ''}
                onChange={(e) => handleChange('requestedBy', e.target.value)}
                isInvalid={!!errors.requestedByError}
                errorMessage={errors.requestedByError}
              />
              <FormElementTextInput
                label="Created By"
                value={tempReport?.createdBy ?? ''}
                onChange={(e) => handleChange('createdBy', e.target.value)}
                isInvalid={!!errors.createdByError}
                errorMessage={errors.createdByError}
                icon={'lock'}
                readOnly={true}
              />
              <FormElementTextInput
                label="Created On"
                value={tempReport?.createdOn ? isoToMMDDYYYY(tempReport.createdOn) : ''}
                onChange={(e) => handleChange('createdOn', e.target.value)}
                isInvalid={!!errors.createdOnError}
                errorMessage={errors.createdOnError}
                icon={'lock'}
                readOnly={true}
              />
            </div>
          </CardContent>
        </CardStatusNested>
      </div>
    </>
  );
};

export default ViewReportSummary;
