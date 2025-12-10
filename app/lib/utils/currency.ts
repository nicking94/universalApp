export const formatCurrency = (
  value: number,
  currency: string = "ARS"
): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const parseCurrencyInput = (
  input: string,
  maxDecimals: number = 2
): number => {
  if (!input || input.trim() === "" || input === "-") return 0;

  let cleanInput = input.trim();
  const isNegative = cleanInput.startsWith("-");

  if (isNegative) {
    cleanInput = cleanInput.substring(1);
  }

  if (cleanInput === "") return 0;

  cleanInput = cleanInput.replace(/\./g, "").replace(/,/g, ".");
  const parts = cleanInput.split(".");
  if (parts.length > 2) {
    cleanInput = parts[0] + "." + parts.slice(1).join("");
  }

  const number = parseFloat(cleanInput);
  if (isNaN(number)) return 0;

  const factor = 10 ** maxDecimals;
  const rounded = Math.round(number * factor) / factor;

  return isNegative ? -rounded : rounded;
};

export const formatCurrencyInput = (
  value: number | string,
  maxDecimals: number = 2
): string => {
  const numValue =
    typeof value === "string" ? parseCurrencyInput(value, maxDecimals) : value;

  if (numValue === 0) return "";

  const isNegative = numValue < 0;
  const absoluteValue = Math.abs(numValue);
  const fixed = absoluteValue.toFixed(maxDecimals);
  const [integer, decimal] = fixed.split(".");

  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const formatted =
    decimal === "00" ? formattedInteger : `${formattedInteger},${decimal}`;

  return isNegative ? `-${formatted}` : formatted;
};
