"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
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
} from "@/app/lib/types/types";
import {
  Edit,
  Trash,
  PackageX,
  AlertTriangle,
  Barcode,
  Plus,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/app/database/db";
import SearchBar from "@/app/components/SearchBar";
import { parseISO, format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { isValid } from "date-fns";
import { formatCurrency } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { usePagination } from "@/app/context/PaginationContext";
import BarcodeGenerator from "@/app/components/BarcodeGenerator";
import AdvancedFilterPanel from "@/app/components/AdvancedFilterPanel";
import {
  convertFromBaseUnit,
  convertToBaseUnit,
} from "@/app/lib/utils/calculations";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";

const ProductsPage = () => {
  const { rubro } = useRubro();

  const [products, setProducts] = useState<Product[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    id: Date.now(),
    name: "",
    stock: 0,
    costPrice: 0,
    price: 0,
    hasIvaIncluded: true,
    expiration: "",
    quantity: 0,
    unit: "Unid.",
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const { currentPage, itemsPerPage } = usePagination();
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

  const IVA_PERCENTAGE = 21;

  const calculatePriceWithIva = (price: number): number => {
    return price * (1 + IVA_PERCENTAGE / 100);
  };

  const calculatePriceWithoutIva = (priceWithIva: number): number => {
    return priceWithIva / (1 + IVA_PERCENTAGE / 100);
  };
  const loadClothingSizes = async () => {
    try {
      // Obtener todos los productos de indumentaria
      const clothingProducts = await db.products
        .where("rubro")
        .equals("indumentaria")
        .toArray();

      // Extraer talles únicos de los productos
      const uniqueSizes = Array.from(
        new Set(
          clothingProducts
            .filter((product) => product.size && product.size.trim() !== "")
            .map((product) => product.size as string)
        )
      );

      // Crear opciones para los talles encontrados
      const sizeOptions = uniqueSizes
        .map((size) => ({ value: size, label: size }))
        .sort((a, b) => a.label.localeCompare(b.label));

      setClothingSizes(sizeOptions);
    } catch (error) {
      console.error("Error al cargar talles:", error);
    }
  };

  const handleIvaCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hasIvaIncluded = e.target.checked;

    setNewProduct((prev) => {
      let newCostPrice = prev.costPrice;
      let newPrice = prev.price;

      if (hasIvaIncluded && !prev.hasIvaIncluded) {
        // Si se activa el IVA, calcular precios con IVA
        newCostPrice = calculatePriceWithIva(prev.costPrice);
        newPrice = calculatePriceWithIva(prev.price);
      } else if (!hasIvaIncluded && prev.hasIvaIncluded) {
        // Si se desactiva el IVA, calcular precios sin IVA
        newCostPrice = calculatePriceWithoutIva(prev.costPrice);
        newPrice = calculatePriceWithoutIva(prev.price);
      }

      return {
        ...prev,
        hasIvaIncluded,
        costPrice: newCostPrice,
        price: newPrice,
        costPriceWithIva: hasIvaIncluded ? newCostPrice : prev.costPrice,
        priceWithIva: hasIvaIncluded ? newPrice : prev.price,
      };
    });
  };

  // Función para eliminar un talle
  const handleDeleteSize = async (sizeValue: string) => {
    setSizeToDelete(sizeValue);
    setIsSizeDeleteModalOpen(true);
  };
  const handleConfirmDeleteSize = async () => {
    if (!sizeToDelete) return;

    try {
      // Verificar si hay productos usando este talle
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

      // Eliminar el talle de la lista
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
  };

  useEffect(() => {
    if (rubro === "indumentaria") {
      loadClothingSizes();
    } else {
      setClothingSizes([]);
    }
  }, [rubro, products]);

  const handleReturnProduct = async () => {
    if (!selectedReturnProduct) {
      showNotification("Por favor seleccione un producto", "error");
      return;
    }

    try {
      // Obtener la cantidad actual del stock
      const currentStock = selectedReturnProduct.stock;

      // Validar que la cantidad a devolver sea válida
      if (returnQuantity <= 0) {
        showNotification("La cantidad debe ser mayor a 0", "error");
        return;
      }

      // Convertir la cantidad a devolver a la unidad base del producto
      const baseQuantity = convertToBaseUnit(returnQuantity, returnUnit);
      const currentStockInBase = convertToBaseUnit(
        currentStock,
        selectedReturnProduct.unit
      );

      // Obtener la caja diaria actual
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        showNotification("No hay caja abierta para hoy", "error");
        return;
      }

      // Calcular el monto a restar (precio de venta * cantidad)
      const amountToSubtract = selectedReturnProduct.price * returnQuantity;

      // Calcular la ganancia a restar (precio de venta - precio de costo) * cantidad
      const profitToSubtract =
        (selectedReturnProduct.price - selectedReturnProduct.costPrice) *
        returnQuantity;

      // Crear movimiento de egreso para la devolución
      const returnMovement: DailyCashMovement = {
        id: Date.now(),
        amount: amountToSubtract,
        description: `Devolución: ${getDisplayProductName(
          selectedReturnProduct,
          rubro,
          false
        )} - ${returnReason.trim() || "Sin motivo"}`,
        type: "EGRESO",
        paymentMethod: "EFECTIVO", // O el método de pago original si lo tienes
        date: new Date().toISOString(),
        productId: selectedReturnProduct.id,
        productName: getDisplayProductName(selectedReturnProduct, rubro, false),
        costPrice: selectedReturnProduct.costPrice,
        sellPrice: selectedReturnProduct.price,
        quantity: returnQuantity,
        profit: -profitToSubtract, // Ganancia negativa
        rubro: selectedReturnProduct.rubro || rubro,
        unit: selectedReturnProduct.unit,
      };

      // Actualizar la caja diaria
      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, returnMovement],
        totalExpense: (dailyCash.totalExpense || 0) + amountToSubtract,
        totalProfit: (dailyCash.totalProfit || 0) - profitToSubtract,
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      // Actualizar el stock del producto (SUMAR la cantidad devuelta)
      const updatedStock = convertFromBaseUnit(
        currentStockInBase + baseQuantity, // Cambiado de - a +
        selectedReturnProduct.unit
      );
      await db.products.update(selectedReturnProduct.id, {
        stock: parseFloat(updatedStock.toFixed(3)),
      });

      // Registrar la devolución
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

      // Actualizar la lista de productos
      setProducts(
        products.map((p) =>
          p.id === selectedReturnProduct.id ? { ...p, stock: updatedStock } : p
        )
      );

      showNotification(
        `Producto ${getDisplayProductName(
          selectedReturnProduct
        )} devuelto correctamente. Stock actualizado: ${updatedStock} ${
          selectedReturnProduct.unit
        }. Monto restado: ${formatCurrency(amountToSubtract)}`,
        "success"
      );

      // Resetear el formulario
      resetReturnData();
      setIsReturnModalOpen(false);
    } catch (error) {
      console.error("Error al devolver producto:", error);
      showNotification("Error al devolver el producto", "error");
    }
  };
  const resetReturnData = () => {
    setSelectedReturnProduct(null);
    setReturnReason("");
    setReturnQuantity(0);
    setReturnUnit("");
  };
  const handleSort = (sort: {
    field: keyof Product;
    direction: "asc" | "desc";
  }) => {
    setSortConfig(sort);
  };
  const handleSizeInputBlur = () => {
    if (newSize.trim() && newSize !== newProduct.size) {
      // Actualizar el producto con el nuevo talle
      setNewProduct({
        ...newProduct,
        size: newSize.trim(),
      });

      // Si el talle no existe en la lista, agregarlo
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
  };
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

  const selectedUnit =
    unitOptions.find((opt) => opt.value === newProduct.unit) ?? null;

  const seasonOptions = [
    { value: "todo el año", label: "Todo el año" },
    { value: "invierno", label: "Invierno" },
    { value: "otoño", label: "Otoño" },
    { value: "primavera", label: "Primavera" },
    { value: "verano", label: "Verano" },
  ];

  const checkProductLimit = async (rubro: Rubro) => {
    const products = await db.products.where("rubro").equals(rubro).count();
    return products >= 30;
  };
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
  const sortedProducts = useMemo(() => {
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
      const today = startOfDay(new Date());

      // Función para determinar el estado de expiración
      const getExpirationStatus = (product: Product) => {
        if (!product.expiration) return 3; // Sin vencimiento

        const expDate = startOfDay(parseISO(product.expiration));
        const diffDays = differenceInDays(expDate, today);

        if (diffDays < 0) return 0; // Expirado
        if (diffDays === 0) return 1; // Vence hoy
        if (diffDays <= 7) return 2; // Por vencer (en los próximos 7 días)
        return 3; // Sin vencimiento cercano
      };

      const statusA = getExpirationStatus(a);
      const statusB = getExpirationStatus(b);

      // Primero ordenar por estado de expiración
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
  }, [products, searchQuery, filters, sortConfig, rubro]);

  const handleDeleteCategoryClick = async (category: {
    name: string;
    rubro: Rubro;
  }) => {
    if (!category.name.trim()) return;

    setCategoryToDelete(category);
    setIsCategoryDeleteModalOpen(true);
  };

  const handleConfirmDeleteCategory = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!categoryToDelete) return;

    try {
      await db.customCategories
        .where("name")
        .equalsIgnoreCase(categoryToDelete.name)
        .and((cat) => cat.rubro === categoryToDelete.rubro)
        .delete();

      const allProducts = await db.products.toArray();

      const updatePromises = allProducts.map(async (product) => {
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

      setNewProduct((prev) => ({
        ...prev,
        customCategories: (prev.customCategories || []).filter(
          (cat) =>
            cat.name.toLowerCase() !== categoryToDelete.name.toLowerCase() ||
            cat.rubro !== categoryToDelete.rubro
        ),
      }));

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
  };

  const formatOptionLabel = ({
    value,
    label,
  }: {
    value: { name: string; rubro: Rubro };
    label: string;
  }) => {
    return (
      <div className="flex justify-between items-center w-full">
        <div>
          <span>{label}</span>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteCategoryClick(value);
          }}
          className="text-red_b hover:text-red_m ml-2 cursor-pointer p-1 rounded-full hover:bg-red_l"
          title="Eliminar categoría"
        >
          <Trash size={18} />
        </button>
      </div>
    );
  };
  const getCompatibleUnits = (productUnit: string): UnitOption[] => {
    const productUnitInfo =
      CONVERSION_FACTORS[productUnit as keyof typeof CONVERSION_FACTORS];
    if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);

    return unitOptions.filter((option) => {
      if (!option.convertible) return false;
      const optionInfo =
        CONVERSION_FACTORS[option.value as keyof typeof CONVERSION_FACTORS];
      return optionInfo?.base === productUnitInfo.base;
    });
  };

  const getUniqueOptions = (field: keyof Product) => {
    return Array.from(
      new Set(
        products
          .filter((p) => p.rubro === "indumentaria" && p[field])
          .map((p) => String(p[field]))
      )
    )
      .sort()
      .map((value) => ({ value, label: value }));
  };

  const colorOptions = getUniqueOptions("color");
  const brandOptions = getUniqueOptions("brand");

  const handleSearch = (query: string) => {
    setSearchQuery(query.toLowerCase());
  };
  const generateRandom13DigitCode = (): string => {
    const min = 1000000000000;
    const max = 9999999999999;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    return randomNum.toString();
  };

  const generateAutoBarcode = () => {
    const randomBarcode = generateRandom13DigitCode();
    setNewProduct({
      ...newProduct,
      barcode: randomBarcode,
    });
  };
  const handleGenerateBarcode = (product: Product) => {
    setSelectedProductForBarcode(product);
    setIsBarcodeModalOpen(true);
  };

  const handleOpenPriceModal = () => {
    setIsPriceModalOpen(true);
    setScannedProduct(null);
    setBarcodeInput("");
    setTimeout(() => {
      const input = document.getElementById("price-check-barcode");
      if (input) input.focus();
    }, 100);
  };

  const handleBarcodeScan = (code: string) => {
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
  };

  const hasChanges = (originalProduct: Product, updatedProduct: Product) => {
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
      originalProduct.customCategories !== updatedProduct.customCategories ||
      originalProduct.setMinStock !== updatedProduct.setMinStock ||
      originalProduct.minStock !== updatedProduct.minStock ||
      (rubro === "indumentaria" &&
        (originalProduct.category !== updatedProduct.category ||
          originalProduct.color !== updatedProduct.color ||
          originalProduct.size !== updatedProduct.size ||
          originalProduct.brand !== updatedProduct.brand)) ||
      originalProduct.season !== updatedProduct.season
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

  const handleAddProduct = async () => {
    const categories = await loadCustomCategories();
    setGlobalCustomCategories(categories);
    setIsOpenModal(true);
  };
  const handleAddCategory = async () => {
    if (!newProduct.customCategory?.trim()) return;

    const trimmedCategory = newProduct.customCategory.trim();
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

      setNewProduct((prev) => ({
        ...prev,
        customCategories: [newCategory],
        customCategory: "",
      }));

      showNotification("Categoría agregada correctamente", "success");
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      showNotification("Error al guardar la categoría", "error");
    }
  };

  const handleConfirmAddProduct = async () => {
    const authData = await db.auth.get(1);
    if (authData?.userId === 1) {
      const isLimitReached = await checkProductLimit(rubro);
      if (isLimitReached) {
        showNotification(
          `Límite alcanzado: máximo 30 productos por rubro para el administrador`,
          "error"
        );
        return;
      }
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

    if (
      !newProduct.name ||
      !newProduct.stock ||
      !newProduct.costPrice ||
      !newProduct.price ||
      !newProduct.unit ||
      !newProduct.customCategories?.length
    ) {
      showNotification(
        "Por favor, complete todos los campos obligatorios",
        "error"
      );
      return;
    }

    try {
      if (editingProduct) {
        await db.products.update(editingProduct.id, productToSave);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? productToSave : p))
        );
      } else {
        const id = await db.products.add(productToSave);
        setProducts((prev) => [...prev, { ...productToSave, id: Number(id) }]);
      }

      const updatedCategories = await loadCustomCategories();
      setGlobalCustomCategories(updatedCategories);

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
  };

  const handleConfirmDelete = async () => {
    if (productToDelete) {
      await db.products.delete(productToDelete.id);
      setProducts(products.filter((p) => p.id !== productToDelete.id));
      showNotification(`Producto ${productToDelete.name} eliminado`, "success");
      setProductToDelete(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setNewBrand("");
    setNewSize("");
    setNewColor("");
    setNewProduct({
      id: Date.now(),
      name: "",
      stock: 0,
      costPrice: 0,
      price: 0,
      expiration: "",
      quantity: 0,
      unit: "Unid.",
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
    });
    setEditingProduct(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setNewProduct({
      ...newProduct,
      [name]:
        name === "costPrice" || name === "price" || name === "stock"
          ? Number(value) || 0
          : value,
    });
  };

  const handleEditProduct = async (product: Product) => {
    const categories = await loadCustomCategories();
    setGlobalCustomCategories(categories);

    setEditingProduct(product);
    setNewBrand(product.brand || "");
    setNewColor(product.color || "");

    let categoriesToSet = (product.customCategories || []).map((cat) => ({
      name: cat.name,
      rubro: cat.rubro || product.rubro || rubro || "comercio",
    }));

    if (categoriesToSet.length === 0 && product.category) {
      categoriesToSet = [
        {
          name: product.category,
          rubro: product.rubro || rubro || "comercio",
        },
      ];
    }

    const hasIvaIncluded =
      product.hasIvaIncluded !== undefined ? product.hasIvaIncluded : true;

    setNewProduct({
      ...product,
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
  };
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
  };
  const loadCustomCategories = async () => {
    try {
      const storedCategories = await db.customCategories.toArray();
      const allProducts = await db.products.toArray();
      const allCategories = new Map<string, { name: string; rubro: Rubro }>();

      // Agregar categorías almacenadas
      storedCategories.forEach((cat) => {
        if (cat.name?.trim()) {
          const key = `${cat.name.toLowerCase().trim()}_${cat.rubro}`;
          allCategories.set(key, {
            name: cat.name.trim(),
            rubro: cat.rubro || "comercio",
          });
        }
      });

      // Agregar categorías de productos (tanto customCategories como category)
      allProducts.forEach((product) => {
        // Procesar customCategories
        if (product.customCategories?.length) {
          product.customCategories.forEach((cat) => {
            if (cat.name?.trim()) {
              const key = `${cat.name.toLowerCase().trim()}_${
                cat.rubro || product.rubro || "comercio"
              }`;
              if (!allCategories.has(key)) {
                allCategories.set(key, {
                  name: cat.name.trim(),
                  rubro: cat.rubro || product.rubro || "comercio",
                });
              }
            }
          });
        }

        // Procesar category heredada
        if (product.category?.trim()) {
          const key = `${product.category.toLowerCase().trim()}_${
            product.rubro || "comercio"
          }`;
          if (!allCategories.has(key)) {
            allCategories.set(key, {
              name: product.category.trim(),
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
  };
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        setIsSelectionModalOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    if (editingProduct) {
      setIsSaveDisabled(!hasChanges(editingProduct, newProduct));
    } else {
      setIsSaveDisabled(
        !newProduct.name ||
          !newProduct.stock ||
          !newProduct.costPrice ||
          !newProduct.price ||
          !newProduct.unit
      );
    }
  }, [newProduct, editingProduct]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedProducts = await db.products.toArray();
        const storedReturns = await db.returns.toArray();

        setProducts(
          storedProducts
            .map((p) => ({
              ...p,
              id: Number(p.id),
              customCategories: (p.customCategories || []).filter(
                (cat) => cat.name && cat.name.trim()
              ),
            }))
            .sort((a, b) => b.id - a.id)
        );

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
  }, []);
  useEffect(() => {
    const fetchCategories = async () => {
      const categories = await loadCustomCategories();
      setGlobalCustomCategories(categories);
    };
    if (isOpenModal) {
      fetchCategories();
    }
  }, [rubro, isOpenModal]);

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
        setNewProduct((prev) => ({
          ...prev,
          rubro: rubro,
          customCategories: (prev.customCategories || [])
            .filter(
              (cat) => cat.rubro === rubro || cat.rubro === "Todos los rubros"
            )
            .map((cat) => ({
              name: cat.name,
              rubro: cat.rubro || rubro,
            })),
        }));
      }
    };

    initialize();
  }, [rubro, isOpenModal]);

  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(sortedProducts.length / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Productos</h1>

        <div className="flex justify-between mb-2 w-full">
          <div className="w-full flex items-center gap-2">
            <SearchBar onSearch={handleSearch} />

            <AdvancedFilterPanel
              data={products}
              onApplyFilters={setFilters}
              onApplySort={handleSort}
              rubro={rubro}
            />
          </div>
          <div
            className={`w-full flex justify-end items-center mt-3 gap-2 ${
              rubro === "Todos los rubros" ? "hidden" : ""
            } `}
          >
            <Button
              text="Añadir Producto [F2]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddProduct}
              hotkey="F2"
            />
            <Button
              text="Devoluciones [F3]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => setIsSelectionModalOpen(true)}
              hotkey="F3"
            >
              <PackageX size={18} />
            </Button>
            <Button
              text="Ver Precio [F4]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleOpenPriceModal}
              hotkey="F4"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]  ">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className=" table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-xs">
                <tr>
                  <th className="p-2 text-start">Producto</th>
                  <th className="p-2">Stock </th>
                  <th className="p-2 cursor-pointer">Categoría</th>
                  <th className="p-2 cursor-pointer">Ubicación</th>

                  {rubro === "indumentaria" && (
                    <>
                      <th className="p-2">Talle</th>
                      <th className="p-2">Color</th>
                      <th className="p-2">Marca</th>
                    </>
                  )}
                  <th className="p-2">Temporada</th>
                  <th className="p-2">Precio costo</th>
                  <th className="p-2">Precio venta</th>
                  {rubro !== "indumentaria" && (
                    <th className="p-2">Vencimiento</th>
                  )}
                  <th className="p-2">Proveedor</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="w-30 max-w-[4rem] 2xl:max-w-[10rem] p-2">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody
                className={`bg-white text-gray_b divide-y divide-gray_xl `}
              >
                {sortedProducts.length > 0 ? (
                  sortedProducts
                    .slice(indexOfFirstProduct, indexOfLastProduct)
                    .map((product, index) => {
                      const expirationDate = product.expiration
                        ? startOfDay(parseISO(product.expiration))
                        : null;
                      const today = startOfDay(new Date());

                      let daysUntilExpiration = null;
                      if (expirationDate) {
                        daysUntilExpiration = differenceInDays(
                          expirationDate,
                          today
                        );
                      }

                      const expiredToday = daysUntilExpiration === 0;
                      const isExpired =
                        daysUntilExpiration !== null && daysUntilExpiration < 0;
                      const isExpiringSoon =
                        daysUntilExpiration !== null &&
                        daysUntilExpiration > 0 &&
                        daysUntilExpiration <= 7;

                      return (
                        <tr
                          key={index}
                          className={`border border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300 text-xs 2xl:text-sm ${
                            isExpired
                              ? "border-l-2 border-l-red_m text-gray_b bg-white animate-pulse"
                              : expiredToday
                              ? "border-l-2 border-l-red_m text-white  bg-red_m hover:bg-red_m dark:hover:bg-red_m "
                              : isExpiringSoon
                              ? "border-l-2 border-l-red_m text-gray_b bg-red_l hover:bg-red_l dark:hover:bg-red_l"
                              : "text-gray_b hover:text-gray_b bg-white "
                          }`}
                        >
                          <td className="font-semibold px-2 text-start capitalize border border-gray_xl">
                            <div className="flex items-center gap-2 h-full">
                              {expiredToday && (
                                <AlertTriangle
                                  className="text-yellow_m dark:text-yellow_b"
                                  size={18}
                                />
                              )}
                              {isExpiringSoon && (
                                <AlertTriangle
                                  className="text-yellow_b"
                                  size={18}
                                />
                              )}
                              {isExpired && (
                                <AlertTriangle
                                  className="text-red_m dark:text-yellow_m"
                                  size={18}
                                />
                              )}
                              <span className="leading-tight">
                                {getDisplayProductName(product, rubro, false)}
                              </span>
                            </div>
                          </td>
                          <td
                            className={`${
                              !isNaN(Number(product.stock)) &&
                              Number(product.stock) > 0
                                ? product.setMinStock &&
                                  product.minStock &&
                                  product.stock < product.minStock
                                  ? "text-white font-semibold bg-blue_m"
                                  : ""
                                : "text-red_b"
                            } p-2 border border-gray_xl relative`}
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">
                                {!isNaN(Number(product.stock)) &&
                                Number(product.stock) > 0
                                  ? `${product.stock} ${product.unit}`
                                  : "Agotado"}
                              </span>

                              {product.setMinStock &&
                                product.minStock &&
                                product.stock < product.minStock && (
                                  <span className="text-xs text-blue_xl font-medium mt-1">
                                    Stock por debajo del mínimo
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="p-2 border border-gray_xl capitalize">
                            {product.customCategories?.[0]?.name || "-"}
                          </td>
                          <td className="p-2 border border-gray_xl">
                            {product.location || "-"}
                          </td>

                          {rubro === "indumentaria" && (
                            <>
                              <td className="p-2 border border-gray_xl">
                                {product.size || "-"}
                              </td>
                              <td className="p-2 border border-gray_xl capitalize">
                                {product.color || "-"}
                              </td>

                              <td className="p-2 border border-gray_xl capitalize">
                                {product.brand || "-"}
                              </td>
                            </>
                          )}
                          <td className="p-2 border border-gray_xl capitalize">
                            {product.season || "-"}
                          </td>

                          <td className="p-2 border border-gray_xl">
                            {formatCurrency(product.costPrice)}
                          </td>
                          <td className="p-2 border border-gray_xl">
                            {formatCurrency(product.price)}
                          </td>
                          {rubro !== "indumentaria" && (
                            <td className="p-2 border border-gray_xl font-semibold">
                              {product.expiration &&
                              isValid(parseISO(product.expiration))
                                ? format(
                                    parseISO(product.expiration),
                                    "dd/MM/yyyy",
                                    { locale: es }
                                  )
                                : "-"}
                              {isExpiringSoon && (
                                <span className=" ml-2 text-red_m">
                                  (Por vencer)
                                </span>
                              )}
                              {expirationDate && expiredToday && (
                                <span className="animate-pulse ml-2 text-white">
                                  (Vence Hoy)
                                </span>
                              )}
                              {expirationDate && isExpired && (
                                <span className="ml-2 text-red_b">
                                  (Vencido)
                                </span>
                              )}
                            </td>
                          )}
                          <td className="p-2 border border-gray_xl">
                            {productSuppliers[product.id] || "-"}
                          </td>
                          {rubro !== "Todos los rubros" && (
                            <td className="p-2 flex justify-center gap-2">
                              <Button
                                icon={<Barcode size={18} />}
                                colorText={isExpired ? "text-gray_b" : ""}
                                colorTextHover="hover:text-white"
                                colorBg="bg-transparent"
                                px="px-1"
                                py="py-1"
                                minwidth="min-w-0"
                                onClick={() => handleGenerateBarcode(product)}
                                title="Código de Barras"
                              />
                              <Button
                                icon={<Edit size={18} />}
                                colorText={isExpired ? "text-gray_b" : ""}
                                colorTextHover="hover:text-white"
                                colorBg="bg-transparent"
                                px="px-1"
                                py="py-1"
                                minwidth="min-w-0"
                                onClick={() => handleEditProduct(product)}
                                title="Editar Producto"
                              />
                              <Button
                                icon={<Trash size={18} />}
                                colorText="text-gray_b"
                                colorTextHover="hover:text-white"
                                colorBg="bg-transparent"
                                colorBgHover="hover:bg-red_m"
                                px="px-1"
                                py="py-1"
                                minwidth="min-w-0"
                                onClick={() => handleDeleteProduct(product)}
                                title="Eliminar Producto"
                              />
                            </td>
                          )}
                        </tr>
                      );
                    })
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td
                      colSpan={rubro === "indumentaria" ? 12 : 10}
                      className="py-4 text-center"
                    >
                      <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                        <PackageX size={64} className="mb-4 text-gray_m" />
                        <p className="text-gray_m">Todavía no hay productos.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {sortedProducts.length > 0 && (
            <Pagination
              text="Productos por página"
              text2="Total de productos"
              totalItems={sortedProducts.length}
            />
          )}
        </div>
        <Modal
          isOpen={isSelectionModalOpen}
          onClose={() => setIsSelectionModalOpen(false)}
          title="Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <>
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsSelectionModalOpen(false)}
              />
            </>
          }
        >
          <div className="flex  justify-center items-center gap-4 p-4">
            <Button
              text="Devolver Producto"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setIsReturnModalOpen(true);
              }}
            />
            <Button
              text="Ver Historial"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => {
                setIsSelectionModalOpen(false);
                setShowReturnsHistory(true);
              }}
            />
          </div>
        </Modal>
        <Modal
          isOpen={showReturnsHistory}
          onClose={() => setShowReturnsHistory(false)}
          title="Historial de Devoluciones"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              text="Volver"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
              onClick={() => {
                setShowReturnsHistory(false);
                setIsSelectionModalOpen(true);
              }}
              hotkey="Escape"
            />
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
                        className="hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
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
                <PackageX size={48} className="mx-auto text-gray_m mb-2" />
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
            <>
              <Button
                text="Confirmar Devolución"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleReturnProduct}
                hotkey="Enter"
              />
              <Button
                text="Volver"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => {
                  setIsReturnModalOpen(false);
                  resetReturnData();
                  setIsSelectionModalOpen(true);
                }}
                hotkey="Escape"
              />
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-gray_m dark:text-white text-sm font-semibold">
                Seleccionar Producto
              </label>
              <Select
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
                onChange={(selectedOption) => {
                  setSelectedReturnProduct(selectedOption?.value || null);
                }}
                placeholder="Buscar producto..."
                className="text-gray_m"
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
                <label className="block text-gray_m dark:text-white text-sm font-semibold ">
                  Cantidad a devolver
                </label>
                <div className="flex max-w-75">
                  <Input
                    width="w-40"
                    type="number"
                    value={returnQuantity || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || !isNaN(Number(value))) {
                        setReturnQuantity(value === "" ? 1 : Number(value));
                      }
                    }}
                    step={
                      selectedReturnProduct?.unit === "Kg" ||
                      selectedReturnProduct?.unit === "L"
                        ? "0.001"
                        : "1"
                    }
                  />
                  <Select
                    options={getCompatibleUnits(
                      selectedReturnProduct?.unit || "Unid."
                    )}
                    noOptionsMessage={() => "Sin opciones"}
                    value={unitOptions.find(
                      (opt) =>
                        opt.value ===
                        (returnUnit || selectedReturnProduct?.unit)
                    )}
                    onChange={(selectedOption) => {
                      setReturnUnit(
                        selectedOption?.value || selectedReturnProduct?.unit
                      );
                    }}
                    className="text-gray_m w-60"
                    isDisabled
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
                name="returnReason"
                placeholder="Ej: Producto defectuoso, cambio de talla, etc."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
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
            <>
              <Button
                text={editingProduct ? "Actualizar" : "Guardar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmAddProduct}
                disabled={editingProduct ? isSaveDisabled : false}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={handleCloseModal}
              />
            </>
          }
        >
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="w-full flex items-center space-x-4 ">
              <div className="w-full">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Código de Barras
                </label>
                <div className="flex items-center gap-2">
                  <BarcodeScanner
                    value={newProduct.barcode || ""}
                    onChange={(value) => {
                      setNewProduct({ ...newProduct, barcode: value });
                    }}
                    onScanComplete={(code) => {
                      const existingProduct = products.find(
                        (p) => p.barcode === code
                      );
                      if (existingProduct) {
                        setNewProduct({
                          ...existingProduct,
                          id: editingProduct ? existingProduct.id : Date.now(),
                          barcode: existingProduct.barcode,
                        });
                        setEditingProduct(existingProduct);
                        showNotification("Producto encontrado", "success");
                      } else if (editingProduct) {
                        setNewProduct({
                          ...newProduct,
                          barcode: code,
                        });
                      }
                    }}
                  />
                  <Button
                    text="Generar código"
                    colorText="text-white"
                    colorTextHover="text-white"
                    colorBg="bg-blue_b"
                    colorBgHover="hover:bg-blue_m"
                    onClick={generateAutoBarcode}
                  />
                </div>
              </div>
              <div className="w-full flex items-center space-x-2">
                <div className="w-full">
                  <Input
                    label="Lote"
                    type="text"
                    name="lot"
                    placeholder="Nro. de lote"
                    value={newProduct.lot || ""}
                    onChange={handleInputChange}
                  />
                </div>
                <Input
                  label="Nombre del producto*"
                  type="text"
                  name="name"
                  placeholder="Nombre del producto"
                  value={newProduct.name}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 w-full">
                <Input
                  label="Ubicación"
                  type="text"
                  name="location"
                  placeholder="Ej: Estante 2, Piso 1"
                  value={newProduct.location || ""}
                  onChange={handleInputChange}
                />
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold">
                    Temporada
                  </label>
                  <Select
                    options={seasonOptions}
                    noOptionsMessage={() => "Sin opciones"}
                    value={
                      newProduct.season
                        ? seasonOptions.find(
                            (opt) => opt.value === newProduct.season
                          )
                        : null
                    }
                    onChange={(selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        season: selectedOption?.value || "",
                      });
                    }}
                    placeholder="Temporada"
                    className="text-gray_m"
                    isClearable
                  />
                </div>
              </div>
              {!editingProduct && (
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold">
                    Crear categoría
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      name="customCategory"
                      placeholder="Nueva categoría"
                      value={newProduct.customCategory || ""}
                      onChange={handleInputChange}
                    />
                    <Button
                      text="Agregar"
                      icon={<Plus size={18} />}
                      colorText="text-white"
                      colorTextHover="text-white"
                      colorBg="bg-blue_b"
                      colorBgHover="hover:bg-blue_m"
                      onClick={handleAddCategory}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2  ">
              <div className="w-full">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Seleccionar categoría*
                </label>
                <Select
                  options={[
                    ...globalCustomCategories
                      .filter(
                        (cat) =>
                          cat.rubro === rubro ||
                          cat.rubro === "Todos los rubros"
                      )
                      .map((cat) => ({
                        value: cat,
                        label: cat.name,
                      })),

                    ...(editingProduct?.category &&
                    !globalCustomCategories.some(
                      (c) =>
                        c.name.toLowerCase() ===
                          editingProduct.category?.toLowerCase() &&
                        c.rubro === (editingProduct.rubro || rubro)
                    )
                      ? [
                          {
                            value: {
                              name: editingProduct.category,
                              rubro: editingProduct.rubro || rubro,
                            },
                            label: `${editingProduct.category}`,
                          },
                        ]
                      : []),
                  ]}
                  noOptionsMessage={() => "Sin opciones"}
                  value={
                    newProduct.customCategories?.[0]
                      ? {
                          value: newProduct.customCategories[0],
                          label: newProduct.customCategories[0].name,
                        }
                      : editingProduct?.category
                      ? {
                          value: {
                            name: editingProduct.category,
                            rubro: editingProduct.rubro || rubro,
                          },
                          label: `${editingProduct.category}`,
                        }
                      : null
                  }
                  onChange={(selectedOption) => {
                    setNewProduct((prev) => ({
                      ...prev,
                      customCategories: selectedOption
                        ? [selectedOption.value]
                        : [],
                      category: "",
                    }));
                  }}
                  placeholder="Seleccionar categoría"
                  className="w-full text-gray_b"
                  formatOptionLabel={formatOptionLabel}
                  isClearable
                />
              </div>
              {rubro === "indumentaria" ? (
                <>
                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold">
                      Talle
                    </label>
                    <div className="flex gap-2">
                      <Select
                        options={clothingSizes}
                        noOptionsMessage={() => "Sin opciones"}
                        value={
                          clothingSizes.find(
                            (opt) => opt.value === newProduct.size
                          ) || null
                        }
                        onChange={(selectedOption) => {
                          setNewProduct({
                            ...newProduct,
                            size: selectedOption?.value || "",
                          });
                          setNewSize("");
                        }}
                        className="text-gray_m w-full"
                        placeholder="Seleccionar talle"
                        formatOptionLabel={({ value, label }) => (
                          <div className="flex justify-between items-center w-full">
                            <div>
                              <span>{label}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteSize(value);
                              }}
                              className="text-red_b hover:text-red_m ml-2 cursor-pointer p-1 rounded-full hover:bg-red_l"
                              title="Eliminar talle"
                            >
                              <Trash size={18} />
                            </button>
                          </div>
                        )}
                      />
                      <div className="w-full -mt-5">
                        <label className="block text-gray_m dark:text-white text-sm font-semibold">
                          {newProduct.size === ""
                            ? "Crear talle"
                            : "Editar talle"}
                        </label>
                        <Input
                          type="text"
                          name="newSize"
                          placeholder={
                            newProduct.size === ""
                              ? "Nuevo talle"
                              : "Editar talle"
                          }
                          value={newSize}
                          onChange={(e) => {
                            const value = e.target.value;
                            setNewSize(value);
                            setNewProduct({
                              ...newProduct,
                              size: value,
                            });
                          }}
                          onBlur={handleSizeInputBlur}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <Select
                        options={colorOptions}
                        noOptionsMessage={() => "Sin opciones"}
                        value={
                          newProduct.color
                            ? {
                                value: newProduct.color,
                                label: newProduct.color,
                              }
                            : null
                        }
                        onChange={(selectedOption) => {
                          setNewProduct({
                            ...newProduct,
                            color: selectedOption?.value || "",
                          });
                          setNewColor("");
                        }}
                        placeholder="Color existente"
                        isClearable
                        className="w-full text-gray_b"
                      />
                      <div className="w-full -mt-5">
                        <label className="block text-gray_m dark:text-white text-sm font-semibold">
                          {newProduct.color === ""
                            ? "Crear color"
                            : "Editar color"}
                        </label>
                        <Input
                          type="text"
                          name="newColor"
                          placeholder={
                            newProduct.color === ""
                              ? "Nuevo color"
                              : "Editar color"
                          }
                          value={newColor}
                          onChange={(e) => {
                            setNewColor(e.target.value);
                            if (e.target.value) {
                              setNewProduct({
                                ...newProduct,
                                color: e.target.value,
                              });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold">
                      Marca
                    </label>
                    <div className="flex gap-2">
                      <Select
                        options={brandOptions}
                        noOptionsMessage={() => "Sin opciones"}
                        value={
                          newProduct.brand
                            ? {
                                value: newProduct.brand,
                                label: newProduct.brand,
                              }
                            : null
                        }
                        onChange={(selectedOption) => {
                          setNewProduct({
                            ...newProduct,
                            brand: selectedOption?.value || "",
                          });
                          setNewBrand("");
                        }}
                        placeholder="Marca existente"
                        isClearable
                        className="w-full text-gray_b"
                      />
                      <div className="w-full -mt-5">
                        <label className="block text-gray_m dark:text-white text-sm font-semibold">
                          {newProduct.brand === ""
                            ? "Crear marca"
                            : "Editar marca"}
                        </label>
                        <Input
                          type="text"
                          name="newBrand"
                          placeholder={
                            newProduct.brand === ""
                              ? "Nueva marca"
                              : "Editar marca"
                          }
                          value={newBrand}
                          onChange={(e) => {
                            setNewBrand(e.target.value);
                            if (e.target.value) {
                              setNewProduct({
                                ...newProduct,
                                brand: e.target.value,
                              });
                            }
                          }}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold">
                    Unidad*
                  </label>
                  <Select
                    options={unitOptions}
                    noOptionsMessage={() => "Sin opciones"}
                    value={selectedUnit}
                    onChange={(selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        unit: selectedOption?.value as Product["unit"],
                      });
                    }}
                    className="text-gray_m"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-full flex items-center space-x-4">
                <div className="flex items-center w-1/2">
                  <InputCash
                    label="Precio de costo*"
                    value={newProduct.costPrice}
                    onChange={(value) =>
                      setNewProduct({ ...newProduct, costPrice: value })
                    }
                  />
                </div>
                <div className="flex items-center w-1/2 gap-2">
                  <div className="flex items-center w-1/2">
                    <InputCash
                      label="Precio de venta*"
                      value={newProduct.price}
                      onChange={(value) =>
                        setNewProduct({ ...newProduct, price: value })
                      }
                    />
                  </div>
                  <div className="flex items-center space-x-2 min-w-60 mt-5">
                    <input
                      type="checkbox"
                      id="hasIvaIncluded"
                      name="hasIvaIncluded"
                      checked={newProduct.hasIvaIncluded || false}
                      onChange={handleIvaCheckboxChange}
                      className="cursor-pointer w-4 h-4 text-blue_b bg-gray_xxl border-gray_l rounded "
                    />
                    <label
                      htmlFor="hasIvaIncluded"
                      className="text-sm text-gray_m dark:text-white"
                    >
                      Incluir IVA
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {rubro !== "indumentaria" ? (
              <div className="flex items-center space-x-4 ">
                <CustomDatePicker
                  value={newProduct.expiration || ""}
                  onChange={(newDate) => {
                    setNewProduct({ ...newProduct, expiration: newDate });
                  }}
                  isClearable={true}
                />
              </div>
            ) : null}
            <div className="w-full flex items-center space-x-4">
              <div className="w-1/2">
                <Input
                  label="Stock*"
                  type="number"
                  name="stock"
                  placeholder="Stock"
                  value={newProduct.stock.toString()}
                  onChange={handleInputChange}
                />
              </div>

              <div className="w-1/2 flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="setMinStock"
                    name="setMinStock"
                    checked={newProduct.setMinStock || false}
                    onChange={(e) => {
                      setNewProduct({
                        ...newProduct,
                        setMinStock: e.target.checked,
                        minStock: e.target.checked
                          ? newProduct.minStock || 1
                          : 0, // Cambiar a 1 por defecto
                      });
                    }}
                    className="cursor-pointer w-4 h-4 text-blue_b bg-gray_xxl border-gray_l rounded"
                  />
                  <label
                    htmlFor="setMinStock"
                    className="text-sm text-gray_m dark:text-white"
                  >
                    Setear stock mínimo
                  </label>
                </div>

                {newProduct.setMinStock && (
                  <div className="w-full">
                    <Input
                      label="Stock Mínimo*"
                      type="number"
                      name="minStock"
                      placeholder="Stock mínimo requerido"
                      value={newProduct.minStock?.toString() || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProduct({
                          ...newProduct,
                          minStock: value === "" ? 1 : Number(value),
                        });
                      }}
                      step="1"
                    />
                    {newProduct.setMinStock &&
                      (!newProduct.minStock || newProduct.minStock <= 0) && (
                        <p className="text-red-500 text-xs mt-1">
                          El stock mínimo debe ser mayor a 0
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>
          </form>
        </Modal>
        <Modal
          isOpen={isSizeDeleteModalOpen}
          onClose={() => setIsSizeDeleteModalOpen(false)}
          title="Eliminar Talle"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <>
              <Button
                text="Confirmar"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={handleConfirmDeleteSize}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsSizeDeleteModalOpen(false)}
              />
            </>
          }
        >
          <div className="space-y-4">
            <p>
              ¿Está seguro que desea eliminar el talle{" "}
              <span className="font-bold">{sizeToDelete}</span>?
            </p>
            <div className="bg-yellow-50 dark:bg-gray_b p-3 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="inline mr-2" size={18} />
                Solo se pueden eliminar talles que no estén siendo utilizados
                por ningún producto.
              </p>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isCategoryDeleteModalOpen}
          onClose={() => setIsCategoryDeleteModalOpen(false)}
          title="Eliminar Categoría"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <>
              <Button
                text="Confirmar"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={(e) => {
                  e?.preventDefault();
                  handleConfirmDeleteCategory();
                }}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={(e) => {
                  e?.preventDefault();
                  setIsCategoryDeleteModalOpen(false);
                }}
              />
            </>
          }
        >
          <div className="space-y-4">
            <p>
              ¿Está seguro que desea eliminar la categoría{" "}
              <span className="font-bold">{categoryToDelete?.name}</span>?
            </p>

            {categoryToDelete && (
              <div className="bg-yellow-50 dark:bg-gray_b p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="inline mr-2" size={18} />
                  Esta acción afectará a todos los productos con esta categoría.
                </p>
              </div>
            )}
          </div>
        </Modal>
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Producto"
          bgColor="bg-white dark:bg-gray_b"
          onConfirm={handleConfirmDelete}
          buttons={
            <>
              <Button
                text="Si"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={handleConfirmDelete}
              />
              <Button
                text="No"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsConfirmModalOpen(false)}
              />
            </>
          }
        >
          <p>¿Desea eliminar el producto {productToDelete?.name}?</p>
        </Modal>
        <Modal
          isOpen={isPriceModalOpen}
          onClose={() => setIsPriceModalOpen(false)}
          title="Consultar Precio de Producto"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Button
              text="Cerrar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
              onClick={() => setIsPriceModalOpen(false)}
            />
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
                    <div className="flex items-center ">
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
          type={type}
        />
      </div>
    </ProtectedRoute>
  );
};

export default ProductsPage;
