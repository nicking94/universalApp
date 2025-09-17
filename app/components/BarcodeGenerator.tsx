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
type PrinterLanguage = "zpl" | "escpos" | "unknown";

const BarcodeGenerator = ({
  product,
  onClose,
  onPrintComplete,
  onBarcodeChange,
}: BarcodeGeneratorProps) => {
  const [barcodeValue, setBarcodeValue] = useState(product.barcode || "");
  const [isPrinting, setIsPrinting] = useState(false);
  const [printerLanguage, setPrinterLanguage] =
    useState<PrinterLanguage>("unknown");
  const [qzAvailable, setQzAvailable] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const printerType = usePrinterType();

  // Estado para el tamaño de impresión seleccionado
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSize>("80mm");
  // Estado para tamaño personalizado
  const [customWidth, setCustomWidth] = useState("80");
  const [customHeight, setCustomHeight] = useState("60");
  const [showCustomInputs, setShowCustomInputs] = useState(false);

  // Cargar QZ Tray y detectar el tipo de impresora
  useEffect(() => {
    const initializeQZ = async () => {
      try {
        if (typeof window.qz === "undefined") {
          console.warn("QZ Tray no está disponible");
          return;
        }

        // Conectar con QZ Tray
        if (!window.qz.websocket.isConnected()) {
          await window.qz.websocket.connect();
        }
        setQzAvailable(true);

        // Intentar detectar el tipo de impresora
        await detectPrinterType();
      } catch (error) {
        console.error("Error inicializando QZ Tray:", error);
      }
    };

    initializeQZ();

    return () => {
      if (
        typeof window.qz !== "undefined" &&
        window.qz.websocket.isConnected()
      ) {
        window.qz.websocket.disconnect();
      }
    };
  }, []);

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

  // Función para detectar el tipo de impresora
  const detectPrinterType = async (): Promise<PrinterLanguage> => {
    try {
      // Verificar que QZ Tray está disponible
      if (typeof window.qz === "undefined") {
        console.warn("QZ Tray no está disponible");
        setPrinterLanguage("unknown");
        return "unknown";
      }

      // Obtener la impresora por defecto
      const printers = await window.qz.printers.find();
      const defaultPrinter = window.qz.printers.default || printers[0];

      if (!defaultPrinter) {
        throw new Error("No se encontraron impresoras");
      }

      // Verificar si es una impresora ZPL (generalmente Zebra)
      if (
        defaultPrinter.toLowerCase().includes("zebra") ||
        defaultPrinter.toLowerCase().includes("zpl") ||
        defaultPrinter.toLowerCase().includes("label")
      ) {
        setPrinterLanguage("zpl");
        return "zpl";
      }

      // Para impresoras térmicas comunes, asumimos ESC/POS
      setPrinterLanguage("escpos");
      return "escpos";
    } catch (error) {
      console.error("Error detectando tipo de impresora:", error);
      setPrinterLanguage("unknown");
      return "unknown";
    }
  };

  // Generar código ZPL para impresoras de etiquetas
  const generateZPLCode = (): string => {
    const width = selectedPrintSize === "40mm" ? 40 : 80;
    const height = selectedPrintSize === "40mm" ? 25 : 60;

    // Configuración básica de ZPL
    let zpl = "^XA"; // Inicio de formato ZPL

    // Configurar densidad de impresión y orientación
    zpl += "^MTT^MMP^MN"; // Thermal transfer media, media present, no backfeed

    // Establecer tamaño de la etiqueta
    zpl += `^PW${width * 8}^LL${height * 8}`;

    // Nombre del producto (parte superior)
    zpl += `^FO10,10^A0N,20,20^FB${width * 8 - 20},1,0,C^FD${product.name}^FS`;

    // Código de barras (centro)
    zpl += `^FO${(width * 8 - 200) / 2},40^B3N,,,N^FD${barcodeValue}^FS`;

    // Valor del código de barras (debajo del código)
    zpl += `^FO${(width * 8 - 150) / 2},90^A0N,20,15^FD${barcodeValue}^FS`;

    // Precio (parte inferior)
    zpl += `^FO10,120^A0N,25,25^FB${width * 8 - 20},1,0,C^FD${formatCurrency(
      product.price
    )}^FS`;

    zpl += "^XZ"; // Fin de formato ZPL

    return zpl;
  };

  // Generar código ESC/POS para impresoras térmicas
  const generateEscPosCode = (): Uint8Array => {
    const commands = [];

    // Inicializar impresora
    commands.push(0x1b, 0x40); // ESC @ - Inicializar

    // Configurar página
    commands.push(0x1b, 0x57, selectedPrintSize === "40mm" ? 40 : 80, 0, 0, 0);

    // Establecer codificación
    commands.push(0x1b, 0x52, 0x0f); // ESC R 15 - Juego de caracteres español

    // Centrar texto
    commands.push(0x1b, 0x61, 0x01); // Centrar

    // Nombre del producto
    commands.push(0x1b, 0x45, 0x01); // Negrita
    commands.push(...encodeText(product.name.substring(0, 20) + "\n"));
    commands.push(0x1b, 0x45, 0x00); // Quitar negrita

    // Código de barras (usando código 128)
    commands.push(0x1d, 0x6b, 0x49, barcodeValue.length); // Seleccionar código 128
    commands.push(...encodeText(barcodeValue));
    commands.push(0x00); // Terminador

    // Valor del código de barras
    commands.push(0x1b, 0x61, 0x01); // Centrar
    commands.push(...encodeText(barcodeValue + "\n"));

    // Precio
    commands.push(0x1b, 0x45, 0x01); // Negrita
    commands.push(...encodeText(formatCurrency(product.price) + "\n"));
    commands.push(0x1b, 0x45, 0x00); // Quitar negrita

    // Avanzar papel y cortar
    commands.push(0x1b, 0x64, 0x05); // Avanzar 5 líneas
    commands.push(0x1d, 0x56, 0x41, 0x00); // Cortar papel (formato parcial)

    return new Uint8Array(commands);
  };

  // Función auxiliar para codificar texto
  const encodeText = (text: string): number[] => {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(text);
    return Array.from(encoded);
  };

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
    if (type === "width") {
      setCustomWidth(value);
      const numValue = parseInt(value);
      if (!isNaN(numValue) && numValue >= 10) {
        localStorage.setItem("customWidth", value);
      } else if (value === "") {
        localStorage.removeItem("customWidth");
      }
    } else {
      setCustomHeight(value);
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
      contentWidth: "80mm",
      barcodeWidth: 2,
      barcodeHeight: 40,
      fontSize: "14px",
      name: "80mm (Estándar)",
    },
    "40mm": {
      pageWidth: "40mm",
      contentWidth: "40mm",
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
      contentWidth: "80mm",
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

  // Función principal de impresión
  const handlePrint = async () => {
    if (isPrinting) return;

    setIsPrinting(true);

    try {
      // Si QZ Tray está disponible, usar impresión directa
      if (qzAvailable && typeof window.qz !== "undefined") {
        await printWithQZ();
      } else {
        // Fallback a impresión HTML estándar
        printWithHTML();
      }
    } catch (error) {
      console.error("Error al imprimir:", error);
      setIsPrinting(false);
    }
  };

  // Imprimir usando QZ Tray
  const printWithQZ = async (): Promise<void> => {
    try {
      // Verificar que QZ Tray está disponible
      if (typeof window.qz === "undefined") {
        throw new Error("QZ Tray no está disponible");
      }

      // Detectar tipo de impresora si aún no se ha hecho
      if (printerLanguage === "unknown") {
        await detectPrinterType();
      }

      let printData;

      // Generar datos según el tipo de impresora
      if (printerLanguage === "zpl") {
        const zplCode = generateZPLCode();
        printData = [
          {
            type: "raw",
            format: "plain",
            data: zplCode,
          },
        ];
      } else {
        // ESC/POS o desconocido (usamos ESC/POS por defecto)
        const escPosData = generateEscPosCode();
        const hexData = Array.from(escPosData)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        printData = [
          {
            type: "raw",
            format: "hex",
            data: hexData,
          },
        ];
      }

      // Obtener la impresora por defecto
      const printers = await window.qz.printers.find();
      const defaultPrinter = window.qz.printers.default || printers[0];
      const config = window.qz.configs.create(defaultPrinter);

      // Imprimir
      await window.qz.print(config, printData);

      console.log("Ticket impreso exitosamente con QZ Tray");
      setIsPrinting(false);
      onPrintComplete?.();
    } catch (error) {
      console.error("Error al imprimir con QZ Tray:", error);
      // Fallback a impresión HTML
      printWithHTML();
    }
  };

  // Imprimir usando HTML (fallback)
  const printWithHTML = () => {
    if (!barcodeRef.current) {
      setIsPrinting(false);
      return;
    }

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
              margin: 0 auto !important;
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
        {/* Información del método de impresión */}
        {qzAvailable && (
          <div className="text-sm p-2 bg-blue_xl rounded">
            <strong>Método de impresión:</strong> QZ Tray (
            {printerLanguage.toUpperCase()})
          </div>
        )}

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
