import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementTextArea from './formElements/FormElementTextArea';
import ButtonBasic from '../elements/ButtonBasic';
import ButtonIcon from "../elements/ButtonIcon";
import CardContent from '../cards/CardContent';
import { useSubmitSourceMutation, useAddSourceToReportMutation } from '../../../app/services/client';
import { useAppDispatch, useAppSelector } from '../../../app/hooks/reduxTypescriptHooks';
import { appStateActions } from '../../../app/store';
import { useGetReportsQuery } from '../../../app/services/client';
import { Source } from '../../../app/types/types';
import { useDispatch } from 'react-redux';
import { setLoading, setSourceId } from '../../../app/store/sourceIdReduxSlice';
import { RootState } from '../../../app/store';
import ButtonFunctionGroup from '../../components/elements/ButtonFunctionGroup.tsx';
import FormElementSelect from '../../components/forms/formElements/FormElementSelect';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  articleData?: any;
};

export interface FormAddRssSourceHandles {
  saveNewSource: () => void;
  resetForm: () => void;
}

const FormAddRssSource = forwardRef<FormAddRssSourceHandles, Props>(({ onClose, showFormButtons = true, articleData }, ref) => {
  const pubDate = articleData?.pubDate ? articleData.pubDate.match(/\b\d{4}\b/)?.[0] : '';
  const { data: storeReportsList = [] } = useGetReportsQuery();
  const [submitSource] = useSubmitSourceMutation();
  const [submitSourceToReport] = useAddSourceToReportMutation();
  const dispatch = useDispatch();
  
  // Get current report ID from Redux state
  const currentReportId = useAppSelector((state: RootState) => state.reportId.reportId);
  
  // Auto-select current report if available, otherwise undefined
  const [reportId, setReportId] = useState<number | undefined>(
    currentReportId ? parseInt(currentReportId.toString()) : undefined
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // New state for error message

  // Source Info
  const [inputType, setInputType] = useState<'file' | 'url' | 'text' | null>(null);
  const [title, setTitle] = useState(articleData?.title || '');
  const [url, setUrl] = useState(articleData?.url||articleData?.link ||'');
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState('');

  // Bibliography Info
  const [authorFirst, setAuthorFirst] = useState('');
  const [authorLast, setAuthorLast] = useState('');
  const [year, setYear] = useState(pubDate || '');
  const [publishTitle, setPublishTitle] = useState(articleData?.title || '');
  const [placement, setPlacement] = useState('');
  const [city, setCity] = useState('');
  const [publisher, setPublisher] = useState('');

  const [activeView, setActiveView] = useState<string>('Source');

  const actions = [
    { label: 'Source', onClick: () => setActiveView('Source') },
    { label: 'Bibliography', onClick: () => setActiveView('Bibliography') },
  ];

  // Update reportId when currentReportId changes
  useEffect(() => {
    if (currentReportId) {
      setReportId(parseInt(currentReportId.toString()));
    }
  }, [currentReportId]);

  useImperativeHandle(ref, () => ({
    saveNewSource() {
      handleAddNewSource();
    },
    resetForm() {
      resetForm();
    }
  }));

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleAuthorFirstChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAuthorFirst(event.target.value);
  };

  const handleAuthorLastChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAuthorLast(event.target.value);
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setYear(event.target.value);
  };

  const handlePublishTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPublishTitle(event.target.value);
  };

  const handlePlacementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPlacement(event.target.value);
  };

  const handleCityChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCity(event.target.value);
  };

  const handlePublisherChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPublisher(event.target.value);
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = parseInt(event.target.value, 10);
    setReportId(selectedValue);
  };

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setUrl('');
    setSourceText('');
    setAuthorFirst('');
    setAuthorLast('');
    setYear('');
    setPublishTitle('');
    setPlacement('');
    setCity('');
    setPublisher('');
    setActiveView('Source');
    setInputType(null);
    setReportId(currentReportId ? parseInt(currentReportId.toString()) : undefined); // Reset to current report if available
    setErrorMessage(null); // Reset error message
  };

  const addName = (event: any) => {
    // Add additional author logic
  };

  const handleAddNewSource = async () => {
    dispatch(setLoading(true));
    let data: { title: string; file?: File; url?: string; sourceText?: string } = { title };

    data.url = url;

    const newSource: Source = {
      id: Date.now(),
      title: data.title,
      sourceText: data.sourceText || null,
      url: data.url || null,
      file: data.file || null,
      processed: 0,
      createdOn: new Date().toISOString(),
      actions: [],
      data: {
        sourceText: data.sourceText || '',
        annotations: [],
      },
      // bibliography
      authorFirst: authorFirst,
      authorLast: authorLast,
      year: year,
      publishedTitle: publishTitle,
      placement: placement,
      city: city,
      publisher: publisher,
      enabled: true,
    };

    // Validate report selected, return early if no report is found
    if (!reportId) {
      console.error('Error: No report selected');
      const errorMsg = currentReportId 
        ? 'Please select a report from the dropdown.' 
        : 'No report selected. Please create a report first or select one from the dropdown.';
      setErrorMessage(errorMsg);
      dispatch(setLoading(false));
      return;
    }

    try {
      await submitSource({ outboundSource: newSource, reportId: reportId.toString() }).unwrap();

      const reportAndSourceIds = { reportId: reportId, sourceId: newSource.id };
      await submitSourceToReport(reportAndSourceIds).unwrap();

      resetForm();
      if (onClose) onClose();
    } catch (err) {
      console.error('Error submitting source:', err);
    } finally {
      setTimeout(() => {
        dispatch(setSourceId(newSource.id));
      }, 1000); // 1 sec delay
    }

    dispatch(setLoading(false));
    resetForm();
    if (onClose) onClose();
  };

  const options = storeReportsList.map(report => ({ label: report.title, value: report.id }));

  return (
    <CardContent customPadding="p-10 mt-10">
      <h2 className="mb-2">Select the Report where this Source will be added</h2>
      <FormElementSelect
        label={'Select Report'}
        labelClassName={'sr-only'}
        className={'mb-4'}
        options={options}
        selectSize="select-sm"
        placeholder="Select Report"
        value={reportId}
        onChange={handleSelectChange}
      />
      {errorMessage && <div className="text-red-500 mb-4">{errorMessage}</div>} {/* Display error message */}
      <div className="mb-7">
        <ButtonFunctionGroup actions={actions} buttonSize="btn-sm" />
      </div>
      {activeView === 'Source' && (
        <>
          <div className="mb-8 flex flex-col">
            <FormElementTextInput
              label="Source Title"
              value={title}
              onChange={handleTitleChange}
              className="flex-grow "
            />
          </div>
          <div className="mt-4 flex flex-col space-y-2">
            <FormElementTextInput
              label="Article URL"
              value={url}
              onChange={handleUrlChange}
              className="flex-grow "
            />
          </div>
        </>
      )}
      {activeView === 'Bibliography' && (
        <>
          <h3 className="mb-4">Author and Publishing Information</h3>
          <div className="flex flex-row content-center pt-3 pb-3 mb-3">
            <div className="basis-auto">
              <FormElementTextInput
                label="First Name"
                value={authorFirst}
                onChange={handleAuthorFirstChange}
                className="input-sm mt-2"
              />
            </div>
            <div className="basis-auto">
              <FormElementTextInput
                label="Last Name"
                value={authorLast}
                onChange={handleAuthorLastChange}
                className="input-sm mt-2"
              />
            </div>
          <div className="add-form-row-btn">
            <ButtonIcon label="Add Additional Author" buttonIcon="add" color="btn-ghost" onClick={addName} />
          </div>
        </div>
      
        <div className="mt-5 mb-5 flex flex-row content-center">
          <div className="basis-auto">
            <FormElementTextInput
              label="Title"
              value={publishTitle}
              onChange={handlePublishTitleChange}
              className="input-sm" />
          </div>
          <div className="basis-auto">
            <FormElementTextInput
              label="Publication"
              value={placement}
              onChange={handlePlacementChange }
              className="input-sm" />
          </div>
        </div>
   
        <div className="mt-5 mb-5 flex flex-row content-center">
        <div className="basis-auto">
            <FormElementTextInput
              label="Publisher"
              value={publisher}
              onChange={handlePublisherChange}
              className="input-sm" />
          </div>
          <div className="basis-auto">
            <FormElementTextInput
              placeholder="yyyy"
              label="Year"
              value={year}
              onChange={handleYearChange}
              className="input-sm" />
          </div>
        </div>
        </>
      )}
      {showFormButtons && (
              <div className="flex justify-end space-x-2">
                <ButtonBasic label="Cancel" color="btn-secondary" 
                  onClick={() => {
                    if(onClose) {
                      onClose()
                      resetForm()
                    }
                  }}
                />
                <ButtonBasic label="Save" color="btn-primary" onClick={handleAddNewSource} />
              </div>
      )}
    </CardContent>
  );
});

export default FormAddRssSource;
