"use client";
import { useEffect, useState } from "react";
import { db } from "@/app/database/db";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import Modal from "@/app/components/Modal";
import Button from "@/app/components/Button";
import Input from "@/app/components/Input";
import Notification from "@/app/components/Notification";
import { Product, Supplier, SupplierContact } from "@/app/lib/types/types";
import SearchBar from "@/app/components/SearchBar";
import { Plus, Trash, Edit, Truck, Package } from "lucide-react";
import Pagination from "@/app/components/Pagination";
import CustomDatePicker from "@/app/components/CustomDatePicker";

const ProveedoresPage = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(
    null
  );
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState<
    "success" | "error" | "info"
  >("success");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

      const assignedProductIds = assignedProductKeys.map(
        ([, productId]) => productId
      );
      const assignedProds = allProducts.filter((p) =>
        assignedProductIds.includes(p.id)
      );
      const availableProds = allProducts.filter(
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
      fetchSupplierProductCounts();
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
  const fetchSupplierProductCounts = async () => {
    const allSuppliers = await db.suppliers.toArray();
    const counts: { [supplierId: number]: number } = {};
    for (const supplier of allSuppliers) {
      const count = await db.supplierProducts
        .where("supplierId")
        .equals(supplier.id)
        .count();
      counts[supplier.id] = count;
    }
    setSupplierProductCounts(counts);
  };

  useEffect(() => {
    fetchSupplierProductCounts();
  }, [suppliers]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const allSuppliers = await db.suppliers.toArray();
      setSuppliers(allSuppliers);
      setFilteredSuppliers(allSuppliers);
    };

    fetchSuppliers();
  }, []);

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

  const showNotification = (
    message: string,
    type: "success" | "error" | "info"
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setIsNotificationOpen(true);
    setTimeout(() => setIsNotificationOpen(false), 3000);
  };

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
      };

      if (editingSupplier) {
        const updatedSupplier = { ...editingSupplier, ...supplierData };
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
        setSuppliers([...suppliers, newSupplier]);
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
      <div className="px-10 2xl:px-10 py-4 text-gray_l dark:text-white h-[calc(100vh-80px)]">
        <h1 className="text-xl 2xl:text-2xl font-semibold mb-2">Proveedores</h1>

        <div className="flex justify-between mb-2">
          <div className="w-full max-w-md">
            <SearchBar onSearch={handleSearch} />
          </div>
          <Button
            icon={<Plus size={20} />}
            text="Nuevo Proveedor"
            colorText="text-white"
            colorTextHover="text-white"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          />
        </div>

        <div className="flex flex-col justify-between h-[calc(100vh-200px)]">
          <table className="w-full text-center border-collapse shadow-sm shadow-gray_l">
            <thead className="text-white bg-blue_b text-sm 2xl:text-lg">
              <tr>
                <th className="px-4 py-2 text-left">Empresa</th>
                <th className="px-4 py-2">Proveedores</th>
                <th className="px-4 py-2">Última Visita</th>
                <th className="px-4 py-2">Próxima Visita</th>
                <th className="px-4 py-2">Productos</th>
                <th className="w-40 max-w-[10rem] px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody className={`bg-white text-gray_b divide-y divide-gray_xl`}>
              {currentItems.length > 0 ? (
                currentItems.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="uppercase px-4 py-2 text-left  border border-gray_xl font-semibold">
                      {supplier.companyName}
                    </td>
                    <td className="px-4 py-2  border border-gray_xl">
                      <div className="flex justify-center items-center space-x-4  ">
                        {supplier.contacts.length > 0 && (
                          <div className="text-sm">
                            <p>{supplier.contacts[0].name}</p>
                          </div>
                        )}
                        {supplier.contacts.length > 1 && (
                          <div className="group relative inline-block">
                            <span className="text-xs text-gray_l cursor-pointer">
                              +{supplier.contacts.length - 1} más
                            </span>
                            <div className="absolute hidden group-hover:block z-10 w-64 p-2 bg-white border border-gray-200 rounded shadow-lg text-sm">
                              {supplier.contacts
                                .slice(1)
                                .map((contact, index) => (
                                  <div key={index} className="py-1">
                                    <p>{contact.name}</p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-gray_xl ">
                      {supplier.lastVisit ? (
                        format(parseISO(supplier.lastVisit), "dd/MM/yyyy", {
                          locale: es,
                        })
                      ) : (
                        <span className="text-gray_m">No registrada</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {supplier.nextVisit ? (
                        <span>
                          {format(parseISO(supplier.nextVisit), "dd/MM/yyyy", {
                            locale: es,
                          })}
                        </span>
                      ) : (
                        <span className="text-gray_m">No programada</span>
                      )}
                    </td>
                    <td className="px-4 py-2 border border-gray_xl">
                      {supplierProductCounts[supplier.id] || 0} productos
                    </td>
                    <td className="px-4 py-2 space-x-4 border border-gray_xl">
                      <div className="flex justify-center gap-4">
                        <Button
                          icon={<Package size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          colorBgHover="hover:bg-blue-500"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => openProductAssignmentModal(supplier)}
                        />
                        <Button
                          icon={<Edit size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => handleEdit(supplier)}
                        />
                        <Button
                          icon={<Trash size={20} />}
                          colorText="text-gray_b"
                          colorTextHover="hover:text-white"
                          colorBg="bg-transparent"
                          colorBgHover="hover:bg-red-500"
                          px="px-1"
                          py="py-1"
                          minwidth="min-w-0"
                          onClick={() => openDeleteModal(supplier)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="h-[50vh] 2xl:h-[calc(63vh-2px)]">
                  <td colSpan={6} className="py-4 text-center">
                    <div className="flex flex-col items-center justify-center text-gray_m dark:text-white">
                      <Truck size={64} className="mb-4 text-gray_m" />
                      <p className="text-gray_m">
                        {searchQuery
                          ? "No hay proveedores que coincidan con la búsqueda"
                          : "No hay proveedores registrados"}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {filteredSuppliers.length > 0 && (
            <Pagination
              text="Proveedores por página"
              text2="Total de proveedores"
              currentPage={currentPage}
              totalItems={filteredSuppliers.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(newItemsPerPage) => {
                setItemsPerPage(newItemsPerPage);
                setCurrentPage(1);
              }}
            />
          )}
        </div>

        <Modal
          isOpen={isProductAssignmentModalOpen}
          onClose={() => {
            setIsProductAssignmentModalOpen(false);
            setProductSearchQuery("");
          }}
          title={`Productos de ${
            selectedSupplierForProducts?.companyName || ""
          }`}
          minheight="min-h-[50vh]"
          buttons={
            <Button
              text="Cerrar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:text-white hover:dark:text-white"
              colorBg="bg-gray_xl dark:bg-gray_m"
              colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
              onClick={() => {
                setIsProductAssignmentModalOpen(false);
                setProductSearchQuery("");
              }}
            />
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex flex-col space-y-2">
                <h3 className="font-semibold">Buscar Productos</h3>
                <Input
                  placeholder="Buscar por nombre o código de barras"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
              </div>

              <div className="border rounded-lg p-2 h-[40vh] overflow-y-auto">
                {isLoadingProducts ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredAvailableProducts.length > 0 ? (
                  <div className="space-y-2">
                    {filteredAvailableProducts.map((product) => (
                      <div
                        key={product.id}
                        className={`p-2 border rounded hover:bg-gray-100 dark:hover:bg-gray_m flex justify-between items-center `}
                      >
                        <div className="flex-grow ">
                          <div className="flex justify-between">
                            <span className="font-medium">{product.name}</span>
                            <span className="text-sm text-gray-500">
                              {product.barcode || "Sin código"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>
                              Stock: {product.stock} {product.unit}
                            </span>
                            <span className="font-semibold">
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <Button
                            icon={<Plus size={20} />}
                            colorText="text-white"
                            colorTextHover="text-white"
                            onClick={() => assignProduct(product)}
                            px="px-1"
                            py="py-1"
                            minwidth="min-w-[2rem]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay productos disponibles</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Productos asignados</h3>
              <div className="border rounded-lg p-2 h-[45.5vh] overflow-y-auto">
                {assignedProducts.length > 0 ? (
                  <div className="space-y-2">
                    {assignedProducts.map((product) => (
                      <div
                        key={product.id}
                        className="p-2 border hover:bg-gray-100 dark:hover:bg-gray_m rounded"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm">
                              {product.stock} {product.unit} •{" "}
                              {new Intl.NumberFormat("es-AR", {
                                style: "currency",
                                currency: "ARS",
                              }).format(product.price)}
                            </div>
                          </div>

                          <Button
                            minwidth="min-w-[2rem]"
                            icon={<Trash size={20} />}
                            colorText="text-white"
                            colorTextHover="text-white"
                            colorBg="bg-red-500"
                            colorBgHover="hover:bg-red-700"
                            onClick={() => unassignProduct(product)}
                            px="px-1"
                            py="py-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No hay productos asignados</p>
                )}
              </div>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            resetForm();
          }}
          title={editingSupplier ? "Editar Proveedor" : "Nuevo Proveedor"}
          buttons={
            <div className="flex justify-end space-x-4 ">
              <Button
                text={editingSupplier ? "Actualizar" : "Guardar"}
                colorText="text-white"
                colorTextHover="text-white"
                onClick={handleSubmit}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              />
            </div>
          }
        >
          <div className="space-y-6">
            <Input
              label="Nombre de la Empresa"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ej: Distribuidora S.A."
            />

            <div className="space-y-6">
              {contacts.map((contact, index) => (
                <div
                  key={index}
                  className="bg-blue_xl space-y-6 border border-blue_xl shadow-md shadow-gray_l p-4 mb-8"
                >
                  <div className="flex justify-between items-center">
                    <span className="bg-blue_m rounded-md px-2 py-1 text-white text-sm font-medium">
                      Proveedor #{index + 1}
                    </span>
                    {contacts.length > 1 && (
                      <Button
                        type="button"
                        icon={<Trash size={20} />}
                        px="px-3"
                        py="py-1"
                        minwidth="min-w-0"
                        colorBg="bg-red-500"
                        colorBgHover="hover:bg-red-700"
                        colorText="text-white"
                        colorTextHover="hover:text-white"
                        onClick={() => handleRemoveContact(index)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    <Input
                      colorLabel="text-gray_m"
                      label="Nombre"
                      value={contact.name}
                      onChange={(e) =>
                        handleContactChange(index, "name", e.target.value)
                      }
                      placeholder="Nombre del proveedor"
                    />
                    <Input
                      colorLabel="text-gray_m"
                      label="Teléfono"
                      value={contact.phone}
                      onChange={(e) =>
                        handleContactChange(index, "phone", e.target.value)
                      }
                      placeholder="Teléfono del proveedor"
                    />
                  </div>
                </div>
              ))}
              <Button
                icon={<Plus size={20} />}
                text="Agregar otro proveedor"
                colorText="text-blue_b dark:text-white"
                colorTextHover="hover:text-blue_b dark:hover:text-white"
                colorBg="bg-transparent "
                colorBgHover="hover:bg-transparent"
                px="px-0"
                onClick={handleAddContact}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <CustomDatePicker
                  label="Última Visita"
                  placeholderText="Seleccione una fecha"
                  value={lastVisit}
                  onChange={setLastVisit}
                  isClearable
                  error={undefined}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="Próxima Visita"
                  placeholderText="Seleccione una fecha"
                  value={nextVisit}
                  onChange={setNextVisit}
                  isClearable
                  error={undefined}
                />
              </div>
            </div>
          </div>
        </Modal>
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Eliminar Proveedor"
          buttons={
            <div className="flex justify-end space-x-4 ">
              <Button
                text="Eliminar"
                colorText="text-white"
                colorTextHover="text-white"
                colorBg="bg-red-500"
                colorBgHover="hover:bg-red-700"
                onClick={handleDelete}
              />
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={() => setIsDeleteModalOpen(false)}
              />
            </div>
          }
        >
          <p className="text-gray_m dark:text-white">
            ¿Está seguro de que desea eliminar el proveedor{" "}
            <span className="font-semibold">
              {supplierToDelete?.companyName}
            </span>
            ? Esta acción no se puede deshacer.
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

export default ProveedoresPage;
