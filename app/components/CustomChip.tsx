// components/CustomChip.tsx
import { Chip, ChipProps } from "@mui/material";
import { toCapitalize } from "../lib/utils/capitalizeText";

type ExtendedColor =
  | "success"
  | "error"
  | "primary"
  | "warning"
  | "info"
  | "secondary"
  | "default";

interface CustomChipProps extends Omit<ChipProps, "color" | "label"> {
  color?: ExtendedColor;
  label?: string;
}

const CustomChip = ({
  color = "primary",
  label,
  sx = {},
  ...props
}: CustomChipProps) => {
  const capitalizedLabel = label ? toCapitalize(label) : label;

  return (
    <Chip
      {...props}
      label={capitalizedLabel}
      color={color}
      sx={{
        color: "white",
        "& .MuiChip-label": {
          color: "white",
        },
        "& .MuiChip-icon": {
          color: "white",
        },
        "& .MuiChip-deleteIcon": {
          color: "white",
          "&:hover": {
            color: "rgba(255, 255, 255, 0.8)",
          },
        },
        ...sx,
      }}
    />
  );
};

export default CustomChip;
