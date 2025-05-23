"use client";
import { InputProps } from "../lib/types/types";

const Input: React.FC<InputProps> = ({
  label,
  colorLabel = "text-gray_m dark:text-white",
  type,
  name,
  value,
  readOnly = false,
  onChange = () => {},
  placeholder,

  accept,
  autoFocus = false,
  ref,
  border = "border-1 border-gray_xl",
  textPosition = "text-start",
}) => {
  return (
    <div className="w-full">
      <label
        className={`${colorLabel} block text-sm font-semibold`}
        htmlFor={name}
      >
        {label}
      </label>
      <div className="flex gap-4">
        <input
          ref={ref}
          autoFocus={autoFocus}
          type={type}
          name={name}
          value={value}
          onChange={readOnly ? undefined : onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          accept={accept}
          className={`${textPosition} focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m w-full bg-white p-2 rounded-sm placeholder:text-gray_l outline-none text-gray_b ${border} h-[2.35rem] max-h-[2.35rem]`}
        />
      </div>
    </div>
  );
};

export default Input;
