import { useState, useEffect } from "react";

export type PrinterType = "80mm" | "40mm" | "unknown";

export const usePrinterType = (): PrinterType => {
  const [printerType, setPrinterType] = useState<PrinterType>("unknown");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const typeFromUrl = urlParams.get("printerType");
    const savedType = localStorage.getItem("printerType");

    if (typeFromUrl === "40mm" || savedType === "40mm") {
      setPrinterType("40mm");
    } else if (typeFromUrl === "80mm" || savedType === "80mm") {
      setPrinterType("80mm");
    } else {
      setPrinterType("80mm");
    }
  }, []);

  return printerType;
};
