import React, { useState, forwardRef, useImperativeHandle } from 'react';
import ButtonBasic from '../elements/ButtonBasic';
import FormElementTextInput from './formElements/FormElementTextInput';
import FormElementTextArea from './formElements/FormElementTextArea';
import { CardItem } from '../../../app/types/types'; // Adjust the import according to your structure
import FormElementSelect from '../../components/forms/formElements/FormElementSelect';
import { useGetReportsQuery } from '../../../app/services/client';

type Props = {
  item?: CardItem | null; // Updated to accept null
  onClose?: () => void;
  showFormButtons?: boolean;
  onSave?: () => void;
};

export interface FormAddEmergingTopicHandles {
  saveNewReport: () => Promise<boolean>;
}

const FormAddEmergingTopic = forwardRef<FormAddEmergingTopicHandles, Props>(
  ({ item, onClose, showFormButtons = true, onSave }, ref) => {
    const [url, setUrl] = useState(item?.url || '');
    const [title, setTitle] = useState(item?.title || '');
    const [tags, setTags] = useState(item?.tags || '');
    const [description, setDescription] = useState(item?.description || '');
    const { data: storeReportsList = [] } = useGetReportsQuery();
    const [reportId, setReportId] = useState<number | undefined>(undefined);

    useImperativeHandle(ref, () => ({
      async saveNewReport() {
        // Implement the save logic here
        // You can add form validation here if needed
        if (onSave) onSave();
        return true; // Placeholder for actual logic
      }
    }));
    const options = storeReportsList.map(report => ({ label: report.title, value: report.id }));
    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
     const selectedValue = parseInt(event.target.value, 10);
     setReportId(selectedValue);
    };
    return (
      <div className="w-full">
        <div className="flex flex-col gap-5">
          <FormElementSelect
                label={'Select Report'}
                labelClassName={'sr-only'}
                className={'mt-4 mb-4'}
                options={options}
                selectSize="select-sm"
                placeholder="Select Report"
                value={reportId}
                onChange={handleSelectChange}
          />
          <FormElementTextInput
            label="Topic Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {/* <FormElementTextInput
            label="Feed URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          /> */}
          {/* <FormElementTextArea
            label="Description"
            rows={1}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <FormElementTextInput
            label="Tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          /> */}
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

export default FormAddEmergingTopic;
