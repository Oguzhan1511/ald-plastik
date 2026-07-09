import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Tüm server action'ların başında çağrılır.
 * Geçerli bir oturum yoksa Error fırlatır — bu otomatik olarak client'a 500 döndürür
 * ve action'ın geri kalanı hiç çalışmaz.
 */
export async function requireAuth(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Bu işlemi gerçekleştirmek için giriş yapmanız gerekmektedir.");
  }
}
