// components/SaleCard.tsx
import React from "react";
import { CreditSale, Payment, Rubro } from "@/app/lib/types/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Card,
  CardContent,
  Box,
  Typography,
  IconButton,
  LinearProgress,
  Divider,
} from "@mui/material";
import {
  Receipt as ReceiptIcon,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import { PaymentHistory } from "./PaymentHistory";
import { SaleProductsDetail } from "./SaleProductsDetail";
import CustomChip from "./CustomChip";
import Button from "./Button";

interface SaleCardProps {
  sale: CreditSale;
  payments: Payment[];
  rubro: Rubro | undefined;
  onPayment: (sale: CreditSale) => void;
  isExpanded: boolean;
  onToggleExpand: (saleId: number) => void;
}

export const SaleCard: React.FC<SaleCardProps> = ({
  sale,
  payments,
  rubro,
  onPayment,
  isExpanded,
  onToggleExpand,
}) => {
  const totalPayments = payments
    .filter((p) => p.saleId === sale.id)
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = sale.total - totalPayments;
  const isPaid = remainingBalance <= 0;
  const paymentProgress = (totalPayments / sale.total) * 100;

  return (
    <Card
      sx={{
        border: 2,
        borderColor: isPaid ? "success.main" : "warning.main",
        bgcolor: isPaid ? "success.50" : "warning.50",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)",
        },
        overflow: "visible",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 2,
            cursor: "pointer",
          }}
          onClick={() => onToggleExpand(sale.id)}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <ReceiptIcon color="primary" fontSize="small" />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                Venta #{sale.id}
              </Typography>
              <CustomChip
                label={isPaid ? "Pagado" : "Pendiente"}
                color={isPaid ? "success" : "warning"}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {format(new Date(sale.date), "dd/MM/yyyy HH:mm", { locale: es })}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {!isPaid && (
              <Button
                text="Registrar Pago"
                size="small"
                onClick={(e) => {
                  e?.stopPropagation();
                  onPayment(sale);
                }}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              />
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(sale.id);
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Total
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {sale.total.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Pagado
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              {totalPayments.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Pendiente
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              color={isPaid ? "success.main" : "warning.main"}
            >
              {remainingBalance.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Typography>
          </Box>
        </Box>

        {!isPaid && (
          <Box sx={{ mb: 2 }}>
            <LinearProgress
              variant="determinate"
              value={paymentProgress}
              color={
                paymentProgress >= 100
                  ? "success"
                  : paymentProgress >= 50
                  ? "primary"
                  : "warning"
              }
              sx={{ height: 6, borderRadius: 3 }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block", textAlign: "center" }}
            >
              {paymentProgress.toFixed(1)}% pagado
            </Typography>
          </Box>
        )}

        {isExpanded && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
              Detalles de Productos
            </Typography>
            <SaleProductsDetail sale={sale} rubro={rubro} />
            <Box sx={{ mt: 2 }}>
              <PaymentHistory sale={sale} payments={payments} />
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
