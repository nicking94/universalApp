"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      router.replace("/login");
    };

    initializeApp();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen capitalize bg-gradient-to-bl from-blue_m to-blue_b">
      <p className="text-xl text-white">Cargando aplicación...</p>
    </div>
  );
}
