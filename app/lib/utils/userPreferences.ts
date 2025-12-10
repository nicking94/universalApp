import { db } from "@/app/database/db";

export async function getUserPreferences(userId: number) {
  return await db.userPreferences.where("userId").equals(userId).first();
}

export async function updateItemsPerPagePreference(
  userId: number,
  itemsPerPage: number
) {
  try {
    const existingPrefs = await getUserPreferences(userId);

    if (existingPrefs) {
      await db.userPreferences.update(existingPrefs.id!, { itemsPerPage });
    } else {
      await db.userPreferences.add({
        userId,
        acceptedTerms: false,
        itemsPerPage,
      });
    }
    return true;
  } catch (error) {
    console.error("Error updating itemsPerPage preference:", error);
    return false;
  }
}
