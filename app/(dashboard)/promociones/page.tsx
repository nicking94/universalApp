"use client";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Modal from "@/app/components/Modal";
import Notification from "@/app/components/Notification";
import {
  Promotion,
  PromotionType,
  PromotionStatus,
} from "@/app/lib/types/types";
import { Plus, Edit, Trash, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Pagination from "@/app/components/Pagination";
import Select from "react-select";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";

const PromocionesPage = () => {
  const { rubro } = useRubro();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [type, setType] = useState<"success" | "error" | "info">("success");
  const { currentPage, itemsPerPage } = usePagination();

  const [newPromotion, setNewPromotion] = useState<
    Omit<Promotion, "id"> & { id?: number }
  >({
    name: "",
    description: "",
    type: "PERCENTAGE_DISCOUNT",
    status: "active",
    discount: 10,
    rubro: rubro,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const promotionTypeOptions = [
    { value: "PERCENTAGE_DISCOUNT", label: "Descuento Porcentual" },
    { value: "FIXED_DISCOUNT", label: "Descuento Fijo" },
  ];

  const statusOptions = [
    { value: "active", label: "Activa" },
    { value: "inactive", label: "Inactiva" },
  ];

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 2500);
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

      setPromotions(promotionsWithId.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Error fetching promotions:", error);
      showNotification("Error al cargar promociones", "error");
    }
  };

  const handleAddPromotion = () => {
    setEditingPromotion(null);
    setNewPromotion({
      name: "",
      description: "",
      type: "PERCENTAGE_DISCOUNT",
      status: "active",
      discount: 10,
      rubro: rubro,
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
    setNewPromotion({
      ...promotion,
      updatedAt: new Date().toISOString(),
    });
    setIsOpenModal(true);
  };

  const handleConfirmAddPromotion = async () => {
    try {
      if (!newPromotion.name) {
        showNotification("Complete el nombre de la promoción", "error");
        return;
      }

      if (!newPromotion.discount || newPromotion.discount <= 0) {
        showNotification("El descuento debe ser mayor a 0", "error");
        return;
      }

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
  };

  useEffect(() => {
    fetchPromotions();
  }, [rubro]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPromotions = promotions.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Promociones</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full"></div>
          {rubro !== "Todos los rubros" && (
            <div className="w-full flex justify-end mt-3">
              <Button
                title="Nueva Promoción"
                text="Nueva Promoción"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleAddPromotion}
                icon={<Plus size={18} />}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-xs">
                <tr>
                  <th className="p-2 text-start">Nombre</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Estado</th>
                  <th className="p-2">Descuento</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="w-40 max-w-[5rem] 2xl:max-w-[10rem] p-2">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white text-gray_b divide-y divide-gray_xl">
                {currentPromotions.length > 0 ? (
                  currentPromotions.map((promotion) => (
                    <tr
                      key={promotion.id || `promo-${promotion.createdAt}`}
                      className="text-xs 2xl:text-sm bg-white text-gray_b border border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                    >
                      <td className="font-semibold px-2 text-start border border-gray_xl">
                        {promotion.name}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {
                          promotionTypeOptions.find(
                            (t) => t.value === promotion.type
                          )?.label
                        }
                      </td>
                      <td className="p-2 border border-gray_xl">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            promotion.status === "active"
                              ? "bg-green_xl text-green_b"
                              : "bg-gray_xl text-gray_b"
                          }`}
                        >
                          {
                            statusOptions.find(
                              (s) => s.value === promotion.status
                            )?.label
                          }
                        </span>
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {promotion.type === "FIXED_DISCOUNT" && "$"}
                        {promotion.discount}
                        {promotion.type === "PERCENTAGE_DISCOUNT" && "%"}
                      </td>
                      {rubro !== "Todos los rubros" && (
                        <td className="p-2 border border-gray_xl">
                          <div className="flex justify-center items-center gap-2 h-full">
                            <Button
                              title="Editar promoción"
                              icon={<Edit size={18} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-blue_m"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => handleEditPromotion(promotion)}
                            />
                            <Button
                              title="Eliminar promoción"
                              icon={<Trash size={18} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-red_m"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => handleDeletePromotion(promotion)}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td colSpan={5} className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                        <Tag size={64} className="mb-4 text-gray_m" />
                        <p className="text-gray_m">
                          Todavía no hay promociones.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {promotions.length > 0 && (
            <Pagination
              text="Promociones por página"
              text2="Total de promociones"
              totalItems={promotions.length}
            />
          )}
        </div>

        <Modal
          isOpen={isOpenModal}
          onClose={handleCloseModal}
          title={editingPromotion ? "Editar Promoción" : "Nueva Promoción"}
          buttons={
            <div className="flex justify-end space-x-4">
              <Button
                title="Guardar"
                text={editingPromotion ? "Actualizar" : "Guardar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmAddPromotion}
              />
              <Button
                title="Cancelar"
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={handleCloseModal}
              />
            </div>
          }
        >
          <div className="overflow-y-auto max-h-[60vh]">
            <div className="flex flex-col gap-4">
              <Input
                label="Nombre de la promoción*"
                type="text"
                value={newPromotion.name}
                onChange={(e) =>
                  setNewPromotion((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej: Descuento de Verano"
              />

              <Input
                label="Descripción"
                type="text"
                value={newPromotion.description}
                onChange={(e) =>
                  setNewPromotion((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Descripción de la promoción"
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Tipo de Promoción*
                  </label>
                  <Select
                    options={promotionTypeOptions}
                    value={promotionTypeOptions.find(
                      (t) => t.value === newPromotion.type
                    )}
                    onChange={(selected) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        type: selected?.value as PromotionType,
                      }))
                    }
                    className="text-gray_m"
                  />
                </div>

                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Estado*
                  </label>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find(
                      (s) => s.value === newPromotion.status
                    )}
                    onChange={(selected) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        status: selected?.value as PromotionStatus,
                      }))
                    }
                    className="text-gray_m"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                  Descuento a Aplicar*
                </label>
                <Input
                  type="number"
                  value={newPromotion.discount?.toString() || "0"}
                  onChange={(e) =>
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
                  step="0.01"
                />
                <p className="text-xs text-gray_m mt-1">
                  {newPromotion.type === "PERCENTAGE_DISCOUNT"
                    ? "Ingrese el porcentaje de descuento"
                    : "Ingrese el monto fijo de descuento"}
                </p>
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Promoción"
          buttons={
            <>
              <Button
                text="Sí"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={handleConfirmDelete}
              />
              <Button
                text="No"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsConfirmModalOpen(false)}
              />
            </>
          }
        >
          <p>
            ¿Está seguro que desea eliminar la promoción{" "}
            {promotionToDelete?.name}?
          </p>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={type}
        />
      </div>
    </ProtectedRoute>
  );
};

export default PromocionesPage;
