"use client";

import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Card,
  InputAdornment,
  useTheme,
  alpha,
  Fade,
} from "@mui/material";
import {
  AttachMoney,
  CheckCircle,
  Warning,
  Receipt,
} from "@mui/icons-material";
import Modal from "./Modal";
import Button from "./Button";
import { formatCurrency } from "@/app/lib/utils/currency";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: () => Promise<void>;
  isProcessing?: boolean;
  isCredit?: boolean;
  registerCheck?: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onConfirm,
  isProcessing = false,
  isCredit = false,
  registerCheck = false,
}) => {
  const theme = useTheme();
  const [localPaymentAmount, setLocalPaymentAmount] = useState<number>(0);
  const [localChange, setLocalChange] = useState<number>(0);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const handleConfirmPayment = async () => {
    if (isProcessing) return;
    await onConfirm();
  };

  useEffect(() => {
    if (isOpen) {
      setLocalPaymentAmount(0);
      setLocalChange(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isProcessing) return;

      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        handleConfirmPayment();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "F6" && !isCredit && !registerCheck) {
        e.preventDefault();
        handlePaymentAmountChange(total);
        return;
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isOpen,
    isProcessing,
    onClose,
    handleConfirmPayment,
    isCredit,
    registerCheck,
    total,
  ]);

  const calculateChange = (payment: number, total: number): number => {
    return Math.max(0, payment - total);
  };

  const handlePaymentAmountChange = (value: number) => {
    setLocalPaymentAmount(value);
    const calculatedChange = calculateChange(value, total);
    setLocalChange(calculatedChange);
  };

  const handleCloseModal = () => {
    if (isProcessing) return;
    onClose();
  };

  const modalButtons = (
    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
      <Button variant="text" onClick={handleCloseModal} disabled={isProcessing}>
        Volver
      </Button>
      <Button
        ref={confirmButtonRef}
        variant="contained"
        onClick={handleConfirmPayment}
        disabled={
          (!isCredit && !registerCheck && localPaymentAmount < total) ||
          isProcessing
        }
        startIcon={isProcessing ? null : <CheckCircle />}
        sx={{
          bgcolor: "primary.main",
          "&:hover": { bgcolor: "primary.dark" },
          "&:disabled": {
            bgcolor: "action.disabledBackground",
            color: "action.disabled",
          },
          boxShadow: theme.shadows[2],
          minWidth: 140,
        }}
      >
        {isProcessing ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 16,
                height: 16,
                border: `2px solid ${theme.palette.common.white}`,
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            Procesando...
          </Box>
        ) : (
          "Confirmar Pago"
        )}
      </Button>
    </Box>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title="Pago y cambio"
      bgColor={theme.palette.mode === "dark" ? "gray_b" : "bg-white"}
      buttons={modalButtons}
    >
      <Box sx={{ p: { xs: 2, sm: 3 }, spaceY: 3 }}>
        {/* Información de tipo de venta */}

        {/* Total a pagar */}
        <Fade in={true} timeout={700}>
          <Card
            sx={{
              p: 3,
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.primary.dark, 0.3)
                  : "primary.main",
              backgroundImage:
                theme.palette.mode === "dark"
                  ? `linear-gradient(135deg, ${alpha(
                      theme.palette.primary.dark,
                      0.4
                    )} 0%, ${alpha(theme.palette.primary.main, 0.2)} 100%)`
                  : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              color: "primary.contrastText",
              borderRadius: 3,
              boxShadow: theme.shadows[4],
              position: "relative",
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                top: -50,
                right: -50,
                width: 100,
                height: 100,
                background: alpha(theme.palette.common.white, 0.1),
                borderRadius: "50%",
              },
            }}
          >
            <Box sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <Typography
                variant="overline"
                sx={{
                  opacity: 0.9,
                  letterSpacing: 1.5,
                  display: "block",
                  mb: 1,
                }}
              >
                TOTAL A PAGAR
              </Typography>
              <Typography
                variant="h3"
                fontWeight="bold"
                sx={{
                  textShadow: theme.shadows[2],
                  fontSize: "2rem",
                }}
              >
                {formatCurrency(total)}
              </Typography>
              <Receipt
                sx={{
                  position: "absolute",
                  top: 16,
                  left: 16,
                  opacity: 0.2,
                  fontSize: 48,
                }}
              />
            </Box>
          </Card>
        </Fade>

        {/* Monto recibido (solo para no crédito) */}
        {!isCredit && !registerCheck && (
          <Fade in={true} timeout={900}>
            <Box sx={{ pb: 3 }}>
              <Typography
                variant="subtitle1"
                fontWeight="semibold"
                sx={{ mt: 3, display: "flex", alignItems: "center", gap: 2 }}
              >
                Monto Recibido
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <TextField
                  type="number"
                  value={localPaymentAmount === 0 ? "" : localPaymentAmount}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? 0 : parseFloat(e.target.value);
                    handlePaymentAmountChange(isNaN(value) ? 0 : value);
                  }}
                  placeholder="0.00"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <AttachMoney color="primary" />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      bgcolor:
                        theme.palette.mode === "dark" ? "grey.800" : "grey.50",
                      "&:focus-within": {
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? "grey.700"
                            : "common.white",
                        boxShadow: `0 0 0 2px ${alpha(
                          theme.palette.primary.main,
                          0.2
                        )}`,
                      },
                    },
                  }}
                  fullWidth
                  size="medium"
                  disabled={isProcessing}
                  autoFocus
                />
                <Box sx={{ display: "flex", gap: 2 }}>
                  <Button
                    variant="outlined"
                    color="success"
                    onClick={() => handlePaymentAmountChange(total)}
                    size="small"
                    disabled={isProcessing}
                  >
                    Total [F6]
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => handlePaymentAmountChange(0)}
                    size="small"
                    disabled={isProcessing}
                    sx={{
                      borderRadius: 1.5,
                      minWidth: 80,
                      borderColor: "grey.300",
                    }}
                  >
                    Limpiar
                  </Button>
                </Box>
              </Box>
            </Box>
          </Fade>
        )}

        {/* Cambio (solo para no crédito y no cheque) */}
        {!isCredit && !registerCheck && localPaymentAmount > 0 && (
          <Fade in={true} timeout={1100}>
            <Card
              sx={{
                p: 3,
                border: 2,
                borderColor:
                  localChange >= 0
                    ? alpha(theme.palette.success.main, 0.5)
                    : alpha(theme.palette.error.main, 0.5),
                bgcolor:
                  localChange >= 0
                    ? alpha(theme.palette.success.light, 0.1)
                    : alpha(theme.palette.error.light, 0.1),
                borderRadius: 3,
                backdropFilter: "blur(10px)",
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: theme.shadows[4],
                },
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor:
                      localChange >= 0
                        ? alpha(theme.palette.success.main, 0.1)
                        : alpha(theme.palette.error.main, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mx: "auto",
                    mb: 2,
                  }}
                >
                  {localChange >= 0 ? (
                    <CheckCircle
                      sx={{
                        color: "success.main",
                        fontSize: 32,
                      }}
                    />
                  ) : (
                    <Warning
                      sx={{
                        color: "error.main",
                        fontSize: 32,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color={localChange >= 0 ? "success.dark" : "error.dark"}
                  sx={{ mb: 1 }}
                >
                  {localChange >= 0 ? "Cambio a Entregar" : "Pago Insuficiente"}
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="bold"
                  color={localChange >= 0 ? "success.dark" : "error.dark"}
                  sx={{
                    fontSize: { xs: "2rem", sm: "2.5rem" },
                  }}
                >
                  {formatCurrency(Math.abs(localChange))}
                </Typography>
                {localChange < 0 && (
                  <Typography
                    variant="body2"
                    color="error.dark"
                    sx={{ mt: 2, opacity: 0.9 }}
                  >
                    Faltan {formatCurrency(Math.abs(localChange))} para
                    completar el pago
                  </Typography>
                )}
              </Box>
            </Card>
          </Fade>
        )}

        {/* Resumen */}
        <Fade in={true} timeout={1300}>
          <Card
            sx={{
              p: 2.5,
              bgcolor:
                theme.palette.mode === "dark"
                  ? alpha(theme.palette.grey[800], 0.5)
                  : "grey.50",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <Box
                sx={{
                  textAlign: "center",
                  p: 2,
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.grey[700], 0.3)
                      : "common.white",
                  borderRadius: 2,
                  border: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                >
                  Total Venta
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="primary.main"
                  sx={{ fontSize: "1.5rem" }}
                >
                  {formatCurrency(total)}
                </Typography>
              </Box>
              {!isCredit && !registerCheck ? (
                <Box
                  sx={{
                    textAlign: "center",
                    p: 2,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.grey[700], 0.3)
                        : "common.white",
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                  >
                    Monto Recibido
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      localPaymentAmount >= total
                        ? "success.main"
                        : "text.primary"
                    }
                    sx={{ fontSize: "1.5rem" }}
                  >
                    {formatCurrency(localPaymentAmount)}
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    textAlign: "center",
                    p: 2,
                    bgcolor:
                      theme.palette.mode === "dark"
                        ? alpha(theme.palette.grey[700], 0.3)
                        : "common.white",
                    borderRadius: 2,
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1, textTransform: "uppercase" }}
                  >
                    Tipo de Venta
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="warning.main"
                    sx={{ fontSize: "1.5rem" }}
                  >
                    {registerCheck ? "Cheque" : "Crédito"}
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Fade>

        {/* Información adicional para crédito */}
        {isCredit && !registerCheck && (
          <Fade in={true} timeout={1500}>
            <Card
              sx={{
                p: 2.5,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                border: 1,
                borderColor: alpha(theme.palette.info.main, 0.2),
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                <Typography variant="body2" color="info.dark">
                  Esta venta se registrará en la cuenta corriente del cliente.
                  El saldo pendiente deberá ser pagado posteriormente según los
                  términos acordados.
                </Typography>
              </Box>
            </Card>
          </Fade>
        )}
      </Box>

      {/* Estilos para la animación de spinner */}
      <style jsx global>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Modal>
  );
};

export default PaymentModal;
