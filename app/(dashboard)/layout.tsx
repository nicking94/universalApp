"use client";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import { useRouter } from "next/navigation";
import { db } from "../database/db";
import { AuthProvider } from "../context/AuthContext";
import TrialNotification from "../components/TrialNotification";
import { BusinessDataProvider } from "../context/BusinessDataContext";
import { PaginationProvider } from "../context/PaginationContext";
import UpdatesManager from "../components/Notifications/UpdatesManager";
import PaymentNotification from "../components/PaymentNotification";
import UpdateModal from "../components/UpdateModal";
import { useAppVersion } from "../hooks/useAppVersion";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { isSidebarOpen } = useSidebar();
  const router = useRouter();
  const [theme, setTheme] = useState<string>("light");

  // Usar el hook de versión - INCLUIR minLoadTimePassed
  const {
    showUpdateModal,
    isUpdating,
    minLoadTimePassed, // ← Añadir esta línea
    forceUpdate,
    logoutAndUpdate,
    currentVersion,
    storedVersion,
  } = useAppVersion();

  const handleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleCloseSession = async () => {
    try {
      await db.auth.put({ id: 1, isAuthenticated: false, userId: undefined });
      router.replace("/login");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      const savedTheme = await db.theme.get(1);
      if (savedTheme) {
        setTheme(savedTheme.value);
      } else {
        document.documentElement.classList.add("light");
      }
    };
    loadTheme();
  }, []);

  useEffect(() => {
    const saveTheme = async () => {
      await db.theme.put({ id: 1, value: theme });
    };
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);
    saveTheme();
  }, [theme]);

  return (
    <AuthProvider>
      <BusinessDataProvider>
        <PaginationProvider>
          <div className={`bg-white dark:bg-black text-gray_b dark:text-white`}>
            <TrialNotification />
            <PaymentNotification />
            <UpdatesManager />

            {/* Modal de actualización - con alta prioridad */}
            <UpdateModal
              isOpen={showUpdateModal}
              onUpdate={forceUpdate}
              onLogout={logoutAndUpdate}
              isUpdating={isUpdating}
              minLoadTimePassed={minLoadTimePassed}
              currentVersion={currentVersion}
              storedVersion={storedVersion}
            />

            <Navbar
              theme={theme}
              handleTheme={handleTheme}
              handleCloseSession={handleCloseSession}
            />
            <div>
              <Sidebar />
              <main
                className={`${
                  isSidebarOpen ? "ml-64" : "ml-30"
                }   h-[calc(100vh-80px)] bg-blue_xl dark:bg-gray_b transition-all duration-300 overflow-y-auto`}
              >
                {children}
              </main>
            </div>
          </div>
        </PaginationProvider>
      </BusinessDataProvider>
    </AuthProvider>
  );
}
