import { formatCurrency } from "../lib/utils/currency";
import { Budget, PaymentSplit, PaymentMethod } from "../lib/types/types";
import Select from "react-select";
import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import InputCash from "./InputCash";
import { Trash, Plus } from "lucide-react";

interface ConvertToSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget;
  onConfirm: (paymentMethods: PaymentSplit[]) => void;
}

const paymentOptions = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "TARJETA", label: "Tarjeta" },
];

export const ConvertToSaleModal = ({
  isOpen,
  onClose,
  budget,
  onConfirm,
}: ConvertToSaleModalProps) => {
  // Calcular el total a pagar (total - seña)
  const totalToPay =
    budget.total - (budget.deposit ? parseFloat(budget.deposit) : 0);

  const [paymentMethods, setPaymentMethods] = useState<PaymentSplit[]>([
    { method: "EFECTIVO", amount: totalToPay },
  ]);

  const handlePaymentMethodChange = (
    index: number,
    field: keyof PaymentSplit,
    value: string | number
  ) => {
    setPaymentMethods((prev) => {
      const updated = [...prev];

      if (field === "amount") {
        const numericValue =
          typeof value === "string"
            ? parseFloat(value.replace(/\./g, "").replace(",", ".")) || 0
            : value;

        updated[index] = {
          ...updated[index],
          amount: parseFloat(numericValue.toFixed(2)),
        };

        if (updated.length === 2) {
          const otherIndex = index === 0 ? 1 : 0;
          const remaining = totalToPay - numericValue;
          updated[otherIndex] = {
            ...updated[otherIndex],
            amount: parseFloat(Math.max(0, remaining).toFixed(2)),
          };
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

  const addPaymentMethod = () => {
    if (paymentMethods.length >= paymentOptions.length) return;

    setPaymentMethods((prev) => {
      if (prev.length < 2) {
        const newMethodCount = prev.length + 1;
        const share = totalToPay / newMethodCount;

        const updatedMethods = prev.map((method) => ({
          ...method,
          amount: share,
        }));

        return [
          ...updatedMethods,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: share,
          },
        ];
      } else {
        return [
          ...prev,
          {
            method: paymentOptions[prev.length].value as PaymentMethod,
            amount: 0,
          },
        ];
      }
    });
  };

  const removePaymentMethod = (index: number) => {
    if (paymentMethods.length <= 1) return;

    setPaymentMethods((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);

      if (updated.length === 1) {
        updated[0].amount = totalToPay;
      } else {
        const share = totalToPay / updated.length;
        updated.forEach((m, i) => {
          updated[i] = {
            ...m,
            amount: share,
          };
        });
      }

      return updated;
    });
  };

  const validatePaymentMethods = (): boolean => {
    const sum = paymentMethods.reduce(
      (acc, method) => acc + parseFloat(method.amount.toFixed(2)),
      0
    );
    return Math.abs(sum - parseFloat(totalToPay.toFixed(2))) < 0.01;
  };

  const handleConfirm = () => {
    if (!validatePaymentMethods()) {
      // Mostrar error si los montos no coinciden
      return;
    }
    onConfirm(paymentMethods);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cobrar presupuesto de ${budget.customerName}`}
      buttons={
        <>
          <Button
            text="Confirmar Cobro"
            colorText="text-white"
            colorTextHover="text-white"
            onClick={handleConfirm}
          />
          <Button
            text="Cancelar"
            colorText="text-gray_b dark:text-white"
            colorTextHover="hover:dark:text-white"
            colorBg="bg-transparent dark:bg-gray_m"
            colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
            onClick={onClose}
          />
        </>
      }
    >
      <div className="space-y-4">
        <div className="border border-gray_xl rounded-lg p-4">
          <h3 className="font-medium mb-2">Productos del presupuesto</h3>
          <div className="max-h-40 overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-2 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descuento (%)
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {budget.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                      {item.productName}
                      {item.size && ` (${item.size})`}
                      {item.color && ` - ${item.color}`}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 text-center">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 text-center">
                      {item.discount || 0}%
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-500 text-right">
                      {formatCurrency(
                        item.price *
                          item.quantity *
                          (1 - (item.discount || 0) / 100)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 border-t-1 flex justify-between items-center py-2">
            <span className="font-semibold">Seña:</span>
            <span className="text-lg">
              {formatCurrency(budget.deposit ? parseFloat(budget.deposit) : 0)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-bold">Total a pagar:</span>
            <span className="font-bold text-lg">
              {formatCurrency(totalToPay)}
            </span>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Métodos de pago</h3>
          {paymentMethods.map((method, index) => (
            <div key={index} className="flex items-center gap-2 mb-2">
              <Select
                options={paymentOptions}
                noOptionsMessage={() => "No se encontraron opciones"}
                value={paymentOptions.find((o) => o.value === method.method)}
                onChange={(selected) =>
                  selected &&
                  handlePaymentMethodChange(index, "method", selected.value)
                }
                className="min-w-40"
                classNamePrefix="react-select"
              />

              <div className="relative w-full">
                <InputCash
                  value={method.amount}
                  onChange={(value) =>
                    handlePaymentMethodChange(index, "amount", value)
                  }
                  placeholder="Monto"
                />
                {index === paymentMethods.length - 1 &&
                  paymentMethods.reduce((sum, m) => sum + m.amount, 0) >
                    totalToPay + 0.1 && (
                    <span className="text-xs text-red-500 ml-2">
                      Exceso:{" "}
                      {formatCurrency(
                        paymentMethods.reduce((sum, m) => sum + m.amount, 0) -
                          totalToPay
                      )}
                    </span>
                  )}
              </div>

              {paymentMethods.length > 1 && (
                <button
                  onClick={() => removePaymentMethod(index)}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          ))}

          {paymentMethods.length < paymentOptions.length && (
            <button
              onClick={addPaymentMethod}
              className="text-blue-500 hover:text-blue-700 text-sm flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Agregar otro método de pago
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
