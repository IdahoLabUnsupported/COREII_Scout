// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

type Props = {
  disabled: boolean;
  title: string;
  isMultiple?: boolean;
  onClick?: () => void;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
};

const CardSimpleAttackName: React.FC<Props> = ({ title, onClick, onMouseEnter, onMouseLeave, disabled, isMultiple }) => {
  const baseStyles = "bg-gray-200 text-gray-900 dark:text-gray-100 dark:bg-gray-700 hover:bg-white hover:text-black hover:dark:bg-gray-900 hover:dark:text-gray-100";
  const disabledStyles = "cursor-not-allowed opacity-40 dark:opacity-40";
  const clickableStyles = "cursor-pointer";
  const finalStyles = disabled ? disabledStyles : isMultiple ? baseStyles : `${baseStyles} ${clickableStyles}`;
  return (
    <div
      className={`
        card
        flex
        align-middle
        rounded-md
        shadow-md
        overflow-hidden
        min-h-[3.5rem]
        ${finalStyles}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex flex-grow px-6 justify-center items-center">
        <h6 className="text-xs text-center justify-center align-middle leading-4 p-2">
          {title}
        </h6>
      </div>
    </div>
  );
};

export default CardSimpleAttackName;
