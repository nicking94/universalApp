"use client";

import ProtectedRoute from "@/app/components/ProtectedRoute";
import { db } from "@/app/database/db";
import { DailyCash } from "@/app/lib/types/types";

import {
  parseISO,
  isSameMonth,
  isSameYear,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  getYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
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
  const [monthlyRankingUnit, setMonthlyRankingUnit] = useState<
    "unidad" | "kg" | "litro"
  >("unidad");
  const [yearlyRankingUnit, setYearlyRankingUnit] = useState<
    "unidad" | "kg" | "litro"
  >("unidad");
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const storedDailyCashes = await db.dailyCashes.toArray();
      setDailyCashes(storedDailyCashes);

      const today = new Date().toISOString().split("T")[0];
      const todayCash = storedDailyCashes.find((dc) => dc.date === today);
      setCurrentDailyCash(todayCash || null);
      const years = new Set<number>();
      storedDailyCashes.forEach((cash) => {
        const date = parseISO(cash.date);
        years.add(getYear(date));
      });
      setAvailableYears(Array.from(years).sort((a, b) => b - a));
    };

    fetchData();
  }, []);

  const unitOptions = [
    { value: "unidad", label: "Unidad" },
    { value: "kg", label: "Kilogramo" },
    { value: "litro", label: "Litro" },
  ];

  const getProductMovements = (
    period: "day" | "month" | "year",
    unit: "unidad" | "kg" | "litro"
  ) => {
    let filteredCashes = dailyCashes;

    if (period === "month") {
      filteredCashes = dailyCashes.filter((cash) => {
        const date = parseISO(cash.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      });
    } else if (period === "year") {
      filteredCashes = dailyCashes.filter((cash) => {
        const date = parseISO(cash.date);
        return isSameYear(date, new Date(selectedYear, 0));
      });
    } else if (period === "day" && currentDailyCash) {
      filteredCashes = [currentDailyCash];
    }

    // Creamos un mapa para agrupar productos por ID (más preciso que por nombre)
    const productMap = new Map<
      number,
      {
        name: string;
        quantity: number;
        amount: number;
        profit: number;
        unit: string;
      }
    >();

    filteredCashes.forEach((cash) => {
      cash.movements.forEach((movement) => {
        if (movement.type === "INGRESO" && movement.items) {
          // Procesamos cada item de la venta individualmente
          movement.items.forEach((item) => {
            const existing = productMap.get(item.productId) || {
              name: item.productName,
              quantity: 0,
              amount: 0,
              profit: 0,
              unit: item.unit || "Unid.",
            };

            // Convertimos las cantidades a la unidad base para comparación
            let quantityToAdd = item.quantity || 0;
            if (item.unit === "gr") {
              quantityToAdd = quantityToAdd / 1000; // Convertir a kg
            } else if (item.unit === "ml") {
              quantityToAdd = quantityToAdd / 1000; // Convertir a litros
            }

            // Calculamos el profit basado en el precio y costo
            const profitPerUnit =
              (item.price || 0) -
              (movement.costPrice || 0) / (movement.quantity || 1);

            productMap.set(item.productId, {
              name: existing.name,
              quantity: existing.quantity + quantityToAdd,
              amount: existing.amount + item.price * item.quantity,
              profit: existing.profit + profitPerUnit * item.quantity,
              unit: existing.unit,
            });
          });
        }
      });
    });

    const allProducts = Array.from(productMap.values())
      .map(({ name, quantity, amount, profit, unit }) => {
        // Convertimos a la unidad más adecuada para mostrar
        let displayQuantity = quantity;
        let displayUnit = unit;

        // Solo convertimos si el usuario seleccionó "kg" o "litro" en el filtro
        if (unit === "kg" && displayUnit === "gr") {
          // Convertimos gramos a kg solo si es 1000g o más
          if (quantity >= 1000) {
            displayQuantity = quantity / 1000;
            displayUnit = "Kg";
          }
        } else if (unit === "litro" && displayUnit === "ml") {
          // Convertimos ml a L solo si es 1000ml o más
          if (quantity >= 1000) {
            displayQuantity = quantity / 1000;
            displayUnit = "L";
          }
        }

        return {
          name,
          quantity,
          displayQuantity, // Cantidad convertida para mostrar
          displayUnit, // Unidad convertida para mostrar
          amount,
          profit,
          originalUnit: unit, // Guardamos la unidad original
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    // Filtramos según la unidad seleccionada
    const filteredProducts = allProducts.filter((product) => {
      if (unit === "unidad") return product.originalUnit === "Unid.";
      if (unit === "kg") return ["Kg", "gr"].includes(product.originalUnit);
      if (unit === "litro") return ["L", "ml"].includes(product.originalUnit);
      return true;
    });

    // Función para formatear la cantidad mostrada
    const formatDisplayQuantity = (qty: number, unit: string) => {
      // Para unidades, sin decimales
      if (unit === "Unid.") return qty.toString();

      // Para gramos/ml, sin decimales
      if (unit === "gr" || unit === "ml") return qty.toString();

      // Para kg/L, máximo 1 decimal
      const rounded = Math.round(qty * 10) / 10;
      return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
    };

    // Retornamos los productos con la cantidad ya formateada
    return filteredProducts.slice(0, 5).map((product) => ({
      ...product,
      displayText: `${formatDisplayQuantity(
        product.displayQuantity,
        product.displayUnit
      )} ${product.displayUnit}`,
    }));
  };

  const getMonthlySummary = () => {
    return dailyCashes
      .filter((cash) => {
        const date = parseISO(cash.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .reduce(
        (acc, cash) => {
          const ingresos = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);

          const egresos = cash.movements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);

          const ganancia = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              if (m.profit !== undefined) return sum + m.profit;
              if (m.costPrice && m.sellPrice && m.quantity) {
                return sum + (m.sellPrice - m.costPrice) * m.quantity;
              }
              return sum;
            }, 0);

          return {
            ingresos: acc.ingresos + ingresos,
            egresos: acc.egresos + egresos,
            ganancia: acc.ganancia + ganancia,
          };
        },
        { ingresos: 0, egresos: 0, ganancia: 0 }
      );
  };
  const getAnnualSummary = () => {
    return dailyCashes
      .filter((cash) => {
        const date = parseISO(cash.date);
        return isSameYear(date, new Date(selectedYear, 0));
      })
      .reduce(
        (acc, cash) => {
          const ingresos = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const egresos = cash.movements
            .filter((m) => m.type === "EGRESO")
            .reduce((sum, m) => sum + m.amount, 0);
          const ganancia = cash.movements
            .filter((m) => m.type === "INGRESO")
            .reduce((sum, m) => {
              if (m.profit !== undefined) {
                return sum + m.profit;
              }
              const costPrice = m.costPrice || 0;
              const sellPrice = m.sellPrice || 0;
              const quantity = m.quantity || 0;
              return sum + (sellPrice - costPrice) * quantity;
            }, 0);

          return {
            ingresos: acc.ingresos + ingresos,
            egresos: acc.egresos + egresos,
            ganancia: acc.ganancia + ganancia,
          };
        },
        { ingresos: 0, egresos: 0, ganancia: 0 }
      );
  };
  const getDailyDataForMonth = () => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return daysInMonth.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dailyCash = dailyCashes.find((dc) => dc.date === dateStr);

      if (dailyCash) {
        const ingresos = dailyCash.movements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0);
        const egresos = dailyCash.movements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0);
        const ganancia = dailyCash.movements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => {
            if (m.profit !== undefined) return sum + m.profit;
            const costPrice = m.costPrice || 0;
            const sellPrice = m.sellPrice || 0;
            const quantity = m.quantity || 0;
            return sum + (sellPrice - costPrice) * quantity;
          }, 0);

        return { date: format(day, "dd"), ingresos, egresos, ganancia };
      }

      return { date: format(day, "dd"), ingresos: 0, egresos: 0, ganancia: 0 };
    });
  };

  const getMonthlyDataForYear = () => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthData = dailyCashes
        .filter((cash) => {
          const date = parseISO(cash.date);
          return isSameMonth(date, new Date(selectedYear, i));
        })
        .reduce(
          (acc, cash) => {
            const ingresos = cash.movements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const egresos = cash.movements
              .filter((m) => m.type === "EGRESO")
              .reduce((sum, m) => sum + m.amount, 0);
            const ganancia = cash.movements
              .filter((m) => m.type === "INGRESO")
              .reduce((sum, m) => {
                if (m.sellPrice && m.costPrice && m.quantity) {
                  return (
                    sum +
                    (Number(m.sellPrice) - Number(m.costPrice)) *
                      Number(m.quantity)
                  );
                }
                return sum;
              }, 0);

            return {
              ingresos: acc.ingresos + ingresos,
              egresos: acc.egresos + egresos,
              ganancia: acc.ganancia + ganancia,
            };
          },
          { ingresos: 0, egresos: 0, ganancia: 0 }
        );

      return {
        month: format(new Date(selectedYear, i, 1), "MMM", { locale: es }),
        ...monthData,
      };
    });
  };
  const monthlySummary = getMonthlySummary();
  const annualSummary = getAnnualSummary();
  const dailyMonthData = getDailyDataForMonth();
  const monthlyYearData = getMonthlyDataForYear();
  const topProductsMonthly = getProductMovements("month", monthlyRankingUnit);
  const topProductsYearly = getProductMovements("year", yearlyRankingUnit);

  const monthlyBarChartData = {
    labels: dailyMonthData.map((data) => data.date),
    datasets: [
      {
        label: "Ingresos",
        data: dailyMonthData.map((data) => data.ingresos),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: dailyMonthData.map((data) => data.egresos),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgba(255, 99, 132, 1)",
        borderWidth: 1,
      },
    ],
  };

  const monthlyProfitLineChartData = {
    labels: dailyMonthData.map((data) => data.date),
    datasets: [
      {
        label: "Ganancia Diaria",
        data: dailyMonthData.map((data) => data.ganancia),
        borderColor: "rgba(153, 102, 255, 1)",
        backgroundColor: "rgba(153, 102, 255, 0.2)",
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
        backgroundColor: "rgba(54, 162, 235, 0.6)",
        borderColor: "rgba(54, 162, 235, 1)",
        borderWidth: 1,
      },
      {
        label: "Egresos",
        data: monthlyYearData.map((data) => data.egresos),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
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
          "rgba(75, 192, 192, 0.6)",
          "rgba(255, 99, 132, 0.6)",
          "rgba(153, 102, 255, 0.6)",
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Métricas</h1>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <label
                htmlFor="month"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Mes:
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(selectedYear, i, 1), "MMMM", {
                      locale: es,
                    })}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="year"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Año:
              </label>
              <select
                id="year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-purple-500 dark:text-purple-300"
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
              Resumen Mensual
            </h2>

            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-100 dark:bg-green-500/30 rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ingresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-100 dark:bg-red-500/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.egresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-500/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(monthlySummary.ganancia)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex bg-gray_l dark:bg-gray_m text-white items-center mb-2 px-2">
                <h3 className="w-full p-2 font-medium text-md ">
                  5 Productos por{" "}
                  {monthlyRankingUnit === "unidad"
                    ? "unidad"
                    : monthlyRankingUnit === "kg"
                    ? "kilogramo"
                    : "litro"}{" "}
                  más vendidos este mes
                </h3>
                <select
                  value={monthlyRankingUnit}
                  onChange={(e) =>
                    setMonthlyRankingUnit(
                      e.target.value as "unidad" | "kg" | "litro"
                    )
                  }
                  className="text-black dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 text-sm"
                >
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {topProductsMonthly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsMonthly.map((product, index) => (
                    <div
                      key={index}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="truncate uppercase">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay datos de ventas este mes
                </p>
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
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
              <div className="flex justify-between items-center p-3 bg-green-100 dark:bg-green-500/30 rounded-lg">
                <span className="text-sm font-medium">Ingresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ingresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-red-100 dark:bg-red-500/30 rounded-lg">
                <span className="text-sm font-medium">Egresos</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.egresos)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-100 dark:bg-purple-500/30 rounded-lg">
                <span className="text-sm font-medium">Ganancia</span>
                <span className="font-bold">
                  {formatCurrency(annualSummary.ganancia)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex bg-gray_l dark:bg-gray_m text-white items-center mb-2 px-2">
                <h3 className="w-full p-2 font-medium text-md ">
                  5 Productos por{" "}
                  {yearlyRankingUnit === "unidad"
                    ? "unidad"
                    : yearlyRankingUnit === "kg"
                    ? "kilogramo"
                    : "litro"}{" "}
                  más vendidos este año
                </h3>
                <select
                  value={yearlyRankingUnit}
                  onChange={(e) =>
                    setYearlyRankingUnit(
                      e.target.value as "unidad" | "kg" | "litro"
                    )
                  }
                  className="text-black dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1 text-sm"
                >
                  {unitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {topProductsYearly.length > 0 ? (
                <div className="space-y-2">
                  {topProductsYearly.map((product, index) => (
                    <div
                      key={index}
                      className="py-2 flex justify-between items-center text-sm"
                    >
                      <span className="truncate uppercase">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay datos de ventas este año
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold mb-4">
              Ingresos | Egresos -{" "}
              {format(
                new Date(selectedYear, selectedMonth - 1, 1),
                "MMMM yyyy",
                { locale: es }
              )}
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-5 border border-gray-100 dark:border-gray-700">
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
