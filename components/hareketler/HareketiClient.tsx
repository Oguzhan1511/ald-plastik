"use client";

import { useState, useTransition, useCallback } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { getStockMovements, getStockCard, MovementFilters, MovementType } from "@/lib/actions/hareket";
import { getProductStockMovementsPaginated, ProductMovementFilters } from "@/lib/actions/urun-stok";

interface Movement {
  id: string;
  type: MovementType;
  amount: number | string;
  date: Date | string;
  description: string | null;
  rawMaterial: { id: string; name: string; unit: string };
  productionRecord: { id: string; product: { name: string } } | null;
}

interface UrunMovement {
  id: string;
  type: string;
  quantity: number | string;
  date: Date | string;
  description: string | null;
  product: { id: string; name: string; code: string | null };
  productionRecord: { id: string } | null;
}

interface HareketiClientProps {
  initialHammaddeMovements: Movement[];
  hTotal: number;
  hTotalPages: number;
  rawMaterials: { id: string; name: string; unit: string; currentStock: any; criticalLevel: any }[];
  
  initialUrunMovements: UrunMovement[];
  uTotal: number;
  uTotalPages: number;
  products: { id: string; name: string; code: string | null; currentStock: any; criticalLevel: any }[];
}

const H_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  GIRIS: { label: "Giriş", className: "badge-green" },
  URETIM_CIKISI: { label: "Üretim Çıkışı", className: "badge-red" },
  MANUEL_CIKIS: { label: "Manuel Çıkış", className: "badge-orange" },
  DUZELTME: { label: "Düzeltme", className: "badge-slate" },
};

const U_TYPE_LABELS: Record<string, { label: string; className: string; sign: string; color: string }> = {
  URETIM_GIRISI: { label: "Üretim Girişi", className: "badge-blue", sign: "+", color: "text-blue-600" },
  SATIS_CIKISI:  { label: "Satış Çıkışı",  className: "badge-red",  sign: "-", color: "text-red-600"  },
  MANUEL_GIRIS:  { label: "Manuel Giriş",  className: "badge-green", sign: "+", color: "text-green-600" },
  MANUEL_CIKIS:  { label: "Manuel Çıkış",  className: "badge-orange", sign: "-", color: "text-orange-600" },
  DUZELTME:      { label: "Düzeltme",      className: "badge-slate", sign: "±", color: "text-slate-600" },
};

export function HareketiClient({
  initialHammaddeMovements,
  hTotal,
  hTotalPages,
  rawMaterials,
  initialUrunMovements,
  uTotal,
  uTotalPages,
  products
}: HareketiClientProps) {
  const [activeTab, setActiveTab] = useState<"hammadde" | "urun">("hammadde");

  // Hammadde state
  const [hMovements, setHMovements] = useState<Movement[]>(initialHammaddeMovements);
  const [hTotalCount, setHTotalCount] = useState(hTotal);
  const [hPages, setHPages] = useState(hTotalPages);
  const [hPage, setHPage] = useState(1);
  const [hFilterMaterial, setHFilterMaterial] = useState("");
  const [hFilterType, setHFilterType] = useState("");
  const [hFilterStart, setHFilterStart] = useState("");
  const [hFilterEnd, setHFilterEnd] = useState("");

  // Ürün state
  const [uMovements, setUMovements] = useState<UrunMovement[]>(initialUrunMovements);
  const [uTotalCount, setUTotalCount] = useState(uTotal);
  const [uPages, setUPages] = useState(uTotalPages);
  const [uPage, setUPage] = useState(1);
  const [uFilterProduct, setUFilterProduct] = useState("");
  const [uFilterType, setUFilterType] = useState("");
  const [uFilterStart, setUFilterStart] = useState("");
  const [uFilterEnd, setUFilterEnd] = useState("");

  const [stockCardData, setStockCardData] = useState<any>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchHMovements = useCallback(
    (newPage: number, filters?: MovementFilters) => {
      startTransition(async () => {
        const f = filters ?? {
          rawMaterialId: hFilterMaterial || undefined,
          type: (hFilterType as MovementType) || undefined,
          startDate: hFilterStart || undefined,
          endDate: hFilterEnd || undefined,
        };
        const res = await getStockMovements({ ...f, page: newPage, pageSize: 20 });
        setHMovements(res.movements as any);
        setHTotalCount(res.total);
        setHPages(res.totalPages);
        setHPage(newPage);
      });
    },
    [hFilterMaterial, hFilterType, hFilterStart, hFilterEnd]
  );

  const fetchUMovements = useCallback(
    (newPage: number, filters?: ProductMovementFilters) => {
      startTransition(async () => {
        const f = filters ?? {
          productId: uFilterProduct || undefined,
          type: uFilterType || undefined,
          startDate: uFilterStart || undefined,
          endDate: uFilterEnd || undefined,
        };
        const res = await getProductStockMovementsPaginated({ ...f, page: newPage, pageSize: 20 });
        setUMovements(res.movements as any);
        setUTotalCount(res.total);
        setUPages(res.totalPages);
        setUPage(newPage);
      });
    },
    [uFilterProduct, uFilterType, uFilterStart, uFilterEnd]
  );

  const handleHFilter = () => fetchHMovements(1);
  const handleUFilter = () => fetchUMovements(1);

  const handleHPageChange = (p: number) => fetchHMovements(p);
  const handleUPageChange = (p: number) => fetchUMovements(p);

  const handleOpenStockCard = (materialId: string) => {
    startTransition(async () => {
      const data = await getStockCard(materialId);
      setStockCardData(data);
      setIsCardOpen(true);
    });
  };

  const cardMovements = stockCardData?.movements ?? [];
  const cardMaterial = stockCardData?.rawMaterial;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Hareket Geçmişi</h1>
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "hammadde" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("hammadde")}
          >
            Hammadde Hareketleri
          </button>
          <button
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "urun" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("urun")}
          >
            Ürün Hareketleri
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* HAMMADDE TAB */}
        {activeTab === "hammadde" && (
          <>
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label text-xs">Hammadde</label>
                    <select
                      className="form-select"
                      value={hFilterMaterial}
                      onChange={(e) => setHFilterMaterial(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      {rawMaterials.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Hareket Tipi</label>
                    <select
                      className="form-select"
                      value={hFilterType}
                      onChange={(e) => setHFilterType(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      <option value="GIRIS">Giriş</option>
                      <option value="URETIM_CIKISI">Üretim Çıkışı</option>
                      <option value="MANUEL_CIKIS">Manuel Çıkış</option>
                      <option value="DUZELTME">Düzeltme</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={hFilterStart}
                      onChange={(e) => setHFilterStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={hFilterEnd}
                      onChange={(e) => setHFilterEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-primary" onClick={handleHFilter} disabled={isPending}>
                    {isPending ? "Yükleniyor..." : "Filtrele"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setHFilterMaterial("");
                      setHFilterType("");
                      setHFilterStart("");
                      setHFilterEnd("");
                      fetchHMovements(1, {});
                    }}
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">Hammadde Stok Hareketleri</h2>
                <span className="text-sm text-slate-400">{hTotalCount} kayıt</span>
              </div>
              <div className="table-wrapper border-0 rounded-t-none">
                {hMovements.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-slate-400 text-sm">Hareket kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Hammadde</th>
                        <th>Tip</th>
                        <th>Miktar</th>
                        <th>Açıklama</th>
                        <th>İlgili Üretim</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hMovements.map((m) => {
                        const typeInfo = H_TYPE_LABELS[m.type];
                        const amount = parseFloat(m.amount.toString());
                        return (
                          <tr key={m.id}>
                            <td className="text-slate-500 text-sm whitespace-nowrap">
                              {new Date(m.date).toLocaleDateString("tr-TR", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <button
                                className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                onClick={() => handleOpenStockCard(m.rawMaterial.id)}
                              >
                                {m.rawMaterial.name}
                              </button>
                            </td>
                            <td>
                              <span className={typeInfo?.className || "badge-slate"}>{typeInfo?.label || m.type}</span>
                            </td>
                            <td className="font-semibold text-slate-700">
                              {m.type === "GIRIS" ? "+" : "-"}
                              {amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {m.rawMaterial.unit}
                            </td>
                            <td className="text-slate-500 text-sm">{m.description || "—"}</td>
                            <td className="text-sm text-slate-500">
                              {m.productionRecord ? (
                                <span className="badge-blue cursor-default" title={`Üretim ID: ${m.productionRecord.id}`}>
                                  {m.productionRecord.product.name}
                                </span>
                              ) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {hPages > 1 && (
                <div className="px-6 pb-4">
                  <Pagination currentPage={hPage} totalPages={hPages} onPageChange={handleHPageChange} />
                </div>
              )}
            </div>
          </>
        )}

        {/* ÜRÜN TAB */}
        {activeTab === "urun" && (
          <>
            <div className="card mb-6">
              <div className="card-body">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="form-label text-xs">Ürün</label>
                    <select
                      className="form-select"
                      value={uFilterProduct}
                      onChange={(e) => setUFilterProduct(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Hareket Tipi</label>
                    <select
                      className="form-select"
                      value={uFilterType}
                      onChange={(e) => setUFilterType(e.target.value)}
                    >
                      <option value="">Tümü</option>
                      <option value="URETIM_GIRISI">Üretim Girişi</option>
                      <option value="SATIS_CIKISI">Satış Çıkışı</option>
                      <option value="MANUEL_GIRIS">Manuel Giriş</option>
                      <option value="MANUEL_CIKIS">Manuel Çıkış</option>
                      <option value="DUZELTME">Düzeltme</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label text-xs">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={uFilterStart}
                      onChange={(e) => setUFilterStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label text-xs">Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="form-input"
                      value={uFilterEnd}
                      onChange={(e) => setUFilterEnd(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn btn-primary" onClick={handleUFilter} disabled={isPending}>
                    {isPending ? "Yükleniyor..." : "Filtrele"}
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setUFilterProduct("");
                      setUFilterType("");
                      setUFilterStart("");
                      setUFilterEnd("");
                      fetchUMovements(1, {});
                    }}
                  >
                    Sıfırla
                  </button>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">Ürün Stok Hareketleri</h2>
                <span className="text-sm text-slate-400">{uTotalCount} kayıt</span>
              </div>
              <div className="table-wrapper border-0 rounded-t-none">
                {uMovements.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-slate-400 text-sm">Hareket kaydı bulunamadı.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Ürün</th>
                        <th>Tip</th>
                        <th>Miktar</th>
                        <th>Açıklama</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uMovements.map((m) => {
                        const typeInfo = U_TYPE_LABELS[m.type] || { label: m.type, className: "badge-slate", color: "text-slate-600", sign: "" };
                        const qty = parseFloat(m.quantity.toString());
                        return (
                          <tr key={m.id}>
                            <td className="text-slate-500 text-sm whitespace-nowrap">
                              {new Date(m.date).toLocaleDateString("tr-TR", {
                                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                              })}
                            </td>
                            <td>
                              <div className="font-medium text-slate-800">{m.product.name}</div>
                              {m.product.code && <div className="text-xs text-slate-400 font-mono">{m.product.code}</div>}
                            </td>
                            <td>
                              <span className={typeInfo.className}>{typeInfo.label}</span>
                            </td>
                            <td className={`font-semibold ${typeInfo.color}`}>
                              {qty > 0 ? "+" : ""}{qty.toLocaleString("tr-TR")} adet
                            </td>
                            <td className="text-slate-500 text-sm">{m.description || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              {uPages > 1 && (
                <div className="px-6 pb-4">
                  <Pagination currentPage={uPage} totalPages={uPages} onPageChange={handleUPageChange} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Stok Kartı Modal (Hammadde) */}
      <Modal
        isOpen={isCardOpen}
        onClose={() => setIsCardOpen(false)}
        title={`Stok Kartı — ${cardMaterial?.name ?? ""}`}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={() => setIsCardOpen(false)}>Kapat</button>
        }
      >
        {cardMaterial && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-xl p-5 text-center">
              <div className="text-sm text-slate-400 mb-1">Güncel Stok</div>
              <div className="text-4xl font-bold text-white">
                {parseFloat(cardMaterial.currentStock?.toString() || "0").toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
              </div>
              <div className="text-slate-400 text-sm mt-1">{cardMaterial.unit}</div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
              {cardMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">Hareket kaydı yok.</div>
              ) : (
                <table className="data-table text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Tarih</th>
                      <th>Tip</th>
                      <th>Miktar</th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardMovements.map((mv: any) => {
                      const typeInfo = H_TYPE_LABELS[mv.type];
                      const amt = parseFloat(mv.amount?.toString() || "0");
                      return (
                        <tr key={mv.id}>
                          <td className="text-slate-500 whitespace-nowrap">
                            {new Date(mv.date).toLocaleDateString("tr-TR")}
                          </td>
                          <td><span className={typeInfo?.className}>{typeInfo?.label}</span></td>
                          <td className="font-semibold">
                            <span className={mv.type === "GIRIS" ? "text-green-700" : "text-red-700"}>
                              {mv.type === "GIRIS" ? "+" : "-"}{amt.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} {cardMaterial.unit}
                            </span>
                          </td>
                          <td className="text-slate-500">{mv.description || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
