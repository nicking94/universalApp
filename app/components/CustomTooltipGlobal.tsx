// app/components/CustomGlobalTooltip.tsx
"use client";
import { Tooltip, TooltipProps, useTheme } from "@mui/material";
import React from "react";

interface CustomGlobalTooltipProps extends Omit<TooltipProps, "children"> {
  children: React.ReactElement;
  variant?: "default" | "light" | "dark";
}

const CustomGlobalTooltip: React.FC<CustomGlobalTooltipProps> = ({
  children,
  title,
  placement = "top",
  arrow = true,
  variant = "default",
  ...props
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";

  const getTooltipStyles = () => {
    switch (variant) {
      case "light":
        return {
          backgroundColor: "#ffffff",
          color: "#1f2937",
          arrowColor: "#ffffff",
        };
      case "dark":
        return {
          backgroundColor: "#1f2937",
          color: "#ffffff",
          arrowColor: "#1f2937",
        };
      default:
        return {
          backgroundColor: isDarkMode ? "#374151" : "#1f2937",
          color: "#f9fafb",
          arrowColor: isDarkMode ? "#374151" : "#1f2937",
        };
    }
  };

  const styles = getTooltipStyles();

  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow={arrow}
      slotProps={{
        tooltip: {
          sx: {
            backgroundColor: styles.backgroundColor,
            color: styles.color,
            fontSize: "0.875rem",
            padding: "8px 12px",
            borderRadius: "6px",
            boxShadow: theme.shadows[3],
            maxWidth: "250px",
            "& .MuiTooltip-arrow": {
              color: styles.arrowColor,
            },
          },
        },
      }}
      {...props}
    >
      {children}
    </Tooltip>
  );
};

export default CustomGlobalTooltip;
