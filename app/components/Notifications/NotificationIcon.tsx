"use client";
import { useEffect, useState } from "react";
import { Notification } from "../../lib/types/types";
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

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
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
        className="cursor-pointer hover:scale-105 transition-all duration-300 p-1 rounded-full text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none relative"
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
