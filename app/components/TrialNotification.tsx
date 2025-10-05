"use client";
import { useEffect, useState } from "react";
import { db } from "../database/db";
import { TRIAL_CREDENTIALS } from "../lib/constants/constants";
import { Tags, BadgePercent, Zap, AlertTriangle } from "lucide-react";

const TrialNotification = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [discountDate, setDiscountDate] = useState<string>("");

  const checkAuthState = async () => {
    try {
      const auth = await db.auth.get(1);
      const authenticated = auth?.isAuthenticated ?? false;
      setIsAuthenticated(authenticated);

      if (authenticated && auth?.userId) {
        const user = await db.users.get(auth.userId);

        if (!user) {
          console.error("Usuario no encontrado");
          setUserId(null);
          setIsDemoUser(false);
          return;
        }

        setUserId(auth.userId);
        setIsDemoUser(user.username === TRIAL_CREDENTIALS.username);
      } else {
        setUserId(null);
        setIsDemoUser(false);
      }
    } catch (error) {
      console.error("Error verificando autenticación:", error);
      setUserId(null);
      setIsDemoUser(false);
      setIsAuthenticated(false);
    }
  };

  const calculateRemainingDays = async () => {
    try {
      let trialRecord = await db.trialPeriods.get(userId!);
      const now = new Date();

      if (!trialRecord) {
        const newRecord = {
          userId: userId!,
          firstAccessDate: now,
        };
        await db.trialPeriods.put(newRecord);
        trialRecord = newRecord;
      }

      const startDate = new Date(trialRecord.firstAccessDate);
      if (isNaN(startDate.getTime())) {
        await db.trialPeriods.put({
          userId: userId!,
          firstAccessDate: now,
        });
        setDaysLeft(7);
        return;
      }

      const diffTime = now.getTime() - startDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const remainingDays = Math.max(0, 7 - diffDays);

      setDaysLeft(remainingDays);
      await db.appState.put({ id: 1, lastActiveDate: now });

      const discountEndDate = new Date(startDate);
      discountEndDate.setDate(startDate.getDate() + 3);
      const formattedDiscountDate = discountEndDate.toLocaleDateString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );
      setDiscountDate(formattedDiscountDate);
    } catch (error) {
      console.error("Error calculando días:", error);
      setDaysLeft(null);
    }
  };

  useEffect(() => {
    checkAuthState();
    const interval = setInterval(checkAuthState, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !userId || !isDemoUser) {
      setDaysLeft(null);
      return;
    }

    calculateRemainingDays();
    const interval = setInterval(calculateRemainingDays, 3600000);
    return () => clearInterval(interval);
  }, [userId, isDemoUser, isAuthenticated]);

  const getNotificationStyle = () => {
    if (!daysLeft) return "";

    if (daysLeft >= 4) {
      return "bg-green_xl text-green_b";
    }
    if (daysLeft >= 2 && daysLeft < 4) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-red_l text-red_b";
  };

  const getNotificationMessage = () => {
    if (!daysLeft) return "";

    if (daysLeft === 0) {
      return (
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            ¡Periodo de prueba finalizado! La sesión se cerrará automáticamente
          </span>
        </div>
      );
    }
    if (daysLeft === 1) {
      return (
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 animate-bounce" />
          <span>¡Último día de prueba!</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Tags className="w-4 h-4" />
        <span>Días restantes de prueba: {daysLeft}</span>
      </div>
    );
  };

  const getDiscountMessage = () => {
    if (!daysLeft || !discountDate) return "";

    const now = new Date();
    const discountEndDate = new Date(
      discountDate.split("/").reverse().join("-")
    );

    if (now > discountEndDate) {
      return `Descuento vencido, puedes seguir navegando la demo por ${daysLeft} días`;
    }
    return (
      <div className="flex items-center gap-2">
        <BadgePercent className="w-5 h-5 text-red_m animate-pulse" />
        <span className="font-bold">20% OFF</span>
        <span>hasta el {discountDate}</span>
      </div>
    );
  };

  if (!isAuthenticated || !isDemoUser || daysLeft === null) {
    return null;
  }

  return (
    <div className="fixed top-0 left-4/7 transform -translate-x-1/2 z-99 flex flex-col items-center">
      <div
        className={`animate-pulse px-4 2xl:px-6 py-1 rounded-md shadow-lg text-xs font-medium ${getNotificationStyle()}`}
      >
        {getNotificationMessage()}
      </div>
      {daysLeft > 0 && (
        <div className="mt-3 px-4 py-1 bg-blue_xl text-blue_b shadow-md shadow-blue_l border-blue_l rounded-md text-md font-medium flex items-center">
          {getDiscountMessage()}
        </div>
      )}
    </div>
  );
};

export default TrialNotification;
