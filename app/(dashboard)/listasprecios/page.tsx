"use client";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  IconButton,
  FormControl,
  TextField,
  Autocomplete,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  AttachMoney,
  ViewList,
  Assignment,
  CheckCircle,
  Cancel,
} from "@mui/icons-material";
import { useRubro } from "@/app/context/RubroContext";
import { useNotification } from "@/app/hooks/useNotification";
import { db } from "@/app/database/db";
import { PriceList, Product, Rubro } from "@/app/lib/types/types";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { usePagination } from "@/app/context/PaginationContext";
import SearchBar from "@/app/components/SearchBar";
import Pagination from "@/app/components/Pagination";
import Input from "@/app/components/Input";
import Select from "@/app/components/Select";
import Notification from "@/app/components/Notification";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import { formatCurrency } from "@/app/lib/utils/currency";
import getDisplayProductName from "@/app/lib/utils/DisplayProductName";

// Componente para gestión de listas de precios
const PriceListsManager: React.FC<{ rubro: Rubro }> = ({ rubro }) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<PriceList | null>(null);
  const [listName, setListName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const { currentPage, itemsPerPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredLists, setFilteredLists] = useState<PriceList[]>([]);

  const showNotificationRef = useRef(showNotification);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  const loadPriceLists = useCallback(async () => {
    try {
      const lists = await db.priceLists.where("rubro").equals(rubro).toArray();
      const sortedLists = lists.sort((a, b) => a.name.localeCompare(b.name));
      setPriceLists(sortedLists);
      setFilteredLists(sortedLists);
    } catch (error) {
      console.error("Error loading price lists:", error);
      showNotificationRef.current("Error al cargar listas de precios", "error");
    }
  }, [rubro]);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = priceLists.filter((list) =>
        list.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLists(filtered);
    } else {
      setFilteredLists(priceLists);
    }
  }, [searchQuery, priceLists]);

  const handleOpenModal = (list?: PriceList) => {
    if (list) {
      setEditingPriceList(list);
      setListName(list.name);
      setIsActive(list.isActive !== false); // Por defecto true si no está definido
    } else {
      setEditingPriceList(null);
      setListName("");
      setIsActive(true); // Por defecto activa al crear
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!listName.trim()) {
      showNotificationRef.current(
        "El nombre de la lista es requerido",
        "error"
      );
      return;
    }

    try {
      if (editingPriceList) {
        await db.priceLists.update(editingPriceList.id, {
          name: listName.trim(),
          isActive,
          updatedAt: new Date().toISOString(),
        });
        showNotificationRef.current("Lista de precios actualizada", "success");
      } else {
        const newPriceList: PriceList = {
          id: Date.now(),
          name: listName.trim(),
          rubro,
          isActive,
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.priceLists.add(newPriceList);
        showNotificationRef.current("Lista de precios creada", "success");
      }

      await loadPriceLists();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving price list:", error);
      showNotificationRef.current("Error al guardar la lista", "error");
    }
  };

  const handleDeleteClick = (list: PriceList) => {
    setListToDelete(list);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!listToDelete) return;

    try {
      // Verificar si hay productos usando esta lista
      const productPrices = await db.productPrices
        .where("priceListId")
        .equals(listToDelete.id)
        .count();

      if (productPrices > 0) {
        showNotificationRef.current(
          "No se puede eliminar porque hay productos usando esta lista",
          "error"
        );
        return;
      }

      // Verificar si hay ventas usando esta lista
      const salesWithList = await db.sales
        .where("priceListId")
        .equals(listToDelete.id)
        .count();

      if (salesWithList > 0) {
        showNotificationRef.current(
          "No se puede eliminar porque hay ventas usando esta lista",
          "error"
        );
        return;
      }

      await db.priceLists.delete(listToDelete.id);
      showNotificationRef.current("Lista eliminada", "success");
      await loadPriceLists();
    } catch (error) {
      console.error("Error deleting price list:", error);
      showNotificationRef.current("Error al eliminar la lista", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setListToDelete(null);
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLists = filteredLists.slice(indexOfFirstItem, indexOfLastItem);

  const getTableHeaderStyle = () => ({
    bgcolor: "primary.main",
    color: "primary.contrastText",
  });

  // Opciones para el selector de estado
  const statusOptions = [
    { value: "active", label: "Activa" },
    { value: "inactive", label: "Inactiva" },
  ];

  const DeleteModalContent = useMemo(
    () => (
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Lista de Precios"
        bgColor="bg-white dark:bg-gray_b"
        buttons={
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => setIsDeleteModalOpen(false)}
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
              color="error"
              onClick={handleConfirmDelete}
              isPrimaryAction={true}
              sx={{
                bgcolor: "error.main",
                "&:hover": { bgcolor: "error.dark" },
              }}
            >
              Sí, Eliminar
            </Button>
          </Box>
        }
      >
        <Box sx={{ textAlign: "center", py: 2 }}>
          <Delete
            sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
          />
          <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
            ¿Está seguro/a que desea eliminar esta lista?
          </Typography>
          <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
            <strong>{listToDelete?.name}</strong> será eliminada
            permanentemente.
          </Typography>
        </Box>
      </Modal>
    ),
    [isDeleteModalOpen, listToDelete, handleConfirmDelete]
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
      {/* Header con búsqueda y botón */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          width: "100%",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: "400px" }}>
          <SearchBar onSearch={setSearchQuery} />
        </Box>
        <Box
          sx={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
        >
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenModal()}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Nueva Lista
          </Button>
        </Box>
      </Box>

      {/* Tabla de listas */}
      <Box sx={{ flex: 1, minHeight: "auto" }}>
        <TableContainer
          component={Paper}
          sx={{ maxHeight: "55vh", mb: 2, flex: 1 }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={getTableHeaderStyle()}>Nombre</TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
                  Estado
                </TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
                  Fecha de Creación
                </TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentLists.length > 0 ? (
                currentLists.map((list) => (
                  <TableRow
                    key={list.id}
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
                      <Typography fontWeight="medium">{list.name}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <CustomChip
                          label={
                            list.isActive !== false ? "Activa" : "Inactiva"
                          }
                          color={list.isActive !== false ? "success" : "error"}
                          size="small"
                          icon={
                            list.isActive !== false ? (
                              <CheckCircle />
                            ) : (
                              <Cancel />
                            )
                          }
                        />
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {list.createdAt
                        ? new Date(list.createdAt).toLocaleDateString("es-AR")
                        : "Sin fecha"}
                    </TableCell>
                    <TableCell align="center">
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "center",
                          gap: 1,
                        }}
                      >
                        <CustomGlobalTooltip title="Editar lista">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenModal(list)}
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
                        <CustomGlobalTooltip title="Eliminar lista">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(list)}
                            sx={{
                              borderRadius: "4px",
                              color: "text.secondary",
                              "&:hover": {
                                backgroundColor: "error.main",
                                color: "white",
                              },
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </CustomGlobalTooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
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
                      <ViewList
                        sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                      />
                      <Typography sx={{ mb: 2 }}>
                        {searchQuery
                          ? "No se encontraron listas de precios"
                          : "No hay listas de precios creadas para este rubro"}
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
      {filteredLists.length > 0 && (
        <Pagination
          text="Listas por página"
          text2="Total de listas"
          totalItems={filteredLists.length}
        />
      )}

      {/* Modal para crear/editar lista */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPriceList ? "Editar Lista" : "Nueva Lista de Precios"}
        bgColor="bg-white dark:bg-gray_b"
        buttons={
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button
              variant="text"
              onClick={() => setIsModalOpen(false)}
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
              onClick={handleSave}
              isPrimaryAction={true}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              {editingPriceList ? "Actualizar" : "Crear"}
            </Button>
          </Box>
        }
      >
        <Box sx={{ display: "flex", flexDirection: "row", gap: 2 }}>
          <Input
            label="Nombre de la lista"
            value={listName}
            onChange={(value) => setListName(value.toString())}
            placeholder="Ej: Mayorista, Minorista, Oferta"
            required
          />
          <Select
            label="Estado"
            value={isActive ? "active" : "inactive"}
            options={statusOptions}
            onChange={(value) => setIsActive(value === "active")}
            size="small"
          />
          {!isActive && (
            <Typography variant="caption" color="warning.main">
              ⚠️ Una lista inactiva no estará disponible para seleccionar en las
              ventas.
            </Typography>
          )}
        </Box>
      </Modal>

      {DeleteModalContent}

      <Notification
        isOpen={isNotificationOpen}
        message={notificationMessage}
        type={notificationType}
        onClose={closeNotification}
      />
    </Box>
  );
};

// Componente para precios por producto - ACTUALIZADO para filtrar solo listas activas
const PriceListProducts: React.FC<{ rubro: Rubro }> = ({ rubro }) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [selectedPriceListId, setSelectedPriceListId] = useState<number | null>(
    null
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [priceUpdates, setPriceUpdates] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState("");

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const { currentPage, itemsPerPage } = usePagination();

  const showNotificationRef = useRef(showNotification);

  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  const loadData = useCallback(async () => {
    try {
      // Cargar SOLO listas de precios ACTIVAS
      const lists = await db.priceLists
        .where("rubro")
        .equals(rubro)
        .and((list) => list.isActive !== false)
        .toArray();

      const sortedLists = lists.sort((a, b) => a.name.localeCompare(b.name));
      setPriceLists(sortedLists);

      if (sortedLists.length > 0 && !selectedPriceListId) {
        setSelectedPriceListId(sortedLists[0].id);
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
      showNotificationRef.current("Error al cargar datos", "error");
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
      showNotificationRef.current(
        "Precio actualizado correctamente",
        "success"
      );
    } catch (error) {
      console.error("Error saving price:", error);
      showNotificationRef.current("Error al guardar el precio", "error");
    }
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredProducts.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const getTableHeaderStyle = () => ({
    bgcolor: "primary.main",
    color: "primary.contrastText",
  });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      {/* Header con búsqueda y selector de lista */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        {/* Buscador primero */}
        <Box sx={{ width: "100%", maxWidth: "400px" }}>
          <SearchBar onSearch={setSearchQuery} />
        </Box>

        {/* Selector de lista después */}
        <FormControl sx={{ minWidth: 250 }} size="small">
          <Autocomplete
            options={priceLists}
            value={
              priceLists.find((list) => list.id === selectedPriceListId) || null
            }
            onChange={(event, newValue) => {
              setSelectedPriceListId(newValue?.id || null);
            }}
            getOptionLabel={(option) => option.name}
            renderInput={(params) => (
              <TextField {...params} label="Listas de precios" size="small" />
            )}
            sx={{ minWidth: 250, backgroundColor: "background.paper" }}
          />
        </FormControl>
      </Box>

      {/* Tabla de productos */}
      <Box sx={{ flex: 1, minHeight: "auto" }}>
        <TableContainer
          component={Paper}
          sx={{ maxHeight: "55vh", mb: 2, flex: 1 }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={getTableHeaderStyle()}>Producto</TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
                  Precio Base
                </TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
                  Precio en Lista
                </TableCell>
                <TableCell sx={getTableHeaderStyle()} align="center">
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
                          InputProps={{
                            startAdornment: (
                              <Typography sx={{ mr: 1 }}>$</Typography>
                            ),
                          }}
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
                      <Assignment
                        sx={{ fontSize: 64, color: "grey.400", mb: 2 }}
                      />
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

      <Notification
        isOpen={isNotificationOpen}
        message={notificationMessage}
        type={notificationType}
        onClose={closeNotification}
      />
    </Box>
  );
};

// Página principal rediseñada
const ListasPreciosPage = () => {
  const { rubro } = useRubro();

  const [activeTab, setActiveTab] = useState<"lists" | "products">("lists");

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    closeNotification,
  } = useNotification();

  if (rubro === "Todos los rubros") {
    return (
      <ProtectedRoute>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 64px)",
            p: 3,
            textAlign: "center",
            bgcolor: "background.default",
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              bgcolor: "primary.light",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 3,
              color: "primary.main",
            }}
          >
            <AttachMoney sx={{ fontSize: 40 }} />
          </Box>
          <Typography
            variant="h5"
            fontWeight="medium"
            color="text.secondary"
            gutterBottom
          >
            Selecciona un rubro específico
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Para gestionar listas de precios, primero selecciona un rubro desde
            el menú lateral
          </Typography>
        </Box>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <AttachMoney color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h5" fontWeight="semibold">
              Listas de Precios
            </Typography>
          </Box>

          {/* Pestañas */}
          <Box sx={{ mt: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="text"
                  onClick={() => setActiveTab("lists")}
                  sx={{
                    borderBottom: activeTab === "lists" ? 2 : 0,
                    borderColor: "primary.main",
                    borderRadius: 0,
                    pb: 1.5,
                    fontWeight: activeTab === "lists" ? "bold" : "normal",
                    color:
                      activeTab === "lists" ? "primary.main" : "text.secondary",
                  }}
                  startIcon={<ViewList />}
                >
                  Gestionar Listas
                </Button>
                <Button
                  variant="text"
                  onClick={() => setActiveTab("products")}
                  sx={{
                    borderBottom: activeTab === "products" ? 2 : 0,
                    borderColor: "primary.main",
                    borderRadius: 0,
                    pb: 1.5,
                    fontWeight: activeTab === "products" ? "bold" : "normal",
                    color:
                      activeTab === "products"
                        ? "primary.main"
                        : "text.secondary",
                  }}
                  startIcon={<AttachMoney />}
                >
                  Precios de Productos
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Contenido principal */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {activeTab === "lists" ? (
            <PriceListsManager rubro={rubro} />
          ) : (
            <PriceListProducts rubro={rubro} />
          )}
        </Box>

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

export default ListasPreciosPage;
