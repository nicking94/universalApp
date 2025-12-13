"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Autocomplete,
  FormControl,
} from "@mui/material";
import { db } from "@/app/database/db";
import { PriceList, Product, Rubro } from "@/app/lib/types/types";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";
import { usePagination } from "@/app/context/PaginationContext";
import Pagination from "@/app/components/Pagination";

const PriceListProducts: React.FC<{ rubro: Rubro }> = ({ rubro }) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(
    null
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const { currentPage, itemsPerPage } = usePagination();

  const loadData = useCallback(async () => {
    try {
      // Cargar listas de precios
      const lists = await db.priceLists.where("rubro").equals(rubro).toArray();
      setPriceLists(lists);

      if (lists.length > 0 && !selectedPriceListId) {
        setSelectedPriceListId(lists[0].id);
      }

      // Cargar productos
      const prods = await db.products.where("rubro").equals(rubro).toArray();
      setProducts(prods);
      setFilteredProducts(prods);

      // Cargar precios existentes
      if (selectedPriceListId) {
        const prices = await db.productPrices
          .where("priceListId")
          .equals(selectedPriceListId)
          .toArray();

        const updates: Record<number, number> = {};
        prices.forEach((price) => {
          updates[price.productId] = price.price;
        });
        setPriceUpdates(updates);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, [rubro, selectedPriceListId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = products.filter((product) =>
        getDisplayProductName(product, rubro, false)
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [searchQuery, products, rubro]);

  const handlePriceChange = (productId: number, price: number) => {
    setPriceUpdates((prev) => ({
      ...prev,
      [productId]: price,
    }));
  };

  const savePrice = async (productId: number) => {
    if (!selectedPriceListId || priceUpdates[productId] === undefined) return;

    try {
      await db.productPrices.put({
        productId,
        priceListId: selectedPriceListId,
        price: priceUpdates[productId],
      });
    } catch (error) {
      console.error("Error saving price:", error);
    }
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      {/* Header con selector de lista y búsqueda */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          gap: 2,
          alignItems: "center",
        }}
      >
        <FormControl sx={{ minWidth: 250 }} size="small">
          <Autocomplete
            options={priceLists}
            value={
              priceLists.find((list) => list.id === selectedPriceListId) || null
            }
            onChange={(event, newValue) => {
              setSelectedPriceListId(newValue?.id || null);
            }}
            getOptionLabel={(option) =>
              `${option.name}${option.isDefault ? " (Por defecto)" : ""}`
            }
            renderInput={(params) => (
              <TextField {...params} label="Lista de precios" size="small" />
            )}
          />
        </FormControl>

        <TextField
          label="Buscar producto"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ width: 250 }}
          placeholder="Nombre del producto..."
        />
      </Box>

      {/* Tabla de productos */}
      <Box sx={{ flex: 1, minHeight: "auto" }}>
        <TableContainer
          component={Paper}
          sx={{ maxHeight: "62vh", mb: 2, flex: 1 }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                >
                  Producto
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                  align="center"
                >
                  Precio Base
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                  align="center"
                >
                  Precio en Lista
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                  }}
                  align="center"
                >
                  Diferencia
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentProducts.length > 0 ? (
                currentProducts.map((product) => {
                  const listPrice = priceUpdates[product.id] || product.price;
                  const difference = listPrice - product.price;

                  return (
                    <TableRow
                      key={product.id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        "&:hover": {
                          backgroundColor: "action.hover",
                          transform: "translateY(-1px)",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        },
                        transition: "all 0.3s ease-in-out",
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight="medium">
                          {getDisplayProductName(product, rubro)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography color="text.secondary">
                          {formatCurrency(product.price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <TextField
                          type="number"
                          value={listPrice}
                          onChange={(e) =>
                            handlePriceChange(
                              product.id,
                              parseFloat(e.target.value)
                            )
                          }
                          onBlur={() => savePrice(product.id)}
                          size="small"
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          color={
                            difference > 0
                              ? "success.main"
                              : difference < 0
                              ? "error.main"
                              : "text.secondary"
                          }
                          fontWeight={difference !== 0 ? "bold" : "normal"}
                        >
                          {formatCurrency(difference)}
                          {difference !== 0 && (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{ ml: 1 }}
                            >
                              ({difference > 0 ? "+" : ""}
                              {((difference / product.price) * 100).toFixed(1)}
                              %)
                            </Typography>
                          )}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        color: "text.secondary",
                        py: 4,
                      }}
                    >
                      <Typography sx={{ mb: 2 }}>
                        {searchQuery
                          ? "No se encontraron productos"
                          : "No hay productos en este rubro"}
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Paginación */}
      {filteredProducts.length > 0 && (
        <Pagination
          text="Productos por página"
          text2="Total de productos"
          totalItems={filteredProducts.length}
        />
      )}
    </Box>
  );
};

export default PriceListProducts;
