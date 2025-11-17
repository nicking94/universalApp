"use client";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { db } from "@/app/database/db";
import {
  DailyCash,
  DailyCashMovement,
  MonthlyData,
  Product,
  Rubro,
} from "@/app/lib/types/types";
import {
  parseISO,
  isSameYear,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getYear,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState, useMemo } from "react";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { useRubro } from "@/app/context/RubroContext";
import { calculatePrice, calculateProfit } from "@/app/lib/utils/calculations";
import Select from "react-select";
import { SingleValue } from "react-select";

const WEEK_STARTS_ON = 1;
ChartJS.register(
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Metrics = () => {
  const { rubro } = useRubro();
  const [products, setProducts] = useState<Product[]>([]);
  const [monthlyRankingUnit, setMonthlyRankingUnit] = useState<
    Product["unit"] | "General"
  >("General");
  const [yearlyRankingUnit, setYearlyRankingUnit] = useState<
    Product["unit"] | "General"
  >("General");
  const [weeklyRankingUnit, setWeeklyRankingUnit] = useState<
    Product["unit"] | "General"
  >("General");
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [userChangedMonth, setUserChangedMonth] = useState(false);
  const unidadLegible: Record<Product["unit"] | "General", string> = {
    General: "General",
    A: "amperio",
    Bulto: "bulto",
    Caja: "caja",
    Cajón: "cajón",
    Ciento: "ciento",
    Cm: "centímetro",
    Docena: "docena",
    Gr: "gramo",
    Kg: "kilogramo",
    L: "litro",
    M: "metro",
    "M²": "metro cuadrado",
    "M³": "metro cúbico",
    Ml: "mililitro",
    Mm: "milímetro",
    Pulg: "pulgada",
    Ton: "tonelada",
    "Unid.": "unidad",
    V: "voltio",
    W: "vatio",
  };
  const isCurrentMonth = (month: number, year: number): boolean => {
    const today = new Date();
    return month === today.getMonth() + 1 && year === today.getFullYear();
  };
  const filterByRubro = (
    movement: DailyCashMovement,
    currentRubro: Rubro
  ): boolean => {
    if (currentRubro === "Todos los rubros") return true;
    // Movimientos de presupuestos deben filtrarse por su rubro original
    if (movement.fromBudget || movement.budgetId) {
      return movement.rubro === currentRubro;
    }
    // Todos los movimientos de ingreso que coincidan con el rubro
    if (movement.type === "INGRESO") {
      if (movement.rubro) {
        return movement.rubro === currentRubro;
      }
      if (movement.items) {
        return movement.items.some((item) => {
          const product = products.find((p) => p.id === item.productId);
          return product?.rubro === currentRubro;
        });
      }
      if (movement.productId) {
        const product = products.find((p) => p.id === movement.productId);
        return product?.rubro === currentRubro;
      }
      return false;
    }
    if (movement.type === "EGRESO") {
      if (movement.rubro) {
        return movement.rubro === currentRubro;
      }
      if (movement.productId) {
        const product = products.find((p) => p.id === movement.productId);
        return product?.rubro === currentRubro;
      }
      return false;
    }
    return false;
  };

  const getConsistentSummary = useMemo(
    () => (period: "week" | "month" | "year") => {
      const today = new Date();
      const selectedDate = new Date(selectedYear, selectedMonth - 1);

      // Semana siempre debe calcularse desde el lunes hasta el domingo de la semana actual
      if (period === "week") {
        const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON }); // WEEK_STARTS_ON = 1 (Lunes)
        const weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });

        const filteredCashes = dailyCashes.filter((cash) => {
          const date = parseISO(cash.date);
          return date >= weekStart && date <= weekEnd;
        });

        return filteredCashes.reduce(
          (acc, cash) => {
            const filteredMovements = cash.movements.filter((m) =>
              filterByRubro(m, rubro)
            );
            const ingresos = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const egresos = filteredMovements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const ganancia = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + (m.profit || 0), 0);
            return {
              ingresos: acc.ingresos + ingresos,
              egresos: acc.egresos + egresos,
              ganancia: acc.ganancia + ganancia,
            };
          },
          { ingresos: 0, egresos: 0, ganancia: 0 }
        );
      } else if (period === "month") {
        // Lógica para el mes
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);

        const filteredCashes = dailyCashes.filter((cash) => {
          const date = parseISO(cash.date);
          return date >= monthStart && date <= monthEnd;
        });

        return filteredCashes.reduce(
          (acc, cash) => {
            const filteredMovements = cash.movements.filter((m) =>
              filterByRubro(m, rubro)
            );
            const ingresos = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const egresos = filteredMovements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const ganancia = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + (m.profit || 0), 0);
            return {
              ingresos: acc.ingresos + ingresos,
              egresos: acc.egresos + egresos,
              ganancia: acc.ganancia + ganancia,
            };
          },
          { ingresos: 0, egresos: 0, ganancia: 0 }
        );
      } else {
        // Lógica para el año
        const yearStart = new Date(selectedYear, 0, 1);
        const yearEnd = new Date(selectedYear, 11, 31);

        const filteredCashes = dailyCashes.filter((cash) => {
          const date = parseISO(cash.date);
          return date >= yearStart && date <= yearEnd;
        });

        return filteredCashes.reduce(
          (acc, cash) => {
            const filteredMovements = cash.movements.filter((m) =>
              filterByRubro(m, rubro)
            );
            const ingresos = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const egresos = filteredMovements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const ganancia = filteredMovements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + (m.profit || 0), 0);
            return {
              ingresos: acc.ingresos + ingresos,
              egresos: acc.egresos + egresos,
              ganancia: acc.ganancia + ganancia,
            };
          },
          { ingresos: 0, egresos: 0, ganancia: 0 }
        );
      }
    },
    [dailyCashes, selectedYear, selectedMonth, rubro, products]
  );

  const getChartData = useMemo(
    () => (period: "week" | "month" | "year") => {
      if (period === "month") {
        const daysInMonth = eachDayOfInterval({
          start: startOfMonth(new Date(selectedYear, selectedMonth - 1)),
          end: endOfMonth(new Date(selectedYear, selectedMonth - 1)),
        });

        return daysInMonth.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dailyCash = dailyCashes.find((dc) => dc.date === dateStr);
          if (!dailyCash)
            return {
              date: format(day, "dd"),
              ingresos: 0,
              egresos: 0,
              ganancia: 0,
            };

          const filteredMovements = dailyCash.movements.filter((m) =>
            filterByRubro(m, rubro)
          );
          const ingresos = filteredMovements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const egresos = filteredMovements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const ganancia = filteredMovements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              const productsProfit = m.profit || 0;
              return sum + productsProfit;
            }, 0);

          return {
            date: format(day, "dd"),
            ingresos,
            egresos,
            ganancia,
          };
        });
      } else if (period === "week") {
        // Siempre usar la semana actual para el gráfico semanal
        const weekStart = startOfWeek(new Date(), {
          weekStartsOn: WEEK_STARTS_ON,
        });
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });

        const daysInWeek = eachDayOfInterval({
          start: weekStart,
          end: weekEnd,
        });

        return daysInWeek.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dailyCash = dailyCashes.find((dc) => dc.date === dateStr);
          if (!dailyCash)
            return {
              date: format(day, "EEE", { locale: es }),
              ingresos: 0,
              egresos: 0,
              ganancia: 0,
            };
          const filteredMovements = dailyCash.movements.filter((m) =>
            filterByRubro(m, rubro)
          );
          const ingresos = filteredMovements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const egresos = filteredMovements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const ganancia = filteredMovements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              const productsProfit = m.profit || 0;
              return sum + productsProfit;
            }, 0);
          return {
            date: format(day, "EEE", { locale: es }),
            ingresos,
            egresos,
            ganancia,
          };
        });
      } else {
        const currentYear = new Date().getFullYear();
        const monthlyData: MonthlyData[] = Array.from(
          { length: 12 },
          (_, i) => {
            const monthStart = new Date(currentYear, i, 1);
            const monthEnd = new Date(currentYear, i + 1, 0);
            const monthCashes = dailyCashes.filter((cash) => {
              const date = parseISO(cash.date);
              return date >= monthStart && date <= monthEnd;
            });

            const summary = monthCashes.reduce(
              (acc, cash) => {
                const filteredMovements = cash.movements.filter((m) =>
                  filterByRubro(m, rubro)
                );
                const ingresos = filteredMovements
                  .filter((m) => m.type === "INGRESO")
                  .reduce((sum, m) => sum + m.amount, 0);
                const egresos = filteredMovements
                  .filter((m) => m.type === "EGRESO")
                  .reduce((sum, m) => sum + m.amount, 0);
                const ganancia = filteredMovements
                  .filter((m) => m.type === "INGRESO")
                  .reduce((sum, m) => sum + (m.profit || 0), 0);

                return {
                  ingresos: acc.ingresos + ingresos,
                  egresos: acc.egresos + egresos,
                  ganancia: acc.ganancia + ganancia,
                };
              },
              { ingresos: 0, egresos: 0, ganancia: 0 }
            );

            return {
              month: format(new Date(currentYear, i, 1), "MMM", { locale: es }),
              ...summary,
            };
          }
        );

        return monthlyData;
      }
    },
    [dailyCashes, selectedYear, selectedMonth, rubro, products]
  );

  const getProductMovements = useMemo(
    () =>
      (
        period: "week" | "month" | "year",
        selectedUnit: Product["unit"] | "General"
      ) => {
        let filteredCashes = dailyCashes;

        if (period === "month") {
          const monthStart = new Date(selectedYear, selectedMonth - 1, 1);
          const monthEnd = new Date(selectedYear, selectedMonth, 0);
          filteredCashes = dailyCashes.filter((cash) => {
            const date = parseISO(cash.date);
            return date >= monthStart && date <= monthEnd;
          });
        } else if (period === "year") {
          filteredCashes = dailyCashes.filter((cash) => {
            const date = parseISO(cash.date);
            return isSameYear(date, new Date(selectedYear, 0));
          });
        } else if (period === "week") {
          let weekStart, weekEnd;
          const selectedDate = new Date(selectedYear, selectedMonth - 1);

          if (userChangedMonth) {
            // Mostrar última semana del mes seleccionado
            const lastDayOfMonth = endOfMonth(selectedDate);
            weekStart = startOfWeek(lastDayOfMonth, {
              weekStartsOn: WEEK_STARTS_ON,
            });
            weekEnd = endOfWeek(lastDayOfMonth, {
              weekStartsOn: WEEK_STARTS_ON,
            });
          } else {
            // Semana actual
            const today = new Date();
            weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
            weekEnd = endOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
          }

          filteredCashes = dailyCashes.filter((cash) => {
            const date = parseISO(cash.date);
            return date >= weekStart && date <= weekEnd;
          });
        }

        const productMap = new Map<
          string,
          {
            name: string;
            quantity: number;
            amount: number;
            profit: number;
            unit: string;
            rubro: Rubro;
          }
        >();

        filteredCashes.forEach((cash) => {
          cash.movements.forEach((movement) => {
            if (movement.type === "INGRESO" && movement.items) {
              movement.items.forEach((item) => {
                const product = products.find((p) => p.id === item.productId);
                const itemUnit = item.unit || "Unid.";
                if (
                  product &&
                  (rubro === "Todos los rubros" || product.rubro === rubro) &&
                  (selectedUnit === "General" || itemUnit === selectedUnit)
                ) {
                  const displayName = getDisplayProductName(
                    {
                      name: item.productName,
                      size: product.size,
                      color: product.color,
                      rubro: product.rubro,
                    },
                    product.rubro
                  );
                  const existing = productMap.get(displayName) || {
                    name: displayName,
                    quantity: 0,
                    amount: 0,
                    profit: 0,
                    unit: itemUnit,
                    rubro: product.rubro,
                  };
                  const profitPerUnit = calculateProfit(
                    product,
                    item.quantity,
                    itemUnit
                  );
                  productMap.set(displayName, {
                    name: displayName,
                    quantity: existing.quantity + item.quantity,
                    amount:
                      existing.amount +
                      calculatePrice(product, item.quantity, itemUnit)
                        .finalPrice,
                    profit: existing.profit + profitPerUnit,
                    unit: itemUnit,
                    rubro: existing.rubro,
                  });
                }
              });
            }
          });
        });

        const allProducts = Array.from(productMap.values()).sort(
          (a, b) => b.quantity - a.quantity
        );

        const formatDisplayQuantity = (qty: number, unit: string) => {
          if (
            unit === "Unid." ||
            unit === "Bulto" ||
            unit === "Caja" ||
            unit === "Cajón" ||
            unit === "docena" ||
            unit === "ciento"
          ) {
            return Math.round(qty).toString();
          }
          const rounded = Math.round(qty * 100) / 100;
          return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
        };

        return allProducts.slice(0, 5).map((product) => ({
          ...product,
          displayText: `${formatDisplayQuantity(
            product.quantity,
            product.unit
          )} ${product.unit}`,
        }));
      },
    [
      dailyCashes,
      products,
      rubro,
      selectedYear,
      selectedMonth,
      userChangedMonth,
    ]
  );
  useEffect(() => {
    const today = new Date();
    if (selectedYear !== today.getFullYear()) {
      db.dailyCashes.toArray().then(setDailyCashes);
    }
  }, [selectedYear]);
  useEffect(() => {
    const checkMonthChange = () => {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
        // Si el mes cambió naturalmente (no por el usuario)
        if (!userChangedMonth) {
          setSelectedMonth(currentMonth);
          setSelectedYear(currentYear);
          // Forzar recarga de datos
          db.dailyCashes.toArray().then((cashes) => {
            setDailyCashes(
              cashes.sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime()
              )
            );
          });
        }
      }
    };

    checkMonthChange();
    const intervalId = setInterval(checkMonthChange, 60000);
    return () => clearInterval(intervalId);
  }, [selectedMonth, selectedYear, userChangedMonth]);

  useEffect(() => {
    const fetchData = async () => {
      const [storedDailyCashes, storedProducts] = await Promise.all([
        db.dailyCashes.toArray(),
        db.products.toArray(),
      ]);

      // Ordenar los datos por fecha para asegurar consistencia
      const sortedCashes = storedDailyCashes.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      setDailyCashes(sortedCashes);
      setProducts(storedProducts);

      // Actualizar años disponibles
      const years = new Set<number>();
      storedDailyCashes.forEach((cash) => {
        const date = parseISO(cash.date);
        years.add(getYear(date));
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    };

    // Cargar datos iniciales
    fetchData();

    // Establecer un intervalo para actualizar datos periódicamente
    const intervalId = setInterval(fetchData, 300000); // 5 minutos

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (rubro === "indumentaria") {
      setMonthlyRankingUnit("Unid.");
      setYearlyRankingUnit("Unid.");
      setWeeklyRankingUnit("Unid.");
    }
  }, [rubro]);

  const unitOptions: { value: Product["unit"] | "General"; label: string }[] = [
    { value: "General", label: "General" },
    { value: "A", label: "Amperios" },
    { value: "Bulto", label: "Bultos" },
    { value: "Cajón", label: "Cajones" },
    { value: "Caja", label: "Cajas" },
    { value: "Ciento", label: "Cientos" },
    { value: "Cm", label: "Centímetros" },
    { value: "Docena", label: "Docenas" },
    { value: "Gr", label: "Gramos" },
    { value: "Kg", label: "Kilogramos" },
    { value: "L", label: "Litros" },
    { value: "M", label: "Metros" },
    { value: "M²", label: "Metros cuadrados" },
    { value: "M³", label: "Metros cúbicos" },
    { value: "Ml", label: "Mililitros" },
    { value: "Mm", label: "Milímetros" },
    { value: "Pulg", label: "Pulgadas" },
    { value: "Ton", label: "Toneladas" },
    { value: "Unid.", label: "Unidades" },
    { value: "V", label: "Voltios" },
    { value: "W", label: "Watts" },
  ];

  const weeklySummary = getConsistentSummary("week");
  const monthlySummary = getConsistentSummary("month");
  const annualSummary = getConsistentSummary("year");

  const dailyWeekData = getChartData("week");
  const dailyMonthData = getChartData("month");
  const monthlyYearData = getChartData("year") as MonthlyData[];

  const topProductsWeekly = getProductMovements("week", weeklyRankingUnit);
  const topProductsMonthly = getProductMovements("month", monthlyRankingUnit);
  const topProductsYearly = getProductMovements("year", yearlyRankingUnit);

  const weeklyBarChartData = {
    labels: dailyWeekData.map((data) =>
      "date" in data ? data.date : data.month
    ),
    datasets: [
      {
        label: "Ingresos",
        data: dailyWeekData.map((data) => data.ingresos || 0),
        backgroundColor: "rgba(75, 192, 192, 0.8)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: dailyWeekData.map((data) => data.egresos || 0),
        backgroundColor: "rgba(255, 99, 132, 0.8)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlyBarChartData = {
    labels: dailyMonthData.map((data) =>
      "date" in data ? data.date : data.month
    ),
    datasets: [
      {
        label: "Ingresos",
        data: dailyMonthData.map((data) => data.ingresos || 0),
        backgroundColor: "rgba(75, 192, 192, 0.8)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: dailyMonthData.map((data) => data.egresos || 0),
        backgroundColor: "rgba(255, 99, 132, 0.8)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlyProfitLineChartData = {
    labels: dailyMonthData.map((data) =>
      "date" in data ? data.date : data.month
    ),
    datasets: [
      {
        label: "Ganancia Diaria",
        data: dailyMonthData.map((data) => data.ganancia),
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.8)",
        borderWidth: 2,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const annualBarChartData = {
    labels: monthlyYearData.map((data) => data.month),
    datasets: [
      {
        label: "Ingresos",
        data: monthlyYearData.map((data) => data.ingresos),
        backgroundColor: "rgba(75, 192, 192, 0.8)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: monthlyYearData.map((data) => data.egresos),
        backgroundColor: "rgba(255, 99, 132, 0.8)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const summaryPieChartData = {
    labels: ["Ingresos", "Egresos", "Ganancia"],
    datasets: [
      {
        data: [
          monthlySummary.ingresos,
          monthlySummary.egresos,
          monthlySummary.ganancia,
        ],
        backgroundColor: [
          "rgba(75, 192, 192, 0.8)",
          "rgba(255, 99, 132, 0.8)",
          "rgba(153, 102, 255, 0.8)",
        ],
        borderColor: [
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
          "rgba(153, 102, 255, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2 gap-2">
          <h1 className="text-lg 2xl:text-xl font-semibold ">Métricas</h1>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label
                htmlFor="month"
                className="text-sm font-medium text-gray_b dark:text-gray_l"
              >
                Mes:
              </label>
              <Select
                id="month"
                value={{
                  value: selectedMonth,
                  label: format(
                    new Date(selectedYear, selectedMonth - 1, 1),
                    "MMMM",
                    { locale: es }
                  ),
                }}
                onChange={(
                  option: SingleValue<{ value: number; label: string }>
                ) => {
                  setUserChangedMonth(true);
                  setSelectedMonth(option?.value ?? selectedMonth);
                }}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: i + 1,
                  label: format(new Date(selectedYear, i, 1), "MMMM", {
                    locale: es,
                  }),
                }))}
                className="text-gray_m min-w-40"
                classNamePrefix="select"
                isSearchable={false}
              />
            </div>
            <div className="flex items-center gap-2">
              <label
                htmlFor="year"
                className="text-sm font-medium text-gray_b dark:text-gray_l"
              >
                Año:
              </label>
              <Select
                placeholder="Seleccionar año"
                noOptionsMessage={() => "Sin opciones"}
                options={availableYears.map((year) => ({
                  value: year,
                  label: year.toString(),
                }))}
                value={{
                  value: selectedYear,
                  label: selectedYear.toString(),
                }}
                onChange={(selectedOption) => {
                  if (selectedOption) {
                    setSelectedYear(selectedOption.value);
                  }
                }}
                className="text-gray_m min-w-40"
                classNamePrefix="react-select"
                menuPosition="fixed"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 mb-6">
          {/* Weekly Summary Card */}
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b ">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-orange-100 dark:bg-orange-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-orange-500 dark:text-orange-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 1.586l-4 4v12.828l4-4V1.586zM3.707 3.293A1 1 0 002 4v10a1 1 0 00.293.707L6 18.414V5.586L3.707 3.293zM17.707 5.293L14 1.586v12.828l2.293 2.293A1 1 0 0018 16V6a1 1 0 00-.293-.707z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Semanal
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green_xl dark:bg-green_b rounded-lg">
                <span className="text-sm font-medium ">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(weeklySummary.ingresos)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red_xl dark:bg-red_b/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(weeklySummary.egresos)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(weeklySummary.ganancia)}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex bg-gradient-to-bl from-blue_m to-blue_b dark:bg-gray_m text-white items-center mb-2 px-2">
                <h3 className="w-full p-2 font-medium text-sm">
                  5 Productos más vendidos{" "}
                  {weeklyRankingUnit !== "General" &&
                    `por ${unidadLegible[weeklyRankingUnit]}`}{" "}
                  esta semana
                </h3>
                <Select
                  placeholder="Seleccionar unidad"
                  noOptionsMessage={() => "Sin opciones"}
                  options={unitOptions}
                  value={
                    rubro === "indumentaria"
                      ? { value: "Unid.", label: "Unidades" }
                      : { value: weeklyRankingUnit, label: weeklyRankingUnit }
                  }
                  onChange={(selectedOption) => {
                    if (selectedOption && rubro !== "indumentaria") {
                      setWeeklyRankingUnit(
                        selectedOption.value as Product["unit"]
                      );
                    }
                  }}
                  isDisabled={rubro === "indumentaria"}
                  className={`text-gray_m min-w-40 ${
                    rubro === "indumentaria"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  classNamePrefix="react-select"
                  menuPosition="fixed"
                />
              </div>
              {topProductsWeekly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsWeekly.map((product, index) => (
                    <div
                      key={index}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="truncate">
                        <span className="font-bold text-blue_m dark:text-blue_l">
                          {index + 1}- {""}
                        </span>
                        {product.name}
                      </span>
                      <span className="font-medium">{product.displayText}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray_m dark:text-gray_m">
                  No hay datos de ventas esta semana
                </p>
              )}
            </div>
          </div>

          {/* Monthly Summary Card */}
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b ">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-600 dark:text-purple-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Mensual -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green_xl dark:bg-green_b rounded-lg">
                <span className="text-sm font-medium ">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ingresos)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red_xl dark:bg-red_b/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.egresos)}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-600/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ganancia)}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex bg-gradient-to-bl from-blue_m to-blue_b dark:bg-gray_m text-white items-center mb-2 px-2">
                <h3 className="w-full p-2 font-medium text-sm">
                  5 Productos más vendidos{" "}
                  {monthlyRankingUnit !== "General" &&
                    `por ${unidadLegible[monthlyRankingUnit]}`}{" "}
                  este mes
                </h3>
                <Select
                  placeholder="Seleccionar unidad"
                  noOptionsMessage={() => "Sin opciones"}
                  options={unitOptions}
                  value={
                    rubro === "indumentaria"
                      ? { value: "Unid.", label: "Unidades" }
                      : { value: monthlyRankingUnit, label: monthlyRankingUnit }
                  }
                  onChange={(selectedOption) => {
                    if (selectedOption && rubro !== "indumentaria") {
                      setMonthlyRankingUnit(
                        selectedOption.value as Product["unit"]
                      );
                    }
                  }}
                  isDisabled={rubro === "indumentaria"}
                  className={`text-gray_m min-w-40  ${
                    rubro === "indumentaria"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  classNamePrefix="react-select"
                  menuPosition="fixed"
                />
              </div>
              {topProductsMonthly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsMonthly.map((product, index) => (
                    <div
                      key={index}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="truncate">
                        <span className="font-bold text-blue_m dark:text-blue_l">
                          {index + 1}- {""}
                        </span>
                        {product.name}
                      </span>
                      <span className="font-medium">{product.displayText}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray_m dark:text-gray_m">
                  No hay datos de ventas este mes
                </p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-indigo-500 dark:text-indigo-300"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              Resumen Anual
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green_xl dark:bg-green_b rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ingresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red_xl dark:bg-red_b/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.egresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-600/30  rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ganancia)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex bg-gradient-to-bl from-blue_m to-blue_b dark:bg-gray_m text-white items-center mb-2 px-2">
                <h3 className="w-full p-2 font-medium text-sm">
                  5 Productos más vendidos{" "}
                  {yearlyRankingUnit !== "General" &&
                    `por ${unidadLegible[yearlyRankingUnit]}`}{" "}
                  este año
                </h3>
                <Select
                  placeholder="Seleccionar unidad"
                  noOptionsMessage={() => "Sin opciones"}
                  options={unitOptions}
                  value={
                    rubro === "indumentaria"
                      ? { value: "unidad", label: "unidad" }
                      : { value: yearlyRankingUnit, label: yearlyRankingUnit }
                  }
                  onChange={(selectedOption) => {
                    if (selectedOption && rubro !== "indumentaria") {
                      setYearlyRankingUnit(
                        selectedOption.value as Product["unit"]
                      );
                    }
                  }}
                  isDisabled={rubro === "indumentaria"}
                  className={`react-select-container text-gray_m min-w-40 ${
                    rubro === "indumentaria"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  classNamePrefix="react-select"
                  menuPosition="fixed"
                />
              </div>
              {topProductsYearly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsYearly.map((product, index) => (
                    <div
                      key={index}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="truncate capitalize">
                        <span className="font-bold text-blue_m dark:text-blue_l">
                          {index + 1}- {""}
                        </span>
                        {product.name}
                      </span>
                      <span className="font-medium">
                        {product.displayText}{" "}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray_m dark:text-gray_m">
                  No hay datos de ventas este año
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b">
            <h2 className="text-lg font-semibold mb-4">
              {isCurrentMonth(selectedMonth, selectedYear)
                ? "Ingresos | Egresos - Semana Actual"
                : `Ingresos | Egresos - ${format(
                    new Date(selectedYear, selectedMonth - 1, 1),
                    "MMMM yyyy",
                    { locale: es }
                  )}`}
            </h2>
            <Bar
              data={weeklyBarChartData}
              options={{
                responsive: true,

                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
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
            <h2 className="text-lg font-semibold mt-4 mb-4">
              {isCurrentMonth(selectedMonth, selectedYear)
                ? "Ingresos | Egresos - Mes Actual"
                : `Ingresos | Egresos - ${format(
                    new Date(selectedYear, selectedMonth - 1, 1),
                    "MMMM yyyy",
                    { locale: es }
                  )}`}
            </h2>
            <Bar
              data={monthlyBarChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
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
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b">
            <h2 className="text-lg font-semibold mb-4">
              Ganancia Diaria -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>
            <Line
              data={monthlyProfitLineChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
                          context.raw as number
                        )}`;
                      },
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: false,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b">
            <h2 className="text-lg font-semibold mb-4">
              Ingresos | Egresos - Año {selectedYear}
            </h2>
            <Bar
              data={annualBarChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "top",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        return `${context.dataset.label}: ${formatCurrency(
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
          <div className="bg-white dark:bg-gray_b rounded-xl shadow-md shadow-gray_m p-5 border border-gray_xl dark:border-gray_b">
            <h2 className="text-lg font-semibold mb-4">
              Distribución Mensual -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
            </h2>
            <Pie
              data={summaryPieChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: "right",
                  },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const label = context.label || "";
                        const value = context.raw as number;
                        const total = context.dataset.data.reduce(
                          (a: number, b: number) => a + b,
                          0
                        );
                        const percentage = Math.round((value / total) * 100);
                        return `${label}: ${formatCurrency(
                          value
                        )} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Metrics;
