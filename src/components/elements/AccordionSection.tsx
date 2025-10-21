// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useRef, useState, useEffect } from 'react';

interface AccordionSectionProps {
  title: string;
  isOpen: boolean;
  toggleAccordion: () => void;
  children: React.ReactNode;
  dialog: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({ title, isOpen, toggleAccordion, children, dialog }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState('0px');

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(isOpen ? `${contentRef.current.scrollHeight}px` : '0px');
    }
  }, [isOpen, children]);

  return (
    <div className="collapse bg-base-200">
      <input type="checkbox" checked={isOpen} readOnly className="peer" hidden />
      <div className="collapse-title font-medium flex justify-between items-center cursor-pointer pr-2 pb-0" onClick={toggleAccordion}>
        <span className="flex items-center">
          <span className={`material-icons transition-transform ${isOpen ? 'rotate-0' : 'rotate-180'}`}>expand_more</span>
          <span className="text-sm font-semibold">
            {title}
          </span>
        </span>
        {dialog}
      </div>
      <div
        ref={contentRef}
        className="collapse-content pl-4 pr-2 text-sm overflow-hidden transition-max-height duration-300 ease-in-out"
        style={{ maxHeight }}
      >
        {children}
      </div>
    </div>
  );
};

export default AccordionSection;
