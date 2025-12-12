"use client";
import { formatCurrency } from "../lib/utils/currency";
import {
  Budget,
  PaymentSplit,
  PaymentMethod,
  SaleItem,
} from "../lib/types/types";
import { useState, useEffect, useMemo } from "react";
import Modal from "./Modal";
import InputCash from "./InputCash";
import Button from "./Button";
import Select, { SelectOption } from "./Select";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  Alert,
  useTheme,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ShoppingCart,
} from "@mui/icons-material";
import CustomChip from "./CustomChip"; // Importar tu CustomChip

interface ConvertToSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  onConfirm: (paymentMethods: PaymentSplit[]) => void;
}

const paymentOptions: SelectOption<PaymentMethod>[] = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
];

export const ConvertToSaleModal = ({
  isOpen,
  onClose,
  budget,
  onConfirm,
}: ConvertToSaleModalProps) => {
  const theme = useTheme();
  const totalToPay = useMemo(
    () => budget.total - (budget.deposit ? parseFloat(budget.deposit) : 0),
    [budget]
  );

  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: totalToPay },
  ]);

  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPaymentMethods([{ method: "EFECTIVO", amount: totalToPay }]);
    setError("");
  }, [totalToPay]);

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setError("");
    setPaymentMethods((prev) => {
      const updated = [...prev];

      if (field === "amount") {
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
            : value;

        updated[index] = {
          ...updated[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };
        if (updated.length === 2) {
          const otherIndex = index === 0 ? 1 : 0;
          const remaining = totalToPay - numericValue;
          updated[otherIndex] = {
            ...updated[otherIndex],
            amount: parseFloat(Math.max(0, remaining).toFixed(2)),
          };
        }
      } else {
        updated[index] = {
          ...updated[index],
          method: value as PaymentMethod,
        };
      }

      return updated;
    });
  };

  const addPaymentMethod = () => {
    if (paymentMethods.length >= paymentOptions.length) return;

    setPaymentMethods((prev) => {
      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = totalToPay / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: share,
          },
        ];
      } else {
        return [
          ...prev,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: 0,
          },
        ];
      }
    });
  };

  const removePaymentMethod = (index: number) => {
    if (paymentMethods.length <= 1) return;

    setPaymentMethods((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);

      if (updated.length === 1) {
        updated[0].amount = totalToPay;
      } else {
        const share = totalToPay / updated.length;
        updated.forEach((m, i) => {
          updated[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return updated;
    });
  };

  const validatePaymentMethods = (): boolean => {
    const sum = paymentMethods.reduce(
      (acc, method) => acc + parseFloat(method.amount.toFixed(2)),
      0
    );
    const isValid = Math.abs(sum - parseFloat(totalToPay.toFixed(2))) < 0.01;

    if (!isValid) {
      setError(
        `La suma de los montos (${formatCurrency(
          sum
        )}) no coincide con el total a pagar (${formatCurrency(totalToPay)})`
      );
    }

    return isValid;
  };

  const handleConfirm = async () => {
    if (!validatePaymentMethods()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(paymentMethods);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodColor = (method: PaymentMethod) => {
    switch (method) {
      case "EFECTIVO":
        return "success";
      case "TRANSFERENCIA":
        return "primary";
      case "TARJETA":
        return "secondary";
      default:
        return "default";
    }
  };

  const totalAmount = paymentMethods.reduce(
    (sum, method) => sum + method.amount,
    0
  );
  const amountDifference = totalAmount - totalToPay;

  const renderProductItem = (item: SaleItem, index: number) => (
    <TableRow
      key={index}
      hover
      sx={{
        "&:last-child td, &:last-child th": { border: 0 },
        "&:hover": {
          backgroundColor: theme.palette.action.hover,
        },
      }}
    >
      <TableCell>
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {item.productName}
          </Typography>
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
            {item.size && (
              <CustomChip
                label={item.size}
                size="small"
                variant="outlined"
                sx={{ height: 20 }}
              />
            )}
            {item.color && (
              <CustomChip
                label={item.color}
                size="small"
                variant="outlined"
                sx={{ height: 20 }}
              />
            )}
          </Box>
        </Box>
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" color="text.secondary">
          {item.quantity} {item.unit}
        </Typography>
      </TableCell>
      <TableCell align="center">
        <Typography variant="body2" color="text.secondary">
          {item.discount || 0}%
        </Typography>
      </TableCell>
      <TableCell align="right">
        <Typography variant="body2" fontWeight="medium">
          {formatCurrency(
            item.price * item.quantity * (1 - (item.discount || 0) / 100)
          )}
        </Typography>
      </TableCell>
    </TableRow>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ShoppingCart fontSize="small" />
          <Typography variant="h6" component="span">
            Cobrar presupuesto de {budget.customerName}
          </Typography>
        </Box>
      }
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onClose}
            disabled={isSubmitting}
            sx={{
              color: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={isSubmitting}
            isPrimaryAction={true}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
              minWidth: 140,
            }}
          >
            {isSubmitting ? "Procesando..." : "Confirmar Cobro"}
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Resumen del presupuesto */}
        <Card variant="outlined">
          <CardContent>
            {/* Productos del presupuesto */}
            <Typography
              variant="subtitle1"
              gutterBottom
              fontWeight="medium"
              sx={{ mb: 2 }}
            >
              Productos
            </Typography>

            <TableContainer
              sx={{
                maxHeight: 200,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                overflow: "auto",
              }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        bgcolor: "primary.main",
                        color: "white",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Producto
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        bgcolor: "primary.main",
                        color: "white",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Cantidad
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        bgcolor: "primary.main",
                        color: "white",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Descuento
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: "bold",
                        fontSize: "0.75rem",
                        bgcolor: "primary.main",
                        color: "white",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Subtotal
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>{budget.items.map(renderProductItem)}</TableBody>
              </Table>
            </TableContainer>

            {/* Totales */}
            <Box
              sx={{
                mt: 3,
                p: 2,
                bgcolor: theme.palette.grey[50],
                borderRadius: 1,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Total presupuesto:
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatCurrency(budget.total)}
                </Typography>
              </Box>

              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Seña abonada:
                </Typography>
                <Typography
                  variant="body2"
                  color="success.main"
                  fontWeight="medium"
                >
                  {formatCurrency(
                    budget.deposit ? parseFloat(budget.deposit) : 0
                  )}
                </Typography>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  Total a pagar:
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {formatCurrency(totalToPay)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Métodos de pago */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                Métodos de pago
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setError("")}
              >
                {error}
              </Alert>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {paymentMethods.map((method, index) => (
                <Box
                  key={index}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    p: 1.5,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 1,
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <Box sx={{ minWidth: 140 }}>
                    <Select<PaymentMethod>
                      label="Método"
                      options={paymentOptions}
                      value={method.method}
                      onChange={(value) =>
                        handlePaymentMethodChange(index, "method", value)
                      }
                      size="small"
                      fullWidth
                    />
                  </Box>

                  <Box sx={{ flex: 1, position: "relative" }}>
                    <InputCash
                      value={method.amount}
                      onChange={(value) =>
                        handlePaymentMethodChange(index, "amount", value)
                      }
                      label="Monto"
                      disabled={paymentMethods.length === 2 && index === 1}
                    />
                  </Box>

                  {paymentMethods.length > 1 && (
                    <IconButton
                      onClick={() => removePaymentMethod(index)}
                      color="error"
                      size="small"
                      sx={{ ml: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            {paymentMethods.length < paymentOptions.length && (
              <Button
                onClick={addPaymentMethod}
                icon={<AddIcon />}
                iconPosition="left"
                variant="text"
                size="small"
              >
                Agregar otro método de pago
              </Button>
            )}

            {/* Resumen de montos */}
            <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Resumen de pagos:
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {paymentMethods.map((method, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <CustomChip
                      label={
                        paymentOptions.find((o) => o.value === method.method)
                          ?.label
                      }
                      size="small"
                      color={getPaymentMethodColor(method.method)}
                      variant="outlined"
                      sx={{ fontWeight: "medium" }}
                    />
                    <Typography variant="body1" fontWeight="medium">
                      {formatCurrency(method.amount)}
                    </Typography>
                  </Box>
                ))}
                <Divider sx={{ my: 1 }} />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body1" fontWeight="bold">
                    Total a pagar:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={
                      Math.abs(totalAmount - totalToPay) < 0.01
                        ? "success.main"
                        : "error.main"
                    }
                  >
                    {formatCurrency(totalAmount)}
                  </Typography>
                </Box>

                {Math.abs(totalAmount - totalToPay) >= 0.01 && (
                  <Box sx={{ textAlign: "right", mt: 0.5 }}>
                    <Typography variant="caption" color="error">
                      {totalAmount > totalToPay
                        ? `Excede por ${formatCurrency(amountDifference)}`
                        : `Falta ${formatCurrency(-amountDifference)}`}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </CardContent>
        </Card>
      </Box>
    </Modal>
  );
};
