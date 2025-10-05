// app/components/ClienteCuentaCorrientePDF.tsx
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 20,
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 12,
    marginBottom: 5,
  },
  customerInfo: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  infoLabel: {
    fontWeight: "bold",
  },
  summary: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8fafc",
    border: "1pt solid #e2e8f0",
  },
  summaryText: {
    fontSize: 10,
    marginBottom: 5,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 15,
  },
  saleDetail: {
    marginBottom: 12,
    padding: 8,
    border: "1pt solid #e2e8f0",
    backgroundColor: "#fafafa",
  },
  saleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #e2e8f0",
  },
  productRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
    paddingLeft: 10,
  },
  productName: {
    flex: 2,
    fontSize: 8,
  },
  productQuantity: {
    flex: 1,
    fontSize: 8,
    textAlign: "right",
  },
  productPrice: {
    flex: 1,
    fontSize: 8,
    textAlign: "right",
  },
  saleTotals: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1pt solid #e2e8f0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 9,
  },
  positiveBalance: {
    color: "#dc2626",
    fontWeight: "bold",
  },
  negativeBalance: {
    color: "#16a34a",
    fontWeight: "bold",
  },
  footer: {
    marginTop: 20,
  },
  footerText: {
    fontSize: 8,
    textAlign: "center",
    color: "#6b7280",
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
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cuenta Corriente - {customerName}</Text>
        <Text style={styles.subtitle}>Fecha del reporte: {fechaReporte}</Text>
      </View>

      {/* Información del cliente */}
      <View style={styles.customerInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Cliente:</Text>
          <Text>{customerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado:</Text>
          <Text
            style={
              totalBalance > 0 ? styles.positiveBalance : styles.negativeBalance
            }
          >
            {totalBalance > 0 ? "EN DEUDA" : "AL DÍA"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total de ventas:</Text>
          <Text>{sales.length}</Text>
        </View>
      </View>

      {/* Resumen financiero */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>RESUMEN FINANCIERO</Text>
        <View style={styles.infoRow}>
          <Text>Total deuda pendiente:</Text>
          <Text style={totalDeuda > 0 ? styles.positiveBalance : {}}>
            {totalDeuda.toLocaleString("es-AR", {
              style: "currency",
              currency: "ARS",
            })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text>Total pagado:</Text>
          <Text>
            {totalPagado.toLocaleString("es-AR", {
              style: "currency",
              currency: "ARS",
            })}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text>Saldo final:</Text>
          <Text
            style={
              totalBalance > 0 ? styles.positiveBalance : styles.negativeBalance
            }
          >
            {totalBalance.toLocaleString("es-AR", {
              style: "currency",
              currency: "ARS",
            })}
          </Text>
        </View>
      </View>

      {/* Detalle de ventas */}
      <Text style={styles.sectionTitle}>DETALLE DE VENTAS</Text>

      {sales.map((sale, index) => (
        <View key={sale.id} style={styles.saleDetail} wrap={false}>
          {/* Encabezado de la venta */}
          <View style={styles.saleHeader}>
            <Text style={styles.infoLabel}>
              Venta #{index + 1} -{" "}
              {format(new Date(sale.date), "dd/MM/yyyy", { locale: es })}
            </Text>
            <Text
              style={
                sale.isPaid ? styles.negativeBalance : styles.positiveBalance
              }
            >
              {sale.isPaid ? "PAGADA" : "PENDIENTE"}
            </Text>
          </View>

          {/* Productos */}
          {sale.products.map((product, productIndex) => (
            <View key={productIndex} style={styles.productRow}>
              <Text style={styles.productName}>
                {product.name}
                {product.size ? ` - Talle: ${product.size}` : ""}
                {product.color ? ` - Color: ${product.color}` : ""}
              </Text>
              <Text style={styles.productQuantity}>
                {product.quantity} {product.unit}
              </Text>
              <Text style={styles.productPrice}>
                {product.price.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Text>
            </View>
          ))}

          {/* Totales de la venta */}
          <View style={styles.saleTotals}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total venta:</Text>
              <Text style={styles.totalValue}>
                {sale.total.toLocaleString("es-AR", {
                  style: "currency",
                  currency: "ARS",
                })}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Pagado:</Text>
              <Text style={styles.totalValue}>
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
                  sale.remainingBalance > 0 ? styles.positiveBalance : {},
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
      ))}
    </Page>
  </Document>
);
