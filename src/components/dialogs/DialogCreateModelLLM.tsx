// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormModelSettingsLLM, { FormModelSettingsLLMHandles } from '../forms/FormModelSettingsLLM';

type Props = {
  title: string;
  buttonType: 'text' | 'icon';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  onSave?: (data: any) => void;
};

const DialogCreateModel = forwardRef<FormModelSettingsLLMHandles, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, onSave } = props;
  const formRef = useRef<FormModelSettingsLLMHandles>(null);

  useImperativeHandle(ref, () => ({
    saveEditedModel: async () => {
      if (formRef.current) {
        const isFormSubmitted = await formRef.current.saveEditedModel();
        return isFormSubmitted;
      }
      return false;
    },
    resetForm: () => {
      if (formRef.current) {
        formRef.current.resetForm();
      }
    },
  }));

  const handleSaveDialog = useCallback(async () => {
    if (formRef.current) {
      const isFormSubmitted = await formRef.current.saveEditedModel();
      return isFormSubmitted;
    }
    return false;
  }, []);

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
      innerRef={formRef}
    >
      <FormModelSettingsLLM ref={formRef} showFormButtons={false} onSaveData={onSave} />
    </DialogBasic>
  );
});

export default DialogCreateModel;
