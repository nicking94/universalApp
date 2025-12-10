export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "./context/SidebarContext";
import SessionChecker from "./components/SessionChecker";
import { RubroProvider } from "./context/RubroContext";
import { NotificationProvider } from "./context/NotificationContext";
import { BusinessDataProvider } from "./context/BusinessDataContext";
import { AuthProvider } from "./context/AuthContext";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Universal App",
  description:
    "Software de gestión para PyMEs. Métricas, Stock, Ventas, Cuentas corrientes, Proveedores y más...",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <BusinessDataProvider>
        <NotificationProvider>
          <RubroProvider>
            <SidebarProvider>
              <html lang="es">
                <body className={`${roboto.variable} antialiased`}>
                  <div className="hidden md:block">
                    <main>
                      {children}
                      <SessionChecker />
                    </main>
                  </div>
                  <div className="md:hidden fixed inset-0 bg-white flex items-center justify-center p-4">
                    <p className="text-center text-blue_b text-lg font-semibold">
                      Próximamente disponible en dispositivos moviles
                    </p>
                  </div>
                </body>
              </html>
            </SidebarProvider>
          </RubroProvider>
        </NotificationProvider>
      </BusinessDataProvider>
    </AuthProvider>
  );
}
