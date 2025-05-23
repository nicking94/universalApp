export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyInput = (input: string): number => {
  if (!input) return 0;
  const cleanValue = input.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleanValue) || 0;
};

export const formatCurrencyInput = (value: number | string): string => {
  if (typeof value === "string") {
    // Si es string, verificar si ya está formateado
    if (/,/.test(value)) return value;
    value = parseFloat(value.replace(/\D/g, "")) || 0;
  }

  // Formatear con separadores de miles y coma decimal
  const parts = value.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.join(",");
};

export const validateCurrencyInput = (input: string): boolean => {
  // Permite números opcionalmente con una coma y hasta 2 decimales
  return /^\d*([,]\d{0,2})?$/.test(input);
};
