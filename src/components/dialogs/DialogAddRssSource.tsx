// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormAddRssSource, { FormAddRssSourceHandles } from '../forms/FormAddRssSource';

type Props = {
  title: string;
  buttonType: 'text' | 'icon';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  articleData?: any; 
};

const DialogAddRssSource = forwardRef<FormAddRssSourceHandles, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, articleData } = props;
  const formRef = useRef<FormAddRssSourceHandles>(null);
  
  useImperativeHandle(ref, () => ({
    saveNewSource() {
      if (formRef.current) {
        formRef.current.saveNewSource();
      }
    },
    resetForm() {
      if (formRef.current) {
        formRef.current.resetForm();
      }
    }
  }));

  const handleSaveDialog = async (): Promise<boolean> => {
    if (formRef.current) {
      await formRef.current.saveNewSource();
      return true; // Assume the save operation is successful. Adjust this logic as needed.
    }
    return false;
  };

  const handleCancelDialog = () => {
    if (formRef.current) {
      formRef.current.resetForm();
    }
  };

  return (
    <DialogBasic
      title={title}
      buttonType={buttonType}
      buttonColor={buttonColor}
      buttonLabel={buttonLabel}
      buttonIcon={buttonIcon}
      buttonSize={buttonSize}
      showFormButtons={true}
      onSave={handleSaveDialog}
      onClose={handleCancelDialog}
      innerRef={formRef}
    >
      <FormAddRssSource ref={formRef} showFormButtons={false} articleData={articleData}  />
    </DialogBasic>
  );
});

export default DialogAddRssSource;
