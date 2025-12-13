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
  NotificationType,
  ProductReturn,
  Expense,
  ExpenseCategory,
  DailyCashMovement,
  Promotion,
  PriceList,
  ProductPrice,
} from "../lib/types/types";

class MyDatabase extends Dexie {
  theme!: Table<Theme, number>;
  products!: Table<Product, number>;
  priceLists!: Table<PriceList, number>;
  productPrices!: Table<ProductPrice, [number, number]>;
  users!: Table<User, number>;
  auth!: Table<
    { id: number; isAuthenticated: boolean; userId?: number },
    number
  >;
  sales!: Table<Sale, number>;
  dailyCashes!: Table<DailyCash, number>;
  dailyCashMovements!: Table<DailyCashMovement, number>;
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
  notifications!: Table<NotificationType, number>;
  deletedActualizations!: Table<
    { id?: number; actualizationId: number },
    number
  >;
  returns!: Table<ProductReturn, number>;
  expenses!: Table<Expense, number>;
  expenseCategories!: Table<ExpenseCategory, number>;
  promotions!: Table<Promotion, number>;

  constructor() {
    super("MyDatabase");
    this.version(33)
      .stores({
        theme: "id",
        products:
          "++id, name, barcode, stock, rubro, hasIvaIncluded, priceWithIva, costPriceWithIva, updatedAt",
        returns: "++id, productId, date",
        priceLists: "++id, name, rubro, isDefault",
        productPrices: "[productId+priceListId], productId, priceListId",
        users: "id, username",
        auth: "id, userId",
        sales:
          "++id, date, *paymentMethod, customerName, customerId, paid, credit, chequeInfo",
        dailyCashes: "++id, &date, closed",
        dailyCashMovements:
          "++id, dailyCashId, date, type, paymentMethod, createdAt",
        payments:
          "++id, saleId, date, method, amount, checkStatus, customerId, customerName",
        customers:
          "&id, name, phone, email, address, cuitDni, status, pendingBalance, createdAt, updatedAt, rubro",
        suppliers: "++id, companyName, lastVisit, nextVisit, createdAt, rubro",
        supplierProducts: "[supplierId+productId], supplierId, productId",
        appState: "id",
        trialPeriods: "&userId, firstAccessDate",
        userPreferences:
          "++id, userId, acceptedTerms, acceptedTermsDate, itemsPerPage, appVersion",
        businessData: "++id",
        budgets:
          "++id, customerName, customerPhone, customerId, createdAt, updatedAt, status",
        notes: "++id, customerId, budgetId, createdAt",
        customCategories: "++id, name, rubro, [name+rubro]",
        notifications:
          "++id, title, message, date, read, type, actualizationId, isDeleted, [read+date]",
        deletedActualizations: "++id, actualizationId",
        expenses: "++id, date, amount, description, category, type",
        expenseCategories: "++id, name, rubro, type",
        promotions:
          "++id, name, type, status, startDate, endDate, rubro, [rubro+status]",
      })
      .upgrade(async (trans) => {
        if (trans.db.verno === 33) {
          const rubros = ["comercio", "indumentaria"];

          for (const rubro of rubros) {
            await trans.table("priceLists").add({
              id: Date.now() + Math.random(),
              name: "Precio General",
              rubro: rubro as Rubro,
              isDefault: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          await trans
            .table("products")
            .toCollection()
            .modify((product: Product) => {
              if (!product.updatedAt) {
                product.updatedAt = new Date().toISOString();
              }

              if (!product.createdAt) {
                product.createdAt = new Date().toISOString();
              }
            });

          console.log("Migración de productos completada");
        }

        await trans
          .table("expenseCategories")
          .toCollection()
          .modify((cat: ExpenseCategory) => {
            cat.type = "EGRESO";
          });
        await trans
          .table("expenses")
          .toCollection()
          .modify((expense: Expense) => {
            expense.type = "EGRESO";
          });

        if ((await trans.table("dailyCashMovements").count()) > 0) {
          await trans
            .table("dailyCashMovements")
            .toCollection()
            .modify((movement: DailyCashMovement) => {
              if (movement.type === "EGRESO" && !movement.expenseCategory) {
                movement.expenseCategory = "Otros";
              }

              if (!movement.createdAt) {
                movement.createdAt = new Date().toISOString();
              }
            });
        }

        const deletedSystemNotifs = await trans
          .table("notifications")
          .where("isDeleted")
          .equals(1)
          .filter((n) => n.type === "system")
          .toArray();

        if (deletedSystemNotifs.length > 0) {
          await trans.table("deletedActualizations").bulkAdd(
            deletedSystemNotifs.map((n) => ({
              actualizationId: n.actualizationId!,
            }))
          );
        }

        await trans
          .table("products")
          .toCollection()
          .modify((product: Product) => {
            product.season = "";
            product.lot = "";
            product.location = "";
            if (product.name) product.name = this.formatString(product.name);
            if (product.barcode)
              product.barcode = this.formatString(product.barcode);
            if (!product.rubro || product.rubro.trim() === "") {
              product.rubro = "comercio";
            }
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
                "Todos los rubros",
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
            if (!customer.status || customer.status.trim() === "") {
              customer.status = "activo";
              customer.updatedAt = new Date().toISOString();
            }
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
          } else if (product.category && product.category.trim()) {
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

        const categoriesTable = trans.table("customCategories");
        for (const category of categoriesMap.values()) {
          await categoriesTable.add(category);
        }
      });

    this.setupHooks();
  }

  private setupHooks() {
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

    this.dailyCashMovements.hook(
      "creating",
      (_primKey, obj: DailyCashMovement) => {
        if (!obj.createdAt) {
          obj.createdAt = new Date().toISOString();
        }

        if (!obj.date) {
          const today = new Date();
          obj.date = today.toISOString().split("T")[0];
        }
        return undefined;
      }
    );

    this.dailyCashMovements.hook(
      "updating",
      (modifications: Partial<DailyCashMovement>) => {
        if (modifications && !modifications.createdAt) {
          modifications.createdAt = new Date().toISOString();
        }
        return undefined;
      }
    );

    this.dailyCashes.hook("creating", (_primKey, obj: DailyCash) => {
      if (obj.movements && obj.movements.length > 0) {
        obj.movements = obj.movements.map((movement) => ({
          ...movement,
          createdAt: movement.createdAt || new Date().toISOString(),
          date: movement.date || obj.date,
        }));
      }
      return undefined;
    });

    this.dailyCashes.hook("updating", (modifications: Partial<DailyCash>) => {
      if (modifications.movements && modifications.movements.length > 0) {
        modifications.movements = modifications.movements.map((movement) => ({
          ...movement,
          createdAt: movement.createdAt || new Date().toISOString(),
          date: movement.date || (modifications.date as string),
        }));
      }
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

  async addDailyCashMovement(
    movement: Omit<DailyCashMovement, "id">
  ): Promise<number> {
    const id = await this.dailyCashMovements.add({
      ...movement,
      id: Date.now() + Math.random(),
      createdAt: movement.createdAt || new Date().toISOString(),
    } as DailyCashMovement);
    return id;
  }

  async getDailyCashMovementsByDate(
    date: string
  ): Promise<DailyCashMovement[]> {
    return await this.dailyCashMovements.where("date").equals(date).toArray();
  }

  async getDailyCashMovementsByCashId(
    dailyCashId: number
  ): Promise<DailyCashMovement[]> {
    return await this.dailyCashMovements
      .where("dailyCashId")
      .equals(dailyCashId)
      .toArray();
  }

  async updateDailyCashWithMovements(dailyCashId: number): Promise<void> {
    const movements = await this.getDailyCashMovementsByCashId(dailyCashId);

    const totalIncome = movements
      .filter((m) => m.type === "INGRESO")
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    const totalExpense = movements
      .filter((m) => m.type === "EGRESO")
      .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

    await this.dailyCashes.update(dailyCashId, {
      movements: movements,
      totalIncome,
      totalExpense,
    });
  }

  async addMovementToDailyCash(
    dailyCashId: number,
    movement: Omit<DailyCashMovement, "id" | "dailyCashId">
  ): Promise<void> {
    await this.addDailyCashMovement({
      ...movement,
      dailyCashId,
    });
    await this.updateDailyCashWithMovements(dailyCashId);
  }
}

export const db = new MyDatabase();
