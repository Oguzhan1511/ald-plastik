import { getProductsWithStock, getProductStockMovements } from "@/lib/actions/urun-stok";
import { UrunStokClient } from "@/components/urun-stok/UrunStokClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürün Stok Takibi — ALD Plastik",
  description: "Ürün bazlı stok durumu, çıkış ve giriş kayıtları.",
};

export default async function UrunStokPage() {
  const [products, recentMovements] = await Promise.all([
    getProductsWithStock(),
    getProductStockMovements(undefined, 50),
  ]);

  // Prisma'nın Decimal ve Date objelerini plain object'e (string'e) çeviriyoruz
  // Next.js Server Component -> Client Component aktarımında bu zorunludur.
  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedMovements = JSON.parse(JSON.stringify(recentMovements));

  return (
    <UrunStokClient
      products={serializedProducts}
      recentMovements={serializedMovements}
    />
  );
}
