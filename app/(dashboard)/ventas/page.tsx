"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  CreditSale,
  Customer,
  DailyCashMovement,
  MonthOption,
  Payment,
  PaymentSplit,
  Product,
  Promotion,
  Sale,
  UnitOption,
} from "@/app/lib/types/types";
import { Plus, Printer, ShoppingCart, Trash, Tag, Check } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { useRubro } from "@/app/context/RubroContext";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";

import PrintableTicket, {
  PrintableTicketHandle,
} from "@/app/components/PrintableTicket";
import { useBusinessData } from "@/app/context/BusinessDataContext";
import { usePagination } from "@/app/context/PaginationContext";
import {
  convertToBaseUnit,
  convertFromBaseUnit,
  calculatePrice,
  calculateCombinedTotal,
  calculateTotalProfit,
  checkStockAvailability,
} from "@/app/lib/utils/calculations";

type SelectOption = {
  value: number;
  label: string;
  product: Product;
  isDisabled: boolean;
};

const VentasPage = () => {
  const { businessData } = useBusinessData();
  const { rubro } = useRubro();
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
    manualProfitPercentage: 0,
    concept: "",
  });

  const router = useRouter();
  const ticketRef = useRef<PrintableTicketHandle>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const { currentPage, itemsPerPage } = usePagination();
  const [selectedMonth, setSelectedMonth] = useState<number>(
    () => new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState<number>(() =>
    new Date().getFullYear()
  );
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
  const [registerCheck, setRegisterCheck] = useState(false);
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>(
    []
  );
  const [selectedPromotions, setSelectedPromotions] =
    useState<Promotion | null>(null);
  const [temporarySelectedPromotion, setTemporarySelectedPromotion] =
    useState<Promotion | null>(null);
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);

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
    { value: "M", label: "Metro", convertible: true },
    { value: "Cm", label: "Centímetro", convertible: true },
    { value: "Docena", label: "Docena", convertible: false },
    { value: "Caja", label: "Caja", convertible: false },
    { value: "Bulto", label: "Bulto", convertible: false },
    { value: "Cajón", label: "Cajón", convertible: false },
    { value: "Mm", label: "Milímetro", convertible: true },
    { value: "Pulg", label: "Pulgada", convertible: true },
    { value: "M²", label: "Metro cuadrado", convertible: false },
    { value: "M³", label: "Metro cúbico", convertible: false },
    { value: "Ciento", label: "Ciento", convertible: false },
    { value: "Ton", label: "Tonelada", convertible: true },
    { value: "V", label: "Voltio", convertible: false },
    { value: "W", label: "Watt", convertible: false },
    { value: "A", label: "Amperio", convertible: false },
  ];

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

  // ✅ FUNCIÓN MEJORADA: Calcular total final considerando promociones
  const calculateFinalTotal = (
    products: Product[],
    manualAmount: number = 0,
    promotion?: Promotion | null
  ): number => {
    const subtotal = calculateCombinedTotal(products) + manualAmount;

    if (!promotion) return subtotal;

    let discount = 0;
    if (promotion.type === "PERCENTAGE_DISCOUNT") {
      discount = (subtotal * promotion.discount) / 100;
    } else if (promotion.type === "FIXED_DISCOUNT") {
      discount = promotion.discount;
    }

    return Math.max(0, subtotal - Math.min(discount, subtotal));
  };

  // ✅ FUNCIÓN MEJORADA: Validar stock para la venta
  const validateStockForSale = (
    saleProducts: Product[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    for (const product of saleProducts) {
      const originalProduct = products.find((p) => p.id === product.id);
      if (!originalProduct) {
        errors.push(`Producto ${product.name} no encontrado`);
        continue;
      }

      const stockCheck = checkStockAvailability(
        originalProduct,
        product.quantity,
        product.unit
      );

      if (!stockCheck.available) {
        errors.push(
          `Stock insuficiente para ${product.name}. ` +
            `Solicitado: ${product.quantity} ${product.unit}, ` +
            `Disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
              stockCheck.availableUnit
            }`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // ✅ FUNCIÓN MEJORADA: Sincronizar métodos de pago
  const synchronizePaymentMethods = (
    paymentMethods: PaymentSplit[],
    total: number
  ): PaymentSplit[] => {
    const currentTotal = paymentMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );

    if (Math.abs(currentTotal - total) < 0.01) {
      return paymentMethods; // Ya están sincronizados
    }

    if (paymentMethods.length === 1) {
      // Un solo método: asignar el total completo
      return [{ ...paymentMethods[0], amount: total }];
    } else {
      // Múltiples métodos: distribuir proporcionalmente
      const ratio = total / currentTotal;
      return paymentMethods.map((method) => ({
        ...method,
        amount: parseFloat((method.amount * ratio).toFixed(2)),
      }));
    }
  };

  const applyPromotionsToProducts = useCallback(
    (promotionToApply: Promotion) => {
      setNewSale((prev) => {
        // Calcular el subtotal actual
        const currentSubtotal =
          calculateCombinedTotal(prev.products) + (prev.manualAmount || 0);

        // Verificar monto mínimo de compra si está configurado
        if (
          promotionToApply.minPurchaseAmount &&
          promotionToApply.minPurchaseAmount > 0
        ) {
          if (currentSubtotal < promotionToApply.minPurchaseAmount) {
            showNotification(
              `Esta promoción requiere un monto mínimo de ${formatCurrency(
                promotionToApply.minPurchaseAmount
              )}. Subtotal actual: ${formatCurrency(currentSubtotal)}`,
              "error"
            );
            return prev;
          }
        }

        // Verificar vigencia de la promoción
        const now = new Date();
        const startDate = new Date(promotionToApply.startDate);
        const endDate = promotionToApply.endDate
          ? new Date(promotionToApply.endDate)
          : null;

        if (now < startDate) {
          showNotification(
            `Esta promoción estará disponible a partir del ${startDate.toLocaleDateString()}`,
            "error"
          );
          return prev;
        }

        if (endDate && now > endDate) {
          showNotification(
            `Esta promoción expiró el ${endDate.toLocaleDateString()}`,
            "error"
          );
          return prev;
        }

        if (promotionToApply.status === "inactive") {
          showNotification("Esta promoción no está activa", "error");
          return prev;
        }

        // Calcular el monto del descuento
        let discountAmount = 0;
        if (promotionToApply.type === "PERCENTAGE_DISCOUNT") {
          discountAmount = (currentSubtotal * promotionToApply.discount) / 100;
        } else if (promotionToApply.type === "FIXED_DISCOUNT") {
          discountAmount = promotionToApply.discount;
        }

        discountAmount = Math.min(discountAmount, currentSubtotal);
        const newTotal = Math.max(0, currentSubtotal - discountAmount);

        // ✅ CORREGIDO: Recalcular métodos de pago con el nuevo total
        const updatedPaymentMethods = synchronizePaymentMethods(
          prev.paymentMethods,
          newTotal
        );

        showNotification(`Promoción aplicada correctamente`, "success");

        return {
          ...prev,
          total: newTotal,
          paymentMethods: updatedPaymentMethods,
          appliedPromotion: promotionToApply,
        };
      });
    },
    []
  );

  const removePromotion = () => {
    setNewSale((prevSale) => {
      const currentSubtotal =
        calculateCombinedTotal(prevSale.products) +
        (prevSale.manualAmount || 0);

      // ✅ CORREGIDO: Recalcular métodos de pago al remover la promoción
      const updatedPaymentMethods = synchronizePaymentMethods(
        prevSale.paymentMethods,
        currentSubtotal
      );

      return {
        ...prevSale,
        total: currentSubtotal,
        paymentMethods: updatedPaymentMethods,
        appliedPromotion: undefined,
      };
    });
    setSelectedPromotions(null);
    showNotification("Promoción removida", "info");
  };

  const handlePromotionSelect = (promotion: Promotion) => {
    setTemporarySelectedPromotion((prev) => {
      // Si ya está seleccionada, deseleccionar
      if (prev?.id === promotion.id) {
        return null;
      }
      return promotion;
    });
  };

  const SelectedPromotionsBadge = () => {
    if (!selectedPromotions) return null;

    const currentSubtotal =
      calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);
    const meetsRequirements =
      !selectedPromotions.minPurchaseAmount ||
      currentSubtotal >= selectedPromotions.minPurchaseAmount;

    // Verificar vigencia
    const now = new Date();
    const startDate = new Date(selectedPromotions.startDate);
    const endDate = selectedPromotions.endDate
      ? new Date(selectedPromotions.endDate)
      : null;
    const isActive = selectedPromotions.status === "active";
    const isInDateRange = now >= startDate && (!endDate || now <= endDate);

    const isValid = meetsRequirements && isActive && isInDateRange;

    return (
      <div className="flex items-center gap-4 p-2">
        <div className="w-full flex items-center justify-end gap-4">
          <span className="text-xs font-semibold text-gray_b">
            Promoción aplicada:
          </span>
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isValid ? "bg-green_xl text-green_b" : "bg-red_xl text-red_b"
            }`}
          >
            <Tag size={12} />
            <span>{selectedPromotions.name}</span>
            {!isValid && (
              <span className="ml-1 text-xs">
                {!meetsRequirements &&
                  `(Requiere: ${formatCurrency(
                    selectedPromotions.minPurchaseAmount || 0
                  )})`}
                {!isActive && "(Inactiva)"}
                {!isInDateRange && "(Fuera de vigencia)"}
              </span>
            )}
            <button
              onClick={removePromotion}
              className="cursor-pointer ml-1 hover:text-green_b transition-colors"
              title="Remover promoción"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  };

  const PromotionSelectionModal = () => {
    const handleCloseModal = () => {
      setIsPromotionModalOpen(false);
      setTemporarySelectedPromotion(null);
    };

    const handleApplyPromotion = () => {
      if (!temporarySelectedPromotion) {
        showNotification("Por favor selecciona una promoción", "error");
        return;
      }

      // Verificar si ya hay una promoción aplicada
      if (selectedPromotions) {
        showNotification(
          "Ya hay una promoción aplicada. Remueve la actual para aplicar una nueva.",
          "error"
        );
        return;
      }

      setSelectedPromotions(temporarySelectedPromotion);
      applyPromotionsToProducts(temporarySelectedPromotion);
      setIsPromotionModalOpen(false);
    };

    // Función para verificar si una promoción es aplicable
    const isPromotionApplicable = (promotion: Promotion) => {
      const currentSubtotal =
        calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);
      const now = new Date();
      const startDate = new Date(promotion.startDate);
      const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

      // Verificar monto mínimo
      if (promotion.minPurchaseAmount && promotion.minPurchaseAmount > 0) {
        if (currentSubtotal < promotion.minPurchaseAmount) {
          return false;
        }
      }

      // Verificar vigencia
      if (now < startDate) return false;
      if (endDate && now > endDate) return false;

      // Verificar estado
      if (promotion.status !== "active") return false;

      return true;
    };

    // Función para renderizar la información de la promoción condicionalmente
    const renderPromotionInfo = (promotion: Promotion) => {
      const infoItems = [];

      // Solo mostrar monto mínimo si está definido y mayor a 0
      if (promotion.minPurchaseAmount && promotion.minPurchaseAmount > 0) {
        infoItems.push(
          <p key="minPurchase" className="text-gray_l dark:text-gray_xxl"></p>
        );
      }

      if (infoItems.length === 0) {
        return null;
      }

      return (
        <div className="mt-2 text-xs text-gray_m space-y-1">{infoItems}</div>
      );
    };

    return (
      <Modal
        isOpen={isPromotionModalOpen}
        onClose={handleCloseModal}
        title="Seleccionar Promoción"
        buttons={
          <div className="flex justify-end space-x-4">
            <Button
              title="Aplicar promoción"
              text="Aplicar"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleApplyPromotion}
              disabled={!temporarySelectedPromotion}
            />
            <Button
              title="Cancelar"
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
              onClick={handleCloseModal}
            />
          </div>
        }
      >
        <div className="max-h-96 overflow-y-auto">
          <div className="grid gap-3">
            {availablePromotions.length > 0 ? (
              availablePromotions.map((promotion) => {
                const isApplicable = isPromotionApplicable(promotion);
                const currentSubtotal =
                  calculateCombinedTotal(newSale.products) +
                  (newSale.manualAmount || 0);

                return (
                  <div
                    key={promotion.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                      temporarySelectedPromotion?.id === promotion.id
                        ? "border-blue_m bg-blue_xl dark:bg-gray_l"
                        : isApplicable
                        ? "bg-white dark:bg-gray_m hover:bg-blue_xl hover:dark:bg-gray_l border-gray_xl"
                        : "opacity-70 bg-gray_xl dark:bg-gray_m border-gray_l cursor-not-allowed"
                    }`}
                    onClick={() =>
                      isApplicable && handlePromotionSelect(promotion)
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 ">
                        <div className="flex items-center gap-2 ">
                          <h3
                            className={`uppercase font-semibold text-gray_b dark:text-white text-md`}
                          >
                            {promotion.name}
                          </h3>
                          <span
                            className={`min-w-10 px-2 py-1 rounded-full text-sm font-semibold ${
                              promotion.type === "PERCENTAGE_DISCOUNT"
                                ? "bg-green_xl text-green_b"
                                : "bg-blue_m text-white"
                            }`}
                          >
                            {promotion.type === "PERCENTAGE_DISCOUNT"
                              ? `${promotion.discount}%`
                              : `$${promotion.discount}`}
                          </span>
                          {!isApplicable && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red_xl text-red_b">
                              No aplicable
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray_m dark:text-gray_xxl mt-1">
                          {promotion.description}
                        </p>

                        {renderPromotionInfo(promotion)}
                        {!isApplicable &&
                          promotion.minPurchaseAmount &&
                          promotion.minPurchaseAmount > 0 && (
                            <p className="text-xs text-red_m mt-1">
                              Requiere{" "}
                              {formatCurrency(promotion.minPurchaseAmount)}{" "}
                              (actual: {formatCurrency(currentSubtotal)})
                            </p>
                          )}
                      </div>
                      <div className="flex items-center">
                        {temporarySelectedPromotion?.id === promotion.id ? (
                          <Check
                            size={20}
                            className="text-blue_b dark:text-white border-2 rounded border-blue_b dark:border-gray_xl"
                          />
                        ) : (
                          <div
                            className={`w-5 h-5 border-2 rounded ${
                              isApplicable
                                ? "border-blue_m dark:border-gray_xl"
                                : "border-gray_l"
                            }`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray_m dark:text-gray_xl">
                <Tag size={48} className="mx-auto mb-3 text-gray_xl" />
                <p>No hay promociones disponibles</p>
                <p className="text-sm">
                  Crea promociones en la sección correspondiente
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    );
  };

  const checkSalesLimit = async () => {
    const today = new Date().toISOString().split("T")[0];
    const salesCount = await db.sales
      .filter((sale) => sale.date.startsWith(today))
      .count();
    return salesCount >= 30;
  };

  const updateStockAfterSale = (
    productId: number,
    soldQuantity: number,
    unit: string
  ): number => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error(`Producto con ID ${productId} no encontrado`);

    const stockCheck = checkStockAvailability(product, soldQuantity, unit);
    if (!stockCheck.available) {
      throw new Error(
        `Stock insuficiente para ${product.name}. ` +
          `Solicitado: ${soldQuantity} ${unit}, ` +
          `Disponible: ${stockCheck.availableQuantity.toFixed(2)} ${
            stockCheck.availableUnit
          }`
      );
    }

    const soldInBase = convertToBaseUnit(soldQuantity, unit);
    const currentStockInBase = convertToBaseUnit(
      Number(product.stock),
      product.unit
    );
    const newStockInBase = currentStockInBase - soldInBase;
    const newStock = convertFromBaseUnit(newStockInBase, product.unit);

    return parseFloat(newStock.toFixed(3));
  };

  const productOptions = useMemo(() => {
    return products
      .filter(
        (product) => rubro === "Todos los rubros" || product.rubro === rubro
      )
      .map((product) => {
        const stock = Number(product.stock);
        const isValidStock = !isNaN(stock);
        const displayName = getDisplayProductName(product, rubro);

        return {
          value: product.id,
          label:
            isValidStock && stock > 0
              ? displayName
              : `${displayName} (agotado)`,
          product: product,
          isDisabled: !isValidStock || stock <= 0,
        } as SelectOption;
      });
  }, [products, rubro]);

  const monthOptions: MonthOption[] = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });

  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const filteredSales = sales
    .filter((sale) => {
      const saleDate = new Date(sale.date);
      const saleMonth = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const saleYear = saleDate.getFullYear().toString();

      const matchesMonth =
        selectedMonth !== undefined
          ? Number(saleMonth) === selectedMonth
          : true;
      const matchesYear = selectedYear
        ? saleYear === selectedYear.toString()
        : true;

      const matchesRubro =
        rubro === "Todos los rubros" ||
        sale.products.some((product) => product.rubro === rubro);

      return matchesMonth && matchesYear && matchesRubro;
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
    }, 2500);
  };

  const addIncomeToDailyCash = async (sale: Sale) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      // Calcular la ganancia total correctamente
      const totalProfit = calculateTotalProfit(
        sale.products,
        sale.manualAmount || 0,
        sale.manualProfitPercentage || 0
      );

      const movements: DailyCashMovement[] = sale.paymentMethods.map(
        (payment) => {
          const paymentShare = payment.amount / sale.total;
          return {
            id: Date.now() + Math.random(),
            amount: payment.amount,
            description: `VENTA ${payment.method}`,
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: payment.method,
            items: sale.products.map((p) => {
              const priceInfo = calculatePrice(p, p.quantity, p.unit);
              return {
                productId: p.id,
                productName: p.name,
                quantity: p.quantity,
                unit: p.unit,
                price: priceInfo.finalPrice / p.quantity, // Precio unitario final
                costPrice: p.costPrice,
                profit: priceInfo.profit * paymentShare, // Ganancia proporcional
              };
            }),
            profit: totalProfit * paymentShare, // Ganancia total proporcional
          };
        }
      );

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: movements,
          closed: false,
          totalIncome: sale.total,
          totalExpense: 0,
          cashIncome: sale.paymentMethods
            .filter((m) => m.method === "EFECTIVO")
            .reduce((sum, m) => sum + m.amount, 0),
          cashExpense: 0,
          otherIncome: sale.paymentMethods
            .filter((m) => m.method !== "EFECTIVO")
            .reduce((sum, m) => sum + m.amount, 0),
          totalProfit: totalProfit, // Agregar ganancia total
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome: (dailyCash.totalIncome || 0) + sale.total,
          cashIncome:
            (dailyCash.cashIncome || 0) +
            sale.paymentMethods
              .filter((m) => m.method === "EFECTIVO")
              .reduce((sum, m) => sum + m.amount, 0),
          otherIncome:
            (dailyCash.otherIncome || 0) +
            sale.paymentMethods
              .filter((m) => m.method !== "EFECTIVO")
              .reduce((sum, m) => sum + m.amount, 0),
          totalProfit: (dailyCash.totalProfit || 0) + totalProfit, // Sumar ganancia
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
      throw error;
    }
  };

  const handleRegisterCheckChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const isCheck = e.target.checked;
    setRegisterCheck(isCheck);

    // Si se marca como cheque, automáticamente se convierte en cuenta corriente
    if (isCheck) {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "CHEQUE", amount: prev.total }], // Autocompletar con el total
      }));
    } else {
      // Si se desmarca, volver a efectivo con el total
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "EFECTIVO", amount: prev.total }],
      }));
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
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
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
        const newTotal = calculateFinalTotal(
          updatedProducts,
          prevState.manualAmount || 0,
          selectedPromotions
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

  const handlePrintTicket = async () => {
    if (!ticketRef.current || !selectedSale) return;

    try {
      await ticketRef.current.print();
    } catch (error) {
      console.error("Error al imprimir ticket:", error);
      showNotification("Error al imprimir ticket", "error");
    }
  };

  const handleManualAmountChange = (value: number) => {
    setNewSale((prev) => {
      const newTotal = calculateFinalTotal(
        prev.products,
        value,
        selectedPromotions
      );

      // ✅ CORREGIDO: Usar synchronizePaymentMethods
      const updatedPaymentMethods = synchronizePaymentMethods(
        prev.paymentMethods,
        newTotal
      );

      return {
        ...prev,
        manualAmount: value,
        total: newTotal,
        paymentMethods: updatedPaymentMethods,
      };
    });
  };

  const handleCreditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isCredit = e.target.checked;
    setIsCredit(isCredit);
    setRegisterCheck(false);

    setNewSale((prev) => ({
      ...prev,
      paymentMethods: isCredit
        ? [{ method: "EFECTIVO", amount: prev.total }]
        : [{ method: "EFECTIVO", amount: prev.total }],
    }));
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

      // Si se selecciona CHEQUE, automáticamente activar cuenta corriente
      if (field === "method" && value === "CHEQUE") {
        setIsCredit(true);
        setRegisterCheck(true);
      }

      // Si se cambia de CHEQUE a otro método, mantener la cuenta corriente desactivada
      if (
        field === "method" &&
        value !== "CHEQUE" &&
        prev.paymentMethods[index]?.method === "CHEQUE"
      ) {
        setIsCredit(false);
        setRegisterCheck(false);
      }

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
          const otherIndex = index === 0 ? 1 : 0;
          const remaining = prev.total - numericValue;
          updatedMethods[otherIndex] = {
            ...updatedMethods[otherIndex],
            amount: parseFloat(Math.max(0, remaining).toFixed(2)),
          };
        }

        return {
          ...prev,
          paymentMethods: updatedMethods,
        };
      } else {
        updatedMethods[index] = {
          ...updatedMethods[index],
          [field]: value,
        };
        return {
          ...prev,
          paymentMethods: updatedMethods,
        };
      }
    });
  };

  const addPaymentMethod = () => {
    setNewSale((prev) => {
      if (prev.paymentMethods.length >= paymentOptions.length) return prev;

      const total = calculateFinalTotal(
        prev.products,
        prev.manualAmount || 0,
        selectedPromotions
      );

      if (prev.paymentMethods.length < 2) {
        const newMethodCount = prev.paymentMethods.length + 1;
        const share = total / newMethodCount;

        const updatedMethods = prev.paymentMethods.map((method) => ({
          ...method,
          amount: share,
        }));

        return {
          ...prev,
          paymentMethods: [
            ...updatedMethods,
            {
              method: paymentOptions[prev.paymentMethods.length].value as
                | "EFECTIVO"
                | "TRANSFERENCIA"
                | "TARJETA"
                | "CHEQUE",
              amount: share,
            },
          ],
        };
      } else {
        return {
          ...prev,
          paymentMethods: [
            ...prev.paymentMethods,
            {
              method: paymentOptions[prev.paymentMethods.length].value as
                | "EFECTIVO"
                | "TRANSFERENCIA"
                | "TARJETA"
                | "CHEQUE",
              amount: 0,
            },
          ],
        };
      }
    });
  };

  const removePaymentMethod = (index: number) => {
    setNewSale((prev) => {
      if (prev.paymentMethods.length <= 1) return prev;

      const updatedMethods = [...prev.paymentMethods];
      updatedMethods.splice(index, 1);

      const total = calculateFinalTotal(
        prev.products,
        prev.manualAmount || 0,
        selectedPromotions
      );

      if (updatedMethods.length === 1) {
        updatedMethods[0].amount = total;
      } else {
        const share = total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  };

  const handleAddSale = async () => {
    const needsRedirect = await ensureCashIsOpen();
    if (needsRedirect.needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }
    setIsOpenModal(true);
  };

  const validatePaymentMethods = (
    paymentMethods: PaymentSplit[],
    total: number
  ): { isValid: boolean; message?: string } => {
    const sum = paymentMethods.reduce((acc, method) => acc + method.amount, 0);
    const difference = Math.abs(sum - total);

    if (difference > 0.01) {
      return {
        isValid: false,
        message: `La suma de los métodos de pago no coinciden.`,
      };
    }

    return { isValid: true };
  };

  const handleConfirmAddSale = async () => {
    const authData = await db.auth.get(1);
    if (authData?.userId === 1) {
      const isLimitReached = await checkSalesLimit();
      if (isLimitReached) {
        showNotification(
          `Límite alcanzado: máximo 30 ventas por día para el administrador`,
          "error"
        );
        return;
      }
    }
    const needsRedirect = await ensureCashIsOpen();
    if (needsRedirect.needsRedirect) {
      setShouldRedirectToCash(true);
      showNotification(
        "Debes abrir la caja primero para realizar ventas",
        "error"
      );
      return;
    }

    // ✅ VALIDACIÓN MEJORADA: Validar stock antes de procesar
    const stockValidation = validateStockForSale(newSale.products);
    if (!stockValidation.isValid) {
      stockValidation.errors.forEach((error) =>
        showNotification(error, "error")
      );
      return;
    }

    if (!validatePaymentMethods(newSale.paymentMethods, newSale.total)) {
      showNotification(
        "La suma de los métodos de pago no coincide con el total",
        "error"
      );
      return;
    }

    const paymentValidation = validatePaymentMethods(
      newSale.paymentMethods,
      newSale.total
    );
    if (!paymentValidation.isValid) {
      showNotification(
        paymentValidation.message || "Error en métodos de pago",
        "error"
      );
      return;
    }

    // ✅ VALIDACIÓN MEJORADA: Calcular el total esperado considerando la promoción
    const expectedTotal = calculateFinalTotal(
      newSale.products,
      newSale.manualAmount || 0,
      selectedPromotions
    );

    if (Math.abs(newSale.total - expectedTotal) > 0.01) {
      showNotification(
        `Error de cálculo: El total no coincide. Esperado: $${expectedTotal.toFixed(
          2
        )}, Actual: $${newSale.total.toFixed(2)}`,
        "error"
      );
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

    // ✅ NUEVA VALIDACIÓN: Verificar que si hay promoción aplicada, cumpla con los requisitos
    if (selectedPromotions) {
      const currentSubtotal =
        calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);

      // Validar monto mínimo
      if (
        selectedPromotions.minPurchaseAmount &&
        selectedPromotions.minPurchaseAmount > 0
      ) {
        if (currentSubtotal < selectedPromotions.minPurchaseAmount) {
          showNotification(
            `No se puede procesar la venta. La promoción "${
              selectedPromotions.name
            }" requiere un monto mínimo de ${formatCurrency(
              selectedPromotions.minPurchaseAmount
            )}`,
            "error"
          );
          return;
        }
      }

      // Verificar vigencia al momento de la venta
      const now = new Date();
      const startDate = new Date(selectedPromotions.startDate);
      const endDate = selectedPromotions.endDate
        ? new Date(selectedPromotions.endDate)
        : null;

      if (now < startDate) {
        showNotification(
          `La promoción "${
            selectedPromotions.name
          }" no está vigente aún. Estará disponible a partir del ${startDate.toLocaleDateString()}`,
          "error"
        );
        return;
      }

      if (endDate && now > endDate) {
        showNotification(
          `La promoción "${
            selectedPromotions.name
          }" ha expirado el ${endDate.toLocaleDateString()}`,
          "error"
        );
        return;
      }

      if (selectedPromotions.status === "inactive") {
        showNotification(
          `La promoción "${selectedPromotions.name}" no está activa`,
          "error"
        );
        return;
      }
    }

    // ✅ MEJORA: Guardar stocks originales para rollback
    const originalStocks: { [key: number]: number } = {};

    try {
      // Guardar stocks originales
      for (const product of newSale.products) {
        const originalProduct = products.find((p) => p.id === product.id);
        if (originalProduct) {
          originalStocks[product.id] = originalProduct.stock;
        }
      }

      // Actualizar stocks
      for (const product of newSale.products) {
        const updatedStock = updateStockAfterSale(
          product.id,
          product.quantity,
          product.unit
        );
        await db.products.update(product.id, { stock: updatedStock });
      }

      let customerId = selectedCustomer?.value;
      let finalCustomerName = "";
      let finalCustomerPhone = "";

      const generateCustomerId = (name: string): string => {
        const cleanName = name
          .toUpperCase()
          .trim()
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9-]/g, "");
        const timestamp = Date.now().toString().slice(-5);
        return `${cleanName}-${timestamp}`;
      };

      // Si es cuenta corriente, crear nuevo cliente si no existe
      if (isCredit && !customerId && customerName) {
        const newCustomer: Customer = {
          id: generateCustomerId(customerName),
          name: customerName.toUpperCase().trim(),
          phone: customerPhone,
          status: "activo",
          pendingBalance: 0,
          purchaseHistory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          rubro: rubro === "Todos los rubros" ? undefined : rubro,
        };
        await db.customers.add(newCustomer);
        setCustomers([...customers, newCustomer]);
        setCustomerOptions([
          ...customerOptions,
          { value: newCustomer.id, label: newCustomer.name },
        ]);
        customerId = newCustomer.id;
        finalCustomerName = customerName.toUpperCase().trim();
        finalCustomerPhone = customerPhone;
      }
      // Si hay un cliente seleccionado (venta normal con cliente)
      else if (selectedCustomer && !isCredit) {
        const customer = customers.find((c) => c.id === selectedCustomer.value);
        if (customer) {
          customerId = customer.id;
          finalCustomerName = customer.name;
          finalCustomerPhone = customer.phone || "";
        }
      }
      // Si no hay cliente seleccionado y no es cuenta corriente
      else {
        finalCustomerName = "CLIENTE OCASIONAL";
      }

      const saleToSave: CreditSale = {
        id: Date.now(),
        products: newSale.products,
        paymentMethods: isCredit ? [] : newSale.paymentMethods,
        total: newSale.total,
        date: new Date().toISOString(),
        barcode: newSale.barcode,
        manualAmount: newSale.manualAmount,
        manualProfitPercentage: newSale.manualProfitPercentage || 0,
        credit: isCredit,
        customerName: isCredit
          ? customerName.toUpperCase().trim()
          : finalCustomerName,
        customerPhone: isCredit ? customerPhone : finalCustomerPhone,
        customerId: customerId || "",
        paid: !isCredit,
        concept: newSale.concept || "",
        appliedPromotion: selectedPromotions || undefined, // Incluir la promoción aplicada
      };

      if (!isCredit) {
        await addIncomeToDailyCash(saleToSave);
        setSelectedSale(saleToSave);
        setIsInfoModalOpen(true);
        // Desactivado temporalmente
        setTimeout(() => {
          if (ticketRef.current) {
            ticketRef.current.print().catch((error) => {
              console.error("Error al imprimir ticket:", error);
              showNotification("Error al imprimir ticket", "error");
            });
          }
        }, 100);
      }

      if (isCredit && registerCheck) {
        saleToSave.chequeInfo = {
          amount: newSale.total,
          status: "pendiente",
          date: new Date().toISOString(),
        };
      }

      await db.sales.add(saleToSave);
      setSales([...sales, saleToSave]);

      // ✅ ACTUALIZAR CONTADOR DE USOS DE LA PROMOCIÓN
      if (selectedPromotions && selectedPromotions.id) {
        await db.promotions.update(selectedPromotions.id, {
          updatedAt: new Date().toISOString(),
        });

        // Actualizar la lista de promociones disponibles
        const updatedPromotions = await db.promotions.toArray();
        const activePromotions = updatedPromotions.filter(
          (p) =>
            p.status === "active" &&
            (p.rubro === rubro || p.rubro === "Todos los rubros")
        );
        setAvailablePromotions(activePromotions);
      }

      // Si la venta tiene un cliente asociado (no es "CLIENTE OCASIONAL"), actualizar el historial del cliente
      if (customerId && finalCustomerName !== "CLIENTE OCASIONAL") {
        await updateCustomerPurchaseHistory(customerId, saleToSave);
      }

      if (isCredit && registerCheck) {
        const chequePayment: Payment = {
          id: Date.now(),
          saleId: saleToSave.id,
          saleDate: saleToSave.date,
          amount: saleToSave.total,
          date: new Date().toISOString(),
          method: "CHEQUE",
          checkStatus: "pendiente",
          customerId: saleToSave.customerId,
          customerName: saleToSave.customerName,
        };
        await db.payments.add(chequePayment);
      }

      showNotification("Venta registrada correctamente", "success");
    } catch (error) {
      console.error("Error al agregar venta:", error);

      // ✅ MEJORA: Revertir stocks en caso de error
      try {
        for (const [productId, originalStock] of Object.entries(
          originalStocks
        )) {
          await db.products.update(Number(productId), { stock: originalStock });
        }
        console.log("Stocks revertidos exitosamente después del error");
      } catch (rollbackError) {
        console.error("Error al revertir stocks:", rollbackError);
      }

      showNotification("Error al agregar venta", "error");
    }
    handleCloseModal();
  };

  const updateCustomerPurchaseHistory = async (
    customerId: string,
    sale: Sale
  ) => {
    try {
      const customer = await db.customers.get(customerId);
      if (customer) {
        const updatedPurchaseHistory = [...customer.purchaseHistory, sale];
        await db.customers.update(customerId, {
          purchaseHistory: updatedPurchaseHistory,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error al actualizar historial del cliente:", error);
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
      manualAmount: 0,
      manualProfitPercentage: 0,
      concept: "",
    });
    setIsCredit(false);
    setRegisterCheck(false);
    setSelectedCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setSelectedPromotions(null);
    setTemporarySelectedPromotion(null);
    setIsOpenModal(false);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedSale(null);
  };

  const handleProductSelect = (
    selectedOptions: readonly {
      value: number;
      label: string;
      isDisabled?: boolean;
      product?: Product;
    }[]
  ) => {
    setNewSale((prevState) => {
      const enabledOptions = selectedOptions.filter((opt) => !opt.isDisabled);

      const updatedProducts = enabledOptions
        .map((option) => {
          const product =
            option.product || products.find((p) => p.id === option.value);
          if (!product) return null;

          const stockCheck = checkStockAvailability(product, 1, product.unit);
          if (!stockCheck.available) {
            showNotification(
              `Stock insuficiente para ${getDisplayProductName(
                product,
                rubro
              )}`,
              "error"
            );
            return null;
          }

          const existingProduct = prevState.products.find(
            (p) => p.id === product.id
          );

          return (
            existingProduct || {
              ...product,
              quantity: 1,
              unit: product.unit,
              stock: Number(product.stock),
              price: Number(product.price),
              basePrice:
                Number(product.price) / convertToBaseUnit(1, product.unit),
              costPrice: Number(product.costPrice),
            }
          );
        })
        .filter(Boolean) as Product[];

      const newTotal = calculateFinalTotal(
        updatedProducts || [],
        prevState.manualAmount || 0,
        selectedPromotions
      );

      // ✅ CORREGIDO: Actualizar métodos de pago
      const updatedPaymentMethods = synchronizePaymentMethods(
        prevState.paymentMethods,
        newTotal
      );

      return {
        ...prevState,
        products: updatedProducts,
        total: newTotal,
        paymentMethods: updatedPaymentMethods,
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

      const updatedProducts = prevState.products.map((p) => {
        if (p.id === productId) {
          return { ...p, quantity, unit };
        }
        return p;
      });

      const newTotal = calculateFinalTotal(
        updatedProducts,
        prevState.manualAmount || 0,
        selectedPromotions
      );

      // ✅ USAR LA FUNCIÓN CORREGIDA
      const updatedPaymentMethods = synchronizePaymentMethods(
        prevState.paymentMethods,
        newTotal
      );

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
          const compatibleUnits = getCompatibleUnits(p.unit);
          const isCompatible = compatibleUnits.some(
            (u) => u.value === selectedOption.value
          );

          if (!isCompatible) return p;

          const newUnit = selectedOption.value as Product["unit"];
          const basePrice =
            p.basePrice ?? p.price / convertToBaseUnit(1, p.unit);
          const newPrice = basePrice * convertToBaseUnit(1, newUnit);

          return {
            ...p,
            unit: newUnit,
            quantity: currentQuantity,
            price: parseFloat(newPrice.toFixed(2)),
            basePrice: basePrice,
          };
        }
        return p;
      });

      const newTotal = calculateFinalTotal(
        updatedProducts,
        prevState.manualAmount || 0,
        selectedPromotions
      );

      return {
        ...prevState,
        products: updatedProducts,
        total: newTotal,
      };
    });
  };

  const handleRemoveProduct = (productId: number) => {
    setNewSale((prevState) => {
      const updatedProducts = prevState.products.filter(
        (p) => p.id !== productId
      );

      const newTotal = calculateFinalTotal(
        updatedProducts,
        prevState.manualAmount || 0,
        selectedPromotions
      );

      // ✅ CORREGIDO: Actualizar métodos de pago cuando se remueve un producto
      const updatedPaymentMethods = synchronizePaymentMethods(
        prevState.paymentMethods,
        newTotal
      );

      return {
        ...prevState,
        products: updatedProducts,
        total: newTotal,
        paymentMethods: updatedPaymentMethods,
      };
    });
  };

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const storedPromotions = await db.promotions.toArray();
        const now = new Date();

        const activePromotions = storedPromotions.filter((p) => {
          // Verificar estado activo
          if (p.status !== "active") return false;

          // Verificar rubro
          if (!(p.rubro === rubro || p.rubro === "Todos los rubros"))
            return false;

          // Verificar vigencia
          const startDate = new Date(p.startDate);
          const endDate = p.endDate ? new Date(p.endDate) : null;

          if (now < startDate) return false;
          if (endDate && now > endDate) return false;

          return true;
        });

        setAvailablePromotions(activePromotions);
      } catch (error) {
        console.error("Error fetching promotions:", error);
      }
    };

    fetchPromotions();
  }, [rubro]);

  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
      setSelectedMonth(currentMonth);
      setSelectedYear(currentYear);
    }
  }, [new Date().getMonth()]);

  useEffect(() => {
    setNewSale((prev) => {
      const currentPaymentTotal = prev.paymentMethods.reduce(
        (sum, method) => sum + method.amount,
        0
      );

      // Solo recalcular si hay una diferencia significativa
      if (Math.abs(currentPaymentTotal - prev.total) > 0.01) {
        return {
          ...prev,
          paymentMethods: synchronizePaymentMethods(
            prev.paymentMethods,
            prev.total
          ),
        };
      }
      return prev;
    });
  }, [newSale.total]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();

      const filtered =
        rubro === "Todos los rubros"
          ? allCustomers
          : allCustomers.filter((customer) => customer.rubro === rubro);

      setCustomers(filtered);
      setCustomerOptions(
        filtered.map((customer) => ({
          value: customer.id,
          label: customer.name,
        }))
      );
    };

    fetchCustomers();
  }, [rubro]);

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

    db.sales.hook("updating", fetchSales);
    db.sales.hook("deleting", fetchSales);

    fetchSales();

    return () => {
      db.sales.hook("creating").unsubscribe(fetchSales);
      db.sales.hook("updating").unsubscribe(fetchSales);
      db.sales.hook("deleting").unsubscribe(fetchSales);
    };
  }, []);

  useEffect(() => {
    setNewSale((prev) => {
      const updatedMethods = [...prev.paymentMethods];

      // Si es un cheque y está activo, actualizar su monto al total
      if (registerCheck && updatedMethods[0]?.method === "CHEQUE") {
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 1) {
        // Para otros casos con un solo método, mantener sincronizado
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 2) {
        // Para dos métodos, dividir proporcionalmente (si no es cheque)
        const share = prev.total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return {
        ...prev,
        paymentMethods: updatedMethods,
      };
    });
  }, [
    newSale.products,
    newSale.manualAmount,
    newSale.paymentMethods.length,
    calculateCombinedTotal,
    registerCheck,
  ]);

  useEffect(() => {
    if (registerCheck && newSale.paymentMethods[0]?.method === "CHEQUE") {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "CHEQUE", amount: prev.total }],
      }));
    }
  }, [registerCheck]);

  useEffect(() => {
    if (shouldRedirectToCash) {
      router.push("/caja-diaria");
    }
  }, [shouldRedirectToCash, router]);

  useEffect(() => {
    const expectedTotal = calculateFinalTotal(
      newSale.products,
      newSale.manualAmount || 0,
      selectedPromotions
    );

    // Solo actualizar si hay una diferencia significativa y la promoción está activa
    if (Math.abs(newSale.total - expectedTotal) > 0.01 && selectedPromotions) {
      setNewSale((prev) => ({
        ...prev,
        total: expectedTotal,
        paymentMethods: synchronizePaymentMethods(
          prev.paymentMethods,
          expectedTotal
        ),
      }));
    }
  }, [newSale.products, newSale.manualAmount, selectedPromotions]);

  const indexOfLastSale = currentPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Ventas</h1>

        <div className="flex justify-between mb-2">
          <div className="flex w-full max-w-[20rem] gap-2">
            <Select
              noOptionsMessage={() => "Sin opciones"}
              options={monthOptions}
              value={monthOptions.find(
                (option) => option.value === selectedMonth
              )}
              onChange={(option) =>
                setSelectedMonth(option?.value ?? new Date().getMonth() + 1)
              }
              placeholder="Mes"
              className="w-full h-[2rem] 2xl:h-auto text-gray_b"
              classNamePrefix="react-select"
              menuPosition="fixed"
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
            />
            <Select
              options={yearOptions}
              noOptionsMessage={() => "Sin opciones"}
              value={
                yearOptions.find((option) => option.value === selectedYear) || {
                  value: selectedYear,
                  label: String(selectedYear),
                }
              }
              onChange={handleYearChange}
              onInputChange={handleYearInputChange}
              isClearable
              className="w-full h-[2rem] 2xl:h-auto text-gray_b"
              classNamePrefix="react-select"
              menuPosition="fixed"
              styles={{
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
              }}
            />
          </div>
          {rubro !== "Todos los rubros" && (
            <div className="w-full flex justify-end mt-3">
              <Button
                title="Nueva Venta"
                text="Nueva Venta [F1]"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleAddSale}
                hotkey="F1"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-xs">
                <tr>
                  <th className="p-2 text-start ">Productos</th>
                  <th className="p-2">Concepto</th>
                  <th className="p-2 ">Fecha</th>
                  <th className="p-2">Forma De Pago</th>
                  <th className="p-2">Total</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="w-40 max-w-[5rem] 2xl:max-w-[10rem] p-2">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className={`bg-white text-gray_b divide-y divide-gray_xl`}>
                {currentSales.length > 0 ? (
                  currentSales.map((sale) => {
                    const products = sale.products || [];
                    const paymentMethods = sale.paymentMethods || [];
                    const saleDate = sale.date
                      ? parseISO(sale.date)
                      : new Date();
                    const total = sale.total || 0;

                    return (
                      <tr
                        key={sale.id || Date.now()}
                        className="text-xs 2xl:text-sm bg-white text-gray_b border border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                      >
                        <td
                          className="font-semibold px-2 text-start capitalize border border-gray_xl truncate max-w-[200px]"
                          title={products
                            .map((p) => getDisplayProductName(p, rubro))
                            .join(", ")}
                        >
                          {products
                            .map((p) => getDisplayProductName(p, rubro))
                            .join(", ").length > 60
                            ? products
                                .map((p) => getDisplayProductName(p, rubro))
                                .join(", ")
                                .slice(0, 30) + "..."
                            : products
                                .map((p) => getDisplayProductName(p, rubro))
                                .join(" | ")}
                        </td>

                        <td
                          className="p-2 border border-gray_xl text-start max-w-[150px] truncate"
                          title={sale.concept || "Sin concepto"}
                        >
                          {sale.concept ? (
                            <span className="text-xs text-gray_m">
                              {sale.concept.length > 50
                                ? `${sale.concept.substring(0, 50)}...`
                                : sale.concept}
                            </span>
                          ) : (
                            <span className="text-xs text-gray_l italic">
                              -
                            </span>
                          )}
                        </td>

                        <td className="p-2 border border-gray_xl">
                          {format(saleDate, "dd/MM/yyyy", { locale: es })}
                        </td>

                        <td className="w-55 p-2 border border-gray_xl">
                          {sale.credit ? (
                            <span className="uppercase text-xs text-orange-600 font-semibold">
                              {sale.chequeInfo ? "Cheque" : "Cuenta corriente"}
                            </span>
                          ) : (
                            <>
                              {sale.deposit !== undefined &&
                              sale.deposit > 0 ? (
                                <div className="text-xs flex justify-between">
                                  <span>SEÑA:</span>
                                  <span>{formatCurrency(sale.deposit)}</span>
                                </div>
                              ) : null}

                              {/* Mostrar métodos de pago normales */}
                              {paymentMethods.map((payment, i) => (
                                <div
                                  key={i}
                                  className="text-xs flex justify-between"
                                >
                                  <span>
                                    {payment?.method ||
                                      "Método no especificado"}
                                    :
                                  </span>
                                  <span>
                                    {formatCurrency(payment?.amount || 0)}
                                  </span>
                                </div>
                              ))}
                            </>
                          )}
                        </td>
                        <td className="p-2 border border-gray_xl font-semibold">
                          {sale.credit ? (
                            <span className="text-orange-600">
                              $
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
                        {rubro !== "Todos los rubros" && (
                          <td className="p-2 border border-gray_xl">
                            <div className="flex justify-center items-center gap-2 h-full">
                              <Button
                                title="Imprimir ticket (Beta)"
                                icon={<Printer size={18} />}
                                colorText="text-gray_b"
                                colorTextHover="hover:text-white"
                                colorBg="bg-transparent"
                                colorBgHover="hover:bg-blue_m"
                                px="px-1"
                                py="py-1"
                                minwidth="min-w-0"
                                onClick={() => handleOpenInfoModal(sale)}
                              />
                            </div>
                          </td>
                        )}
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
          </div>
          {selectedSale && (
            <Modal
              isOpen={isInfoModalOpen}
              onClose={handleCloseInfoModal}
              title="Ticket de la venta"
              buttons={
                <div className="flex justify-end gap-4">
                  <Button
                    title="Imprimir ticket (Beta)"
                    text="Imprimir (Beta)"
                    icon={<Printer size={18} />}
                    colorText="text-white"
                    colorTextHover="hover:text-white"
                    px="px-1"
                    py="py-1"
                    onClick={handlePrintTicket}
                    disabled={selectedSale?.credit}
                  />
                  <Button
                    title="Cerrar"
                    text="Cerrar"
                    colorText="text-gray_b dark:text-white"
                    colorTextHover="hover:dark:text-white"
                    colorBg="bg-transparent dark:bg-gray_m"
                    colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                    onClick={() => handleCloseInfoModal()}
                  />
                </div>
              }
            >
              <div className="w-full min-w-[180mm] overflow-y-auto dark:bg-gray_b">
                <PrintableTicket
                  ref={ticketRef}
                  sale={selectedSale}
                  rubro={rubro}
                  businessData={businessData}
                />
              </div>
            </Modal>
          )}
          {currentSales.length > 0 && (
            <Pagination
              text="Ventas por página"
              text2="Total de ventas"
              totalItems={filteredSales.length}
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
                title="Cobrar"
                text={"Cobrar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmAddSale}
                hotkey="enter"
              />
              <Button
                title="Cancelar"
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={handleCloseModal}
                hotkey="esc"
              />
            </div>
          }
        >
          <div className="overflow-y-auto  -mt-4">
            <div className="flex flex-col min-h-[50vh] 2xl:min-h-[60vh] max-h-[33vh] 2xl:max-h-[55vh] overflow-y-auto px-4 2xl:px-10">
              <form
                onSubmit={handleConfirmAddSale}
                className="flex flex-col gap-2"
              >
                {/* Sección de Promociones */}
                <div className="flex items-center justify-between ">
                  <Button
                    title="Aplicar promociones"
                    text="Seleccionar Promociones"
                    icon={<Tag size={16} />}
                    iconPosition="left"
                    colorText="text-white"
                    colorTextHover="text-white"
                    px="px-3"
                    py="py-2"
                    onClick={() => setIsPromotionModalOpen(true)}
                    disabled={newSale.products.length === 0}
                  />
                  <div className="flex-1">
                    <SelectedPromotionsBadge />
                  </div>
                </div>
                <div className="w-full flex items-center space-x-4">
                  <div className="w-full  ">
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
                      Productos*
                    </label>
                    <Select
                      placeholder="Seleccionar productos"
                      noOptionsMessage={() => "Sin opciones"}
                      isMulti
                      options={productOptions}
                      value={newSale.products.map((p) => ({
                        value: p.id,
                        label: getDisplayProductName(p, rubro, true),
                        product: p,
                        isDisabled: false,
                      }))}
                      onChange={handleProductSelect}
                      className="text-gray_m"
                      classNamePrefix="react-select"
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({
                          ...base,
                          zIndex: 9999,
                        }),
                        control: (provided) => ({
                          ...provided,
                          maxHeight: "100px",
                          overflowY: "auto",
                        }),
                        multiValue: (provided) => ({
                          ...provided,
                          maxWidth: "200px",
                        }),
                      }}
                    />
                  </div>
                </div>

                {newSale.products.length > 0 && (
                  <div className=" max-h-[16rem] overflow-y-auto ">
                    <table className="table-auto w-full shadow">
                      <thead className=" bg-gradient-to-bl from-blue_m to-blue_b text-white text-sm 2xl:text-lg">
                        <tr>
                          <th className="p-2 text-left">Producto</th>
                          <th className="p-2 text-center">Unidad</th>
                          <th className="p-2 text-center">Cantidad</th>
                          <th className="w-32">% descuento</th>
                          <th className="w-32">% recargo</th>
                          <th className="p-2 text-center">Total</th>

                          <th className="w-30 max-w-[8rem] p-2 text-center">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white text-gray_b divide-y divide-gray_xl max-h-[10rem] ">
                        {newSale.products.map((product) => {
                          return (
                            <tr
                              className=" text-sm border-b border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                              key={product.id}
                            >
                              <td className=" p-2">
                                {getDisplayProductName(product, rubro)}
                              </td>
                              <td className="w-40 max-w-40 p-2">
                                {[
                                  "Kg",
                                  "gr",
                                  "L",
                                  "ml",
                                  "mm",
                                  "cm",
                                  "m",
                                  "pulg",
                                  "ton",
                                ].includes(product.unit) ? (
                                  <Select
                                    placeholder="Unidad"
                                    options={getCompatibleUnits(product.unit)}
                                    noOptionsMessage={() =>
                                      "No se encontraron opciones"
                                    }
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
                                    className="text-gray_m"
                                    menuPosition="fixed"
                                    styles={{
                                      menuPortal: (base) => ({
                                        ...base,
                                        zIndex: 9999,
                                      }),
                                    }}
                                  />
                                ) : (
                                  <div className="text-center py-2 text-gray_m">
                                    {product.unit}
                                  </div>
                                )}
                              </td>
                              <td className="w-20 max-w-20 p-2  ">
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
                                    product.unit === "Kg" ||
                                    product.unit === "L"
                                      ? "0.001"
                                      : "1"
                                  }
                                  onBlur={(
                                    e: React.FocusEvent<HTMLInputElement>
                                  ) => {
                                    if (e.target.value === "") {
                                      handleQuantityChange(
                                        product.id,
                                        0,
                                        product.unit
                                      );
                                    }
                                  }}
                                />
                              </td>{" "}
                              <td className="w-20 max-w-20 p-2">
                                <div className="relative">
                                  <Input
                                    textPosition="text-center"
                                    type="number"
                                    value={product.discount?.toString() || "0"}
                                    onChange={(e) => {
                                      const value = Math.min(
                                        100,
                                        Math.max(0, Number(e.target.value))
                                      );
                                      setNewSale((prev) => {
                                        const updatedProducts =
                                          prev.products.map((p) =>
                                            p.id === product.id
                                              ? { ...p, discount: value }
                                              : p
                                          );

                                        const newTotal = calculateFinalTotal(
                                          updatedProducts,
                                          prev.manualAmount || 0,
                                          selectedPromotions
                                        );

                                        return {
                                          ...prev,
                                          products: updatedProducts,
                                          total: newTotal,
                                        };
                                      });
                                    }}
                                    step="1"
                                  />
                                </div>
                              </td>
                              <td className="w-20 max-w-20 p-2">
                                <Input
                                  textPosition="text-center"
                                  type="number"
                                  value={product.surcharge?.toString() || "0"}
                                  onChange={(e) => {
                                    const value = Math.min(
                                      100,
                                      Math.max(0, Number(e.target.value))
                                    );
                                    setNewSale((prev) => {
                                      const updatedProducts = prev.products.map(
                                        (p) =>
                                          p.id === product.id
                                            ? { ...p, surcharge: value }
                                            : p
                                      );

                                      const newTotal = calculateFinalTotal(
                                        updatedProducts,
                                        prev.manualAmount || 0,
                                        selectedPromotions
                                      );

                                      return {
                                        ...prev,
                                        products: updatedProducts,
                                        total: newTotal,
                                      };
                                    });
                                  }}
                                  step="1"
                                />
                              </td>
                              <td className="w-30 max-w-30 p-2 text-center ">
                                {formatCurrency(
                                  calculatePrice(
                                    {
                                      ...product,
                                      price: product.price || 0,
                                      quantity: product.quantity || 0,
                                      unit: product.unit || "Unid.",
                                      costPrice: product.costPrice || 0,
                                    },
                                    product.quantity || 0,
                                    product.unit || "Unid."
                                  ).finalPrice
                                )}
                              </td>
                              <td className=" p-2 text-center">
                                <button
                                  title="Eliminar producto"
                                  onClick={() =>
                                    handleRemoveProduct(product.id)
                                  }
                                  className="cursor-pointer hover:bg-red_m text-gray_b hover:text-white p-1 rounded-sm transition-all duration-300"
                                >
                                  <Trash size={18} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </form>
              <div>
                <div className="flex items-center space-x-4">
                  {!isCredit && (
                    <div className="w-full flex flex-col">
                      <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                        Cliente
                      </label>
                      <Select
                        options={customerOptions}
                        noOptionsMessage={() => "Sin clientes disponibles"}
                        value={selectedCustomer}
                        onChange={(selected) => {
                          setSelectedCustomer(selected);
                          if (selected) {
                            const customer = customers.find(
                              (c) => c.id === selected.value
                            );
                            setCustomerName(customer?.name || "");
                            setCustomerPhone(customer?.phone || "");
                          } else {
                            // Si se deselecciona, limpiar los campos
                            setCustomerName("");
                            setCustomerPhone("");
                          }
                        }}
                        placeholder="Ningún cliente seleccionado"
                        isClearable
                        isSearchable
                        className="text-gray_m"
                        classNamePrefix="react-select"
                        menuPosition="fixed"
                        styles={{
                          menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                        }}
                      />
                    </div>
                  )}

                  <div className="w-full flex flex-col">
                    {isCredit ? (
                      <div className="p-2 bg-gray_xxl text-gray_b rounded-md mt-9 ">
                        <p className="font-semibold">
                          Monto manual deshabilitado
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-full mt-1">
                          <InputCash
                            label="Monto manual"
                            value={newSale.manualAmount || 0}
                            onChange={handleManualAmountChange}
                            disabled={isCredit}
                          />
                        </div>
                        <div className="w-full mt-1 max-w-[5rem]">
                          <label className="block text-sm font-medium text-gray_m dark:text-white">
                            % Ganancia
                          </label>
                          <Input
                            type="number"
                            value={
                              newSale.manualProfitPercentage?.toString() || "0"
                            }
                            onChange={(e) => {
                              const value = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              );
                              setNewSale((prev) => ({
                                ...prev,
                                manualProfitPercentage: value || 0,
                                total: calculateFinalTotal(
                                  prev.products,
                                  prev.manualAmount || 0,
                                  selectedPromotions
                                ),
                              }));
                            }}
                            disabled={isCredit}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`w-full flex flex-col ${
                      isCredit ? "py-4 mt-17" : "mt-8"
                    }`}
                  >
                    <label
                      className={`${
                        isCredit ? "hidden" : "block"
                      } text-gray_m dark:text-white text-sm font-semibold`}
                    >
                      Métodos de Pago
                    </label>
                    {isCredit && (
                      <div className="flex items-center gap-2 -mt-10">
                        <input
                          type="checkbox"
                          id="registerCheckCheckbox"
                          checked={registerCheck}
                          onChange={handleRegisterCheckChange}
                          className="cursor-pointer"
                        />
                        <label>Registrar cheque</label>
                      </div>
                    )}
                    {isCredit && registerCheck ? (
                      <div className="p-2 bg-orange-100 text-orange-800 rounded-md ">
                        <div className="flex items-center gap-2 ">
                          <Select
                            options={[{ value: "CHEQUE", label: "Cheque" }]}
                            value={{ value: "CHEQUE", label: "Cheque" }}
                            isDisabled={true}
                            className="w-60 max-w-60 text-gray_b"
                            menuPosition="fixed"
                          />
                          <InputCash
                            value={newSale.paymentMethods[0]?.amount || 0}
                            onChange={(value) =>
                              handlePaymentMethodChange(0, "amount", value)
                            }
                            placeholder="Monto del cheque"
                          />
                        </div>
                      </div>
                    ) : !isCredit ? (
                      <>
                        {newSale.paymentMethods.map((payment, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 mb-2"
                          >
                            <Select
                              options={paymentOptions}
                              noOptionsMessage={() =>
                                "No se encontraron opciones"
                              }
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
                              className="w-60 max-w-60 text-gray_b"
                              menuPosition="fixed"
                              styles={{
                                menuPortal: (base) => ({
                                  ...base,
                                  zIndex: 9999,
                                }),
                              }}
                              isDisabled={isCredit}
                            />

                            <div className="relative w-full">
                              <InputCash
                                value={payment.amount}
                                onChange={(value) =>
                                  handlePaymentMethodChange(
                                    index,
                                    "amount",
                                    value
                                  )
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
                                  <span className="text-xs text-red_m ml-2">
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
                                title="Eliminar"
                                type="button"
                                onClick={() => removePaymentMethod(index)}
                                className="cursor-pointer text-red_m hover:text-red_b"
                              >
                                <Trash size={18} />
                              </button>
                            )}
                          </div>
                        ))}
                        {!isCredit && newSale.paymentMethods.length < 3 && (
                          <button
                            title="Agregar"
                            type="button"
                            onClick={addPaymentMethod}
                            className="cursor-pointer text-sm text-blue_b dark:text-blue_l hover:text-blue_m flex items-center transition-all duration-300"
                          >
                            <Plus size={18} className="mr-1" /> Agregar otro
                            método de pago
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="w-full">
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Concepto (Opcional)
                  </label>
                  <textarea
                    value={newSale.concept || ""}
                    onChange={(e) =>
                      setNewSale((prev) => ({
                        ...prev,
                        concept: e.target.value,
                      }))
                    }
                    placeholder="Ingrese un concepto para esta venta..."
                    className="w-full p-2 border border-gray_l rounded-md text-sm text-gray_b dark:text-white bg-white dark:bg-gray_m resize-none"
                    rows={3}
                    maxLength={50}
                  />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="creditCheckbox"
                    checked={isCredit}
                    onChange={handleCreditChange}
                    className="cursor-pointer"
                  />
                  <label>Registrar Cuenta corriente</label>
                </div>

                {isCredit && (
                  <div>
                    <label className="block text-gray_m dark:text-white text-sm font-semibold">
                      Cliente existente*
                    </label>
                    <Select
                      options={customerOptions}
                      noOptionsMessage={() => "Sin opciones"}
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
                      placeholder="Buscar cliente"
                      isClearable
                      className="text-gray_m"
                      classNamePrefix="react-select"
                      menuPosition="fixed"
                      styles={{
                        menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                    <div className="flex items-center space-x-4 mt-4">
                      <Input
                        label="Nuevo cliente"
                        placeholder="Nombre del cliente"
                        value={customerName}
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          setSelectedCustomer(null);
                        }}
                        disabled={!!selectedCustomer}
                        onBlur={(e) => {
                          setCustomerName(e.target.value.trim());
                        }}
                      />

                      <Input
                        label="Teléfono del cliente"
                        placeholder="Teléfono del cliente"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-2 2xl:p-4 bg-gray_b dark:bg-gray_m text-white text-center mt-4">
              <p className="font-bold text-2xl 2xl:text-3xl">
                TOTAL:{" "}
                {newSale.total.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </p>
            </div>
          </div>
        </Modal>

        {/* Modal de selección de promociones */}
        <PromotionSelectionModal />

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
