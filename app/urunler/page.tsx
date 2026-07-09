import { getProducts } from "@/lib/actions/urun";
import { getRawMaterials } from "@/lib/actions/hammadde";
import { UrunClient } from "@/components/urun/UrunClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ürünler & Reçeteler — ALD Plastik",
  description: "Ürün tanımlama ve reçete (BOM) yönetimi.",
};

export default async function UrunlerPage() {
  const [products, rawMaterials] = await Promise.all([
    getProducts(),
    getRawMaterials(),
  ]);

  return <UrunClient initialProducts={products as any} rawMaterials={rawMaterials} />;
}
