"use client";
import Image from "next/image";
import { useSidebar } from "../context/SidebarContext";
import { NavbarProps } from "../lib/types/types";
import UserMenu from "./userMenu";
import logo from "../../public/logo.png";

const Navbar: React.FC<NavbarProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const { isSidebarOpen } = useSidebar();

  return (
    <header className="bg-white dark:bg-black text-gray_b dark:text-white w-full px-10 py-5 relative shadow-sm shadow-gray_xl dark:shadow-gray_m transition-all duration-200">
      <nav
        className={`${
          isSidebarOpen ? "ml-64" : "ml-30"
        } transition-all duration-200 flex items-center justify-between h-10`}
      >
        <div className="flex items-center gap-4">
          <Image className=" rounded-full w-8 h-8" src={logo} alt="User Logo" />
          <h1 className="text-lg italic">Universal App | Kioscos</h1>
        </div>

        <div className="flex flex-col justify-center items-center">
          <UserMenu
            theme={theme}
            handleTheme={handleTheme}
            handleCloseSession={handleCloseSession}
          />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
