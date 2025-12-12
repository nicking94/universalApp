"use client";
import { useCallback, useEffect, useState } from "react";

import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as TooltipChart,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import Image from "next/image";

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
  useTheme,
  Card,
  CardContent,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Description,
  Analytics,
  InsertDriveFile,
  Info,
} from "@mui/icons-material";
import { useRubro } from "@/app/context/RubroContext";
import {
  DailyCashMovement,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Product,
  Supplier,
  UnifiedFilter,
} from "@/app/lib/types/types";
import { usePagination } from "@/app/context/PaginationContext";
import { db } from "@/app/database/db";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Select from "@/app/components/Select";
import Button from "@/app/components/Button";
import { toCapitalize } from "@/app/lib/utils/capitalizeText";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import { formatCurrency } from "@/app/lib/utils/currency";
import Pagination from "@/app/components/Pagination";
import Modal from "@/app/components/Modal";
import InputCash from "@/app/components/InputCash";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

ChartJS.register(
  ArcElement,
  TooltipChart,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const MovimientosPage = () => {
  const router = useRouter();
  const theme = useTheme();

  const { rubro } = useRubro();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<ExpenseCategory | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [shouldRedirectToCash, setShouldRedirectToCash] = useState(false);
  const [newExpense, setNewExpense] = useState<Omit<Expense, "id">>({
    amount: 0,
    date: new Date().toISOString(),
    description: "",
    category: "",
    paymentMethod: "EFECTIVO",
    receipt: null,
    installments: 1,
    rubro: rubro,
    supplier: "",
    type: "EGRESO",
  });
  const [newCategory, setNewCategory] = useState<Omit<ExpenseCategory, "id">>({
    name: "",
    rubro: rubro,
    type: "EGRESO",
  });
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );

  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [filters, setFilters] = useState<UnifiedFilter[]>([]);
  const { currentPage, itemsPerPage } = usePagination();

  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const monthOptions = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));
  const getModalTitle = () => {
    return isEditing ? "Editar Movimiento" : "Nuevo Movimiento";
  };

  const getButtonText = () => {
    return isEditing ? "Actualizar" : "Guardar";
  };

  const recalculateTotals = (movements: DailyCashMovement[]) => {
    return movements.reduce(
      (totals, m) => {
        const amount = m.amount || 0;
        const isIncome = m.type === "INGRESO";
        const isCash = m.paymentMethod === "EFECTIVO";

        if (isIncome) {
          totals.totalIncome += amount;
          if (isCash) {
            totals.cashIncome += amount;
          } else {
            totals.otherIncome += amount;
          }
        } else if (m.type === "EGRESO") {
          totals.totalExpense += amount;
          if (isCash) {
            totals.cashExpense += amount;
          }
        }
        return totals;
      },
      {
        totalIncome: 0,
        totalExpense: 0,
        cashIncome: 0,
        cashExpense: 0,
        otherIncome: 0,
      }
    );
  };

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 2500);
  };

  const loadSuppliers = useCallback(async () => {
    try {
      const storedSuppliers = await db.suppliers.toArray();
      const filteredSuppliers = storedSuppliers.filter(
        (s) =>
          !rubro ||
          rubro === "Todos los rubros" ||
          !s.rubro ||
          s.rubro === "Todos los rubros" ||
          s.rubro.toLowerCase() === rubro.toLowerCase()
      );
      setSuppliers(filteredSuppliers);
    } catch (error) {
      console.error("Error al cargar proveedores:", error);
      showNotification("Error al cargar proveedores", "error");
    }
  }, [rubro]);

  const loadCategories = useCallback(async () => {
    try {
      const storedCategories = await db.expenseCategories.toArray();

      const filtered = storedCategories.filter(
        (cat) => cat.rubro === rubro || cat.rubro === "Todos los rubros"
      );

      setCategories(filtered);
    } catch (error) {
      console.error("Error al cargar categorías:", error);
      showNotification("Error al cargar categorías", "error");
    }
  }, [rubro]);

  const loadExpenses = useCallback(async () => {
    try {
      const storedExpenses = await db.expenses.toArray();
      const sortedExpenses = storedExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setExpenses(sortedExpenses);

      const expenseDates = [
        ...new Set(storedExpenses.map((e) => e.date.split("T")[0])),
      ];

      for (const date of expenseDates) {
        const dailyCash = await db.dailyCashes.get({ date });
        if (dailyCash) {
          const validMovements = dailyCash.movements.filter(() => true);

          if (validMovements.length !== dailyCash.movements.length) {
            const updatedCash = {
              ...dailyCash,
              movements: validMovements,
              ...recalculateTotals(validMovements),
            };
            await db.dailyCashes.update(dailyCash.id, updatedCash);
          }
        }
      }
    } catch (error) {
      console.error("Error al cargar gastos:", error);
      showNotification("Error al cargar gastos", "error");
    }
  }, []);

  const handleOpenModalForNew = async () => {
    const { needsRedirect } = await ensureCashIsOpen();
    if (needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }
    setIsEditing(false);
    setEditingExpenseId(null);
    resetExpenseForm();
    setIsOpenModal(true);
  };

  const handleOpenModalForEdit = async (expense: Expense) => {
    const { needsRedirect } = await ensureCashIsOpen();
    if (needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }

    if (!expense.id) {
      showNotification("No se puede editar un movimiento sin ID", "error");
      return;
    }

    setIsEditing(true);
    setEditingExpenseId(expense.id);
    setNewExpense({
      amount: expense.amount,
      date: expense.date,
      description: expense.description,
      category: expense.category,
      paymentMethod: expense.paymentMethod,
      receipt: expense.receipt,
      installments: expense.installments || 1,
      rubro: expense.rubro,
      supplier: expense.supplier || "",
      type: expense.type,
    });
    setNewCategory({
      name: "",
      rubro: rubro,
      type: expense.type as "INGRESO" | "EGRESO",
    });

    if (expense.receipt) {
      setReceiptPreview(expense.receipt);
    }

    setSelectedSupplier(expense.supplier || "");
    setIsOpenModal(true);
  };

  const handleApplyFilters = useCallback((filters: UnifiedFilter[]) => {
    setFilters(
      filters.map((filter) => ({
        field: filter.field as keyof Expense,
        value: filter.value,
      }))
    );
  }, []);

  const handleApplySort = (sort: {
    field: keyof Product | keyof Expense;
    direction: "asc" | "desc";
  }) => {
    setExpenses((prev) =>
      [...prev].sort((a, b) => {
        const field = sort.field;
        const direction = sort.direction === "asc" ? 1 : -1;

        if (field === "amount") {
          return direction * (a.amount - b.amount);
        }
        if (field === "date") {
          return (
            direction *
            (new Date(a.date).getTime() - new Date(b.date).getTime())
          );
        }
        if (field === "description") {
          return direction * a.description.localeCompare(b.description);
        }
        if (field === "category") {
          return direction * a.category.localeCompare(b.category);
        }
        if (field === "paymentMethod") {
          return direction * a.paymentMethod.localeCompare(b.paymentMethod);
        }
        return 0;
      })
    );
  };

  const handleSaveExpense = async () => {
    if (!newExpense.amount || !newExpense.category) {
      showNotification("Complete todos los campos obligatorios", "error");
      return;
    }

    try {
      const totalPayment = newExpense.combinedPaymentMethods
        ? newExpense.combinedPaymentMethods.reduce(
            (sum, m) => sum + (m.amount || 0),
            0
          )
        : newExpense.amount;

      const expenseData = {
        ...newExpense,
        rubro: rubro,
        amount: totalPayment,
      };

      if (isEditing && editingExpenseId) {
        await db.expenses.update(editingExpenseId, expenseData);
        const expenseDate = new Date(newExpense.date);
        const localDateString = expenseDate.toISOString().split("T")[0];

        const dailyCash = await db.dailyCashes.get({ date: localDateString });

        if (dailyCash) {
          const updatedMovements = dailyCash.movements.map((m) =>
            m.id === editingExpenseId
              ? {
                  ...m,
                  amount: totalPayment,
                  description: newExpense.description,
                  type: newExpense.type,
                  paymentMethod: newExpense.paymentMethod,
                  date: newExpense.date,
                  supplierName: newExpense.supplier,
                  expenseCategory: newExpense.category,
                  combinedPaymentMethods: newExpense.combinedPaymentMethods,
                }
              : m
          );

          const updatedCash = {
            ...dailyCash,
            movements: updatedMovements,
            totalIncome: updatedMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0),
            totalExpense: updatedMovements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0),
            cashIncome: updatedMovements
              .filter(
                (m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO"
              )
              .reduce((sum, m) => sum + m.amount, 0),
            cashExpense: updatedMovements
              .filter(
                (m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO"
              )
              .reduce((sum, m) => sum + m.amount, 0),
            otherIncome: updatedMovements
              .filter(
                (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
              )
              .reduce((sum, m) => sum + m.amount, 0),
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        }

        setExpenses((prev) =>
          prev.map((exp) =>
            exp.id === editingExpenseId
              ? { ...expenseData, id: editingExpenseId }
              : exp
          )
        );

        showNotification("Movimiento actualizado correctamente", "success");
      } else {
        const expenseToAdd = {
          ...expenseData,
          id: Date.now(),
        };
        await db.expenses.add(expenseToAdd);
        const expenseDate = new Date(newExpense.date);
        const localDateString = expenseDate.toISOString().split("T")[0];
        let dailyCash = await db.dailyCashes.get({ date: localDateString });

        if (!dailyCash) {
          const existingMovements = await db.dailyCashes
            .where("date")
            .equals(localDateString)
            .first();

          dailyCash = {
            id: Date.now(),
            date: localDateString,
            movements: existingMovements?.movements || [],
            closed: false,
            totalIncome: 0,
            totalExpense: 0,
            cashIncome: 0,
            cashExpense: 0,
            otherIncome: 0,
          };
          await db.dailyCashes.add(dailyCash);
        }

        const movement = {
          id: expenseToAdd.id,
          amount: totalPayment,
          description: newExpense.description,
          type: newExpense.type,
          paymentMethod: newExpense.paymentMethod,
          date: newExpense.date,
          rubro: rubro,
          supplierName: newExpense.supplier,
          expenseCategory: newExpense.category,
          combinedPaymentMethods: newExpense.combinedPaymentMethods,
        };

        const updatedMovements = [...dailyCash.movements, movement];

        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          totalIncome: updatedMovements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0),
          totalExpense: updatedMovements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0),
          cashIncome: updatedMovements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          cashExpense: updatedMovements
            .filter(
              (m) => m.type === "EGRESO" && m.paymentMethod === "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          otherIncome: updatedMovements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);

        setExpenses((prev) => [...prev, expenseToAdd]);
        showNotification("Movimiento registrado correctamente", "success");
      }

      resetExpenseForm();
      setIsOpenModal(false);
      setIsEditing(false);
      setEditingExpenseId(null);
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      showNotification("Error al registrar movimiento", "error");
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !expenseToDelete.id) return;

    try {
      await db.expenses.delete(expenseToDelete.id);
      const expenseDate = new Date(expenseToDelete.date);
      const localDateString = expenseDate
        .toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-");

      const dailyCash = await db.dailyCashes.get({ date: localDateString });

      if (dailyCash) {
        const updatedMovements = dailyCash.movements.filter(
          (m) => m.id !== expenseToDelete.id
        );

        const totals = updatedMovements.reduce(
          (acc, m) => {
            const amount = m.amount || 0;
            const isIncome = m.type === "INGRESO";
            const isCash = m.paymentMethod === "EFECTIVO";

            if (isIncome) {
              acc.totalIncome += amount;
              if (isCash) {
                acc.cashIncome += amount;
              } else {
                acc.otherIncome += amount;
              }
            } else if (m.type === "EGRESO") {
              acc.totalExpense += amount;
              if (isCash) {
                acc.cashExpense += amount;
              }
            }
            return acc;
          },
          {
            totalIncome: 0,
            totalExpense: 0,
            cashIncome: 0,
            cashExpense: 0,
            otherIncome: 0,
          }
        );

        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          ...totals,
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);

        if (updatedMovements.length === 0 && dailyCash.closed) {
          await db.dailyCashes.delete(dailyCash.id);
        }
      }

      await loadExpenses();
      showNotification("Movimiento eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
      showNotification("Error al eliminar movimiento", "error");
    }
  };

  const handleAddCategory = useCallback(async () => {
    if (!newCategory.name?.trim()) {
      showNotification("Ingrese un nombre para la categoría", "error");
      return;
    }

    const trimmedCategory = newCategory.name.trim();
    const lowerName = trimmedCategory.toLowerCase();
    const categoryExists = categories.some(
      (cat) =>
        cat.name.toLowerCase() === lowerName &&
        (cat.rubro === rubro || cat.rubro === "Todos los rubros")
    );

    if (categoryExists) {
      showNotification(
        "Ya existe una categoría con ese nombre para este rubro",
        "error"
      );
      return;
    }

    try {
      const categoryToAdd: ExpenseCategory = {
        id: Date.now(),
        name: trimmedCategory,
        rubro: rubro,
        type: "EGRESO",
      };

      await db.expenseCategories.add(categoryToAdd);
      setCategories((prev) => [...prev, categoryToAdd]);

      setNewExpense((prev) => ({
        ...prev,
        category: trimmedCategory,
      }));

      setNewCategory({
        name: "",
        rubro: rubro,
        type: "EGRESO",
      });

      showNotification("Categoría agregada correctamente", "success");
    } catch (error) {
      console.error("Error al agregar categoría:", error);
      showNotification("Error al agregar la categoría", "error");
    }
  }, [newCategory.name, categories, rubro, showNotification]);

  const handleDeleteCategory = async (category: ExpenseCategory) => {
    try {
      const expensesWithCategory = await db.expenses
        .where("category")
        .equals(category.name)
        .and((exp) => exp.rubro === rubro)
        .count();

      if (expensesWithCategory > 0) {
        showNotification(
          "No se puede eliminar la categoría porque tiene movimientos asociados",
          "error"
        );
        return;
      }

      if (category.id !== undefined) {
        await db.expenseCategories.delete(category.id);
        setCategories((prev) => prev.filter((c) => c.id !== category.id));
      }
      showNotification("Categoría eliminada correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar categoría:", error);
      showNotification("Error al eliminar categoría", "error");
    }
  };

  const resetExpenseForm = () => {
    setNewExpense({
      amount: 0,
      date: new Date().toISOString(),
      description: "",
      category: "",
      paymentMethod: "EFECTIVO",
      receipt: null,
      installments: 1,
      rubro: rubro,
      supplier: "",
      type: "EGRESO",
    });

    setNewCategory({ name: "", rubro: rubro, type: "EGRESO" });
    setReceiptPreview(null);
  };

  const filteredExpenses = expenses.filter((expense) => {
    if (expense.rubro !== rubro && rubro !== "Todos los rubros") return false;
    const expenseDate = parseISO(expense.date);
    if (
      !isWithinInterval(expenseDate, {
        start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
        end: endOfMonth(new Date(selectedYear, selectedMonth - 1)),
      })
    )
      return false;

    if (filters.length > 0) {
      return filters.every((filter) => {
        if (filter.field === "type") return expense.type === filter.value;
        if (filter.field === "category")
          return expense.category === filter.value;
        if (filter.field === "paymentMethod")
          return expense.paymentMethod === filter.value;
        if (filter.field === "supplier")
          return expense.supplier?.includes(filter.value);
        return true;
      });
    }

    return true;
  });

  const getCategoryStats = () => {
    const stats: Record<
      string,
      {
        totalIncome: number;
        totalExpense: number;
        countIncome: number;
        countExpense: number;
      }
    > = {};

    filteredExpenses.forEach((expense) => {
      if (!stats[expense.category]) {
        stats[expense.category] = {
          totalIncome: 0,
          totalExpense: 0,
          countIncome: 0,
          countExpense: 0,
        };
      }

      if (expense.type === "INGRESO") {
        stats[expense.category].totalIncome += expense.amount;
        stats[expense.category].countIncome++;
      } else {
        stats[expense.category].totalExpense += expense.amount;
        stats[expense.category].countExpense++;
      }
    });

    const totalIncome = filteredExpenses
      .filter((e) => e.type === "INGRESO")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpense = filteredExpenses
      .filter((e) => e.type === "EGRESO")
      .reduce((sum, e) => sum + e.amount, 0);

    return Object.entries(stats)
      .map(([category, data]) => ({
        category,
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
        countIncome: data.countIncome,
        countExpense: data.countExpense,
        percentageIncome:
          totalIncome > 0 ? (data.totalIncome / totalIncome) * 100 : 0,
        percentageExpense:
          totalExpense > 0 ? (data.totalExpense / totalExpense) * 100 : 0,
      }))
      .sort(
        (a, b) =>
          b.totalIncome + b.totalExpense - (a.totalIncome + a.totalExpense)
      );
  };

  const getMonthlyComparison = () => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i, 1), "MMM", { locale: es }),
      totalIncome: 0,
      totalExpense: 0,
    }));

    expenses.forEach((expense) => {
      const date = parseISO(expense.date);
      if (
        getYear(date) === selectedYear &&
        (rubro === "Todos los rubros" || expense.rubro === rubro)
      ) {
        if (expense.type === "INGRESO") {
          months[date.getMonth()].totalIncome += expense.amount;
        } else {
          months[date.getMonth()].totalExpense += expense.amount;
        }
      }
    });

    return months;
  };

  useEffect(() => {
    if (shouldRedirectToCash) {
      router.push("/caja-diaria");
    }
  }, [shouldRedirectToCash, router]);

  useEffect(() => {
    loadSuppliers();
    loadCategories();
    loadExpenses();
  }, [rubro, loadSuppliers, loadCategories, loadExpenses]);
  useEffect(() => {
    setNewCategory((prev) => ({
      ...prev,
      type: newExpense.type,
    }));
  }, [newExpense.type]);

  const indexOfLastExpense = currentPage * itemsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(
    indexOfFirstExpense,
    indexOfLastExpense
  );

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
          Movimientos
        </Typography>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            gap: 2,
          }}
        >
          <Box
            sx={{ display: "flex", width: "100%", maxWidth: "20rem", gap: 2 }}
          >
            <Select
              label="Mes"
              options={monthOptions}
              value={selectedMonth}
              onChange={setSelectedMonth}
            />
            <Select
              label="Año"
              options={yearOptions}
              value={selectedYear}
              onChange={setSelectedYear}
            />
          </Box>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
          >
            <AdvancedFilterPanel
              key={`${rubro}-filter`}
              data={expenses}
              onApplyFilters={handleApplyFilters}
              onApplySort={handleApplySort}
              rubro={rubro}
              isExpense={true}
            />
          </Box>
          {rubro !== "Todos los rubros" && (
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                startIcon={<Analytics />}
                onClick={() => setIsStatsModalOpen(true)}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                Estadísticas
              </Button>

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={handleOpenModalForNew}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                Nuevo Movimiento
              </Button>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "63vh", flex: 1 }}
            >
              <Table sx={{ minWidth: 650 }} size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                      color: "white",
                    }}
                  >
                    <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                      Tipo
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Descripción
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Categoría
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Proveedor
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Método de Pago
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "white",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Monto
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          color: "white",
                          fontWeight: "bold",
                          textAlign: "center",
                          width: 160,
                        }}
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentExpenses.length > 0 ? (
                    currentExpenses.map((expense) => (
                      <TableRow
                        key={expense.id}
                        sx={{
                          "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                            transform: "translateY(-1px)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          },
                          transition: "all 0.3s ease-in-out",
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <TableCell>
                          <CustomChip
                            label={expense.type}
                            size="small"
                            color={
                              expense.type === "INGRESO" ? "success" : "error"
                            }
                            variant="filled"
                          />
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: "medium", textAlign: "center" }}
                        >
                          {expense.description}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {format(parseISO(expense.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {toCapitalize(expense.category)}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {expense.supplier || "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {expense.paymentMethod}
                        </TableCell>
                        <TableCell
                          sx={{
                            textAlign: "center",
                            fontWeight: "bold",
                            color:
                              expense.type === "INGRESO"
                                ? "success.main"
                                : "error.main",
                          }}
                        >
                          {expense.type === "INGRESO" ? "+" : "-"}{" "}
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        {rubro !== "Todos los rubros" && (
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 2,
                              }}
                            >
                              {expense.receipt && (
                                <CustomGlobalTooltip title="Ver comprobante">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      setReceiptPreview(expense.receipt || null)
                                    }
                                    sx={{
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "primary.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <Description fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                              )}
                              <CustomGlobalTooltip title="Editar">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    handleOpenModalForEdit(expense);
                                  }}
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                >
                                  <Edit fontSize="small" />
                                </IconButton>
                              </CustomGlobalTooltip>
                              <CustomGlobalTooltip title="Eliminar">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setExpenseToDelete(expense);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  sx={{
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "error.main",
                                      color: "white",
                                    },
                                  }}
                                >
                                  <Delete fontSize="small" />
                                </IconButton>
                              </CustomGlobalTooltip>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{ py: 4, textAlign: "center" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.disabled",
                          }}
                        >
                          <InsertDriveFile
                            sx={{
                              fontSize: 64,
                              mb: 2,
                              color: theme.palette.text.disabled,
                            }}
                          />
                          <Typography>
                            No hay movimientos registrados.
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
          {filteredExpenses.length > 0 && (
            <Pagination
              text="Movimientos por página"
              text2="Total de Movimientos"
              totalItems={filteredExpenses.length}
            />
          )}
        </Box>

        {/* Modal para eliminar categoría */}
        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsCategoryDeleteModalOpen(false)}
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
                onClick={() => {
                  if (categoryToDelete) {
                    handleDeleteCategory(categoryToDelete);
                    setIsCategoryDeleteModalOpen(false);
                  }
                }}
                isPrimaryAction={true}
                sx={{
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
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
              ¿Está seguro/a que desea eliminar la categoría?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              La categoría <strong>{categoryToDelete?.name}</strong> será
              eliminada permanentemente.
            </Typography>
          </Box>
        </Modal>

        {/* Modal para nuevo/editar movimiento */}
        <Modal
          isOpen={isOpenModal}
          onClose={() => {
            setIsOpenModal(false);
            resetExpenseForm();
            setIsEditing(false);
            setEditingExpenseId(null);
          }}
          title={getModalTitle()}
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setIsOpenModal(false);
                  resetExpenseForm();
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
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSaveExpense}
                isPrimaryAction={true}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": {
                    backgroundColor: theme.palette.primary.dark,
                  },
                }}
              >
                {getButtonText()}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Select
                label="Tipo*"
                options={[
                  { value: "INGRESO", label: "Ingreso" },
                  { value: "EGRESO", label: "Egreso" },
                ]}
                value={newExpense.type}
                onChange={(value) => {
                  setNewExpense({
                    ...newExpense,
                    type: value as "INGRESO" | "EGRESO",
                  });
                  loadCategories();
                }}
              />
              <Select
                label="Proveedor"
                options={[
                  { value: "", label: "Seleccionar proveedor" },
                  ...suppliers.map((supplier) => ({
                    value: supplier.companyName,
                    label: supplier.companyName,
                  })),
                ]}
                value={selectedSupplier}
                onChange={(value) => {
                  setSelectedSupplier(value);
                  setNewExpense((prev) => ({
                    ...prev,
                    supplier: value,
                  }));
                }}
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 2,
                alignItems: "flex-end",
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Select
                  label="Categoría*"
                  options={[
                    {
                      value: "",
                      label: "Seleccionar categoría",
                      deletable: false,
                    },
                    ...categories.map((category) => ({
                      value: category.name,
                      label: category.name,
                      deletable: true,
                      metadata: category,
                    })),
                  ]}
                  value={newExpense.category}
                  onChange={(value) => {
                    setNewExpense({
                      ...newExpense,
                      category: value,
                    });
                  }}
                  onDeleteOption={(option) => {
                    const category = categories.find(
                      (c) =>
                        c.name === option.value ||
                        (option.metadata && c.id === option.metadata.id)
                    );
                    if (category) {
                      setCategoryToDelete(category);
                      setIsCategoryDeleteModalOpen(true);
                    }
                  }}
                  showDeleteButton={true}
                  fullWidth
                />
              </Box>

              {/* Mostrar input para crear nueva categoría SOLO cuando NO se está editando */}
              {!isEditing && (
                <Box sx={{ flex: 1 }}>
                  <Input
                    label="Crear Nueva Categoría"
                    value={newCategory.name || ""}
                    onChange={(value) => {
                      setNewCategory({
                        ...newCategory,
                        name: toCapitalize(value.toString()),
                      });
                    }}
                    placeholder="Nombre de nueva categoría"
                    buttonIcon={<Add fontSize="small" />}
                    onButtonClick={handleAddCategory}
                    buttonTitle="Crear categoría"
                    buttonDisabled={!newCategory.name?.trim()}
                    fullWidth
                  />
                </Box>
              )}

              {isEditing && (
                <Box sx={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div className="w-full bg-white dark:bg-gray_b p-2.5 rounded-lg border border-blue_l">
                    <p className="text-sm text-blue_b dark:text-blue-200">
                      <Info className="inline mr-2" fontSize="small" />
                      Para cambiar la categoría, seleccione una existente de la
                      lista.
                    </p>
                  </div>
                </Box>
              )}
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <InputCash
                label="Monto*"
                value={newExpense.amount}
                onChange={(value) =>
                  setNewExpense({ ...newExpense, amount: value })
                }
              />
              <Select
                label="Forma de pago*"
                options={paymentOptions}
                value={newExpense.paymentMethod}
                onChange={(value) =>
                  setNewExpense({
                    ...newExpense,
                    paymentMethod: value as PaymentMethod,
                  })
                }
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <CustomDatePicker
                value={newExpense.date}
                onChange={(newDate) => {
                  setNewExpense({
                    ...newExpense,
                    date: newDate || new Date().toISOString(),
                  });
                }}
              />
              <Input
                label="Descripción"
                placeholder="Concepto"
                value={newExpense.description}
                onRawChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                fullWidth
              />
            </Box>

            {newExpense.paymentMethod === "TARJETA" && (
              <Box sx={{ display: "flex", gap: 2 }}>
                <Input
                  label="Cuotas"
                  type="number"
                  placeholder="Número de cuotas"
                  value={newExpense.installments?.toString() || "1"}
                  onRawChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      installments: parseInt(e.target.value) || 1,
                    })
                  }
                  fullWidth
                />
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Typography variant="body2">
                    {(newExpense.installments ?? 1) > 1
                      ? `${formatCurrency(
                          newExpense.amount / (newExpense.installments ?? 1)
                        )} por cuota`
                      : "Pago en una sola cuota"}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </Modal>

        {/* Modal de confirmación para eliminar movimiento */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
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
                onClick={handleDeleteExpense}
                isPrimaryAction={true}
                sx={{
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
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
              ¿Está seguro/a que desea eliminar el movimiento?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              Este movimiento será eliminado permanentemente.
            </Typography>
          </Box>
        </Modal>

        {/* Modal de estadísticas */}
        <Modal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          title="Estadísticas de Movimientos"
          buttons={
            <Button
              variant="text"
              onClick={() => setIsStatsModalOpen(false)}
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
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Ingresos por Categoría
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Pie
                      data={{
                        labels: getCategoryStats()
                          .filter((item) => item.totalIncome > 0)
                          .map((item) => item.category),
                        datasets: [
                          {
                            data: getCategoryStats()
                              .filter((item) => item.totalIncome > 0)
                              .map((item) => item.totalIncome),
                            backgroundColor: [
                              "#AA6384",
                              "#36A2EB",
                              "#FFCE56",
                              "#4BC0C0",
                              "#9966FF",
                              "#FF9F40",
                              "#8AC24A",
                              "#607D8B",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `${context.label}: ${formatCurrency(
                                  context.raw as number
                                )} (${context.formattedValue}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Distribución de Egresos por Categoría
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Pie
                      data={{
                        labels: getCategoryStats()
                          .filter((item) => item.totalExpense > 0)
                          .map((item) => item.category),
                        datasets: [
                          {
                            data: getCategoryStats()
                              .filter((item) => item.totalExpense > 0)
                              .map((item) => item.totalExpense),
                            backgroundColor: [
                              "#AA6384",
                              "#36A2EB",
                              "#FFCE56",
                              "#4BC0C0",
                              "#9966FF",
                              "#FF9F40",
                              "#8AC24A",
                              "#607D8B",
                            ],
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `${context.label}: ${formatCurrency(
                                  context.raw as number
                                )} (${context.formattedValue}%)`;
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparativa Mensual de Ingresos - {selectedYear}
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={{
                        labels: getMonthlyComparison().map(
                          (item) => item.month
                        ),
                        datasets: [
                          {
                            label: "Ingresos",
                            data: getMonthlyComparison().map(
                              (item) => item.totalIncome
                            ),
                            backgroundColor: "#4BC0C0",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `Ingresos: ${formatCurrency(
                                  context.raw as number
                                )}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function (value) {
                                return formatCurrency(value as number);
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card sx={{ flex: "1 1 300px" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Comparativa Mensual de Egresos - {selectedYear}
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={{
                        labels: getMonthlyComparison().map(
                          (item) => item.month
                        ),
                        datasets: [
                          {
                            label: "Egresos",
                            data: getMonthlyComparison().map(
                              (item) => item.totalExpense
                            ),
                            backgroundColor: "#FF6384",
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: function (context) {
                                return `Egresos: ${formatCurrency(
                                  context.raw as number
                                )}`;
                              },
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function (value) {
                                return formatCurrency(value as number);
                              },
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Modal>

        {/* Modal para ver comprobante */}
        {receiptPreview && (
          <Modal
            isOpen={!!receiptPreview}
            onClose={() => setReceiptPreview(null)}
            title="Comprobante del Movimiento"
            buttons={
              <Button
                variant="text"
                onClick={() => setReceiptPreview(null)}
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
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              {receiptPreview.startsWith("data:image") ? (
                <Image
                  src={receiptPreview}
                  alt="Comprobante"
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    p: 8,
                  }}
                >
                  <Description
                    sx={{ fontSize: 64, color: "primary.main", mb: 2 }}
                  />
                  <Typography
                    variant="h6"
                    sx={{ color: "text.primary", mb: 2 }}
                  >
                    Comprobante en formato PDF
                  </Typography>
                  <Button
                    variant="contained"
                    href={receiptPreview}
                    download="comprobante.pdf"
                    sx={{
                      backgroundColor: "primary.main",
                      "&:hover": {
                        backgroundColor: "primary.dark",
                      },
                    }}
                  >
                    Descargar PDF
                  </Button>
                </Box>
              )}
            </Box>
          </Modal>
        )}

        {/* Notificación */}
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default MovimientosPage;
