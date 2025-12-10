"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  Expense,
  ExpenseFilter,
  Product,
  ProductFilter,
  Rubro,
  SortConfig,
  UnifiedFilter,
} from "../lib/types/types";
import { Box, Stack, useTheme } from "@mui/material";
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import Select, { SelectOption } from "./Select";
import Button from "./Button";
import Modal from "./Modal";
import CustomChip from "./CustomChip";

interface AdvancedFilterPanelProps<T> {
  data?: T[];
  onApplyFilters: (filters: UnifiedFilter[]) => void;
  onApplySort: (sort: { field: keyof T; direction: "asc" | "desc" }) => void;
  rubro: Rubro;
  isExpense?: boolean;
}

const AdvancedFilterPanel = <T extends Product | Expense>({
  data = [],
  onApplyFilters,
  onApplySort,
  rubro,
  isExpense = false,
}: AdvancedFilterPanelProps<T>) => {
  const [selectedExpenseType, setSelectedExpenseType] = useState<string>("");
  const [selectedExpenseCategory, setSelectedExpenseCategory] =
    useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColors, setSelectedColors] = useState<string>("");
  const [selectedSeason, setSelectedSeason] = useState<string>("");
  const [selectedBrands, setSelectedBrands] = useState<string>("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>("");
  const [prevRubro, setPrevRubro] = useState<Rubro>(rubro);
  const theme = useTheme();

  const expenseTypeOptions: SelectOption<string>[] = [
    { value: "EGRESO", label: "Egreso" },
    { value: "INGRESO", label: "Ingreso" },
  ];

  const paymentMethodOptions: SelectOption<string>[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const expenseCategoryOptions: SelectOption<string>[] = useMemo(() => {
    if (!isExpense) return [];

    const filteredData = (data as Expense[]).filter((expense) => {
      if (rubro === "Todos los rubros") return true;

      return expense.rubro === rubro;
    });

    return Array.from(
      new Set(
        filteredData
          .map((e) => e.category)
          .filter((category): category is string => !!category)
      )
    ).map((category) => ({
      value: category,
      label: category,
    }));
  }, [data, isExpense, rubro]);

  const clearAllFilters = () => {
    if (isExpense) {
      setSelectedExpenseType("");
      setSelectedExpenseCategory("");
      setSelectedPaymentMethod("");
    } else {
      setSelectedCategory("");
      setSelectedSize("");
      setSelectedColors("");
      setSelectedSeason("");
      setSelectedBrands("");
    }
    setSelectedSort("");
    onApplyFilters([]);
    onApplySort({ field: "name" as keyof T, direction: "asc" });
  };

  useEffect(() => {
    if (rubro !== prevRubro) {
      clearAllFilters();
      setPrevRubro(rubro);
    }
  }, [rubro, prevRubro]);

  useEffect(() => {
    if (isExpense) {
      const newFilters: ExpenseFilter[] = [];
      if (selectedExpenseType) {
        newFilters.push({
          field: "type",
          value: selectedExpenseType,
        });
      }
      if (selectedExpenseCategory) {
        newFilters.push({
          field: "category",
          value: selectedExpenseCategory,
        });
      }
      if (selectedPaymentMethod) {
        newFilters.push({
          field: "paymentMethod",
          value: selectedPaymentMethod,
        });
      }
      onApplyFilters(newFilters);
    } else {
      const newFilters: ProductFilter[] = [];
      if (selectedCategory) {
        newFilters.push({
          field: "customCategories",
          value: selectedCategory,
        });
      }
      if (selectedSeason) {
        newFilters.push({
          field: "season",
          value: selectedSeason,
        });
      }
      if (rubro === "indumentaria") {
        if (selectedSize) {
          newFilters.push({
            field: "size",
            value: selectedSize,
          });
        }
        if (selectedColors) {
          newFilters.push({
            field: "color",
            value: selectedColors,
          });
        }
        if (selectedBrands) {
          newFilters.push({
            field: "brand",
            value: selectedBrands,
          });
        }
      }
      onApplyFilters(newFilters);
    }
  }, [
    isExpense,
    selectedExpenseType,
    selectedExpenseCategory,
    selectedPaymentMethod,
    selectedCategory,
    selectedSize,
    selectedColors,
    selectedSeason,
    selectedBrands,
    rubro,
    onApplyFilters,
  ]);

  const getUniqueValues = (field: keyof Product): SelectOption<string>[] => {
    if (isExpense) return [];

    const uniqueValues = Array.from(
      new Set(
        (data as Product[])
          .filter(
            (p) =>
              (rubro === "Todos los rubros" ? true : p.rubro === rubro) &&
              p[field] !== undefined &&
              p[field] !== null &&
              String(p[field]).trim() !== ""
          )
          .map((p) => String(p[field]).trim())
      )
    ).sort((a, b) => a.localeCompare(b));

    return uniqueValues.map((value: string) => ({
      value: value,
      label: value,
    }));
  };

  const categoryOptions: SelectOption<string>[] = useMemo(() => {
    if (isExpense) return [];

    return (data as Product[])
      .filter((p) => {
        if (rubro === "Todos los rubros") {
          return true;
        }
        return p.rubro === rubro;
      })
      .flatMap((p) => {
        if (
          p.customCategories &&
          p.customCategories.length > 0 &&
          p.customCategories[0].name
        ) {
          return [
            {
              value: p.customCategories[0].name,
              label: p.customCategories[0].name,
            },
          ];
        } else if (p.category) {
          return [
            {
              value: p.category,
              label: `${p.category}`,
            },
          ];
        }
        return [];
      })
      .filter(
        (cat, index, self) =>
          index ===
          self.findIndex(
            (c) => c.value.toLowerCase() === cat.value.toLowerCase()
          )
      )
      .sort((a, b) => a.value.localeCompare(b.value));
  }, [data, rubro, isExpense]);

  const sizeOptions: SelectOption<string>[] = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("size") : [],
    [rubro, isExpense, data]
  );

  const colorOptions: SelectOption<string>[] = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("color") : [],
    [rubro, isExpense, data]
  );

  const brandOptions: SelectOption<string>[] = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("brand") : [],
    [rubro, isExpense, data]
  );

  const seasonOptionsDynamic: SelectOption<string>[] = useMemo(
    () => (!isExpense ? getUniqueValues("season") : []),
    [rubro, isExpense, data]
  );

  const sortOptions: SelectOption<string>[] = useMemo(
    () =>
      isExpense
        ? [
            {
              value: "amount-asc",
              label: "Monto (Menor a Mayor)",
            },
            {
              value: "amount-desc",
              label: "Monto (Mayor a Menor)",
            },
            {
              value: "date-desc",
              label: "Fecha (Más reciente)",
            },
            {
              value: "date-asc",
              label: "Fecha (Más antigua)",
            },
          ]
        : [
            {
              value: "name-asc",
              label: "Nombre (A-Z)",
            },
            {
              value: "name-desc",
              label: "Nombre (Z-A)",
            },
            {
              value: "price-asc",
              label: "Precio (Menor a Mayor)",
            },
            {
              value: "price-desc",
              label: "Precio (Mayor a Menor)",
            },
            {
              value: "stock-desc",
              label: "Mayor stock primero",
            },
            {
              value: "stock-asc",
              label: "Menor stock primero",
            },
          ],
    [isExpense]
  );

  const sortConfigMap: Record<string, SortConfig<T>> = useMemo(
    () => ({
      "amount-asc": { field: "amount" as keyof T, direction: "asc" },
      "amount-desc": { field: "amount" as keyof T, direction: "desc" },
      "date-desc": { field: "date" as keyof T, direction: "desc" },
      "date-asc": { field: "date" as keyof T, direction: "asc" },
      "name-asc": { field: "name" as keyof T, direction: "asc" },
      "name-desc": { field: "name" as keyof T, direction: "desc" },
      "price-asc": { field: "price" as keyof T, direction: "asc" },
      "price-desc": { field: "price" as keyof T, direction: "desc" },
      "stock-desc": { field: "stock" as keyof T, direction: "desc" },
      "stock-asc": { field: "stock" as keyof T, direction: "asc" },
    }),
    []
  );

  const handleSortChange = (value: string) => {
    setSelectedSort(value);
    const config = sortConfigMap[value];
    if (config) {
      onApplySort(config);
    }
  };

  const handleSelectChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (value: string) => {
      setter(value);
    };

  const renderFilters = () => {
    if (isExpense) {
      return (
        <>
          <Select<string>
            label="Tipo"
            options={expenseTypeOptions}
            value={selectedExpenseType}
            onChange={handleSelectChange(setSelectedExpenseType)}
            fullWidth
            size="small"
          />

          <Select<string>
            label="Categoría"
            options={expenseCategoryOptions}
            value={selectedExpenseCategory}
            onChange={handleSelectChange(setSelectedExpenseCategory)}
            fullWidth
            size="small"
          />

          <Select<string>
            label="Método de Pago"
            options={paymentMethodOptions}
            value={selectedPaymentMethod}
            onChange={handleSelectChange(setSelectedPaymentMethod)}
            fullWidth
            size="small"
          />
        </>
      );
    } else {
      return (
        <>
          <Select<string>
            label="Categorías"
            options={categoryOptions}
            value={selectedCategory}
            onChange={handleSelectChange(setSelectedCategory)}
            fullWidth
            size="small"
          />

          <Select<string>
            label="Temporadas"
            options={seasonOptionsDynamic}
            value={selectedSeason}
            onChange={handleSelectChange(setSelectedSeason)}
            fullWidth
            size="small"
          />

          {rubro === "indumentaria" && (
            <>
              <Select<string>
                label="Talles"
                options={sizeOptions}
                value={selectedSize}
                onChange={handleSelectChange(setSelectedSize)}
                fullWidth
                size="small"
              />

              <Select<string>
                label="Colores"
                options={colorOptions}
                value={selectedColors}
                onChange={handleSelectChange(setSelectedColors)}
                fullWidth
                size="small"
              />

              <Select<string>
                label="Marcas"
                options={brandOptions}
                value={selectedBrands}
                onChange={handleSelectChange(setSelectedBrands)}
                fullWidth
                size="small"
              />
            </>
          )}
        </>
      );
    }
  };

  const getActiveFiltersCount = () => {
    if (isExpense) {
      return [
        selectedExpenseType,
        selectedExpenseCategory,
        selectedPaymentMethod,
      ].filter(Boolean).length;
    } else {
      const baseFilters = [selectedCategory, selectedSeason].filter(
        Boolean
      ).length;
      const clothingFilters =
        rubro === "indumentaria"
          ? [selectedSize, selectedColors, selectedBrands].filter(Boolean)
              .length
          : 0;
      return baseFilters + clothingFilters;
    }
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Box sx={{ width: "100%" }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Select<string>
          label="Ordenar por"
          options={sortOptions}
          value={selectedSort}
          onChange={handleSortChange}
          fullWidth={false}
          sx={{ minWidth: 200 }}
        />

        {rubro !== "Todos los rubros" && (
          <Box sx={{ position: "relative" }}>
            <Button
              text="Filtros"
              icon={<FilterIcon />}
              iconPosition="left"
              onClick={() => setIsFiltersOpen(true)}
              variant="contained"
              size="small"
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            />
            {activeFiltersCount > 0 && (
              <CustomChip
                label={activeFiltersCount.toString()}
                size="small"
                sx={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  minWidth: 20,
                  height: 20,
                  fontSize: "0.75rem",
                  backgroundColor: theme.palette.error.main,
                  color: theme.palette.error.contrastText,
                }}
              />
            )}
          </Box>
        )}
      </Stack>

      <Modal
        isOpen={isFiltersOpen}
        title="Filtrar Por"
        onClose={() => setIsFiltersOpen(false)}
        buttons={
          <>
            <Button
              text="Limpiar Filtros"
              icon={<ClearIcon />}
              iconPosition="left"
              onClick={clearAllFilters}
              variant="text"
              size="small"
              sx={{
                color: theme.palette.text.secondary,
                borderColor: theme.palette.divider,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  borderColor: theme.palette.text.secondary,
                },
              }}
            />
            <Button
              text="Aplicar Filtros"
              onClick={() => setIsFiltersOpen(false)}
              variant="contained"
              size="small"
              isPrimaryAction={true}
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            />
          </>
        }
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md:
                isExpense || rubro !== "indumentaria"
                  ? "repeat(2, 1fr)"
                  : "repeat(3, 1fr)",
            },
            gap: 2,
            mt: 1,
          }}
        >
          {renderFilters()}
        </Box>
      </Modal>
    </Box>
  );
};

export default AdvancedFilterPanel;
