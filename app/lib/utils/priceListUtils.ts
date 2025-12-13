// app/lib/utils/priceListUtils.ts
import { db } from "@/app/database/db";
import { PriceList, Rubro } from "@/app/lib/types/types";

export const getProductPriceForList = async (
  productId: number,
  priceListId?: number
): Promise<number> => {
  if (!priceListId) {
    // Obtener precio base del producto
    const product = await db.products.get(productId);
    return product?.price || 0;
  }

  try {
    // Buscar precio en productPrices
    const productPrice = await db.productPrices.get([productId, priceListId]);

    if (productPrice) {
      return productPrice.price;
    }

    // Si no hay precio específico, buscar en el producto mismo
    const product = await db.products.get(productId);
    if (product?.priceListId === priceListId) {
      return product.price;
    }

    // Por defecto, precio base
    return product?.price || 0;
  } catch (error) {
    console.error("Error getting product price:", error);
    return 0;
  }
};

export const getDefaultPriceList = async (
  rubro: Rubro
): Promise<PriceList | null> => {
  try {
    const lists = await db.priceLists.where("rubro").equals(rubro).toArray();
    const defaultList = lists.find((list) => list.isDefault);
    return defaultList || (lists.length > 0 ? lists[0] : null);
  } catch (error) {
    console.error("Error getting default price list:", error);
    return null;
  }
};

export const updateProductPriceForList = async (
  productId: number,
  priceListId: number,
  price: number
): Promise<void> => {
  try {
    // Actualizar en productPrices
    await db.productPrices.put({
      productId,
      priceListId,
      price,
    });

    // También actualizar el producto si está usando esta lista
    const product = await db.products.get(productId);
    if (product?.priceListId === priceListId) {
      await db.products.update(productId, { price });
    }
  } catch (error) {
    console.error("Error updating product price:", error);
    throw error;
  }
};
