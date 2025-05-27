"use client";
import { useEffect, useState } from "react";
import { db } from "../database/db";
import { TRIAL_CREDENTIALS } from "../lib/constants/constants";

const TrialNotification = () => {
  const [userId, setUserId] = useState<number | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

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
      return "bg-green-100 text-green-800";
    }
    if (daysLeft >= 2 && daysLeft < 4) {
      return "bg-yellow-100 text-yellow-800";
    }
    return "bg-red-100 text-red-800";
  };

  const getNotificationMessage = () => {
    if (!daysLeft) return "";

    if (daysLeft === 0) {
      return "¡Periodo de prueba finalizado! La sesión se cerrará automáticamente";
    }
    if (daysLeft === 1) {
      return "¡Último día de prueba!";
    }
    return `Días restantes de prueba: ${daysLeft}`;
  };

  if (!isAuthenticated || !isDemoUser || daysLeft === null) {
    return null;
  }

  return (
    <div
      className={`animate-pulse fixed top-0 left-4/7 transform -translate-x-1/2 px-4 2xl:px-6 py-1 rounded-md shadow-lg z-99 text-xs font-medium ${getNotificationStyle()}`}
    >
      {getNotificationMessage()}
    </div>
  );
};

export default TrialNotification;
