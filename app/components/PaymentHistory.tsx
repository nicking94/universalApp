// components/PaymentHistory.tsx
import React from "react";
import { CreditSale, Payment } from "@/app/lib/types/types";
import { format } from "date-fns";

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  LocalAtm as LocalAtmIcon,
  AccountBalance as AccountBalanceIcon,
  CreditCard as CreditCardIcon,
  Receipt as ReceiptIcon,
} from "@mui/icons-material";
import CustomChip from "./CustomChip";

interface PaymentHistoryProps {
  sale: CreditSale;
  payments: Payment[];
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  sale,
  payments,
}) => {
  const salePayments = payments.filter((p) => p.saleId === sale.id);

  if (salePayments.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          No hay pagos registrados
        </Typography>
      </Box>
    );
  }

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case "EFECTIVO":
        return <LocalAtmIcon color="primary" fontSize="small" />;
      case "TRANSFERENCIA":
        return <AccountBalanceIcon color="secondary" fontSize="small" />;
      case "TARJETA":
        return <CreditCardIcon color="info" fontSize="small" />;
      case "CHEQUE":
        return <ReceiptIcon color="warning" fontSize="small" />;
      default:
        return <LocalAtmIcon color="primary" fontSize="small" />;
    }
  };

  const getPaymentColor = (method: string) => {
    switch (method) {
      case "EFECTIVO":
        return "primary";
      case "TRANSFERENCIA":
        return "secondary";
      case "TARJETA":
        return "info";
      case "CHEQUE":
        return "warning";
      default:
        return "primary";
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
        Historial de Pagos
      </Typography>
      <List dense>
        {salePayments.map((payment, index) => (
          <ListItem
            key={payment.id}
            sx={{
              borderBottom:
                index < salePayments.length - 1 ? "1px solid" : "none",
              borderColor: "divider",
              py: 1,
            }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              {getPaymentIcon(payment.method)}
            </ListItemIcon>
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {payment.amount.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </Typography>
                  <CustomChip
                    label={payment.method}
                    size="small"
                    color={getPaymentColor(payment.method)}
                  />
                </Box>
              }
              secondary={
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    mt: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(payment.date), "dd/MM/yyyy HH:mm")}
                  </Typography>
                  {payment.method === "CHEQUE" && payment.checkStatus && (
                    <CustomChip
                      label={payment.checkStatus}
                      size="small"
                      variant="outlined"
                      color={
                        payment.checkStatus === "cobrado"
                          ? "success"
                          : "warning"
                      }
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};
