"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button as MuiButton,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Refresh, SystemUpdateAlt } from "@mui/icons-material";

interface UpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
  onLogout: () => void;
  isUpdating: boolean;
  minLoadTimePassed?: boolean;
  currentVersion: string;
  storedVersion?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onUpdate,
  isUpdating,
}) => {
  const [progress, setProgress] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    if (isUpdating) {
      setProgress(0);

      const startTime = Date.now();
      const duration = 2000;

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= duration) {
          clearInterval(progressInterval);
        }
      }, 50);
    } else {
      setProgress(0);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isUpdating]);

  return (
    <Dialog
      open={isOpen}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: theme.palette.background.paper,
          border: `2px solid ${theme.palette.primary.main}`,
          color: theme.palette.text.primary,
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(25, 55, 109, 0.8)",
        },
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: "center" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mb: 3,
          }}
        >
          {/* Icono circular */}
          <Box
            sx={{
              width: 80,
              height: 80,
              backgroundColor: "primary.main",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
            }}
          >
            {isUpdating ? (
              <Refresh sx={{ fontSize: 40, color: "white" }} />
            ) : (
              <SystemUpdateAlt sx={{ fontSize: 40, color: "white" }} />
            )}
          </Box>

          {/* Título */}
          <Typography
            variant="h5"
            component="h3"
            sx={{
              fontWeight: 600,
              color: "primary.main",
              mb: 2,
              textTransform: "uppercase",
            }}
          >
            {isUpdating ? "Actualizando..." : "Actualización Disponible"}
          </Typography>

          {/* Descripción */}
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              mb: 2,
            }}
          >
            {isUpdating
              ? "La aplicación se está actualizando..."
              : "Hay una nueva versión de la aplicación."}
          </Typography>
        </Box>

        {/* Contenido condicional */}
        {!isUpdating && (
          <DialogActions sx={{ justifyContent: "center", px: 0 }}>
            <MuiButton
              variant="contained"
              onClick={onUpdate}
              disabled={isUpdating}
              size="large"
              fullWidth={isMobile}
              sx={{
                p: 4,
                borderRadius: 2,
                textTransform: "none",
                fontSize: "1rem",
                fontWeight: 600,
              }}
            >
              Actualizar Ahora
            </MuiButton>
          </DialogActions>
        )}

        {isUpdating && (
          <Box sx={{ textAlign: "center", mt: 3 }}>
            {/* Spinner */}
            <CircularProgress size={32} sx={{ mb: 2, color: "primary.main" }} />

            {/* Texto informativo */}
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                display: "block",
                mt: 1,
              }}
            >
              Esto tomará unos segundos...
            </Typography>

            {/* Barra de progreso */}
            <Box sx={{ mt: 3, width: "100%" }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: theme.palette.grey[200],
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 4,
                    backgroundColor: "primary.main",
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: "block",
                  mt: 1,
                }}
              >
                {Math.round(progress)}% completado
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UpdateModal;
