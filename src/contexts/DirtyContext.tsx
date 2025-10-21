// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Create context for managing isDirty state
const DirtyContext = createContext({
  isDirty: false,
  setIsDirty: (dirty: boolean) => {},
  resetDirty: () => {},
});

// Provider Component
export const DirtyProvider = ({ children }: { children: ReactNode }) => {
  const [isDirty, setIsDirty] = useState(false);

  const resetDirty = () => setIsDirty(false);

  return (
    <DirtyContext.Provider value={{ isDirty, setIsDirty, resetDirty }}>
      {children}
    </DirtyContext.Provider>
  );
};

export const useDirtyContext = () => useContext(DirtyContext);
