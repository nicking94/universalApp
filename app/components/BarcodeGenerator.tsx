"use client";
import React, { useRef, useState } from "react";
import Barcode from "react-barcode";
import { formatCurrency } from "../lib/utils/currency";
import { Product } from "../lib/types/types";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

type BarcodeGeneratorProps = {
  product: Product;
  onClose: () => void;
  onPrintComplete?: () => void;
  onBarcodeChange?: (value: string) => void;
};

const BarcodeGenerator = ({
  product,
  onClose,
  onPrintComplete,
  onBarcodeChange,
}: BarcodeGeneratorProps) => {
  const [barcodeValue, setBarcodeValue] = useState(product.barcode || "");
  const [isPrinting, setIsPrinting] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(1);
  const [displayCopies, setDisplayCopies] = useState("1");

  const handleCopiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDisplayCopies(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      setCopies(numValue);
    } else if (value === "") {
      setCopies(1);
    }
  };

  const handlePrint = () => {
    const copiesToUse = copies < 1 ? 1 : copies;

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

        // Configuración para hoja A4
        const ticketsPerRow = 4; // 4 tickets por fila
        const ticketsPerColumn = 10; // 10 filas por página A4
        const ticketsPerPage = ticketsPerRow * ticketsPerColumn; // 40 tickets por página

        // Calcular cuántas páginas necesitamos
        const totalPages = Math.ceil(copiesToUse / ticketsPerPage);

        let ticketsHTML = "";

        for (let page = 0; page < totalPages; page++) {
          ticketsHTML += `<div class="page">`;

          for (let row = 0; row < ticketsPerColumn; row++) {
            ticketsHTML += `<div class="ticket-row">`;

            for (let col = 0; col < ticketsPerRow; col++) {
              const index = page * ticketsPerPage + row * ticketsPerRow + col;
              if (index < copiesToUse) {
                ticketsHTML += `
                  <div class="ticket">
                    ${printContent.innerHTML}
                  </div>
                `;
              }
            }

            ticketsHTML += `</div>`;
          }

          ticketsHTML += `</div>`;
          if (page < totalPages - 1) {
            ticketsHTML += '<div class="page-break"></div>';
          }
        }

        const styles = `
          <style>
            @page {
              size: A4;
              margin: 5mm;
            }
            @media print {
              body {
                width: 210mm;
                margin: 0;
                padding: 0;
                font-family: Arial, sans-serif;
              }
              .page {
                width: 100%;
                height: 297mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
              }
              .ticket-row {
                display: flex;
                justify-content: space-between;
                width: 100%;
                margin-bottom: 2mm;
                flex: 1;
              }
              .ticket {
                width: 48mm;
                height: 20mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border: 0.5px dotted #ccc;
                box-sizing: border-box;
                overflow: hidden;
                page-break-inside: avoid;
              }
              .ticket svg {
                width: 100% !important;
                max-width: 100% !important;
                height: 10mm !important;
                margin: 0 !important;
              }
              .product-name {
                font-weight: bold;
                font-size: 7px;
                text-align: center;
                margin: 0.5mm 0 0.2mm 0;
                width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                line-height: 1;
              }
              .product-price {
                font-size: 8px;
                font-weight: bold;
                text-align: center;
                margin: 0.2mm 0 0.5mm 0;
                line-height: 1;
              }
              .page-break {
                page-break-after: always;
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
              ${ticketsHTML}
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
          <div className="flex items-center gap-2">
            <span className="text-sm">Copias:</span>
            <Input
              type="number"
              value={displayCopies}
              onChange={handleCopiesChange}
              className="w-16 p-1 border border-gray_xl bg-white text-gray_b rounded outline-none"
              disabled={isPrinting}
            />
          </div>
          <Button
            text={isPrinting ? "Imprimiendo..." : "Imprimir Tickets"}
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
              readOnly
            />
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Previsualización (se muestran máximo 8 copias):</p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center p-2">
          {Array.from({ length: Math.min(copies, 8) }, (_, index) => (
            <div
              key={index}
              ref={index === 0 ? barcodeRef : null}
              className="flex flex-col items-center p-2 bg-white border border-gray_xl rounded shadow-sm"
            >
              <Barcode
                value={barcodeValue}
                width={1}
                height={50}
                displayValue={true}
                fontOptions="600"
                textMargin={1}
                margin={0}
                fontSize={10}
              />
              <div className="text-center mt-0">
                <p className="product-name" style={{ fontSize: "12px" }}>
                  {product.name}
                </p>
                <p className="product-price" style={{ fontSize: "13px" }}>
                  {formatCurrency(product.price)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-500 mt-2">
          <p>
            {copies === 1
              ? "Se imprimirá " + copies + "  copia"
              : " Se imprimirán " + copies + " copias"}
            .
          </p>
          <p>
            Se utilizará papel tamaño A4 con 4 tickets por fila y 10 filas por
            página (40 tickets por página).
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
