"use client";

import React from "react";
import {
  TextField,
  FormControl,
  FormLabel,
  FormHelperText,
  Box,
  useTheme,
} from "@mui/material";
import { styled } from "@mui/material/styles";

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  error?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  variant?: "outlined" | "filled" | "standard";
}

// Styled component para personalizar el TextField
const StyledTextField = styled(TextField)(({ theme, error }) => ({
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.background.paper,
    transition: "all 0.2s ease-in-out",

    "&:hover": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: error
          ? theme.palette.error.main
          : theme.palette.primary.main,
      },
    },

    "&.Mui-focused": {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: error
          ? theme.palette.error.main
          : theme.palette.primary.main,
        borderWidth: 2,
      },
      boxShadow: `0 0 0 3px ${
        error ? theme.palette.error.light : theme.palette.primary.light
      }20`,
    },

    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: error ? theme.palette.error.main : theme.palette.divider,
    },
  },

  "& .MuiInputBase-input": {
    fontSize: "0.875rem",
    color: theme.palette.text.primary,
    resize: "vertical",

    "&::placeholder": {
      color: theme.palette.text.secondary,
      opacity: 0.7,
    },
  },

  "& .MuiFormLabel-root": {
    fontSize: "0.875rem",
    fontWeight: 500,

    "&.Mui-focused": {
      color: error ? theme.palette.error.main : theme.palette.primary.main,
    },

    "&.Mui-error": {
      color: theme.palette.error.main,
    },
  },
}));

const TextArea: React.FC<TextAreaProps> = ({
  label = "Notas (opcional)",
  value,
  onChange,
  placeholder = "Escriba algo...",
  rows = 3,
  error,
  className = "",
  disabled = false,
  required = false,
  fullWidth = true,
  variant = "outlined",
}) => {
  const theme = useTheme();

  return (
    <Box
      className={className}
      sx={{
        width: fullWidth ? "100%" : "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <FormControl fullWidth={fullWidth} error={!!error} disabled={disabled}>
        {label && (
          <FormLabel
            sx={{
              mb: 1,
              color: "text.primary",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            {label}
            {required && (
              <Box component="span" sx={{ color: "error.main", ml: 0.5 }}>
                *
              </Box>
            )}
          </FormLabel>
        )}

        <StyledTextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          multiline
          error={!!error}
          disabled={disabled}
          required={required}
          fullWidth={fullWidth}
          variant={variant}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontSize: "0.875rem",
              alignItems: "flex-start",
            },
            "& .MuiInputBase-inputMultiline": {
              minHeight: `${rows * 24}px`,
              color: theme.palette.text.primary,
            },
          }}
        />

        {error && (
          <FormHelperText
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              mt: 0.5,
              fontSize: "0.75rem",
              color: "error.main",
            }}
          >
            <Box
              component="span"
              sx={{
                fontSize: "1rem",
                lineHeight: 1,
              }}
            >
              ×
            </Box>
            {error}
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
};

export default TextArea;
