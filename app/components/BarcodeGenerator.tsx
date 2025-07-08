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
    const copiesToUse = displayCopies === "" ? 1 : copies;

    if (!barcodeRef.current || isPrinting || copiesToUse < 1) return;

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

        let ticketsHTML = "";
        for (let i = 0; i < copies; i++) {
          ticketsHTML += `
            <div class="ticket">
              ${printContent.innerHTML}
            </div>
            ${i < copies - 1 ? '<div class="page-break"></div>' : ""}
          `;
        }

        const styles = `
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                width: 80mm !important;
                margin: 0 !important;
                padding: 2mm !important;
                font-family: Arial, sans-serif;
              }
              .ticket {
                width: 76mm;
                min-height: 30mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                page-break-after: always;
              }
              .ticket svg {
                width: 100% !important;
                max-width: 70mm !important;
                height: auto !important;
                margin: 1mm 0 !important;
              }
              .product-name {
                font-weight: bold;
                font-size: 14px;
                text-align: center;
                margin: 2mm 0 1mm 0;
                width: 100%;
                white-space: normal;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .product-price {
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                margin: 1mm 0 2mm 0;
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
          <div className="flex items-center gap-2 max-w-[7vw]">
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
            colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
            onClick={onClose}
            disabled={isPrinting}
          />
        </>
      }
    >
      <div className="flex flex-col gap-4 ">
        <div className="flex items-center gap-4">
          <div className="w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
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
            />
          </div>
        </div>
        <div className="flex justify-center">
          <div
            ref={barcodeRef}
            className="w-full flex flex-col items-center p-2  "
            style={{ width: "76mm", minHeight: "30mm" }}
          >
            <Barcode
              value={barcodeValue}
              width={2}
              height={80}
              displayValue={true}
              fontOptions="600"
              textMargin={2}
              margin={0}
              fontSize={20}
            />
            <div className="text-center mt-4">
              <p className="product-name">{product.name}</p>
              <p className="product-price">{formatCurrency(product.price)}</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500 mt-2">
          <p>
            Previsualización del ticket de 80mm. Al imprimir se generarán{" "}
            {copies} copias.
          </p>
          <p>Cada ticket tendrá un ancho de 80mm con márgenes de 2mm.</p>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
