import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
} from "@mui/material";
import { useMemo, useState } from "react";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import {
  DailyCashMovement,
  PaymentMethod,
  Option,
  Rubro,
} from "@/app/lib/types/types";
import Select from "@/app/components/Select";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import CustomChip from "./CustomChip";

interface DailyCashDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movements: DailyCashMovement[];
  rubro: Rubro | undefined;
}

const DailyCashDetailModal = ({
  isOpen,
  onClose,
  movements,
  rubro,
}: DailyCashDetailModalProps) => {
  const [filterType, setFilterType] = useState<"TODOS" | "INGRESO" | "EGRESO">(
    "TODOS"
  );
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<
    PaymentMethod | "TODOS"
  >("TODOS");

  const paymentOptions: Option[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const typeMatch =
        filterType === "TODOS" ||
        movement.type === filterType ||
        (movement.paymentMethod === "CHEQUE" &&
          movement.isCreditPayment &&
          filterType === "INGRESO");

      let paymentMatch = false;
      if (filterPaymentMethod === "TODOS") {
        paymentMatch = true;
      } else {
        if (movement.combinedPaymentMethods) {
          paymentMatch = movement.combinedPaymentMethods.some(
            (m) => m.method === filterPaymentMethod
          );
        } else {
          paymentMatch = movement.paymentMethod === filterPaymentMethod;
        }
      }

      return typeMatch && paymentMatch;
    });
  }, [movements, filterType, filterPaymentMethod]);

  const { totalIngresos, totalEgresos } = useMemo(() => {
    return filteredMovements.reduce(
      (acc, movement) => {
        if (
          movement.type === "INGRESO" ||
          (movement.paymentMethod === "CHEQUE" && movement.isCreditPayment)
        ) {
          acc.totalIngresos += Number(movement.amount) || 0;
        } else if (movement.type === "EGRESO") {
          acc.totalEgresos += Number(movement.amount) || 0;
        }
        return acc;
      },
      { totalIngresos: 0, totalEgresos: 0 }
    );
  }, [filteredMovements]);

  const groupedMovements = useMemo(() => {
    const groups: Record<string, DailyCashMovement> = {};

    filteredMovements.forEach((movement, index) => {
      const uniqueKey = `movement-${movement.id}-${index}-${
        movement.createdAt || Date.now()
      }`;

      groups[uniqueKey] = {
        ...movement,
        subMovements: movement.combinedPaymentMethods ? [] : undefined,
      };

      if (movement.combinedPaymentMethods) {
        movement.combinedPaymentMethods.forEach((paymentMethod) => {
          groups[uniqueKey].subMovements!.push({
            ...movement,
            id: movement.id,
            paymentMethod: paymentMethod.method,
            amount: paymentMethod.amount,
            description: `${movement.description} - ${paymentMethod.method}`,
            createdAt: movement.createdAt || new Date().toISOString(),
          });
        });
      }
    });

    return groups;
  }, [filteredMovements]);

  const handleClose = () => {
    onClose();
    setFilterType("TODOS");
    setFilterPaymentMethod("TODOS");
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return "-";
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch (error) {
      console.error("Error formateando hora:", error);
      return "-";
    }
  };

  const modalButtons = (
    <Button
      variant="text"
      onClick={handleClose}
      sx={{
        color: "text.secondary",
        borderColor: "divider",
        "&:hover": {
          backgroundColor: "action.hover",
          borderColor: "text.secondary",
        },
      }}
    >
      Cerrar
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      title="Detalles del día"
      onClose={handleClose}
      buttons={modalButtons}
      bgColor="bg-white dark:bg-gray_b"
    >
      <Box mb={2} sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Card
            sx={{
              bgcolor: "success.main",
              color: "white",
              "& .MuiTypography-root": {
                color: "white !important",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                Total Ingresos
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(totalIngresos)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Card
            sx={{
              bgcolor: "error.main",
              color: "white",
              "& .MuiTypography-root": {
                color: "white !important",
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                Total Egresos
              </Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatCurrency(totalEgresos)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box mb={2} sx={{ display: "flex", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth size="small">
            <Select
              label="Tipo"
              value={filterType}
              options={[
                { value: "TODOS", label: "Todos" },
                { value: "INGRESO", label: "Ingreso" },
                { value: "EGRESO", label: "Egreso" },
              ]}
              onChange={(value) =>
                setFilterType(value as "TODOS" | "INGRESO" | "EGRESO")
              }
            />
          </FormControl>
        </Box>
        <Box sx={{ flex: 1 }}>
          <FormControl fullWidth size="small">
            <Select
              label="Método de Pago"
              value={filterPaymentMethod}
              options={[{ value: "TODOS", label: "Todos" }, ...paymentOptions]}
              onChange={(value) =>
                setFilterPaymentMethod(value as PaymentMethod | "TODOS")
              }
            />
          </FormControl>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ maxHeight: "66vh", mt: 2 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                Hora
              </TableCell>
              <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                Tipo
              </TableCell>
              <TableCell
                sx={{ bgcolor: "primary.main", color: "white" }}
                align="center"
              >
                Producto
              </TableCell>
              <TableCell
                sx={{ bgcolor: "primary.main", color: "white" }}
                align="center"
              >
                Descripción
              </TableCell>
              <TableCell
                sx={{ bgcolor: "primary.main", color: "white" }}
                align="center"
              >
                Métodos de Pago
              </TableCell>
              <TableCell
                sx={{ bgcolor: "primary.main", color: "white" }}
                align="center"
              >
                Total
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.values(groupedMovements).length > 0 ? (
              Object.values(groupedMovements).map((movement, index) => (
                <TableRow key={index} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatTime(movement.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <CustomChip
                      label={movement.type}
                      color={movement.type === "INGRESO" ? "success" : "error"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {movement.items && movement.items.length > 0 ? (
                      <Box>
                        {movement.items.map((item, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2">
                              {getDisplayProductName(
                                {
                                  name: item.productName,
                                  size: item.size,
                                  color: item.color,
                                  rubro: rubro,
                                },
                                rubro,
                                true
                              )}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ minWidth: "5rem" }}
                            >
                              ×{item.quantity} {item.unit}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : movement.productName ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {getDisplayProductName(
                            {
                              name: movement.productName,
                              size: movement.size,
                              color: movement.color,
                              rubro: rubro,
                            },
                            rubro,
                            true
                          )}
                        </Typography>
                        <Typography variant="body2">
                          ×{movement.quantity} {movement.unit}
                        </Typography>
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{movement.description || "-"}</TableCell>
                  <TableCell>
                    {movement.isBudgetGroup ? (
                      <Box>
                        {movement.subMovements?.map((sub, i) => (
                          <Box key={i}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{ textTransform: "uppercase" }}
                              >
                                {sub.isDeposit ? "SEÑA" : "VENTA"}
                              </Typography>
                              <Typography variant="body2">
                                {sub.paymentMethod}:{" "}
                                {formatCurrency(sub.amount)}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ) : movement.combinedPaymentMethods ? (
                      <Box>
                        {movement.combinedPaymentMethods.map((method, i) => (
                          <Box
                            key={i}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2">
                              {method.method}:
                            </Typography>
                            <Typography variant="body2">
                              {formatCurrency(method.amount)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography variant="body2">
                          {movement.paymentMethod}
                        </Typography>
                        <Typography variant="body2">
                          {formatCurrency(movement.amount)}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      variant="body2"
                      fontWeight="bold"
                      color={
                        movement.type === "INGRESO"
                          ? "success.main"
                          : "error.main"
                      }
                    >
                      {formatCurrency(movement.amount)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary">
                    No hay movimientos que coincidan con los filtros
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Modal>
  );
};

export default DailyCashDetailModal;
