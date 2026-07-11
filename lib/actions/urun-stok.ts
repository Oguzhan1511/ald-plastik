"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { Decimal } from "@prisma/client/runtime/library";

// ─────────────────────────────────────────────
// Ürün Stok Hareketleri Listesi
// ─────────────────────────────────────────────
export async function getProductStockMovements(productId?: string, limit?: number) {
  await requireAuth();
  return prisma.productStockMovement.findMany({
    where: productId ? { productId } : undefined,
    orderBy: { date: "desc" },
    take: limit,
    include: {
      product: { select: { id: true, name: true, code: true } },
    },
  });
}

// ─────────────────────────────────────────────
// Ürün Stok Durumu (tüm ürünler, stok bilgisiyle)
// ─────────────────────────────────────────────
export async function getProductsWithStock() {
  await requireAuth();
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      code: true,
      currentStock: true,
      criticalLevel: true,
      updatedAt: true,
    },
  });
}

// ─────────────────────────────────────────────
// Ürün Stok Çıkışı (Satış / Sevkiyat)
// ─────────────────────────────────────────────
export async function createProductStockExit(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const dateStr = formData.get("date") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Miktar pozitif bir sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  // Stok yeterlilik kontrolü
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true, currentStock: true },
  });
  if (!product) throw new Error("Ürün bulunamadı.");

  const available = new Decimal(product.currentStock);
  const requested = new Decimal(quantity);

  if (available.lessThan(requested)) {
    throw new Error(
      `Yetersiz stok: ${product.name} — Mevcut: ${available.toFixed(0)} adet, İstenen: ${requested.toFixed(0)} adet`
    );
  }

  // Transaction: stok düş + hareket kaydet
  await prisma.$transaction(async (tx) => {
    const updateResult = await tx.product.updateMany({
      where: {
        id: productId,
        currentStock: { gte: quantity },
      },
      data: { currentStock: { decrement: quantity } },
    });

    if (updateResult.count === 0) {
      throw new Error(
        `Yetersiz stok: ${product.name} — işlem sırasında stok değişti, lütfen tekrar deneyin.`
      );
    }

    await tx.productStockMovement.create({
      data: {
        productId,
        type: "SATIS_CIKISI",
        quantity: -quantity, // negatif = çıkış
        date,
        description,
      },
    });
  });

  revalidatePath("/urun-stok");
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────
// Manuel Ürün Stok Girişi (düzeltme / iade vb.)
// ─────────────────────────────────────────────
export async function createProductStockEntry(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const quantityStr = formData.get("quantity") as string;
  const typeRaw = (formData.get("type") as string) || "MANUEL_GIRIS";
  const description = (formData.get("description") as string)?.trim() || null;
  const dateStr = formData.get("date") as string;

  const allowedTypes = ["MANUEL_GIRIS", "DUZELTME"];
  if (!allowedTypes.includes(typeRaw))
    throw new Error("Geçersiz hareket tipi.");

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const quantity = parseFloat(quantityStr);
  if (isNaN(quantity) || quantity <= 0)
    throw new Error("Miktar pozitif bir sayı olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: { increment: quantity } },
    });

    await tx.productStockMovement.create({
      data: {
        productId,
        type: typeRaw,
        quantity: quantity, // pozitif = giriş
        date,
        description,
      },
    });
  });

  revalidatePath("/urun-stok");
  revalidatePath("/");
  return { success: true };
}

// ─────────────────────────────────────────────
// Ürün Stok Düzeltme (negatif de olabilir)
// ─────────────────────────────────────────────
export async function adjustProductStock(formData: FormData) {
  await requireAuth();

  const productId = formData.get("productId") as string;
  const newStockStr = formData.get("newStock") as string;
  const description = (formData.get("description") as string)?.trim() || null;
  const dateStr = formData.get("date") as string;

  if (!productId) throw new Error("Ürün seçimi zorunludur.");

  const newStock = parseFloat(newStockStr);
  if (isNaN(newStock) || newStock < 0)
    throw new Error("Yeni stok değeri 0 veya daha büyük olmalıdır.");

  const date = dateStr ? new Date(dateStr) : new Date();

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { currentStock: true },
  });
  if (!product) throw new Error("Ürün bulunamadı.");

  const diff = new Decimal(newStock).minus(new Decimal(product.currentStock));

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    await tx.productStockMovement.create({
      data: {
        productId,
        type: "DUZELTME",
        quantity: diff.toNumber(),
        date,
        description: description || `Stok düzeltme: ${newStock} adede ayarlandı`,
      },
    });
  });

  revalidatePath("/urun-stok");
  revalidatePath("/");
  return { success: true };
}
