"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { db } from "../database/db";

interface PaginationContextType {
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (items: number) => void;
  isLoading?: boolean;
}

const PaginationContext = createContext<PaginationContextType | undefined>(
  undefined
);

export const PaginationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadPreferences = async () => {
      setIsLoading(true);
      try {
        const authData = await db.auth.get(1);
        const userId = authData?.userId;

        if (userId) {
          const prefs = await db.userPreferences
            .where("userId")
            .equals(userId)
            .first();

          if (prefs?.itemsPerPage) {
            setItemsPerPage(prefs.itemsPerPage);
          }
        }
      } catch (error) {
        console.error("Error loading user preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  useEffect(() => {
    if (isLoading) return; // No guardar durante la carga inicial

    const savePreferences = async () => {
      try {
        const authData = await db.auth.get(1);
        const userId = authData?.userId;

        if (userId) {
          const existingPrefs = await db.userPreferences
            .where("userId")
            .equals(userId)
            .first();

          if (existingPrefs) {
            await db.userPreferences.update(existingPrefs.id!, {
              itemsPerPage,
            });
          } else if (userId) {
            await db.userPreferences.add({
              userId,
              acceptedTerms: false,
              itemsPerPage,
            });
          }
        }
      } catch (error) {
        console.error("Error saving user preferences:", error);
      }
    };

    savePreferences();
  }, [itemsPerPage, isLoading]);

  return (
    <PaginationContext.Provider
      value={{
        currentPage,
        itemsPerPage,
        setCurrentPage,
        setItemsPerPage,
        isLoading,
      }}
    >
      {children}
    </PaginationContext.Provider>
  );
};

export const usePagination = () => {
  const context = useContext(PaginationContext);
  if (!context) {
    throw new Error("usePagination must be used within a PaginationProvider");
  }
  return context;
};
