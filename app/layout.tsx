import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionProvider } from "@/components/layout/SessionProvider";

export const metadata: Metadata = {
  title: "ALD Plastik — Stok Takip Sistemi",
  description:
    "Hammadde ve reçete bazlı stok takip sistemi. Plastik enjeksiyon üretimi için otomatik stok düşümü.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="tr">
      <body>
        <SessionProvider session={session}>
          {session ? (
            <div className="page-wrapper">
              <Sidebar />
              <main className="main-content">{children}</main>
            </div>
          ) : (
            <>{children}</>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
