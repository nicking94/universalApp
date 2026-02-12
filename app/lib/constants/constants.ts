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
    isActive: true,
  },
  //  Demo
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_2,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_2,
    id: 2,
    isTrial: true,
    isActive: false,
  },
  //  Cliente 1
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_3,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_3,
    id: 3,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 8,
  },
  //  Cliente 2
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_4,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_4,
    id: 4,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 3,
  },
  //  Cliente 3
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_5,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_5,
    id: 5,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 10,
  },
  //  Cliente 4
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_6,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_6,
    id: 6,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 26,
  },
  //  Cliente 3
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_7,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_7,
    id: 7,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 10,
  },
  //  Cliente 5
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_8,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_8,
    id: 8,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 24,
  },

  //  Cliente 7
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_10,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_10,
    id: 11,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 1,
  },
  //  Cliente 8
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_11,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_11,
    id: 12,
    isTrial: false,
    isActive: true,
    paymentReminderDay: 4,
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
  {
    username: "Electro25",
    reminderDay: 24,
  },

  {
    username: "Kioscodreyer",
    reminderDay: 1,
  },
  {
    username: "Univentas",
    reminderDay: 4,
  },
];

export const APP_VERSION = "1.5.8";
