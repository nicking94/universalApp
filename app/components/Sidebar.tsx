"use client";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { MenuItemProps, SidebarProps } from "../lib/types/types";
import { useEffect, useState } from "react";
import {
  Menu,
  Close,
  Inventory,
  ShoppingCart,
  SyncAlt,
  AccountBalanceWallet,
  People,
  LocalShipping,
  ShowChart,
  Assignment,
  Sell,
  Description,
  Person,
  ExpandMore,
  ChevronRight,
  PointOfSale,
  Headphones,
  PriceChange,
  Category,
  AttachMoney,
  CreditCard,
  RequestQuote,
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
  alpha,
} from "@mui/material";
import Button from "./Button";
import CustomGlobalTooltip from "./CustomTooltipGlobal";

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
    icon: <PointOfSale />,
    submenu: [
      {
        label: "Ventas",
        href: "/ventas",
        icon: <ShoppingCart />,
      },
      {
        label: "Promociones",
        href: "/promociones",
        icon: <Sell />,
      },
    ],
  },
  {
    label: "Productos",
    icon: <Category />,
    submenu: [
      {
        label: "Lista de productos",
        href: "/productos",
        icon: <Inventory />,
      },
      {
        label: "Actualización de precios",
        href: "/actualizacionprecios",
        icon: <PriceChange />,
      },
      {
        label: "Listas de precios",
        href: "/listasprecios",
        icon: <AttachMoney />,
      },
    ],
  },
  { label: "Clientes", href: "/clientes", icon: <People /> },
  {
    label: "Cobranzas",
    icon: <RequestQuote />,
    submenu: [
      {
        label: "Créditos",
        href: "/creditos",
        icon: <CreditCard />,
      },
      {
        label: "Cuentas Corrientes",
        href: "/cuentascorrientes",
        icon: <AccountBalanceWallet />,
      },
    ],
  },
  { label: "Proveedores", href: "/proveedores", icon: <LocalShipping /> },
  { label: "Presupuestos", href: "/presupuestos", icon: <Assignment /> },
  { label: "Movimientos", href: "/movimientos", icon: <SyncAlt /> },
  { label: "Métricas", href: "/metricas", icon: <ShowChart /> },
  {
    label: "Facturación",
    href: "#",
    icon: <Description />,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Usuarios",
    href: "#",
    icon: <Person />,
    disabled: true,
    comingSoon: true,
  },
  {
    label: "Soporte técnico",
    href: "https://wa.me/5492613077147",
    icon: <Headphones />,
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
    prop !== "isActive" &&
    prop !== "hasSubmenu" &&
    prop !== "isDisabled" &&
    prop !== "isSubItem",
})<{
  isActive?: boolean;
  hasSubmenu?: boolean;
  isDisabled?: boolean;
  isSubItem?: boolean;
}>(({ theme, isActive, hasSubmenu, isDisabled, isSubItem }) => ({
  margin: theme.spacing(0.25, 1),
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5, 1.5),
  minHeight: 40,
  "&:hover": {
    backgroundColor: !isDisabled ? theme.palette.action.hover : "transparent",
  },
  ...(isActive &&
    !isSubItem && {
      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
      color: theme.palette.common.white,
      boxShadow: theme.shadows[1],
      "&:hover": {
        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.dark})`,
      },
    }),
  ...(isActive &&
    isSubItem && {
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
      color: theme.palette.primary.main,
      borderLeft: `3px solid ${theme.palette.primary.light}`,
      "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.2),
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
}));

const SubmenuContainer = styled(Box)(({ theme }) => ({
  marginLeft: theme.spacing(3),
  borderLeft: `2px solid ${theme.palette.primary.light}`,
  paddingLeft: theme.spacing(1),
}));

const ComingSoonChip = styled(Chip)(({ theme }) => ({
  marginLeft: "auto",
  fontSize: "0.65rem",
  height: 18,
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
      if (prev.has(label)) {
        return new Set();
      }
      return new Set([label]);
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
    if (!isSidebarOpen) {
      setOpenSubmenus(new Set());
    }
  }, [isSidebarOpen]);

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
    const isSubItem = level > 0;

    return (
      <Box key={item.label} sx={{ width: "100%" }}>
        <ListItem disablePadding>
          <StyledListItemButton
            isActive={isActive}
            hasSubmenu={hasSubmenu}
            isDisabled={isDisabled}
            isSubItem={isSubItem}
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
                  ? isSubItem
                    ? theme.palette.primary.main
                    : "common.white"
                  : isDisabled
                  ? "text.disabled"
                  : "primary.dark",
                mr: isSidebarOpen ? 1.5 : 0,
                fontSize: isSubItem ? "1.1rem" : "1.3rem",
                "& .MuiSvgIcon-root": {
                  fontSize: isSubItem ? "1.1rem" : "1.3rem",
                },
                "& svg": {
                  width: isSubItem ? "1.1rem" : "1.3rem",
                  height: isSubItem ? "1.1rem" : "1.3rem",
                },
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
                      sx={{
                        flex: 1,
                        color: isActive
                          ? isSubItem
                            ? theme.palette.primary.main
                            : "common.white"
                          : isDisabled
                          ? "text.disabled"
                          : "inherit",
                        fontSize: isSubItem ? "0.8rem" : "0.85rem",
                        fontWeight: isSubItem ? 400 : 500,
                        lineHeight: 1.2,
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
                  <Box sx={{ ml: 0.5 }}>
                    {isSubmenuOpen ? (
                      <ExpandMore
                        fontSize="small"
                        sx={{
                          fontSize: "0.9rem",
                          color:
                            isActive && !isSubItem ? "common.white" : "inherit",
                        }}
                      />
                    ) : (
                      <ChevronRight
                        fontSize="small"
                        sx={{
                          fontSize: "0.9rem",
                          color:
                            isActive && !isSubItem ? "common.white" : "inherit",
                        }}
                      />
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
                <Close fontSize="small" />
              ) : (
                <Menu fontSize="small" />
              )}
            </IconButton>
          </CustomGlobalTooltip>
        </MenuHeader>

        <List sx={{ pt: 0.5 }}>
          {items.map((item) => renderMenuItem(item))}
        </List>
      </Box>

      {isSidebarOpen && (
        <Box sx={{ p: 2 }}>
          <Button
            text="Importar | Exportar"
            icon={<SyncAlt fontSize="small" />}
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
              padding: "6px 12px",
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
