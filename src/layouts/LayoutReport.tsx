// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '../../app/hooks/reduxTypescriptHooks';
import { Outlet, useLocation } from 'react-router-dom';
import { RootState } from '../../app/store';
import StepperHorizontal from '../components/elements/StepperHorizontal';
import ButtonLinkGroup from '../components/elements/ButtonLinkGroup';
import { AppReport } from '../../app/types/types';
import { toUrlFriendly } from '../../app/utils/urlHelpers';
import ButtonBasic from '../components/elements/ButtonBasic';
import { useUpdateReportMutation } from '../../app/services/client';
import { setReportId } from '../../app/store/reportIdReduxSlice';
import _ from 'lodash';

interface LayoutReportProps {
  report: AppReport | null | undefined;
  setRefresh: (value: boolean) => void;
  setIsDirty: (value: boolean) => void;
}

const LayoutReport: React.FC<LayoutReportProps> = ({ report, setRefresh, setIsDirty }) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const location = useLocation();
  const [lastPathname, setLastPathname] = useState(location.pathname);
  const initialWorkflowSteps = useAppSelector((state: RootState) => state.workflow.steps);
  const dispatch = useAppDispatch();

  const [updateReport] = useUpdateReportMutation();
  const [shouldUpdateReport, setShouldUpdateReport] = useState(false);

  const projectInfo = [
    { label: 'Summary', link: 'summary' },
    { label: 'Direction', link: 'direction' },
  ];

  const [workflowSteps, setWorkflowSteps] = useState(report?.progressChecklist || initialWorkflowSteps);

  const handleStepClick = useCallback((index: number) => {
    setActiveStepIndex(index);
    setRefresh(true);
  }, [setRefresh]);

  const checkAndUpdateProgressChecklist = useCallback((report: any) => {
    const progressChecklist = JSON.parse(JSON.stringify(report.progressChecklist || []));

    initialWorkflowSteps.forEach((workflowStep) => {
      const existingStep = progressChecklist.find(
        (step: any) => step.label === workflowStep.label
      );

      if (existingStep) {
        workflowStep.tasks.forEach((task) => {
          if (!existingStep.tasks.some((t: any) => t.title === task.title)) {
            existingStep.tasks.push(task);
          }
        });
      } else {
        progressChecklist.push(workflowStep);
      }
    });

    return progressChecklist;
  }, [initialWorkflowSteps]);

  const debouncedUpdateReport = useCallback(
    _.debounce((updatedReport) => {
      updateReport(updatedReport)
        .unwrap()
        .then(() => {
          setRefresh(true);
          setShouldUpdateReport(false);
        })
        .catch((error) => {
          console.error('Error updating progress checklist:', error);
          setShouldUpdateReport(false);
        });
    }, 300), 
    [updateReport, setRefresh]
  );

  useEffect(() => {
    setRefresh(true); 
  }, [setRefresh]);

  // Set reportId in Redux when report changes - this enables report detection on ALL tabs
  useEffect(() => {
    if (report?.id) {
      dispatch(setReportId(report.id.toString()));
    }
    
    // Cleanup: clear reportId when component unmounts or report becomes null
    return () => {
      if (!report?.id) {
        dispatch(setReportId(null));
      }
    };
  }, [report?.id, dispatch]);

  useEffect(() => {
    if (location.pathname !== lastPathname) {
      setLastPathname(location.pathname); 
    }
  }, [location.pathname, lastPathname]);

  useEffect(() => {
    if (report && shouldUpdateReport) {
      const updatedProgressChecklist = checkAndUpdateProgressChecklist(report);

      const updatedReport = {
        ...report,
        progressChecklist: updatedProgressChecklist,
      };

      debouncedUpdateReport(updatedReport);
    }
  }, [report, debouncedUpdateReport, checkAndUpdateProgressChecklist, shouldUpdateReport]);

  useEffect(() => {
    if (report) {
      const updatedProgressChecklist = checkAndUpdateProgressChecklist(report);
      const hasChanges = JSON.stringify(updatedProgressChecklist) !== JSON.stringify(report.progressChecklist);

      if (hasChanges) {
        setShouldUpdateReport(true);
      }
    }
  }, [report, checkAndUpdateProgressChecklist]);

  useEffect(() => {
    if (report?.progressChecklist) {
      setWorkflowSteps(report.progressChecklist);
    }
  }, [report]);

  const handleTaskToggle = (stepIndex: number, taskIndex: number) => {
    const updatedSteps = JSON.parse(JSON.stringify(workflowSteps));
    const task = updatedSteps[stepIndex].tasks[taskIndex];
    task.isCompleted = !task.isCompleted;

    const updatedReport = {
      ...report,
      progressChecklist: updatedSteps,
    };

    updateReport(updatedReport)
      .unwrap()
      .then(() => {
        setWorkflowSteps(updatedSteps);
        setRefresh(true);
      })
      .catch((error) => {
        console.error('Error updating task:', error);
      });
  };

  if (!report) {
    return <div>Loading...</div>; 
  }

  const baseRoute = `/reports/${toUrlFriendly(report.title)}`;
  const thisLocation = location.pathname;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex justify-between p-10 bg-gray-300 dark:bg-gray-925">
        <h1 className="text-3xl">{report.title}</h1>
        <StepperHorizontal
          steps={workflowSteps}
          activeStepIndex={activeStepIndex}
          handleStepClick={handleStepClick}
          onTaskToggle={handleTaskToggle}
        />
      </div>
      <div className="flex flex-row px-10 py-2 justify-between bg-gray-300 dark:bg-gray-800">
        <div className="flex space-x-2">
          <ButtonLinkGroup baseRoute={baseRoute} actions={projectInfo} buttonSize="btn-md" />
          <ButtonLinkGroup baseRoute={baseRoute} actions={workflowSteps} buttonSize="btn-md" stepper={true} />
        </div>
        <div>
          <ButtonBasic
            label="Settings"
            color="btn-secondary"
            link="settings"
            additionalClasses={`${thisLocation.includes('/settings') ? 'bg-primary text-white hover:bg-primary hover:brightness-90' : ''}`}
          />
        </div>        
        {thisLocation.includes('/summary') || thisLocation.includes('/direction') || thisLocation.includes('/settings') ? (
          ''
        ) : (
          <div className="flex-col grow">
            <div className="flex flex-row-reverse mt-2">
              <div className="flex space-x-3">
                {thisLocation.includes('/collection-processing') || thisLocation.includes('/analysis') ? (
                  <div>
                    <ButtonBasic label="SAVE VERSION" color={'btn-primary'} buttonSize="btn-sm" />
                  </div>
                ) : (
                  <div>
                    <ButtonBasic label="DISSEMINATE" color={'btn-primary'} buttonSize="btn-sm" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-grow overflow-auto">
        <Outlet
          context={{ reportSelected: report, setRefresh, setIsDirty }}
        />
      </div>
    </div>
  );
};

export default LayoutReport;

