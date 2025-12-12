"use client";
import {
  useEffect,
  useState,
  SyntheticEvent,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { db } from "@/app/database/db";
import {
  Budget,
  Product,
  ProductOption,
  SaleItem,
  Customer,
  UnitOption,
  DailyCashMovement,
  PaymentSplit,
  Sale,
} from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import Pagination from "@/app/components/Pagination";
import SearchBar from "@/app/components/SearchBar";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import { formatCurrency } from "@/app/lib/utils/currency";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { PDFDownloadLink } from "@react-pdf/renderer";
import BudgetPDF from "@/app/components/BudgetPDF";
import CustomerNotes from "@/app/components/CustomerNotes";
import { useBusinessData } from "@/app/context/BusinessDataContext";
import { ConvertToSaleModal } from "@/app/components/ConvertToSaleModal";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";

import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  useTheme,
  Card,
  CardContent,
  Divider,
  Autocomplete,
  TextField,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  Download,
  Note,
  ShoppingCart,
  Description,
} from "@mui/icons-material";
import Button from "@/app/components/Button";
import Select from "@/app/components/Select";
import CustomChip from "@/app/components/CustomChip";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import ProductSearchAutocomplete from "@/app/components/ProductSearchAutocomplete";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

interface CustomerOption {
  value: string;
  label: string;
}

interface StatusOption {
  value: "pendiente" | "aprobado" | "rechazado";
  label: string;
}

interface BudgetItem extends SaleItem {
  basePrice?: number;
}

interface BudgetFormData {
  date: string;
  customerName: string;
  customerPhone: string;
  items: BudgetItem[];
  total: number;
  deposit: string;
  remaining: number;
  expirationDate: string;
  notes: string;
  status: "pendiente" | "aprobado" | "rechazado" | "cobrado";
  customerId?: string;
}

interface ConversionFactors {
  [key: string]: {
    base: string;
    factor: number;
  };
}

interface StockAvailability {
  available: boolean;
  availableQuantity: number;
  availableUnit: string;
}

const PresupuestosPage = () => {
  const { rubro } = useRubro();
  const { businessData } = useBusinessData();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [filteredBudgets, setFilteredBudgets] = useState<Budget[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBudget, setNewBudget] = useState<BudgetFormData>({
    date: new Date().toISOString(),
    customerName: "",
    customerPhone: "",
    items: [],
    total: 0,
    deposit: "",
    remaining: 0,
    expirationDate: "",
    notes: "",
    status: "pendiente",
  });

  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [budgetToConvert, setBudgetToConvert] = useState<Budget | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const { currentPage, itemsPerPage, setCurrentPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedCustomerForNotes, setSelectedCustomerForNotes] = useState<{
    id: string | null;
    name: string;
  } | null>(null);

  const router = useRouter();
  const theme = useTheme();

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const productSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const CONVERSION_FACTORS: ConversionFactors = {
    A: { base: "A", factor: 1 },
    Bulto: { base: "Bulto", factor: 1 },
    Cajón: { base: "Cajón", factor: 1 },
    Caja: { base: "Caja", factor: 1 },
    Ciento: { base: "Unid.", factor: 100 },
    Cm: { base: "M", factor: 0.01 },
    Docena: { base: "Unid.", factor: 12 },
    Gr: { base: "Kg", factor: 0.001 },
    Kg: { base: "Kg", factor: 1 },
    L: { base: "L", factor: 1 },
    M: { base: "M", factor: 1 },
    "M²": { base: "M²", factor: 1 },
    "M³": { base: "M³", factor: 1 },
    Ml: { base: "L", factor: 0.001 },
    Mm: { base: "M", factor: 0.001 },
    Pulg: { base: "M", factor: 0.0254 },
    Ton: { base: "Kg", factor: 1000 },
    "Unid.": { base: "Unid.", factor: 1 },
    V: { base: "V", factor: 1 },
    W: { base: "W", factor: 1 },
  };

  const unitOptions: UnitOption[] = [
    { value: "A", label: "Amperio", convertible: false },
    { value: "Bulto", label: "Bulto", convertible: false },
    { value: "Cajón", label: "Cajón", convertible: false },
    { value: "Caja", label: "Caja", convertible: false },
    { value: "Ciento", label: "Ciento", convertible: false },
    { value: "Cm", label: "Centímetro", convertible: true },
    { value: "Docena", label: "Docena", convertible: false },
    { value: "Gr", label: "Gramo", convertible: true },
    { value: "Kg", label: "Kilogramo", convertible: true },
    { value: "L", label: "Litro", convertible: true },
    { value: "M", label: "Metro", convertible: true },
    { value: "M²", label: "Metro cuadrado", convertible: false },
    { value: "M³", label: "Metro cúbico", convertible: false },
    { value: "Ml", label: "Mililitro", convertible: true },
    { value: "Mm", label: "Milímetro", convertible: true },
    { value: "Pulg", label: "Pulgada", convertible: true },
    { value: "Ton", label: "Tonelada", convertible: true },
    { value: "Unid.", label: "Unidad", convertible: false },
    { value: "V", label: "Voltio", convertible: false },
    { value: "W", label: "Watt", convertible: false },
  ];

  const statusOptions: StatusOption[] = [
    { value: "pendiente", label: "Pendiente" },
    { value: "aprobado", label: "Aprobado" },
    { value: "rechazado", label: "Rechazado" },
  ];

  const convertToBaseUnit = useCallback(
    (quantity: number, fromUnit: string): number => {
      const unitInfo = CONVERSION_FACTORS[fromUnit];
      return unitInfo ? quantity * unitInfo.factor : quantity;
    },
    []
  );

  const convertFromBaseUnit = useCallback(
    (quantity: number, toUnit: string): number => {
      const unitInfo = CONVERSION_FACTORS[toUnit];
      return unitInfo ? quantity / unitInfo.factor : quantity;
    },
    []
  );

  const convertUnit = useCallback(
    (quantity: number, fromUnit: string, toUnit: string): number => {
      if (fromUnit === toUnit) return quantity;
      const baseQuantity = convertToBaseUnit(quantity, fromUnit);
      return convertFromBaseUnit(baseQuantity, toUnit);
    },
    [convertToBaseUnit, convertFromBaseUnit]
  );

  const getCompatibleUnits = useCallback(
    (productUnit: string): UnitOption[] => {
      if (productUnit === "Unid.") return [];

      const productUnitInfo = CONVERSION_FACTORS[productUnit];
      if (!productUnitInfo) return unitOptions.filter((u) => !u.convertible);

      return unitOptions.filter((option) => {
        if (!option.convertible) return false;
        const optionInfo = CONVERSION_FACTORS[option.value];
        return optionInfo?.base === productUnitInfo.base;
      });
    },
    []
  );

  useEffect(() => {
    const fetchProducts = async () => {
      const storedProducts = await db.products.toArray();
      setProducts(storedProducts);
    };

    fetchProducts();
  }, [rubro]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      setCustomers(allCustomers);

      const filteredCustomers =
        rubro === "Todos los rubros"
          ? allCustomers
          : allCustomers.filter((c) => c.rubro === rubro);

      setCustomerOptions(
        filteredCustomers.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))
      );
    };

    fetchCustomers();
  }, [rubro]);

  useEffect(() => {
    const fetchBudgets = async () => {
      const allBudgets = await db.budgets.toArray();
      const searched = allBudgets.filter(
        (budget) =>
          budget.customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          budget.customerPhone
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase())
      );

      const filtered =
        rubro === "Todos los rubros"
          ? searched
          : searched.filter((budget) => budget.rubro === rubro);

      setBudgets(allBudgets);
      setFilteredBudgets(filtered);
    };

    fetchBudgets();
  }, [rubro, searchQuery]);

  const indexOfLastBudget = currentPage * itemsPerPage;
  const indexOfFirstBudget = indexOfLastBudget - itemsPerPage;
  const currentBudgets = useMemo(
    () => filteredBudgets.slice(indexOfFirstBudget, indexOfLastBudget),
    [filteredBudgets, indexOfFirstBudget, indexOfLastBudget]
  );

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "info") => {
      setNotificationMessage(message);
      setNotificationType(type);
      setIsNotificationOpen(true);
      setTimeout(() => setIsNotificationOpen(false), 2500);
    },
    []
  );

  const calculateTotalAndRemaining = useCallback(
    (items: BudgetItem[], deposit: string) => {
      const total = items.reduce(
        (total, item) =>
          total + item.price * item.quantity * (1 - (item.discount || 0) / 100),
        0
      );
      const depositValue = deposit === "" ? 0 : parseFloat(deposit);
      const remaining = total - (isNaN(depositValue) ? 0 : depositValue);
      return { total, remaining };
    },
    []
  );

  const handleNewBudgetClick = async () => {
    const { needsRedirect } = await ensureCashIsOpen();

    if (needsRedirect) {
      router.push(`/caja-diaria`);
      return;
    }

    setIsModalOpen(true);
  };

  const checkStockAvailability = useCallback(
    (
      product: Product,
      requestedQuantity: number,
      requestedUnit: string
    ): StockAvailability => {
      try {
        const stockInBase = convertToBaseUnit(
          Number(product.stock),
          product.unit
        );
        const requestedInBase = convertToBaseUnit(
          requestedQuantity,
          requestedUnit
        );

        if (stockInBase >= requestedInBase) {
          return {
            available: true,
            availableQuantity: requestedQuantity,
            availableUnit: requestedUnit,
          };
        } else {
          const availableInRequestedUnit = convertFromBaseUnit(
            stockInBase,
            requestedUnit
          );
          return {
            available: false,
            availableQuantity: parseFloat(availableInRequestedUnit.toFixed(3)),
            availableUnit: requestedUnit,
          };
        }
      } catch (error) {
        console.error("Error checking stock:", error);
        return {
          available: false,
          availableQuantity: 0,
          availableUnit: requestedUnit,
        };
      }
    },
    [convertToBaseUnit, convertFromBaseUnit]
  );

  const updateStockAfterSale = useCallback(
    (productId: number, soldQuantity: number, unit: string): number => {
      const product = products.find((p) => p.id === productId);
      if (!product)
        throw new Error(`Producto con ID ${productId} no encontrado`);

      const stockInBase = convertToBaseUnit(
        Number(product.stock),
        product.unit
      );
      const soldInBase = convertToBaseUnit(soldQuantity, unit);
      const newStockInBase = stockInBase - soldInBase;

      return convertFromBaseUnit(newStockInBase, product.unit);
    },
    [products, convertToBaseUnit, convertFromBaseUnit]
  );

  const handleConvertToSale = async (paymentMethods: PaymentSplit[]) => {
    if (!budgetToConvert) return;

    try {
      const deposit =
        budgetToConvert.deposit && parseFloat(budgetToConvert.deposit) > 0
          ? parseFloat(budgetToConvert.deposit)
          : undefined;
      const totalToPay =
        deposit !== undefined
          ? budgetToConvert.total - deposit
          : budgetToConvert.total;
      if (
        Math.abs(
          paymentMethods.reduce((sum, m) => sum + m.amount, 0) - totalToPay
        ) > 0.01
      ) {
        showNotification(
          "La suma de los métodos de pago no coincide con el total a pagar",
          "error"
        );
        return;
      }
      for (const item of budgetToConvert.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const updatedStock = updateStockAfterSale(
            item.productId,
            item.quantity,
            item.unit
          );
          await db.products.update(item.productId, { stock: updatedStock });
        }
      }
      const totalProfit = budgetToConvert.items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return sum;
        const precioConDescuento =
          item.price * (1 - (item.discount || 0) / 100);
        const costPriceInItemUnit = product.costPrice;
        const gananciaPorUnidad = precioConDescuento - costPriceInItemUnit;

        return sum + gananciaPorUnidad * item.quantity;
      }, 0);

      const sale: Sale = {
        id: Date.now(),
        products: budgetToConvert.items.map((item) => ({
          id: item.productId || Date.now(),
          name: item.productName,
          stock: 0,
          costPrice: item.basePrice || 0,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit,
          discount: item.discount || 0,
          rubro: item.rubro || "comercio",
          size: item.size,
          color: item.color,
          description: item.description,
        })),
        paymentMethods,
        total: budgetToConvert.total,
        date: new Date().toISOString(),
        customerName: budgetToConvert.customerName,
        customerPhone: budgetToConvert.customerPhone,
        customerId: budgetToConvert.customerId,
        deposit: deposit,
      };

      await db.sales.add(sale);

      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        const movements: DailyCashMovement[] = [];
        paymentMethods.forEach((method) => {
          const methodAmount = method.amount;
          const paymentRatio = methodAmount / totalToPay;

          const methodProfit =
            totalProfit * (totalToPay / budgetToConvert.total) * paymentRatio;

          movements.push({
            id: Date.now() + Math.random(),
            amount: methodAmount,
            description: `Venta - presupuesto de ${budgetToConvert.customerName}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: method.method,
            profit: methodProfit,
            profitPercentage: (methodProfit / methodAmount) * 100,
            budgetId: budgetToConvert.id,
            fromBudget: true,
            rubro: budgetToConvert.rubro || "comercio",
          });
        });

        const depositMovementIndex = dailyCash.movements.findIndex((m) =>
          m.description?.includes(
            `Presupuesto de ${budgetToConvert.customerName}`
          )
        );

        if (
          depositMovementIndex !== -1 &&
          deposit !== undefined &&
          deposit > 0
        ) {
          const depositRatio = deposit / budgetToConvert.total;
          const depositProfit = totalProfit * depositRatio;

          const updatedMovements = [...dailyCash.movements];
          updatedMovements[depositMovementIndex] = {
            ...updatedMovements[depositMovementIndex],
            profit: depositProfit,
            profitPercentage: (depositProfit / deposit) * 100,
            type: "INGRESO",
            rubro: budgetToConvert.rubro || "comercio",
            items: budgetToConvert.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              costPrice: item.basePrice || 0,
            })),
          };

          const updatedCash = {
            ...dailyCash,
            movements: [...updatedMovements, ...movements],
            totalIncome: (dailyCash.totalIncome || 0) + totalToPay,
            totalProfit: (dailyCash.totalProfit || 0) + totalProfit,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        } else {
          const updatedCash = {
            ...dailyCash,
            movements: [...dailyCash.movements, ...movements],
            totalIncome: (dailyCash.totalIncome || 0) + totalToPay,
            totalProfit: (dailyCash.totalProfit || 0) + totalProfit,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        }
      }

      await db.budgets.update(budgetToConvert.id, {
        convertedToSale: true,
        status: "cobrado",
      });

      setBudgets((prev) =>
        prev.map((b) =>
          b.id === budgetToConvert.id
            ? { ...b, convertedToSale: true, status: "cobrado" }
            : b
        )
      );
      setFilteredBudgets((prev) =>
        prev.map((b) =>
          b.id === budgetToConvert.id
            ? { ...b, convertedToSale: true, status: "cobrado" }
            : b
        )
      );

      showNotification(
        "Presupuesto cobrado como venta exitosamente",
        "success"
      );
      setIsConvertModalOpen(false);
      setBudgetToConvert(null);
    } catch (error) {
      console.error("Error al convertir presupuesto a venta:", error);
      showNotification("Error al convertir presupuesto a venta", "error");
    }
  };

  const handleQuantityChange = useCallback(
    (productId: number, quantity: number, unit: Product["unit"]) => {
      setNewBudget((prevState) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return prevState;

        const stockCheck = checkStockAvailability(product, quantity, unit);
        if (!stockCheck.available) {
          showNotification(
            `No hay suficiente stock para ${
              product.name
            }. Stock disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
              stockCheck.availableUnit
            }`,
            "error"
          );
          return prevState;
        }

        const updatedItems = prevState.items.map((item) => {
          if (item.productId === productId) {
            const newPrice = product.price;
            return {
              ...item,
              quantity,
              unit,
              price: parseFloat(newPrice.toFixed(2)),
              basePrice: product.price,
            };
          }
          return item;
        });

        const { total, remaining } = calculateTotalAndRemaining(
          updatedItems,
          prevState.deposit
        );

        return {
          ...prevState,
          items: updatedItems,
          total,
          remaining,
        };
      });
    },
    [
      products,
      checkStockAvailability,
      showNotification,
      calculateTotalAndRemaining,
    ]
  );

  const handleUnitChange = useCallback(
    (
      productId: number,
      selectedOption: UnitOption | null,
      currentQuantity: number
    ) => {
      if (!selectedOption) return;

      setNewBudget((prev) => {
        const updatedItems = prev.items.map((item) => {
          if (item.productId === productId) {
            const product = products.find((p) => p.id === productId);
            if (!product) return item;

            const compatibleUnits = getCompatibleUnits(product.unit);
            const isCompatible = compatibleUnits.some(
              (u) => u.value === selectedOption.value
            );

            if (!isCompatible) return item;

            const newUnit = selectedOption.value as Product["unit"];
            const basePrice =
              item.basePrice ||
              product.price / convertToBaseUnit(1, product.unit);
            const newPrice = basePrice * convertToBaseUnit(1, newUnit);
            const newQuantity = convertUnit(
              currentQuantity,
              item.unit,
              newUnit
            );

            return {
              ...item,
              unit: newUnit,
              quantity: parseFloat(newQuantity.toFixed(3)),
              price: parseFloat(newPrice.toFixed(2)),
              basePrice: basePrice,
            };
          }
          return item;
        });

        return {
          ...prev,
          items: updatedItems,
          total: calculateTotalAndRemaining(updatedItems, prev.deposit).total,
        };
      });
    },
    [
      products,
      getCompatibleUnits,
      convertToBaseUnit,
      convertUnit,
      calculateTotalAndRemaining,
    ]
  );

  const handleDiscountChange = useCallback(
    (productId: number, discount: string) => {
      let discountValue = discount === "" ? 0 : parseInt(discount) || 0;

      if (discountValue < 0) discountValue = 0;
      if (discountValue > 100) discountValue = 100;

      setNewBudget((prev) => {
        const updatedItems = prev.items.map((item) =>
          item.productId === productId
            ? { ...item, discount: discountValue }
            : item
        );

        const { total, remaining } = calculateTotalAndRemaining(
          updatedItems,
          prev.deposit
        );

        return {
          ...prev,
          items: updatedItems,
          total,
          remaining,
        };
      });
    },
    [calculateTotalAndRemaining]
  );

  const handleRemoveProduct = useCallback(
    (productId: number) => {
      setNewBudget((prev) => {
        const updatedItems = prev.items.filter(
          (item) => item.productId !== productId
        );

        const { total, remaining } = calculateTotalAndRemaining(
          updatedItems,
          prev.deposit
        );

        return {
          ...prev,
          items: updatedItems,
          total,
          remaining,
        };
      });
    },
    [calculateTotalAndRemaining]
  );

  const handleAddBudget = async () => {
    if (!newBudget.customerName.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }
    if (newBudget.items.length === 0) {
      showNotification("Debe seleccionar al menos un producto", "error");
      return;
    }

    try {
      let customerId = selectedCustomer?.value;
      if (!customerId) {
        const tempId = `temp-${Date.now()}`;
        const tempCustomer: Customer = {
          id: tempId,
          name: newBudget.customerName.trim(),
          phone: newBudget.customerPhone || "",
          notes: newBudget.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isTemporary: true,
          status: "activo",
          pendingBalance: 0,
          purchaseHistory: [],
        };
        await db.customers.add(tempCustomer);
        customerId = tempId;
      }

      const budgetToAdd: Budget = {
        ...newBudget,
        id: generateBudgetId(newBudget.customerName),
        customerName: newBudget.customerName.trim(),
        customerPhone: newBudget.customerPhone || "",
        customerId,
        items: newBudget.items,
        total: calculateTotalAndRemaining(newBudget.items, newBudget.deposit)
          .total,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
      };

      await db.budgets.add(budgetToAdd);

      if (newBudget.deposit && parseFloat(newBudget.deposit) > 0) {
        const today = getLocalDateString();
        const dailyCash = await db.dailyCashes.get({ date: today });

        if (dailyCash) {
          const depositAmount = parseFloat(newBudget.deposit);

          const depositMovement: DailyCashMovement = {
            id: Date.now() + Math.random(),
            amount: depositAmount,
            description: `Presupuesto de ${budgetToAdd.customerName}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: "EFECTIVO",
            items: newBudget.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              unit: item.unit,
              price: item.price,
              costPrice: item.basePrice || 0,
            })),
            profit: 0,
            profitPercentage: 0,
            isDeposit: true,
            budgetId: budgetToAdd.id,
            fromBudget: true,
            createdAt: new Date().toISOString(),
          };

          const updatedCash = {
            ...dailyCash,
            movements: [...dailyCash.movements, depositMovement],
            totalIncome: (dailyCash.totalIncome || 0) + depositAmount,
          };

          await db.dailyCashes.update(dailyCash.id, updatedCash);
        }
      }

      const allBudgets = await db.budgets.toArray();
      const filtered = allBudgets.filter((budget) => {
        if (rubro === "Todos los rubros") return true;
        return budget.rubro === rubro;
      });
      setBudgets(allBudgets);
      setFilteredBudgets(filtered);

      setNewBudget({
        date: new Date().toISOString(),
        customerName: "",
        customerPhone: "",
        items: [],
        total: 0,
        deposit: "",
        remaining: 0,
        expirationDate: "",
        notes: "",
        status: "pendiente",
      });
      setSelectedCustomer(null);
      setIsModalOpen(false);
      showNotification("Presupuesto creado correctamente", "success");
    } catch (error) {
      console.error("Error al crear presupuesto:", error);
      showNotification("Error al crear presupuesto", "error");
    }
  };

  const generateBudgetId = useCallback((customerName: string): string => {
    const cleanName = customerName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    const timestamp = Date.now().toString().slice(-5);
    return `${cleanName}-${timestamp}`;
  }, []);

  const handleDeleteClick = useCallback((budget: Budget) => {
    setBudgetToDelete(budget);
    setIsDeleteModalOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!budgetToDelete) return;

    try {
      await db.budgets.delete(budgetToDelete.id);
      setFilteredBudgets(
        filteredBudgets.filter((b) => b.id !== budgetToDelete.id)
      );
      setBudgets(budgets.filter((b) => b.id !== budgetToDelete.id));
      showNotification("Presupuesto eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      showNotification("Error al eliminar presupuesto", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleEditClick = useCallback(
    (budget: Budget) => {
      setEditingBudget(budget);
      setNewBudget({
        date: budget.date,
        customerName: budget.customerName,
        customerPhone: budget.customerPhone || "",
        customerId: budget.customerId,
        items: budget.items.map((item) => ({
          ...item,
          basePrice:
            item.basePrice ||
            (products.find((p) => p.id === item.productId)?.price || 0) /
              convertToBaseUnit(1, item.unit),
        })),
        total: budget.total,
        deposit: budget.deposit,
        remaining: budget.remaining,
        expirationDate: budget.expirationDate || "",
        notes: budget.notes || "",
        status: budget.status || "pendiente",
      });

      if (budget.customerId) {
        const customer = customers.find((c) => c.id === budget.customerId);
        if (customer) {
          setSelectedCustomer({
            value: customer.id,
            label: customer.name,
          });
        }
      } else {
        setSelectedCustomer(null);
      }

      setIsModalOpen(true);
    },
    [products, customers, convertToBaseUnit]
  );

  const handleUpdateBudget = async () => {
    if (!editingBudget || !newBudget.customerName.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const { total, remaining } = calculateTotalAndRemaining(
        newBudget.items,
        newBudget.deposit
      );

      const updatedBudget = {
        ...editingBudget,
        customerName: newBudget.customerName.trim(),
        customerPhone: newBudget.customerPhone,
        customerId: selectedCustomer?.value || "",
        items: newBudget.items,
        total,
        deposit: newBudget.deposit,
        remaining,
        expirationDate: newBudget.expirationDate,
        notes: newBudget.notes,
        status: newBudget.status,
        updatedAt: new Date().toISOString(),
      };

      await db.budgets.update(editingBudget.id, updatedBudget);

      setBudgets(
        budgets.map((b) => (b.id === editingBudget.id ? updatedBudget : b))
      );

      setFilteredBudgets(
        filteredBudgets.map((b) =>
          b.id === editingBudget.id ? updatedBudget : b
        )
      );

      setNewBudget({
        date: "",
        customerName: "",
        customerPhone: "",
        items: [],
        total: 0,
        deposit: "",
        remaining: 0,
        expirationDate: "",
        notes: "",
        status: "pendiente",
      });
      setSelectedCustomer(null);
      setEditingBudget(null);
      setIsModalOpen(false);
      showNotification("Presupuesto actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar presupuesto:", error);
      showNotification("Error al actualizar presupuesto", "error");
    }
  };

  const handleDownloadPDF = useCallback(
    (budget: Budget) => {
      return (
        <PDFDownloadLink
          document={
            <BudgetPDF
              budget={{
                ...budget,
                deposit: budget.deposit || "0",
                remaining: budget.remaining || budget.total,
              }}
              businessData={businessData}
            />
          }
          fileName={`Presupuesto de ${budget.customerName} - ${new Date(
            budget.createdAt
          ).toLocaleDateString("es-ES")}.pdf`}
        >
          {({ loading }) => (
            <CustomGlobalTooltip title="Descargar presupuesto">
              <span>
                <IconButton
                  size="small"
                  disabled={loading}
                  sx={{
                    color: theme.palette.text.secondary,
                    "&:hover": {
                      backgroundColor: theme.palette.primary.main,
                      color: "white",
                    },
                  }}
                >
                  <Download fontSize="small" />
                </IconButton>
              </span>
            </CustomGlobalTooltip>
          )}
        </PDFDownloadLink>
      );
    },
    [businessData, theme]
  );

  const handleSearch = useCallback(
    (query: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery(query);
        setCurrentPage(1);
      }, 300);
    },
    [setCurrentPage]
  );

  const handleShowNotes = useCallback((budget: Budget) => {
    setSelectedCustomerForNotes({
      id: budget.customerId || null,
      name: budget.customerName,
    });
    setNotesModalOpen(true);
  }, []);

  const handleCustomerSelect = useCallback(
    (event: SyntheticEvent | null, selectedOption: CustomerOption | null) => {
      setSelectedCustomer(selectedOption);
      if (selectedOption) {
        const customer = customers.find((c) => c.id === selectedOption.value);
        if (customer) {
          setNewBudget((prev) => ({
            ...prev,
            customerName: customer.name,
            customerPhone: customer.phone || "",
          }));
        }
      } else {
        setNewBudget((prev) => ({
          ...prev,
          customerName: "",
          customerPhone: "",
        }));
      }
    },
    [customers]
  );

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (productSearchTimeoutRef.current) {
        clearTimeout(productSearchTimeoutRef.current);
      }
    };
  }, []);

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
          Presupuestos
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
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 1,
              gap: 2,
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              onClick={handleNewBudgetClick}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
              startIcon={<Add />}
            >
              Nuevo Presupuesto
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            flex: 1,
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "63vh", flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                      }}
                    >
                      Cliente
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                      }}
                      align="center"
                    >
                      Teléfono
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                      }}
                      align="center"
                    >
                      Total
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha Presupuesto
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Fecha Expiración
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        fontWeight: "bold",
                        textAlign: "center",
                      }}
                    >
                      Estado
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                          fontWeight: "bold",
                          textAlign: "center",
                        }}
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentBudgets.length > 0 ? (
                    currentBudgets.map((budget) => (
                      <TableRow
                        key={budget.id}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          "&:hover": {
                            backgroundColor: "action.hover",
                            transform: "translateY(-1px)",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                          },
                          transition: "all 0.3s ease-in-out",
                        }}
                      >
                        <TableCell sx={{ fontWeight: "medium" }}>
                          {budget.customerName}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.customerPhone || "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.status === "cobrado" ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                              }}
                            >
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: "line-through",
                                  color: "text.disabled",
                                }}
                              >
                                {formatCurrency(
                                  budget.total -
                                    (budget.deposit
                                      ? parseFloat(budget.deposit)
                                      : 0)
                                )}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ color: "primary.main" }}
                              >
                                (Cobrado)
                              </Typography>
                            </Box>
                          ) : (
                            formatCurrency(
                              budget.total -
                                (budget.deposit
                                  ? parseFloat(budget.deposit)
                                  : 0)
                            )
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {new Date(budget.createdAt).toLocaleDateString(
                            "es-AR"
                          )}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          {budget.expirationDate
                            ? new Date(
                                budget.expirationDate
                              ).toLocaleDateString("es-AR")
                            : "-"}
                        </TableCell>
                        <TableCell sx={{ textAlign: "center" }}>
                          <CustomChip
                            label={budget.status}
                            size="small"
                            color={
                              budget.status === "aprobado"
                                ? "success"
                                : budget.status === "rechazado"
                                ? "error"
                                : budget.status === "cobrado"
                                ? "success"
                                : "warning"
                            }
                            variant="filled"
                          />
                        </TableCell>
                        {rubro !== "Todos los rubros" && (
                          <TableCell>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 0.5,
                              }}
                            >
                              <CustomGlobalTooltip
                                title={
                                  budget.status === "cobrado"
                                    ? "Presupuesto ya cobrado"
                                    : "Cobrar como venta"
                                }
                              >
                                <span>
                                  {" "}
                                  {/* Wrapper necesario para tooltip con elemento deshabilitado */}
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      if (budget.status !== "cobrado") {
                                        setBudgetToConvert(budget);
                                        setIsConvertModalOpen(true);
                                      }
                                    }}
                                    disabled={budget.status === "cobrado"}
                                    sx={{
                                      borderRadius: "4px",
                                      color:
                                        budget.status === "cobrado"
                                          ? "text.disabled"
                                          : "text.secondary",
                                      "&:hover":
                                        budget.status !== "cobrado"
                                          ? {
                                              backgroundColor: "success.main",
                                              color: "white",
                                            }
                                          : {},
                                    }}
                                  >
                                    <ShoppingCart fontSize="small" />
                                  </IconButton>
                                </span>
                              </CustomGlobalTooltip>

                              {handleDownloadPDF(budget)}

                              <CustomGlobalTooltip
                                title={
                                  !budget.customerId
                                    ? "No hay cliente asociado"
                                    : "Ver notas del cliente"
                                }
                              >
                                <span>
                                  {" "}
                                  {/* Wrapper necesario para tooltip con elemento deshabilitado */}
                                  <IconButton
                                    size="small"
                                    onClick={() => handleShowNotes(budget)}
                                    disabled={!budget.customerId}
                                    sx={{
                                      borderRadius: "4px",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "info.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <Note fontSize="small" />
                                  </IconButton>
                                </span>
                              </CustomGlobalTooltip>
                              <CustomGlobalTooltip title="Editar presupuesto">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEditClick(budget)}
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

                              <CustomGlobalTooltip title="Eliminar presupuesto">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteClick(budget)}
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                          }}
                        >
                          <Description
                            sx={{
                              fontSize: 64,
                              mb: 2,
                              color: "text.disabled",
                            }}
                          />
                          <Typography>
                            {searchQuery
                              ? "No se encontraron presupuestos"
                              : "No hay presupuestos registrados"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredBudgets.length > 0 && (
            <Pagination
              text="Presupuestos por página"
              text2="Total de presupuestos"
              totalItems={filteredBudgets.length}
            />
          )}
        </Box>

        {isConvertModalOpen && budgetToConvert && (
          <ConvertToSaleModal
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
            budget={budgetToConvert}
            onConfirm={handleConvertToSale}
          />
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingBudget(null);
            setNewBudget({
              date: new Date().toISOString(),
              customerName: "",
              customerPhone: "",
              items: [],
              total: 0,
              deposit: "",
              remaining: 0,
              expirationDate: "",
              notes: "",
              status: "pendiente",
            });
            setSelectedCustomer(null);
          }}
          title={editingBudget ? "Editar Presupuesto" : "Nuevo Presupuesto"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingBudget(null);
                  setNewBudget({
                    date: new Date().toISOString(),
                    customerName: "",
                    customerPhone: "",
                    items: [],
                    total: 0,
                    deposit: "",
                    remaining: 0,
                    expirationDate: "",
                    notes: "",
                    status: "pendiente",
                  });
                  setSelectedCustomer(null);
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
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={editingBudget ? handleUpdateBudget : handleAddBudget}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingBudget ? "Actualizar" : "Crear"}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ width: "100%" }}>
              <Select
                label="Seleccionar cliente existente"
                options={customerOptions}
                value={selectedCustomer?.value || ""}
                onChange={(value: string) => {
                  const selected = customerOptions.find(
                    (option) => option.value === value
                  );
                  handleCustomerSelect(null, selected || null);
                }}
                size="small"
                variant="outlined"
                sx={{ mt: 0.5 }}
              />
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ width: "50%" }}>
                <Input
                  label="Nombre del cliente"
                  value={newBudget.customerName}
                  onRawChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewBudget({ ...newBudget, customerName: e.target.value })
                  }
                  placeholder="Ingrese el nombre del cliente"
                  required
                  disabled={!!selectedCustomer}
                />
              </Box>
              <Box sx={{ width: "50%" }}>
                <Input
                  label="Teléfono (opcional)"
                  value={newBudget.customerPhone || ""}
                  onRawChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewBudget({
                      ...newBudget,
                      customerPhone: e.target.value,
                    })
                  }
                  placeholder="Ingrese el teléfono"
                  disabled={!!selectedCustomer}
                />
              </Box>
            </Box>

            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ width: "50%" }}>
                <CustomDatePicker
                  label="Fecha de expiración"
                  value={newBudget.expirationDate || ""}
                  onChange={(date: string) =>
                    setNewBudget({ ...newBudget, expirationDate: date || "" })
                  }
                />
              </Box>
              <Box sx={{ width: "50%" }}>
                <Select
                  label="Estado"
                  options={statusOptions.map((option) => ({
                    value: option.value,
                    label: option.label,
                  }))}
                  value={newBudget.status}
                  onChange={(value: string) => {
                    setNewBudget({
                      ...newBudget,
                      status: value as "pendiente" | "aprobado" | "rechazado",
                    });
                  }}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>

            <Box>
              <Box sx={{ mb: 2 }}>
                <ProductSearchAutocomplete
                  products={products}
                  selectedProducts={newBudget.items.map((item) => {
                    const product = products.find(
                      (p) => p.id === item.productId
                    );
                    return {
                      value: item.productId,
                      label: getDisplayProductName(
                        {
                          name: product?.name || item.productName,
                          size: product?.size || item.size,
                          color: product?.color || item.color,
                          rubro: product?.rubro || item.rubro,
                          lot: product?.lot,
                        },
                        rubro,
                        true
                      ),
                      product: product!,
                      isDisabled: false,
                    } as ProductOption;
                  })}
                  onProductSelect={(selectedOptions) => {
                    // Filtrar solo las opciones que no están deshabilitadas
                    const enabledOptions = selectedOptions.filter(
                      (option) => !option.isDisabled
                    );

                    // Crear un mapa de los items existentes para preservar sus valores
                    const existingItemsMap = new Map(
                      newBudget.items.map((item) => [item.productId, item])
                    );

                    // Crear el nuevo array de items preservando los valores existentes
                    const updatedItems = enabledOptions.map((option) => {
                      const existingItem = existingItemsMap.get(option.value);
                      const product =
                        option.product ||
                        products.find((p) => p.id === option.value);

                      if (existingItem) {
                        // Si el producto ya existe en el presupuesto, preserva sus valores
                        return {
                          ...existingItem,
                          productName:
                            product?.name || existingItem.productName,
                          price: product?.price || existingItem.price,
                          unit: product?.unit || existingItem.unit,
                          basePrice: product
                            ? product.price / convertToBaseUnit(1, product.unit)
                            : existingItem.basePrice,
                        };
                      } else {
                        // Si es un producto nuevo, usar valores por defecto
                        return {
                          productId: option.value,
                          productName: product?.name || "",
                          price: product?.price || 0,
                          quantity: 1,
                          unit: product?.unit || "Unid.",
                          discount: 0,
                          size: product?.size,
                          color: product?.color,
                          basePrice: product
                            ? product.price / convertToBaseUnit(1, product.unit)
                            : 0,
                        };
                      }
                    });

                    const { total, remaining } = calculateTotalAndRemaining(
                      updatedItems,
                      newBudget.deposit
                    );

                    setNewBudget((prev) => ({
                      ...prev,
                      items: updatedItems,
                      total,
                      remaining,
                    }));
                  }}
                  onSearchChange={(query) => {
                    console.log("Búsqueda de productos:", query);
                  }}
                  rubro={rubro}
                  placeholder="Seleccionar productos"
                  maxDisplayed={50}
                />
              </Box>

              {newBudget.items.length > 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ maxHeight: "35vh", overflow: "auto" }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow
                            sx={{ backgroundColor: theme.palette.primary.main }}
                          >
                            <TableCell
                              sx={{ color: "white", fontWeight: "bold" }}
                            >
                              Producto
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Unidad
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Cantidad
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Descuento (%)
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Precio Unit.
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Subtotal
                            </TableCell>
                            <TableCell
                              sx={{
                                color: "white",
                                fontWeight: "bold",
                                textAlign: "center",
                              }}
                            >
                              Acciones
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {newBudget.items.map((item) => {
                            const product = products.find(
                              (p) => p.id === item.productId
                            );
                            return (
                              <TableRow key={item.productId}>
                                <TableCell>
                                  {item.productName}
                                  {item.size && ` (${item.size})`}
                                  {item.color && ` - ${item.color}`}
                                </TableCell>
                                <TableCell>
                                  {product?.unit === "Unid." ? (
                                    <Typography
                                      variant="body2"
                                      sx={{ textAlign: "center" }}
                                    >
                                      Unidad
                                    </Typography>
                                  ) : (
                                    <Autocomplete
                                      options={
                                        product
                                          ? getCompatibleUnits(product.unit)
                                          : []
                                      }
                                      value={unitOptions.find(
                                        (option) => option.value === item.unit
                                      )}
                                      onChange={(
                                        event: SyntheticEvent,
                                        newValue: UnitOption | null
                                      ) => {
                                        if (newValue && product) {
                                          handleUnitChange(
                                            item.productId,
                                            newValue,
                                            item.quantity
                                          );
                                        }
                                      }}
                                      renderInput={(params) => (
                                        <TextField
                                          {...params}
                                          placeholder="Unidad"
                                          size="small"
                                        />
                                      )}
                                      isOptionEqualToValue={(option, value) =>
                                        option.value === value.value
                                      }
                                      noOptionsText="No se encontraron opciones"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step={
                                      item.unit === "Kg" || item.unit === "L"
                                        ? "0.001"
                                        : "1"
                                    }
                                    value={
                                      item.quantity === 0 ? "" : item.quantity
                                    }
                                    onRawChange={(
                                      e: React.ChangeEvent<HTMLInputElement>
                                    ) => {
                                      const value = e.target.value;
                                      if (value === "") {
                                        handleQuantityChange(
                                          item.productId,
                                          0,
                                          item.unit
                                        );
                                      } else {
                                        const numValue = parseFloat(value);
                                        if (!isNaN(numValue)) {
                                          handleQuantityChange(
                                            item.productId,
                                            Math.max(0.001, numValue),
                                            item.unit
                                          );
                                        }
                                      }
                                    }}
                                    onBlur={(
                                      e: React.FocusEvent<HTMLInputElement>
                                    ) => {
                                      if (
                                        e.target.value === "" ||
                                        parseFloat(e.target.value) < 0.001
                                      ) {
                                        handleQuantityChange(
                                          item.productId,
                                          1,
                                          item.unit
                                        );
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    step="1"
                                    value={
                                      item.discount === 0 ? "" : item.discount
                                    }
                                    onRawChange={(
                                      e: React.ChangeEvent<HTMLInputElement>
                                    ) => {
                                      const value = e.target.value;
                                      if (
                                        value === "" ||
                                        /^[0-9]*$/.test(value)
                                      ) {
                                        handleDiscountChange(
                                          item.productId,
                                          value
                                        );
                                      }
                                    }}
                                    onBlur={(
                                      e: React.FocusEvent<HTMLInputElement>
                                    ) => {
                                      if (e.target.value === "") {
                                        handleDiscountChange(
                                          item.productId,
                                          "0"
                                        );
                                      } else {
                                        const numValue = parseInt(
                                          e.target.value
                                        );
                                        if (isNaN(numValue)) {
                                          handleDiscountChange(
                                            item.productId,
                                            "0"
                                          );
                                        } else if (numValue < 0) {
                                          handleDiscountChange(
                                            item.productId,
                                            "0"
                                          );
                                        } else if (numValue > 100) {
                                          handleDiscountChange(
                                            item.productId,
                                            "100"
                                          );
                                        }
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  {formatCurrency(item.price)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  {formatCurrency(
                                    item.price *
                                      item.quantity *
                                      (1 - (item.discount || 0) / 100)
                                  )}
                                </TableCell>
                                <TableCell sx={{ textAlign: "center" }}>
                                  <CustomGlobalTooltip title="Eliminar producto">
                                    <IconButton
                                      onClick={() =>
                                        handleRemoveProduct(item.productId)
                                      }
                                      size="small"
                                      sx={{
                                        color: "error.main",
                                        "&:hover": {
                                          color: "error.dark",
                                        },
                                      }}
                                    >
                                      <Delete fontSize="small" />
                                    </IconButton>
                                  </CustomGlobalTooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </Box>

                    <Divider />

                    <Box sx={{ p: 2, backgroundColor: theme.palette.grey[50] }}>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box sx={{ width: "50%" }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            <Box sx={{ width: "50%" }}>
                              <Input
                                label="Seña en efectivo (opcional)"
                                type="number"
                                value={newBudget.deposit}
                                onRawChange={(
                                  e: React.ChangeEvent<HTMLInputElement>
                                ) => {
                                  const value = e.target.value;
                                  if (
                                    value === "" ||
                                    /^[0-9]*\.?[0-9]*$/.test(value)
                                  ) {
                                    const depositValue =
                                      value === "" ? 0 : parseFloat(value);
                                    const remaining =
                                      newBudget.total - depositValue;
                                    setNewBudget({
                                      ...newBudget,
                                      deposit: value,
                                      remaining,
                                    });
                                  }
                                }}
                                onBlur={(
                                  e: React.FocusEvent<HTMLInputElement>
                                ) => {
                                  if (e.target.value === "") {
                                    setNewBudget({
                                      ...newBudget,
                                      deposit: "",
                                      remaining: newBudget.total,
                                    });
                                  } else {
                                    const numValue = parseFloat(e.target.value);
                                    if (isNaN(numValue)) {
                                      setNewBudget({
                                        ...newBudget,
                                        deposit: "",
                                        remaining: newBudget.total,
                                      });
                                    }
                                  }
                                }}
                                placeholder="Ingrese el monto de la seña"
                              />
                            </Box>
                            <Box sx={{ width: "50%" }}>
                              <TextField
                                label="Saldo restante"
                                value={formatCurrency(newBudget.remaining)}
                                InputProps={{
                                  readOnly: true,
                                  sx: {
                                    backgroundColor: "background.paper",
                                    "& .MuiInputBase-input": {
                                      textAlign: "center",
                                      fontWeight: "medium",
                                    },
                                  },
                                }}
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                variant="outlined"
                                fullWidth
                                size="small"
                              />
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ width: "50%", textAlign: "right" }}>
                          <Typography variant="h6" fontWeight="bold">
                            Total: {formatCurrency(newBudget.total)}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
          buttons={
            <>
              <Button
                variant="text"
                onClick={() => setIsDeleteModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "divider",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.secondary",
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
                  backgroundColor: "error.main",
                  "&:hover": {
                    backgroundColor: "error.dark",
                  },
                }}
              >
                Sí, Eliminar
              </Button>
            </>
          }
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea eliminar el presupuesto?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              El presupuesto será eliminado permanentemente.
            </Typography>
          </Box>
        </Modal>

        {selectedCustomerForNotes && (
          <CustomerNotes
            customerId={selectedCustomerForNotes.id}
            customerName={selectedCustomerForNotes.name}
            isOpen={notesModalOpen}
            onClose={() => setNotesModalOpen(false)}
          />
        )}

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default PresupuestosPage;
