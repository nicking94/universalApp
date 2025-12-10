// app/theme/theme.ts
"use client";
import { createTheme } from "@mui/material/styles";

const colors = {
  black: "#141414",
  gray_xxl: "#f3f4f6",
  gray_xl: "#d1d5db",
  gray_l: "#7c7c7c",
  gray_m: "#4c4c4c",
  gray_b: "#2c2c2c",
  blue_xl: "#eaf6ff",
  blue_l: "#85c1e9",
  blue_m: "#268ed4",
  blue_b: "#2d78b9",
  green_xl: "#f0fff4",
  green_l: "#a3e4d7",
  green_m: "#2ecc71",
  green_b: "#1e8449",
  red_xl: "#fff5f5",
  red_l: "#f2dede",
  red_m: "#e74c3c",
  red_b: "#c0392b",
  yellow_xl: "#fffbe6",
  yellow_l: "#fff9c4",
  yellow_m: "#f1c40f",
  yellow_b: "#f39c12",
};

export const lightTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: colors.blue_m,
      dark: colors.blue_b,
      light: colors.blue_l,
    },
    secondary: {
      main: colors.gray_m,
      dark: colors.gray_b,
      light: colors.gray_l,
    },
    success: {
      main: colors.green_m,
      dark: colors.green_b,
      light: colors.green_l,
    },
    error: {
      main: colors.red_m,
      dark: colors.red_b,
      light: colors.red_l,
    },
    warning: {
      main: colors.yellow_m,
      dark: colors.yellow_b,
      light: colors.yellow_l,
    },
    background: {
      default: colors.gray_xxl,
      paper: "#ffffff",
    },
    text: {
      primary: colors.gray_b,
      secondary: colors.gray_m,
    },
    grey: {
      50: colors.gray_xxl,
      100: colors.gray_xl,
      500: colors.gray_l,
      700: colors.gray_m,
      900: colors.gray_b,
    },

    profit: {
      main: "#8b5cf6",
      light: "#a78bfa",
      dark: "#7c3aed",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
});

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.blue_m,
      dark: colors.blue_b,
      light: colors.blue_l,
    },
    secondary: {
      main: colors.gray_m,
      dark: colors.gray_b,
      light: colors.gray_xxl,
    },
    success: {
      main: colors.green_m,
      dark: colors.green_b,
      light: colors.green_l,
    },
    error: {
      main: colors.red_m,
      dark: colors.red_b,
      light: colors.red_l,
    },
    warning: {
      main: colors.yellow_m,
      dark: colors.yellow_b,
      light: colors.yellow_l,
    },
    background: {
      default: colors.black,
      paper: colors.gray_b,
    },
    text: {
      primary: colors.gray_xxl,
      secondary: colors.gray_xl,
    },
    grey: {
      50: colors.gray_b,
      100: colors.gray_m,
      500: colors.gray_l,
      700: colors.gray_xl,
      900: colors.gray_xxl,
    },

    profit: {
      main: "#a78bfa",
      light: "#c4b5fd",
      dark: "#8b5cf6",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)",
          backgroundColor: colors.gray_b,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: colors.gray_m,
            color: colors.gray_xxl,
            fontWeight: "bold",
          },
        },
      },
    },
  },
});

declare module "@mui/material/styles" {
  interface Palette {
    profit: Palette["primary"];
  }
  interface PaletteOptions {
    profit?: PaletteOptions["primary"];
  }
}

declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    profit: true;
  }
}
