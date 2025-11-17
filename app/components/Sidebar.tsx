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
  Tag,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import Button from "./Button";
import { useRouter, usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { MenuItemProps, SidebarProps } from "../lib/types/types";
import { useEffect, useState } from "react";

import { TbCashRegister } from "react-icons/tb";

const menuItems: MenuItemProps[] = [
  {
    label: "Caja diaria",
    href: "/caja-diaria",
    icon: <TbCashRegister className="w-6 h-6" />,
  },
  {
    label: "Punto de venta",
    icon: <ShoppingCart />,
    submenu: [
      {
        label: "Ventas",
        href: "/ventas",
        icon: <ShoppingCart className="w-5 h-5" />,
      },
      {
        label: "Promociones",
        href: "/promociones",
        icon: <Tag className="w-5 h-5" />,
      },
    ],
  },
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
  const [openSubmenus, setOpenSubmenus] = useState<Set<string>>(new Set());

  const toggleSubmenu = (label: string) => {
    setOpenSubmenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const handleItemClick = (
    label: string,
    href?: string,
    target?: string,
    hasSubmenu?: boolean
  ) => {
    if (hasSubmenu && isSidebarOpen) {
      toggleSubmenu(label);
      return;
    }

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
        if (item.submenu) {
          const subItem = item.submenu.find((sub) => sub.href === pathname);
          if (subItem) return subItem.label;
        }
      }
      return "";
    };

    setActiveItem(findActiveItem(items));
  }, [pathname, items]);

  const renderMenuItem = (item: MenuItemProps) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenus.has(item.label);
    const isActive =
      activeItem === item.label ||
      item.submenu?.some((subItem) => activeItem === subItem.label);

    return (
      <div key={item.label} className="w-full text-md font-semibold">
        <button
          onClick={() =>
            handleItemClick(item.label, item.href, item.target, hasSubmenu)
          }
          className={`${
            isActive
              ? " shadow-md shadow-gray_xl dark:shadow-gray_m bg-gradient-to-bl from-blue_m to-blue_b text-white dark:bg-gray_b"
              : ""
          } ${
            isSidebarOpen ? "justify-start" : "justify-center"
          } cursor-pointer flex items-center px-2 py-2 w-full hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300`}
        >
          {item.icon}
          {isSidebarOpen && (
            <>
              <span className="ml-3 flex-1 text-left">{item.label}</span>
              {hasSubmenu &&
                (isSubmenuOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                ))}
            </>
          )}
        </button>

        {hasSubmenu && isSubmenuOpen && isSidebarOpen && item.submenu && (
          <div className="ml-6 border-l-2 border-blue_m dark:border-blue_l space-y-1 ">
            {item.submenu.map((subItem) => (
              <button
                key={subItem.label}
                onClick={() =>
                  handleItemClick(subItem.label, subItem.href, subItem.target)
                }
                className={`${
                  activeItem === subItem.label
                    ? "bg-blue_xl dark:bg-gray_b text-blue_b dark:text-white"
                    : ""
                } cursor-pointer flex items-center px-2 py-2 w-full text-sm hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300`}
              >
                {subItem.icon}
                <span className="ml-3">{subItem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`fixed top-0 left-0 flex flex-col justify-between bg-white dark:bg-black shadow-lg shadow-gray_b h-screen border-r border-gray_xl dark:border-gray_m text-gray_b dark:text-white transition-all duration-300 ${
        isSidebarOpen ? "w-64" : "w-30"
      } overflow-y-auto`}
    >
      <div>
        <div className="bg-gradient-to-bl from-blue_m to-blue_b dark:bg-gray_b text-white flex items-center justify-between p-2 shadow-sm shadow-gray_l dark:shadow-gray_b">
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
        <nav className="space-y-1 2xl:space-y-2 pt-1">
          {items.map(renderMenuItem)}
        </nav>
      </div>
      <div className={`w-full px-4 pb-4 ${!isSidebarOpen ? "hidden" : ""}`}>
        <button
          onClick={() => router.push("/import-export")}
          className="cursor-pointer w-full flex justify-center items-center gap-2 py-2 rounded-sm bg-blue_b text-white hover:bg-blue_m transition-all"
        >
          <Repeat size={14} />
          <span className="uppercase text-[0.6rem] 2xl:text-[.8rem] font-semibold">
            Importar | Exportar
          </span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
