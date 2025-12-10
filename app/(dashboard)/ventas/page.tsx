"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  Typography,
  Box,
  FormControl,
  IconButton,
  TextField,
  Autocomplete,
  useTheme,
} from "@mui/material";
import {
  Add,
  Print,
  ShoppingCart,
  Delete,
  LocalOffer,
  Check,
} from "@mui/icons-material";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/app/database/db";
import { parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import BarcodeScanner from "@/app/components/BarcodeScanner";
import { ensureCashIsOpen } from "@/app/lib/utils/cash";
import { useRouter } from "next/navigation";
import { formatCurrency, parseCurrencyInput } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import PaymentModal from "@/app/components/PaymentModal";
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
import {
  CreditSale,
  Customer,
  DailyCashMovement,
  MonthOption,
  PaymentSplit,
  Product,
  Promotion,
  Sale,
  UnitOption,
  Option,
  PaymentMethod,
  Payment,
  ProductOption,
} from "@/app/lib/types/types";
import Select from "@/app/components/Select";
import { Settings } from "@mui/icons-material";

import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import Checkbox from "@/app/components/Checkbox";
import { useNotification } from "@/app/hooks/useNotification";
import BusinessDataModal from "@/app/components/BusinessDataModal";
import CustomChip from "@/app/components/CustomChip";
import ProductSearchAutocomplete from "@/app/components/ProductSearchAutocomplete";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

type CustomerOption = {
  value: string;
  label: string;
};

const VentasPage = () => {
  const cobrarButtonRef = useRef<HTMLButtonElement>(null);
  const imprimirButtonRef = useRef<HTMLButtonElement>(null);
  const { businessData } = useBusinessData();
  const { rubro } = useRubro();
  const theme = useTheme();
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

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();
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
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerOption | null>(null);
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isBusinessDataModalOpen, setIsBusinessDataModalOpen] = useState(false);
  const [isDeleteProductModalOpen, setIsDeleteProductModalOpen] =
    useState(false);
  const [productToDelete, setProductToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

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

  const paymentOptions: Option[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
  ];

  const monthOptions: MonthOption[] = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => {
    const year = currentYear - i;
    return { value: year, label: String(year) };
  });

  const tableHeaderStyle = useMemo(
    () => ({
      bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
      color: "primary.contrastText",
    }),
    [theme.palette.mode]
  );

  const getCardStyle = useMemo(
    () => (color: "success" | "error" | "primary" | "warning") => ({
      bgcolor:
        theme.palette.mode === "dark" ? `${color}.dark` : `${color}.main`,
      color: "white",
      "& .MuiTypography-root": {
        color: "white !important",
      },
    }),
    [theme.palette.mode]
  );

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

  const getCompatibleUnitOptions = (productUnit: string) => {
    const compatibleUnits = getCompatibleUnits(productUnit);
    return compatibleUnits.map((unit) => ({
      value: unit.value,
      label: unit.label,
    }));
  };

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

  const synchronizePaymentMethods = (
    paymentMethods: PaymentSplit[],
    total: number
  ): PaymentSplit[] => {
    const currentTotal = paymentMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );

    if (Math.abs(currentTotal - total) < 0.01) {
      return paymentMethods;
    }

    if (paymentMethods.length === 1) {
      return [{ ...paymentMethods[0], amount: total }];
    } else {
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
        const currentSubtotal =
          calculateCombinedTotal(prev.products) + (prev.manualAmount || 0);

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

        let discountAmount = 0;
        if (promotionToApply.type === "PERCENTAGE_DISCOUNT") {
          discountAmount = (currentSubtotal * promotionToApply.discount) / 100;
        } else if (promotionToApply.type === "FIXED_DISCOUNT") {
          discountAmount = promotionToApply.discount;
        }

        discountAmount = Math.min(discountAmount, currentSubtotal);
        const newTotal = Math.max(0, currentSubtotal - discountAmount);

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
    [showNotification]
  );

  const removePromotion = () => {
    setNewSale((prevSale) => {
      const currentSubtotal =
        calculateCombinedTotal(prevSale.products) +
        (prevSale.manualAmount || 0);

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
  const handleDeleteProductClick = (productId: number, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
    setIsDeleteProductModalOpen(true);
  };
  const handleConfirmProductDelete = () => {
    if (!productToDelete) return;

    setNewSale((prev) => {
      const updatedProducts = prev.products.filter(
        (p) => p.id !== productToDelete.id
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
        paymentMethods: synchronizePaymentMethods(
          prev.paymentMethods,
          newTotal
        ),
      };
    });

    showNotification(`Producto ${productToDelete.name} eliminado`, "success");
    setIsDeleteProductModalOpen(false);
    setProductToDelete(null);
  };

  const handleSaveBusinessDataSuccess = () => {
    if (selectedSale) {
      setTimeout(() => {
        setIsInfoModalOpen(true);
      }, 100);
    }
  };

  const handleOpenBusinessDataModal = (sale?: Sale) => {
    if (sale) {
      setSelectedSale(sale);
    }
    setIsBusinessDataModalOpen(true);
  };

  const handleCloseBusinessDataModal = () => {
    setIsBusinessDataModalOpen(false);
    setSelectedSale(null);
  };

  const handlePromotionSelect = (promotion: Promotion) => {
    setTemporarySelectedPromotion((prev) => {
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

    const now = new Date();
    const startDate = new Date(selectedPromotions.startDate);
    const endDate = selectedPromotions.endDate
      ? new Date(selectedPromotions.endDate)
      : null;
    const isActive = selectedPromotions.status === "active";
    const isInDateRange = now >= startDate && (!endDate || now <= endDate);

    const isValid = meetsRequirements && isActive && isInDateRange;

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, p: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, ml: "auto" }}>
          <Typography variant="body2" sx={{ fontWeight: "semibold" }}>
            Promoción aplicada:
          </Typography>
          <CustomChip
            label={selectedPromotions.name}
            color={isValid ? "success" : "error"}
            size="small"
            icon={<LocalOffer fontSize="small" />}
            onDelete={removePromotion}
          />
        </Box>
      </Box>
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

    const isPromotionApplicable = (promotion: Promotion) => {
      const currentSubtotal =
        calculateCombinedTotal(newSale.products) + (newSale.manualAmount || 0);
      const now = new Date();
      const startDate = new Date(promotion.startDate);
      const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

      if (promotion.minPurchaseAmount && promotion.minPurchaseAmount > 0) {
        if (currentSubtotal < promotion.minPurchaseAmount) {
          return false;
        }
      }

      if (now < startDate) return false;
      if (endDate && now > endDate) return false;
      if (promotion.status !== "active") return false;

      return true;
    };

    return (
      <Modal
        isOpen={isPromotionModalOpen}
        onClose={handleCloseModal}
        title="Seleccionar Promoción"
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
              onClick={handleApplyPromotion}
              disabled={!temporarySelectedPromotion}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Aplicar promoción
            </Button>
          </Box>
        }
      >
        <Box sx={{ maxHeight: "63vh", mb: 2, overflow: "auto" }}>
          <Box sx={{ display: "grid", gap: 2 }}>
            {availablePromotions.length > 0 ? (
              availablePromotions.map((promotion) => {
                const isApplicable = isPromotionApplicable(promotion);
                const currentSubtotal =
                  calculateCombinedTotal(newSale.products) +
                  (newSale.manualAmount || 0);

                return (
                  <Card
                    key={promotion.id}
                    sx={{
                      p: 2,
                      cursor: isApplicable ? "pointer" : "not-allowed",
                      border:
                        temporarySelectedPromotion?.id === promotion.id ? 2 : 1,
                      borderColor:
                        temporarySelectedPromotion?.id === promotion.id
                          ? "primary.main"
                          : "divider",
                      bgcolor:
                        temporarySelectedPromotion?.id === promotion.id
                          ? "action.selected"
                          : "background.paper",
                      opacity: isApplicable ? 1 : 0.7,
                    }}
                    onClick={() =>
                      isApplicable && handlePromotionSelect(promotion)
                    }
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            sx={{ textTransform: "uppercase" }}
                          >
                            {promotion.name}
                          </Typography>
                          <CustomChip
                            label={
                              promotion.type === "PERCENTAGE_DISCOUNT"
                                ? `${promotion.discount}%`
                                : `$${promotion.discount}`
                            }
                            color={
                              promotion.type === "PERCENTAGE_DISCOUNT"
                                ? "success"
                                : "primary"
                            }
                            size="small"
                          />
                          {!isApplicable && (
                            <CustomChip
                              label="No aplicable"
                              color="error"
                              size="small"
                            />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {promotion.description}
                        </Typography>
                        {!isApplicable &&
                          promotion.minPurchaseAmount &&
                          promotion.minPurchaseAmount > 0 && (
                            <Typography
                              variant="body2"
                              color="error"
                              sx={{ mt: 1 }}
                            >
                              Requiere{" "}
                              {formatCurrency(promotion.minPurchaseAmount)}{" "}
                              (actual: {formatCurrency(currentSubtotal)})
                            </Typography>
                          )}
                      </Box>
                      <Box>
                        {temporarySelectedPromotion?.id === promotion.id ? (
                          <Check fontSize="small" color="primary" />
                        ) : (
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              border: 2,
                              borderColor: isApplicable
                                ? "primary.main"
                                : "text.disabled",
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </Box>
                    </Box>
                  </Card>
                );
              })
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <LocalOffer
                  fontSize="large"
                  color="disabled"
                  style={{ marginBottom: 16 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No hay promociones disponibles
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Crea promociones en la sección correspondiente
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    );
  };

  const handleOpenPaymentModal = () => {
    if (isProcessingPayment || isPaymentModalOpen) {
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
    setIsOpenModal(false);
    setTimeout(() => {
      setIsPaymentModalOpen(true);
    }, 100);
  };

  const handleConfirmPayment = async () => {
    if (isProcessingPayment) {
      return;
    }

    setIsProcessingPayment(true);

    try {
      const needsRedirect = await ensureCashIsOpen();
      if (needsRedirect.needsRedirect) {
        setShouldRedirectToCash(true);
        showNotification(
          "Debes abrir la caja primero para realizar ventas",
          "error"
        );
        setIsProcessingPayment(false);
        setIsPaymentModalOpen(false);
        return;
      }

      const stockValidation = validateStockForSale(newSale.products);
      if (!stockValidation.isValid) {
        stockValidation.errors.forEach((error) =>
          showNotification(error, "error")
        );
        setIsProcessingPayment(false);
        return;
      }

      if (isCredit) {
        const normalizedName = customerName.toUpperCase().trim();

        if (!normalizedName && !selectedCustomer) {
          showNotification("Debe ingresar o seleccionar un cliente", "error");
          setIsProcessingPayment(false);
          return;
        }

        if (normalizedName) {
          const nameExists = customers.some(
            (customer) =>
              customer.name.toUpperCase() === normalizedName &&
              (!selectedCustomer || customer.id !== selectedCustomer.value)
          );

          if (nameExists) {
            showNotification(
              "Este cliente ya existe. Selecciónelo de la lista o use un nombre diferente.",
              "error"
            );
            setIsProcessingPayment(false);
            return;
          }
        }
      }

      if (!isCredit && !registerCheck) {
        const totalPayment = newSale.paymentMethods.reduce(
          (sum, method) => sum + method.amount,
          0
        );

        if (totalPayment < newSale.total) {
          showNotification(
            `Pago insuficiente. Total: ${formatCurrency(
              newSale.total
            )}, Recibido: ${formatCurrency(totalPayment)}`,
            "error"
          );
          setIsProcessingPayment(false);
          return;
        }
      }

      for (const product of newSale.products) {
        try {
          const updatedStock = updateStockAfterSale(
            product.id,
            product.quantity,
            product.unit
          );
          await db.products.update(product.id, { stock: updatedStock });
        } catch (error) {
          console.error(
            `Error actualizando stock para producto ${product.id}:`,
            error
          );
          showNotification(
            `Error actualizando stock para ${product.name}`,
            "error"
          );
          setIsProcessingPayment(false);
          return;
        }
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

        try {
          await db.customers.add(newCustomer);
          setCustomers([...customers, newCustomer]);
          setCustomerOptions([
            ...customerOptions,
            { value: newCustomer.id, label: newCustomer.name },
          ]);
          customerId = newCustomer.id;
          finalCustomerName = customerName.toUpperCase().trim();
          finalCustomerPhone = customerPhone;
        } catch (error) {
          console.error("Error creando cliente:", error);
          showNotification("Error al crear el cliente", "error");
          setIsProcessingPayment(false);
          return;
        }
      } else if (isCredit && selectedCustomer) {
        const customer = customers.find((c) => c.id === selectedCustomer.value);
        if (customer) {
          customerId = customer.id;
          finalCustomerName = customer.name;
          finalCustomerPhone = customer.phone || "";
        }
      } else if (selectedCustomer && !isCredit) {
        const customer = customers.find((c) => c.id === selectedCustomer.value);
        if (customer) {
          customerId = customer.id;
          finalCustomerName = customer.name;
          finalCustomerPhone = customer.phone || "";
        }
      } else {
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
        customerName: finalCustomerName,
        customerPhone: finalCustomerPhone,
        customerId: customerId || "",
        paid: !isCredit,
        concept: newSale.concept || "",
        appliedPromotion: selectedPromotions || undefined,
      };

      if (isCredit && registerCheck) {
        saleToSave.chequeInfo = {
          amount: newSale.total,
          status: "pendiente",
          date: new Date().toISOString(),
        };

        const chequePayment: Payment = {
          id: Date.now(),
          saleId: saleToSave.id,
          saleDate: saleToSave.date,
          amount: newSale.total,
          date: new Date().toISOString(),
          method: "CHEQUE",
          checkStatus: "pendiente",
          customerName: finalCustomerName,
          customerId: customerId,
        };

        await db.payments.add(chequePayment);
        console.log("✅ Cheque guardado en payments:", chequePayment);

        await addIncomeToDailyCash({
          ...saleToSave,
          paymentMethods: [{ method: "CHEQUE", amount: newSale.total }],
          customerName: finalCustomerName,
        });
      }

      if (!isCredit) {
        await addIncomeToDailyCash(saleToSave);
      }

      await db.sales.add(saleToSave);
      setSales([...sales, saleToSave]);

      if (selectedPromotions && selectedPromotions.id) {
        await db.promotions.update(selectedPromotions.id, {
          updatedAt: new Date().toISOString(),
        });

        const updatedPromotions = await db.promotions.toArray();
        const activePromotions = updatedPromotions.filter(
          (p) =>
            p.status === "active" &&
            (p.rubro === rubro || p.rubro === "Todos los rubros")
        );
        setAvailablePromotions(activePromotions);
      }

      if (customerId && finalCustomerName !== "CLIENTE OCASIONAL") {
        await updateCustomerPurchaseHistory(customerId, saleToSave);
      }

      showNotification(
        `Venta ${isCredit ? "a crédito" : ""} registrada correctamente`,
        "success"
      );

      if (!isCredit) {
        setIsPaymentModalOpen(false);
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
        setSelectedSale(saleToSave);
        setTimeout(() => {
          setIsInfoModalOpen(true);
        }, 200);
      } else {
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

        setIsPaymentModalOpen(false);
      }
      setIsOpenModal(false);
      setIsProcessingPayment(false);
    } catch (error) {
      console.error("Error al procesar la venta:", error);
      showNotification("Error al procesar la venta", "error");
      setIsProcessingPayment(false);
    }
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

  const addIncomeToDailyCash = async (sale: Sale) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      const totalProfit = calculateTotalProfit(
        sale.products,
        sale.manualAmount || 0,
        sale.manualProfitPercentage || 0
      );

      const baseTimestamp = new Date().toISOString();
      const movements: DailyCashMovement[] = [];

      if (sale.paymentMethods.length === 1) {
        const movement: DailyCashMovement = {
          id: Date.now(),
          amount: sale.total,
          description: `Venta - ${sale.concept || "general"}`,
          type: "INGRESO",
          date: baseTimestamp,
          paymentMethod: sale.paymentMethods[0]?.method || "EFECTIVO",
          items: sale.products.map((p) => {
            const priceInfo = calculatePrice(p, p.quantity, p.unit);
            return {
              productId: p.id,
              productName: p.name,
              quantity: p.quantity,
              unit: p.unit,
              price: priceInfo.finalPrice / p.quantity,
              costPrice: p.costPrice,
              profit: priceInfo.profit,
              size: p.size,
              color: p.color,
            };
          }),
          profit: totalProfit,
          combinedPaymentMethods: sale.paymentMethods,
          customerName: sale.customerName || "CLIENTE OCASIONAL",
          createdAt: new Date().toISOString(),
        };
        movements.push(movement);
      } else {
        const mainMovement: DailyCashMovement = {
          id: Date.now(),
          amount: sale.total,
          description: `Venta - ${sale.concept || "general"}`,
          type: "INGRESO",
          date: baseTimestamp,
          paymentMethod: "MIXTO",
          items: sale.products.map((p) => {
            const priceInfo = calculatePrice(p, p.quantity, p.unit);
            return {
              productId: p.id,
              productName: p.name,
              quantity: p.quantity,
              unit: p.unit,
              price: priceInfo.finalPrice / p.quantity,
              costPrice: p.costPrice,
              profit: priceInfo.profit,
              size: p.size,
              color: p.color,
            };
          }),
          profit: totalProfit,
          combinedPaymentMethods: sale.paymentMethods,
          customerName: sale.customerName || "CLIENTE OCASIONAL",
          createdAt: new Date().toISOString(),
        };
        movements.push(mainMovement);
      }

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          movements: movements,
          closed: false,
          totalIncome: sale.total,
          totalExpense: 0,
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome: (dailyCash.totalIncome || 0) + sale.total,
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
      throw error;
    }
  };

  const handleRegisterCheckChange = (checked: boolean) => {
    setRegisterCheck(checked);

    if (checked) {
      setNewSale((prev) => ({
        ...prev,
        paymentMethods: [{ method: "CHEQUE", amount: prev.total }],
      }));
    } else {
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
          discount: 0,
          surcharge: 0,
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
    console.log("Manual amount received:", value, typeof value);
    setNewSale((prev) => {
      const newTotal = calculateFinalTotal(
        prev.products,
        value,
        selectedPromotions
      );

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

  const handleCreditChange = (checked: boolean) => {
    setIsCredit(checked);
    setRegisterCheck(false);

    setNewSale((prev) => ({
      ...prev,
      paymentMethods: [{ method: "EFECTIVO", amount: prev.total }],
    }));
  };

  const handleYearChange = (value: string | number) => {
    setSelectedYear(value ? (value as number) : currentYear);
  };

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setNewSale((prev) => {
      const updatedMethods = [...prev.paymentMethods];

      if (field === "method" && value === "CHEQUE") {
        setIsCredit(true);
        setRegisterCheck(true);
      }

      if (
        field === "method" &&
        value !== "CHEQUE" &&
        prev.paymentMethods[index]?.method === "CHEQUE"
      ) {
        setIsCredit(false);
        setRegisterCheck(false);
      }

      if (field === "amount") {
        let numericValue: number;
        if (typeof value === "string") {
          numericValue = parseCurrencyInput(value, 2);
        } else {
          numericValue = value;
        }

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
          [field]: value as PaymentMethod,
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
              method: paymentOptions[prev.paymentMethods.length]
                .value as PaymentMethod,
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
              method: paymentOptions[prev.paymentMethods.length]
                .value as PaymentMethod,
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

  const handleAddSale = useCallback(async () => {
    const needsRedirect = await ensureCashIsOpen();
    if (needsRedirect.needsRedirect) {
      setShouldRedirectToCash(true);
      return;
    }
    setIsOpenModal(true);
  }, []);

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
    if (!sale) {
      showNotification("Error: Venta no válida", "error");
      return;
    }
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
    setIsPaymentModalOpen(false);
    setIsProcessingPayment(false);
  };

  const handleCloseInfoModal = () => {
    setIsInfoModalOpen(false);
    setSelectedSale(null);
  };

  const handleQuantityChange = useCallback(
    (productId: number, quantity: number, unit: Product["unit"]) => {
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
    },
    [products, selectedPromotions, showNotification]
  );

  const handleUnitChange = useCallback(
    (
      productId: number,
      selectedValue: string | number,
      currentQuantity: number
    ) => {
      if (!selectedValue) return;

      setNewSale((prevState) => {
        const updatedProducts = prevState.products.map((p) => {
          if (p.id === productId) {
            const compatibleUnits = getCompatibleUnits(p.unit);
            const isCompatible = compatibleUnits.some(
              (u) => u.value === selectedValue
            );

            if (!isCompatible) return p;

            const newUnit = selectedValue as Product["unit"];
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
    },
    [selectedPromotions]
  );

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        const storedPromotions = await db.promotions.toArray();
        const now = new Date();

        const activePromotions = storedPromotions.filter((p) => {
          if (p.status !== "active") return false;
          if (!(p.rubro === rubro || p.rubro === "Todos los rubros"))
            return false;

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

      if (registerCheck && updatedMethods[0]?.method === "CHEQUE") {
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 1) {
        updatedMethods[0].amount = prev.total;
      } else if (updatedMethods.length === 2) {
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

  const expectedTotal = calculateFinalTotal(
    newSale.products,
    newSale.manualAmount || 0,
    selectedPromotions
  );

  useEffect(() => {
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isModalOpen =
        isOpenModal ||
        isInfoModalOpen ||
        isPaymentModalOpen ||
        isPromotionModalOpen ||
        isBusinessDataModalOpen;

      if (isModalOpen || rubro === "Todos los rubros" || isProcessingPayment) {
        return;
      }

      if (e.key === "F1") {
        e.preventDefault();
        handleAddSale();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    rubro,
    handleAddSale,
    isOpenModal,
    isInfoModalOpen,
    isPaymentModalOpen,
    isPromotionModalOpen,
    isBusinessDataModalOpen,
    isProcessingPayment,
  ]);

  useEffect(() => {
    if (isInfoModalOpen && selectedSale && !selectedSale.credit) {
      const handleEnterKey = (e: KeyboardEvent) => {
        const activeElement = document.activeElement;
        const isInputFocused =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA";

        if (
          e.key === "Enter" &&
          !isInputFocused &&
          !e.shiftKey &&
          !e.ctrlKey &&
          !e.altKey
        ) {
          e.preventDefault();
          e.stopPropagation();

          imprimirButtonRef.current?.click();
        }
      };

      window.addEventListener("keydown", handleEnterKey);
      return () => {
        window.removeEventListener("keydown", handleEnterKey);
      };
    }
  }, [isInfoModalOpen, selectedSale]);

  useEffect(() => {
    if (isOpenModal && !isProcessingPayment) {
      const handleEnterKey = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          e.stopPropagation();

          if (newSale.products.length === 0) {
            showNotification("Debe agregar al menos un producto", "error");
            return;
          }

          if (isCredit) {
            const normalizedName = customerName.toUpperCase().trim();
            if (!normalizedName && !selectedCustomer) {
              showNotification(
                "Debe ingresar o seleccionar un cliente",
                "error"
              );
              return;
            }
          }

          cobrarButtonRef.current?.click();
        }
      };

      window.addEventListener("keydown", handleEnterKey);
      return () => {
        window.removeEventListener("keydown", handleEnterKey);
      };
    }
  }, [
    isOpenModal,
    isProcessingPayment,
    newSale.products.length,
    isCredit,
    customerName,
    selectedCustomer,
    showNotification,
  ]);

  const indexOfLastSale = currentPage * itemsPerPage;
  const indexOfFirstSale = indexOfLastSale - itemsPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 4,
          py: 2,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Ventas
        </Typography>

        {/* Header con filtros y acciones */}
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
            <Box sx={{ display: "flex", gap: 2, maxWidth: "20rem" }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  label="Mes"
                  value={selectedMonth}
                  options={monthOptions}
                  onChange={(value) => setSelectedMonth(value as number)}
                  size="small"
                />
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  label="Año"
                  value={selectedYear}
                  options={yearOptions}
                  onChange={(value) => handleYearChange(value)}
                  size="small"
                />
              </FormControl>
            </Box>
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
              onClick={handleAddSale}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
              startIcon={<Add fontSize="small" />}
            >
              Nueva Venta [F1]
            </Button>
          </Box>
        </Box>

        {/* Tabla de ventas */}
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
              sx={{ maxHeight: "63vh", flex: 1 }}
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
                      Productos
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Concepto
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Fecha
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Forma de Pago
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Total
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
                  {currentSales.length > 0 ? (
                    currentSales.map((sale) => {
                      const products = sale.products || [];
                      const paymentMethods = sale.paymentMethods || [];
                      const saleDate = sale.date
                        ? parseISO(sale.date)
                        : new Date();
                      const total = sale.total || 0;

                      return (
                        <TableRow
                          key={sale.id || Date.now()}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { backgroundColor: "action.hover" },
                            transition: "all 0.3s",
                          }}
                        >
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: "semibold",
                                textTransform: "capitalize",
                                maxWidth: "200px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
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
                            </Typography>
                          </TableCell>

                          <TableCell>
                            {sale.concept ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  maxWidth: "150px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={sale.concept}
                              >
                                {sale.concept.length > 50
                                  ? `${sale.concept.substring(0, 50)}...`
                                  : sale.concept}
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                color="text.disabled"
                                fontStyle="italic"
                              >
                                -
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="center">
                            <Typography variant="body2">
                              {format(saleDate, "dd/MM/yyyy", { locale: es })}
                            </Typography>
                          </TableCell>

                          <TableCell align="center">
                            {sale.credit ? (
                              <CustomChip
                                label={
                                  sale.chequeInfo
                                    ? "Cheque"
                                    : "Cuenta corriente"
                                }
                                color="warning"
                                size="small"
                              />
                            ) : (
                              <Box>
                                {sale.deposit !== undefined &&
                                sale.deposit > 0 ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      mb: 0.5,
                                    }}
                                  >
                                    <Typography variant="body2">
                                      SEÑA:
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                    >
                                      {formatCurrency(sale.deposit)}
                                    </Typography>
                                  </Box>
                                ) : null}

                                {paymentMethods.map((payment, i) => (
                                  <Box
                                    key={i}
                                    sx={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                    }}
                                  >
                                    <Typography variant="body2">
                                      {payment?.method ||
                                        "Método no especificado"}
                                      :
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      fontWeight="bold"
                                    >
                                      {formatCurrency(payment?.amount || 0)}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              variant="body2"
                              fontWeight="bold"
                              color={
                                sale.credit ? "warning.main" : "text.primary"
                              }
                            >
                              {formatCurrency(total)}
                            </Typography>
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CustomGlobalTooltip title="Ver ticket">
                                  <IconButton
                                    onClick={() => handleOpenInfoModal(sale)}
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
                                    <Print fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                              </Box>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 6 : 5}
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
                          <ShoppingCart
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>Todavía no hay ventas.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredSales.length > 0 && (
            <Pagination
              text="Ventas por página"
              text2="Total de ventas"
              totalItems={filteredSales.length}
            />
          )}
        </Box>

        {/* Modales */}

        <Modal
          isOpen={isDeleteProductModalOpen}
          onClose={() => {
            setIsDeleteProductModalOpen(false);
            setProductToDelete(null);
          }}
          title="Confirmar Eliminación"
          buttons={
            <>
              <Button
                variant="text"
                onClick={() => {
                  setIsDeleteProductModalOpen(false);
                  setProductToDelete(null);
                }}
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
                onClick={handleConfirmProductDelete}
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
          bgColor="bg-white dark:bg-gray_b"
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea eliminar el producto de la venta?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              <strong>{productToDelete?.name}</strong> será eliminado de la
              venta.
            </Typography>
          </Box>
        </Modal>
        <Modal
          isOpen={isInfoModalOpen}
          onClose={handleCloseInfoModal}
          title="Ticket de la venta"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={handleCloseInfoModal}
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
              <Button
                ref={imprimirButtonRef}
                onClick={handlePrintTicket}
                variant="contained"
                startIcon={<Print fontSize="small" />}
                disabled={!selectedSale || selectedSale?.credit}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Imprimir Ticket
              </Button>
            </Box>
          }
        >
          {selectedSale ? (
            <>
              {/* Mensaje para cambiar datos del ticket */}
              <Box
                sx={{
                  textAlign: "center",
                  mb: 3,
                  p: 2,
                  backgroundColor: "info.light",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "info.main",
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    mb: 1,
                    fontWeight: "medium",
                    color: "white",
                  }}
                >
                  Cambia los datos de tu ticket haciendo click Aquí
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    handleCloseInfoModal();
                    handleOpenBusinessDataModal(selectedSale);
                  }}
                  startIcon={<Settings sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: "primary.main",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                >
                  Modificar datos del negocio
                </Button>
              </Box>

              <Box sx={{ width: "100%", minWidth: "180mm", overflow: "auto" }}>
                <PrintableTicket
                  ref={ticketRef}
                  sale={selectedSale}
                  rubro={rubro}
                  businessData={businessData}
                />
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" color="error">
                No se pudo cargar la información de la venta
              </Typography>
            </Box>
          )}
        </Modal>

        {/* Modal de Nueva Venta */}
        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title="Nueva Venta"
          bgColor="bg-white dark:bg-gray_b"
          fixedTotal={
            <Box
              sx={{
                ...getCardStyle("primary"),
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                textAlign: "center",
                p: 2,
                width: "100%",
              }}
            >
              <Typography variant="h4" fontWeight="bold">
                TOTAL: {formatCurrency(newSale.total)}
              </Typography>
            </Box>
          }
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
                ref={cobrarButtonRef}
                variant="contained"
                onClick={handleOpenPaymentModal}
                disabled={isProcessingPayment}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                  "&:disabled": { bgcolor: "action.disabled" },
                }}
              >
                {isProcessingPayment ? "Procesando..." : "Cobrar"}
              </Button>
            </Box>
          }
        >
          {/* Contenido principal SIN la sección del TOTAL */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 2 }}>
            {/* Sección de Promociones */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Button
                variant="contained"
                startIcon={<LocalOffer fontSize="small" />}
                onClick={() => setIsPromotionModalOpen(true)}
                disabled={newSale.products.length === 0}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                Seleccionar Promociones
              </Button>
              <Box sx={{ flex: 1 }}>
                <SelectedPromotionsBadge />
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Box sx={{ width: "100%" }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Escanear código de barras
                </Typography>
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
              </Box>
              <Box sx={{ width: "100%" }}>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Productos*
                </Typography>
                <ProductSearchAutocomplete
                  products={products}
                  selectedProducts={newSale.products.map((p) => {
                    const product = products.find((prod) => prod.id === p.id);
                    return {
                      value: p.id,
                      label: getDisplayProductName(p, rubro, true),
                      product: product!,
                      isDisabled: false,
                    } as ProductOption;
                  })}
                  onProductSelect={(selectedOptions: ProductOption[]) => {
                    const existingProductsMap = new Map(
                      newSale.products.map((p) => [p.id, p])
                    );

                    const updatedProducts = selectedOptions
                      .filter((option) => !option.isDisabled)
                      .map((option) => {
                        const existingProduct = existingProductsMap.get(
                          option.product.id
                        );

                        if (existingProduct) {
                          return {
                            ...existingProduct,
                          };
                        }

                        return {
                          ...option.product,
                          quantity: 1,
                          discount: 0,
                          surcharge: 0,
                          unit: option.product.unit || "Unid.",
                        };
                      });

                    setNewSale((prev) => {
                      const newTotal = calculateFinalTotal(
                        updatedProducts,
                        prev.manualAmount || 0,
                        selectedPromotions
                      );

                      return {
                        ...prev,
                        products: updatedProducts,
                        total: newTotal,
                        paymentMethods: synchronizePaymentMethods(
                          prev.paymentMethods,
                          newTotal
                        ),
                      };
                    });
                  }}
                  onSearchChange={(query) => {
                    console.log("Búsqueda de productos:", query);
                  }}
                  rubro={rubro}
                  placeholder="Seleccionar productos"
                  maxDisplayed={50}
                />
              </Box>
            </Box>

            {newSale.products.length > 0 && (
              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: "25vh",
                  bgcolor: "background.paper",
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={tableHeaderStyle}>Producto</TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Unidad
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Cantidad
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        % descuento
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        % recargo
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Total
                      </TableCell>
                      <TableCell sx={tableHeaderStyle} align="center">
                        Acciones
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newSale.products.map((product) => (
                      <TableRow
                        key={product.id}
                        hover
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          "&:hover": { backgroundColor: "action.hover" },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2">
                            {getDisplayProductName(product, rubro)}
                          </Typography>
                        </TableCell>
                        <TableCell>
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
                              label="Unidad"
                              options={getCompatibleUnitOptions(product.unit)}
                              value={product.unit}
                              onChange={(value) =>
                                handleUnitChange(
                                  product.id,
                                  value,
                                  product.quantity
                                )
                              }
                              fullWidth
                              size="small"
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              align="center"
                            >
                              {product.unit}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <TextField
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
                            inputProps={{
                              step:
                                product.unit === "Kg" || product.unit === "L"
                                  ? "0.001"
                                  : "1",
                            }}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                              if (e.target.value === "") {
                                handleQuantityChange(
                                  product.id,
                                  0,
                                  product.unit
                                );
                              }
                            }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={product.discount?.toString() || "0"}
                            onChange={(e) => {
                              const value = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              );
                              setNewSale((prev) => {
                                const updatedProducts = prev.products.map((p) =>
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
                            inputProps={{ min: 0, max: 100, step: "1" }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            value={product.surcharge?.toString() || "0"}
                            onChange={(e) => {
                              const value = Math.min(
                                100,
                                Math.max(0, Number(e.target.value))
                              );
                              setNewSale((prev) => {
                                const updatedProducts = prev.products.map((p) =>
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
                            inputProps={{ min: 0, max: 100, step: "1" }}
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight="bold">
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
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <CustomGlobalTooltip title="Eliminar producto">
                            <IconButton
                              onClick={() => {
                                handleDeleteProductClick(
                                  product.id,
                                  getDisplayProductName(product, rubro)
                                );
                              }}
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {!isCredit && (
                <Box sx={{ width: "100%" }}>
                  <Typography
                    variant="body2"
                    fontWeight="medium"
                    sx={{ mb: 1 }}
                  >
                    Cliente
                  </Typography>
                  <Autocomplete
                    options={customerOptions}
                    value={selectedCustomer}
                    onChange={(
                      event: React.SyntheticEvent,
                      newValue: CustomerOption | null
                    ) => {
                      setSelectedCustomer(newValue);
                      if (newValue) {
                        const customer = customers.find(
                          (c) => c.id === newValue.value
                        );
                        setCustomerName(customer?.name || "");
                        setCustomerPhone(customer?.phone || "");
                      }
                    }}
                    getOptionLabel={(option) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Ningún cliente seleccionado"
                        variant="outlined"
                        size="small"
                      />
                    )}
                    isOptionEqualToValue={(option, value) =>
                      option.value === value.value
                    }
                  />
                </Box>
              )}

              <Box sx={{ width: "100%" }}>
                {isCredit ? (
                  <Card sx={{ p: 2, bgcolor: "grey.50" }}>
                    <Typography variant="body2" fontWeight="semibold">
                      Monto manual deshabilitado
                    </Typography>
                  </Card>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      marginTop: 3,
                    }}
                  >
                    <Box sx={{ width: "100%" }}>
                      <InputCash
                        label="Monto manual"
                        value={newSale.manualAmount || 0}
                        onChange={handleManualAmountChange}
                        disabled={isCredit}
                      />
                    </Box>
                    <Box sx={{ width: "100%" }}>
                      <TextField
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
                        label="% Ganancia"
                        inputProps={{ min: 0, max: 100, step: "1" }}
                        size="small"
                        fullWidth
                        disabled={isCredit}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            <Box sx={{ width: "100%" }}>
              {isCredit && (
                <Checkbox
                  label="Registrar cheque"
                  checked={registerCheck}
                  onChange={handleRegisterCheckChange}
                />
              )}
              {isCredit && registerCheck ? (
                <Box sx={{ p: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Select
                      label="Método"
                      options={[{ value: "CHEQUE", label: "Cheque" }]}
                      value="CHEQUE"
                      onChange={() => {}}
                      disabled
                      fullWidth
                      size="small"
                    />
                    <InputCash
                      value={newSale.paymentMethods[0]?.amount || 0}
                      onChange={(value) =>
                        handlePaymentMethodChange(0, "amount", value)
                      }
                      placeholder="Monto del cheque"
                    />
                  </Box>
                </Box>
              ) : !isCredit ? (
                <>
                  {newSale.paymentMethods.map((payment, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        my: 1,
                      }}
                    >
                      <Select
                        label="Método"
                        options={paymentOptions}
                        value={payment.method}
                        onChange={(value) =>
                          handlePaymentMethodChange(index, "method", value)
                        }
                        disabled={isCredit}
                        fullWidth
                        size="small"
                      />

                      <Box sx={{ position: "relative", width: "100%" }}>
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
                            <Typography
                              variant="caption"
                              color="error"
                              sx={{ ml: 1 }}
                            >
                              Exceso:{" "}
                              {formatCurrency(
                                newSale.paymentMethods.reduce(
                                  (sum, m) => sum + m.amount,
                                  0
                                ) - newSale.total
                              )}
                            </Typography>
                          )}
                      </Box>

                      {newSale.paymentMethods.length > 1 && (
                        <CustomGlobalTooltip title="Eliminar método de pago">
                          <IconButton
                            onClick={() => removePaymentMethod(index)}
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
                      )}
                    </Box>
                  ))}
                  {!isCredit && newSale.paymentMethods.length < 3 && (
                    <Button
                      variant="text"
                      startIcon={<Add fontSize="small" />}
                      onClick={addPaymentMethod}
                      sx={{
                        justifyContent: "flex-start",
                        px: 1,
                        minWidth: "auto",
                      }}
                    >
                      Agregar otro método de pago
                    </Button>
                  )}
                </>
              ) : null}
            </Box>

            <Box sx={{ width: "100%" }}>
              <TextField
                value={newSale.concept || ""}
                onChange={(e) =>
                  setNewSale((prev) => ({
                    ...prev,
                    concept: e.target.value,
                  }))
                }
                label="Concepto (Opcional)"
                placeholder="Ingrese un concepto para esta venta..."
                multiline
                rows={3}
                inputProps={{ maxLength: 50 }}
                variant="outlined"
                fullWidth
              />
            </Box>

            <Checkbox
              label="Registrar Cuenta corriente"
              checked={isCredit}
              onChange={handleCreditChange}
            />

            {isCredit && (
              <Box>
                <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
                  Cliente existente*
                </Typography>
                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomer}
                  onChange={(
                    event: React.SyntheticEvent,
                    newValue: CustomerOption | null
                  ) => {
                    setSelectedCustomer(newValue);
                    if (newValue) {
                      const customer = customers.find(
                        (c) => c.id === newValue.value
                      );
                      setCustomerName(customer?.name || "");
                      setCustomerPhone(customer?.phone || "");
                    }
                  }}
                  getOptionLabel={(option) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Buscar cliente"
                      variant="outlined"
                      size="small"
                    />
                  )}
                  isOptionEqualToValue={(option, value) =>
                    option.value === value.value
                  }
                />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mt: 2,
                  }}
                >
                  <TextField
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
                    variant="outlined"
                    size="small"
                    fullWidth
                  />

                  <TextField
                    label="Teléfono del cliente"
                    placeholder="Teléfono del cliente"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                  />
                </Box>
              </Box>
            )}
          </Box>
        </Modal>
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            if (!isProcessingPayment) {
              setIsPaymentModalOpen(false);

              setTimeout(() => setIsOpenModal(true), 100);
            }
          }}
          total={newSale.total}
          onConfirm={handleConfirmPayment}
          isProcessing={isProcessingPayment}
          isCredit={isCredit}
          registerCheck={registerCheck}
        />
        <PromotionSelectionModal />

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={closeNotification}
        />

        {/* Modal de Datos del Negocio */}
        <BusinessDataModal
          isOpen={isBusinessDataModalOpen}
          onClose={handleCloseBusinessDataModal}
          title="Datos del negocio para tickets"
          onSaveSuccess={handleSaveBusinessDataSuccess}
          showNotificationOnSave={true}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default VentasPage;
