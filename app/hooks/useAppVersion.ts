"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { APP_VERSION } from "@/app/lib/constants/constants";
import { db } from "@/app/database/db";

export const useAppVersion = () => {
  const [setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStoredVersion, setCurrentStoredVersion] = useState<
    string | undefined
  >();
  const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);

  const [isAutoUpdate, setIsAutoUpdate] = useState(false);

  const minLoadTimePassedRef = useRef(false);

  const updateStoredVersion = useCallback(async () => {
    try {
      const existingPrefs = await db.userPreferences.get(1);
      if (existingPrefs) {
        await db.userPreferences.update(existingPrefs.id!, {
          appVersion: APP_VERSION,
        });
      } else {
        await db.userPreferences.add({
          appVersion: APP_VERSION,
          acceptedTerms: false,
          itemsPerPage: 10,
        });
      }
    } catch (error) {
      console.error("âŒ Error guardando versión:", error);
      throw error;
    }
  }, []);

  // Actualización automática (sin modal)
  const autoUpdate = useCallback(async () => {
    setIsUpdating(true);
    setIsAutoUpdate(true); // Marcar como actualización automática
    setMinLoadTimePassed(false);
    minLoadTimePassedRef.current = false;

    let minLoadTimer: NodeJS.Timeout | undefined = undefined;

    try {
      // Temporizador más corto para actualización automática (2 segundos)
      minLoadTimer = setTimeout(() => {
        setMinLoadTimePassed(true);
        minLoadTimePassedRef.current = true;
      }, 2000);

      // Actualizar la versión almacenada
      await updateStoredVersion();

      // Esperar a que pase el tiempo mínimo
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (minLoadTimePassedRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      if (minLoadTimer) clearTimeout(minLoadTimer);

      // Recargar sin mostrar interfaz
      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (error) {
      console.error("âŒ Error durante la actualización automática:", error);
      if (minLoadTimer) clearTimeout(minLoadTimer);
      setIsUpdating(false);
      setIsAutoUpdate(false);
      setMinLoadTimePassed(false);
      minLoadTimePassedRef.current = false;
    }
  }, [updateStoredVersion]);

  // Verificar si hay una nueva versión
  const checkForUpdates = useCallback(async () => {
    try {
      const preferences = await db.userPreferences.get(1);
      const storedVersion = preferences?.appVersion;

      setCurrentStoredVersion(storedVersion);

      // Si no hay versión almacenada, es la primera vez - guardar y no mostrar modal
      if (!storedVersion) {
        await updateStoredVersion();
        return false;
      }

      if (storedVersion !== APP_VERSION) {
        await autoUpdate();
        return true;
      }

      return false;
    } catch (error) {
      console.error("âŒ Error checking app version:", error);
      return false;
    }
  }, [updateStoredVersion, autoUpdate]);

  const forceUpdate = useCallback(async () => {
    await autoUpdate();
  }, [autoUpdate]);

  const logoutAndUpdate = useCallback(async () => {
    setIsUpdating(true);
    setMinLoadTimePassed(false);
    minLoadTimePassedRef.current = false;

    let minLoadTimer: NodeJS.Timeout | undefined = undefined;

    try {
      minLoadTimer = setTimeout(() => {
        setMinLoadTimePassed(true);
        minLoadTimePassedRef.current = true;
      }, 2000);

      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });
      await updateStoredVersion();

      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (minLoadTimePassedRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      if (minLoadTimer) clearTimeout(minLoadTimer);

      setTimeout(() => {
        window.location.href = "/login";
      }, 300);
    } catch (error) {
      console.error("âŒ Error durante logout y update:", error);
      if (minLoadTimer) clearTimeout(minLoadTimer);
      setIsUpdating(false);
      setMinLoadTimePassed(false);
      minLoadTimePassedRef.current = false;
    }
  }, [updateStoredVersion]);

  // Verificar actualizaciones al montar
  useEffect(() => {
    const initializeVersion = async () => {
      await checkForUpdates();
    };

    // Pequeño delay para no interferir con la carga inicial
    const timer = setTimeout(() => {
      initializeVersion();
    }, 1000);

    // Verificar periódicamente (cada 5 minutos)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkForUpdates]);

  return {
    showUpdateModal: false, // Siempre false para no mostrar modal
    setShowUpdateModal,
    isUpdating,
    minLoadTimePassed,
    forceUpdate,
    logoutAndUpdate,
    currentVersion: APP_VERSION,
    storedVersion: currentStoredVersion,
    checkForUpdates,
    isAutoUpdate, // Nuevo valor para saber si es automático
  };
};
