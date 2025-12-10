"use client";
import { ModalProps } from "../lib/types/types";
import { useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  styled,
  alpha,
  useTheme,
} from "@mui/material";
import { Close } from "@mui/icons-material";

const MODAL_SIZES = {
  xs: "95vw",
  sm: "90vw",
  md: "85vw",
  lg: "80vw",
  xl: "70vw",
  maxWidth: "1200px",
} as const;

const ANIMATION = {
  duration: "0.2s",
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

const StyledDialog = styled(Dialog)(({ theme }) => ({
  "& .MuiBackdrop-root": {
    backgroundColor: alpha(theme.palette.primary.dark, 0.5),
    backdropFilter: "blur(8px)",
    animation: `${fadeIn} 0.3s ${ANIMATION.easing}`,
  },
  "& .MuiDialog-paper": {
    margin: theme.spacing(2),
    width: MODAL_SIZES.xs,
    [theme.breakpoints.up("sm")]: { width: MODAL_SIZES.sm },
    [theme.breakpoints.up("md")]: { width: MODAL_SIZES.md },
    [theme.breakpoints.up("lg")]: { width: MODAL_SIZES.lg },
    [theme.breakpoints.up("xl")]: {
      width: MODAL_SIZES.xl,
      maxWidth: MODAL_SIZES.maxWidth,
    },
    minHeight: "auto",
    maxHeight: "95vh",
    borderRadius: "16px",
    boxShadow:
      theme.palette.mode === "dark"
        ? `
        0 32px 64px -12px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
      `
        : `
        0 32px 64px -12px rgba(0, 0, 0, 0.25),
        0 0 0 1px rgba(0, 0, 0, 0.05),
        inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
      `,
    background: theme.palette.background.paper,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    position: "relative",
    animation: `${scaleIn} 0.3s ${ANIMATION.easing}`,

    "&::before": {
      content: '""',
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "1px",
      background: `linear-gradient(90deg, transparent, ${alpha(
        theme.palette.primary.main,
        0.4
      )}, transparent)`,
    },
  },
}));

const fadeIn = {
  "0%": { opacity: 0 },
  "100%": { opacity: 1 },
};

const scaleIn = {
  "0%": {
    opacity: 0,
    transform: "scale(0.95) translateY(10px)",
  },
  "100%": {
    opacity: 1,
    transform: "scale(1) translateY(0)",
  },
};

const FixedTotalSection = styled(Box)(({ theme }) => ({
  position: "sticky",
  bottom: 0,
  left: 0,
  right: 0,
  background:
    theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.grey[50],
  borderTop: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(2, 3),
  zIndex: 10,
  boxShadow:
    theme.palette.mode === "dark"
      ? "0 -4px 12px rgba(0, 0, 0, 0.3)"
      : "0 -4px 12px rgba(0, 0, 0, 0.1)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: "bold",
  fontSize: "1.1rem",
  color: theme.palette.text.primary,
}));

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title = "Confirmación",
  children,
  onClose,
  onConfirm,
  buttons,
  zIndex = 1300,
  fixedTotal,
  primaryButtonRef,
}) => {
  const theme = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose?.();
        return;
      }
    },
    [isOpen, onClose]
  );

  const handleClose = useCallback(
    (
      event: React.SyntheticEvent<unknown>,
      reason: "backdropClick" | "escapeKeyDown"
    ) => {
      if (reason === "backdropClick") {
        return;
      }
      onClose?.();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";

    window.scrollTo({ top: 0 });
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, handleKeyDown]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <StyledDialog
      ref={modalRef}
      open={isOpen}
      onClose={handleClose}
      maxWidth={false}
      sx={{ zIndex }}
      tabIndex={-1}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background:
            theme.palette.mode === "dark"
              ? theme.palette.grey[800]
              : theme.palette.grey[50],
          borderBottom: `1px solid ${theme.palette.divider}`,
          position: "relative",
          flexShrink: 0,
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: 0,
            left: "10%",
            right: "10%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${alpha(
              theme.palette.primary.main,
              0.2
            )}, transparent)`,
          },
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontSize: { xs: "1.3rem", sm: "1.5rem" },
            fontWeight: 700,
            color: theme.palette.text.primary,
            letterSpacing: "-0.025em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </Typography>

        <IconButton
          onClick={onClose}
          size="medium"
          sx={{
            color: theme.palette.text.secondary,
            backgroundColor: alpha(theme.palette.text.secondary, 0.08),
            borderRadius: "10px",
            padding: "10px",
            transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              transform: "scale(1.1)",
              boxShadow: `0 4px 10px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
            "&:active": {
              transform: "scale(0.65)",
            },
          }}
          aria-label="Cerrar modal"
        >
          <Close sx={{ fontSize: "1rem" }} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
          background: theme.palette.background.paper,
          position: "relative",
          padding: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              overflowY: "auto",
              overflowX: "hidden",
              flex: 1,
              minHeight: 0,
              padding: 3,
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-track": {
                background: alpha(theme.palette.text.secondary, 0.08),
                borderRadius: "12px",
                margin: "12px 0",
              },
              "&::-webkit-scrollbar-thumb": {
                background: `linear-gradient(180deg, ${alpha(
                  theme.palette.text.secondary,
                  0.4
                )} 0%, ${alpha(theme.palette.text.secondary, 0.6)} 100%)`,
                borderRadius: "12px",
                border: `2px solid ${theme.palette.background.paper}`,
                backgroundClip: "padding-box",
              },
              "&::-webkit-scrollbar-thumb:hover": {
                background: `linear-gradient(180deg, ${alpha(
                  theme.palette.text.secondary,
                  0.6
                )} 0%, ${alpha(theme.palette.text.secondary, 0.8)} 100%)`,
              },
              "&::-webkit-scrollbar-corner": {
                background: "transparent",
              },
              scrollbarWidth: "unset",
              scrollbarColor: `${alpha(
                theme.palette.text.secondary,
                0.6
              )} ${alpha(theme.palette.text.secondary, 0.1)}`,
            }}
          >
            {children}
          </Box>

          {fixedTotal && <FixedTotalSection>{fixedTotal}</FixedTotalSection>}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          padding: "24px",
          background:
            theme.palette.mode === "dark"
              ? theme.palette.grey[800]
              : theme.palette.grey[50],
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: { xs: 2, sm: 3 },
          flexShrink: 0,
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: "10%",
            right: "10%",
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${alpha(
              theme.palette.primary.main,
              0.15
            )}, transparent)`,
          },
        }}
      >
        {buttons ? (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              flexWrap: { xs: "wrap", sm: "nowrap" },
              justifyContent: "flex-end",
            }}
          >
            {buttons}
          </Box>
        ) : (
          <Box
            sx={{
              display: "flex",
              gap: 2,
              width: "100%",
              justifyContent: "flex-end",
              flexWrap: { xs: "wrap", sm: "nowrap" },
            }}
          >
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                color: theme.palette.text.secondary,
                borderColor: alpha(theme.palette.text.secondary, 0.3),
                backgroundColor: alpha(theme.palette.text.secondary, 0.08),
                borderRadius: "12px",
                padding: "12px 24px",
                fontWeight: 600,
                fontSize: "0.875rem",
                transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
                minWidth: { xs: "120px", sm: "140px" },
                "&:hover": {
                  backgroundColor: alpha(theme.palette.text.secondary, 0.15),
                  borderColor: alpha(theme.palette.text.secondary, 0.5),
                  color: theme.palette.text.primary,
                  transform: "translateY(-2px)",
                  boxShadow: `0 8px 25px ${alpha(
                    theme.palette.text.secondary,
                    0.15
                  )}`,
                },
                "&:active": {
                  transform: "translateY(0)",
                },
              }}
            >
              Cancelar
            </Button>
            {onConfirm && (
              <Button
                ref={primaryButtonRef}
                variant="contained"
                onClick={onConfirm}
                sx={{
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: "white",
                  borderRadius: "12px",
                  padding: "12px 28px",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  transition: `all ${ANIMATION.duration} ${ANIMATION.easing}`,
                  boxShadow: `0 4px 14px ${alpha(
                    theme.palette.primary.main,
                    0.4
                  )}`,
                  minWidth: { xs: "120px", sm: "140px" },
                  "&:hover": {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: "translateY(-2px)",
                    boxShadow: `0 12px 30px ${alpha(
                      theme.palette.primary.main,
                      0.5
                    )}`,
                  },
                  "&:active": {
                    transform: "translateY(0)",
                    boxShadow: `0 4px 14px ${alpha(
                      theme.palette.primary.main,
                      0.4
                    )}`,
                  },
                }}
              >
                Confirmar
              </Button>
            )}
          </Box>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

export default Modal;
