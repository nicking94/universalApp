import { db } from "@/app/database/db";
import { getLocalDateString } from "./getLocalDate";
export const ensureCashIsOpen = async () => {
  const today = getLocalDateString();
  const dailyCash = await db.dailyCashes.get({ date: today });

  if (!dailyCash) {
    return { isOpen: false, cash: null, needsRedirect: true };
  }

  return {
    isOpen: !dailyCash.closed,
    cash: dailyCash,
    needsRedirect: dailyCash.closed,
  };
};
