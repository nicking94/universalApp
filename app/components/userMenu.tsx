"use client";
import { useState } from "react";
import { UserMenuProps } from "../lib/types/types";

import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  useTheme,
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Brightness7, // Sun
  Brightness4, // Moon
  Logout, // LogOut
  Settings, // Settings
  Help, // HelpCircle
  Receipt, // Ticket
} from "@mui/icons-material";
import BusinessDataModal from "./BusinessDataModal";

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[1],
  width: 32,
  height: 32,
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  "&:hover": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:first-of-type": {
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
  },
  "&:last-of-type": {
    borderBottomLeftRadius: theme.shape.borderRadius,
    borderBottomRightRadius: theme.shape.borderRadius,
  },
}));

const StyledMenu = styled(Menu)(({ theme }) => ({
  "& .MuiPaper-root": {
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[4],
    borderRadius: theme.shape.borderRadius,
    minWidth: 192,
    border: `1px solid ${theme.palette.divider}`,
  },
}));

const UserMenu: React.FC<UserMenuProps> = ({
  theme: currentTheme,
  handleTheme,
  handleCloseSession,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [isTicketDataModalOpen, setIsTicketDataModalOpen] = useState(false);

  const theme = useTheme();
  const isMenuOpen = Boolean(menuAnchor);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleThemeToggle = () => {
    handleTheme();
    handleMenuClose();
  };

  const handleTutorialClick = () => {
    window.open(
      "https://www.youtube.com/playlist?list=PLULlGP-Fw51Z5Xl-DEGMEK2Qeuzl7ceup",
      "_blank"
    );
    handleMenuClose();
  };

  const handleLogout = () => {
    handleCloseSession();
    handleMenuClose();
  };

  const handleOpenBusinessDataModal = () => {
    setIsTicketDataModalOpen(true);
    handleMenuClose();
  };

  const handleCloseBusinessDataModal = () => {
    setIsTicketDataModalOpen(false);
  };

  const handleBusinessDataSaveSuccess = () => {
    console.log("Datos del negocio guardados exitosamente");
  };

  return (
    <Box sx={{ position: "relative" }}>
      {/* Botón de usuario */}
      <StyledIconButton
        onClick={handleMenuOpen}
        title="Configuraciones"
        size="small"
      >
        <Settings
          sx={{
            width: 18,
            height: 18,
            color: theme.palette.text.primary,
          }}
        />
      </StyledIconButton>

      <StyledMenu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{ mt: 1 }}
      >
        {/* Tema */}
        <StyledMenuItem onClick={handleThemeToggle}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            {currentTheme === "dark" ? (
              <Brightness7
                fontSize="small"
                sx={{ color: theme.palette.text.primary }}
              />
            ) : (
              <Brightness4
                fontSize="small"
                sx={{ color: theme.palette.text.primary }}
              />
            )}
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="text.primary">
              {currentTheme === "dark" ? "Modo Claro" : "Modo Oscuro"}
            </Typography>
          </ListItemText>
        </StyledMenuItem>

        {/* Datos del negocio */}
        <StyledMenuItem onClick={handleOpenBusinessDataModal}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Receipt
              fontSize="small"
              sx={{ color: theme.palette.text.primary }}
            />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="text.primary">
              Datos del negocio
            </Typography>
          </ListItemText>
        </StyledMenuItem>

        {/* Tutoriales */}
        <StyledMenuItem onClick={handleTutorialClick}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Help fontSize="small" sx={{ color: theme.palette.text.primary }} />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="text.primary">
              Tutoriales
            </Typography>
          </ListItemText>
        </StyledMenuItem>

        <Divider />

        {/* Cerrar sesión */}
        <StyledMenuItem onClick={handleLogout}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <Logout
              fontSize="small"
              sx={{ color: theme.palette.text.primary }}
            />
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="text.primary">
              Cerrar sesión
            </Typography>
          </ListItemText>
        </StyledMenuItem>
      </StyledMenu>

      {/* Modal de datos del negocio */}
      <BusinessDataModal
        isOpen={isTicketDataModalOpen}
        onClose={handleCloseBusinessDataModal}
        title="Datos del negocio"
        onSaveSuccess={handleBusinessDataSaveSuccess}
        showNotificationOnSave={true}
        autoFocus={true}
      />
    </Box>
  );
};

export default UserMenu;
