import React, { useState, forwardRef, useImperativeHandle } from 'react';
import ButtonBasic from '../elements/ButtonBasic';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementTextArea from './formElements/FormElementTextArea';
import { CardItem } from '../../../app/types/types'; // Adjust the import according to your structure

type Props = {
    item?: CardItem | null; // Updated to accept null
  onClose?: () => void;
  showFormButtons?: boolean;
  onSave?: () => void;
};

export interface FormEditRssFeedHandles {
  saveNewReport: () => Promise<boolean>;
}

const FormEditRssFeed = forwardRef<FormEditRssFeedHandles, Props>(
  
  ({ item, onClose, showFormButtons = true, onSave }, ref) => {
    const [url, setUrl] = useState(item?.url || '');
    const [name, setName] = useState(item?.title || '');
    const [tags, setTags] = useState(item?.tags || '');
    const [description, setDescription] = useState(item?.description || '');

    // useImperativeHandle(ref, () => ({
    //   saveNewReport() {
    //     // Implement the save logic here if needed
    //     return true; // Placeholder for actual logic
    //   }
    // }));

    const handleSaveNewReport = () => {
      // Save logic can go here
      if (onSave) onSave();
    };

    return (
      <div className="w-full">
        <div className="flex flex-col gap-5">
          <FormElementTextInput
            label="Feed Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormElementTextInput
            label="Feed URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <FormElementTextInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormElementTextArea
            label="Tags"
            rows={1}
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          {showFormButtons && (
            <div className="flex space-x-4">
              <ButtonBasic
                label={'Cancel'}
                onClick={onClose}
                color={'btn-secondary'}
              />
              <ButtonBasic
                label={'Save'}
                onClick={handleSaveNewReport}
                color={'btn-primary'}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default FormEditRssFeed;