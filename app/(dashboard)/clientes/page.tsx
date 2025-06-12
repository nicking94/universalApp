"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { Customer } from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import Pagination from "@/app/components/Pagination";
import { Edit, Plus, Trash, Users } from "lucide-react";
import SearchBar from "@/app/components/SearchBar";
import { useRubro } from "@/app/context/RubroContext";

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

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [customersPerPage, setCustomersPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchCustomers = async () => {
      const allCustomers = await db.customers.toArray();

      const filtered = allCustomers.filter((customer) => {
        if (rubro === "todos los rubros") return true;
        return customer.rubro === rubro;
      });

      const searched = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setCustomers(allCustomers);
      setFilteredCustomers(searched);
    };

    fetchCustomers();
  }, [rubro, searchQuery]);

  const indexOfLastCustomer = currentPage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
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
        rubro: rubro === "todos los rubros" ? undefined : rubro,
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
          "No se puede eliminar el cliente porque tiene fiados pendientes de pago",
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
        rubro: rubro === "todos los rubros" ? undefined : rubro,
        updatedAt: new Date().toISOString(),
      };

      await db.transaction("rw", db.customers, db.sales, async () => {
        await db.customers.update(editingCustomer.id, updatedCustomer);

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
      });

      // Actualiza ambos estados
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

  return (
    <ProtectedRoute>
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-lg 2xl:text-xl font-semibold mb-2">Clientes</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full max-w-md">
            <SearchBar onSearch={handleSearch} />
          </div>
          <Button
            icon={<Plus className="w-4 h-4" />}
            text="Nuevo Cliente"
            colorText="text-white"
            colorTextHover="text-white"
            onClick={() => setIsModalOpen(true)}
          />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <table className="table-auto w-full text-center border-collapse shadow-sm shadow-gray_l">
            <thead className="text-white bg-gradient-to-bl from-blue_m to-blue_b text-sm 2xl:text-lg">
              <tr>
                <th className="px-4 py-2 text-start">Nombre</th>
                <th className="px-4 py-2">Teléfono</th>
                <th className="px-4 py-2">Fecha de Registro</th>
                <th className="px-4 py-2 w-40 max-w-[10rem]">Acciones</th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl `}>
              {currentCustomers.length > 0 ? (
                currentCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="font-semibold px-4 py-2 border border-gray_xl text-start">
                      {customer.name}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {customer.phone || "Sin teléfono"}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {new Date(customer.createdAt).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      <div className="flex justify-center items-center gap-2 h-full">
                        <Button
                          icon={<Edit size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          colorBgHover="hover:bg-blue-500"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => handleEditClick(customer)}
                          disabled={customer.name === "CLIENTE OCASIONAL"}
                        />
                        <Button
                          icon={<Trash size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          colorBgHover="hover:bg-red_b"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => handleDeleteClick(customer)}
                          disabled={customer.name === "CLIENTE OCASIONAL"}
                        />
                      </div>
                    </td>
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

          {filteredCustomers.length > 0 && (
            <Pagination
              text="Clientes por página"
              text2="Total de clientes"
              currentPage={currentPage}
              totalItems={filteredCustomers.length}
              itemsPerPage={customersPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setCustomersPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
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
                placeholder="Ingrese el nombre completo..."
              />
              <Input
                label="Teléfono (opcional)"
                value={newCustomer.phone || ""}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
                placeholder="Ingrese el número de teléfono..."
              />
            </div>
          </div>
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
                colorBg="bg-red_b"
                colorBgHover="hover:bg-red_m"
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
