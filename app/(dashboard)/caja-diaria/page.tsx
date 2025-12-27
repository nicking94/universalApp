"use client";
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
  IconButton,
} from "@mui/material";
import { Add, Close, Info, PointOfSale } from "@mui/icons-material";
import { useEffect, useState, useCallback, useMemo } from "react";
import { format, parseISO, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import { useRubro } from "@/app/context/RubroContext";
import {
  DailyCash,
  DailyCashMovement,
  MonthOption,
} from "@/app/lib/types/types";
import { useNotification } from "@/app/hooks/useNotification";
import { usePagination } from "@/app/context/PaginationContext";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { db } from "@/app/database/db";
import { formatCurrency } from "@/app/lib/utils/currency";
import Button from "@/app/components/Button";
import Select from "@/app/components/Select";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Notification from "@/app/components/Notification";
import Pagination from "@/app/components/Pagination";
import CustomChip from "@/app/components/CustomChip";
import DailyCashDetailModal from "@/app/components/DailyCashDetailModal";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import { useBackup } from "@/app/hooks/useBackup";
import BackupConfirmationModal from "@/app/components/BackupConfirmationModal";

const CajaDiariaPage = () => {
  const { rubro } = useRubro();
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );

  const {
    isBackupModalOpen,
    initiateBackup,
    confirmBackup,
    cancelBackup,
    setPendingBackup,
  } = useBackup();

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayMovements, setSelectedDayMovements] = useState<
    DailyCashMovement[]
  >([]);

  const { currentPage, itemsPerPage } = usePagination();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );

  const openDetailModal = useCallback((movements: DailyCashMovement[]) => {
    setSelectedDayMovements(movements);
    setIsDetailModalOpen(true);
  }, []);

  const closeDetailModal = useCallback(() => {
    setIsDetailModalOpen(false);
  }, []);

  const monthOptions: MonthOption[] = useMemo(
    () =>
      [...Array(12)].map((_, i) => ({
        value: i + 1,
        label: format(new Date(2022, i), "MMMM", { locale: es }),
      })),
    []
  );

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        value: new Date().getFullYear() - i,
        label: String(new Date().getFullYear() - i),
      })),
    []
  );

  const checkAndCloseOldCashes = useCallback(async () => {
    const today = getLocalDateString();
    try {
      const allCashes = await db.dailyCashes.toArray();
      const openPreviousCashes = allCashes.filter(
        (cash) => !cash.closed && cash.date < today
      );

      if (openPreviousCashes.length === 0) return;

      for (const cash of openPreviousCashes) {
        const cashIncome = cash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        const cashExpense = cash.movements
          .filter((m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        const updatedCash = {
          ...cash,
          closed: true,
          cashIncome,
          cashExpense,
          otherIncome: cash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          closingDifference: 0,
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(cash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === cash.id ? updatedCash : dc))
        );

        if (currentDailyCash && currentDailyCash.id === cash.id) {
          setCurrentDailyCash(updatedCash);
        }
      }
    } catch (error) {
      console.error("Error al cerrar cajas antiguas:", error);
      showNotification("Error al cerrar cajas de días anteriores", "error");
    }
  }, [currentDailyCash, showNotification]);

  const openCash = useCallback(async () => {
    const today = getLocalDateString();
    const allCashes = await db.dailyCashes.toArray();
    const openPreviousCashes = allCashes.filter(
      (cash) => !cash.closed && cash.date < today
    );

    if (openPreviousCashes.length > 0) {
      await checkAndCloseOldCashes();
      return;
    }

    try {
      if (currentDailyCash?.closed) {
        // Marcar que hay una caja reabierta que podría cerrarse nuevamente
        setPendingBackup(true);

        const updatedCash = {
          ...currentDailyCash,
          closed: false,
          closingAmount: undefined,
          cashIncome: 0,
          cashExpense: 0,
          otherIncome: undefined,
          closingDifference: undefined,
          closingDate: undefined,
          movements: currentDailyCash.movements,
        };

        await db.dailyCashes.update(currentDailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === currentDailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        showNotification("Caja reabierta correctamente", "success");
        return;
      }

      const dailyCash: DailyCash = {
        id: Date.now(),
        date: today,
        movements: [],
        closed: false,
        totalIncome: 0,
        totalExpense: 0,
      };

      await db.dailyCashes.add(dailyCash);
      setDailyCashes((prev) => [...prev, dailyCash]);
      setCurrentDailyCash(dailyCash);
      showNotification("Caja abierta correctamente", "success");
    } catch (error) {
      console.error("Error al abrir/reabrir caja:", error);
      showNotification("Error al abrir/reabrir caja", "error");
    }
  }, [
    currentDailyCash,
    checkAndCloseOldCashes,
    showNotification,
    setPendingBackup,
  ]);

  // Función wrapper para manejar el backup después del cierre
  const handleConfirmBackup = useCallback(async () => {
    const success = await confirmBackup();
    if (success) {
      showNotification(
        "Caja cerrada y backup exportado correctamente",
        "success"
      );
    } else {
      showNotification(
        "Caja cerrada, pero hubo un error al exportar el backup",
        "warning"
      );
    }
  }, [confirmBackup, showNotification]);

  const closeCash = useCallback(async () => {
    try {
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const cashIncome = dailyCash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const cashExpense = dailyCash.movements
          .filter((m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + (m.amount || 0), 0);

        const updatedCash = {
          ...dailyCash,
          closed: true,
          cashIncome,
          cashExpense,
          otherIncome: dailyCash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + (m.amount || 0), 0),
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);

        // Mostrar modal de backup después de cerrar la caja
        setTimeout(() => {
          initiateBackup();
        }, 500);
      }
    } catch (error) {
      console.error("Error al cerrar caja:", error);
      showNotification("Error al cerrar caja", "error");
    }
  }, [showNotification, initiateBackup]);

  const getDailySummary = useCallback(() => {
    const summary: Record<
      string,
      {
        date: string;
        ingresos: number;
        egresos: number;
        ganancia: number;
        gananciaNeta: number;
        movements: DailyCashMovement[];
        closed: boolean;
      }
    > = {};

    dailyCashes.forEach((dailyCash) => {
      const date = dailyCash.date;
      const movements = dailyCash.movements;

      if (!summary[date]) {
        summary[date] = {
          date,
          ingresos: 0,
          egresos: 0,
          ganancia: 0,
          gananciaNeta: 0,
          movements: [...movements],
          closed: dailyCash.closed || false,
        };
      }

      movements.forEach((movement) => {
        const amount = Number(movement.amount) || 0;

        if (movement.type === "INGRESO") {
          summary[date].ingresos += amount;
          summary[date].gananciaNeta += Number(movement.profit) || 0;
        } else {
          summary[date].egresos += amount;
          summary[date].gananciaNeta -= Math.abs(Number(movement.profit) || 0);
        }
      });

      summary[date].ganancia = summary[date].ingresos - summary[date].egresos;
    });

    return Object.values(summary)
      .filter((item) => {
        const date = parseISO(item.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [dailyCashes, selectedMonth, selectedYear]);

  const dailySummaries = useMemo(() => getDailySummary(), [getDailySummary]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedDailyCashes = await db.dailyCashes.toArray();

        const cleanedCashes = storedDailyCashes.map((cash) => {
          const uniqueMovements = cash.movements.filter(
            (movement, index, self) => {
              const movementCreatedAt =
                movement.createdAt || new Date().toISOString();

              return (
                index ===
                self.findIndex((m) => {
                  const mCreatedAt = m.createdAt || new Date().toISOString();

                  return (
                    m.id === movement.id ||
                    (m.description === movement.description &&
                      m.amount === movement.amount &&
                      Math.abs(
                        new Date(mCreatedAt).getTime() -
                          new Date(movementCreatedAt).getTime()
                      ) < 60000)
                  );
                })
              );
            }
          );

          return {
            ...cash,
            movements: uniqueMovements.map((m) => ({
              ...m,
              amount: Number(m.amount) || 0,
              createdAt: m.createdAt || new Date().toISOString(),
            })),
          };
        });

        setDailyCashes(cleanedCashes);
      } catch (error) {
        console.error("Error al cargar cajas diarias:", error);
        showNotification("Error al cargar cajas diarias", "error");
      }
    };

    fetchData();
  }, [showNotification]);

  useEffect(() => {
    const checkMidnightAndClose = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        checkAndCloseOldCashes();
      }
    };

    const interval = setInterval(checkMidnightAndClose, 5 * 60 * 1000);
    checkMidnightAndClose();

    return () => clearInterval(interval);
  }, [checkAndCloseOldCashes]);

  useEffect(() => {
    checkAndCloseOldCashes();
  }, [checkAndCloseOldCashes]);

  useEffect(() => {
    const checkInitialCashStatus = async () => {
      await checkAndCloseOldCashes();
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        setCurrentDailyCash(dailyCash);
      }
    };

    checkInitialCashStatus();
  }, [checkAndCloseOldCashes]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dailySummaries.slice(indexOfFirstItem, indexOfLastItem);

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
          Caja Diaria
        </Typography>

        {/* Estado actual de caja */}
        {currentDailyCash ? (
          <Card
            sx={{
              mb: 2,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? currentDailyCash.closed
                    ? "linear-gradient(135deg, #7f1d1d, #450a0a)"
                    : "linear-gradient(135deg, #065f46, #064e3b)"
                  : currentDailyCash.closed
                  ? "linear-gradient(135deg, #f56565, #c53030)"
                  : "linear-gradient(135deg, #48bb78, #2f855a)",
              color: "white",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {currentDailyCash.closed ? "Caja Cerrada" : "Caja Abierta"}
                </Typography>
                <Typography variant="body1" sx={{ marginTop: "3px" }}>
                  {format(parseISO(currentDailyCash.date), "dd/MM/yyyy")}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ mb: 2, p: 2 }}>
            <Typography variant="body1" color="text.secondary">
              No hay caja abierta para hoy
            </Typography>
          </Card>
        )}

        {/* Header con filtros y acciones */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Mes"
                value={selectedMonth}
                options={monthOptions}
                onChange={(value) => setSelectedMonth(value as number)}
              />
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                label="Año"
                value={selectedYear}
                options={yearOptions}
                onChange={(value) => setSelectedYear(value as number)}
              />
            </FormControl>
          </Box>

          {rubro !== "Todos los rubros" && (
            <Box>
              {currentDailyCash ? (
                currentDailyCash.closed ? (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={openCash}
                    sx={{
                      bgcolor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                  >
                    Reabrir Caja
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    startIcon={<Close />}
                    onClick={closeCash}
                    sx={{
                      bgcolor: "error.main",
                      "&:hover": { bgcolor: "error.dark" },
                    }}
                  >
                    Cerrar Caja
                  </Button>
                )
              ) : (
                <Button
                  variant="contained"
                  onClick={openCash}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  Abrir Caja
                </Button>
              )}
            </Box>
          )}
        </Box>

        {/* Tabla de caja diaria */}
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
              sx={{ maxHeight: "47vh", mb: 2, flex: 1 }}
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
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ingresos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Egresos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ganancia
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Estado de caja
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((day, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Typography fontWeight="bold">
                            {format(parseISO(day.date), "dd/MM/yyyy")}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="success.main">
                            {formatCurrency(day.ingresos)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="error.main">
                            {formatCurrency(day.egresos)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography fontWeight="bold" color="profit.main">
                            {formatCurrency(day.gananciaNeta || 0)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <CustomChip
                            label={day.closed ? "Cerrada" : "Abierta"}
                            color={day.closed ? "error" : "success"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <CustomGlobalTooltip title="Ver detalles">
                            <IconButton
                              onClick={() => openDetailModal(day.movements)}
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
                              <Info fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <PointOfSale
                            sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                          />
                          <Typography>
                            No hay registros para el período seleccionado.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {dailySummaries.length > 0 && (
            <Pagination
              text="Días por página"
              text2="Total de días"
              totalItems={dailySummaries.length}
            />
          )}
        </Box>

        {/* Modal de Confirmación de Backup - AÑADE ESTE COMPONENTE */}
        <BackupConfirmationModal
          isOpen={isBackupModalOpen}
          onConfirm={handleConfirmBackup}
          onCancel={cancelBackup}
        />

        {/* Modal de Detalles de Caja Diaria */}
        <DailyCashDetailModal
          isOpen={isDetailModalOpen}
          onClose={closeDetailModal}
          movements={selectedDayMovements}
          rubro={rubro}
        />

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

export default CajaDiariaPage;
