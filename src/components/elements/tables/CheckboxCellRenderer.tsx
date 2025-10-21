// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { ICellRendererParams } from 'ag-grid-community';
import FormElementCheckbox from '../../../components/forms/formElements/FormElementCheckbox';
import { useUpdateSourceEnableMutation } from '../../../../app/services/client';

interface CheckboxCellRendererProps extends ICellRendererParams {
  label: string;
  value: string;
  checked: boolean; // Change to checked
  name: string;
  labelClassName?: string;
  customClass?: string;
  sourceId: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const CheckboxCellRenderer: React.FC<CheckboxCellRendererProps> = ({
  label,
  value,
  checked, // Change to checked
  name,
  labelClassName,
  customClass,
  sourceId,
  onChange,
}) => {
  const [updateSourceEnable] = useUpdateSourceEnableMutation();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = event.target.checked;
    onChange(event); // Call onChange prop to update state in the parent component
    updateSourceEnable({ sourceId: sourceId, enabled: newChecked }).unwrap();
  };

  return (
    <FormElementCheckbox
      label={label}
      value={value}
      checked={checked} // Change to checked
      name={name}
      labelClassName={labelClassName}
      customClass={customClass}
      onChange={handleChange}
    />
  );
};

export default CheckboxCellRenderer;
