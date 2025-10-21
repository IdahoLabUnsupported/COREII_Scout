// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState, Suspense } from 'react';
import DialogBasic from '../../elements/DialogBasic';
import ButtonIcon from '../ButtonIcon';

type ActionButton = {
  buttonLabel: string;  // Trigger button label (508-compliant)
  buttonIcon: string;  // Icon for the button
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';  // Button color
  buttonSize: 'btn-sm' | 'btn-md';  // Button size
  dialogContent: React.ReactElement<any>;  // React element to be loaded into the dialog
  submitButtonLabel: string;  // Label for the dialog save button
  title: string;  // Dialog title
  onSave: () => void;  // Passed dynamic action to be triggered
  onClick?: (data: any) => ActionButton;  // Optional function to create dynamic dialog configuration
  showFormButtons: boolean;
};

type ActionCellRendererProps = {
  data: any;  // Row data for the table
  buttons: ActionButton[];  // List of action buttons
};

const ActionCellRenderer: React.FC<ActionCellRendererProps> = ({ data, buttons }) => {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [activeButton, setActiveButton] = useState<ActionButton | null>(null);
  const [dialogData, setDialogData] = useState<any>(null);  // Hold the row data for the form

  const handleOpenDialog = (button: ActionButton) => {
    const buttonConfig = button.onClick ? button.onClick(data) : button;  // Use onClick if provided, otherwise use button directly
    setActiveButton(buttonConfig);
    setDialogData(data);  // Set the row data when opening the dialog
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleSaveDialog = async (): Promise<boolean> => {
    // Call the dynamic onSave method passed from outside
    if (activeButton?.onSave) {
      await activeButton.onSave();  // Trigger the save action from outside
      handleCloseDialog();
      return true; // Assume the save operation is successful. Adjust this logic as needed.
    }
    return false;
  };

  return (
    <div className="flex items-center h-full">
      {buttons.map((button, index) => (
        <ButtonIcon
          key={`${data.id}-${button.buttonLabel}-${index}`}
          label={button.buttonLabel}  // 508-compliant label for accessibility
          buttonIcon={button.buttonIcon}  // Pass button icon
          color={button.buttonColor}  // Button color
          buttonSize={button.buttonSize}  // Button size
          onClick={() => handleOpenDialog(button)}  // Open dialog on click
        />
      ))}

      {activeButton && (
        <DialogBasic
          isOpen={isDialogOpen}
          title={activeButton.title}  // Use the button's title for the dialog
          onSave={handleSaveDialog}  // Trigger form save on dialog save
          onClose={handleCloseDialog}  // Close dialog
          submitButtonLabel={activeButton.submitButtonLabel}  // Pass submit button label
        >
          <Suspense fallback={<div>Loading...</div>}>
            {React.cloneElement(activeButton.dialogContent, { data: dialogData })}  
            {/* Pass the row data to the form dynamically */}
          </Suspense>
        </DialogBasic>
      )}
    </div>
  );
};

export default ActionCellRenderer;
