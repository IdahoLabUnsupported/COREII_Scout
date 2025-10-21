// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import ButtonIcon from '../ButtonIcon';
import FormElementSelect from '../../forms/formElements/FormElementSelect';

interface CustomTooltipModuleLayoutProps {
  label: string;
  confidence: number;
  tramStatus: string;
  getSelectTramStatusOptions: { label: string; value: string }[];
  getSelectEntityLabelOptions: { label: string; value: string }[];
  handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void;
  handleEntityLabelChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void; // New prop
  getSelectColorTramStatus: (status: string) => string;
  onClose: () => void;
  position: { left: number; top: number };
  visible: boolean;
  index: number;
  text: string;
}

const CustomTooltipModuleLayout: React.FC<CustomTooltipModuleLayoutProps> = ({
  label,
  confidence,
  tramStatus,
  getSelectTramStatusOptions,
  getSelectEntityLabelOptions,
  handleTramStatusChange,
  handleEntityLabelChange,
  getSelectColorTramStatus,
  onClose,
  position,
  visible,
  index,
  text,
}) => {
  const [selectedStatus, setSelectedStatus] = useState(tramStatus);
  const [selectedLabel, setSelectedLabel] = useState(label);
  const [selectedText, setSelectedText] = useState(text);

  useEffect(() => {
    setSelectedStatus(tramStatus);
  }, [tramStatus]);

 useEffect(() => {
    const matchingOption = getSelectEntityLabelOptions.find(
      option => option.label.toLowerCase() === label.toLowerCase()
    );
    if (matchingOption) {
      setSelectedLabel(matchingOption.value);
    } else {
    }
  }, [label, getSelectEntityLabelOptions]);

  useEffect(() => {
    setSelectedText(text);
  }, [label]);

  const handleInternalTramStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
    handleTramStatusChange(e, index);
  };

  const handleInternalEntityLabelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    console.log(e.target.value)
    setSelectedLabel(e.target.value);
    handleEntityLabelChange(e, index);
  };

  return (
    <div className={`absolute rounded-xl bg-gray-900 ${visible ? '!visible' : ''}`} style={{ left: `${position.left}px`, top: `${position.top}px`, minWidth: '350px' }}>
      <div className="absolute right-2 top-2 leading-normal">
        <ButtonIcon label="Close" buttonIcon="close" color="btn-ghost" buttonSize="btn-sm" onClick={onClose} />
      </div>
      <div className="absolute top-0 left-0 mb-3 p-4 pt-[10px] pb-2 inline-flex bg-gray-800 rounded-tl-xl rounded-br-xl">
        <h4 className="text-base"><strong>{selectedText}</strong></h4>
      </div>
      <div className="tooltip-content mt-10 grid gap-3 leading-normal p-4">
        <div className="flex items-center justify-between">
          <span><strong>Label:</strong></span>
          <div className="w-40">
            <FormElementSelect
              selectKey={index}
              options={getSelectEntityLabelOptions}
              label={'Entity Label'}
              labelClassName={'sr-only'}
              additionalClasses={`${getSelectColorTramStatus(selectedLabel)} content-center`}
              selectSize="sm:select-xs md:select-xs lg:select-xs xl:select-sm"
              value={selectedLabel}
              onChange={handleInternalEntityLabelChange}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span><strong>Confidence:</strong></span>
          <div>
            <span>{confidence}%</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span><strong>Status:</strong></span>
          <div className="w-40">
            <FormElementSelect
              selectKey={index}
              options={getSelectTramStatusOptions}
              label={'Observable Status'}
              labelClassName={'sr-only'}
              additionalClasses={`${getSelectColorTramStatus(selectedStatus)} content-center`}
              selectSize="sm:select-xs md:select-xs lg:select-xs xl:select-sm"
              value={selectedStatus}
              onChange={handleInternalTramStatusChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomTooltipModuleLayout;
