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

  constructor() {
    super("MyDatabase");
    this.version(14)
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
      })
      .upgrade(async (trans) => {
        await trans
          .table("products")
          .toCollection()
          .modify((product) => {
            product.lot = "";
          });
        const adminUser = await trans
          .table("users")
          .where("username")
          .equals("admin")
          .first();
        if (adminUser) {
          await trans.table("users").delete(adminUser.id);
        }
        return trans
          .table("suppliers")
          .toCollection()
          .modify((supplier) => {
            supplier.rubro = "";
          });
      });
  }
}

export const db = new MyDatabase();
