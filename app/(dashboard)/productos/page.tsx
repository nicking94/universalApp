"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import { Product } from "@/app/lib/types/types";
import {
  Edit,
  Trash,
  PackageX,
  AlertTriangle,
  SortAsc,
  SortDesc,
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

type UnitOption = {
  value: Product["unit"];
  label: string;
};
type ClothingCategoryOption = {
  value: string;
  label: string;
};

type ClothingSizeOption = {
  value: string;
  label: string;
};
const clothingCategories: ClothingCategoryOption[] = [
  { value: "remera", label: "Remera" },
  { value: "pantalon", label: "Pantalón" },
  { value: "camisa", label: "Camisa" },
  { value: "campera", label: "Campera" },
  { value: "buzo", label: "Buzo" },
  { value: "short", label: "Short" },
  { value: "vestido", label: "Vestido" },
  { value: "pollera", label: "Pollera" },
  { value: "calza", label: "Calza" },
  { value: "ropa_interior", label: "Ropa Interior" },
  { value: "accesorio", label: "Accesorio" },
  { value: "otro", label: "Otro" },
];

const clothingSizes: ClothingSizeOption[] = [
  { value: "XS", label: "XS" },
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "XXXL", label: "XXXL" },
  { value: "unico", label: "Único" },
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
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(5);
  const [productSuppliers, setProductSuppliers] = useState<
    Record<number, string>
  >({});

  const unitOptions: UnitOption[] = [
    { value: "Unid.", label: "Unidad" },
    { value: "Kg", label: "Kg" },
    { value: "gr", label: "gr" },
    { value: "L", label: "L" },
    { value: "ml", label: "Ml" },
  ];

  const selectedUnit =
    unitOptions.find((opt) => opt.value === newProduct.unit) ?? null;

  const toggleSortOrder = () => {
    setSortOrder((prevOrder) => (prevOrder === "asc" ? "desc" : "asc"));
  };
  const sortedProducts = useMemo(() => {
    const filtered = products.filter(
      (product) =>
        (rubro === "todos los rubros" || product.rubro === rubro) &&
        (product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.barcode?.includes(searchQuery))
    );

    return [...filtered].sort((a, b) => {
      const expirationA =
        a.expiration && isValid(parseISO(a.expiration))
          ? startOfDay(parseISO(a.expiration)).getTime()
          : Infinity;
      const expirationB =
        b.expiration && isValid(parseISO(b.expiration))
          ? startOfDay(parseISO(b.expiration)).getTime()
          : Infinity;
      const today = startOfDay(new Date()).getTime();

      const isExpiredA = expirationA < today;
      const isExpiredB = expirationB < today;
      const isExpiringSoonA =
        expirationA >= today && expirationA <= today + 7 * 24 * 60 * 60 * 1000;
      const isExpiringSoonB =
        expirationB >= today && expirationB <= today + 7 * 24 * 60 * 60 * 1000;

      if (isExpiredA !== isExpiredB)
        return Number(isExpiredB) - Number(isExpiredA);
      if (isExpiringSoonA !== isExpiringSoonB)
        return Number(isExpiringSoonB) - Number(isExpiringSoonA);

      return sortOrder === "asc"
        ? Number(a.stock) - Number(b.stock)
        : Number(b.stock) - Number(a.stock);
    });
  }, [products, searchQuery, sortOrder, rubro]);

  const handleSearch = (query: string) => {
    setSearchQuery(query.toLowerCase());
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
      originalProduct.barcode !== updatedProduct.barcode
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

  const handleConfirmAddProduct = async () => {
    const productToSave = {
      ...newProduct,
      rubro: rubro,
      stock: Number(newProduct.stock),
      costPrice: Number(newProduct.costPrice),
      price: Number(newProduct.price),
      quantity: Number(newProduct.quantity),
    };
    if (
      !newProduct.name ||
      !newProduct.stock ||
      !newProduct.costPrice ||
      !newProduct.price ||
      !newProduct.unit ||
      (rubro === "indumentaria" && (!newProduct.category || !newProduct.size))
    ) {
      showNotification("Por favor, complete todos los campos", "error");
      return;
    }

    if (newProduct.barcode !== "") {
      const barcodeExists = products.some(
        (p) =>
          p.barcode === newProduct.barcode &&
          (!editingProduct || p.id !== editingProduct.id)
      );

      if (barcodeExists) {
        showNotification("El código de barras ya existe", "error");
        return;
      }
    }
    try {
      if (editingProduct) {
        await db.products.update(editingProduct.id, productToSave);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? newProduct : p))
        );
        showNotification(`Producto ${newProduct.name} actualizado`, "success");
        setEditingProduct(null);
      } else {
        const id = await db.products.add(productToSave);
        setProducts([...products, { ...newProduct, id }]);
        showNotification(`Producto ${newProduct.name} agregado`, "success");
      }
    } catch (error) {
      showNotification("Error al guardar el producto", "error");
      console.error(error);
    }
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
    });
    setIsOpenModal(false);
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
  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct(product);
    setIsOpenModal(true);
  };
  const handleDeleteProduct = (product: Product) => {
    setProductToDelete(product);
    setIsConfirmModalOpen(true);
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

    const fetchProducts = async () => {
      try {
        const storedProducts = await db.products.toArray();
        if (isMounted) {
          setProducts(
            storedProducts
              .map((p) => ({ ...p, id: Number(p.id) }))
              .sort((a, b) => b.id - a.id)
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        showNotification("Error al cargar los productos", "error");
      }
    };

    fetchProducts();

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
    setNewProduct((prev) => ({
      ...prev,
      rubro: rubro,
    }));
  }, [rubro]);

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const pageNumbers = [];
  for (
    let i = 1;
    i <= Math.ceil(sortedProducts.length / productsPerPage);
    i++
  ) {
    pageNumbers.push(i);
  }

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Productos</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full">
            <SearchBar onSearch={handleSearch} />
          </div>
          <div className="w-full flex justify-end gap-2 ">
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

        <div className="flex flex-col justify-between h-[calc(100vh-200px)] ">
          <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b">
              <tr>
                <th className="px-4 py-2 text-start text-sm 2xl:text-lg ">
                  Producto
                </th>
                {rubro === "indumentaria" && (
                  <th className="text-sm 2xl:text-lg px-4 py-2">Talle</th>
                )}
                {rubro === "indumentaria" && (
                  <th className="text-sm 2xl:text-lg px-4 py-2">Color</th>
                )}
                <th
                  onClick={toggleSortOrder}
                  className="text-sm 2xl:text-lg cursor-pointer flex justify-center items-center px-4 py-2"
                >
                  Stock
                  <button className="ml-2 cursor-pointer">
                    {sortOrder === "asc" ? (
                      <SortAsc size={18} />
                    ) : (
                      <SortDesc size={18} />
                    )}
                  </button>
                </th>
                <th className="text-sm 2xl:text-lg px-4 py-2 ">
                  Precio de costo
                </th>
                <th className="text-sm 2xl:text-lg px-4 py-2 ">
                  Precio de venta
                </th>
                {rubro !== "indumentaria" && (
                  <th className="text-sm 2xl:text-lg px-4 py-2 ">
                    Vencimiento
                  </th>
                )}
                <th className="text-sm 2xl:text-lg px-4 py-2">Proveedor</th>
                <th className="w-40 max-w-[10rem] text-sm 2xl:text-lg px-4 py-2">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl `}>
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
                        <td className="font-semibold px-4 py-2 text-start capitalize border border-gray_xl">
                          <div className="flex items-center gap-2 h-full">
                            {expiredToday && (
                              <AlertTriangle
                                className="text-yellow-300 dark:text-yellow-500"
                                size={18}
                              />
                            )}
                            {isExpiringSoon && (
                              <AlertTriangle
                                className="text-yellow-800"
                                size={18}
                              />
                            )}
                            {isExpired && (
                              <AlertTriangle
                                className="text-red_m dark:text-yellow-500"
                                size={18}
                              />
                            )}
                            <span className="leading-tight">
                              {getDisplayProductName(product, rubro, false)}
                            </span>
                          </div>
                        </td>
                        {rubro === "indumentaria" && (
                          <td className="px-4 py-2 border border-gray_xl">
                            {product.size || "-"}
                          </td>
                        )}
                        {rubro === "indumentaria" && (
                          <td className="px-4 py-2 border border-gray_xl capitalize">
                            {product.color || "-"}
                          </td>
                        )}
                        <td
                          className={`${
                            !isNaN(Number(product.stock)) &&
                            Number(product.stock) > 0
                              ? ""
                              : "text-red_b"
                          }px-4 py-2 border border-gray_xl`}
                        >
                          {!isNaN(Number(product.stock)) &&
                          Number(product.stock) > 0
                            ? `${product.stock} ${product.unit}`
                            : "Agotado"}
                        </td>
                        <td className=" px-4 py-2 border border-gray_xl">
                          {formatCurrency(product.costPrice)}
                        </td>
                        <td className="px-4 py-2 border border-gray_xl">
                          {formatCurrency(product.price)}
                        </td>
                        {rubro !== "indumentaria" && (
                          <td className="px-4 py-2 border border-gray_xl font-semibold">
                            {product.expiration &&
                            isValid(parseISO(product.expiration))
                              ? format(
                                  parseISO(product.expiration),
                                  "dd/MM/yyyy",
                                  { locale: es }
                                )
                              : "Sin fecha"}
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
                              <span className="ml-2 text-red_b">(Vencido)</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2 border border-gray_xl">
                          {productSuppliers[product.id] || "Sin asignar"}
                        </td>
                        <td className="px-4 py-2 flex justify-center gap-2 ">
                          <Button
                            icon={<Edit size={20} />}
                            colorText={` ${isExpired ? "text-gray_b" : ""}`}
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleEditProduct(product)}
                          />
                          <Button
                            icon={<Trash size={20} />}
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            colorBgHover="hover:bg-red_b"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleDeleteProduct(product)}
                          />
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td
                    colSpan={rubro === "indumentaria" ? 8 : 7}
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
          {sortedProducts.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalItems={sortedProducts.length}
              itemsPerPage={productsPerPage}
              onPageChange={paginate}
              onItemsPerPageChange={(newItemsPerPage) => {
                setProductsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
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
          minheight="min-h-[25rem]"
        >
          <form className="flex flex-col gap-2">
            <div className="w-full flex items-center space-x-4 ">
              <div className="w-full">
                <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                  Código de Barras
                </label>
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
              </div>

              <Input
                label="Nombre del producto"
                type="text"
                name="name"
                placeholder="Nombre del producto..."
                value={newProduct.name}
                onChange={handleInputChange}
              />
            </div>

            {rubro === "indumentaria" ? (
              <>
                <div className="w-full flex items-center space-x-4">
                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                      Categoría de prenda
                    </label>
                    <Select
                      options={clothingCategories}
                      value={
                        clothingCategories.find(
                          (opt) => opt.value === newProduct.category
                        ) || null
                      }
                      onChange={(selectedOption) => {
                        setNewProduct({
                          ...newProduct,
                          category: selectedOption?.value || "",
                        });
                      }}
                      className="text-black"
                      placeholder="Seleccionar categoría..."
                    />
                  </div>
                  <Input
                    label="Marca"
                    type="text"
                    name="brand"
                    placeholder="Marca..."
                    value={newProduct.brand || ""}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="w-full flex items-center space-x-4">
                  <Input
                    label="Color"
                    type="text"
                    name="color"
                    placeholder="Color..."
                    value={newProduct.color || ""}
                    onChange={handleInputChange}
                  />

                  <div className="w-full">
                    <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                      Talle
                    </label>
                    <Select
                      options={clothingSizes}
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
                      className="text-black"
                      placeholder="Seleccionar talle..."
                    />
                  </div>
                </div>

                <div className="w-full">
                  <Input
                    label="Stock"
                    type="number"
                    name="stock"
                    placeholder="Stock..."
                    value={newProduct.stock.toString()}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            ) : (
              <div className="w-full flex items-center space-x-4">
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Unidad
                  </label>
                  <Select
                    options={unitOptions}
                    value={selectedUnit}
                    onChange={(selectedOption) => {
                      setNewProduct({
                        ...newProduct,
                        unit: selectedOption?.value as Product["unit"],
                      });
                    }}
                    className="text-black"
                    isSearchable={false}
                  />
                </div>
                <Input
                  label="Stock"
                  type="number"
                  name="stock"
                  placeholder="Stock..."
                  value={newProduct.stock.toString()}
                  onChange={handleInputChange}
                />
              </div>
            )}

            <div className="flex items-center space-x-4">
              <div className="w-full flex items-center space-x-4">
                <InputCash
                  label="Precio de costo"
                  value={newProduct.costPrice}
                  onChange={(value) =>
                    setNewProduct({ ...newProduct, costPrice: value })
                  }
                />

                <InputCash
                  label="Precio de venta"
                  value={newProduct.price}
                  onChange={(value) =>
                    setNewProduct({ ...newProduct, price: value })
                  }
                />
              </div>
            </div>

            {rubro !== "indumentaria" && (
              <CustomDatePicker
                value={newProduct.expiration || ""}
                onChange={(newDate) => {
                  setNewProduct({ ...newProduct, expiration: newDate });
                }}
                isClearable={true}
              />
            )}
          </form>
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
                colorBg="bg-red_m border-b-1 dark:bg-gray_m"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_l"
                onClick={handleConfirmDelete}
              />
              <Button
                text="No"
                colorText="text-gray_b"
                colorTextHover="text-gray_b"
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
                    <p className="text-sm font-medium text-gray_m dark:text-gray_m">
                      Producto
                    </p>
                    <p className="text-lg font-semibold">
                      {getDisplayProductName(scannedProduct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_m">
                      Precio
                    </p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(scannedProduct.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray_m dark:text-gray_m">
                      Stock
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        scannedProduct.stock > 0 ? "text-green_b" : "text-red_b"
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
                    <p className="text-xs text-gray_l">
                      Sin fecha de vencimiento
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>

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
