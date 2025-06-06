import { Sun, Moon, LogOut, Settings, HelpCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { UserMenuProps } from "../lib/types/types";

const UserMenu: React.FC<UserMenuProps> = ({
  theme,
  handleTheme,
  handleCloseSession,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userIconRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="relative">
      <div
        ref={userIconRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="cursor-pointer flex bg-white shadow dark:bg-gray_b rounded-full p-1 text-gray_b w-8 h-8 hover:dark:bg-gray_m transition-all duration-300"
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
            className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300 rounded-t-md"
          >
            {theme === "dark" ? (
              <Sun className="mr-2" />
            ) : (
              <Moon className="mr-2" />
            )}
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </button>
          <a
            className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300 rounded-b-md"
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
            className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray_b dark:text-white hover:bg-blue_xl dark:hover:bg-gray_b transition-all duration-300 rounded-b-md"
          >
            <LogOut className="mr-2" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
