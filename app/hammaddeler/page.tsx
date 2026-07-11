import { getRawMaterials } from "@/lib/actions/hammadde";
import { HammaddeClient } from "@/components/hammadde/HammaddeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hammaddeler — ALD Plastik",
  description: "Hammadde stok takibi, giriş-çıkış işlemleri ve kritik seviye yönetimi.",
};

export default async function HammaddelerPage() {
  const materials = await getRawMaterials();

  const serializedRawMaterials = JSON.parse(JSON.stringify(materials));

  return <HammaddeClient initialData={serializedRawMaterials} />;
}
