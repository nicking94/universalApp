"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  TextField,
  InputAdornment,
  FormControl,
  useTheme,
} from "@mui/material";
import { AttachMoney } from "@mui/icons-material";

interface InputCashProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  allowNegative?: boolean;
  maxDecimals?: number;
}

const InputCash: React.FC<InputCashProps> = ({
  value,
  onChange,
  label,
  placeholder = "$0,00",
  disabled = false,
  allowNegative = false,
  maxDecimals = 2,
}) => {
  const theme = useTheme();
  const [displayValue, setDisplayValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousValueRef = useRef<number>(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const formatNumber = useCallback(
    (num: number): string => {
      if (num === 0) return "";

      const isNegative = num < 0;
      const absoluteValue = Math.abs(num);
      const parts = absoluteValue.toFixed(maxDecimals).split(".");
      const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      const decimalPart = parts[1] || "00";

      const formatted =
        decimalPart === "00" ? integerPart : `${integerPart},${decimalPart}`;

      return isNegative ? `-${formatted}` : formatted;
    },
    [maxDecimals]
  );

  const parseInput = useCallback(
    (input: string): number => {
      if (!input || input.trim() === "" || input === "-") return 0;

      let isNegative = false;
      let cleanInput = input.trim();

      if (cleanInput.startsWith("-")) {
        if (!allowNegative) return 0;
        isNegative = true;
        cleanInput = cleanInput.substring(1);
      }

      if (cleanInput === "") return 0;
      cleanInput = cleanInput.replace(/\./g, "");
      cleanInput = cleanInput.replace(/,/g, ".");
      const number = parseFloat(cleanInput);
      if (isNaN(number)) return 0;

      const factor = 10 ** maxDecimals;
      const rounded = Math.round(number * factor) / factor;

      return isNegative ? -rounded : rounded;
    },
    [allowNegative, maxDecimals]
  );

  const formatInputWhileTyping = useCallback(
    (input: string): string => {
      if (input === "" || input === "-") return input;

      if (input.includes(",")) {
        const [integerPart, decimalPart] = input.split(",");

        const limitedDecimal = decimalPart
          ? decimalPart.slice(0, maxDecimals)
          : "";

        if (integerPart) {
          const cleanInteger = integerPart.replace(/\./g, "");
          const formattedInteger = cleanInteger.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
          );
          return decimalPart
            ? `${formattedInteger},${limitedDecimal}`
            : `${formattedInteger},`;
        }

        return decimalPart ? `0,${limitedDecimal}` : "0,";
      }

      const cleanInput = input.replace(/\./g, "");
      if (cleanInput === "") return "";

      return cleanInput.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    },
    [maxDecimals]
  );

  useEffect(() => {
    if (!isFocused) {
      const formatted = formatNumber(value);
      setDisplayValue(formatted);
      previousValueRef.current = value;
    }
  }, [value, isFocused, formatNumber]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (!/^[-0-9.,]*$/.test(inputValue)) {
        return;
      }

      if (inputValue.startsWith("-") && !allowNegative) {
        return;
      }

      const commaCount = (inputValue.match(/,/g) || []).length;
      if (commaCount > 1) {
        return;
      }

      const formatted = formatInputWhileTyping(inputValue);
      setDisplayValue(formatted);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        const parsed = parseInput(formatted);
        if (parsed !== previousValueRef.current) {
          previousValueRef.current = parsed;
          onChange(parsed);
        }
      }, 50);
    },
    [onChange, allowNegative, formatInputWhileTyping, parseInput]
  );

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    const parsed = parseInput(displayValue);

    if (!allowNegative && parsed < 0) {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const formatted = formatNumber(parsed);
    setDisplayValue(formatted);

    if (parsed !== value) {
      onChange(parsed);
    }
  }, [displayValue, onChange, allowNegative, parseInput, formatNumber, value]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (displayValue) {
      const cleanValue = displayValue.replace(/\./g, "");
      setDisplayValue(cleanValue);
    }
  }, [displayValue]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        [
          "Tab",
          "Enter",
          "ArrowLeft",
          "ArrowRight",
          "Home",
          "End",
          "Backspace",
          "Delete",
        ].includes(e.key)
      ) {
        return;
      }

      if (!/[\d.,-]/.test(e.key)) {
        e.preventDefault();
        return;
      }

      if (e.key === "-" && !allowNegative) {
        e.preventDefault();
        return;
      }

      if ((e.key === "," || e.key === ".") && displayValue.includes(",")) {
        e.preventDefault();
        return;
      }

      if (e.key === ".") {
        e.preventDefault();
        const newValue = displayValue + ",";
        setDisplayValue(newValue);
      }
    },
    [allowNegative, displayValue]
  );

  return (
    <FormControl fullWidth variant="outlined">
      <TextField
        inputRef={inputRef}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        label={label}
        error={!allowNegative && value < 0}
        helperText={
          !allowNegative && value < 0
            ? "No se permiten valores negativos"
            : undefined
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <AttachMoney />
            </InputAdornment>
          ),
          sx: {
            backgroundColor: theme.palette.background.paper,
            "& .MuiOutlinedInput-input": {
              color: theme.palette.text.primary,
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
            },
          },
        }}
        variant="outlined"
        size="small"
        fullWidth
        inputProps={{
          inputMode: "decimal",
          style: {
            letterSpacing: "0.5px",
            fontFamily: "'Roboto Mono', monospace",
          },
        }}
      />
    </FormControl>
  );
};

export default InputCash;
