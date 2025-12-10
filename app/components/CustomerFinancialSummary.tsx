// components/CustomerFinancialSummary.tsx
import React from "react";
import { CreditSale, Payment } from "@/app/lib/types/types";
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
} from "@mui/material";
import {
  AttachMoney as AttachMoneyIcon,
  Payment as PaymentIcon,
  AccountBalance as AccountBalanceIcon,
} from "@mui/icons-material";

interface CustomerFinancialSummaryProps {
  customerInfo: { name: string; balance: number; sales: CreditSale[] };
  payments: Payment[];
}

export const CustomerFinancialSummary: React.FC<
  CustomerFinancialSummaryProps
> = ({ customerInfo, payments }) => {
  const totalFacturado = customerInfo.sales.reduce(
    (sum, sale) => sum + sale.total,
    0
  );
  const totalPagado = customerInfo.sales.reduce((sum, sale) => {
    const paymentsForSale = payments
      .filter((p) => p.saleId === sale.id)
      .reduce((sum, p) => sum + p.amount, 0);
    return sum + paymentsForSale;
  }, 0);

  const porcentajePagado =
    totalFacturado > 0 ? (totalPagado / totalFacturado) * 100 : 0;

  const stats = [
    {
      label: "Total Facturado",
      value: totalFacturado,
      icon: <AttachMoneyIcon />,
      color: "linear-gradient(135deg, #2d78b9, #85c1e9)",
      format: "currency",
    },
    {
      label: "Total Pagado",
      value: totalPagado,
      icon: <PaymentIcon />,
      color: "linear-gradient(135deg, #2d78b9, #85c1e9)",
      format: "currency",
    },
    {
      label: customerInfo.balance <= 0 ? "Saldo a Favor" : "Saldo Pendiente",
      value: Math.abs(customerInfo.balance),
      icon: <AccountBalanceIcon />,
      color: customerInfo.balance <= 0 ? "#1e8449" : "#c0392b",
      format: "currency",
    },
  ];

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}
      >
        {stats.map((stat, index) => (
          <Card
            key={index}
            sx={{
              height: "100%",
              background: stat.color,
              transition:
                "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 3,
              },
            }}
          >
            <CardContent
              sx={{
                color: stat.format === "number" ? "inherit" : "white",
                textAlign: "center",
                p: 2,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
                {stat.icon}
              </Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {stat.format === "currency"
                  ? stat.value.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : stat.value}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  opacity: 0.9,
                  fontSize: "0.75rem",
                }}
              >
                {stat.label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card sx={{ mt: 2, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" fontWeight="medium">
                Progreso de Pago
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {porcentajePagado.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(100, porcentajePagado)}
              color={
                porcentajePagado >= 100
                  ? "success"
                  : porcentajePagado >= 50
                  ? "primary"
                  : "warning"
              }
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                Pagado:{" "}
                {totalPagado.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Pendiente:{" "}
                {Math.max(0, customerInfo.balance).toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};
