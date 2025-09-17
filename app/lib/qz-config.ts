// lib/qz-config.ts
export const QZ_CONFIG = {
  // Configuración por defecto para impresoras ESC/POS
  defaultPrinter: "NexusPOS",
  encoding: "ISO-8859-1",
  paperWidth: 80, // mm
  fontSize: 0, // 0: normal, 1: double height
};

// Función para verificar si QZ Tray está disponible
export const isQZAvailable = (): boolean => {
  return (
    typeof window !== "undefined" &&
    typeof window.qz !== "undefined" &&
    window.qz.websocket.isConnected()
  );
};

// Función para obtener la lista de impresoras disponibles
export const getAvailablePrinters = async (): Promise<string[]> => {
  if (!isQZAvailable()) return [];

  try {
    // Verificación adicional para TypeScript
    if (!window.qz) return [];

    const printers = await window.qz.printers.find();
    return printers;
  } catch (error) {
    console.error("Error obteniendo impresoras:", error);
    return [];
  }
};
