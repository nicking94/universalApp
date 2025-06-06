"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { parseISO } from "date-fns";
import { es } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  value?: string;
  onChange: (date?: string) => void;
  error?: string;
  isClearable?: boolean;
  label?: string;
  placeholderText?: string;
}

const CustomDatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  error,
  isClearable = false,
  label = "Fecha de vencimiento",
  placeholderText = "Seleccionar fecha de vencimiento...",
}) => {
  const [startDate, setStartDate] = useState<Date | null>(
    value ? parseISO(value) : null
  );

  const handleChange = (date: Date | null) => {
    setStartDate(date);
    onChange(date ? date.toISOString() : undefined);
  };

  return (
    <div className="flex flex-col w-full">
      {label && (
        <label className="block text-sm font-medium leading-none text-gray_m dark:text-white mb-1">
          {label}
        </label>
      )}

      <div className="relative w-full">
        <DatePicker
          selected={startDate}
          onChange={handleChange}
          dateFormat="dd-MM-yyyy"
          minDate={new Date()}
          locale={es}
          placeholderText={placeholderText}
          isClearable={false}
          className={`focus:shadow-lg focus:shadow-gray_xl dark:focus:shadow-gray_m border-1 border-gray_xl
            w-full rounded-md  bg-white dark:bg-white text-black shadow-sm
            text-sm ring-offset-background focus-visible:outline-none 
         pl-10 pr-10 py-2
            ${error ? "border-red_m" : ""}
             
          `}
        />
        <div className="absolute top-2.5 left-3 text-gray_m pointer-events-none">
          <CalendarIcon className="h-4 w-4" />
        </div>
        {isClearable && startDate && (
          <X
            className="absolute right-3 top-2.5 h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer text-gray_m"
            onClick={(e) => {
              e.stopPropagation();
              handleChange(null);
            }}
          />
        )}
      </div>

      {error && (
        <p className="text-sm text-red_b flex items-center gap-1 dark:text-red_m mt-1">
          <X className="h-4 w-4" />
          {error}
        </p>
      )}
    </div>
  );
};

export default CustomDatePicker;
