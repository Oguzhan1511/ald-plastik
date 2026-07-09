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
        include: { rawMaterial: true },
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

  if (!name?.trim()) throw new Error("Ürün adı zorunludur.");

  const existing = await prisma.product.findUnique({ where: { name: name.trim() } });
  if (existing) throw new Error(`"${name}" adında bir ürün zaten mevcut.`);

  await prisma.product.create({
    data: { name: name.trim() },
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

  if (!name?.trim()) throw new Error("Ürün adı zorunludur.");

  const existing = await prisma.product.findFirst({
    where: { name: name.trim(), NOT: { id } },
  });
  if (existing) throw new Error(`"${name}" adında başka bir ürün zaten mevcut.`);

  await prisma.product.update({
    where: { id },
    data: { name: name.trim() },
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
  const rawMaterialId = formData.get("rawMaterialId") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");
  if (!rawMaterialId) throw new Error("Hammadde seçimi zorunludur.");

  const quantityPerUnit = parseDecimalInput(formData.get("quantityPerUnit") as string, "Miktar");
  if (quantityPerUnit <= 0) throw new Error("Miktar pozitif bir sayı olmalıdır.");

  const existing = await prisma.recipe.findUnique({
    where: { productId_rawMaterialId: { productId, rawMaterialId } },
  });
  if (existing) {
    throw new Error("Bu hammadde zaten bu ürünün reçetesinde mevcut. Silip yeniden ekleyebilirsiniz.");
  }

  await prisma.recipe.create({
    data: { productId, rawMaterialId, quantityPerUnit },
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
