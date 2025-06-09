"use client";
import { forwardRef, useImperativeHandle } from "react";
import { Rubro, Sale } from "@/app/lib/types/types";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { formatCurrency } from "@/app/lib/utils/currency";

type PrintableTicketProps = {
  sale: Sale;
  rubro: Rubro;
  onPrint?: () => void;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  ({ sale, rubro, onPrint }, ref) => {
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

    useImperativeHandle(ref, () => ({
      print: async () => {
        if (onPrint) {
          onPrint();
          return;
        }
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          throw new Error("No se pudo abrir la ventana de impresión");
        }

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Ticket de Venta</title>
              <style>
                /* ... (mantén todos los estilos existentes) ... */
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">Universal App</div>
                <div>Dirección: Calle Falsa 123</div>
                <div>Tel: 123-456789</div>
                <div>CUIT: 12-34567890-1</div>
              </div>
              
              <div>
                <div style="font-weight: bold;">
                  <span>TICKET #${sale.id}</span>
                </div>
                <div style="margin-bottom: 30px;">
                  <span>${fecha}</span>
                </div>
              </div>
              
              <div style="margin-bottom: 10px; margin-top: 10px; border-top: 1px solid #000;">
                ${sale.products
                  .map((product) => {
                    const discountedPrice = calculateDiscountedPrice(
                      product.price,
                      product.quantity,
                      product.discount
                    );
                    return `
                      <div class="product-row">
                        <div class="product-info">
                          <span class="product-name">${getDisplayProductName(
                            product,
                            rubro
                          )}</span>
                          <span>${product.quantity} ${
                      product.unit?.toLowerCase() || "un"
                    } x ${formatCurrency(product.price)}</span>
                        </div>
                        <div class="product-price">
                          <span>${formatCurrency(discountedPrice)}</span>
                          ${
                            product.discount
                              ? `<span class="product-discount">(-${product.discount}%)</span>`
                              : ""
                          }
                        </div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
              
              ${
                sale.discount && sale.discount > 0
                  ? `
                <div class="discount-section">
                  <div style="display: flex; justify-content: space-between;">
                    <span>Descuento total:</span>
                    <span>-${formatCurrency(sale.discount)}</span>
                  </div>
                </div>
              `
                  : ""
              }
              
              ${
                sale.paymentMethods?.length > 0 && !sale.credit
                  ? `
                <div class="payment-section">
                  ${sale.paymentMethods
                    .map(
                      (method) => `
                    <div style="display: flex; justify-content: space-between;">
                      <span>${method.method}:</span>
                      <span>${formatCurrency(method.amount)}</span>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              `
                  : ""
              }
              
              ${
                sale.credit
                  ? `
                <div class="credit-section">
                  <div>** VENTA FIADA **</div>
                  ${
                    sale.customerName
                      ? `<div>Cliente: ${sale.customerName}</div>`
                      : ""
                  }
                </div>
              `
                  : ""
              }
              
              <div class="total">
                <span>TOTAL:</span>
                <span>${formatCurrency(sale.total)}</span>
              </div>
              
              <div class="footer">
                <div>¡Gracias por su compra!</div>
                <div>Conserve este ticket</div>
                <div>---</div>
                <div>Ticket no válido como factura</div>
              </div>
              
              <script>
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 500);
                }, 100);
              </script>
            </body>
          </html>
        `);

        printWindow.document.close();
      },
    }));

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
