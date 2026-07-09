/**
 * Kullanıcıdan gelen ondalıklı sayı string'ini güvenli şekilde parse eder.
 * Hem "7.5" (noktalı) hem "7,5" (virgüllü) formatını kabul eder.
 * Geçersiz değer gelirse anlamlı bir hata fırlatır.
 */
export function parseDecimalInput(value: string, fieldName = "Değer"): number {
  // Virgülü noktaya çevir (Türkçe klavye girişi desteği)
  const normalized = String(value ?? "").replace(",", ".");
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} geçerli bir sayı olmalıdır (örn: 7 veya 7.5).`);
  }
  return parsed;
}

/**
 * Tam sayı parse eder (üretilen adet vb. için).
 * Ondalıklı girilirse hata fırlatır.
 */
export function parseIntInput(value: string, fieldName = "Değer"): number {
  const trimmed = String(value ?? "").trim();
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed) || String(parsed) !== trimmed) {
    throw new Error(`${fieldName} geçerli bir tam sayı olmalıdır (örn: 1000).`);
  }
  return parsed;
}
