import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { SidebarProvider } from "./context/SidebarContext";
import TrialNotification from "./components/TrialNotification";
import SessionChecker from "./components/SessionChecker";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Universal App |Kioscos",
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
    <SidebarProvider>
      <html lang="es">
        <body className={` ${roboto.variable} antialiased hidden md:block`}>
          <main>
            {children} <SessionChecker /> <TrialNotification />
          </main>
        </body>
      </html>
    </SidebarProvider>
  );
}
