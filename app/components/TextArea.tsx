"use client";

import React from "react";

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  className?: string;
}

const TextArea: React.FC<TextAreaProps> = ({
  label = "Notas (opcional)",
  value,
  onChange,
  placeholder = "Escriba algo...",
  rows = 3,
  error,
  className = "",
}) => {
  return (
    <div className={`flex flex-col w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium leading-none text-gray_m dark:text-white">
          {label}
        </label>
      )}

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full h-full rounded-md border-1 border-gray_xl dark:border-gray_m bg-white dark:bg-white text-gray_b shadow-sm
          px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus:shadow-lg focus:shadow-gray_xl
          dark:focus:shadow-gray_m resize-none ${error ? "border-red_m" : ""}`}
      />

      {error && (
        <p className="text-sm text-red_b flex items-center gap-1 dark:text-red_m mt-1">
          <span className="h-4 w-4">×</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default TextArea;
