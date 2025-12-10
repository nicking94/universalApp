"use client";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { es } from "date-fns/locale";
import { TextField, IconButton, Box, useTheme } from "@mui/material";
import { parseISO, format, isValid } from "date-fns";
import { useMemo, useState } from "react";
import { PickersActionBarAction } from "@mui/x-date-pickers";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

interface CustomDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  isClearable?: boolean;
  label?: string;
  placeholder?: string;
  enableAccessibleFieldDOMStructure?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  required?: boolean;
}

type DateValidationError =
  | "invalidDate"
  | "disableDate"
  | "disableFuture"
  | "disablePast"
  | "minDate"
  | "maxDate"
  | "shouldDisableDate"
  | "shouldDisableMonth"
  | "shouldDisableYear"
  | null;

const CustomDatePicker = ({
  value,
  onChange,
  isClearable = false,
  label,
  placeholder = "Seleccionar fecha",
  enableAccessibleFieldDOMStructure = false,
  minDate,
  maxDate,
  disabled = false,
  required = false,
}: CustomDatePickerProps) => {
  const theme = useTheme();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const parsedValue = useMemo(() => {
    return value && isValid(parseISO(value)) ? parseISO(value) : null;
  }, [value]);

  const hasValue = Boolean(value);

  const handleChange = (newValue: Date | null) => {
    if (newValue && isValid(newValue)) {
      onChange(format(newValue, "yyyy-MM-dd"));
      setError(null);
    } else {
      onChange("");
    }
    setOpen(false);
  };

  const handleError = (error: DateValidationError) => {
    switch (error) {
      case "invalidDate":
        setError("Fecha inválida");
        break;
      case "minDate":
        setError("La fecha no puede ser anterior a la fecha mínima");
        break;
      case "maxDate":
        setError("La fecha no puede ser posterior a la fecha máxima");
        break;
      case "disableDate":
      case "shouldDisableDate":
        setError("Esta fecha no está disponible");
        break;
      case "disableFuture":
        setError("No se permiten fechas futuras");
        break;
      case "disablePast":
        setError("No se permiten fechas pasadas");
        break;
      default:
        setError(null);
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = parseISO(dateString);
      if (isValid(date)) {
        return format(date, "dd/MM/yyyy");
      }
    } catch {
      return "";
    }
    return "";
  };

  const slotProps = useMemo(() => {
    const baseProps = {
      textField: {
        size: "small" as const,
        fullWidth: true,
        error: !!error,
        helperText: error,
      },
      actionBar: {
        actions: [] as PickersActionBarAction[],
      },
    };

    if (isClearable) {
      return {
        ...baseProps,
        actionBar: {
          actions: ["clear"] as PickersActionBarAction[],
        },
      };
    }

    return baseProps;
  }, [isClearable, error]);

  const handleIconClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!disabled) {
      setOpen(true);
      setIsFocused(true);
    }
  };

  const handleTextFieldClick = () => {
    if (!disabled) {
      setOpen(true);
      setIsFocused(true);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const localeText = {
    clearButtonLabel: "Limpiar",
    todayButtonLabel: "Hoy",
    okButtonLabel: "Aceptar",
    cancelButtonLabel: "Cancelar",
    clear: "Limpiar",
    today: "Hoy",
    ok: "Aceptar",
    cancel: "Cancelar",
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Box
        sx={{
          position: "relative",
          display: "block",
          width: "100%",
        }}
      >
        <TextField
          fullWidth
          label={label}
          required={required}
          value={formatDisplayDate(value)}
          placeholder={isFocused || hasValue ? "" : placeholder}
          size="small"
          InputLabelProps={{
            shrink: true,
            sx: {
              color: disabled
                ? theme.palette.text.disabled
                : theme.palette.text.secondary,
              fontSize: "1rem",
              transform: "translate(14px, 9px) scale(1)",
              "&.MuiInputLabel-shrink": {
                transform: "translate(14px, -9px) scale(0.75)",
              },
              "&.Mui-focused": {
                color: disabled
                  ? theme.palette.text.disabled
                  : theme.palette.primary.main,
              },
            },
          }}
          InputProps={{
            readOnly: true,
            sx: {
              cursor: disabled ? "not-allowed" : "pointer",
              backgroundColor: theme.palette.background.paper,
              width: "100%",
              "& .MuiInputBase-input": {
                cursor: disabled ? "not-allowed" : "pointer",
                paddingRight: "40px",
                color: theme.palette.text.primary,
                width: "100%",
                "&.Mui-disabled": {
                  color: theme.palette.text.disabled,
                  WebkitTextFillColor: theme.palette.text.disabled,
                },
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: disabled
                  ? theme.palette.action.disabledBackground
                  : theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.23)"
                  : "rgba(0, 0, 0, 0.23)",
              },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: disabled
                  ? theme.palette.action.disabledBackground
                  : theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.4)"
                  : "rgba(0, 0, 0, 0.4)",
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: disabled
                  ? theme.palette.action.disabledBackground
                  : theme.palette.primary.main,
                borderWidth: "2px",
              },
              "&.Mui-disabled": {
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: theme.palette.action.disabledBackground,
                },
              },
            },
            endAdornment: (
              <CustomGlobalTooltip title="Seleccionar fecha">
                <IconButton
                  onClick={handleIconClick}
                  disabled={disabled}
                  onBlur={handleBlur}
                  sx={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    padding: "4px",
                    color: disabled ? "action.disabled" : "action.active",
                    "&:hover": {
                      backgroundColor: disabled
                        ? "transparent"
                        : "action.hover",
                    },
                    "&.Mui-disabled": {
                      color: "action.disabled",
                    },
                  }}
                >
                  <CalendarTodayIcon fontSize="small" />
                </IconButton>
              </CustomGlobalTooltip>
            ),
          }}
          onClick={handleTextFieldClick}
          onBlur={handleBlur}
          error={!!error}
          helperText={error}
          disabled={disabled}
          sx={{
            width: "100%",
            minWidth: "150px",
            "& .MuiInputBase-root": {
              cursor: disabled ? "not-allowed" : "pointer",
              paddingRight: "0px",
              width: "100%",
            },
            "& .MuiFormHelperText-root": {
              color: error
                ? theme.palette.error.main
                : theme.palette.text.secondary,
              marginLeft: 0,
            },
          }}
        />

        <DatePicker
          value={parsedValue}
          onChange={handleChange}
          onError={handleError}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          open={open}
          onClose={() => {
            setOpen(false);
            setIsFocused(false);
          }}
          onOpen={() => setOpen(true)}
          enableAccessibleFieldDOMStructure={enableAccessibleFieldDOMStructure}
          format="dd/MM/yyyy"
          localeText={localeText}
          slots={{
            textField: () => null,
          }}
          slotProps={{
            ...slotProps,
            popper: {
              placement: "bottom-start",
            },
            actionBar: {
              actions: isClearable ? ["clear"] : [],
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
};

export default CustomDatePicker;
