import { ProductDisplayInfo, Rubro } from "../types/types";

const getDisplayProductName = (
  productOrName: ProductDisplayInfo | string,
  rubro?: Rubro,
  showSizeAndColor: boolean = true
): string => {
  // Extract basic information
  const isProductObject = typeof productOrName !== "string";
  const productName = isProductObject ? productOrName.name : productOrName;
  const lot = isProductObject ? productOrName.lot : undefined;
  let displayName = lot ? `[L-${lot}] ${productName}` : productName;

  const shouldDisplayDetails =
    showSizeAndColor || rubro?.toLowerCase() === "todos los rubros";

  if (!shouldDisplayDetails || !isProductObject) {
    return displayName;
  }

  const { size, color } = productOrName;
  const details: string[] = [];

  if (size) details.push(`Talle: ${size}`);
  if (color) details.push(`Color: ${color.toUpperCase()}`);
  if (details.length > 0) {
    displayName = `${displayName} (${details.join(" | ")})`;
  }

  return displayName;
};

export default getDisplayProductName;
