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
  //  Cliente 1
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_3,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_3,
    id: 3,
    isTrial: false,
    paymentReminderDay: 8,
  },
  //  Cliente 2
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_4,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_4,
    id: 4,
    isTrial: false,
    paymentReminderDay: 3,
  },
  //  Cliente 3
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_5,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_5,
    id: 5,
    isTrial: false,
    paymentReminderDay: 10,
  },
  //  Cliente 4
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_6,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_6,
    id: 6,
    isTrial: false,
    paymentReminderDay: 26,
  },
  //  Cliente 5
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_7,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_7,
    id: 7,
    isTrial: false,
    paymentReminderDay: 10,
  },
];
export const PAYMENT_REMINDERS_CONFIG = [
  {
    username: "El pollo loco",
    reminderDay: 8,
  },
  {
    username: "CMTECNOSTORE",
    reminderDay: 3,
  },
  {
    username: "Baronguille356",
    reminderDay: 10,
  },
  {
    username: "CaroPerfu",
    reminderDay: 26,
  },
  {
    username: "brune2804",
    reminderDay: 10,
  },
];

export const APP_VERSION = "1.5.1";
