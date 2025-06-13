"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AuthForm from "@/app/components/AuthForm";
import Notification from "@/app/components/Notification";
import { AuthData, User } from "@/app/lib/types/types";
import { TRIAL_CREDENTIALS, USERS } from "@/app/lib/constants/constants";
import { db } from "../../database/db";

const LoginPage = () => {
  const router = useRouter();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsCheckbox, setShowTermsCheckbox] = useState(true);
  const [isOpenNotification, setIsOpenNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("error");

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await db.userPreferences.get(1);
        if (preferences) {
          setAcceptedTerms(preferences.acceptedTerms);
          // Solo mostrar el checkbox si nunca se han aceptado los términos
          setShowTermsCheckbox(!preferences.acceptedTerms);
        }
      } catch (error) {
        console.error("Error cargando preferencias:", error);
        setAcceptedTerms(false);
        setShowTermsCheckbox(true);
      }
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("expired") === "true") {
      setNotificationMessage("Su periodo de prueba ha expirado");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
    }

    const initializeUsers = async () => {
      const adminUser = await db.users
        .where("username")
        .equals("admin")
        .first();
      if (adminUser) {
        await db.users.delete(adminUser.id);
      }
      const count = await db.users.count();
      if (count === 0) {
        const usersToAdd: User[] = USERS.map((user) => {
          if (!user.username || !user.password) {
            throw new Error("Username or password is undefined");
          }
          return {
            id: user.id,
            username: user.username,
            password: user.password,
          };
        });
        await db.users.bulkAdd(usersToAdd);
      } else {
        const adminUser = await db.users.get(2);
        if (!adminUser || adminUser.username !== "administrador") {
          await db.users.put({
            id: 2,
            username: "administrador",
            password: "administrador",
          });
        }
      }
    };
    initializeUsers();
  }, []);

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
    // Solo validar términos si es la primera vez
    if (showTermsCheckbox && !acceptedTerms) {
      setNotificationMessage("Debes aceptar los términos y condiciones");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }

    // Guardar preferencias solo si es la primera vez
    if (showTermsCheckbox) {
      await db.userPreferences.put({
        id: 1,
        acceptedTerms: true,
        acceptedTermsDate: new Date().toISOString(),
      });
    }
    if (!acceptedTerms) {
      setNotificationMessage("Debes aceptar los términos y condiciones");
      setNotificationType("error");
      setIsOpenNotification(true);
      setTimeout(() => setIsOpenNotification(false), 2500);
      return;
    }
    await db.userPreferences.put({
      id: 1,
      acceptedTerms: true,
      acceptedTermsDate: new Date().toISOString(),
    });
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

    await db.auth.put({ id: 1, isAuthenticated: true, userId: user.id });
    await db.appState.put({ id: 1, lastActiveDate: new Date() });

    setNotificationMessage("Inicio de sesión exitoso");
    setNotificationType("success");
    setIsOpenNotification(true);
    setTimeout(() => {
      setIsOpenNotification(false);
      router.replace("/caja-diaria");
    }, 2500);
  };

  return (
    <div className="min-h-screen flex">
      <AuthForm
        type="login"
        onSubmit={handleLogin}
        showTermsCheckbox={showTermsCheckbox}
        acceptedTerms={acceptedTerms}
        onTermsCheckboxChange={setAcceptedTerms}
      />
      <div className="w-[65%] xl:w-[75%]  flex flex-col justify-center bg-gradient-to-bl from-blue_m to-blue_xl">
        <div className="bg-gradient-to-bl from-blue_xl to-blue_xl flex justify-center text-center relative">
          <div
            className="shadow-lg shadow-yellow-100 rounded-full w-75 h-75 z-10 space-y-2 flex flex-col items-center justify-center text-center relative overflow-visible"
            style={{
              background:
                "radial-gradient(circle at center, #fef9c3 0%, #fef3c7 40%, #fde68a 90%)",

              transition: "all 0.3s ease-out",
            }}
          >
            <h1 className="italic text-4xl font-medium text-blue_b">
              Contacto
            </h1>
            <p className="text-lg text-blue_b italic">
              Email: universalweb94@gmail.com
            </p>
            <a
              href="https://wa.me/5492613077147"
              target="_blank"
              rel="noopener noreferrer"
              className="border-b-2 border-blue_xl cursor-pointer hover:text-blue-500 transition-colors duration-300"
            >
              <p className="text-lg text-blue_b italic hover:scale-105 transition-all duration-300">
                Whatsapp: +54 26130771477
              </p>
            </a>

            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 12 }).map((_, i) => {
                const rotation = i * 30;
                const delay = `${i * 0.8}s`;
                return (
                  <div
                    key={i}
                    className="absolute w-[0.15rem] h-37 bottom-[50%] left-[50%] origin-bottom -translate-x-1/2 ray-pulse rounded-full "
                    style={
                      {
                        "--rotation": `${rotation}deg`,
                        "--delay": delay,
                        transform: `rotate(${rotation}deg) translateY(-100%)`,
                        background:
                          "linear-gradient(to bottom, rgba(254, 230, 165, 0.7), rgba(254, 220, 125, 0.9))",
                        transition: "all 0.3s ease-out",
                      } as React.CSSProperties
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <Notification
        isOpen={isOpenNotification}
        message={notificationMessage}
        type={notificationType}
      />
    </div>
  );
};

export default LoginPage;
