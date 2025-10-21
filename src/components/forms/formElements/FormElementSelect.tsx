import React from 'react';

export type SelectedItemType = {
  value: any;
  label: string;
};

type Props = {
  /**
   * Label for the select element, used for accessibility
   */
  label: string;
  /**
   * Array of options for the select dropdown
   */
  options: Array<SelectedItemType>;
  /**
   * Optional additional class names for custom styling
   */
  className?: string;
  /**
   * Additional classes for the select element
   */
  additionalClasses?: string;
  /**
   * Class name for the label
   */
  labelClassName: string;
  /**
   * Size of the select element (optional)
   */
  selectSize?: string;
  /**
   * Color classes for the select element
   */
  color?: string;
  /**
   * Key to identify the select component (optional)
   */
  selectKey?: any;
  /**
   * Currently selected value for the select element
   */
  value?: any;
  /**
   * Placeholder value for the select dropdown
   */
  placeholder?: string;

  /**
   * Function to handle changes in the select element
   */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>, selectKey?: any) => void;
};

const FormElementSelect: React.FC<Props> = ({
  label,
  className,
  additionalClasses,
  options,
  labelClassName,
  selectSize,
  color,
  selectKey,
  value = '',  // Default value

  placeholder = 'Please select...', // Placeholder default
  onChange
}) => {

  // Define base classes for the select element
  const baseClasses = `${color} ${selectSize} select select-bordered input-secondary w-full bg-gray-300 dark:bg-gray-800`;

  const lightModeClasses = '!border !border-solid !border-gray-400';
  const darkModeClasses = 'dark:border dark:border-solid dark:!border-gray-400 dark:text-gray-300';

  const selectClass = `${baseClasses} ${lightModeClasses} ${darkModeClasses} ${additionalClasses}`;

  // Generate unique id based on the label for accessibility
  const selectId = `select-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={`flex items-center ${className}`}>
      {/* Accessible label, positioned next to the select element */}
      <label htmlFor={selectId} className={labelClassName}>{label}</label>
      <select
          id={selectId}
          key={selectKey}
          className={`${selectClass} ${value === '' ? 'text-gray-500' : 'text-black'}`} // Change color based on value
          value={value} // Bind select element to the value prop
          onChange={(e) => {
              if (onChange) {
                  onChange(e, selectKey);
              }
          }}
      >
          {/* Placeholder option */}
          <option value="" disabled hidden>
              {placeholder}
          </option>

          {/* Map through the options and render them */}
          {options.map((option, index) => (
              <option key={index} value={option.value}>
                  {option.label}
              </option>
          ))}
      </select>
    </div>
  );
};

export default FormElementSelect;
