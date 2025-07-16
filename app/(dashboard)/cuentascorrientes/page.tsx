"use client";
import { useEffect, useState } from "react";
import Select, { SingleValue } from "react-select";
import { db } from "@/app/database/db";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";
import {
  ChequeFilter,
  CreditSale,
  Customer,
  DailyCashMovement,
  Payment,
  PaymentMethod,
  PaymentSplit,
} from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { CheckCircle, Info, Plus, Trash, Wallet } from "lucide-react";
import Pagination from "@/app/components/Pagination";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";
import { usePagination } from "@/app/context/PaginationContext";

const CuentasCorrientesPage = () => {
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();
  const [creditSales, setCreditSales] = useState<CreditSale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: 0 },
  ]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentCreditSale, setCurrentCreditSale] = useState<CreditSale | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [currentCustomerInfo, setCurrentCustomerInfo] = useState<{
    name: string;
    balance: number;
    sales: CreditSale[];
  } | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isChequesModalOpen, setIsChequesModalOpen] = useState(false);
  const [currentCustomerCheques, setCurrentCustomerCheques] = useState<
    Payment[]
  >([]);
  const [chequeFilter, setChequeFilter] = useState<
    "todos" | "pendiente" | "cobrado"
  >("todos");

  const filteredSales = creditSales
    .filter((sale) => {
      const matchesSearch = sale.customerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesRubro =
        rubro === "Todos los rubros" ||
        sale.products.some((product) => product.rubro === rubro);

      return matchesSearch && matchesRubro;
    })
    .sort((a, b) => {
      if (a.paid !== b.paid) {
        return a.paid ? 1 : -1;
      }

      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  const salesByCustomer = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.customerName]) {
      acc[sale.customerName] = [];
    }
    acc[sale.customerName].push(sale);
    return acc;
  }, {} as Record<string, CreditSale[]>);

  const sortedCustomerNames = Object.keys(salesByCustomer).sort((a, b) => {
    const customerAHasUnpaid = salesByCustomer[a].some((sale) => !sale.paid);
    const customerBHasUnpaid = salesByCustomer[b].some((sale) => !sale.paid);
    if (customerAHasUnpaid !== customerBHasUnpaid) {
      return customerAHasUnpaid ? -1 : 1;
    }
    return a.localeCompare(b);
  });

  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const uniqueCustomers = Object.keys(salesByCustomer);
  const totalCustomers = uniqueCustomers.length;
  const indexOfLastCredit = currentPage * itemsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - itemsPerPage;
  const currentCustomers = sortedCustomerNames.slice(
    indexOfFirstCredit,
    indexOfLastCredit
  );

  const isFirstGreater = (a: number, b: number, epsilon = 0.01) => {
    return a - b > epsilon;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allSales = await db.sales.toArray();
        const sales = allSales.filter((sale) => sale.credit === true);

        const [payments, customers] = await Promise.all([
          db.payments.toArray(),
          db.customers.toArray(),
        ]);

        setCreditSales(sales as CreditSale[]);
        setPayments(payments);
        setCustomers(customers);
      } catch (error) {
        console.error("Error loading data:", error);
        showNotification("Error al cargar las cuentas corrientes", "error");
      }
    };

    fetchData();
  }, []);

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 2500);
  };

  const calculateCustomerBalance = (customerName: string) => {
    const customerSales = creditSales.filter(
      (sale) => sale.customerName === customerName
    );

    const customerPayments = payments.filter((p) =>
      customerSales.some((s) => s.id === p.saleId)
    );

    const totalSales = customerSales.reduce((sum, sale) => sum + sale.total, 0);

    // Solo contar pagos no eliminados (cheques cobrados y otros métodos)
    const totalPayments = customerPayments.reduce((sum, p) => {
      // No sumar cheques pendientes o eliminados
      if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
        return sum;
      }
      return sum + p.amount;
    }, 0);

    return totalSales - totalPayments;
  };

  const calculateRemainingBalance = (sale: CreditSale) => {
    if (!sale) return 0;

    const salePayments = payments.filter((p) => p.saleId === sale.id);

    const totalPayments = salePayments.reduce((sum, p) => {
      // No contar cheques pendientes o eliminados
      if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
        return sum;
      }
      return sum + p.amount;
    }, 0);

    return sale.total - totalPayments;
  };

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => {
      if (prev.length >= paymentOptions.length) return prev;

      const total = calculateRemainingBalance(currentCreditSale!);

      const usedMethods = prev.map((m) => m.method);
      const availableMethod = paymentOptions.find(
        (option) => !usedMethods.includes(option.value as PaymentMethod)
      );

      if (!availableMethod) return prev;
      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = total / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: availableMethod.value as PaymentMethod,
            amount: share,
          },
        ];
      }

      return [
        ...prev,
        {
          method: availableMethod.value as PaymentMethod,
          amount: 0,
        },
      ];
    });
  };

  const addIncomeToDailyCash = async (sale: CreditSale) => {
    try {
      const today = getLocalDateString();
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      const totalSaleAmount = sale.total;
      const totalProfit = sale.products.reduce((sum, product) => {
        const productProfit =
          (product.price - (product.costPrice || 0)) * product.quantity;
        return sum + productProfit;
      }, 0);

      sale.paymentMethods.forEach((payment) => {
        const paymentRatio = payment.amount / totalSaleAmount;
        const paymentProfit = totalProfit * paymentRatio;

        movements.push({
          id: Date.now(),
          amount: payment.amount,
          description: `Cuenta corriente de ${sale.customerName}`,
          type: "INGRESO",
          date: new Date().toISOString(),
          paymentMethod: payment.method,
          items: sale.products.map((p) => ({
            productId: p.id,
            productName: p.name,
            quantity: p.quantity,
            unit: p.unit,
            price: p.price,
          })),
          profit: paymentProfit,
          isCreditPayment: true,
          originalSaleId: sale.id,
        });
      });

      if (!dailyCash) {
        dailyCash = {
          id: Date.now(),
          date: today,
          initialAmount: 0,
          movements: movements,
          closed: false,
          totalIncome: movements.reduce((sum, m) => sum + m.amount, 0),
          totalExpense: 0,
          totalProfit: movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.add(dailyCash);
      } else {
        const updatedCash = {
          ...dailyCash,
          movements: [...dailyCash.movements, ...movements],
          totalIncome:
            (dailyCash.totalIncome || 0) +
            movements.reduce((sum, m) => sum + m.amount, 0),
          totalProfit:
            (dailyCash.totalProfit || 0) +
            movements.reduce((sum, m) => sum + (m.profit || 0), 0),
        };
        await db.dailyCashes.update(dailyCash.id, updatedCash);
      }
    } catch (error) {
      console.error("Error al registrar ingreso en caja diaria:", error);
      throw error;
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };
  const handleMarkCheckAsPaid = async (checkId: number) => {
    try {
      // Actualizar el pago en la tabla payments
      await db.payments.update(checkId, { checkStatus: "cobrado" });

      // Actualizar la información del cheque en la venta correspondiente
      const payment = await db.payments.get(checkId);
      if (payment) {
        await db.sales.update(payment.saleId, {
          "chequeInfo.status": "cobrado",
        } as Partial<CreditSale>);
      }

      // Actualizar el estado local
      const updatedPayments = await db.payments.toArray();
      const updatedSales = await db.sales.toArray();

      setPayments(updatedPayments);
      setCreditSales(updatedSales.filter((s) => s.credit) as CreditSale[]);
      setCurrentCustomerCheques(
        currentCustomerCheques.map((c) =>
          c.id === checkId ? { ...c, checkStatus: "cobrado" } : c
        )
      );

      showNotification("Cheque marcado como cobrado", "success");
    } catch (error) {
      console.error("Error al actualizar estado del cheque:", error);
      showNotification("Error al actualizar cheque", "error");
    }
  };
  const handleDeleteCheck = async (checkId: number) => {
    try {
      const cheque = await db.payments.get(checkId);
      if (!cheque) {
        showNotification("Cheque no encontrado", "error");
        return;
      }

      // Eliminar el cheque
      await db.payments.delete(checkId);

      // Actualizar el estado de la venta relacionada
      if (cheque.saleId) {
        const sale = await db.sales.get(cheque.saleId);
        if (sale) {
          // Calcular el nuevo estado de pago
          const remainingPayments = await db.payments
            .where("saleId")
            .equals(cheque.saleId)
            .toArray();

          const totalPaid = remainingPayments.reduce((sum, p) => {
            if (p.method === "CHEQUE" && p.checkStatus !== "cobrado") {
              return sum;
            }
            return sum + p.amount;
          }, 0);

          const updates: Partial<CreditSale> = {
            paid: totalPaid >= sale.total - 0.01, // Considerar márgenes de redondeo
          };

          // Si el cheque eliminado era el único pago, limpiar chequeInfo
          if (remainingPayments.length === 0) {
            updates.chequeInfo = undefined;
          }

          await db.sales.update(cheque.saleId, updates);
        }
      }

      // Actualizar estados locales
      const [updatedPayments, updatedSales] = await Promise.all([
        db.payments.toArray(),
        db.sales.toArray(),
      ]);

      setPayments(updatedPayments);
      setCreditSales(updatedSales.filter((s) => s.credit) as CreditSale[]);

      // Actualizar cheques del cliente en el modal
      setCurrentCustomerCheques(
        currentCustomerCheques.filter((c) => c.id !== checkId)
      );

      // Actualizar información del cliente si está abierto el modal
      if (currentCustomerInfo) {
        const customerSales = updatedSales.filter(
          (s) => s.credit && s.customerName === currentCustomerInfo.name
        ) as CreditSale[];

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          balance: calculateCustomerBalance(currentCustomerInfo.name),
          sales: customerSales,
        });
      }

      showNotification("Cheque eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar cheque:", error);
      showNotification("Error al eliminar cheque", "error");
    }
  };
  const handleDeleteCustomerCredits = async () => {
    if (!customerToDelete) return;

    try {
      // Modificar la búsqueda para que coincida con el formato de la base de datos
      const customer = customers.find((c) => c.name === customerToDelete);

      if (!customer) {
        showNotification("Cliente no encontrado", "error");
        return;
      }

      const salesToDelete = creditSales
        .filter((sale) => sale.customerName === customerToDelete)
        .map((sale) => sale.id);

      await db.sales.bulkDelete(salesToDelete);
      await db.payments.where("saleId").anyOf(salesToDelete).delete();

      setCreditSales(
        creditSales.filter((sale) => sale.customerName !== customerToDelete)
      );
      setPayments(payments.filter((p) => !salesToDelete.includes(p.saleId)));

      showNotification(
        `Todas las cuentas corrientes de ${customerToDelete} eliminadas`,
        "success"
      );
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setIsInfoModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar cuentas corrientes:", error);
      showNotification("Error al eliminar cuentas corrientes", "error");
    }
  };

  const validateCurrency = (value: string): boolean => {
    return /^\d+(\.\d{1,2})?$/.test(value);
  };

  const handlePayment = async () => {
    const invalidPayment = paymentMethods.some(
      (method) => !validateCurrency(method.amount.toString())
    );

    if (invalidPayment) {
      showNotification("Los montos deben tener hasta 2 decimales", "error");
      return;
    }
    if (!currentCreditSale) return;

    const totalPayment = parseFloat(
      paymentMethods.reduce((sum, method) => sum + method.amount, 0).toFixed(2)
    );
    const remainingBalance = parseFloat(
      calculateRemainingBalance(currentCreditSale).toFixed(2)
    );

    if (totalPayment <= 0) {
      showNotification("El monto debe ser mayor a cero", "error");
      return;
    }

    if (isFirstGreater(totalPayment, remainingBalance)) {
      showNotification("El monto excede el saldo pendiente", "error");
      return;
    }

    try {
      const [updatedSales, updatedPayments] = await Promise.all([
        db.sales.toArray(),
        db.payments.toArray(),
      ]);

      setCreditSales(
        updatedSales.filter((sale) => sale.credit === true) as CreditSale[]
      );
      setPayments(updatedPayments);
      for (const method of paymentMethods) {
        if (method.amount > 0) {
          const newPayment: Payment = {
            id: Date.now() + Math.random(),
            saleId: currentCreditSale.id,
            saleDate: currentCreditSale.date,
            amount: method.amount,
            date: new Date().toISOString(),
            method: method.method,
          };
          await db.payments.add(newPayment);
        }
      }

      const newRemainingBalance = remainingBalance - totalPayment;

      if (newRemainingBalance <= 0.01) {
        await db.sales.update(currentCreditSale.id, {
          paid: true,
        } as Partial<CreditSale>);
      }

      const allSales = await db.sales.toArray();
      const sales = allSales.filter((sale) => sale.credit === true);
      const allPayments = await db.payments.toArray();

      setCreditSales(sales as CreditSale[]);
      setPayments(allPayments);

      if (newRemainingBalance <= 0.01) {
        const saleToRegister: CreditSale = {
          ...currentCreditSale,
          total: totalPayment,
          paid: true,
          paymentMethods: paymentMethods.filter((m) => m.amount > 0),
        };
        await addIncomeToDailyCash(saleToRegister);
      }

      showNotification("Pago registrado correctamente", "success");
      setIsPaymentModalOpen(false);
      setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);

      if (currentCustomerInfo) {
        const updatedSales = (await db.sales
          .where("customerName")
          .equals(currentCustomerInfo.name)
          .toArray()) as CreditSale[];

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          balance:
            updatedSales.reduce((total, sale) => total + (sale.total || 0), 0) -
            allPayments
              .filter((p) => updatedSales.some((s) => s.id === p.saleId))
              .reduce((sum, p) => sum + p.amount, 0),
          sales: updatedSales,
        });
      }
    } catch (error) {
      console.error("Error al registrar pago:", error);
      showNotification("Error al registrar pago", "error");
    }
  };

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setPaymentMethods((prev) => {
      const updated = [...prev];
      const remainingBalance = calculateRemainingBalance(currentCreditSale!);

      if (field === "amount") {
        const numericValue = typeof value === "number" ? value : 0;

        updated[index] = {
          ...updated[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };

        if (updated.length === 2) {
          const totalPayment = updated.reduce((sum, m) => sum + m.amount, 0);
          const difference = remainingBalance - totalPayment;

          if (difference !== 0) {
            const otherIndex = index === 0 ? 1 : 0;
            updated[otherIndex].amount = Math.max(
              0,
              updated[otherIndex].amount + difference
            );
          }
        }
      } else {
        updated[index] = {
          ...updated[index],
          method: value as PaymentMethod,
        };
      }
      return updated;
    });
  };

  const removePaymentMethod = (index: number) => {
    setPaymentMethods((prev) => {
      if (prev.length <= 1) return prev;

      const updatedMethods = [...prev];
      updatedMethods.splice(index, 1);

      const total = calculateRemainingBalance(currentCreditSale!);

      if (updatedMethods.length === 1) {
        updatedMethods[0].amount = total;
      } else {
        const share = total / updatedMethods.length;
        updatedMethods.forEach((m, i) => {
          updatedMethods[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return updatedMethods;
    });
  };

  const handleOpenChequesModal = async (customerName: string) => {
    try {
      // Obtener todos los cheques del cliente
      const customerCheques = await db.payments
        .where("method")
        .equals("CHEQUE")
        .and((p) => p.customerName === customerName)
        .toArray();

      // Obtener información adicional de las ventas relacionadas
      const chequesWithDetails = await Promise.all(
        customerCheques.map(async (cheque) => {
          const sale = await db.sales.get(cheque.saleId);
          return {
            ...cheque,
            saleDate: sale?.date || "",
            products: sale?.products || [],
          };
        })
      );

      setCurrentCustomerCheques(chequesWithDetails);
      setIsChequesModalOpen(true);
    } catch (error) {
      console.error("Error al cargar cheques:", error);
      showNotification("Error al cargar cheques del cliente", "error");
    }
  };
  const handleOpenInfoModal = (sale: CreditSale) => {
    const customerSales = creditSales.filter(
      (cs) => cs.customerName === sale.customerName
    );

    setCurrentCustomerInfo({
      name: sale.customerName,
      balance: calculateCustomerBalance(sale.customerName),
      sales: customerSales,
    });
    setIsInfoModalOpen(true);
  };

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">
          Cuentas corrientes
        </h1>
        <div className="w-full mb-2">
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)] ">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-sm 2xl:text-lg">
                <tr className="text-xs lg:text-md 2xl:text-lg">
                  <th className="p-2 text-start">Cliente</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Deuda</th>
                  <th className="w-40 max-w-40 p-2">Acciones</th>
                </tr>
              </thead>
              <tbody
                className={`bg-white text-gray_b divide-y divide-gray_xl `}
              >
                {totalCustomers > 0 ? (
                  currentCustomers.map((customerName) => {
                    const sales = salesByCustomer[customerName];
                    const customerBalance =
                      calculateCustomerBalance(customerName);
                    const sortedSales = [...sales].sort(
                      (a, b) =>
                        new Date(a.date).getTime() - new Date(b.date).getTime()
                    );
                    const oldestSale = sortedSales[0];

                    return (
                      <tr key={customerName}>
                        <td className="font-semibold p-2 border border-gray_xl text-start">
                          {customerName}
                        </td>
                        <td className="p-2 border border-gray_xl">
                          {format(new Date(oldestSale.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </td>
                        <td
                          className={`font-semibold p-2 border border-gray_xl ${
                            customerBalance <= 0 ? "text-green_b" : "text-red_b"
                          }`}
                        >
                          {customerBalance.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td className="p-2 border border-gray_xl">
                          <div className="flex justify-center items-center h-full gap-2">
                            <Button
                              icon={<Wallet size={20} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              px="px-2"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() =>
                                handleOpenChequesModal(customerName)
                              }
                              title="Ver cheques"
                            />
                            <Button
                              icon={<Info size={20} />}
                              iconPosition="left"
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              px="px-2"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => handleOpenInfoModal(oldestSale)}
                            />

                            <Button
                              icon={<Trash size={20} />}
                              iconPosition="left"
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-red_m"
                              px="px-2"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => {
                                setCustomerToDelete(customerName);
                                setIsDeleteModalOpen(true);
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td colSpan={4} className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                        <Wallet size={64} className="mb-4 text-gray_m" />
                        <p className="text-gray_m">
                          No hay cuentas corrientes registradas.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalCustomers > 0 && (
            <Pagination
              text="Cuentas corrientes por página"
              text2="Total de cuentas corrientes"
              totalItems={totalCustomers}
            />
          )}
        </div>
        <Modal
          isOpen={isChequesModalOpen}
          onClose={() => setIsChequesModalOpen(false)}
          title={`Cheques de ${currentCustomerInfo?.name || "Cliente"}`}
          minheight="min-h-[50vh]"
          buttons={
            <div className="flex justify-end">
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsChequesModalOpen(false)}
              />
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium">Filtrar por estado:</label>
              <select
                value={chequeFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setChequeFilter(e.target.value as ChequeFilter)
                }
                className="border border-gray_xl rounded p-1"
              >
                <option value="todos">Todos</option>
                <option value="pendiente">Pendientes</option>
                <option value="cobrado">Cobrados</option>
              </select>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border text-left">Monto</th>
                    <th className="p-2 border">Fecha</th>

                    <th className="p-2 border">Estado</th>
                    <th className="p-2 border">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomerCheques
                    .filter(
                      (cheque) =>
                        chequeFilter === "todos" ||
                        cheque.checkStatus === chequeFilter
                    )
                    .map((cheque, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 border text-left">
                          {cheque.amount.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td className="p-2 border text-center">
                          {format(new Date(cheque.date), "dd/MM/yyyy")}
                        </td>

                        <td className="p-2 border text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              cheque.checkStatus === "cobrado"
                                ? "bg-green-100 text-green-800"
                                : cheque.checkStatus === "pendiente"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {cheque.checkStatus || "pendiente"}
                          </span>
                        </td>
                        <td className="p-2 border text-center">
                          <div className="flex justify-center items-center gap-2">
                            {cheque.checkStatus === "pendiente" && (
                              <>
                                <Button
                                  icon={<CheckCircle size={16} />}
                                  onClick={() =>
                                    handleMarkCheckAsPaid(cheque.id)
                                  }
                                  colorText="text-white"
                                  colorTextHover="hover:text-white"
                                  colorBg="bg-green_b"
                                  colorBgHover="hover:bg-green_m"
                                  minwidth="min-w-0"
                                  title="Marcar como cobrado"
                                />

                                <Button
                                  icon={<Trash size={20} />}
                                  iconPosition="left"
                                  colorText="text-gray_b"
                                  colorTextHover="hover:text-white"
                                  colorBg="bg-transparent"
                                  colorBgHover="hover:bg-red_m"
                                  px="px-2"
                                  py="py-1"
                                  minwidth="min-w-0"
                                  onClick={() => {
                                    handleDeleteCheck(cheque.id);
                                  }}
                                  title="Eliminar cheque"
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          title={`Cuentas corrientes de ${currentCustomerInfo?.name}`}
          buttons={
            <div className="w-full flex justify-end">
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsInfoModalOpen(false)}
                hotkey="Escape"
              />
            </div>
          }
        >
          <div className=" max-h-[70vh] overflow-y-auto space-y-6">
            <div className="bg-gradient-to-bl from-blue_l to-blue_xl dark:from-gray_m dark:to-gray_b p-4 rounded-lg shadow-sm shadow-blue_ll dark:shadow-gray_m">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray_b dark:text-white">
                    Cliente
                  </h3>
                  <p className="text-sm text-gray_m dark:text-gray_xl mt-1">
                    {currentCustomerInfo?.name}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-gray_b dark:text-white mb-2">
                    Estado
                  </h3>
                  <p
                    className={`uppercase min-w-20 text-center text-sm px-2 py-1 rounded-md text-white font-bold ${
                      (currentCustomerInfo?.balance ?? 0) <= 0
                        ? "bg-green_b"
                        : "bg-red_m "
                    }`}
                  >
                    {(currentCustomerInfo?.balance ?? 0) <= 0
                      ? "Al día"
                      : "En deuda"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-blue_m dark:bg-gray_m p-3 rounded-lg shadow text-white text-lg font-semibold">
                  <p>Total </p>
                  <p>
                    {currentCustomerInfo?.sales
                      .reduce((sum, sale) => sum + sale.total, 0)
                      .toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                  </p>
                </div>
                <div className="bg-blue_m dark:bg-gray_m p-3 rounded-lg shadow text-white text-lg font-semibold">
                  <p>Total pagado</p>
                  <p>
                    {currentCustomerInfo?.sales
                      .reduce((sum, sale) => {
                        const paymentsForSale = payments
                          .filter((p) => p.saleId === sale.id)
                          .reduce((sum, p) => sum + p.amount, 0);
                        return sum + paymentsForSale;
                      }, 0)
                      .toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                  </p>
                </div>
                <div className="bg-blue_m dark:bg-gray_m p-3 rounded-lg shadow text-white text-lg font-semibold">
                  <p>Saldo pendiente</p>
                  <p>
                    {(currentCustomerInfo?.balance ?? 0).toLocaleString(
                      "es-AR",
                      {
                        style: "currency",
                        currency: "ARS",
                      }
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <h3 className="font-semibold mb-3 text-lg border-b pb-2">
                Historial de cuentas corrientes
              </h3>

              {currentCustomerInfo?.sales
                .sort((a, b) => {
                  const aBalance = calculateRemainingBalance(a);
                  const bBalance = calculateRemainingBalance(b);
                  const aPaid = aBalance <= 0;
                  const bPaid = bBalance <= 0;
                  if (aPaid !== bPaid) {
                    return aPaid ? 1 : -1;
                  }
                  return (
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                })
                .map((sale) => {
                  const totalPayments = payments
                    .filter((p) => p.saleId === sale.id)
                    .reduce((sum, p) => sum + p.amount, 0);
                  const remainingBalance = sale.total - totalPayments;
                  const isPaid = remainingBalance <= 0;

                  return (
                    <div
                      key={sale.id}
                      className={`mb-4 p-4 rounded-lg shadow-sm ${
                        isPaid &&
                        (!sale.chequeInfo ||
                          sale.chequeInfo.status === "cobrado")
                          ? "bg-green_xl dark:bg-green_l shadow-green_l border-t border-green_l"
                          : "bg-red_xl dark:bg-red_l shadow-red_l border-t border-red_l"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3 ">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray_b font-semibold">
                            {format(new Date(sale.date), "dd/MM/yyyy", {
                              locale: es,
                            })}
                          </span>
                          {sale.chequeInfo && (
                            <div
                              className={` p-2 rounded-md ${
                                sale.chequeInfo.status === "cobrado"
                                  ? " text-green-800"
                                  : " text-yellow-800"
                              }`}
                            >
                              <p className="font-semibold ">
                                Pago con Cheque -{" "}
                                {sale.chequeInfo.status.toUpperCase()}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          {!isPaid && (
                            <Button
                              py="py-1"
                              px="px-1"
                              minwidth="min-w-20"
                              colorText="text-white"
                              colorTextHover="hover:text-white"
                              text="Pagar"
                              onClick={() => {
                                setCurrentCreditSale(sale);
                                setIsPaymentModalOpen(true);
                                setIsInfoModalOpen(false);
                              }}
                            />
                          )}
                        </div>
                      </div>

                      <div className="mb-1">
                        <h4 className="text-sm text-gray_b font-medium mb-1">
                          Detalles
                        </h4>
                        <div className="bg-white dark:bg-gray_m rounded-md p-2">
                          <table className="w-full text-sm">
                            <thead className="text-md">
                              <tr className="text-xs border-b">
                                <th className="text-left py-1">Producto</th>
                                <th className="text-right py-1">Cantidad</th>
                                <th className="text-right py-1">Precio</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sale.products.map((product, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b last:border-b-0"
                                >
                                  <td className="py-1">
                                    {getDisplayProductName(
                                      {
                                        name: product.name,
                                        size: product.size,
                                        color: product.color,
                                        rubro: product.rubro,
                                      },
                                      rubro,
                                      true
                                    )}
                                  </td>
                                  <td className="text-right py-1">
                                    {product.quantity} {product.unit}
                                  </td>
                                  <td className="text-right py-1">
                                    {product.price.toLocaleString("es-AR", {
                                      style: "currency",
                                      currency: "ARS",
                                    })}
                                  </td>
                                </tr>
                              ))}

                              {sale.manualAmount === undefined ||
                                (sale.manualAmount > 0 && (
                                  <tr className="border-b last:border-b-0">
                                    <td className="py-1">
                                      Monto manual adicional
                                    </td>
                                    <td className="text-right py-1">-</td>
                                    <td className="text-right py-1">
                                      {sale.manualAmount.toLocaleString(
                                        "es-AR",
                                        {
                                          style: "currency",
                                          currency: "ARS",
                                        }
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-md font-semibold">
                        <div
                          className={` p-2 rounded ${
                            isPaid
                              ? "bg-white dark:bg-green_b"
                              : "bg-white dark:bg-red_b"
                          }`}
                        >
                          <p>Saldo pendiente:</p>
                          <p
                            className={
                              isPaid
                                ? "text-green_b"
                                : "text-red_b dark:text-white"
                            }
                          >
                            {remainingBalance.toLocaleString("es-AR", {
                              style: "currency",
                              currency: "ARS",
                            })}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray_m p-2 rounded">
                          <p>Pagado:</p>
                          <p>
                            {totalPayments.toLocaleString("es-AR", {
                              style: "currency",
                              currency: "ARS",
                            })}
                          </p>
                        </div>

                        <div className="bg-white dark:bg-gray_m p-2 rounded">
                          <p>Total:</p>
                          <p>
                            {sale.total.toLocaleString("es-AR", {
                              style: "currency",
                              currency: "ARS",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title={`Registrar Pago - ${
            currentCreditSale?.customerName || "Cliente"
          }`}
          buttons={
            <>
              <Button
                hotkey="enter"
                text="Registrar"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handlePayment}
                disabled={
                  paymentMethods.reduce((sum, m) => sum + m.amount, 0) <= 0 ||
                  isFirstGreater(
                    paymentMethods.reduce((sum, m) => sum + m.amount, 0),
                    calculateRemainingBalance(currentCreditSale!)
                  )
                }
              />
              <Button
                hotkey="esc"
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
                }}
              />
            </>
          }
        >
          <div className="space-y-6">
            <div>
              <p className="flex items-center gap-2">
                <div className="flex justify-between w-full ">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">Deuda pendiente:</span>
                    <span
                      className={`px-2 py-1 rounded text-white font-semibold`}
                    >
                      {calculateRemainingBalance(
                        currentCreditSale!
                      ).toLocaleString("es-AR", {
                        style: "currency",
                        currency: "ARS",
                      })}
                    </span>
                  </div>
                  <Button
                    type="button"
                    text="Pagar todo"
                    colorText="text-white"
                    colorTextHover="text-white"
                    minwidth="min-w-20"
                    py="py-1"
                    px="px-2"
                    onClick={() => {
                      const remaining = calculateRemainingBalance(
                        currentCreditSale!
                      );
                      setPaymentMethods([
                        { method: "EFECTIVO", amount: remaining },
                      ]);
                    }}
                  />
                </div>
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Métodos de Pago
              </label>
              {paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Select
                    noOptionsMessage={() => "No se encontraron opciones"}
                    value={paymentOptions.find(
                      (option) => option.value === method.method
                    )}
                    onChange={(
                      selectedOption: SingleValue<{
                        value: string;
                        label: string;
                      }>
                    ) =>
                      handlePaymentMethodChange(
                        index,
                        "method",
                        (selectedOption?.value as PaymentMethod) || "EFECTIVO"
                      )
                    }
                    options={paymentOptions}
                    className="text-gray_m min-w-40"
                    classNamePrefix="react-select"
                  />
                  <InputCash
                    value={method.amount}
                    onChange={(value) =>
                      handlePaymentMethodChange(index, "amount", value)
                    }
                    className="w-32"
                  />
                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      className="bg-red_m rounded p-2 cursor-pointer text-red_l  transition-all duration-300"
                    >
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              ))}
              {paymentMethods.length < 3 && (
                <button
                  type="button"
                  onClick={addPaymentMethod}
                  className="cursor-pointer text-sm text-blue_b dark:text-blue_l hover:text-blue_xl flex items-center transition-all duration-300 mt-4"
                >
                  <Plus size={16} className="mr-1" /> Agregar otro método
                </button>
              )}
            </div>

            <div className="p-2 bg-gray_b dark:bg-gray_m text-white text-center mt-4">
              <p className="font-semibold uppercase py-2 text-2xl">
                Total a pagar:{" "}
                {paymentMethods
                  .reduce((sum, m) => sum + m.amount, 0)
                  .toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
              </p>
              {paymentMethods.reduce((sum, m) => sum + m.amount, 0) >
                calculateRemainingBalance(currentCreditSale!) && (
                <p className="text-red_m text-md">
                  El monto total excede la deuda pendiente
                </p>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Cuentas corrientes"
          buttons={
            <>
              <Button
                text="Si"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={handleDeleteCustomerCredits}
                hotkey="Enter"
              />
              <Button
                text="No"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsDeleteModalOpen(false)}
                hotkey="Escape"
              />
            </>
          }
        >
          <div className="space-y-6">
            <p>
              ¿Está seguro que desea eliminar TODAS las cuentas corrientes de{" "}
              {customerToDelete}?
            </p>
            <p className="font-semibold text-red_b">
              Deuda pendiente:{" "}
              {calculateCustomerBalance(customerToDelete || "").toLocaleString(
                "es-AR",
                {
                  style: "currency",
                  currency: "ARS",
                }
              )}
            </p>
          </div>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </div>
    </ProtectedRoute>
  );
};

export default CuentasCorrientesPage;
