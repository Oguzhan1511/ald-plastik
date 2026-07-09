"use client";

import { useState, useTransition } from "react";
import { createProductionRecord } from "@/lib/actions/uretim";
import { RawMaterial } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface RecipeItem {
  id: string;
  rawMaterialId: string;
  quantityPerUnit: Decimal;
  rawMaterial: RawMaterial;
}

interface ProductItem {
  id: string;
  name: string;
  recipes: RecipeItem[];
}

interface ProductionRecord {
  id: string;
  quantity: number;
  date: Date;
  description: string | null;
  product: { name: string };
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

export function UretimClient({ products, recentProductions }: UretimClientProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ProductionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Önizleme: seçilen ürün + miktar için düşülecek hammaddeler
  const qty = parseInt(quantity) || 0;
  const preview = selectedProduct?.recipes.map((r) => ({
    name: r.rawMaterial.name,
    unit: r.rawMaterial.unit,
    perUnit: parseFloat(r.quantityPerUnit.toString()),
    total: parseFloat(r.quantityPerUnit.toString()) * qty,
    currentStock: parseFloat(r.rawMaterial.currentStock.toString()),
  }));

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
          setQuantity("");
          setDescription("");
          setDate(new Date().toISOString().split("T")[0]);
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
                  <div>
                    <label className="form-label">Ürün *</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                      className="form-select"
                      id="select-urun"
                    >
                      <option value="">Ürün seçin...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.recipes.length === 0 ? " (⚠ Reçete yok)" : ""}
                        </option>
                      ))}
                    </select>
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
                    <label className="form-label">Tarih *</label>
                    <input
                      type="date"
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
                                Gerekli:{" "}
                                <strong className={isInsufficient ? "text-red-700" : "text-slate-700"}>
                                  {item.total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {item.unit}
                                </strong>
                              </div>
                              <div className="text-slate-500">
                                Mevcut: <strong className="text-slate-700">{item.currentStock.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {item.unit}</strong>
                              </div>
                              <div className="text-slate-400">
                                ({item.perUnit} {item.unit}/adet × {qty} adet)
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
                    <th>Üretilen Adet</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProductions.map((rec) => (
                    <tr key={rec.id}>
                      <td className="text-slate-500 text-sm">
                        {new Date(rec.date).toLocaleDateString("tr-TR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td className="font-medium text-slate-800">{rec.product.name}</td>
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
