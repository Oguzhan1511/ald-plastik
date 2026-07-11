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

  const serializedProducts = JSON.parse(JSON.stringify(products));
  const serializedRawMaterials = JSON.parse(JSON.stringify(rawMaterials));

  return <UrunClient initialProducts={serializedProducts} rawMaterials={serializedRawMaterials} />;
}
