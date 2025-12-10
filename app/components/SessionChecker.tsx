// components/SessionChecker.tsx
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/app/database/db";
import { TRIAL_CREDENTIALS, USERS } from "../lib/constants/constants";
import { useAuth } from "../context/AuthContext";

const SessionChecker = () => {
  const router = useRouter();
  const { logoutUser, user } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      const auth = await db.auth.get(1);
      if (!auth?.isAuthenticated || !auth.userId) {
        return;
      }

      const user = await db.users.get(auth.userId);
      if (!user) {
        return;
      }

      const now = new Date();

      const userConfig = USERS.find((u) => u.id === auth.userId);
      console.log(`🔍 Configuración del usuario:`, userConfig);

      if (userConfig && userConfig.isActive === false) {
        await db.auth.put({
          id: 1,
          isAuthenticated: false,
          userId: undefined,
        });

        router.push("/login?inactive=true");
        return;
      }

      if (user.username === TRIAL_CREDENTIALS.username) {
        console.log("🔍 Verificando periodo de prueba...");
        const trialRecord = await db.trialPeriods
          .where("userId")
          .equals(auth.userId)
          .first();

        if (trialRecord) {
          const firstAccess = new Date(trialRecord.firstAccessDate);
          if (!isNaN(firstAccess.getTime())) {
            const diffInMs = now.getTime() - firstAccess.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

            if (diffInDays > 7) {
              await db.users.delete(user.id);
              await db.auth.put({
                id: 1,
                isAuthenticated: false,
                userId: undefined,
              });
              router.push("/login?expired=true");
              return;
            }
          }
        } else {
          await db.trialPeriods.put({
            userId: auth.userId,
            firstAccessDate: now,
          });
        }
      }

      await db.appState.put({ id: 1, lastActiveDate: now });
    };

    checkSession();

    const interval = setInterval(checkSession, 3600000);

    return () => {
      clearInterval(interval);
    };
  }, [router, logoutUser, user]);

  return null;
};

export default SessionChecker;
