"use client";
import { useState, useCallback } from "react";
import { db } from "@/app/database/db";
import {
  Installment,
  CreditSale,
  PaymentMethod,
  DailyCashMovement,
  DailyCash,
  InstallmentStatus,
} from "@/app/lib/types/types";
import { differenceInDays, isBefore } from "date-fns";
import { getLocalDateString } from "../lib/utils/getLocalDate";
import { calculatePrice } from "../lib/utils/calculations";

export const useCreditInstallments = () => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [overdueInstallments, setOverdueInstallments] = useState<Installment[]>(
    []
  );

  const calculateInstallments = (
    totalAmount: number,
    numberOfInstallments: number,
    interestRate: number,
    startDate: string
  ): Installment[] => {
    const installments: Installment[] = [];
    const monthlyInterest = interestRate / 100;

    const start = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      const dueDate = new Date(start);
      dueDate.setMonth(dueDate.getMonth() + i);
      const interestAmount =
        interestRate > 0
          ? (totalAmount / numberOfInstallments) * monthlyInterest
          : 0;

      const installmentAmount =
        totalAmount / numberOfInstallments + interestAmount;

      const installment: Installment = {
        creditSaleId: 0,
        number: i,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: parseFloat(installmentAmount.toFixed(2)),
        interestAmount: parseFloat(interestAmount.toFixed(2)),
        penaltyAmount: 0,
        status: "pendiente",
        daysOverdue: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      installments.push(installment);
    }

    return installments;
  };

  const getCreditSalesInInstallments = useCallback(async () => {
    try {
      const allSales = await db.sales.toArray();
      const creditSales = allSales.filter(
        (sale) =>
          sale.credit === true &&
          sale.creditType === "credito_cuotas" &&
          sale.customerName
      );

      return creditSales as CreditSale[];
    } catch (error) {
      console.error("Error fetching credit sales in installments:", error);
      return [];
    }
  }, []);

  const checkOverdueInstallments = useCallback(async () => {
    try {
      const today = new Date();
      const creditSales = await getCreditSalesInInstallments();
      const creditSaleIds = creditSales.map((sale) => sale.id);

      if (creditSaleIds.length === 0) {
        setOverdueInstallments([]);
        return [];
      }

      const pendingInstallments = await db.installments
        .where("status")
        .equals("pendiente")
        .and((installment) => creditSaleIds.includes(installment.creditSaleId))
        .toArray();

      const overdue = pendingInstallments.filter((installment) => {
        const dueDate = new Date(installment.dueDate);
        return isBefore(dueDate, today);
      });

      // Actualizar cuotas vencidas en la base de datos
      for (const installment of overdue) {
        const daysOverdue = differenceInDays(
          today,
          new Date(installment.dueDate)
        );
        const penaltyRate = 0.05;
        const penaltyAmount = installment.amount * penaltyRate * daysOverdue;

        await db.installments.update(installment.id!, {
          status: "vencida" as InstallmentStatus,
          penaltyAmount,
          daysOverdue,
          updatedAt: new Date().toISOString(),
        });
      }

      // Obtener las cuotas vencidas actualizadas
      const updatedOverdue = await db.installments
        .where("status")
        .equals("vencida")
        .and((installment) => creditSaleIds.includes(installment.creditSaleId))
        .toArray();

      setOverdueInstallments(updatedOverdue);
      return updatedOverdue;
    } catch (error) {
      console.error("Error checking overdue installments:", error);
      return [];
    }
  }, [getCreditSalesInInstallments]);

  const fetchInstallments = useCallback(
    async (creditSaleId?: number) => {
      setLoading(true);
      try {
        let installmentsData: Installment[];

        if (creditSaleId) {
          const sale = await db.sales.get(creditSaleId);
          if (sale && sale.creditType === "credito_cuotas") {
            installmentsData = await db.installments
              .where("creditSaleId")
              .equals(creditSaleId)
              .toArray();
          } else {
            installmentsData = [];
          }
        } else {
          // Recargar TODO desde la base de datos
          const creditSales = await getCreditSalesInInstallments();
          const creditSaleIds = creditSales.map((sale) => sale.id);

          if (creditSaleIds.length > 0) {
            installmentsData = await db.installments
              .where("creditSaleId")
              .anyOf(creditSaleIds)
              .toArray();
          } else {
            installmentsData = [];
          }
        }

        setInstallments(installmentsData);
        return installmentsData;
      } catch (error) {
        console.error("Error fetching installments:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [getCreditSalesInInstallments]
  );

  const payInstallment = async (
    installmentId: number,
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; updatedInstallment?: Installment }> => {
    try {
      const today = getLocalDateString();
      const installment = await db.installments.get(installmentId);
      if (!installment) throw new Error("Cuota no encontrada");

      const sale = await db.sales.get(installment.creditSaleId);
      if (!sale) throw new Error("Venta no encontrada");

      // Verificar si ya está pagada
      if (installment.status === "pagada") {
        throw new Error("Esta cuota ya fue pagada");
      }

      let totalProfitFromProducts = 0;
      if (sale.products && sale.products.length > 0) {
        const totalSaleAmount = sale.total;
        const installmentRatio = installment.amount / totalSaleAmount;
        const saleTotalProfit = sale.products.reduce((sum, product) => {
          const priceInfo = calculatePrice(
            product,
            product.quantity,
            product.unit
          );
          return sum + priceInfo.profit;
        }, 0);
        totalProfitFromProducts = saleTotalProfit * installmentRatio;
      }

      const now = new Date().toISOString();

      // Crear movimiento de caja
      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: installment.amount,
        description: `Pago cuota #${installment.number} - ${sale.customerName}`,
        type: "INGRESO",
        date: now,
        paymentMethod,
        isCreditPayment: true,
        originalSaleId: sale.id,
        customerName: sale.customerName,
        customerId: sale.customerId,
        profit: totalProfitFromProducts + (installment.interestAmount || 0),
        createdAt: now,
        items:
          sale.products?.map((product) => ({
            productId: product.id,
            productName: product.name,
            quantity: product.quantity,
            unit: product.unit,
            price: product.price,
            costPrice: product.costPrice,
            profit: calculatePrice(product, product.quantity, product.unit)
              .profit,
          })) || [],
      };

      // Actualizar caja diaria
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        const newDailyCash: DailyCash = {
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: installment.amount,
          totalExpense: 0,
          totalProfit:
            totalProfitFromProducts + (installment.interestAmount || 0),
        };
        await db.dailyCashes.add(newDailyCash);
      } else {
        const updatedMovements = [...dailyCash.movements, movement];
        const totalIncome = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        const totalProfit = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + (m.profit || 0), 0);

        await db.dailyCashes.update(dailyCash.id, {
          movements: updatedMovements,
          totalIncome,
          totalProfit,
        });
      }

      // Crear objeto actualizado de la cuota
      const updatedInstallment: Installment = {
        ...installment,
        status: "pagada" as InstallmentStatus,
        paymentDate: now,
        paymentMethod,
        updatedAt: now,
      };

      // Actualizar en la base de datos
      await db.installments.update(installmentId, updatedInstallment);

      // Actualizar el estado local del hook
      setInstallments((prev) =>
        prev.map((inst) =>
          inst.id === installmentId ? updatedInstallment : inst
        )
      );

      // Actualizar estado de cuotas vencidas si es necesario
      if (installment.status === "vencida") {
        setOverdueInstallments((prev) =>
          prev.filter((inst) => inst.id !== installmentId)
        );
      }

      // Actualizar saldo pendiente del cliente
      if (sale.customerId) {
        const customer = await db.customers.get(sale.customerId);
        if (customer) {
          const allCustomerCredits = await db.sales
            .where("customerId")
            .equals(sale.customerId)
            .and((s) => s.credit === true)
            .toArray();

          let totalPending = 0;
          for (const creditSale of allCustomerCredits) {
            const saleInstallments = await db.installments
              .where("creditSaleId")
              .equals(creditSale.id)
              .toArray();

            const pendingAmount = saleInstallments
              .filter(
                (inst) =>
                  inst.status === "pendiente" || inst.status === "vencida"
              )
              .reduce((sum, inst) => sum + inst.amount, 0);

            totalPending += pendingAmount;
          }

          await db.customers.update(sale.customerId, {
            pendingBalance: totalPending,
            updatedAt: now,
          });
        }
      }

      return { success: true, updatedInstallment };
    } catch (error) {
      console.error("Error al pagar la cuota:", error);
      throw error;
    }
  };

  const payAllInstallments = async (
    creditSaleId: number,
    paymentMethod: PaymentMethod
  ): Promise<{ success: boolean; updatedInstallments: Installment[] }> => {
    try {
      const today = getLocalDateString();
      const sale = await db.sales.get(creditSaleId);
      if (!sale) throw new Error("Venta a crédito no encontrada");

      const pendingInstallments = await db.installments
        .where("creditSaleId")
        .equals(creditSaleId)
        .and((inst) => inst.status === "pendiente" || inst.status === "vencida")
        .toArray();

      if (pendingInstallments.length === 0) {
        throw new Error("No hay cuotas pendientes para pagar");
      }

      const totalAmount = pendingInstallments.reduce(
        (sum, inst) => sum + inst.amount,
        0
      );

      let totalProfitFromProducts = 0;
      if (sale.products && sale.products.length > 0) {
        const saleTotalProfit = sale.products.reduce((sum, product) => {
          const priceInfo = calculatePrice(
            product,
            product.quantity,
            product.unit
          );
          return sum + priceInfo.profit;
        }, 0);

        const totalSaleAmount = sale.total;
        const paymentRatio = totalAmount / totalSaleAmount;
        totalProfitFromProducts = saleTotalProfit * paymentRatio;
      }

      const totalInterest = pendingInstallments.reduce(
        (sum, inst) => sum + (inst.interestAmount || 0),
        0
      );

      const now = new Date().toISOString();
      const updatedInstallments: Installment[] = [];

      // Actualizar cada cuota
      for (const installment of pendingInstallments) {
        const updatedInstallment: Installment = {
          ...installment,
          status: "pagada" as InstallmentStatus,
          paymentDate: now,
          paymentMethod,
          updatedAt: now,
        };

        await db.installments.update(installment.id!, updatedInstallment);
        updatedInstallments.push(updatedInstallment);
      }

      // Crear movimiento de caja para el pago total
      const movement: DailyCashMovement = {
        id: Date.now(),
        amount: totalAmount,
        description: `Pago total de ${pendingInstallments.length} cuotas - ${sale.customerName}`,
        type: "INGRESO",
        date: now,
        paymentMethod,
        isCreditPayment: true,
        originalSaleId: sale.id,
        customerName: sale.customerName,
        customerId: sale.customerId,
        profit: totalProfitFromProducts + totalInterest,
        createdAt: now,
        items:
          sale.products?.map((product) => ({
            productId: product.id,
            productName: product.name,
            quantity: product.quantity,
            unit: product.unit,
            price: product.price,
            costPrice: product.costPrice,
            profit: calculatePrice(product, product.quantity, product.unit)
              .profit,
          })) || [],
      };

      // Actualizar caja diaria
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        const newDailyCash: DailyCash = {
          id: Date.now(),
          date: today,
          movements: [movement],
          closed: false,
          totalIncome: totalAmount,
          totalExpense: 0,
          totalProfit: totalProfitFromProducts + totalInterest,
        };
        await db.dailyCashes.add(newDailyCash);
      } else {
        const updatedMovements = [...dailyCash.movements, movement];
        const totalIncome = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        const totalProfit = updatedMovements
          .filter((m) => m.type === "INGRESO")
          .reduce((sum, m) => sum + (m.profit || 0), 0);

        await db.dailyCashes.update(dailyCash.id, {
          movements: updatedMovements,
          totalIncome,
          totalProfit,
        });
      }

      // Actualizar el estado local del hook
      setInstallments((prev) =>
        prev.map((inst) => {
          const updated = updatedInstallments.find((u) => u.id === inst.id);
          return updated ? updated : inst;
        })
      );

      // Actualizar cuotas vencidas
      setOverdueInstallments((prev) =>
        prev.filter(
          (inst) => !updatedInstallments.some((u) => u.id === inst.id)
        )
      );

      // Actualizar saldo pendiente del cliente
      if (sale.customerId) {
        const customer = await db.customers.get(sale.customerId);
        if (customer) {
          const allCustomerCredits = await db.sales
            .where("customerId")
            .equals(sale.customerId)
            .and((s) => s.credit === true)
            .toArray();

          let totalPending = 0;
          for (const creditSale of allCustomerCredits) {
            const saleInstallments = await db.installments
              .where("creditSaleId")
              .equals(creditSale.id)
              .toArray();

            const pendingAmount = saleInstallments
              .filter(
                (inst) =>
                  inst.status === "pendiente" || inst.status === "vencida"
              )
              .reduce((sum, inst) => sum + inst.amount, 0);

            totalPending += pendingAmount;
          }

          await db.customers.update(sale.customerId, {
            pendingBalance: totalPending,
            updatedAt: now,
          });
        }
      }

      return { success: true, updatedInstallments };
    } catch (error) {
      console.error("Error al pagar todas las cuotas:", error);
      throw error;
    }
  };

  const deleteCreditSale = async (
    creditSaleId: number
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const sale = await db.sales.get(creditSaleId);
      if (!sale) {
        throw new Error("Venta a crédito no encontrada");
      }

      // Verificar si hay cuotas pendientes
      const pendingInstallments = await db.installments
        .where("creditSaleId")
        .equals(creditSaleId)
        .and((inst) => inst.status === "pendiente" || inst.status === "vencida")
        .toArray();

      if (pendingInstallments.length > 0) {
        throw new Error(
          `No se puede eliminar. Hay ${pendingInstallments.length} cuotas pendientes.`
        );
      }

      // Eliminar todas las cuotas asociadas
      await db.installments.where("creditSaleId").equals(creditSaleId).delete();

      // Eliminar la venta
      await db.sales.delete(creditSaleId);

      // Actualizar movimientos de caja relacionados si existen
      const dailyCashes = await db.dailyCashes.toArray();
      for (const dailyCash of dailyCashes) {
        const updatedMovements = dailyCash.movements.filter(
          (movement) => movement.originalSaleId !== creditSaleId
        );

        if (updatedMovements.length !== dailyCash.movements.length) {
          await db.dailyCashes.update(dailyCash.id, {
            movements: updatedMovements,
          });
        }
      }

      return {
        success: true,
        message: "Crédito eliminado correctamente",
      };
    } catch (error) {
      console.error("Error al eliminar el crédito:", error);
      throw error;
    }
  };

  const generateCreditReport = useCallback(
    async (startDate: string, endDate: string) => {
      try {
        const creditSalesData = (await db.sales
          .where("creditType")
          .equals("credito_cuotas")
          .toArray()) as CreditSale[];

        const creditSaleIds = creditSalesData.map((sale) => sale.id);
        let allInstallments: Installment[] = [];

        if (creditSaleIds.length > 0) {
          allInstallments = await db.installments
            .where("creditSaleId")
            .anyOf(creditSaleIds)
            .and((installment) => {
              const dueDate = new Date(installment.dueDate);
              return (
                dueDate >= new Date(startDate) && dueDate <= new Date(endDate)
              );
            })
            .toArray();
        }

        const report = {
          period: { startDate, endDate },
          totalCreditSales: creditSalesData.length,
          totalAmount: creditSalesData.reduce(
            (sum, sale) => sum + sale.total,
            0
          ),
          installmentsByStatus: {
            pendiente: allInstallments.filter((i) => i.status === "pendiente")
              .length,
            pagada: allInstallments.filter((i) => i.status === "pagada").length,
            vencida: allInstallments.filter((i) => i.status === "vencida")
              .length,
          },
          totalInterest: allInstallments.reduce(
            (sum, i) => sum + i.interestAmount,
            0
          ),
          totalPenalties: allInstallments.reduce(
            (sum, i) => sum + i.penaltyAmount,
            0
          ),
          overdueInstallments: allInstallments.filter(
            (i) => i.status === "vencida"
          ),
        };

        return report;
      } catch (error) {
        console.error("Error generating credit report:", error);
        throw error;
      }
    },
    []
  );

  return {
    installments,
    loading,
    overdueInstallments,
    calculateInstallments,
    checkOverdueInstallments,
    fetchInstallments,
    payInstallment,
    payAllInstallments,
    generateCreditReport,
    setInstallments,
    getCreditSalesInInstallments,
    deleteCreditSale,
  };
};
