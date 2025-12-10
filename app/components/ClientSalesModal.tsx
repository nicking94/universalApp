import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";
import { Assignment } from "@mui/icons-material";
import { Sale, Customer } from "@/app/lib/types/types";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import CustomChip from "./CustomChip";

interface ClientSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales: Sale[];
}

const ClientSalesModal = ({
  isOpen,
  onClose,
  customer,
  sales,
}: ClientSalesModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Historial de Compras - ${customer?.name || ""}`}
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
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
        </Box>
      }
    >
      <Box sx={{ maxHeight: "63vh", mb: 2, overflow: "auto" }}>
        {sales.length > 0 ? (
          <TableContainer component={Paper}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Fecha
                  </TableCell>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Productos
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
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      {new Date(sale.date).toLocaleDateString("es-AR")}
                    </TableCell>
                    <TableCell>
                      {sale.products.map((product, idx) => (
                        <Box key={idx} sx={{ fontSize: "0.875rem" }}>
                          {product.name} x {product.quantity}
                        </Box>
                      ))}
                    </TableCell>
                    <TableCell align="center">
                      ${sale.total.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <CustomChip
                        label={sale.paid ? "Pagado" : "Pendiente"}
                        color={sale.paid ? "success" : "warning"}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Assignment sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
            <Typography color="text.secondary">
              No hay compras registradas para este cliente
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
};

export default ClientSalesModal;
