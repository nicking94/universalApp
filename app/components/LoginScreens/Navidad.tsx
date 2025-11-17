"use client";

import React from "react";
import logo from "../../../public/logo.png";
import Image from "next/image";

type CommonProps = {
  title?: string;
  email?: string;
  whatsappNumber?: string;
  whatsappLink?: string;
  titleClassName?: string;
  textClassName?: string;
  linkClassName?: string;
};

const Navidad: React.FC<CommonProps> = ({
  title = "🎄🌟✨🎄",
  email = "universalappcontacto@gmail.com",
  whatsappNumber = "+54 26130771477",
  whatsappLink = "https://wa.me/5492613077147",
  titleClassName = "text-4xl mb-6 text-center font-bold text-[#2d78b9]",
  textClassName = "text-white font-semibold text-lg",
  linkClassName = "border-b-2 border-[#85c1e9] cursor-pointer hover:text-[#2d78b9] transition-colors duration-300",
}) => {
  return (
    <div className="flex items-center justify-center w-[65%] xl:w-[75%] bg-gradient-to-br from-blue_xl via-white to-blue_m relative overflow-hidden">
      {/* Elementos de anticipación navideña */}
      <div className="absolute top-10 left-10 text-4xl animate-float-calendar">
        📅
      </div>
      <div className="absolute top-20 right-16 text-3xl animate-pulse">✨</div>
      <div className="absolute bottom-20 left-20 text-2xl animate-glow">🕯️</div>
      <div
        className="absolute bottom-10 right-10 text-3xl animate-float"
        style={{ animationDelay: "0.5s" }}
      >
        🎀
      </div>

      {/* Luces de anticipación */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-3 h-8 rounded-t-full animate-pulse"
            style={{
              backgroundColor: ["#2d78b9", "#268ed4", "#85c1e9"][i % 3],
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>

      {/* Estrellas titilantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute text-[#268ed4] text-lg animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Hojitas cayendo suavemente */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="absolute text-[#2d78b9] text-xl animate-fall-leaves"
            style={{
              left: `${10 + i * 8}%`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${12 + i * 1}s`,
            }}
          >
            🍃
          </div>
        ))}
      </div>

      <div className="text-center z-10 backdrop-blur-sm rounded-2xl p-8   mx-4">
        {/* Logo con decoración de anticipación */}
        <div className="relative inline-block mb-6">
          <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
            📦
          </div>
          <div
            className="absolute -bottom-2 -left-2 text-2xl animate-bounce"
            style={{ animationDelay: "0.3s" }}
          >
            🎁
          </div>
          <div className="relative">
            <Image
              className="w-48 h-48 mx-auto rounded-full border-4 border-[#2d78b9] shadow-lg"
              src={logo}
              alt="User Logo"
            />
            {/* Efecto de resplandor suave */}
            <div className="absolute -inset-4 border-2 border-[#268ed4] rounded-full opacity-20 animate-pulse-slow"></div>
          </div>
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-3xl text-[#268ed4] animate-glow">
            ⭐
          </div>
        </div>

        {/* Título principal */}
        <h1 className={titleClassName}>{title}</h1>

        {/* Información de contacto */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-center space-x-3 bg-blue_b p-4 rounded-lg hover:shadow-lg transition-all duration-300 ">
            <span className="text-2xl">📧</span>
            <p className={textClassName}>Email: {email}</p>
          </div>

          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`block bg-blue_b p-4 rounded-lg hover:shadow-xl transition-all duration-300 hover:bg-blue_m ${linkClassName}`}
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-2xl">💬</span>
              <p
                className={`${textClassName} transition-transform duration-300`}
              >
                Whatsapp: {whatsappNumber}
              </p>
            </div>
          </a>
        </div>

        {/* Elementos de decoración sutiles */}
        <div className="flex justify-center space-x-4 mt-6">
          <span
            className="text-2xl text-[#2d78b9] animate-pulse"
            style={{ animationDelay: "0.1s" }}
          >
            🔔
          </span>
          <span
            className="text-2xl text-[#268ed4] animate-pulse"
            style={{ animationDelay: "0.3s" }}
          >
            🕯️
          </span>
          <span
            className="text-2xl text-[#85c1e9] animate-pulse"
            style={{ animationDelay: "0.5s" }}
          >
            ❄️
          </span>
          <span
            className="text-2xl text-[#2d78b9] animate-pulse"
            style={{ animationDelay: "0.7s" }}
          >
            🎄
          </span>
        </div>

        {/* Mensaje de anticipación */}
        <div className="mt-6 p-4 bg-[#eaf6ff] rounded-lg border-2 border-[#85c1e9] hover:shadow-md transition-all duration-300">
          <p className="text-[#2d78b9] font-medium text-lg">
            🎯 Preparate para cerrar el año con las mejores ventas
          </p>
        </div>

        {/* Adornos laterales sutiles */}
        <div className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-2xl text-[#85c1e9] animate-pulse-slow">
          🎁
        </div>
        <div
          className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-2xl text-[#268ed4] animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        >
          ✨
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes float-calendar {
          0%,
          100% {
            transform: translateY(0px) rotate(-5deg);
          }
          50% {
            transform: translateY(-15px) rotate(5deg);
          }
        }

        @keyframes fall-leaves {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 0.8;
          }
          90% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes twinkle {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        @keyframes glow {
          0%,
          100% {
            opacity: 0.7;
            filter: brightness(1);
          }
          50% {
            opacity: 1;
            filter: brightness(1.5);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.6;
          }
          50% {
            opacity: 1;
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-float-calendar {
          animation: float-calendar 4s ease-in-out infinite;
        }

        .animate-fall-leaves {
          animation: fall-leaves linear infinite;
        }

        .animate-twinkle {
          animation: twinkle ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Navidad;
