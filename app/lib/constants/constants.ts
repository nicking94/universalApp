export const TRIAL_CREDENTIALS = {
  username: "demo",
  password: "demo",
  isTrial: true,
};
export const USERS = [
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_2,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_2,
    id: 1,
    isTrial: true,
  },
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_1,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_1,
    id: 2,
    isTrial: false,
  },
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_3,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_3,
    id: 3,
    isTrial: false,
  },
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_4,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_4,
    id: 4,
    isTrial: false,
  },
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_5,
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_5,
    id: 5,
    isTrial: false,
  },
];
export const APP_VERSION = "1.4.7";
