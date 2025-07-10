"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  ClothingSizeOption,
  Product,
  ProductFilters,
  Rubro,
  UnitOption,
} from "@/app/lib/types/types";
import { Edit, Trash, PackageX, AlertTriangle, Barcode } from "lucide-react";
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

const clothingSizes: ClothingSizeOption[] = [
  { value: "XXS", label: "XXS" },
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "XXXL", label: "XXXL" },
  { value: "34", label: "34" },
  { value: "36", label: "36" },
  { value: "38", label: "38" },
  { value: "40", label: "40" },
  { value: "42", label: "42" },
  { value: "44", label: "44" },
  { value: "46", label: "46" },
  { value: "unico", label: "Único" },
  { value: "kids", label: "Kids" },
  { value: "prematuro", label: "Prematuro" },
];

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
  const [sortConfig, setSortConfig] = useState<{
    field: keyof Product;
    direction: "asc" | "desc";
  }>({
    field: "name",
    direction: "asc",
  });

  const [filters, setFilters] = useState<ProductFilters>([]);
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

  const handleSort = (sort: {
    field: keyof Product;
    direction: "asc" | "desc";
  }) => {
    setSortConfig(sort);
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
    return products >= 20;
  };
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
              : product[filter.field];

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

      const getExpirationStatus = (product: Product) => {
        if (!product.expiration) return 3;

        const expDate = startOfDay(parseISO(product.expiration));
        const diffDays = differenceInDays(expDate, today);

        if (diffDays < 0) return 0;
        if (diffDays === 0) return 1;
        return 2;
      };

      const statusA = getExpirationStatus(a);
      const statusB = getExpirationStatus(b);

      if (statusA === statusB) {
        let compareResult = 0;
        switch (sortConfig.field) {
          case "name":
            compareResult = a.name.localeCompare(b.name);
            break;
          case "price":
            compareResult = Number(a.price) - Number(b.price);
            break;
          case "stock":
            compareResult = a.stock - b.stock;
            break;
          default:
            compareResult = 0;
        }
        return sortConfig.direction === "asc" ? compareResult : -compareResult;
      }

      return statusA - statusB;
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
          <Trash size={16} />
        </button>
      </div>
    );
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
      originalProduct.expiration !== updatedProduct.expiration ||
      originalProduct.unit !== updatedProduct.unit ||
      originalProduct.barcode !== updatedProduct.barcode ||
      originalProduct.category !== updatedProduct.category ||
      originalProduct.lot !== updatedProduct.lot ||
      originalProduct.location !== updatedProduct.location ||
      originalProduct.customCategories !== updatedProduct.customCategories ||
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

  const handleAddProduct = () => {
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
    if (authData?.userId === 2) {
      const isLimitReached = await checkProductLimit(rubro);
      if (isLimitReached) {
        showNotification(
          `Límite alcanzado: máximo 20 productos por rubro para el administrador`,
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
      !productToSave.name ||
      !productToSave.stock ||
      !productToSave.costPrice ||
      !productToSave.price ||
      !productToSave.unit
    ) {
      showNotification("Por favor, complete todos los campos", "error");
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
    await loadCustomCategories();

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

    setNewProduct({
      ...product,
      customCategories: categoriesToSet,
      category: "",
      customCategory: "",
      size: product.size || "",
      color: product.color || "",
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

      storedCategories.forEach((cat) => {
        if (cat.name?.trim()) {
          const key = `${cat.name.toLowerCase().trim()}_${cat.rubro}`;
          allCategories.set(key, {
            name: cat.name.trim(),
            rubro: cat.rubro || "comercio",
          });
        }
      });

      allProducts.forEach((product) => {
        if (product.category?.trim()) {
          const key = `${product.category.toLowerCase().trim()}_${
            product.rubro
          }`;
          if (!allCategories.has(key)) {
            allCategories.set(key, {
              name: product.category.trim(),
              rubro: product.rubro || "comercio",
            });
          }
        }

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
    let isMounted = true;

    const fetchData = async () => {
      try {
        const storedProducts = await db.products.toArray();
        if (isMounted) {
          const cleanedProducts = storedProducts.map((p) => ({
            ...p,
            id: Number(p.id),

            customCategories: (p.customCategories || []).filter(
              (cat) => cat.name && cat.name.trim()
            ),
          }));

          setProducts(cleanedProducts.sort((a, b) => b.id - a.id));
          await loadCustomCategories();
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        showNotification("Error al cargar los productos", "error");
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

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
              onApplyFilters={setFilters}
              onApplySort={handleSort}
              products={products}
              rubro={rubro}
            />
          </div>
          <div className="w-full flex justify-end items-center gap-2 ">
            <Button
              text="Ver Precio [F5]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleOpenPriceModal}
              hotkey="F5"
            />
            <Button
              text="Añadir Producto [F2]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddProduct}
              hotkey="F2"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]  ">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className=" table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b">
                <tr className="text-xs lg:text-md 2xl:text-lg">
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
                  <th className="w-30 max-w-[4rem] 2xl:max-w-[10rem] p-2">
                    Acciones
                  </th>
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
                          className={`text-xs 2xl:text-[.9rem] border border-gray_xl ${
                            isExpired
                              ? "border-l-2 border-l-red_m text-gray_b bg-white animate-pulse"
                              : expiredToday
                              ? "border-l-2 border-l-red_m text-white bg-red_m"
                              : isExpiringSoon
                              ? "border-l-2 border-l-red_m text-gray_b bg-red_l "
                              : "text-gray_b bg-white"
                          }`}
                        >
                          <td className="font-semibold p-2 text-start capitalize border border-gray_xl">
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
                                ? ""
                                : "text-red_b"
                            }p-2 border border-gray_xl`}
                          >
                            {!isNaN(Number(product.stock)) &&
                            Number(product.stock) > 0
                              ? `${product.stock} ${product.unit}`
                              : "Agotado"}
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

                          <td className=" p-2 border border-gray_xl">
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

                          <td className="p-2 flex justify-center gap-2">
                            <Button
                              icon={<Barcode size={20} />}
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
                              icon={<Edit size={20} />}
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
                              icon={<Trash size={20} />}
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
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
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
                <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
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
                    colorBg="bg-blue_m"
                    colorBgHover="hover:bg-blue_b"
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
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Temporada
                  </label>
                  <Select
                    options={seasonOptions}
                    noOptionsMessage={() => "No se encontraron opciones"}
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
                    className="text-gray_l"
                    isClearable
                  />
                </div>
              </div>
              {!editingProduct && (
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
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
                      colorText="text-white"
                      colorTextHover="text-white"
                      colorBg="bg-blue_m"
                      colorBgHover="hover:bg-blue_b"
                      onClick={handleAddCategory}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2  ">
              <div className="w-full">
                <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                  Seleccionar categoría
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
                  noOptionsMessage={() => "No se encontraron opciones"}
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
                          label: `${editingProduct.category} (heredada)`,
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
                    <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                      Talle
                    </label>
                    <Select
                      options={clothingSizes}
                      noOptionsMessage={() => "No se encontraron opciones"}
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
                      }}
                      className="text-gray_l"
                      placeholder="Seleccionar talle"
                    />
                  </div>

                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <Select
                        options={colorOptions}
                        noOptionsMessage={() => "No se encontraron opciones"}
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
                      <div className="w-full -mt-6">
                        <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
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
                    <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                      Marca
                    </label>
                    <div className="flex gap-2">
                      <Select
                        options={brandOptions}
                        noOptionsMessage={() => "No se encontraron opciones"}
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
                      <div className="w-full -mt-6">
                        <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
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
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Unidad*
                  </label>
                  <Select
                    options={unitOptions}
                    noOptionsMessage={() => "No se encontraron opciones"}
                    value={selectedUnit}
                    onChange={(selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        unit: selectedOption?.value as Product["unit"],
                      });
                    }}
                    className="text-gray_l"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-full flex items-center space-x-4">
                <InputCash
                  label="Precio de costo*"
                  value={newProduct.costPrice}
                  onChange={(value) =>
                    setNewProduct({ ...newProduct, costPrice: value })
                  }
                />

                <InputCash
                  label="Precio de venta*"
                  value={newProduct.price}
                  onChange={(value) =>
                    setNewProduct({ ...newProduct, price: value })
                  }
                />
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

                <Input
                  label="Stock*"
                  type="number"
                  name="stock"
                  placeholder="Stock"
                  value={newProduct.stock.toString()}
                  onChange={handleInputChange}
                />
              </div>
            ) : (
              <div className="w-full">
                <Input
                  label="Stock*"
                  type="number"
                  name="stock"
                  placeholder="Stock"
                  value={newProduct.stock.toString()}
                  onChange={handleInputChange}
                />
              </div>
            )}
          </form>
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
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
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
              <div className="bg-yellow-50 dark:bg-gray-700 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertTriangle className="inline mr-2" size={16} />
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
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
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
              colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
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
