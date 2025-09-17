"use client";
import React, { useRef, useState, useEffect } from "react";
import Barcode from "react-barcode";
import { formatCurrency } from "../lib/utils/currency";
import { Product } from "../lib/types/types";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";
import { usePrinterType } from "../hooks/usePrinterType";

type BarcodeGeneratorProps = {
  product: Product;
  onClose: () => void;
  onPrintComplete?: () => void;
  onBarcodeChange?: (value: string) => void;
};

// Definir tipos para los tamaños de impresión
type PrintSize = "80mm" | "40mm" | "custom";

const BarcodeGenerator = ({
  product,
  onClose,
  onPrintComplete,
  onBarcodeChange,
}: BarcodeGeneratorProps) => {
  const [barcodeValue, setBarcodeValue] = useState(product.barcode || "");
  const [isPrinting, setIsPrinting] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const printerType = usePrinterType();

  // Estado para el tamaño de impresión seleccionado
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSize>("80mm");
  // Estado para tamaño personalizado
  const [customWidth, setCustomWidth] = useState("80");
  const [customHeight, setCustomHeight] = useState("60");
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // Cargar la preferencia guardada al inicializar el componente
  useEffect(() => {
    const savedPrintSize = localStorage.getItem(
      "preferredPrintSize"
    ) as PrintSize;
    if (
      savedPrintSize &&
      (savedPrintSize === "80mm" ||
        savedPrintSize === "40mm" ||
        savedPrintSize === "custom")
    ) {
      setSelectedPrintSize(savedPrintSize);
      setShowCustomInputs(savedPrintSize === "custom");
    }

    // Cargar dimensiones personalizadas guardadas
    const savedCustomWidth = localStorage.getItem("customWidth");
    const savedCustomHeight = localStorage.getItem("customHeight");
    if (savedCustomWidth) setCustomWidth(savedCustomWidth);
    if (savedCustomHeight) setCustomHeight(savedCustomHeight);
  }, []);

  // Guardar la preferencia cuando cambia
  const handlePrintSizeChange = (size: PrintSize) => {
    setSelectedPrintSize(size);
    setShowCustomInputs(size === "custom");
    localStorage.setItem("preferredPrintSize", size);
  };

  // Guardar dimensiones personalizadas cuando cambian
  const handleCustomDimensionChange = (
    type: "width" | "height",
    value: string
  ) => {
    // Permitir cualquier valor temporalmente (incluyendo vacío)
    if (type === "width") {
      setCustomWidth(value);
      // Solo guardar en localStorage si es un número válido
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 10) {
        localStorage.setItem("customWidth", value);
      } else if (value === "") {
        localStorage.removeItem("customWidth");
      }
    } else {
      setCustomHeight(value);
      // Solo guardar en localStorage si es un número válido
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 10) {
        localStorage.setItem("customHeight", value);
      } else if (value === "") {
        localStorage.removeItem("customHeight");
      }
    }
  };

  // Configuración basada en el tipo de impresora y tamaño seleccionado
  const printerConfig = {
    "80mm": {
      pageWidth: "80mm",
      contentWidth: "76mm",
      barcodeWidth: 2,
      barcodeHeight: 40,
      fontSize: "14px",
      name: "80mm (Estándar)",
    },
    "40mm": {
      pageWidth: "40mm",
      contentWidth: "36mm",
      barcodeWidth: 1,
      barcodeHeight: 20,
      fontSize: "10px",
      name: "40mm",
    },
    custom: {
      pageWidth: `${
        customWidth && !isNaN(Number(customWidth)) ? customWidth : "80"
      }mm`,
      contentWidth: `${
        (customWidth && !isNaN(Number(customWidth))
          ? Number(customWidth)
          : 80) - 4
      }mm`,
      barcodeWidth: 1.8,
      barcodeHeight:
        customHeight && !isNaN(Number(customHeight))
          ? Number(customHeight)
          : 60,
      fontSize: "13px",
      name: "Personalizado",
    },
    unknown: {
      pageWidth: "80mm",
      contentWidth: "76mm",
      barcodeWidth: 2,
      barcodeHeight: 60,
      fontSize: "14px",
      name: "80mm (Predeterminado)",
    },
  };

  // Determinar qué configuración usar
  const effectivePrintSize =
    printerType === "unknown" ? "unknown" : selectedPrintSize;
  const config = printerConfig[effectivePrintSize];

  const handlePrint = () => {
    if (!barcodeRef.current || isPrinting) return;

    setIsPrinting(true);

    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    printFrame.style.visibility = "hidden";

    document.body.appendChild(printFrame);

    printFrame.onload = () => {
      try {
        const printContent = barcodeRef.current?.cloneNode(true) as HTMLElement;

        const isSmallSize = effectivePrintSize === "40mm";
        const isCustomSize = effectivePrintSize === "custom";

        // Usar valores por defecto si los campos personalizados están vacíos
        const widthToUse =
          customWidth && !isNaN(Number(customWidth)) ? Number(customWidth) : 80;
        const heightToUse =
          customHeight && !isNaN(Number(customHeight))
            ? Number(customHeight)
            : 60;

        const styles = `
        <style>
          @page {
            size: ${config.pageWidth} auto;
            margin: 0;
            padding: 0;
          }
          @media print {
            body {
              width: ${config.pageWidth} !important;
              margin: 0 !important;
              padding: 2mm !important;
              font-family: Arial, sans-serif;
              font-size: ${config.fontSize};
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .ticket {
              width: ${config.contentWidth};
              min-height: ${
                isSmallSize
                  ? "25mm"
                  : isCustomSize
                  ? `${heightToUse}mm`
                  : "30mm"
              };
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
            }
            .ticket svg {
              width: 100% !important;
              max-width: ${
                isSmallSize
                  ? "34mm"
                  : isCustomSize
                  ? `${widthToUse - 6}mm`
                  : "70mm"
              } !important;
              height: auto !important;
              margin: 1mm 0 !important;
            }
            .product-name {
              font-weight: bold;
              margin: 2mm 0 1mm 0;
              width: 100%;
              white-space: normal;
              overflow: hidden;
              text-overflow: ellipsis;
              font-size: ${
                isSmallSize ? "9px" : isCustomSize ? "11px" : "14px"
              };
              line-height: 1.2;
            }
            .product-price {
              font-weight: bold;
              margin: 1mm 0 2mm 0;
              font-size: ${
                isSmallSize ? "10px" : isCustomSize ? "13px" : "16px"
              };
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
          }
        </style>
      `;

        printFrame.contentDocument?.open();
        printFrame.contentDocument?.write(`
        <html>
          <head>
            <title>Ticket de Código de Barras</title>
            ${styles}
          </head>
          <body>
            <div class="ticket">
              ${printContent.innerHTML}
            </div>
            <script>
              setTimeout(function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 100);
            </script>
          </body>
        </html>
      `);
        printFrame.contentDocument?.close();

        const handleAfterPrint = () => {
          document.body.removeChild(printFrame);
          setIsPrinting(false);
          onPrintComplete?.();
        };

        printFrame.contentWindow?.addEventListener(
          "afterprint",
          handleAfterPrint
        );
      } catch (error) {
        console.error("Error al imprimir:", error);
        setIsPrinting(false);
        document.body.removeChild(printFrame);
      }
    };

    printFrame.src = "about:blank";
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Generador de Tickets"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <>
          <Button
            text={isPrinting ? "Imprimiendo..." : "Imprimir Ticket"}
            colorText="text-white"
            colorTextHover="text-white"
            onClick={handlePrint}
            disabled={isPrinting}
          />
          <Button
            text="Cerrar"
            colorText="text-gray_b dark:text-white"
            colorTextHover="hover:dark:text-white"
            colorBg="bg-transparent dark:bg-gray_m"
            colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
            onClick={onClose}
            disabled={isPrinting}
          />
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Selector de tamaño de impresión */}
        <div className="flex flex-col gap-2">
          <label className="block text-gray_m dark:text-white text-sm font-semibold">
            Tamaño de Impresión
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              className={`px-3 py-2 rounded text-sm font-medium ${
                selectedPrintSize === "80mm"
                  ? "bg-blue_m text-white"
                  : "bg-gray_xl text-gray_b hover:bg-gray_m"
              }`}
              onClick={() => handlePrintSizeChange("80mm")}
              disabled={isPrinting}
            >
              80mm
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded text-sm font-medium ${
                selectedPrintSize === "40mm"
                  ? "bg-blue_m text-white"
                  : "bg-gray_xl text-gray_b hover:bg-gray_m"
              }`}
              onClick={() => handlePrintSizeChange("40mm")}
              disabled={isPrinting}
            >
              40mm
            </button>
            <button
              type="button"
              className={`px-3 py-2 rounded text-sm font-medium ${
                selectedPrintSize === "custom"
                  ? "bg-blue_m text-white"
                  : "bg-gray_xl text-gray_b hover:bg-gray_m"
              }`}
              onClick={() => handlePrintSizeChange("custom")}
              disabled={isPrinting}
            >
              Personalizado
            </button>
          </div>
        </div>

        {/* Inputs para dimensiones personalizadas */}
        {showCustomInputs && (
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                Ancho (mm)
              </label>
              <Input
                type="number"
                value={customWidth}
                onChange={(e) =>
                  handleCustomDimensionChange("width", e.target.value)
                }
                className="w-full p-2 border border-gray_xl bg-white text-gray_b rounded outline-none"
                disabled={isPrinting}
                placeholder="80"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                Alto (mm)
              </label>
              <Input
                type="number"
                value={customHeight}
                onChange={(e) =>
                  handleCustomDimensionChange("height", e.target.value)
                }
                className="w-full p-2 border border-gray_xl bg-white text-gray_b rounded outline-none"
                disabled={isPrinting}
                placeholder="60"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <div className="w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold">
              Valor del Código
            </label>
            <Input
              type="text"
              value={barcodeValue}
              onChange={(e) => {
                setBarcodeValue(e.target.value);
                if (onBarcodeChange) {
                  onBarcodeChange(e.target.value);
                }
              }}
              className="w-full p-2 border border-gray_xl bg-white text-gray_b rounded outline-none"
              disabled={isPrinting}
              readOnly
            />
          </div>
        </div>
        <div className="w-full flex justify-center overflow-hidden">
          <div
            ref={barcodeRef}
            className="flex flex-col items-center justify-center p-2 border border-dashed border-gray_l rounded overflow-hidden"
            style={{
              width: config.contentWidth,
              minHeight:
                effectivePrintSize === "40mm"
                  ? "25mm"
                  : effectivePrintSize === "custom"
                  ? `${
                      customHeight && !isNaN(Number(customHeight))
                        ? Number(customHeight)
                        : 60
                    }mm`
                  : "30mm",
            }}
          >
            <div className="w-full flex justify-center overflow-hidden">
              <Barcode
                value={barcodeValue}
                width={config.barcodeWidth}
                height={config.barcodeHeight}
                displayValue={true}
                fontOptions="600"
                textMargin={2}
                margin={0}
                fontSize={
                  effectivePrintSize === "40mm"
                    ? 8
                    : effectivePrintSize === "custom"
                    ? 11
                    : 12
                }
              />
            </div>
            <div className="text-center w-full">
              <p
                className="product-name"
                style={{
                  fontSize:
                    effectivePrintSize === "40mm"
                      ? "9px"
                      : effectivePrintSize === "custom"
                      ? "11px"
                      : "14px",
                }}
              >
                {product.name}
              </p>
              <p
                className="product-price"
                style={{
                  fontSize:
                    effectivePrintSize === "40mm"
                      ? "10px"
                      : effectivePrintSize === "custom"
                      ? "13px"
                      : "16px",
                }}
              >
                {formatCurrency(product.price)}
              </p>
            </div>
          </div>
        </div>
        <div className="text-xs text-gray_m text-center">
          Tamaño seleccionado: {printerConfig[effectivePrintSize].name}
          {effectivePrintSize === "custom" &&
            ` (${
              customWidth && !isNaN(Number(customWidth)) ? customWidth : "80"
            }mm × ${
              customHeight && !isNaN(Number(customHeight)) ? customHeight : "60"
            }mm)`}
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
