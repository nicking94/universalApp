"use client";
import { useEffect, useState } from "react";
import { IconButton, Badge, useTheme } from "@mui/material";
import {
  Notifications as NotificationsIcon,
  NotificationsActive as NotificationsActiveIcon,
} from "@mui/icons-material";
import NotificationDropdown from "./NotificationDropdown";
import {
  observeNotifications,
  observeUnreadCount,
  markNotificationAsRead,
  deleteNotification,
  markAllAsRead,
} from "../../services/notifications";
import { NotificationType } from "@/app/lib/types/types";
import CustomGlobalTooltip from "../CustomTooltipGlobal";

const NotificationIcon = () => {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

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
      <CustomGlobalTooltip title="Notificaciones">
        <IconButton
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": {
              color: theme.palette.text.secondary,
              transform: "scale(1.05)",
              backgroundColor: "transparent",
            },
            transition: "all 0.3s ease",
            padding: "4px",
          }}
        >
          <Badge
            badgeContent={unreadCount}
            color="error"
            sx={{
              "& .MuiBadge-badge": {
                fontSize: "0.75rem",
                height: "20px",
                minWidth: "20px",
                borderRadius: "10px",
              },
            }}
          >
            {unreadCount > 0 ? (
              <NotificationsActiveIcon
                sx={{
                  fontSize: "24px",
                  color: theme.palette.primary.main,
                }}
              />
            ) : (
              <NotificationsIcon
                sx={{
                  fontSize: "24px",
                }}
              />
            )}
          </Badge>
        </IconButton>
      </CustomGlobalTooltip>

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
