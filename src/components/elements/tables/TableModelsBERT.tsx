// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo, useRef } from 'react';
import TableBasic from './TableBasic';
import FormModelSettingsBERT from '../../forms/FormModelSettingsBERT';
import RadioButtonCellRenderer from './RadioButtonCellRenderer';
import StatusLightCellRenderer from './StatusLightCellRenderer';
import { BERTModel } from "../../../../app/types/types";

interface ActionButton {
  title: string;
  buttonType: 'icon' | 'text';
  buttonColor: 'btn-primary' | 'btn-secondary' | 'btn-ghost';
  buttonLabel: string;
  buttonIcon: string;
  buttonSize: 'btn-sm' | 'btn-md';
  onClick?: (data: any) => void;
  dialogContent: React.ReactElement<any>;
  submitButtonLabel: string;
  onSave: () => void;
  showFormButtons: boolean;
}

interface TableModelsBERTProps {
  models: BERTModel[];
  selectedModelId: number | null;
  onModelSelect: (modelId: number) => void;
  onSaveModel: (data: any) => void;
  onDeleteModel: (modelId: number) => void;
}

const TableModelsBERT: React.FC<TableModelsBERTProps> = ({ models, selectedModelId, onModelSelect, onSaveModel, onDeleteModel }) => {
  const formRef = useRef<any>(null);
  const gridRef = useRef<any>(null);

  const handleSave = () => {
    if (formRef.current) {
      const modelData = formRef.current.saveEditedModel();
      onSaveModel(modelData);
    }
  };

  const handleConfigureClick = (model: BERTModel): ActionButton => {
    return {
      title: `Configure ${model.name}`,
      dialogContent: <FormModelSettingsBERT ref={formRef} data={model} onSaveData={onSaveModel} />,
      onSave: handleSave,
      showFormButtons: false,
      submitButtonLabel: 'Save',
      buttonLabel: 'Configure',
      buttonIcon: 'settings',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      buttonType: 'icon',
    };
  };

  const handleDeleteClick = (modelId: number) => {
    onDeleteModel(modelId);
  };

  const defaultActionButtons: ActionButton[] = useMemo(() => [
    {
      buttonLabel: 'Configure',
      buttonIcon: 'settings',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      buttonType: 'icon',
      onClick: handleConfigureClick,
      dialogContent: <FormModelSettingsBERT ref={formRef} onSaveData={onSaveModel} />,
      submitButtonLabel: 'Save',
      title: 'Configure Model',
      onSave: handleSave,
      showFormButtons: false
    },
    {
      buttonLabel: 'Delete',
      buttonIcon: 'delete',
      buttonColor: 'btn-ghost',
      buttonSize: 'btn-sm',
      buttonType: 'icon',
      onClick: (model: BERTModel) => handleDeleteClick(model.id),
      dialogContent: <></>,
      submitButtonLabel: '',
      title: 'Delete Model',
      onSave: () => {},
      showFormButtons: false
    }
  ], []);

  return (
    <TableBasic
      key={selectedModelId} // Use key to force re-render
      rowData={models}
      gridRef={gridRef}
      colDefs={[
        { headerName: 'Model Name', field: 'name', flex: 2 },
        { headerName: 'Description', field: 'description', flex: 3 },
        { headerName: 'Type', field: 'type', flex: 3 },
        { 
          headerName: 'Active', 
          field: 'active', 
          cellRenderer: 'radioButtonCellRenderer', 
          cellRendererParams: {
            selectedModelId,
            onModelSelect,
            groupName: 'bertModels' // Unique group name
          },
          width: 125, 
        },
        { 
          headerName: 'Configure', 
          field: 'configure', 
          cellRenderer: 'actionCellRenderer', 
          width: 125, 
          valueFormatter: () => '' 
        },
      ]}
      enablePagination={false}
      actionButtons={defaultActionButtons}
      mobileBreakpoint={600}
      allowMobileView={false}
      components={{ 
        radioButtonCellRenderer: RadioButtonCellRenderer,
        statusLightCellRenderer: StatusLightCellRenderer
      }}
    />
  );
};

export default TableModelsBERT;
