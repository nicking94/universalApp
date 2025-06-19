import { createContext, useContext, useState, useEffect } from "react";
import { db } from "../database/db";

interface AuthContextType {
  isAuthenticated: boolean | null;
  userId: number | null;
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
  const [userId, setUserId] = useState<number | null>(null); // Nuevo estado

  useEffect(() => {
    const checkAuth = async () => {
      const authData = await db.auth.get(1);
      setIsAuthenticated(authData?.isAuthenticated || false);
      setUserId(authData?.userId || null); // Establecer userId
    };

    checkAuth();
  }, []);

  // En tu AuthProvider
  const updateAuthStatus = async (authStatus: boolean, userId?: number) => {
    setIsAuthenticated(authStatus);
    setUserId(userId || null);

    await db.auth.put({
      id: 1,
      isAuthenticated: authStatus,
      userId: authStatus ? userId : undefined,
    });
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, userId, setIsAuthenticated: updateAuthStatus }}
    >
      {children}
    </AuthContext.Provider>
  );
};
