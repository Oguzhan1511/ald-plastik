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

  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedProductions = JSON.parse(JSON.stringify(recentProductions));

  return (
    <UretimClient
      products={serializedProducts}
      recentProductions={serializedProductions}
    />
  );
}
