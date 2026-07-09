"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

// Valid movement types (enforced at app layer since SQLite has no enums)
export type MovementType = "GIRIS" | "URETIM_CIKISI" | "MANUEL_CIKIS" | "DUZELTME";

export interface MovementFilters {
  rawMaterialId?: string;
  type?: MovementType;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

// ─────────────────────────────────────────────
// Hareket Listesi (Filtreli + Sayfalama)
// ─────────────────────────────────────────────
export async function getStockMovements(filters: MovementFilters = {}) {
  await requireAuth();

  const { rawMaterialId, type, startDate, endDate, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};

  if (rawMaterialId) where.rawMaterialId = rawMaterialId;
  if (type) where.type = type;
  if (startDate || endDate) {
    where.date = {};
    if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (where.date as Record<string, unknown>).lte = end;
    }
  }

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        rawMaterial: true,
        productionRecord: {
          include: { product: true },
        },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { movements, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

// ─────────────────────────────────────────────
// Stok Kartı — Tek hammaddenin tüm geçmişi
// ─────────────────────────────────────────────
export async function getStockCard(rawMaterialId: string) {
  await requireAuth();

  const [rawMaterial, movements] = await Promise.all([
    prisma.rawMaterial.findUnique({ where: { id: rawMaterialId } }),
    prisma.stockMovement.findMany({
      where: { rawMaterialId },
      orderBy: { date: "asc" },
      include: {
        productionRecord: {
          include: { product: true },
        },
      },
    }),
  ]);

  return { rawMaterial, movements };
}
