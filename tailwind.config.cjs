import colors from 'tailwindcss/colors';
import typography from '@tailwindcss/typography';
import daisyui from 'daisyui';
import plugin from 'tailwindcss/plugin';

const lightTheme = daisyui?.themes?.['[data-theme=light]'] || {};
const darkTheme = daisyui?.themes?.['[data-theme=dark]'] || {};

export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './src/index.css'],
  theme: {
    extend: {
      colors: {
        'gray-75': '#f6f7f8',
        'gray-150': '#ecedf0',
        'gray-925': '#0d162b',
        'primary-inactive': '#00527c',
      },
    },
    fontFamily: {
      sans: ['source sans pro'],
      body: ['source sans pro'],
    },
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
  },
  daisyui: {
    styled: true,
    base: true,
    utils: true,
    logs: true,
    rtl: false,
    prefix: '',
    themes: [
      {
        light: {
          ...lightTheme,
          primary: '#2c7aba',
          'primary-focus': '',
          'primary-content': '#ffffff',
          'primary-inactive': '#00527c',
          secondary: '#F9FAFB',
          'secondary-focus': '',
          'secondary-content': '#ffffff',
          neutral: '#9ca3af',
          'neutral-focus': '',
          'neutral-content': '#ffffff',
          'base-content': '#333',
        },
      },
      {
        dark: {
          ...darkTheme,
          primary: '#2c7aba',
          'primary-focus': '',
          'primary-content': '#ffffff',
          'primary-inactive': '#00527c',
          secondary: '#111827',
          'secondary-focus': '',
          'secondary-content': '#ffffff',
          neutral: '#3f3f3f',
          'neutral-focus': '',
          'neutral-content': '#ffffff',
          'base-content': '#ddd',
        },
      },
    ],
  },
  plugins: [
    typography,
    daisyui,
    plugin(function ({ addComponents, theme }) {
      addComponents({
        '.btn-primary-inactive': {
          backgroundColor: theme('colors.primary-inactive'),
          color: theme('colors.white'),
          '&:hover': {
            backgroundColor: theme('colors.primary-inactive'),
            filter: 'brightness(0.9)',
          },
        },
      });
    }),
  ],
};
