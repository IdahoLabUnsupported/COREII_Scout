// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import DialogBasic from '../elements/DialogBasic';
import FormEditRssFeed, { FormEditRssFeedHandles } from '../forms/FormEditRssFeed';
import { CardItem } from '../../../app/types/types'; // Adjust the import according to your structure
import { DropResult } from '@hello-pangea/dnd';

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
};

export interface CardListProps {
  items: CardItem[];
  onEdit: (id: string) => void;
  onHide: (id: string) => void;
  onUnhide: (id: string) => void;
  onDelete: (id: string) => void;
  onDragEnd: (result: DropResult) => void;
}
const DialogEditRssFeed = forwardRef<FormEditRssFeedHandles, Props>((props, ref) => {
  const { title, buttonType, buttonColor, buttonLabel, buttonIcon, buttonSize, item, onSave, showDialog, onClose } = props;
  const formRef = useRef<FormEditRssFeedHandles>(null);

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

  return (
    <DialogBasic
      title={title}
      buttonType={buttonType}
      buttonColor={buttonColor}
      buttonLabel={buttonLabel}
      buttonIcon={buttonIcon}
      buttonSize={buttonSize}
      showFormButtons={true}
      innerRef={formRef}
      isOpen={showDialog} // Add this prop to control visibility
      onClose={onClose} // Add the onClose handler to the dialog
    >
      <FormEditRssFeed ref={formRef} showFormButtons={false} item={item} />
    </DialogBasic>
  );
});

export default DialogEditRssFeed;