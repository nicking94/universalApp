"use client";
import { useEffect, useRef, useState } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import {
  QrCodeScanner as BarcodeIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
  onScanComplete?: (code: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onButtonClick?: () => void;
  buttonTitle?: string;
  buttonDisabled?: boolean;
}

export default function BarcodeScanner({
  value,
  onChange,
  onScanComplete,
  placeholder = "Escanear o ingresar código manualmente",
  className = "",
  disabled = false,
  onButtonClick,
  buttonTitle = "Generar código EAN-13",
  buttonDisabled = false,
}: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputTimeRef = useRef<number>(0);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(navigator.platform.includes("Mac"));

    const timer = setTimeout(
      () => {
        if (inputRef.current && !disabled) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      },
      isMac ? 200 : 100
    );

    return () => clearTimeout(timer);
  }, [isMac, disabled]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const now = Date.now();

    onChange(newValue);

    const minLength = isMac ? 3 : 8;
    const timeThreshold = isMac ? 100 : 30;

    if (newValue.length >= minLength) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const isScannerInput = now - lastInputTimeRef.current < timeThreshold;

      timeoutRef.current = setTimeout(
        () => {
          if (onScanComplete) {
            onScanComplete(newValue);
            if (inputRef.current) {
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                  inputRef.current.focus();
                }
              }, 50);
            }
          }
        },
        isMac ? 150 : isScannerInput ? 50 : 500
      );
    }

    lastInputTimeRef.current = now;
  };

  const handleMacKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMac && e.key === "Enter" && value.length >= 3) {
      e.preventDefault();
      if (onScanComplete) {
        onScanComplete(value);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    }
  };

  const handleFocus = () => {
    if (inputRef.current) {
      inputRef.current.select();
    }
  };

  return (
    <TextField
      type="text"
      inputRef={inputRef}
      value={value}
      onChange={handleBarcodeChange}
      onKeyDown={handleMacKeyDown}
      onFocus={handleFocus}
      placeholder={placeholder}
      autoFocus={!disabled}
      disabled={disabled}
      fullWidth
      size="small"
      className={className}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <BarcodeIcon fontSize="small" />
          </InputAdornment>
        ),
        endAdornment: onButtonClick ? (
          <InputAdornment position="end">
            <CustomGlobalTooltip title={buttonTitle}>
              <IconButton
                onClick={onButtonClick}
                disabled={buttonDisabled || disabled}
                size="medium"
                sx={{
                  marginRight: "8px",
                  padding: "4px",
                  borderRadius: "4px",
                  backgroundColor: "primary.main",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  "&.Mui-disabled": {
                    backgroundColor: "grey.400",
                    color: "grey.600",
                  },
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </CustomGlobalTooltip>
          </InputAdornment>
        ) : undefined,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          paddingRight: onButtonClick ? "0px" : undefined,
        },
      }}
    />
  );
}
