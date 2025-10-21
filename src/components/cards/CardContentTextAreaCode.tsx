// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';

type Props = {
  placeholder?: string,
  content?: string,
  customPadding?: string;
};

const CardContentTextAreaCode: React.FC<Props> = ({ placeholder, content, customPadding }) => {
  return (
    <textarea className={`textarea 
      ${customPadding || 'p-10'} 
      bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 overflow-hidden flex align-middle min-h-[15rem] overflow-y-scroll `}
      placeholder={placeholder}>
        {/* Text editor for code goes here */}
            {content}
    </textarea>
  );
};

export default CardContentTextAreaCode;
