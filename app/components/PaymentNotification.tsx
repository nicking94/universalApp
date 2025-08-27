"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { PAYMENT_NOTIFICATION_USERNAME } from "../lib/constants/constants";

export default function PaymentNotification() {
  const [showNotification, setShowNotification] = useState(false);
  const [periodo, setPeriodo] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    // Verificar si es el usuario correcto y si es día 27 del mes
    const today = new Date();
    const isEighthDay = today.getDate() === 8;
    const isTargetUser = user?.username === PAYMENT_NOTIFICATION_USERNAME;

    // Obtener el nombre del mes en español
    const meses = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const mesActual = meses[today.getMonth()];
    const añoActual = today.getFullYear();

    setPeriodo(`${mesActual} - ${añoActual}`);

    setShowNotification(isEighthDay && isTargetUser);
  }, [user]);

  if (!showNotification) return null;

  return (
    <div className="fixed top-20 right-4 bg-white border-l-4 border-blue_m text-blue_b p-4 rounded shadow-md z-50 max-w-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold">Recordatorio de pago</p>
          <p>
            La factura del período <strong>{periodo}</strong> está lista para
            ser abonada
          </p>
        </div>
        <button
          onClick={() => setShowNotification(false)}
          className="text-2xl cursor-pointer text-blue_m hover:blue_b ml-4"
        >
          ×
        </button>
      </div>
    </div>
  );
}
