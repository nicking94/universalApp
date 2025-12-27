"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../../database/db";
import { TRIAL_CREDENTIALS, USERS } from "@/app/lib/constants/constants";
import { AuthData } from "@/app/lib/types/types";
import AuthForm from "@/app/components/AuthForm";
import Navidad from "@/app/components/LoginScreens/Navidad";
import Notification from "@/app/components/Notification";

const LoginPage = () => {
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsCheckbox, setShowTermsCheckbox] = useState(false);
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Cargar preferencias y inicializar
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);
        // Verificar si ya está autenticado
        const auth = await db.auth.get(1);
        if (auth?.isAuthenticated) {
          router.replace("/caja-diaria");
          return;
        }

        // 1. Cargar preferencias primero
        const preferences = await db.userPreferences.get(1);
        if (preferences) {
          setAcceptedTerms(preferences.acceptedTerms);
          setShowTermsCheckbox(!preferences.acceptedTerms);
        } else {
          // Si no hay preferencias, mostrar checkbox
          setShowTermsCheckbox(true);
        }

        // 2. Inicializar usuarios
        for (const user of USERS) {
          const existingUser = await db.users.get(user.id);
          if (!existingUser || existingUser.username !== user.username) {
            await db.users.put({
              id: user.id,
              username: user.username,
              password: user.password,
            });
          }
        }

        const adminUser = await db.users.get(2);
        if (!adminUser || adminUser.username !== "administrador") {
          await db.users.put({
            id: 2,
            username: "demo",
            password: "demo",
          });
        }

        // 3. Verificar parámetros de URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get("expired") === "true") {
          setNotificationMessage("Su periodo de prueba ha expirado");
          setNotificationType("error");
          setIsOpenNotification(true);
          setTimeout(() => setIsOpenNotification(false), 2500);
        }

        if (urlParams.get("inactive") === "true") {
          setNotificationMessage(
            "Usuario desactivado. contacte al soporte técnico"
          );
          setNotificationType("error");
          setIsOpenNotification(true);
          setTimeout(() => setIsOpenNotification(false), 2500);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Error en inicialización:", error);
        setAcceptedTerms(false);
        setShowTermsCheckbox(true);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [router]);

  const checkTrialPeriod = async (userId: number) => {
    try {
      const now = new Date();
      const trialRecord = await db.trialPeriods.get(userId);

      if (!trialRecord) {
        await db.trialPeriods.put({
          userId: userId,
          firstAccessDate: now,
        });
        return true;
      }

      const firstAccess = new Date(trialRecord.firstAccessDate);
      if (isNaN(firstAccess.getTime())) {
        await db.trialPeriods.put({
          userId: userId,
          firstAccessDate: now,
        });
        return true;
      }

      const diffInMs = now.getTime() - firstAccess.getTime();
      const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

      return diffInDays <= 7;
    } catch (err) {
      console.error("Error al verificar periodo de prueba:", err);
      return false;
    }
  };

  const handleLogin = async (data: AuthData) => {
    if (!isInitialized || isRedirecting) return;
    if (showTermsCheckbox && !acceptedTerms) {
      setNotificationMessage("Debes aceptar los términos y condiciones");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }

    if (showTermsCheckbox) {
      await db.userPreferences.put({
        id: 1,
        acceptedTerms: true,
        acceptedTermsDate: new Date().toISOString(),
      });
      // Actualizar estado local para que no se muestre más
      setShowTermsCheckbox(false);
    }

    // Verificar si el usuario está desactivado
    const userFromConstants = USERS.find(
      (u) => u.username === data.username && u.password === data.password
    );

    if (userFromConstants && userFromConstants.isActive === false) {
      setNotificationMessage(
        "Usuario desactivado. Contacte al soporte técnico."
      );
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }

    // Verificar credenciales de prueba
    if (
      data.username === TRIAL_CREDENTIALS.username &&
      data.password === TRIAL_CREDENTIALS.password
    ) {
      const demoUser = await db.users
        .where("username")
        .equals(TRIAL_CREDENTIALS.username)
        .first();

      if (!demoUser) {
        setNotificationMessage("El periodo de prueba ha finalizado");
        setNotificationType("error");
        setIsOpenNotification(true);
        setTimeout(() => setIsOpenNotification(false), 2500);
        return;
      }

      if (demoUser) {
        const trialRecord = await db.trialPeriods.get(demoUser.id);

        if (trialRecord) {
          const firstAccess = new Date(trialRecord.firstAccessDate);
          const now = new Date();
          const diffInMs = now.getTime() - firstAccess.getTime();
          const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

          if (diffInDays > 7) {
            setNotificationMessage(
              "El periodo de prueba de 1 semana ha expirado"
            );
            setNotificationType("error");
            setIsOpenNotification(true);
            setTimeout(() => setIsOpenNotification(false), 2500);
            return;
          }
        }
      }
    }

    // Buscar usuario en la base de datos
    const user = await db.users
      .where("username")
      .equals(data.username)
      .and((user) => user.password === data.password)
      .first();

    if (!user) {
      setNotificationMessage("Usuario o contraseña incorrectos");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }

    // Verificar período de prueba para usuario demo
    if (data.username === TRIAL_CREDENTIALS.username) {
      const existingTrial = await db.trialPeriods.get(user.id);

      if (!existingTrial) {
        await db.trialPeriods.put({
          userId: user.id,
          firstAccessDate: new Date(),
        });
      }

      const isTrialValid = await checkTrialPeriod(user.id);

      if (!isTrialValid) {
        setNotificationMessage("El periodo de prueba de 1 semana ha expirado");
        setNotificationType("error");
        setIsOpenNotification(true);
        setTimeout(() => setIsOpenNotification(false), 2500);
        return;
      }
    }

    // Autenticar usuario
    await db.auth.put({ id: 1, isAuthenticated: true, userId: user.id });
    await db.appState.put({ id: 1, lastActiveDate: new Date() });

    setNotificationMessage("Inicio de sesión exitoso");
    setNotificationType("success");
    setIsOpenNotification(true);

    setIsRedirecting(true);
    setTimeout(() => {
      setIsOpenNotification(false);
      router.replace("/caja-diaria");
    }, 2500);
  };

  // Mostrar loading mientras se inicializa
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Inicializando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <AuthForm
        type="login"
        onSubmit={handleLogin}
        showTermsCheckbox={showTermsCheckbox}
        acceptedTerms={acceptedTerms}
        onTermsCheckboxChange={setAcceptedTerms}
      />
      <Navidad />

      <Notification
        isOpen={isOpenNotification}
        message={notificationMessage}
        type={notificationType}
      />
    </div>
  );
};

export default LoginPage;
