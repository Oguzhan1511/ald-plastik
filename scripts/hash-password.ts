/**
 * Tek seferlik şifre hash'leme aracı.
 *
 * Kullanım:
 *   npx tsx scripts/hash-password.ts <şifreniz>
 *
 * Çıktı:
 *   Hash: $2b$12$...
 *
 * Bu hash'i .env dosyasında ADMIN_PASSWORD_HASH değeri olarak kullanın.
 */

import bcrypt from "bcryptjs";

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error("Kullanım: npx tsx scripts/hash-password.ts <şifreniz>");
    console.error("Örnek:    npx tsx scripts/hash-password.ts ald2024");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  console.log("\nHash başarıyla oluşturuldu:");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log("\nBu değeri .env dosyanıza ADMIN_PASSWORD_HASH olarak ekleyin.");
  console.log("ADMIN_PASSWORD değişkenini kaldırmayı unutmayın.");
}

main();
