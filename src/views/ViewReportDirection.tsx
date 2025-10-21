// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import CardContent from '../components/cards/CardContent.tsx';
import CardStatusNested from '../components/cards/CardStatusNested.tsx';
import FormElementTextArea from '../components/forms/formElements/FormElementTextArea.tsx';
import ButtonBasic from '../components/elements/ButtonBasic';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { AppReport } from '../../app/types/types';
import { useUpdateReportMutation } from '../../app/services/client.ts';
import { useDirtyContext } from '../contexts/DirtyContext';

const ViewReportDirection: React.FC = () => {
  const { reportSelected, setRefresh, setIsDirty: setGlobalIsDirty } = useOutletContext<{ 
    reportSelected: AppReport, 
    setRefresh: (value: boolean) => void,
    setIsDirty: (value: boolean) => void
  }>();
  
  const navigate = useNavigate();
  const [report, setReport] = useState<AppReport | null>(null);
  const [tempReport, setTempReport] = useState<AppReport | null>(null);
  const { isDirty, setIsDirty } = useDirtyContext();
  const [updateReport] = useUpdateReportMutation();
  const [saveStatus, setSaveStatus] = useState<{ color: string, icon: string, message: string }>({ color: '', icon: '', message: '' });

  useEffect(() => {
    if (reportSelected) {
      setReport(reportSelected);
      setTempReport(reportSelected);
    }
  }, [reportSelected]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) {
        handleSave(true); // Auto-save
      }
    }, 30000); // Auto-save every 30 seconds if there are unsaved changes

    return () => clearInterval(interval);
  }, [tempReport, isDirty]);

  const handleChange = (field: string, value: string) => {
    if (!tempReport) return;

    const updatedReport = {
      ...tempReport,
      [field]: value,
    };
    setTempReport(updatedReport);
    setIsDirty(true); // Mark the form as dirty
    setGlobalIsDirty(true); // Mark the form as dirty in the outlet context
    setSaveStatus({ color: 'text-gray', icon: '', message: 'Unsaved changes' });

    // Log for debugging
    console.log(`Updating report field: ${field} with value: ${value}`);
  };

  const handleSave = (isAutoSave = false) => {
    if (!tempReport) return;

    updateReport(tempReport)
      .unwrap()
      .then(() => {
        setReport(tempReport); // Update the main report state
        setSaveStatus({
          color: 'text-success',
          icon: 'check_circle',
          message: isAutoSave ? 'Autosaved' : 'Saved'
        });
        setRefresh(true); // Trigger re-fetch
        setIsDirty(false); // Reset the dirty flag globally
        setGlobalIsDirty(false); // Reset the dirty flag in the outlet context
      })
      .catch((error) => {
        console.error(`Failed to update report`, error);
        setSaveStatus({ color: 'text-error', icon: 'error', message: 'Error saving. Please try again.' });
      });
  };

  // If the report is not yet fetched, show a loading state
  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex-col"><h2 className="text-2xl mr-3">Direction</h2></div>
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
      {/* Need overflow-y-scroll here */}
      <div className="p-6 flex-col w-full grid gap-4">
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Assignment Synopsis'} type="normal">
              <CardContent customPadding='p-4' customClass={`min-h-[50px]`}>
                <FormElementTextArea
                  value={tempReport?.synopsis ?? ''}
                  onChange={(e) => handleChange('synopsis', e.target.value)}
                  isInvalid={false}
                  errorMessage=""
                />
              </CardContent>
            </CardStatusNested>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Requirements'} type="normal">
              <CardContent customPadding='p-4' customClass={`min-h-[50px]`}>
                <FormElementTextArea
                  value={tempReport?.requirements ?? ''}
                  onChange={(e) => handleChange('requirements', e.target.value)}
                  isInvalid={false}
                  errorMessage=""
                />
              </CardContent>
            </CardStatusNested>
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewReportDirection;
