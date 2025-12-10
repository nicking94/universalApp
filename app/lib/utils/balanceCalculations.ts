import { CreditSale, Payment } from "@/app/lib/types/types";

export const calculateCustomerBalance = (
  customerName: string,
  creditSales: CreditSale[],
  payments: Payment[]
): number => {
  const customerSales = creditSales.filter(
    (sale) => sale.customerName === customerName && !sale.chequeInfo
  );

  const customerPayments = payments.filter((p) =>
    customerSales.some((s) => s.id === p.saleId)
  );

  const totalSales = customerSales.reduce((sum, sale) => sum + sale.total, 0);

  const totalPayments = customerPayments.reduce((sum, p) => {
    if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
      return sum;
    }
    return sum + p.amount;
  }, 0);

  return totalSales - totalPayments;
};
