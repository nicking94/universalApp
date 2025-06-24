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
      const auth = await db.auth.toArray();
      const dailyCashes = await db.dailyCashes.toArray();
      const payments = await db.payments.toArray();
      const customers = await db.customers.toArray();
      const suppliers = await db.suppliers.toArray();
      const supplierProducts = await db.supplierProducts.toArray();
      const notes = await db.notes.toArray();
      const budgets = await db.budgets.toArray();

      const data = {
        theme,
        products,
        sales,
        auth,
        dailyCashes,
        payments,
        customers,
        suppliers,
        supplierProducts,
        budgets,
        notes,
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
        ],
        async () => {
          await db.theme.clear();
          await db.products.clear();
          await db.sales.clear();
          await db.auth.clear();
          await db.dailyCashes.clear();
          await db.payments.clear();
          await db.customers.clear();
          await db.suppliers.clear();
          await db.supplierProducts.clear();
          await db.budgets.clear();
          await db.notes.clear();

          try {
            await db.theme.bulkAdd(data.theme || []);
            await db.products.bulkAdd(data.products || []);
            await db.sales.bulkPut(data.sales || []);
            await db.auth.bulkAdd(data.auth || []);
            await db.dailyCashes.bulkAdd(data.dailyCashes || []);
            await db.payments.bulkAdd(data.payments || []);
            await db.customers.bulkAdd(data.customers || []);
            await db.suppliers.bulkAdd(data.suppliers || []);
            await db.supplierProducts.bulkAdd(data.supplierProducts || []);
            await db.budgets.bulkAdd(data.budgets || []);
            await db.notes.bulkAdd(data.notes || []);
          } catch (e) {
            console.error("Error al importar datos:", e);
            throw e;
          }
        }
      );

      showNotification("Datos importados correctamente", "success");
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
