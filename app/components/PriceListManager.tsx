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
  IconButton,
} from "@mui/material";
import { Edit, Delete, CheckCircle, Add } from "@mui/icons-material";
import { db } from "@/app/database/db";
import { PriceList, Rubro } from "@/app/lib/types/types";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Select from "@/app/components/Select";
import { useNotification } from "@/app/hooks/useNotification";
import CustomGlobalTooltip from "@/app/components/CustomTooltipGlobal";
import CustomChip from "@/app/components/CustomChip";
import { usePagination } from "@/app/context/PaginationContext";
import Pagination from "@/app/components/Pagination";

const PriceListsManager: React.FC<{ rubro: Rubro }> = ({ rubro }) => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState<PriceList | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
  });
  const { showNotification } = useNotification(); // Cambiado de useNotificationRef
  const { currentPage, itemsPerPage } = usePagination();

  const loadPriceLists = useCallback(async () => {
    try {
      const lists = await db.priceLists.where("rubro").equals(rubro).toArray();

      const uniqueLists = Array.from(
        new Map(
          lists.map((list) => {
            const key = `${list.name.toLowerCase().trim()}_${list.rubro}`;
            return [key, list];
          })
        ).values()
      ).sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });

      setPriceLists(uniqueLists); // Solo actualizar priceLists
    } catch (error) {
      console.error("Error loading price lists:", error);
      showNotification("Error al cargar listas de precios", "error");
    }
  }, [rubro, showNotification]);

  useEffect(() => {
    loadPriceLists();
  }, [loadPriceLists]);

  const handleOpenModal = (list?: PriceList) => {
    if (list) {
      setEditingPriceList(list);
      setFormData({
        name: list.name,
        isDefault: list.isDefault,
      });
    } else {
      setEditingPriceList(null);
      setFormData({
        name: "",
        isDefault: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification("El nombre de la lista es requerido", "error");
      return;
    }

    try {
      if (editingPriceList) {
        if (formData.isDefault && !editingPriceList.isDefault) {
          await db.priceLists
            .where("rubro")
            .equals(rubro)
            .and((list) => list.isDefault)
            .modify({ isDefault: false });
        }

        await db.priceLists.update(editingPriceList.id, {
          name: formData.name.trim(),
          isDefault: formData.isDefault,
          updatedAt: new Date().toISOString(),
        });
        showNotification("Lista de precios actualizada", "success");
      } else {
        if (formData.isDefault) {
          await db.priceLists
            .where("rubro")
            .equals(rubro)
            .and((list) => list.isDefault)
            .modify({ isDefault: false });
        }

        const newPriceList: PriceList = {
          id: Date.now(),
          name: formData.name.trim(),
          rubro,
          isDefault: formData.isDefault,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.priceLists.add(newPriceList);
        showNotification("Lista de precios creada", "success");
      }

      await loadPriceLists();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving price list:", error);
      showNotification("Error al guardar la lista", "error");
    }
  };

  const handleDelete = async (list: PriceList) => {
    if (list.isDefault) {
      showNotification("No se puede eliminar la lista por defecto", "error");
      return;
    }

    try {
      // Verificar si hay productos usando esta lista
      const productPrices = await db.productPrices
        .where("priceListId")
        .equals(list.id)
        .count();

      if (productPrices > 0) {
        showNotification(
          "No se puede eliminar porque hay productos usando esta lista",
          "error"
        );
        return;
      }

      // Verificar si hay ventas usando esta lista
      const salesWithList = await db.sales
        .where("priceListId")
        .equals(list.id)
        .count();

      if (salesWithList > 0) {
        showNotification(
          "No se puede eliminar porque hay ventas usando esta lista",
          "error"
        );
        return;
      }

      await db.priceLists.delete(list.id);
      showNotification("Lista eliminada", "success");
      await loadPriceLists();
    } catch (error) {
      console.error("Error deleting price list:", error);
      showNotification("Error al eliminar la lista", "error");
    }
  };

  // Paginación - usar filteredLists en lugar de priceLists
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLists = priceLists.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        justifyContent: "space-between",
      }}
    >
      {/* Header con botón */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          onClick={() => handleOpenModal()}
          startIcon={<Add fontSize="small" />}
          sx={{
            bgcolor: "primary.main",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          Nueva Lista
        </Button>
      </Box>

      {/* Contenido principal */}
      <Box sx={{ flex: 1, minHeight: "auto" }}>
        <TableContainer
          component={Paper}
          sx={{ maxHeight: "60vh", mb: 2, flex: 1 }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                  }}
                >
                  Nombre
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                  }}
                  align="center"
                >
                  Estado
                </TableCell>
                <TableCell
                  sx={{
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    fontWeight: "bold",
                  }}
                  align="center"
                >
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
                      {list.isDefault && (
                        <Typography variant="caption" color="text.secondary">
                          (Por defecto)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      {list.isDefault ? (
                        <CustomChip
                          label="Por defecto"
                          color="success"
                          size="small"
                          icon={<CheckCircle />}
                        />
                      ) : (
                        <CustomChip
                          label="Activa"
                          color="primary"
                          size="small"
                        />
                      )}
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
                        {!list.isDefault && (
                          <CustomGlobalTooltip title="Eliminar lista">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(list)}
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
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        color: "text.secondary",
                        py: 4,
                      }}
                    >
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        No hay listas de precios creadas para este rubro
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => handleOpenModal()}
                        startIcon={<Add fontSize="small" />}
                        sx={{
                          bgcolor: "primary.main",
                          "&:hover": { bgcolor: "primary.dark" },
                        }}
                      >
                        Crear Primera Lista
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Paginación */}
      {priceLists.length > 0 && (
        <Pagination
          text="Listas por página"
          text2="Total de listas"
          totalItems={priceLists.length}
        />
      )}

      {/* Modal para crear/editar lista */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPriceList ? "Editar Lista" : "Nueva Lista"}
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
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Input
            label="Nombre de la lista"
            value={formData.name}
            onChange={(value) =>
              setFormData({ ...formData, name: value.toString() })
            }
            placeholder="Ej: Mayorista, Minorista, Oferta"
            required
          />

          <Select
            label="Tipo de lista"
            value={formData.isDefault ? "default" : "normal"}
            options={[
              { value: "normal", label: "Lista normal" },
              { value: "default", label: "Lista por defecto" },
            ]}
            onChange={(value) =>
              setFormData({ ...formData, isDefault: value === "default" })
            }
          />

          {formData.isDefault && (
            <Typography variant="caption" color="info.main" sx={{ mt: 1 }}>
              ⚠️ Esta será la lista de precios que se usará por defecto en las
              ventas. Si ya existe una lista por defecto, será reemplazada.
            </Typography>
          )}

          {editingPriceList?.isDefault && !formData.isDefault && (
            <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
              ⚠️ Estás quitando el estado <strong>Por defecto</strong> a esta
              lista. Las ventas nuevas usarán otra lista por defecto o{" "}
              <strong>Precio General</strong>.
            </Typography>
          )}
        </Box>
      </Modal>
    </Box>
  );
};

export default PriceListsManager;
