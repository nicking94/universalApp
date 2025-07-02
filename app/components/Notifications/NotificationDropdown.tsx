"use client";
import { Notification } from "../../lib/types/types";
import { XMarkIcon, CheckIcon, TrashIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface NotificationDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

const NotificationDropdown = ({
  notifications,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) => {
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <div className="absolute right-0 mt-2 w-120 bg-white dark:bg-gray_b rounded-md shadow dark:shadow-gray_l overflow-hidden z-50 border border-gay-200 dark:border-gray_b ">
      <div className="p-3 border-b border-gray_xl dark:border-gray_m flex justify-between items-center bg-gray_xxl dark:bg-black">
        <h3 className="font-medium text-gray_m dark:text-white">
          Notificaciones
        </h3>
        <div className="flex space-x-2">
          {unreadNotifications.length > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="cursor-pointer text-xs text-blue_b dark:text-blue_b hover:underline"
              title="Marcar todas como leídas"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="cursor-pointer text-gray_l hover:text-gray_b dark:hover:text-gray_xl"
            title="Cerrar"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-gray_l dark:text-gray_xl">
            No hay notificaciones
          </div>
        ) : (
          <>
            {unreadNotifications.length > 0 && (
              <div className="bg-blue_l dark:bg-blue_m px-3 py-1 text-xs text-white font-semibold dark:text-blue_xl  ">
                Sin leer
              </div>
            )}
            {unreadNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                isUnread={true}
              />
            ))}

            {readNotifications.length > 0 && (
              <div className="bg-gray_xxl font-semibold dark:bg-gray_m px-3 py-1 text-xs text-gray_m dark:text-gray_xl">
                Leídas
              </div>
            )}
            {readNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={onMarkAsRead}
                onDelete={onDelete}
                isUnread={false}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  isUnread,
}: {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isUnread: boolean;
}) => {
  return (
    <div
      className={`p-3 border-b border-gray_xl dark:border-gray_m ${
        isUnread ? "bg-blue_xl dark:bg-blue_xl" : ""
      }`}
    >
      <div className="flex justify-between">
        <div className="flex-1 min-w-0">
          <h4
            className={`text-sm font-medium truncate ${
              isUnread ? "text-gray_b " : " dark:text-white"
            }`}
          >
            {notification.title}
          </h4>
          <p
            className={`text-sm text-gray_b dark:text-gray_m mt-1 whitespace-pre-line ${
              isUnread ? "" : "dark:text-gray_xl"
            }`}
          >
            {notification.message}
          </p>
          <div className={`flex items-center mt-1 text-xs text-gray_l`}>
            <span>
              {formatDistanceToNow(new Date(notification.date || new Date()), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
        </div>
        <div className="ml-2 flex items-start">
          <button
            onClick={() => notification.id && onDelete(notification.id)}
            className={`${
              isUnread ? "text-gray_m" : "dark:text-gray_xl"
            } cursor-pointer  hover:text-red_m dark:hover:text-red_m p-1`}
            title="Eliminar"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          {isUnread && notification.id && (
            <button
              onClick={() => onMarkAsRead(notification.id!)}
              className="cursor-pointer text-gray_m hover:text-green_b dark:hover:text-green_b p-1 ml-1"
              title="Marcar como leída"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;
