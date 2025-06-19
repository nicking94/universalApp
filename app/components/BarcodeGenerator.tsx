"use client";
import React, { useRef, useState } from "react";
import Barcode from "react-barcode";
import html2canvas from "html2canvas";
import { formatCurrency } from "../lib/utils/currency";
import { Product } from "../lib/types/types";
import Modal from "./Modal";
import Button from "./Button";

type BarcodeFormat =
  | "CODE128"
  | "CODE39"
  | "CODE128A"
  | "CODE128B"
  | "CODE128C"
  | "EAN13"
  | "EAN8"
  | "EAN5"
  | "EAN2"
  | "UPC"
  | "UPCE"
  | "ITF14"
  | "ITF"
  | "MSI"
  | "MSI10"
  | "MSI11"
  | "MSI1010"
  | "MSI1110"
  | "pharmacode"
  | "codabar"
  | "GenericBarcode";

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
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("CODE128");
  const [quantity, setQuantity] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const barcodeRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    if (!barcodeRef.current || isPrinting) return;

    setIsPrinting(true);

    try {
      for (let i = 0; i < quantity; i++) {
        const canvas = await html2canvas(barcodeRef.current);
        const dataUrl = canvas.toDataURL("image/png");
        const printWindow = window.open("", "_blank");

        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Imprimir Código de Barras</title>
                <style>
                  body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                  img { max-width: 100%; max-height: 100%; }
                </style>
              </head>
              <body>
                <img src="${dataUrl}" />
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 100);
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }

      onPrintComplete?.();
    } catch (error) {
      console.error("Error al imprimir:", error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Código de Barras"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <>
          <Button
            text={isPrinting ? "Imprimiendo..." : "Imprimir"}
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
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
              Valor del Código
            </label>
            <input
              type="text"
              value={barcodeValue}
              onChange={(e) => {
                setBarcodeValue(e.target.value);
                if (onBarcodeChange) {
                  onBarcodeChange(e.target.value); // Llama a la función de callback
                }
              }}
              className="w-full p-2 border border-gray_xl bg-white text-black rounded outline-none"
              disabled={isPrinting}
            />
          </div>
          <div className="w-full">
            <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
              Formato
            </label>
            <select
              value={barcodeFormat}
              onChange={(e) =>
                setBarcodeFormat(e.target.value as BarcodeFormat)
              }
              className="w-full p-2 border border-gray_xl bg-white rounded text-black outline-none"
              disabled={isPrinting}
            >
              <option value="CODE128">CODE128</option>
              <option value="EAN13">EAN-13</option>
              <option value="UPC">UPC</option>
              <option value="UPCE">UPCE</option>
              <option value="ITF14">ITF-14</option>
              <option value="pharmacode">Pharmacode</option>
              <option value="codabar">Codabar</option>
            </select>
          </div>
        </div>
        <div className="w-full">
          <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
            Cantidad de etiquetas
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            className="w-full p-2 border border-gray_xl bg-white text-black rounded outline-none"
            disabled={isPrinting}
          />
        </div>
        <div
          ref={barcodeRef}
          className="flex flex-col items-center p-4 bg-white"
        >
          <Barcode
            value={barcodeValue}
            format={barcodeFormat}
            width={2}
            height={100}
            displayValue={true}
            fontOptions="600"
            textMargin={8}
            margin={10}
          />
          <div className="mt-2 text-center text-gray_b ">
            <p className="font-semibold uppercase ">{product.name}</p>
            <p>{formatCurrency(product.price)}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeGenerator;
