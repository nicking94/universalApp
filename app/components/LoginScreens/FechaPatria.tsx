"use client";

import React from "react";

interface FechaPatriaProps {
  title?: string;
  email?: string;
  whatsappNumber?: string;
  whatsappLink?: string;
  className?: string;
  cardClassName?: string;
  titleClassName?: string;
  textClassName?: string;
  linkClassName?: string;
  rayCount?: number;
  rayDelay?: number;
}

const FechaPatria: React.FC<FechaPatriaProps> = ({
  title = "Contacto",
  email = "universalappcontacto@gmail.com",
  whatsappNumber = "+54 26130771477",
  whatsappLink = "https://wa.me/5492613077147",
  className = "w-[65%] xl:w-[75%] flex flex-col justify-center bg-gradient-to-bl from-blue_m to-blue_xl",
  cardClassName = "shadow-lg shadow-yellow-100 rounded-full w-75 h-75 z-10 space-y-2 flex flex-col items-center justify-center text-center relative overflow-visible",
  titleClassName = "italic text-4xl font-medium text-blue_b",
  textClassName = "text-lg text-blue_b italic",
  linkClassName = "border-b-2 border-blue_xl cursor-pointer hover:text-blue_m transition-colors duration-300",
  rayCount = 12,
  rayDelay = 0.8,
}) => {
  return (
    <div className={className}>
      <div className="bg-gradient-to-bl from-blue_xl to-blue_xl flex justify-center text-center relative">
        <div
          className={cardClassName}
          style={{
            background:
              "radial-gradient(circle at center, #fef9c3 0%, #fef3c7 40%, #fde68a 90%)",
            transition: "all 0.3s ease-out",
          }}
        >
          <h1 className={titleClassName}>{title}</h1>
          <p className={textClassName}>Email: {email}</p>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
          >
            <p
              className={`${textClassName} hover:scale-105 transition-all duration-300`}
            >
              Whatsapp: {whatsappNumber}
            </p>
          </a>

          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: rayCount }).map((_, i) => {
              const rotation = i * (360 / rayCount);
              const delay = `${i * rayDelay}s`;
              return (
                <div
                  key={i}
                  className="absolute w-[0.15rem] h-37 bottom-[50%] left-[50%] origin-bottom -translate-x-1/2 ray-pulse rounded-full"
                  style={
                    {
                      "--rotation": `${rotation}deg`,
                      "--delay": delay,
                      transform: `rotate(${rotation}deg) translateY(-100%)`,
                      background:
                        "linear-gradient(to bottom, rgba(254, 230, 165, 0.7), rgba(254, 220, 125, 0.9))",
                      transition: "all 0.3s ease-out",
                    } as React.CSSProperties
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FechaPatria;
