import { getProducts } from "@/lib/actions/urun";
import { getProductionRecords } from "@/lib/actions/uretim";
import { UretimClient } from "@/components/uretim/UretimClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Üretim Girişi — ALD Plastik",
  description: "Üretim kaydı girin, stok otomatik düşülür.",
};

export default async function UretimPage() {
  const [products, recentProductions] = await Promise.all([
    getProducts(),
    getProductionRecords(20),
  ]);

  return (
    <UretimClient
      products={products as any}
      recentProductions={recentProductions as any}
    />
  );
}
