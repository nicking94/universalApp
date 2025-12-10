// app/components/ClienteCuentaCorrientePDF.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 20,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottom: "2pt solid #2d78b9",
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2d78b9",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 3,
  },
  reportInfo: {
    fontSize: 9,
    color: "#888888",
    textAlign: "right",
  },
  customerSection: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#2d78b9",
    paddingBottom: 5,
    borderBottom: "1pt solid #e2e8f0",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  infoItem: {
    width: "48%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4a5568",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: "#2d3748",
  },
  statusBadge: {
    padding: "3pt 8pt",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },
  statusPaid: {
    backgroundColor: "#c6f6d5",
    color: "#22543d",
  },
  statusPending: {
    backgroundColor: "#fed7d7",
    color: "#742a2a",
  },
  statusPositive: {
    backgroundColor: "#c6f6d5",
    color: "#22543d",
  },
  statusNegative: {
    backgroundColor: "#fed7d7",
    color: "#742a2a",
  },
  summaryCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    border: "1pt solid #e2e8f0",
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4a5568",
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  cardPositive: {
    color: "#1e8449",
  },
  cardNegative: {
    color: "#c0392b",
  },
  cardNeutral: {
    color: "#2d78b9",
  },
  salesSection: {
    marginTop: 10,
  },
  saleCard: {
    marginBottom: 15,
    border: "1pt solid #e2e8f0",
    borderRadius: 5,
    backgroundColor: "#ffffff",
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f7fafc",
    borderBottom: "1pt solid #e2e8f0",
  },
  saleInfo: {
    flex: 1,
  },
  saleNumber: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#2d3748",
  },
  saleDate: {
    fontSize: 9,
    color: "#718096",
  },
  saleStatus: {
    padding: "4pt 8pt",
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },
  productsTable: {
    margin: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f7fafc",
    padding: 8,
    borderBottom: "1pt solid #e2e8f0",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1pt solid #f7fafc",
  },
  colProduct: {
    flex: 3,
    fontSize: 9,
  },
  colQuantity: {
    flex: 1,
    fontSize: 9,
    textAlign: "center",
  },
  colPrice: {
    flex: 1,
    fontSize: 9,
    textAlign: "right",
  },
  colTotal: {
    flex: 1,
    fontSize: 9,
    textAlign: "right",
  },
  saleTotals: {
    padding: 12,
    backgroundColor: "#f7fafc",
    borderTop: "1pt solid #e2e8f0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#4a5568",
  },
  totalValue: {
    fontSize: 9,
    fontWeight: "bold",
  },
  footer: {
    marginTop: 30,
    paddingTop: 15,
    borderTop: "1pt solid #e2e8f0",
  },
  footerText: {
    fontSize: 8,
    textAlign: "center",
    color: "#718096",
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: "#718096",
  },
  note: {
    fontSize: 8,
    color: "#718096",
    fontStyle: "italic",
    marginTop: 5,
  },
  watermark: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%) rotate(-45deg)",
    fontSize: 48,
    color: "rgba(0,0,0,0.03)",
    fontWeight: "bold",
  },
});

interface ClienteCuentaCorrientePDFProps {
  customerName: string;
  sales: Array<{
    id: number;
    date: string;
    products: Array<{
      name: string;
      quantity: number;
      unit: string;
      price: number;
      size?: string;
      color?: string;
    }>;
    total: number;
    totalPayments: number;
    remainingBalance: number;
    isPaid: boolean;
  }>;
  totalBalance: number;
  totalDeuda: number;
  totalPagado: number;
  fechaReporte: string;
}

export const ClienteCuentaCorrientePDF: React.FC<
  ClienteCuentaCorrientePDFProps
> = ({
  customerName,
  sales,
  totalBalance,
  totalDeuda,
  totalPagado,
  fechaReporte,
}) => {
  const totalVentas = sales.reduce((sum, sale) => sum + sale.total, 0);
  const ventasPagadas = sales.filter((sale) => sale.isPaid).length;
  const ventasPendientes = sales.filter((sale) => !sale.isPaid).length;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark de fondo */}
        <Text style={styles.watermark}>CUENTA CORRIENTE</Text>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Cuenta Corriente</Text>
            <Text style={styles.subtitle}>Estado de Cuenta del Cliente</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.reportInfo}>Fecha: {fechaReporte}</Text>
            <Text style={styles.reportInfo}>
              Generado: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
            </Text>
          </View>
        </View>

        {/* Información del cliente */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>INFORMACIÓN DEL CLIENTE</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>CLIENTE</Text>
              <Text style={styles.infoValue}>{customerName}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>ESTADO GENERAL</Text>
              <View
                style={[
                  styles.statusBadge,
                  totalBalance > 0
                    ? styles.statusNegative
                    : styles.statusPositive,
                ]}
              >
                <Text>{totalBalance > 0 ? "EN DEUDA" : "AL DÍA"}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>TOTAL VENTAS</Text>
              <Text style={styles.infoValue}>{sales.length}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PERÍODO ANALIZADO</Text>
              <Text style={styles.infoValue}>
                {sales.length > 0
                  ? `${format(
                      new Date(sales[sales.length - 1].date),
                      "dd/MM/yy",
                      { locale: es }
                    )} - ${format(new Date(sales[0].date), "dd/MM/yy", {
                      locale: es,
                    })}`
                  : "Sin ventas"}
              </Text>
            </View>
          </View>
        </View>

        {/* Resumen financiero con cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>TOTAL FACTURADO</Text>
            <Text style={[styles.cardValue, styles.cardNeutral]}>
              {totalVentas.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>TOTAL PAGADO</Text>
            <Text style={[styles.cardValue, styles.cardPositive]}>
              {totalPagado.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>DEUDA PENDIENTE</Text>
            <Text
              style={[
                styles.cardValue,
                totalDeuda > 0 ? styles.cardNegative : styles.cardPositive,
              ]}
            >
              {totalDeuda.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>SALDO FINAL</Text>
            <Text
              style={[
                styles.cardValue,
                totalBalance > 0 ? styles.cardNegative : styles.cardPositive,
              ]}
            >
              {totalBalance.toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </Text>
          </View>
        </View>

        {/* Resumen de estados */}
        <View style={[styles.customerSection, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>RESUMEN DE ESTADOS</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VENTAS PAGADAS</Text>
              <View style={[styles.statusBadge, styles.statusPaid]}>
                <Text>{ventasPagadas} ventas</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>VENTAS PENDIENTES</Text>
              <View style={[styles.statusBadge, styles.statusPending]}>
                <Text>{ventasPendientes} ventas</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PORCENTAJE PAGADO</Text>
              <Text style={styles.infoValue}>
                {totalVentas > 0
                  ? ((totalPagado / totalVentas) * 100).toFixed(1)
                  : 0}
                %
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>PROMEDIO POR VENTA</Text>
              <Text style={styles.infoValue}>
                {sales.length > 0
                  ? (totalVentas / sales.length).toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })
                  : "$0"}
              </Text>
            </View>
          </View>
        </View>

        {/* Detalle de ventas */}
        <Text style={styles.sectionTitle}>DETALLE DE VENTAS</Text>

        {sales.length === 0 ? (
          <View
            style={[
              styles.customerSection,
              { alignItems: "center", padding: 30 },
            ]}
          >
            <Text style={[styles.infoLabel, { fontSize: 12 }]}>
              No hay ventas registradas
            </Text>
            <Text style={styles.note}>
              El cliente no tiene cuentas corrientes activas
            </Text>
          </View>
        ) : (
          sales.map((sale) => (
            <View key={sale.id} style={styles.saleCard} wrap={false}>
              {/* Encabezado de la venta */}
              <View style={styles.saleHeader}>
                <View style={styles.saleInfo}>
                  <Text style={styles.saleNumber}>
                    Venta #{sale.id} •{" "}
                    {format(new Date(sale.date), "dd/MM/yyyy", { locale: es })}
                  </Text>
                  <Text style={styles.saleDate}>
                    {format(new Date(sale.date), "HH:mm", { locale: es })} •{" "}
                    {sale.products.length} productos
                  </Text>
                </View>
                <View
                  style={[
                    styles.saleStatus,
                    sale.isPaid ? styles.statusPaid : styles.statusPending,
                  ]}
                >
                  <Text>{sale.isPaid ? "PAGADA" : "PENDIENTE"}</Text>
                </View>
              </View>

              {/* Tabla de productos */}
              <View style={styles.productsTable}>
                <View style={styles.tableHeader}>
                  <Text style={styles.colProduct}>PRODUCTO</Text>
                  <Text style={styles.colQuantity}>CANT.</Text>
                  <Text style={styles.colPrice}>PRECIO</Text>
                  <Text style={styles.colTotal}>SUBTOTAL</Text>
                </View>

                {sale.products.map((product, productIndex) => (
                  <View key={productIndex} style={styles.tableRow}>
                    <Text style={styles.colProduct}>
                      {product.name}
                      {product.size && ` • Talle: ${product.size}`}
                      {product.color && ` • Color: ${product.color}`}
                    </Text>
                    <Text style={styles.colQuantity}>
                      {product.quantity} {product.unit}
                    </Text>
                    <Text style={styles.colPrice}>
                      {product.price.toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                    </Text>
                    <Text style={styles.colTotal}>
                      {(product.quantity * product.price).toLocaleString(
                        "es-AR",
                        {
                          style: "currency",
                          currency: "ARS",
                        }
                      )}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Totales de la venta */}
              <View style={styles.saleTotals}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total de la venta:</Text>
                  <Text style={styles.totalValue}>
                    {sale.total.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Pagado:</Text>
                  <Text style={[styles.totalValue, { color: "#1e8449" }]}>
                    {sale.totalPayments.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Saldo pendiente:</Text>
                  <Text
                    style={[
                      styles.totalValue,
                      {
                        color:
                          sale.remainingBalance > 0 ? "#c0392b" : "#1e8449",
                      },
                    ]}
                  >
                    {sale.remainingBalance.toLocaleString("es-AR", {
                      style: "currency",
                      currency: "ARS",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}

        {/* Número de página */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) =>
            `Página ${pageNumber} de ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
};
