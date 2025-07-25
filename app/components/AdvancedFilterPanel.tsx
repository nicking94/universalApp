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
import { FaFilter, FaTimes } from "react-icons/fa";

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
  const [selectedSeason, setSelectedSeason] = useState<CategoryOption | null>(
    null
  );
  const [selectedBrands, setSelectedBrands] = useState<CategoryOption | null>(
    null
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selectedSort, setSelectedSort] = useState<SortOption | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [prevRubro, setPrevRubro] = useState<Rubro>(rubro);

  const clearAllFilters = () => {
    setSelectedCategory(null);
    setSelectedSize(null);
    setSelectedColors(null);
    setSelectedSeason(null);
    setSelectedBrands(null);
    setSelectedSort(null);
    onApplyFilters([]);
    onApplySort({ field: "name", direction: "asc" });
  };
  useEffect(() => {
    if (rubro !== prevRubro) {
      setSelectedCategory(null);
      setSelectedSize(null);
      setSelectedColors(null);
      setSelectedSeason(null);
      setSelectedBrands(null);
      setSelectedSort(null);
      onApplyFilters([]);
      onApplySort({ field: "name", direction: "asc" });
      setPrevRubro(rubro);
    }
  }, [rubro, prevRubro, onApplyFilters, onApplySort]);

  useEffect(() => {
    const newFilters: ProductFilters = [];

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
  }, [
    selectedCategory,
    selectedSize,
    selectedColors,
    selectedBrands,
    selectedSeason,
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

  const handleSelectChange =
    (setter: React.Dispatch<React.SetStateAction<CategoryOption | null>>) =>
    (newValue: CategoryOption | null) => {
      setTimeout(() => {
        setter(newValue);
      }, 0);
    };

  const getUniqueValues = (field: keyof Product): CategoryOption[] => {
    const uniqueValues = Array.from(
      new Set(
        products
          .filter(
            (p) =>
              (rubro === "Todos los rubros" ? true : p.rubro === rubro) &&
              p[field]
          )
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
  }, [products, rubro]);

  const sizeOptions = rubro === "indumentaria" ? getUniqueValues("size") : [];
  const colorOptions = rubro === "indumentaria" ? getUniqueValues("color") : [];
  const brandOptions = rubro === "indumentaria" ? getUniqueValues("brand") : [];
  const seasonOptionsDynamic = getUniqueValues("season");

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
              className="text-sm text-gray_l"
              isClearable
            />
          </div>
          {rubro !== "Todos los rubros" && (
            <Button
              icon={<FaFilter size={16} />}
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
          className={`absolute top-11 left-0 w-full min-w-[40rem] 2xl:min-w-[57rem] h-full z-50 flex items-start justify-center -mt-1.5 `}
        >
          <div
            className={`w-full bg-white dark:bg-gray_b p-4 rounded-lg shadow-lg min-h-[15vh] flex flex-col shadow-gray_xl dark:shadow-gray_m`}
          >
            <div className="flex-grow w-full p-2">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray_l mb-2">Filtrar Por:</p>
                <p
                  onClick={clearAllFilters}
                  className="flex items-center gap-2 cursor-pointer text-blue_b dark:text-blue_l hover:text-blue_m dark:hover:text-blue_xl text-sm font-medium"
                >
                  Limpiar Filtros
                  <FaTimes size={16} />
                </p>
              </div>

              <div
                className={` ${
                  rubro !== "indumentaria"
                    ? "grid grid-cols-2 gap-4"
                    : "grid grid-cols-3 2xl:grid-cols-5 gap-4"
                } `}
              >
                <div className="flex flex-col w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Categorías
                  </label>
                  <Select<CategoryOption>
                    options={categoryOptions}
                    noOptionsMessage={() => "No hay opciones"}
                    value={selectedCategory}
                    onChange={handleSelectChange(setSelectedCategory)}
                    placeholder="Categoría"
                    isClearable
                    className="text-sm text-gray_l react-select-container"
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
                  />
                </div>

                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Temporadas
                  </label>
                  <Select<CategoryOption>
                    options={seasonOptionsDynamic}
                    noOptionsMessage={() => "No hay opciones"}
                    value={selectedSeason}
                    onChange={handleSelectChange(setSelectedSeason)}
                    placeholder="Temporada"
                    isClearable
                    className="text-sm text-gray_l react-select-container"
                    styles={{
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                    }}
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
                        noOptionsMessage={() => "No hay opciones"}
                        value={selectedSize}
                        onChange={handleSelectChange(setSelectedSize)}
                        placeholder="Talle"
                        isClearable
                        className="text-sm text-gray_l react-select-container"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Colores
                      </label>
                      <Select<CategoryOption>
                        options={colorOptions}
                        noOptionsMessage={() => "No hay opciones"}
                        value={selectedColors}
                        onChange={handleSelectChange(setSelectedColors)}
                        placeholder="Color"
                        isClearable
                        className="text-sm text-gray_l react-select-container"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Marcas
                      </label>
                      <Select<CategoryOption>
                        options={brandOptions}
                        noOptionsMessage={() => "No hay opciones"}
                        value={selectedBrands}
                        onChange={handleSelectChange(setSelectedBrands)}
                        placeholder="Marca"
                        isClearable
                        className="text-sm text-gray_l react-select-container"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
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
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => {
                  setIsFiltersOpen(false);
                  clearAllFilters();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
