"use client";
import React, { forwardRef, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
  SxProps,
  Theme,
} from "@mui/material";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

interface CustomButtonProps {
  text?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  title?: string;
  ariaLabel?: string;
  hotkey?: string;
  variant?: "contained" | "outlined" | "text";
  size?: "small" | "medium" | "large";
  fullWidth?: boolean;
  href?: string;
  target?: string;
  download?: string | boolean;
  sx?: SxProps<Theme>;
  color?:
    | "primary"
    | "secondary"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "inherit";
  autoFocusOnEnter?: boolean;
  isPrimaryAction?: boolean;
}

const Button = forwardRef<HTMLButtonElement, CustomButtonProps>(
  (
    {
      text,
      children,
      icon,
      iconPosition = "right",
      startIcon,
      endIcon,
      type = "button",
      onClick,
      disabled = false,
      loading = false,
      title,
      ariaLabel,
      hotkey,
      variant = "contained",
      size = "small",
      fullWidth = false,
      href,
      target,
      download,
      sx,
      color = "primary",
      isPrimaryAction = false,
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const combinedRef = (instance: HTMLButtonElement | null) => {
      if (typeof ref === "function") {
        ref(instance);
      } else if (ref) {
        ref.current = instance;
      }
      buttonRef.current = instance;
    };

    useHotkeys(
      "enter",
      (event) => {
        if (!disabled && !loading && onClick && isPrimaryAction) {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        }
      },
      {
        enabled: !disabled && !loading && !!onClick && isPrimaryAction,
        enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
        enableOnContentEditable: true,
        preventDefault: true,
        keydown: true,
        keyup: false,
        description: text ? `Botón primario: ${text}` : undefined,
      },
      [disabled, loading, onClick, isPrimaryAction]
    );

    useHotkeys(
      hotkey || "",
      (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (!disabled && !loading && onClick) {
          onClick();
        }
      },
      {
        enabled: !disabled && !loading && !!hotkey && !isPrimaryAction,
        enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
        enableOnContentEditable: true,
        preventDefault: true,
        keydown: true,
        keyup: false,
        splitKey: "+",
        description: text ? `Botón: ${text}` : undefined,
      },
      [disabled, loading, onClick, hotkey]
    );

    const buttonProps: Partial<MuiButtonProps> = {
      startIcon:
        startIcon ||
        (icon && iconPosition === "left" && !loading ? icon : undefined),
      endIcon:
        endIcon ||
        (icon && iconPosition === "right" && !loading ? icon : undefined),
    };

    if (loading) {
      if (iconPosition === "left" || startIcon) {
        buttonProps.startIcon = <CircularProgress size={16} />;
      } else {
        buttonProps.endIcon = <CircularProgress size={16} />;
      }
    }

    const buttonContent = children || text;
    const linkProps = href
      ? {
          href,
          target,
          download,
        }
      : {};

    const buttonElement = (
      <MuiButton
        variant={variant}
        color={color}
        size={size}
        type={type as MuiButtonProps["type"]}
        onClick={onClick}
        disabled={disabled || loading}
        fullWidth={fullWidth}
        ref={combinedRef}
        {...linkProps}
        aria-label={ariaLabel || text}
        title={title}
        {...buttonProps}
        sx={{
          textTransform: "uppercase",
          fontWeight: 400,
          borderRadius: 1,
          transition: "all 0.3s ease",
          boxShadow: variant === "contained" ? 2 : "none",
          "&:hover": {
            boxShadow: variant === "contained" ? 4 : "none",
            transform: variant === "contained" ? "translateY(-1px)" : "none",
          },
          "&.Mui-disabled": {
            opacity: 0.5,
            transform: "none",
          },
          "&:focus-visible": {
            outline: "2px solid",
            outlineColor: "primary.main",
            outlineOffset: "2px",
          },

          ...(size === "small" && {
            fontSize: "0.75rem",
            minHeight: "32px",
            minWidth: "112px",
            px: 2,
            py: 1,
            "@media (min-width: 1536px)": {
              minWidth: "160px",
              minHeight: "36px",
            },
          }),
          ...(size === "medium" && {
            fontSize: "0.875rem",
            minHeight: "40px",
            minWidth: "120px",
            px: 3,
            py: 1.5,
          }),
          ...(size === "large" && {
            fontSize: "1rem",
            minHeight: "48px",
            minWidth: "140px",
            px: 4,
            py: 2,
          }),

          ...(variant === "text" && {
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "action.hover",
            },
          }),

          ...sx,
        }}
      >
        {loading && !icon ? <CircularProgress size={16} /> : buttonContent}
      </MuiButton>
    );

    return title ? (
      <CustomGlobalTooltip title={title} arrow>
        {buttonElement}
      </CustomGlobalTooltip>
    ) : (
      buttonElement
    );
  }
);

Button.displayName = "Button";

export default Button;
