// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import * as React from 'react';
import { useEffect } from 'react';

// components/ThemeToggle.tsx
import { useTheme } from '../../contexts/useTheme';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const htmlElement = document.querySelector('html');
    if (htmlElement) {
      htmlElement.setAttribute('class', theme);
      htmlElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  return (
    <label className="swap swap-rotate btn btn-circle btn-ghost">
      <input onClick={toggleTheme} type="checkbox" />
      <span className="swap-on material-icons !text-white">dark_mode</span> 
      <span className="swap-off material-icons !text-white">light_mode</span> 
    </label>
  );
};

export default ThemeToggle;
