export const USERS = [
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_2 || "demo",
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_2 || "demo",
    id: 1,
    isTrial: true,
  },
  {
    username: process.env.NEXT_PUBLIC_LOGIN_USERNAME_1 || "administrador",
    password: process.env.NEXT_PUBLIC_LOGIN_PASSWORD_1 || "administrador",
    id: 2,
    isTrial: false,
  },
];

export const TRIAL_CREDENTIALS = {
  username: "demo",
  password: "demo",
  isTrial: true,
};
