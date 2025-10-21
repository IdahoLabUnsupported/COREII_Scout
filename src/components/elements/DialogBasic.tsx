// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState, useRef, cloneElement, ReactElement, forwardRef, Ref } from 'react';
import ReactDOM from 'react-dom';
import { useTheme } from '../../contexts/useTheme';
import ButtonBasic from './ButtonBasic';
import ButtonIcon from './ButtonIcon';

type OnSaveType<T> = (data: T) => Promise<boolean>;

type Props<T> = {
  children?: React.ReactNode;
  title?: string;
  content?: string;
  buttonColor?: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonType?: 'text' | 'icon';
  buttonLabel?: string;
  actionButtonLabel?: string;
  buttonIcon?: string;
  buttonSize?: 'btn-sm';
  isOpen?: boolean;
  onSave?: OnSaveType<T>;
  onClose?: () => void;
  showFormButtons?: boolean;
  submitButtonLabel?: string;
  innerRef?: Ref<any>;
};

const DialogBasic = <T,>(props: Props<T>, ref: Ref<HTMLDivElement>) => {
  const {
    children,
    title,
    content,
    buttonColor = 'btn-primary',
    buttonType = 'text',
    buttonLabel = 'Open Dialog',
    actionButtonLabel = 'Save',
    buttonIcon = 'open_in_new',
    buttonSize,
    isOpen = undefined,
    onSave,
    onClose,
    showFormButtons = true,
    submitButtonLabel = 'Save',
    innerRef,
  } = props;

  const { theme } = useTheme();
  const [open, setOpen] = useState(isOpen !== undefined ? isOpen : false);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleOpenDialog = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  const handleSaveDialog = async () => {
    if (onSave) {
      const isFormValid = await onSave({} as T);
      if (isFormValid) {
        handleCloseDialog();
      }
    }
  };

  useEffect(() => {
    if (isOpen !== undefined) {
      setOpen(isOpen);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCloseDialog();
      }
    };

    if (open) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open]);

  const stopPropagation = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const modalContent = (
    <>
      {open && <div className={`fixed z-50 inset-0 opacity-70 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}></div>}
      
      {open && (
        <dialog id="attack-full-desc-modal" className="modal" open={open}>
          <div
            className={`modal-box max-w-[1000px] min-w-none p-12 shadow-md-gray-light ${
              theme === 'dark' ? 'bg-gray-800 text-gray-100' : 'bg-gray-200 text-gray-900'
            }`}
            ref={ref}
            onClick={stopPropagation}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-2xl mb-0 align-middle">{title}</h2>
              <div className="-mr-4">
                <ButtonIcon
                  buttonSize="btn-sm"
                  label="Close"
                  buttonIcon="close"
                  color="btn-ghost"
                  onClick={handleCloseDialog}
                />
              </div>
            </div>

            {content ? (
              <div className="modal-text-container">
                <p>{content}</p>
              </div>
            ) : (
              children && React.isValidElement(children) && cloneElement(children as ReactElement<any>, { ref: innerRef })
            )}

            {showFormButtons && (
              <div className="flex justify-end pt-4 space-x-2">
                <ButtonBasic label="Cancel" color="btn-secondary" onClick={handleCloseDialog} />
                <ButtonBasic label={submitButtonLabel} color="btn-primary" onClick={handleSaveDialog} />
              </div>
            )}
          </div>
        </dialog>
      )}
    </>
  );

  return (
    <>
      {isOpen === undefined && (
        buttonType === 'text' ? (
          <ButtonBasic label={buttonLabel} color={buttonColor} buttonSize={buttonSize} onClick={handleOpenDialog} />
        ) : (
          <ButtonIcon
            label={buttonLabel}
            color={buttonColor}
            onClick={handleOpenDialog}
            buttonIcon={buttonIcon}
            buttonSize={buttonSize}
          />
        )
      )}

      {ReactDOM.createPortal(modalContent, document.body)}
    </>
  );
};

export default forwardRef(DialogBasic) as <T>(props: Props<T> & { ref?: Ref<HTMLDivElement> }) => ReturnType<typeof DialogBasic>;
