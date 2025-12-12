"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Card,
  Typography,
  Box,
  IconButton,
  useTheme,
  CardContent,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  LocalOffer,
  Percent,
  AttachMoney,
} from "@mui/icons-material";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";
import {
  Promotion,
  PromotionType,
  PromotionStatus,
} from "@/app/lib/types/types";
import Button from "@/app/components/Button";
import Notification from "@/app/components/Notification";
import Modal from "@/app/components/Modal";
import Select from "@/app/components/Select";
import Input from "@/app/components/Input";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { useNotification } from "@/app/hooks/useNotification";
import CustomChip from "@/app/components/CustomChip";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";

const PromocionesPage = () => {
  const { rubro } = useRubro();
  const theme = useTheme();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(
    null
  );

  const {
    isNotificationOpen,
    notificationMessage,
    notificationType,
    showNotification,
    closeNotification,
  } = useNotification();
  const { currentPage, itemsPerPage } = usePagination();

  const [newPromotion, setNewPromotion] = useState<
    Omit<Promotion, "id"> & { id?: number }
  >({
    name: "",
    description: "",
    type: "PERCENTAGE_DISCOUNT",
    status: "active",
    discount: 0,
    rubro: rubro,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    minPurchaseAmount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const getTableHeaderStyle = () => ({
    bgcolor: theme.palette.mode === "dark" ? "primary.dark" : "primary.main",
    color: "primary.contrastText",
  });

  const getCardStyle = (
    color: "success" | "error" | "primary" | "warning"
  ) => ({
    bgcolor: theme.palette.mode === "dark" ? `${color}.dark` : `${color}.main`,
    color: "white",
    "& .MuiTypography-root": {
      color: "white !important",
    },
  });

  const promotionTypeOptions = [
    {
      value: "PERCENTAGE_DISCOUNT",
      label: "Descuento Porcentual",
    },
    {
      value: "FIXED_DISCOUNT",
      label: "Descuento Fijo",
    },
  ];

  const statusOptions = [
    { value: "active", label: "Activa" },
    { value: "inactive", label: "Inactiva" },
  ];

  const validatePromotion = (promotion: typeof newPromotion): boolean => {
    const errors: Record<string, string> = {};

    if (!promotion.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    if (!promotion.discount || promotion.discount <= 0) {
      errors.discount = "El descuento debe ser mayor a 0";
    }

    if (promotion.type === "PERCENTAGE_DISCOUNT" && promotion.discount > 100) {
      errors.discount = "El descuento no puede ser mayor al 100%";
    }

    if (promotion.endDate && promotion.startDate > promotion.endDate) {
      errors.endDate = "La fecha de fin no puede ser anterior a la de inicio";
    }

    if (promotion.minPurchaseAmount && promotion.minPurchaseAmount < 0) {
      errors.minPurchaseAmount = "El monto mínimo no puede ser negativo";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const fetchPromotions = async () => {
    try {
      const storedPromotions = await db.promotions.toArray();
      const filtered =
        rubro === "Todos los rubros"
          ? storedPromotions
          : storedPromotions.filter((p) => p.rubro === rubro);

      const promotionsWithId = filtered.filter(
        (p): p is Promotion & { id: number } => !!p.id
      );

      setPromotions(
        promotionsWithId.sort((a, b) => {
          if (a.status === b.status) {
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
          }
          return a.status === "active" ? -1 : 1;
        })
      );
    } catch (error) {
      console.error("Error fetching promotions:", error);
      showNotification("Error al cargar promociones", "error");
    }
  };

  const handleAddPromotion = () => {
    setEditingPromotion(null);
    setValidationErrors({});
    setNewPromotion({
      name: "",
      description: "",
      type: "PERCENTAGE_DISCOUNT",
      status: "active",
      discount: 0,
      rubro: rubro,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      minPurchaseAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setIsOpenModal(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    if (!promotion.id) {
      showNotification("No se puede editar una promoción sin ID", "error");
      return;
    }

    setEditingPromotion(promotion);
    setValidationErrors({});
    setNewPromotion({
      ...promotion,
      updatedAt: new Date().toISOString(),
    });
    setIsOpenModal(true);
  };

  const handleConfirmAddPromotion = async () => {
    if (!validatePromotion(newPromotion)) {
      showNotification(
        "Por favor, corrige los errores en el formulario",
        "error"
      );
      return;
    }

    try {
      if (editingPromotion && editingPromotion.id) {
        await db.promotions.update(editingPromotion.id, newPromotion);
        showNotification("Promoción actualizada correctamente", "success");
      } else {
        await db.promotions.add(newPromotion as Promotion);
        showNotification("Promoción creada correctamente", "success");
      }

      await fetchPromotions();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving promotion:", error);
      showNotification("Error al guardar promoción", "error");
    }
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    if (!promotion.id) {
      showNotification("No se puede eliminar una promoción sin ID", "error");
      return;
    }

    setPromotionToDelete(promotion);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (promotionToDelete && promotionToDelete.id) {
      try {
        await db.promotions.delete(promotionToDelete.id);
        await fetchPromotions();
        showNotification("Promoción eliminada correctamente", "success");
      } catch (error) {
        console.error("Error deleting promotion:", error);
        showNotification("Error al eliminar promoción", "error");
      }
      setPromotionToDelete(null);
    }
    setIsConfirmModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsOpenModal(false);
    setEditingPromotion(null);
    setValidationErrors({});
  };

  const getPromotionStatus = (
    promotion: Promotion
  ): { label: string; color: "success" | "error" | "warning" | "default" } => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

    if (promotion.status === "inactive") {
      return { label: "Inactiva", color: "default" };
    }

    if (now < startDate) {
      return { label: "Programada", color: "warning" };
    }

    if (endDate && now > endDate) {
      return { label: "Expirada", color: "error" };
    }

    return { label: "Activa", color: "success" };
  };

  useEffect(() => {
    fetchPromotions();
  }, [rubro]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPromotions = promotions.slice(indexOfFirstItem, indexOfLastItem);

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
          Promociones
        </Typography>

        {/* Estadísticas rápidas - Estilo consistente con Ventas */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 2,
            mb: 2,
          }}
        >
          <Card sx={getCardStyle("primary")}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2">Total Promociones</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {promotions.length}
                  </Typography>
                </Box>
                <LocalOffer fontSize="large" />
              </Box>
            </CardContent>
          </Card>

          <Card sx={getCardStyle("success")}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2">Activas</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {
                      promotions.filter(
                        (p) => getPromotionStatus(p).label === "Activa"
                      ).length
                    }
                  </Typography>
                </Box>
                <LocalOffer fontSize="large" />
              </Box>
            </CardContent>
          </Card>

          <Card sx={getCardStyle("error")}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2">Expiradas</Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {
                      promotions.filter(
                        (p) => getPromotionStatus(p).label === "Expirada"
                      ).length
                    }
                  </Typography>
                </Box>
                <LocalOffer fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mb: 2,
            visibility: rubro === "Todos los rubros" ? "hidden" : "visible",
          }}
        >
          <Button
            variant="contained"
            onClick={handleAddPromotion}
            sx={{
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
            startIcon={<Add fontSize="small" />}
          >
            Nueva Promoción
          </Button>
        </Box>

        {/* Tabla de promociones */}

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
              sx={{ maxHeight: "63vh", mb: 2, flex: 1 }}
            >
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={getTableHeaderStyle()}>Nombre</TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Tipo
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Descuento
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Estado
                    </TableCell>
                    <TableCell sx={getTableHeaderStyle()} align="center">
                      Vigencia
                    </TableCell>
                    {rubro !== "Todos los rubros" && (
                      <TableCell sx={getTableHeaderStyle()} align="center">
                        Acciones
                      </TableCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {currentPromotions.length > 0 ? (
                    currentPromotions.map((promotion) => {
                      const statusInfo = getPromotionStatus(promotion);
                      return (
                        <TableRow
                          key={promotion.id || `promo-${promotion.createdAt}`}
                          sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            "&:hover": { backgroundColor: "action.hover" },
                            transition: "all 0.3s",
                          }}
                        >
                          <TableCell>
                            <Box>
                              <Typography
                                fontWeight="bold"
                                sx={{ textTransform: "uppercase" }}
                              >
                                {promotion.name}
                              </Typography>
                              {promotion.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ mt: 0.5, display: "block" }}
                                >
                                  {promotion.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 2,
                              }}
                            >
                              {promotion.type === "PERCENTAGE_DISCOUNT" ? (
                                <Percent fontSize="small" />
                              ) : (
                                <AttachMoney fontSize="small" />
                              )}
                              <Typography variant="body2">
                                {
                                  promotionTypeOptions.find(
                                    (t) => t.value === promotion.type
                                  )?.label
                                }
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Typography fontWeight="bold">
                              {promotion.type === "FIXED_DISCOUNT" && "$"}
                              {promotion.discount}
                              {promotion.type === "PERCENTAGE_DISCOUNT" && "%"}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <CustomChip
                              label={statusInfo.label}
                              color={statusInfo.color}
                              size="small"
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{ display: "flex", flexDirection: "column" }}
                            >
                              <Typography variant="caption">
                                Inicio:{" "}
                                {new Date(
                                  promotion.startDate
                                ).toLocaleDateString()}
                              </Typography>
                              {promotion.endDate && (
                                <Typography variant="caption">
                                  Fin:{" "}
                                  {new Date(
                                    promotion.endDate
                                  ).toLocaleDateString()}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          {rubro !== "Todos los rubros" && (
                            <TableCell align="center">
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  gap: 0.5,
                                }}
                              >
                                <CustomGlobalTooltip title="Editar promoción">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleEditPromotion(promotion)
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
                                    <Edit fontSize="small" />
                                  </IconButton>
                                </CustomGlobalTooltip>
                                <CustomGlobalTooltip title="Eliminar promoción">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleDeletePromotion(promotion)
                                    }
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
                      );
                    })
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
                          <LocalOffer
                            sx={{
                              marginBottom: 2,
                              color: "#9CA3AF",
                              fontSize: 64,
                            }}
                          />
                          <Typography>Todavía no hay promociones.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {promotions.length > 0 && (
            <Pagination
              text="Promociones por página"
              text2="Total de promociones"
              totalItems={promotions.length}
            />
          )}
        </Box>

        {/* Modal de Promoción - Estilo consistente */}
        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title={editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={handleCloseModal}
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
                onClick={handleConfirmAddPromotion}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "primary.main",
                  "&:hover": { bgcolor: "primary.dark" },
                }}
              >
                {editingPromotion ? "Actualizar" : "Guardar"}
              </Button>
            </Box>
          }
        >
          <Box sx={{ p: 0.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Input
                    label="Nombre de la promoción*"
                    type="text"
                    value={newPromotion.name}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Descuento de Verano 20%"
                  />
                  {validationErrors.name && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.name}
                    </Typography>
                  )}
                </Box>

                <Input
                  label="Descripción"
                  type="text"
                  value={newPromotion.description}
                  onRawChange={(e) =>
                    setNewPromotion((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Breve descripción de la promoción"
                />
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Select
                    label="Tipo de Promoción*"
                    options={promotionTypeOptions}
                    value={newPromotion.type}
                    onChange={(value) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        type: value as PromotionType,
                        discount: 0,
                      }))
                    }
                    size="small"
                  />
                </Box>
                <Box>
                  <Input
                    label="Descuento a aplicar"
                    type="number"
                    value={newPromotion.discount?.toString() || "0"}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        discount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder={
                      newPromotion.type === "PERCENTAGE_DISCOUNT"
                        ? "Porcentaje %"
                        : "Monto fijo $"
                    }
                    step={
                      newPromotion.type === "PERCENTAGE_DISCOUNT" ? "1" : "0.01"
                    }
                  />
                  {validationErrors.discount && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.discount}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <CustomDatePicker
                  label="Fecha de Inicio"
                  required
                  value={newPromotion.startDate}
                  onChange={(value) =>
                    setNewPromotion((prev) => ({
                      ...prev,
                      startDate: value,
                    }))
                  }
                  placeholder="Seleccionar fecha de inicio"
                  isClearable={true}
                />

                <CustomDatePicker
                  label="Fecha de Fin (Opcional)"
                  value={newPromotion.endDate || ""}
                  onChange={(value) =>
                    setNewPromotion((prev) => ({
                      ...prev,
                      endDate: value,
                    }))
                  }
                  placeholder="Seleccionar fecha de fin"
                  isClearable={true}
                  minDate={new Date(newPromotion.startDate)}
                />
              </Box>

              <Box
                sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
              >
                <Box>
                  <Select
                    label="Estado*"
                    options={statusOptions}
                    value={newPromotion.status}
                    onChange={(value) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        status: value as PromotionStatus,
                      }))
                    }
                    size="small"
                  />
                </Box>
                <Box>
                  <Input
                    label="Monto Mínimo de Compra (Opcional)"
                    type="number"
                    value={newPromotion.minPurchaseAmount?.toString() || "0"}
                    onRawChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        minPurchaseAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0 = sin mínimo"
                    step="0.01"
                  />
                  {validationErrors.minPurchaseAmount && (
                    <Typography
                      color="error"
                      variant="caption"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      {validationErrors.minPurchaseAmount}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        </Modal>

        {/* Modal de Confirmación de Eliminación - Estilo consistente */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Promoción"
          bgColor="bg-white dark:bg-gray_b"
          buttons={
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2 }}>
              <Button
                variant="text"
                onClick={() => setIsConfirmModalOpen(false)}
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
                onClick={handleConfirmDelete}
                isPrimaryAction={true}
                sx={{
                  bgcolor: "error.main",
                  "&:hover": { bgcolor: "error.dark" },
                }}
              >
                Sí, eliminar
              </Button>
            </Box>
          }
        >
          <Box sx={{ textAlign: "center", py: 2 }}>
            <Delete
              sx={{ fontSize: 48, color: "error.main", mb: 2, mx: "auto" }}
            />
            <Typography variant="h6" fontWeight="semibold" sx={{ mb: 1 }}>
              ¿Está seguro/a que desea eliminar la promoción?
            </Typography>
            <Typography variant="body2" fontWeight="semibold" sx={{ mb: 1 }}>
              La promoción <strong>{promotionToDelete?.name}</strong> será
              eliminada permanentemente.
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

export default PromocionesPage;
