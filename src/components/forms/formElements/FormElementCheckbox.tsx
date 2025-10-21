import React from 'react';

type Props = {
  placeholder?: string;
  label: string;
  value: string;
  name: string;
  checked?: boolean; // Make checked optional
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  customClass?: string;
  labelClassName?: string;
  isInvalid?: boolean;
  errorMessage?: string;
  readOnly?: boolean;
  icon?: React.ReactNode;
};

const FormElementCheckbox: React.FC<Props> = ({
  placeholder,
  label,
  value,
  name,
  checked, // Change to checked
  onChange,
  className,
  customClass,
  labelClassName,
  isInvalid = false,
  errorMessage,
  readOnly = false,
  icon
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <label className={`table-checkbox-container ${customClass}`} htmlFor={name}>
        <div className="relative">
          <input
            type="checkbox"
            className="table-checkbox"
            id={name}
            name={name}
            checked={checked} // Change to checked
            value={value}
            onChange={onChange}
            readOnly={readOnly}
          />
          <span className="table-checkbox-checkmark"></span>
        </div>
        <span className={labelClassName}>{label}</span>
      </label>
      {isInvalid && (
        <div
          role="alert"
          className="alert alert-error w-auto rounded-lg p-3 mt-3 ml-[138px] text-sm"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
};

export default FormElementCheckbox;
