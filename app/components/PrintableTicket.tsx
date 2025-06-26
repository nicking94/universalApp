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
    const ticketRef = useRef<HTMLDivElement>(null);
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discountPercent?: number
    ): number => {
      if (!discountPercent) return price * quantity;
      return price * quantity * (1 - discountPercent / 100);
    };

    const generateEscPosCommands = (): Uint8Array => {
      const commands: number[] = [];
      commands.push(0x1b, 0x40);

      // Configuración básica
      commands.push(0x1b, 0x52, 0x08);
      commands.push(0x1b, 0x74, 0x10);

      // Encabezado
      commands.push(0x1b, 0x21, 0x08);
      pushText(commands, `${businessData?.name || "Mi Negocio"}\n`);
      commands.push(0x1b, 0x21, 0x00);

      pushText(commands, `${businessData?.address || "Dirección"}\n`);
      pushText(commands, `Tel: ${businessData?.phone || "N/A"}\n`);
      pushText(commands, `CUIT: ${businessData?.cuit || "N/A"}\n\n`);

      // Línea separadora
      commands.push(0x1b, 0x61, 0x01);
      pushText(commands, "------------------------------\n");
      commands.push(0x1b, 0x61, 0x00);

      // Detalles del ticket
      pushText(commands, `TICKET #${sale.id}\n`);
      pushText(commands, `${fecha}\n\n`);

      // Productos
      sale.products.forEach((product) => {
        const productName = getDisplayProductName(product, rubro);
        const truncatedName =
          productName.length > 24
            ? productName.substring(0, 21) + "..."
            : productName;

        pushText(commands, `${truncatedName}\n`);
        pushText(
          commands,
          `${product.quantity} ${
            product.unit?.toLowerCase() || "un"
          } x ${formatCurrency(product.price)}`
        );

        if (product.discount) {
          pushText(commands, ` (-${product.discount}%)\n`);
        } else {
          commands.push(0x0a);
        }

        const subtotal = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        pushText(commands, `Subtotal: ${formatCurrency(subtotal)}\n\n`);
      });

      // Totales y pagos
      commands.push(0x1b, 0x61, 0x01);
      pushText(commands, "------------------------------\n");
      commands.push(0x1b, 0x61, 0x02);

      pushText(commands, `TOTAL: ${formatCurrency(sale.total)}\n\n`);

      if (sale.paymentMethods?.length > 0 && !sale.credit) {
        sale.paymentMethods.forEach((method) => {
          pushText(
            commands,
            `${method.method}: ${formatCurrency(method.amount)}\n`
          );
        });
      }

      if (sale.credit) {
        commands.push(0x1b, 0x61, 0x01);
        commands.push(0x1b, 0x21, 0x08);
        pushText(commands, "** VENTA FIADA **\n");
        commands.push(0x1b, 0x21, 0x00);

        if (sale.customerName) {
          pushText(commands, `Cliente: ${sale.customerName}\n`);
        }
      }

      // Pie de página
      commands.push(0x1b, 0x61, 0x01);
      pushText(commands, "\n¡GRACIAS POR SU COMPRA!\n");
      pushText(commands, "Conserve este ticket\n");
      pushText(commands, "------------------------------\n");
      pushText(commands, "Ticket no válido como factura\n\n");

      commands.push(0x1d, 0x56, 0x41, 0x00);

      return new Uint8Array(commands);
    };

    const pushText = (commands: number[], text: string) => {
      for (let i = 0; i < text.length; i++) {
        commands.push(text.charCodeAt(i));
      }
    };

    const printTicket = async () => {
      if (onPrint) {
        onPrint();
        return;
      }

      try {
        const escPosData = generateEscPosCommands();
        if ("serial" in navigator) {
          try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });

            if (!port.writable) {
              throw new Error("El puerto serial no es escribible");
            }

            const writer = port.writable.getWriter();
            await writer.write(escPosData);
            await writer.close();
            await port.close();
            return;
          } catch (error) {
            console.warn("Error con Web Serial:", error);
          }
        }
        if ("usb" in navigator) {
          try {
            const device = await navigator.usb.requestDevice({
              filters: [{ vendorId: 0x0416, productId: 0x5011 }],
            });

            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            await device.transferOut(1, escPosData);
            await device.close();
            return;
          } catch (error) {
            console.warn("Error con WebUSB:", error);
          }
        }
      } catch (error) {
        console.error("Error al imprimir:", error);
        throw error;
      }
    };

    useImperativeHandle(ref, () => ({
      print: printTicket,
    }));

    useEffect(() => {
      if (autoPrint) {
        printTicket().catch(console.error);
      }
    }, [autoPrint]);

    return (
      <div
        ref={ticketRef}
        className="max-h-[66vh] overflow-y-auto p-2 pb-4 w-[80mm] mx-auto font-mono text-xs bg-white text-gray_b"
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
