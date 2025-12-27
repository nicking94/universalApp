// app/components/BackupConfirmationModal.tsx
import Modal from "./Modal";
import { Box, Typography, Button } from "@mui/material";
import { Download, Backup } from "@mui/icons-material";

interface BackupConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

const BackupConfirmationModal: React.FC<BackupConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Exportar Copia de Seguridad"
      bgColor="bg-white dark:bg-gray_b"
      buttons={
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
          <Button
            variant="text"
            onClick={onCancel}
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
            onClick={handleConfirm}
            startIcon={<Download />}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Exportar Backup
          </Button>
        </Box>
      }
    >
      <Box sx={{ textAlign: "center", py: 2 }}>
        {/* Icono principal */}
        <Backup
          sx={{
            fontSize: 48,
            color: "primary.main",
            mb: 2,
            mx: "auto",
          }}
        />

        {/* Mensaje principal */}
        <Typography variant="h6" fontWeight="semibold" sx={{ mb: 2 }}>
          ¿Desea exportar una copia de seguridad?
        </Typography>

        <Typography variant="body1" sx={{ mb: 3, color: "text.secondary" }}>
          Se recomienda exportar una copia de seguridad de los datos.
        </Typography>
      </Box>
    </Modal>
  );
};

export default BackupConfirmationModal;
