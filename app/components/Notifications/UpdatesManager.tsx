"use client";
import { useEffect } from "react";
import { db } from "@/app/database/db";
import { systemActualizations } from "@/app/data/actualizations";

const UpdatesManager = () => {
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Verificar si esta actualización fue marcada como eliminada
        const isDeleted = await db.deletedActualizations
          .where("actualizationId")
          .equals(1)
          .count();

        if (isDeleted > 0) {
          console.log(
            "Actualización 1.4 fue marcada como eliminada, no se mostrará"
          );
          return;
        }

        // Verificar si ya existe una notificación para esta actualización
        const existing = await db.notifications
          .where("actualizationId")
          .equals(1)
          .first();

        if (!existing) {
          await db.notifications.add({
            title: systemActualizations[0].title,
            message: systemActualizations[0].message,
            date: new Date().toISOString(),
            read: 0,
            type: "system",
            actualizationId: 1,
            isDeleted: false,
          });
          console.log("Notificación de actualización creada");
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
