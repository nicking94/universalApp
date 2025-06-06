"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Rubro } from "../lib/types/types";

interface RubroContextType {
  rubro: Rubro;
  setRubro: (rubro: Rubro) => void;
}

const RubroContext = createContext<RubroContextType | undefined>(undefined);

export function RubroProvider({ children }: { children: ReactNode }) {
  const [rubro, setRubro] = useState<Rubro>(() => {
    if (typeof window !== "undefined") {
      const savedRubro = localStorage.getItem("selectedRubro");
      return (savedRubro as Rubro) || "todos los rubros";
    }
    return "todos los rubros";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedRubro", rubro);
    }
  }, [rubro]);

  return (
    <RubroContext.Provider value={{ rubro, setRubro }}>
      {children}
    </RubroContext.Provider>
  );
}

export function useRubro() {
  const context = useContext(RubroContext);
  if (context === undefined) {
    throw new Error("useRubro must be used within a RubroProvider");
  }
  return context;
}
