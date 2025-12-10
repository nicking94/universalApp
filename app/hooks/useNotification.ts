// hooks/useNotification.ts
"use client";
import { useState, useCallback } from "react";

export type NotificationType = "success" | "error" | "info";

export interface UseNotificationReturn {
  isNotificationOpen: boolean;
  notificationMessage: string;
  notificationType: NotificationType;
  showNotification: (message: string, type: NotificationType) => void;
  closeNotification: () => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("success");

  const showNotification = useCallback(
    (notificationMessage: string, notificationType: NotificationType) => {
      setType(notificationType);
      setMessage(notificationMessage);
      setIsOpen(true);
    },
    []
  );

  const closeNotification = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isNotificationOpen: isOpen,
    notificationMessage: message,
    notificationType: type,
    showNotification,
    closeNotification,
  };
};
