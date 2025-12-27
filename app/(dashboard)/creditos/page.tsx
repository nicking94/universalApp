"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
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
  FormControl,
  Alert,
  useTheme,
  IconButton,
  Autocomplete,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  Badge,
  Avatar,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  Warning,
  CheckCircle,
  Info,
  ExpandMore,
  Receipt as ReceiptIcon,
  AccountCircle as AccountCircleIcon,
  ExpandLess,
  CreditCard,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { format, parseISO } from "date-fns";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { useCreditInstallments } from "@/app/hooks/useCreditInstallments";
import { useNotification } from "@/app/hooks/useNotification";
import { usePagination } from "@/app/context/PaginationContext";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  Payment,
  Rubro,
} from "@/app/lib/types/types";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Pagination from "@/app/components/Pagination";
import CustomChip from "@/app/components/CustomChip";
import { useRubro } from "@/app/context/RubroContext";
import { CustomerFinancialSummary } from "@/app/components/CustomerFinancialSummary";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import Input from "@/app/components/Input";
import { es } from "date-fns/locale";

interface CustomerCreditSummary {
  customerId: string;
  customerName: string;
  totalCreditAmount: number;
  totalPaidAmount: number;
  pendingAmount: number;
  totalInstallments: number;
  pendingInstallments: number;
  overdueInstallments: number;
  paidInstallments: number;
  lastPaymentDate?: string | null;
  nextDueDate?: string | null;
  installments: Installment[];
  creditSales: CreditSale[];
  totalInterestAmount: number;
  totalPrincipalAmount: number;
}

interface CustomerOption {
  id: string;
  name: string;
  rubro?: Rubro;
}

interface CreditSummary {
  saleId: number;
  saleDate: string;
  totalAmount: number;
  principalAmount: number;
  interestAmount: number;
  numberOfInstallments: number;
  interestRate: number;
  paidAmount: number;
  pendingAmount: number;
  installments: Installment[];
  nextDueDate?: string;
  status: string;
  customerName: string;
}

interface CreditSaleCardProps {
  credit: CreditSummary;
  onPayment: (credit: CreditSummary) => void;
  onPayAll: (credit: CreditSummary) => void;
  onDelete?: (credit: CreditSummary) => void;
  onPaymentSuccess?: () => void;
  isExpanded: boolean;
  onToggleExpand: (saleId: number) => void;
  showDeleteButton?: boolean;
}

const CreditSaleCard = ({
  credit,
  onPayment,
  onPayAll,
  onDelete,
  isExpanded,
  onToggleExpand,
  showDeleteButton = false,
}: CreditSaleCardProps) => {
  const paymentProgress = (credit.paidAmount / credit.totalAmount) * 100;
  const isPaid = credit.pendingAmount <= 0;
  const pendingInstallments = credit.installments.filter(
    (inst) => inst.status === "pendiente" || inst.status === "vencida"
  );
  const hasMultiplePending = pendingInstallments.length > 1;

  return (
    <Card
      sx={{
        border: 2,
        borderColor: isPaid
          ? "success.main"
          : credit.status === "Vencido"
          ? "error.main"
          : "warning.main",
        bgcolor: isPaid
          ? "success.50"
          : credit.status === "Vencido"
          ? "error.50"
          : "warning.50",
        transition: "all 0.3s ease",
        "&:hover": {
          boxShadow: 3,
          transform: "translateY(-2px)",
        },
        overflow: "visible",
        mb: 2,
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
          onClick={() => onToggleExpand(credit.saleId)}
        >
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
              <ReceiptIcon color="primary" fontSize="small" />
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                color="text.primary"
              >
                Venta #{credit.saleId}
              </Typography>
              <CustomChip
                label={credit.status}
                color={
                  credit.status === "Pagado"
                    ? "success"
                    : credit.status === "Vencido"
                    ? "error"
                    : "warning"
                }
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {format(parseISO(credit.saleDate), "dd/MM/yyyy HH:mm", {
                locale: es,
              })}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 2,
                mt: 2,
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
                  {credit.totalAmount.toLocaleString("es-AR", {
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
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  color="success.main"
                >
                  {credit.paidAmount.toLocaleString("es-AR", {
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
                  color="warning.main"
                >
                  {credit.pendingAmount.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
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
                  Tasa de interés
                </Typography>
                <Typography variant="body2">{credit.interestRate}%</Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Cuotas
                </Typography>
                <Typography variant="body2">
                  {credit.numberOfInstallments}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Interés total
                </Typography>
                <Typography variant="body2">
                  {credit.interestAmount.toLocaleString("es-AR", {
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
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {!isPaid && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={(e) => {
                    e?.stopPropagation();
                    onPayment(credit);
                  }}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                    whiteSpace: "nowrap",
                    minWidth: "120px",
                  }}
                >
                  Pagar Cuota
                </Button>

                {hasMultiplePending && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={(e) => {
                      e?.stopPropagation();
                      onPayAll(credit);
                    }}
                    sx={{
                      color: "text.secondary",
                      borderColor: "text.secondary",
                      "&:hover": {
                        backgroundColor: "action.hover",
                        borderColor: "text.primary",
                      },
                    }}
                  >
                    Pagar Todas ({pendingInstallments.length})
                  </Button>
                )}
              </Box>
            )}

            {/* Botón de eliminar (solo si está completamente pagado y se muestra) */}
            {showDeleteButton && isPaid && onDelete && (
              <CustomGlobalTooltip title="Eliminar crédito">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(credit);
                  }}
                  sx={{
                    color: "error.main",
                    "&:hover": {
                      backgroundColor: "error.50",
                    },
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CustomGlobalTooltip>
            )}

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand(credit.saleId);
              }}
            >
              {isExpanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
        </Box>

        {isExpanded && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" fontWeight="medium" sx={{ mb: 1 }}>
              Detalle de Cuotas
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: "200px" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                    >
                      N° Cuota
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Vencimiento
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Monto
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Interés
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
                      align="center"
                    >
                      Estado
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credit.installments.map((installment) => {
                    const isOverdue = installment.status === "vencida";
                    const isPaid = installment.status === "pagada";

                    return (
                      <TableRow key={installment.id} hover>
                        <TableCell>{installment.number}</TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.5,
                            }}
                          >
                            {format(
                              parseISO(installment.dueDate),
                              "dd/MM/yyyy"
                            )}
                            {isOverdue && (
                              <CustomChip
                                label={`+${installment.daysOverdue || 0}d`}
                                size="small"
                                color="error"
                                sx={{ height: 20, fontSize: "0.7rem" }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {installment.amount.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </TableCell>
                        <TableCell align="center">
                          {(installment.interestAmount || 0).toLocaleString(
                            "es-AR",
                            {
                              style: "currency",
                              currency: "ARS",
                            }
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <CustomChip
                            label={installment.status}
                            color={
                              isPaid
                                ? "success"
                                : isOverdue
                                ? "error"
                                : "warning"
                            }
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const debounce = <Args extends unknown[]>(
  func: (...args: Args) => void,
  wait: number
): ((...args: Args) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const CreditosPage = () => {
  const theme = useTheme();
  const [selectedInstallment, setSelectedInstallment] =
    useState<Installment | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("EFECTIVO");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [inputValue, setInputValue] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [customerSummaries, setCustomerSummaries] = useState<
    CustomerCreditSummary[]
  >([]);
  const [selectedCustomerSummary, setSelectedCustomerSummary] =
    useState<CustomerCreditSummary | null>(null);
  const [selectedCustomerOption, setSelectedCustomerOption] =
    useState<CustomerOption | null>(null);
  const [customerDetailModalOpen, setCustomerDetailModalOpen] = useState(false);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [creditSummaries, setCreditSummaries] = useState<CreditSummary[]>([]);
  const [expandedCreditId, setExpandedCreditId] = useState<number | null>(null);
  const [infoModalTab, setInfoModalTab] = useState(0);
  const [selectedCreditForAllPayments, setSelectedCreditForAllPayments] =
    useState<CreditSummary | null>(null);
  const [allPaymentsModalOpen, setAllPaymentsModalOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [creditToDelete, setCreditToDelete] = useState<CreditSummary | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedCustomerForDeletion, setSelectedCustomerForDeletion] =
    useState<CustomerCreditSummary | null>(null);

  // Cache de datos
  const [cachedSummaries, setCachedSummaries] = useState<
    Map<string, CustomerCreditSummary>
  >(new Map());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const {
    overdueInstallments,
    payInstallment,
    payAllInstallments,
    checkOverdueInstallments,
    getCreditSalesInInstallments,
  } = useCreditInstallments();

  const { currentPage, itemsPerPage } = usePagination();
  const { showNotification } = useNotification();
  const { rubro } = useRubro();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);

  const tableHeaderStyle = {
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  };

  // Función para eliminar crédito (añade esta función)
  const deleteCreditSale = async (
    creditSaleId: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const sale = await db.sales.get(creditSaleId);
      if (!sale) {
        throw new Error("Venta a crédito no encontrada");
      }

      // Verificar si hay cuotas pendientes
      const pendingInstallments = await db.installments
        .where("creditSaleId")
        .equals(creditSaleId)
        .and((inst) => inst.status === "pendiente" || inst.status === "vencida")
        .toArray();

      if (pendingInstallments.length > 0) {
        throw new Error(
          `No se puede eliminar. Hay ${pendingInstallments.length} cuotas pendientes.`
        );
      }

      // Eliminar todas las cuotas asociadas
      await db.installments.where("creditSaleId").equals(creditSaleId).delete();

      // Eliminar la venta
      await db.sales.delete(creditSaleId);

      // Actualizar movimientos de caja relacionados si existen
      const dailyCashes = await db.dailyCashes.toArray();
      for (const dailyCash of dailyCashes) {
        const updatedMovements = dailyCash.movements.filter(
          (movement) => movement.originalSaleId !== creditSaleId
        );

        if (updatedMovements.length !== dailyCash.movements.length) {
          await db.dailyCashes.update(dailyCash.id, {
            movements: updatedMovements,
          });
        }
      }

      return {
        success: true,
        message: "Crédito eliminado correctamente",
      };
    } catch (error) {
      console.error("Error al eliminar el crédito:", error);
      throw error;
    }
  };

  // Optimizar calculateCreditSummaries con useMemo
  const calculateCreditSummaries = useCallback(
    (customerSummary: CustomerCreditSummary): CreditSummary[] => {
      const summaries: CreditSummary[] = [];

      customerSummary.creditSales.forEach((sale) => {
        const saleInstallments = customerSummary.installments.filter(
          (inst) => inst.creditSaleId === sale.id
        );

        // Calcular montos de manera eficiente
        let paidAmount = 0;
        let pendingAmount = 0;
        let interestAmount = 0;
        let earliestDueDate: string | null = null;
        let hasVencidas = false;

        for (const inst of saleInstallments) {
          interestAmount += inst.interestAmount || 0;

          if (inst.status === "pagada") {
            paidAmount += inst.amount;
          } else if (inst.status === "pendiente" || inst.status === "vencida") {
            pendingAmount += inst.amount;
            if (inst.status === "vencida") {
              hasVencidas = true;
            }
            if (!earliestDueDate || inst.dueDate < earliestDueDate) {
              earliestDueDate = inst.dueDate;
            }
          }
        }

        const status =
          pendingAmount === 0
            ? "Pagado"
            : hasVencidas
            ? "Vencido"
            : "Pendiente";

        summaries.push({
          saleId: sale.id,
          saleDate: sale.date,
          totalAmount: sale.total,
          principalAmount: sale.total - interestAmount,
          interestAmount: interestAmount,
          numberOfInstallments: saleInstallments.length,
          interestRate: sale.creditDetails?.interestRate || 0,
          paidAmount: paidAmount,
          pendingAmount: pendingAmount,
          installments: saleInstallments,
          nextDueDate: earliestDueDate || undefined,
          status: status,
          customerName: sale.customerName || customerSummary.customerName,
        });
      });

      return summaries.sort(
        (a, b) =>
          new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
      );
    },
    []
  );

  // Optimizar calculateCustomerSummaries
  const calculateCustomerSummaries = useCallback(async (): Promise<
    CustomerCreditSummary[]
  > => {
    try {
      const [creditSales, allInstallments] = await Promise.all([
        getCreditSalesInInstallments(),
        db.installments.toArray(),
      ]);

      const customerMap = new Map<string, CustomerCreditSummary>();
      const installmentsBySale = new Map<number, Installment[]>();

      // Pre-procesar cuotas por venta
      allInstallments.forEach((inst) => {
        if (!installmentsBySale.has(inst.creditSaleId)) {
          installmentsBySale.set(inst.creditSaleId, []);
        }
        installmentsBySale.get(inst.creditSaleId)!.push(inst);
      });

      for (const sale of creditSales) {
        const customerKey = sale.customerId || sale.customerName;

        if (!customerKey || !sale.customerName) continue;

        if (!customerMap.has(customerKey)) {
          customerMap.set(customerKey, {
            customerId: sale.customerId || customerKey,
            customerName: sale.customerName,
            totalCreditAmount: 0,
            totalPaidAmount: 0,
            totalPrincipalAmount: 0,
            totalInterestAmount: 0,
            pendingAmount: 0,
            totalInstallments: 0,
            pendingInstallments: 0,
            overdueInstallments: 0,
            paidInstallments: 0,
            installments: [],
            creditSales: [],
            lastPaymentDate: null,
            nextDueDate: null,
          });
        }

        const summary = customerMap.get(customerKey)!;
        summary.creditSales.push(sale);

        const creditAmount = sale.creditDetails?.totalAmount || sale.total;
        summary.totalCreditAmount += creditAmount;

        const principalAmount =
          sale.creditDetails?.principalAmount || sale.total;
        summary.totalPrincipalAmount += principalAmount;

        const saleInstallments = installmentsBySale.get(sale.id) || [];
        summary.installments.push(...saleInstallments);

        let earliestDueDate: string | null = null;

        for (const installment of saleInstallments) {
          summary.totalInstallments++;

          if (installment.status === "pagada") {
            summary.paidInstallments++;
            summary.totalPaidAmount += installment.amount;
            summary.totalInterestAmount += installment.interestAmount || 0;

            if (installment.paymentDate) {
              const paymentDate = new Date(installment.paymentDate);
              if (
                !summary.lastPaymentDate ||
                paymentDate > new Date(summary.lastPaymentDate)
              ) {
                summary.lastPaymentDate = installment.paymentDate;
              }
            }
          } else if (
            installment.status === "pendiente" ||
            installment.status === "vencida"
          ) {
            if (installment.status === "vencida") {
              summary.overdueInstallments++;
            }

            summary.pendingInstallments++;
            if (!earliestDueDate || installment.dueDate < earliestDueDate) {
              earliestDueDate = installment.dueDate;
            }
          }
        }

        if (
          earliestDueDate &&
          (!summary.nextDueDate || earliestDueDate < summary.nextDueDate)
        ) {
          summary.nextDueDate = earliestDueDate;
        }
      }

      // Calcular montos pendientes
      for (const summary of customerMap.values()) {
        summary.pendingAmount = Math.max(
          0,
          summary.totalCreditAmount - summary.totalPaidAmount
        );
      }

      return Array.from(customerMap.values());
    } catch (error) {
      console.error("Error calculando resúmenes por cliente:", error);
      return [];
    }
  }, [getCreditSalesInInstallments]);

  const loadCustomerPayments = async (customerId: string) => {
    try {
      const payments = await db.payments
        .where("customerId")
        .equals(customerId)
        .toArray();
      setCustomerPayments(payments);
    } catch (error) {
      console.error("Error cargando pagos del cliente:", error);
      setCustomerPayments([]);
    }
  };

  // Función optimizada para actualizar cache de un cliente específico
  const updateCustomerSummary = useCallback(
    async (customerId: string) => {
      try {
        const summaries = await calculateCustomerSummaries();
        const currentSummary = summaries.find(
          (s) => s.customerId === customerId
        );

        if (currentSummary) {
          // Actualizar cache
          setCachedSummaries((prev) => {
            const newCache = new Map(prev);
            newCache.set(customerId, currentSummary);
            return newCache;
          });

          // Si es el cliente seleccionado, actualizar estado
          if (selectedCustomerSummary?.customerId === customerId) {
            setSelectedCustomerSummary(currentSummary);
            const creditSummaries = calculateCreditSummaries(currentSummary);
            setCreditSummaries(creditSummaries);
          }
        }
      } catch (error) {
        console.error("Error actualizando resumen del cliente:", error);
      }
    },
    [
      calculateCustomerSummaries,
      calculateCreditSummaries,
      selectedCustomerSummary,
    ]
  );

  // Cargar datos iniciales (solo críticos)
  const loadInitialData = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      // Cargar datos críticos en paralelo
      const [sales] = await Promise.all([
        getCreditSalesInInstallments(),
        checkOverdueInstallments(),
      ]);

      setCreditSales(sales);

      // Procesar clientes
      const customerMap = new Map<string, CustomerOption>();
      sales.forEach((sale) => {
        if (sale.customerName && !customerMap.has(sale.customerName)) {
          customerMap.set(sale.customerName, {
            id: sale.customerId || `temp-${sale.customerName}`,
            name: sale.customerName,
          });
        }
      });

      const allCustomers = Array.from(customerMap.values());
      const filteredCustomers = await applyRubroFilter(
        allCustomers,
        sales,
        rubro
      );

      setCustomers(filteredCustomers);
      setInitialDataLoaded(true);

      // Cargar resúmenes en segundo plano
      setTimeout(async () => {
        try {
          const summaries = await calculateCustomerSummaries();

          // Actualizar cache
          const newCache = new Map();
          summaries.forEach((summary) => {
            newCache.set(summary.customerId, summary);
          });
          setCachedSummaries(newCache);
          setLastRefresh(new Date());

          setCustomerSummaries(summaries);
        } catch (error) {
          console.error("Error cargando resúmenes en segundo plano:", error);
        }
      }, 100);
    } catch (error) {
      console.error("Error al cargar datos iniciales:", error);
      showNotification("Error al cargar datos", "error");
    } finally {
      setIsLoading(false);
    }
  }, [
    rubro,
    isLoading,
    getCreditSalesInInstallments,
    checkOverdueInstallments,
    calculateCustomerSummaries,
    showNotification,
  ]);

  // Cargar datos completos (con cache)
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (isLoading && !forceRefresh) return;

      const now = new Date();
      const shouldRefresh =
        forceRefresh ||
        !lastRefresh ||
        now.getTime() - lastRefresh.getTime() > 60000; // Refrescar cada minuto

      if (!shouldRefresh && cachedSummaries.size > 0) {
        // Usar cache
        setCustomerSummaries(Array.from(cachedSummaries.values()));

        // Si hay un cliente seleccionado, actualizar sus datos
        if (selectedCustomerSummary) {
          const cachedSummary = cachedSummaries.get(
            selectedCustomerSummary.customerId
          );
          if (cachedSummary) {
            setSelectedCustomerSummary(cachedSummary);
            const creditSummaries = calculateCreditSummaries(cachedSummary);
            setCreditSummaries(creditSummaries);
          }
        }
        return;
      }

      await loadInitialData();
    },
    [
      isLoading,
      lastRefresh,
      cachedSummaries,
      selectedCustomerSummary,
      calculateCreditSummaries,
      loadInitialData,
    ]
  );

  // Efecto principal para carga inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Intervalo optimizado para revisar cuotas vencidas
  useEffect(() => {
    const interval = setInterval(() => {
      checkOverdueInstallments();
    }, 5 * 60 * 1000); // Revisar cada 5 minutos

    return () => clearInterval(interval);
  }, [checkOverdueInstallments]);

  // Limpiar estados cuando se cierran modales
  useEffect(() => {
    if (!paymentModalOpen) {
      setSelectedInstallment(null);
      setPaymentError(null);
    }

    if (!allPaymentsModalOpen) {
      setSelectedCreditForAllPayments(null);
      setPaymentError(null);
    }

    if (!deleteModalOpen) {
      setCreditToDelete(null);
      setSelectedCustomerForDeletion(null);
      setDeleteError(null);
    }
  }, [paymentModalOpen, allPaymentsModalOpen, deleteModalOpen]);

  useEffect(() => {
    if (!customerDetailModalOpen) {
      setSelectedCustomerSummary(null);
      setCreditSummaries([]);
      setCustomerPayments([]);
      setExpandedCreditId(null);
      setInfoModalTab(0);
    }
  }, [customerDetailModalOpen]);

  const applyRubroFilter = async (
    customers: CustomerOption[],
    sales: CreditSale[],
    currentRubro: Rubro
  ): Promise<CustomerOption[]> => {
    if (currentRubro === "Todos los rubros") {
      return customers;
    }

    // Optimizar filtro con cache de productos por venta
    const filteredCustomers = customers.filter((customer) => {
      const customerSales = sales.filter(
        (sale) => sale.customerName === customer.name
      );

      return customerSales.some((sale) => {
        if (!sale.products) return false;
        for (const product of sale.products) {
          if (product.rubro === currentRubro) {
            return true;
          }
        }
        return false;
      });
    });

    return filteredCustomers;
  };

  const paymentMethodOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const statusOptions = [
    { value: "todos", label: "Todos" },
    { value: "pendiente", label: "Pendientes" },
    { value: "pagada", label: "Pagadas" },
    { value: "vencida", label: "Vencidas" },
  ];

  const customerOptions = [
    { id: "", name: "Todos los clientes" },
    ...customers,
  ];

  // Función optimizada para pagar cuota
  const handlePayInstallment = async () => {
    if (!selectedInstallment) return;

    try {
      setPaymentError(null);
      setPaymentModalOpen(false);

      const creditSale = creditSales.find(
        (s) => s.id === selectedInstallment.creditSaleId
      );

      if (!creditSale) {
        showNotification("No se encontró la venta a crédito", "error");
        return;
      }

      // Verificar si la cuota ya está pagada
      const installmentInDB = await db.installments.get(
        selectedInstallment.id!
      );

      if (installmentInDB?.status === "pagada") {
        showNotification("Esta cuota ya fue pagada anteriormente", "error");
        return;
      }

      // PAGAR LA CUOTA
      const result = await payInstallment(
        selectedInstallment.id!,
        paymentMethod
      );

      if (!result.success) {
        throw new Error("Error al procesar el pago");
      }

      showNotification("Cuota pagada correctamente", "success");

      // Actualizar solo el cliente afectado
      if (creditSale.customerId) {
        await updateCustomerSummary(creditSale.customerId);
      }

      // Actualizar UI específica
      if (selectedInstallment.status === "vencida") {
        // Remover de la lista de vencidas
        checkOverdueInstallments();
      }

      // Limpiar estados
      setSelectedInstallment(null);
      setPaymentError(null);
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al pagar la cuota";
      setPaymentError(errorMessage);
      showNotification(errorMessage, "error");
      setPaymentModalOpen(true);
    }
  };

  // Función para manejar eliminación de crédito
  const handleDeleteCredit = async () => {
    if (!creditToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteCreditSale(creditToDelete.saleId);

      if (result.success) {
        showNotification("Crédito eliminado correctamente", "success");

        // Actualizar datos
        await loadData(true);

        // Si está en el modal de detalle del cliente, actualizar ese cliente específico
        if (selectedCustomerSummary) {
          await updateCustomerSummary(selectedCustomerSummary.customerId);
        }

        // Cerrar modales
        setDeleteModalOpen(false);
        setCreditToDelete(null);

        // Si estamos en el modal de detalles, también cerrarlo si no quedan créditos
        if (customerDetailModalOpen && creditSummaries.length <= 1) {
          handleCloseCustomerDetail();
        }
      }
    } catch (error) {
      console.error("Error al eliminar el crédito:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al eliminar el crédito";
      setDeleteError(errorMessage);
      showNotification(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Función para manejar eliminación de todos los créditos de un cliente
  const handleDeleteAllCustomerCredits = async () => {
    if (!selectedCustomerForDeletion) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Verificar que no haya cuotas pendientes
      const hasPendingInstallments =
        selectedCustomerForDeletion.installments.some(
          (inst) => inst.status === "pendiente" || inst.status === "vencida"
        );

      if (hasPendingInstallments) {
        throw new Error("No se puede eliminar. Hay cuotas pendientes.");
      }

      // Eliminar todas las ventas a crédito del cliente
      const creditSaleIds = selectedCustomerForDeletion.creditSales.map(
        (sale) => sale.id
      );

      // Eliminar cuotas primero
      await db.installments.where("creditSaleId").anyOf(creditSaleIds).delete();

      // Eliminar ventas
      await db.sales.where("id").anyOf(creditSaleIds).delete();

      showNotification(
        "Todos los créditos del cliente eliminados correctamente",
        "success"
      );

      // Actualizar datos
      await loadData(true);

      // Cerrar modales
      setDeleteModalOpen(false);
      setSelectedCustomerForDeletion(null);

      if (customerDetailModalOpen) {
        handleCloseCustomerDetail();
      }
    } catch (error) {
      console.error("Error al eliminar los créditos:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al eliminar los créditos";
      setDeleteError(errorMessage);
      showNotification(errorMessage, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Función para confirmar eliminación
  const confirmDeleteCredit = (
    credit: CreditSummary,
    customerSummary?: CustomerCreditSummary
  ) => {
    setCreditToDelete(credit);
    if (customerSummary) {
      setSelectedCustomerForDeletion(customerSummary);
    }
    setDeleteModalOpen(true);
  };

  // Función optimizada para pagar todas las cuotas
  const handlePayAllInstallments = async () => {
    if (!selectedCreditForAllPayments) return;

    try {
      setPaymentError(null);
      setAllPaymentsModalOpen(false);

      const creditSale = creditSales.find(
        (s) => s.id === selectedCreditForAllPayments.saleId
      );

      if (!creditSale) {
        showNotification("No se encontró la venta a crédito", "error");
        return;
      }

      const pendingInstallments = await db.installments
        .where("creditSaleId")
        .equals(selectedCreditForAllPayments.saleId)
        .and((inst) => inst.status === "pendiente" || inst.status === "vencida")
        .toArray();

      if (pendingInstallments.length === 0) {
        showNotification("Este crédito ya está completamente pagado", "error");
        return;
      }

      const result = await payAllInstallments(
        selectedCreditForAllPayments.saleId,
        paymentMethod
      );

      if (!result.success) {
        throw new Error("Error al procesar el pago total");
      }

      showNotification(`Todas las cuotas pagadas correctamente`, "success");

      // Actualizar solo el cliente afectado
      if (creditSale.customerId) {
        await updateCustomerSummary(creditSale.customerId);
      }

      // Actualizar cuotas vencidas
      checkOverdueInstallments();

      // Limpiar estados
      setSelectedCreditForAllPayments(null);
      setPaymentError(null);
    } catch (error) {
      console.error("Error al procesar el pago total:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al pagar todas las cuotas";
      setPaymentError(errorMessage);
      showNotification(errorMessage, "error");
      setAllPaymentsModalOpen(true);
    }
  };

  const handleSearchChange = useMemo(() => {
    return debounce((value: string) => {
      if (value === "") {
        setFilterCustomer("");
      }
    }, 300);
  }, []);

  useEffect(() => {
    if (inputValue !== "") {
      handleSearchChange(inputValue);
    }
  }, [inputValue, handleSearchChange]);

  // Filtrar resúmenes con useMemo
  const filteredCustomerSummaries = useMemo(() => {
    return customerSummaries.filter((summary) => {
      if (filterStatus !== "todos") {
        if (filterStatus === "pendiente" && summary.pendingInstallments === 0)
          return false;
        if (filterStatus === "vencida" && summary.overdueInstallments === 0)
          return false;
        if (filterStatus === "pagada" && summary.paidInstallments === 0)
          return false;
      }

      if (filterCustomer && summary.customerId !== filterCustomer) {
        return false;
      }

      if (rubro !== "Todos los rubros") {
        const hasRubroProduct = summary.creditSales.some((sale) => {
          if (!sale.products) return false;
          return sale.products.some((product) => product.rubro === rubro);
        });
        if (!hasRubroProduct) return false;
      }

      return true;
    });
  }, [customerSummaries, filterStatus, filterCustomer, rubro]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomerSummaries.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: es });
  };

  const handleOpenCustomerDetail = async (summary: CustomerCreditSummary) => {
    setSelectedCustomerSummary(summary);
    const summaries = calculateCreditSummaries(summary);
    setCreditSummaries(summaries);
    await loadCustomerPayments(summary.customerId);
    setCustomerDetailModalOpen(true);
    setExpandedCreditId(null);
    setInfoModalTab(0);
  };

  const handleCloseCustomerDetail = () => {
    setCustomerDetailModalOpen(false);
    setSelectedCustomerSummary(null);
    setCustomerPayments([]);
    setCreditSummaries([]);
    setExpandedCreditId(null);
  };

  const handleExpandCredit = (saleId: number) => {
    setExpandedCreditId(expandedCreditId === saleId ? null : saleId);
  };

  const handleTabChange = (newValue: number) => {
    setInfoModalTab(newValue);
  };

  const creditosPendientes = useMemo(() => {
    return creditSummaries.filter((credit) => credit.pendingAmount > 0);
  }, [creditSummaries]);

  const creditosPagados = useMemo(() => {
    return creditSummaries.filter((credit) => credit.pendingAmount <= 0);
  }, [creditSummaries]);

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
          Créditos
        </Typography>

        {overdueInstallments.length > 0 && (
          <Alert severity="error" sx={{ mb: 3 }}>
            <Typography variant="h6">
              <Warning sx={{ mr: 1 }} />
              Tienes {overdueInstallments.length} cuotas vencidas
            </Typography>
            {overdueInstallments.slice(0, 3).map((installment) => (
              <Typography key={installment.id} variant="body2">
                • Cliente:{" "}
                {creditSales.find((s) => s.id === installment.creditSaleId)
                  ?.customerName || "N/A"}{" "}
                - Cuota {installment.number} - Vencida hace{" "}
                {installment.daysOverdue} días
              </Typography>
            ))}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as string)}
              label="Estado"
              options={statusOptions}
            />
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Autocomplete
              freeSolo
              value={selectedCustomerOption}
              onChange={(event, newValue) => {
                if (typeof newValue === "string") {
                  const newOption: CustomerOption = {
                    id: `custom-${Date.now()}`,
                    name: newValue,
                  };
                  setSelectedCustomerOption(newOption);
                  setFilterCustomer(newOption.id);
                  setInputValue(newValue);
                } else if (newValue && typeof newValue === "object") {
                  setSelectedCustomerOption(newValue);
                  setFilterCustomer(newValue.id);
                  setInputValue(newValue.name);
                } else {
                  setSelectedCustomerOption(null);
                  setFilterCustomer("");
                  setInputValue("");
                }
              }}
              inputValue={inputValue}
              onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
              }}
              options={customerOptions}
              getOptionLabel={(option) => {
                if (typeof option === "string") {
                  return option;
                }
                return option.name || "";
              }}
              renderInput={(params) => (
                <Input
                  {...params}
                  label="Buscar cliente"
                  placeholder="Selecciona o escribe un nombre"
                  fullWidth
                  size="small"
                />
              )}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return options;

                const searchTerm = inputValue.toLowerCase();
                const filtered = options.filter((option) =>
                  option.name.toLowerCase().includes(searchTerm)
                );

                if (
                  !filtered.some(
                    (option) => option.name.toLowerCase() === searchTerm
                  )
                ) {
                  const customOption: CustomerOption = {
                    id: `custom-${Date.now()}`,
                    name: inputValue,
                  };
                  return [customOption, ...filtered];
                }

                return filtered;
              }}
              loading={!initialDataLoaded}
            />
          </FormControl>
        </Box>

        <Box sx={{ flex: 1, minHeight: "auto" }}>
          <TableContainer component={Paper} sx={{ maxHeight: "60vh", flex: 1 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={tableHeaderStyle}>Cliente</TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Monto Total de Créditos
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Pagado
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Pendiente
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Próximo Vencimiento
                  </TableCell>
                  <TableCell sx={tableHeaderStyle} align="center">
                    Estado
                  </TableCell>

                  <TableCell sx={tableHeaderStyle} align="center">
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentItems.length > 0 ? (
                  currentItems.map((summary) => (
                    <TableRow
                      key={summary.customerId}
                      hover
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": { backgroundColor: "action.hover" },
                        transition: "all 0.3s",
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {summary.customerName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ({summary.creditSales.length} créditos)
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(summary.totalCreditAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          color="success.main"
                          fontWeight={"bold"}
                        >
                          {formatCurrency(summary.totalPaidAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={
                            summary.pendingAmount > 0
                              ? "warning.main"
                              : "success.main"
                          }
                        >
                          {summary.pendingAmount <= 0
                            ? formatCurrency(0)
                            : formatCurrency(summary.pendingAmount)}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 1,
                          }}
                        >
                          {summary.nextDueDate ? (
                            <Typography variant="body2">
                              {formatDate(summary.nextDueDate)}
                            </Typography>
                          ) : summary.pendingInstallments === 0 ? (
                            <CustomChip
                              label="Al día"
                              color="success"
                              size="small"
                              sx={{ fontSize: "0.75rem" }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Sin fecha
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      <TableCell align="center">
                        <CustomChip
                          label={
                            summary.overdueInstallments > 0
                              ? "Con vencimientos"
                              : summary.pendingInstallments > 0
                              ? "Pendiente"
                              : "Al día"
                          }
                          color={
                            summary.overdueInstallments > 0
                              ? "error"
                              : summary.pendingInstallments > 0
                              ? "warning"
                              : "success"
                          }
                          size="small"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            justifyContent: "center",
                          }}
                        >
                          <CustomGlobalTooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenCustomerDetail(summary)}
                              sx={{
                                borderRadius: "4px",
                                color: "text.secondary",
                                "&:hover": {
                                  backgroundColor: "primary.main",
                                  color: "white",
                                },
                              }}
                            >
                              <Info fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>

                          {/* Botón para eliminar todos los créditos del cliente (solo si no tiene pendientes) */}
                          {summary.pendingAmount <= 0 && (
                            <CustomGlobalTooltip title="Eliminar todos los créditos">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedCustomerForDeletion(summary);
                                  setDeleteModalOpen(true);
                                }}
                                sx={{
                                  borderRadius: "4px",
                                  color: "error.main",
                                  "&:hover": {
                                    backgroundColor: "error.50",
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </CustomGlobalTooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 4, textAlign: "center" }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          color: "text.secondary",
                          py: 4,
                        }}
                      >
                        <CreditCard
                          sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                        />
                        <Typography>
                          {filterCustomer || filterStatus !== "todos"
                            ? "No se encontraron créditos con los filtros seleccionados."
                            : "No hay créditos registrados."}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {filteredCustomerSummaries.length > 0 && (
          <Pagination
            text="Créditos por página"
            text2="Total de clientes con créditos"
            totalItems={filteredCustomerSummaries.length}
          />
        )}

        {/* Modal para pagar cuota individual */}
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => {
            setPaymentModalOpen(false);
          }}
          title={`Pagar Cuota ${selectedInstallment?.number}`}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                onClick={() => setPaymentModalOpen(false)}
                variant="text"
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
                onClick={handlePayInstallment}
                startIcon={<CheckCircle />}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Confirmar Pago
              </Button>
            </Box>
          }
        >
          {selectedInstallment && (
            <Box>
              {paymentError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {paymentError}
                </Alert>
              )}
              <Typography gutterBottom variant="body1">
                Cliente:{" "}
                <strong>
                  {
                    creditSales.find(
                      (s) => s.id === selectedInstallment.creditSaleId
                    )?.customerName
                  }
                </strong>
              </Typography>
              <Typography gutterBottom variant="body1">
                Monto total:{" "}
                <strong>{formatCurrency(selectedInstallment.amount)}</strong>
              </Typography>

              {selectedInstallment.penaltyAmount > 0 && (
                <Typography gutterBottom variant="body1" color="error">
                  Penalización:{" "}
                  <strong>
                    {formatCurrency(selectedInstallment.penaltyAmount)}
                  </strong>
                </Typography>
              )}

              <FormControl fullWidth sx={{ mt: 3 }}>
                <Select
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  label="Método de pago"
                  options={paymentMethodOptions}
                />
              </FormControl>
            </Box>
          )}
        </Modal>

        {/* Modal para pagar todas las cuotas */}
        <Modal
          isOpen={allPaymentsModalOpen}
          onClose={() => {
            setAllPaymentsModalOpen(false);
          }}
          title={`Pagar todas las cuotas pendientes`}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                onClick={() => setAllPaymentsModalOpen(false)}
                variant="text"
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
                onClick={handlePayAllInstallments}
                startIcon={<CheckCircle />}
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
                Confirmar Pago
              </Button>
            </Box>
          }
        >
          {selectedCreditForAllPayments && (
            <Box>
              {paymentError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {paymentError}
                </Alert>
              )}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Se pagarán todas las cuotas pendientes de este crédito en una
                  sola transacción.
                </Typography>
              </Alert>

              <Typography gutterBottom variant="body1">
                Crédito:{" "}
                <strong>Venta #{selectedCreditForAllPayments.saleId}</strong>
              </Typography>
              <Typography gutterBottom variant="body1">
                Cliente:{" "}
                <strong>{selectedCreditForAllPayments.customerName}</strong>
              </Typography>

              <Box sx={{ my: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Resumen de cuotas a pagar:
                </Typography>
                {selectedCreditForAllPayments.installments
                  .filter(
                    (inst) =>
                      inst.status === "pendiente" || inst.status === "vencida"
                  )
                  .map((installment) => (
                    <Box
                      key={installment.id}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        mb: 1,
                        p: 1,
                        bgcolor: "white",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2">
                        Cuota {installment.number} -
                        {format(parseISO(installment.dueDate), "dd/MM/yyyy")}
                        {installment.status === "vencida" && (
                          <CustomChip
                            label="Vencida"
                            color="error"
                            size="small"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(installment.amount)}
                        {installment.interestAmount > 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ ml: 1 }}
                          >
                            (Int: {formatCurrency(installment.interestAmount)})
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                  ))}

                <Divider sx={{ my: 1 }} />

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mt: 2,
                  }}
                >
                  <Typography variant="body1" fontWeight="bold">
                    Total a pagar:
                  </Typography>
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color="primary.main"
                  >
                    {formatCurrency(
                      selectedCreditForAllPayments.installments
                        .filter(
                          (inst) =>
                            inst.status === "pendiente" ||
                            inst.status === "vencida"
                        )
                        .reduce((sum, inst) => sum + inst.amount, 0)
                    )}
                  </Typography>
                </Box>
              </Box>

              <FormControl fullWidth sx={{ mt: 3 }}>
                <Select
                  value={paymentMethod}
                  onChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  label="Método de pago"
                  options={paymentMethodOptions}
                />
              </FormControl>
            </Box>
          )}
        </Modal>

        {/* Modal para eliminar crédito */}
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setCreditToDelete(null);
            setSelectedCustomerForDeletion(null);
            setDeleteError(null);
          }}
          title={
            selectedCustomerForDeletion
              ? "Eliminar Todos los Créditos"
              : "Eliminar Crédito"
          }
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setCreditToDelete(null);
                  setSelectedCustomerForDeletion(null);
                  setDeleteError(null);
                }}
                variant="text"
                disabled={isDeleting}
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
                onClick={
                  selectedCustomerForDeletion
                    ? handleDeleteAllCustomerCredits
                    : handleDeleteCredit
                }
                disabled={isDeleting}
                startIcon={<DeleteIcon />}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                  "&:disabled": {
                    bgcolor: "action.disabledBackground",
                  },
                }}
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </Box>
          }
        >
          {selectedCustomerForDeletion ? (
            <Box>
              {/* Contenido para eliminar todos los créditos del cliente */}
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Warning sx={{ mr: 1 }} />
                Esta acción eliminará TODOS los créditos del cliente y no se
                puede deshacer
              </Alert>

              <Typography gutterBottom variant="body1">
                ¿Está seguro que desea eliminar todos los créditos de este
                cliente?
              </Typography>

              <Box
                sx={{
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  mt: 2,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Cliente: {selectedCustomerForDeletion.customerName}
                </Typography>
                <Typography variant="body2">
                  Total de créditos:{" "}
                  {selectedCustomerForDeletion.creditSales.length}
                </Typography>
                <Typography variant="body2">
                  Monto total:{" "}
                  {formatCurrency(
                    selectedCustomerForDeletion.totalCreditAmount
                  )}
                </Typography>
                <Typography variant="body2" color="success.main">
                  Saldo pendiente:{" "}
                  {formatCurrency(selectedCustomerForDeletion.pendingAmount)}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Nota: Solo se pueden eliminar créditos que estén completamente
                pagados.
              </Typography>
            </Box>
          ) : creditToDelete ? (
            <Box>
              {/* Contenido para eliminar un crédito específico */}
              {deleteError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {deleteError}
                </Alert>
              )}

              <Alert severity="warning" sx={{ mb: 3 }}>
                <Warning sx={{ mr: 1 }} />
                Esta acción no se puede deshacer
              </Alert>

              <Typography gutterBottom variant="body1">
                ¿Está seguro que desea eliminar el siguiente crédito?
              </Typography>

              <Box
                sx={{
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  mt: 2,
                }}
              >
                <Typography variant="subtitle2" fontWeight="bold">
                  Venta #{creditToDelete.saleId}
                </Typography>
                <Typography variant="body2">
                  Cliente: {creditToDelete.customerName}
                </Typography>
                <Typography variant="body2">
                  Fecha:{" "}
                  {format(parseISO(creditToDelete.saleDate), "dd/MM/yyyy", {
                    locale: es,
                  })}
                </Typography>
                <Typography variant="body2">
                  Monto total: {formatCurrency(creditToDelete.totalAmount)}
                </Typography>
                <Typography variant="body2" color="success.main">
                  Estado: {creditToDelete.status}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Nota: Solo se pueden eliminar créditos que estén completamente
                pagados.
              </Typography>
            </Box>
          ) : null}
        </Modal>

        {/* Modal de detalle del cliente */}
        <Modal
          isOpen={customerDetailModalOpen}
          onClose={handleCloseCustomerDetail}
          title={
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Typography variant="h6">
                Detalle del Cliente - {selectedCustomerSummary?.customerName}
              </Typography>
            </Box>
          }
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              onClick={handleCloseCustomerDetail}
              variant="text"
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
          }
        >
          {selectedCustomerSummary && (
            <Box sx={{ width: "100%" }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}
              >
                <Avatar sx={{ bgcolor: "primary.main" }}>
                  <AccountCircleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedCustomerSummary.customerName}
                  </Typography>
                </Box>
              </Box>

              <CustomerFinancialSummary
                customerInfo={{
                  name: selectedCustomerSummary.customerName,
                  balance: selectedCustomerSummary.pendingAmount,
                  sales: selectedCustomerSummary.creditSales,
                }}
                payments={customerPayments}
              />

              <Card sx={{ mb: 2 }}>
                <Tabs
                  value={infoModalTab}
                  onChange={(_, newValue) => handleTabChange(newValue)}
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
                        badgeContent={creditSummaries.length}
                        color="primary"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Todos los Créditos
                      </Badge>
                    }
                  />
                  <Tab
                    icon={<PaymentIcon />}
                    iconPosition="start"
                    label={
                      <Badge
                        badgeContent={creditosPendientes.length}
                        color="warning"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Pendientes
                      </Badge>
                    }
                  />
                  <Tab
                    icon={<CheckCircle />}
                    iconPosition="start"
                    label={
                      <Badge
                        badgeContent={creditosPagados.length}
                        color="success"
                        sx={{ "& .MuiBadge-badge": { right: -8 } }}
                      >
                        Pagados
                      </Badge>
                    }
                  />
                </Tabs>
              </Card>

              <Box sx={{ maxHeight: "60vh", overflow: "auto" }}>
                {infoModalTab === 0 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditSummaries.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          color: "text.secondary",
                          py: 4,
                        }}
                      >
                        <CreditCard
                          sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos registrados
                        </Typography>
                      </Box>
                    ) : (
                      creditSummaries.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          onPayment={(credit) => {
                            const pendingInstallment = credit.installments.find(
                              (inst) =>
                                inst.status === "pendiente" ||
                                inst.status === "vencida"
                            );
                            if (pendingInstallment) {
                              setSelectedInstallment(pendingInstallment);
                              setPaymentModalOpen(true);
                            }
                          }}
                          onPayAll={(credit) => {
                            setSelectedCreditForAllPayments(credit);
                            setAllPaymentsModalOpen(true);
                          }}
                          onDelete={(credit) => {
                            confirmDeleteCredit(
                              credit,
                              selectedCustomerSummary || undefined
                            );
                          }}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                          showDeleteButton={credit.status === "Pagado"}
                        />
                      ))
                    )}
                  </Box>
                )}

                {infoModalTab === 1 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditosPendientes.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          color: "text.secondary",
                          py: 4,
                        }}
                      >
                        <CreditCard
                          sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos pendientes
                        </Typography>
                      </Box>
                    ) : (
                      creditosPendientes.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          onPayment={(credit) => {
                            const pendingInstallment = credit.installments.find(
                              (inst) =>
                                inst.status === "pendiente" ||
                                inst.status === "vencida"
                            );
                            if (pendingInstallment) {
                              setSelectedInstallment(pendingInstallment);
                              setPaymentModalOpen(true);
                            }
                          }}
                          onPayAll={(credit) => {
                            setSelectedCreditForAllPayments(credit);
                            setAllPaymentsModalOpen(true);
                          }}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                        />
                      ))
                    )}
                  </Box>
                )}

                {infoModalTab === 2 && (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {creditosPagados.length === 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          color: "text.secondary",
                          py: 4,
                        }}
                      >
                        <CreditCard
                          sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                        />
                        <Typography color="text.secondary">
                          No hay créditos completamente pagados
                        </Typography>
                      </Box>
                    ) : (
                      creditosPagados.map((credit) => (
                        <CreditSaleCard
                          key={credit.saleId}
                          credit={credit}
                          onPayment={() => {}}
                          onPayAll={() => {}}
                          onDelete={(credit) => {
                            confirmDeleteCredit(
                              credit,
                              selectedCustomerSummary || undefined
                            );
                          }}
                          isExpanded={expandedCreditId === credit.saleId}
                          onToggleExpand={handleExpandCredit}
                          showDeleteButton={true}
                        />
                      ))
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Modal>
      </Box>
    </ProtectedRoute>
  );
};

export default CreditosPage;
