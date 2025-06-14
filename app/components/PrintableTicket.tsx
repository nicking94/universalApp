"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
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

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  ({ sale, rubro, businessData, onPrint, autoPrint = false }, ref) => {
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
      let commands = "\x1B@";
      commands += "\x1B!\x38";
      commands += `${businessData?.name || "Universal App"}\n\n`;
      commands += "\x1B!\x00";
      commands += `Dirección: ${businessData?.address || "Calle Falsa 123"}\n`;
      commands += `Tel: ${businessData?.phone || "123-456789"}\n`;
      commands += `CUIT: ${businessData?.cuit || "12-34567890-1"}\n\n`;
      commands += "\x1B!\x08";
      commands += `TICKET #${sale.id}\n`;
      commands += "\x1B!\x00";
      commands += `${fecha}\n\n`;

      sale.products.forEach((product) => {
        const discountedPrice = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        const productName = getDisplayProductName(product, rubro);
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
        if (sale.manualAmount && sale.manualAmount > 0) {
          commands += "Monto Manual:\n";
          commands += `${formatCurrency(sale.manualAmount)}\n\n`;
        }
      });

      if (sale.discount && sale.discount > 0) {
        commands += "Descuento total:\n";
        commands += `-${formatCurrency(sale.discount)}\n\n`;
      }

      if (sale.paymentMethods?.length > 0 && !sale.credit) {
        sale.paymentMethods.forEach((method) => {
          commands += `${method.method}:\n`;
          commands += `${formatCurrency(method.amount)}\n\n`;
        });
      }

      if (sale.credit) {
        commands += "\x1B!\x08";
        commands += "** VENTA FIADA **\n";
        commands += "\x1B!\x00";
        if (sale.customerName) {
          commands += `Cliente: ${sale.customerName}\n\n`;
        }
      }
      commands += "\x1B!\x18";
      commands += "TOTAL:\n";
      commands += `${formatCurrency(sale.total)}\n\n`;
      commands += "\x1B!\x00";
      commands += "¡Gracias por su compra!\n";
      commands += "Conserve este ticket\n";
      commands += "---\n";
      commands += "Ticket no válido como factura\n\n\n";
      commands += "\x1DVA\x03";

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
                    <span className="text-[.6rem]">($ {product.price})</span>
                  </div>
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
          {sale.manualAmount === undefined ||
            (sale.manualAmount > 0 && (
              <div className="mt-4">
                <span className="w-full">
                  ---------------------------------------
                </span>
                <div className="flex justify-between">
                  <span className="uppercase font-semibold">Monto Manual:</span>
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
