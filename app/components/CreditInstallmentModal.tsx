"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Alert,
  Autocomplete,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { Info, ExpandMore, Person, Phone, Warning } from "@mui/icons-material";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import CustomGlobalTooltip from "./CustomTooltipGlobal";
import { formatCurrency } from "@/app/lib/utils/currency";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import { CreditInstallmentDetails } from "@/app/lib/types/types";

interface CustomerOption {
  value: string;
  label: string;
}

interface CreditInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  isCreditCuotasSelected?: boolean;
  creditInstallmentDetails: CreditInstallmentDetails;
  setCreditInstallmentDetails: React.Dispatch<
    React.SetStateAction<CreditInstallmentDetails>
  >;
  selectedCustomer: CustomerOption | null;
  setSelectedCustomer: React.Dispatch<
    React.SetStateAction<CustomerOption | null>
  >;
  customers: CustomerOption[];
  customerName: string;
  setCustomerName: React.Dispatch<React.SetStateAction<string>>;
  customerPhone: string;
  setCustomerPhone: React.Dispatch<React.SetStateAction<string>>;
  onConfirm: () => void;
  isProcessing?: boolean;
}

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

// Función para calcular automáticamente la cuota actual basada en la fecha de inicio
const calculateCurrentInstallment = (startDate: string): number => {
  try {
    const today = new Date();
    const start = new Date(startDate);

    // Si la fecha de inicio es hoy o en el futuro, es la cuota 1
    if (today <= start) {
      return 1;
    }

    // Calcular cuántos meses han pasado desde la fecha de inicio
    const monthsDiff =
      (today.getFullYear() - start.getFullYear()) * 12 +
      (today.getMonth() - start.getMonth());

    // La cuota actual es el número de meses + 1 (porque se empieza con la cuota 1)
    return Math.max(1, monthsDiff + 1);
  } catch (error) {
    console.error("Error calculando cuota actual:", error);
    return 1; // Valor por defecto
  }
};

const CreditInstallmentModal = ({
  isCreditCuotasSelected = false,
  isOpen,
  onClose,
  total,
  creditInstallmentDetails,
  setCreditInstallmentDetails,
  selectedCustomer,
  setSelectedCustomer,
  customers,
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  onConfirm,
  isProcessing = false,
}: CreditInstallmentModalProps) => {
  const [installmentSummary, setInstallmentSummary] = useState<{
    total: number;
    monthlyPayment: number;
    totalInterest: number;
    totalWithInterest: number;
    amortization: Array<{
      installment: number;
      dueDate: string;
      payment: number;
      interest: number;
      principal: number;
      balance: number;
    }>;
  } | null>(null);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calcular resumen de cuotas
  const calculateSummary = useMemo(() => {
    const { numberOfInstallments, interestRate, startDate } =
      creditInstallmentDetails;
    const monthlyInterestRate = interestRate / 100;

    if (numberOfInstallments <= 0) return null;

    let monthlyPayment = 0;
    let totalInterest = 0;
    const amortization = [];

    if (interestRate > 0) {
      // Cálculo con interés compuesto
      const factor = Math.pow(1 + monthlyInterestRate, numberOfInstallments);
      monthlyPayment = (total * monthlyInterestRate * factor) / (factor - 1);
      totalInterest = monthlyPayment * numberOfInstallments - total;
    } else {
      // Sin interés
      monthlyPayment = total / numberOfInstallments;
      totalInterest = 0;
    }

    let balance = total;
    for (let i = 1; i <= numberOfInstallments; i++) {
      const interest = balance * monthlyInterestRate;
      const principal = monthlyPayment - interest;
      balance -= principal;

      const dueDate = addMonths(parseISO(startDate), i - 1);

      amortization.push({
        installment: i,
        dueDate: format(dueDate, "dd/MM/yyyy", { locale: es }),
        payment: monthlyPayment,
        interest,
        principal,
        balance: Math.max(0, balance),
      });
    }

    return {
      total,
      monthlyPayment,
      totalInterest,
      totalWithInterest: total + totalInterest,
      amortization,
    };
  }, [total, creditInstallmentDetails]);

  useEffect(() => {
    setInstallmentSummary(calculateSummary);
  }, [calculateSummary]);

  // Cuando cambia la fecha de inicio, recalcular la cuota actual automáticamente
  useEffect(() => {
    if (isOpen) {
      const currentInstallment = calculateCurrentInstallment(
        creditInstallmentDetails.startDate
      );

      // Solo actualizar si es diferente al valor actual
      if (currentInstallment !== creditInstallmentDetails.currentInstallment) {
        setCreditInstallmentDetails((prev) => ({
          ...prev,
          currentInstallment: currentInstallment,
        }));
      }
    }
  }, [
    creditInstallmentDetails.startDate,
    isOpen,
    setCreditInstallmentDetails,
    creditInstallmentDetails.currentInstallment,
  ]);

  useEffect(() => {
    // Limpiar campos de nuevo cliente cuando se selecciona un cliente existente
    if (isOpen && selectedCustomer) {
      setCustomerName("");
      setCustomerPhone("");
    }
  }, [isOpen, selectedCustomer, setCustomerName, setCustomerPhone]);

  useEffect(() => {
    if (!isOpen) {
      setValidationErrors([]);
      return;
    }
    const errors: string[] = [];
    if (selectedCustomer && customerName.trim()) {
      errors.push(
        "Si selecciona un cliente existente, no puede ingresar un nuevo nombre de cliente"
      );
    }

    // ✅ CORRECCIÓN: Validar solo si es crédito en cuotas
    // Para crédito en cuotas, se requiere cliente (seleccionado o nuevo)
    if (isCreditCuotasSelected) {
      if (!selectedCustomer && !customerName.trim()) {
        errors.push(
          "Debe seleccionar o ingresar un cliente para crédito en cuotas"
        );
      }
    }

    // Validaciones de cuotas e interés
    if (creditInstallmentDetails.numberOfInstallments > 36) {
      errors.push("El número máximo de cuotas es 36");
    }

    if (creditInstallmentDetails.interestRate > 50) {
      errors.push("La tasa de interés no puede exceder el 50%");
    }

    // Validar que la cuota actual no sea mayor al número de cuotas
    if (
      creditInstallmentDetails.currentInstallment >
      creditInstallmentDetails.numberOfInstallments
    ) {
      errors.push(
        "La cuota actual no puede ser mayor al número total de cuotas"
      );
    }

    setValidationErrors(errors);
  }, [
    selectedCustomer,
    customerName,
    customerPhone,
    creditInstallmentDetails,
    isCreditCuotasSelected,
    isOpen, // ✅ Añadir isOpen como dependencia
  ]);

  const handleNumberChange = (
    field: keyof CreditInstallmentDetails,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    let clampedValue = numValue;
    switch (field) {
      case "numberOfInstallments":
        clampedValue = Math.max(1, Math.min(36, numValue));
        break;
      case "interestRate":
      case "penaltyRate":
        clampedValue = Math.max(0, Math.min(100, numValue));
        break;
      case "currentInstallment":
        // La cuota actual no puede ser mayor al número de cuotas
        clampedValue = Math.max(
          1,
          Math.min(creditInstallmentDetails.numberOfInstallments, numValue)
        );
        break;
      default:
        break;
    }

    setCreditInstallmentDetails((prev) => ({
      ...prev,
      [field]: clampedValue,
    }));
  };

  const handleDateChange = (value: string) => {
    const currentInstallment = calculateCurrentInstallment(value);

    setCreditInstallmentDetails((prev) => ({
      ...prev,
      startDate: value,
      currentInstallment: currentInstallment,
    }));
  };

  const handleConfirm = () => {
    if (validationErrors.length === 0) {
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();

        setValidationErrors([]);
      }}
      title="Configurar Crédito"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onClose}
            hotkey="Escape"
            sx={{
              color: "text.secondary",
              borderColor: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "text.primary",
              },
            }}
          >
            Volver
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={validationErrors.length > 0 || isProcessing}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
            hotkey="Enter"
          >
            {isProcessing ? "Procesando..." : "Confirmar Configuración"}
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Sección Cliente */}
        <Box
          sx={{
            p: 2,
            border: 1,
            borderColor: "primary.main",
            borderRadius: 2,
            backgroundColor: "primary.50",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight="semibold" sx={{ flex: 1 }}>
              <Person sx={{ mr: 1, verticalAlign: "middle" }} />
              Información del Cliente
            </Typography>
            <CustomGlobalTooltip title="Seleccione un cliente existente o cree uno nuevo para el crédito en cuotas">
              <Info fontSize="small" color="action" />
            </CustomGlobalTooltip>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
              Cliente existente
            </Typography>
            <Autocomplete
              options={customers}
              value={selectedCustomer}
              onChange={(
                event: React.SyntheticEvent,
                newValue: CustomerOption | null
              ) => {
                setSelectedCustomer(newValue);
                if (newValue) {
                  setCustomerName("");
                  setCustomerPhone("");
                }
              }}
              getOptionLabel={(option) => option.label}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Buscar cliente existente"
                  variant="outlined"
                  size="small"
                  fullWidth
                />
              )}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Box
              sx={{
                flex: 1,
                height: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            />
            <Typography variant="caption" color="text.secondary">
              O crear nuevo cliente
            </Typography>
            <Box
              sx={{
                flex: 1,
                height: 1,
                borderBottom: 1,
                borderColor: "divider",
              }}
            />
          </Box>

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
              <Input
                label="Nombre del cliente*"
                placeholder="Ingrese nombre completo"
                value={customerName}
                onRawChange={(e) => {
                  setCustomerName(e.target.value);
                  if (e.target.value.trim()) {
                    setSelectedCustomer(null);
                  }
                }}
                disabled={!!selectedCustomer}
                fullWidth
                size="small"
              />
              <Input
                label="Teléfono"
                placeholder="Número de teléfono"
                disabled={!!selectedCustomer}
                value={customerPhone}
                onRawChange={(e) => setCustomerPhone(e.target.value)}
                fullWidth
                size="small"
                icon={<Phone fontSize="small" />}
              />
            </Box>
          </Box>
        </Box>

        {/* Sección Configuración de Cuotas */}
        <Box
          sx={{
            p: 2,
            border: 1,
            borderColor: "primary.main",
            borderRadius: 2,
            backgroundColor: "primary.50",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" fontWeight="semibold" sx={{ flex: 1 }}>
              Configuración de Cuotas
            </Typography>
            <CustomGlobalTooltip title="Configure los detalles del crédito en cuotas">
              <Info fontSize="small" color="action" />
            </CustomGlobalTooltip>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                Número de cuotas (1-36)
              </Typography>
              <Input
                type="number"
                value={creditInstallmentDetails.numberOfInstallments}
                onRawChange={(e) =>
                  handleNumberChange("numberOfInstallments", e.target.value)
                }
                fullWidth
                size="small"
                inputProps={{
                  min: 1,
                  max: 36,
                  step: "1",
                }}
                placeholder="Ej: 12"
              />
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                Interés mensual % (0-50)
              </Typography>
              <Input
                type="number"
                value={creditInstallmentDetails.interestRate}
                onRawChange={(e) =>
                  handleNumberChange("interestRate", e.target.value)
                }
                fullWidth
                size="small"
                placeholder="Ej: 5%"
                icon={<Typography fontSize="small">%</Typography>}
              />
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: "block" }}
              >
                Fecha inicio
              </Typography>
              <Input
                type="date"
                value={creditInstallmentDetails.startDate}
                onRawChange={(e) => handleDateChange(e.target.value)}
                fullWidth
                size="small"
                inputProps={{ shrink: true }}
              />
            </Box>
          </Box>

          {/* Resumen de cuotas */}
          {installmentSummary && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 1,
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(30, 30, 30, 0.5)"
                    : "rgba(245, 245, 245, 0.8)",
                border: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Resumen del Crédito
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1.5,
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Monto total
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(installmentSummary.total)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cuotas
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {creditInstallmentDetails.numberOfInstallments}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Cuota mensual
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatCurrency(installmentSummary.monthlyPayment)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Interés total
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight="bold"
                    color={
                      installmentSummary.totalInterest > 0
                        ? "warning.main"
                        : "success.main"
                    }
                  >
                    {formatCurrency(installmentSummary.totalInterest)}
                  </Typography>
                </Box>

                <Box sx={{ gridColumn: "1 / -1", mt: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      pt: 1,
                      borderTop: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" fontWeight="bold">
                      Total con interés
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="bold"
                      color="primary.dark"
                    >
                      {formatCurrency(installmentSummary.totalWithInterest)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          )}

          {/* Tabla de amortización */}
          {installmentSummary && creditInstallmentDetails.interestRate > 0 && (
            <Box sx={{ mt: 2 }}>
              <Accordion
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="caption" fontWeight="medium">
                    Ver tabla de amortización detallada
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                          >
                            Cuota
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                          >
                            Vencimiento
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                            align="right"
                          >
                            Pago
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                            align="right"
                          >
                            Interés
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                            align="right"
                          >
                            Capital
                          </TableCell>
                          <TableCell
                            sx={{ fontWeight: "bold", fontSize: "0.75rem" }}
                            align="right"
                          >
                            Saldo
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {installmentSummary.amortization.map((row) => (
                          <TableRow key={row.installment} hover>
                            <TableCell sx={{ fontSize: "0.75rem" }}>
                              {row.installment}
                            </TableCell>
                            <TableCell sx={{ fontSize: "0.75rem" }}>
                              {row.dueDate}
                            </TableCell>
                            <TableCell
                              sx={{ fontSize: "0.75rem" }}
                              align="right"
                            >
                              {formatCurrency(row.payment)}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontSize: "0.75rem",
                                color: "warning.main",
                              }}
                              align="right"
                            >
                              {formatCurrency(row.interest)}
                            </TableCell>
                            <TableCell
                              sx={{ fontSize: "0.75rem" }}
                              align="right"
                            >
                              {formatCurrency(row.principal)}
                            </TableCell>
                            <TableCell
                              sx={{ fontSize: "0.75rem" }}
                              align="right"
                            >
                              {formatCurrency(row.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </AccordionDetails>
              </Accordion>
            </Box>
          )}
        </Box>

        {/* Errores de validación */}
        {validationErrors.length > 0 && (
          <Alert severity="error" icon={<Warning />} sx={{ borderRadius: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              Corrija los siguientes errores:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 0 }}>
              {validationErrors.map((error, index) => (
                <Typography key={index} variant="body2" component="li">
                  {error}
                </Typography>
              ))}
            </Box>
          </Alert>
        )}
      </Box>
    </Modal>
  );
};

export default CreditInstallmentModal;
