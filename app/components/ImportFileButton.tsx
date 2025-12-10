"use client";
import { useRef } from "react";
import { Box } from "@mui/material";
import { Folder as FolderIcon } from "@mui/icons-material";
import Button from "./Button";

export default function ImportFileButton({
  onImport,
}: {
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Box>
      <Button
        text="Importar archivo"
        icon={<FolderIcon />}
        iconPosition="left"
        onClick={handleButtonClick}
        variant="contained"
        size="large"
        title="Importar datos desde un archivo JSON"
        ariaLabel="Importar datos"
        sx={{
          textTransform: "none",
          fontWeight: 600,
          backgroundColor: "primary.main",
          color: "white",
          "&:hover": {
            backgroundColor: "primary.dark",
            transform: "none",
          },
          minWidth: "200px",
          height: "56px",
          fontSize: "1rem",
        }}
      />
      <input
        type="file"
        accept=".json,.txt"
        ref={fileInputRef}
        onChange={onImport}
        style={{ display: "none" }}
      />
    </Box>
  );
}
