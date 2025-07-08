import { Product } from "../types/types";

const CONVERSION_FACTORS = {
  gr: { base: "Kg", factor: 0.001 },
  Kg: { base: "Kg", factor: 1 },
  ton: { base: "Kg", factor: 1000 },
  ml: { base: "L", factor: 0.001 },
  L: { base: "L", factor: 1 },
  mm: { base: "m", factor: 0.001 },
  cm: { base: "m", factor: 0.01 },
  m: { base: "m", factor: 1 },
  pulg: { base: "m", factor: 0.0254 },
  Unid: { base: "Unid", factor: 1 },
  docena: { base: "Unid", factor: 12 },
  ciento: { base: "Unid", factor: 100 },
  Bulto: { base: "Bulto", factor: 1 },
  Caja: { base: "Caja", factor: 1 },
  Cajón: { base: "Cajón", factor: 1 },
  m2: { base: "m²", factor: 1 },
  m3: { base: "m³", factor: 1 },
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
export const calculateTotalProfit = (
  products: Product[],
  manualAmount: number = 0,
  manualProfitPercentage: number = 0
): number => {
  const productsProfit = products.reduce(
    (sum, p) => sum + calculateProfit(p, p.quantity, p.unit),
    0
  );
  const manualProfit = (manualAmount * manualProfitPercentage) / 100;
  return parseFloat((productsProfit + manualProfit).toFixed(2));
};
export const calculatePrice = (
  product: Product,
  quantity: number,
  unit: string
): number => {
  try {
    const quantityInProductUnit = convertUnit(quantity, unit, product.unit);
    const priceWithoutDiscount = product.price * quantityInProductUnit;
    const discount = product.discount || 0;
    const discountAmount = (priceWithoutDiscount * discount) / 100;
    return parseFloat((priceWithoutDiscount - discountAmount).toFixed(2));
  } catch (error) {
    console.error("Error calculating price:", error);
    return 0;
  }
};

export const calculateProfit = (
  product: Product,
  quantity: number,
  unit: string
): number => {
  try {
    const quantityInBaseUnit = convertToBaseUnit(quantity, unit);
    const costInBaseUnit =
      convertToBaseUnit(1, product.unit) * (product.costPrice || 0);
    const priceInBaseUnit = convertToBaseUnit(1, product.unit) * product.price;
    const profitPerBaseUnit = priceInBaseUnit - costInBaseUnit;
    const profitWithoutDiscount = profitPerBaseUnit * quantityInBaseUnit;
    const discount = product.discount || 0;
    const discountAmount =
      (product.price * quantityInBaseUnit * discount) / 100;

    return parseFloat((profitWithoutDiscount - discountAmount).toFixed(2));
  } catch (error) {
    console.error("Error calculating profit:", error);
    return 0;
  }
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
