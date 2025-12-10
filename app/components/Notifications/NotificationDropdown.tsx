"use client";

import { NotificationType } from "@/app/lib/types/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Close as CloseIcon,
  Check as CheckIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import CustomChip from "../CustomChip";
import CustomGlobalTooltip from "../CustomTooltipGlobal";

interface NotificationDropdownProps {
  notifications: NotificationType[];
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
  const theme = useTheme();
  const unreadNotifications = notifications.filter((n) => !n.read);
  const readNotifications = notifications.filter((n) => n.read);

  return (
    <Box
      sx={{
        position: "absolute",
        right: 0,
        top: "100%",
        mt: 1,
        width: 400,
        bgcolor: "background.paper",
        borderRadius: 1,
        boxShadow: 3,
        overflow: "hidden",
        zIndex: 50,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: "grey.50",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" component="h3" color="text.primary">
          Notificaciones
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          {unreadNotifications.length > 0 && (
            <CustomGlobalTooltip title="Marcar todas como leídas">
              <IconButton
                onClick={onMarkAllAsRead}
                size="small"
                sx={{
                  color: "primary.main",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </CustomGlobalTooltip>
          )}
          <CustomGlobalTooltip title="Cerrar">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: alpha(theme.palette.text.secondary, 0.1),
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </CustomGlobalTooltip>
        </Box>
      </Box>

      {/* Notifications List */}
      <Box sx={{ maxHeight: "55vh", overflow: "auto" }}>
        {notifications.length === 0 ? (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              No hay notificaciones
            </Typography>
          </Box>
        ) : (
          <>
            {/* Unread Notifications Section */}
            {unreadNotifications.length > 0 && (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor: "primary.main",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "white",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    Sin leer
                  </Typography>
                </Box>
                <List sx={{ p: 0 }}>
                  {unreadNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={onMarkAsRead}
                      onDelete={onDelete}
                      isUnread={true}
                    />
                  ))}
                </List>
              </>
            )}

            {/* Read Notifications Section */}
            {readNotifications.length > 0 && (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    bgcolor:
                      theme.palette.mode === "dark" ? "grey.800" : "grey.200",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                    }}
                  >
                    Leídas
                  </Typography>
                </Box>
                <List sx={{ p: 0 }}>
                  {readNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={onMarkAsRead}
                      onDelete={onDelete}
                      isUnread={false}
                    />
                  ))}
                </List>
              </>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onDelete,
  isUnread,
}: {
  notification: NotificationType;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  isUnread: boolean;
}) => {
  const theme = useTheme();

  return (
    <ListItem
      sx={{
        p: 2,
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: isUnread
          ? alpha(theme.palette.primary.light, 0.1)
          : "transparent",
        "&:last-child": {
          borderBottom: "none",
        },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: isUnread ? "bold" : "normal",
            color: isUnread ? "text.primary" : "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {notification.title}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: isUnread ? "text.primary" : "text.secondary",
            mt: 0.5,
            whiteSpace: "pre-line",
            wordBreak: "break-word",
          }}
        >
          {notification.message}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(notification.date || new Date()), {
              addSuffix: true,
              locale: es,
            })}
          </Typography>
          {isUnread && (
            <CustomChip
              label="Nuevo"
              size="small"
              color="primary"
              sx={{ ml: 1, height: 20, fontSize: "0.6rem" }}
            />
          )}
        </Box>
      </Box>
      <Box sx={{ ml: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        <CustomGlobalTooltip title="Eliminar">
          <IconButton
            onClick={() => notification.id && onDelete(notification.id)}
            size="small"
            sx={{
              color: "text.secondary",
              "&:hover": {
                color: "error.main",
                backgroundColor: alpha(theme.palette.error.main, 0.1),
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </CustomGlobalTooltip>
        {isUnread && notification.id && (
          <CustomGlobalTooltip title="Marcar como leída">
            <IconButton
              onClick={() => onMarkAsRead(notification.id!)}
              size="small"
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "success.main",
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                },
              }}
            >
              <CheckCircleIcon fontSize="small" />
            </IconButton>
          </CustomGlobalTooltip>
        )}
      </Box>
    </ListItem>
  );
};

export default NotificationDropdown;
