// calculations.ts
import { PaymentSplit, Product, Installment } from "../types/types";

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

export const convertToBaseUnit = (
  quantity: number,
  fromUnit: string
): number => {
  const unitInfo =
    CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
  return unitInfo ? quantity * unitInfo.factor : quantity;
};

export const convertFromBaseUnit = (
  quantity: number,
  toUnit: string
): number => {
  const unitInfo =
    CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];
  return unitInfo ? quantity / unitInfo.factor : quantity;
};

export const convertUnit = (
  quantity: number,
  fromUnit: string,
  toUnit: string
): number => {
  if (fromUnit === toUnit) return quantity;

  const fromInfo =
    CONVERSION_FACTORS[fromUnit as keyof typeof CONVERSION_FACTORS];
  const toInfo = CONVERSION_FACTORS[toUnit as keyof typeof CONVERSION_FACTORS];

  if (!fromInfo || !toInfo) return quantity;
  if (fromInfo.base !== toInfo.base) return quantity;

  const inBase = quantity * fromInfo.factor;
  return inBase / toInfo.factor;
};

export const calculateProfit = (
  product: Product,
  quantity: number,
  unit: string
): number => {
  try {
    const priceInfo = calculatePrice(product, quantity, unit);
    return priceInfo.profit;
  } catch (error) {
    console.error("Error calculating profit:", error);
    return 0;
  }
};

export const calculatePrice = (
  product: Product,
  quantity: number,
  unit: string
): {
  finalPrice: number;
  profit: number;
  quantityInProductUnit: number;
  discountAmount: number;
  surchargeAmount: number;
} => {
  try {
    const quantityInProductUnit = convertUnit(quantity, unit, product.unit);
    const costPrice = product.costPrice || 0;

    // Precio sin descuentos/recargos
    const priceWithoutModifiers = product.price * quantityInProductUnit;

    // Aplicar descuento
    const discount = product.discount || 0;
    const discountAmount = (priceWithoutModifiers * discount) / 100;
    const priceAfterDiscount = priceWithoutModifiers - discountAmount;

    // Aplicar recargo
    const surcharge = product.surcharge || 0;
    const surchargeAmount = (priceAfterDiscount * surcharge) / 100;
    const finalPrice = priceAfterDiscount + surchargeAmount;

    // Calcular ganancia (precio final - costo)
    const totalCost = costPrice * quantityInProductUnit;
    const profit = finalPrice - totalCost;

    return {
      finalPrice: parseFloat(finalPrice.toFixed(2)),
      profit: parseFloat(profit.toFixed(2)),
      quantityInProductUnit,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      surchargeAmount: parseFloat(surchargeAmount.toFixed(2)),
    };
  } catch (error) {
    console.error("Error calculating price and profit:", error);
    return {
      finalPrice: 0,
      profit: 0,
      quantityInProductUnit: 0,
      discountAmount: 0,
      surchargeAmount: 0,
    };
  }
};

export const calculateTotal = (
  products: Product[],
  manualAmount: number = 0
): number => {
  const productsTotal = products.reduce(
    (sum, p) => sum + calculatePrice(p, p.quantity, p.unit).finalPrice,
    0
  );

  return parseFloat((productsTotal + manualAmount).toFixed(2));
};

export const calculateCombinedTotal = (products: Product[]): number => {
  return products.reduce(
    (sum, p) => sum + calculatePrice(p, p.quantity, p.unit).finalPrice,
    0
  );
};

export const calculateTotalProfit = (
  products: Product[],
  manualAmount: number = 0,
  manualProfitPercentage: number = 0
): number => {
  const productsProfit = products.reduce(
    (sum, p) => sum + calculatePrice(p, p.quantity, p.unit).profit,
    0
  );

  const manualProfit = (manualAmount * manualProfitPercentage) / 100;

  return parseFloat((productsProfit + manualProfit).toFixed(2));
};

export const checkStockAvailability = (
  product: Product,
  requestedQuantity: number,
  requestedUnit: string
): {
  available: boolean;
  availableQuantity: number;
  availableUnit: string;
} => {
  try {
    const stockInBase = convertToBaseUnit(Number(product.stock), product.unit);
    const requestedInBase = convertToBaseUnit(requestedQuantity, requestedUnit);

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
};

export const calculateInstallments = (
  totalAmount: number,
  numberOfInstallments: number,
  interestRate: number,
  startDate: string
): Installment[] => {
  const installments: Installment[] = [];
  const monthlyInterest = interestRate / 100;

  let cuota: number;

  // Manejar el caso especial cuando la tasa de interés es 0%
  if (monthlyInterest === 0) {
    cuota = totalAmount / numberOfInstallments;
  } else {
    // Usar el método francés para calcular cuotas constantes
    cuota =
      (totalAmount *
        (monthlyInterest *
          Math.pow(1 + monthlyInterest, numberOfInstallments))) /
      (Math.pow(1 + monthlyInterest, numberOfInstallments) - 1);
  }

  const start = new Date(startDate);
  let saldo = totalAmount;

  for (let i = 1; i <= numberOfInstallments; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);

    let interestAmount = 0;
    let principalAmount = cuota;

    if (monthlyInterest > 0) {
      interestAmount = saldo * monthlyInterest;
      principalAmount = cuota - interestAmount;
      saldo -= principalAmount;
    } else {
      // Sin interés: cada cuota reduce el saldo uniformemente
      saldo -= principalAmount;
    }

    // Asegurar que no haya valores NaN
    const installmentAmount = isNaN(cuota)
      ? totalAmount / numberOfInstallments
      : cuota;

    const installment: Installment = {
      creditSaleId: 0,
      number: i,
      dueDate: dueDate.toISOString().split("T")[0],
      amount: parseFloat(installmentAmount.toFixed(2)),
      interestAmount: parseFloat((interestAmount || 0).toFixed(2)),
      penaltyAmount: 0,
      status: "pendiente",
      daysOverdue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    installments.push(installment);
  }

  return installments;
};

export const recalculatePaymentMethods = (
  paymentMethods: PaymentSplit[],
  newTotal: number
): PaymentSplit[] => {
  if (paymentMethods.length === 0) {
    return [{ method: "EFECTIVO", amount: newTotal }];
  }

  const updatedMethods = [...paymentMethods];

  if (updatedMethods.length === 1) {
    // Un solo método de pago - asignar el total completo
    updatedMethods[0] = {
      ...updatedMethods[0],
      amount: parseFloat(newTotal.toFixed(2)),
    };
  } else {
    // Múltiples métodos - distribuir proporcionalmente
    const previousTotal = updatedMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );

    if (previousTotal === 0 || previousTotal === newTotal) {
      // Si no había montos previos o el total no cambió, distribuir equitativamente
      const share = parseFloat((newTotal / updatedMethods.length).toFixed(2));
      updatedMethods.forEach((method, index) => {
        updatedMethods[index] = { ...method, amount: share };
      });
    } else {
      // Distribuir proporcionalmente basado en los montos anteriores
      updatedMethods.forEach((method, index) => {
        const ratio = method.amount / previousTotal;
        updatedMethods[index] = {
          ...method,
          amount: parseFloat((newTotal * ratio).toFixed(2)),
        };
      });
    }

    // Ajustar por diferencias de redondeo
    const totalPaymentMethods = updatedMethods.reduce(
      (sum, method) => sum + method.amount,
      0
    );
    const difference = parseFloat((newTotal - totalPaymentMethods).toFixed(2));

    if (Math.abs(difference) > 0.01 && updatedMethods.length > 0) {
      const lastIndex = updatedMethods.length - 1;
      updatedMethods[lastIndex] = {
        ...updatedMethods[lastIndex],
        amount: parseFloat(
          (updatedMethods[lastIndex].amount + difference).toFixed(2)
        ),
      };
    }
  }

  return updatedMethods;
};
