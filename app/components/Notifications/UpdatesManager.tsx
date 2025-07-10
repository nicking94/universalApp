"use client";
import { useEffect } from "react";
import { db } from "@/app/database/db";
import { systemActualizations } from "@/app/data/actualizations";

const UpdatesManager = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        for (const actualization of systemActualizations) {
          const existing = await db.notifications
            .where("actualizationId")
            .equals(actualization.id)
            .first();

          if (!existing) {
            await db.notifications.add({
              title: actualization.title,
              message: actualization.message,
              date: actualization.date || new Date().toISOString(),
              read: 0,
              type: "system",
              actualizationId: actualization.id,
              isDeleted: false,
            });
          }
        }
      } catch (error) {
        console.error("Error al verificar actualizaciones:", error);
      }
    };

    const timer = setTimeout(checkForUpdates, 500);

    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default UpdatesManager;
