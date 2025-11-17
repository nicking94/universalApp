// context/AuthContext.tsx
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../database/db";
import { USERS, PAYMENT_REMINDERS_CONFIG } from "../lib/constants/constants";

interface User {
  id: number;
  username: string | undefined;
  password: string | undefined;
  isTrial: boolean;
  isActive?: boolean; // Nueva propiedad
  paymentReminderDay?: number;
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  userId: number | null;
  user: User | null;
  setIsAuthenticated: (authStatus: boolean, userId?: number) => void;
  logoutUser: (username?: string) => Promise<void>; // Nueva función
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Función para cerrar sesión de un usuario específico
  const logoutUser = async (username?: string) => {
    // Si se especifica un username, verificar si es el usuario actual
    if (username && user?.username === username) {
      await forceLogout();
    } else if (!username) {
      // Cerrar sesión del usuario actual
      await forceLogout();
    }
  };

  const forceLogout = async () => {
    setIsAuthenticated(false);
    setUserId(null);
    setUser(null);
    await db.auth.put({
      id: 1,
      isAuthenticated: false,
      userId: undefined,
    });
  };

  useEffect(() => {
    const checkAuth = async () => {
      const authData = await db.auth.get(1);
      const authStatus = authData?.isAuthenticated || false;
      const userId = authData?.userId || null;

      // Verificar si el usuario está activo
      if (authStatus && userId) {
        const userFound = USERS.find((u) => u.id === userId);

        // Si el usuario no está activo, forzar cierre de sesión
        if (userFound && userFound.isActive === false) {
          await forceLogout();
          return;
        }
      }

      setIsAuthenticated(authStatus);
      setUserId(userId);

      // Encontrar el usuario completo basado en el ID
      if (userId) {
        const userFound = USERS.find((u) => u.id === userId);
        if (userFound && userFound.isActive !== false) {
          // Buscar si hay configuración de recordatorio para este usuario
          const reminderConfig = PAYMENT_REMINDERS_CONFIG.find(
            (config) => config.username === userFound.username
          );

          // Crear usuario con la información de recordatorio
          const userWithReminder = {
            ...userFound,
            paymentReminderDay: reminderConfig?.reminderDay,
          };

          setUser(userWithReminder);
        } else {
          setUser(null);
          // Si el usuario no está activo, limpiar la autenticación
          if (authStatus) {
            await forceLogout();
          }
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const updateAuthStatus = async (authStatus: boolean, userId?: number) => {
    // Verificar si el usuario está activo antes de autenticar
    if (authStatus && userId) {
      const userFound = USERS.find((u) => u.id === userId);
      if (userFound && userFound.isActive === false) {
        // No permitir login si el usuario no está activo
        setIsAuthenticated(false);
        setUserId(null);
        setUser(null);
        await db.auth.put({
          id: 1,
          isAuthenticated: false,
          userId: undefined,
        });
        return;
      }
    }

    setIsAuthenticated(authStatus);
    setUserId(userId || null);

    // Actualizar información del usuario
    if (authStatus && userId) {
      const userFound = USERS.find((u) => u.id === userId);
      if (userFound && userFound.isActive !== false) {
        // Buscar configuración de recordatorio
        const reminderConfig = PAYMENT_REMINDERS_CONFIG.find(
          (config) => config.username === userFound.username
        );

        const userWithReminder = {
          ...userFound,
          paymentReminderDay: reminderConfig?.reminderDay,
        };

        setUser(userWithReminder);
      } else {
        setUser(null);
      }
    } else {
      setUser(null);
    }

    await db.auth.put({
      id: 1,
      isAuthenticated: authStatus,
      userId: authStatus ? userId : undefined,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userId,
        user,
        setIsAuthenticated: updateAuthStatus,
        logoutUser, // Exportar la nueva función
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
