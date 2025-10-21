// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useState } from 'react';
import ButtonBasic from './ButtonBasic';

type ButtonFunctionGroupProps = {
  /**
   * Button labels and corresponding functions for each button
   */
  actions: Array<{
    /**
     * Button contents
     */
    label: string;
    /**
     * Function to call when button is clicked
     */
    onClick: () => void;
  }>;
  /**
   * Button size for all buttons in the group
   */
  buttonSize?: string;
};

const ButtonFunctionGroup: React.FC<ButtonFunctionGroupProps> = ({ actions, buttonSize }) => {
  const [selectedButton, setSelectedButton] = useState<number | null>(null);

  const handleButtonClick = (index: number, onClick: () => void) => {
    setSelectedButton(index);
    onClick();
  };

  return (
    <div className="join gap-0.5">
      {actions.map((action, index) => {
        const isMatch = selectedButton === index;
        const color = isMatch ? 'btn-primary' : 'btn-primary-inactive';
        const additionalClasses = !isMatch ? '' : '';

        return (
          <ButtonBasic
            key={index}
            label={action.label}
            onClick={() => handleButtonClick(index, action.onClick)}
            color={color}
            buttonSize={buttonSize}
            additionalClasses={`join-item ${additionalClasses}`}
          />
        );
      })}
    </div>
  );
};

export default ButtonFunctionGroup;
