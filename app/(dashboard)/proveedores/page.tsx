"use client";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import { Product, Supplier, SupplierContact } from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import Pagination from "@/app/components/Pagination";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import { useNotification } from "@/app/hooks/useNotification";
import {
  IconButton,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  LocalShipping,
  Inventory,
} from "@mui/icons-material";
import Button from "@/app/components/Button";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

const ProveedoresPage = () => {
  const { rubro } = useRubro();
  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );

  const { currentPage, itemsPerPage } = usePagination();
  const [companyName, setCompanyName] = useState("");
  const [contacts, setContacts] = useState<SupplierContact[]>([
    { name: "", phone: "" },
  ]);
  const [lastVisit, setLastVisit] = useState<string | undefined>(undefined);
  const [nextVisit, setNextVisit] = useState<string | undefined>(undefined);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isProductAssignmentModalOpen, setIsProductAssignmentModalOpen] =
    useState(false);
  const [selectedSupplierForProducts, setSelectedSupplierForProducts] =
    useState<Supplier | null>(null);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [assignedProducts, setAssignedProducts] = useState<Product[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [supplierProductCounts, setSupplierProductCounts] = useState<{
    [supplierId: number]: number;
  }>({});

  const filteredAvailableProducts = availableProducts.filter(
    (product) =>
      product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(productSearchQuery))
  );
  const openProductAssignmentModal = async (supplier: Supplier) => {
    setSelectedSupplierForProducts(supplier);
    setProductSearchQuery("");
    setIsLoadingProducts(true);

    try {
      const [allProducts, assignedProductKeys] = await Promise.all([
        db.products.toArray(),
        db.supplierProducts
          .where("supplierId")
          .equals(supplier.id)
          .primaryKeys(),
      ]);
      const filteredProducts = allProducts.filter(
        (product) => rubro === "Todos los rubros" || product.rubro === rubro
      );

      const assignedProductIds = assignedProductKeys.map(
        ([, productId]) => productId
      );
      const assignedProds = filteredProducts.filter((p) =>
        assignedProductIds.includes(p.id)
      );
      const availableProds = filteredProducts.filter(
        (p) => !assignedProductIds.includes(p.id)
      );

      setAssignedProducts(assignedProds);
      setAvailableProducts(availableProds);
      setIsProductAssignmentModalOpen(true);
    } catch (error) {
      console.error("Error al cargar productos:", error);
      showNotification("Error al cargar productos", "error");
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const assignProduct = async (product: Product) => {
    if (!selectedSupplierForProducts) return;

    try {
      await db.supplierProducts.add({
        supplierId: selectedSupplierForProducts.id,
        productId: product.id,
      });

      await fetchSupplierProductCounts();
      setAssignedProducts((prev) => [...prev, product]);
      setAvailableProducts((prev) => prev.filter((p) => p.id !== product.id));
      setProductSearchQuery("");

      showNotification(`"${product.name}" asignado correctamente`, "success");
    } catch (error) {
      console.error("Error al asignar producto:", error);
      showNotification(`Error al asignar "${product.name}"`, "error");
    }
  };

  const unassignProduct = async (product: Product) => {
    if (!selectedSupplierForProducts) return;

    try {
      await db.supplierProducts
        .where("[supplierId+productId]")
        .equals([selectedSupplierForProducts.id, product.id])
        .delete();
      fetchSupplierProductCounts();
      setAssignedProducts((prev) => prev.filter((p) => p.id !== product.id));
      setAvailableProducts((prev) => [...prev, product]);

      showNotification(
        `"${product.name}" desasignado correctamente`,
        "success"
      );
    } catch (error) {
      console.error("Error al desasignar producto:", error);
      showNotification(`Error al desasignar "${product.name}"`, "error");
    }
  };
  const fetchSupplierProductCounts = useCallback(
    async (currentSuppliers?: Supplier[]) => {
      const suppliersToUse = currentSuppliers || suppliers;

      if (suppliersToUse.length === 0) return;

      const allProducts = await db.products.toArray();
      const counts: { [supplierId: number]: number } = {};

      for (const supplier of suppliersToUse) {
        const productKeys = await db.supplierProducts
          .where("supplierId")
          .equals(supplier.id)
          .primaryKeys();

        const productIds = productKeys.map(([, productId]) => productId);
        const filteredProducts = allProducts.filter(
          (p) =>
            productIds.includes(p.id) &&
            (rubro === "Todos los rubros" ||
              p.rubro === rubro ||
              (supplier.rubro &&
                supplier.rubro.toLowerCase() === rubro.toLowerCase()))
        );

        counts[supplier.id] = filteredProducts.length;
      }

      setSupplierProductCounts(counts);
    },
    [rubro, suppliers]
  );

  const fetchSuppliers = useCallback(async () => {
    try {
      const allSuppliers = await db.suppliers.toArray();
      const sortedSuppliers = [...allSuppliers].sort((a, b) =>
        a.companyName.localeCompare(b.companyName)
      );

      if (rubro === "Todos los rubros") {
        return sortedSuppliers;
      }

      const filtered = sortedSuppliers.filter((supplier) => {
        if (!supplier.rubro) return false;
        return supplier.rubro.toLowerCase() === rubro.toLowerCase();
      });

      return filtered;
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return [];
    }
  }, [rubro]);

  useEffect(() => {
    const fetchData = async () => {
      const filteredSuppliers = await fetchSuppliers();
      setSuppliers(filteredSuppliers);
      setFilteredSuppliers(filteredSuppliers);
      fetchSupplierProductCounts(filteredSuppliers);
    };
    fetchData();
  }, [rubro, fetchSuppliers, fetchSupplierProductCounts]);

  useEffect(() => {
    const filtered = suppliers.filter(
      (supplier) =>
        supplier.companyName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        supplier.contacts.some((contact) =>
          contact.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );
    setFilteredSuppliers(filtered);
  }, [searchQuery, suppliers]);

  useEffect(() => {
    const updateCounts = async () => {
      await fetchSupplierProductCounts();
    };
    updateCounts();
  }, [suppliers, rubro, fetchSupplierProductCounts]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const resetForm = () => {
    setCompanyName("");
    setContacts([{ name: "", phone: "" }]);
    setLastVisit(undefined);
    setNextVisit(undefined);
    setEditingSupplier(null);
  };

  const handleAddContact = () => {
    setContacts([...contacts, { name: "", phone: "" }]);
  };

  const handleRemoveContact = (index: number) => {
    if (contacts.length <= 1) return;
    const newContacts = [...contacts];
    newContacts.splice(index, 1);
    setContacts(newContacts);
  };

  const handleContactChange = (
    index: number,
    field: keyof SupplierContact,
    value: string
  ) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const handleSubmit = async () => {
    if (!companyName.trim()) {
      showNotification("El nombre de la empresa es requerido", "error");
      return;
    }
    if (contacts.some((contact) => !contact.name.trim())) {
      showNotification("Todos los proveedores deben tener un nombre", "error");
      return;
    }

    try {
      const supplierData: Omit<Supplier, "id"> = {
        companyName: companyName.trim(),
        contacts: contacts.map((contact) => ({
          name: contact.name.trim(),
          phone: contact.phone?.trim(),
        })),
        lastVisit: lastVisit || undefined,
        nextVisit: nextVisit || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
      };

      if (editingSupplier) {
        const updatedSupplier = {
          ...editingSupplier,
          ...supplierData,
          rubro: rubro === "Todos los rubros" ? "comercio" : rubro,
        };
        await db.suppliers.update(editingSupplier.id, updatedSupplier);
        setSuppliers(
          suppliers.map((s) =>
            s.id === editingSupplier.id ? updatedSupplier : s
          )
        );
        showNotification("Proveedor actualizado correctamente", "success");
      } else {
        const id = await db.suppliers.add({
          ...supplierData,
          id: Date.now(),
        });
        const newSupplier = { ...supplierData, id };
        setSuppliers((prev) => [...prev, newSupplier]);
        setFilteredSuppliers((prev) => [...prev, newSupplier]);
        showNotification("Proveedor agregado correctamente", "success");
      }

      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar proveedor:", error);
      showNotification("Error al guardar proveedor", "error");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setCompanyName(supplier.companyName);
    setContacts(
      supplier.contacts.length > 0
        ? supplier.contacts
        : [{ name: "", phone: "" }]
    );
    setLastVisit(supplier.lastVisit || undefined);
    setNextVisit(supplier.nextVisit || undefined);
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      await db.suppliers.delete(supplierToDelete.id);
      setSuppliers(suppliers.filter((s) => s.id !== supplierToDelete.id));
      showNotification("Proveedor eliminado correctamente", "success");
      setIsDeleteModalOpen(false);
      setSupplierToDelete(null);
    } catch (error) {
      console.error("Error al eliminar proveedor:", error);
      showNotification("Error al eliminar proveedor", "error");
    }
  };

  const openDeleteModal = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsDeleteModalOpen(true);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredSuppliers.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          height: "calc(100vh - 64px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h5" fontWeight="semibold" mb={2}>
          Proveedores
        </Typography>

        {/* Header con búsqueda y acciones */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            width: "100%",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box sx={{ width: "100%", maxWidth: "400px" }}>
              <SearchBar onSearch={handleSearch} />
            </Box>
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              mt: 1,
              gap: 2,
              visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
            }}
          >
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              sx={{
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            >
              Nuevo Proveedor
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1, minHeight: "auto" }}>
            <TableContainer
              component={Paper}
              sx={{ maxHeight: "63vh", flex: 1 }}
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
                      Empresa
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Proveedores
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Última Visita
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Próxima Visita
                    </TableCell>
                    <TableCell
                      sx={{
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                      }}
                      align="center"
                    >
                      Productos
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell
                        sx={{
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                        align="center"
                      >
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentItems.length > 0 ? (
                    currentItems.map((supplier) => (
                      <TableRow
                        key={supplier.id}
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
                        <TableCell className="capitalize font-semibold">
                          {supplier.companyName}
                        </TableCell>
                        <TableCell align="center">
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 2,
                            }}
                          >
                            {supplier.contacts.length > 0 && (
                              <Typography>
                                {supplier.contacts[0].name}
                              </Typography>
                            )}
                            {supplier.contacts.length > 1 && (
                              <Box
                                sx={{
                                  position: "relative",
                                  display: "inline-block",
                                }}
                              >
                                <Typography
                                  sx={{
                                    color: "text.secondary",
                                    cursor: "pointer",
                                    "&:hover": { color: "text.primary" },
                                  }}
                                >
                                  +{supplier.contacts.length - 1} más
                                </Typography>
                                <Box
                                  sx={{
                                    position: "absolute",
                                    display: "none",
                                    zIndex: 10,
                                    width: "256px",
                                    p: 1,
                                    bgcolor: "background.paper",
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    boxShadow: 2,
                                    left: "100%",
                                    top: 0,
                                    ml: 1,
                                  }}
                                  className="group-hover:block"
                                >
                                  {supplier.contacts
                                    .slice(1)
                                    .map((contact, index) => (
                                      <Box key={index} sx={{ py: 0.5 }}>
                                        <Typography variant="body2">
                                          {contact.name}
                                        </Typography>
                                      </Box>
                                    ))}
                                </Box>
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          {supplier.lastVisit ? (
                            format(parseISO(supplier.lastVisit), "dd/MM/yyyy", {
                              locale: es,
                            })
                          ) : (
                            <Typography color="text.secondary">
                              No registrada
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {supplier.nextVisit ? (
                            format(parseISO(supplier.nextVisit), "dd/MM/yyyy", {
                              locale: es,
                            })
                          ) : (
                            <Typography color="text.secondary">
                              No programada
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {supplierProductCounts[supplier.id] || 0} productos
                        </TableCell>
                        {rubro !== "Todos los rubros" && (
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                gap: 2,
                              }}
                            >
                              <CustomGlobalTooltip title="Asignar productos">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    openProductAssignmentModal(supplier)
                                  }
                                  sx={{
                                    borderRadius: "4px",
                                    color: "text.secondary",
                                    "&:hover": {
                                      backgroundColor: "primary.main",
                                      color: "white",
                                    },
                                  }}
                                >
                                  <Inventory fontSize="small" />
                                </IconButton>
                              </CustomGlobalTooltip>

                              <CustomGlobalTooltip title="Editar proveedor">
                                <IconButton
                                  size="small"
                                  onClick={() => handleEdit(supplier)}
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

                              <CustomGlobalTooltip title="Eliminar proveedor">
                                <IconButton
                                  size="small"
                                  onClick={() => openDeleteModal(supplier)}
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
                        )}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={rubro !== "Todos los rubros" ? 6 : 5}
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
                          <LocalShipping
                            sx={{ fontSize: 64, mb: 2, color: "#9CA3AF" }}
                          />
                          <Typography>
                            {searchQuery
                              ? "No hay proveedores que coincidan con la búsqueda"
                              : "No hay proveedores registrados"}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {filteredSuppliers.length > 0 && (
            <Pagination
              text="Proveedores por página"
              text2="Total de proveedores"
              totalItems={filteredSuppliers.length}
            />
          )}
        </Box>

        <Modal
          isOpen={isProductAssignmentModalOpen}
          onClose={() => {
            setIsProductAssignmentModalOpen(false);
            setProductSearchQuery("");
          }}
          title={`Productos de ${
            selectedSupplierForProducts?.companyName || ""
          }`}
          bgColor="bg-white dark:bg-gray_b"
          minheight="min-h-[75vh]"
          buttons={
            <Button
              variant="text"
              onClick={() => {
                setIsProductAssignmentModalOpen(false);
                setProductSearchQuery("");
              }}
              sx={{
                color: "text.secondary",
                borderColor: "text.secondary",
                "&:hover": {
                  backgroundColor: "action.hover",
                  borderColor: "text.primary",
                },
              }}
            >
              Cerrar
            </Button>
          }
        >
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {/* Columna izquierda: Buscar productos */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight="medium">
                Buscar Productos
              </Typography>
              <Input
                placeholder="Buscar por nombre o código de barras"
                value={productSearchQuery}
                onRawChange={(e) => setProductSearchQuery(e.target.value)}
                fullWidth
              />

              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  height: "59.4vh",
                  overflow: "auto",
                }}
              >
                {isLoadingProducts ? (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "160px",
                    }}
                  >
                    <Box
                      sx={{
                        animation: "spin 1s linear infinite",
                        width: "48px",
                        height: "48px",
                        border: "2px solid",
                        borderColor: "primary.main transparent",
                        borderRadius: "50%",
                      }}
                    />
                  </Box>
                ) : filteredAvailableProducts.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {filteredAvailableProducts.map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          p: 1,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "action.hover" },
                          transition: "all 0.3s",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ flexGrow: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {product.barcode || "Sin código"}
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <Typography variant="body2">
                              Stock: {product.stock} {product.unit}
                            </Typography>
                            <Typography variant="body2" fontWeight="semibold">
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ ml: 1 }}>
                          <CustomGlobalTooltip title="Asignar producto">
                            <IconButton
                              size="small"
                              onClick={() => assignProduct(product)}
                              sx={{
                                bgcolor: "primary.main",
                                color: "white",
                                "&:hover": { bgcolor: "primary.dark" },
                                minWidth: "32px",
                                width: "32px",
                                height: "32px",
                              }}
                            >
                              <Add fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography color="text.secondary">
                      No hay productos disponibles
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Columna derecha: Productos asignados */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="h6" fontWeight="medium">
                Productos asignados ({assignedProducts.length})
              </Typography>
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  p: 2,
                  height: "65vh",
                  overflow: "auto",
                }}
              >
                {assignedProducts.length > 0 ? (
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {assignedProducts.map((product) => (
                      <Box
                        key={product.id}
                        sx={{
                          p: 1,
                          border: 1,
                          borderColor: "divider",
                          borderRadius: 1,
                          "&:hover": { backgroundColor: "action.hover" },
                          transition: "all 0.3s",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box>
                            <Typography fontWeight="medium">
                              {product.name}
                            </Typography>
                            <Typography variant="body2">
                              {product.stock} {product.unit} •{" "}
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </Typography>
                          </Box>

                          <CustomGlobalTooltip title="Desasignar producto">
                            <IconButton
                              size="small"
                              onClick={() => unassignProduct(product)}
                              sx={{
                                bgcolor: "error.main",
                                color: "white",
                                "&:hover": { bgcolor: "error.dark" },
                                minWidth: "32px",
                                width: "32px",
                                height: "32px",
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </CustomGlobalTooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                    }}
                  >
                    <Typography color="text.secondary">
                      No hay productos asignados
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
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
                onClick={handleSubmit}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingSupplier ? "Actualizar" : "Guardar"}
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Input
              label="Nombre de la Empresa"
              value={companyName}
              onRawChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Distribuidora S.A."
              required
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {contacts.map((contact, index) => (
                <Box
                  key={index}
                  sx={{
                    backgroundColor: "background.paper",
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: "primary.light",
                    boxShadow: 1,
                    p: 2,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <CustomChip
                      label={`Contacto #${index + 1}`}
                      color="primary"
                      variant="filled"
                      sx={{ color: "white" }}
                    />
                    {contacts.length > 1 && (
                      <CustomGlobalTooltip title="Eliminar contacto">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveContact(index)}
                          sx={{
                            color: "error.main",
                            "&:hover": {
                              backgroundColor: "error.main",
                              color: "white",
                            },
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </CustomGlobalTooltip>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Input
                      label="Nombre"
                      value={contact.name}
                      onRawChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                      placeholder="Nombre del contacto"
                      required
                    />
                    <Input
                      label="Teléfono"
                      value={contact.phone || ""}
                      onRawChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                      placeholder="Teléfono del contacto"
                    />
                  </Box>
                </Box>
              ))}
              <Button
                variant="text"
                startIcon={<Add />}
                onClick={handleAddContact}
                sx={{
                  color: "primary.main",
                  borderColor: "primary.main",
                  "&:hover": {
                    color: "primary.dark",
                    backgroundColor: "action.hover",
                    borderColor: "primary.dark",
                  },
                  alignSelf: "flex-start",
                }}
              >
                Agregar contacto
              </Button>
            </Box>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <CustomDatePicker
                label="Última Visita"
                placeholder="Seleccione una fecha"
                value={lastVisit || ""}
                onChange={setLastVisit}
                isClearable
              />
              <CustomDatePicker
                label="Próxima Visita"
                placeholder="Seleccione una fecha"
                value={nextVisit || ""}
                onChange={setNextVisit}
                isClearable
              />
            </Box>
          </Box>
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Proveedor"
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
                onClick={handleDelete}
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
              ¿Está seguro/a que desea eliminar el proveedor?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              <strong>{supplierToDelete?.companyName}</strong> será eliminado
              permanentemente.
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

export default ProveedoresPage;
