"use client";
import React, { useEffect, useState } from "react";
import Button from "./Button";

interface UpdateModalProps {
  isOpen: boolean;
  onUpdate: () => void;
  onLogout: () => void;
  isUpdating: boolean;
  minLoadTimePassed?: boolean;
  currentVersion: string;
  storedVersion?: string;
}

const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onUpdate,
  isUpdating,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;

    if (isUpdating) {
      setProgress(0);

      // Simular progreso durante 4 segundos
      const startTime = Date.now();
      const duration = 4000; // 4 segundos

      progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const newProgress = Math.min((elapsed / duration) * 100, 100);
        setProgress(newProgress);

        if (elapsed >= duration) {
          clearInterval(progressInterval);
        }
      }, 50);
    } else {
      setProgress(0);
    }

    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isUpdating]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-blue_b/80 bg-opacity-70 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray_b rounded-xl p-8 max-w-md w-full shadow-2xl border-2 border-blue_b">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-blue_b rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>

          <h3 className="uppercase text-2xl font-semibold text-blue_b dark:text-white mb-3">
            {isUpdating ? "Actualizando..." : "Actualización Disponible"}
          </h3>

          <p className="text-gray_m dark:text-gray_l mb-2 text-lg">
            {isUpdating
              ? "La aplicación se está actualizando..."
              : "Hay una nueva versión de la aplicación."}
          </p>
        </div>

        {!isUpdating && (
          <div className="flex flex-col space-y-3">
            <Button
              onClick={onUpdate}
              disabled={isUpdating}
              text="Actualizar Ahora"
              colorText="text-white hover:text-white"
              colorBg="bg-blue_b hover:bg-blue_m"
              colorBgHover="hover:bg-blue_m"
              width="w-full"
              height="h-12"
              py="py-3"
            />
          </div>
        )}

        {isUpdating && (
          <div className="mt-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue_b mb-2"></div>

            <p className="text-xs text-gray_m dark:text-gray_xl mt-1">
              Esto tomará unos segundos...
            </p>

            {/* Indicador de progreso */}
            <div className="mt-4 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div
                className="bg-blue_b h-2 rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${progress}%`,
                }}
              ></div>
            </div>
            <div className="text-xs text-gray_m dark:text-gray_xl mt-1">
              {Math.round(progress)}% completado
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateModal;
