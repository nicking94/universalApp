"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";

interface InputCashProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  border?: string;
  textPosition?: string;
}

const InputCash: React.FC<InputCashProps> = ({
  value,
  onChange,
  label,
  placeholder = "$0,00",
  disabled = false,
  border = "border-1 border-gray_xl",
  textPosition = "text-start",
}) => {
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplayValue = useCallback((num: number): string => {
    if (num === 0) return "";

    // Formatear con separadores de miles y coma decimal
    const parts = num.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",");
  }, []);

  const parseInputValue = useCallback((input: string): number => {
    if (input === "") return 0;

    // Eliminar todos los puntos (separadores de miles)
    const withoutThousandsSeparators = input.replace(/\./g, "");
    // Reemplazar coma decimal por punto
    const withDecimalPoint = withoutThousandsSeparators.replace(/,/g, ".");

    return parseFloat(withDecimalPoint) || 0;
  }, []);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatDisplayValue(value));
    }
  }, [value, isFocused, formatDisplayValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    if (inputValue === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    // Validar el formato del input
    if (/^[\d.,]*$/.test(inputValue)) {
      // Contar comas y puntos
      const commaCount = (inputValue.match(/,/g) || []).length;

      // Permitir solo una coma decimal y múltiples puntos como separadores de miles
      if (commaCount > 1) {
        return;
      }

      // Si hay una coma, debe ser el separador decimal
      if (commaCount === 1 && inputValue.indexOf(",") < inputValue.length - 3) {
        return;
      }

      setDisplayValue(inputValue);
      const numericValue = parseInputValue(inputValue);
      onChange(numericValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    setDisplayValue(value === 0 ? "" : value.toString().replace(".", ","));
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numericValue = parseInputValue(displayValue);
    setDisplayValue(formatDisplayValue(numericValue));
    onChange(numericValue);
  };

  return (
    <div className={`w-full flex flex-col`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm w-full">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={`${textPosition} w-full focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m bg-white p-2 rounded-sm placeholder:text-gray_l outline-none text-gray_b ${border} h-[2.35rem] max-h-[2.35rem]`}
          aria-label={label || "Monto monetario"}
        />
      </div>
    </div>
  );
};

export default InputCash;
