"use client";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
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
  invoiceNumber?: string;
};

export type PrintableTicketHandle = {
  print: () => Promise<void>;
};

const PrintableTicket = forwardRef<PrintableTicketHandle, PrintableTicketProps>(
  (
    { sale, rubro, businessData, onPrint, autoPrint = false, invoiceNumber },
    ref
  ) => {
    const ticketRef = useRef<HTMLDivElement>(null);
    const [paperSize, setPaperSize] = useState<"57mm" | "80mm">("80mm");
    const fecha = format(parseISO(sale.date), "dd/MM/yyyy HH:mm", {
      locale: es,
    });

    // Cargar la preferencia guardada al inicializar el componente
    useEffect(() => {
      const savedPaperSize = localStorage.getItem("ticketPaperSize") as
        | "57mm"
        | "80mm";
      if (
        savedPaperSize &&
        (savedPaperSize === "57mm" || savedPaperSize === "80mm")
      ) {
        setPaperSize(savedPaperSize);
      }
    }, []);

    // Guardar en localStorage cuando cambia el tamaño
    const handlePaperSizeChange = (size: "57mm" | "80mm") => {
      setPaperSize(size);
      localStorage.setItem("ticketPaperSize", size);
    };

    const calculatedInvoiceNumber =
      invoiceNumber ?? `${sale.id.toString().padStart(3, "0")}`;

    const calculateDiscountedPrice = (
      price: number,
      quantity: number,
      discount?: number
    ): number => {
      if (!discount) return price * quantity;
      return price * quantity * (1 - discount / 100);
    };

    const getInvoiceItems = () => {
      return sale.products.map((product) => {
        const subtotalSinDescuento = product.price * product.quantity;
        const subtotalConDescuento = calculateDiscountedPrice(
          product.price,
          product.quantity,
          product.discount
        );

        return {
          description: getDisplayProductName(product, rubro),
          quantity: product.quantity,
          price: product.price,
          subtotal: subtotalConDescuento,
          unit: product.unit,
          discount: product.discount,
          subtotalSinDescuento: subtotalSinDescuento,
          ahorro: subtotalSinDescuento - subtotalConDescuento,
        };
      });
    };

    const invoiceItems = getInvoiceItems();

    const shouldShowCustomerInfo = (): boolean => {
      return Boolean(
        !sale.credit &&
          sale.customerName &&
          sale.customerName !== "CLIENTE OCASIONAL" &&
          sale.customerName.trim() !== ""
      );
    };

    const printTicket = async (): Promise<void> => {
      printWithBrowserDialog();
    };

    const getPrintStyles = () => {
      const width = paperSize === "80mm" ? "80mm" : "57mm";

      return `
      @page {
        size: ${width} auto;
        margin: 0;
        padding: 0;
      }
      @media print {
        * {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace !important;
          font-size: ${paperSize === "80mm" ? "14px" : "12px"} !important;
          width: ${width} !important;
          margin: 0 !important;
          padding: 10px !important;
          line-height: 1.2 !important;
          background: white !important;
          color: black !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .ticket-container {
          width: ${width} !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: white !important;
          overflow: visible !important;
          max-height: none !important;
        }
        .center { text-align: center !important; }
        .bold, .font-bold, .font-semibold {
          font-weight: bold !important;
        }
        .text-right { text-align: right !important; }
        .border-bottom, .border-b {
          border-bottom: 1px solid #000 !important;
        }
        .border-top, .border-t {
          border-top: 1px solid #000 !important;
        }
        .border-bottom-dashed {
          border-bottom: 1px dashed #000 !important;
        }
        .border-top-dashed {
          border-top: 1px dashed #000 !important;
        }
        .mt-2 { margin-top: 8px !important; }
        .mt-4 { margin-top: 16px !important; }
        .mb-2 { margin-bottom: 8px !important; }
        .mb-4 { margin-bottom: 16px !important; }
        .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
        .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
        .pt-2 { padding-top: 8px !important; }
        .pb-4 { padding-bottom: 16px !important; }
        .ml-2 { margin-left: 8px !important; }
        .flex { display: flex !important; }
        .flex-1 { flex: 1 !important; }
        .justify-between { justify-content: space-between !important; }
        .items-start { align-items: flex-start !important; }
        .text-center { text-align: center !important; }
        .text-sm { font-size: ${
          paperSize === "80mm" ? "16px" : "14px"
        } !important; }
        .text-\[0\.7rem\] { font-size: ${
          paperSize === "80mm" ? "12px" : "11px"
        } !important; }
        .space-y-1 > * + * { margin-top: 4px !important; }
        .w-\[57mm\] { width: ${width} !important; }
        .w-\[80mm\] { width: ${width} !important; }
        .mx-auto { margin-left: auto !important; margin-right: auto !important; }
        .bg-white { background: white !important; }
        .text-gray_b { color: #4b5563 !important; }
        .text-gray-600 { color: #6b7280 !important; }
        .text-gray_m { color: #6b7280 !important; }
        .text-red_b { color: #dc2626 !important; }
        .discount { color: #666 !important; font-size: ${
          paperSize === "80mm" ? "11px" : "10px"
        } !important; }
        .uppercase { text-transform: uppercase !important; }
        
        /* Eliminar cualquier scroll o limitación de altura */
        .no-scroll {
          max-height: none !important;
          overflow: visible !important;
          height: auto !important;
        }
      }
      
      /* Estilos para pantalla */
      @media screen {
        .ticket-preview {
          max-height: 56vh;
          overflow-y: auto;
          width: ${width};
          margin: 0 auto;
        }
      }
    `;
    };

    const printWithBrowserDialog = () => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      // Obtener el HTML limpio del ticket (solo el contenido interno)
      const ticketContent =
        ticketRef.current?.querySelector(".ticket-content")?.innerHTML || "";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Ticket ${calculatedInvoiceNumber}</title>
            <meta charset="utf-8">
            <style>
              ${getPrintStyles()}
              
              /* Estilos base para la ventana de impresión */
              body {
                font-family: 'Courier New', monospace;
                font-size: ${paperSize === "80mm" ? "14px" : "12px"};
                width: ${paperSize === "80mm" ? "80mm" : "57mm"};
                margin: 0 auto;
                padding: 10px;
                line-height: 1.2;
                background: white;
                color: black;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              .ticket-container {
                width: ${paperSize === "80mm" ? "80mm" : "57mm"};
                margin: 0 auto;
                background: white;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              /* Prevenir saltos de página dentro del ticket */
              .ticket-container * {
                page-break-inside: avoid;
                break-inside: avoid;
              }
              
              .border-bottom-dashed {
                border-bottom: 1px dashed #000 !important;
              }
              
              .border-top-dashed {
                border-top: 1px dashed #000 !important;
              }
            </style>
          </head>
          <body>
            <div class="ticket-container no-scroll">
              ${ticketContent}
            </div>
            
            <script>
              // Esperar a que cargue el contenido antes de imprimir
              window.onload = function() {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => {
                    window.close();
                  }, 500);
                }, 500);
              };
              
              // Fallback en caso de que onload falle
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 2000);
            </script>
          </body>
        </html>
      `);

      printWindow.document.close();

      if (onPrint) {
        onPrint();
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
      <div className="space-y-4">
        {/* Selector de tamaño de papel con guía para el usuario */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-center mb-3">
            <p className="text-xs text-blue-600">
              Selecciona el tamaño del rollo de ticket
            </p>
          </div>

          <div className="flex justify-center space-x-6">
            <label className="flex flex-col items-center cursor-pointer group">
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all ${
                  paperSize === "57mm"
                    ? "border-blue_m bg-blue_xxl"
                    : "border-gray-300 bg-white group-hover:border-blue_m"
                }`}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="57mm"
                  checked={paperSize === "57mm"}
                  onChange={(e) =>
                    handlePaperSizeChange(e.target.value as "57mm" | "80mm")
                  }
                  className="text-blue_m focus:ring-blue_m"
                />
                <span
                  className={`font-medium ${
                    paperSize === "57mm" ? "text-blue_b" : "text-gray_b"
                  }`}
                >
                  57mm
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-1">Estándar</span>
            </label>

            <label className="flex flex-col items-center cursor-pointer group">
              <div
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg border-2 transition-all ${
                  paperSize === "80mm"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 bg-white group-hover:border-blue-300"
                }`}
              >
                <input
                  type="radio"
                  name="paperSize"
                  value="80mm"
                  checked={paperSize === "80mm"}
                  onChange={(e) =>
                    handlePaperSizeChange(e.target.value as "57mm" | "80mm")
                  }
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`font-medium ${
                    paperSize === "80mm" ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  80mm
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-1">Ancho</span>
            </label>
          </div>
        </div>

        {/* Contenedor para preview (solo en pantalla) */}
        <div className="max-h-[50vh] overflow-y-scroll">
          {/* Contenedor principal del ticket */}
          <div
            ref={ticketRef}
            className={`ticket-container p-2 pb-4 mx-auto font-mono bg-white text-gray_b ${
              paperSize === "80mm"
                ? "w-[80mm] text-[12px]"
                : "w-[57mm] text-[0.7rem]"
            }`}
            style={{
              fontFamily: "'Courier New', monospace",
              lineHeight: 1.2,
            }}
          >
            {/* Contenido del ticket - este es el que se imprime */}
            <div className="ticket-content">
              {/* Encabezado del negocio */}
              <div className="mb-4 text-center">
                <h2
                  className={`text-center font-bold mb-1 ${
                    paperSize === "80mm" ? "text-[16px]" : "text-sm"
                  }`}
                >
                  {businessData?.name || "Universal App"}
                </h2>
                <p
                  className={
                    paperSize === "80mm" ? "text-[12px]" : "text-[0.7rem]"
                  }
                >
                  {businessData?.address || "Calle Falsa 123"}
                </p>
                <p
                  className={
                    paperSize === "80mm" ? "text-[12px]" : "text-[0.7rem]"
                  }
                >
                  Tel: {businessData?.phone || "123-456789"}
                </p>
                <p
                  className={
                    paperSize === "80mm" ? "text-[12px]" : "text-[0.7rem]"
                  }
                >
                  CUIT: {businessData?.cuit || "12-34567890-1"}
                </p>
              </div>

              {/* Información del ticket */}
              <div className="py-1 mb-2">
                {paperSize === "80mm" ? (
                  <p>---------------------------------------</p>
                ) : (
                  <p>-----------------------------</p>
                )}
                <p className="font-bold">TICKET #{calculatedInvoiceNumber}</p>
                <p>{fecha}</p>
                {/* Información del cliente */}
                {shouldShowCustomerInfo() && (
                  <div className="py-2">
                    <p className="font-semibold">
                      Cliente: {sale.customerName}
                    </p>
                  </div>
                )}
                {paperSize === "80mm" ? (
                  <p>---------------------------------------</p>
                ) : (
                  <p>-----------------------------</p>
                )}
              </div>

              {/* Items del ticket */}
              <div className="mb-2">
                {invoiceItems.map((item, index) => (
                  <div key={index} className="py-1">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <span className="font-semibold">
                          {item.description}
                        </span>
                        <div
                          className={
                            paperSize === "80mm"
                              ? "text-[12px] text-gray-600"
                              : "text-[0.7rem] text-gray-600"
                          }
                        >
                          x{item.quantity} {item.unit}{" "}
                          <span
                            className={
                              paperSize === "80mm"
                                ? "text-[11px]"
                                : "text-[0.6rem]"
                            }
                          >
                            ({formatCurrency(item.price)})
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-semibold">
                          {formatCurrency(item.subtotal)}
                        </div>
                        {item.discount && item.discount > 0 && (
                          <div
                            className={
                              paperSize === "80mm"
                                ? "text-[12px] text-gray-500"
                                : "text-[0.7rem] text-gray-500"
                            }
                          >
                            desc. {item.discount}%
                          </div>
                        )}
                      </div>
                    </div>
                    {paperSize === "80mm" ? (
                      <p>________________________________________</p>
                    ) : (
                      <p>_____________________________</p>
                    )}
                  </div>
                ))}
              </div>

              {sale.manualAmount !== undefined && sale.manualAmount > 0 && (
                <div className="mt-2 pt-2">
                  <div className="flex justify-between">
                    <span className="uppercase font-semibold">
                      Monto Manual:
                    </span>
                    <span>{formatCurrency(sale.manualAmount)}</span>
                  </div>
                  {paperSize === "80mm" ? (
                    <p>---------------------------------------</p>
                  ) : (
                    <p>-----------------------------</p>
                  )}
                </div>
              )}

              {/* Formas de pago */}
              {sale.paymentMethods?.length > 0 && !sale.credit && (
                <div className="mb-2 mt-4 space-y-1 pt-2">
                  <span className="text-center font-semibold block">
                    Formas de pago
                  </span>
                  {sale.paymentMethods.map((method, idx) => (
                    <div
                      key={idx}
                      className={`flex justify-between ${
                        paperSize === "80mm" ? "text-[12px]" : "text-[0.7rem]"
                      }`}
                    >
                      <span>{method.method}:</span>
                      <span>{formatCurrency(method.amount)}</span>
                    </div>
                  ))}
                  {paperSize === "80mm" ? (
                    <p>________________________________________</p>
                  ) : (
                    <p>_____________________________</p>
                  )}
                </div>
              )}

              {/* Total */}
              <div className="pt-2 mt-4">
                {paperSize === "80mm" ? (
                  <p>---------------------------------------</p>
                ) : (
                  <p>-----------------------------</p>
                )}

                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
                {paperSize === "80mm" ? (
                  <p>---------------------------------------</p>
                ) : (
                  <p>-----------------------------</p>
                )}
              </div>

              {/* Cuenta corriente */}
              {sale.credit && (
                <div className="text-center font-bold text-red-600 mb-2 pt-2 mt-4">
                  ** CUENTA CORRIENTE **
                  {sale.customerName && <p>Cliente: {sale.customerName}</p>}
                </div>
              )}

              {/* Pie del ticket */}
              <div
                className={`text-center mt-4 pt-2 ${
                  paperSize === "80mm" ? "text-[12px]" : "text-[0.7rem]"
                }`}
              >
                <p>¡Gracias por su compra!</p>
                <p>Conserve este ticket</p>
                {paperSize === "80mm" ? (
                  <p>---------------------------------</p>
                ) : (
                  <p>-------------------------</p>
                )}

                <p>Ticket no válido como factura</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PrintableTicket.displayName = "PrintableTicket";

export default PrintableTicket;
