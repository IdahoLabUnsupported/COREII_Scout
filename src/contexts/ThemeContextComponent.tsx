// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React, { useEffect, useState } from 'react';
import { ThemeContextBlock } from './ThemeContextBlock'; // Ensure the path is correct

type Props = {
  children: React.ReactNode;
};

const ThemeContextComponent: React.FC<Props> = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(currentTheme => currentTheme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Apply the theme to the document's root element
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContextBlock.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContextBlock.Provider>
  );
};

export default ThemeContextComponent;
