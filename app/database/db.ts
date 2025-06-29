import Dexie, { Table } from "dexie";
import {
  Product,
  Sale,
  Theme,
  DailyCash,
  Customer,
  Supplier,
  Payment,
  User,
  SupplierProduct,
  UserPreferences,
  BusinessData,
  Budget,
  Note,
  Rubro,
  CustomCategory,
} from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  users!: Table<User, number>;
  auth!: Table<
    { id: number; isAuthenticated: boolean; userId?: number },
    number
  >;
  sales!: Table<Sale, number>;
  dailyCashes!: Table<DailyCash, number>;
  dailyCashMovements!: Table<{ id: number; dailyCashId: number }, number>;
  payments!: Table<Payment, number>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, number>;
  supplierProducts!: Table<SupplierProduct, [number, number]>;
  trialPeriods!: Table<{ userId: number; firstAccessDate: Date }, number>;
  appState!: Table<{ id: number; lastActiveDate: Date }, number>;
  userPreferences!: Table<UserPreferences, number>;
  businessData!: Table<BusinessData, number>;
  budgets!: Table<Budget, string>;
  notes!: Table<Note, number>;
  customCategories!: Table<CustomCategory, number>;

  constructor() {
    super("MyDatabase");
    this.version(16)
      .stores({
        theme: "id",
        products: "++id, name, barcode, stock",
        users: "id, username",
        auth: "id, userId",
        sales:
          "++id, date, *paymentMethod, customerName, customerId, paid, credit",
        dailyCashes: "++id, &date, closed",
        dailyCashMovements: "++id, dailyCashId, date, type",
        payments: "++id, saleId, date, method",
        customers: "&id, name",
        suppliers: "++id, companyName, lastVisit, nextVisit, createdAt, rubro",
        supplierProducts: "[supplierId+productId], supplierId, productId",
        appState: "id",
        trialPeriods: "&userId, firstAccessDate",
        userPreferences: "++id, userId",
        businessData: "++id",
        budgets:
          "++id, customerName, customerPhone, customerId, createdAt, updatedAt, status",
        notes: "++id, customerId, budgetId, createdAt",
        customCategories: "++id, name, rubro, [name+rubro]",
      })
      .upgrade(async (trans) => {
        await trans
          .table("products")
          .toCollection()
          .modify((product: Product) => {
            product.lot = "";
            product.location = "";
            if (product.name) product.name = this.formatString(product.name);
            if (product.barcode)
              product.barcode = this.formatString(product.barcode);
          });

        const adminUser = await trans
          .table("users")
          .where("username")
          .equals("admin")
          .first();
        if (adminUser) {
          await trans.table("users").delete(adminUser.id);
        }

        await trans
          .table("suppliers")
          .toCollection()
          .modify((supplier: Supplier) => {
            if (supplier.companyName)
              supplier.companyName = this.formatString(supplier.companyName);

            if (!supplier.rubro || supplier.rubro.trim() === "") {
              supplier.rubro = "comercio";
            } else {
              const formattedRubro = this.formatString(supplier.rubro) as Rubro;
              supplier.rubro = [
                "todos los rubros",
                "comercio",
                "indumentaria",
              ].includes(formattedRubro)
                ? formattedRubro
                : "comercio";
            }
          });

        await trans
          .table("customers")
          .toCollection()
          .modify((customer: Customer) => {
            if (customer.name) customer.name = this.formatString(customer.name);
            if (customer.id) customer.id = customer.id.toLowerCase();
          });

        await trans
          .table("sales")
          .toCollection()
          .modify((sale: Sale) => {
            if (sale.customerName)
              sale.customerName = this.formatString(sale.customerName);
          });

        await trans
          .table("budgets")
          .toCollection()
          .modify((budget: Budget) => {
            if (budget.customerName)
              budget.customerName = this.formatString(budget.customerName);
          });
        const allProducts = await trans.table("products").toArray();
        const categoriesMap = new Map<string, { name: string; rubro: Rubro }>();

        // Extraer categorías de productos
        allProducts.forEach((product: Product) => {
          if (product.customCategories && product.customCategories.length > 0) {
            product.customCategories.forEach(
              (cat: { name: string; rubro?: Rubro }) => {
                if (cat.name && cat.name.trim()) {
                  const key = `${cat.name.toLowerCase().trim()}_${
                    cat.rubro || product.rubro || "comercio"
                  }`;
                  if (!categoriesMap.has(key)) {
                    categoriesMap.set(key, {
                      name: cat.name.trim(),
                      rubro: cat.rubro || product.rubro || "comercio",
                    });
                  }
                }
              }
            );
          }
          // Compatibilidad con versiones anteriores (campo 'category')
          else if (product.category && product.category.trim()) {
            const key = `${product.category.toLowerCase().trim()}_${
              product.rubro || "comercio"
            }`;
            if (!categoriesMap.has(key)) {
              categoriesMap.set(key, {
                name: product.category.trim(),
                rubro: product.rubro || "comercio",
              });
            }
          }
        });

        // Guardar categorías en la nueva tabla
        const categoriesTable = trans.table("customCategories");
        for (const category of categoriesMap.values()) {
          await categoriesTable.add(category);
        }
      });

    this.setupHooks();
  }

  private setupHooks() {
    // Hook para productos
    this.products.hook("creating", (_primKey, obj: Product) => {
      if (obj.name) obj.name = this.formatString(obj.name);
      if (obj.barcode) obj.barcode = this.formatString(obj.barcode);
      return undefined;
    });

    this.products.hook("updating", (modifications: Partial<Product>) => {
      if (modifications.name)
        modifications.name = this.formatString(modifications.name);
      if (modifications.barcode)
        modifications.barcode = this.formatString(modifications.barcode);
      return undefined;
    });

    // Hook para clientes
    this.customers.hook("creating", (_primKey, obj: Customer) => {
      if (obj.name) obj.name = this.formatString(obj.name);
      if (obj.id) obj.id = obj.id.toLowerCase();
      return undefined;
    });

    this.customers.hook("updating", (modifications: Partial<Customer>) => {
      if (modifications.name)
        modifications.name = this.formatString(modifications.name);
      if (modifications.id) modifications.id = modifications.id?.toLowerCase();
      return undefined;
    });

    this.suppliers.hook("creating", (_primKey, obj: Supplier) => {
      if (obj.companyName) obj.companyName = this.formatString(obj.companyName);
      if (obj.rubro) obj.rubro = this.formatString(obj.rubro) as Rubro;
      return undefined;
    });

    this.suppliers.hook("updating", (modifications: Partial<Supplier>) => {
      if (modifications.companyName) {
        modifications.companyName = this.formatString(
          modifications.companyName
        );
      }
      if (modifications.rubro) {
        modifications.rubro = this.formatString(modifications.rubro) as Rubro;
      }
      return undefined;
    });

    // Hook para ventas
    this.sales.hook("creating", (_primKey, obj: Sale) => {
      if (obj.customerName)
        obj.customerName = this.formatString(obj.customerName);
      return undefined;
    });

    this.sales.hook("updating", (modifications: Partial<Sale>) => {
      if (modifications.customerName)
        modifications.customerName = this.formatString(
          modifications.customerName
        );
      return undefined;
    });

    // Hook para presupuestos
    this.budgets.hook("creating", (_primKey, obj: Budget) => {
      if (obj.customerName)
        obj.customerName = this.formatString(obj.customerName);
      return undefined;
    });

    this.budgets.hook("updating", (modifications: Partial<Budget>) => {
      if (modifications.customerName)
        modifications.customerName = this.formatString(
          modifications.customerName
        );
      return undefined;
    });
  }

  private formatString(str: string): string {
    if (!str || typeof str !== "string") return str;

    return str
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Métodos de búsqueda case-insensitive
  async findProductByName(name: string): Promise<Product[]> {
    const searchTerm = name.toLowerCase();
    return await this.products
      .filter((product) => product.name?.toLowerCase().includes(searchTerm))
      .toArray();
  }

  async findCustomerByName(name: string): Promise<Customer[]> {
    const searchTerm = name.toLowerCase();
    return await this.customers
      .filter((customer) => customer.name?.toLowerCase().includes(searchTerm))
      .toArray();
  }
}

export const db = new MyDatabase();
