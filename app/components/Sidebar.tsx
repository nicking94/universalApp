"use client";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { MenuItemProps, SidebarProps } from "../lib/types/types";
import { useEffect, useState } from "react";

// Iconos de Material UI
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  SyncAlt as SyncAltIcon,
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Support as SupportIcon,
  People as PeopleIcon,
  LocalShipping as LocalShippingIcon,
  ShowChart as ShowChartIcon,
  Assignment as AssignmentIcon,
  Sell as SellIcon,
  Description as DescriptionIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  PointOfSale as PointOfSaleIcon,
} from "@mui/icons-material";

import { TbCashRegister } from "react-icons/tb";

import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  styled,
  Chip,
} from "@mui/material";

import Button from "./Button";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

// Extender la interfaz localmente si no puedes modificar el archivo original
interface ExtendedMenuItemProps extends MenuItemProps {
  disabled?: boolean;
  comingSoon?: boolean;
}

interface ExtendedSidebarProps extends SidebarProps {
  items?: ExtendedMenuItemProps[];
}

const menuItems: ExtendedMenuItemProps[] = [
  {
    label: "Caja diaria",
    href: "/caja-diaria",
    icon: <TbCashRegister className="w-6 h-6" />,
  },
  {
    label: "Punto de venta",
    icon: <PointOfSaleIcon />,
    submenu: [
      {
        label: "Ventas",
        href: "/ventas",
        icon: <ShoppingCartIcon />,
      },
      {
        label: "Promociones",
        href: "/promociones",
        icon: <SellIcon />,
      },
    ],
  },
  { label: "Productos", href: "/productos", icon: <InventoryIcon /> },
  { label: "Clientes", href: "/clientes", icon: <PeopleIcon /> },
  {
    label: "Cuentas Corrientes",
    href: "/cuentascorrientes",
    icon: <AccountBalanceWalletIcon />,
  },
  { label: "Proveedores", href: "/proveedores", icon: <LocalShippingIcon /> },
  { label: "Presupuestos", href: "/presupuestos", icon: <AssignmentIcon /> },
  { label: "Movimientos", href: "/movimientos", icon: <SyncAltIcon /> },
  { label: "Métricas", href: "/metricas", icon: <ShowChartIcon /> },
  {
    label: "Facturación",
    href: "#",
    icon: <DescriptionIcon />,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Usuarios",
    href: "#",
    icon: <PersonIcon />,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Soporte técnico",
    href: "https://wa.me/5492613077147",
    icon: <SupportIcon />,
    target: "_blank",
  },
];

const MenuHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
  color: theme.palette.common.white,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1, 2),
  boxShadow: theme.shadows[1],
}));

const StyledListItemButton = styled(ListItemButton, {
  shouldForwardProp: (prop) =>
    prop !== "isActive" && prop !== "hasSubmenu" && prop !== "isDisabled",
})<{ isActive?: boolean; hasSubmenu?: boolean; isDisabled?: boolean }>(
  ({ theme, isActive, hasSubmenu, isDisabled }) => ({
    margin: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    "&:hover": {
      backgroundColor: !isDisabled ? theme.palette.action.hover : "transparent",
    },
    ...(isActive && {
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
      color: theme.palette.common.white,
      boxShadow: theme.shadows[2],
      "&:hover": {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`,
      },
    }),
    ...(hasSubmenu && {
      "& .MuiListItemText-root": {
        flex: 1,
      },
    }),
    ...(isDisabled && {
      opacity: 0.6,
      cursor: "not-allowed",
      "&:hover": {
        backgroundColor: "transparent",
      },
    }),
  })
);

const SubmenuContainer = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(3),
  borderLeft: `2px solid ${theme.palette.primary.main}`,
  paddingLeft: theme.spacing(1),
}));

const ComingSoonChip = styled(Chip)(({ theme }) => ({
  marginLeft: "auto",
  fontSize: "0.625rem",
  height: 20,
  "& .MuiChip-label": {
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
  },
}));

const Sidebar: React.FC<ExtendedSidebarProps> = ({ items = menuItems }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const SidebarDrawer = styled(Drawer)(({ theme }) => ({
    "& .MuiDrawer-paper": {
      backgroundColor: theme.palette.background.paper,
      borderRight: `1px solid ${theme.palette.divider}`,
      boxShadow: theme.shadows[4],
      overflowY: "auto",
      transition: "all 0.3s ease",
      width: isSidebarOpen ? 256 : 120,
    },
  }));

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleItemClick = (
    item: ExtendedMenuItemProps,
    label: string,
    href?: string,
    target?: string,
    hasSubmenu?: boolean
  ) => {
    if (item.disabled) {
      return;
    }

    if (hasSubmenu && isSidebarOpen) {
      toggleSubmenu(label);
      return;
    }

    setActiveItem(label);

    if (href && href !== "#") {
      if (target === "_blank") {
        window.open(href, "_blank");
      } else {
        router.push(href);
      }
    }

    if (isMobile) {
      toggleSidebar();
    }
  };

  useEffect(() => {
    const findActiveItem = (items: ExtendedMenuItemProps[]): string => {
      for (const item of items) {
        if (item.href === pathname) return item.label;
        if (item.submenu) {
          const subItem = item.submenu.find((sub) => sub.href === pathname);
          if (subItem) return subItem.label;
        }
      }
      return "";
    };

    setActiveItem(findActiveItem(items));
  }, [pathname, items]);

  const renderMenuItem = (item: ExtendedMenuItemProps, level = 0) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenus.has(item.label);
    const isActive =
      activeItem === item.label ||
      item.submenu?.some((subItem) => activeItem === subItem.label);
    const isDisabled = item.disabled || false;

    return (
      <Box key={item.label} sx={{ width: "100%" }}>
        <ListItem disablePadding>
          <StyledListItemButton
            isActive={isActive}
            hasSubmenu={hasSubmenu}
            isDisabled={isDisabled}
            onClick={() =>
              handleItemClick(
                item,
                item.label,
                item.href,
                item.target,
                hasSubmenu
              )
            }
            sx={{
              pl: 1 + level * 0.3,
              justifyContent: isSidebarOpen ? "flex-start" : "center",
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: "auto",
                color: isActive
                  ? "common.white"
                  : isDisabled
                  ? "text.disabled"
                  : "primary.dark",
                mr: isSidebarOpen ? 2 : 0,
              }}
            >
              {item.icon}
            </ListItemIcon>

            {isSidebarOpen && (
              <>
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      sx={{
                        flex: 1,
                        color: isDisabled ? "text.disabled" : "inherit",
                      }}
                    >
                      {item.label}
                    </Typography>
                  }
                />
                {item.comingSoon && (
                  <ComingSoonChip
                    label="Próximamente"
                    color="info"
                    size="small"
                  />
                )}
                {hasSubmenu && !isDisabled && (
                  <Box sx={{ ml: 1 }}>
                    {isSubmenuOpen ? (
                      <ExpandMoreIcon fontSize="small" />
                    ) : (
                      <ChevronRightIcon fontSize="small" />
                    )}
                  </Box>
                )}
              </>
            )}
          </StyledListItemButton>
        </ListItem>

        {hasSubmenu && isSubmenuOpen && isSidebarOpen && item.submenu && (
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <SubmenuContainer>
              <List disablePadding>
                {item.submenu.map((subItem) => (
                  <Box key={subItem.label}>
                    {renderMenuItem(subItem, level + 1)}
                  </Box>
                ))}
              </List>
            </SubmenuContainer>
          </Collapse>
        )}
      </Box>
    );
  };

  const drawerContent = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        justifyContent: "space-between",
      }}
    >
      {/* Header y Navegación */}
      <Box>
        <MenuHeader>
          <Typography variant="subtitle1" fontWeight="medium">
            Menú
          </Typography>
          <CustomGlobalTooltip
            title={isSidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <IconButton
              onClick={toggleSidebar}
              size="small"
              sx={{
                color: "common.white",
                "&:hover": {
                  backgroundColor: "primary.main",
                },
              }}
            >
              {isSidebarOpen ? (
                <CloseIcon fontSize="small" />
              ) : (
                <MenuIcon fontSize="small" />
              )}
            </IconButton>
          </CustomGlobalTooltip>
        </MenuHeader>

        <List sx={{ pt: 0.5 }}>
          {items.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      {/* Botón Importar/Exportar */}
      {isSidebarOpen && (
        <Box sx={{ p: 2 }}>
          <Button
            text="Importar | Exportar"
            icon={<SyncAltIcon fontSize="small" />}
            iconPosition="left"
            onClick={() => router.push("/import-export")}
            variant="contained"
            size="small"
            fullWidth
            sx={{
              backgroundColor: "primary.dark",
              color: "white",
              textTransform: "uppercase",
              fontSize: "0.75rem",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "primary.main",
                transform: "none",
              },
              py: 1,
              "@media (min-width: 1536px)": {
                fontSize: "0.8rem",
              },
            }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <SidebarDrawer
        variant="permanent"
        sx={{
          width: isSidebarOpen ? 256 : 120,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: isSidebarOpen ? 256 : 120,
            boxSizing: "border-box",
          },
          display: { xs: "none", md: "block" },
        }}
      >
        {drawerContent}
      </SidebarDrawer>

      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={isSidebarOpen}
        onClose={toggleSidebar}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 256,
            boxSizing: "border-box",
            backgroundColor: theme.palette.background.paper,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar;
