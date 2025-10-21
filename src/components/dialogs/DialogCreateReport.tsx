// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormAddNewReport, { FormAddNewReportHandles } from '../forms/FormAddNewReport';

type Props = {
  title: string;
  buttonType: 'text' | 'icon';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  onSave?: () => void;
};

const DialogCreateReport = forwardRef<FormAddNewReportHandles, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, onSave } = props;
  const formRef = useRef<FormAddNewReportHandles>(null);

  useImperativeHandle(ref, () => ({
    saveNewReport() {
      if (formRef.current) {
        return formRef.current.saveNewReport().then((isFormSubmitted: boolean) => {
          if (isFormSubmitted && onSave) {
            onSave();
          }
          return isFormSubmitted;
        });
      }
      return Promise.resolve(false);
    }
  }));

  const handleSaveDialog = useCallback(async () => {
    if (formRef.current) {
      const isFormSubmitted = await formRef.current.saveNewReport();
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
      <FormAddNewReport ref={formRef} showFormButtons={false} />
    </DialogBasic>
  );
});

export default DialogCreateReport;
