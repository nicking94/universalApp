"use client";
import { saveAs } from "file-saver";
import { useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import {
  Box,
  Typography,
  CircularProgress,
  Divider,
  Alert,
  AlertTitle,
  Stack,
} from "@mui/material";
import {
  Download as DownloadIcon,
  Description as DescriptionIcon,
  Backup as BackupIcon,
  CloudUpload as CloudUploadIcon,
} from "@mui/icons-material";
import { db } from "@/app/database/db";
import { Payment, Product, Sale, Rubro } from "@/app/lib/types/types";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import ImportFileButton from "@/app/components/ImportFileButton";
import Notification from "@/app/components/Notification";
import Button from "@/app/components/Button";

export default function ImportExportPage() {
  const [jsonLoading, setJsonLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [notification, setNotification] = useState<{
    isOpen: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isOpen: false, message: "", type: "info" });

  const showNotification = (
    message: string,
    type: "success" | "error" | "info" = "info",
    duration: number = 5000
  ) => {
    setNotification({ isOpen: true, message, type });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, isOpen: false }));
    }, duration);
  };

  // Función para importar desde Excel
  const importExcelData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setExcelLoading(true);
    try {
      const data = await readExcelFile(file);
      const processed = await processExcelProducts(data);
      showNotification(
        `Productos importados exitosamente: ${processed.length} procesados`,
        "success"
      );
    } catch (error) {
      console.error("Error al importar Excel:", error);
      showNotification(
        `Error al importar Excel: ${
          error instanceof Error ? error.message : "Error desconocido"
        }`,
        "error"
      );
    } finally {
      setExcelLoading(false);
      event.target.value = "";
    }
  };

  // Leer archivo Excel
  const readExcelFile = (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            worksheet,
            {
              raw: false,
              defval: "",
            }
          );
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Error al leer el archivo Excel"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  // Procesar productos del Excel
  const processExcelProducts = async (excelData: Record<string, unknown>[]) => {
    const processedProducts: Product[] = [];
    const errors: string[] = [];

    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      const rowNumber = i + 2; // +2 porque la fila 1 es el encabezado

      try {
        // Mapear columnas del Excel a campos del producto
        const productData: Partial<Product> = {
          name:
            (row["Nombre"] as string)?.trim() ||
            (row["name"] as string)?.trim(),
          barcode:
            (row["Código de Barras"] as string)?.trim() ||
            (row["Barcode"] as string)?.trim() ||
            (row["barcode"] as string)?.trim(),
          stock: parseFloat(
            (row["Stock"] as string) ||
              (row["stock"] as string) ||
              (row["Cantidad"] as string) ||
              "0"
          ),
          costPrice: parseFloat(
            (row["Precio Costo"] as string) ||
              (row["Costo"] as string) ||
              (row["costPrice"] as string) ||
              "0"
          ),
          price: parseFloat(
            (row["Precio Venta"] as string) ||
              (row["Precio"] as string) ||
              (row["price"] as string) ||
              "0"
          ),
          unit: ((row["Unidad"] as string) ||
            (row["unit"] as string) ||
            "Unid.") as Product["unit"],
          category:
            (row["Categoría"] as string)?.trim() ||
            (row["category"] as string)?.trim(),
          brand:
            (row["Marca"] as string)?.trim() ||
            (row["brand"] as string)?.trim(),
          color:
            (row["Color"] as string)?.trim() ||
            (row["color"] as string)?.trim(),
          size:
            (row["Talle"] as string)?.trim() || (row["size"] as string)?.trim(),
          rubro: ((row["Rubro"] as string) ||
            (row["rubro"] as string) ||
            "comercio") as Rubro,
          description:
            (row["Descripción"] as string)?.trim() ||
            (row["description"] as string)?.trim(),
          location:
            (row["Ubicación"] as string)?.trim() ||
            (row["location"] as string)?.trim(),
          lot:
            (row["Lote"] as string)?.trim() || (row["lot"] as string)?.trim(),
          season:
            (row["Temporada"] as string)?.trim() ||
            (row["season"] as string)?.trim(),
          hasIvaIncluded:
            (row["IVA Incluido"] as string)?.toLowerCase() === "si" ||
            (row["IVA"] as string)?.toLowerCase() === "si" ||
            (row["hasIvaIncluded"] as string)?.toLowerCase() === "true" ||
            true,
          minStock: parseFloat(
            (row["Stock Mínimo"] as string) ||
              (row["minStock"] as string) ||
              "0"
          ),
          setMinStock: !!(row["Stock Mínimo"] || row["minStock"]),
        };

        // Validar campos requeridos
        if (!productData.name) {
          throw new Error(`Fila ${rowNumber}: Nombre es requerido`);
        }

        if (isNaN(productData.stock!)) {
          throw new Error(`Fila ${rowNumber}: Stock inválido`);
        }

        if (isNaN(productData.costPrice!)) {
          throw new Error(`Fila ${rowNumber}: Precio de costo inválido`);
        }

        if (isNaN(productData.price!)) {
          throw new Error(`Fila ${rowNumber}: Precio de venta inválido`);
        }

        // Convertir fecha de vencimiento si existe
        if (row["Vencimiento"] || row["Expiration"]) {
          const expiration = row["Vencimiento"] || row["Expiration"];
          if (expiration) {
            // Intentar parsear diferentes formatos de fecha
            const date = parseExcelDate(expiration);
            if (date) {
              productData.expiration = date.toISOString().split("T")[0];
            }
          }
        }

        // Buscar producto existente por barcode o nombre
        let existingProduct: Product | undefined;

        if (productData.barcode) {
          existingProduct = await db.products
            .where("barcode")
            .equals(productData.barcode)
            .first();
        }

        if (!existingProduct && productData.name) {
          const products = await db.products
            .where("name")
            .equals(productData.name)
            .toArray();

          if (products.length > 0) {
            existingProduct = products[0];
          }
        }

        // Preparar producto completo
        const now = new Date().toISOString();
        const fullProduct: Product = {
          id: existingProduct?.id || Date.now() + i,
          name: productData.name,
          barcode: productData.barcode || "",
          stock: productData.stock || 0,
          costPrice: productData.costPrice || 0,
          price: productData.price || 0,
          quantity: productData.stock || 0,
          unit: productData.unit || "Unid.",
          rubro: productData.rubro || "comercio",
          hasIvaIncluded:
            productData.hasIvaIncluded !== undefined
              ? productData.hasIvaIncluded
              : true,
          expiration: productData.expiration || "",
          category: productData.category || "",
          brand: productData.brand || "",
          color: productData.color || "",
          size: productData.size || "",
          description: productData.description || "",
          location: productData.location || "",
          lot: productData.lot || "",
          season: productData.season || "",
          customCategory: productData.category || "",
          customCategories: productData.category
            ? [
                {
                  name: productData.category,
                  rubro: productData.rubro || "comercio",
                },
              ]
            : [],
          setMinStock: productData.setMinStock || false,
          minStock: productData.minStock || 0,
          createdAt: existingProduct?.createdAt || now,
          updatedAt: now,
        };

        // Actualizar o agregar producto
        if (existingProduct) {
          await db.products.update(existingProduct.id, {
            ...fullProduct,
            id: existingProduct.id, // Mantener el ID existente
          });
          console.log(`Producto actualizado: ${fullProduct.name}`);
        } else {
          // Generar barcode automático si no existe
          if (!fullProduct.barcode) {
            fullProduct.barcode = generateAutoBarcode();
          }

          await db.products.add(fullProduct);
          console.log(`Producto agregado: ${fullProduct.name}`);
        }

        processedProducts.push(fullProduct);
      } catch (error) {
        errors.push(
          `Fila ${rowNumber}: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`
        );
      }
    }

    // Si hay errores, mostrarlos
    if (errors.length > 0) {
      throw new Error(`Errores encontrados:\n${errors.join("\n")}`);
    }

    return processedProducts;
  };

  // Función para parsear fechas de Excel
  const parseExcelDate = (excelDate: unknown): Date | null => {
    try {
      if (excelDate instanceof Date) {
        return excelDate;
      }

      if (typeof excelDate === "number") {
        // Excel dates are based on 1900 (with a bug for 1900 being a leap year)
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
      }

      if (typeof excelDate === "string") {
        // Intentar diferentes formatos
        const date = new Date(excelDate);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  // Generar código de barras automático (EAN-13)
  const generateAutoBarcode = (): string => {
    let baseCode = "";
    for (let i = 0; i < 12; i++) {
      baseCode += Math.floor(Math.random() * 10).toString();
    }

    // Calcular dígito de control EAN-13
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(baseCode[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const remainder = sum % 10;
    const checkDigit = remainder === 0 ? 0 : 10 - remainder;

    return baseCode + checkDigit.toString();
  };

  const downloadExcelTemplate = () => {
    // Datos de ejemplo para todas las unidades disponibles
    const templateData = [
      // Ejemplos básicos
      {
        Nombre: "Producto Básico",
        "Código de Barras": "1234567890123",
        Stock: "100",
        "Precio Costo": "50",
        "Precio Venta": "75",
        Unidad: "Unid.",
        Categoría: "General",
        Marca: "Marca Genérica",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Producto de ejemplo unidad básica",
        Ubicación: "Estante A1",
        Lote: "LOT001",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "10",
        Vencimiento: "2024-12-31",
      },
      // Ejemplos por unidad de medida
      {
        Nombre: "Arroz Integral",
        "Código de Barras": "7891234560123",
        Stock: "50",
        "Precio Costo": "30",
        "Precio Venta": "45",
        Unidad: "Kg",
        Categoría: "Alimentos",
        Marca: "Marca Arroz",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Arroz integral en kilogramos",
        Ubicación: "Estante B2",
        Lote: "LOT002",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "5",
        Vencimiento: "2024-10-15",
      },
      {
        Nombre: "Leche Descremada",
        "Código de Barras": "4567891230456",
        Stock: "200",
        "Precio Costo": "25",
        "Precio Venta": "40",
        Unidad: "L",
        Categoría: "Lácteos",
        Marca: "Marca Lechera",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Leche descremada en litros",
        Ubicación: "Estante C3",
        Lote: "LOT003",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "20",
        Vencimiento: "2024-08-30",
      },
      {
        Nombre: "Cable Eléctrico",
        "Código de Barras": "3216549870321",
        Stock: "500",
        "Precio Costo": "15",
        "Precio Venta": "25",
        Unidad: "M",
        Categoría: "Electricidad",
        Marca: "Marca Cable",
        Color: "Negro",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Cable eléctrico por metro",
        Ubicación: "Estante D4",
        Lote: "LOT004",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "50",
        Vencimiento: "",
      },
      {
        Nombre: "Azúcar",
        "Código de Barras": "9876543210987",
        Stock: "1000",
        "Precio Costo": "5",
        "Precio Venta": "8",
        Unidad: "Gr",
        Categoría: "Alimentos",
        Marca: "Marca Azúcar",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Azúcar en gramos",
        Ubicación: "Estante E5",
        Lote: "LOT005",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "100",
        Vencimiento: "2025-06-30",
      },
      {
        Nombre: "Perfume",
        "Código de Barras": "1472583690147",
        Stock: "300",
        "Precio Costo": "80",
        "Precio Venta": "120",
        Unidad: "Ml",
        Categoría: "Perfumería",
        Marca: "Marca Perfumes",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Perfume en mililitros",
        Ubicación: "Estante F6",
        Lote: "LOT006",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "30",
        Vencimiento: "2025-03-15",
      },
      {
        Nombre: "Cemento",
        "Código de Barras": "2583691470258",
        Stock: "2000",
        "Precio Costo": "120",
        "Precio Venta": "180",
        Unidad: "Kg",
        Categoría: "Construcción",
        Marca: "Marca Cemento",
        Color: "Gris",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Cemento por kilogramo",
        Ubicación: "Bodega Exterior",
        Lote: "LOT007",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "200",
        Vencimiento: "2024-11-30",
      },
      {
        Nombre: "Pintura Blanca",
        "Código de Barras": "3692581470369",
        Stock: "150",
        "Precio Costo": "200",
        "Precio Venta": "300",
        Unidad: "L",
        Categoría: "Pinturas",
        Marca: "Marca Pintura",
        Color: "Blanco",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Pintura blanca en litros",
        Ubicación: "Estante G7",
        Lote: "LOT008",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "15",
        Vencimiento: "2025-01-31",
      },
      {
        Nombre: "Madera",
        "Código de Barras": "6549873210654",
        Stock: "800",
        "Precio Costo": "45",
        "Precio Venta": "70",
        Unidad: "M",
        Categoría: "Maderas",
        Marca: "Marca Madera",
        Color: "Natural",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Madera por metro",
        Ubicación: "Bodega Madera",
        Lote: "LOT009",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "80",
        Vencimiento: "",
      },
      {
        Nombre: "Cerámica",
        "Código de Barras": "8527419630852",
        Stock: "600",
        "Precio Costo": "35",
        "Precio Venta": "55",
        Unidad: "M²",
        Categoría: "Cerámica",
        Marca: "Marca Cerámica",
        Color: "Beige",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Cerámica por metro cuadrado",
        Ubicación: "Estante H8",
        Lote: "LOT010",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "60",
        Vencimiento: "",
      },
      {
        Nombre: "Arena",
        "Código de Barras": "7418529630741",
        Stock: "5000",
        "Precio Costo": "15",
        "Precio Venta": "25",
        Unidad: "M³",
        Categoría: "Construcción",
        Marca: "Marca Arena",
        Color: "Amarillo",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Arena por metro cúbico",
        Ubicación: "Patio Exterior",
        Lote: "LOT011",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "500",
        Vencimiento: "",
      },
      {
        Nombre: "TV LED 55'",
        "Código de Barras": "1597534862159",
        Stock: "25",
        "Precio Costo": "1200",
        "Precio Venta": "1800",
        Unidad: "Unid.",
        Categoría: "Electrónica",
        Marca: "Marca TV",
        Color: "Negro",
        Talle: "55",
        Rubro: "comercio",
        Descripción: "Televisor LED 55 pulgadas",
        Ubicación: "Estante I9",
        Lote: "LOT012",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "3",
        Vencimiento: "",
      },
      {
        Nombre: "Clavos",
        "Código de Barras": "3571597530357",
        Stock: "10000",
        "Precio Costo": "2",
        "Precio Venta": "4",
        Unidad: "Ciento",
        Categoría: "Ferretería",
        Marca: "Marca Clavos",
        Color: "Plateado",
        Talle: "2''",
        Rubro: "comercio",
        Descripción: "Clavos por ciento",
        Ubicación: "Estante J10",
        Lote: "LOT013",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "1000",
        Vencimiento: "",
      },
      {
        Nombre: "Huevos",
        "Código de Barras": "4862159370486",
        Stock: "500",
        "Precio Costo": "40",
        "Precio Venta": "60",
        Unidad: "Docena",
        Categoría: "Alimentos",
        Marca: "Marca Huevos",
        Color: "Blanco",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Huevos por docena",
        Ubicación: "Refrigerador 1",
        Lote: "LOT014",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "50",
        Vencimiento: "2024-07-20",
      },
      {
        Nombre: "Papel Fotográfico",
        "Código de Barras": "6248371590624",
        Stock: "300",
        "Precio Costo": "150",
        "Precio Venta": "220",
        Unidad: "Cm",
        Categoría: "Papelería",
        Marca: "Marca Papel",
        Color: "Blanco",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Papel fotográfico por centímetro",
        Ubicación: "Estante K11",
        Lote: "LOT015",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "30",
        Vencimiento: "2025-04-30",
      },
      {
        Nombre: "Tornillos",
        "Código de Barras": "7531594862753",
        Stock: "8000",
        "Precio Costo": "1",
        "Precio Venta": "2",
        Unidad: "Mm",
        Categoría: "Ferretería",
        Marca: "Marca Tornillos",
        Color: "Negro",
        Talle: "5mm",
        Rubro: "comercio",
        Descripción: "Tornillos por milímetro",
        Ubicación: "Estante L12",
        Lote: "LOT016",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "800",
        Vencimiento: "",
      },
      {
        Nombre: "Harina",
        "Código de Barras": "2947385610294",
        Stock: "300",
        "Precio Costo": "20",
        "Precio Venta": "35",
        Unidad: "Kg",
        Categoría: "Alimentos",
        Marca: "Marca Harina",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Harina de trigo",
        Ubicación: "Estante M13",
        Lote: "LOT017",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "30",
        Vencimiento: "2024-09-15",
      },
      // Ejemplo sin IVA
      {
        Nombre: "Producto Sin IVA",
        "Código de Barras": "1239874560123",
        Stock: "50",
        "Precio Costo": "100",
        "Precio Venta": "150",
        Unidad: "Unid.",
        Categoría: "Exento",
        Marca: "Marca Exenta",
        Color: "",
        Talle: "",
        Rubro: "comercio",
        Descripción: "Producto exento de IVA",
        Ubicación: "Estante N14",
        Lote: "LOT018",
        Temporada: "todo el año",
        "IVA Incluido": "No",
        "Stock Mínimo": "5",
        Vencimiento: "",
      },
      // Ejemplo indumentaria
      {
        Nombre: "Camisa de Algodón",
        "Código de Barras": "7894561230789",
        Stock: "30",
        "Precio Costo": "150",
        "Precio Venta": "250",
        Unidad: "Unid.",
        Categoría: "Ropa",
        Marca: "Marca Ropa",
        Color: "Azul",
        Talle: "M",
        Rubro: "indumentaria",
        Descripción: "Camisa de algodón talle M",
        Ubicación: "Perchero 1",
        Lote: "LOT019",
        Temporada: "verano",
        "IVA Incluido": "Si",
        "Stock Mínimo": "3",
        Vencimiento: "",
      },
      {
        Nombre: "Jeans",
        "Código de Barras": "4561237890456",
        Stock: "25",
        "Precio Costo": "200",
        "Precio Venta": "350",
        Unidad: "Unid.",
        Categoría: "Ropa",
        Marca: "Marca Jeans",
        Color: "Azul",
        Talle: "32",
        Rubro: "indumentaria",
        Descripción: "Jeans talle 32",
        Ubicación: "Perchero 2",
        Lote: "LOT020",
        Temporada: "todo el año",
        "IVA Incluido": "Si",
        "Stock Mínimo": "2",
        Vencimiento: "",
      },
      {
        Nombre: "Zapatillas Deportivas",
        "Código de Barras": "3219876540321",
        Stock: "40",
        "Precio Costo": "180",
        "Precio Venta": "300",
        Unidad: "Unid.",
        Categoría: "Calzado",
        Marca: "Marca Zapatillas",
        Color: "Blanco",
        Talle: "42",
        Rubro: "indumentaria",
        Descripción: "Zapatillas deportivas talle 42",
        Ubicación: "Estante Calzado",
        Lote: "LOT021",
        Temporada: "primavera",
        "IVA Incluido": "Si",
        "Stock Mínimo": "4",
        Vencimiento: "",
      },
    ];

    // Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Productos");

    // Crear una segunda hoja con la guía de unidades
    const unidadesData = [
      { Unidad: "Unid.", Descripción: "Unidad (productos individuales)" },
      { Unidad: "Kg", Descripción: "Kilogramo (peso)" },
      { Unidad: "Gr", Descripción: "Gramo (peso pequeño)" },
      { Unidad: "L", Descripción: "Litro (líquidos)" },
      { Unidad: "Ml", Descripción: "Mililitro (líquidos pequeños)" },
      { Unidad: "M", Descripción: "Metro (longitud)" },
      { Unidad: "Cm", Descripción: "Centímetro (longitud pequeña)" },
      { Unidad: "Mm", Descripción: "Milímetro (longitud muy pequeña)" },
      { Unidad: "M²", Descripción: "Metro cuadrado (superficie)" },
      { Unidad: "M³", Descripción: "Metro cúbico (volumen)" },
      {
        Unidad: "Pulg",
        Descripción: "Pulgada (longitud, especialmente para pantallas)",
      },
      { Unidad: "Docena", Descripción: "12 unidades" },
      { Unidad: "Ciento", Descripción: "100 unidades" },
      { Unidad: "Ton", Descripción: "Tonelada (1000 kg)" },
      { Unidad: "Bulto", Descripción: "Bulto/Paquete" },
      { Unidad: "Caja", Descripción: "Caja" },
      { Unidad: "Cajón", Descripción: "Cajón" },
      { Unidad: "General", Descripción: "Unidad general" },
      { Unidad: "V", Descripción: "Voltio (electricidad)" },
      { Unidad: "A", Descripción: "Amperio (electricidad)" },
      { Unidad: "W", Descripción: "Watt (electricidad)" },
    ];

    const unidadesSheet = XLSX.utils.json_to_sheet(unidadesData);
    XLSX.utils.book_append_sheet(workbook, unidadesSheet, "Guía de Unidades");

    // Crear una tercera hoja con instrucciones
    const instruccionesData = [
      { Instrucción: "CÓMO USAR ESTA PLANTILLA" },
      {
        Instrucción:
          "1. Complete los datos de sus productos en la hoja 'Plantilla Productos'",
      },
      {
        Instrucción:
          "2. Los campos obligatorios son: Nombre, Stock, Precio Costo, Precio Venta, Unidad, Rubro",
      },
      { Instrucción: "3. Para 'IVA Incluido' escriba 'Si' o 'No'" },
      {
        Instrucción: "4. Para 'Rubro' puede usar: 'comercio' o 'indumentaria'",
      },
      {
        Instrucción:
          "5. Para 'Unidad' consulte la hoja 'Guía de Unidades' para ver todas las opciones disponibles",
      },
      {
        Instrucción:
          "6. Puede borrar las filas de ejemplo y agregar sus propios productos",
      },
      {
        Instrucción:
          "7. No modifique los nombres de las columnas (primera fila)",
      },
      {
        Instrucción:
          "8. Para fechas use el formato: AAAA-MM-DD (ej: 2024-12-31)",
      },
      { Instrucción: "9. Guarde el archivo y luego impórtelo en el sistema" },
    ];

    const instruccionesSheet = XLSX.utils.json_to_sheet(instruccionesData);
    XLSX.utils.book_append_sheet(workbook, instruccionesSheet, "Instrucciones");

    const ajustarAnchoColumnas = <T extends Record<string, unknown>>(
      sheet: XLSX.WorkSheet,
      data: T[]
    ) => {
      if (data.length === 0) return;

      const maxWidth = Object.keys(data[0]).map((key) => ({
        wch: Math.max(
          key.length,
          ...data.map((row) => String(row[key as keyof T]).length)
        ),
      }));
      sheet["!cols"] = maxWidth;
    };

    ajustarAnchoColumnas(worksheet, templateData);
    ajustarAnchoColumnas(unidadesSheet, unidadesData);
    ajustarAnchoColumnas(instruccionesSheet, instruccionesData);

    // Guardar el archivo
    XLSX.writeFile(workbook, "plantilla_productos_completa.xlsx");
    showNotification("Plantilla completa descargada exitosamente", "success");
  };

  const exportData = async () => {
    setJsonLoading(true);
    try {
      const theme = await db.theme.toArray();
      const products = await db.products.toArray();
      const priceLists = await db.priceLists.toArray();
      const productPrices = await db.productPrices.toArray();
      const sales = await db.sales.toArray();
      const dailyCashes = await db.dailyCashes.toArray();
      const payments = await db.payments.toArray();
      const customers = await db.customers.toArray();
      const suppliers = await db.suppliers.toArray();
      const supplierProducts = await db.supplierProducts.toArray();
      const notes = await db.notes.toArray();
      const budgets = await db.budgets.toArray();
      const userPreferences = await db.userPreferences.toArray();
      const businessData = await db.businessData.toArray();
      const deletedActualizations = await db.deletedActualizations.toArray();
      const notifications = await db.notifications.toArray();
      const expenses = await db.expenses.toArray();
      const expensesCategories = await db.expenseCategories.toArray();
      const trialPeriods = await db.trialPeriods.toArray();
      const appState = await db.appState.toArray();
      const returns = await db.returns.toArray();
      const customCategories = await db.customCategories.toArray();
      const promotions = await db.promotions.toArray();

      const data = {
        theme,
        products,
        priceLists,
        productPrices,
        sales,
        dailyCashes,
        payments,
        customers,
        suppliers,
        supplierProducts,
        budgets,
        notes,
        userPreferences,
        businessData,
        deletedActualizations,
        notifications,
        expenses,
        expensesCategories,
        trialPeriods,
        appState,
        returns,
        customCategories,
        promotions,
      };
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json;charset=utf-8" });
      const formattedDate = format(new Date(), "dd-MM-yyyy");

      saveAs(blob, `copia de seguridad del ${formattedDate}.json`);
      showNotification("Copia de seguridad exportada exitosamente", "success");
    } catch (error) {
      console.error("Error al exportar datos:", error);
      showNotification("Error al exportar los datos", "error");
    } finally {
      setJsonLoading(false);
    }
  };

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setJsonLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.sales && data.payments) {
        const paymentMap = new Map();
        data.payments.forEach((payment: Payment) => {
          paymentMap.set(payment.saleId, payment);
        });

        data.sales = data.sales.map((sale: Sale) => {
          const payment = paymentMap.get(sale.id);
          if (payment && payment.method === "CHEQUE") {
            return {
              ...sale,
              chequeInfo: {
                amount: payment.amount,
                status: payment.checkStatus,
                date: payment.date,
              },
            };
          }
          return sale;
        });
      }

      if (data.products && Array.isArray(data.products)) {
        data.products = data.products.map((product: Product) => {
          if (
            product.category &&
            (!product.customCategories || product.customCategories.length === 0)
          ) {
            return {
              ...product,
              customCategories: product.category
                ? [
                    {
                      name: product.category,
                      rubro: product.rubro || "comercio",
                    },
                  ]
                : [],
              category: product.category || "",
            };
          }
          return product;
        });
      }

      await db.transaction(
        "rw",
        [
          db.theme,
          db.products,
          db.priceLists,
          db.productPrices,
          db.sales,
          db.auth,
          db.dailyCashes,
          db.payments,
          db.customers,
          db.suppliers,
          db.supplierProducts,
          db.budgets,
          db.notes,
          db.userPreferences,
          db.businessData,
          db.deletedActualizations,
          db.notifications,
          db.customCategories,
          db.returns,
          db.expenses,
          db.expenseCategories,
          db.trialPeriods,
          db.appState,
          db.promotions,
        ],
        async () => {
          await Promise.all([
            db.theme.clear(),
            db.products.clear(),
            db.priceLists.clear(),
            db.productPrices.clear(),
            db.sales.clear(),
            db.auth.clear(),
            db.dailyCashes.clear(),
            db.payments.clear(),
            db.customers.clear(),
            db.suppliers.clear(),
            db.supplierProducts.clear(),
            db.budgets.clear(),
            db.notes.clear(),
            db.userPreferences.clear(),
            db.businessData.clear(),
            db.deletedActualizations.clear(),
            db.notifications.clear(),
            db.customCategories.clear(),
            db.returns.clear(),
            db.expenses.clear(),
            db.expenseCategories.clear(),
            db.trialPeriods.clear(),
            db.appState.clear(),
            db.promotions.clear(),
          ]);

          try {
            await Promise.all([
              db.theme.bulkAdd(data.theme || []),
              db.products.bulkAdd(data.products || []),
              db.priceLists.bulkAdd(data.priceLists || []),
              db.productPrices.bulkAdd(data.productPrices || []),
              db.sales.bulkPut(data.sales || []),
              db.auth.bulkAdd(data.auth || []),
              db.dailyCashes.bulkAdd(data.dailyCashes || []),
              db.payments.bulkAdd(data.payments || []),
              db.customers.bulkAdd(data.customers || []),
              db.suppliers.bulkAdd(data.suppliers || []),
              db.supplierProducts.bulkAdd(data.supplierProducts || []),
              db.budgets.bulkAdd(data.budgets || []),
              db.notes.bulkAdd(data.notes || []),
              db.userPreferences.bulkAdd(data.userPreferences || []),
              db.businessData.bulkAdd(data.businessData || []),
              db.deletedActualizations.bulkAdd(
                data.deletedActualizations || []
              ),
              db.notifications.bulkAdd(data.notifications || []),
              db.customCategories.bulkAdd(data.customCategories || []),
              db.returns.bulkAdd(data.returns || []),
              db.expenses.bulkAdd(data.expenses || []),
              db.expenseCategories.bulkAdd(data.expenseCategories || []),
              db.trialPeriods.bulkAdd(data.trialPeriods || []),
              db.appState.bulkAdd(data.appState || []),
              db.promotions.bulkAdd(data.promotions || []),
            ]);
          } catch (e) {
            console.error("Error al importar datos:", e);
            throw e;
          }
        }
      );

      showNotification(
        "Datos importados correctamente. Redirigiendo al login...",
        "success"
      );

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error("Error al importar datos:", error);
      showNotification("Error al importar los datos", "error");
    } finally {
      setJsonLoading(false);
      event.target.value = "";
    }
  };

  const handleExcelImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls,.xlsm,.xlsb,.ods";

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      // Crear un evento sintético de React
      const syntheticEvent = {
        target: {
          files: target.files,
          value: target.value,
        },
      } as React.ChangeEvent<HTMLInputElement>;

      importExcelData(syntheticEvent);
    };

    input.click();
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          p: 4,
          color: "text.secondary",
          minHeight: "calc(100vh - 64px)",
          position: "relative",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: 4,
            fontSize: { xs: "1.5rem", lg: "2rem" },
            color: "primary.main",
            textAlign: "center",
          }}
        >
          Gestión de Datos
        </Typography>

        {/* Sección de Copias de Seguridad (JSON) */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              fontSize: "1.5rem",
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <BackupIcon /> Copias de Seguridad (JSON)
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            <AlertTitle>Información</AlertTitle>
            Exporte o importe todos los datos del sistema en formato JSON. Esta
            opción es útil para realizar copias de seguridad completas.
          </Alert>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              text="Exportar Copia de Seguridad"
              icon={<DownloadIcon />}
              iconPosition="left"
              onClick={exportData}
              disabled={jsonLoading}
              loading={jsonLoading}
              variant="contained"
              size="large"
              title="Exportar todos los datos a un archivo JSON"
              ariaLabel="Exportar datos de respaldo"
              sx={{
                minWidth: { xs: "100%", sm: "300px" },
                height: "56px",
                fontSize: "1rem",
                textTransform: "uppercase",
              }}
            />
            <ImportFileButton onImport={importData} />
          </Stack>
        </Box>

        <Divider sx={{ my: 4 }} />

        {/* Sección de Importación Excel */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 600,
              mb: 3,
              fontSize: "1.5rem",
              color: "success.main",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <CloudUploadIcon /> Importar Productos desde Excel (xlsx, xls)
          </Typography>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <AlertTitle>Atención</AlertTitle>
            Esta función solo importa productos. Los productos existentes se
            actualizarán si coinciden el código de barras o el nombre. Se
            recomienda descargar la plantilla para asegurar el formato correcto.
          </Alert>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={3}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              text="Importar Excel de productos"
              icon={<DescriptionIcon />}
              iconPosition="left"
              onClick={handleExcelImportClick}
              disabled={excelLoading}
              loading={excelLoading}
              variant="contained"
              size="large"
              title="Importar productos desde archivo Excel (.xlsx, .xls)"
              ariaLabel="Importar productos desde Excel"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "success.main",
                color: "white",
                minWidth: { xs: "100%", sm: "300px" },
                height: "56px",
                fontSize: "1rem",
                "&:hover": {
                  backgroundColor: "success.dark",
                },
              }}
            />
            <Button
              text="Descargar Plantilla Excel "
              title="Descargar plantilla de prueba"
              variant="contained"
              onClick={downloadExcelTemplate}
              disabled={excelLoading}
              sx={{
                minWidth: { xs: "100%", sm: "300px" },
                height: "56px",
                fontSize: "1rem",
                bgcolor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              }}
            />
          </Stack>
        </Box>

        {(jsonLoading || excelLoading) && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 1 }}>
              Procesando...
            </Typography>
          </Box>
        )}

        <Notification
          isOpen={notification.isOpen}
          message={notification.message}
          type={notification.type}
        />
      </Box>
    </ProtectedRoute>
  );
}
