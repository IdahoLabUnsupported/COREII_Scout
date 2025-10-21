// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, useEffect } from 'react';
import { 
  useGetReportQuery, 
  useUpdateReportMutation, 
  useUpdateReportSettingsMutation, 
  useDeleteReportMutation, 
  useGetResultsQuery,
  useGetKeyQuery,
  useSaveKeyMutation,
} from '../../app/services/client';
import { useOutletContext, useNavigate } from 'react-router-dom';
import CardContent from '../components/cards/CardContent';
import CardStatusNested from '../components/cards/CardStatusNested';
import FormElementSelect from '../components/forms/formElements/FormElementSelect';
import FormElementTextArea from '../components/forms/formElements/FormElementTextArea.tsx';
import ButtonBasic from '../components/elements/ButtonBasic';
import { toUrlFriendly } from '../../app/utils/urlHelpers.ts';
import { useDirtyContext } from '../contexts/DirtyContext';
import { jsFileDump } from '../../app/utils/jsFileDump.ts';
import useReport from '../../app/hooks/useReport';
import { AppReport, Result, UserRole } from '../../app/types/types';
import TableUserList from '../components/elements/tables/TableUserList.tsx';
import { useGetUsersQuery } from '../../app/services/client';
import { User } from '../../app/types/types';

const ViewReportSettings: React.FC = () => {
  const { reportSelected, setRefresh, setIsDirty: setGlobalIsDirty } = useOutletContext<{
    reportSelected: AppReport,
    setRefresh: (value: boolean) => void,
    setIsDirty: (value: boolean) => void
  }>();
  const { data: allResults } = useGetResultsQuery();

  const navigate = useNavigate();
  const [updateReport] = useUpdateReportMutation();
  const [deleteReport] = useDeleteReportMutation();
  const [updateReportSettings] = useUpdateReportSettingsMutation();
  const [saveKey] = useSaveKeyMutation();
  const reportId = reportSelected?.id?.toString();
  const { data: updatedReport, refetch } = useGetReportQuery(reportId, {
    skip: !reportId,
  });

  const [report, setReport] = useState<AppReport | null>(null);
  const [tempReport, setTempReport] = useState<AppReport | null>(null);
  const { isDirty, setIsDirty } = useDirtyContext();
  const [saveStatus, setSaveStatus] = useState<{ color: string, icon: string, message: string }>({ color: '', icon: '', message: '' });
  const [results, setResults] = useState<{ [key: number]: Result[] }>({});
  const [selectedLlmModel, setSelectedLlmModel] = useState<string>('');
  const [selectedNerModel, setSelectedNerModel] = useState<string>('');

  const [llmSystemPrompt, setLlmSystemPrompt] = useState('');
  const [llmUserPrompt, setLlmUserPrompt] = useState('');

  const { data: retrievedKeyObject, isLoading: isRetrievingKey } = useGetKeyQuery(undefined, {});
  const [apiKey, setApiKey] = useState('');

  const { mainReportInfo, filteredSources, isLoading, error } = useReport(reportSelected.id.toString());

  const [users, setUsers] = useState<User[]>([]);

  const { data: retrievedUsers, isError, } = useGetUsersQuery(undefined);

  useEffect(() => {
    if (updatedReport) {
      setSelectedLlmModel(updatedReport.settings?.llmUri || '');
      setSelectedNerModel(updatedReport.settings?.nerUri || '');
      setLlmSystemPrompt(updatedReport.llmSystemPrompt || '');
      setLlmUserPrompt(updatedReport.llmUserPrompt || '');
    }
  }, [updatedReport]);

  useEffect(() => {
    if (retrievedKeyObject && retrievedKeyObject.key) {
      setApiKey(retrievedKeyObject.key);
    }
  }, [retrievedKeyObject]);

  useEffect(() => {
    if (retrievedUsers) {
      setUsers(retrievedUsers);
    }
  }, [retrievedUsers]);

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

  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirty) {
        handleSave(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [tempReport, isDirty]);

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
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
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
      case 'systemPrompt':
        setLlmSystemPrompt(value);
        break;
      case 'userPrompt':
        setLlmUserPrompt(value);
        break;
    }

    setTempReport({
      ...tempReport,
      [field]: value,
    });
    setGlobalIsDirty(true);
    setSaveStatus({ color: 'text-gray', icon: '', message: 'Unsaved changes' });
  };

  const handleSaveKey = async () => {

    try {
      await saveKey({ key: apiKey }).unwrap();
    } catch (error) {
      console.error('Error saving API key:', error);
    }
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
        console.log(error)
        hasErrors = true;
        break;
      }
    }

    const updatedTempReport = { ...tempReport, llmSystemPrompt, llmUserPrompt };

    if (!hasErrors || isWarning) {
      updateReport(updatedTempReport)
        .unwrap()
        .then(() => {
          setReport(updatedTempReport);
          setSaveStatus({
            color: 'text-success',
            icon: 'check_circle',
            message: isAutoSave ? 'Autosaved' : 'Saved'
          });
          setRefresh(true);
          setIsDirty(false);
          setGlobalIsDirty(false);
          setWarnings(newWarnings);

          handleSaveKey(); // call key saver within save to share an exception block

          if (report?.title !== updatedTempReport.title) {
            const newRoute = `/reports/${toUrlFriendly(updatedTempReport.title)}/summary`;
            navigate(newRoute, { replace: true });
          }
          refetch();
        })
        .catch((error) => {
          setSaveStatus({ color: 'text-error', icon: 'error', message: 'Error saving. Please try again.' });
        });
    } else {
      setSaveStatus({ color: 'text-error', icon: 'error', message: 'Not saved. Fix errors and try again.' });
    }
  };

  const handleDeleteReport = () => {
    if (!reportSelected || !reportSelected.id) {
      return;
    }

    deleteReport(reportSelected.id)
      .unwrap()
      .then(() => {
        setRefresh(true);
        navigate('/', { replace: true });
      })
      .catch((error) => {
      });
  };

  const handleReset = async () => {
    setLlmSystemPrompt(defaultSystemPrompt);
    setLlmUserPrompt(defaultUserPrompt);
  }

  const handleExportReport = async () => {

    if (isLoading) {
      return;
    }

    if (error || !mainReportInfo) {
      return;
    }

    await jsFileDump(mainReportInfo, filteredSources);
  };

  const handleUserSelect = (user: UserRole) => {};

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

  const handleLlmModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedLlmModel(value);

    const llmUri = value;
    if (report) {
      await updateReportSettings({
        id: report.id.toString(),
        settings: {
          ...report.settings,
          llmUri,
          nerUri: report.settings?.nerUri ?? 'Remote',
          useRemoteNer: report.settings?.useRemoteNer ?? false,
          useRemoteLlm: report.settings?.useRemoteLlm ?? false
        }
      });
      refetch();
    }
  };

  const handleNerModelChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedNerModel(value);

    const nerUri = value;
    if (report) {
      await updateReportSettings({
        id: report.id.toString(),
        settings: {
          ...report.settings,
          nerUri,
          llmUri: report.settings?.llmUri ?? 'facebook/bart-large-cnn',
          useRemoteNer: report.settings?.useRemoteNer ?? false,
          useRemoteLlm: report.settings?.useRemoteLlm ?? false
        }
      });
    }
  };

  if (!report) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading report: {error.status} - {error.data?.message || 'Internal Server Error'}</div>;
  }

  return (
    <>
      <div className="flex flex-row bg-gray-200 dark:bg-gray-700 px-10 py-5">
        <div className="flex-col"><h2 className="text-2xl mr-3">Settings</h2></div>
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

      <div className="p-6 flex-col w-full grid gap-4">
        {/* Users */}
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Users'} type="normal" className="flex">
              <div className="mb-4 mr-4 flex absolute right-1 top-3 ">
                <ButtonBasic
                  label="Add User"
                  color={'btn-primary'}
                  buttonSize="btn-sm"
                />
              </div>
              <CardContent customPadding='p-0' customClass={`min-h-[50px]`}>
                <TableUserList
                  reportSelected={reportSelected}
                  onUserSelect={handleUserSelect}
                  users={users}
                />
              </CardContent>
            </CardStatusNested>
          </div>
        </div>
        {/* Models */}
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Models & Prompt Engineering'} type="normal">
              <CardContent customPadding='p-4' customClass={`min-h-[50px]`}>
                <div className="mb-4 mr-4 flex absolute right-1 top-3 ">
                  <ButtonBasic
                    label="Reset to Default"
                    color={'btn-secondary'}
                    buttonSize="btn-sm"
                    onClick={handleReset}
                  />
                </div>
                <h3 className="mb-8 text-xl">Dissemination</h3>
                <div className="mt-2 w-full">
                  <div className="flex items-start w-full">
                    <div className="flex-1 mr-4">
                      <FormElementSelect
                        label={'LLM'}
                        options={[
                          { label: "mistralai/Mistral-Nemo-Instruct-2407", value: "mistralai/Mistral-Nemo-Instruct-2407" },
                          { label: "facebook/bart-large-cnn", value: "facebook/bart-large-cnn" }
                        ]}
                        labelClassName={'mr-8'}
                        value={selectedLlmModel}
                        onChange={handleLlmModelChange}
                      />
                    </div>
                    {selectedLlmModel === "mistralai/Mistral-Nemo-Instruct-2407" && (
                      <div className="ml-8">
                        <FormElementTextArea
                          label="API Key"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          isInvalid={false}
                          errorMessage=""
                          maxHeight='35px'
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-8">
                  <div className="...">
                    <FormElementTextArea
                      label="System Prompt"
                      value={llmSystemPrompt}
                      onChange={(e) => handleChange('systemPrompt', e.target.value)}
                      isInvalid={false}
                      errorMessage=""
                    />
                  </div>
                  <div className="...">
                    <FormElementTextArea
                      label="User Prompt"
                      value={llmUserPrompt}
                      onChange={(e) => handleChange('userPrompt', e.target.value)}
                      isInvalid={false}
                      errorMessage=""
                    />
                  </div>
                </div>
              </CardContent>
              <CardContent customPadding='p-4' customClass={`min-h-[50px] mt-4`}>
                <h3 className="mb-8 text-xl">Collection/Processing</h3>
                <div className="mt-2 w-80">
                  <FormElementSelect
                    label={'NER'}
                    options={[
                      { label: "Local", value: "Local" },
                      { label: "Remote", value: "Remote" }
                    ]}
                    labelClassName={'mr-8'}
                    value={selectedNerModel}
                    onChange={handleNerModelChange}
                  />
                </div>
              </CardContent>
            </CardStatusNested>
          </div>
        </div>
        {/* Danger Zone */}
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1">
            <CardStatusNested title={'Danger Zone'} type="normal">
              <CardContent customClass="min-h-3">
                <div className="h-100 grid md:grid-cols-2 gap-4 md:gap-x-10">
                  <div className="flex flex-col space-y-2">
                    <h3 className='text-xl'>Export</h3>
                    <p className="text-white">Exporting this report will create a ZIP file with all related assets for download.</p>
                    <div className='pt-3'>
                      <ButtonBasic
                        label="Export Report"
                        color={'btn-primary'}
                        onClick={() => { handleExportReport() }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    <h3 className='text-xl'>Delete</h3>
                    <p className="text-white">Deleting this report is irreversible. Please proceed with caution.</p>
                    <div className='pt-3'>
                      <ButtonBasic
                        label="Delete Report"
                        color={'btn-error'}
                        onClick={() => { handleDeleteReport() }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </CardStatusNested>
          </div>
        </div>
      </div>
    </>
  );
}

export default ViewReportSettings;

const defaultSystemPrompt: string = `You are a cybersecurity AI assistant that helps people find answers to their
      questions. Your users are cyber security analysts for Idaho National Laboratory. 
      You are polite, but give direct answers and do not repeat the question. You will often be provided
      with additional information for use in answering your questions. Use this information as much as 
      possible to respond to the user.`;

const defaultUserPrompt: string = `I will provide to you first an optional comments field including analyst comments 
      pertaining to the subsequent objects that will also be sent in. These objects are a number of news like
      articles ranging from 1 or more with each article also having an optional bibliography. This will be in 
      an array where the comments, if they exist, will come first, then the rest will be articles and their 
      optional bibliography which may or may not be complete will follow. Could you go through all the articles
      and give a brief report which takes the report comments and optionally the article bibliography into 
      consideration? This report should just be a long text string in paragraph format. 
      Do not repeat this question. 
      Based on your own knowledge, and the articles provided: Write a recommendation report.
      This should be no more than: 1000 words long. 
      Written in the tone of: Cybersecurity Analyst. 
      Written by: Prompt muse. 
      Target Demographic is: 50-60 year old, cybersecurity executives.
      The article should flow well, start with a catchy introduction/hook, and end in a compelling, and 
      thought-provoking conclusion/outro, and contain mitigations to issues.
      Add a couple of sub-headings, but ONLY where appropriate - not too many. 
      Try to be unbiased and view different perspectives. 
      Create a catchy headline/title which would intrigue the reader.
      Given known cybersecurity keywords, add as many cluster Keywords around cybersecurity keywords, as 
      you can within the article, and use a variety of Synonyms where applicable.
      Areas to cover: Impact, Mitigations, Exposure, References
      ADD a DISCLAIMER that this report was written by a AI Language model with 'INL Inside'."
      Here are the comments and articles to analyze: `;