// app/components/Checkbox.tsx
"use client";
import React from "react";
import {
  Checkbox as MuiCheckbox,
  CheckboxProps as MuiCheckboxProps,
  FormControlLabel,
  FormControlLabelProps,
  FormHelperText,
  Box,
} from "@mui/material";

export interface CheckboxProps
  extends Omit<MuiCheckboxProps, "onChange" | "value"> {
  label?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
  labelPlacement?: FormControlLabelProps["labelPlacement"];
  className?: string;
  sx?: MuiCheckboxProps["sx"];
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  onChange,
  helperText,
  error = false,
  disabled = false,
  labelPlacement = "end",
  className,
  sx,
  ...props
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  const checkboxElement = (
    <MuiCheckbox
      checked={checked}
      onChange={handleChange}
      disabled={disabled}
      color={error ? "error" : "primary"}
      sx={{
        color: error ? "error.main" : "primary.main",
        "&.Mui-checked": {
          color: error ? "error.main" : "primary.main",
        },
        "&.Mui-disabled": {
          color: "action.disabled",
        },
        ...sx,
      }}
      {...props}
    />
  );

  return (
    <Box className={className}>
      {label ? (
        <FormControlLabel
          control={checkboxElement}
          label={label}
          labelPlacement={labelPlacement}
          disabled={disabled}
          sx={{
            margin: 0,
            "& .MuiFormControlLabel-label": {
              fontSize: "0.875rem",
              color: disabled ? "text.disabled" : "text.primary",
            },
            "& .MuiFormControlLabel-label.Mui-disabled": {
              color: "text.disabled",
            },
          }}
        />
      ) : (
        checkboxElement
      )}

      {helperText && (
        <FormHelperText error={error} sx={{ mt: 0.5, mx: 0 }}>
          {helperText}
        </FormHelperText>
      )}
    </Box>
  );
};

export default Checkbox;
