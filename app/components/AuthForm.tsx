"use client";
import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "./Button";
import { AuthData } from "../lib/types/types";
import Image from "next/image";
import Logo from "../../public/logo.png";

interface AuthFormProps {
  type?: "login" | "register";
  onSubmit: (data: AuthData) => void;
  showTermsCheckbox?: boolean;
  acceptedTerms?: boolean;
  onTermsCheckboxChange?: (accepted: boolean) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  type = "login",
  onSubmit,
  showTermsCheckbox = false,
  acceptedTerms = false,
  onTermsCheckboxChange,
}) => {
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
    if (showTermsCheckbox && !acceptedTerms) {
      return;
    }
    onSubmit(formData);
  };

  const handleTermsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onTermsCheckboxChange) {
      onTermsCheckboxChange(e.target.checked);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-blue_xl text-gray_b flex flex-col justify-center w-[35%] xl:w-[25%] p-10 space-y-6 shadow-2xl shadow-blue_b z-40"
    >
      <div className="flex justify-center">
        <Image src={Logo} alt="logo" width={100} height={100} />
      </div>
      <h2 className="font-semibold text-3xl 2xl:text-4xl text-center text-gray_b">
        {type === "login" ? "Iniciar sesión" : "Registrarse"}
      </h2>

      <div className="flex flex-col">
        <label htmlFor="username">Usuario</label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
          placeholder="Escribe tu nombre de usuario..."
          className="placeholder:text-gray_l outline-none p-2 border-[1px] border-blue_l rounded-sm focus:border-blue_b transition-colors duration-300"
        />
      </div>

      <div className="text-gray_b">
        <label htmlFor="password">Contraseña</label>
        <div className="relative border-[1px] border-blue_l rounded-sm focus:border-blue_b transition-colors duration-300">
          <input
            type={showPassword ? "text" : "password"}
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            placeholder="Escribe tu contraseña..."
            className="placeholder:text-gray_l w-full outline-none p-2 pr-14"
          />
          <button
            type="button"
            className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray_m" />
            ) : (
              <Eye className="h-5 w-5 text-gray_m" />
            )}
          </button>
        </div>
      </div>

      {showTermsCheckbox && (
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              id="terms-checkbox"
              type="checkbox"
              checked={acceptedTerms}
              onChange={handleTermsChange}
              className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded "
            />
            <label
              htmlFor="terms-checkbox"
              className="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300"
            >
              Acepto los términos y condiciones
            </label>
          </div>
          <a
            href="/terminos-y-condiciones"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 text-xs hover:underline"
          >
            Leer términos y condiciones
          </a>
        </div>
      )}

      <div className="flex items-center justify-center pt-4">
        <Button
          type="submit"
          text={type === "login" ? "Iniciar Sesión" : "Registrarse"}
          colorText="text-white"
          colorTextHover="hover:text-white"
          disabled={showTermsCheckbox && !acceptedTerms}
        />
      </div>
    </form>
  );
};

export default AuthForm;
