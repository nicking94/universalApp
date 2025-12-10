"use client";

import React from "react";
import { motion } from "framer-motion";
import logo from "@/public/logo.png";
import Image from "next/image";
import {
  Language as GlobeIcon,
  Message as MessageCircleIcon,
} from "@mui/icons-material";

type CommonProps = {
  title?: string;
  email?: string;
  whatsappNumber?: string;
  whatsappLink?: string;
  titleClassName?: string;
  textClassName?: string;
  linkClassName?: string;
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const Navidad: React.FC<CommonProps> = ({
  title = "🎄🎄🎄🎄🎄🎄🎄",
  whatsappNumber = "+54 26130771477",
  whatsappLink = "https://wa.me/5492613077147",
  titleClassName = "text-4xl mb-6 text-center font-bold text-[#2d78b9]",
  textClassName = "text-white font-semibold text-lg",
}) => {
  return (
    <motion.div
      className="flex items-center justify-center w-[65%] xl:w-[75%] bg-gradient-to-br from-blue_xl via-white to-blue_m relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <motion.div
        className="absolute top-10 left-10 text-4xl"
        animate={{ y: [-10, 10, -10] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      >
        📅
      </motion.div>

      <motion.div
        className="absolute top-20 right-16 text-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        ✨
      </motion.div>

      <motion.div
        className="absolute bottom-20 left-20 text-2xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        🕯️
      </motion.div>

      <motion.div
        className="absolute bottom-10 right-10 text-3xl"
        animate={{ y: [-10, 10, -10] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      >
        🎀
      </motion.div>

      {/* Luces de anticipación */}
      <div className="absolute top-0 left-0 right-0 flex justify-around">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="w-3 h-8 rounded-t-full"
            style={{
              backgroundColor: ["#2d78b9", "#268ed4", "#85c1e9"][i % 3],
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          />
        ))}
      </div>

      {/* Estrellas titilantes */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#268ed4] text-lg"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeInOut",
            }}
          >
            ✨
          </motion.div>
        ))}
      </div>

      {/* Hojitas cayendo suavemente */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-[#2d78b9] text-xl"
            style={{
              left: `${10 + i * 8}%`,
            }}
            custom={i}
            initial={{ y: -100, rotate: 0, opacity: 0 }}
            animate={{
              y: [-100, 1200],
              rotate: [0, 360],
              opacity: [0, 0.8, 0.8, 0],
            }}
            transition={{
              duration: 15 + i * 2,
              repeat: Infinity,
              delay: i * 1.2,
              ease: "linear",
            }}
          >
            🍃
          </motion.div>
        ))}
      </div>

      <motion.div
        className="text-center z-10 backdrop-blur-sm rounded-2xl p-8 mx-4"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Logo con decoración de anticipación */}
        <motion.div
          className="relative inline-block mb-6"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <motion.div
            className="absolute -top-2 -right-2 text-2xl"
            animate={{
              y: [0, -20, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            📦
          </motion.div>

          <motion.div
            className="absolute -bottom-2 -left-2 text-2xl"
            animate={{
              y: [0, -15, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 0.3,
              ease: "easeInOut",
            }}
          >
            🎁
          </motion.div>

          <div className="relative">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 15,
                delay: 0.2,
              }}
            >
              <Image
                className="w-48 h-48 mx-auto rounded-full border-4 border-[#2d78b9] shadow-lg"
                src={logo}
                alt="User Logo"
              />
            </motion.div>

            {/* Efecto de resplandor suave */}
            <motion.div
              className="absolute -inset-4 border-2 border-[#268ed4] rounded-full opacity-20"
              animate={{
                opacity: [0.1, 0.3, 0.1],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          <motion.div
            className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-3xl text-[#268ed4]"
            animate={{
              opacity: [0.7, 1, 0.7],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            ⭐
          </motion.div>
        </motion.div>

        {/* Título principal */}
        <motion.h1
          className={titleClassName}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {title}
        </motion.h1>

        {/* Información de contacto - Simplificada como enlaces */}
        <motion.div
          className="space-y-4 mb-6"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.a
            href="https://www.universalappwebsite.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-3 bg-blue_b p-4 rounded-lg transition-all duration-200 hover:bg-blue_m hover:shadow-md group"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <GlobeIcon className="w-6 h-6 text-white" />
            <p className={textClassName}>Visita nuestro sitio web</p>
          </motion.a>

          <motion.a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center space-x-3 bg-blue_b p-4 rounded-lg transition-all duration-200 hover:bg-green-600 hover:shadow-md group"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          >
            <MessageCircleIcon className="w-6 h-6 text-white" />
            <p className={textClassName}>Whatsapp: {whatsappNumber}</p>
          </motion.a>
        </motion.div>

        {/* Elementos de decoración sutiles */}
        <motion.div
          className="flex justify-center space-x-4 mt-6"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        >
          {["🎄", "🎄", "🎄", "🎄", "🎄", "🎄", "🎄"].map((icon, index) => (
            <motion.span
              key={index}
              className="text-2xl text-[#2d78b9]"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, index % 2 === 0 ? -5 : 5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: index * 0.2,
              }}
            >
              {icon}
            </motion.span>
          ))}
        </motion.div>

        {/* Mensaje de anticipación */}
        <motion.div
          className="mt-6 p-4 bg-[#eaf6ff] rounded-lg border-2 border-[#85c1e9] transition-all duration-300 group"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
          whileHover={{
            scale: 1.02,
            y: -2,
            boxShadow: "0 10px 25px -5px rgba(45, 120, 185, 0.3)",
          }}
        >
          <p className="text-[#2d78b9] font-medium text-lg  transition-colors duration-300">
            Preparate para cerrar el año con las mejores ventas
          </p>
        </motion.div>

        {/* Adornos laterales sutiles */}
        <motion.div
          className="absolute -left-4 top-1/2 transform -translate-y-1/2 text-2xl text-[#85c1e9]"
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          🎁
        </motion.div>

        <motion.div
          className="absolute -right-4 top-1/2 transform -translate-y-1/2 text-2xl text-[#268ed4]"
          animate={{
            opacity: [0.6, 1, 0.6],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: 1,
            ease: "easeInOut",
          }}
        >
          ✨
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default Navidad;
