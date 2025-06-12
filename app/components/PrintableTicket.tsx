"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Rubro, Sale } from "@/app/lib/types/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { formatCurrency } from "@/app/lib/utils/currency";

type PrintableTicketProps = {
  sale: Sale;
  rubro: Rubro;
  onPrint?: () => void;
  autoPrint?: boolean;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  ({ sale, rubro, onPrint, autoPrint = false }, ref) => {
    const ticketRef = useRef<PrintableTicketHandle>(null);
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discountPercent?: number
    ) => {
      if (!discountPercent) return price * quantity;
      return price * quantity * (1 - discountPercent / 100);
    };

    const generateEscPosCommands = () => {
      // Inicializar impresora
      let commands = "\x1B@"; // Inicializar
      commands += "\x1B!\x38"; // Establecer tamaño de fuente (double height)

      // Encabezado
      commands += "Universal App\n\n";
      commands += "\x1B!\x00"; // Resetear tamaño de fuente
      commands += "Dirección: Calle Falsa 123\n";
      commands += "Tel: 123-456789\n";
      commands += "CUIT: 12-34567890-1\n\n";

      // Información del ticket
      commands += "\x1B!\x08"; // Fuente enfatizada
      commands += `TICKET #${sale.id}\n`;
      commands += "\x1B!\x00"; // Resetear tamaño de fuente
      commands += `${fecha}\n\n`;

      // Productos
      sale.products.forEach((product) => {
        const discountedPrice = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        const productName = getDisplayProductName(product, rubro);
        // Asegurarse de que el nombre no sea demasiado largo
        const truncatedName =
          productName.length > 20
            ? productName.substring(0, 20) + "..."
            : productName;

        commands += `${truncatedName}\n`;
        commands += `${product.quantity} ${
          product.unit?.toLowerCase() || "un"
        } x ${formatCurrency(product.price)}`;

        if (product.discount) {
          commands += ` (-${product.discount}%)`;
        }

        commands += `\n${formatCurrency(discountedPrice)}\n\n`;
      });

      // Descuento total si aplica
      if (sale.discount && sale.discount > 0) {
        commands += "Descuento total:\n";
        commands += `-${formatCurrency(sale.discount)}\n\n`;
      }

      // Métodos de pago
      if (sale.paymentMethods?.length > 0 && !sale.credit) {
        sale.paymentMethods.forEach((method) => {
          commands += `${method.method}:\n`;
          commands += `${formatCurrency(method.amount)}\n\n`;
        });
      }

      // Venta fiada
      if (sale.credit) {
        commands += "\x1B!\x08"; // Fuente enfatizada
        commands += "** VENTA FIADA **\n";
        commands += "\x1B!\x00"; // Resetear tamaño de fuente
        if (sale.customerName) {
          commands += `Cliente: ${sale.customerName}\n\n`;
        }
      }

      // Total
      commands += "\x1B!\x18"; // Fuente grande
      commands += "TOTAL:\n";
      commands += `${formatCurrency(sale.total)}\n\n`;
      commands += "\x1B!\x00"; // Resetear tamaño de fuente

      // Pie de página
      commands += "¡Gracias por su compra!\n";
      commands += "Conserve este ticket\n";
      commands += "---\n";
      commands += "Ticket no válido como factura\n\n\n";

      // Cortar papel (si la impresora lo soporta)
      commands += "\x1DVA\x03"; // Cortar papel parcialmente

      return commands;
    };

    useImperativeHandle(ref, () => ({
      print: async () => {
        if (onPrint) {
          onPrint();
          return;
        }

        const escPosCommands = generateEscPosCommands();

        try {
          if ("serial" in navigator) {
            try {
              const port = await (navigator as Navigator).serial!.requestPort();
              await port.open({ baudRate: 9600 });

              const writer = port.writable!.getWriter();
              try {
                await writer.write(new TextEncoder().encode(escPosCommands));
                await writer.close();
              } catch (writeError) {
                console.error(
                  "Error al escribir en el puerto serial:",
                  writeError
                );
                throw writeError;
              } finally {
                writer.releaseLock();
              }

              await port.close();
              return;
            } catch (serialError) {
              console.error("Error con puerto serial:", serialError);
            }
          }

          downloadAsFile(escPosCommands, sale.id);
        } catch (error) {
          console.error("Error general al imprimir:", error);
          downloadAsFile(escPosCommands, sale.id);
          throw error;
        }
      },
    }));

    useEffect(() => {
      if (autoPrint && ticketRef.current) {
        ticketRef.current.print().catch((error) => {
          console.error("Error en impresión automática:", error);
        });
      }
    }, [autoPrint]);
    function downloadAsFile(commands: string, saleId: number) {
      const blob = new Blob([commands], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ticket_${saleId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    return (
      <div
        className="max-h-[66vh] overflow-y-auto p-2 w-[80mm] mx-auto font-mono text-xs"
        style={{
          fontFamily: "'Courier New', monospace",
          lineHeight: 1.2,
        }}
      >
        <div className="mb-2">
          <h2 className="font-bold text-sm text-center mb-1">Universal App</h2>
          <p>Dirección: Calle Falsa 123</p>
          <p>Tel: 123-456789</p>
          <p>CUIT: 12-34567890-1</p>
        </div>
        <div className="mb-2 border-b border-black pb-2">
          <p className="font-bold">TICKET #{sale.id}</p>
          <p>{fecha}</p>
        </div>
        <div className="mb-2">
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
                <div className="flex justify-between items-center w-full max-w-46 gap-2">
                  <span className="font-bold max-w-30">
                    {getDisplayProductName(product, rubro)}
                  </span>
                  <span className="mr-2">
                    {product.quantity} {product.unit?.toLowerCase() || "un"} x{" "}
                    {formatCurrency(product.price)}
                  </span>
                </div>

                <div className="flex flex-col items-end">
                  <span>{formatCurrency(discountedPrice)}</span>
                  {product.discount && (
                    <span className="text-xs text-gray-500">
                      (-{product.discount}%)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {sale.paymentMethods?.length > 0 && !sale.credit && (
          <div className="mb-2 mt-8 pt-2">
            {sale.paymentMethods.map((method, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{method.method}:</span>
                <span>{formatCurrency(method.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {sale.credit && (
          <div className="text-center font-bold text-red-500 mb-2 border-t border-black pt-2">
            ** VENTA FIADA **
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
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
