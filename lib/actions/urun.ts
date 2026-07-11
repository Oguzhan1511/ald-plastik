"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { parseDecimalInput } from "@/lib/utils";

// ─────────────────────────────────────────────
// Ürün Listesi
// ─────────────────────────────────────────────
export async function getProducts() {
  await requireAuth();
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      recipes: {
        include: {
          rawMaterial: true,
          componentProduct: true,
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// Ürün Oluştur
// ─────────────────────────────────────────────
export async function createProduct(formData: FormData) {
  await requireAuth();

  const name = formData.get("name") as string;
  const codeRaw = (formData.get("code") as string)?.trim() || null;

  if (!name?.trim()) throw new Error("Ürün adı zorunludur.");

  const existing = await prisma.product.findUnique({ where: { name: name.trim() } });
  if (existing) throw new Error(`"${name}" adında bir ürün zaten mevcut.`);

  if (codeRaw) {
    const existingCode = await prisma.product.findUnique({ where: { code: codeRaw } });
    if (existingCode) throw new Error(`"${codeRaw}" kodu zaten başka bir ürüne ait.`);
  }

  await prisma.product.create({
    data: { name: name.trim(), code: codeRaw },
  });

  revalidatePath("/urunler");
  return { success: true };
}

// ─────────────────────────────────────────────
// Ürün Güncelle
// ─────────────────────────────────────────────
export async function updateProduct(id: string, formData: FormData) {
  await requireAuth();

  const name = formData.get("name") as string;
  const codeRaw = (formData.get("code") as string)?.trim() || null;

  if (!name?.trim()) throw new Error("Ürün adı zorunludur.");

  const existing = await prisma.product.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) throw new Error(`"${name}" adında başka bir ürün zaten mevcut.`);

  if (codeRaw) {
    const existingCode = await prisma.product.findFirst({
      where: { code: codeRaw, NOT: { id } },
    });
    if (existingCode) throw new Error(`"${codeRaw}" kodu zaten başka bir ürüne ait.`);
  }

  await prisma.product.update({
    where: { id },
    data: { name: name.trim(), code: codeRaw },
  });

  revalidatePath("/urunler");
  return { success: true };
}

// ─────────────────────────────────────────────
// Ürün Sil
// ─────────────────────────────────────────────
export async function deleteProduct(id: string) {
  await requireAuth();

  const productionCount = await prisma.productionRecord.count({
    where: { productId: id },
  });
  if (productionCount > 0) {
    throw new Error(
      "Bu ürüne ait üretim kaydı bulunuyor. Ürün silinemez."
    );
  }

  // Recipes will be cascade deleted
  await prisma.product.delete({ where: { id } });

  revalidatePath("/urunler");
  revalidatePath("/uretim");
  return { success: true };
}

// ─────────────────────────────────────────────
// Reçete Satırı Ekle
// ─────────────────────────────────────────────
export async function addRecipeLine(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const rawMaterialId = (formData.get("rawMaterialId") as string) || null;
  const componentProductId = (formData.get("componentProductId") as string) || null;

  if (!productId) throw new Error("\u00dcr\u00fcn se\u00e7imi zorunludur.");
  if (!rawMaterialId && !componentProductId)
    throw new Error("Hammadde veya alt \u00fcr\u00fcn se\u00e7imi zorunludur.");
  if (rawMaterialId && componentProductId)
    throw new Error("Ayn\u0131 anda hem hammadde hem alt \u00fcr\u00fcn se\u00e7ilemez.");

  const quantityRaw = (formData.get("quantityPerUnit") as string)?.trim();
  const quantityPerUnit = quantityRaw ? parseDecimalInput(quantityRaw, "Miktar") : 0;
  if (quantityPerUnit < 0) throw new Error("Miktar negatif olamaz.");

  // Fire oran\u0131: kullan\u0131c\u0131 y\u00fczde olarak girer (\u00f6rn. "3" \u2192 0.03)
  const wastePercentageRaw = (formData.get("wastePercentage") as string)?.trim();
  let wastePercentage = 0;
  if (wastePercentageRaw) {
    const parsed = parseFloat(wastePercentageRaw);
    if (isNaN(parsed) || parsed < 0) throw new Error("Fire oran\u0131 0 veya pozitif bir say\u0131 olmal\u0131d\u0131r.");
    wastePercentage = parsed / 100;
  }

  // Tekrar kontrol\u00fc (@@unique kald\u0131r\u0131ld\u0131\u011f\u0131 i\u00e7in findFirst ile yap\u0131l\u0131r)
  if (rawMaterialId) {
    const existing = await prisma.recipe.findFirst({
      where: { productId, rawMaterialId },
    });
    if (existing) throw new Error("Bu hammadde zaten bu \u00fcr\u00fcn\u00fcn re\u00e7etesinde mevcut.");
  }
  if (componentProductId) {
    const existing = await prisma.recipe.findFirst({
      where: { productId, componentProductId },
    });
    if (existing) throw new Error("Bu alt \u00fcr\u00fcn zaten bu \u00fcr\u00fcn\u00fcn re\u00e7etesinde mevcut.");
    // D\u00f6ng\u00fc kontrol\u00fc: componentProduct, \u00fcst \u00fcr\u00fcn\u00fcn kendisi olamaz
    if (componentProductId === productId)
      throw new Error("Bir \u00fcr\u00fcn kendi alt \u00fcr\u00fcn\u00fc olamaz.");
  }

  await prisma.recipe.create({
    data: {
      productId,
      rawMaterialId: rawMaterialId || null,
      componentProductId: componentProductId || null,
      quantityPerUnit,
      wastePercentage,
    },
  });

  revalidatePath("/urunler");
  return { success: true };
}

// ─────────────────────────────────────────────
// Reçete Satırı Sil
// ─────────────────────────────────────────────
export async function deleteRecipeLine(recipeId: string) {
  await requireAuth();
  await prisma.recipe.delete({ where: { id: recipeId } });
  revalidatePath("/urunler");
  return { success: true };
}
