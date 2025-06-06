"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkVersionAndClean } from "./lib/utils/cacheUtils";

export default function Home() {
  const router = useRouter();
  const APP_VERSION = "1.4";

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const versionChanged = await checkVersionAndClean(APP_VERSION);

        if (versionChanged) {
          setTimeout(() => {
            router.replace("/login");
          }, 500);
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Initialization error:", error);
        router.replace("/login");
      }
    };

    initializeApp();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen capitalize bg-gradient-to-bl from-blue_m to-blue_b">
      <p className="text-2xl text-white">Cargando aplicación...</p>
    </div>
  );
}
