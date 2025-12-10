"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PAYMENT_REMINDERS_CONFIG } from "../lib/constants/constants";
import {
  Snackbar,
  Alert,
  Box,
  Typography,
  IconButton,
  useTheme,
  alpha,
  Slide,
  SlideProps,
} from "@mui/material";
import { Close, Payment } from "@mui/icons-material";

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

export default function PaymentNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    if (!user?.username) return;

    const today = new Date();
    const currentDay = today.getDate();

    const userReminderConfig = PAYMENT_REMINDERS_CONFIG.find(
      (config) => config.username === user.username
    );

    if (!userReminderConfig) {
      setShowNotification(false);
      return;
    }

    const isReminderDay = currentDay === userReminderConfig.reminderDay;

    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const mesActual = meses[today.getMonth()];
    const añoActual = today.getFullYear();

    setPeriodo(`${mesActual} - ${añoActual}`);
    setShowNotification(isReminderDay);
  }, [user]);

  const handleClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setShowNotification(false);
  };

  if (!showNotification) return null;

  return (
    <Snackbar
      open={showNotification}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      TransitionComponent={SlideTransition}
      sx={{
        position: "fixed",
        zIndex: theme.zIndex.modal + 1,
        top: "80px !important",
        right: "16px !important",
      }}
    >
      <Alert
        icon={<Payment />}
        severity="info"
        variant="filled"
        action={
          <IconButton
            size="small"
            aria-label="close"
            color="inherit"
            onClick={handleClose}
          >
            <Close fontSize="small" />
          </IconButton>
        }
        sx={{
          width: "100%",
          minWidth: 300,
          maxWidth: 400,
          boxShadow: theme.shadows[8],
          borderRadius: 2,
          borderLeft: `4px solid ${theme.palette.primary.light}`,
          backgroundColor: theme.palette.primary.main,
          "& .MuiAlert-icon": {
            alignItems: "center",
            color: "white",
          },
          "& .MuiAlert-message": {
            padding: theme.spacing(0.5, 0),
            width: "100%",
            color: "white",
          },
        }}
      >
        <Box>
          <Typography
            variant="subtitle2"
            fontWeight="bold"
            sx={{ color: "white", mb: 0.5 }}
          >
            Recordatorio de pago
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: alpha(theme.palette.common.white, 0.9) }}
          >
            La factura del período{" "}
            <Typography
              component="span"
              variant="body2"
              fontWeight="bold"
              sx={{ color: "white" }}
            >
              {periodo}
            </Typography>{" "}
            está lista para ser abonada
          </Typography>
        </Box>
      </Alert>
    </Snackbar>
  );
}
