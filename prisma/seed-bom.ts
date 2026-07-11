/**
 * prisma/seed-bom.ts
 *
 * ALD Plastik BOM (Bill of Materials) Toplu Yükleme Script'i
 * ─────────────────────────────────────────────────────────────
 * Kullanım: npm run db:seed-bom
 *
 * XLSX sütunları (1. satır başlık):
 *   A: Üst Ürün Kodu
 *   B: Üst Ürün Adı
 *   C: Bileşen Tipi  ("Hammadde" | "Alt Ürün")
 *   D: Bileşen Kodu
 *   E: Bileşen Adı
 *   F: Miktar (gram, fire dahil)  — Alt Ürün satırlarında boş olabilir
 *   G: Fire %                     — örn. 0.03 = %3
 *
 * Script çalıştırılmadan önce inceleyin.
 * Mevcut kayıtları silmez; yalnızca eksik olanları ekler (idempotent).
 */

import * as XLSX from "xlsx";
import * as path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ── Yardımcı: boş/undefined hücreyi temizle ──────────────────
function cell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function numCell(row: Record<string, unknown>, key: string): number {
  const v = row[key];
  if (v === undefined || v === null || v === "") return 0;
  const n = parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

// ── Ana fonksiyon ─────────────────────────────────────────────
async function main() {
  // XLSX dosyasının yolu — script'i proje kökünden çalıştırın
  const xlsxPath = path.join(process.cwd(), "ALD_Plastik_BOM_Agaci.xlsx");

  console.log(`📂 XLSX dosyası okunuyor: ${xlsxPath}`);

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.readFile(xlsxPath);
  } catch {
    console.error(`❌ XLSX dosyası bulunamadı: ${xlsxPath}`);
    console.error(
      "   Dosyayı proje kök dizinine (ALD_Plastik/ altına) koyup tekrar çalıştırın."
    );
    process.exit(1);
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    raw: false,
  });

  console.log(`✅ ${rows.length} satır okundu (başlık satırı hariç)`);

  // ── Sütun anahtarları (XLSX başlık adlarına göre) ────────────
  // Başlık satırı ile eşleştirmek için ilk satırı kontrol edelim:
  const HEADER_PARENT_CODE  = "Üst Ürün Kodu";
  const HEADER_PARENT_NAME  = "Üst Ürün Adı";
  const HEADER_COMP_TYPE    = "Bileşen Tipi";
  const HEADER_COMP_CODE    = "Bileşen Kodu";
  const HEADER_COMP_NAME    = "Bileşen Adı";
  const HEADER_QUANTITY     = "Miktar (gram, fire dahil)"; // F sütunu
  const HEADER_WASTE        = "Fire %";                    // G sütunu

  // Eğer başlık adları farklıysa kolon harfine (A, B, …) göre fallback:
  // Aşağıdaki iki yardımcı, hem "Miktar (gram, fire dahil)" hem "__EMPTY_5" gibi
  // olası değişkenliklere karşı çalışır.
  function getCol(
    row: Record<string, unknown>,
    primaryKey: string,
    fallbackLetter: string
  ): string {
    if (row[primaryKey] !== undefined) return cell(row, primaryKey);
    // XLSX.utils.sheet_to_json bazı durumlarda sütunları __EMPTY_N ile işaretler
    // ya da kolon harfiyle verir (defval kullanılmadığında).
    // Güvenli fallback: tüm değerleri pozisyonel olarak al.
    return cell(row, fallbackLetter);
  }

  function getNumCol(
    row: Record<string, unknown>,
    primaryKey: string,
    fallbackLetter: string
  ): number {
    if (row[primaryKey] !== undefined && row[primaryKey] !== "")
      return numCell(row, primaryKey);
    return numCell(row, fallbackLetter);
  }

  // ── ADIM 1: Benzersiz ürün kodlarını topla ───────────────────
  console.log("\n─── ADIM 1: Ürün Kodları Toplanıyor ───");

  const productMap = new Map<string, string>(); // code → name

  for (const row of rows) {
    const parentCode = getCol(row, HEADER_PARENT_CODE, "A") || getCol(row, "__EMPTY", "A");
    const parentName = getCol(row, HEADER_PARENT_NAME, "B") || getCol(row, "__EMPTY_1", "B");
    const compType   = getCol(row, HEADER_COMP_TYPE, "C")   || getCol(row, "__EMPTY_2", "C");
    const compCode   = getCol(row, HEADER_COMP_CODE, "D")   || getCol(row, "__EMPTY_3", "D");
    const compName   = getCol(row, HEADER_COMP_NAME, "E")   || getCol(row, "__EMPTY_4", "E");

    if (!parentCode || !parentName) continue; // boş satır atla

    // Üst ürünü her zaman topla
    if (!productMap.has(parentCode)) {
      productMap.set(parentCode, parentName);
    }

    // Bileşen Tipi="Alt Ürün" ise bileşen de bir Product'tır
    if (compType === "Alt Ürün" && compCode && compName) {
      if (!productMap.has(compCode)) {
        productMap.set(compCode, compName);
      }
    }
  }

  console.log(`   Bulunan benzersiz ürün kodu: ${productMap.size}`);

  // ── ADIM 2: Product kayıtlarını oluştur (olmayanları) ────────
  console.log("\n─── ADIM 2: Ürünler DB'ye Yazılıyor ───");

  let productCreated = 0;
  let productSkipped = 0;

  // DB'deki mevcut ürünleri code'a göre çek
  const existingProducts = await prisma.product.findMany({
    where: { code: { in: Array.from(productMap.keys()) } },
    select: { id: true, code: true, name: true },
  });
  const existingProductsByCode = new Map(
    existingProducts.map((p) => [p.code!, p])
  );

  const productDbMap = new Map<string, string>(); // code → DB id

  for (const [code, name] of productMap.entries()) {
    if (existingProductsByCode.has(code)) {
      const p = existingProductsByCode.get(code)!;
      productDbMap.set(code, p.id);
      productSkipped++;
    } else {
      // İsim çakışması kontrolü
      const byName = await prisma.product.findUnique({ where: { name } });
      if (byName) {
        // İsim var ama kodu yok — kodu güncelle
        await prisma.product.update({
          where: { id: byName.id },
          data: { code },
        });
        productDbMap.set(code, byName.id);
        console.log(`   ↺ Güncellendi (kod eklendi): ${name} → ${code}`);
        productSkipped++;
      } else {
        const created = await prisma.product.create({
          data: { code, name },
        });
        productDbMap.set(code, created.id);
        productCreated++;
        console.log(`   + Oluşturuldu: [${code}] ${name}`);
      }
    }
  }

  console.log(`   ✅ Oluşturulan: ${productCreated}, Zaten mevcut: ${productSkipped}`);

  // ── ADIM 3: RawMaterial kayıtlarını oluştur (Hammadde satırları) ─
  console.log("\n─── ADIM 3: Hammaddeler DB'ye Yazılıyor ───");

  let rawCreated = 0;
  let rawSkipped = 0;

  // Hammadde bileşenlerini topla
  const hammaddeMap = new Map<string, string>(); // code → name
  for (const row of rows) {
    const compType = getCol(row, HEADER_COMP_TYPE, "C") || getCol(row, "__EMPTY_2", "C");
    const compCode = getCol(row, HEADER_COMP_CODE, "D") || getCol(row, "__EMPTY_3", "D");
    const compName = getCol(row, HEADER_COMP_NAME, "E") || getCol(row, "__EMPTY_4", "E");

    if (compType === "Hammadde" && compCode && compName) {
      if (!hammaddeMap.has(compCode)) {
        hammaddeMap.set(compCode, compName);
      }
    }
  }

  console.log(`   Bulunan benzersiz hammadde kodu: ${hammaddeMap.size}`);

  const existingRaw = await prisma.rawMaterial.findMany({
    where: { name: { in: Array.from(hammaddeMap.values()) } },
    select: { id: true, name: true },
  });
  const existingRawByName = new Map(existingRaw.map((r) => [r.name, r]));

  const rawDbMap = new Map<string, string>(); // code → DB id

  for (const [code, name] of hammaddeMap.entries()) {
    if (existingRawByName.has(name)) {
      rawDbMap.set(code, existingRawByName.get(name)!.id);
      rawSkipped++;
    } else {
      const created = await prisma.rawMaterial.create({
        data: {
          name,
          unit: "gram", // varsayılan birim
          currentStock: 0,
        },
      });
      rawDbMap.set(code, created.id);
      rawCreated++;
      console.log(`   + Oluşturuldu: [${code}] ${name}`);
    }
  }

  console.log(`   ✅ Oluşturulan: ${rawCreated}, Zaten mevcut: ${rawSkipped}`);

  // ── ADIM 4: Recipe satırlarını oluştur ───────────────────────
  console.log("\n─── ADIM 4: Reçete Satırları DB'ye Yazılıyor ───");

  let recipeCreated = 0;
  let recipeSkipped = 0;
  let recipeError = 0;

  for (const row of rows) {
    const parentCode = getCol(row, HEADER_PARENT_CODE, "A") || getCol(row, "__EMPTY", "A");
    const compType   = getCol(row, HEADER_COMP_TYPE, "C")   || getCol(row, "__EMPTY_2", "C");
    const compCode   = getCol(row, HEADER_COMP_CODE, "D")   || getCol(row, "__EMPTY_3", "D");
    const quantity   = getNumCol(row, HEADER_QUANTITY, "F");
    const wastePct   = getNumCol(row, HEADER_WASTE, "G");   // örn. 0.03

    if (!parentCode || !compCode) continue;

    const productId = productDbMap.get(parentCode);
    if (!productId) {
      console.warn(`   ⚠ Üst ürün bulunamadı: ${parentCode} — satır atlandı`);
      recipeError++;
      continue;
    }

    if (compType === "Hammadde") {
      const rawMaterialId = rawDbMap.get(compCode);
      if (!rawMaterialId) {
        console.warn(`   ⚠ Hammadde bulunamadı: ${compCode} — satır atlandı`);
        recipeError++;
        continue;
      }

      // Tekrar kontrolü
      const existing = await prisma.recipe.findFirst({
        where: { productId, rawMaterialId },
      });
      if (existing) {
        recipeSkipped++;
        continue;
      }

      await prisma.recipe.create({
        data: {
          productId,
          rawMaterialId,
          quantityPerUnit: quantity,    // gram cinsinden
          wastePercentage: wastePct,    // 0.03 gibi, zaten oran
        },
      });
      recipeCreated++;

    } else if (compType === "Alt Ürün") {
      const componentProductId = productDbMap.get(compCode);
      if (!componentProductId) {
        console.warn(`   ⚠ Alt ürün bulunamadı: ${compCode} — satır atlandı`);
        recipeError++;
        continue;
      }

      // Döngü koruması: kendisi mi?
      if (componentProductId === productId) {
        console.warn(`   ⚠ Döngü tespiti: ${parentCode} kendini alt ürün olarak ekleyemez — atlandı`);
        recipeError++;
        continue;
      }

      // Tekrar kontrolü
      const existing = await prisma.recipe.findFirst({
        where: { productId, componentProductId },
      });
      if (existing) {
        recipeSkipped++;
        continue;
      }

      // Alt ürün satırlarında miktar boş — kullanıcı sonradan girecek
      await prisma.recipe.create({
        data: {
          productId,
          componentProductId,
          quantityPerUnit: quantity || 0, // boşsa 0, kullanıcı günceller
          wastePercentage: wastePct || 0,
        },
      });
      recipeCreated++;

    } else {
      console.warn(`   ⚠ Bilinmeyen Bileşen Tipi: "${compType}" — satır atlandı`);
      recipeError++;
    }
  }

  console.log(`\n   ✅ Oluşturulan: ${recipeCreated}, Zaten mevcut: ${recipeSkipped}, Hata: ${recipeError}`);

  // ── Özet ─────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log("🎉 BOM yükleme tamamlandı!");
  console.log(`   Ürün:       +${productCreated} oluşturuldu, ${productSkipped} atlandı`);
  console.log(`   Hammadde:   +${rawCreated} oluşturuldu, ${rawSkipped} atlandı`);
  console.log(`   Reçete:     +${recipeCreated} oluşturuldu, ${recipeSkipped} atlandı`);
  if (recipeError > 0)
    console.log(`   ⚠ Hatalı satır: ${recipeError} (yukarıdaki uyarılara bakın)`);
  console.log("══════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Beklenmeyen hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
