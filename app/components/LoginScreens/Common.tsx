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
const Common: React.FC<CommonProps> = ({
  title = "Contacto",
  email = "universalweb94@gmail.com",
  whatsappNumber = "+54 26130771477",
  whatsappLink = "https://wa.me/5492613077147",
  titleClassName = "italic text-5xl mb-2 text-center font-medium text-blue_b",
  textClassName = "text-lg text-blue_b italic",
  linkClassName = "border-b-2 border-blue_xl cursor-pointer hover:text-blue_m transition-colors duration-300",
}) => {
  return (
    <div className="flex items-center justify-center w-[65%] xl:w-[75%]  bg-gradient-to-bl from-blue_m to-blue_xl">
      <div>
        <Image className="rounded-full w-75 h-75" src={logo} alt="User Logo" />
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
      </div>
    </div>
  );
};

export default Common;
