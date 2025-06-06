import { ProductDisplayInfo, Rubro } from "../types/types";

const getDisplayProductName = (
  productOrName: ProductDisplayInfo | string,
  rubro?: Rubro,
  showSizeAndColor: boolean = true
) => {
  let displayName =
    typeof productOrName === "string" ? productOrName : productOrName.name;
  const size =
    typeof productOrName !== "string" ? productOrName.size : undefined;
  const color =
    typeof productOrName !== "string" ? productOrName.color : undefined;

  if ((showSizeAndColor || rubro === "todos los rubros") && (size || color)) {
    const sizePart = size ? ` (Talle: ${size})` : "";
    const colorPart = color ? ` | Color: ${color.toUpperCase()}` : "";
    displayName = `${displayName}${sizePart}${colorPart}`;
  }

  return displayName;
};

export default getDisplayProductName;
