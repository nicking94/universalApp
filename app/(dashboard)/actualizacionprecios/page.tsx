"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Autocomplete,
  InputAdornment,
  useTheme,
  Divider,
  Button as MuiButton,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  Edit,
  Save,
  Cancel,
  PriceChange,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Percent as PercentIcon,
  Paid,
  Euro,
  LocalAtm,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { Product, Rubro } from "@/app/lib/types/types";
import { useRubro } from "@/app/context/RubroContext";
import { formatCurrency } from "@/app/lib/utils/currency";
import { useNotification } from "@/app/hooks/useNotification";
import Notification from "@/app/components/Notification";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import SearchBar from "@/app/components/SearchBar";
import InputCash from "@/app/components/InputCash";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import Pagination from "@/app/components/Pagination";
import { usePagination } from "@/app/context/PaginationContext";
import Button from "@/app/components/Button";
import { parseISO, format, differenceInDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import Modal from "@/app/components/Modal";
import CustomChip from "@/app/components/CustomChip"; // Importar tu CustomChip

const ActualizacionPreciosPage = () => {
  const theme = useTheme();
  const { rubro } = useRubro();
  const { currentPage, itemsPerPage } = usePagination();

  // Estados principales
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [editingCostPrice, setEditingCostPrice] = useState<number | null>(null);

  // Estados para el modal de actualización masiva
  const [bulkPercentage, setBulkPercentage] = useState<number>(0);
  const [bulkType, setBulkType] = useState<"price" | "cost">("price");
  const [bulkValueType, setBulkValueType] = useState<"percent" | "fixed">(
    "percent"
  );
  const [bulkFixedValue, setBulkFixedValue] = useState<number>(0);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isConfirmBulkModalOpen, setIsConfirmBulkModalOpen] = useState(false);

  // Estados para filtros dentro del modal
  const [modalSelectedCategories, setModalSelectedCategories] = useState<
    string[]
  >([]);
  const [modalFilteredProducts, setModalFilteredProducts] = useState<Product[]>(
    []
  );
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // Estados para categorías
  const [availableCategories, setAvailableCategories] = useState<
    Array<{ name: string; rubro: Rubro }>
  >([]);

  // Notificaciones
  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  // Obtener estilos consistentes con otras páginas
  const getTableHeaderStyle = () => ({
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  });

  // Cargar productos y categorías
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedProducts = await db.products.toArray();
        setProducts(storedProducts);
        setFilteredProducts(storedProducts);
        setModalFilteredProducts(storedProducts);

        const categoriesMap = new Map<string, { name: string; rubro: Rubro }>();
        storedProducts.forEach((product) => {
          if (product.customCategories?.length) {
            product.customCategories.forEach((cat) => {
              if (cat.name?.trim()) {
                const key = `${cat.name.toLowerCase().trim()}_${cat.rubro}`;
                if (!categoriesMap.has(key)) {
                  categoriesMap.set(key, {
                    name: cat.name,
                    rubro: cat.rubro,
                  });
                }
              }
            });
          }
        });
        setAvailableCategories(Array.from(categoriesMap.values()));
      } catch (error) {
        console.error("Error al cargar productos:", error);
        showNotification("Error al cargar productos", "error");
      }
    };
    fetchData();
  }, [showNotification]);

  // Filtrar productos para la página principal
  useEffect(() => {
    let filtered = [...products];

    if (rubro !== "Todos los rubros") {
      filtered = filtered.filter((product) => product.rubro === rubro);
    }

    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  }, [products, rubro, searchQuery]);

  // Filtrar productos para el modal
  const filterModalProducts = () => {
    let filtered = [...products];

    if (rubro !== "Todos los rubros") {
      filtered = filtered.filter((product) => product.rubro === rubro);
    }

    if (modalSearchQuery.trim() !== "") {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(modalSearchQuery.toLowerCase())
      );
    }

    if (modalSelectedCategories.length > 0) {
      filtered = filtered.filter((product) =>
        product.customCategories?.some((cat) =>
          modalSelectedCategories.includes(cat.name)
        )
      );
    }

    setModalFilteredProducts(filtered);
  };

  // Efecto para filtrar productos del modal cuando cambian los filtros
  useEffect(() => {
    if (isBulkModalOpen) {
      filterModalProducts();
    }
  }, [
    products,
    rubro,
    modalSearchQuery,
    modalSelectedCategories,
    isBulkModalOpen,
  ]);

  // Obtener categorías filtradas por rubro
  const getFilteredCategories = () => {
    if (rubro === "Todos los rubros") {
      return [...new Set(availableCategories.map((cat) => cat.name))];
    }

    // Filtrar categorías por el rubro actual
    const filteredByRubro = availableCategories
      .filter((cat) => cat.rubro === rubro)
      .map((cat) => cat.name);

    return [...new Set(filteredByRubro)];
  };

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleModalSearch = (query: string) => {
    setModalSearchQuery(query);
  };

  const handleEditClick = (product: Product) => {
    setEditingId(product.id);
    setEditedPrice(product.price);
    setEditingCostPrice(product.costPrice);
  };

  const handleSaveClick = async (product: Product) => {
    try {
      const updates: Partial<Product> = {
        price: editedPrice,
        updatedAt: new Date().toISOString(),
      };

      if (editingCostPrice !== null && editingCostPrice !== product.costPrice) {
        updates.costPrice = editingCostPrice;
      }

      await db.products.update(product.id, updates);
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, ...updates } : p))
      );
      setEditingId(null);
      setEditingCostPrice(null);
      showNotification("Precios actualizados correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar los precios:", error);
      showNotification("Error al actualizar los precios", "error");
    }
  };

  const handleCancelClick = () => {
    setEditingId(null);
    setEditingCostPrice(null);
  };

  const handleBulkUpdateClick = () => {
    if (bulkValueType === "percent" && bulkPercentage === 0) {
      showNotification("Ingrese un porcentaje válido", "error");
      return;
    }
    if (bulkValueType === "fixed" && bulkFixedValue === 0) {
      showNotification("Ingrese un monto válido", "error");
      return;
    }
    setIsBulkModalOpen(false);
    setIsConfirmBulkModalOpen(true);
  };

  const handleConfirmBulkUpdate = async () => {
    const productsToUpdate = modalFilteredProducts;

    try {
      const updatePromises = productsToUpdate.map((product) => {
        let newPrice = product.price;
        let newCostPrice = product.costPrice;

        if (bulkType === "price") {
          if (bulkValueType === "percent") {
            newPrice = product.price * (1 + bulkPercentage / 100);
          } else {
            newPrice =
              bulkFixedValue >= 0
                ? product.price + bulkFixedValue
                : Math.max(0, product.price + bulkFixedValue);
          }
        } else {
          if (bulkValueType === "percent") {
            newCostPrice = product.costPrice * (1 + bulkPercentage / 100);
          } else {
            newCostPrice =
              bulkFixedValue >= 0
                ? product.costPrice + bulkFixedValue
                : Math.max(0, product.costPrice + bulkFixedValue);
          }
        }

        return db.products.update(product.id, {
          price: parseFloat(newPrice.toFixed(2)),
          costPrice:
            bulkType === "cost"
              ? parseFloat(newCostPrice.toFixed(2))
              : product.costPrice,
          updatedAt: new Date().toISOString(),
        });
      });

      await Promise.all(updatePromises);

      setProducts((prev) =>
        prev.map((product) => {
          const isInFiltered = productsToUpdate.some(
            (p) => p.id === product.id
          );
          if (!isInFiltered) return product;

          let newPrice = product.price;
          let newCostPrice = product.costPrice;

          if (bulkType === "price") {
            if (bulkValueType === "percent") {
              newPrice = product.price * (1 + bulkPercentage / 100);
            } else {
              newPrice =
                bulkFixedValue >= 0
                  ? product.price + bulkFixedValue
                  : Math.max(0, product.price + bulkFixedValue);
            }
            return { ...product, price: parseFloat(newPrice.toFixed(2)) };
          } else {
            if (bulkValueType === "percent") {
              newCostPrice = product.costPrice * (1 + bulkPercentage / 100);
            } else {
              newCostPrice =
                bulkFixedValue >= 0
                  ? product.costPrice + bulkFixedValue
                  : Math.max(0, product.costPrice + bulkFixedValue);
            }
            return {
              ...product,
              costPrice: parseFloat(newCostPrice.toFixed(2)),
            };
          }
        })
      );

      showNotification(
        `${productsToUpdate.length} productos actualizados con un ${
          (bulkValueType === "percent" ? bulkPercentage : bulkFixedValue) >= 0
            ? "aumento"
            : "disminución"
        } del ${
          bulkValueType === "percent"
            ? Math.abs(bulkPercentage) + "%"
            : formatCurrency(Math.abs(bulkFixedValue))
        }`,
        "success"
      );
      setBulkPercentage(0);
      setBulkFixedValue(0);
      setIsConfirmBulkModalOpen(false);
    } catch (error) {
      console.error("Error en actualización masiva:", error);
      showNotification("Error al actualizar los precios", "error");
    }
  };

  const calculateProfitMargin = (product: Product) => {
    if (product.costPrice <= 0) return 0;
    const margin =
      ((product.price - product.costPrice) / product.costPrice) * 100;
    return isFinite(margin) ? margin : 0;
  };

  const getRowStyles = (product: Product) => {
    const baseStyles = {
      border: "1px solid",
      borderColor: "divider",
      "&:hover": {
        backgroundColor: "action.hover",
      },
      transition: "all 0.3s ease-in-out",
    };

    const hasLowStock =
      product.setMinStock &&
      product.minStock !== undefined &&
      product.minStock !== null &&
      product.stock < product.minStock;

    if (rubro !== "indumentaria" && product.expiration) {
      const expDate = startOfDay(parseISO(product.expiration));
      const today = startOfDay(new Date());
      const diffDays = differenceInDays(expDate, today);

      if (diffDays < 0) {
        return {
          ...baseStyles,
          borderLeft: "4px solid",
          borderLeftColor: "error.dark",
          backgroundColor: "grey.50",
        };
      }
      if (diffDays === 0) {
        return {
          ...baseStyles,
          borderLeft: "4px solid",
          borderLeftColor: "error.main",
          backgroundColor: "error.main",
          "& .MuiTableCell-root": {
            color: "inherit",
            fontWeight: "bold",
          },
        };
      }
      if (diffDays <= 7) {
        return {
          ...baseStyles,
          borderLeft: "4px solid",
          borderLeftColor: "error.light",
          backgroundColor: "grey.50",
        };
      }
    }

    return hasLowStock
      ? {
          ...baseStyles,
          borderLeft: "4px solid",
          borderLeftColor: "info.main",
          backgroundColor: "info.light",
        }
      : baseStyles;
  };

  // Resetear filtros del modal al abrir
  const handleOpenBulkModal = () => {
    setModalSearchQuery("");
    setModalSelectedCategories([]);
    setIsBulkModalOpen(true);
  };

  // Paginación para página principal
  const indexOfLastProduct = currentPage * itemsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstProduct,
    indexOfLastProduct
  );

  return (
    <ProtectedRoute>
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          py: 2,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Header */}
        <Box>
          <Typography variant="h5" fontWeight="semibold" mb={1}>
            Actualización de Precios
          </Typography>
        </Box>

        {/* Barra de búsqueda y botón */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            alignItems: { xs: "stretch", md: "center" },
          }}
        >
          <Box sx={{ flex: 1 }}>
            <SearchBar onSearch={handleSearch} />
          </Box>
          {/* Botón para abrir el modal de actualización masiva */}
          <Box>
            <Button
              variant="contained"
              startIcon={<PriceChange />}
              onClick={handleOpenBulkModal}
              disabled={
                rubro === "Todos los rubros" || filteredProducts.length === 0
              }
            >
              Actualización Masiva
            </Button>
          </Box>
        </Box>

        {/* Tabla de productos (edición individual) */}
        <Box
          sx={{
            flex: 1,
            minHeight: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{
                maxHeight: "55vh",
                mb: 2,
                flex: 1,
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={getTableHeaderStyle()}>Producto</TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Stock
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Categoría
                    </TableCell>
                    {rubro !== "indumentaria" && (
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Vencimiento
                      </TableCell>
                    )}
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Costo
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Venta
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Margen
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentProducts.length > 0 ? (
                    currentProducts.map((product) => {
                      const margin = calculateProfitMargin(product);
                      const rowStyles = getRowStyles(product);

                      return (
                        <TableRow key={product.id} sx={rowStyles} hover>
                          <TableCell
                            sx={{
                              fontWeight: "bold",
                              textTransform: "capitalize",
                            }}
                          >
                            {product.name}
                            {product.setMinStock &&
                              product.minStock !== undefined &&
                              product.stock < product.minStock && (
                                <CustomChip
                                  label="Stock bajo"
                                  size="small"
                                  color="error"
                                  sx={{ ml: 1, fontSize: "0.7rem" }}
                                />
                              )}
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight="medium">
                              {product.stock} {product.unit}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {product.customCategories?.[0]?.name || "-"}
                          </TableCell>
                          {rubro !== "indumentaria" && (
                            <TableCell align="center">
                              {product.expiration
                                ? format(
                                    parseISO(product.expiration),
                                    "dd/MM/yyyy",
                                    { locale: es }
                                  )
                                : "-"}
                            </TableCell>
                          )}
                          <TableCell align="center">
                            {editingId === product.id ? (
                              <InputCash
                                value={editingCostPrice || product.costPrice}
                                onChange={(value) => setEditingCostPrice(value)}
                              />
                            ) : (
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                <AttachMoney fontSize="small" />
                                {formatCurrency(product.costPrice)}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {editingId === product.id ? (
                              <InputCash
                                value={editedPrice}
                                onChange={(value) => setEditedPrice(value)}
                              />
                            ) : (
                              <Typography
                                fontWeight="bold"
                                color="primary.main"
                              >
                                {formatCurrency(product.price)}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <CustomChip
                              label={`${margin.toFixed(1)}%`}
                              size="small"
                              color={
                                margin > 50
                                  ? "success"
                                  : margin > 20
                                  ? "primary"
                                  : margin > 0
                                  ? "warning"
                                  : "error"
                              }
                            />
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              {editingId === product.id ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <CustomGlobalTooltip title="Guardar">
                                    <IconButton
                                      onClick={() => handleSaveClick(product)}
                                      size="small"
                                      sx={{
                                        borderRadius: "4px",
                                        color: "text.secondary",
                                        "&:hover": {
                                          backgroundColor: "primary.main",
                                          color: "white",
                                        },
                                      }}
                                    >
                                      <Save fontSize="small" />
                                    </IconButton>
                                  </CustomGlobalTooltip>
                                  <CustomGlobalTooltip title="Cancelar">
                                    <IconButton
                                      onClick={handleCancelClick}
                                      size="small"
                                      sx={{
                                        borderRadius: "4px",
                                        color: "text.secondary",
                                        "&:hover": {
                                          backgroundColor: "error.main",
                                          color: "white",
                                        },
                                      }}
                                    >
                                      <Cancel fontSize="small" />
                                    </IconButton>
                                  </CustomGlobalTooltip>
                                </Box>
                              ) : (
                                <CustomGlobalTooltip title="Editar precios">
                                  <IconButton
                                    onClick={() => handleEditClick(product)}
                                    size="small"
                                    sx={{
                                      borderRadius: "4px",
                                      color: "text.secondary",
                                      "&:hover": {
                                        backgroundColor: "primary.main",
                                        color: "white",
                                      },
                                    }}
                                  >
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "indumentaria" ? 8 : 7}
                        align="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            color: "text.secondary",
                            py: 4,
                          }}
                        >
                          <PriceChange
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>No hay productos para mostrar</Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Intenta cambiar los filtros de búsqueda
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

        {/* Modal de configuración para actualización masiva */}
        <Modal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          title="Actualización Masiva de Precios"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsBulkModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleBulkUpdateClick}
                isPrimaryAction={true}
                disabled={modalFilteredProducts.length === 0}
                sx={{
                  bgcolor:
                    (bulkValueType === "percent"
                      ? bulkPercentage
                      : bulkFixedValue) >= 0
                      ? "primary.main"
                      : "error.main",
                  "&:hover": {
                    bgcolor:
                      (bulkValueType === "percent"
                        ? bulkPercentage
                        : bulkFixedValue) >= 0
                        ? "primary.dark"
                        : "error.dark",
                  },
                }}
              >
                {(bulkValueType === "percent"
                  ? bulkPercentage
                  : bulkFixedValue) >= 0
                  ? "Aumentar"
                  : "Reducir"}{" "}
                ({modalFilteredProducts.length} productos)
              </Button>
            </Box>
          }
        >
          <Box sx={{ p: 3 }}>
            {/* Header del modal */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                <PriceChange sx={{ mr: 1.5, color: "primary.main" }} />
                <Typography variant="h6" fontWeight="semibold">
                  Actualización Masiva de Precios
                </Typography>
                <CustomChip
                  label={`${modalFilteredProducts.length} productos`}
                  size="small"
                  sx={{ ml: 2 }}
                />
              </Box>
              <Divider />
            </Box>

            {/* Sección de filtros */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body1"
                fontWeight="medium"
                color="text.secondary"
                mb={2}
              >
                Filtrar productos para aplicar la actualización
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 2,
                  alignItems: { xs: "stretch", md: "center" },
                }}
              >
                {/* Barra de búsqueda */}
                <Box sx={{ flex: 1 }}>
                  <SearchBar onSearch={handleModalSearch} />
                </Box>

                {/* Filtro por categorías - CORREGIDO */}
                <Box sx={{ flex: 1 }}>
                  <Autocomplete
                    multiple
                    options={getFilteredCategories()}
                    value={modalSelectedCategories}
                    onChange={(event, newValue) =>
                      setModalSelectedCategories(newValue)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        placeholder="Filtrar por categorías..."
                        size="small"
                        sx={{ width: "100%" }}
                      />
                    )}
                    disabled={rubro === "Todos los rubros"}
                    getOptionLabel={(option) => option}
                  />
                </Box>
              </Box>

              {/* Mensaje informativo cuando no hay categorías */}
              {rubro !== "Todos los rubros" &&
                getFilteredCategories().length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 1, display: "block" }}
                  >
                    No hay categorías registradas para el rubro {rubro}
                  </Typography>
                )}
            </Box>

            {/* Configuración de actualización masiva */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="body1"
                fontWeight="medium"
                color="text.secondary"
                mb={2}
              >
                Configurar la actualización
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  gap: 3,
                  alignItems: { xs: "stretch", md: "center" },
                }}
              >
                {/* Columna 1: Tipo de Precio */}
                <Box sx={{ flex: { xs: 1, md: 3 } }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="text.secondary"
                      mb={1}
                    >
                      Tipo de Precio
                    </Typography>
                    <ToggleButtonGroup
                      value={bulkType}
                      exclusive
                      onChange={(e, value) => value && setBulkType(value)}
                      fullWidth
                      size="small"
                    >
                      <ToggleButton
                        value="price"
                        sx={{
                          textTransform: "none",
                          border:
                            bulkType === "price"
                              ? `2px solid ${theme.palette.primary.main}`
                              : undefined,
                        }}
                      >
                        <LocalAtm fontSize="small" sx={{ mr: 1 }} />
                        Venta
                      </ToggleButton>
                      <ToggleButton
                        value="cost"
                        sx={{
                          textTransform: "none",
                          border:
                            bulkType === "cost"
                              ? `2px solid ${theme.palette.primary.main}`
                              : undefined,
                        }}
                      >
                        <Euro fontSize="small" sx={{ mr: 1 }} />
                        Costo
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                {/* Columna 2: Tipo de Modificación */}
                <Box sx={{ flex: { xs: 1, md: 3 } }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="text.secondary"
                      mb={1}
                    >
                      Tipo de Modificación
                    </Typography>
                    <ToggleButtonGroup
                      value={bulkValueType}
                      exclusive
                      onChange={(e, value) => value && setBulkValueType(value)}
                      fullWidth
                      size="small"
                    >
                      <ToggleButton
                        value="percent"
                        sx={{
                          textTransform: "none",
                          border:
                            bulkValueType === "percent"
                              ? `2px solid ${theme.palette.primary.main}`
                              : undefined,
                        }}
                      >
                        <PercentIcon fontSize="small" sx={{ mr: 1 }} />
                        Porcentaje
                      </ToggleButton>
                      <ToggleButton
                        value="fixed"
                        sx={{
                          textTransform: "none",
                          border:
                            bulkValueType === "fixed"
                              ? `2px solid ${theme.palette.primary.main}`
                              : undefined,
                        }}
                      >
                        <Paid fontSize="small" sx={{ mr: 1 }} />
                        Monto Fijo
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                </Box>

                {/* Columna 3: Valor */}
                <Box sx={{ flex: { xs: 1, md: 4 } }}>
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="text.secondary"
                      mb={1}
                    >
                      {bulkValueType === "percent"
                        ? "Porcentaje"
                        : "Monto Fijo"}
                    </Typography>
                    {bulkValueType === "percent" ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 1,
                        }}
                      >
                        <TextField
                          fullWidth
                          type="number"
                          value={bulkPercentage}
                          onChange={(e) =>
                            setBulkPercentage(parseFloat(e.target.value) || 0)
                          }
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">%</InputAdornment>
                            ),
                            startAdornment: (
                              <InputAdornment position="start">
                                {bulkPercentage >= 0 ? (
                                  <TrendingUp fontSize="small" />
                                ) : (
                                  <TrendingDown fontSize="small" />
                                )}
                              </InputAdornment>
                            ),
                          }}
                          size="small"
                          placeholder="0"
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <MuiButton
                            variant="outlined"
                            size="small"
                            onClick={() => setBulkPercentage(10)}
                            sx={{ whiteSpace: "nowrap", flex: 1 }}
                          >
                            +10%
                          </MuiButton>
                          <MuiButton
                            variant="outlined"
                            size="small"
                            onClick={() => setBulkPercentage(-10)}
                            sx={{ whiteSpace: "nowrap", flex: 1 }}
                          >
                            -10%
                          </MuiButton>
                        </Box>
                      </Box>
                    ) : (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          gap: 1,
                        }}
                      >
                        <TextField
                          fullWidth
                          type="number"
                          value={bulkFixedValue}
                          onChange={(e) =>
                            setBulkFixedValue(parseFloat(e.target.value) || 0)
                          }
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                $
                              </InputAdornment>
                            ),
                          }}
                          size="small"
                          placeholder="0.00"
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <MuiButton
                            variant="outlined"
                            size="small"
                            onClick={() => setBulkFixedValue(100)}
                            sx={{ whiteSpace: "nowrap", flex: 1 }}
                          >
                            +$100
                          </MuiButton>
                          <MuiButton
                            variant="outlined"
                            size="small"
                            onClick={() => setBulkFixedValue(-50)}
                            sx={{ whiteSpace: "nowrap", flex: 1 }}
                          >
                            -$50
                          </MuiButton>
                        </Box>
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* Tabla de productos en el modal (solo visualización) */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="body1"
                fontWeight="medium"
                color="text.secondary"
                mb={1}
              >
                Productos que se actualizarán ({modalFilteredProducts.length})
              </Typography>

              <TableContainer
                component={Paper}
                sx={{
                  maxHeight: "50vh",
                  overflow: "auto",
                  borderRadius: 1,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={getTableHeaderStyle()}>Producto</TableCell>
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Categoría
                      </TableCell>
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Precio Actual
                      </TableCell>
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Nuevo Precio
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modalFilteredProducts.slice(0, 5).map((product) => {
                      let newPrice = product.price;
                      let newCostPrice = product.costPrice;

                      if (bulkType === "price") {
                        if (bulkValueType === "percent") {
                          newPrice = product.price * (1 + bulkPercentage / 100);
                        } else {
                          newPrice = product.price + bulkFixedValue;
                        }
                      } else {
                        if (bulkValueType === "percent") {
                          newCostPrice =
                            product.costPrice * (1 + bulkPercentage / 100);
                        } else {
                          newCostPrice = product.costPrice + bulkFixedValue;
                        }
                      }

                      return (
                        <TableRow key={product.id} hover>
                          <TableCell sx={{ textTransform: "capitalize" }}>
                            {product.name}
                          </TableCell>
                          <TableCell
                            align="center"
                            sx={{ textTransform: "capitalize" }}
                          >
                            {product.customCategories?.[0]?.name || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {bulkType === "price"
                              ? formatCurrency(product.price)
                              : formatCurrency(product.costPrice)}
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="bold" color="primary.main">
                              {bulkType === "price"
                                ? formatCurrency(newPrice)
                                : formatCurrency(newCostPrice)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {modalFilteredProducts.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary">
                            ... y {modalFilteredProducts.length - 5} productos
                            más
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {modalFilteredProducts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            py={2}
                          >
                            No hay productos que coincidan con los filtros
                            seleccionados
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </Modal>

        {/* Modal de confirmación para actualización masiva */}
        <Modal
          isOpen={isConfirmBulkModalOpen}
          onClose={() => setIsConfirmBulkModalOpen(false)}
          title="Confirmar Actualización Masiva"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsConfirmBulkModalOpen(false)}
                sx={{
                  color: "text.secondary",
                  borderColor: "text.secondary",
                  "&:hover": {
                    backgroundColor: "action.hover",
                    borderColor: "text.primary",
                  },
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmBulkUpdate}
                isPrimaryAction={true}
                sx={{
                  bgcolor:
                    (bulkValueType === "percent"
                      ? bulkPercentage
                      : bulkFixedValue) >= 0
                      ? "primary.main"
                      : "error.main",
                  "&:hover": {
                    bgcolor:
                      (bulkValueType === "percent"
                        ? bulkPercentage
                        : bulkFixedValue) >= 0
                        ? "primary.dark"
                        : "error.dark",
                  },
                }}
              >
                Confirmar Actualización
              </Button>
            </Box>
          }
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <PriceChange
              sx={{ fontSize: 48, color: "primary.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea actualizar los precios?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              Se aplicará un{" "}
              {(bulkValueType === "percent"
                ? bulkPercentage
                : bulkFixedValue) >= 0
                ? "aumento"
                : "disminución"}{" "}
              del{" "}
              <strong>
                {bulkValueType === "percent"
                  ? `${Math.abs(bulkPercentage)}%`
                  : formatCurrency(Math.abs(bulkFixedValue))}
              </strong>{" "}
              al{" "}
              <strong>
                {bulkType === "price" ? "precio de venta" : "precio de costo"}
              </strong>{" "}
              de <strong>{modalFilteredProducts.length} productos</strong>.
            </Typography>
          </Box>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
          onClose={closeNotification}
        />
      </Box>
    </ProtectedRoute>
  );
};

export default ActualizacionPreciosPage;
