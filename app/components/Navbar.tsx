"use client";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";
import logo from "../../public/logo.png";
import { useRubro } from "../context/RubroContext";
import Select from "react-select";
import NotificationIcon from "./Notifications/NotificationIcon";
import { APP_VERSION } from "../lib/constants/constants";

const rubroOptions = [
  { value: "Todos los rubros", label: "Todos los rubros" },
  { value: "comercio", label: "Comercio" },
  { value: "indumentaria", label: "Indumentaria" },
];

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen } = useSidebar();
  const { rubro, setRubro } = useRubro();

  const selectedRubro = rubroOptions.find((option) => option.value === rubro);

  return (
    <header className="bg-white dark:bg-black text-gray_b dark:text-white w-full px-10 py-5 relative shadow-sm shadow-gray_xl dark:shadow-gray_m transition-all duration-300">
      <nav
        className={`${
          isSidebarOpen ? "ml-64" : "ml-30"
        } transition-all duration-300 flex items-center justify-between h-10`}
      >
        <div className="flex items-center gap-2">
          <Image className="rounded-full w-8 h-8" src={logo} alt="User Logo" />
          <h1 className="text-lg italic">
            Universal App <span className="text-[.8rem]">v.{APP_VERSION}</span>{" "}
            | <span className="text-sm">{rubro}</span>
          </h1>
        </div>

        <div className="flex items-center space-x-6 ">
          <div className="flex items-center space-x-2  p-1">
            <p className="w-full min-w-23 dark:text-white italic text-md font-normal text-gray_m border-b-1 border-blue_l ">
              Rubro actual:
            </p>
            <Select
              options={rubroOptions}
              noOptionsMessage={() => "No se encontraron opciones"}
              value={selectedRubro}
              onChange={(selectedOption) => {
                if (selectedOption) {
                  setRubro(
                    selectedOption.value as
                      | "Todos los rubros"
                      | "comercio"
                      | "indumentaria"
                  );
                }
              }}
              className="text-gray_l min-w-40"
              isSearchable={false}
            />
          </div>
          <div className="flex items-center space-x-4">
            <NotificationIcon />
          </div>
          <div className="flex flex-col justify-center items-center">
            <UserMenu
              theme={theme}
              handleTheme={handleTheme}
              handleCloseSession={handleCloseSession}
            />
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
