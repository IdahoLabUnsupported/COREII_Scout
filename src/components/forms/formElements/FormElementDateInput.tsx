import React from 'react';

type Props = {
  placeholder?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  isInvalid?: boolean;
  isWarning?: boolean;
  errorMessage?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
};

const FormElementDateInput: React.FC<Props> = ({
  placeholder,
  label,
  value,
  onChange,
  className,
  isInvalid = false,
  isWarning = false,
  errorMessage,
  readOnly = false,
  icon
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-[7rem_1fr] gap-x-4 w-full ${className}`}>
      <div className="flex items-center w-32">
        <label className={`${!icon ? 'mr-4' : ''} w-full`}>{label}</label>
        {icon && <div className="scale-50 material-icons">{icon}</div>}
      </div>

      <div className="w-full">
        <input
          type="date"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
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
        {(isInvalid || isWarning) && (
          <div 
            role="alert" 
            className={`alert ${isInvalid ? 'alert-error' : 'alert-warning'} w-auto rounded-lg p-3 mt-3 text-sm`}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default FormElementDateInput;
