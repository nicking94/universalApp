"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { pdf } from "@react-pdf/renderer";

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
  FormControl,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
  Wallet as WalletIcon,
  CheckCircle as CheckCircleIcon,
  Add,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  AttachMoney as AttachMoneyIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  ExpandLess,
  ExpandMore,
  History as HistoryIcon,
  CreditCard as CreditCardIcon,
  LocalAtm as LocalAtmIcon,
  AccountCircle as AccountCircleIcon,
  Delete,
} from "@mui/icons-material";
import {
  ChequeFilter,
  ChequeWithDetails,
  CreditSale,
  Customer,
  DailyCashMovement,
  Payment,
  PaymentMethod,
  PaymentSplit,
  Rubro,
  SaleItem,
} from "@/app/lib/types/types";
import { db } from "@/app/database/db";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Input from "@/app/components/Input";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import { useNotification } from "@/app/hooks/useNotification";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { ClienteCuentaCorrientePDF } from "@/app/components/ClienteCuentaCorrientePDF";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import SearchBar from "@/app/components/SearchBar";
import Pagination from "@/app/components/Pagination";
import Notification from "@/app/components/Notification";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

const CUENTAS_CONFIG = {
  NOTIFICATION_DURATION: 2500,
  MAX_PAYMENT_METHODS: 3,
} as const;

const useCreditSales = () => {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSales, allPayments, allCustomers] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
        db.customers.toArray(),
      ]);

      const sales = allSales.filter(
        (sale) => sale.credit === true
      ) as CreditSale[];

      setCreditSales(sales);
      setPayments(allPayments);
      setCustomers(allCustomers);

      return { sales, payments: allPayments, customers: allCustomers };
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    creditSales,
    payments,
    customers,
    loading,
    fetchData,
    setCreditSales,
    setPayments,
  };
};

const CustomerFinancialSummary = ({
  customerInfo,
  payments,
}: {
  customerInfo: { name: string; balance: number; sales: CreditSale[] };
  payments: Payment[];
}) => {
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

const PaymentHistory = ({
  sale,
  payments,
}: {
  sale: CreditSale;
  payments: Payment[];
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
              {payment.method === "EFECTIVO" && (
                <LocalAtmIcon color="primary" fontSize="small" />
              )}
              {payment.method === "TRANSFERENCIA" && (
                <AccountBalanceIcon color="secondary" fontSize="small" />
              )}
              {payment.method === "TARJETA" && (
                <CreditCardIcon color="info" fontSize="small" />
              )}
              {payment.method === "CHEQUE" && (
                <ReceiptIcon color="warning" fontSize="small" />
              )}
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
                    color={
                      payment.method === "EFECTIVO"
                        ? "primary"
                        : payment.method === "TRANSFERENCIA"
                        ? "secondary"
                        : payment.method === "TARJETA"
                        ? "info"
                        : "warning"
                    }
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
                  <CalendarIcon sx={{ fontSize: 14 }} />
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

const SaleProductsDetail = ({
  sale,
  rubro,
}: {
  sale: CreditSale;
  rubro: Rubro | undefined;
}) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", bgcolor: "action.hover" }}>
              Producto
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Cantidad
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Precio Unit.
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Subtotal
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sale.products.map((product, idx) => (
            <TableRow
              key={`${sale.id}-${product.id}-${idx}`}
              hover
              sx={{
                "&:hover": {
                  backgroundColor: "action.hover",
                },
                transition: "background-color 0.2s",
              }}
            >
              <TableCell>
                <Typography variant="body2">
                  {getDisplayProductName(
                    {
                      name: product.name,
                      size: product.size,
                      color: product.color,
                      rubro: product.rubro,
                    },
                    rubro,
                    true
                  )}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {product.quantity} {product.unit}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {product.price.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  {(product.quantity * product.price).toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SaleCard = ({
  sale,
  payments,
  rubro,
  onPayment,
  isExpanded,
  onToggleExpand,
}: {
  sale: CreditSale;
  payments: Payment[];
  rubro: Rubro | undefined;
  onPayment: (sale: CreditSale) => void;
  isExpanded: boolean;
  onToggleExpand: (saleId: number) => void;
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
                variant="contained"
                size="small"
                onClick={(e) => {
                  e?.stopPropagation();
                  onPayment(sale);
                }}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Registrar Pago
              </Button>
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

const InfoModal = ({
  isOpen,
  currentCustomerInfo,
  payments,
  rubro,
  expandedSale,
  infoModalTab,
  onClose,
  onPayment,
  onExpandSale,
  calculateRemainingBalance,
  onTabChange,
}: {
  isOpen: boolean;
  currentCustomerInfo: {
    name: string;
    balance: number;
    sales: CreditSale[];
  } | null;
  payments: Payment[];
  rubro: Rubro | undefined;
  expandedSale: number | null;
  infoModalTab: number;
  onClose: () => void;
  onPayment: (sale: CreditSale) => void;
  onExpandSale: (saleId: number) => void;
  calculateRemainingBalance: (sale: CreditSale) => number;
  onTabChange: (newValue: number) => void;
}) => {
  if (!currentCustomerInfo) return null;

  const ventasPendientes = currentCustomerInfo.sales.filter((sale) => {
    const remainingBalance = calculateRemainingBalance(sale);
    return remainingBalance > 0;
  });

  const ventasPagadas = currentCustomerInfo.sales.filter((sale) => {
    const remainingBalance = calculateRemainingBalance(sale);
    return remainingBalance <= 0;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Gestión de Cuenta Corriente - ${currentCustomerInfo.name}`}
      bgColor="bg-white dark:bg-gray-800"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "end", width: "100%" }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="text"
              onClick={onClose}
              sx={{
                color: "text.secondary",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              Cerrar
            </Button>
          </Box>
        </Box>
      }
    >
      <Box sx={{ width: "100%" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          <Avatar sx={{ bgcolor: "primary.main" }}>
            <AccountCircleIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {currentCustomerInfo.name}
            </Typography>
          </Box>
        </Box>

        <CustomerFinancialSummary
          customerInfo={currentCustomerInfo}
          payments={payments}
        />

        <Card sx={{ mb: 2 }}>
          <Tabs
            value={infoModalTab}
            onChange={(_, newValue) => onTabChange(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: "medium",
                minHeight: 48,
              },
            }}
          >
            <Tab
              icon={<ReceiptIcon />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={currentCustomerInfo.sales.length}
                  color="primary"
                  sx={{ "& .MuiBadge-badge": { right: -8 } }}
                >
                  Todas las Ventas
                </Badge>
              }
            />
            <Tab
              icon={<PaymentIcon />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={ventasPendientes.length}
                  color="warning"
                  sx={{ "& .MuiBadge-badge": { right: -8 } }}
                >
                  Pendientes
                </Badge>
              }
            />
            <Tab
              icon={<CheckCircleIcon />}
              iconPosition="start"
              label={
                <Badge
                  badgeContent={ventasPagadas.length}
                  color="success"
                  sx={{ "& .MuiBadge-badge": { right: -8 } }}
                >
                  Pagadas
                </Badge>
              }
            />
          </Tabs>
        </Card>

        <Box sx={{ maxHeight: "63vh", mb: 2, overflow: "auto" }}>
          {infoModalTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {currentCustomerInfo.sales.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <ReceiptIcon
                    sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                  />
                  <Typography color="text.secondary">
                    No hay cuentas corrientes registradas
                  </Typography>
                </Box>
              ) : (
                currentCustomerInfo.sales
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((sale) => (
                    <SaleCard
                      key={sale.id}
                      sale={sale}
                      payments={payments}
                      rubro={rubro}
                      onPayment={onPayment}
                      isExpanded={expandedSale === sale.id}
                      onToggleExpand={onExpandSale}
                    />
                  ))
              )}
            </Box>
          )}

          {infoModalTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {ventasPendientes.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <CheckCircleIcon
                    sx={{ fontSize: 64, color: "success.main", mb: 2 }}
                  />
                  <Typography color="text.secondary">
                    No hay ventas pendientes de pago
                  </Typography>
                </Box>
              ) : (
                ventasPendientes
                  .sort((a, b) => {
                    const balanceA = calculateRemainingBalance(a);
                    const balanceB = calculateRemainingBalance(b);
                    return balanceB - balanceA;
                  })
                  .map((sale) => (
                    <SaleCard
                      key={sale.id}
                      sale={sale}
                      payments={payments}
                      rubro={rubro}
                      onPayment={onPayment}
                      isExpanded={expandedSale === sale.id}
                      onToggleExpand={onExpandSale}
                    />
                  ))
              )}
            </Box>
          )}

          {infoModalTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {ventasPagadas.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <HistoryIcon
                    sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                  />
                  <Typography color="text.secondary">
                    No hay ventas completamente pagadas
                  </Typography>
                </Box>
              ) : (
                ventasPagadas
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((sale) => (
                    <SaleCard
                      key={sale.id}
                      sale={sale}
                      payments={payments}
                      rubro={rubro}
                      onPayment={onPayment}
                      isExpanded={expandedSale === sale.id}
                      onToggleExpand={onExpandSale}
                    />
                  ))
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

const ChequesModal = ({
  isOpen,
  currentCustomerInfo,
  currentCustomerCheques,
  chequeFilter,
  rubro,
  onClose,
  onFilterChange,
  onMarkCheckAsPaid,
  onDeleteCheck,
}: {
  isOpen: boolean;
  currentCustomerInfo: {
    name: string;
    balance: number;
    sales: CreditSale[];
  } | null;
  currentCustomerCheques: ChequeWithDetails[];
  chequeFilter: ChequeFilter;
  rubro: Rubro | undefined;
  onClose: () => void;
  onFilterChange: (filter: ChequeFilter) => void;
  onMarkCheckAsPaid: (checkId: number) => void;
  onDeleteCheck: (checkId: number) => void;
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cheques de ${currentCustomerInfo?.name || "Cliente"}`}
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onClose}
            sx={{
              color: "text.secondary",
              borderColor: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "text.primary",
              },
            }}
          >
            Cerrar
          </Button>
        </Box>
      }
    >
      {currentCustomerCheques.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <WalletIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography color="text.secondary">
            El cliente no tiene cheques registrados
          </Typography>
        </Box>
      ) : (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Typography variant="body2" fontWeight="medium">
              Filtrar por estado:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Estado"
                value={chequeFilter}
                options={[
                  { value: "todos", label: "Todos" },
                  { value: "pendiente", label: "Pendientes" },
                  { value: "cobrado", label: "Cobrados" },
                ]}
                onChange={(value: string | number) =>
                  onFilterChange(value as ChequeFilter)
                }
                size="small"
              />
            </FormControl>
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: "48vh" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Monto
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Fecha
                  </TableCell>
                  <TableCell
                    sx={{ bgcolor: "primary.main", color: "white" }}
                    align="center"
                  >
                    Estado
                  </TableCell>
                  <TableCell sx={{ bgcolor: "primary.main", color: "white" }}>
                    Productos
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
                {currentCustomerCheques
                  .filter(
                    (cheque) =>
                      chequeFilter === "todos" ||
                      cheque.checkStatus === chequeFilter
                  )
                  .map((cheque) => (
                    <TableRow
                      key={cheque.id}
                      hover
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": { backgroundColor: "action.hover" },
                        transition: "all 0.3s",
                      }}
                    >
                      <TableCell>
                        {cheque.amount.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        })}
                      </TableCell>
                      <TableCell align="center">
                        {format(new Date(cheque.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell align="center">
                        <CustomChip
                          label={cheque.checkStatus || "pendiente"}
                          color={
                            cheque.checkStatus === "cobrado"
                              ? "success"
                              : cheque.checkStatus === "pendiente"
                              ? "warning"
                              : "error"
                          }
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ maxHeight: 80, overflow: "auto" }}>
                          {cheque.products?.map((product, idx) => (
                            <Box
                              key={idx}
                              sx={{
                                py: 0.5,
                                borderBottom:
                                  idx < cheque.products.length - 1
                                    ? "1px solid"
                                    : "none",
                                borderColor: "divider",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <Typography variant="caption">
                                  {getDisplayProductName(
                                    {
                                      name: product.productName,
                                      size: product.size,
                                      color: product.color,
                                      rubro: product.rubro,
                                    },
                                    rubro,
                                    true
                                  )}
                                </Typography>
                                <Typography variant="caption">
                                  {product.quantity} {product.unit}
                                </Typography>
                                <Typography variant="caption">
                                  {product.price.toLocaleString("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                  })}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 0.5,
                          }}
                        >
                          {cheque.checkStatus === "pendiente" && (
                            <CustomGlobalTooltip title="Marcar como cobrado">
                              <IconButton
                                onClick={() => onMarkCheckAsPaid(cheque.id)}
                                size="small"
                                sx={{
                                  borderRadius: "4px",
                                  color: "success.main",
                                  "&:hover": {
                                    backgroundColor: "success.main",
                                    color: "white",
                                  },
                                }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </CustomGlobalTooltip>
                          )}
                          <CustomGlobalTooltip title="Eliminar cheque">
                            <IconButton
                              onClick={() => onDeleteCheck(cheque.id)}
                              size="small"
                              sx={{
                                borderRadius: "4px",
                                color: "error.main",
                                "&:hover": {
                                  backgroundColor: "error.main",
                                  color: "white",
                                },
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Modal>
  );
};

const PaymentModal = ({
  isOpen,
  currentCreditSale,
  paymentMethods,
  onClose,
  onPayment,
  onPaymentMethodChange,
  onRemovePaymentMethod,
  onAddPaymentMethod,
  calculateRemainingBalance,
  isFirstGreater,
}: {
  isOpen: boolean;
  currentCreditSale: CreditSale | null;
  paymentMethods: PaymentSplit[];
  onClose: () => void;
  onPayment: () => void;
  onPaymentMethodChange: (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => void;
  onRemovePaymentMethod: (index: number) => void;
  onAddPaymentMethod: () => void;
  calculateRemainingBalance: (sale: CreditSale) => number;
  isFirstGreater: (a: number, b: number, epsilon?: number) => boolean;
}) => {
  if (!currentCreditSale) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Registrar Pago - ${currentCreditSale?.customerName || "Cliente"}`}
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onClose}
            sx={{
              color: "text.secondary",
              borderColor: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "text.primary",
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={onPayment}
            disabled={
              paymentMethods.reduce((sum, m) => sum + m.amount, 0) <= 0 ||
              isFirstGreater(
                paymentMethods.reduce((sum, m) => sum + m.amount, 0),
                calculateRemainingBalance(currentCreditSale)
              )
            }
            isPrimaryAction={true}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
              "&:disabled": { bgcolor: "action.disabled" },
            }}
          >
            Registrar Pago
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body1" fontWeight="medium">
              Deuda pendiente:
            </Typography>
            <CustomChip
              label={calculateRemainingBalance(
                currentCreditSale
              ).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
              color="primary"
              variant="filled"
            />
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const remaining = calculateRemainingBalance(currentCreditSale);
              onPaymentMethodChange(0, "amount", remaining);
            }}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Pagar todo
          </Button>
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight="medium" mb={2}>
            Métodos de Pago
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {paymentMethods.map((method, index) => (
              <Box
                key={index}
                sx={{ display: "flex", alignItems: "center", gap: 2 }}
              >
                <FormControl sx={{ minWidth: 140 }}>
                  <Select
                    label="Método"
                    value={method.method}
                    options={[
                      { value: "EFECTIVO", label: "Efectivo" },
                      { value: "TRANSFERENCIA", label: "Transferencia" },
                      { value: "TARJETA", label: "Tarjeta" },
                    ]}
                    onChange={(value) =>
                      onPaymentMethodChange(
                        index,
                        "method",
                        value as PaymentMethod
                      )
                    }
                  />
                </FormControl>

                <Input
                  type="number"
                  value={method.amount}
                  onRawChange={(e) =>
                    onPaymentMethodChange(
                      index,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0.00"
                  step="0.01"
                />

                {paymentMethods.length > 1 && (
                  <IconButton
                    onClick={() => onRemovePaymentMethod(index)}
                    size="small"
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.main",
                        color: "white",
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            ))}
          </Box>

          {paymentMethods.length < CUENTAS_CONFIG.MAX_PAYMENT_METHODS && (
            <Button
              variant="text"
              startIcon={<Add />}
              onClick={onAddPaymentMethod}
              sx={{ mt: 1 }}
            >
              Agregar otro método
            </Button>
          )}
        </Box>

        <Card
          sx={{
            backgroundColor: "primary.main",
            color: "white",
            textAlign: "center",
          }}
        >
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Total a pagar
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {paymentMethods
                .reduce((sum, m) => sum + m.amount, 0)
                .toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
            </Typography>

            {isFirstGreater(
              paymentMethods.reduce((sum, m) => sum + m.amount, 0),
              calculateRemainingBalance(currentCreditSale)
            ) && (
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  color: "warning.main",
                  fontWeight: "medium",
                }}
              >
                El monto total excede la deuda pendiente
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </Modal>
  );
};

const CuentasCorrientesPage = () => {
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();

  const {
    creditSales,
    payments,
    customers,
    loading,
    fetchData,
    setCreditSales,
    setPayments,
  } = useCreditSales();

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentCreditSale, setCurrentCreditSale] = useState<CreditSale | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentCustomerInfo, setCurrentCustomerInfo] = useState<{
    name: string;
    balance: number;
    sales: CreditSale[];
  } | null>(null);
  const [isChequesModalOpen, setIsChequesModalOpen] = useState(false);
  const [currentCustomerCheques, setCurrentCustomerCheques] = useState<
    ChequeWithDetails[]
  >([]);
  const [chequeFilter, setChequeFilter] = useState<ChequeFilter>("todos");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: 0 },
  ]);
  const [expandedSale, setExpandedSale] = useState<number | null>(null);
  const [infoModalTab, setInfoModalTab] = useState(0);

  const isFirstGreater = useCallback((a: number, b: number, epsilon = 0.01) => {
    return a - b > epsilon;
  }, []);

  const validateCurrency = useCallback((value: string): boolean => {
    return /^\d+(\.\d{1,2})?$/.test(value);
  }, []);

  const calculateCustomerBalance = useCallback(
    (customerName: string) => {
      const customerSales = creditSales.filter(
        (sale) => sale.customerName === customerName && !sale.chequeInfo
      );

      const customerPayments = payments.filter((p) =>
        customerSales.some((s) => s.id === p.saleId)
      );

      const totalSales = customerSales.reduce(
        (sum, sale) => sum + sale.total,
        0
      );
      const totalPayments = customerPayments.reduce((sum, p) => {
        if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
          return sum;
        }
        return sum + p.amount;
      }, 0);

      return totalSales - totalPayments;
    },
    [creditSales, payments]
  );

  const calculateRemainingBalance = useCallback(
    (sale: CreditSale) => {
      if (!sale || sale.chequeInfo) return 0;

      const salePayments = payments.filter((p) => p.saleId === sale.id);
      const totalPayments = salePayments.reduce((sum, p) => {
        if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
          return sum;
        }
        return sum + p.amount;
      }, 0);

      return sale.total - totalPayments;
    },
    [payments]
  );

  const addIncomeToDailyCash = useCallback(async (sale: CreditSale) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      const totalSaleAmount = sale.total;
      const totalProfit = sale.products.reduce((sum, product) => {
        const productProfit =
          (product.price - (product.costPrice || 0)) * product.quantity;
        return sum + productProfit;
      }, 0);

      sale.paymentMethods.forEach((payment) => {
        const paymentRatio = payment.amount / totalSaleAmount;
        const paymentProfit = totalProfit * paymentRatio;

        movements.push({
          id: Date.now(),
          amount: payment.amount,
          description: `Cuenta corriente de ${sale.customerName}`,
          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod: payment.method,
          items: sale.products.map((p) => ({
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: p.price,
          })),
          profit: paymentProfit,
          isCreditPayment: true,
          originalSaleId: sale.id,
        });
      });

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
          totalProfit:
            (dailyCash.totalProfit || 0) +
            movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso en caja diaria:", error);
      throw error;
    }
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);
  const handleTabChange = useCallback((newValue: number) => {
    setInfoModalTab(newValue);
  }, []);

  const handleExportCustomerPDF = useCallback(
    async (customerName: string) => {
      setIsGeneratingPDF(true);
      try {
        const customerSales = creditSales.filter(
          (sale) => sale.customerName === customerName
        );
        const customerBalance = calculateCustomerBalance(customerName);

        const salesData = customerSales.map((sale) => {
          const salePayments = payments.filter((p) => p.saleId === sale.id);
          const totalPayments = salePayments.reduce((sum, p) => {
            if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
              return sum;
            }
            return sum + p.amount;
          }, 0);
          const remainingBalance = sale.total - totalPayments;
          const isPaid = remainingBalance <= 0;

          return {
            id: sale.id,
            date: sale.date,
            products: sale.products.map((product) => ({
              name: getDisplayProductName(
                {
                  name: product.name,
                  size: product.size,
                  color: product.color,
                  rubro: product.rubro,
                },
                rubro,
                false
              ),
              quantity: product.quantity,
              unit: product.unit,
              price: product.price,
              size: product.size,
              color: product.color,
            })),
            total: sale.total,
            totalPayments,
            remainingBalance,
            isPaid,
          };
        });

        const totalDeuda = salesData.reduce(
          (sum, sale) =>
            sale.remainingBalance > 0 ? sum + sale.remainingBalance : sum,
          0
        );

        const totalPagado = salesData.reduce(
          (sum, sale) => sum + sale.totalPayments,
          0
        );

        const pdfData = {
          customerName,
          sales: salesData,
          totalBalance: customerBalance,
          totalDeuda,
          totalPagado,
          fechaReporte: format(new Date(), "dd/MM/yyyy", { locale: es }),
        };

        const blob = await pdf(
          <ClienteCuentaCorrientePDF {...pdfData} />
        ).toBlob();

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        const fileName = `cuenta-corriente-${customerName.replace(
          /[^a-zA-Z0-9]/g,
          "-"
        )}-${format(new Date(), "dd-MM-yyyy")}.pdf`;
        link.download = fileName;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification(
          `PDF de ${customerName} generado correctamente`,
          "success"
        );
      } catch (error) {
        console.error("Error al generar PDF:", error);
        showNotification("Error al generar PDF", "error");
      } finally {
        setIsGeneratingPDF(false);
      }
    },
    [creditSales, payments, rubro, calculateCustomerBalance, showNotification]
  );

  const handleMarkCheckAsPaid = useCallback(
    async (checkId: number) => {
      try {
        const payment = await db.payments.get(checkId);
        if (!payment) return;

        const sale = await db.sales.get(payment.saleId);
        if (!sale) return;

        const totalProfit = sale.products.reduce((sum, product) => {
          const cost = product.costPrice || 0;
          return sum + (product.price - cost) * product.quantity;
        }, 0);

        const paymentRatio = payment.amount / sale.total;
        const profitCheque = totalProfit * paymentRatio;

        const today = getLocalDateString();
        const dailyCash = await db.dailyCashes.get({ date: today });

        const movement: DailyCashMovement = {
          id: Date.now(),
          amount: payment.amount,
          description: `Cobro de cheque - ${payment.customerName}`,
          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod: "CHEQUE",
          isCreditPayment: true,
          originalSaleId: payment.saleId,
          profit: profitCheque,
          items: sale.products.map((p) => ({
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: p.price,
          })),
          createdAt: new Date().toISOString(),
        };

        if (dailyCash) {
          const updatedCash = {
            ...dailyCash,
            movements: [...dailyCash.movements, movement],
            totalIncome: (dailyCash.totalIncome || 0) + payment.amount,
            totalProfit: (dailyCash.totalProfit || 0) + (profitCheque || 0),
          };
          await db.dailyCashes.update(dailyCash.id, updatedCash);
        } else {
          await db.dailyCashes.add({
            id: Date.now(),
            date: today,
            movements: [movement],
            closed: false,
            totalIncome: payment.amount,
            totalExpense: 0,
            totalProfit: profitCheque || 0,
          });
        }

        await db.payments.update(checkId, { checkStatus: "cobrado" });

        const updatedChequeInfo = sale.chequeInfo
          ? {
              ...sale.chequeInfo,
              status: "cobrado" as const,
            }
          : {
              amount: payment.amount,
              status: "cobrado" as const,
              date: new Date().toISOString(),
            };

        await db.sales.update(payment.saleId, {
          chequeInfo: updatedChequeInfo,
        } as Partial<CreditSale>);

        setPayments((prev) =>
          prev.map((p) =>
            p.id === checkId ? { ...p, checkStatus: "cobrado" } : p
          )
        );

        setCreditSales((prev) =>
          prev.map((s) =>
            s.id === payment.saleId
              ? {
                  ...s,
                  chequeInfo: updatedChequeInfo,
                }
              : s
          )
        );

        setCurrentCustomerCheques((prev) =>
          prev.map((c) =>
            c.id === checkId ? { ...c, checkStatus: "cobrado" } : c
          )
        );

        showNotification(
          "Cheque marcado como cobrado e ingresado en caja",
          "success"
        );
      } catch (error) {
        console.error("Error al actualizar estado del cheque:", error);
        showNotification("Error al actualizar cheque", "error");
      }
    },
    [setCreditSales, setPayments, showNotification]
  );

  const handleDeleteCheck = useCallback(
    async (checkId: number) => {
      try {
        const cheque = await db.payments.get(checkId);
        if (!cheque) {
          showNotification("Cheque no encontrado", "error");
          return;
        }

        await db.payments.delete(checkId);

        const remainingPayments = await db.payments
          .where("saleId")
          .equals(cheque.saleId)
          .toArray();

        if (remainingPayments.length === 0) {
          await db.sales.delete(cheque.saleId);
          setCreditSales((prev) => prev.filter((s) => s.id !== cheque.saleId));
        } else {
          const sale = await db.sales.get(cheque.saleId);
          if (sale) {
            await db.sales.update(cheque.saleId, {
              paid: remainingPayments.some(
                (p) => p.method !== "CHEQUE" || p.checkStatus === "cobrado"
              ),
              chequeInfo: undefined,
            });
            setCreditSales((prev) =>
              prev.map((s) =>
                s.id === cheque.saleId
                  ? {
                      ...s,
                      paid: remainingPayments.some(
                        (p) =>
                          p.method !== "CHEQUE" || p.checkStatus === "cobrado"
                      ),
                      chequeInfo: undefined,
                    }
                  : s
              )
            );
          }
        }

        setPayments((prev) => prev.filter((p) => p.id !== checkId));
        setCurrentCustomerCheques((prev) =>
          prev.filter((c) => c.id !== checkId)
        );

        if (currentCustomerInfo) {
          const updatedBalance = calculateCustomerBalance(
            currentCustomerInfo.name
          );
          setCurrentCustomerInfo((prev) =>
            prev ? { ...prev, balance: updatedBalance } : null
          );
        }

        showNotification("Cheque eliminado correctamente", "success");
      } catch (error) {
        console.error("Error al eliminar cheque:", error);
        showNotification("Error al eliminar cheque", "error");
      }
    },
    [
      currentCustomerInfo,
      calculateCustomerBalance,
      setCreditSales,
      setPayments,
      showNotification,
    ]
  );

  const handleDeleteCustomerCredits = useCallback(async () => {
    if (!customerToDelete) return;

    try {
      const customer = customers.find((c) => c.name === customerToDelete);

      if (!customer) {
        showNotification("Cliente no encontrado", "error");
        return;
      }

      const salesToDelete = creditSales
        .filter((sale) => sale.customerName === customerToDelete)
        .map((sale) => sale.id);

      await db.sales.bulkDelete(salesToDelete);
      await db.payments.where("saleId").anyOf(salesToDelete).delete();

      setCreditSales((prev) =>
        prev.filter((sale) => sale.customerName !== customerToDelete)
      );
      setPayments((prev) =>
        prev.filter((p) => !salesToDelete.includes(p.saleId))
      );

      showNotification(
        `Todas las cuentas corrientes de ${customerToDelete} eliminadas`,
        "success"
      );
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setIsInfoModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar cuentas corrientes:", error);
      showNotification("Error al eliminar cuentas corrientes", "error");
    }
  }, [
    customerToDelete,
    creditSales,
    customers,
    setCreditSales,
    setPayments,
    showNotification,
  ]);

  const handlePayment = useCallback(async () => {
    const invalidPayment = paymentMethods.some(
      (method) => !validateCurrency(method.amount.toString())
    );

    if (invalidPayment) {
      showNotification("Los montos deben tener hasta 2 decimales", "error");
      return;
    }
    if (!currentCreditSale) return;

    const totalPayment = parseFloat(
      paymentMethods.reduce((sum, method) => sum + method.amount, 0).toFixed(2)
    );
    const remainingBalance = parseFloat(
      calculateRemainingBalance(currentCreditSale).toFixed(2)
    );

    if (totalPayment <= 0) {
      showNotification("El monto debe ser mayor a cero", "error");
      return;
    }

    if (isFirstGreater(totalPayment, remainingBalance)) {
      showNotification("El monto excede el saldo pendiente", "error");
      return;
    }

    try {
      setIsPaymentModalOpen(false);
      setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);

      for (const method of paymentMethods) {
        if (method.amount > 0) {
          const newPayment: Payment = {
            id: Date.now() + Math.random(),
            saleId: currentCreditSale.id,
            saleDate: currentCreditSale.date,
            amount: method.amount,
            date: new Date().toISOString(),
            method: method.method,
          };
          await db.payments.add(newPayment);
        }
      }

      const newRemainingBalance = remainingBalance - totalPayment;

      if (newRemainingBalance <= 0.01) {
        await db.sales.update(currentCreditSale.id, {
          paid: true,
        } as Partial<CreditSale>);
      }

      if (newRemainingBalance <= 0.01) {
        const saleToRegister: CreditSale = {
          ...currentCreditSale,
          total: totalPayment,
          paid: true,
          paymentMethods: paymentMethods.filter((m) => m.amount > 0),
        };
        await addIncomeToDailyCash(saleToRegister);
      }

      const updatedPayments = await db.payments.toArray();
      const updatedSales = await db.sales.toArray();
      const creditSales = updatedSales.filter(
        (sale) => sale.credit === true
      ) as CreditSale[];

      setPayments(updatedPayments);
      setCreditSales(creditSales);

      if (currentCustomerInfo && isInfoModalOpen) {
        const updatedBalance = calculateCustomerBalance(
          currentCustomerInfo.name
        );
        setCurrentCustomerInfo((prev) =>
          prev ? { ...prev, balance: updatedBalance } : null
        );
      }

      showNotification("Pago registrado correctamente", "success");
    } catch (error) {
      console.error("Error al registrar pago:", error);
      showNotification("Error al registrar pago", "error");
      setIsPaymentModalOpen(true);
    }
  }, [
    currentCreditSale,
    paymentMethods,
    validateCurrency,
    isFirstGreater,
    calculateRemainingBalance,
    setCreditSales,
    setPayments,
    addIncomeToDailyCash,
    currentCustomerInfo,
    calculateCustomerBalance,
    showNotification,
    isInfoModalOpen,
  ]);

  const handleOpenChequesModal = useCallback(
    async (customerName: string) => {
      try {
        console.log("🔍 Buscando cheques para:", customerName);

        const allCheques = await db.payments
          .where("method")
          .equals("CHEQUE")
          .toArray();

        console.log("📋 Todos los cheques encontrados:", allCheques);

        allCheques.forEach((cheque, index) => {
          console.log(`Cheque ${index}:`, {
            id: cheque.id,
            customerName: cheque.customerName,
            saleId: cheque.saleId,
            amount: cheque.amount,
            method: cheque.method,
          });
        });

        const customerCheques = allCheques.filter((cheque) => {
          if (
            cheque.customerName &&
            cheque.customerName.toLowerCase().trim() ===
              customerName.toLowerCase().trim()
          ) {
            return true;
          }

          if (cheque.saleId) {
            return false;
          }

          return false;
        });

        console.log("✅ Cheques filtrados por nombre:", customerCheques);

        if (customerCheques.length === 0) {
          console.log("🔄 Buscando cheques a través de las ventas...");

          const chequesWithSales = await Promise.all(
            allCheques.map(async (cheque) => {
              if (!cheque.saleId) return null;

              try {
                const sale = await db.sales.get(cheque.saleId);
                if (
                  sale &&
                  sale.customerName &&
                  sale.customerName.toLowerCase().trim() ===
                    customerName.toLowerCase().trim()
                ) {
                  return { cheque, sale };
                }
              } catch (error) {
                console.error("Error al cargar venta:", error);
              }
              return null;
            })
          );

          const validCheques = chequesWithSales.filter(Boolean) as {
            cheque: Payment;
            sale: CreditSale;
          }[];
          console.log(
            "📊 Cheques encontrados a través de ventas:",
            validCheques
          );

          if (validCheques.length > 0) {
            const chequesWithDetails = await Promise.all(
              validCheques.map(async ({ cheque, sale }) => {
                const saleItems: SaleItem[] =
                  sale.products?.map((product) => ({
                    productId: product.id,
                    productName: product.name,
                    quantity: product.quantity,
                    unit: product.unit,
                    price: product.price,
                    size: product.size,
                    color: product.color,
                    rubro: product.rubro,
                  })) || [];

                return {
                  ...cheque,
                  customerName: sale.customerName,
                  saleDate: sale.date,
                  products: saleItems,
                  saleTotal: sale.total,
                };
              })
            );

            setCurrentCustomerCheques(chequesWithDetails);
            setIsChequesModalOpen(true);
            return;
          }
        } else {
          const chequesWithDetails = await Promise.all(
            customerCheques.map(async (cheque) => {
              const sale = await db.sales.get(cheque.saleId);
              const saleItems: SaleItem[] =
                sale?.products?.map((product) => ({
                  productId: product.id,
                  productName: product.name,
                  quantity: product.quantity,
                  unit: product.unit,
                  price: product.price,
                  size: product.size,
                  color: product.color,
                  rubro: product.rubro,
                })) || [];

              return {
                ...cheque,
                saleDate: sale?.date || "",
                products: saleItems,
                saleTotal: sale?.total || 0,
              };
            })
          );

          setCurrentCustomerCheques(chequesWithDetails);
        }

        setIsChequesModalOpen(true);

        console.log("🎯 Cheques finales para mostrar:", currentCustomerCheques);

        if (currentCustomerCheques.length === 0) {
          console.log("❌ No se encontraron cheques para:", customerName);
          showNotification(
            `No se encontraron cheques para ${customerName}`,
            "info"
          );
        } else {
          console.log(
            `✅ Se encontraron ${currentCustomerCheques.length} cheques para ${customerName}`
          );
        }
      } catch (error) {
        console.error("❌ Error al cargar cheques:", error);
        showNotification("Error al cargar cheques del cliente", "error");
      }
    },
    [showNotification]
  );

  const handleOpenInfoModal = useCallback(
    (sale: CreditSale) => {
      const customerSales = creditSales.filter(
        (cs) => cs.customerName === sale.customerName && !cs.chequeInfo
      );

      setCurrentCustomerInfo({
        name: sale.customerName,
        balance: calculateCustomerBalance(sale.customerName),
        sales: customerSales,
      });
      setIsInfoModalOpen(true);
      setExpandedSale(null);
      setInfoModalTab(0);
    },
    [creditSales, calculateCustomerBalance]
  );

  const addPaymentMethod = useCallback(() => {
    setPaymentMethods((prev) => {
      if (prev.length >= CUENTAS_CONFIG.MAX_PAYMENT_METHODS) return prev;

      const total = calculateRemainingBalance(currentCreditSale!);
      const usedMethods = prev.map((m) => m.method);
      const availableMethod = [
        { value: "EFECTIVO", label: "Efectivo" },
        { value: "TRANSFERENCIA", label: "Transferencia" },
        { value: "TARJETA", label: "Tarjeta" },
      ].find((option) => !usedMethods.includes(option.value as PaymentMethod));

      if (!availableMethod) return prev;

      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = total / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: availableMethod.value as PaymentMethod,
            amount: share,
          },
        ];
      }

      return [
        ...prev,
        {
          method: availableMethod.value as PaymentMethod,
          amount: 0,
        },
      ];
    });
  }, [currentCreditSale, calculateRemainingBalance]);

  const handlePaymentMethodChange = useCallback(
    (index: number, field: keyof PaymentSplit, value: string | number) => {
      setPaymentMethods((prev) => {
        const updated = [...prev];
        const remainingBalance = calculateRemainingBalance(currentCreditSale!);

        if (field === "amount") {
          const numericValue = typeof value === "number" ? value : 0;

          updated[index] = {
            ...updated[index],
            amount: parseFloat(numericValue.toFixed(2)),
          };

          if (updated.length === 2) {
            const totalPayment = updated.reduce((sum, m) => sum + m.amount, 0);
            const difference = remainingBalance - totalPayment;

            if (difference !== 0) {
              const otherIndex = index === 0 ? 1 : 0;
              updated[otherIndex].amount = Math.max(
                0,
                updated[otherIndex].amount + difference
              );
            }
          }
        } else {
          updated[index] = {
            ...updated[index],
            method: value as PaymentMethod,
          };
        }
        return updated;
      });
    },
    [currentCreditSale, calculateRemainingBalance]
  );

  const removePaymentMethod = useCallback(
    (index: number) => {
      setPaymentMethods((prev) => {
        if (prev.length <= 1) return prev;

        const updatedMethods = [...prev];
        updatedMethods.splice(index, 1);

        const total = calculateRemainingBalance(currentCreditSale!);

        if (updatedMethods.length === 1) {
          updatedMethods[0].amount = total;
        } else {
          const share = total / updatedMethods.length;
          updatedMethods.forEach((m, i) => {
            updatedMethods[i] = {
              ...m,
              amount: share,
            };
          });
        }

        return updatedMethods;
      });
    },
    [currentCreditSale, calculateRemainingBalance]
  );

  const handleExpandSale = useCallback(
    (saleId: number) => {
      setExpandedSale(expandedSale === saleId ? null : saleId);
    },
    [expandedSale]
  );

  const filteredSales = useMemo(() => {
    return creditSales
      .filter((sale) => {
        const matchesSearch = sale.customerName
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesRubro =
          rubro === "Todos los rubros" ||
          sale.products.some((product) => product.rubro === rubro);

        return matchesSearch && matchesRubro;
      })
      .sort((a, b) => {
        if (a.paid !== b.paid) {
          return a.paid ? 1 : -1;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [creditSales, searchQuery, rubro]);

  const salesByCustomer = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      if (!acc[sale.customerName]) {
        acc[sale.customerName] = [];
      }
      acc[sale.customerName].push(sale);
      return acc;
    }, {} as Record<string, CreditSale[]>);
  }, [filteredSales]);

  const sortedCustomerNames = useMemo(() => {
    return Object.keys(salesByCustomer).sort((a, b) => {
      const customerAHasUnpaid = salesByCustomer[a].some((sale) => !sale.paid);
      const customerBHasUnpaid = salesByCustomer[b].some((sale) => !sale.paid);
      if (customerAHasUnpaid !== customerBHasUnpaid) {
        return customerAHasUnpaid ? -1 : 1;
      }
      return a.localeCompare(b);
    });
  }, [salesByCustomer]);

  const totalCustomers = sortedCustomerNames.length;
  const indexOfLastCredit = currentPage * itemsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - itemsPerPage;

  const currentCustomers = useMemo(() => {
    return sortedCustomerNames.slice(indexOfFirstCredit, indexOfLastCredit);
  }, [sortedCustomerNames, indexOfFirstCredit, indexOfLastCredit]);

  const customerBalanceMap = useMemo(() => {
    const balanceMap: Record<string, number> = {};
    sortedCustomerNames.forEach((customerName) => {
      balanceMap[customerName] = calculateCustomerBalance(customerName);
    });
    return balanceMap;
  }, [sortedCustomerNames, calculateCustomerBalance]);

  const oldestSaleMap = useMemo(() => {
    const oldestMap: Record<string, CreditSale> = {};
    sortedCustomerNames.forEach((customerName) => {
      const sales = salesByCustomer[customerName];
      const sortedSales = [...sales].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      oldestMap[customerName] = sortedSales[0];
    });
    return oldestMap;
  }, [sortedCustomerNames, salesByCustomer]);

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchData();
      } catch {
        showNotification("Error al cargar las cuentas corrientes", "error");
      }
    };

    loadData();
  }, [fetchData, showNotification]);

  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Cuentas Corrientes
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <SearchBar onSearch={handleSearch} />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "63vh", flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                    >
                      Cliente
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Deuda
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 4 : 3}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            py: 4,
                          }}
                        >
                          <Box
                            sx={{
                              animation: "spin 1s linear infinite",
                              width: "32px",
                              height: "32px",
                              border: "2px solid",
                              borderColor: "primary.main transparent",
                              borderRadius: "50%",
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : totalCustomers > 0 ? (
                    currentCustomers.map((customerName) => {
                      const customerBalance = customerBalanceMap[customerName];
                      const oldestSale = oldestSaleMap[customerName];

                      return (
                        <TableRow
                          key={customerName}
                          hover
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { backgroundColor: "action.hover" },
                            transition: "all 0.3s",
                          }}
                        >
                          <TableCell>
                            <Typography fontWeight="bold">
                              {customerName}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {format(new Date(oldestSale.date), "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              fontWeight="bold"
                              color={
                                customerBalance <= 0
                                  ? "success.main"
                                  : "error.main"
                              }
                            >
                              {customerBalance.toLocaleString("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              })}
                            </Typography>
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CustomGlobalTooltip title="Ver información detallada">
                                  <IconButton
                                    onClick={() =>
                                      handleOpenInfoModal(oldestSale)
                                    }
                                    size="small"
                                    sx={{
                                      borderRadius: "4px",
                                      color: "secondary.main",
                                      "&:hover": {
                                        backgroundColor: "primary.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <InfoIcon fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                                <CustomGlobalTooltip title="Descargar PDF">
                                  <span>
                                    {" "}
                                    {/* Wrapper necesario para tooltip con elemento deshabilitado */}
                                    <IconButton
                                      onClick={() =>
                                        handleExportCustomerPDF(customerName)
                                      }
                                      size="small"
                                      sx={{
                                        borderRadius: "4px",
                                        color: "text.secondary",
                                        "&:hover": {
                                          backgroundColor: "primary.main",
                                          color: "white",
                                        },
                                      }}
                                      disabled={isGeneratingPDF}
                                    >
                                      <DownloadIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </CustomGlobalTooltip>
                                <CustomGlobalTooltip title="Ver cheques">
                                  <IconButton
                                    onClick={() =>
                                      handleOpenChequesModal(customerName)
                                    }
                                    size="small"
                                    sx={{
                                      borderRadius: "4px",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "primary.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <WalletIcon fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                                <CustomGlobalTooltip title="Eliminar cuentas">
                                  <IconButton
                                    onClick={() => {
                                      setCustomerToDelete(customerName);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    size="small"
                                    sx={{
                                      borderRadius: "4px",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "error.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 4 : 3}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <WalletIcon
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>
                            No hay cuentas corrientes registradas.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {totalCustomers > 0 && (
            <Pagination
              text="Cuentas corrientes por página"
              text2="Total de cuentas corrientes"
              totalItems={totalCustomers}
            />
          )}
        </Box>

        {/* Modales */}
        <InfoModal
          isOpen={isInfoModalOpen}
          currentCustomerInfo={currentCustomerInfo}
          payments={payments}
          rubro={rubro}
          expandedSale={expandedSale}
          infoModalTab={infoModalTab}
          onClose={() => {
            setIsInfoModalOpen(false);
            setExpandedSale(null);
            setInfoModalTab(0);
          }}
          onPayment={(sale) => {
            setCurrentCreditSale(sale);
            setIsPaymentModalOpen(true);
          }}
          onExpandSale={handleExpandSale}
          calculateRemainingBalance={calculateRemainingBalance}
          onTabChange={handleTabChange}
        />

        <ChequesModal
          isOpen={isChequesModalOpen}
          currentCustomerInfo={currentCustomerInfo}
          currentCustomerCheques={currentCustomerCheques}
          chequeFilter={chequeFilter}
          rubro={rubro}
          onClose={() => setIsChequesModalOpen(false)}
          onFilterChange={setChequeFilter}
          onMarkCheckAsPaid={handleMarkCheckAsPaid}
          onDeleteCheck={handleDeleteCheck}
        />

        <PaymentModal
          isOpen={isPaymentModalOpen}
          currentCreditSale={currentCreditSale}
          paymentMethods={paymentMethods}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
          }}
          onPayment={handlePayment}
          onPaymentMethodChange={handlePaymentMethodChange}
          onRemovePaymentMethod={removePaymentMethod}
          onAddPaymentMethod={addPaymentMethod}
          calculateRemainingBalance={calculateRemainingBalance}
          isFirstGreater={isFirstGreater}
        />

        {/* Modal de eliminación */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Cuentas Corrientes"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsDeleteModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleDeleteCustomerCredits}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Sí, Eliminar
              </Button>
            </Box>
          }
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro que desea eliminar las cuentas corrientes?
            </Typography>
          </Box>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={closeNotification}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default CuentasCorrientesPage;
