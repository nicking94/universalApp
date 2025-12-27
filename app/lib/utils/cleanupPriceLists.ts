// app/lib/utils/cleanupPriceLists.ts
import { db } from "@/app/database/db";
import { PriceList, Rubro } from "@/app/lib/types/types";

export const cleanupDuplicatePriceLists = async (): Promise<void> => {
  try {
    console.log("Iniciando limpieza de listas de precios duplicadas...");

    const allPriceLists = await db.priceLists.toArray();
    console.log(`Total de listas encontradas: ${allPriceLists.length}`);

    const rubros = Array.from(new Set(allPriceLists.map((list) => list.rubro)));

    for (const rubro of rubros) {
      if (rubro === "Todos los rubros") continue;

      const listsForRubro = allPriceLists.filter(
        (list) => list.rubro === rubro
      );
      console.log(
        `\nRubro: ${rubro}, Listas encontradas: ${listsForRubro.length}`
      );

      // Agrupar por nombre (case-insensitive) y rubro
      const groups: Map<string, PriceList[]> = new Map();

      listsForRubro.forEach((list) => {
        const key = `${list.name.toLowerCase().trim()}_${list.rubro}`;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(list);
      });

      // Procesar cada grupo
      for (const [key, lists] of groups) {
        if (lists.length > 1) {
          console.log(
            `\nEncontrados ${lists.length} duplicados para la clave "${key}":`
          );

          // Ordenar: mantener la más importante
          const sortedLists = lists.sort((a, b) => {
            // 1. Primero las por defecto
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;

            // 2. Luego las activas
            if (a.isActive !== false && b.isActive === false) return -1;
            if (a.isActive === false && b.isActive !== false) return 1;

            // 3. Luego por fecha de creación (más reciente primero)
            if (a.createdAt && b.createdAt) {
              return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
              );
            }

            // 4. Finalmente por ID (más alto = más reciente)
            return b.id - a.id;
          });

          const listToKeep = sortedLists[0];
          const listsToDelete = sortedLists.slice(1);

          console.log(
            `\nLista a mantener: ID ${listToKeep.id} ("${listToKeep.name}") en rubro ${listToKeep.rubro}`
          );

          // Eliminar duplicados
          for (const listToDelete of listsToDelete) {
            try {
              // Verificar si tiene precios asociados
              const productPricesCount = await db.productPrices
                .where("priceListId")
                .equals(listToDelete.id)
                .count();

              // Verificar si tiene ventas asociadas
              const salesCount = await db.sales
                .where("priceListId")
                .equals(listToDelete.id)
                .count();

              if (productPricesCount === 0 && salesCount === 0) {
                await db.priceLists.delete(listToDelete.id);
                console.log(
                  `  ✅ Eliminada lista duplicada: ID ${listToDelete.id} ("${listToDelete.name}") en rubro ${listToDelete.rubro}`
                );
              } else {
                console.log(
                  `  ⚠️ No se puede eliminar lista ID ${listToDelete.id} - tiene ${productPricesCount} precios y ${salesCount} ventas asociadas`
                );
              }
            } catch (error) {
              console.error(
                `  ❌ Error procesando lista ID ${listToDelete.id}:`,
                error
              );
            }
          }
        }
      }

      // Si no hay listas para este rubro, crear una por defecto
      if (listsForRubro.length === 0) {
        console.log(`\nCreando lista por defecto para rubro: ${rubro}`);
        const defaultPriceList: PriceList = {
          id: Date.now(),
          name: "General",
          rubro: rubro as Rubro,
          isDefault: true,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.priceLists.add(defaultPriceList);
        console.log(`  ✅ Lista "General" creada para rubro ${rubro}`);
      }
    }

    console.log("\n✅ Limpieza de listas de precios completada");
  } catch (error) {
    console.error("❌ Error en la limpieza:", error);
    throw error;
  }
};

// Función para ejecutar la limpieza una sola vez
export const runPriceListCleanup = async (): Promise<void> => {
  const hasRunCleanup = localStorage.getItem("priceListCleanupDone");

  if (!hasRunCleanup) {
    console.log("Ejecutando limpieza de listas de precios...");
    await cleanupDuplicatePriceLists();
    localStorage.setItem("priceListCleanupDone", "true");
    console.log("Limpieza completada y marcada como realizada");
  } else {
    console.log("Limpieza de listas de precios ya fue ejecutada anteriormente");
  }
};
