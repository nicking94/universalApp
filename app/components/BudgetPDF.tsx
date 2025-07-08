import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { Budget, BusinessData } from "../lib/types/types";

const COLORS = {
  primary: "#2d3748",
  secondary: "#4a5568",
  accent: "#4299e1",
  lightGray: "#f7fafc",
  border: "#e2e8f0",
  text: "#1a202c",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: COLORS.text,
  },
  container: {
    flex: 1,
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    overflow: "hidden",
  },
  watermark: {
    position: "absolute",
    opacity: 0.03,
    fontSize: 80,
    color: COLORS.primary,
    transform: "rotate(-45deg)",
    transformOrigin: "0 0",
    left: "10%",
    top: "50%",
    width: "200%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottom: `1px solid ${COLORS.border}`,
    paddingBottom: 20,
  },
  businessInfo: {
    width: "60%",
  },
  logo: {
    width: 100,
    height: 50,
    marginBottom: 10,
  },
  businessName: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 5,
  },
  businessContact: {
    fontSize: 9,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  documentInfo: {
    width: "35%",
    textAlign: "right",
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.accent,
    marginBottom: 5,
  },
  documentNumber: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  documentDate: {
    fontSize: 9,
    color: COLORS.secondary,
  },
  customerSection: {
    marginBottom: 20,
    backgroundColor: COLORS.lightGray,
    padding: 15,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: 8,
  },
  customerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customerColumn: {
    width: "48%",
  },
  table: {
    width: "100%",
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: COLORS.primary,
    color: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 5,
    fontWeight: "bold",
    fontSize: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottom: `1px solid ${COLORS.border}`,
    fontSize: 9,
  },
  col1: { width: "40%", paddingRight: 5 },
  col2: { width: "10%", textAlign: "right", paddingRight: 5 },
  col3: { width: "15%", textAlign: "right", paddingRight: 5 },
  col4: { width: "10%", textAlign: "right", paddingRight: 5 },
  col5: { width: "15%", textAlign: "right", paddingRight: 5 },
  totalsAndPaymentSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  paymentBox: {
    width: "48%",
    border: `1px solid ${COLORS.border}`,
    padding: 10,
    borderRadius: 4,
  },
  totalsBox: {
    width: "48%",
    border: `1px solid ${COLORS.border}`,
    padding: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  totalLabel: {
    fontWeight: "bold",
  },
  grandTotal: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.primary,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 5,
    marginTop: 5,
  },
  paymentTitle: {
    fontWeight: "bold",
    marginBottom: 5,
    color: COLORS.primary,
  },
  notesSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTop: `1px solid ${COLORS.border}`,
  },
  statusBadge: {
    marginTop: 20,
    padding: 8,
    color: COLORS.primary,
    textAlign: "center",
    borderRadius: 4,
    fontWeight: "bold",
    fontSize: 12,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8,
    color: COLORS.secondary,
    borderTop: `1px solid ${COLORS.border}`,
    paddingTop: 10,
  },
});

interface BudgetPDFProps {
  budget: Budget;
  businessData?: BusinessData;
  logo?: string;
}

const BudgetPDF: React.FC<BudgetPDFProps> = ({
  budget,
  businessData,
  logo,
}) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateSubtotal = (item: Budget["items"][0]) => {
    return item.price * item.quantity * (1 - (item.discount ?? 0) / 100);
  };

  const subtotal = budget.items.reduce(
    (sum, item) => sum + calculateSubtotal(item),
    0
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.container}>
          <View style={styles.watermarkContainer}>
            <Text style={styles.watermark}>
              {businessData?.name || "PRESUPUESTO"}
            </Text>
          </View>

          <View style={styles.header}>
            <View style={styles.businessInfo}>
              {logo && <Image src={logo} style={styles.logo} />}
              <Text style={styles.businessName}>{businessData?.name}</Text>
              <Text style={styles.businessContact}>
                {businessData?.address}
              </Text>
              <Text style={styles.businessContact}>
                Tel: {businessData?.phone}
              </Text>
              <Text style={styles.businessContact}>
                CUIT: {businessData?.cuit}
              </Text>
            </View>

            <View style={styles.documentInfo}>
              <Text style={styles.documentTitle}>PRESUPUESTO</Text>
              <Text style={styles.documentNumber}>N°: {budget.id}</Text>
              <Text style={styles.documentDate}>
                Fecha: {formatDate(budget.createdAt)}
              </Text>
              {budget.expirationDate && (
                <Text style={styles.documentDate}>
                  Válido hasta: {formatDate(budget.expirationDate)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.customerSection}>
            <Text style={styles.sectionTitle}>DATOS DEL CLIENTE</Text>
            <View style={styles.customerInfo}>
              <View style={styles.customerColumn}>
                <Text>Nombre: {budget.customerName}</Text>
              </View>
              <View style={styles.customerColumn}>
                {budget.customerPhone && (
                  <Text>Teléfono: {budget.customerPhone}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.col1}>DESCRIPCIÓN</Text>
              <Text style={styles.col2}>CANT.</Text>
              <Text style={styles.col3}>PRECIO UNIT.</Text>
              <Text style={styles.col4}>DESC.</Text>
              <Text style={styles.col5}>SUBTOTAL</Text>
            </View>

            {budget.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.col1}>
                  {item.productName}
                  {item.size && ` (Talle: ${item.size})`}
                  {item.color && ` - Color: ${item.color}`}
                  {item.notes && ` - ${item.notes}`}
                </Text>
                <Text style={styles.col2}>
                  {item.quantity} {item.unit}
                </Text>
                <Text style={styles.col3}>{formatCurrency(item.price)}</Text>
                <Text style={styles.col4}>{item.discount ?? 0}%</Text>
                <Text style={styles.col5}>
                  {formatCurrency(calculateSubtotal(item))}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsAndPaymentSection}>
            <View style={styles.paymentBox}>
              <Text style={styles.paymentTitle}>CONDICIONES DE PAGO</Text>
              <Text>
                Seña:{" "}
                {budget.deposit
                  ? formatCurrency(parseFloat(budget.deposit))
                  : "-"}
              </Text>
              <Text>Saldo restante: {formatCurrency(budget.remaining)}</Text>
            </View>

            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.totalLabel}>TOTAL:</Text>
                <Text>{formatCurrency(budget.total)}</Text>
              </View>
            </View>
          </View>

          {budget.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.sectionTitle}>NOTAS</Text>
              <Text>{budget.notes}</Text>
            </View>
          )}

          <View style={styles.statusBadge}>
            <Text>ESTADO: {budget.status?.toUpperCase()}</Text>
          </View>

          <View style={styles.footer}>
            <Text>
              {businessData?.name} - {businessData?.address} - Tel:{" "}
              {businessData?.phone}
            </Text>
            <Text>
              Este presupuesto es válido por 15 días desde su emisión.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default BudgetPDF;
