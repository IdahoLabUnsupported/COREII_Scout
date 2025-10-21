import React from 'react';

type Props = {
  placeholder?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  readOnly?: boolean;
  type?: string;
  name?: string;
  id?: string;
  icon?: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledby?: string;
  ariaDescribedby?: string;
  step?: string;
  instructionalTip?: string;
};

const FormElementTextInput: React.FC<Props> = ({
  placeholder,
  label,
  value,
  onChange,
  onKeyDown,
  className,
  isInvalid = false,
  errorMessage,
  readOnly = false,
  type = "text",
  name,
  id,
  icon,
  ariaLabel,
  ariaLabelledby,
  ariaDescribedby,
  step,
  instructionalTip,
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-[7rem_1fr] gap-x-4 w-full ${className}`}>
      <div className="flex items-center w-32">
        <label htmlFor={id} className={`${!icon ? 'mr-4' : ''} w-full`}>{label}</label>
        {icon && <div className="scale-50 material-icons">{icon}</div>}
      </div>

      <div className="w-full">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          readOnly={readOnly}
          name={name}
          id={id}
          step={step}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          aria-invalid={isInvalid ? "true" : undefined}
          className={`
            input
            input-bordered
            input-secondary
            w-full
            bg-gray-300
            border-gray-400
            dark:bg-gray-900
            dark:border-gray-400
            text-sm
            ${isInvalid ? 'border-4 !border-red-500' : ''} ${readOnly ? 'cursor-not-allowed' : ''}
          `}
        />
      </div>

      {/* Empty div to align error message and instructional tip with the input */}
      <div></div>

      <div className="w-full">
        {isInvalid && (
          <div role="alert" className="alert alert-error w-auto rounded-lg p-3 mt-3 text-sm">
            {errorMessage}
          </div>
        )}
        {instructionalTip && (
          <div className="text-white mt-2 text-sm">
            {instructionalTip}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormElementTextInput;
