"use client";
import Button from "@/app/components/Button";
import { FolderDown } from "lucide-react";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { db } from "@/app/database/db";
import { saveAs } from "file-saver";
import { useState } from "react";
import ImportFileButton from "@/app/components/ImportFileButton";
import { format } from "date-fns";
import Notification from "@/app/components/Notification";
import { Payment, Product, Sale } from "@/app/lib/types/types";

export default function ImportExportPage() {
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isOpen: false, message: "", type: "info" });

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

    // CORREGIR: Este código tiene un problema lógico
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

    // CORREGIR: Mejorar la lógica de categorías personalizadas
    if (data.products && Array.isArray(data.products)) {
      data.products = data.products.map((product: Product) => {
        // Verificar si necesita migración de categorías
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
          // AGREGAR LAS NUEVAS TABLAS:
          db.trialPeriods,
          db.appState,
        ],
        async () => {
          // Limpiar todas las tablas
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
            // Limpiar las nuevas tablas:
            db.trialPeriods.clear(),
            db.appState.clear(),
          ]);

          try {
            // Importar todos los datos
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
              // Importar las nuevas tablas:
              db.trialPeriods.bulkAdd(data.trialPeriods || []),
              db.appState.bulkAdd(data.appState || []),
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
      <div className="px-10 py-3 2xl:p-10 text-gray_l dark:text-white h-[calc(100vh-80px)] relative">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">
          Importar o Exportar Datos
        </h1>
        <div className="h-[calc(100vh-160px)] 2xl:h-[80vh] flex items-center justify-center gap-10">
          <ImportFileButton onImport={importData} />
          <Button
            onClick={exportData}
            icon={<FolderDown className="w-5 h-5" />}
            iconPosition="left"
            disabled={loading}
            text="Exportar Datos"
            colorText="text-gray_b dark:text-white"
            colorTextHover="dark:hover:text-white "
            colorBg="bg-white dark:bg-gray_m"
            colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
          />
        </div>
        <p className="animate-pulse text-xs text-center font-light text-gray_l dark:text-gray_l italic">
          Universal App
          <span className="text-gray_m dark:text-gray_xl">
            {" "}
            le recomienda
          </span>{" "}
          realizar una copia de seguridad todos los días...
        </p>
        {loading && <p className="mt-2">Procesando...</p>}

        <Notification
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
        />
      </div>
    </ProtectedRoute>
  );
}
