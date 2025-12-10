// components/SaleProductsDetail.tsx
import React from "react";
import { CreditSale, Rubro } from "@/app/lib/types/types";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import {
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography,
} from "@mui/material";

interface SaleProductsDetailProps {
  sale: CreditSale;
  rubro: Rubro | undefined;
}

export const SaleProductsDetail: React.FC<SaleProductsDetailProps> = ({
  sale,
  rubro,
}) => {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold", bgcolor: "action.hover" }}>
              Producto
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Cantidad
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Precio Unit.
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: "bold", bgcolor: "action.hover" }}
            >
              Subtotal
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sale.products.map((product, idx) => (
            <TableRow
              key={`${sale.id}-${product.id}-${idx}`}
              hover
              sx={{
                "&:hover": { backgroundColor: "action.hover" },
                transition: "background-color 0.2s",
              }}
            >
              <TableCell>
                <Typography variant="body2">
                  {getDisplayProductName(
                    {
                      name: product.name,
                      size: product.size,
                      color: product.color,
                      rubro: product.rubro,
                    },
                    rubro,
                    true
                  )}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {product.quantity} {product.unit}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">
                  {product.price.toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight="medium">
                  {(product.quantity * product.price).toLocaleString("es-AR", {
                    style: "currency",
                    currency: "ARS",
                  })}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
