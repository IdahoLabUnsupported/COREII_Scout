import React, { useRef, useState } from 'react';
import ButtonBasic from '../../elements/ButtonBasic.tsx';

type Props = {
  placeholder?: string;
  className?: string;
  /**
  * Button label
  */
  buttonLabel: string;
  /**
  * Optional click handler
  */
  onClick?: (event: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  /**
  * File change handler to communicate the file to the parent component
  */
  onFileChange?: (file: File) => void;
  /**
  * Input label for accessibility
  */
  label: string;
};

const FormElementFileInput: React.FC<Props> = ({
  placeholder,
  className,
  buttonLabel = 'Browse',
  onClick,
  onFileChange,
  label,
}) => {
  const [filename, setFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleButtonClick = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    if (onClick) {
      onClick(event);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setFilename(file.name); // Update the filename state
      if (onFileChange) {
        onFileChange(file); // Notify parent component about the selected file
      }
    }
  };

  return (
    <div className={`input-group flex items-center ${className}`}>
      {/* Accessible label */}
      <label htmlFor="file-upload" className="sr-only">{label}</label>
      <ButtonBasic
        label={buttonLabel}
        color="btn-secondary"
        additionalClasses="join-item rounded-r-none z-10"
        onClick={handleButtonClick}
      />
      <input
        type="file"
        id="file-upload"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Text input to display the selected file */}
      <input
        type="text"
        value={filename}
        readOnly
        placeholder={placeholder}
        className="
          input
          input-bordered
          input-secondary
          join-item
          w-full
          bg-gray-300
          dark:bg-gray-800
          rounded-l-none
          border-solid
          border-gray-400
          dark:!border-gray-400
          -ml-[1px]
          focus:z-20
          text-sm
          placeholder-gray-600
          dark:placeholder-gray-500
        "
        onClick={handleButtonClick}
      />
    </div>
  );
};

export default FormElementFileInput;
