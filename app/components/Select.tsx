"use client";
import React from "react";
import {
  FormControl,
  InputLabel,
  Select as MuiSelect,
  MenuItem,
  FormHelperText,
  SelectProps as MuiSelectProps,
  SelectChangeEvent,
  useTheme,
  IconButton,
  Box,
} from "@mui/material";
import { Delete } from "@mui/icons-material";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

export interface SelectOptionMetadata {
  id?: string | number;
  [key: string]: unknown;
}

export interface SelectOption<T = string | number, M = SelectOptionMetadata> {
  value: T;
  label: string;
  disabled?: boolean;
  deletable?: boolean;
  metadata?: M;
}

export interface SelectProps<T = string | number, M = SelectOptionMetadata>
  extends Omit<MuiSelectProps, "onChange" | "value"> {
  label: string;
  options: SelectOption<T, M>[];
  value: T;
  onChange: (value: T) => void;
  onDeleteOption?: (option: SelectOption<T, M>) => void;
  helperText?: string;
  error?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  variant?: "outlined" | "filled" | "standard";
  showDeleteButton?: boolean;
  getOptionId?: (option: SelectOption<T, M>) => string | number | undefined;
}

function Select<T = string | number, M = SelectOptionMetadata>({
  label,
  options,
  value,
  onChange,
  onDeleteOption,
  helperText,
  error = false,
  fullWidth = true,
  size = "small",
  variant = "outlined",
  showDeleteButton = false,
  getOptionId,
  sx,
  ...props
}: SelectProps<T, M>): React.JSX.Element {
  const theme = useTheme();

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    onChange(event.target.value as T);
  };

  const handleDelete = (
    event: React.MouseEvent,
    option: SelectOption<T, M>
  ) => {
    event.stopPropagation();
    if (onDeleteOption) {
      onDeleteOption(option);
    }
  };

  const labelId = `${label}-label`;

  const shouldShowDeleteButton = (option: SelectOption<T, M>) => {
    return showDeleteButton && onDeleteOption && option.deletable !== false;
  };

  const getOptionKey = (option: SelectOption<T, M>) => {
    if (getOptionId) {
      const id = getOptionId(option);
      if (id !== undefined) return `${id}`;
    }

    if (
      option.metadata &&
      typeof option.metadata === "object" &&
      "id" in option.metadata
    ) {
      return `${option.metadata.id}`;
    }

    return String(option.value);
  };

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      variant={variant}
      sx={{
        minWidth: 120,
        ...sx,
      }}
    >
      <InputLabel
        id={labelId}
        sx={{
          color: theme.palette.text.secondary,
          "&.Mui-focused": {
            color: theme.palette.primary.main,
          },
        }}
      >
        {label}
      </InputLabel>
      <MuiSelect
        value={value}
        onChange={handleChange}
        labelId={labelId}
        label={label}
        sx={{
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor:
              theme.palette.mode === "dark"
                ? theme.palette.grey[700]
                : theme.palette.grey[400],
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: theme.palette.primary.main,
          },
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.primary,
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.primary,
              "& .MuiMenuItem-root": {
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                },
                "&.Mui-selected:hover": {
                  backgroundColor: theme.palette.action.selected,
                },
              },
            },
          },
        }}
        {...props}
      >
        {options.map((option) => {
          const showDelete = shouldShowDeleteButton(option);

          return (
            <MenuItem
              key={getOptionKey(option)}
              value={option.value as string | number}
              disabled={option.disabled}
              sx={{
                padding: 0,
                minHeight: "48px",
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                },
                "&.Mui-selected:hover": {
                  backgroundColor: theme.palette.action.selected,
                },
              }}
            >
              {/* Contenedor interno que ocupa todo el espacio */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  width: "100%",
                  padding: "8px",
                  maxHeight: "2.4vh",
                  boxSizing: "border-box",
                }}
              >
                {/* Texto a la izquierda - ocupa todo el espacio posible */}
                <Box
                  sx={{
                    flex: 1,
                    textAlign: "left",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: showDelete ? "8px" : 0,
                    display: "flex",
                    alignItems: "center",
                    minHeight: "36px",
                  }}
                >
                  {option.label}
                </Box>

                {showDelete && (
                  <CustomGlobalTooltip title="Eliminar">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDelete(e, option)}
                      sx={{
                        color: theme.palette.error.main,
                        flexShrink: 0,
                        transition: "transform 0.2s, background-color 0.2s",
                        "&:hover": {
                          backgroundColor: theme.palette.error.light,
                          transform: "scale(1.1)",
                        },
                        padding: "4px",
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </CustomGlobalTooltip>
                )}
              </Box>
            </MenuItem>
          );
        })}
      </MuiSelect>
      {helperText && (
        <FormHelperText
          sx={{
            color: error
              ? theme.palette.error.main
              : theme.palette.text.secondary,
          }}
        >
          {helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
}

export default Select;
