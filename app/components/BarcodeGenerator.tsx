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

        const styles = `
          <style>
            @page {
              size: 40mm 25mm;
              margin: 0;
              padding: 0;
            }
            @media print {
              body {
                width: 40mm !important;
                height: 25mm !important;
                margin: 0 !important;
                padding: 1mm !important;
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .ticket {
                width: 38mm;
                height: 23mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                overflow: hidden;
              }
              .ticket svg {
                width: 100% !important;
                max-width: 35mm !important;
                height: auto !important;
                max-height: 12mm !important;
                margin: 0 !important;
              }
              .product-info {
                width: 100%;
                text-align: center;
                margin: 0;
                padding: 0;
              }
              .product-name {
                font-weight: bold;
                font-size: 7px;
                text-align: center;
                margin: 0;
                padding: 0;
                line-height: 1;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .product-price {
                font-size: 9px;
                font-weight: bold;
                text-align: center;
                margin: 0;
                padding: 0;
                line-height: 1;
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
      title="Generador de Tickets (40mm x 25mm)"
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
            />
          </div>
        </div>
        <div className="flex justify-center">
          <div
            ref={barcodeRef}
            className="bg-white flex flex-col items-center justify-between p-1 border border-dashed border-gray-400"
          >
            <Barcode
              value={barcodeValue}
              width={1}
              height={30}
              displayValue={true}
              fontOptions="600"
              textMargin={1}
              margin={0}
              fontSize={12}
            />
            <div className="product-info">
              <p className="product-name text-sm mt-2 font-semibold">
                {product.name}
              </p>
              <p className="product-price text-md text-center font-semibold">
                {formatCurrency(product.price)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
