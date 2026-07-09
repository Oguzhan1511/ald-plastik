import { getStockMovements } from "@/lib/actions/hareket";
import { getRawMaterials } from "@/lib/actions/hammadde";
import { HareketiClient } from "@/components/hareketler/HareketiClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hareket Geçmişi — ALD Plastik",
  description: "Tüm stok giriş-çıkış hareketlerinin tarih sıralı, filtrelenebilir dökümü.",
};

export default async function HareketiPage() {
  const [{ movements, total, totalPages }, rawMaterials] = await Promise.all([
    getStockMovements({ page: 1, pageSize: 20 }),
    getRawMaterials(),
  ]);

  return (
    <HareketiClient
      initialMovements={movements as any}
      initialTotal={total}
      initialTotalPages={totalPages}
      rawMaterials={rawMaterials}
    />
  );
}
