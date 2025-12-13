"use client";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  ClothingSizeOption,
  DailyCashMovement,
  Product,
  ProductReturn,
  Rubro,
  UnifiedFilter,
  UnitOption,
  PriceList,
} from "@/app/lib/types/types";
import {
  Info,
  Edit,
  Delete,
  Inventory2,
  Warning,
  QrCode,
  Add,
} from "@mui/icons-material";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { db } from "@/app/database/db";
import SearchBar from "@/app/components/SearchBar";
import { parseISO, format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { isValid } from "date-fns";
import { formatCurrency } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { usePagination } from "@/app/context/PaginationContext";
import BarcodeGenerator from "@/app/components/BarcodeGenerator";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import Select from "@/app/components/Select";
import {
  convertFromBaseUnit,
  convertToBaseUnit,
} from "@/app/lib/utils/calculations";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import Checkbox from "@/app/components/Checkbox";
import { toCapitalize } from "@/app/lib/utils/capitalizeText";
import {
  Autocomplete,
  IconButton,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import Input from "@/app/components/Input";
import Button from "@/app/components/Button";
import { useNotification } from "@/app/hooks/useNotification";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

const PRODUCT_CONFIG = {
  MAX_PRODUCTS_PER_CATEGORY: 30,
  IVA_PERCENTAGE: 21,
  DEFAULT_UNIT: "Unid.",
  NOTIFICATION_DURATION: 2500,
} as const;

const CONVERSION_FACTORS = {
  Gr: { base: "Kg", factor: 0.001 },
  Kg: { base: "Kg", factor: 1 },
  Ton: { base: "Kg", factor: 1000 },
  Ml: { base: "L", factor: 0.001 },
  L: { base: "L", factor: 1 },
  Mm: { base: "M", factor: 0.001 },
  Cm: { base: "M", factor: 0.01 },
  Pulg: { base: "M", factor: 0.0254 },
  M: { base: "M", factor: 1 },
  "Unid.": { base: "Unid.", factor: 1 },
  Docena: { base: "Unid.", factor: 12 },
  Ciento: { base: "Unid.", factor: 100 },
  Bulto: { base: "Bulto", factor: 1 },
  Caja: { base: "Caja", factor: 1 },
  Cajón: { base: "Cajón", factor: 1 },
  "M²": { base: "M²", factor: 1 },
  "M³": { base: "M³", factor: 1 },
  V: { base: "V", factor: 1 },
  A: { base: "A", factor: 1 },
  W: { base: "W", factor: 1 },
} as const;

const unitOptions: UnitOption[] = [
  { value: "Unid.", label: "Unidad", convertible: false },
  { value: "Kg", label: "Kilogramo", convertible: true },
  { value: "Gr", label: "Gramo", convertible: true },
  { value: "L", label: "Litro", convertible: true },
  { value: "Ml", label: "Mililitro", convertible: true },
  { value: "Mm", label: "Milímetro", convertible: true },
  { value: "Cm", label: "Centímetro", convertible: true },
  { value: "M", label: "Metro", convertible: true },
  { value: "M²", label: "Metro cuadrado", convertible: true },
  { value: "M³", label: "Metro cúbico", convertible: true },
  { value: "Pulg", label: "Pulgada", convertible: true },
  { value: "Docena", label: "Docena", convertible: false },
  { value: "Ciento", label: "Ciento", convertible: false },
  { value: "Ton", label: "Tonelada", convertible: true },
  { value: "V", label: "Voltio", convertible: false },
  { value: "A", label: "Amperio", convertible: false },
  { value: "W", label: "Watt", convertible: false },
  { value: "Bulto", label: "Bulto", convertible: false },
  { value: "Caja", label: "Caja", convertible: false },
  { value: "Cajón", label: "Cajón", convertible: false },
];

const seasonOptions = [
  { value: "todo el año", label: "Todo el año" },
  { value: "invierno", label: "Invierno" },
  { value: "otoño", label: "Otoño" },
  { value: "primavera", label: "Primavera" },
  { value: "verano", label: "Verano" },
];

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const getDefaultProduct = (rubro: Rubro): Product => ({
  id: Date.now(),
  name: "",
  stock: 0,
  costPrice: 0,
  price: 0,
  hasIvaIncluded: true,
  expiration: "",
  quantity: 0,
  unit: PRODUCT_CONFIG.DEFAULT_UNIT,
  barcode: "",
  category: "",
  brand: "",
  color: "",
  size: "",
  rubro: rubro,
  lot: "",
  location: "",
  customCategory: "",
  customCategories: [],
  setMinStock: false,
  minStock: 0,
});

const useProductForm = (rubro: Rubro, initialProduct?: Product) => {
  const [formData, setFormData] = useState<Product>(
    () => initialProduct || getDefaultProduct(rubro)
  );

  const updateField = useCallback(
    (
      field: keyof Product,
      value:
        | string
        | number
        | boolean
        | { name: string; rubro: Rubro }[]
        | Product["unit"]
    ) => {
      if (field === "customCategory" && typeof value === "string") {
        setFormData((prev) => ({ ...prev, [field]: toCapitalize(value) }));
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }));
      }
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormData(getDefaultProduct(rubro));
  }, [rubro]);

  const setForm = useCallback((product: Product) => {
    setFormData(product);
  }, []);

  return { formData, updateField, resetForm, setForm };
};

const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const storedProducts = await db.products.toArray();
      const formattedProducts = storedProducts
        .map((p: Product) => ({
          ...p,
          id: Number(p.id),
          customCategories: (p.customCategories || []).filter(
            (cat) => cat.name && cat.name.trim()
          ),
        }))
        .sort((a, b) => b.id - a.id);

      setProducts(formattedProducts);
      return formattedProducts;
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const addProduct = useCallback(async (product: Product) => {
    const { ...productWithoutId } = product;
    const newId = await db.products.add(productWithoutId);
    const newProduct = { ...product, id: Number(newId) };
    setProducts((prev) => [...prev, newProduct]);
    return newProduct;
  }, []);

  const updateProduct = useCallback(
    async (id: number, updates: Partial<Product>) => {
      await db.products.update(id, updates);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    []
  );

  const deleteProduct = useCallback(async (id: number) => {
    await db.products.delete(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    setProducts,
  };
};

const useProductValidation = () => {
  const validateProduct = useCallback((product: Product): string[] => {
    const errors: string[] = [];

    if (!product.name?.trim()) errors.push("El nombre es requerido");
    if (product.stock < 0) errors.push("El stock no puede ser negativo");
    if (product.costPrice <= 0)
      errors.push("El precio de costo debe ser mayor a 0");
    if (product.price <= 0)
      errors.push("El precio de venta debe ser mayor a 0");
    if (product.price < product.costPrice) {
      errors.push("El precio de venta no puede ser menor al costo");
    }
    if (!product.unit) errors.push("La unidad de medida es requerida");
    if (!product.customCategories?.length) {
      errors.push("La categoría es requerida");
    }

    return errors;
  }, []);

  return { validateProduct };
};

const useSortedProducts = (
  products: Product[],
  filters: UnifiedFilter[],
  sortConfig: { field: keyof Product; direction: "asc" | "desc" },
  rubro: Rubro,
  searchQuery: string
) => {
  return useMemo(() => {
    let filtered = [...products];

    if (rubro !== "Todos los rubros") {
      filtered = filtered.filter((product) => product.rubro === rubro);
    }

    if (searchQuery) {
      filtered = filtered.filter((product) => {
        const productName = getDisplayProductName(
          product,
          rubro,
          false
        ).toLowerCase();
        return productName.includes(searchQuery.toLowerCase());
      });
    }

    if (filters.length > 0) {
      filtered = filtered.filter((product) => {
        return filters.every((filter) => {
          const fieldValue =
            filter.field === "customCategories"
              ? product.customCategories?.[0]?.name
              : product[filter.field as keyof Product];

          if (fieldValue === undefined || fieldValue === null) return false;
          return (
            String(fieldValue).toLowerCase() ===
            String(filter.value).toLowerCase()
          );
        });
      });
    }

    filtered.sort((a, b) => {
      const getExpirationStatus = (product: Product) => {
        if (!product.expiration) return 3;

        const today = startOfDay(new Date());
        const expDate = startOfDay(parseISO(product.expiration));
        const diffDays = differenceInDays(expDate, today);

        if (diffDays < 0) return 0;
        if (diffDays === 0) return 1;
        if (diffDays <= 7) return 2;
        return 3;
      };

      const statusA = getExpirationStatus(a);
      const statusB = getExpirationStatus(b);

      if (statusA !== statusB) {
        return statusA - statusB;
      }

      let compareResult = 0;
      const field = sortConfig.field;
      const direction = sortConfig.direction;

      switch (field) {
        case "name":
          compareResult = a.name.localeCompare(b.name);
          break;
        case "price":
          compareResult = Number(a.price) - Number(b.price);
          break;
        case "stock":
          compareResult = a.stock - b.stock;
          break;
        case "expiration":
          if (!a.expiration && !b.expiration) compareResult = 0;
          else if (!a.expiration) compareResult = 1;
          else if (!b.expiration) compareResult = -1;
          else {
            const dateA = parseISO(a.expiration);
            const dateB = parseISO(b.expiration);
            compareResult = dateA.getTime() - dateB.getTime();
          }
          break;
        default:
          const valueA = String(a[field] || "");
          const valueB = String(b[field] || "");
          compareResult = valueA.localeCompare(valueB);
      }

      return direction === "asc" ? compareResult : -compareResult;
    });

    return filtered;
  }, [products, rubro, searchQuery, filters, sortConfig]);
};

const getRowStyles = (expirationStatus: string, hasLowStock: boolean) => {
  const baseStyles = {
    border: "1px solid",
    borderColor: "divider",
    "&:hover": {
      backgroundColor: "action.hover",
      transform: "translateY(-1px)",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    transition: "all 0.3s ease-in-out",
  };

  switch (expirationStatus) {
    case "expired":
      return {
        ...baseStyles,
        borderLeft: "4px solid",
        borderLeftColor: "error.dark",
        backgroundColor: "grey.50",
        "&:hover": {
          backgroundColor: "grey.100",
        },
        "& .MuiTableCell-root": {
          color: "inherit",
        },
      };
    case "expiresToday":
      return {
        ...baseStyles,
        borderLeft: "4px solid",
        borderLeftColor: "error.main",
        backgroundColor: "error.main",
        "&:hover": {
          backgroundColor: "error.main",
          color: "text.primary",
        },
        "& .MuiTableCell-root": {
          color: "inherit",
          fontWeight: "bold",
        },
      };
    case "expiringSoon":
      return {
        ...baseStyles,
        borderLeft: "4px solid",
        borderLeftColor: "error.light",
        backgroundColor: "grey.50",
        "&:hover": {
          backgroundColor: "grey.100",
        },
        "& .MuiTableCell-root": {
          color: "inherit",
        },
      };
    default:
      return hasLowStock
        ? {
            ...baseStyles,
            borderLeft: "4px solid",
            borderLeftColor: "info.main",
            backgroundColor: "info.light",
            "&:hover": {
              backgroundColor: "info.main",
              color: "white",
            },
          }
        : baseStyles;
  }
};

interface ProductRowProps {
  product: Product;
  rubro: Rubro;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onGenerateBarcode: (product: Product) => void;
  supplierName?: string;
  currentPriceListId?: number | null;
  productPrices: Record<number, number>;
}

const ProductRow = React.memo(
  ({
    product,
    rubro,
    onEdit,
    onDelete,
    onGenerateBarcode,
    supplierName,
    currentPriceListId,
    productPrices,
  }: ProductRowProps) => {
    const displayName = useMemo(
      () => getDisplayProductName(product, rubro, false),
      [product, rubro]
    );

    const { expirationDate, expirationStatus } = useMemo(() => {
      const expDate = product.expiration
        ? startOfDay(parseISO(product.expiration))
        : null;
      const today = startOfDay(new Date());
      const daysUntilExp = expDate ? differenceInDays(expDate, today) : null;

      let status = "normal";
      if (daysUntilExp !== null) {
        if (daysUntilExp < 0) status = "expired";
        else if (daysUntilExp === 0) status = "expiresToday";
        else if (daysUntilExp <= 7) status = "expiringSoon";
      }

      return { expirationDate: expDate, expirationStatus: status };
    }, [product.expiration]);

    const hasLowStock = useMemo(
      () =>
        Boolean(
          product.setMinStock &&
            product.minStock &&
            product.stock < product.minStock
        ),
      [product.setMinStock, product.minStock, product.stock]
    );

    const rowStyles = useMemo(
      () => getRowStyles(expirationStatus, hasLowStock),
      [expirationStatus, hasLowStock]
    );

    const stockCellStyles = useMemo(
      () => ({
        textAlign: "center" as const,
        ...(!isNaN(Number(product.stock)) && Number(product.stock) > 0
          ? hasLowStock
            ? {
                color: "white",
                fontWeight: "bold",
                backgroundColor: "primary.main",
              }
            : {}
          : { color: "error.main" }),
      }),
      [product.stock, hasLowStock]
    );

    // Obtener el precio según la lista de precios
    const productPrice = useMemo(() => {
      if (currentPriceListId && productPrices[product.id] !== undefined) {
        return productPrices[product.id];
      }
      return product.price;
    }, [product.id, product.price, currentPriceListId, productPrices]);

    const handleEdit = useCallback(() => {
      onEdit(product);
    }, [onEdit, product]);

    const handleDelete = useCallback(() => {
      onDelete(product);
    }, [onDelete, product]);

    const handleGenerateBarcode = useCallback(() => {
      onGenerateBarcode(product);
    }, [onGenerateBarcode, product]);

    return (
      <TableRow sx={rowStyles}>
        <TableCell
          sx={{
            fontWeight: "bold",
            textAlign: "left",
            textTransform: "capitalize",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              height: "100%",
            }}
          >
            {(expirationStatus === "expiresToday" ||
              expirationStatus === "expiringSoon" ||
              expirationStatus === "expired") && (
              <Warning
                sx={{
                  color:
                    expirationStatus === "expiresToday"
                      ? "warning.main"
                      : expirationStatus === "expiringSoon"
                      ? "warning.dark"
                      : "error.main",
                }}
                fontSize="small"
              />
            )}
            <Typography variant="body2" sx={{ lineHeight: "tight" }}>
              {displayName}
            </Typography>
          </Box>
        </TableCell>
        <TableCell sx={stockCellStyles}>
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <Typography
              variant="body2"
              fontWeight="bold"
              sx={{ textTransform: "uppercase" }}
            >
              {!isNaN(Number(product.stock)) && Number(product.stock) > 0
                ? `${product.stock} ${product.unit}`
                : "Agotado"}
            </Typography>
            {hasLowStock && (
              <Typography
                variant="caption"
                sx={{ color: "primary.light", fontWeight: "medium", mt: 0.5 }}
              >
                Stock por debajo del mínimo
              </Typography>
            )}
          </Box>
        </TableCell>
        <TableCell sx={{ textAlign: "center", textTransform: "capitalize" }}>
          {product.customCategories?.[0]?.name || "-"}
        </TableCell>
        <TableCell sx={{ textAlign: "center" }}>
          {product.location || "-"}
        </TableCell>

        {rubro === "indumentaria" && (
          <>
            <TableCell sx={{ textAlign: "center" }}>
              {product.size || "-"}
            </TableCell>
            <TableCell
              sx={{ textAlign: "center", textTransform: "capitalize" }}
            >
              {product.color || "-"}
            </TableCell>
            <TableCell
              sx={{ textAlign: "center", textTransform: "capitalize" }}
            >
              {product.brand || "-"}
            </TableCell>
          </>
        )}
        <TableCell sx={{ textAlign: "center", textTransform: "capitalize" }}>
          {product.season || "-"}
        </TableCell>

        <TableCell sx={{ textAlign: "center" }}>
          {formatCurrency(product.costPrice)}
        </TableCell>
        <TableCell sx={{ textAlign: "center" }}>
          {formatCurrency(productPrice)}
        </TableCell>
        {rubro !== "indumentaria" && (
          <TableCell sx={{ textAlign: "center", fontWeight: "bold" }}>
            {product.expiration && isValid(parseISO(product.expiration))
              ? format(parseISO(product.expiration), "dd/MM/yyyy", {
                  locale: es,
                })
              : "-"}
            {expirationStatus === "expiringSoon" && (
              <Typography
                component="span"
                sx={{ ml: 0.5, color: "text.primary" }}
              >
                (Por vencer)
              </Typography>
            )}
            {expirationDate && expirationStatus === "expiresToday" && (
              <Typography
                component="span"
                sx={{
                  ml: 0.5,
                  color: "text.primary",
                  animation: "pulse 1s infinite",
                }}
              >
                (Vence Hoy)
              </Typography>
            )}
            {expirationDate && expirationStatus === "expired" && (
              <Typography
                component="span"
                sx={{ ml: 0.5, color: "error.main" }}
              >
                (Vencido)
              </Typography>
            )}
          </TableCell>
        )}
        <TableCell sx={{ textAlign: "center" }}>
          {supplierName || "-"}
        </TableCell>
        {rubro !== "Todos los rubros" && (
          <TableCell sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
              <CustomGlobalTooltip title="Código de Barras">
                <IconButton
                  onClick={handleGenerateBarcode}
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
                  <QrCode fontSize="small" />
                </IconButton>
              </CustomGlobalTooltip>
              <CustomGlobalTooltip title="Editar Producto">
                <IconButton
                  onClick={handleEdit}
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
                  <Edit fontSize="small" />
                </IconButton>
              </CustomGlobalTooltip>
              <CustomGlobalTooltip title="Eliminar Producto">
                <IconButton
                  onClick={handleDelete}
                  size="small"
                  sx={{
                    borderRadius: "4px",
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
    );
  }
);

ProductRow.displayName = "ProductRow";

interface ProductFormProps {
  formData: Product;
  onFieldChange: (
    field: keyof Product,
    value:
      | string
      | number
      | boolean
      | { name: string; rubro: Rubro }[]
      | Product["unit"]
  ) => void;
  rubro: Rubro;
  editingProduct: Product | null;
  globalCustomCategories: Array<{ name: string; rubro: Rubro }>;
  onAddCategory: () => void;
  onIvaChange: (hasIvaIncluded: boolean) => void;
  onGenerateAutoBarcode: () => void;
  unitOptions: UnitOption[];
  seasonOptions: typeof seasonOptions;
  clothingSizes: ClothingSizeOption[];
  newBrand: string;
  newColor: string;
  newSize: string;
  onBrandChange: (value: string | number) => void;
  onColorChange: (value: string | number) => void;
  onSizeChange: (value: string | number) => void;
  onSizeBlur: () => void;
  onCategoryDelete: (category: { name: string; rubro: Rubro }) => void;
}

const ProductForm = React.memo(
  ({
    formData,
    onFieldChange,
    rubro,
    editingProduct,
    globalCustomCategories,
    onAddCategory,
    onIvaChange,
    onGenerateAutoBarcode,
    unitOptions,
    seasonOptions,

    newBrand,
    newColor,
    newSize,
    onBrandChange,
    onColorChange,
    onSizeChange,
    onSizeBlur,
    onCategoryDelete,
  }: ProductFormProps) => {
    const selectedUnit = useMemo(
      () => unitOptions.find((opt) => opt.value === formData.unit) ?? null,
      [formData.unit, unitOptions]
    );

    return (
      <form
        className="flex flex-col gap-4 overflow-y-auto"
        onSubmit={(e) => e.preventDefault()}
      >
        {/* Sección 1: Información Básica */}
        <div className=" space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue_m rounded-full"></div>
            <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
              Información Básica
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Nombre del Producto */}
            <div className="space-y-2 lg:col-span-2">
              <Input
                label="Nombre del Producto"
                value={formData.name}
                onChange={(value) => onFieldChange("name", value.toString())}
                placeholder="Ingrese el nombre del producto"
                required
              />
            </div>

            {/* Código de Barras */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                Código de Barras
              </label>
              <BarcodeScanner
                value={formData.barcode || ""}
                onChange={(value) => onFieldChange("barcode", value)}
                onScanComplete={(code) => onFieldChange("barcode", code)}
                placeholder="Escanear código"
                onButtonClick={onGenerateAutoBarcode}
                buttonTitle="Generar código de barras"
              />
            </div>

            {/* Lote */}
            <div className="flex items-end space-y-2">
              <Input
                label="Lote/Número de Serie"
                value={formData.lot || ""}
                onChange={(value) => onFieldChange("lot", value.toString())}
                placeholder="Número de lote"
              />
            </div>
          </div>
        </div>

        {/* Sección 2: Categorización */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue_m rounded-full"></div>
            <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
              Categorización
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Categoría */}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                Categoría <span className="text-red-500">*</span>
              </label>
              <Select
                options={[
                  {
                    value: "",
                    label: "Seleccionar categoría",
                    deletable: false,
                  },
                  ...globalCustomCategories
                    .filter(
                      (cat) =>
                        cat.rubro === rubro || cat.rubro === "Todos los rubros"
                    )
                    .map((cat) => ({
                      value: cat.name,
                      label: cat.name,
                      deletable: true,
                      metadata: cat,
                    })),
                ]}
                value={formData.customCategories?.[0]?.name || ""}
                onChange={(value) => {
                  const selectedCategory = globalCustomCategories.find(
                    (cat) => cat.name === value
                  );
                  onFieldChange(
                    "customCategories",
                    selectedCategory ? [selectedCategory] : []
                  );
                }}
                onDeleteOption={(option) => {
                  onCategoryDelete(
                    option.metadata as { name: string; rubro: Rubro }
                  );
                }}
                showDeleteButton={true}
                label="Categoría"
                size="small"
              />
            </div>

            {/* Nueva Categoría */}
            {editingProduct ? (
              <div className=" flex items-end space-y-2">
                <div className="w-full bg-white dark:bg-gray_b p-2.5 rounded-lg border border-blue_l">
                  <p className="text-sm text-blue_b dark:text-blue-200">
                    <Info className="inline mr-2" fontSize="small" />
                    Para cambiar la categoría, seleccione una existente de la
                    lista.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-end space-y-2">
                <Input
                  label="Crear Nueva Categoría"
                  value={formData.customCategory || ""}
                  onChange={(value) =>
                    onFieldChange("customCategory", value.toString())
                  }
                  placeholder="Nombre de nueva categoría"
                  buttonIcon={<Add fontSize="small" />}
                  onButtonClick={onAddCategory}
                  buttonTitle="Crear categoría"
                  buttonDisabled={!formData.customCategory?.trim()}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sección 3: Precios y Stock */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue_m rounded-full"></div>
            <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
              Precios y Stock
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Precio de Costo */}
            <div className="space-y-2">
              <InputCash
                label="Precio de Costo"
                value={formData.costPrice}
                onChange={(value) => onFieldChange("costPrice", value)}
              />
            </div>

            {/* Precio de Venta */}
            <div className="space-y-2">
              <InputCash
                label="Precio de Venta"
                value={formData.price}
                onChange={(value) => onFieldChange("price", value)}
              />
            </div>

            {/* Stock Actual */}
            <div className="flex items-end space-y-2">
              <Input
                label="Stock Actual"
                value={formData.stock !== 0 ? formData.stock : ""}
                onChange={(value) => onFieldChange("stock", Number(value))}
                type="number"
              />
            </div>
          </div>

          {/* Configuración de IVA y Stock Mínimo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Configuración de IVA */}
            <div className="space-y-2">
              <div className="bg-gray-50 dark:bg-gray_b p-4 rounded-lg border border-gray-200">
                <Checkbox
                  label="Incluir IVA 21%"
                  checked={formData.hasIvaIncluded || false}
                  onChange={onIvaChange}
                />
              </div>
            </div>

            {/* Stock Mínimo */}
            <div className="space-y-2">
              <div className="bg-gray_xxl dark:bg-gray_b p-4 rounded-lg border border-gray_xxl">
                <div className="flex items-center justify-between">
                  <Checkbox
                    label="Establecer stock mínimo"
                    checked={formData.setMinStock || false}
                    onChange={(checked) => {
                      onFieldChange("setMinStock", checked);
                      onFieldChange(
                        "minStock",
                        checked ? formData.minStock || 1 : 0
                      );
                    }}
                  />
                </div>
                {formData.setMinStock && (
                  <div className="flex items-center gap-3">
                    <InputCash
                      label="Stock mínimo"
                      value={formData.minStock || 0}
                      onChange={(value) => onFieldChange("minStock", value)}
                      placeholder="1"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sección 4: Configuración Adicional */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-blue_m rounded-full"></div>
            <h3 className="text-base font-semibold text-gray_m dark:text-white border-b border-blue_l">
              Configuración Adicional
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Unidad de Medida */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                Unidad de Medida <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={unitOptions}
                value={selectedUnit}
                onChange={(event, selectedOption) => {
                  onFieldChange(
                    "unit",
                    selectedOption?.value as Product["unit"]
                  );
                }}
                renderInput={(params) => (
                  <Input
                    {...params}
                    placeholder="Seleccionar unidad"
                    size="small"
                  />
                )}
              />
            </div>

            {/* Ubicación */}
            <div className=" flex items-end space-y-2">
              <Input
                label="Ubicación en Almacén"
                value={formData.location || ""}
                onChange={(value) =>
                  onFieldChange("location", value.toString())
                }
                placeholder="Ej: Estante A-2"
              />
            </div>

            {/* Temporada */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                Temporada
              </label>
              <Autocomplete
                options={seasonOptions}
                value={
                  formData.season
                    ? seasonOptions.find((opt) => opt.value === formData.season)
                    : null
                }
                onChange={(event, selectedOption) => {
                  onFieldChange("season", selectedOption?.value || "");
                }}
                renderInput={(params) => (
                  <Input
                    {...params}
                    placeholder="Seleccionar temporada"
                    size="small"
                  />
                )}
              />
            </div>
          </div>

          {/* Fecha de Vencimiento */}
          {rubro !== "indumentaria" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray_m dark:text-gray_xl">
                Fecha de Vencimiento
              </label>
              <CustomDatePicker
                value={formData.expiration || ""}
                onChange={(newDate) => {
                  onFieldChange("expiration", newDate);
                }}
                isClearable={true}
              />
            </div>
          )}
        </div>

        {/* Sección 5: Especificaciones de Indumentaria */}
        {rubro === "indumentaria" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-pink-500 rounded-full"></div>
              <h3 className="text-base font-semibold text-gray_m dark:text-white">
                Especificaciones de Indumentaria
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Talle */}
              <div className="space-y-2">
                <Input
                  label="Talle/Medida"
                  value={newSize}
                  onChange={onSizeChange}
                  onBlur={onSizeBlur}
                  placeholder="Crear nuevo talle"
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Input
                  label="Color"
                  value={newColor}
                  onChange={onColorChange}
                  placeholder="Crear nuevo color"
                />
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <Input
                  label="Marca"
                  value={newBrand}
                  onChange={onBrandChange}
                  placeholder="Crear nueva marca"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    );
  }
);

ProductForm.displayName = "ProductForm";

const ProductsPage = () => {
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();

  const {
    products,
    loading,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    setProducts,
  } = useProducts();
  const { validateProduct } = useProductValidation();
  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  // Estados para listas de precios
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(
    null
  );
  const [productPrices, setProductPrices] = useState<Record<number, number>>(
    {}
  );

  const [isOpenModal, setIsOpenModal] = useState(false);
  const {
    formData: newProduct,
    updateField,
    resetForm,
    setForm,
  } = useProductForm(rubro);
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Product;
    direction: "asc" | "desc";
  }>({
    field: "name",
    direction: "asc",
  });

  const [filters, setFilters] = useState<UnifiedFilter[]>([]);
  const [globalCustomCategories, setGlobalCustomCategories] = useState<
    Array<{ name: string; rubro: Rubro }>
  >([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [productSuppliers, setProductSuppliers] = useState<
    Record<number, string>
  >({});
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] =
    useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    name: string;
    rubro: Rubro;
  } | null>(null);
  const [isCategoryDeleteModalOpen, setIsCategoryDeleteModalOpen] =
    useState(false);
  const [newBrand, setNewBrand] = useState("");
  const [newColor, setNewColor] = useState("");
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [selectedReturnProduct, setSelectedReturnProduct] =
    useState<Product | null>(null);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [showReturnsHistory, setShowReturnsHistory] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [returnQuantity, setReturnQuantity] = useState<number>(0);
  const [returnUnit, setReturnUnit] = useState<string>("");
  const [clothingSizes, setClothingSizes] = useState<ClothingSizeOption[]>([]);
  const [newSize, setNewSize] = useState("");
  const [sizeToDelete, setSizeToDelete] = useState<string | null>(null);
  const [isSizeDeleteModalOpen, setIsSizeDeleteModalOpen] = useState(false);

  // Cargar listas de precios
  useEffect(() => {
    const loadPriceLists = async () => {
      if (rubro === "Todos los rubros") return;
      try {
        const lists = await db.priceLists
          .where("rubro")
          .equals(rubro)
          .toArray();
        setPriceLists(lists);

        // Seleccionar lista por defecto o primera disponible
        const defaultList = lists.find((list) => list.isDefault);
        if (defaultList) {
          setSelectedPriceListId(defaultList.id);
        } else if (lists.length > 0) {
          setSelectedPriceListId(lists[0].id);
        }
      } catch (error) {
        console.error("Error loading price lists:", error);
      }
    };

    loadPriceLists();
  }, [rubro]);

  // Cargar precios de productos para la lista seleccionada
  useEffect(() => {
    const loadProductPrices = async () => {
      if (!selectedPriceListId) return;

      try {
        const prices = await db.productPrices
          .where("priceListId")
          .equals(selectedPriceListId)
          .toArray();

        const priceMap: Record<number, number> = {};
        prices.forEach((price) => {
          priceMap[price.productId] = price.price;
        });

        setProductPrices(priceMap);
      } catch (error) {
        console.error("Error loading product prices:", error);
      }
    };

    loadProductPrices();
  }, [selectedPriceListId]);

  const calculatePriceWithIva = useCallback((price: number): number => {
    return price * (1 + PRODUCT_CONFIG.IVA_PERCENTAGE / 100);
  }, []);

  const calculatePriceWithoutIva = useCallback(
    (priceWithIva: number): number => {
      return priceWithIva / (1 + PRODUCT_CONFIG.IVA_PERCENTAGE / 100);
    },
    []
  );

  const loadClothingSizes = useCallback(async () => {
    try {
      const clothingProducts = await db.products
        .where("rubro")
        .equals("indumentaria")
        .toArray();

      const uniqueSizes = Array.from(
        new Set(
          clothingProducts
            .filter((product) => product.size && product.size.trim() !== "")
            .map((product) => product.size as string)
        )
      );

      const sizeOptions = uniqueSizes
        .map((size) => ({ value: size, label: size }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setClothingSizes(sizeOptions);
    } catch (error) {
      console.error("Error al cargar talles:", error);
      showNotification("Error al cargar los talles", "error");
    }
  }, [showNotification]);

  const handleIvaCheckboxChange = useCallback(
    (hasIvaIncluded: boolean) => {
      let newCostPrice = newProduct.costPrice;
      let newPrice = newProduct.price;

      const currentHasIvaIncluded = newProduct.hasIvaIncluded ?? true;

      if (hasIvaIncluded && !currentHasIvaIncluded) {
        newCostPrice = calculatePriceWithIva(newProduct.costPrice);
        newPrice = calculatePriceWithIva(newProduct.price);
      } else if (!hasIvaIncluded && currentHasIvaIncluded) {
        newCostPrice = calculatePriceWithoutIva(newProduct.costPrice);
        newPrice = calculatePriceWithoutIva(newProduct.price);
      }

      updateField("hasIvaIncluded", hasIvaIncluded);
      updateField("costPrice", newCostPrice);
      updateField("price", newPrice);
    },
    [
      newProduct.costPrice,
      newProduct.price,
      newProduct.hasIvaIncluded,
      calculatePriceWithIva,
      calculatePriceWithoutIva,
      updateField,
    ]
  );

  const loadCustomCategories = useCallback(async () => {
    try {
      const storedCategories = await db.customCategories.toArray();
      const allProducts = await db.products.toArray();
      const allCategories = new Map<string, { name: string; rubro: Rubro }>();

      storedCategories.forEach((cat) => {
        if (cat.name?.trim()) {
          const key = `${cat.name.toLowerCase().trim()}_${cat.rubro}`;
          allCategories.set(key, {
            name: toCapitalize(cat.name.trim()),
            rubro: cat.rubro || "comercio",
          });
        }
      });

      allProducts.forEach((product: Product) => {
        if (product.customCategories?.length) {
          product.customCategories.forEach((cat) => {
            if (cat.name?.trim()) {
              const key = `${cat.name.toLowerCase().trim()}_${
                cat.rubro || product.rubro || "comercio"
              }`;
              if (!allCategories.has(key)) {
                allCategories.set(key, {
                  name: toCapitalize(cat.name.trim()),
                  rubro: cat.rubro || product.rubro || "comercio",
                });
              }
            }
          });
        }

        if (product.category?.trim()) {
          const key = `${product.category.toLowerCase().trim()}_${
            product.rubro || "comercio"
          }`;
          if (!allCategories.has(key)) {
            allCategories.set(key, {
              name: toCapitalize(product.category.trim()),
              rubro: product.rubro || "comercio",
            });
          }
        }
      });

      return Array.from(allCategories.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
    } catch (error) {
      console.error("Error loading categories:", error);
      return [];
    }
  }, []);

  const getCompatibleUnits = useCallback(
    (productUnit: string): UnitOption[] => {
      const productUnitInfo =
        CONVERSION_FACTORS[productUnit as keyof typeof CONVERSION_FACTORS];
      if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);

      return unitOptions.filter((option) => {
        if (!option.convertible) return false;
        const optionInfo =
          CONVERSION_FACTORS[option.value as keyof typeof CONVERSION_FACTORS];
        return optionInfo?.base === productUnitInfo.base;
      });
    },
    []
  );

  const calculateEAN13CheckDigit = useCallback((code: string): number => {
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }

    const remainder = sum % 10;
    return remainder === 0 ? 0 : 10 - remainder;
  }, []);

  const generateValidEAN13 = useCallback((): string => {
    let baseCode = "";
    for (let i = 0; i < 12; i++) {
      baseCode += Math.floor(Math.random() * 10).toString();
    }

    const checkDigit = calculateEAN13CheckDigit(baseCode);
    return baseCode + checkDigit.toString();
  }, [calculateEAN13CheckDigit]);

  const hasChanges = useCallback(
    (originalProduct: Product, updatedProduct: Product) => {
      return (
        originalProduct.name !== updatedProduct.name ||
        originalProduct.stock !== updatedProduct.stock ||
        originalProduct.costPrice !== updatedProduct.costPrice ||
        originalProduct.price !== updatedProduct.price ||
        originalProduct.hasIvaIncluded !== updatedProduct.hasIvaIncluded ||
        originalProduct.expiration !== updatedProduct.expiration ||
        originalProduct.unit !== updatedProduct.unit ||
        originalProduct.barcode !== updatedProduct.barcode ||
        originalProduct.category !== updatedProduct.category ||
        originalProduct.lot !== updatedProduct.lot ||
        originalProduct.location !== updatedProduct.location ||
        JSON.stringify(originalProduct.customCategories) !==
          JSON.stringify(updatedProduct.customCategories) ||
        originalProduct.setMinStock !== updatedProduct.setMinStock ||
        originalProduct.minStock !== updatedProduct.minStock ||
        (rubro === "indumentaria" &&
          (originalProduct.category !== updatedProduct.category ||
            originalProduct.color !== updatedProduct.color ||
            originalProduct.size !== updatedProduct.size ||
            originalProduct.brand !== updatedProduct.brand)) ||
        originalProduct.season !== updatedProduct.season
      );
    },
    [rubro]
  );

  const handleReturnProduct = useCallback(async () => {
    if (!selectedReturnProduct) {
      showNotification("Por favor seleccione un producto", "error");
      return;
    }

    try {
      const currentStock = selectedReturnProduct.stock;

      if (returnQuantity <= 0) {
        showNotification("La cantidad debe ser mayor a 0", "error");
        return;
      }

      const baseQuantity = convertToBaseUnit(returnQuantity, returnUnit);
      const currentStockInBase = convertToBaseUnit(
        currentStock,
        selectedReturnProduct.unit
      );

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        showNotification("No hay caja abierta para hoy", "error");
        return;
      }

      const amountToSubtract = selectedReturnProduct.price * returnQuantity;
      const profitToSubtract =
        (selectedReturnProduct.price - selectedReturnProduct.costPrice) *
        returnQuantity;

      const returnMovement: DailyCashMovement = {
        id: Date.now(),
        amount: amountToSubtract,
        description: `Devolución: ${getDisplayProductName(
          selectedReturnProduct,
          rubro,
          false
        )} - ${returnReason.trim() || "Sin motivo"}`,
        type: "EGRESO",
        paymentMethod: "EFECTIVO",
        date: new Date().toISOString(),
        productId: selectedReturnProduct.id,
        productName: getDisplayProductName(selectedReturnProduct, rubro, false),
        costPrice: selectedReturnProduct.costPrice,
        sellPrice: selectedReturnProduct.price,
        quantity: returnQuantity,
        profit: -profitToSubtract,
        rubro: selectedReturnProduct.rubro || rubro,
        unit: selectedReturnProduct.unit,
        createdAt: new Date().toISOString(),
      };

      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, returnMovement],
        totalExpense: (dailyCash.totalExpense || 0) + amountToSubtract,
        totalProfit: (dailyCash.totalProfit || 0) - profitToSubtract,
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      const updatedStock = convertFromBaseUnit(
        currentStockInBase + baseQuantity,
        selectedReturnProduct.unit
      );
      await updateProduct(selectedReturnProduct.id, {
        stock: parseFloat(updatedStock.toFixed(3)),
      });

      const newReturn: ProductReturn = {
        id: Date.now(),
        productId: selectedReturnProduct.id,
        productName: getDisplayProductName(selectedReturnProduct, rubro, false),
        reason: returnReason.trim() || "Sin motivo",
        date: new Date().toISOString(),
        stockAdded: parseFloat(
          convertFromBaseUnit(baseQuantity, selectedReturnProduct.unit).toFixed(
            3
          )
        ),
        amount: amountToSubtract,
        profit: profitToSubtract,
        rubro: selectedReturnProduct.rubro || rubro,
      };

      await db.returns.add(newReturn);
      setReturns((prev) => [...prev, newReturn]);

      showNotification(
        `Producto ${getDisplayProductName(
          selectedReturnProduct
        )} devuelto correctamente. Stock actualizado: ${updatedStock} ${
          selectedReturnProduct.unit
        }. Monto restado: ${formatCurrency(amountToSubtract)}`,
        "success"
      );

      resetReturnData();
      setIsReturnModalOpen(false);
    } catch (error) {
      console.error("Error al devolver producto:", error);
      showNotification("Error al devolver el producto", "error");
    }
  }, [
    selectedReturnProduct,
    returnQuantity,
    returnReason,
    returnUnit,
    rubro,
    updateProduct,
    showNotification,
  ]);

  const resetReturnData = useCallback(() => {
    setSelectedReturnProduct(null);
    setReturnReason("");
    setReturnQuantity(0);
    setReturnUnit("");
  }, []);

  const handleSort = useCallback(
    (sort: { field: keyof Product; direction: "asc" | "desc" }) => {
      setSortConfig(sort);
    },
    []
  );

  const handleSizeInputBlur = useCallback(() => {
    if (newSize.trim() && newSize !== newProduct.size) {
      updateField("size", newSize.trim());

      if (
        !clothingSizes.some(
          (size) => size.value.toLowerCase() === newSize.toLowerCase().trim()
        )
      ) {
        const newSizeOption = {
          value: newSize.trim(),
          label: newSize.trim(),
        };
        setClothingSizes((prev) =>
          [...prev, newSizeOption].sort((a, b) =>
            a.label.localeCompare(b.label)
          )
        );
      }
    }
  }, [newSize, newProduct.size, clothingSizes, updateField]);

  const handleDeleteCategoryClick = useCallback(
    async (category: { name: string; rubro: Rubro }) => {
      if (!category.name.trim()) return;

      setCategoryToDelete(category);
      setIsCategoryDeleteModalOpen(true);
    },
    []
  );

  const handleConfirmDeleteSize = useCallback(async () => {
    if (!sizeToDelete) return;

    try {
      const productsWithSize = await db.products
        .where("size")
        .equals(sizeToDelete)
        .and((product) => product.rubro === "indumentaria")
        .count();

      if (productsWithSize > 0) {
        showNotification(
          `No se puede eliminar el talle porque ${productsWithSize} producto(s) lo están usando`,
          "error"
        );
        return;
      }

      setClothingSizes((prev) =>
        prev.filter((size) => size.value !== sizeToDelete)
      );

      showNotification("Talle eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar talle:", error);
      showNotification("Error al eliminar el talle", "error");
    } finally {
      setIsSizeDeleteModalOpen(false);
      setSizeToDelete(null);
    }
  }, [sizeToDelete, showNotification]);

  const handleConfirmDeleteCategory = useCallback(
    async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      if (!categoryToDelete) return;

      try {
        await db.customCategories
          .where("name")
          .equalsIgnoreCase(categoryToDelete.name)
          .and((cat) => cat.rubro === categoryToDelete.rubro)
          .delete();

        const allProducts = await db.products.toArray();

        const updatePromises = allProducts.map(async (product: Product) => {
          const updatedCategories = (product.customCategories || []).filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          );

          if (
            updatedCategories.length !== (product.customCategories?.length || 0)
          ) {
            await db.products.update(product.id, {
              customCategories: updatedCategories,
            });
            return {
              ...product,
              customCategories: updatedCategories,
            };
          }
          return product;
        });

        const updatedProducts = await Promise.all(updatePromises);

        setProducts(updatedProducts);

        setGlobalCustomCategories((prev) =>
          prev.filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          )
        );

        updateField(
          "customCategories",
          (newProduct.customCategories || []).filter(
            (cat) =>
              cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
              cat.rubro !== categoryToDelete.rubro
          )
        );

        showNotification(
          `Categoría "${categoryToDelete.name}" eliminada correctamente`,
          "success"
        );
      } catch (error) {
        console.error("Error al eliminar categoría:", error);
        showNotification("Error al eliminar categoría", "error");
      } finally {
        setIsCategoryDeleteModalOpen(false);
        setCategoryToDelete(null);
      }
    },
    [
      categoryToDelete,
      showNotification,
      setProducts,
      newProduct.customCategories,
      updateField,
    ]
  );

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query.toLowerCase());
  }, []);

  const generateAutoBarcode = useCallback(() => {
    const ean13Code = generateValidEAN13();
    updateField("barcode", ean13Code);
  }, [generateValidEAN13, updateField]);

  const handleGenerateBarcode = useCallback((product: Product) => {
    setSelectedProductForBarcode(product);
    setIsBarcodeModalOpen(true);
  }, []);

  const handleOpenPriceModal = useCallback(() => {
    setIsPriceModalOpen(true);
    setScannedProduct(null);
    setBarcodeInput("");
    setTimeout(() => {
      const input = document.getElementById("price-check-barcode");
      if (input) input.focus();
    }, 100);
  }, []);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const product = products.find((p) => p.barcode === code);
      if (product) {
        setScannedProduct(product);
        const productName =
          rubro === "indumentaria"
            ? `${product.name}${
                product.color ? ` - ${product.color.toUpperCase()}` : ""
              }${product.size ? ` (${product.size})` : ""}`
            : product.name;
        showNotification(
          `Precio de ${productName}: ${formatCurrency(product.price)}`,
          "success"
        );
      } else {
        showNotification("Producto no encontrado", "error");
      }
      setBarcodeInput("");
    },
    [products, rubro, showNotification]
  );

  const handleAddProduct = useCallback(async () => {
    const categories = await loadCustomCategories();
    setGlobalCustomCategories(categories);
    setIsOpenModal(true);
  }, [loadCustomCategories]);

  const handleAddCategory = useCallback(async () => {
    if (!newProduct.customCategory?.trim()) return;

    const trimmedCategory = toCapitalize(newProduct.customCategory.trim());
    const lowerName = trimmedCategory.toLowerCase();
    const alreadyExists = globalCustomCategories.some(
      (cat) => cat.name.toLowerCase() === lowerName && cat.rubro === rubro
    );

    if (alreadyExists) {
      showNotification("La categoría ya existe para este rubro", "error");
      return;
    }

    const newCategory = {
      name: trimmedCategory,
      rubro: rubro,
    };

    try {
      await db.customCategories.add(newCategory);

      setGlobalCustomCategories((prev) => [...prev, newCategory]);

      updateField("customCategories", [newCategory]);
      updateField("customCategory", "");

      showNotification("Categoría agregada correctamente", "success");
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      showNotification("Error al guardar la categoría", "error");
    }
  }, [
    newProduct.customCategory,
    globalCustomCategories,
    rubro,
    showNotification,
    updateField,
  ]);

  const handleConfirmAddProduct = useCallback(async () => {
    const validationErrors = validateProduct(newProduct);
    if (validationErrors.length > 0) {
      showNotification(validationErrors.join(", "), "error");
      return;
    }

    if (!newProduct.customCategories?.length && !newProduct.customCategory) {
      showNotification("Por favor, complete todos los campos", "error");
      return;
    }

    const productToSave = {
      ...newProduct,
      rubro: rubro,
      stock: Number(newProduct.stock),
      costPrice: Number(newProduct.costPrice),
      price: Number(newProduct.price),
      hasIvaIncluded:
        newProduct.hasIvaIncluded !== undefined
          ? newProduct.hasIvaIncluded
          : true,
      quantity: Number(newProduct.quantity),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(newProduct.customCategories?.length
        ? {
            customCategories: newProduct.customCategories.map((cat) => ({
              name: cat.name.trim(),
              rubro: cat.rubro || rubro,
            })),
            category: "",
          }
        : newProduct.category
        ? {
            customCategories: [],
            category: newProduct.category,
          }
        : {
            customCategories: [],
            category: "",
          }),
    };

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productToSave);

        // Si hay una lista de precios seleccionada, actualizar el precio en esa lista
        if (selectedPriceListId) {
          await db.productPrices.put({
            productId: editingProduct.id,
            priceListId: selectedPriceListId,
            price: productToSave.price,
          });
        }
      } else {
        const addedProduct = await addProduct(productToSave);

        // Si hay una lista de precios seleccionada, guardar el precio en esa lista
        if (selectedPriceListId) {
          await db.productPrices.put({
            productId: addedProduct.id,
            priceListId: selectedPriceListId,
            price: productToSave.price,
          });
        }
      }

      const updatedCategories = await loadCustomCategories();
      setGlobalCustomCategories(updatedCategories);

      // Recargar precios de productos
      if (selectedPriceListId) {
        const prices = await db.productPrices
          .where("priceListId")
          .equals(selectedPriceListId)
          .toArray();

        const priceMap: Record<number, number> = {};
        prices.forEach((price) => {
          priceMap[price.productId] = price.price;
        });
        setProductPrices(priceMap);
      }

      showNotification(
        `Producto ${productToSave.name} ${
          editingProduct ? "actualizado" : "agregado"
        } correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al guardar el producto:", error);
      showNotification("Error al guardar el producto", "error");
    } finally {
      handleCloseModal();
    }
  }, [
    newProduct,
    rubro,
    editingProduct,
    validateProduct,
    updateProduct,
    addProduct,
    loadCustomCategories,
    showNotification,
    selectedPriceListId,
  ]);

  const handleConfirmDelete = useCallback(async () => {
    if (productToDelete) {
      try {
        await deleteProduct(productToDelete.id);
        showNotification(
          `Producto ${productToDelete.name} eliminado`,
          "success"
        );
        setProductToDelete(null);
      } catch {
        showNotification("Error al eliminar el producto", "error");
      }
    }
    setIsConfirmModalOpen(false);
  }, [productToDelete, deleteProduct, showNotification]);

  const handleCloseModal = useCallback(() => {
    setIsOpenModal(false);
    setNewBrand("");
    setNewSize("");
    setNewColor("");
    resetForm();
    setEditingProduct(null);
  }, [resetForm]);

  const handleEditProduct = useCallback(
    async (product: Product) => {
      const categories = await loadCustomCategories();
      setGlobalCustomCategories(categories);

      setEditingProduct(product);
      setNewBrand(product.brand || "");
      setNewColor(product.color || "");

      let categoriesToSet = (product.customCategories || []).map((cat) => ({
        name: toCapitalize(cat.name),
        rubro: cat.rubro || product.rubro || rubro || "comercio",
      }));

      if (categoriesToSet.length === 0 && product.category) {
        categoriesToSet = [
          {
            name: toCapitalize(product.category),
            rubro: product.rubro || rubro || "comercio",
          },
        ];
      }

      const hasIvaIncluded =
        product.hasIvaIncluded !== undefined ? product.hasIvaIncluded : true;

      // Obtener precio según lista seleccionada
      let price = product.price;
      if (selectedPriceListId && productPrices[product.id] !== undefined) {
        price = productPrices[product.id];
      }

      setForm({
        ...product,
        price,
        hasIvaIncluded,
        customCategories: categoriesToSet,
        category: "",
        customCategory: "",
        size: product.size || "",
        color: product.color || "",
        setMinStock: product.setMinStock || false,
        minStock: product.minStock || 0,
      });

      setIsOpenModal(true);
    },
    [rubro, loadCustomCategories, setForm, selectedPriceListId, productPrices]
  );

  const handleDeleteProduct = useCallback((product: Product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  }, []);

  const sortedProducts = useSortedProducts(
    products,
    filters,
    sortConfig,
    rubro,
    debouncedSearchQuery
  );

  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = sortedProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen =
        isOpenModal ||
        isConfirmModalOpen ||
        isPriceModalOpen ||
        isReturnModalOpen ||
        isSelectionModalOpen ||
        isBarcodeModalOpen ||
        showReturnsHistory ||
        isSizeDeleteModalOpen ||
        isCategoryDeleteModalOpen;

      if (isModalOpen || rubro === "Todos los rubros") {
        return;
      }

      switch (e.key) {
        case "F2":
          e.preventDefault();
          handleAddProduct();
          break;
        case "F3":
          e.preventDefault();
          setIsSelectionModalOpen(true);
          break;
        case "F4":
          e.preventDefault();
          handleOpenPriceModal();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    rubro,
    handleAddProduct,
    handleOpenPriceModal,
    isOpenModal,
    isConfirmModalOpen,
    isPriceModalOpen,
    isReturnModalOpen,
    isSelectionModalOpen,
    isBarcodeModalOpen,
    showReturnsHistory,
    isSizeDeleteModalOpen,
    isCategoryDeleteModalOpen,
  ]);

  useEffect(() => {
    const shouldDisableSave = editingProduct
      ? !hasChanges(editingProduct, newProduct)
      : !newProduct.name ||
        !newProduct.stock ||
        !newProduct.costPrice ||
        !newProduct.price ||
        !newProduct.unit;

    setIsSaveDisabled(shouldDisableSave);
  }, [newProduct, editingProduct, hasChanges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchProducts();
        const storedReturns = await db.returns.toArray();
        setReturns(
          storedReturns.map((r) => ({
            ...r,
            id: Number(r.id),
          }))
        );
        await loadCustomCategories();
      } catch (error) {
        console.error("Error fetching data:", error);
        showNotification("Error al cargar los datos", "error");
      }
    };

    fetchData();
  }, [fetchProducts, loadCustomCategories, showNotification]);

  useEffect(() => {
    const fetchCategories = async () => {
      const categories = await loadCustomCategories();
      setGlobalCustomCategories(categories);
    };
    if (isOpenModal) {
      fetchCategories();
    }
  }, [rubro, isOpenModal, loadCustomCategories]);

  useEffect(() => {
    const loadSuppliers = async () => {
      const supplierMap: Record<number, string> = {};

      for (const product of products) {
        const supplierIds = await db.supplierProducts
          .where("productId")
          .equals(product.id)
          .primaryKeys();

        if (supplierIds.length > 0) {
          const supplier = await db.suppliers.get(supplierIds[0][0]);
          if (supplier) {
            supplierMap[product.id] = supplier.companyName;
          }
        }
      }

      setProductSuppliers(supplierMap);
    };

    loadSuppliers();
  }, [products]);

  useEffect(() => {
    const initialize = async () => {
      await loadCustomCategories();
      if (!editingProduct) {
        resetForm();
      }
    };

    initialize();
  }, [rubro, isOpenModal, loadCustomCategories, editingProduct, resetForm]);

  useEffect(() => {
    if (rubro === "indumentaria") {
      loadClothingSizes();
    } else {
      setClothingSizes([]);
    }
  }, [rubro, products, loadClothingSizes]);

  const handleBrandChange = useCallback(
    (value: string | number) => {
      const stringValue = value.toString();
      setNewBrand(stringValue);
      if (stringValue) {
        updateField("brand", toCapitalize(stringValue));
      }
    },
    [updateField]
  );

  const handleColorChange = useCallback(
    (value: string | number) => {
      const stringValue = value.toString();
      setNewColor(stringValue);
      if (stringValue) {
        updateField("color", toCapitalize(stringValue));
      }
    },
    [updateField]
  );

  const handleSizeChange = useCallback(
    (value: string | number) => {
      const stringValue = value.toString();
      setNewSize(stringValue);
      updateField("size", toCapitalize(stringValue));
    },
    [updateField]
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
          Productos
        </Typography>

        {/* Header con búsqueda y acciones */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <SearchBar onSearch={handleSearch} />
            <AdvancedFilterPanel
              data={products}
              onApplyFilters={setFilters}
              onApplySort={handleSort}
              rubro={rubro}
            />
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            {/* Selector de lista de precios */}
            {rubro !== "Todos los rubros" && priceLists.length > 0 && (
              <Select
                label="Lista de precios"
                options={priceLists.map((list) => ({
                  value: list.id, // Esto puede ser string o number
                  label: `${list.name}${
                    list.isDefault ? " (Por defecto)" : ""
                  }`,
                  metadata: list,
                }))}
                value={selectedPriceListId || ""}
                onChange={(value) => {
                  // Convertir string a number si es necesario
                  const newValue = value ? Number(value) : null;
                  setSelectedPriceListId(newValue);
                }}
                fullWidth={false}
                sx={{ minWidth: 200 }}
                size="small"
                getOptionId={(option) => option.metadata?.id}
              />
            )}
            <Button
              variant="contained"
              onClick={handleAddProduct}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Añadir Producto [F2]
            </Button>
            <Button
              variant="contained"
              onClick={() => setIsSelectionModalOpen(true)}
              sx={{
                bgcolor: "secondary.main",
                "&:hover": { bgcolor: "secondary.dark" },
              }}
              startIcon={<Inventory2 fontSize="small" />}
            >
              Devoluciones [F3]
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenPriceModal}
              sx={{
                bgcolor: "info.main",
                "&:hover": { bgcolor: "info.dark" },
              }}
            >
              Ver Precio [F4]
            </Button>
          </Box>
        </Box>

        {/* Tabla de productos */}
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
              sx={{ maxHeight: "63vh", mb: 2, flex: 1 }}
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
                      Producto
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Stock
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Categoría
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Ubicación
                    </TableCell>

                    {rubro === "indumentaria" && (
                      <>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Talle
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Color
                        </TableCell>
                        <TableCell
                          sx={{
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                          }}
                          align="center"
                        >
                          Marca
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Temporada
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Precio costo
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Precio venta
                    </TableCell>
                    {rubro !== "indumentaria" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Vencimiento
                      </TableCell>
                    )}
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Proveedor
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={rubro === "indumentaria" ? 12 : 10}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            py: 4,
                          }}
                        >
                          <Box
                            sx={{
                              animation: "spin 1s linear infinite",
                              width: "32px",
                              height: "32px",
                              border: "2px solid",
                              borderColor: "primary.main transparent",
                              borderRadius: "50%",
                            }}
                          />
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : currentProducts.length > 0 ? (
                    currentProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        rubro={rubro}
                        onEdit={handleEditProduct}
                        onDelete={handleDeleteProduct}
                        onGenerateBarcode={handleGenerateBarcode}
                        supplierName={productSuppliers[product.id]}
                        currentPriceListId={selectedPriceListId}
                        productPrices={productPrices}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro === "indumentaria" ? 12 : 10}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <Inventory2
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>Todavía no hay productos.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {sortedProducts.length > 0 && (
            <Pagination
              text="Productos por página"
              text2="Total de productos"
              totalItems={sortedProducts.length}
            />
          )}
        </Box>

        {/* Modales */}
        <Modal
          isOpen={isSizeDeleteModalOpen}
          onClose={() => setIsSizeDeleteModalOpen(false)}
          title="Eliminar Talle"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsSizeDeleteModalOpen(false)}
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
                color="error"
                onClick={handleConfirmDeleteSize}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
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
              ¿Está seguro/a que desea eliminar el talle?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              El talle <strong>{sizeToDelete}</strong> será eliminado
              permanentemente.
            </Typography>
          </Box>
        </Modal>

        <Modal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          title="Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => setIsSelectionModalOpen(false)}
              isPrimaryAction={true}
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
          }
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setIsReturnModalOpen(true);
              }}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Devolver Producto
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setShowReturnsHistory(true);
              }}
              sx={{
                bgcolor: "secondary.main",
                "&:hover": { bgcolor: "secondary.dark" },
              }}
            >
              Ver Historial
            </Button>
          </Box>
        </Modal>

        <Modal
          isOpen={showReturnsHistory}
          onClose={() => setShowReturnsHistory(false)}
          title="Historial de Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => {
                setShowReturnsHistory(false);
                setIsSelectionModalOpen(true);
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
              Volver
            </Button>
          }
        >
          <div className="max-h-[55vh] overflow-y-auto">
            {returns.length > 0 ? (
              <table className="w-full border-collapse">
                <thead className="bg-blue_m text-white">
                  <tr>
                    <th className="p-2 text-left">Producto</th>
                    <th className="p-2 text-left">Motivo</th>
                    <th className="p-2">Cantidad</th>
                    <th className="p-2">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray_xl">
                  {returns
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((ret, index) => (
                      <tr
                        key={index}
                        className="hover:bg-gray_xxl dark:hover:bg-gray_m transition-all duration-300"
                      >
                        <td className="p-2">{ret.productName}</td>
                        <td className="p-2">{ret.reason}</td>
                        <td className="p-2 text-center">{ret.stockAdded}</td>
                        <td className="p-2 text-center">
                          {format(parseISO(ret.date), "dd/MM/yyyy HH:mm", {
                            locale: es,
                          })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-4">
                <Inventory2
                  sx={{ fontSize: 48, color: "gray_m", marginBottom: 2 }}
                />
                <p>No hay devoluciones registradas</p>
              </div>
            )}
          </div>
        </Modal>

        <Modal
          isOpen={isReturnModalOpen}
          onClose={() => {
            setIsReturnModalOpen(false);
            resetReturnData();
          }}
          title="Devolver Producto [F3]"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  resetReturnData();
                  setIsSelectionModalOpen(true);
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
                Volver
              </Button>
              <Button
                variant="contained"
                onClick={handleReturnProduct}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Confirmar Devolución
              </Button>
            </Box>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Seleccionar Producto
              </label>
              <Autocomplete
                options={sortedProducts.map((product) => ({
                  value: product,
                  label: getDisplayProductName(product, rubro, false),
                }))}
                value={
                  selectedReturnProduct
                    ? {
                        value: selectedReturnProduct,
                        label: getDisplayProductName(
                          selectedReturnProduct,
                          rubro,
                          false
                        ),
                      }
                    : null
                }
                onChange={(event, selectedOption) => {
                  setSelectedReturnProduct(selectedOption?.value || null);
                }}
                renderInput={(params) => (
                  <Input
                    {...params}
                    placeholder="Buscar producto..."
                    size="small"
                  />
                )}
                isOptionEqualToValue={(option, value) =>
                  option.value.id === value.value.id
                }
              />
            </div>

            {selectedReturnProduct && (
              <div className="mt-2 p-3 bg-blue_xl dark:bg-gray_m rounded-lg">
                <p className="font-semibold">Producto seleccionado:</p>
                <p>
                  {getDisplayProductName(selectedReturnProduct, rubro, false)}
                </p>
                <p>
                  Stock actual: {selectedReturnProduct.stock}{" "}
                  {selectedReturnProduct.unit}
                </p>
              </div>
            )}

            {selectedReturnProduct && (
              <div className="flex flex-col gap-2">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Cantidad a devolver
                </label>
                <div className="flex max-w-75">
                  <Input
                    type="number"
                    value={returnQuantity || ""}
                    onChange={(value) => {
                      const numValue = value === "" ? 1 : Number(value);
                      setReturnQuantity(numValue);
                    }}
                    size="small"
                    customSx={{ width: "160px" }}
                    step={
                      selectedReturnProduct?.unit === "Kg" ||
                      selectedReturnProduct?.unit === "L"
                        ? "0.001"
                        : "1"
                    }
                  />
                  <Select
                    label=""
                    value={returnUnit || selectedReturnProduct?.unit || ""}
                    options={getCompatibleUnits(
                      selectedReturnProduct?.unit || "Unid."
                    ).map((unit) => ({
                      value: unit.value,
                      label: unit.label,
                    }))}
                    onChange={(value) => setReturnUnit(value)}
                    size="small"
                    disabled
                    sx={{ width: "240px", marginLeft: "8px" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Motivo de la devolución
              </label>
              <Input
                type="text"
                placeholder="Ej: Producto defectuoso, cambio de talla, etc."
                value={returnReason}
                onChange={(value) => setReturnReason(value.toString())}
                fullWidth
                size="small"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isOpenModal}
          onConfirm={handleConfirmAddProduct}
          onClose={handleCloseModal}
          title={editingProduct ? "Editar Producto" : "Añadir Producto"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={handleCloseModal}
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
                onClick={handleConfirmAddProduct}
                disabled={isSaveDisabled}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                  "&:disabled": { bgcolor: "action.disabled" },
                }}
              >
                {editingProduct ? "Actualizar" : "Guardar"}
              </Button>
            </Box>
          }
        >
          <ProductForm
            formData={newProduct}
            onFieldChange={updateField}
            rubro={rubro}
            editingProduct={editingProduct}
            globalCustomCategories={globalCustomCategories}
            onAddCategory={handleAddCategory}
            onIvaChange={handleIvaCheckboxChange}
            onGenerateAutoBarcode={generateAutoBarcode}
            unitOptions={unitOptions}
            seasonOptions={seasonOptions}
            clothingSizes={clothingSizes}
            newBrand={newBrand}
            newColor={newColor}
            newSize={newSize}
            onBrandChange={handleBrandChange}
            onColorChange={handleColorChange}
            onSizeChange={handleSizeChange}
            onSizeBlur={handleSizeInputBlur}
            onCategoryDelete={handleDeleteCategoryClick}
          />
        </Modal>

        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          bgColor="bg-white dark:bg-gray_b"
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
                onClick={handleConfirmDeleteCategory}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Sí, eliminar
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

        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Producto"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsConfirmModalOpen(false)}
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
                onClick={handleConfirmDelete}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Sí, eliminar
              </Button>
            </Box>
          }
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea eliminar el producto?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              <strong>{productToDelete?.name}</strong> será eliminado
              permanentemente.
            </Typography>
          </Box>
        </Modal>

        <Modal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          title="Consultar precio"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              variant="text"
              onClick={() => setIsPriceModalOpen(false)}
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
          <div className="flex flex-col gap-2">
            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Código de Barras
              </label>
              <BarcodeScanner
                value={barcodeInput}
                onChange={(value) => setBarcodeInput(value)}
                onScanComplete={(code) => {
                  handleBarcodeScan(code);
                }}
              />
            </div>

            {scannedProduct && (
              <div className="mt-4 p-4 bg-blue_xl dark:bg-gray_b rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Producto
                    </p>
                    <p className="text-2xl font-semibold">
                      {getDisplayProductName(scannedProduct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Precio
                    </p>
                    <p className="text-lg font-semibold text-blue_b dark:text-blue_l">
                      {formatCurrency(scannedProduct.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_xl">
                      Stock
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        scannedProduct.stock > 0
                          ? "text-green_b dark:text-green_m"
                          : "text-red_b dark:text-red_m"
                      }`}
                    >
                      {scannedProduct.stock} {scannedProduct.unit}
                    </p>
                  </div>
                  {scannedProduct.expiration ? (
                    <div>
                      <p className="text-sm font-medium text-gray_m dark:text-gray_m">
                        Vencimiento
                      </p>
                      <p className="text-lg font-semibold">
                        {format(
                          parseISO(scannedProduct.expiration),
                          "dd/MM/yyyy",
                          { locale: es }
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <p className="text-md text-gray_l dark:text-gray_xl">
                        Sin fecha de vencimiento
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>

        {isBarcodeModalOpen && selectedProductForBarcode && (
          <BarcodeGenerator
            product={selectedProductForBarcode}
            onClose={() => setIsBarcodeModalOpen(false)}
            onBarcodeChange={(newBarcode) => {
              setProducts((prev) =>
                prev.map((p) =>
                  p.id === selectedProductForBarcode.id
                    ? { ...p, barcode: newBarcode }
                    : p
                )
              );

              db.products.update(selectedProductForBarcode.id, {
                barcode: newBarcode,
              });
            }}
          />
        )}

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

export default ProductsPage;
