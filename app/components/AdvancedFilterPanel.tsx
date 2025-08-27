"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import {
  CategoryOption,
  Expense,
  ExpenseFilter,
  Product,
  ProductFilter,
  Rubro,
  SortConfig,
  UnifiedFilter,
} from "../lib/types/types";
import Button from "./Button";
import { FaFilter, FaTimes } from "react-icons/fa";

interface SortOption<T> {
  value: SortConfig<T>;
  label: string;
}

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
  const [selectedExpenseType, setSelectedExpenseType] =
    useState<CategoryOption | null>(null);
  const [selectedExpenseCategory, setSelectedExpenseCategory] =
    useState<CategoryOption | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CategoryOption | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryOption | null>(null);
  const [selectedSize, setSelectedSize] = useState<CategoryOption | null>(null);
  const [selectedColors, setSelectedColors] = useState<CategoryOption | null>(
    null
  );
  const [selectedSeason, setSelectedSeason] = useState<CategoryOption | null>(
    null
  );
  const [selectedBrands, setSelectedBrands] = useState<CategoryOption | null>(
    null
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption<T> | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [prevRubro, setPrevRubro] = useState<Rubro>(rubro);

  const expenseTypeOptions = [
    { value: { name: "EGRESO", rubro }, label: "Egreso" },
    { value: { name: "INGRESO", rubro }, label: "Ingreso" },
  ];

  const paymentMethodOptions = [
    { value: { name: "EFECTIVO", rubro }, label: "Efectivo" },
    { value: { name: "TRANSFERENCIA", rubro }, label: "Transferencia" },
    { value: { name: "TARJETA", rubro }, label: "Tarjeta" },
  ];

  const expenseCategoryOptions = useMemo(() => {
    if (!isExpense) return [];
    return Array.from(
      new Set(
        (data as Expense[])
          .map((e) => e.category)
          .filter((category): category is string => !!category)
      )
    ).map((category) => ({
      value: { name: category, rubro },
      label: category,
    }));
  }, [data, rubro, isExpense]);

  const clearAllFilters = () => {
    if (isExpense) {
      setSelectedExpenseType(null);
      setSelectedExpenseCategory(null);
      setSelectedPaymentMethod(null);
    } else {
      setSelectedCategory(null);
      setSelectedSize(null);
      setSelectedColors(null);
      setSelectedSeason(null);
      setSelectedBrands(null);
    }
    setSelectedSort(null);
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
          value: selectedExpenseType.value.name,
        });
      }
      if (selectedExpenseCategory) {
        newFilters.push({
          field: "category",
          value: selectedExpenseCategory.value.name,
        });
      }
      if (selectedPaymentMethod) {
        newFilters.push({
          field: "paymentMethod",
          value: selectedPaymentMethod.value.name,
        });
      }
      onApplyFilters(newFilters);
    } else {
      const newFilters: ProductFilter[] = [];
      if (selectedCategory) {
        newFilters.push({
          field: "customCategories",
          value: selectedCategory.value.name,
        });
      }
      if (selectedSeason) {
        newFilters.push({
          field: "season",
          value: selectedSeason.value.name,
        });
      }
      if (rubro === "indumentaria") {
        if (selectedSize) {
          newFilters.push({
            field: "size",
            value: selectedSize.value.name,
          });
        }
        if (selectedColors) {
          newFilters.push({
            field: "color",
            value: selectedColors.value.name,
          });
        }
        if (selectedBrands) {
          newFilters.push({
            field: "brand",
            value: selectedBrands.value.name,
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isReactSelectElement = (event.target as Element)?.closest(
        ".react-select-container, .react-select__control, .react-select__menu, .react-select__option, .react-select__dropdown-indicator, .react-select__clear-indicator"
      );

      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isReactSelectElement
      ) {
        setIsFiltersOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const getUniqueValues = (field: keyof Product): CategoryOption[] => {
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
          .map((p) => String(p[field]).trim()) // Limpiar espacios
      )
    ).sort((a, b) => a.localeCompare(b));

    return uniqueValues.map((value: string) => ({
      value: {
        name: value,
        rubro: rubro,
      },
      label: value,
    }));
  };

  const categoryOptions = useMemo(() => {
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
              value: {
                name: p.customCategories[0].name,
                rubro: p.customCategories[0].rubro || p.rubro || rubro,
              },
              label: p.customCategories[0].name,
            },
          ];
        } else if (p.category) {
          return [
            {
              value: {
                name: p.category,
                rubro: p.rubro || rubro,
              },
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
            (c) =>
              c.value.name.toLowerCase() === cat.value.name.toLowerCase() &&
              c.value.rubro === cat.value.rubro
          )
      )
      .sort((a, b) => a.value.name.localeCompare(b.value.name));
  }, [data, rubro, isExpense]);

  const sizeOptions = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("size") : [],
    [rubro, isExpense, data]
  );

  const colorOptions = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("color") : [],
    [rubro, isExpense, data]
  );

  const brandOptions = useMemo(
    () =>
      rubro === "indumentaria" && !isExpense ? getUniqueValues("brand") : [],
    [rubro, isExpense, data]
  );

  const seasonOptionsDynamic = useMemo(
    () => (!isExpense ? getUniqueValues("season") : []),
    [rubro, isExpense, data]
  );

  const sortOptions: SortOption<T>[] = useMemo(
    () =>
      isExpense
        ? [
            {
              value: { field: "amount" as keyof T, direction: "asc" },
              label: "Monto (Menor a Mayor)",
            },
            {
              value: { field: "amount" as keyof T, direction: "desc" },
              label: "Monto (Mayor a Menor)",
            },
            {
              value: { field: "date" as keyof T, direction: "desc" },
              label: "Fecha (Más reciente)",
            },
            {
              value: { field: "date" as keyof T, direction: "asc" },
              label: "Fecha (Más antigua)",
            },
          ]
        : [
            {
              value: { field: "name" as keyof T, direction: "asc" },
              label: "Nombre (A-Z)",
            },
            {
              value: { field: "name" as keyof T, direction: "desc" },
              label: "Nombre (Z-A)",
            },
            {
              value: { field: "price" as keyof T, direction: "asc" },
              label: "Precio (Menor a Mayor)",
            },
            {
              value: { field: "price" as keyof T, direction: "desc" },
              label: "Precio (Mayor a Menor)",
            },
            {
              value: { field: "stock" as keyof T, direction: "desc" },
              label: "Mayor stock primero",
            },
            {
              value: { field: "stock" as keyof T, direction: "asc" },
              label: "Menor stock primero",
            },
          ],
    [isExpense]
  );

  const handleSortChange = (option: SortOption<T> | null) => {
    setSelectedSort(option);
    if (option) {
      onApplySort(option.value);
    }
  };
  useEffect(() => {
    if (rubro !== prevRubro) {
      clearAllFilters();
      setPrevRubro(rubro);
    }
  }, [rubro, prevRubro]);

  const renderFilters = () => {
    if (isExpense) {
      return (
        <>
          <div className="flex flex-col w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Tipo
            </label>
            <Select<CategoryOption>
              options={expenseTypeOptions}
              noOptionsMessage={() => "Sin opciones"}
              value={selectedExpenseType}
              onChange={(newValue) => setSelectedExpenseType(newValue)}
              placeholder="Tipo"
              isClearable
              className="text-sm text-gray_l react-select-container"
            />
          </div>

          <div className="flex flex-col w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Categoría
            </label>
            <Select<CategoryOption>
              options={expenseCategoryOptions}
              noOptionsMessage={() => "Sin opciones"}
              value={selectedExpenseCategory}
              onChange={(newValue) => setSelectedExpenseCategory(newValue)}
              placeholder="Categoría"
              isClearable
              className="text-sm text-gray_l react-select-container"
            />
          </div>

          <div className="flex flex-col w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Método de Pago
            </label>
            <Select<CategoryOption>
              options={paymentMethodOptions}
              noOptionsMessage={() => "Sin opciones"}
              value={selectedPaymentMethod}
              onChange={(newValue) => setSelectedPaymentMethod(newValue)}
              placeholder="Método de pago"
              isClearable
              className="text-sm text-gray_l react-select-container"
            />
          </div>
        </>
      );
    } else {
      return (
        <>
          <div className="flex flex-col w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Categorías
            </label>
            <Select<CategoryOption>
              options={categoryOptions}
              value={selectedCategory}
              onChange={(newValue) => setSelectedCategory(newValue)}
              placeholder="Categoría"
              isClearable
              className="text-sm text-gray_l react-select-container"
            />
          </div>

          <div>
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Temporadas
            </label>
            <Select<CategoryOption>
              options={seasonOptionsDynamic}
              value={selectedSeason}
              onChange={(newValue) => setSelectedSeason(newValue)}
              placeholder="Temporada"
              isClearable
              className="text-sm text-gray_l react-select-container"
            />
          </div>

          {rubro === "indumentaria" && (
            <>
              <div>
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Talles
                </label>
                <Select<CategoryOption>
                  options={sizeOptions}
                  value={selectedSize}
                  onChange={(newValue) => setSelectedSize(newValue)}
                  placeholder="Talle"
                  isClearable
                  className="text-sm text-gray_l react-select-container"
                />
              </div>

              <div>
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Colores
                </label>
                <Select<CategoryOption>
                  options={colorOptions}
                  value={selectedColors}
                  onChange={(newValue) => setSelectedColors(newValue)}
                  placeholder="Color"
                  isClearable
                  className="text-sm text-gray_l react-select-container"
                />
              </div>

              <div>
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Marcas
                </label>
                <Select<CategoryOption>
                  options={brandOptions}
                  value={selectedBrands}
                  onChange={(newValue) => setSelectedBrands(newValue)}
                  placeholder="Marca"
                  isClearable
                  className="text-sm text-gray_l react-select-container"
                />
              </div>
            </>
          )}
        </>
      );
    }
  };

  return (
    <div className="relative flex flex-col gap-4 w-full">
      <div className="flex justify-between items-center">
        <div className="relative flex items-center gap-2">
          <div className="w-70 max-w-50 2xl:max-w-70">
            <Select
              options={sortOptions}
              value={selectedSort}
              onChange={handleSortChange}
              placeholder="Ordenar por..."
              className="text-sm text-gray_l"
              isClearable
            />
          </div>
          {rubro !== "Todos los rubros" && (
            <Button
              icon={<FaFilter size={18} />}
              minwidth="min-w-0"
              colorText="text-white"
              colorTextHover="text-white"
              colorBg="bg-blue_b"
              colorBgHover="hover:bg-blue_m"
              onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            />
          )}
        </div>
      </div>

      {isFiltersOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          className="absolute top-11 left-0 w-full min-w-[40rem] 2xl:min-w-[57rem] h-full z-50 flex items-start justify-center -mt-1.5"
        >
          <div className="w-full bg-white dark:bg-gray_m p-4 rounded-lg shadow-lg min-h-[15vh] flex flex-col shadow-gray_xl dark:shadow-gray_m">
            <div className="flex-grow w-full p-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray_l dark:text-gray_xl mb-2">
                  Filtrar Por:
                </p>
                <p
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 cursor-pointer text-blue_b dark:text-blue_l hover:text-blue_m dark:hover:text-blue_xl text-sm font-medium"
                >
                  Limpiar Filtros
                  <FaTimes size={18} />
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">{renderFilters()}</div>
            </div>

            <div className="mt-6 flex justify-end pt-4 gap-4">
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => {
                  setIsFiltersOpen(false);
                  clearAllFilters();
                }}
                hotkey="Escape"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
