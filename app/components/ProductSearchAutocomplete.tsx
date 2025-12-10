// app/components/ProductSearchAutocomplete.tsx
"use client";

import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Checkbox,
  Popper,
  IconButton,
} from "@mui/material";
import { CheckBoxOutlineBlank, CheckBox, Close } from "@mui/icons-material";
import { SyntheticEvent, useMemo, useState, useCallback, useRef } from "react";
import { Product, ProductOption, Rubro } from "@/app/lib/types/types";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";

interface ProductSearchAutocompleteProps {
  products: Product[];
  selectedProducts: ProductOption[];
  onProductSelect: (selectedOptions: ProductOption[]) => void;
  onSearchChange: (query: string) => void;
  rubro: Rubro;
  disabled?: boolean;
  placeholder?: string;
  maxDisplayed?: number;
}

const ProductSearchAutocomplete = ({
  products,
  selectedProducts,
  onProductSelect,
  onSearchChange,
  rubro,
  disabled = false,
  placeholder = "Seleccionar productos",
  maxDisplayed = 50,
}: ProductSearchAutocompleteProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const icon = useMemo(() => <CheckBoxOutlineBlank fontSize="small" />, []);
  const checkedIcon = useMemo(() => <CheckBox fontSize="small" />, []);

  const productOptions = useMemo(() => {
    return products
      .filter((p) => rubro === "Todos los rubros" || p.rubro === rubro)
      .map((p) => {
        const stock = Number(p.stock);
        const isValidStock = !isNaN(stock);
        const displayName = getDisplayProductName(
          {
            name: p.name,
            size: p.size,
            color: p.color,
            rubro: p.rubro,
            lot: p.lot,
          },
          rubro,
          true
        );

        return {
          value: p.id,
          label:
            isValidStock && stock > 0
              ? displayName
              : `${displayName} (agotado)`,
          product: p,
          isDisabled: !isValidStock || stock <= 0,
        } as ProductOption;
      });
  }, [products, rubro]);

  const filteredProductOptions = useMemo(() => {
    if (!searchQuery) return productOptions.slice(0, maxDisplayed);

    const query = searchQuery.toLowerCase();
    return productOptions
      .filter((option) => {
        const productName = option.product?.name.toLowerCase() || "";
        const label = option.label.toLowerCase();
        const size = option.product?.size?.toLowerCase() || "";
        const color = option.product?.color?.toLowerCase() || "";
        const rubroText = option.product?.rubro?.toLowerCase() || "";
        const lot = option.product?.lot?.toLowerCase() || "";

        return (
          label.includes(query) ||
          productName.includes(query) ||
          size.includes(query) ||
          color.includes(query) ||
          rubroText.includes(query) ||
          lot.includes(query)
        );
      })
      .slice(0, maxDisplayed);
  }, [productOptions, searchQuery, maxDisplayed]);

  const getOptionLabel = useCallback(
    (option: ProductOption) => {
      return getDisplayProductName(
        {
          name: option.product?.name || option.label,
          size: option.product?.size,
          color: option.product?.color,
          rubro: option.product?.rubro,
          lot: option.product?.lot,
        },
        rubro,
        true
      );
    },
    [rubro]
  );

  const getOptionDisabled = (option: ProductOption): boolean => {
    return option.isDisabled || false;
  };

  const handleInputChange = useCallback(
    (event: SyntheticEvent, value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery(value);
        onSearchChange(value);
      }, 200);
    },
    [onSearchChange]
  );

  const handleRemoveProduct = useCallback(
    (productToRemove: ProductOption) => {
      const updatedProducts = selectedProducts.filter(
        (product) => product.value !== productToRemove.value
      );
      onProductSelect(updatedProducts);
    },
    [selectedProducts, onProductSelect]
  );

  return (
    <Autocomplete
      multiple
      options={filteredProductOptions}
      getOptionLabel={getOptionLabel}
      getOptionDisabled={getOptionDisabled}
      getOptionKey={(option) => `${option.value}-${option.label}`}
      value={selectedProducts}
      onChange={(event, newValue) => {
        onProductSelect(newValue);
      }}
      onInputChange={handleInputChange}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={placeholder}
          variant="outlined"
          size="small"
          fullWidth
        />
      )}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Box
            component="span"
            {...getTagProps({ index })}
            key={`${option.value}-${option.label}-${index}`}
            sx={{
              backgroundColor: option.isDisabled
                ? "error.light"
                : "primary.light",
              color: option.isDisabled
                ? "error.contrastText"
                : "primary.contrastText",
              borderRadius: 1,
              padding: "2px 8px 2px 12px",
              margin: "2px",
              fontSize: "0.875rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              position: "relative",
              "&:hover": {
                backgroundColor: option.isDisabled
                  ? "error.main"
                  : "primary.main",
              },
            }}
          >
            <Box sx={{ flex: 1, mr: 1 }}>{option.label}</Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveProduct(option);
              }}
              sx={{
                padding: 0,
                width: 18,
                height: 18,
                minWidth: 18,
                minHeight: 18,
                color: "inherit",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                },
              }}
            >
              <Close sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        ))
      }
      isOptionEqualToValue={(option, value) => option.value === value.value}
      disableCloseOnSelect
      filterOptions={(options) => options}
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox
            icon={icon}
            checkedIcon={checkedIcon}
            style={{ marginRight: 8 }}
            checked={selected}
            disabled={option.isDisabled}
          />
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: option.isDisabled ? "text.disabled" : "text.primary",
              }}
            >
              {option.label}
            </Typography>
            {option.product && (
              <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Stock: {option.product.stock} {option.product.unit}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Precio: {formatCurrency(option.product.price)}
                </Typography>
              </Box>
            )}
          </Box>
        </li>
      )}
      noOptionsText="No se encontraron productos"
      loading={products.length === 0}
      loadingText="Cargando productos..."
      PopperComponent={(props) => (
        <Popper {...props} placement="bottom-start" style={{ zIndex: 1300 }} />
      )}
      limitTags={3}
      disableListWrap
      sx={{
        "& .MuiAutocomplete-inputRoot": {
          padding: "4px 8px",
        },
        "& .MuiAutocomplete-tag": {
          margin: "2px 4px 2px 0",
        },
      }}
    />
  );
};

export default ProductSearchAutocomplete;
