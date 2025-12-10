"use client";
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
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieLabelRenderProps,
} from "recharts";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  useTheme,
  useMediaQuery,
  Paper,
  LinearProgress,
  Tabs,
  Tab,
  alpha,
} from "@mui/material";
import {
  TrendingUp,
  TrendingDown,
  MonetizationOn,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart,
  Inventory,
  CalendarToday,
  DateRange,
  Analytics,
} from "@mui/icons-material";
import { formatCurrency } from "@/app/lib/utils/currency";
import Select, { SelectOption } from "@/app/components/Select";
import {
  DailyCash,
  DailyCashMovement,
  Product,
  Rubro,
} from "@/app/lib/types/types";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { calculatePrice, calculateProfit } from "@/app/lib/utils/calculations";
import { db } from "@/app/database/db";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Notification from "@/app/components/Notification";
import CustomChip from "@/app/components/CustomChip";

const WEEK_STARTS_ON = 1;

interface ChartDataItem {
  name: string;
  ingresos: number;
  egresos: number;
  ganancia: number;
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
  payload?: ChartDataItem;
  dataKey?: string;
}

interface PieTooltipPayloadItem {
  name: string;
  value: number;
  payload: {
    name: string;
    value: number;
    fill: string;
  };
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

interface CustomPieTooltipProps {
  active?: boolean;
  payload?: PieTooltipPayloadItem[];
}

interface MetricCardProps {
  title: string;
  value: number;
  type: "ingresos" | "egresos" | "ganancia";
  icon: React.ReactNode;
  trend?: number;
  period: "week" | "month" | "year";
  delay?: number;
}

const MetricCard = ({
  title,
  value,
  type,
  icon,
  trend,
  period,
}: MetricCardProps) => {
  const theme = useTheme();

  const getColor = () => {
    switch (type) {
      case "ingresos":
        return theme.palette.success.main;
      case "egresos":
        return theme.palette.error.main;
      case "ganancia":
        return theme.palette.primary.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "ingresos":
        return alpha(theme.palette.success.main, 0.1);
      case "egresos":
        return alpha(theme.palette.error.main, 0.1);
      case "ganancia":
        return alpha(theme.palette.primary.main, 0.1);
      default:
        return alpha(theme.palette.primary.main, 0.1);
    }
  };

  return (
    <Card
      elevation={2}
      sx={{
        height: "100%",
        transition: "all 0.3s ease",
        background: `linear-gradient(135deg, ${getBackgroundColor()} 0%, ${alpha(
          getBackgroundColor(),
          0.5
        )} 100%)`,
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: theme.shadows[8],
        },
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `${getColor()}`,
        },
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box
            sx={{
              p: 1.5,
              borderRadius: 3,
              backgroundColor: getBackgroundColor(),
              color: getColor(),
              border: `2px solid ${alpha(getColor(), 0.3)}`,
            }}
          >
            {icon}
          </Box>
          <Stack alignItems="flex-end" spacing={0.5}>
            {trend !== undefined && (
              <CustomChip
                label={`${trend > 0 ? "+" : ""}${trend}%`}
                size="small"
                color={trend > 0 ? "success" : trend < 0 ? "error" : "default"}
                variant="filled"
                sx={{
                  fontWeight: "bold",
                  fontSize: "0.75rem",
                }}
              />
            )}
            <CustomChip
              label={
                period === "week" ? "SEM" : period === "month" ? "MES" : "AÑO"
              }
              size="small"
              variant="outlined"
              sx={{
                fontSize: "0.7rem",

                color: theme.palette.background.paper,
                backgroundColor: theme.palette.primary.main,
              }}
            />
          </Stack>
        </Stack>

        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          color={getColor()}
          sx={{
            textShadow: `0 2px 4px ${alpha(getColor(), 0.2)}`,
          }}
        >
          {formatCurrency(value)}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

interface ProductRankingProps {
  title: string;
  products: Array<{
    name: string;
    quantity: number;
    amount: number;
    profit: number;
    unit: string;
    rubro: Rubro;
    displayText: string;
  }>;
  unit: Product["unit"] | "General";
  onUnitChange: (unit: Product["unit"] | "General") => void;
  unidadLegible: Record<Product["unit"] | "General", string>;
  rubro: Rubro;
  period: "week" | "month" | "year";
}

const ProductRanking = ({
  title,
  products,
  unit,
  onUnitChange,
  unidadLegible,
  rubro,
}: ProductRankingProps) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const unitOptions: SelectOption[] = [
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

  return (
    <Card
      elevation={2}
      sx={{
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: theme.shadows[4],
        },
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardContent
        sx={{
          p: 0,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            background: theme.palette.primary.main,
            color: "white",
            p: 2,
            flexShrink: 0,
            flexWrap: isMobile ? "wrap" : "nowrap",
          }}
        >
          <Typography
            variant="h6"
            sx={{
              flex: 1,
              fontWeight: "bold",
              minWidth: 0,
              mr: isMobile ? 0 : 2,
              mb: isMobile ? 1 : 0,
              textAlign: isMobile ? "center" : "left",
              width: isMobile ? "100%" : "auto",
            }}
          >
            {title}
            {unit !== "General" && ` por ${unidadLegible[unit]}`}
          </Typography>

          {/* Selector siempre alineado a la derecha */}
          <Select
            label="Unidad"
            options={unitOptions}
            value={rubro === "indumentaria" ? "Unid." : unit}
            onChange={(value) =>
              onUnitChange(value as Product["unit"] | "General")
            }
            disabled={rubro === "indumentaria"}
            sx={{
              backgroundColor: "white",
              borderRadius: 1,
              minWidth: isMobile ? "100%" : 120,
              maxWidth: isMobile ? "100%" : 150,
              alignSelf: isMobile ? "stretch" : "auto",
            }}
          />
        </Stack>

        {/* Contenedor scrollable para los productos */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            px: 2,
            pb: 2,
          }}
        >
          {products.length > 0 ? (
            <Stack spacing={1}>
              {products.map((product, index) => (
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: theme.palette.action.hover,
                      transform: "translateX(4px)",
                    },
                  }}
                  key={index}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: theme.palette.primary.main,
                        color: "white",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: "0.875rem",
                      }}
                    >
                      {index + 1}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {product.name}
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{ mt: 0.5 }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {product.displayText}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="success.main"
                          fontWeight="bold"
                        >
                          {formatCurrency(product.amount)}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Box textAlign="center" py={4}>
              <Inventory sx={{ fontSize: 48, color: "text.disabled", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No hay datos de ventas
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  const theme = useTheme();

  if (active && payload && payload.length) {
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        <Typography
          variant="body2"
          fontWeight="bold"
          gutterBottom
          color="primary.main"
        >
          {label}
        </Typography>
        {payload.map((entry, index) => (
          <Typography
            key={index}
            variant="body2"
            sx={{ color: entry.color, fontWeight: 500 }}
          >
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Paper>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: CustomPieTooltipProps) => {
  const theme = useTheme();

  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <Paper
        elevation={8}
        sx={{
          p: 2,
          backgroundColor: theme.palette.background.paper,
          border: `2px solid ${data.color}`,
        }}
      >
        <Typography
          variant="body2"
          fontWeight="bold"
          gutterBottom
          sx={{ color: data.color }}
        >
          {data.name}
        </Typography>
        <Typography variant="body2" sx={{ color: data.color, fontWeight: 500 }}>
          {formatCurrency(data.value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

const renderPieLabel = (props: PieLabelRenderProps) => {
  const { name, percent } = props;
  if (percent === undefined || name === undefined) return null;
  return `${name} (${(percent * 100).toFixed(0)}%)`;
};

const Metrics = () => {
  const { rubro } = useRubro();
  const theme = useTheme();

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
  const [loading, setLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<"week" | "month" | "year">(
    "week"
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
  };

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

  const chartColors = {
    ingresos: theme.palette.success.main,
    egresos: theme.palette.error.main,
    ganancia: theme.palette.primary.main,
    grid: theme.palette.divider,
    text: theme.palette.text.primary,
  };

  const filterByRubro = (
    movement: DailyCashMovement,
    currentRubro: Rubro
  ): boolean => {
    if (currentRubro === "Todos los rubros") return true;
    if (movement.fromBudget || movement.budgetId) {
      return movement.rubro === currentRubro;
    }
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

      if (period === "week") {
        const weekStart = startOfWeek(today, { weekStartsOn: WEEK_STARTS_ON });
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
    () =>
      (period: "week" | "month" | "year"): ChartDataItem[] => {
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
                name: format(day, "dd"),
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
              name: format(day, "dd"),
              ingresos,
              egresos,
              ganancia,
            };
          });
        } else if (period === "week") {
          const weekStart = startOfWeek(new Date(), {
            weekStartsOn: WEEK_STARTS_ON,
          });
          const weekEnd = endOfWeek(new Date(), {
            weekStartsOn: WEEK_STARTS_ON,
          });

          const daysInWeek = eachDayOfInterval({
            start: weekStart,
            end: weekEnd,
          });

          return daysInWeek.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const dailyCash = dailyCashes.find((dc) => dc.date === dateStr);
            if (!dailyCash)
              return {
                name: format(day, "EEE", { locale: es }),
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
              name: format(day, "EEE", { locale: es }),
              ingresos,
              egresos,
              ganancia,
            };
          });
        } else {
          const currentYear = selectedYear;
          const monthlyData = Array.from({ length: 12 }, (_, i) => {
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
              name: format(new Date(currentYear, i, 1), "MMM", { locale: es }),
              ...summary,
            };
          });

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
            const lastDayOfMonth = endOfMonth(selectedDate);
            weekStart = startOfWeek(lastDayOfMonth, {
              weekStartsOn: WEEK_STARTS_ON,
            });
            weekEnd = endOfWeek(lastDayOfMonth, {
              weekStartsOn: WEEK_STARTS_ON,
            });
          } else {
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
        if (!userChangedMonth) {
          setSelectedMonth(currentMonth);
          setSelectedYear(currentYear);
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
      setLoading(true);
      try {
        const [storedDailyCashes, storedProducts] = await Promise.all([
          db.dailyCashes.toArray(),
          db.products.toArray(),
        ]);

        const sortedCashes = storedDailyCashes.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        setDailyCashes(sortedCashes);
        setProducts(storedProducts);

        const years = new Set<number>();
        storedDailyCashes.forEach((cash) => {
          const date = parseISO(cash.date);
          years.add(getYear(date));
        });
        setAvailableYears(Array.from(years).sort((a, b) => b - a));
      } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("Error al cargar los datos", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const intervalId = setInterval(fetchData, 300000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (rubro === "indumentaria") {
      setMonthlyRankingUnit("Unid.");
      setYearlyRankingUnit("Unid.");
      setWeeklyRankingUnit("Unid.");
    }
  }, [rubro]);

  const weeklySummary = getConsistentSummary("week");
  const monthlySummary = getConsistentSummary("month");
  const annualSummary = getConsistentSummary("year");
  const weeklyChartData = getChartData("week");
  const monthlyChartData = getChartData("month");
  const annualChartData = getChartData("year");
  const topProductsWeekly = getProductMovements("week", weeklyRankingUnit);
  const topProductsMonthly = getProductMovements("month", monthlyRankingUnit);
  const topProductsYearly = getProductMovements("year", yearlyRankingUnit);
  const getPieChartData = (period: "week" | "month" | "year") => {
    const summary =
      period === "week"
        ? weeklySummary
        : period === "month"
        ? monthlySummary
        : annualSummary;
    return [
      {
        name: "Ingresos",
        value: summary.ingresos,
        fill: chartColors.ingresos,
      },
      {
        name: "Egresos",
        value: summary.egresos,
        fill: chartColors.egresos,
      },
      {
        name: "Ganancia",
        value: summary.ganancia,
        fill: chartColors.ganancia,
      },
    ];
  };

  const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: format(new Date(selectedYear, i, 1), "MMMM", { locale: es }),
  }));

  const yearOptions: SelectOption[] = availableYears.map((year) => ({
    value: year,
    label: year.toString(),
  }));

  if (loading) {
    return (
      <ProtectedRoute>
        <Box sx={{ px: 3 }}>
          <LinearProgress />
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 2,
          py: 2,
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          color: "text.primary",
          overflow: "auto",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 2,
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography variant="h5" fontWeight="semibold" gutterBottom>
              Métricas
            </Typography>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <Select
              label="Mes"
              options={monthOptions}
              value={selectedMonth}
              onChange={(value) => {
                setUserChangedMonth(true);
                setSelectedMonth(value as number);
              }}
              sx={{ minWidth: 120 }}
            />

            <Select
              label="Año"
              options={yearOptions}
              value={selectedYear}
              onChange={(value) => setSelectedYear(value as number)}
              sx={{ minWidth: 120 }}
            />
          </Box>
        </Box>

        {/* Selector de Período - Estilo coherente */}
        <Card sx={{ mb: 3 }} elevation={2}>
          <CardContent sx={{ py: 2 }}>
            <Tabs
              value={activePeriod}
              onChange={(_, newValue) => setActivePeriod(newValue)}
              centered
              sx={{
                "& .MuiTab-root": {
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  minWidth: 100,
                  textTransform: "none",
                },
                "& .Mui-selected": {
                  color: "primary.main",
                },
              }}
            >
              <Tab
                icon={<CalendarToday />}
                iconPosition="start"
                label="Semanal"
                value="week"
              />
              <Tab
                icon={<DateRange />}
                iconPosition="start"
                label="Mensual"
                value="month"
              />
              <Tab
                icon={<Analytics />}
                iconPosition="start"
                label="Anual"
                value="year"
              />
            </Tabs>
          </CardContent>
        </Card>

        {/* Resumen de Métricas para el período activo - Estilo coherente */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            mb: 3,
            flexShrink: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MetricCard
              title="Ingresos Totales"
              value={
                activePeriod === "week"
                  ? weeklySummary.ingresos
                  : activePeriod === "month"
                  ? monthlySummary.ingresos
                  : annualSummary.ingresos
              }
              type="ingresos"
              icon={<TrendingUp />}
              period={activePeriod}
              delay={0}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MetricCard
              title="Egresos Totales"
              value={
                activePeriod === "week"
                  ? weeklySummary.egresos
                  : activePeriod === "month"
                  ? monthlySummary.egresos
                  : annualSummary.egresos
              }
              type="egresos"
              icon={<TrendingDown />}
              period={activePeriod}
              delay={100}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <MetricCard
              title="Ganancia Neta"
              value={
                activePeriod === "week"
                  ? weeklySummary.ganancia
                  : activePeriod === "month"
                  ? monthlySummary.ganancia
                  : annualSummary.ganancia
              }
              type="ganancia"
              icon={<MonetizationOn />}
              period={activePeriod}
              delay={200}
            />
          </Box>
        </Box>

        {/* contenedor scrollable main */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", lg: "row" },
            gap: 2,
            flex: 1,
            minHeight: 0,
          }}
        >
          <Box
            sx={{
              width: { xs: "100%", lg: "32.73%" },
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <ProductRanking
                title={`Top 5 Productos - ${
                  activePeriod === "week"
                    ? "Semana"
                    : activePeriod === "month"
                    ? "Mes"
                    : "Año"
                }`}
                products={
                  activePeriod === "week"
                    ? topProductsWeekly
                    : activePeriod === "month"
                    ? topProductsMonthly
                    : topProductsYearly
                }
                unit={
                  activePeriod === "week"
                    ? weeklyRankingUnit
                    : activePeriod === "month"
                    ? monthlyRankingUnit
                    : yearlyRankingUnit
                }
                onUnitChange={
                  activePeriod === "week"
                    ? setWeeklyRankingUnit
                    : activePeriod === "month"
                    ? setMonthlyRankingUnit
                    : setYearlyRankingUnit
                }
                unidadLegible={unidadLegible}
                rubro={rubro}
                period={activePeriod}
              />
            </Box>
          </Box>

          {/* Gráficos - Contenido Principal */}
          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Gráfico de Barras */}
            <Card elevation={2}>
              <CardContent>
                <Typography
                  variant="h6"
                  gutterBottom
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontWeight: "semibold",
                  }}
                >
                  <BarChartIcon sx={{ mr: 1, color: "primary.main" }} />
                  {activePeriod === "week"
                    ? "Ingresos vs Egresos - Semana Actual"
                    : activePeriod === "month"
                    ? `Ingresos vs Egresos - ${format(
                        new Date(selectedYear, selectedMonth - 1, 1),
                        "MMMM",
                        { locale: es }
                      )}`
                    : "Ingresos vs Egresos - Año Completo"}
                </Typography>
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        activePeriod === "week"
                          ? weeklyChartData
                          : activePeriod === "month"
                          ? monthlyChartData
                          : annualChartData
                      }
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={chartColors.grid}
                      />
                      <XAxis
                        dataKey="name"
                        stroke={chartColors.text}
                        fontSize={12}
                      />
                      <YAxis
                        stroke={chartColors.text}
                        fontSize={12}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar
                        dataKey="ingresos"
                        fill={chartColors.ingresos}
                        name="Ingresos"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="egresos"
                        fill={chartColors.egresos}
                        name="Egresos"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </CardContent>
            </Card>

            {/* Gráficos Inferiores */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Gráfico de Línea */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: "semibold",
                      }}
                    >
                      <ShowChart sx={{ mr: 1, color: "primary.main" }} />
                      {activePeriod === "week"
                        ? "Ganancia Diaria - Semana"
                        : activePeriod === "month"
                        ? `Ganancia Diaria - ${format(
                            new Date(selectedYear, selectedMonth - 1, 1),
                            "MMMM",
                            { locale: es }
                          )}`
                        : "Ganancia Mensual - Año"}
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={
                            activePeriod === "week"
                              ? weeklyChartData
                              : activePeriod === "month"
                              ? monthlyChartData
                              : annualChartData
                          }
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={chartColors.grid}
                          />
                          <XAxis
                            dataKey="name"
                            stroke={chartColors.text}
                            fontSize={11}
                          />
                          <YAxis
                            stroke={chartColors.text}
                            fontSize={11}
                            tickFormatter={(value) => formatCurrency(value)}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="ganancia"
                            stroke={chartColors.ganancia}
                            strokeWidth={3}
                            dot={{
                              fill: chartColors.ganancia,
                              strokeWidth: 2,
                              r: 4,
                            }}
                            activeDot={{
                              r: 6,
                              stroke: chartColors.ganancia,
                              strokeWidth: 2,
                            }}
                            name="Ganancia"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Gráfico de Pie */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Card elevation={2}>
                  <CardContent>
                    <Typography
                      variant="h6"
                      gutterBottom
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        fontWeight: "semibold",
                      }}
                    >
                      <PieChartIcon sx={{ mr: 1, color: "primary.main" }} />
                      {activePeriod === "week"
                        ? "Distribución Semanal"
                        : activePeriod === "month"
                        ? "Distribución Mensual"
                        : "Distribución Anual"}
                    </Typography>
                    <Box sx={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData(activePeriod)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderPieLabel}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getPieChartData(activePeriod).map(
                              (entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              )
                            )}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Notification */}
        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={() => setIsNotificationOpen(false)}
          autoHideDuration={3000}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default Metrics;
