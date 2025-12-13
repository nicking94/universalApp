"use client";
import React, { useRef } from "react";
import { Box } from "@mui/material";
import { Description as DescriptionIcon } from "@mui/icons-material";
import Button from "./Button";

interface ImportExcelButtonProps {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export default function ImportExcelButton({
  onImport,
  disabled = false,
}: ImportExcelButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Button
        text="Importar Excel de productos"
        icon={<DescriptionIcon />}
        iconPosition="left"
        onClick={handleButtonClick}
        variant="contained"
        size="large"
        disabled={disabled}
        title="Importar productos desde archivo Excel (.xlsx, .xls)"
        ariaLabel="Importar productos desde Excel"
        sx={{
          textTransform: "none",
          fontWeight: 600,
          backgroundColor: "success.main",
          color: "white",
          "&:hover": {
            backgroundColor: "success.dark",
            transform: "none",
          },
          minWidth: "240px",
          height: "56px",
          fontSize: "1rem",
        }}
      />
      <input
        type="file"
        accept=".xlsx,.xls,.xlsm,.xlsb,.ods"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
    </Box>
  );
}
