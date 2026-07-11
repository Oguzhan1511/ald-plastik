import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — ALD Plastik Stok Takip",
  description: "Hammadde ve üretim stok takip sistemine genel bakış.",
};

async function getDashboardData() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    rawMaterials,
    products,
    thisMonthProductions,
    recentProductions,
    recentMovements,
  ] = await Promise.all([
    prisma.rawMaterial.findMany({ orderBy: { name: "asc" } }),
    prisma.product.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, currentStock: true, criticalLevel: true },
    }),
    prisma.productionRecord.findMany({
      where: { date: { gte: startOfMonth } },
      select: { quantity: true },
    }),
    prisma.productionRecord.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: { product: { select: { name: true } } },
    }),
    prisma.stockMovement.findMany({
      take: 8,
      orderBy: { date: "desc" },
      include: { rawMaterial: { select: { name: true, unit: true } } },
    }),
  ]);

  const criticalMaterials = rawMaterials.filter((m) => {
    if (!m.criticalLevel) return false;
    return parseFloat(m.currentStock.toString()) <= parseFloat(m.criticalLevel.toString());
  });

  const criticalProducts = products.filter((p) => {
    if (!p.criticalLevel) return false;
    return parseFloat(p.currentStock.toString()) <= parseFloat(p.criticalLevel.toString());
  });

  const thisMonthCount = thisMonthProductions.length;
  const thisMonthTotal = thisMonthProductions.reduce((sum, p) => sum + p.quantity, 0);

  return {
    rawMaterials,
    criticalMaterials,
    criticalProducts,
    productCount: products.length,
    thisMonthCount,
    thisMonthTotal,
    recentProductions,
    recentMovements,
  };
}

export default async function DashboardPage() {
  const {
    rawMaterials,
    criticalMaterials,
    criticalProducts,
    productCount,
    thisMonthCount,
    thisMonthTotal,
    recentProductions,
    recentMovements,
  } = await getDashboardData();

  const movementTypeConfig: Record<string, { label: string; className: string; sign: string }> = {
    GIRIS: { label: "Giriş", className: "badge-green", sign: "+" },
    URETIM_CIKISI: { label: "Üretim Çıkışı", className: "badge-red", sign: "-" },
    MANUEL_CIKIS: { label: "Manuel Çıkış", className: "badge-orange", sign: "-" },
    DUZELTME: { label: "Düzeltme", className: "badge-slate", sign: "±" },
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {new Date().toLocaleDateString("tr-TR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="page-body space-y-6">
        {/* Özet Kartlar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{rawMaterials.length}</div>
            <div className="text-sm text-slate-500 mt-1">Hammadde Çeşidi</div>
          </div>

          <div className={`stat-card ${criticalMaterials.length > 0 ? "border-red-200 bg-red-50" : ""}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${criticalMaterials.length > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                <svg className={`w-5 h-5 ${criticalMaterials.length > 0 ? "text-red-600" : "text-slate-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className={`text-3xl font-bold ${criticalMaterials.length > 0 ? "text-red-700" : "text-slate-800"}`}>
              {criticalMaterials.length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Kritik Stok</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">{thisMonthCount}</div>
            <div className="text-sm text-slate-500 mt-1">Bu Ay Üretim</div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800">
              {thisMonthTotal.toLocaleString("tr-TR")}
            </div>
            <div className="text-sm text-slate-500 mt-1">Bu Ay Toplam Adet</div>
          </div>
        </div>

        {/* Kritik Stoklar */}
        {criticalMaterials.length > 0 && (
          <div className="card border-red-200">
            <div className="card-header bg-red-50 rounded-t-xl border-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="font-semibold text-red-700">Kritik Stok Uyarısı</h2>
                </div>
                <Link href="/hammaddeler" className="text-sm text-red-600 hover:text-red-800 font-medium">
                  Stok Girişi Yap →
                </Link>
              </div>
            </div>
            <div className="card-body">
              <div className="grid gap-2">
                {criticalMaterials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg"
                  >
                    <span className="font-medium text-red-800 text-sm">{m.name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-red-600 font-semibold">
                        {parseFloat(m.currentStock.toString()).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {m.unit}
                      </span>
                      {m.criticalLevel && (
                        <span className="text-slate-400 text-xs">
                          / min {parseFloat(m.criticalLevel.toString()).toLocaleString("tr-TR")} {m.unit}
                        </span>
                      )}
                      <span className="badge-red">Kritik</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Kritik Ürün Stok Uyarısı */}
        {criticalProducts.length > 0 && (
          <div className="card border-orange-200">
            <div className="card-header bg-orange-50 rounded-t-xl border-orange-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h2 className="font-semibold text-orange-700">Kritik Ürün Stoku</h2>
                </div>
                <Link href="/urun-stok" className="text-sm text-orange-600 hover:text-orange-800 font-medium">
                  Stok Yönetimi →
                </Link>
              </div>
            </div>
            <div className="card-body">
              <div className="grid gap-2">
                {criticalProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-orange-800 text-sm">{p.name}</span>
                      {p.code && <span className="ml-2 text-xs font-mono text-slate-400">{p.code}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-orange-600 font-semibold">
                        {parseFloat(p.currentStock.toString()).toLocaleString("tr-TR")} adet
                      </span>
                      {p.criticalLevel && (
                        <span className="text-slate-400 text-xs">
                          / min {parseFloat(p.criticalLevel.toString()).toLocaleString("tr-TR")} adet
                        </span>
                      )}
                      <span className="badge-orange">Kritik</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alt 2 sütun */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Son Üretimler */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Son Üretimler</h2>
              <Link href="/uretim" className="text-sm text-blue-600 hover:text-blue-800">
                Tümü →
              </Link>
            </div>
            <div className="card-body p-0">
              {recentProductions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Üretim kaydı yok.
                </div>
              ) : (
                <div>
                  {recentProductions.map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-6 py-3 ${i < recentProductions.length - 1 ? "border-b border-slate-100" : ""}`}
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-800">{p.product.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(p.date).toLocaleDateString("tr-TR")}
                        </div>
                      </div>
                      <span className="badge-blue font-semibold">
                        {p.quantity.toLocaleString("tr-TR")} adet
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Son Hareketler */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Son Stok Hareketleri</h2>
              <Link href="/hareketler" className="text-sm text-blue-600 hover:text-blue-800">
                Tümü →
              </Link>
            </div>
            <div className="card-body p-0">
              {recentMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  Hareket kaydı yok.
                </div>
              ) : (
                <div>
                  {recentMovements.map((m, i) => {
                    const cfg = movementTypeConfig[m.type];
                    const amt = parseFloat(m.amount.toString());
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between px-6 py-3 ${i < recentMovements.length - 1 ? "border-b border-slate-100" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={cfg.className}>{cfg.label}</span>
                          <span className="text-sm font-medium text-slate-800">
                            {m.rawMaterial.name}
                          </span>
                        </div>
                        <span className={`text-sm font-semibold ${m.type === "GIRIS" ? "text-green-600" : "text-red-600"}`}>
                          {cfg.sign}{amt.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {m.rawMaterial.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hızlı Erişim */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: "/hammaddeler", label: "Hammadde Ekle", icon: "📦", color: "hover:border-blue-300 hover:bg-blue-50" },
            { href: "/urunler", label: "Ürün & Reçete", icon: "📋", color: "hover:border-purple-300 hover:bg-purple-50" },
            { href: "/uretim", label: "Üretim Girişi", icon: "⚙️", color: "hover:border-green-300 hover:bg-green-50" },
            { href: "/urun-stok", label: "Ürün Stok", icon: "📤", color: "hover:border-orange-300 hover:bg-orange-50" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`card p-4 text-center transition-all ${item.color} cursor-pointer`}
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <div className="text-sm font-medium text-slate-600">{item.label}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
