"use client";
import {
  forwardRef,
  useRef,
  useEffect,
  useImperativeHandle,
  useState,
} from "react";
import { BusinessData, Rubro, Sale } from "@/app/lib/types/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { formatCurrency } from "@/app/lib/utils/currency";

type PrintableTicketProps = {
  sale: Sale;
  rubro: Rubro;
  onPrint?: () => void;
  autoPrint?: boolean;
  businessData?: BusinessData;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

// Configuración de la impresora
const PRINTER_CONFIG = {
  name: "NexusPOS", // Nombre de tu impresora
  type: "escpos", // Tipo de impresora
  options: {
    encoding: "ISO-8859-1", // Codificación para caracteres en español
  },
};

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  ({ sale, rubro, businessData, onPrint, autoPrint = false }, ref) => {
    const [qzLoaded, setQzLoaded] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const ticketRef = useRef<HTMLDivElement>(null);

    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    // Cargar QZ Tray
    useEffect(() => {
      const loadQZ = async () => {
        try {
          if (typeof window.qz !== "undefined") {
            await window.qz.websocket.connect();
            setQzLoaded(true);
            console.log("QZ Tray conectado");
          } else {
            console.warn("QZ Tray no está instalado o no está disponible");
          }
        } catch (error) {
          console.error("Error conectando con QZ Tray:", error);
        }
      };

      loadQZ();

      return () => {
        if (
          typeof window.qz !== "undefined" &&
          window.qz.websocket.isConnected()
        ) {
          window.qz.websocket.disconnect();
        }
      };
    }, []);

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discountPercent?: number
    ): number => {
      if (!discountPercent) return price * quantity;
      return price * quantity * (1 - discountPercent / 100);
    };

    // Función para formatear el ticket en ESC/POS
    const formatEscPosTicket = (): string => {
      let ticketContent = "";

      // Comandos ESC/POS iniciales
      ticketContent += "\x1B\x40"; // Inicializar impresora
      ticketContent += "\x1B\x61\x01"; // Centrar texto

      // Encabezado del negocio
      ticketContent += `\n${businessData?.name || "Universal App"}\n`;
      ticketContent += "\x1B\x61\x00"; // Alinear izquierda
      ticketContent += `Dirección: ${
        businessData?.address || "Calle Falsa 123"
      }\n`;
      ticketContent += `Tel: ${businessData?.phone || "123-456789"}\n`;
      ticketContent += `CUIT: ${businessData?.cuit || "12-34567890-1"}\n\n`;

      // Línea separadora
      ticketContent += "--------------------------------\n";

      // Información del ticket
      ticketContent += "\x1B\x45\x01"; // Texto en negrita
      ticketContent += `TICKET #${sale.id}\n`;
      ticketContent += "\x1B\x45\x00"; // Quitar negrita
      ticketContent += `${fecha}\n`;
      ticketContent += "--------------------------------\n\n";

      // Productos
      sale.products.forEach((product) => {
        const discountedPrice = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        const productName = getDisplayProductName(product, rubro);
        const quantityText = `${product.quantity} ${
          product.unit?.toLowerCase() || "un"
        }`;
        const priceText = formatCurrency(discountedPrice);

        // Asegurar que el nombre del producto no sea demasiado largo
        const maxNameLength = 20;
        const truncatedName =
          productName.length > maxNameLength
            ? productName.substring(0, maxNameLength - 3) + "..."
            : productName;

        ticketContent += truncatedName.padEnd(maxNameLength);
        ticketContent += quantityText.padStart(10);
        ticketContent += priceText.padStart(12) + "\n";

        if (product.discount) {
          ticketContent += `  Descuento: -${product.discount}%\n`;
        }
      });

      // Monto manual si existe
      if (sale.manualAmount !== undefined && sale.manualAmount > 0) {
        ticketContent += "--------------------------------\n";
        ticketContent += "Monto Manual:".padEnd(30);
        ticketContent += formatCurrency(sale.manualAmount).padStart(10) + "\n";
        ticketContent += "--------------------------------\n";
      }

      ticketContent += "\n";

      // Métodos de pago
      if (sale.paymentMethods?.length > 0 && !sale.credit) {
        sale.paymentMethods.forEach((method) => {
          ticketContent += `${method.method}:`.padEnd(20);
          ticketContent += formatCurrency(method.amount).padStart(20) + "\n";
        });
        ticketContent += "\n";
      }

      // Cuenta corriente
      if (sale.credit) {
        ticketContent += "\x1B\x45\x01"; // Texto en negrita
        ticketContent += "** CUENTA CORRIENTE **\n";
        ticketContent += "\x1B\x45\x00"; // Quitar negrita
        if (sale.customerName) {
          ticketContent += `Cliente: ${sale.customerName}\n`;
        }
        ticketContent += "\n";
      }

      // Total
      ticketContent += "--------------------------------\n";
      ticketContent += "\x1B\x45\x01"; // Texto en negrita
      ticketContent += "TOTAL:".padEnd(20);
      ticketContent += formatCurrency(sale.total).padStart(20) + "\n";
      ticketContent += "\x1B\x45\x00"; // Quitar negrita
      ticketContent += "--------------------------------\n\n";

      // Pie de página
      ticketContent += "\x1B\x61\x01"; // Centrar texto
      ticketContent += "¡Gracias por su compra!\n";
      ticketContent += "Conserve este ticket\n";
      ticketContent += "---\n";
      ticketContent += "Ticket no válido como factura\n\n";

      // Cortar papel (si la impresora lo soporta)
      ticketContent += "\x1D\x56\x00"; // Cortar papel

      return ticketContent;
    };

    const printWithQZ = async (): Promise<void> => {
      if (onPrint) {
        onPrint();
      }

      if (!qzLoaded || typeof window.qz === "undefined") {
        alert(
          "QZ Tray no está disponible. Por favor, instálalo o usa la impresión normal."
        );
        window.print();
        return;
      }

      setIsPrinting(true);
      try {
        const ticketContent = formatEscPosTicket();

        const config = window.qz.configs.create(
          PRINTER_CONFIG.name,
          PRINTER_CONFIG.options
        );

        await window.qz.print(config, [
          {
            type: "raw",
            format: "plain",
            data: ticketContent,
          },
        ]);

        console.log("Ticket impreso exitosamente con QZ Tray");
      } catch (error) {
        console.error("Error al imprimir con QZ Tray:", error);
        window.print();
      } finally {
        setIsPrinting(false);
      }
    };

    const printTicket = async () => {
      await printWithQZ();
    };

    useImperativeHandle(ref, () => ({
      print: printTicket,
    }));

    useEffect(() => {
      if (autoPrint && qzLoaded) {
        setTimeout(() => {
          printTicket().catch(console.error);
        }, 100);
      }
    }, [autoPrint, qzLoaded]);

    return (
      <div className="print-container">
        <div
          ref={ticketRef}
          className="ticket-content max-h-[66vh] overflow-y-auto p-2 pb-4 w-[80mm] mx-auto font-mono text-xs bg-white text-gray_b"
          style={{
            fontFamily: "'Courier New', monospace",
            lineHeight: 1.2,
          }}
        >
          <div className="mb-2">
            <h2 className="font-bold text-sm text-center mb-1">
              {businessData?.name || "Universal App"}
            </h2>
            <p>
              <span className="font-semibold">Dirección: </span>
              {businessData?.address || "Calle Falsa 123"}
            </p>
            <p>
              <span className="font-semibold">Tel: </span>
              {businessData?.phone || "123-456789"}
            </p>
            <p>
              <span className="font-semibold">CUIT: </span>
              {businessData?.cuit || "12-34567890-1"}
            </p>
          </div>
          <div className="py-1 border-b border-black ">
            <p className="font-bold">TICKET #{sale.id}</p>
            <p>{fecha}</p>
          </div>
          <div className="mb-2 mt-4">
            {sale.products.map((product, idx) => {
              const discountedPrice = calculateDiscountedPrice(
                product.price,
                product.quantity,
                product.discount
              );

              return (
                <div
                  key={idx}
                  className="flex justify-between items-center mb-1 border-b border-gray_xl"
                >
                  <div className="flex items-center w-full gap-4">
                    <span className="font-bold w-24 text-xs text-[.8rem]">
                      {getDisplayProductName(product, rubro)}
                    </span>
                    <div className="flex flex-col text-center px-2 text-xs min-w-20">
                      {product.quantity} {product.unit?.toLowerCase() || "un"}
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span>{formatCurrency(discountedPrice)}</span>
                    {product.discount && (
                      <span className="text-xs text-gray_m">
                        (-{product.discount}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {sale.manualAmount === undefined ||
              (sale.manualAmount > 0 && (
                <div className="mt-4">
                  <span className="w-full">
                    ---------------------------------------
                  </span>
                  <div className="flex justify-between">
                    <span className="uppercase font-semibold">
                      Monto Manual:
                    </span>
                    <span>{formatCurrency(sale.manualAmount)}</span>
                  </div>
                  <span className="w-full">
                    ---------------------------------------
                  </span>
                </div>
              ))}
          </div>

          {sale.paymentMethods?.length > 0 && !sale.credit && (
            <div className="mb-2 mt-10 space-y-1">
              {sale.paymentMethods.map((method, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{method.method}:</span>
                  <span>{formatCurrency(method.amount)}</span>
                </div>
              ))}
            </div>
          )}
          {sale.credit && (
            <div className="text-center font-bold text-red_b mb-2 border-t border-black pt-2">
              ** CUENTA CORRIENTE **
              {sale.customerName && <p>Cliente: {sale.customerName}</p>}
            </div>
          )}
          <div className="flex justify-between font-bold text-sm border-t border-black pt-4">
            <span>TOTAL:</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="text-center mt-4 text-xs border-t border-black pt-2">
            <p>¡Gracias por su compra!</p>
            <p>Conserve este ticket</p>
            <p>---</p>
            <p>Ticket no válido como factura</p>
          </div>
        </div>
        {isPrinting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded-lg">
              <p>Imprimiendo ticket...</p>
            </div>
          </div>
        )}

        {/* Estilos para impresión */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container,
            .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .ticket-content {
              margin: 0;
              padding: 0;
              width: 80mm;
              max-height: none;
              overflow: visible;
            }
          }
        `}</style>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
