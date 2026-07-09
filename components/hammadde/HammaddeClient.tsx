"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
  addStockEntry,
} from "@/lib/actions/hammadde";
import { RawMaterial } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface HammaddeClientProps {
  initialData: RawMaterial[];
}

type ModalType = "create" | "edit" | "stokGiris" | "delete" | null;

function formatStock(val: Decimal | number, unit: string) {
  const num = typeof val === "number" ? val : parseFloat(val.toString());
  return `${num.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${unit}`;
}

function isCritical(stock: Decimal | number, critical: Decimal | number | null): boolean {
  if (critical === null || critical === undefined) return false;
  const s = typeof stock === "number" ? stock : parseFloat(stock.toString());
  const c = typeof critical === "number" ? critical : parseFloat(critical.toString());
  return s <= c;
}

export function HammaddeClient({ initialData }: HammaddeClientProps) {
  const [data, setData] = useState<RawMaterial[]>(initialData);
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<RawMaterial | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setError("");
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleCreate = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      try {
        await createRawMaterial(formData);
        closeModal();
        showSuccess("Hammadde başarıyla eklendi.");
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleUpdate = async (formData: FormData) => {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      try {
        await updateRawMaterial(selected.id, formData);
        closeModal();
        showSuccess("Hammadde güncellendi.");
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleDelete = async () => {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      try {
        await deleteRawMaterial(selected.id);
        closeModal();
        showSuccess("Hammadde silindi.");
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleStokGiris = async (formData: FormData) => {
    if (!selected) return;
    setError("");
    formData.set("rawMaterialId", selected.id);
    startTransition(async () => {
      try {
        await addStockEntry(formData);
        closeModal();
        showSuccess(`${selected.name} için stok girişi kaydedildi.`);
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Hammadde Yönetimi</h1>
        <button
          id="btn-yeni-hammadde"
          className="btn-primary btn"
          onClick={() => setModal("create")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Hammadde Ekle
        </button>
      </div>

      <div className="page-body">
        {success && (
          <div className="alert-success mb-4">{success}</div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="stat-card">
            <div className="text-2xl font-bold text-slate-800">{data.length}</div>
            <div className="text-sm text-slate-500 mt-1">Toplam Hammadde</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-red-600">
              {data.filter((m) => isCritical(m.currentStock, m.criticalLevel)).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Kritik Seviyede</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-green-600">
              {data.filter((m) => !isCritical(m.currentStock, m.criticalLevel)).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Normal Seviyede</div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Hammadde Listesi</h2>
            <span className="text-sm text-slate-400">{data.length} kayıt</span>
          </div>
          <div className="table-wrapper rounded-t-none rounded-b-xl border-0">
            {data.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Henüz hammadde eklenmemiş</p>
                <p className="text-slate-400 text-sm mt-1">
                  &quot;Yeni Hammadde Ekle&quot; butonuyla başlayın.
                </p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hammadde Adı</th>
                    <th>Mevcut Stok</th>
                    <th>Kritik Seviye</th>
                    <th>Durum</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((m) => {
                    const critical = isCritical(m.currentStock, m.criticalLevel);
                    return (
                      <tr key={m.id}>
                        <td className="font-medium text-slate-800">{m.name}</td>
                        <td>
                          <span className={`font-semibold ${critical ? "text-red-600" : "text-slate-700"}`}>
                            {formatStock(m.currentStock, m.unit)}
                          </span>
                        </td>
                        <td className="text-slate-500">
                          {m.criticalLevel
                            ? formatStock(m.criticalLevel, m.unit)
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td>
                          {critical ? (
                            <span className="badge-red">⚠ Kritik</span>
                          ) : (
                            <span className="badge-green">✓ Normal</span>
                          )}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => { setSelected(m); setModal("stokGiris"); }}
                              title="Stok Girişi Yap"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Stok Girişi
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setSelected(m); setModal("edit"); }}
                            >
                              Düzenle
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setSelected(m); setModal("delete"); }}
                            >
                              Sil
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

      {/* ─── CREATE MODAL ─── */}
      <Modal
        isOpen={modal === "create"}
        onClose={closeModal}
        title="Yeni Hammadde Ekle"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button
              form="form-create-hammadde"
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <form
          id="form-create-hammadde"
          action={handleCreate}
          className="space-y-4"
        >
          <div>
            <label className="form-label">Hammadde Adı *</label>
            <input
              name="name"
              required
              className="form-input"
              placeholder="örn: A Maddesi (PVC)"
            />
          </div>
          <div>
            <label className="form-label">Birim *</label>
            <select name="unit" required className="form-select">
              <option value="">Birim seçin...</option>
              <option value="gram">gram</option>
              <option value="kg">kg</option>
              <option value="litre">litre</option>
              <option value="ml">ml</option>
              <option value="adet">adet</option>
              <option value="metre">metre</option>
            </select>
          </div>
          <div>
            <label className="form-label">Başlangıç Stok Miktarı *</label>
            <input
              name="currentStock"
              type="number"
              min="0"
              step="0.001"
              required
              defaultValue="0"
              className="form-input"
              placeholder="0"
            />
          </div>
          <div>
            <label className="form-label">Kritik Seviye (opsiyonel)</label>
            <input
              name="criticalLevel"
              type="number"
              min="0"
              step="0.001"
              className="form-input"
              placeholder="Bu seviyenin altına düşünce uyarı verir"
            />
          </div>
        </form>
      </Modal>

      {/* ─── EDIT MODAL ─── */}
      <Modal
        isOpen={modal === "edit"}
        onClose={closeModal}
        title="Hammadde Düzenle"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button
              form="form-edit-hammadde"
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending ? "Kaydediliyor..." : "Güncelle"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <form
          id="form-edit-hammadde"
          action={handleUpdate}
          className="space-y-4"
        >
          <div>
            <label className="form-label">Hammadde Adı *</label>
            <input
              name="name"
              required
              defaultValue={selected?.name}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Birim *</label>
            <select name="unit" required defaultValue={selected?.unit} className="form-select">
              <option value="gram">gram</option>
              <option value="kg">kg</option>
              <option value="litre">litre</option>
              <option value="ml">ml</option>
              <option value="adet">adet</option>
              <option value="metre">metre</option>
            </select>
          </div>
          <div>
            <label className="form-label">Kritik Seviye (opsiyonel)</label>
            <input
              name="criticalLevel"
              type="number"
              min="0"
              step="0.001"
              defaultValue={
                selected?.criticalLevel
                  ? parseFloat(selected.criticalLevel.toString())
                  : ""
              }
              className="form-input"
            />
          </div>
          <div className="alert-info text-xs">
            Not: Stok miktarını değiştirmek için &quot;Stok Girişi Yap&quot; veya Manuel Çıkış kullanın.
          </div>
        </form>
      </Modal>

      {/* ─── STOK GİRİŞİ MODAL ─── */}
      <Modal
        isOpen={modal === "stokGiris"}
        onClose={closeModal}
        title={`Stok Girişi — ${selected?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button
              form="form-stok-giris"
              type="submit"
              className="btn btn-primary"
              disabled={isPending}
            >
              {isPending ? "Kaydediliyor..." : "Stok Ekle"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <div className="bg-slate-50 rounded-lg p-3 mb-4 text-sm">
          <span className="text-slate-500">Mevcut Stok: </span>
          <span className="font-semibold text-slate-800">
            {selected ? formatStock(selected.currentStock, selected.unit) : "—"}
          </span>
        </div>
        <form
          id="form-stok-giris"
          action={handleStokGiris}
          className="space-y-4"
        >
          <div>
            <label className="form-label">Giriş Miktarı ({selected?.unit}) *</label>
            <input
              name="amount"
              type="number"
              min="0.001"
              step="0.001"
              required
              className="form-input"
              placeholder="Eklenecek miktar"
            />
          </div>
          <div>
            <label className="form-label">Tarih *</label>
            <input
              name="date"
              type="date"
              defaultValue={today}
              required
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Açıklama (opsiyonel)</label>
            <input
              name="description"
              className="form-input"
              placeholder="örn: Sipariş #1234 teslim alındı"
            />
          </div>
        </form>
      </Modal>

      {/* ─── DELETE MODAL ─── */}
      <Modal
        isOpen={modal === "delete"}
        onClose={closeModal}
        title="Hammaddeyi Sil"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? "Siliniyor..." : "Evet, Sil"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <p className="text-slate-600 text-sm">
          <strong className="text-slate-800">{selected?.name}</strong> hammaddesini silmek
          istediğinizden emin misiniz? Bu işlem geri alınamaz. Hammaddenin tüm stok
          hareketleri de silinecektir.
        </p>
      </Modal>
    </>
  );
}
