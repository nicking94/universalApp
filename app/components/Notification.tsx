"use client";

import { NotificationProps } from "../lib/types/types";

export default function Notification({
  isOpen,
  message,
  type,
}: NotificationProps) {
  if (!isOpen) return null;

  const typeClasses = {
    success: "bg-gradient-to-bl from-green_m to-green_b",
    error: "bg-gradient-to-bl from-red_m to-red_b",
    info: "bg-gradient-to-bl from-blue_m to-blue_b",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 p-2 rounded-sm text-white ${typeClasses[type]} z-50`}
    >
      {message}
    </div>
  );
}
