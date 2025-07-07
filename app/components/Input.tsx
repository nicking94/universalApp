"use client";
import { InputProps } from "../lib/types/types";

const Input: React.FC<InputProps & { icon?: React.ReactNode }> = ({
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
  icon,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          className={`${colorLabel} block text-sm font-semibold mb-1`}
          htmlFor={name}
        >
          {label}
        </label>
      )}

      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray_m">
            {icon}
          </div>
        )}

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
          className={`${textPosition} ${
            icon ? "pl-10" : "pl-3"
          }  focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m w-full bg-white p-2 rounded-sm placeholder:text-gray_l outline-none text-gray_b ${border} h-[2.42rem] max-h-[2.42rem]`}
        />
      </div>
    </div>
  );
};

export default Input;
