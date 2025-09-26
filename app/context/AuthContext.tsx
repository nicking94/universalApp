// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../database/db";
import { USERS, PAYMENT_REMINDERS_CONFIG } from "../lib/constants/constants";

interface User {
  id: number;
  username: string | undefined;
  password: string | undefined;
  isTrial: boolean;
  paymentReminderDay?: number; // Nueva propiedad opcional
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  userId: number | null;
  user: User | null;
  setIsAuthenticated: (authStatus: boolean, userId?: number) => void;
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

  useEffect(() => {
    const checkAuth = async () => {
      const authData = await db.auth.get(1);
      const authStatus = authData?.isAuthenticated || false;
      const userId = authData?.userId || null;

      setIsAuthenticated(authStatus);
      setUserId(userId);

      // Encontrar el usuario completo basado en el ID
      if (userId) {
        const userFound = USERS.find((u) => u.id === userId);
        if (userFound) {
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
        }
      } else {
        setUser(null);
      }
    };

    checkAuth();
  }, []);

  const updateAuthStatus = async (authStatus: boolean, userId?: number) => {
    setIsAuthenticated(authStatus);
    setUserId(userId || null);

    // Actualizar información del usuario
    if (authStatus && userId) {
      const userFound = USERS.find((u) => u.id === userId);
      if (userFound) {
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
