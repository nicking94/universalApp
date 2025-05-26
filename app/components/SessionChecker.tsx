"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "../database/db";
import { TRIAL_CREDENTIALS } from "../lib/constants/constants";

const SessionChecker = () => {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const auth = await db.auth.get(1);
      if (!auth?.isAuthenticated || !auth.userId) return;

      const user = await db.users.get(auth.userId);
      if (!user) return;

      const now = new Date();

      if (user.username === TRIAL_CREDENTIALS.username) {
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
              await db.auth.update(1, { isAuthenticated: false });
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
    return () => clearInterval(interval);
  }, [router]);

  return null;
};

export default SessionChecker;
