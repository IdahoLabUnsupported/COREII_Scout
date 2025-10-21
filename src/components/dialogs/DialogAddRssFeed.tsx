// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormAddRssFeed, { FormAddRssFeedHandles } from '../forms/FormAddRssFeed';

type Props = {
  title: string;
  buttonType: 'text' | 'icon';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  onSave?: () => void;
};

const DialogAddRssFeed = forwardRef<FormAddRssFeedHandles, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, onSave } = props;
  const formRef = useRef<FormAddRssFeedHandles>(null);

  // useImperativeHandle(ref, () => ({
  //   saveNewReport() {
  //     if (formRef.current) {
  //       return formRef.current.saveNewReport().then((isFormSubmitted: boolean) => {
  //         if (isFormSubmitted && onSave) {
  //           onSave();
  //         }
  //         return isFormSubmitted;
  //       });
  //     }
  //     return Promise.resolve(false);
  //   }
  // }));

  const handleSaveDialog = useCallback(async () => {
    // if (formRef.current) {
    //   const isFormSubmitted = await formRef.current.saveNewReport();
    //   return isFormSubmitted;
    // }
    // return false;
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
     // onSave={handleSaveDialog}
      innerRef={formRef}
    >
      <FormAddRssFeed ref={formRef} showFormButtons={false} />
    </DialogBasic>
  );
});

export default DialogAddRssFeed;
