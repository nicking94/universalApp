import { db } from "../database/db";
import { Notification } from "../lib/types/types";
import { liveQuery } from "dexie";

export const addNotification = async (
  notification: Omit<Notification, "id" | "read" | "date">
) => {
  return await db.notifications.add({
    ...notification,
    read: 0,
    date: new Date().toISOString(),
  });
};

export const getUnreadNotifications = async () => {
  return await db.notifications.where("read").equals(0).toArray();
};

export const markNotificationAsRead = async (id: number) => {
  try {
    const updated = await db.notifications.update(id, { read: 1 });
    if (!updated) {
      console.error(`No se pudo actualizar la notificación con ID ${id}`);
    }
    return updated;
  } catch (error) {
    console.error("Error al marcar como leída:", error);
    return false;
  }
};

export const deleteNotification = async (id: number) => {
  const notification = await db.notifications.get(id);

  if (notification?.type === "system" && notification.actualizationId) {
    const alreadyDeleted = await db.deletedActualizations
      .where("actualizationId")
      .equals(notification.actualizationId)
      .count();

    if (alreadyDeleted === 0) {
      await db.deletedActualizations.add({
        actualizationId: notification.actualizationId,
      });
    }
  }

  return await db.notifications.delete(id);
};
export const markAllAsRead = async () => {
  return await db.notifications.where("read").equals(0).modify({ read: 1 });
};

export const addSystemNotification = async (
  message: string,
  title: string,
  actualizationId: number
) => {
  const existing = await db.notifications
    .where("[actualizationId+type]")
    .equals([actualizationId, "system"])
    .first();

  if (!existing) {
    await db.notifications.add({
      title,
      message,
      date: new Date().toISOString(),
      read: 0,
      type: "system",
      actualizationId,
    });
    return true;
  }
  return false;
};

export const observeNotifications = (
  callback: (notifs: Notification[]) => void
) => {
  return liveQuery(() =>
    db.notifications
      .orderBy("date")
      .reverse()
      .toArray()
      .then((notifications) => {
        const filtered = notifications.filter(
          (notif) => notif.isDeleted === undefined || notif.isDeleted === false
        );

        return filtered.sort((a, b) => {
          if (a.read !== b.read) return a.read - b.read;
          return (
            new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
          );
        });
      })
  ).subscribe({
    next: callback,
    error: (error) =>
      console.error("Error en observable de notificaciones:", error),
  });
};

export const observeUnreadCount = (callback: (count: number) => void) => {
  return liveQuery(() =>
    db.notifications.where("read").equals(0).count()
  ).subscribe(callback);
};
