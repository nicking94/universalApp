"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  CreditSale,
  Customer,
  DailyCashMovement,
  PaymentSplit,
  Product,
  Sale,
  UnitOption,
} from "@/app/lib/types/types";
import { Info, Plus, ShoppingCart, Trash } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select, { SingleValue } from "react-select";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";

const VentasPage = () => {
  const currentYear = new Date().getFullYear();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [newSale, setNewSale] = useState<Omit<Sale, "id">>({
    products: [],
    paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
    total: 0,
    date: new Date().toISOString(),
    barcode: "",
    manualAmount: 0,
  });
  const router = useRouter();
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [salesPerPage, setSalesPerPage] = useState(5);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString().padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isCredit, setIsCredit] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    value: string;
    label: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shouldRedirectToCash, setShouldRedirectToCash] = useState(false);

  const unitOptions: UnitOption[] = [
    { value: "Unid.", label: "Unidad" },
    { value: "Kg", label: "Kg" },
    { value: "gr", label: "gr" },
    { value: "L", label: "L" },
    { value: "ml", label: "Ml" },
  ];
  const calculatePrice = useCallback((product: Product): number => {
    const pricePerUnit = product.price;
    const quantity = product.quantity;
    const unit = product.unit;

    let quantityInBaseUnit: number;

    switch (unit) {
      case "gr":
        quantityInBaseUnit = quantity / 1000;
        break;
      case "Kg":
        quantityInBaseUnit = quantity;
        break;
      case "ml":
        quantityInBaseUnit = quantity / 1000;
        break;
      case "L":
        quantityInBaseUnit = quantity;
        break;
      case "Unid.":
      default:
        return parseFloat((pricePerUnit * quantity).toFixed(2));
    }

    return parseFloat((pricePerUnit * quantityInBaseUnit).toFixed(2));
  }, []);

  const calculateTotal = (
    products: Product[],
    manualAmount: number = 0
  ): number => {
    const productsTotal = products.reduce(
      (sum, p) => sum + calculatePrice(p),
      0
    );
    return parseFloat((productsTotal + manualAmount).toFixed(2));
  };
  const calculateProfit = (product: Product): number => {
    const profitPerKg = product.price - product.costPrice;
    const quantity = product.quantity;
    const unit = product.unit;

    if (unit === "Unid.") {
      return profitPerKg * quantity;
    }

    let quantityInKg: number;

    switch (unit) {
      case "gr":
        quantityInKg = quantity / 1000;
        break;
      case "Kg":
        quantityInKg = quantity;
        break;
      case "L":
      case "ml":
        quantityInKg = unit === "L" ? quantity : quantity / 1000;
        break;
      default:
        return profitPerKg * quantity;
    }

    return parseFloat((profitPerKg * quantityInKg).toFixed(2));
  };

  const calculateCombinedTotal = useCallback(
    (products: Product[], manualAmount: number) => {
      const productsTotal = products.reduce(
        (sum, p) => sum + calculatePrice(p),
        0
      );
      return productsTotal + manualAmount;
    },
    [calculatePrice]
  );
  const checkCashStatus = async () => {
    const { needsRedirect } = await ensureCashIsOpen();
    return needsRedirect;
  };
  const updateStockAfterSale = (
    productId: number,
    soldQuantity: number,
    unit: Product["unit"]
  ) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Producto con ID ${productId} no encontrado`);
    }

    const stockInGrams = convertToGrams(Number(product.stock), product.unit);
    const soldQuantityInGrams = convertToGrams(soldQuantity, unit);

    if (stockInGrams < soldQuantityInGrams) {
      const availableStock = convertStockToUnit(stockInGrams, product.unit);
      throw new Error(
        `Stock insuficiente para ${product.name}. ` +
          `Solicitado: ${soldQuantity} ${unit}, ` +
          `Disponible: ${availableStock.quantity.toFixed(2)} ${
            availableStock.unit
          }`
      );
    }

    const newStockInGrams = stockInGrams - soldQuantityInGrams;
    const updatedStock = convertStockToUnit(newStockInGrams, product.unit);

    return updatedStock.quantity;
  };

  const convertToGrams = (quantity: number, unit: string): number => {
    switch (unit) {
      case "Kg":
        return quantity * 1000;
      case "L":
        return quantity * 1000;
      case "gr":
        return quantity;
      case "ml":
        return quantity;
      default:
        return quantity;
    }
  };
  const convertStockToUnit = (
    stock: number,
    unit: string
  ): { quantity: number; unit: string } => {
    switch (unit) {
      case "gr":
        return { quantity: stock, unit: "gr" };
      case "Kg":
        return { quantity: stock / 1000, unit: "Kg" };
      case "ml":
        return { quantity: stock, unit: "ml" };
      case "L":
        return { quantity: stock / 1000, unit: "L" };
      default:
        return { quantity: stock, unit: "Unid." };
    }
  };

  const productOptions: {
    value: number;
    label: string;
    isDisabled?: boolean;
  }[] = products.map((product) => {
    const stock = Number(product.stock);
    const isValidStock = !isNaN(stock);

    return {
      value: product.id,
      label:
        isValidStock && stock > 0 ? product.name : `${product.name} (agotado)`,
      isDisabled: !isValidStock || stock <= 0,
    };
  });
  const monthOptions = [...Array(12)].map((_, i) => {
    const month = (i + 1).toString().padStart(2, "0");
    return {
      value: month,
      label: format(new Date(2022, i), "MMMM", { locale: es }),
    };
  });
  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });
  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      const saleMonth = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const saleYear = saleDate.getFullYear().toString();

      const matchesMonth = selectedMonth ? saleMonth === selectedMonth : true;
      const matchesYear = selectedYear
        ? saleYear === selectedYear.toString()
        : true;

      return matchesMonth && matchesYear;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);

    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 3000);
  };
  const addIncomeToDailyCash = async (
    sale: Sale & { manualAmount?: number; credit?: boolean; paid?: boolean }
  ) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      const totalSaleAmount = sale.total;
      if (sale.products.length > 0) {
        const movement: DailyCashMovement = {
          id: Date.now(),
          amount: totalSaleAmount,
          description: "Venta",
          items: sale.products.map((p) => ({
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: p.price,
          })),

          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod: "MIXTO",
          productId: sale.products[0].id,
          productName: sale.products.map((p) => p.name).join(", "),
          costPrice: sale.products.reduce(
            (sum, p) => sum + p.costPrice * p.quantity,
            0
          ),
          sellPrice: sale.products.reduce(
            (sum, p) => sum + p.price * p.quantity,
            0
          ),
          quantity: sale.products.reduce((sum, p) => sum + p.quantity, 0),
          unit: sale.products[0].unit,
          profit: sale.products.reduce((sum, p) => sum + calculateProfit(p), 0),
          isCreditPayment: sale.credit,
          originalSaleId: sale.id,
          combinedPaymentMethods: sale.paymentMethods,
        };

        movements.push(movement);
      }

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          initialAmount: 0,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
          totalProfit:
            (dailyCash.totalProfit || 0) +
            movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso en caja diaria:", error);
      throw error;
    }
  };

  const handleProductScan = (productId: number) => {
    setNewSale((prevState) => {
      const existingProductIndex = prevState.products.findIndex(
        (p) => p.id === productId
      );

      if (existingProductIndex >= 0) {
        const updatedProducts = [...prevState.products];
        const existingProduct = updatedProducts[existingProductIndex];

        updatedProducts[existingProductIndex] = {
          ...existingProduct,
          quantity: existingProduct.quantity + 1,
        };
        const newTotal = updatedProducts.reduce(
          (sum, p) => sum + calculatePrice(p),
          0
        );

        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      } else {
        const productToAdd = products.find((p) => p.id === productId);
        if (!productToAdd) return prevState;

        const newProduct = {
          ...productToAdd,
          quantity: 1,
          unit: productToAdd.unit,
        };

        const updatedProducts = [...prevState.products, newProduct];
        const newTotal = updatedProducts.reduce(
          (sum, p) => sum + calculatePrice(p),
          0
        );

        return {
          ...prevState,
          products: updatedProducts,
          total: newTotal,
          barcode: "",
        };
      }
    });
  };
  const handleManualAmountChange = (value: number) => {
    setNewSale((prev) => ({
      ...prev,
      manualAmount: value,
      total: calculateTotal(prev.products, value),
    }));
  };
  const handleMonthChange = (
    selectedOption: { value: string; label: string } | null
  ) => {
    setSelectedMonth(selectedOption ? selectedOption.value : "");
  };
  const handleYearChange = (
    selectedOption: { value: number; label: string } | null
  ) => {
    setSelectedYear(selectedOption ? selectedOption.value : currentYear);
  };
  const handleYearInputChange = (inputValue: string) => {
    const parsedYear = parseInt(inputValue, 10);

    if (/^\d{4}$/.test(inputValue) && !isNaN(parsedYear)) {
      setSelectedYear(parsedYear);
    }
  };
  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setNewSale((prev) => {
      const updatedMethods = [...prev.paymentMethods];
      const total = calculateCombinedTotal(
        prev.products,
        prev.manualAmount || 0
      );

      if (field === "amount") {
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
            : value;

        updatedMethods[index] = {
          ...updatedMethods[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };
        if (updatedMethods.length === 2) {
          let sum = 0;
          for (let i = 0; i < updatedMethods.length; i++) {
            sum += updatedMethods[i].amount;
          }

          const difference = total - sum;

          if (updatedMethods.length > 1) {
            const numOtherInputs = updatedMethods.length - 1;
            const share = difference / numOtherInputs;

            for (let i = 0; i < updatedMethods.length; i++) {
              if (i !== index) {
                const newAmount = parseFloat(
                  Math.max(0, updatedMethods[i].amount + share).toFixed(2)
                );
                updatedMethods[i] = {
                  ...updatedMethods[i],
                  amount: newAmount,
                };
              }
            }
          }
        }

        return {
          ...prev,
          paymentMethods: updatedMethods,
        };
      } else {
        updatedMethods[index] = {
          ...updatedMethods[index],
          method: value as "EFECTIVO" | "TRANSFERENCIA" | "TARJETA",
        };
      }

      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  };

  const addPaymentMethod = () => {
    setNewSale((prev) => {
      if (prev.paymentMethods.length >= paymentOptions.length) return prev;
      const newMethods = [...prev.paymentMethods];
      if (newMethods.length === 2) {
        newMethods.forEach((method) => {
          method.amount = 0;
        });
      }

      return {
        ...prev,
        paymentMethods: [
          ...newMethods,
          {
            method: paymentOptions[prev.paymentMethods.length].value as
              | "EFECTIVO"
              | "TRANSFERENCIA"
              | "TARJETA",
            amount: 0,
          },
        ],
      };
    });
  };

  const removePaymentMethod = (index: number) => {
    setNewSale((prev) => {
      if (prev.paymentMethods.length <= 1) return prev;
      const updatedMethods = [...prev.paymentMethods];
      updatedMethods.splice(index, 1);
      if (updatedMethods.length === 2) {
        const total = calculateCombinedTotal(
          prev.products,
          prev.manualAmount || 0
        );
        updatedMethods[0].amount = total / 2;
        updatedMethods[1].amount = total / 2;
      }

      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  };
  const handleAddSale = async () => {
    const needsRedirect = await checkCashStatus();

    if (needsRedirect) {
      setShouldRedirectToCash(true);

      return;
    }

    setIsOpenModal(true);
  };
  const validatePaymentMethods = (
    paymentMethods: PaymentSplit[],
    total: number
  ): boolean => {
    const sum = paymentMethods.reduce((acc, method) => acc + method.amount, 0);
    return Math.abs(sum - total) < 0.01;
  };

  const handleConfirmAddSale = async () => {
    if (!validatePaymentMethods(newSale.paymentMethods, newSale.total)) {
      showNotification(
        "La suma de los métodos de pago no coincide con el total",
        "error"
      );
      return;
    }
    const needsRedirect = await checkCashStatus();

    if (needsRedirect) {
      setShouldRedirectToCash(true);
      showNotification(
        "Debes abrir la caja primero para realizar ventas",
        "error"
      );
      return;
    }
    const totalPaymentMethods = newSale.paymentMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );
    const calculatedTotal = calculateCombinedTotal(
      newSale.products,
      newSale.manualAmount || 0
    );

    if (Math.abs(totalPaymentMethods - calculatedTotal) > 0.01) {
      showNotification(`La suma de los métodos de pago no coinciden`, "error");
      return;
    }
    if (newSale.products.length === 0) {
      showNotification("Debe agregar al menos un producto", "error");
      return;
    }

    if (isCredit) {
      const normalizedName = customerName.toUpperCase().trim();

      if (!normalizedName) {
        showNotification("Debe ingresar un nombre de cliente", "error");
        return;
      }

      const nameExists = customers.some(
        (customer) =>
          customer.name.toUpperCase() === normalizedName &&
          (!selectedCustomer || customer.id !== selectedCustomer.value)
      );

      if (nameExists) {
        showNotification(
          "Este cliente ya existe. Seleccionalo de la lista",
          "error"
        );
        return;
      }
    }
    try {
      for (const product of newSale.products) {
        const updatedStock = updateStockAfterSale(
          product.id,
          product.quantity,
          product.unit
        );
        await db.products.update(product.id, { stock: updatedStock });
      }

      let customerId = selectedCustomer?.value;
      const generateCustomerId = (name: string): string => {
        const cleanName = name
          .toUpperCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-]/g, "");
        const timestamp = Date.now().toString().slice(-5);
        return `${cleanName}-${timestamp}`;
      };

      if (isCredit && !customerId && customerName) {
        const newCustomer: Customer = {
          id: generateCustomerId(customerName),
          name: customerName.toUpperCase().trim(),
          phone: customerPhone,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.customers.add(newCustomer);
        customerId = newCustomer.id;
        setCustomers([...customers, newCustomer]);
        setCustomerOptions([
          ...customerOptions,
          { value: newCustomer.id, label: newCustomer.name },
        ]);
      }

      const saleToSave: CreditSale = {
        id: Date.now(),
        products: newSale.products,
        paymentMethods: isCredit ? [] : newSale.paymentMethods,
        total: newSale.total,
        date: new Date().toISOString(),
        barcode: newSale.barcode,
        manualAmount: newSale.manualAmount,
        credit: isCredit,
        customerName: isCredit
          ? customerName.toUpperCase().trim()
          : "CLIENTE OCASIONAL",
        customerPhone: isCredit ? customerPhone : "",
        customerId: isCredit ? customerId : "",
        paid: false,
      };
      await db.sales.add(saleToSave);
      setSales([...sales, saleToSave]);
      if (!isCredit) {
        await addIncomeToDailyCash(saleToSave);
      }
      setNewSale({
        products: [],
        paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
        total: 0,
        date: new Date().toISOString(),
        barcode: "",
        manualAmount: 0,
      });
      setIsCredit(false);
      setCustomerName("");
      setCustomerPhone("");
      setSelectedCustomer(null);

      setIsOpenModal(false);
      showNotification("Venta agregada correctamente", "success");
    } catch (error) {
      console.error("Error al agregar venta:", error);
      showNotification("Error al agregar venta", "error");
    }
  };

  const handleOpenInfoModal = (sale: Sale) => {
    setSelectedSale(sale);
    setIsInfoModalOpen(true);
  };

  const handleCloseModal = () => {
    setNewSale({
      products: [],
      paymentMethods: [{ method: "EFECTIVO", amount: 0 }],
      total: 0,
      date: new Date().toISOString(),
      barcode: "",
    });
    setIsCredit(false);
    setIsOpenModal(false);
  };
  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedSale(null);
  };

  const handleDeleteSale = async () => {
    if (saleToDelete) {
      await db.sales.delete(saleToDelete.id);
      setSales(sales.filter((sale) => sale.id !== saleToDelete.id));
      showNotification("Venta eliminada correctamente", "success");
      setIsConfirmModalOpen(false);
      setSaleToDelete(null);
    }
  };
  useEffect(() => {
    if (newSale.paymentMethods.length === 1) {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [
          {
            ...prev.paymentMethods[0],
            amount: prev.total,
          },
        ],
      }));
    }
  }, [newSale.total, newSale.paymentMethods.length]);
  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);

      setCustomerOptions(
        allCustomers.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))
      );
    };

    fetchCustomers();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      const storedProducts = await db.products.toArray();
      setProducts(storedProducts);
    };

    const fetchSales = async () => {
      const storedSales = await db.sales.toArray();
      setSales(
        storedSales.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
    };

    fetchProducts();
    fetchSales();
  }, []);
  useEffect(() => {
    setNewSale((prev) => {
      const total = calculateCombinedTotal(
        prev.products,
        prev.manualAmount || 0
      );
      const updatedMethods = [...prev.paymentMethods];
      if (updatedMethods.length === 1) {
        updatedMethods[0].amount = total;
      } else if (updatedMethods.length === 2) {
        const sumOthers = updatedMethods
          .slice(0, -1)
          .reduce((sum, m) => sum + m.amount, 0);
        const remaining = total - sumOthers;

        if (remaining >= 0) {
          updatedMethods[updatedMethods.length - 1].amount = parseFloat(
            remaining.toFixed(2)
          );
        }
      }
      return {
        ...prev,
        paymentMethods: updatedMethods,
        total: total,
      };
    });
  }, [
    newSale.products,
    newSale.manualAmount,
    newSale.paymentMethods.length,
    calculateCombinedTotal,
  ]);

  const handleProductSelect = (
    selectedOptions: readonly {
      value: number;
      label: string;
      isDisabled?: boolean | undefined;
    }[]
  ) => {
    setNewSale((prevState) => {
      const updatedProducts = selectedOptions
        .map((option) => {
          const product = products.find((p) => p.id === option.value);
          if (!product) return null;
          if (Number(product.stock) <= 0) {
            showNotification(
              `El producto ${product.name} no tiene stock disponible`,
              "error"
            );
            return null;
          }

          const existingProduct = prevState.products.find(
            (p) => p.id === product.id
          );

          return existingProduct
            ? existingProduct
            : {
                ...product,
                quantity: 1,
                unit: product.unit,
                stock: Number(product.stock),
                price: Number(product.price),
                costPrice: Number(product.costPrice),
              };
        })
        .filter(Boolean) as Product[];

      const newTotal = calculateCombinedTotal(
        updatedProducts,
        prevState.manualAmount || 0
      );
      const updatedPaymentMethods = [...prevState.paymentMethods];
      if (updatedPaymentMethods.length > 0) {
        const assignedAmount = updatedPaymentMethods
          .slice(0, -1)
          .reduce((sum, m) => sum + m.amount, 0);
        updatedPaymentMethods[updatedPaymentMethods.length - 1].amount =
          parseFloat((newTotal - assignedAmount).toFixed(2));
      }

      return {
        ...prevState,
        products: updatedProducts,
        paymentMethods: updatedPaymentMethods,
        total: newTotal,
      };
    });
  };

  const handleQuantityChange = (
    productId: number,
    quantity: number,
    unit: Product["unit"]
  ) => {
    setNewSale((prevState) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return prevState;
      const stockInGrams = convertToGrams(Number(product.stock), product.unit);
      const requestedInGrams = convertToGrams(quantity, unit);
      if (requestedInGrams > stockInGrams) {
        showNotification(
          `No hay suficiente stock para ${product.name}. Stock disponible: ${product.stock} ${product.unit}`,
          "error"
        );
        return prevState;
      }

      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          return { ...p, quantity, unit };
        }
        return p;
      });

      const newTotal = calculateCombinedTotal(
        updatedProducts,
        prevState.manualAmount || 0
      );
      const updatedPaymentMethods = [...prevState.paymentMethods];
      if (updatedPaymentMethods.length > 0) {
        updatedPaymentMethods[0].amount = newTotal;
      }

      return {
        ...prevState,
        products: updatedProducts,
        paymentMethods: updatedPaymentMethods,
        total: newTotal,
      };
    });
  };
  const handleUnitChange = (
    productId: number,
    selectedOption: SingleValue<UnitOption>,
    currentQuantity: number
  ) => {
    if (!selectedOption) return;

    setNewSale((prevState) => {
      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          const newUnit = selectedOption.value as Product["unit"];
          let newQuantity = currentQuantity;
          if (!isNaN(currentQuantity)) {
            if (p.unit === "Kg" && newUnit === "gr") {
              newQuantity = currentQuantity * 1000;
            } else if (p.unit === "gr" && newUnit === "Kg") {
              newQuantity = currentQuantity / 1000;
            } else if (p.unit === "L" && newUnit === "ml") {
              newQuantity = currentQuantity * 1000;
            } else if (p.unit === "ml" && newUnit === "L") {
              newQuantity = currentQuantity / 1000;
            }
            newQuantity = parseFloat(newQuantity.toFixed(3));
          }

          return {
            ...p,
            unit: newUnit,
            quantity: newQuantity,
          };
        }
        return p;
      });

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };
  const handleRemoveProduct = (productId: number) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.filter(
        (p) => p.id !== productId
      );

      return {
        ...prevState,
        products: updatedProducts,
        total: calculateCombinedTotal(
          updatedProducts,
          prevState.manualAmount || 0
        ),
      };
    });
  };

  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(filteredSales.length / salesPerPage); i++) {
    pageNumbers.push(i);
  }
  useEffect(() => {
    if (shouldRedirectToCash) {
      router.push("/caja-diaria");
    }
  }, [shouldRedirectToCash]);

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Ventas</h1>

        <div className="flex justify-between mb-2">
          <div className="flex w-full max-w-[20rem] gap-4">
            <Select
              value={monthOptions.find(
                (option) => option.value === selectedMonth
              )}
              onChange={handleMonthChange}
              options={monthOptions}
              placeholder="Mes"
              className="w-full h-[2rem] 2xl:h-auto text-black"
              classNamePrefix="react-select"
            />
            <Select
              value={
                yearOptions.find((option) => option.value === selectedYear) || {
                  value: selectedYear,
                  label: String(selectedYear),
                }
              }
              onChange={handleYearChange}
              onInputChange={handleYearInputChange}
              options={yearOptions}
              isClearable
              className="w-full h-[2rem] 2xl:h-auto text-black"
              classNamePrefix="react-select"
            />
          </div>
          <div className="w-full  flex justify-end">
            <Button
              text="Nueva Venta [F1]"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddSale}
              hotkey="F1"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b">
              <tr>
                <th className="text-sm 2xl:text-lg px-4 py-2 text-start ">
                  Producto
                </th>

                <th className="text-sm 2xl:text-lg px-4 py-2 ">Total</th>
                <th className=" text-sm 2xl:text-lg px-4 py-2 ">Fecha</th>
                <th className="text-sm 2xl:text-lg px-4 py-2 ">
                  Forma De Pago
                </th>
                <th className="w-40 max-w-[10rem] text-sm 2xl:text-lg px-4 py-2">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl `}>
              {currentSales.length > 0 ? (
                currentSales.map((sale) => {
                  const products = sale.products || [];
                  const paymentMethods = sale.paymentMethods || [];
                  const saleDate = sale.date ? parseISO(sale.date) : new Date();
                  const total = sale.total || 0;

                  return (
                    <tr
                      key={sale.id || Date.now()}
                      className=" text-xs 2xl:text-[.9rem] bg-white text-gray_b border-b border-gray_xl"
                    >
                      <td
                        className="font-semibold px-2 text-start uppercase border border-gray_xl truncate max-w-[200px]"
                        title={products.map((p) => p?.name || "").join(", ")}
                      >
                        {products.map((p) => p?.name || "").join(", ").length >
                        60
                          ? products
                              .map((p) => p?.name || "")
                              .join(", ")
                              .slice(0, 30) + "..."
                          : products
                              .map(
                                (p) =>
                                  `${p?.name || ""} x ${p?.quantity || 0}${
                                    p?.unit || ""
                                  }`
                              )
                              .join(" | ")}
                      </td>

                      <td className=" px-4 py-2 border border-gray_xl">
                        {sale.credit ? (
                          <span className="text-orange-500">
                            FIADO - $
                            {total.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        ) : (
                          `$${total.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}`
                        )}
                      </td>

                      <td className=" px-4 py-2 border border-gray_xl">
                        {format(saleDate, "dd/MM/yyyy", { locale: es })}
                      </td>

                      <td className=" px-4 py-2 border border-gray_xl">
                        {sale.credit ? (
                          <span className="text-orange-500">VENTA FIADA</span>
                        ) : (
                          paymentMethods.map((payment, i) => (
                            <div key={i} className="text-xs">
                              {payment?.method || "Método no especificado"}:{" "}
                              {formatCurrency(payment?.amount || 0)}
                            </div>
                          ))
                        )}
                      </td>

                      <td className="px-4 py-2 border border-gray_xl">
                        <div className="flex justify-center items-center gap-4 h-full">
                          <Button
                            icon={<Info size={20} />}
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            colorBgHover="hover:bg-blue-500"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => handleOpenInfoModal(sale)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <ShoppingCart size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">Todavía no hay ventas.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedSale && (
            <Modal
              isOpen={isInfoModalOpen}
              onClose={handleCloseInfoModal}
              title="Detalles de la venta"
              bgColor="bg-white dark:bg-gray_b text-gray_m dark:text-white "
              buttons={
                <div className="flex justify-end">
                  <Button
                    text="Cerrar"
                    colorText="text-gray_b dark:text-white"
                    colorTextHover="hover:text-white hover:dark:text-white"
                    colorBg="bg-gray_xl dark:bg-gray_m"
                    colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                    onClick={() => handleCloseInfoModal()}
                  />
                </div>
              }
            >
              <div className="space-y-6 p-4 bg-white rounded-lg shadow-sm">
                <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Resumen de Venta
                  </h3>

                  <div className="flex justify-between text-base text-gray_b">
                    <span className="font-medium ">Total:</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedSale.total)}
                    </span>
                  </div>

                  <div className="flex justify-between text-base text-gray_b">
                    <span className="font-medium ">Fecha:</span>
                    <span>
                      {format(
                        parseISO(selectedSale.date),
                        "dd 'de' MMMM 'de' yyyy",
                        { locale: es }
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between text-base text-gray_b">
                    <span className="font-medium">Forma de Pago:</span>
                    {selectedSale.credit ? (
                      <span className="text-orange-500 font-semibold">
                        VENTA FIADA
                      </span>
                    ) : (
                      <div className="text-right">
                        {selectedSale.paymentMethods.map((payment, i) => (
                          <div key={i} className="text-sm">
                            {payment.method}:{" "}
                            <span className="font-medium">
                              {formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">
                    Detalles de Productos
                  </h3>

                  <ul className="divide-y divide-gray-200">
                    {selectedSale.products.map((product, index) => (
                      <li
                        key={index}
                        className="py-3 flex justify-between items-center"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray_b truncate uppercase">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray_l">
                            {product.barcode
                              ? `Código: ${product.barcode}`
                              : "Sin código"}
                          </p>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="text-sm font-medium text-gray_b">
                            {product.quantity} {product.unit.toLowerCase()} ={" "}
                            {formatCurrency(calculatePrice(product))}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Modal>
          )}
          {currentSales.length > 0 && (
            <Pagination
              text="Ventas por página"
              text2="Total de ventas"
              currentPage={currentPage}
              totalItems={filteredSales.length}
              itemsPerPage={salesPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setSalesPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title="Nueva Venta"
          buttons={
            <div className="flex justify-end space-x-4 ">
              <Button
                text={"Cobrar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmAddSale}
                hotkey="Enter"
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={handleCloseModal}
                hotkey="Escape"
              />
            </div>
          }
          minheight="min-h-[26rem]"
        >
          <form onSubmit={handleConfirmAddSale} className="flex flex-col gap-4">
            <div className="w-full flex items-center space-x-4">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray_m dark:text-white">
                  Escanear código de barras
                </label>
                <BarcodeScanner
                  value={newSale.barcode || ""}
                  onChange={(value) =>
                    setNewSale({ ...newSale, barcode: value })
                  }
                  onScanComplete={(code) => {
                    const productToAdd = products.find(
                      (p) => p.barcode === code
                    );
                    if (productToAdd) {
                      handleProductScan(productToAdd.id);
                    } else {
                      showNotification("Producto no encontrado", "error");
                    }
                  }}
                />
              </div>
              <div className="w-full flex flex-col">
                <label
                  htmlFor="productSelect"
                  className="block text-gray_m dark:text-white text-sm font-semibold "
                >
                  Productos
                </label>
                <Select<
                  { value: number; label: string; isDisabled?: boolean },
                  true
                >
                  id="productSelect"
                  isOptionDisabled={(option) => option.isDisabled ?? false}
                  options={productOptions}
                  isMulti
                  onChange={handleProductSelect}
                  value={newSale.products.map((p) => ({
                    value: p.id,
                    label: p.name,
                  }))}
                  placeholder="Seleccione productos"
                  className="text-black"
                />
              </div>
            </div>
            {newSale.products.length > 0 && (
              <table className="table-auto w-full  ">
                <thead className=" bg-blue_b text-white text-sm 2xl:text-lg">
                  <tr>
                    <th className="px-4 py-2">Producto</th>
                    <th className="px-4 py-2 text-center">Unidad</th>
                    <th className="px-4 py-2 text-center">Cantidad</th>
                    <th className="px-4 py-2 text-center">Total</th>
                    <th className="w-40 max-w-[10rem] px-4 py-2 text-center">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white text-gray_b divide-y divide-gray_xl ">
                  {newSale.products.map((product) => {
                    return (
                      <tr className="border-b border-gray-xl" key={product.id}>
                        <td className=" px-4 py-2">
                          {product.name.toUpperCase()}
                        </td>
                        <td className="w-40 max-w-40 px-4 py-2">
                          {" "}
                          <Select
                            placeholder="Unidad"
                            options={unitOptions}
                            value={unitOptions.find(
                              (option) => option.value === product.unit
                            )}
                            onChange={(selectedOption) => {
                              handleUnitChange(
                                product.id,
                                selectedOption,
                                product.quantity
                              );
                            }}
                            className="text-black "
                          />
                        </td>
                        <td className="w-20 max-w-20 px-4 py-2  ">
                          <Input
                            textPosition="text-center"
                            type="number"
                            value={product.quantity.toString() || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "" || !isNaN(Number(value))) {
                                handleQuantityChange(
                                  product.id,
                                  value === "" ? 0 : Number(value),
                                  product.unit
                                );
                              }
                            }}
                            step={
                              product.unit === "Kg" || product.unit === "L"
                                ? "0.001"
                                : "1"
                            }
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                              if (e.target.value === "") {
                                handleQuantityChange(
                                  product.id,
                                  0,
                                  product.unit
                                );
                              }
                            }}
                          />
                        </td>

                        <td className="w-30 max-w-30 px-4 py-2 text-center ">
                          {formatCurrency(
                            calculatePrice({
                              ...product,
                              price: product.price || 0,
                              quantity: product.quantity || 0,
                              unit: product.unit || "Unid.",
                            })
                          )}
                        </td>
                        <td className=" px-4 py-2 text-center">
                          <button
                            onClick={() => handleRemoveProduct(product.id)}
                            className="cursor-pointer hover:bg-red-500 text-gray_b hover:text-white p-1 rounded-sm transition-all duration-200"
                          >
                            <Trash size={20} />
                          </button>
                        </td>
                        <div></div>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <div className="flex items-center space-x-4">
              <div className="w-full flex flex-col ">
                <InputCash
                  label="Monto manual (opcional)"
                  value={newSale.manualAmount || 0}
                  onChange={handleManualAmountChange}
                />
              </div>

              <div
                className={`w-full flex flex-col ${isCredit ? "mt-5" : "mt-8"}`}
              >
                <label
                  className={`${
                    isCredit ? "hidden" : "block"
                  } text-gray_m dark:text-white text-sm font-semibold`}
                >
                  Métodos de Pago
                </label>

                {isCredit ? (
                  <div className="p-2 bg-orange-100 text-orange-800 rounded-md">
                    <p className="font-semibold">
                      VENTA FIADA - Métodos de pago deshabilitados
                    </p>
                  </div>
                ) : (
                  <>
                    {newSale.paymentMethods.map((payment, index) => (
                      <div key={index} className="flex items-center gap-4 mb-2">
                        <Select
                          value={paymentOptions.find(
                            (option) => option.value === payment.method
                          )}
                          onChange={(selected) =>
                            selected &&
                            handlePaymentMethodChange(
                              index,
                              "method",
                              selected.value
                            )
                          }
                          options={paymentOptions}
                          className="w-60 max-w-60 text-gray_b"
                          isDisabled={isCredit}
                        />

                        <div className="relative">
                          <InputCash
                            value={payment.amount}
                            onChange={(value) =>
                              handlePaymentMethodChange(index, "amount", value)
                            }
                            placeholder="Monto"
                            disabled={isCredit}
                          />
                          {index === newSale.paymentMethods.length - 1 &&
                            newSale.paymentMethods.reduce(
                              (sum, m) => sum + m.amount,
                              0
                            ) >
                              newSale.total + 0.1 && (
                              <span className="text-xs text-red-500 ml-2">
                                Exceso: $
                                {(
                                  newSale.paymentMethods.reduce(
                                    (sum, m) => sum + m.amount,
                                    0
                                  ) - newSale.total
                                ).toFixed(2)}
                              </span>
                            )}
                        </div>

                        {newSale.paymentMethods.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePaymentMethod(index)}
                            className="cursor-pointer text-red-500 hover:text-red-700"
                          >
                            <Trash size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                    {!isCredit && (
                      <button
                        type="button"
                        onClick={addPaymentMethod}
                        className="cursor-pointer text-sm text-blue_b dark:text-blue_l hover:text-blue_m flex items-center transition-all duration-200"
                      >
                        <Plus size={16} className="mr-1" /> Agregar otro método
                        de pago
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="creditCheckbox"
                checked={isCredit}
                onChange={(e) => setIsCredit(e.target.checked)}
              />
              <label htmlFor="creditCheckbox">Registrar Fiado</label>
            </div>

            {isCredit && (
              <div>
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Cliente existente
                </label>
                <Select
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={(selected) => {
                    setSelectedCustomer(selected);
                    if (selected) {
                      const customer = customers.find(
                        (c) => c.id === selected.value
                      );
                      setCustomerName(customer?.name || "");
                      setCustomerPhone(customer?.phone || "");
                    }
                  }}
                  placeholder="Buscar cliente..."
                  isClearable
                  className="text-black"
                />
                <div className="flex items-center space-x-4 mt-4">
                  <Input
                    label="Nuevo cliente"
                    placeholder="Nombre del cliente..."
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value.toUpperCase());
                      setSelectedCustomer(null);
                    }}
                    disabled={!!selectedCustomer}
                    onBlur={(e) => {
                      setCustomerName(e.target.value.trim());
                    }}
                  />

                  <Input
                    label="Teléfono del cliente"
                    placeholder="Teléfono del cliente..."
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="p-2 bg-gray_b dark:bg-gray_m text-white text-center mt-4">
              <p className="font-semibold text-3xl">
                TOTAL:{" "}
                {newSale.total.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </p>
              {Math.abs(
                newSale.paymentMethods.reduce((sum, m) => sum + m.amount, 0) -
                  newSale.total
              ) > 0.1 && (
                <p className="text-red-500 text-sm">
                  La suma de los métodos no coincide con el total
                </p>
              )}
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isConfirmModalOpen}
          title="Eliminar Venta"
          onClose={() => setIsConfirmModalOpen(false)}
          buttons={
            <div className="flex justify-end space-x-4">
              <Button
                text="Si"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleDeleteSale}
                hotkey="Enter"
              />
              <Button
                text="No"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsConfirmModalOpen(false)}
                hotkey="Escape"
              />
            </div>
          }
        >
          <p>¿Está seguro de que desea eliminar esta venta?</p>
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

export default VentasPage;
