// app/hooks/useBackup.ts
import { useState, useCallback } from "react";
import { useNotification } from "./useNotification";
import { db } from "@/app/database/db";
import { APP_VERSION } from "../lib/constants/constants";

export const useBackup = () => {
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const { showNotification } = useNotification();
  const [pendingBackup, setPendingBackup] = useState<boolean>(false);

  const processDataForExport = useCallback(async () => {
    try {
      const [
        theme,
        products,
        priceLists,
        productPrices,
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
        expenseCategories,
        trialPeriods,
        appState,
        returns,
        customCategories,
        promotions,
        auth,
        installments,
        creditAlerts,
      ] = await Promise.all([
        db.theme.toArray(),
        db.products.toArray(),
        db.priceLists.toArray(),
        db.productPrices.toArray(),
        db.sales.toArray(),
        db.dailyCashes.toArray(),
        db.payments.toArray(),
        db.customers.toArray(),
        db.suppliers.toArray(),
        db.supplierProducts.toArray(),
        db.budgets.toArray(),
        db.notes.toArray(),
        db.userPreferences.toArray(),
        db.businessData.toArray(),
        db.deletedActualizations.toArray(),
        db.notifications.toArray(),
        db.expenses.toArray(),
        db.expenseCategories.toArray(),
        db.trialPeriods.toArray(),
        db.appState.toArray(),
        db.returns.toArray(),
        db.customCategories.toArray(),
        db.promotions.toArray(),
        db.auth.toArray(),
        db.installments.toArray(),
        db.creditAlerts.toArray(),
      ]);

      // Procesar sales y payments como en import-export (mapeo de cheques)
      let processedSales = sales;
      if (sales && payments) {
        const paymentMap = new Map();
        payments.forEach((payment) => {
          paymentMap.set(payment.saleId, payment);
        });

        processedSales = sales.map((sale) => {
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

      // Procesar productos como en import-export (customCategories)
      let processedProducts = products;
      if (products && Array.isArray(products)) {
        processedProducts = products.map((product) => {
          if (
            product.category &&
            (!product.customCategories || product.customCategories.length === 0)
          ) {
            return {
              ...product,
              customCategories: product.category
                ? [
                    {
                      name: product.category,
                      rubro: product.rubro || "comercio",
                    },
                  ]
                : [],
              category: product.category || "",
            };
          }
          return product;
        });
      }

      return {
        theme,
        products: processedProducts,
        priceLists,
        productPrices,
        sales: processedSales,
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
        expenseCategories,
        trialPeriods,
        appState,
        returns,
        customCategories,
        promotions,
        auth,
        installments,
        creditAlerts,
      };
    } catch (error) {
      console.error("Error al procesar datos para exportar:", error);
      throw error;
    }
  }, []);

  // Función para exportar todos los datos (COMPLETA como import-export)
  const exportAllData = useCallback(async (): Promise<boolean> => {
    try {
      // Obtener todos los datos procesados
      const allData = await processDataForExport();

      const dataToExport = {
        ...allData,
        exportDate: new Date().toISOString(),
        version: APP_VERSION,
      };

      // Convertir a JSON
      const jsonData = JSON.stringify(dataToExport, null, 2);

      // Crear archivo de descarga
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const date = new Date();
      const fileName = `copia de seguridad del ${date
        .getDate()
        .toString()
        .padStart(2, "0")}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getFullYear()}`;

      a.href = url;
      a.download = fileName + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification("Backup exportado exitosamente", "success");
      return true;
    } catch (error) {
      console.error("Error al exportar backup:", error);
      showNotification("Error al exportar backup", "error");
      return false;
    }
  }, [showNotification, processDataForExport]);

  const exportDailyData = useCallback(async (): Promise<boolean> => {
    try {
      const today = new Date().toISOString().split("T")[0];

      const [dailyCashes, sales, payments, expenses, dailyCashMovements] =
        await Promise.all([
          db.dailyCashes.where("date").equals(today).toArray(),
          db.sales.where("date").equals(today).toArray(),
          db.payments.where("date").equals(today).toArray(),
          db.expenses.where("date").equals(today).toArray(),
          db.dailyCashMovements.where("date").equals(today).toArray(),
        ]);

      const dailyData = {
        dailyCashes,
        sales,
        payments,
        expenses,
        dailyCashMovements,
        exportDate: new Date().toISOString(),
        exportType: "daily",
        date: today,
      };

      const jsonData = JSON.stringify(dailyData, null, 2);
      const blob = new Blob([jsonData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      const date = new Date();
      const fileName = `backup_diario_${date
        .getDate()
        .toString()
        .padStart(2, "0")}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getFullYear()}`;

      a.href = url;
      a.download = fileName + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showNotification("Backup diario exportado exitosamente", "success");
      return true;
    } catch (error) {
      console.error("Error al exportar backup diario:", error);
      showNotification("Error al exportar backup diario", "error");
      return false;
    }
  }, [showNotification]);

  // Función para iniciar backup
  const initiateBackup = useCallback(() => {
    setIsBackupModalOpen(true);
  }, []);

  // Función para confirmar backup (ahora exporta todo)
  const confirmBackup = useCallback(async () => {
    const success = await exportAllData();
    setIsBackupModalOpen(false);
    return success;
  }, [exportAllData]);

  // Función para cancelar backup
  const cancelBackup = useCallback(() => {
    setIsBackupModalOpen(false);
    setPendingBackup(false);
  }, []);

  return {
    isBackupModalOpen,
    pendingBackup,
    initiateBackup,
    confirmBackup,
    cancelBackup,
    exportAllData, // Exporta todo
    exportDailyData, // Exporta solo datos del día (opcional)
    setPendingBackup,
  };
};
