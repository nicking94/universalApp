"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Select from "react-select";
import {
  CategoryOption,
  Product,
  ProductFilters,
  Rubro,
} from "../lib/types/types";
import Button from "./Button";
import { FaFilter } from "react-icons/fa";

interface SortOption {
  value: {
    field: keyof Product;
    direction: "asc" | "desc";
  };
  label: string;
}

interface AdvancedFilterPanelProps {
  products: Product[];
  onApplyFilters: (filters: ProductFilters) => void;
  onApplySort: (sort: {
    field: keyof Product;
    direction: "asc" | "desc";
  }) => void;
  rubro: Rubro;
}

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  products,
  onApplyFilters,
  onApplySort,
  rubro,
}) => {
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryOption | null>(null);
  const [selectedSize, setSelectedSize] = useState<CategoryOption | null>(null);
  const [selectedColors, setSelectedColors] = useState<CategoryOption | null>(
    null
  );
  const [selectedBrands, setSelectedBrands] = useState<CategoryOption | null>(
    null
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Efecto para aplicar filtros automáticamente cuando cambian
  useEffect(() => {
    const newFilters: ProductFilters = [];

    if (selectedCategory) {
      newFilters.push({
        field: "customCategories",
        value: selectedCategory.value.name,
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
  }, [
    selectedCategory,
    selectedSize,
    selectedColors,
    selectedBrands,
    rubro,
    onApplyFilters,
  ]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
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
    const uniqueValues = Array.from(
      new Set(
        products
          .filter((p) => p.rubro === rubro && p[field])
          .map((p) => String(p[field]))
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
    return products
      .filter((p) => {
        // Si estamos en "todos los rubros", mostramos todas las categorías
        if (rubro === "todos los rubros") {
          return true;
        }
        // Si no, solo mostramos las categorías del rubro actual
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
  }, [products, rubro]);

  const sizeOptions = rubro === "indumentaria" ? getUniqueValues("size") : [];
  const colorOptions = rubro === "indumentaria" ? getUniqueValues("color") : [];
  const brandOptions = rubro === "indumentaria" ? getUniqueValues("brand") : [];

  const sortOptions: SortOption[] = [
    { value: { field: "name", direction: "asc" }, label: "Nombre (A-Z)" },
    { value: { field: "name", direction: "desc" }, label: "Nombre (Z-A)" },
    {
      value: { field: "price", direction: "asc" },
      label: "Precio (Menor a Mayor)",
    },
    {
      value: { field: "price", direction: "desc" },
      label: "Precio (Mayor a Menor)",
    },
    {
      value: { field: "stock", direction: "desc" },
      label: "Mayor stock primero",
    },
    {
      value: { field: "stock", direction: "asc" },
      label: "Menor stock primero",
    },
  ];

  const handleSortChange = (option: SortOption | null) => {
    setSelectedSort(option);
    if (option) {
      onApplySort(option.value);
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
              className="text-sm"
              isClearable
            />
          </div>
          <Button
            icon={<FaFilter size={16} />}
            minwidth="min-w-0"
            colorText="text-white"
            colorTextHover="text-white"
            colorBg="bg-blue_m"
            colorBgHover="hover:bg-blue_b"
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          />
        </div>
      </div>

      {isFiltersOpen && (
        <div
          ref={modalRef}
          className="absolute top-0 left-0 w-full min-w-[40rem] h-full z-50 flex items-start justify-center -mt-1.5 "
        >
          <div
            className={`bg-white dark:bg-gray_b p-4 rounded-lg shadow-xl w-full max-w-4xl ${
              rubro !== "indumentaria"
                ? "min-h-[70vh] 2xl:min-h-[75vh]"
                : "min-h-[80vh] 2xl:min-h-[65vh]"
            }  max-h-[80vh] flex flex-col`}
          >
            <div className="overflow-y-auto flex-grow">
              <p className="text-sm text-gray_l mb-2">Filtrar Por:</p>
              <div
                className={` ${
                  rubro !== "indumentaria"
                    ? "flex justify-center"
                    : "grid grid-cols-2 gap-6"
                } `}
              >
                <div className="flex flex-col w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Categorías
                  </label>
                  <Select<CategoryOption>
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(newValue) => setSelectedCategory(newValue)}
                    placeholder="Seleccionar categoría..."
                    isClearable
                    className="text-sm"
                  />
                </div>

                {rubro === "indumentaria" && (
                  <>
                    <div>
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Talles
                      </label>
                      <Select<CategoryOption>
                        options={sizeOptions}
                        value={selectedSize}
                        onChange={(newValue) => setSelectedSize(newValue)}
                        placeholder="Seleccionar talle..."
                        isClearable
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Colores
                      </label>
                      <Select<CategoryOption>
                        options={colorOptions}
                        value={selectedColors}
                        onChange={(newValue) => setSelectedColors(newValue)}
                        placeholder="Seleccionar color..."
                        isClearable
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Marcas
                      </label>
                      <Select<CategoryOption>
                        options={brandOptions}
                        value={selectedBrands}
                        onChange={(newValue) => setSelectedBrands(newValue)}
                        placeholder="Seleccionar marca..."
                        isClearable
                        className="text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end pt-4 gap-4">
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsFiltersOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
