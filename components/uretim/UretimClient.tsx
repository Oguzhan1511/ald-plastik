"use client";

import { useState, useTransition, useMemo } from "react";
import { createProductionRecord } from "@/lib/actions/uretim";
import { RawMaterial } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface RecipeItem {
  id: string;
  rawMaterialId: string;
  quantityPerUnit: Decimal;
  wastePercentage: Decimal;
  rawMaterial: RawMaterial;
}

interface ProductItem {
  id: string;
  name: string;
  code: string | null;
  recipes: RecipeItem[];
}

interface ProductionRecord {
  id: string;
  quantity: number;
  date: Date;
  description: string | null;
  product: { name: string; code: string | null };
}

interface UretimClientProps {
  products: ProductItem[];
  recentProductions: ProductionRecord[];
}

interface ProductionResult {
  productName: string;
  quantity: number;
  movements: { rawMaterialName: string; unit: string; amount: number }[];
}

function getLocalISOTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

export function UretimClient({ products, recentProductions }: UretimClientProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(getLocalISOTime());
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProductionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Ürün arama filtresi — hem ada hem koda göre
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const handleSelectProduct = (p: ProductItem) => {
    setSelectedProductId(p.id);
    setProductSearch(p.code ? `${p.name} (${p.code})` : p.name);
    setShowDropdown(false);
  };

  // Önizleme: seçilen ürün + miktar için düşülecek hammaddeler (fire dahil)
  const qty = parseInt(quantity) || 0;
  const preview = selectedProduct?.recipes.map((r) => {
    const wasteFactor = 1 + parseFloat(r.wastePercentage.toString());
    const perUnit = parseFloat(r.quantityPerUnit.toString());
    const wastePercent = parseFloat(r.wastePercentage.toString()) * 100;
    return {
      name: r.rawMaterial.name,
      unit: r.rawMaterial.unit,
      perUnit,
      wastePercent,
      total: perUnit * qty * wasteFactor,
      currentStock: parseFloat(r.rawMaterial.currentStock.toString()),
    };
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.set("productId", selectedProductId);
    formData.set("quantity", quantity);
    formData.set("description", description);
    formData.set("date", date);

    startTransition(async () => {
      try {
        const res = await createProductionRecord(formData);
        if (res.success && res.data) {
          setResult(res.data);
          setSelectedProductId("");
          setProductSearch("");
          setQuantity("");
          setDescription("");
          setDate(getLocalISOTime());
          window.location.reload();
        }
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Üretim Girişi</h1>
      </div>

      <div className="page-body">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Card */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-slate-700">Yeni Üretim Kaydı</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Ürün arama kutusu */}
                  <div>
                    <label className="form-label">Ürün *</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="input-urun-ara"
                        className="form-input"
                        placeholder="Ürün adı veya kod ile ara (örn: Dubel veya 602051Z)"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          setSelectedProductId("");
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        autoComplete="off"
                      />
                      {showDropdown && productSearch.trim() !== "" && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredProducts.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400">Eşleşen ürün bulunamadı.</div>
                          ) : (
                            filteredProducts.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 text-sm flex items-center justify-between gap-2 border-b border-slate-100 last:border-0"
                                onMouseDown={() => handleSelectProduct(p)}
                              >
                                <span className="font-medium text-slate-800">{p.name}</span>
                                <span className="flex items-center gap-2 flex-shrink-0">
                                  {p.code && (
                                    <span className="badge-blue text-xs font-mono">{p.code}</span>
                                  )}
                                  {p.recipes.length === 0 && (
                                    <span className="badge-yellow text-xs">⚠ Reçete yok</span>
                                  )}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    {selectedProductId && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Seçildi: <strong>{selectedProduct?.name}</strong>
                        {selectedProduct?.code && <span className="ml-1 font-mono text-slate-500">({selectedProduct.code})</span>}
                      </p>
                    )}
                    {!selectedProductId && productSearch.trim() !== "" && (
                      <p className="text-xs text-amber-600 mt-1">Listeden bir ürün seçin.</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Üretilen Adet *</label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="form-input"
                      placeholder="örn: 1000"
                      id="input-adet"
                    />
                  </div>

                  <div>
                    <label className="form-label">Tarih & Saat *</label>
                    <input
                      type="datetime-local"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label className="form-label">Açıklama (opsiyonel)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="form-input"
                      placeholder="Parti no, vardiya vb."
                    />
                  </div>

                  {/* Hata */}
                  {error && (
                    <div className="alert-error whitespace-pre-line text-sm">
                      {error}
                    </div>
                  )}

                  {/* Başarı özeti */}
                  {result && (
                    <div className="alert-success">
                      <div className="font-semibold mb-2">
                        ✓ {result.quantity} adet {result.productName} üretildi!
                      </div>
                      <div className="text-xs space-y-1">
                        {result.movements.map((m, i) => (
                          <div key={i}>
                            ↓ {m.rawMaterialName}: {m.amount.toLocaleString("tr-TR")} {m.unit} düşüldü
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    id="btn-uretim-kaydet"
                    disabled={isPending || !selectedProductId}
                    className="btn btn-primary w-full justify-center py-2.5"
                  >
                    {isPending ? "Kaydediliyor..." : "Üretimi Kaydet"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div>
            {selectedProduct && qty > 0 ? (
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-slate-700">
                    Stok Düşüm Önizlemesi
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {qty} adet × {selectedProduct.name}
                    {selectedProduct.code && (
                      <span className="ml-1.5 font-mono text-slate-400 text-xs">({selectedProduct.code})</span>
                    )}
                  </p>
                </div>
                <div className="card-body">
                  {preview && preview.length === 0 ? (
                    <div className="alert-warning text-sm">
                      Bu ürünün reçetesi tanımlanmamış. /urunler sayfasından reçete ekleyin.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {preview?.map((item, i) => {
                        const isInsufficient = item.total > item.currentStock;
                        return (
                          <div
                            key={i}
                            className={`rounded-lg p-3 border ${
                              isInsufficient
                                ? "bg-red-50 border-red-200"
                                : "bg-green-50 border-green-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm text-slate-800">
                                {item.name}
                              </span>
                              {isInsufficient ? (
                                <span className="badge-red text-xs">⚠ Yetersiz</span>
                              ) : (
                                <span className="badge-green text-xs">✓ Yeterli</span>
                              )}
                            </div>
                            <div className="mt-1.5 text-xs space-y-0.5">
                              <div className="text-slate-500">
                                Gerekli (fire dahil):{" "}
                                <strong className={isInsufficient ? "text-red-700" : "text-slate-700"}>
                                  {item.total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {item.unit}
                                </strong>
                              </div>
                              <div className="text-slate-500">
                                Mevcut: <strong className="text-slate-700">{item.currentStock.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {item.unit}</strong>
                              </div>
                              <div className="text-slate-400">
                                ({item.perUnit} {item.unit}/adet × {qty} adet
                                {item.wastePercent > 0 && (
                                  <span className="text-orange-500"> + %{item.wastePercent.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} fire</span>
                                )}
                                )
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card h-full flex items-center justify-center min-h-[200px]">
                <div className="text-center text-slate-400 text-sm p-8">
                  <svg className="w-12 h-12 mx-auto mb-3 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Ürün ve adet seçince stok düşüm önizlemesi burada görünür.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Son Üretimler */}
        <div className="card mt-6">
          <div className="card-header">
            <h2 className="font-semibold text-slate-700">Son Üretim Kayıtları</h2>
          </div>
          <div className="table-wrapper border-0 rounded-t-none">
            {recentProductions.length === 0 ? (
              <div className="empty-state">
                <p className="text-slate-400 text-sm">Henüz üretim kaydı bulunmuyor.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Üretilen Adet</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProductions.map((rec) => (
                    <tr key={rec.id}>
                      <td className="text-slate-500 text-sm">
                        {new Date(rec.date).toLocaleString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="font-medium text-slate-800">{rec.product.name}</td>
                      <td>
                        {rec.product.code ? (
                          <span className="badge-blue font-mono text-xs">{rec.product.code}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td>
                        <span className="font-semibold text-blue-700">
                          {rec.quantity.toLocaleString("tr-TR")} adet
                        </span>
                      </td>
                      <td className="text-slate-500">{rec.description || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
