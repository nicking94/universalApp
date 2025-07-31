"use client";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  DailyCashMovement,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Product,
  Supplier,
  UnifiedFilter,
} from "@/app/lib/types/types";
import { Plus, Trash, Edit, FileText, PieChart } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/app/database/db";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  getYear,
} from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import Input from "@/app/components/Input";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import { formatCurrency } from "@/app/lib/utils/currency";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { usePagination } from "@/app/context/PaginationContext";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import { toCapitalize } from "@/app/lib/utils/capitalizeText";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const MovimientosPage = () => {
  const router = useRouter();

  const { rubro } = useRubro();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<ExpenseCategory | null>(null);

  const [selectedSupplier, setSelectedSupplier] = useState<{
    value: number;
    label: string;
  } | null>(null);
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
    const storedCategories = await db.expenseCategories.toArray();
    const filtered = storedCategories.filter(
      (cat) =>
        (cat.rubro === rubro || cat.rubro === "Todos los rubros") &&
        (newExpense.type === "TODOS" || cat.type === newExpense.type)
    );
    setCategories(filtered);
  }, [rubro]);

  const loadExpenses = useCallback(async () => {
    try {
      const storedExpenses = await db.expenses.toArray();
      const sortedExpenses = storedExpenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      setExpenses(sortedExpenses);

      // Sincronizar con cajas diarias
      const expenseDates = [
        ...new Set(storedExpenses.map((e) => e.date.split("T")[0])),
      ];

      for (const date of expenseDates) {
        const dailyCash = await db.dailyCashes.get({ date });
        if (dailyCash) {
          // Mantener solo movimientos que existen en expenses o no son de expenses
          const validMovements = dailyCash.movements.filter((m) => {
            return (
              storedExpenses.some((e) => e.id === m.id) ||
              (m.type !== "EGRESO" && m.type !== "INGRESO")
            );
          });

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
  const handleOpenModal = async () => {
    const { needsRedirect } = await ensureCashIsOpen();
    if (needsRedirect) {
      setShouldRedirectToCash(true);

      return;
    }
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

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount || !newExpense.category) {
      showNotification("Complete todos los campos obligatorios", "error");
      return;
    }

    try {
      const totalPayment =
        newExpense.combinedPaymentMethods?.reduce(
          (sum, m) => sum + (m.amount || 0),
          0
        ) || newExpense.amount;

      const expenseToAdd = {
        ...newExpense,
        id: Date.now(),
        rubro: rubro,
        amount: totalPayment,
      };

      // 1. Registrar el movimiento en la tabla de expenses
      await db.expenses.add(expenseToAdd);

      // 2. Obtener la fecha local correctamente
      const expenseDate = new Date(newExpense.date);
      const localDateString = expenseDate
        .toLocaleDateString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .split("/")
        .reverse()
        .join("-");

      // 3. Registrar en caja diaria
      let dailyCash = await db.dailyCashes.get({ date: localDateString });

      // Verificar si existe una caja para esta fecha
      if (!dailyCash) {
        // Si no existe, verificar si hay cajas abiertas de días anteriores
        const allCashes = await db.dailyCashes.toArray();
        const openPreviousCashes = allCashes.filter(
          (cash) => !cash.closed && cash.date < localDateString
        );

        // Si hay cajas abiertas de días anteriores, cerrarlas primero
        if (openPreviousCashes.length > 0) {
          for (const cash of openPreviousCashes) {
            const updatedCash = {
              ...cash,
              closed: true,
              closingDate: new Date().toISOString(),
              ...recalculateTotals(cash.movements),
            };
            await db.dailyCashes.update(cash.id, updatedCash);
          }
          showNotification(
            `Se cerraron ${openPreviousCashes.length} caja(s) de días anteriores automáticamente.`,
            "info"
          );
        }

        // Ahora crear la nueva caja para la fecha correcta
        dailyCash = {
          id: Date.now(),
          date: localDateString,
          movements: [],
          closed: false,
          ...recalculateTotals([]),
        };
        await db.dailyCashes.add(dailyCash);
      }

      const movement = {
        id: expenseToAdd.id, // Usar el mismo ID que el expense
        amount: totalPayment,
        description: `Movimiento: ${newExpense.description}`,
        type: newExpense.type,
        paymentMethod: newExpense.paymentMethod,
        date: newExpense.date,
        rubro: rubro,
        supplierName: newExpense.supplier,
        expenseCategory: newExpense.category,
        combinedPaymentMethods: newExpense.combinedPaymentMethods,
      };

      // Actualizar la caja diaria
      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, movement],
        ...recalculateTotals([...dailyCash.movements, movement]),
      };
      await db.dailyCashes.update(dailyCash.id, updatedCash);

      // 3. Actualizar el estado local
      setExpenses((prev) => [...prev, expenseToAdd]);
      showNotification(
        `${
          newExpense.type === "INGRESO" ? "Ingreso" : "Egreso"
        } registrado correctamente`,
        "success"
      );
      resetExpenseForm();
      setIsOpenModal(false);
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      showNotification("Error al registrar movimiento", "error");
    }
  };

  const handleDeleteExpense = async () => {
    if (!expenseToDelete || !expenseToDelete.id) return;

    try {
      // 1. Eliminar el movimiento de la tabla de expenses
      await db.expenses.delete(expenseToDelete.id);

      // 2. Actualizar la caja diaria correspondiente
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
        // Filtrar el movimiento eliminado
        const updatedMovements = dailyCash.movements.filter(
          (m) => m.id !== expenseToDelete.id
        );

        // Calcular nuevos totales
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

        // Actualizar la caja diaria con los nuevos totales
        const updatedCash = {
          ...dailyCash,
          movements: updatedMovements,
          ...totals,
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);

        // Si no quedan movimientos y la caja está cerrada, eliminarla
        if (updatedMovements.length === 0 && dailyCash.closed) {
          await db.dailyCashes.delete(dailyCash.id);
        }
      }

      // 3. Actualizar el estado local y recargar datos
      await loadExpenses();
      showNotification("Movimiento eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
      showNotification("Error al eliminar movimiento", "error");
    }
  };
  const handleAddCategory = async () => {
    if (!newCategory.name) {
      showNotification("Ingrese un nombre para la categoría", "error");
      return;
    }

    // Verificar si la categoría ya existe
    const categoryExists = categories.some(
      (cat) =>
        cat.name.toLowerCase() === newCategory.name.toLowerCase() &&
        cat.rubro === rubro
    );

    if (categoryExists) {
      showNotification("Ya existe una categoría con ese nombre", "error");
      return;
    }

    try {
      const categoryToAdd = {
        ...newCategory,
        id: Date.now(),
        rubro: rubro,
      };

      await db.expenseCategories.add(categoryToAdd);

      // Actualizar el estado local inmediatamente
      setCategories((prev) => [...prev, categoryToAdd]);

      showNotification("Categoría agregada correctamente", "success");

      // Seleccionar automáticamente la categoría recién creada
      setNewExpense((prev) => ({
        ...prev,
        category: newCategory.name,
      }));

      setNewCategory({ name: "", rubro: rubro, type: "EGRESO" });
    } catch (error) {
      console.error("Error al agregar categoría:", error);
      showNotification("Error al agregar categoría", "error");
    }
  };
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
        // Actualizar estado local
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
    setReceiptPreview(null);
  };

  const filteredExpenses = expenses.filter((expense) => {
    // Filtro por rubro
    if (expense.rubro !== rubro && rubro !== "Todos los rubros") return false;

    // Filtro por mes y año
    const expenseDate = parseISO(expense.date);
    if (
      !isWithinInterval(expenseDate, {
        start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
        end: endOfMonth(new Date(selectedYear, selectedMonth - 1)),
      })
    )
      return false;

    // Filtros avanzados
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

  const indexOfLastExpense = currentPage * itemsPerPage;
  const indexOfFirstExpense = indexOfLastExpense - itemsPerPage;
  const currentExpenses = filteredExpenses.slice(
    indexOfFirstExpense,
    indexOfLastExpense
  );

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)] ">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Movimientos</h1>

        <div className="flex justify-between mb-2 gap-2">
          <div className="flex w-full max-w-[20rem] gap-2">
            <Select
              options={monthOptions}
              value={monthOptions.find(
                (option) => option.value === selectedMonth
              )}
              onChange={(option) =>
                setSelectedMonth(option?.value ?? new Date().getMonth() + 1)
              }
              placeholder="Mes"
              className="w-full h-[2rem] 2xl:h-auto text-gray_b"
              classNamePrefix="react-select"
            />
            <Select
              options={yearOptions}
              value={yearOptions.find(
                (option) => option.value === selectedYear
              )}
              onChange={(option) =>
                setSelectedYear(option?.value ?? new Date().getFullYear())
              }
              placeholder="Año"
              className="w-full h-[2rem] 2xl:h-auto text-gray_b"
              classNamePrefix="react-select"
            />
          </div>
          <div className="flex justify-between gap-2">
            <AdvancedFilterPanel
              key={`${rubro}-filter`}
              data={expenses}
              onApplyFilters={handleApplyFilters}
              onApplySort={handleApplySort}
              rubro={rubro}
              isExpense={true}
            />
          </div>
          {rubro !== "Todos los rubros" && (
            <div className="w-full flex justify-end gap-2 mt-2">
              <Button
                text="Estadísticas"
                title="Ver estadísticas"
                icon={<PieChart size={18} />}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={() => setIsStatsModalOpen(true)}
              />

              <Button
                title="Nuevo Movimiento"
                text="Nuevo Movimiento"
                icon={<Plus size={18} />}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleOpenModal}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-xs">
                <tr>
                  <th className="p-2 text-start">Tipo</th>
                  <th className="p-2 ">Descripción</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Categoría</th>
                  <th className="p-2">Proveedor</th>
                  <th className="p-2">Método de Pago</th>
                  <th className="p-2">Monto</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="w-40 max-w-[5rem] 2xl:max-w-[10rem] p-2">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white text-gray_b divide-y divide-gray_xl">
                {currentExpenses.length > 0 ? (
                  currentExpenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className={`text-xs 2xl:text-sm bg-white text-gray_b border border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300`}
                    >
                      <td
                        className={`text-start  font-semibold ${
                          expense.type === "INGRESO"
                            ? "text-green_b"
                            : "text-red_b"
                        } p-2 border border-gray_xl`}
                      >
                        {expense.type}
                      </td>
                      <td className="font-semibold px-2 border border-gray_xl">
                        {expense.description}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {format(parseISO(expense.date), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {toCapitalize(expense.category)}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {expense.supplier || "-"}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {expense.paymentMethod}
                      </td>
                      <td className="p-2 border border-gray_xl font-semibold text-red_b">
                        {formatCurrency(expense.amount)}
                      </td>
                      {rubro !== "Todos los rubros" && (
                        <td className="p-2 border border-gray_xl">
                          <div className="flex justify-center items-center gap-2 h-full">
                            {expense.receipt && (
                              <Button
                                title="Ver comprobante"
                                icon={<FileText size={18} />}
                                colorText="text-gray_b"
                                colorTextHover="hover:text-white"
                                colorBg="bg-transparent"
                                colorBgHover="hover:bg-blue-500"
                                px="px-1"
                                py="py-1"
                                minwidth="min-w-0"
                                onClick={() =>
                                  setReceiptPreview(expense.receipt || null)
                                }
                              />
                            )}
                            <Button
                              title="Editar"
                              icon={<Edit size={18} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-blue-500"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => {
                                setNewExpense({
                                  ...expense,
                                  date: expense.date,
                                });
                                if (expense.receipt)
                                  setReceiptPreview(expense.receipt);
                                setIsOpenModal(true);
                              }}
                            />
                            <Button
                              title="Eliminar"
                              icon={<Trash size={18} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-red-500"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => {
                                setExpenseToDelete(expense);
                                setIsDeleteModalOpen(true);
                              }}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td colSpan={8} className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                        <FileText size={64} className="mb-4 text-gray_m" />
                        <p className="text-gray_m">
                          No hay movimientos registrados.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredExpenses.length > 0 && (
            <Pagination
              text="Movimientos por página"
              text2="Total de Movimientos"
              totalItems={filteredExpenses.length}
            />
          )}
        </div>
        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          bgColor="bg-white dark:bg-gray_b"
          zIndex={"z-60"}
          buttons={
            <>
              <Button
                text="Confirmar"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={() => {
                  if (categoryToDelete) {
                    handleDeleteCategory(categoryToDelete);
                  }
                }}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsCategoryDeleteModalOpen(false)}
              />
            </>
          }
        >
          <div>
            <p>
              ¿Está seguro que desea eliminar la categoría{" "}
              <span className="font-bold">{categoryToDelete?.name}</span>?
            </p>
          </div>
        </Modal>
        <Modal
          isOpen={isOpenModal}
          onClose={() => {
            setIsOpenModal(false);
            resetExpenseForm();
          }}
          title={newExpense.amount ? "Editar Movimiento" : "Nuevo Movimiento"}
          buttons={
            <div className="flex justify-end space-x-4">
              <Button
                text={newExpense.date ? "Actualizar" : "Guardar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleAddExpense}
                hotkey="Enter"
                title="Guardar"
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => {
                  setIsOpenModal(false);
                  resetExpenseForm();
                }}
                hotkey="Escape"
                title="Cancelar"
              />
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Tipo*
                </label>
                <Select
                  options={[
                    { value: "INGRESO", label: "Ingreso" },
                    { value: "EGRESO", label: "Egreso" },
                  ]}
                  value={{
                    value: newExpense.type,
                    label: newExpense.type === "INGRESO" ? "Ingreso" : "Egreso",
                  }}
                  onChange={(option) => {
                    setNewExpense({
                      ...newExpense,
                      type: option?.value as "INGRESO" | "EGRESO",
                    });
                    loadCategories();
                  }}
                  className="text-gray_b"
                />
              </div>
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Proveedor
                </label>
                <Select
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: s.companyName,
                  }))}
                  noOptionsMessage={() => "Sin opciones"}
                  value={selectedSupplier}
                  onChange={(option) => {
                    setSelectedSupplier(option);
                    setNewExpense((prev) => ({
                      ...prev,
                      supplier: option?.label || "",
                    }));
                  }}
                  isClearable
                  placeholder="Seleccionar proveedor"
                  className="text-gray_b"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Categoría*
                </label>
                <Select
                  placeholder="Seleccionar categoría*"
                  options={categories.map((c) => ({
                    value: c.name,
                    label: c.name,
                    category: c,
                  }))}
                  noOptionsMessage={() => "Sin opciones"}
                  value={
                    newExpense.category
                      ? {
                          value: newExpense.category,
                          label: newExpense.category,
                          category: categories.find(
                            (c) => c.name === newExpense.category
                          ),
                        }
                      : null
                  }
                  onChange={(option) => {
                    setNewExpense({
                      ...newExpense,
                      category: option?.value || "",
                    });
                    // Forzar re-render del Select
                    setCategories([...categories]);
                  }}
                  formatOptionLabel={({ label, category }) => (
                    <div className="flex justify-between items-center w-full">
                      <span>{label}</span>
                      {category && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCategoryToDelete(category);
                            setIsCategoryDeleteModalOpen(true);
                          }}
                          className="text-red_b hover:text-red_m ml-2"
                          title="Eliminar categoría"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </div>
                  )}
                  className="w-full text-gray_b"
                  classNamePrefix="react-select"
                />
              </div>
              {newExpense.category === "" && (
                <div className="w-full flex items-center gap-2 ">
                  <Input
                    label="Crear categoría"
                    type="text"
                    name="name"
                    placeholder="Ej: Alquiler, Servicios, Insumos"
                    value={toCapitalize(newCategory.name)}
                    onChange={(e) =>
                      setNewCategory({
                        ...newCategory,
                        name: toCapitalize(e.target.value),
                      })
                    }
                  />
                  <Button
                    text="Agregar"
                    icon={<Plus size={18} />}
                    colorText="text-white"
                    colorTextHover="text-white"
                    colorBg="bg-blue_b"
                    colorBgHover="hover:bg-blue_m"
                    px="px-2"
                    py="py-1 mt-5"
                    onClick={handleAddCategory}
                    disabled={!newCategory.name.trim()}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <InputCash
                label="Monto*"
                value={newExpense.amount}
                onChange={(value) =>
                  setNewExpense({ ...newExpense, amount: value })
                }
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Forma de pago*
                </label>
                <Select
                  options={paymentOptions}
                  value={paymentOptions.find(
                    (o) => o.value === newExpense.paymentMethod
                  )}
                  onChange={(option) =>
                    setNewExpense({
                      ...newExpense,
                      paymentMethod:
                        (option?.value as PaymentMethod) || "EFECTIVO",
                    })
                  }
                  className="text-gray_b"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
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
                label="Descripción*"
                type="text"
                name="description"
                placeholder="Concepto"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
              />
            </div>
          </div>

          {newExpense.paymentMethod === "TARJETA" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Cuotas"
                type="number"
                name="installments"
                placeholder="Número de cuotas"
                value={newExpense.installments?.toString() || "1"}
                onChange={(e) =>
                  setNewExpense({
                    ...newExpense,
                    installments: parseInt(e.target.value) || 1,
                  })
                }
              />
              <div className="flex items-end">
                <p className="text-sm text-gray_m">
                  {(newExpense.installments ?? 1) > 1
                    ? `${formatCurrency(
                        newExpense.amount / (newExpense.installments ?? 1)
                      )} por cuota`
                    : "Pago en una sola cuota"}
                </p>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal de confirmación para eliminar */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
          buttons={
            <div className="flex justify-end space-x-4">
              <Button
                text="Eliminar"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red_m"
                colorBgHover="hover:bg-red_b"
                onClick={handleDeleteExpense}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsDeleteModalOpen(false)}
              />
            </div>
          }
        >
          <p>¿Está seguro que desea eliminar el movimiento?</p>
        </Modal>

        {/* Modal de estadísticas */}
        <Modal
          isOpen={isStatsModalOpen}
          onClose={() => setIsStatsModalOpen(false)}
          title="Estadísticas de Movimientos"
          buttons={
            <Button
              text="Cerrar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
              onClick={() => setIsStatsModalOpen(false)}
            />
          }
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">
                Distribución de Ingresos por Categoría
              </h3>
              <div className="h-54">
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
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Distribución de Egresos por Categoría
              </h3>
              <div className="h-54">
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
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Comparativa Mensual de Ingresos - {selectedYear}
              </h3>
              <div className="h-54">
                <Bar
                  data={{
                    labels: getMonthlyComparison().map((item) => item.month),
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
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Comparativa Mensual de Egresos - {selectedYear}
              </h3>
              <div className="h-54">
                <Bar
                  data={{
                    labels: getMonthlyComparison().map((item) => item.month),
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
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal para ver comprobante */}
        {receiptPreview && (
          <Modal
            isOpen={!!receiptPreview}
            onClose={() => setReceiptPreview(null)}
            title="Comprobante del Movimiento"
            buttons={
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setReceiptPreview(null)}
              />
            }
          >
            <div className="flex justify-center">
              {receiptPreview.startsWith("data:image") ? (
                <img
                  src={receiptPreview}
                  alt="Comprobante"
                  className="max-h-[70vh] max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-8">
                  <FileText
                    size={64}
                    className="text-blue_b dark:text-blue_l mb-4"
                  />
                  <p className="text-lg font-medium text-gray_b dark:text-white">
                    Comprobante en formato PDF
                  </p>
                  <a
                    href={receiptPreview}
                    download="comprobante.pdf"
                    className="mt-4 px-4 py-2 bg-blue_b text-white rounded hover:bg-blue_m transition-colors"
                  >
                    Descargar PDF
                  </a>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Notificación */}
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </div>
    </ProtectedRoute>
  );
};

export default MovimientosPage;
