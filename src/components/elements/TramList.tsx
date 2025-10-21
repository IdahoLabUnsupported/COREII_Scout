// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useMemo } from 'react';
import FormElementSelect from '../forms/formElements/FormElementSelect';

interface TramListProps {
  result: {
    predictions: {
      start_pos: number;
      end_pos: number;
      entity_label: string;
      entity_text: string;
      tramStatus: string;
    }[];
  };
  options: { label: string; value: string }[];
  handleTramStatusChange: (e: React.ChangeEvent<HTMLSelectElement>, index: number) => void;
  getSelectColorTramStatus: (status: string) => string;
}

const TramList: React.FC<TramListProps> = ({ result, options, handleTramStatusChange, getSelectColorTramStatus }) => {
  const tramList = useMemo(() => {
    const sortedPredictions = result?.predictions.slice().sort((a, b) => a.start_pos - b.start_pos);

    return sortedPredictions?.map((tram, index) => (
      <li key={index} className="grid grid-cols-[2rem_6rem_1fr_8rem] items-center py-4 pl-3 pr-4 gap-4 text-sm leading-6 text-left">
        <div className="text-center">
          {index + 1}
        </div>
        <div className="text-left">
          {tram.entity_label}
        </div>
        <div className="text-left">
          "{tram.entity_text}"
        </div>
        <div className="text-left">
          <FormElementSelect
            selectKey={index}
            options={options}
            label={'Observable Status'}
            labelClassName={'sr-only'}
            additionalClasses={`${getSelectColorTramStatus(tram.tramStatus)} content-center`}
            selectSize="sm:select-xs md:select-xs lg:select-xs xl:select-sm"
            value={tram.tramStatus}
            onChange={(e) => handleTramStatusChange(e, index)}
          />
        </div>
      </li>
    )) || [];
  }, [result, options, handleTramStatusChange, getSelectColorTramStatus]);

  return (
    <ul role="list" className="divide-y divide-gray-300">
      {tramList}
    </ul>
  );
};

export default TramList;
