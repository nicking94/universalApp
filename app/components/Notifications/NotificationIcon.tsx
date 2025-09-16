"use client";
import { useEffect, useState } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
import { BellAlertIcon } from "@heroicons/react/24/solid";
import NotificationDropdown from "./NotificationDropdown";
import {
  observeNotifications,
  observeUnreadCount,
  markNotificationAsRead,
  deleteNotification,
  markAllAsRead,
} from "../../services/notifications";
import { NotificationType } from "@/app/lib/types/types";

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const notifSubscription = observeNotifications(setNotifications);

    const countSubscription = observeUnreadCount(setUnreadCount);

    return () => {
      notifSubscription.unsubscribe();
      countSubscription.unsubscribe();
    };
  }, []);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cursor-pointer hover:scale-105 transition-all duration-300 p-1 rounded-full text-gray_m hover:text-gray_m dark:hover:text-gray_m focus:outline-none relative"
        title="Notificaciones"
      >
        {unreadCount > 0 ? (
          <>
            <BellAlertIcon
              className=" h-6 w-6 text-blue_m "
              title="Notificaciones"
            />
            <span className="absolute -top-1 -right-1 bg-red_m text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount}
            </span>
          </>
        ) : (
          <BellIcon className="h-6 w-6" title="Notificaciones" />
        )}
      </button>

      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          onMarkAsRead={markNotificationAsRead}
          onDelete={deleteNotification}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationIcon;
