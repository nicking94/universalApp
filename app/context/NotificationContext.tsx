"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import Notification from "@/app/components/Notification";
import { NotificationProps } from "../lib/types/types";

type NotificationContextType = {
  showNotification: (
    message: string,
    type: "success" | "error" | "info"
  ) => void;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notification, setNotification] = useState<NotificationProps>({
    isOpen: false,
    message: "",
    type: "success",
  });

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotification({ isOpen: true, message, type });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, isOpen: false })),
      3000
    );
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification.isOpen && (
        <Notification
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
        />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};
