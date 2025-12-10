// hooks/useCreditSales.ts
import { useState, useCallback } from "react";
import { db } from "@/app/database/db";
import { CreditSale, Payment, Customer } from "@/app/lib/types/types";

export const useCreditSales = () => {
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSales, allPayments, allCustomers] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
        db.customers.toArray(),
      ]);

      const sales = allSales.filter(
        (sale) => sale.credit === true
      ) as CreditSale[];

      setCreditSales(sales);
      setPayments(allPayments);
      setCustomers(allCustomers);

      return { sales, payments: allPayments, customers: allCustomers };
    } catch (error) {
      console.error("Error loading data:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    creditSales,
    payments,
    customers,
    loading,
    fetchData,
    setCreditSales,
    setPayments,
  };
};
