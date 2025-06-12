"use client";
import Button from "@/app/components/Button";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  DailyCash,
  DailyCashMovement,
  Option,
  PaymentMethod,
  PaymentSplit,
  Supplier,
} from "@/app/lib/types/types";
import { Plus, X, Check, Info, Trash } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import Input from "@/app/components/Input";
import { formatCurrency } from "@/app/lib/utils/currency";
import InputCash from "@/app/components/InputCash";
import { useRubro } from "@/app/context/RubroContext";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { getLocalDateString } from "@/app/lib/utils/getLocalDate";

const CajaDiariaPage = () => {
  const { rubro } = useRubro();
  const [dailyCashes, setDailyCashes] = useState<DailyCash[]>([]);
  const [currentDailyCash, setCurrentDailyCash] = useState<DailyCash | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDayMovements, setSelectedDayMovements] = useState<
    DailyCashMovement[]
  >([]);
  const [isOpenCashModal, setIsOpenCashModal] = useState(false);
  const [isCloseCashModal, setIsCloseCashModal] = useState(false);
  const [initialAmount, setInitialAmount] = useState("");
  const [actualCashCount, setActualCashCount] = useState("");
  const [filterType, setFilterType] = useState<"TODOS" | "INGRESO" | "EGRESO">(
    "TODOS"
  );
  const [amount, setAmount] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<
    PaymentMethod | "TODOS"
  >("TODOS");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<{
    value: number;
    label: string;
  } | null>(null);

  const paymentOptions: Option[] = [
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "TARJETA", label: "Tarjeta" },
  ];

  const [description, setDescription] = useState("");
  const [movementType, setMovementType] = useState<"INGRESO" | "EGRESO">(
    "INGRESO"
  );

  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: 0 },
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  type MovementType = "INGRESO" | "EGRESO";

  const movementTypes: Option[] = [
    { value: "INGRESO", label: "Ingreso" },
    { value: "EGRESO", label: "Egreso" },
  ];

  const getFilteredMovements = () => {
    return selectedDayMovements.filter((movement) => {
      const typeMatch = filterType === "TODOS" || movement.type === filterType;

      const paymentMatch =
        filterPaymentMethod === "TODOS" ||
        movement.paymentMethod === filterPaymentMethod ||
        (movement.combinedPaymentMethods &&
          movement.combinedPaymentMethods.some(
            (m) => m.method === filterPaymentMethod
          ));

      return typeMatch && paymentMatch;
    });
  };

  const calculateFilteredTotals = () => {
    const filtered = getFilteredMovements();

    return {
      totalIngresos: filtered
        .filter((m) => m.type === "INGRESO")
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
      totalEgresos: filtered
        .filter((m) => m.type === "EGRESO")
        .reduce((sum, m) => sum + (Number(m.amount) || 0), 0),
    };
  };

  const openDetailModal = (movements: DailyCashMovement[]) => {
    setSelectedDayMovements(movements);
    setIsDetailModalOpen(true);
  };

  const monthOptions = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: format(new Date(2022, i), "MMMM", { locale: es }),
  }));

  const yearOptions = Array.from({ length: 10 }, (_, i) => ({
    value: new Date().getFullYear() - i,
    label: String(new Date().getFullYear() - i),
  }));

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 2500);
  };

  const checkCashStatus = async () => {
    const today = getLocalDateString();
    const dailyCash = await db.dailyCashes.get({ date: today });

    if (!dailyCash) {
      setIsOpenCashModal(true);
      return false;
    } else if (!dailyCash.closed) {
      return true;
    } else {
      setIsOpenCashModal(true);
      return false;
    }
  };
  const checkAndCloseOldCashes = async () => {
    const today = getLocalDateString();
    try {
      const allCashes = await db.dailyCashes.toArray();
      const openPreviousCashes = allCashes.filter(
        (cash) => !cash.closed && cash.date < today
      );

      if (openPreviousCashes.length === 0) return;

      for (const cash of openPreviousCashes) {
        const cashIncome = cash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        const cashExpense = cash.movements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        const expectedAmount = cash.initialAmount + cashIncome - cashExpense;

        const updatedCash = {
          ...cash,
          closed: true,
          closingAmount: expectedAmount,
          cashIncome,
          cashExpense,
          otherIncome: cash.movements
            .filter(
              (m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO"
            )
            .reduce((sum, m) => sum + m.amount, 0),
          closingDifference: 0,
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(cash.id, updatedCash);

        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === cash.id ? updatedCash : dc))
        );

        if (currentDailyCash && currentDailyCash.id === cash.id) {
          setCurrentDailyCash(updatedCash);
        }
      }

      showNotification(
        `Se cerraron ${openPreviousCashes.length} caja(s) de días anteriores automáticamente.`,
        "info"
      );
    } catch (error) {
      console.error("Error al cerrar cajas antiguas:", error);
      showNotification("Error al cerrar cajas de días anteriores", "error");
    }
  };

  useEffect(() => {
    const checkMidnightAndClose = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        checkAndCloseOldCashes();
      }
    };

    const interval = setInterval(checkMidnightAndClose, 5 * 60 * 1000);
    checkMidnightAndClose();

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    checkAndCloseOldCashes();
  }, []);

  const openCash = async () => {
    const today = getLocalDateString();
    const allCashes = await db.dailyCashes.toArray();
    const openPreviousCashes = allCashes.filter(
      (cash) => !cash.closed && cash.date < today
    );

    if (openPreviousCashes.length > 0) {
      await checkAndCloseOldCashes();
      return;
    }

    // Validar el monto inicial tanto para apertura como reapertura
    if (!initialAmount) {
      showNotification("Debe ingresar un monto inicial", "error");
      return;
    }

    const initialAmountNumber = parseFloat(initialAmount);
    if (isNaN(initialAmountNumber)) {
      showNotification("El monto inicial debe ser un número válido", "error");
      return;
    }

    try {
      // Si estamos reabriendo una caja cerrada
      if (currentDailyCash?.closed) {
        const updatedCash = {
          ...currentDailyCash,
          closed: false,
          initialAmount: initialAmountNumber, // Usar el monto ingresado en el modal
          // Resetear los campos de cierre
          closingAmount: undefined,
          cashIncome: undefined,
          cashExpense: undefined,
          otherIncome: undefined,
          closingDifference: undefined,
          closingDate: undefined,
        };

        await db.dailyCashes.update(currentDailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === currentDailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        setIsOpenCashModal(false);
        setInitialAmount("");
        showNotification("Caja reabierta correctamente", "success");
        return;
      }

      const dailyCash: DailyCash = {
        id: Date.now(),
        date: today,
        initialAmount: initialAmountNumber,
        movements: [],
        closed: false,
        totalIncome: 0,
        totalExpense: 0,
      };

      await db.dailyCashes.add(dailyCash);
      setDailyCashes((prev) => [...prev, dailyCash]);
      setCurrentDailyCash(dailyCash);
      setIsOpenCashModal(false);
      setInitialAmount("");
      showNotification("Caja abierta correctamente", "success");
    } catch (error) {
      console.error("Error al abrir/reabrir caja:", error);
      showNotification("Error al abrir/reabrir caja", "error");
    }
  };

  const closeCash = async () => {
    if (!actualCashCount) {
      showNotification("Debe ingresar el monto real contado", "error");
      return;
    }

    const actualCashCountNumber = parseFloat(actualCashCount);
    if (isNaN(actualCashCountNumber)) {
      showNotification("El monto contado debe ser un número válido", "error");
      return;
    }

    try {
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (dailyCash) {
        // Calcular solo ingresos en efectivo (EFECTIVO)
        const cashIncome = dailyCash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod === "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        // Calcular egresos (todos)
        const cashExpense = dailyCash.movements
          .filter((m) => m.type === "EGRESO")
          .reduce((sum, m) => sum + m.amount, 0);

        // Calcular otros ingresos (no EFECTIVO)
        const otherIncome = dailyCash.movements
          .filter((m) => m.type === "INGRESO" && m.paymentMethod !== "EFECTIVO")
          .reduce((sum, m) => sum + m.amount, 0);

        // Monto esperado solo considera efectivo
        const expectedAmount =
          dailyCash.initialAmount + cashIncome - cashExpense;
        const difference = actualCashCountNumber - expectedAmount;

        const updatedCash = {
          ...dailyCash,
          closed: true,
          closingAmount: actualCashCountNumber,
          cashIncome, // Solo ingresos en efectivo
          cashExpense, // Todos los egresos
          otherIncome, // Ingresos no en efectivo
          closingDifference: difference,
          closingDate: new Date().toISOString(),
        };

        await db.dailyCashes.update(dailyCash.id, updatedCash);
        setDailyCashes((prev) =>
          prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
        );
        setCurrentDailyCash(updatedCash);
        setIsCloseCashModal(false);
        setActualCashCount("");
        showNotification("Caja cerrada correctamente", "success");
      }
    } catch (error) {
      console.error("Error al cerrar caja:", error);
      showNotification("Error al cerrar caja", "error");
    }
  };

  const getDailySummary = () => {
    const summary: Record<
      string,
      {
        date: string;
        ingresos: number;
        egresos: number;
        ganancia: number;
        gananciaNeta: number;
        movements: DailyCashMovement[];
        closed: boolean;
        initialAmount?: number;
        closingAmount?: number;
        closingDifference?: number;
      }
    > = {};

    dailyCashes.forEach((dailyCash) => {
      const date = dailyCash.date;
      const movements = dailyCash.movements;

      if (!summary[date]) {
        summary[date] = {
          date,
          ingresos: 0,
          egresos: 0,
          ganancia: 0,
          gananciaNeta: 0,
          movements: [],
          closed: dailyCash.closed || false,
          initialAmount: dailyCash.initialAmount,
          closingAmount: dailyCash.closingAmount,
          closingDifference: dailyCash.closingDifference,
        };
      }

      const processedMovementIds = new Set();

      movements.forEach((movement) => {
        if (processedMovementIds.has(movement.id)) return;
        processedMovementIds.add(movement.id);

        summary[date].movements.push(movement);

        const amount = Number(movement.amount) || 0;

        if (movement.type === "INGRESO") {
          summary[date].ingresos += amount;
          // Sumar la ganancia neta (ya incluye productos + manual)
          summary[date].gananciaNeta += Number(movement.profit) || 0;
        } else {
          summary[date].egresos += amount;
        }
      });

      // Ganancia bruta (ingresos - egresos)
      summary[date].ganancia = summary[date].ingresos - summary[date].egresos;
    });

    if (currentDailyCash) {
      const today = getLocalDateString();
      if (!summary[today]) {
        summary[today] = {
          date: today,
          ingresos: 0,
          egresos: 0,
          ganancia: 0,
          gananciaNeta: 0,
          movements: currentDailyCash.movements,
          closed: currentDailyCash.closed || false,
          initialAmount: currentDailyCash.initialAmount,
          closingAmount: currentDailyCash.closingAmount,
          closingDifference: currentDailyCash.closingDifference,
        };
      }
    }

    return Object.values(summary)
      .filter((item) => {
        const date = parseISO(item.date);
        return isSameMonth(date, new Date(selectedYear, selectedMonth - 1));
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  const dailySummaries = getDailySummary();

  const addMovement = async () => {
    const totalPayment = paymentMethods.reduce(
      (sum, m) => sum + (m.amount || 0),
      0
    );

    const isCashOpen = await checkCashStatus();
    if (!isCashOpen) return;

    try {
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        showNotification("La caja no está abierta", "error");
        return;
      }

      const movement: DailyCashMovement = {
        id: Date.now() + Math.random(),
        amount: totalPayment || 0,
        description,
        type: movementType,
        paymentMethod: paymentMethods[0].method,
        date: new Date().toISOString(),
        supplierId: selectedSupplier?.value,
        supplierName: selectedSupplier?.label,
        combinedPaymentMethods: paymentMethods,
        discount: 0,
      };

      const updatedCash = {
        ...dailyCash,
        movements: [...dailyCash.movements, movement],
        totalIncome:
          movementType === "INGRESO"
            ? (dailyCash.totalIncome || 0) + totalPayment
            : dailyCash.totalIncome,
        totalExpense:
          movementType === "EGRESO"
            ? (dailyCash.totalExpense || 0) + totalPayment
            : dailyCash.totalExpense,
      };

      await db.dailyCashes.update(dailyCash.id, updatedCash);

      setDailyCashes((prev) =>
        prev.map((dc) => (dc.id === dailyCash.id ? updatedCash : dc))
      );
      setCurrentDailyCash(updatedCash);

      setAmount("");
      setDescription("");
      setMovementType("INGRESO");
      setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
      setIsOpenModal(false);
      showNotification("Movimiento registrado correctamente", "success");
    } catch (error) {
      console.error("Error al registrar movimiento:", error);
      showNotification("Error al registrar movimiento", "error");
    }
  };
  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setPaymentMethods((prev) => {
      const updated = [...prev];

      if (field === "amount") {
        const numericValue =
          typeof value === "string" ? parseFloat(value) || 0 : value;
        updated[index] = {
          ...updated[index],
          amount: numericValue,
        };
      } else {
        updated[index] = {
          ...updated[index],
          method: value as PaymentMethod,
        };
      }

      return updated;
    });
  };

  const addPaymentMethod = () => {
    setPaymentMethods((prev) => {
      if (prev.length >= paymentOptions.length) return prev;

      const usedMethods = prev.map((m) => m.method);
      const availableMethod =
        paymentOptions.find(
          (option) => !usedMethods.includes(option.value as PaymentMethod)
        ) || paymentOptions[0];

      return [
        ...prev,
        {
          method: availableMethod.value as PaymentMethod,
          amount: 0,
        },
      ];
    });
  };
  const removePaymentMethod = (index: number) => {
    setPaymentMethods((prev) => {
      if (prev.length <= 1) return prev;

      const updated = [...prev];
      updated.splice(index, 1);

      if (updated.length === 1) {
        const totalAmount = parseFloat(amount) || 0;
        updated[0].amount = totalAmount;
      }

      return updated;
    });
  };

  useEffect(() => {
    const fetchSuppliers = async () => {
      const allSuppliers = await db.suppliers.toArray();
      setSuppliers(allSuppliers);
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedDailyCashes = await db.dailyCashes.toArray();
        const cleanedCashes = storedDailyCashes.map((cash) => ({
          ...cash,
          movements: cash.movements.map((m) => ({
            ...m,
            amount: Number(m.amount) || 0,
          })),
        }));

        setDailyCashes(cleanedCashes);
      } catch (error) {
        console.error("Error al cargar cajas diarias:", error);
        showNotification("Error al cargar cajas diarias", "error");
      }
    };

    fetchData();
  }, []);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = dailySummaries.slice(indexOfFirstItem, indexOfLastItem);

  const DetailModal = () => {
    const filteredMovements = getFilteredMovements();
    const { totalIngresos, totalEgresos } = calculateFilteredTotals();
    const groupedMovements = filteredMovements.reduce((acc, movement) => {
      if (movement.originalSaleId) {
        if (!acc[movement.originalSaleId]) {
          acc[movement.originalSaleId] = {
            ...movement,
            subMovements: movement.combinedPaymentMethods || [],
          };
        }
        return acc;
      }

      acc[movement.id] = movement;
      return acc;
    }, {} as Record<number, DailyCashMovement>);

    return (
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title="Detalles del día"
        buttons={
          <div className="flex justify-end mt-4">
            <Button
              text="Cerrar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
              onClick={() => {
                setIsDetailModalOpen(false);
                setFilterType("TODOS");
                setFilterPaymentMethod("TODOS");
              }}
            />
          </div>
        }
        minheight="min-h-[23rem]"
      >
        <div className="mb-4 grid grid-cols-2 gap-2">
          <div className="bg-green_xl p-3 rounded-lg">
            <h3 className="font-semibold text-green_b">Total Ingresos</h3>
            <p className="text-xl font-bold text-green_b">
              {formatCurrency(totalIngresos)}
            </p>
          </div>
          <div className="bg-red_l p-3 rounded-lg">
            <h3 className="font-semibold text-red_b">Total Egresos</h3>
            <p className="text-xl font-bold text-red_b">
              {formatCurrency(totalEgresos)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray_b dark:text-white">
              Tipo
            </label>
            <Select
              options={[
                { value: "TODOS", label: "Todos" },
                { value: "INGRESO", label: "Ingreso" },
                { value: "EGRESO", label: "Egreso" },
              ]}
              value={
                filterType === "TODOS"
                  ? { value: "TODOS", label: "Todos" }
                  : {
                      value: filterType,
                      label: filterType === "INGRESO" ? "Ingreso" : "Egreso",
                    }
              }
              onChange={(option) =>
                option &&
                setFilterType(option.value as "TODOS" | "INGRESO" | "EGRESO")
              }
              className="w-full text-black"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray_b dark:text-white">
              Método de Pago
            </label>
            <Select
              options={[{ value: "TODOS", label: "Todos" }, ...paymentOptions]}
              value={
                filterPaymentMethod === "TODOS"
                  ? { value: "TODOS", label: "Todos" }
                  : paymentOptions.find((m) => m.value === filterPaymentMethod)
              }
              onChange={(option) =>
                option &&
                setFilterPaymentMethod(option.value as PaymentMethod | "TODOS")
              }
              className="w-full text-black"
            />
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray_l">
            <thead className="bg-gradient-to-bl from-blue_m to-blue_b text-white">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider">
                  Tipo
                </th>

                <th className="px-4 py-2 text-left text-xs font-medium tracking-wider">
                  Producto
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium  tracking-wider">
                  Descripción
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium  tracking-wider">
                  Métodos de Pago
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className={`bg-white  divide-y divide-gray_xl`}>
              {Object.values(groupedMovements).length > 0 ? (
                Object.values(groupedMovements).map((movement, index) => (
                  <tr
                    key={index}
                    className={movement.type === "EGRESO" ? "bg-red_xl" : ""}
                  >
                    <td className="whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          movement.type === "INGRESO"
                            ? "bg-green_xl text-green_b"
                            : "bg-red_l text-red_b"
                        }`}
                      >
                        {movement.type}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-sm text-gray_m min-w-[23rem]">
                      {Array.isArray(movement.items) &&
                      movement.items.length > 0 ? (
                        <div className="flex flex-col">
                          {movement.items.map((item, i) => (
                            <div key={i} className="flex justify-between">
                              <span className="font-semibold">
                                {getDisplayProductName(
                                  {
                                    name: item.productName,
                                    size: item.size,
                                    color: item.color,
                                    rubro: rubro,
                                  },
                                  rubro,
                                  true
                                )}
                              </span>{" "}
                              <div className=" min-w-[5rem]">
                                ×{item.quantity} {""}
                                {item.unit}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : movement.productName ? (
                        <div className="flex justify-between">
                          <span className="font-semibold">
                            {getDisplayProductName(
                              {
                                name: movement.productName,
                                size: movement.size,
                                color: movement.color,
                                rubro: rubro,
                              },
                              rubro,
                              true
                            )}
                          </span>{" "}
                          ×{movement.quantity} {""}
                          {movement.unit}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray_m">
                      {movement.description}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray_m">
                      {movement.combinedPaymentMethods ? (
                        <div className="flex flex-col">
                          {movement.combinedPaymentMethods.map((method, i) => (
                            <div key={i}>
                              {method.method}: {formatCurrency(method.amount)}
                            </div>
                          ))}
                        </div>
                      ) : (
                        `${movement.paymentMethod}: ${formatCurrency(
                          movement.amount
                        )}`
                      )}
                    </td>

                    <td className="px-4 py-2 text-sm text-center font-medium text-green_b">
                      {formatCurrency(movement.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray_l">
                    No hay movimientos que coincidan con los filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Modal>
    );
  };

  useEffect(() => {
    const checkInitialCashStatus = async () => {
      await checkAndCloseOldCashes();
      const today = getLocalDateString();
      const dailyCash = await db.dailyCashes.get({ date: today });

      if (!dailyCash) {
        setIsOpenCashModal(true);
      } else {
        setCurrentDailyCash(dailyCash);
      }
    };

    checkInitialCashStatus();
  }, []);
  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)] flex flex-col justify-between ">
        <div className="flex flex-col justify-between h-[calc(100vh-80px)]">
          <div>
            <h1 className="text-lg 2xl:text-xl font-semibold mb-2">
              Caja Diaria
            </h1>
            {currentDailyCash ? (
              <div
                className={`p-3 rounded-lg mb-4 ${
                  currentDailyCash.closed ? "bg-red_xl" : "bg-green_xl"
                }`}
              >
                <div className="items-center">
                  <div className="flex justify-between items-center gap-2 pb-4">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-gray_b text-sm 2xl:text-lg font-bold  ${
                          currentDailyCash.closed
                            ? "text-red_b"
                            : "text-green_b"
                        }`}
                      >
                        {currentDailyCash.closed
                          ? "Caja Cerrada"
                          : "Caja Abierta"}
                      </h3>
                      <p className="text-gray_m font-medium">
                        {format(parseISO(currentDailyCash.date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <div>
                      {currentDailyCash.closed ? (
                        <Button
                          icon={<Plus />}
                          text="Reabrir Caja"
                          colorText="text-white"
                          colorTextHover="text-white"
                          onClick={() => setIsOpenCashModal(true)}
                        />
                      ) : (
                        <Button
                          icon={<X />}
                          text="Cerrar Caja"
                          colorText="text-white"
                          colorTextHover="text-white"
                          colorBg="bg-red_m"
                          colorBgHover="hover:bg-red_b"
                          onClick={() => setIsCloseCashModal(true)}
                        />
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 text-gray_m font-semibold mb-4">
                    <p>
                      Monto inicial:{" "}
                      {formatCurrency(currentDailyCash.initialAmount)}
                    </p>
                    {currentDailyCash.closed ? (
                      <>
                        <p>
                          Ingresos en efectivo:{" "}
                          {formatCurrency(currentDailyCash.cashIncome || 0)}
                        </p>
                        <p>
                          Otros ingresos:{" "}
                          {formatCurrency(currentDailyCash.otherIncome || 0)}
                        </p>
                        <p>
                          Egresos:{" "}
                          {formatCurrency(currentDailyCash.cashExpense || 0)}
                        </p>
                        <p className="font-semibold">
                          Monto esperado (solo efectivo):{" "}
                          {formatCurrency(
                            currentDailyCash.initialAmount +
                              (currentDailyCash.cashIncome || 0) -
                              (currentDailyCash.cashExpense || 0)
                          )}
                        </p>
                        <p>
                          Efectivo contado:{" "}
                          {formatCurrency(currentDailyCash.closingAmount || 0)}
                        </p>
                      </>
                    ) : null}
                  </div>
                  {currentDailyCash.closed ? (
                    <p
                      className={`font-bold text-sm 2xl:text-lg text-center text-white p-2 ${
                        (currentDailyCash.closingDifference || 0) >= 0
                          ? "bg-green_m"
                          : "bg-red_m "
                      } w-full ${
                        (currentDailyCash.closingDifference || 0) >= 0
                          ? "text-green_b"
                          : "text-red_b"
                      }`}
                    >
                      Diferencia:{" "}
                      {Math.abs(currentDailyCash.closingDifference || 0) >
                        0 && (
                        <>
                          {(currentDailyCash.closingDifference || 0) > 0
                            ? "+"
                            : "-"}
                          {formatCurrency(
                            Math.abs(currentDailyCash.closingDifference || 0)
                          )}
                        </>
                      )}
                      {Math.abs(currentDailyCash.closingDifference || 0) ===
                        0 && formatCurrency(0)}
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-bl from-blue_m to-blue_b p-3 rounded-lg mb-4 flex justify-between items-center space-x-10">
                <p className="text-md text-white">
                  No hay caja abierta para hoy
                </p>
                <Button
                  text="Abrir Caja"
                  colorText="text-gray_b"
                  colorTextHover="hover:text-white"
                  colorBg="bg-blue_xl"
                  colorBgHover="hover:bg-green_m"
                  onClick={() => setIsOpenCashModal(true)}
                />
              </div>
            )}

            <div className="flex justify-between mb-2">
              <div className="flex gap-2">
                <Select
                  options={monthOptions}
                  value={monthOptions.find((m) => m.value === selectedMonth)}
                  onChange={(option) =>
                    option && setSelectedMonth(option.value)
                  }
                  className="w-40 text-black"
                />
                <Select
                  options={yearOptions}
                  value={yearOptions.find((y) => y.value === selectedYear)}
                  onChange={(option) => option && setSelectedYear(option.value)}
                  className="w-28 text-black"
                />
              </div>
              <Button
                icon={<Plus className="w-4 h-4" />}
                text="Nuevo Movimiento"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={async () => {
                  const isCashOpen = await checkCashStatus();
                  if (isCashOpen) setIsOpenModal(true);
                }}
              />
            </div>
            <div
              className={` flex flex-col justify-between ${
                currentItems.length > 0 ? "h-[calc(53vh-80px)]" : ""
              } `}
            >
              <table className=" table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
                <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b">
                  <tr>
                    <th className="text-sm 2xl:text-lg px-4 py-2 text-start">
                      Fecha
                    </th>
                    <th className="text-sm 2xl:text-lg px-4 py-2">Ingresos</th>
                    <th className="text-sm 2xl:text-lg px-4 py-2">Egresos</th>
                    <th className="text-sm 2xl:text-lg px-4 py-2">Ganancia</th>
                    <th className="text-sm 2xl:text-lg px-4 py-2">
                      Estado de caja
                    </th>{" "}
                    <th className="w-40 max-w-[10rem] text-sm 2xl:text-lg px-4 py-2">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`bg-white text-gray_b divide-y divide-gray_xl `}
                >
                  {currentItems.length > 0 ? (
                    currentItems.map((day, index) => (
                      <tr
                        key={index}
                        className="text-xs 2xl:text-[.9rem] bg-white text-gray_b border border-gray_xl"
                      >
                        <td className="font-semibold px-4 py-2  border-x border-gray_xltext-start">
                          {format(parseISO(day.date), "dd/MM/yyyy")}
                        </td>
                        <td className="font-semibold text-green_b px-4 py-2  border-x border-gray_xl">
                          {formatCurrency(day.ingresos)}
                        </td>
                        <td className="font-semibold text-red_b px-4 py-2  border-x border-gray_xl">
                          {formatCurrency(day.egresos)}
                        </td>
                        <td className="font-semibold text-purple-600 px-4 py-2">
                          {formatCurrency(day.gananciaNeta || 0)}
                        </td>
                        <td className="px-4 py-2 border-x border-gray_xl ">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              day.closed
                                ? "bg-red_m text-white"
                                : "bg-green_m text-white"
                            }`}
                          >
                            {day.closed ? "Cerrada" : "Abierta"}
                          </span>
                        </td>
                        <td className="px-4 py-2 flex justify-center items-center gap-2 border-x border-gray_xl">
                          <Button
                            icon={<Info size={20} />}
                            colorText="text-gray_b"
                            colorTextHover="hover:text-white"
                            colorBg="bg-transparent"
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-0"
                            onClick={() => {
                              openDetailModal(day.movements);
                            }}
                          />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="h-[55vh] 2xl:h-[calc(54vh-80px)]">
                      <td colSpan={6} className="py-4 text-center">
                        <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                          <Info size={64} className="mb-4 text-gray_m" />
                          <p className="text-gray_m">
                            No hay registros para el período seleccionado.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination
            text="Días por página"
            text2="Total de días"
            currentPage={currentPage}
            totalItems={dailySummaries.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(newItemsPerPage) => {
              setItemsPerPage(newItemsPerPage);
              setCurrentPage(1);
            }}
          />
        </div>
        <Modal
          isOpen={isOpenModal}
          onClose={() => {
            setIsOpenModal(false);
            setPaymentMethods([{ method: "EFECTIVO", amount: 0 }]);
          }}
          title="Nuevo Movimiento"
          onConfirm={addMovement}
        >
          <div className="flex flex-col gap-2">
            <div className="w-full flex justify-between space-x-4">
              <div className="flex flex-col w-full">
                <label className="block text-gray_m dark:text-white text-sm font-semibold">
                  Tipo de Movimiento
                </label>
                <Select
                  options={movementTypes}
                  value={movementTypes.find((m) => m.value === movementType)}
                  onChange={(option) =>
                    option && setMovementType(option.value as MovementType)
                  }
                  className="w-full text-black"
                />
              </div>
              {movementType === "EGRESO" && (
                <div className="flex flex-col w-full">
                  <label className="block text-sm font-medium text-gray_m dark:text-white">
                    Proveedor (opcional)
                  </label>
                  <Select
                    options={suppliers.map((s) => ({
                      value: s.id,
                      label: s.companyName,
                    }))}
                    value={selectedSupplier}
                    onChange={(option) => setSelectedSupplier(option)}
                    isClearable
                    placeholder="Seleccionar proveedor..."
                    className="w-full text-black"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray_m dark:text-white">
                Métodos de Pago
              </label>
              {paymentMethods.map((method, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 ${
                    paymentMethods.length > 1 ? "space-y-6" : ""
                  }`}
                >
                  <Select
                    value={paymentOptions.find(
                      (option) => option.value === method.method
                    )}
                    onChange={(selectedOption) =>
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
                    placeholder="Monto"
                    value={method.amount}
                    onChange={(value) => {
                      handlePaymentMethodChange(index, "amount", value);
                      const newTotal = paymentMethods.reduce(
                        (sum, m) => sum + (m.amount || 0),
                        0
                      );
                      setAmount(newTotal.toString());
                    }}
                    className="w-32"
                  />

                  {paymentMethods.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePaymentMethod(index)}
                      className={`cursor-pointer text-red_m hover:text-red_b transition-all duration-300 ${
                        paymentMethods.length > 1 ? "-mt-6 pr-2" : ""
                      }`}
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
                  className={`cursor-pointer text-sm text-blue_b dark:text-blue_l hover:text-blue_m flex items-center transition-all duration-300 ${
                    paymentMethods.length === 1 ? "mt-4" : "-mt-2"
                  }`}
                >
                  <Plus size={16} className="mr-1" /> Agregar otro método de
                  pago
                </button>
              )}
            </div>

            <Input
              label="Descripción"
              type="text"
              name="description"
              placeholder="Ingrese una descripción..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="p-2 bg-gray_b text-white text-center">
              <p className="font-bold text-3xl">
                TOTAL:{" "}
                {formatCurrency(
                  paymentMethods.reduce((sum, m) => sum + (m.amount || 0), 0)
                )}
              </p>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isOpenCashModal}
          onClose={() => {
            setIsOpenCashModal(false);
            setInitialAmount(""); // Limpiar el campo al cerrar
          }}
          title={
            currentDailyCash?.closed ? "Reapertura de caja" : "Apertura de caja"
          }
          onConfirm={openCash}
          buttons={
            <div className="flex justify-end space-x-4">
              <Button
                text={currentDailyCash?.closed ? "Reabrir Caja" : "Abrir Caja"}
                icon={<Check />}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={openCash}
              />
              <Button
                text="Abrir más tarde"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => {
                  setIsOpenCashModal(false);
                  setInitialAmount(""); // Limpiar el campo al cancelar
                }}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-2">
            <p className="text-gray_m dark:text-white">
              {currentDailyCash?.closed
                ? "Ingrese el monto inicial para reabrir la caja:"
                : "Para comenzar, ingrese el monto inicial en caja."}
            </p>
            <InputCash
              label="Monto Inicial"
              value={Number(initialAmount) || 0}
              onChange={(value) => setInitialAmount(value.toString())}
              placeholder="Ingrese el monto inicial..."
            />
          </div>
        </Modal>
        <DetailModal />
        <Modal
          isOpen={isCloseCashModal}
          onClose={() => setIsCloseCashModal(false)}
          title="Cierre de Caja"
          onConfirm={closeCash}
        >
          <div className="flex flex-col gap-2">
            <InputCash
              label="Monto Contado en Efectivo"
              value={Number(actualCashCount) || 0}
              onChange={(value) => setActualCashCount(value.toString())}
              placeholder="Ingrese el monto contado..."
            />
          </div>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </div>
    </ProtectedRoute>
  );
};

export default CajaDiariaPage;
