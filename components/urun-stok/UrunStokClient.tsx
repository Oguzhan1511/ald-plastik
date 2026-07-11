"use client";

import { useState, useTransition, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createProductStockExit,
  createProductStockEntry,
  adjustProductStock,
} from "@/lib/actions/urun-stok";
import { Decimal } from "@prisma/client/runtime/library";

interface ProductStock {
  id: string;
  name: string;
  code: string | null;
  currentStock: Decimal;
  criticalLevel: Decimal | null;
  updatedAt: Date;
}

interface UrunStokClientProps {
  products: ProductStock[];
}

type ModalType = "exit" | "entry" | "adjust" | null;

const typeConfig: Record<string, { label: string; badgeClass: string; sign: string; color: string }> = {
  URETIM_GIRISI: { label: "Üretim Girişi", badgeClass: "badge-blue", sign: "+", color: "text-blue-600" },
  SATIS_CIKISI:  { label: "Satış Çıkışı",  badgeClass: "badge-red",  sign: "-", color: "text-red-600"  },
  MANUEL_GIRIS:  { label: "Manuel Giriş",  badgeClass: "badge-green", sign: "+", color: "text-green-600" },
  MANUEL_CIKIS:  { label: "Manuel Çıkış",  badgeClass: "badge-orange", sign: "-", color: "text-orange-600" },
  DUZELTME:      { label: "Düzeltme",      badgeClass: "badge-slate", sign: "±", color: "text-slate-600" },
};

export function UrunStokClient({ products }: UrunStokClientProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<ProductStock | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setError("");
  };

  const openModal = (type: ModalType, product: ProductStock) => {
    setSelected(product);
    setModal(type);
    setError("");
  };

  const handleExit = async (formData: FormData) => {
    if (!selected) return;
    formData.set("productId", selected.id);
    setError("");
    startTransition(async () => {
      try {
        await createProductStockExit(formData);
        closeModal();
        showSuccess(`${selected.name} için çıkış kaydedildi.`);
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleEntry = async (formData: FormData) => {
    if (!selected) return;
    formData.set("productId", selected.id);
    setError("");
    startTransition(async () => {
      try {
        await createProductStockEntry(formData);
        closeModal();
        showSuccess(`${selected.name} için giriş kaydedildi.`);
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleAdjust = async (formData: FormData) => {
    if (!selected) return;
    formData.set("productId", selected.id);
    setError("");
    startTransition(async () => {
      try {
        await adjustProductStock(formData);
        closeModal();
        showSuccess(`${selected.name} stoku düzeltildi.`);
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  // Arama filtresi
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code && p.code.toLowerCase().includes(q))
    );
  }, [products, searchQuery]);

  const criticalCount = products.filter((p) => {
    if (!p.criticalLevel) return false;
    return parseFloat(p.currentStock.toString()) <= parseFloat(p.criticalLevel.toString());
  }).length;

  const totalStock = products.reduce(
    (sum, p) => sum + parseFloat(p.currentStock.toString()),
    0
  );

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Ürün Stok Takibi</h1>
      </div>

      <div className="page-body space-y-6">
        {success && <div className="alert-success">{success}</div>}

        {/* Özet Kartlar */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="text-2xl font-bold text-slate-800">{products.length}</div>
            <div className="text-sm text-slate-500 mt-1">Toplam Ürün</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-blue-600">
              {totalStock.toLocaleString("tr-TR")}
            </div>
            <div className="text-sm text-slate-500 mt-1">Toplam Stok (adet)</div>
          </div>
          <div className={`stat-card col-span-2 lg:col-span-1 ${criticalCount > 0 ? "border-red-200 bg-red-50" : ""}`}>
            <div className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-700" : "text-slate-800"}`}>
              {criticalCount}
            </div>
            <div className="text-sm text-slate-500 mt-1">Kritik Stok</div>
          </div>
        </div>

        {/* Ürün Stok Tablosu */}
        <div className="card">
          <div className="card-header flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-700 flex-shrink-0">Ürün Stok Durumu</h2>
            <div className="relative flex-1 max-w-xs">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="form-input pl-9 text-sm py-1.5"
                placeholder="Ad veya kod ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <span className="text-sm text-slate-400 flex-shrink-0">{filteredProducts.length} ürün</span>
          </div>
          <div className="table-wrapper rounded-t-none border-0">
            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                <p className="text-slate-400 text-sm">Ürün bulunamadı.</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ürün</th>
                    <th>Kod</th>
                    <th>Mevcut Stok</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const stock = parseFloat(p.currentStock.toString());
                    const critical = p.criticalLevel
                      ? parseFloat(p.criticalLevel.toString())
                      : null;
                    const isCritical = critical !== null && stock <= critical;
                    const isEmpty = stock === 0;

                    return (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-800">{p.name}</td>
                        <td>
                          {p.code ? (
                            <span className="badge-blue font-mono text-xs">{p.code}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td>
                          <span className={`font-semibold text-base ${isCritical || isEmpty ? "text-red-600" : "text-slate-800"}`}>
                            {stock.toLocaleString("tr-TR")} adet
                          </span>
                          {critical !== null && (
                            <span className="text-xs text-slate-400 ml-1.5">
                              / min {critical.toLocaleString("tr-TR")}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEmpty ? (
                            <span className="badge-red">Stok Yok</span>
                          ) : isCritical ? (
                            <span className="badge-red">⚠ Kritik</span>
                          ) : (
                            <span className="badge-green">✓ Yeterli</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => openModal("exit", p)}
                            >
                              Çıkış
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openModal("entry", p)}
                            >
                              Giriş
                            </button>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => openModal("adjust", p)}
                            >
                              Düzelt
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ─── ÇIKIŞ MODAL ─── */}
      <Modal
        isOpen={modal === "exit"}
        onClose={closeModal}
        title={`Stok Çıkışı — ${selected?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button form="form-stock-exit" type="submit" className="btn btn-danger" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Çıkışı Kaydet"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-3">{error}</div>}
        {selected && (
          <div className="mb-4 px-4 py-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            Mevcut Stok:{" "}
            <strong className="text-slate-800">
              {parseFloat(selected.currentStock.toString()).toLocaleString("tr-TR")} adet
            </strong>
          </div>
        )}
        <form id="form-stock-exit" action={handleExit} className="space-y-4">
          <div>
            <label className="form-label">Çıkış Miktarı (adet) *</label>
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              className="form-input"
              placeholder="örn: 500"
            />
          </div>
          <div>
            <label className="form-label">Tarih *</label>
            <input name="date" type="date" required defaultValue={today} className="form-input" />
          </div>
          <div>
            <label className="form-label">Açıklama (opsiyonel)</label>
            <input name="description" type="text" className="form-input" placeholder="Müşteri, sipariş no vb." />
          </div>
        </form>
      </Modal>

      {/* ─── GİRİŞ MODAL ─── */}
      <Modal
        isOpen={modal === "entry"}
        onClose={closeModal}
        title={`Manuel Stok Girişi — ${selected?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button form="form-stock-entry" type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Girişi Kaydet"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-3">{error}</div>}
        <form id="form-stock-entry" action={handleEntry} className="space-y-4">
          <div>
            <label className="form-label">Giriş Miktarı (adet) *</label>
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              className="form-input"
              placeholder="örn: 1000"
            />
          </div>
          <input type="hidden" name="type" value="MANUEL_GIRIS" />
          <div>
            <label className="form-label">Tarih *</label>
            <input name="date" type="date" required defaultValue={today} className="form-input" />
          </div>
          <div>
            <label className="form-label">Açıklama (opsiyonel)</label>
            <input name="description" type="text" className="form-input" placeholder="İade, sayım düzeltme vb." />
          </div>
        </form>
      </Modal>

      {/* ─── DÜZELTME MODAL ─── */}
      <Modal
        isOpen={modal === "adjust"}
        onClose={closeModal}
        title={`Stok Düzeltme — ${selected?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button form="form-stock-adjust" type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Düzeltmeyi Kaydet"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-3">{error}</div>}
        {selected && (
          <div className="mb-4 px-4 py-3 bg-slate-50 rounded-lg text-sm text-slate-600">
            Mevcut Stok:{" "}
            <strong className="text-slate-800">
              {parseFloat(selected.currentStock.toString()).toLocaleString("tr-TR")} adet
            </strong>
          </div>
        )}
        <form id="form-stock-adjust" action={handleAdjust} className="space-y-4">
          <div>
            <label className="form-label">Yeni Stok Değeri (adet) *</label>
            <input
              name="newStock"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={selected ? parseFloat(selected.currentStock.toString()) : ""}
              className="form-input"
            />
            <p className="text-xs text-slate-400 mt-1">Sayım sonucu gerçek miktarı girin.</p>
          </div>
          <div>
            <label className="form-label">Tarih *</label>
            <input name="date" type="date" required defaultValue={today} className="form-input" />
          </div>
          <div>
            <label className="form-label">Açıklama (opsiyonel)</label>
            <input name="description" type="text" className="form-input" placeholder="Sayım tarihi, neden vb." />
          </div>
        </form>
      </Modal>
    </>
  );
}
