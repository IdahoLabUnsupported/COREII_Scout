// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import { useContext } from 'react';
import { ThemeContextBlock } from './ThemeContextBlock'; // Ensure the path is correct

export const useTheme = () => useContext(ThemeContextBlock);
