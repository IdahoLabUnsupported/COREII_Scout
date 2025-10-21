// Copyright 2025, Battelle Energy Alliance, LLC. All Rights Reserved.

import React from 'react';
import { Link } from 'react-router-dom';

interface ButtonProps {
  /**
   * Button contents
   */
  label: string;
  /**
   * Icon to be displayed in the button
   */
  icon?: string;
  /**
   * What is the background color? Use classes.
   */
  color?: 'btn-primary' | 'btn-primary-inactive' | 'btn-secondary' | 'btn-ghost' | 'btn-error' | 'btn-accent';
  /**
   * What is the button size?
   */
  buttonSize?: string;
  /**
   * Optional link
   */
  link?: string;
  /**
   * Optional click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  /**
   * Optional additional classes
   */
  additionalClasses?: string;
  /**
   * Optional disabled state
   */
  disabled?: boolean;
  /**
   * Optional additional styles
   */
   title?: string;
  style?: React.CSSProperties;
}

const ButtonBasic: React.FC<ButtonProps> = ({ label, icon, color, buttonSize, link, onClick, additionalClasses, disabled, title, style }) => {
  // Define base classes
  const baseClasses = `btn ${color} ${buttonSize} uppercase hover:opacity-100 border-none ${disabled ? 'btn-disabled' : ''}`;

  // Define conditional light mode classes
  const lightModeClasses = color === 'btn-secondary' ? '!border !border-solid !border-primary text-primary' : '';

  // Define conditional dark mode classes
  const darkModeClasses = color === 'btn-secondary' ? 'dark:border dark:border-solid dark:!border-gray-400 dark:text-gray-300' : '';

  // Define custom text color and hover text color classes for btn-ghost, btn-primary, and btn-error
  const customTextColorClasses = color === 'btn-ghost'
    ? 'text-primary hover:text-primary'
    : color === 'btn-primary' || color === 'btn-primary-inactive' || color === 'btn-error' || color === 'btn-accent'
      ? 'text-white hover:text-white dark:text-white dark:hover:text-white'
      : 'hover:text-primary dark:hover:text-current';

  // Combine base classes and conditional classes
  const btnClass = `${baseClasses} ${lightModeClasses} ${darkModeClasses} ${customTextColorClasses} ${additionalClasses || ''}`;

  // Render icon and label together if both are provided
  const content = (
    <>
      {icon && <span className="material-icons icon-container">{icon}</span>}
      <span>{label}</span>
    </>
  );

  return (
    <>
      {link ? (
        <Link className={btnClass} to={link} style={style} title={title}>
          {content}
        </Link>
      ) : (
        <button className={btnClass} onClick={onClick} style={style} title={title} disabled={disabled}>
          {content}
        </button>
      )}
    </>
  );
};

export default ButtonBasic;
