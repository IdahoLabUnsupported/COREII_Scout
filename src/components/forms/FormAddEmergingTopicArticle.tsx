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

export interface FormAddEmergingTopicArticleHandles {
  saveNewReport: () => Promise<boolean>;
}

const FormAddArticle = forwardRef<FormAddEmergingTopicArticleHandles, Props>(
  ({ item, onClose, showFormButtons = true, onSave }, ref) => {
    const [url, setUrl] = useState(item?.url || '');
    const [title, setTitle] = useState(item?.title || '');
    const [tags, setTags] = useState(item?.tags || '');
    const [description, setDescription] = useState(item?.description || '');

    useImperativeHandle(ref, () => ({
      async saveNewReport() {
        // Implement the save logic here
        // You can add form validation here if needed
        if (onSave) onSave();
        return true; // Placeholder for actual logic
      }
    }));

    return (
      <div className="w-full">
        <div className="flex flex-col gap-5">
          <FormElementTextInput
            label="Article Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <FormElementTextInput
            label="Article URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <FormElementTextArea
            label="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormElementTextInput
            label="Tags"
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
                onClick={() => { if (onSave) onSave(); }} // Call onSave when saving
                color={'btn-primary'}
              />
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default FormAddArticle;
