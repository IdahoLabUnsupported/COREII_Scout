// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDirtyContext } from '../../src/contexts/DirtyContext';

function useNavigationGuard(message: string, onCancel: () => void) {
  const { isDirty, resetDirty } = useDirtyContext();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  const checkNavigation = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        resetDirty();
        return true;
      } else {
        onCancel();
        return false;
      }
    }
    return true;
  };

  return { checkNavigation };
}

export default useNavigationGuard;