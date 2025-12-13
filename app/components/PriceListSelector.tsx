"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography, Alert } from "@mui/material";
import Select from "@/app/components/Select";
import { PriceList, Rubro } from "@/app/lib/types/types";
import { db } from "@/app/database/db";

interface PriceListSelectorProps {
  selectedPriceListId: number | null;
  onPriceListChange: (priceListId: number | null) => void;
  rubro: Rubro;
  disabled?: boolean;
}

const PriceListSelector: React.FC<PriceListSelectorProps> = ({
  selectedPriceListId,
  onPriceListChange,
  rubro,
  disabled = false,
}) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPriceLists = async () => {
      if (rubro === "Todos los rubros") {
        setPriceLists([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Cargar listas de precios para el rubro específico
        const lists = await db.priceLists
          .where("rubro")
          .equals(rubro)
          .sortBy("isDefault");

        if (lists.length === 0) {
          // Crear una lista por defecto si no existe
          const defaultList: PriceList = {
            id: Date.now(),
            name: "Precio General",
            rubro,
            isDefault: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db.priceLists.add(defaultList);
          setPriceLists([defaultList]);

          // Seleccionar automáticamente la lista por defecto
          if (!selectedPriceListId) {
            onPriceListChange(defaultList.id);
          }
        } else {
          setPriceLists(lists);

          // Seleccionar automáticamente la lista por defecto si no hay selección
          if (!selectedPriceListId) {
            const defaultList = lists.find((list) => list.isDefault);
            if (defaultList) {
              onPriceListChange(defaultList.id);
            } else {
              onPriceListChange(lists[0].id);
            }
          }
        }
      } catch (err) {
        console.error("Error loading price lists:", err);
        setError("Error al cargar las listas de precios");
      } finally {
        setLoading(false);
      }
    };

    loadPriceLists();
  }, [rubro, onPriceListChange, selectedPriceListId]);

  const options = [
    { value: "default", label: "Precio General" },
    ...priceLists.map((list) => ({
      value: list.id.toString(),
      label: `${list.name}${list.isDefault ? " (Por defecto)" : ""}`,
    })),
  ];

  if (rubro === "Todos los rubros") {
    return (
      <Box sx={{ width: "100%" }}>
        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
          Lista de precios
        </Typography>
        <Select
          label="Lista de precios"
          options={[{ value: "default", label: "Precio General" }]}
          value="default"
          onChange={() => onPriceListChange(null)}
          fullWidth
          size="small"
          disabled={true}
        />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ width: "100%" }}>
        <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
          Lista de precios
        </Typography>
        <Select
          label="Cargando..."
          options={[]}
          value=""
          onChange={() => {}}
          fullWidth
          size="small"
          disabled={true}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: "100%" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Select
          label="Lista de precios"
          options={[{ value: "default", label: "Precio General" }]}
          value="default"
          onChange={() => onPriceListChange(null)}
          fullWidth
          size="small"
          disabled={disabled}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        Lista de precios
      </Typography>
      <Select
        label="Seleccionar lista"
        options={options}
        value={selectedPriceListId ? selectedPriceListId.toString() : "default"}
        onChange={(value) => {
          if (value === "default") {
            onPriceListChange(null);
          } else {
            onPriceListChange(Number(value));
          }
        }}
        fullWidth
        size="small"
        disabled={disabled}
      />
    </Box>
  );
};

export default PriceListSelector;
