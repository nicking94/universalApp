"use client";
import { saveAs } from "file-saver";
import { useState } from "react";
import { format } from "date-fns";

import { Box, Typography, CircularProgress, useTheme } from "@mui/material";
import { Download as DownloadIcon } from "@mui/icons-material";
import { db } from "@/app/database/db";
import { Payment, Product, Sale } from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ImportFileButton from "@/app/components/ImportFileButton";
import Notification from "@/app/components/Notification";
import Button from "@/app/components/Button";

export default function ImportExportPage() {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isOpen: false, message: "", type: "info" });
  const theme = useTheme();

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
    duration: number = 5000
  ) => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, isOpen: false }));
    }, duration);
  };

  const exportData = async () => {
    setLoading(true);
    try {
      const theme = await db.theme.toArray();
      const products = await db.products.toArray();
      const sales = await db.sales.toArray();
      const dailyCashes = await db.dailyCashes.toArray();
      const payments = await db.payments.toArray();
      const customers = await db.customers.toArray();
      const suppliers = await db.suppliers.toArray();
      const supplierProducts = await db.supplierProducts.toArray();
      const notes = await db.notes.toArray();
      const budgets = await db.budgets.toArray();
      const userPreferences = await db.userPreferences.toArray();
      const businessData = await db.businessData.toArray();
      const deletedActualizations = await db.deletedActualizations.toArray();
      const notifications = await db.notifications.toArray();
      const expenses = await db.expenses.toArray();
      const expensesCategories = await db.expenseCategories.toArray();
      const trialPeriods = await db.trialPeriods.toArray();
      const appState = await db.appState.toArray();
      const returns = await db.returns.toArray();
      const customCategories = await db.customCategories.toArray();
      const promotions = await db.promotions.toArray();

      const data = {
        theme,
        products,
        sales,
        dailyCashes,
        payments,
        customers,
        suppliers,
        supplierProducts,
        budgets,
        notes,
        userPreferences,
        businessData,
        deletedActualizations,
        notifications,
        expenses,
        expensesCategories,
        trialPeriods,
        appState,
        returns,
        customCategories,
        promotions,
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const formattedDate = format(new Date(), "dd-MM-yyyy");

      saveAs(blob, `copia de seguridad del ${formattedDate}.json`);
    } catch (error) {
      console.error("Error al exportar datos:", error);
      showNotification("Error al exportar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const data = JSON.parse(text);

    if (data.sales && data.payments) {
      const paymentMap = new Map();
      data.payments.forEach((payment: Payment) => {
        paymentMap.set(payment.saleId, payment);
      });

      data.sales = data.sales.map((sale: Sale) => {
        const payment = paymentMap.get(sale.id);
        if (payment && payment.method === "CHEQUE") {
          return {
            ...sale,
            chequeInfo: {
              amount: payment.amount,
              status: payment.checkStatus,
              date: payment.date,
            },
          };
        }
        return sale;
      });
    }

    if (data.products && Array.isArray(data.products)) {
      data.products = data.products.map((product: Product) => {
        if (
          product.category &&
          (!product.customCategories || product.customCategories.length === 0)
        ) {
          return {
            ...product,
            customCategories: product.category
              ? [{ name: product.category, rubro: product.rubro || "comercio" }]
              : [],
            category: product.category || "",
          };
        }
        return product;
      });
    }

    setLoading(true);
    try {
      await db.transaction(
        "rw",
        [
          db.theme,
          db.products,
          db.sales,
          db.auth,
          db.dailyCashes,
          db.payments,
          db.customers,
          db.suppliers,
          db.supplierProducts,
          db.budgets,
          db.notes,
          db.userPreferences,
          db.businessData,
          db.deletedActualizations,
          db.notifications,
          db.customCategories,
          db.returns,
          db.expenses,
          db.expenseCategories,
          db.trialPeriods,
          db.appState,
          db.promotions,
        ],
        async () => {
          await Promise.all([
            db.theme.clear(),
            db.products.clear(),
            db.sales.clear(),
            db.auth.clear(),
            db.dailyCashes.clear(),
            db.payments.clear(),
            db.customers.clear(),
            db.suppliers.clear(),
            db.supplierProducts.clear(),
            db.budgets.clear(),
            db.notes.clear(),
            db.userPreferences.clear(),
            db.businessData.clear(),
            db.deletedActualizations.clear(),
            db.notifications.clear(),
            db.customCategories.clear(),
            db.returns.clear(),
            db.expenses.clear(),
            db.expenseCategories.clear(),
            db.trialPeriods.clear(),
            db.appState.clear(),
            db.promotions.clear(),
          ]);

          try {
            await Promise.all([
              db.theme.bulkAdd(data.theme || []),
              db.products.bulkAdd(data.products || []),
              db.sales.bulkPut(data.sales || []),
              db.auth.bulkAdd(data.auth || []),
              db.dailyCashes.bulkAdd(data.dailyCashes || []),
              db.payments.bulkAdd(data.payments || []),
              db.customers.bulkAdd(data.customers || []),
              db.suppliers.bulkAdd(data.suppliers || []),
              db.supplierProducts.bulkAdd(data.supplierProducts || []),
              db.budgets.bulkAdd(data.budgets || []),
              db.notes.bulkAdd(data.notes || []),
              db.userPreferences.bulkAdd(data.userPreferences || []),
              db.businessData.bulkAdd(data.businessData || []),
              db.deletedActualizations.bulkAdd(
                data.deletedActualizations || []
              ),
              db.notifications.bulkAdd(data.notifications || []),
              db.customCategories.bulkAdd(data.customCategories || []),
              db.returns.bulkAdd(data.returns || []),
              db.expenses.bulkAdd(data.expenses || []),
              db.expenseCategories.bulkAdd(data.expenseCategories || []),
              db.trialPeriods.bulkAdd(data.trialPeriods || []),
              db.appState.bulkAdd(data.appState || []),
              db.promotions.bulkAdd(data.promotions || []),
            ]);
          } catch (e) {
            console.error("Error al importar datos:", e);
            throw e;
          }
        }
      );

      showNotification(
        "Datos importados correctamente. Redirigiendo al login...",
        "success"
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error al importar datos:", error);
      showNotification("Error al importar los datos", "error");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: 4,
          py: 2,
          color: "text.secondary",
          height: "100vh",
          position: "relative",
        }}
      >
        <Typography
          variant="h5"
          component="h1"
          sx={{
            fontWeight: 600,
            mb: 2,
            fontSize: { xs: "1.125rem", lg: "1.25rem" },
          }}
        >
          Importar o Exportar Datos
        </Typography>

        <Box
          sx={{
            height: "75vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Button
            text="Exportar Datos"
            icon={<DownloadIcon />}
            iconPosition="left"
            onClick={exportData}
            disabled={loading}
            loading={loading}
            variant="text"
            size="large"
            title="Exportar todos los datos a un archivo JSON"
            ariaLabel="Exportar datos de respaldo"
            sx={{
              // Mantener estilos similares al anterior
              color: theme.palette.mode === "dark" ? "white" : "text.primary",
              borderColor:
                theme.palette.mode === "dark" ? "grey.600" : "grey.300",
              backgroundColor:
                theme.palette.mode === "dark" ? "grey.800" : "white",
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "grey.700" : "grey.100",
                borderColor:
                  theme.palette.mode === "dark" ? "grey.500" : "grey.400",
              },
              minWidth: "200px",
              height: "56px",
              fontSize: "1rem",
              // Sobrescribir algunos estilos del botón personalizado para mantener consistencia
              textTransform: "none", // Cambiar de "uppercase" a "none" para mantener el estilo original
              fontWeight: 400,
              borderRadius: 1,
            }}
          />
          <ImportFileButton onImport={importData} />
        </Box>

        <Typography
          variant="caption"
          sx={{
            display: "block",
            textAlign: "center",
            fontStyle: "italic",
            color: "text.disabled",
            animation: "pulse 2s infinite",
            mt: 2,
            "@keyframes pulse": {
              "0%": { opacity: 0.6 },
              "50%": { opacity: 1 },
              "100%": { opacity: 0.6 },
            },
          }}
        >
          Universal App{" "}
          <span style={{ color: theme.palette.text.secondary }}>
            le recomienda
          </span>{" "}
          realizar una copia de seguridad todos los días...
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Procesando...
            </Typography>
          </Box>
        )}

        <Notification
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
        />
      </Box>
    </ProtectedRoute>
  );
}
