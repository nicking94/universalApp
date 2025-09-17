"use client";
import { useEffect, useRef, useState } from "react";
import Input from "./Input";
import { Barcode } from "lucide-react";

interface BarcodeScannerProps {
  value: string;
  onChange: (value: string) => void;
  onScanComplete?: (code: string) => void;
  placeholder?: string;
  className?: string;
}

export default function BarcodeScanner({
  value,
  onChange,
  onScanComplete,
  placeholder = "Escanear o ingresar código manualmente",
}: BarcodeScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInputTimeRef = useRef<number>(0);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    // Detectar si es macOS
    setIsMac(navigator.platform.includes("Mac"));

    // Enfoque con retraso para macOS
    const timer = setTimeout(
      () => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      },
      isMac ? 200 : 100
    );

    return () => clearTimeout(timer);
  }, [isMac]);

  const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const now = Date.now();

    onChange(newValue);

    // Configuración diferente para macOS
    const minLength = isMac ? 3 : 8;
    const timeThreshold = isMac ? 100 : 30;

    if (newValue.length >= minLength) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const isScannerInput = now - lastInputTimeRef.current < timeThreshold;

      timeoutRef.current = setTimeout(
        () => {
          if (onScanComplete) {
            onScanComplete(newValue);
            if (inputRef.current) {
              // Limpiar después del escaneo para macOS
              setTimeout(() => {
                if (inputRef.current) {
                  inputRef.current.value = "";
                  inputRef.current.focus();
                }
              }, 50);
            }
          }
        },
        isMac ? 150 : isScannerInput ? 50 : 500
      );
    }

    lastInputTimeRef.current = now;
  };

  // Handler especial para macOS
  const handleMacKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isMac && e.key === "Enter" && value.length >= 3) {
      e.preventDefault();
      if (onScanComplete) {
        onScanComplete(value);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    }
  };

  return (
    <Input
      type="text"
      ref={inputRef}
      value={value}
      onChange={handleBarcodeChange}
      onKeyDown={handleMacKeyDown}
      placeholder={placeholder}
      autoFocus={true}
      icon={<Barcode size={18} />}
    />
  );
}
