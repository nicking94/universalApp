"use client";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { ButtonProps } from "../lib/types/types";

const Button: React.FC<ButtonProps> = ({
  width = "w-auto",
  minwidth = "min-w-[7rem] 2xl:min-w-[10rem]",
  height = "h-[1.9rem]",
  px = "px-2",
  py = "py-1",
  text,
  icon,
  iconPosition = "right",
  type = "button",
  onClick,
  colorText = "text-gray_b dark:text-white",
  colorTextHover = "hover:text-gray_b hover:dark:text-white",
  colorBg = "bg-blue_b",
  colorBgHover = "hover:bg-blue_m",
  disabled = false,
  title,
  hotkey,
}) => {
  useHotkeys(
    hotkey || "",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!disabled && onClick) {
        onClick();
      }
    },
    {
      enabled: !disabled && !!hotkey,
      enableOnFormTags: ["INPUT", "TEXTAREA", "SELECT"],
      enableOnContentEditable: true,
      preventDefault: true,
      keydown: true,
      keyup: false,
      splitKey: "+",
      description: text ? `Botón: ${text}` : undefined,
    },
    [disabled, onClick, hotkey]
  );

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      tabIndex={0}
      aria-label={text}
      title={title}
      className={`${colorText} ${colorTextHover} ${width} ${minwidth} ${height} ${px} ${py} ${colorBg} ${colorBgHover} ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } flex items-center justify-center text-xs gap-2 rounded transition-all duration-300 font-normal uppercase shadow shadow-blue_m`}
    >
      {icon && iconPosition === "left" && <span>{icon}</span>}
      {text && <span>{text}</span>}
      {icon && iconPosition === "right" && <span>{icon}</span>}
    </button>
  );
};

export default Button;
