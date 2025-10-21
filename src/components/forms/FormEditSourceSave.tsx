import React, { forwardRef, useImperativeHandle, useState, useEffect } from 'react';

import FormElementTextInput from './formElements/FormElementTextInput';
import { useUpdateSourceMutation } from '../../../app/services/client.ts';
import CardContent from '../cards/CardContent';
import { useGetSourceQuery } from '../../../app/services/client.ts';
import { Source } from 'app/types/types.ts';


type Props = {
  onClose?: () => void;
  showFormButtons?: boolean;
  data?: any;  // Row data passed to the form
};

export interface FormEditSourceSaveHandles {
  saveEditedSource: () => void;
  resetForm: () => void;
}

const FormEditSourceSave = forwardRef<FormEditSourceSaveHandles, Props> (({ onClose, showFormButtons = true, data }, ref) => {

  
  //console.log('Data///////////////', data);

  const [title, setTitle] = useState(data?.title || '');
  const [authorFirst, setAuthorFirst] = useState(data?.authorFirst || '');
  const [authorLast, setAuthorLast] = useState(data?.authorLast || '');
  const [year, setYear] = useState(data?.year || '');
  const [publishTitle, setPublishTitle] = useState(data?.publishedTitle || '');
  const [placement, setPlacement] = useState(data?.placement || '');
  const [publisher, setPublisher] = useState(data?.publisher || '');
  const [thisId, setThisId] = useState(data?.id || '');
  const [updateSource] = useUpdateSourceMutation();
  const [sourceUpdate, setSourceUpdate] = useState();
 
 

  useEffect(() => {
    // Update form when new data is passed
    setTitle(data?.title || '');
    setAuthorFirst(data?.authorFirst || '');
    setAuthorLast(data?.authorLast || '');
    setYear(data?.year || '');
    setPublishTitle(data?.publishedTitle || '');
    setPlacement(data?.placement || '');
    setPublisher(data?.publisher || '');

  }, [data, updateSource]);

  const { data: source } = useGetSourceQuery(data.id)

  let edsNewSource: Source;
  if (source) {
    edsNewSource = structuredClone(source);
  }

  const handleEditSource = () => {
    edsNewSource.authorFirst = 'tim jones';

    const clonedData = { ...data};

    clonedData.title=title,
    clonedData.publishedTitle=publishTitle,
    clonedData.authorFirst=authorFirst,
    clonedData.authorLast=authorLast,
    clonedData.placement=placement,
    clonedData.publisher=publisher,
    clonedData.year=year

    console.log("Saving DATA", data );
    if (data?.id) {
      // Update the result object with the source edits
       updateSource({
          source: clonedData
          //source: edsNewSource
        }).unwrap();
    }
    console.log("Saving Edited Source", clonedData );
   
    if (onClose) onClose();
  };

  useImperativeHandle(ref, () => ({
    saveEditedSource() {
      handleEditSource();
    },
    resetForm() {
      resetForm();
    }
  }));

  const resetForm = () => {
    setTitle('');
    setAuthorFirst('');
    setAuthorLast('');
    setYear('');
  };

  

  return (
    <CardContent customPadding="p-10 mt-10">
        <div className="flex flex-row  pb-3 mb-3">
        <FormElementTextInput className="input-sm mt-2  " label="Source Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>  
      <h2 className="divider pt-3 pb-3">Bibliography</h2>  
      <div className="flex flex-row content-center pt-3 pb-3 mb-3">
        <FormElementTextInput className="input-sm mt-2" label="First Name" value={authorFirst} onChange={(e) => setAuthorFirst(e.target.value)} />
        <FormElementTextInput className="input-sm mt-2" label="Last Name" value={authorLast} onChange={(e) => setAuthorLast(e.target.value)} />
      </div>
      <div className="flex flex-row content-center pt-3 pb-3 mb-3">
        <FormElementTextInput className="input-sm mt-2" label="Year" value={year} onChange={(e) => setYear(e.target.value)} />
        <FormElementTextInput className="input-sm mt-2" label="Title" value={publishTitle} onChange={(e) => setPublishTitle(e.target.value)} />
      </div>
      <div className="flex flex-row content-center pt-3 pb-3 mb-3">
        <FormElementTextInput className="input-sm mt-2" label="Publication" value={placement} onChange={(e) => setPlacement(e.target.value)}  />
        <FormElementTextInput className="input-sm mt-2" label="Publisher" value={publisher} onChange={(e) => setPublisher(e.target.value)}  />
      </div>
    </CardContent>
  );
});

export default FormEditSourceSave;


