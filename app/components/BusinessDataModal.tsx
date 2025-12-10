// app/components/BusinessDataModal.tsx
"use client";

import { useState, useEffect } from "react";
import { BusinessData } from "../lib/types/types";
import { useNotification } from "../hooks/useNotification";
import { Box, useTheme } from "@mui/material";
import Button from "./Button";
import Modal from "./Modal";
import Input from "./Input";
import { useBusinessData } from "../context/BusinessDataContext";

interface BusinessDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onSaveSuccess?: () => void;
  showNotificationOnSave?: boolean;
  autoFocus?: boolean;
}

const BusinessDataModal: React.FC<BusinessDataModalProps> = ({
  isOpen,
  onClose,
  title = "Datos del negocios",
  onSaveSuccess,
  showNotificationOnSave = true,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const { businessData, setBusinessData } = useBusinessData();
  const { showNotification } = useNotification();

  const [localBusinessData, setLocalBusinessData] = useState<BusinessData>({
    name: "",
    address: "",
    phone: "",
    cuit: "",
  });

  const handleInputChange =
    (field: keyof BusinessData) => (value: string | number) => {
      setLocalBusinessData((prev) => ({
        ...prev,
        [field]: value.toString(),
      }));
    };

  useEffect(() => {
    if (isOpen && businessData) {
      setLocalBusinessData(businessData);
    }
  }, [isOpen, businessData]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "Enter" && isOpen) {
        handleSave();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyPress);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, [isOpen, localBusinessData]);

  const handleSave = async () => {
    try {
      await setBusinessData(localBusinessData);

      if (showNotificationOnSave) {
        showNotification(
          "Datos del negocio actualizados correctamente",
          "success"
        );
      }

      onClose();

      if (onSaveSuccess) {
        onSaveSuccess();
      }
    } catch (error) {
      console.error("Error al guardar los datos del negocio:", error);
      if (showNotificationOnSave) {
        showNotification("Error al guardar los datos", "error");
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onClose}
            sx={{
              color: "text.secondary",
              borderColor: "text.secondary",
              "&:hover": {
                backgroundColor: "action.hover",
                borderColor: "text.primary",
              },
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              "&:hover": {
                backgroundColor: theme.palette.primary.dark,
              },
            }}
          >
            Guardar
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Input
          label="Nombre del Negocio"
          name="name"
          value={localBusinessData.name}
          onChange={handleInputChange("name")}
          placeholder="Ingrese el nombre del negocio"
          autoFocus={autoFocus}
        />
        <Input
          label="Dirección"
          name="address"
          value={localBusinessData.address}
          onChange={handleInputChange("address")}
          placeholder="Ingrese la dirección"
        />
        <Input
          label="Teléfono"
          name="phone"
          value={localBusinessData.phone}
          onChange={handleInputChange("phone")}
          placeholder="Ingrese el teléfono"
        />
        <Input
          label="CUIT"
          name="cuit"
          value={localBusinessData.cuit}
          onChange={handleInputChange("cuit")}
          placeholder="Ingrese el CUIT"
        />
      </Box>
    </Modal>
  );
};

export default BusinessDataModal;
