import { db } from "@/app/database/db";

export async function exportData() {
  const data = {
    products: await db.products.toArray(),
    sales: await db.sales.toArray(),
    dailyCashes: await db.dailyCashes.toArray(),
    payments: await db.payments.toArray(),
    customers: await db.customers.toArray(),
    suppliers: await db.suppliers.toArray(),
    supplierProducts: await db.supplierProducts.toArray(),
    theme: await db.theme.toArray(),
  };

  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `copia del dia ${new Date().toISOString()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);

        await Promise.all([
          db.products.clear(),
          db.sales.clear(),
          db.dailyCashes.clear(),
          db.payments.clear(),
          db.customers.clear(),
          db.suppliers.clear(),
          db.supplierProducts.clear(),
          db.theme.clear(),
        ]);

        await Promise.all([
          db.products.bulkAdd(data.products),
          db.sales.bulkAdd(data.sales),
          db.dailyCashes.bulkAdd(data.dailyCashes),
          db.payments.bulkAdd(data.payments),
          db.customers.bulkAdd(data.customers),
          db.suppliers.bulkAdd(data.suppliers),
          db.supplierProducts.bulkAdd(data.supplierProducts),
          db.theme.bulkAdd(data.theme),
        ]);

        resolve(true);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
