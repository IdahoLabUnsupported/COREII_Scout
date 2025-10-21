// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { Suspense, useEffect, useState } from 'react';
import ButtonIcon from '../elements/ButtonIcon';


type OffCanvasDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  onSubmit: () => void;
  children: React.ReactNode;
};

const OffCanvasDrawer: React.FC<OffCanvasDrawerProps> = ({ isOpen, onClose, title, onSubmit, children }) => {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [drawerClass, setDrawerClass] = useState('translate-x-full');
  const [overlayClass, setOverlayClass] = useState('opacity-0');

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Force a reflow to ensure the transition is registered
      requestAnimationFrame(() => {
        setDrawerClass('translate-x-0');
        setOverlayClass('opacity-100');
      });
    } else {
      setDrawerClass('translate-x-full');
      setOverlayClass('opacity-0');
    }
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setShouldRender(false);
    }
  };

  return (
    <>
      {shouldRender && (
        <div className="fixed inset-0 overflow-hidden z-50">
          {/* Background overlay */}
          <div
            className={`absolute inset-0 bg-gray-800 bg-opacity-75 transition-opacity duration-300 ${overlayClass}`}
            onClick={onClose}
          ></div>
          {/* Drawer */}
          <div
            className={`absolute inset-y-0 right-0 max-w-full flex transform transition-transform duration-300 ${drawerClass}`}
            onTransitionEnd={handleTransitionEnd}
          >
            <div className="w-800px h-full"> {/* Set the width to 800px */}
              <div className="h-full flex flex-col bg-gray-800 shadow-xl overflow-y-auto">
                <div className="px-4 py-6 sm:px-6">
                  <div className="flex items-start justify-between">
                    <h2 className="text-lg font-medium text-gray-200">{title}</h2>
                    <div className="ml-3 h-7 flex items-center">
                         <ButtonIcon
                            label="Close"
                            color="btn-ghost"
                              onClick={onClose}
                            buttonIcon="close"
                            buttonSize="btn-sm"
                        />
                    </div>
                  </div>
                </div>
                <div className="relative flex-1 px-4 sm:px-6">
                  <Suspense fallback={<div>Loading...</div>}>
                    {children}
                  </Suspense>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OffCanvasDrawer;