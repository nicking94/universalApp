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
  CreditSale,
  Customer,
  DailyCashMovement,
  Payment,
  PaymentMethod,
  PaymentSplit,
  Product,
} from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { Info, Plus, Trash, Wallet } from "lucide-react";
import Pagination from "@/app/components/Pagination";
import InputCash from "@/app/components/InputCash";

const FiadosPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [creditsPerPage, setCreditsPerPage] = useState(5);
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

  const filteredSales = creditSales.filter((sale) =>
    sale.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const salesByCustomer = filteredSales.reduce((acc, sale) => {
    if (!acc[sale.customerName]) {
      acc[sale.customerName] = [];
    }
    acc[sale.customerName].push(sale);
    return acc;
  }, {} as Record<string, CreditSale[]>);

  const paymentOptions = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const uniqueCustomers = Object.keys(salesByCustomer);
  const totalCustomers = uniqueCustomers.length;
  const indexOfLastCredit = currentPage * creditsPerPage;
  const indexOfFirstCredit = indexOfLastCredit - creditsPerPage;
  const currentCustomers = uniqueCustomers.slice(
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
        showNotification("Error al cargar los fiados", "error");
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
    setTimeout(() => setIsNotificationOpen(false), 3000);
  };

  const calculateCustomerBalance = (customerName: string) => {
    const customerSales = creditSales.filter(
      (sale) => sale.customerName === customerName
    );
    const customerPayments = payments.filter((p) =>
      creditSales.some(
        (s) => s.id === p.saleId && s.customerName === customerName
      )
    );

    const totalSales = customerSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPayments = customerPayments.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    return totalSales - totalPayments;
  };

  const calculateRemainingBalance = (sale: CreditSale) => {
    if (!sale) return 0;
    const totalPayments = payments
      .filter((p) => p.saleId === sale.id)
      .reduce((sum, p) => sum + p.amount, 0);

    return sale.total - totalPayments;
  };

  const calculatePrice = (product: Product): number => {
    const pricePerKg = product.price;
    const quantity = product.quantity;
    const unit = product.unit;
    if (unit === "Unid.") {
      return pricePerKg * quantity;
    }
    let quantityInKg: number;

    switch (unit) {
      case "gr":
        quantityInKg = quantity / 1000;
        break;
      case "Kg":
        quantityInKg = quantity;
        break;
      case "L":
      case "ml":
        quantityInKg = unit === "L" ? quantity : quantity / 1000;
        break;
      default:
        return pricePerKg * quantity;
    }

    return parseFloat((pricePerKg * quantityInKg).toFixed(2));
  };

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => {
      if (prev.length >= paymentOptions.length) return prev;
      const newMethods = [...prev];
      if (newMethods.length === 2) {
        newMethods.forEach((method) => {
          method.amount = 0;
        });
      }

      const usedMethods = newMethods.map((m) => m.method);
      const availableMethod = paymentOptions.find(
        (option) => !usedMethods.includes(option.value as PaymentMethod)
      );

      return [
        ...newMethods,
        {
          method: (availableMethod?.value as PaymentMethod) || "EFECTIVO",
          amount: 0,
        },
      ];
    });
  };

  const addIncomeToDailyCash = async (sale: CreditSale) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      let dailyCash = await db.dailyCashes.get({ date: today });

      const movements: DailyCashMovement[] = [];
      const totalSaleAmount = sale.total;

      if (sale.products && sale.products.length > 0) {
        sale.products.forEach((product) => {
          const productAmount = calculatePrice(product);
          const productRatio = productAmount / totalSaleAmount;

          sale.paymentMethods.forEach((payment) => {
            const paymentProductAmount = productRatio * payment.amount;
            const profit =
              (product.price - (product.costPrice || 0)) *
              (payment.amount / productAmount);

            movements.push({
              id: Date.now(),
              amount: paymentProductAmount,
              description: `Fiado de ${product.name}`,
              type: "INGRESO",
              date: new Date().toISOString(),
              paymentMethod: payment.method,
              productId: product.id,
              productName: product.name,
              quantity: product.quantity,
              unit: product.unit,
              profit: profit,
              isCreditPayment: true,
              originalSaleId: sale.id,
            });
          });
        });
      }

      if (sale.manualAmount && sale.manualAmount > 0) {
        const manualRatio = sale.manualAmount / totalSaleAmount;

        sale.paymentMethods.forEach((payment) => {
          const paymentManualAmount = manualRatio * payment.amount;

          movements.push({
            id: Date.now(),
            amount: paymentManualAmount,
            description: "Monto manual adicional",
            type: "INGRESO",
            date: new Date().toISOString(),
            paymentMethod: payment.method,
            isCreditPayment: true,
            originalSaleId: sale.id,
          });
        });
      }

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

  const handleDeleteCustomerCredits = async () => {
    if (!customerToDelete) return;

    try {
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
        `Todos los fiados de ${customerToDelete} eliminados`,
        "success"
      );
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      setIsInfoModalOpen(false);
    } catch (error) {
      console.error("Error al eliminar fiados:", error);
      showNotification("Error al eliminar fiados", "error");
    }
  };

  const handleDeleteSingleCredit = async (saleId: number) => {
    try {
      await db.sales.delete(saleId);
      await db.payments.where("saleId").equals(saleId).delete();

      setCreditSales(creditSales.filter((sale) => sale.id !== saleId));
      setPayments(payments.filter((p) => p.saleId !== saleId));

      showNotification("Fiado eliminado correctamente", "success");
      if (currentCustomerInfo) {
        const updatedSales = currentCustomerInfo.sales.filter(
          (s) => s.id !== saleId
        );
        if (updatedSales.length === 0) {
          setIsInfoModalOpen(false);
          return;
        }

        setCurrentCustomerInfo({
          ...currentCustomerInfo,
          sales: updatedSales,
          balance: updatedSales.reduce((total, sale) => {
            const paymentsForSale = payments
              .filter((p) => p.saleId === sale.id)
              .reduce((sum, p) => sum + p.amount, 0);
            return total + (sale.total - paymentsForSale);
          }, 0),
        });
      }
    } catch (error) {
      console.error("Error al eliminar fiado:", error);
      showNotification("Error al eliminar fiado", "error");
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
      for (const method of paymentMethods) {
        if (method.amount > 0) {
          const newPayment: Payment = {
            id: Date.now() + Math.random(),
            saleId: currentCreditSale.id,
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

      const updated = [...prev];
      updated.splice(index, 1);
      if (updated.length === 2) {
        const remainingBalance = calculateRemainingBalance(currentCreditSale!);
        updated[0].amount = remainingBalance / 2;
        updated[1].amount = remainingBalance / 2;
      }

      return updated;
    });
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
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">
          Listado de fiados
        </h1>
        <div className="w-full mb-2">
          <SearchBar onSearch={handleSearch} />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)] ">
          <table className="table-auto w-full text-center border-collapse shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b text-sm 2xl:text-lg">
              <tr>
                <th className="px-4 py-2 text-start">Cliente</th>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Deuda</th>
                <th className="w-40 max-w-[10rem] px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl `}>
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
                      <td className="font-semibold px-4 py-2 border border-gray_xl text-start">
                        {customerName}
                      </td>
                      <td className="px-4 py-2 border border-gray_xl">
                        {format(new Date(oldestSale.date), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </td>
                      <td
                        className={`font-semibold px-4 py-2 border border-gray_xl ${
                          customerBalance <= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {customerBalance.toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        })}
                      </td>
                      <td className="px-4 py-2 border border-gray_xl">
                        <div className="flex justify-center items-center h-full">
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
                      <p className="text-gray_m">No hay fiados registrados.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalCustomers > 0 && (
            <Pagination
              text="Fiados por página"
              text2="Total de fiados"
              currentPage={currentPage}
              totalItems={totalCustomers}
              itemsPerPage={creditsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setCreditsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          title={`Información de ${currentCustomerInfo?.name}`}
          buttons={
            <div className="flex justify-between w-full">
              <Button
                text="Eliminar todos"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red-500"
                colorBgHover="hover:bg-red-700"
                onClick={() => {
                  setCustomerToDelete(currentCustomerInfo?.name || null);
                  setIsDeleteModalOpen(true);
                }}
                disabled={
                  !currentCustomerInfo || currentCustomerInfo.balance < 0
                }
              />
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsInfoModalOpen(false)}
              />
            </div>
          }
        >
          <div className="space-y-10">
            <p
              className={`text-lg font-semibold px-3 py-2 rounded-lg inline-block ${
                (currentCustomerInfo?.balance ?? 0) <= 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              Deuda total pendiente:{" "}
              {(currentCustomerInfo?.balance ?? 0).toLocaleString("es-AR", {
                style: "currency",
                currency: "ARS",
              })}
            </p>

            <div className="max-h-64 overflow-y-auto">
              <h3 className="font-semibold mb-2">Detalle de fiados:</h3>
              <table className="bg-white text-gray_b w-full text-center border-collapse">
                <thead className="bg-blue_b text-white text-sm 2xl:text-lg">
                  <tr>
                    <th className="px-2 py-1">Fecha</th>
                    <th className="px-2 py-1">Total</th>
                    <th className="px-2 py-1">Pagado</th>

                    <th className="px-2 py-1">Debe</th>
                    <th className="w-40 max-w-[10rem] px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray_xl border">
                  {currentCustomerInfo?.sales.map((sale) => {
                    const totalPayments = payments
                      .filter((p) => p.saleId === sale.id)
                      .reduce((sum, p) => sum + p.amount, 0);
                    const remainingBalance = sale.total - totalPayments;

                    return (
                      <tr key={sale.id} className="font-semibold">
                        <td className="px-2 py-3">
                          {format(new Date(sale.date), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </td>
                        <td className="px-2 py-3">
                          {sale.total.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td className="px-2 py-3">
                          {totalPayments.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>

                        <td
                          className={`px-2 py-3 ${
                            remainingBalance <= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {remainingBalance.toLocaleString("es-AR", {
                            style: "currency",
                            currency: "ARS",
                          })}
                        </td>
                        <td
                          className={`flex ${
                            remainingBalance > 0
                              ? "justify-center"
                              : "justify-end"
                          } items-center px-2 py-3 space-x-4`}
                        >
                          {remainingBalance > 0 ? (
                            <>
                              <Button
                                text="Pagar"
                                colorText="text-white"
                                colorTextHover="text-white"
                                onClick={() => {
                                  setCurrentCreditSale(sale);
                                  setIsPaymentModalOpen(true);
                                }}
                              />
                              <Button
                                text="Eliminar"
                                colorText="text-white"
                                colorTextHover="text-white"
                                colorBg="bg-red-500"
                                colorBgHover="hover:bg-red-700"
                                onClick={() =>
                                  handleDeleteSingleCredit(sale.id)
                                }
                              />
                            </>
                          ) : (
                            <Button
                              text="Eliminar"
                              colorText="text-white"
                              colorTextHover="text-white"
                              colorBg="bg-red-500"
                              colorBgHover="hover:bg-red-700"
                              onClick={() => handleDeleteSingleCredit(sale.id)}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Registrar Pago"
          buttons={
            <>
              <Button
                hotkey="Enter"
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
                hotkey="Escape"
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
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
              <p>Cliente: {currentCreditSale?.customerName || "Sin nombre"}</p>
              <p className="flex items-center gap-4">
                <span>Deuda pendiente:</span>
                <span
                  className={`px-2 py-1 rounded ${
                    calculateRemainingBalance(currentCreditSale!) <= 0
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  } font-semibold`}
                >
                  {calculateRemainingBalance(currentCreditSale!).toLocaleString(
                    "es-AR",
                    {
                      style: "currency",
                      currency: "ARS",
                    }
                  )}
                </span>
              </p>
            </div>

            <div className="space-y-6">
              <label className="block text-sm font-medium">
                Métodos de Pago
              </label>
              {paymentMethods.map((method, index) => (
                <div key={index} className="flex items-center gap-4">
                  <Select
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
                    className="w-full text-black"
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
                      className="text-red-500 hover:text-red-700"
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
                  className="cursor-pointer text-sm text-blue_b dark:text-blue_l hover:text-blue_m flex items-center transition-all duration-200"
                >
                  <Plus size={16} className="mr-1" /> Agregar otro método
                </button>
              )}
            </div>

            <div className="p-2 bg-gray_b dark:bg-gray_m text-white text-center mt-4">
              <p className="font-semibold">
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
                <p className="text-red-500 text-sm">
                  El monto total excede la deuda pendiente
                </p>
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Fiados"
          buttons={
            <>
              <Button
                text="Si"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red-500"
                colorBgHover="hover:bg-red-700"
                onClick={handleDeleteCustomerCredits}
              />
              <Button
                text="No"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsDeleteModalOpen(false)}
              />
            </>
          }
        >
          <div className="space-y-6">
            <p>
              ¿Está seguro que desea eliminar TODOS los fiados de{" "}
              {customerToDelete}?
            </p>
            <p className="font-semibold text-red-500">
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

export default FiadosPage;
