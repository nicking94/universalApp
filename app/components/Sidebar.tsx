"use client";
import {
  MenuIcon,
  XIcon,
  Package,
  ShoppingCart,
  Repeat,
  Wallet,
  Headphones,
  Users,
  Truck,
  LineChart,
  ClipboardList,
  // Truck,
} from "lucide-react";
import Button from "./Button";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { MenuItemProps, SidebarProps } from "../lib/types/types";
import { useEffect, useState } from "react";

import { TbCashRegister } from "react-icons/tb";

const menuItems = [
  {
    label: "Caja diaria",
    href: "/caja-diaria",
    icon: <TbCashRegister className="w-6 h-6" />,
  },
  { label: "Ventas", href: "/ventas", icon: <ShoppingCart /> },
  { label: "Productos", href: "/productos", icon: <Package /> },
  { label: "Clientes", href: "/clientes", icon: <Users /> },
  { label: "Cuentas Corrientes", href: "/cuentascorrientes", icon: <Wallet /> },
  { label: "Proveedores", href: "/proveedores", icon: <Truck /> },
  { label: "Presupuestos", href: "/presupuestos", icon: <ClipboardList /> },
  { label: "Movimientos", href: "/movimientos", icon: <Repeat /> },
  { label: "Métricas", href: "/metricas", icon: <LineChart /> },
  {
    label: "Soporte técnico",
    href: "https://wa.me/5492613077147",
    icon: <Headphones />,
    target: "_blank",
  },
];

const Sidebar: React.FC<SidebarProps> = ({ items = menuItems }) => {
  const { isSidebarOpen, toggleSidebar } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [activeItem, setActiveItem] = useState<string>("");

  const handleItemClick = (label: string, href?: string, target?: string) => {
    setActiveItem(label);

    if (href) {
      if (target === "_blank") {
        window.open(href, "_blank");
      } else {
        router.push(href);
      }
    }
  };
  useEffect(() => {
    const findActiveItem = (items: MenuItemProps[]): string => {
      for (const item of items) {
        if (item.href === pathname) return item.label;
      }
      return "";
    };

    setActiveItem(findActiveItem(items));
  }, [pathname, items]);

  return (
    <aside
      className={`fixed top-0 left-0  flex flex-col justify-between  bg-white dark:bg-black shadow-lg shadow-gray_b h-screen border-r border-gray_xl dark:border-gray_m text-gray_b dark:text-white transition-all duration-300  ${
        isSidebarOpen ? "w-64" : "w-30"
      } overflow-y-auto`}
    >
      <div>
        <div className="bg-gradient-to-bl from-blue_m to-blue_b dark:bg-gray_b text-white  flex items-center justify-between p-2 shadow-sm shadow-gray_xl dark:shadow-gray_b">
          <span>Menú</span>
          <Button
            colorText="text-white"
            colorBg="bg-transparent "
            colorBgHover="hover:bg-transparent "
            colorTextHover="text-gray_b"
            minwidth="min-w-0"
            px="px-1"
            py="py-1"
            height="h-full"
            icon={isSidebarOpen ? <XIcon /> : <MenuIcon />}
            onClick={toggleSidebar}
          />
        </div>
        <nav className="space-y-1 2xl:space-y-2 py-2">
          {items.map((item) => (
            <div key={item.label} className="w-full text-md font-semibold">
              <button
                onClick={() =>
                  handleItemClick(item.label, item.href, item.target)
                }
                className={` ${
                  activeItem === item.label
                    ? " shadow-md shadow-gray_xl dark:shadow-gray_m bg-gradient-to-bl from-blue_m to-blue_b text-white dark:bg-gray_b"
                    : ""
                } ${
                  isSidebarOpen ? "justify-start" : "justify-center"
                } cursor-pointer flex items-center px-2 py-4 w-full  hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300`}
              >
                {item.icon}
                {isSidebarOpen && <span className="ml-3">{item.label}</span>}
              </button>
            </div>
          ))}
        </nav>
      </div>
      <div className={`w-full px-4 pb-4 ${!isSidebarOpen ? "hidden" : ""}`}>
        <button
          onClick={() => router.push("/import-export")}
          className="cursor-pointer w-full flex justify-center items-center gap-2 py-2 rounded-sm bg-blue_b text-white hover:bg-blue_m transition-all"
        >
          <Repeat size={14} />
          <span className="text-[0.6rem] 2xl:text-[.8rem] font-semibold">
            Importar / Exportar
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
