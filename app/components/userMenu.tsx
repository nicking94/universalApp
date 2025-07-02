// components/UserMenu.tsx
"use client";
import { Sun, Moon, LogOut, Settings, HelpCircle, Ticket } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { BusinessData, UserMenuProps } from "../lib/types/types";
import Input from "./Input";
import Button from "./Button";
import Modal from "./Modal";
import { useBusinessData } from "../context/BusinessDataContext";

const UserMenu: React.FC<UserMenuProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userIconRef = useRef<HTMLDivElement>(null);
  const [isTicketDataModalOpen, setIsTicketDataModalOpen] = useState(false);
  const { businessData, setBusinessData } = useBusinessData();
  const [localBusinessData, setLocalBusinessData] = useState<BusinessData>({
    name: "",
    address: "",
    phone: "",
    cuit: "",
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        userIconRef.current &&
        !userIconRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isTicketDataModalOpen && businessData) {
      setLocalBusinessData(businessData);
    }
  }, [isTicketDataModalOpen, businessData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalBusinessData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const saveBusinessData = async () => {
    try {
      await setBusinessData(localBusinessData);
      setIsTicketDataModalOpen(false);
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error al guardar los datos del negocio:", error);
    }
  };

  return (
    <div className="relative">
      <div
        ref={userIconRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="cursor-pointer flex bg-white shadow dark:bg-gray_b rounded-full p-1 text-gray_b w-8 h-8 hover:dark:bg-gray_m transition-all duration-300"
        title="Configuraciones"
      >
        <Settings className="flex items-center justify-center w-full h-full text-gray_b dark:text-white" />
      </div>
      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 w-48 bg-white dark:bg-black shadow-lg rounded-sm shadow-gray_m mt-2 z-50"
        >
          <button
            onClick={() => {
              handleTheme();
              setIsMenuOpen(false);
            }}
            className="cursor-pointer flex items-center w-full p-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300 rounded-t-md"
          >
            {theme === "dark" ? (
              <Sun className="mr-2" />
            ) : (
              <Moon className="mr-2" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </button>
          <button
            onClick={() => {
              setIsTicketDataModalOpen(true);
            }}
            className="cursor-pointer flex items-center w-full p-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300"
          >
            <Ticket className="mr-2" />
            Datos del negocio
          </button>
          <a
            className="cursor-pointer flex items-center w-full p-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300"
            href="https://www.youtube.com/watch?v=q6U8XRMTxJg&list=PLANJYSrB0A_HqQIHQs9ZIrwLOvMVGrA6W"
            target="_blank"
          >
            <HelpCircle className="mr-2" />
            Tutoriales
          </a>
          <button
            onClick={() => {
              handleCloseSession();
              setIsMenuOpen(false);
            }}
            className="cursor-pointer flex items-center w-full p-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300 rounded-b-md"
          >
            <LogOut className="mr-2" />
            Cerrar sesión
          </button>
        </div>
      )}

      <Modal
        isOpen={isTicketDataModalOpen}
        onClose={() => setIsTicketDataModalOpen(false)}
        title="Datos del negocio"
        bgColor="bg-white dark:bg-gray_b"
        buttons={
          <>
            <Button
              text="Guardar"
              colorText="text-white"
              colorTextHover="text-white"
              onClick={saveBusinessData}
              type="button"
              hotkey="Enter"
            />
            <Button
              text="Cancelar"
              colorText="text-gray_b dark:text-white"
              colorTextHover="hover:dark:text-white"
              colorBg="bg-transparent dark:bg-gray_m"
              colorBgHover="hover:bg-blue_xl hover:dark:bg-blue_l"
              onClick={() => setIsTicketDataModalOpen(false)}
              type="button"
            />
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Negocio"
            name="name"
            value={localBusinessData.name}
            onChange={handleInputChange}
            placeholder="Ingrese el nombre del negocio"
          />
          <Input
            label="Dirección"
            name="address"
            value={localBusinessData.address}
            onChange={handleInputChange}
            placeholder="Ingrese la dirección"
          />
          <Input
            label="Teléfono"
            name="phone"
            value={localBusinessData.phone}
            onChange={handleInputChange}
            placeholder="Ingrese el teléfono"
          />
          <Input
            label="CUIT"
            name="cuit"
            value={localBusinessData.cuit}
            onChange={handleInputChange}
            placeholder="Ingrese el CUIT"
          />
        </div>
      </Modal>
    </div>
  );
};

export default UserMenu;
