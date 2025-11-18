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
import { Plus, Edit, Trash, Tag, Percent, DollarSign } from "lucide-react";
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

  // Opciones mejoradas
  const promotionTypeOptions = [
    {
      value: "PERCENTAGE_DISCOUNT",
      label: "Descuento Porcentual",
      icon: <Percent size={16} />,
    },
    {
      value: "FIXED_DISCOUNT",
      label: "Descuento Fijo",
      icon: <DollarSign size={16} />,
    },
  ];

  const statusOptions = [
    { value: "active", label: "Activa", color: "bg-green_xl text-green_b" },
    { value: "inactive", label: "Inactiva", color: "bg-gray_xl text-gray_b" },
  ];

  // Validación mejorada
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

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setType(type);
    setNotificationMessage(message);
    setIsNotificationOpen(true);
    setTimeout(() => {
      setIsNotificationOpen(false);
    }, 3000);
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

      // Ordenar por estado y fecha
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
  ): { label: string; color: string } => {
    const now = new Date();
    const startDate = new Date(promotion.startDate);
    const endDate = promotion.endDate ? new Date(promotion.endDate) : null;

    if (promotion.status === "inactive") {
      return { label: "Inactiva", color: "bg-gray_xl text-gray_b" };
    }

    if (now < startDate) {
      return { label: "Programada", color: "bg-blue_xl text-blue_b" };
    }

    if (endDate && now > endDate) {
      return { label: "Expirada", color: "bg-red_xl text-red_b" };
    }

    return { label: "Activa", color: "bg-green_xl text-green_b" };
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg 2xl:text-xl font-semibold">Promociones</h1>
          </div>
          {rubro !== "Todos los rubros" && (
            <Button
              title="Nueva Promoción"
              text="Nueva Promoción"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={handleAddPromotion}
              icon={<Plus size={18} />}
            />
          )}
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray_m p-4 rounded-lg shadow-sm border border-gray_xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray_m dark:text-white">
                  Total Promociones
                </p>
                <p className="text-2xl font-bold text-gray_b dark:text-white">
                  {promotions.length}
                </p>
              </div>
              <Tag className="text-blue_m" size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray_m p-4 rounded-lg shadow-sm border border-gray_xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray_m dark:text-white">Activas</p>
                <p className="text-2xl font-bold text-green_b dark:text-green_m">
                  {
                    promotions.filter(
                      (p) => getPromotionStatus(p).label === "Activa"
                    ).length
                  }
                </p>
              </div>
              <Tag className="text-green_m" size={24} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray_m p-4 rounded-lg shadow-sm border border-gray_xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray_m dark:text-white">Expiradas</p>
                <p className="text-2xl font-bold text-red_b dark:text-red_m">
                  {
                    promotions.filter(
                      (p) => getPromotionStatus(p).label === "Expirada"
                    ).length
                  }
                </p>
              </div>
              <Tag className="text-red_m" size={24} />
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-300px)]">
          <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse overflow-y-auto shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-xs sticky top-0">
                <tr>
                  <th className="p-3 text-start">Nombre</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Descuento</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Vigencia</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="w-40 max-w-[5rem] 2xl:max-w-[10rem] p-3">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white text-gray_b divide-y divide-gray_xl">
                {currentPromotions.length > 0 ? (
                  currentPromotions.map((promotion) => {
                    const statusInfo = getPromotionStatus(promotion);
                    return (
                      <tr
                        key={promotion.id || `promo-${promotion.createdAt}`}
                        className="text-xs 2xl:text-sm bg-white text-gray_b border border-gray_xl hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                      >
                        <td className="font-semibold px-3 text-start border border-gray_xl">
                          <div>
                            <p className="uppercase font-semibold">
                              {promotion.name}
                            </p>
                            {promotion.description && (
                              <p className="text-xs text-gray_m mt-1">
                                {promotion.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-3 border border-gray_xl">
                          <div className="flex items-center justify-center gap-2">
                            {
                              promotionTypeOptions.find(
                                (t) => t.value === promotion.type
                              )?.icon
                            }
                            {
                              promotionTypeOptions.find(
                                (t) => t.value === promotion.type
                              )?.label
                            }
                          </div>
                        </td>
                        <td className="p-3 border border-gray_xl font-bold">
                          {promotion.type === "FIXED_DISCOUNT" && "$"}
                          {promotion.discount}
                          {promotion.type === "PERCENTAGE_DISCOUNT" && "%"}
                        </td>
                        <td className="p-3 border border-gray_xl">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="p-3 border border-gray_xl text-xs">
                          <div className="flex flex-col">
                            <span>
                              Inicio:{" "}
                              {new Date(
                                promotion.startDate
                              ).toLocaleDateString()}
                            </span>
                            {promotion.endDate && (
                              <span>
                                Fin:{" "}
                                {new Date(
                                  promotion.endDate
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                        {rubro !== "Todos los rubros" && (
                          <td className="p-3 border border-gray_xl">
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
                    );
                  })
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td colSpan={6} className="py-4 text-center">
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

        {/* Modal de Promoción Mejorado */}
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
          <div className=" p-1">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Nombre de la promoción*"
                    type="text"
                    value={newPromotion.name}
                    onChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Descuento de Verano 20%"
                  />
                  {validationErrors.name && (
                    <p className="text-red_m text-xs mt-1">
                      {validationErrors.name}
                    </p>
                  )}
                </div>

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
                  placeholder="Breve descripción de la promoción"
                />
              </div>

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
                        discount: 0, // Reset discount when type changes
                      }))
                    }
                    className="text-gray_m"
                    formatOptionLabel={(option) => (
                      <div className="flex items-center gap-2">
                        {option.icon}
                        {option.label}
                      </div>
                    )}
                  />
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
                    step={
                      newPromotion.type === "PERCENTAGE_DISCOUNT" ? "1" : "0.01"
                    }
                  />
                  {validationErrors.discount && (
                    <p className="text-red_m text-xs mt-1">
                      {validationErrors.discount}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Fecha de Inicio*
                  </label>
                  <Input
                    type="date"
                    value={newPromotion.startDate}
                    onChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Fecha de Fin (Opcional)
                  </label>
                  <Input
                    type="date"
                    value={newPromotion.endDate || ""}
                    onChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                  {validationErrors.endDate && (
                    <p className="text-red_m text-xs mt-1">
                      {validationErrors.endDate}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-gray_m dark:text-white text-sm font-semibold mb-1">
                    Monto Mínimo de Compra (Opcional)
                  </label>
                  <Input
                    type="number"
                    value={newPromotion.minPurchaseAmount?.toString() || "0"}
                    onChange={(e) =>
                      setNewPromotion((prev) => ({
                        ...prev,
                        minPurchaseAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0 = sin mínimo"
                    step="0.01"
                  />
                  {validationErrors.minPurchaseAmount && (
                    <p className="text-red_m text-xs mt-1">
                      {validationErrors.minPurchaseAmount}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Modal de Confirmación de Eliminación */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Eliminar Promoción"
          buttons={
            <>
              <Button
                text="Sí, eliminar"
                colorText="text-white dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-red_m border-b-1 dark:bg-blue_b"
                colorBgHover="hover:bg-red_b hover:dark:bg-blue_m"
                onClick={handleConfirmDelete}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-gray_l"
                onClick={() => setIsConfirmModalOpen(false)}
              />
            </>
          }
        >
          <div className="text-center">
            <Trash size={48} className="mx-auto text-red_m mb-4" />
            <p className="text-lg font-semibold mb-2">
              ¿Está seguro que desea eliminar la promoción?
            </p>
            <p className="text-gray_m">
              {promotionToDelete?.name} será eliminada permanentemente.
            </p>
          </div>
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
