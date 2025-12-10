"use client";
import { Snackbar, Alert, AlertProps, Slide, SlideProps } from "@mui/material";
import { NotificationProps } from "../lib/types/types";
import { forwardRef } from "react";
import { useTheme } from "@mui/material/styles";

const SlideTransition = forwardRef<HTMLDivElement, SlideProps>(
  function Transition(props, ref) {
    return <Slide {...props} direction="left" ref={ref} />;
  }
);

export default function Notification({
  isOpen,
  message,
  type,
  onClose,
  autoHideDuration = 3000,
}: NotificationProps & { onClose?: () => void; autoHideDuration?: number }) {
  const theme = useTheme();

  const getSeverity = (): AlertProps["severity"] => {
    switch (type) {
      case "success":
        return "success";
      case "error":
        return "error";
      case "info":
        return "info";
      default:
        return "info";
    }
  };

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    onClose?.();
  };

  const getAlertStyles = () => ({
    boxShadow: theme.shadows[3],
    borderRadius: theme.shape.borderRadius,
    fontWeight: 500,
    fontSize: "0.875rem",
    alignItems: "center",
    minWidth: 300,
    maxWidth: 500,
    width: "auto",
    fontFamily: theme.typography.fontFamily,
    "& .MuiAlert-message": {
      padding: "8px 0",
      color: "white",
      display: "flex",
      alignItems: "center",
    },
    "& .MuiAlert-action": {
      alignItems: "center",
      padding: 0,
      marginRight: 0,
      "& .MuiIconButton-root": {
        color: "white",
        "&:hover": {
          backgroundColor: "rgba(255, 255, 255, 0.1)",
        },
      },
    },

    ...(type === "success" && {
      backgroundColor: theme.palette.success.main,
      "& .MuiAlert-icon": {
        color: "white",
      },
    }),
    ...(type === "error" && {
      backgroundColor: theme.palette.error.main,
      "& .MuiAlert-icon": {
        color: "white",
      },
    }),
    ...(type === "info" && {
      backgroundColor: theme.palette.primary.main,
      "& .MuiAlert-icon": {
        color: "white",
      },
    }),

    [theme.breakpoints.down("sm")]: {
      minWidth: "auto",
      width: "100%",
      maxWidth: "calc(100vw - 32px)",
      margin: "0 8px",
    },
  });

  const getSnackbarStyles = () => ({
    position: "fixed" as const,
    zIndex: theme.zIndex.snackbar,
    "& .MuiSnackbar-root": {
      position: "fixed",
    },

    "&.MuiSnackbar-anchorOriginBottomRight": {
      [theme.breakpoints.down("sm")]: {
        bottom: 16,
        right: 16,
        left: 16,
      },
    },
  });

  return (
    <Snackbar
      open={isOpen}
      autoHideDuration={autoHideDuration}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      TransitionComponent={SlideTransition}
      sx={getSnackbarStyles()}
    >
      <Alert
        severity={getSeverity()}
        onClose={handleClose}
        variant="filled"
        sx={getAlertStyles()}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
