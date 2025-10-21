import React from 'react';

type Props = {
  placeholder?: string;
  label?:string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  maxHeight?: string; // Add a maxHeight prop
  isInvalid?: boolean;
  errorMessage?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
};

const FormElementTextArea: React.FC<Props> = ({
  placeholder,
  label,
  value,
  onChange,
  className,
  rows = 5,
  maxHeight, // Use the maxHeight prop
  isInvalid = false,
  errorMessage,
  readOnly = false,
  icon
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center">
        {label && 
          <div className="w-36 flex">
            <label className={`${!icon ? 'mr-5' : ''}`}>{label}</label>
            {icon && <div className="scale-50 material-icons">{icon}</div>}
          </div>
        }
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={rows}
          style={{ maxHeight }} // Apply maxHeight if provided
          className={`
            textarea
            textarea-bordered
            textarea-secondary
            w-full
            bg-gray-300
            dark:bg-gray-800
            py-2
            px-3.5
            rounded
            ${isInvalid ? 'border-4 !border-red-500' : 'border-gray-400 dark:!border-gray-400'} ${readOnly ? 'cursor-not-allowed' : ''}
            placeholder-gray-600
            dark:placeholder-gray-500
          `}
        />
      </div>
      {isInvalid && <div role="alert" className={`alert alert-error w-auto rounded-lg p-3 mt-3 ${label ? 'ml-[138px]' : ''} text-sm`}>{errorMessage}</div>}
    </div>
  );
};

export default FormElementTextArea;
