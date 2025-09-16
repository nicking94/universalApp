import { useState, useEffect } from "react";

export type PrinterType = "80mm" | "40mm" | "unknown";

export const usePrinterType = (): PrinterType => {
  const [printerType, setPrinterType] = useState<PrinterType>("unknown");

  useEffect(() => {
    // Puedes detectar el tipo de impresora de varias formas:

    // 1. Por URL o parámetro (si tienes diferentes clientes)
    const urlParams = new URLSearchParams(window.location.search);
    const typeFromUrl = urlParams.get("printerType");

    // 2. Por localStorage (si el usuario configura su impresora)
    const savedType = localStorage.getItem("printerType");

    // 3. Por detección automática (más complejo)

    if (typeFromUrl === "40mm" || savedType === "40mm") {
      setPrinterType("40mm");
    } else if (typeFromUrl === "80mm" || savedType === "80mm") {
      setPrinterType("80mm");
    } else {
      // Default a 80mm si no se especifica
      setPrinterType("80mm");
    }
  }, []);

  return printerType;
};
