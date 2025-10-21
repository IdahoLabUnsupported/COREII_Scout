import React, { useState, forwardRef, useImperativeHandle } from 'react';
import ButtonBasic from '../elements/ButtonBasic';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementTextArea from './formElements/FormElementTextArea';
import CardContent from '../cards/CardContent';

type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  onSave?: () => void;
};

export interface FormAddRssFeedHandles {
  saveNewReport: () => Promise<boolean>;
}

const FormAddRssFeed = forwardRef<FormAddRssFeedHandles, Props>(({ onClose, showFormButtons = true, onSave }, ref) => {
  //const [submitReport, { isLoading, error }] = useSubmitReportMutation();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  

//   useImperativeHandle(ref, () => ({
//     saveNewReport() {
//       return handleSaveAddRssFeed();
//     }
//   }));

  const validateUrl = (value: string) => {
    const regex = /^(ftp|http|https):\/\/[^ "]+$/
    if (value.trim() === '') {
      setUrlError('URL is required');
    } else if (!regex.test(value)) {
      setUrlError('URL contains invalid characters');
    } else {
      setUrlError('');
    }
  };

 
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setUrl(value);
    validateUrl(value);
  };
  const handleNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setName(value);
    
  };
  const handleDescriptionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setDescription(value);
   
  };
  const handleTagsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setTags(value);
   
  };

  return (
    <CardContent customPadding="p-10 mt-10">
      <div className="w-full">
        <div className="flex flex-col gap-5">
         
          <FormElementTextInput
            label="Feed Name"
            value={name}
            onChange={handleNameChange}
            //isInvalid={!!urlError}
            //errorMessage={urlError}
          />
           <FormElementTextInput
            label="Feed URL"
            value={url}
            onChange={handleUrlChange}
            //isInvalid={!!urlError}
            //errorMessage={urlError}
          />
           <FormElementTextInput
            label="Description"
            value={description}
            onChange={handleDescriptionChange}
            //isInvalid={!!urlError}
            //errorMessage={urlError}
          />
           <FormElementTextArea
            label="Tags"
            rows={1}
            value={tags} 
            onChange={handleTagsChange}     
            //isInvalid={!!urlError}
            //errorMessage={urlError}
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
                //   const isFormSubmitted = await handleSaveNewReport();
                //   if (isFormSubmitted && onClose) onClose();
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

export default FormAddRssFeed;
function setUrlError(arg0: string) {
    throw new Error('Function not implemented.');
}

function validateUrl(url: string) {
    throw new Error('Function not implemented.');
}

