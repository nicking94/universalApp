"use client";
import { ModalProps } from "../lib/types/types";
import { useEffect } from "react";
import Button from "./Button";

const Modal: React.FC<ModalProps> = ({
  isOpen,
  title = "Confirmación",
  children,
  bgColor = "bg-white dark:bg-gray_b",
  onClose,
  onConfirm,
  buttons,
  minheight = "auto",
}) => {
  useEffect(() => {
    if (!isOpen) return;

    window.scrollTo({ top: 0 });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onConfirm?.();
      } else if (e.key === "esc") {
        e.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onConfirm, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-gray_b/80 dark:bg-gray_l/80 flex justify-center items-center z-50">
      <div
        className={`${bgColor} min-h-[10rem] w-[64rem] rounded-sm shadow-lg shadow-gray_b p-10 text-gray_b dark:text-white flex flex-col`}
      >
        <h2 className="text-xl font-bold  ">{title}</h2>

        <div
          className={`overflow-y-auto ${minheight} max-h-[66vh] py-10 flex-1`}
        >
          {children}
        </div>
        <div className="flex justify-end space-x-4 ">
          {buttons ? (
            buttons
          ) : (
            <>
              {onConfirm && (
                <Button
                  text="Confirmar"
                  colorText="text-white"
                  colorTextHover="text-white"
                  onClick={onConfirm}
                  type="button"
                />
              )}
              <Button
                text="Cancelar"
                colorText="text-gray_b dark:text-white"
                colorTextHover="hover:text-white hover:dark:text-white"
                colorBg="bg-gray_xl dark:bg-gray_m"
                colorBgHover="hover:bg-blue_m hover:dark:bg-gray_l"
                onClick={onClose}
                type="button"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
