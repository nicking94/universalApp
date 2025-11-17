"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { APP_VERSION } from "@/app/lib/constants/constants";
import { db } from "../database/db";

export const useAppVersion = () => {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStoredVersion, setCurrentStoredVersion] = useState<
    string | undefined
  >();
  const [minLoadTimePassed, setMinLoadTimePassed] = useState(false);

  // Usar useRef para evitar dependencias en useCallback
  const minLoadTimePassedRef = useRef(false);

  // Actualizar la versión almacenada
  const updateStoredVersion = useCallback(async () => {
    try {
      console.log("💾 Guardando nueva versión en DB:", APP_VERSION);

      const existingPrefs = await db.userPreferences.get(1);
      if (existingPrefs) {
        await db.userPreferences.update(existingPrefs.id!, {
          appVersion: APP_VERSION,
        });
      } else {
        // Agregar valores por defecto para consistencia
        await db.userPreferences.add({
          appVersion: APP_VERSION,
          acceptedTerms: false,
          itemsPerPage: 10,
        });
      }

      console.log("✅ Versión guardada exitosamente");
    } catch (error) {
      console.error("❌ Error guardando versión:", error);
      throw error; // Propagar el error
    }
  }, []);

  // Verificar si hay una nueva versión
  const checkForUpdates = useCallback(async () => {
    try {
      console.log("🔍 Verificando actualizaciones...");
      console.log("📦 Versión actual:", APP_VERSION);

      const preferences = await db.userPreferences.get(1);
      const storedVersion = preferences?.appVersion;

      console.log("💾 Versión almacenada en DB:", storedVersion);

      setCurrentStoredVersion(storedVersion);

      // Si no hay versión almacenada, es la primera vez - guardar y no mostrar modal
      if (!storedVersion) {
        console.log("📝 Primera ejecución, guardando versión inicial");
        await updateStoredVersion();
        return false;
      }

      if (storedVersion !== APP_VERSION) {
        console.log("🆕 Nueva versión detectada! Mostrando modal...");
        setShowUpdateModal(true);
        return true;
      }

      console.log("✅ Versión actualizada");
      return false;
    } catch (error) {
      console.error("❌ Error checking app version:", error);
      return false;
    }
  }, [updateStoredVersion]);

  // Forzar actualización con tiempo mínimo
  const forceUpdate = useCallback(async () => {
    setIsUpdating(true);
    setMinLoadTimePassed(false);
    minLoadTimePassedRef.current = false;

    console.log("🔄 Iniciando actualización forzada...");

    // Inicializar con undefined y usar tipo específico
    let minLoadTimer: NodeJS.Timeout | undefined = undefined;

    try {
      // Iniciar temporizador de 4 segundos
      minLoadTimer = setTimeout(() => {
        setMinLoadTimePassed(true);
        minLoadTimePassedRef.current = true;
        console.log("⏰ Tiempo mínimo completado, procediendo con recarga...");
      }, 4000);

      // Actualizar la versión almacenada primero
      await updateStoredVersion();

      // Esperar a que pase el tiempo mínimo antes de recargar
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (minLoadTimePassedRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Limpiar el timer y recargar
      if (minLoadTimer) clearTimeout(minLoadTimer);
      console.log("🔄 Recargando aplicación...");

      // Pequeño delay adicional para asegurar que la UI se actualice
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error("❌ Error durante la actualización:", error);
      if (minLoadTimer) clearTimeout(minLoadTimer);
      setIsUpdating(false);
      setMinLoadTimePassed(false);
      minLoadTimePassedRef.current = false;
    }
  }, [updateStoredVersion]);

  // Cerrar sesión y actualizar con tiempo mínimo
  const logoutAndUpdate = useCallback(async () => {
    console.log("🚪 Cerrando sesión y actualizando...");
    setIsUpdating(true);
    setMinLoadTimePassed(false);
    minLoadTimePassedRef.current = false;

    // Inicializar con undefined y usar tipo específico
    let minLoadTimer: NodeJS.Timeout | undefined = undefined;

    try {
      // Iniciar temporizador de 4 segundos
      minLoadTimer = setTimeout(() => {
        setMinLoadTimePassed(true);
        minLoadTimePassedRef.current = true;
        console.log(
          "⏰ Tiempo mínimo completado, procediendo con redirección..."
        );
      }, 4000);

      // Cerrar sesión
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });

      // Actualizar versión
      await updateStoredVersion();

      // Esperar a que pase el tiempo mínimo antes de redirigir
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (minLoadTimePassedRef.current) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });

      // Limpiar el timer y redirigir
      if (minLoadTimer) clearTimeout(minLoadTimer);

      // Pequeño delay adicional para asegurar que la UI se actualice
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    } catch (error) {
      console.error("❌ Error durante logout y update:", error);
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

    initializeVersion();

    // Verificar periódicamente (cada 5 minutos)
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [checkForUpdates]);

  return {
    showUpdateModal,
    setShowUpdateModal,
    isUpdating,
    minLoadTimePassed,
    forceUpdate,
    logoutAndUpdate,
    currentVersion: APP_VERSION,
    storedVersion: currentStoredVersion,
    checkForUpdates,
  };
};
