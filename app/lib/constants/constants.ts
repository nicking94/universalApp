export const TRIAL_CREDENTIALS = {
  username: "demo",
  password: "demo",
  isTrial: true,
};

export const USERS = [
  //  Administrador
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_1,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_1,
    id: 1,
    isTrial: false,
  },
  //  Demo
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_2,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_2,
    id: 2,
    isTrial: true,
  },
  //  Cliente actual 1
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_3,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_3,
    id: 3,
    isTrial: false,
  },
];
export const PAYMENT_NOTIFICATION_USERNAME = "El pollo loco";

export const APP_VERSION = "1.4.8";
