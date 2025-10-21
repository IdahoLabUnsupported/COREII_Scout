import React, { useState, forwardRef, useImperativeHandle } from 'react';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementFileInput from './formElements/FormElementFileInput';
import FormElementTextArea from './formElements/FormElementTextArea';
import ButtonBasic from '../elements/ButtonBasic';
import ButtonIcon from "../elements/ButtonIcon";
import CardContent from '../cards/CardContent';
import { useSubmitSourceMutation, useAddSourceToReportMutation } from '../../../app/services/client';
import { Source, AppReport } from '../../../app/types/types';
import { useOutletContext } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setLoading, setSourceId } from '../../../app/store/sourceIdReduxSlice';
import ButtonFunctionGroup from '../../components/elements/ButtonFunctionGroup.tsx';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
};

export interface FormAddSourceHandles {
  saveNewSource: () => void;
  resetForm: () => void;
}

const FormAddSource = forwardRef<FormAddSourceHandles, Props>(({ onClose, showFormButtons = true }, ref) => {
  const { reportSelected } = useOutletContext<{ reportSelected: AppReport }>();
  const [submitSource] = useSubmitSourceMutation();
  const [submitSourceToReport] = useAddSourceToReportMutation();
  const dispatch = useDispatch();

  //Source Info
  const [inputType, setInputType] = useState<'file' | 'url' | 'text' | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [sourceText, setSourceText] = useState('');

  //Bibliography Info
  const [authorFirst, setAuthorFirst] = useState('');
  const [authorLast, setAuthorLast] = useState('');
  const [year, setYear] = useState('');
  const [publishTitle, setPublishTitle] = useState('');
  const [placement, setPlacement] = useState('');
  const [city, setCity] = useState('');
  const [publisher, setPublisher] = useState('');

  const [activeView, setActiveView] = useState<string>('Source');

  
  const actions = [
    { label: 'Source', onClick: () => setActiveView('Source') },
    { label: 'Bibliography', onClick: () => setActiveView('Bibliography') },
  ];
 
  useImperativeHandle(ref, () => ({
    saveNewSource() {
      handleAddNewSource();
    },
    resetForm() {
      resetForm();
    }
  }));

  const handleFileChange = (file: File) => {
    setFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
        const file = droppedFiles[0];
        setInputType('file')
        handleFileChange(file); 
        setTitle(file.name); 
    }
};

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(event.target.value);
  };

  const handleSourceTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSourceText(event.target.value);
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
  
  };

  const addName = (event: any) => {

  }
  const handleAddNewSource = async () => {
   
    let data: { title: string; file?: File; url?: string; sourceText?: string } = { title };
 
    if (inputType === 'file' && file) {
      data.file = file;
    } else if (inputType === 'url') {
      data.url = url;
    } else if (inputType === 'text') {
      data.sourceText = sourceText;
    }

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
      //bibliography
      authorFirst: authorFirst,
      authorLast: authorLast,
      year: year,
      publishedTitle: publishTitle,
      placement: placement,
      city: city,
      publisher: publisher,
      enabled: true,
    };

    dispatch(setLoading(true));
    try {
      // validate report selected, throw identifiable error and exit try block if no report is found
      if (!reportSelected) {
        throw "No report selected";
      }

      try {
        //sumbit source and begin NER model tokenization
        const sourceSubmissionResult = await submitSource({ outboundSource: newSource, reportId: reportSelected.id.toString() }).unwrap();

        //submit source id to report's sources list if source submission was successful
        const reportAndSourceIds = { reportId: reportSelected.id, sourceId: newSource.id };
        await submitSourceToReport(reportAndSourceIds).unwrap();
      }
      catch (error) {
        console.log("Error: source was not submitted: ", error);
      }

      //important: 
      //false here allows all useGetResultQuery's that skip loading to update state in following source id dispatch
      dispatch((setLoading(false)));
      //dispatch source id set in successful try block as opposed to always set.
      dispatch(setSourceId(newSource.id));
    } catch (err) {
      console.error('Error submitting source:', err);
    } finally {
      //still always set loading to false in the case of errors
      dispatch((setLoading(false)));
      resetForm();
      if (onClose) onClose();
    }    
  };

  return (
    <CardContent customPadding="p-10 mt-10">
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
            className="flex-grow " />
        </div>
          <div className="mb-8 w-full grid grid-cols-2 gap-4">
            <div 
              className="flex flex-col items-center border-dashed border-2 border-gray-300 rounded-lg p-6"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <span className="material-icons text-5xl mb-4">description</span>
              <p className="text-center">Drag File Here</p>
              {file && <p className="text-center mt-2">File: {file.name}</p>}
            </div>
          <div className="flex flex-col space-y-2 justify-center text-center">
            <span>Or Choose Another Option:</span>
            <div className="space-x-2 text-center">
              <ButtonBasic label="Enter URL" buttonSize="btn-sm" color="btn-secondary" onClick={() => setInputType('url')} />
              <ButtonBasic label="Paste Text" buttonSize="btn-sm" color="btn-secondary" onClick={() => setInputType('text')} />
              <ButtonBasic label="Browse File" buttonSize="btn-sm" color="btn-secondary" onClick={() => setInputType('file')} />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col space-y-2">
            {inputType === 'file' && (
              <FormElementFileInput
                label="Select file to upload"
                onFileChange={handleFileChange}
                buttonLabel="Browse" 
                placeholder=""/>
            )}
            {inputType === 'url' && (
              <FormElementTextInput
                label="Enter URL"
                value={url}
                onChange={handleUrlChange}
                className="flex-grow " />
            )}
            {inputType === 'text' && (
              <FormElementTextArea
                label="Paste text here"
                value={sourceText}
                onChange={handleSourceTextChange}
                className="flex-grow "
                rows={5}
                maxHeight="200px" />
            )}
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
              className="input-sm mt-2" />
          </div>
          <div className="basis-auto">
            <FormElementTextInput
              label="Last Name"
              value={authorLast}
              onChange={handleAuthorLastChange}
              className="input-sm mt-2" />
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
          {/* <div className="basis-auto">
            <FormElementTextInput
              label="Location (City)"
              value={city}
              onChange={handleCityChange}
              className="input-sm" />
          </div> */}
        
        </div>
        {/* <div className="mt-5 mb-5 flex flex-row content-center">
          <div className="basis-auto">
            <FormElementTextInput
              placeholder="yyyy"
              label="Year"
              value={year}
              onChange={handleYearChange}
              className="input-sm" />
          </div>
        </div> */}
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

export default FormAddSource;
