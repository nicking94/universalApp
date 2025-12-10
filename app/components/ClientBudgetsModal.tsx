import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import { Visibility, Assignment } from "@mui/icons-material";
import { Budget, Customer } from "@/app/lib/types/types";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import CustomChip from "./CustomChip";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

interface ClientBudgetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  budgets: Budget[];
  selectedBudget: Budget | null;
  onSelectBudget: (budget: Budget | null) => void;
}

const ClientBudgetsModal = ({
  isOpen,
  onClose,
  customer,
  budgets,
  selectedBudget,
  onSelectBudget,
}: ClientBudgetsModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        selectedBudget
          ? "Detalles del Presupuesto"
          : `Presupuestos de ${customer?.name || ""}`
      }
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          {selectedBudget ? (
            <>
              <Button
                variant="text"
                onClick={onClose}
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
              <Button
                variant="contained"
                onClick={() => onSelectBudget(null)}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Volver
              </Button>
            </>
          ) : (
            <Button
              variant="text"
              onClick={onClose}
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
          )}
        </Box>
      }
    >
      {selectedBudget ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Fecha:
              </Typography>
              <Typography>
                {new Date(selectedBudget.date).toLocaleDateString("es-AR")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Total:
              </Typography>
              <Typography>${selectedBudget.total.toFixed(2)}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Seña:
              </Typography>
              <Typography>${selectedBudget.deposit || "0.00"}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">
                Saldo:
              </Typography>
              <Typography>${selectedBudget.remaining.toFixed(2)}</Typography>
            </Box>
            <Box sx={{ gridColumn: "span 2" }}>
              <Typography variant="subtitle2" fontWeight="bold">
                Estado:
              </Typography>
              <CustomChip
                label={selectedBudget.status}
                color={
                  selectedBudget.status === "aprobado"
                    ? "success"
                    : selectedBudget.status === "rechazado"
                    ? "error"
                    : "warning"
                }
                size="small"
              />
            </Box>
            {selectedBudget.notes && (
              <Box sx={{ gridColumn: "span 2" }}>
                <Typography variant="subtitle2" fontWeight="bold">
                  Notas:
                </Typography>
                <Typography>{selectedBudget.notes}</Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" fontWeight="medium" mb={2}>
              Items del Presupuesto
            </Typography>
            {selectedBudget.items ? (
              Array.isArray(selectedBudget.items) &&
              selectedBudget.items.length > 0 ? (
                <TableContainer component={Paper} sx={{ maxHeight: "35vh" }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                        >
                          Descripción
                        </TableCell>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                          align="center"
                        >
                          Cantidad
                        </TableCell>
                        <TableCell
                          sx={{ bgcolor: "primary.main", color: "white" }}
                          align="center"
                        >
                          Precio
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
                      {selectedBudget.items.map((item, index) => (
                        <TableRow key={index} hover>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell align="center">
                            {item.quantity + " " + item.unit}
                          </TableCell>
                          <TableCell align="center">
                            ${item.price.toFixed(2)}
                          </TableCell>
                          <TableCell align="center">
                            ${(item.quantity * item.price).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">
                  No hay items en este presupuesto
                </Typography>
              )
            ) : (
              <Typography color="text.secondary">
                No se encontraron items
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ maxHeight: "63vh", mb: 2, overflow: "auto" }}>
          {budgets.length > 0 ? (
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "primary.main", color: "white" }}
                      align="center"
                    >
                      Total
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "primary.main", color: "white" }}
                      align="center"
                    >
                      Estado
                    </TableCell>
                    <TableCell
                      sx={{ bgcolor: "primary.main", color: "white" }}
                      align="center"
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id} hover>
                      <TableCell>
                        {new Date(budget.date).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell align="center">
                        ${budget.total.toFixed(2)}
                      </TableCell>
                      <TableCell align="center">
                        <CustomChip
                          label={budget.status}
                          color={
                            budget.status === "aprobado"
                              ? "success"
                              : budget.status === "rechazado"
                              ? "error"
                              : "warning"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <CustomGlobalTooltip title="Ver detalles">
                          <IconButton
                            onClick={() => onSelectBudget(budget)}
                            size="small"
                            sx={{
                              borderRadius: "4px",
                              color: "primary.main",
                              "&:hover": {
                                backgroundColor: "primary.main",
                                color: "white",
                              },
                            }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </CustomGlobalTooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Assignment sx={{ fontSize: 64, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary">
                No hay presupuestos para este cliente
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Modal>
  );
};

export default ClientBudgetsModal;
