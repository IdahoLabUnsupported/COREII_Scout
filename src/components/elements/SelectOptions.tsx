// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { useState } from 'react';


interface OptionsProps {
    options: Array<any>;
      
}

const SelectOptions: React.FC<OptionsProps> = ({ options }) => {
    // const [selectedOption, setSelectedOption] = useState<number | null>(null);

    // const handleOptionClick = (index: number, onClick: () => void) => {
    //   setSelectedOption(index);
    //   onClick();
    // };
   
    
    let optionList: React.JSX.Element[] = []
    options.forEach((option, index) => {
        optionList.push(<option key={index} value={option.value}>{option.label}</option>);
    });
  return (
    <>
    {/* {options.map((option, index) => {

        <option 
            key={index}
            value={option.value}
         >   
          {option.label}
        </option>
    })} */}

    {optionList}
    </>
  );
};

export default SelectOptions;
