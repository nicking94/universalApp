"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { Budget, Customer } from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import Pagination from "@/app/components/Pagination";
import { Edit, Plus, Trash, Users, ClipboardList, Eye } from "lucide-react";
import SearchBar from "@/app/components/SearchBar";
import { useRubro } from "@/app/context/RubroContext";
import { usePagination } from "@/app/context/PaginationContext";

const ClientesPage = () => {
  const { rubro } = useRubro();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState<
    Omit<Customer, "id" | "createdAt" | "updatedAt">
  >({
    name: "",
    phone: "",
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customerBudgets, setCustomerBudgets] = useState<Budget[]>([]);
  const [isBudgetsModalOpen, setIsBudgetsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);
  const [isDeleteBudgetModalOpen, setIsDeleteBudgetModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const { currentPage, itemsPerPage, setCurrentPage } = usePagination();
  const [searchQuery, setSearchQuery] = useState("");
  const [newBudget, setNewBudget] = useState<Omit<Budget, "id">>({
    date: new Date().toISOString(),
    customerName: "",
    customerPhone: "",
    customerId: "",
    items: [],
    total: 0,
    deposit: "",
    remaining: 0,
    expirationDate: "",
    notes: "",
    status: "pendiente",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  useEffect(() => {
    const fetchCustomerBudgets = async () => {
      if (selectedCustomer) {
        try {
          const budgets = await db.budgets
            .where("customerId")
            .equals(selectedCustomer.id)
            .toArray();
          if (selectedCustomer) {
            setCustomerBudgets(budgets);
          }
        } catch (error) {
          console.error("Error al cargar presupuestos:", error);
          showNotification("Error al cargar los presupuestos", "error");
        }
      }
    };

    fetchCustomerBudgets();
  }, [selectedCustomer]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();
      const sortedCustomers = [...allCustomers].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      const filtered = sortedCustomers.filter((customer) => {
        if (rubro === "Todos los rubros") return true;
        return customer.rubro === rubro;
      });

      const searched = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setCustomers(sortedCustomers);
      setFilteredCustomers(searched);
    };

    fetchCustomers();
  }, [rubro, searchQuery]);

  useEffect(() => {
    const total = Number(newBudget.total) || 0;
    const deposit = Number(newBudget.deposit) || 0;

    setNewBudget((prev) => ({
      ...prev,
      remaining: total - deposit,
      deposit: prev.deposit,
    }));
  }, [newBudget.total, newBudget.deposit]);

  const indexOfLastCustomer = currentPage * itemsPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
    indexOfFirstCustomer,
    indexOfLastCustomer
  );

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 2500);
  };

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const existingCustomer = customers.find(
        (c) => c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );

      if (existingCustomer) {
        showNotification("Ya existe un cliente con este nombre", "error");
        return;
      }

      const customerToAdd: Customer = {
        ...newCustomer,
        id: generateCustomerId(newCustomer.name),
        name: newCustomer.name.trim(),
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.customers.add(customerToAdd);
      setCustomers([...customers, customerToAdd]);
      setFilteredCustomers([...filteredCustomers, customerToAdd]);
      setNewCustomer({ name: "", phone: "" });
      setIsModalOpen(false);
      showNotification("Cliente agregado correctamente", "success");
    } catch (error) {
      console.error("Error al agregar cliente:", error);
      showNotification("Error al agregar cliente", "error");
    }
  };

  const generateCustomerId = (name: string): string => {
    const cleanName = name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");
    const timestamp = Date.now().toString().slice(-5);
    return `${cleanName}-${timestamp}`;
  };

  const handleConfirmDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      await db.budgets.delete(budgetToDelete.id);
      setCustomerBudgets(
        customerBudgets.filter((b) => b.id !== budgetToDelete.id)
      );
      showNotification("Presupuesto eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar presupuesto:", error);
      showNotification("Error al eliminar presupuesto", "error");
    } finally {
      setIsDeleteBudgetModalOpen(false);
      setBudgetToDelete(null);
    }
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      const customerSales = await db.sales
        .where("customerId")
        .equals(customerToDelete.id)
        .toArray();

      if (customerSales.length > 0) {
        showNotification(
          "No se puede eliminar el cliente porque tiene una cuenta corriente pendiente de pago",
          "error"
        );
        return;
      }

      await db.customers.delete(customerToDelete.id);
      setFilteredCustomers(
        filteredCustomers.filter((c) => c.id !== customerToDelete.id)
      );
      setCustomers(customers.filter((c) => c.id !== customerToDelete.id));
      showNotification("Cliente eliminado correctamente", "success");
    } catch (error) {
      console.error("Error al eliminar cliente:", error);
      showNotification("Error al eliminar cliente", "error");
    } finally {
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer({
      name: customer.name,
      phone: customer.phone || "",
    });
    setIsModalOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer || !newCustomer.name.trim()) {
      showNotification("El nombre del cliente es requerido", "error");
      return;
    }

    try {
      const existingCustomer = customers.find(
        (c) =>
          c.id !== editingCustomer.id &&
          c.name.toLowerCase() === newCustomer.name.toLowerCase().trim()
      );

      if (existingCustomer) {
        showNotification("Ya existe un cliente con este nombre", "error");
        return;
      }

      const updatedCustomer = {
        ...editingCustomer,
        name: newCustomer.name.trim(),
        phone: newCustomer.phone,
        rubro: rubro === "Todos los rubros" ? undefined : rubro,
        updatedAt: new Date().toISOString(),
      };

      await db.transaction(
        "rw",
        db.customers,
        db.sales,
        db.budgets,
        async () => {
          await db.customers.update(editingCustomer.id, updatedCustomer);

          // Actualizar ventas
          const customerSales = await db.sales
            .where("customerId")
            .equals(editingCustomer.id)
            .toArray();

          await Promise.all(
            customerSales.map((sale) =>
              db.sales.update(sale.id, {
                customerName: updatedCustomer.name,
              })
            )
          );
          if (editingBudget) {
            const updatedBudget = {
              ...editingBudget,
              customerName: updatedCustomer.name,
              updatedAt: new Date().toISOString(),
            };
            await db.budgets.update(editingBudget.id, updatedBudget);
          }
        }
      );

      setCustomers(
        customers.map((c) =>
          c.id === editingCustomer.id ? updatedCustomer : c
        )
      );

      setFilteredCustomers(
        filteredCustomers.map((c) =>
          c.id === editingCustomer.id ? updatedCustomer : c
        )
      );

      setNewCustomer({ name: "", phone: "" });
      setEditingCustomer(null);
      setEditingBudget(null);
      setIsModalOpen(false);
      showNotification("Cliente actualizado correctamente", "success");
    } catch (error) {
      console.error("Error al actualizar cliente:", error);
      showNotification("Error al actualizar cliente", "error");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleViewBudgetItems = (budget: Budget) => {
    setSelectedBudget(budget);
  };

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Clientes</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full max-w-md">
            <SearchBar onSearch={handleSearch} />
          </div>
          {rubro !== "Todos los rubros" && (
            <Button
              icon={<Plus className="w-4 h-4" />}
              text="Nuevo Cliente"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={() => setIsModalOpen(true)}
            />
          )}
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="table-auto w-full text-center border-collapse shadow-sm shadow-gray_l">
              <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-sm 2xl:text-lg">
                <tr className="text-xs lg:text-md 2xl:text-lg">
                  <th className="p-2 text-start">Nombre</th>
                  <th className="p-2">Teléfono</th>
                  <th className="p-2">Fecha de Registro</th>
                  {rubro !== "Todos los rubros" && (
                    <th className="p-2 w-40 max-w-40">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody
                className={`bg-white text-gray_b divide-y divide-gray_xl `}
              >
                {currentCustomers.length > 0 ? (
                  currentCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                    >
                      <td className="font-semibold p-2 border border-gray_xl text-start">
                        {customer.name}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {customer.phone || "Sin teléfono"}
                      </td>
                      <td className="p-2 border border-gray_xl">
                        {new Date(customer.createdAt).toLocaleDateString(
                          "es-AR"
                        )}
                      </td>
                      {rubro !== "Todos los rubros" && (
                        <td className="p-2 border border-gray_xl">
                          <div className="flex justify-center items-center gap-2 h-full">
                            <Button
                              icon={<ClipboardList size={20} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-blue_b"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setIsBudgetsModalOpen(true);
                              }}
                              title="Ver presupuestos"
                            />
                            <Button
                              icon={<Edit size={20} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-blue_b"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => handleEditClick(customer)}
                              title="Editar cliente"
                            />
                            <Button
                              icon={<Trash size={20} />}
                              colorText="text-gray_b"
                              colorTextHover="hover:text-white"
                              colorBg="bg-transparent"
                              colorBgHover="hover:bg-red_m"
                              px="px-1"
                              py="py-1"
                              minwidth="min-w-0"
                              onClick={() => handleDeleteClick(customer)}
                              title="Eliminar cliente"
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                    <td colSpan={4} className="py-4 text-center">
                      <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                        <Users size={64} className="mb-4 text-gray_m" />
                        <p className="text-gray_m">
                          {searchQuery
                            ? "No se encontraron clientes"
                            : "No hay clientes registrados"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredCustomers.length > 0 && (
            <Pagination
              text="Clientes por página"
              text2="Total de clientes"
              totalItems={filteredCustomers.length}
            />
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingCustomer(null);
            setNewCustomer({ name: "", phone: "" });
          }}
          title={editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
          buttons={
            <>
              <Button
                text={editingCustomer ? "Actualizar" : "Agregar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={
                  editingCustomer ? handleUpdateCustomer : handleAddCustomer
                }
                hotkey="enter"
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingCustomer(null);
                  setNewCustomer({ name: "", phone: "" });
                }}
                hotkey="esc"
              />
            </>
          }
        >
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Input
                label="Nombre del cliente"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                placeholder="Ingrese el nombre completo"
              />
              <Input
                label="Teléfono (opcional)"
                value={newCustomer.phone || ""}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                placeholder="Ingrese el número de teléfono"
              />
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isBudgetsModalOpen}
          onClose={() => {
            setIsBudgetsModalOpen(false);
            setSelectedCustomer(null);
            setSelectedBudget(null);
            setCustomerBudgets([]);
          }}
          title={`Presupuestos de ${selectedCustomer?.name || ""}`}
          buttons={
            selectedBudget ? (
              <>
                <Button
                  text="Volver"
                  colorText="text-white"
                  colorTextHover="text-white"
                  onClick={() => setSelectedBudget(null)}
                />
                <Button
                  text="Cerrar"
                  colorText="text-gray_b dark:text-white"
                  colorTextHover="hover:dark:text-white"
                  colorBg="bg-transparent dark:bg-gray_m"
                  colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                  onClick={() => {
                    setIsBudgetsModalOpen(false);
                    setSelectedCustomer(null);
                    setSelectedBudget(null);
                  }}
                />
              </>
            ) : (
              <Button
                text="Cerrar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => {
                  setIsBudgetsModalOpen(false);
                  setSelectedCustomer(null);
                  setSelectedBudget(null);
                }}
              />
            )
          }
        >
          {selectedBudget ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 ">
                <div>
                  <p className="font-semibold">Fecha:</p>
                  <p>
                    {new Date(selectedBudget.date).toLocaleDateString("es-AR")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Total:</p>
                  <p>${selectedBudget.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold">Seña:</p>
                  <p>${selectedBudget.deposit || "0.00"}</p>
                </div>
                <div>
                  <p className="font-semibold">Saldo:</p>
                  <p>${selectedBudget.remaining.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-semibold">Estado:</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      selectedBudget.status === "aprobado"
                        ? "bg-green-100 text-green-800"
                        : selectedBudget.status === "rechazado"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {selectedBudget.status}
                  </span>
                </div>
                {selectedBudget.notes && (
                  <div className="col-span-2">
                    <p className="font-semibold">Notas:</p>
                    <p>{selectedBudget.notes}</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h3 className="font-medium mb-2">Items del Presupuesto</h3>
                {selectedBudget.items ? (
                  Array.isArray(selectedBudget.items) &&
                  selectedBudget.items.length > 0 ? (
                    <div className="flex flex-col justify-between max-h-[35vh]">
                      <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                        <table className="w-full border-collapse ">
                          <thead className="bg-gradient-to-bl from-blue_m to-blue_b text-white">
                            <tr className="text-xs lg:text-md 2xl:text-lg">
                              <th className="p-2 border text-left">
                                Descripción
                              </th>
                              <th className="p-2 border text-center">
                                Cantidad
                              </th>

                              <th className="p-2 border text-center">Precio</th>
                              <th className="p-2 border text-center">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedBudget.items.map((item, index) => (
                              <tr
                                key={index}
                                className=" text-gray_b dark:text-white hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                              >
                                <td className="p-2 border">
                                  {item.productName}
                                </td>
                                <td className="p-2 border text-center">
                                  {item.quantity + " " + item.unit}
                                </td>

                                <td className="p-2 border text-center">
                                  ${item.price.toFixed(2)}
                                </td>
                                <td className="p-2 border text-center">
                                  ${(item.quantity * item.price).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">
                      No hay items en este presupuesto
                    </p>
                  )
                ) : (
                  <p className="text-gray-500">
                    No se encontraron items (propiedad items no existe)
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto">
              {customerBudgets.length > 0 ? (
                <table className="w-full table-auto divide-y divide-gray_xl">
                  <thead className="bg-gradient-to-bl from-blue_m to-blue_b text-white">
                    <tr className="text-xs lg:text-md 2xl:text-lg">
                      <th className="p-2 text-start">Fecha</th>
                      <th className="p-2">Total</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray_xl text-gray_b">
                    {customerBudgets.map((budget) => (
                      <tr
                        key={budget.id}
                        className="hover:bg-gray_xxl dark:hover:bg-blue_xl transition-all duration-300"
                      >
                        <td className="p-2 border border-gray_xl text-start">
                          {new Date(budget.date).toLocaleDateString("es-AR")}
                        </td>
                        <td className="p-2 border border-gray_xl text-center">
                          ${budget.total.toFixed(2)}
                        </td>
                        <td className="p-2 border border-gray_xl text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              budget.status === "aprobado"
                                ? "bg-green-100 text-green-800"
                                : budget.status === "rechazado"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {budget.status}
                          </span>
                        </td>
                        <td className="p-2 border border-gray_xl">
                          <div className="flex justify-center items-center gap-2 h-full">
                            <Button
                              text="Ver"
                              icon={<Eye size={18} />}
                              colorText="text-white"
                              colorTextHover="hover:text-white"
                              colorBg="bg-blue_b"
                              colorBgHover="hover:bg-blue_m"
                              minwidth="min-w-0"
                              onClick={() => handleViewBudgetItems(budget)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <ClipboardList size={64} className="mb-4 text-gray_m" />
                  <p className="text-gray_m">
                    No hay presupuestos para este cliente
                  </p>
                </div>
              )}
            </div>
          )}
        </Modal>

        <Modal
          isOpen={isDeleteBudgetModalOpen}
          onClose={() => setIsDeleteBudgetModalOpen(false)}
          title="Confirmar Eliminación de Presupuesto"
          buttons={
            <>
              <Button
                text="Eliminar"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmDeleteBudget}
                hotkey="enter"
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsDeleteBudgetModalOpen(false)}
                hotkey="esc"
              />
            </>
          }
        >
          <p>
            ¿Está seguro que desea eliminar el presupuesto del{" "}
            {budgetToDelete?.date &&
              new Date(budgetToDelete.date).toLocaleDateString("es-AR")}
            ?
          </p>
          {budgetToDelete && (
            <p className="mt-2 font-semibold">
              Total: ${budgetToDelete.total.toFixed(2)}
            </p>
          )}
        </Modal>

        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirmar Eliminación"
          buttons={
            <>
              <Button
                text="Eliminar"
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleConfirmDelete}
                hotkey="enter"
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:dark:text-white"
                colorBg="bg-transparent dark:bg-gray_m"
                colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
                onClick={() => setIsDeleteModalOpen(false)}
                hotkey="esc"
              />
            </>
          }
        >
          <p>
            ¿Está seguro que desea eliminar al cliente {customerToDelete?.name}?
          </p>
        </Modal>

        <Notification
          isOpen={isNotificationOpen}
          message={notificationMessage}
          type={notificationType}
        />
      </div>
    </ProtectedRoute>
  );
};

export default ClientesPage;
