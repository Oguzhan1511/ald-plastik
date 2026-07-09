"use client";

import { useState, useTransition, useCallback } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { Modal } from "@/components/ui/Modal";
import { getStockMovements, getStockCard, MovementFilters, MovementType } from "@/lib/actions/hareket";
import { RawMaterial } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface Movement {
  id: string;
  type: MovementType;
  amount: Decimal;
  date: Date;
  description: string | null;
  rawMaterial: RawMaterial;
  productionRecord: { id: string; product: { name: string } } | null;
}

interface HareketiClientProps {
  initialMovements: Movement[];
  initialTotal: number;
  initialTotalPages: number;
  rawMaterials: RawMaterial[];
}

interface StockCardData {
  rawMaterial: RawMaterial | null;
  movements: Movement[];
}

const TYPE_LABELS: Record<MovementType, { label: string; className: string }> = {
  GIRIS: { label: "Giriş", className: "badge-green" },
  URETIM_CIKISI: { label: "Üretim Çıkışı", className: "badge-red" },
  MANUEL_CIKIS: { label: "Manuel Çıkış", className: "badge-orange" },
  DUZELTME: { label: "Düzeltme", className: "badge-slate" },
};

export function HareketiClient({
  initialMovements,
  initialTotal,
  initialTotalPages,
  rawMaterials,
}: HareketiClientProps) {
  const [movements, setMovements] = useState<Movement[]>(initialMovements);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [page, setPage] = useState(1);

  const [filterMaterial, setFilterMaterial] = useState("");
  const [filterType, setFilterType] = useState<MovementType | "">("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const [stockCardData, setStockCardData] = useState<StockCardData | null>(null);
  const [isCardOpen, setIsCardOpen] = useState(false);

  const [isPending, startTransition] = useTransition();

  const fetchMovements = useCallback(
    (newPage: number, filters?: MovementFilters) => {
      startTransition(async () => {
        const f = filters ?? {
          rawMaterialId: filterMaterial || undefined,
          type: (filterType as MovementType) || undefined,
          startDate: filterStart || undefined,
          endDate: filterEnd || undefined,
        };
        const res = await getStockMovements({ ...f, page: newPage, pageSize: 20 });
        setMovements(res.movements as unknown as Movement[]);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setPage(newPage);
      });
    },
    [filterMaterial, filterType, filterStart, filterEnd]
  );

  const handleFilter = () => fetchMovements(1);

  const handlePageChange = (p: number) => fetchMovements(p);

  const handleOpenStockCard = (materialId: string) => {
    startTransition(async () => {
      const data = await getStockCard(materialId);
      setStockCardData(data as unknown as StockCardData);
      setIsCardOpen(true);
    });
  };

  const cardMovements = stockCardData?.movements as unknown as Movement[] ?? [];
  const cardMaterial = stockCardData?.rawMaterial;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Hareket Geçmişi</h1>
        <span className="text-sm text-slate-400">{total} kayıt</span>
      </div>

      <div className="page-body">
        {/* Filters */}
        <div className="card mb-6">
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="form-label text-xs">Hammadde</label>
                <select
                  className="form-select"
                  value={filterMaterial}
                  onChange={(e) => setFilterMaterial(e.target.value)}
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as MovementType | "")}
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
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label text-xs">Bitiş Tarihi</label>
                <input
                  type="date"
                  className="form-input"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                className="btn btn-primary"
                onClick={handleFilter}
                disabled={isPending}
              >
                {isPending ? "Yükleniyor..." : "Filtrele"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setFilterMaterial("");
                  setFilterType("");
                  setFilterStart("");
                  setFilterEnd("");
                  fetchMovements(1, {});
                }}
              >
                Sıfırla
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrapper border-0">
            {movements.length === 0 ? (
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
                  {movements.map((m) => {
                    const typeInfo = TYPE_LABELS[m.type];
                    const amount = parseFloat(m.amount.toString());
                    return (
                      <tr key={m.id}>
                        <td className="text-slate-500 text-sm whitespace-nowrap">
                          {new Date(m.date).toLocaleDateString("tr-TR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
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
                          <span className={typeInfo.className}>{typeInfo.label}</span>
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

          {totalPages > 1 && (
            <div className="px-6 pb-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stok Kartı Modal */}
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
            {/* Güncel stok */}
            <div className="bg-slate-900 text-white rounded-xl p-5 text-center">
              <div className="text-sm text-slate-400 mb-1">Güncel Stok</div>
              <div className="text-4xl font-bold text-white">
                {parseFloat(cardMaterial.currentStock.toString()).toLocaleString("tr-TR", { maximumFractionDigits: 2 })}
              </div>
              <div className="text-slate-400 text-sm mt-1">{cardMaterial.unit}</div>
              {cardMaterial.criticalLevel && (
                <div className="text-xs text-slate-500 mt-2">
                  Kritik Seviye: {parseFloat(cardMaterial.criticalLevel.toString()).toLocaleString("tr-TR")} {cardMaterial.unit}
                </div>
              )}
            </div>

            {/* Hareket listesi */}
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
                    {cardMovements.map((mv) => {
                      const typeInfo = TYPE_LABELS[mv.type];
                      const amt = parseFloat(mv.amount.toString());
                      return (
                        <tr key={mv.id}>
                          <td className="text-slate-500 whitespace-nowrap">
                            {new Date(mv.date).toLocaleDateString("tr-TR")}
                          </td>
                          <td><span className={typeInfo.className}>{typeInfo.label}</span></td>
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
