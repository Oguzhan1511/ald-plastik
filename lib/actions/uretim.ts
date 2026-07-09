"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { requireAuth } from "@/lib/auth-guard";
import { parseIntInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Üretim Kayıtları Listesi
// ─────────────────────────────────────────────
export async function getProductionRecords(limit?: number) {
  await requireAuth();
  return prisma.productionRecord.findMany({
    orderBy: { date: "desc" },
    take: limit,
    include: {
      product: true,
      stockMovements: {
        include: { rawMaterial: true },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Üretim Kaydı Oluştur (Transaction + Stok Kontrolü)
// ─────────────────────────────────────────────
export async function createProductionRecord(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = formData.get("description") as string;
  const dateStr = formData.get("date") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const quantity = parseIntInput(quantityStr, "Üretilen adet");
  if (quantity <= 0) throw new Error("Üretilen adet pozitif bir tam sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  // Ürün ve reçetelerini al
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      recipes: {
        include: { rawMaterial: true },
      },
    },
  });

  if (!product) throw new Error("Seçilen ürün bulunamadı.");
  if (product.recipes.length === 0) {
    throw new Error(`"${product.name}" ürünü için reçete tanımlanmamış. Önce /urunler sayfasından reçete ekleyin.`);
  }

  // ─── Stok Yeterlilik Kontrolü (işlem öncesi — kullanıcıya hızlı geri bildirim) ───
  const stockErrors: string[] = [];

  for (const recipe of product.recipes) {
    const required = new Decimal(recipe.quantityPerUnit).mul(quantity);
    const available = new Decimal(recipe.rawMaterial.currentStock);

    if (available.lessThan(required)) {
      stockErrors.push(
        `Yetersiz stok: ${recipe.rawMaterial.name} — Gereken: ${required.toFixed(2)} ${recipe.rawMaterial.unit}, Mevcut: ${available.toFixed(2)} ${recipe.rawMaterial.unit}`
      );
    }
  }

  if (stockErrors.length > 0) {
    throw new Error(stockErrors.join("\n"));
  }

  // ─── Transaction: Kayıt + Stok Düşümü ───
  const result = await prisma.$transaction(async (tx) => {
    // 1. Üretim kaydını oluştur
    const productionRecord = await tx.productionRecord.create({
      data: {
        productId,
        quantity,
        date,
        description: description?.trim() || null,
      },
    });

    // 2. Her hammadde için stok düş + hareket kaydet
    // updateMany + where: { currentStock: { gte: deductAmount } }
    // ile transaction içinde de race condition'a karşı ikinci kontrol yapılır.
    const movements = [];
    for (const recipe of product.recipes) {
      const deductAmount = new Decimal(recipe.quantityPerUnit).mul(quantity);

      const updateResult = await tx.rawMaterial.updateMany({
        where: {
          id: recipe.rawMaterialId,
          currentStock: { gte: deductAmount.toNumber() },
        },
        data: { currentStock: { decrement: deductAmount.toNumber() } },
      });

      // count === 0 → stok bu arada başka bir işlemle düşmüş
      if (updateResult.count === 0) {
        throw new Error(
          `Yetersiz stok: ${recipe.rawMaterial.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`
        );
      }

      await tx.stockMovement.create({
        data: {
          rawMaterialId: recipe.rawMaterialId,
          type: "URETIM_CIKISI",
          amount: deductAmount.toNumber(),
          date,
          description: `${product.name} - ${quantity} adet üretim`,
          productionRecordId: productionRecord.id,
        },
      });

      movements.push({
        rawMaterialName: recipe.rawMaterial.name,
        unit: recipe.rawMaterial.unit,
        amount: deductAmount.toNumber(),
      });
    }

    return { productionRecord, movements, productName: product.name, quantity };
  });

  revalidatePath("/uretim");
  revalidatePath("/hammaddeler");
  revalidatePath("/hareketler");
  revalidatePath("/");

  return { success: true, data: result };
}
