const AuthLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  return (
    <div className="bg-gradient-to-bl from-blue_l to-blue_xl">{children}</div>
  );
};

export default AuthLayout;
