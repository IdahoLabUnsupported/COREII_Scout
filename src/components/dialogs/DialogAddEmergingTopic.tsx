// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormAddEmergingTopic, { FormAddEmergingTopicHandles } from '../forms/FormAddEmergingTopic';
import FormAddEmergingTopicArticle, { FormAddEmergingTopicArticleHandles } from '../forms/FormAddEmergingTopicArticle';
import { CardItem } from '../../../app/types/types';

type Props = {
  title: string;
  buttonType: 'text' | 'icon';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  item?: CardItem | null; // Updated to accept null
  onSave?: () => void;
  showDialog: boolean; // New prop to control dialog visibility
  onClose: () => void; // New prop to handle close action
  formType: 'topic' | 'article'; // New prop to determine which form to show
};

const DialogAddEmergingTopic = forwardRef<any, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, item, onSave, showDialog, onClose, formType } = props;
  
  const topicFormRef = useRef<FormAddEmergingTopicHandles>(null);
  const articleFormRef = useRef<FormAddEmergingTopicArticleHandles>(null);

  useImperativeHandle(ref, () => ({
    saveNewReport() {
      if (formType === 'topic' && topicFormRef.current) {
        return topicFormRef.current.saveNewReport().then((isFormSubmitted: boolean) => {
          if (isFormSubmitted && onSave) {
            onSave();
          }
          return isFormSubmitted;
        });
      } else if (formType === 'article' && articleFormRef.current) {
        return articleFormRef.current.saveNewReport().then((isFormSubmitted: boolean) => {
          if (isFormSubmitted && onSave) {
            onSave();
          }
          return isFormSubmitted;
        });
      }
      return Promise.resolve(false);
    }
  }));

  return (
    <DialogBasic
      title={title}
      buttonType={buttonType}
      buttonColor={buttonColor}
      buttonLabel={buttonLabel}
      buttonIcon={buttonIcon}
      buttonSize={buttonSize}
      showFormButtons={true}
      isOpen={showDialog} // Add this prop to control visibility
      onClose={onClose} // Add the onClose handler to the dialog
    >
      {formType === 'topic' ? (
        <FormAddEmergingTopic ref={topicFormRef} showFormButtons={false} item={item} />
      ) : (
        <FormAddEmergingTopicArticle ref={articleFormRef} showFormButtons={false} item={item} />
      )}
    </DialogBasic>
  );
});

export default DialogAddEmergingTopic;
