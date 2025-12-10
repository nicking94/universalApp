"use client";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";
import logo from "@/public/logo.png";
import { useRubro } from "../context/RubroContext";
import NotificationIcon from "./Notifications/NotificationIcon";

import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery,
  SelectChangeEvent,
  IconButton,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Menu as MenuIcon } from "@mui/icons-material";

const rubroOptions = [
  { value: "Todos los rubros", label: "Todos los rubros" },
  { value: "comercio", label: "Comercio" },
  { value: "indumentaria", label: "Indumentaria" },
];

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  borderBottom: `1px solid ${theme.palette.divider}`,
  transition: "all 0.3s ease",
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
}));

const LogoImage = styled(Image)({
  borderRadius: "50%",
  objectFit: "cover",
});

const RubroContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: theme.spacing(0.5),
}));

const StyledFormControl = styled(FormControl)(({ theme }) => ({
  minWidth: 160,
  "& .MuiOutlinedInput-root": {
    fontSize: "0.875rem",
    backgroundColor: theme.palette.background.paper,
    "& .MuiOutlinedInput-input": {
      color: theme.palette.text.primary,
    },
  },
  "& .MuiInputLabel-root": {
    fontSize: "0.875rem",
    color: theme.palette.text.secondary,
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.divider,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: theme.palette.primary.main,
  },
  [theme.breakpoints.down("sm")]: {
    minWidth: 140,
  },
}));

const NavbarContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(3),
  [theme.breakpoints.down("md")]: {
    gap: theme.spacing(2),
  },
  [theme.breakpoints.down("sm")]: {
    gap: theme.spacing(1),
  },
}));

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const { rubro, setRubro } = useRubro();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  const handleRubroChange = (event: SelectChangeEvent<string>) => {
    setRubro(
      event.target.value as "Todos los rubros" | "comercio" | "indumentaria"
    );
  };

  return (
    <StyledAppBar
      position="fixed"
      sx={{
        width: {
          xs: "100%",
          sm: "100%",
          md: isSidebarOpen ? "calc(100% - 256px)" : "calc(100% - 120px)",
        },
        left: {
          xs: 0,
          sm: 0,
          md: isSidebarOpen ? 256 : 120,
        },
        transition: muiTheme.transitions.create(["width", "left"], {
          duration: muiTheme.transitions.duration.standard,
        }),
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
          padding: muiTheme.spacing(1, 3),
          minHeight: "64px !important",
          [muiTheme.breakpoints.down("sm")]: {
            padding: muiTheme.spacing(1, 2),
          },
        }}
      >
        <IconButton
          onClick={toggleSidebar}
          sx={{
            display: { xs: "block", md: "none" },
            color: "text.primary",
          }}
          aria-label="Toggle menu"
        >
          <MenuIcon />
        </IconButton>

        <LogoContainer sx={{ display: { xs: "none", md: "flex" } }}>
          <LogoImage src={logo} alt="User Logo" width={32} height={32} />
          <Box>
            <Typography
              variant="h6"
              component="h1"
              sx={{
                color: "text.secondary",
                fontStyle: "italic",
                fontSize: isMobile ? "0.9rem" : "1rem",
                lineHeight: 1.2,
              }}
            >
              Universal App
              <Typography
                component="span"
                sx={{
                  textTransform: "uppercase",
                  fontSize: isMobile ? "0.7rem" : "0.8rem",
                  fontWeight: "bold",
                  color: "primary.main",
                  marginLeft: 1,
                }}
              >
                | {rubro}
              </Typography>
            </Typography>
          </Box>
        </LogoContainer>

        <NavbarContainer>
          <RubroContainer>
            <StyledFormControl size="small" variant="outlined">
              <InputLabel id="rubro-select-label">Rubro</InputLabel>
              <Select
                labelId="rubro-select-label"
                value={rubro}
                onChange={handleRubroChange}
                label="Rubro"
                sx={{
                  fontSize: "0.875rem",
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: muiTheme.palette.background.paper,
                      "& .MuiMenuItem-root": {
                        color: muiTheme.palette.text.primary,
                        "&:hover": {
                          backgroundColor: muiTheme.palette.action.hover,
                        },
                      },
                    },
                  },
                }}
              >
                {rubroOptions.map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    sx={{ fontSize: "0.875rem" }}
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </StyledFormControl>
          </RubroContainer>

          <Box sx={{ display: "flex", alignItems: "center" }}>
            <NotificationIcon />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <UserMenu
              theme={theme}
              handleTheme={handleTheme}
              handleCloseSession={handleCloseSession}
            />
          </Box>
        </NavbarContainer>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Navbar;
