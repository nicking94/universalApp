"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { BusinessData } from "../lib/types/types";
import { db } from "../database/db";

type BusinessDataContextType = {
  businessData: BusinessData;
  setBusinessData: (data: BusinessData) => Promise<void>;
  loadBusinessData: () => Promise<void>;
};

const BusinessDataContext = createContext<BusinessDataContextType | undefined>(
  undefined
);

export const BusinessDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [businessData, setBusinessDataState] = useState<BusinessData>({
    name: "",
    address: "",
    phone: "",
    cuit: "",
  });

  const loadBusinessData = async () => {
    try {
      const data = await db.businessData.get(1);
      if (data) {
        setBusinessDataState(data);
      } else {
        const defaultData: BusinessData = {
          id: 1,
          name: "Universal App",
          address: "Calle falsa 123",
          phone: "123456789",
          cuit: "12-34567890-1",
        };
        await db.businessData.add(defaultData);
        setBusinessDataState(defaultData);
      }
    } catch (error) {
      console.error("Error al cargar datos del negocio:", error);
    }
  };

  const setBusinessData = async (newData: BusinessData) => {
    try {
      const dataToSave = { ...newData, id: 1 };
      await db.businessData.put(dataToSave);
      setBusinessDataState(dataToSave);
    } catch (error) {
      console.error("Error al guardar datos del negocio:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadBusinessData();
  }, []);

  return (
    <BusinessDataContext.Provider
      value={{ businessData, setBusinessData, loadBusinessData }}
    >
      {children}
    </BusinessDataContext.Provider>
  );
};

export const useBusinessData = () => {
  const context = useContext(BusinessDataContext);
  if (!context) {
    throw new Error(
      "useBusinessData debe usarse dentro de un BusinessDataProvider"
    );
  }
  return context;
};
