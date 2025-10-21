// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';

interface RadioButtonCellRendererProps {
  data: any;
  selectedModelId: number | null;
  onModelSelect: (modelId: number) => void;
  groupName: string;
}

const RadioButtonCellRenderer: React.FC<RadioButtonCellRendererProps> = ({ data, selectedModelId, onModelSelect, groupName }) => {
  const handleSelection = () => {
    onModelSelect(data.id);
  };

  return (
    <div className="flex h-full items-center">
      <input
        type="radio"
        name={groupName}
        className="radio radio-sm radio-primary dark:radio-primary"
        checked={selectedModelId === data.id}
        onChange={handleSelection}
      />
    </div>
  );
};

export default RadioButtonCellRenderer;
