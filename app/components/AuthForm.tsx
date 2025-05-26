"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "./Button";
import { AuthData } from "../lib/types/types";
import Image from "next/image";
import logo from "../../public/logo.png";

interface AuthFormProps {
  type?: "login" | "register";
  onSubmit: (data: AuthData) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ type = "login", onSubmit }) => {
  const [formData, setFormData] = useState<AuthData>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-blue_xl text-gray_b flex flex-col justify-center w-[35%] xl:w-[25%] p-10 space-y-10 shadow-2xl shadow-blue_b z-99"
    >
      <div className="flex justify-center">
        <Image src={logo} alt="logo" width={100} height={100} />
      </div>
      <h2 className="font-semibold text-3xl 2xl:text-4xl text-center text-gray_b">
        Iniciar sesión
      </h2>
      <div className="flex flex-col  ">
        <label htmlFor="username">Usuario</label>

        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
          placeholder="Escribe tu nombre de usuario..."
          className="placeholder:text-gray_l outline-none p-2 border-[1px] border-blue_l rounded-sm focus:border-blue_b transition-colors duration-200"
        />
      </div>
      <div className="text-gray_b">
        <label htmlFor="password">Contraseña</label>
        <div className="relative border-[1px] border-blue_l rounded-sm focus:border-blue_b transition-colors duration-200">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Escribe tu contraseña..."
            className="placeholder:text-gray_l w-full outline-none p-2 pr-14 "
          />
          <button
            type="button"
            className=" cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-500" />
            ) : (
              <Eye className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <Button
          type="submit"
          text={type === "login" ? "Iniciar Sesión" : "Registrarse"}
          colorText="text-white"
          colorTextHover="hover:text-white"
        ></Button>
      </div>
    </form>
  );
};

export default AuthForm;
