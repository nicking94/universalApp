"use client";
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
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

  useEffect(() => {
    const loadPriceLists = async () => {
      if (rubro === "Todos los rubros") {
        setPriceLists([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Cargar listas de precios activas para el rubro específico
        const lists = await db.priceLists
          .where("rubro")
          .equals(rubro)
          .and((list) => list.isActive !== false)
          .toArray();

        // Si no hay listas, crear una por defecto
        if (lists.length === 0) {
          const defaultPriceList: PriceList = {
            id: Date.now(),
            name: "General",
            rubro,
            isDefault: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await db.priceLists.add(defaultPriceList);

          // Recargar las listas
          const updatedLists = await db.priceLists
            .where("rubro")
            .equals(rubro)
            .and((list) => list.isActive !== false)
            .toArray();

          // Filtrar duplicados
          const uniqueLists = Array.from(
            new Map(
              updatedLists.map((list) => {
                const key = `${list.name.toLowerCase().trim()}_${list.rubro}`;
                return [key, list];
              })
            ).values()
          ).sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });

          setPriceLists(uniqueLists);
        } else {
          // Filtrar duplicados
          const uniqueLists = Array.from(
            new Map(
              lists.map((list) => {
                const key = `${list.name.toLowerCase().trim()}_${list.rubro}`;
                return [key, list];
              })
            ).values()
          ).sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return a.name.localeCompare(b.name);
          });

          setPriceLists(uniqueLists);
        }

        // Si no hay selección, usar la lista por defecto o la primera
        if (!selectedPriceListId && priceLists.length > 0) {
          const defaultList = priceLists.find((list) => list.isDefault);
          if (defaultList) {
            onPriceListChange(defaultList.id);
          } else {
            onPriceListChange(priceLists[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading price lists:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPriceLists();
  }, [rubro, selectedPriceListId, onPriceListChange]);

  // Crear opciones para el selector - asegurar que no haya duplicados
  const options = priceLists.map((list) => ({
    value: list.id.toString(),
    label: list.isDefault ? `${list.name} (Por defecto)` : list.name,
    metadata: list,
  }));

  // Verificar si hay duplicados en las opciones (debug)
  if (options.length > 0) {
    const uniqueIds = new Set(options.map((opt) => opt.value));
    const uniqueNames = new Set(options.map((opt) => opt.label));

    if (uniqueIds.size !== options.length) {
      console.warn("¡Hay IDs duplicados en las opciones del selector!");
    }
    if (uniqueNames.size !== options.length) {
      console.warn("¡Hay nombres duplicados en las opciones del selector!");
    }
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

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
        Lista de precios
      </Typography>
      <Select
        label="Seleccionar lista"
        options={options}
        value={selectedPriceListId ? selectedPriceListId.toString() : ""}
        onChange={(value) => {
          if (value === "") {
            onPriceListChange(null);
          } else {
            onPriceListChange(Number(value));
          }
        }}
        fullWidth
        size="small"
        disabled={disabled || priceLists.length === 0}
        getOptionId={(option) => option.metadata?.id?.toString()}
      />
      {priceLists.length === 0 && rubro !== "Todos los rubros" && (
        <Typography variant="caption" color="text.secondary">
          No hay listas de precios creadas para este rubro
        </Typography>
      )}
    </Box>
  );
};

export default PriceListSelector;
