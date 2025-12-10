"use client";
import React, { useRef, useState } from "react";
import Barcode from "react-barcode";
import { formatCurrency } from "../lib/utils/currency";
import { Product } from "../lib/types/types";
import Modal from "./Modal";
import Input from "./Input";
import Button from "./Button";
import Checkbox from "./Checkbox";
import { Box, Typography } from "@mui/material";
import { Print as PrintIcon, Close as CloseIcon } from "@mui/icons-material";

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
  const [showPrice, setShowPrice] = useState(true);
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
                width: 80mm;
                min-height: 25mm;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                
              }
              .ticket svg {
                width: 100% !important;
                max-width: 70mm !important;
                height: auto !important;
                margin: 1mm 0 !important;
              }
              .product-name {
                font-weight: bold;
                font-size: 24px;
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
              <title>Etiqueta de Código de Barras</title>
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
      title="Generador de Etiquetas"
      buttons={
        <>
          <Button
            variant="outlined"
            icon={<CloseIcon />}
            iconPosition="left"
            onClick={onClose}
            disabled={isPrinting}
            text="Cerrar"
            sx={{
              color: "#6b7280",
              borderColor: "#d1d5db",
              "&:hover": {
                backgroundColor: "#f3f4f6",
                borderColor: "#9ca3af",
              },
            }}
          />
          <Button
            variant="contained"
            icon={<PrintIcon />}
            iconPosition="left"
            onClick={handlePrint}
            disabled={isPrinting}
            isPrimaryAction={true}
            text={isPrinting ? "Imprimiendo..." : "Imprimir Etiqueta"}
            loading={isPrinting}
            sx={{
              backgroundColor: "background.primary",
              "&:hover": {
                backgroundColor: "#background.primary",
              },
            }}
          />
        </>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ width: "100%" }}>
            <Typography
              variant="subtitle2"
              component="label"
              sx={{
                display: "block",
                mb: 1,
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              Valor del Código
            </Typography>
            <Input
              type="text"
              value={barcodeValue}
              onRawChange={(e) => {
                setBarcodeValue(e.target.value);
                if (onBarcodeChange) {
                  onBarcodeChange(e.target.value);
                }
              }}
              disabled={isPrinting}
            />
          </Box>
        </Box>

        {/* Checkbox para mostrar/ocultar precio */}
        <Checkbox
          label="Mostrar precio en la etiqueta"
          checked={showPrice}
          onChange={setShowPrice}
          disabled={isPrinting}
          sx={{
            color: "primary.main",
            "&.Mui-checked": {
              color: "primary.main",
            },
          }}
        />

        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Box
            ref={barcodeRef}
            sx={{
              bgcolor: "white",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 2,
              minHeight: "18vh",
            }}
          >
            <Barcode
              value={barcodeValue}
              width={1.5}
              height={40}
              displayValue={true}
              fontOptions="600"
              textMargin={2}
              margin={0}
              fontSize={12}
            />

            <Box sx={{ textAlign: "center", color: "black", mt: 2 }}>
              <Typography
                className="product-name"
                variant="h6"
                sx={{
                  fontWeight: "bold",
                  fontSize: "1.5rem",
                }}
              >
                {product.name}
              </Typography>

              {showPrice && (
                <Typography
                  className="product-price"
                  variant="body1"
                  sx={{
                    fontWeight: "bold",
                    fontSize: "1rem",
                    mt: 1,
                  }}
                >
                  {formatCurrency(product.price)}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default BarcodeGenerator;
