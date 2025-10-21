import React, { useState, forwardRef, useImperativeHandle } from 'react';
import ButtonBasic from '../elements/ButtonBasic';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementDateInput from './formElements/FormElementDateInput';
import { AppReport } from '../../../app/types/types';
import { useSubmitReportMutation, useGetReportsQuery, useGetUserEmailFromJwtQuery } from '../../../app/services/client';
import CardContent from '../cards/CardContent';
import { useNavigate } from 'react-router-dom';
import { toUrlFriendly } from '../../../app/utils/urlHelpers.ts';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  onSave?: () => void;
};

export interface FormAddNewReportHandles {
  saveNewReport: () => Promise<boolean>;
}

const FormAddNewReport = forwardRef<FormAddNewReportHandles, Props>(({ onClose, showFormButtons = true, onSave }, ref) => {
  const { data: user, error: userError, isLoading: userIsLoading } = useGetUserEmailFromJwtQuery(undefined, {});
  const [submitReport, { isLoading, error }] = useSubmitReportMutation();
  const { data: existingReports = [] } = useGetReportsQuery();
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [titleError, setTitleError] = useState('');
  const [targetError, setTargetError] = useState('');
  const [requestedByError, setRequestedByError] = useState('');
  const [dueDateError, setDueDateError] = useState('');
  const [yearKeyStrokes, setYearKeyStrokes] = useState(0);

  const navigate = useNavigate();

  useImperativeHandle(ref, () => ({
    saveNewReport() {
      return handleSaveNewReport();
    }
  }));

  const validateTitle = (value: string) => {
    const regex = /^[a-zA-Z0-9 :,-]*$/;
    if (value.trim() === '') {
      setTitleError('Title is required');
    } else if (!regex.test(value)) {
      setTitleError('Title contains invalid characters');
    } else if (existingReports.some(report => report.title.toLowerCase() === value.toLowerCase())) {
      setTitleError('Title already exists');
    } else {
      setTitleError('');
    }
  };

  const validateTarget = (value: string) => {
    const regex = /^[a-zA-Z0-9 ]*$/;
    if (value.trim() === '') {
      setTargetError('Target is required');
    } else if (!regex.test(value)) {
      setTargetError('Target contains invalid characters');
    } else {
      setTargetError('');
    }
  };

  const validateRequestedBy = (value: string) => {
    const regex = /^[a-zA-Z0-9 ]*$/;
    if (value.trim() === '') {
      setRequestedByError('Requested By is required');
    } else if (!regex.test(value)) {
      setRequestedByError('Requested By contains invalid characters');
    } else {
      setRequestedByError('');
    }
  };

  const validateDueDate = (value: string) => {
    const parts = value.split('-');

    if (yearKeyStrokes === 4 && value.length === 10) {
      const date = new Date(value);
      const now = new Date();
      const nextFiveYears = new Date(now.setFullYear(now.getFullYear() + 5));

      if (isNaN(date.getTime())) {
        setDueDateError('Due Date is invalid');
      } else if (date < new Date()) {
        setDueDateError('Due Date must be a future date');
      } else if (date > nextFiveYears) {
        setDueDateError('Due Date must be within the next 5 years');
      } else {
        setDueDateError('');
      }
    } else {
      setDueDateError('');
    }
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTitle(value);
    validateTitle(value);
  };

  const handleTargetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setTarget(value);
    validateTarget(value);
  };

  const handleRequestedByChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setRequestedBy(value);
    validateRequestedBy(value);
  };

  const handleDueDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDueDate(value);

    const parts = value.split('-');
    const year = parts[0];

    if (year.length <= 4) {
      setYearKeyStrokes(year.length);
    }

    validateDueDate(value);
  };

  const isFormValid = () => {
    return titleError === '' && targetError === '' && requestedByError === '' && dueDateError === '' && title !== '' && target !== '' && requestedBy !== '' && dueDate !== '';
  };

  const handleSaveNewReport = async (): Promise<boolean> => {
    validateTitle(title);
    validateTarget(target);
    validateRequestedBy(requestedBy);
    validateDueDate(dueDate);

    if (isFormValid()) {
      const newReport: AppReport = {
        id: Date.now(),
        title,
        target,
        requestedBy,
        dueDate,
        createdBy: user.email,
        userName: user.email,
        createdOn: new Date().toISOString(),
        sourceList: [],
        progressChecklist: [], // Adding the default checklist
        user: undefined, // Assuming you will set this appropriately elsewhere
        text: [],
        currentTextVersionId: 0,
        comments: '',
        settings: {
          nerUri: '',
          llmUri: '',
          useRemoteNer: false,
          useRemoteLlm: false
        }
      };

      try {
        await submitReport(newReport).unwrap();
        setTitle('');
        setTarget('');
        setRequestedBy('');
        setDueDate('');
        setYearKeyStrokes(0);
        navigate(`/reports/${toUrlFriendly(newReport.title)}`);
        return true;
      } catch (err) {
        console.error('Failed to create the report:', err);
        return false;
      }
    } else {
      console.log('Form is not valid, preventing submission.');
      return false;
    }
  };

  return (
    <CardContent customPadding="p-10 mt-10">
      <div className="w-full">
        <div className="flex flex-col gap-5">
          <FormElementTextInput
            label="Report Name"
            value={title}
            onChange={handleTitleChange}
            isInvalid={!!titleError}
            errorMessage={titleError}
          />
          <FormElementTextInput
            label="Target"
            value={target}
            onChange={handleTargetChange}
            isInvalid={!!targetError}
            errorMessage={targetError}
          />
          <FormElementTextInput
            label="Requested By"
            value={requestedBy}
            onChange={handleRequestedByChange}
            isInvalid={!!requestedByError}
            errorMessage={requestedByError}
          />
          <FormElementDateInput
            label="Due Date"
            value={dueDate}
            onChange={handleDueDateChange}
            isInvalid={!!dueDateError}
            errorMessage={dueDateError}
          />
          {showFormButtons && (
            <div className="flex space-x-4">
              <ButtonBasic
                label={'Cancel'}
                onClick={onClose}
                color={'btn-secondary'}
              />
              <ButtonBasic
                label={'Create'}
                onClick={async () => {
                  const isFormSubmitted = await handleSaveNewReport();
                  if (isFormSubmitted && onClose) onClose();
                }}
                color={'btn-primary'}
              />
            </div>
          )}
        </div>
      </div>
    </CardContent>
  );
});

export default FormAddNewReport;
