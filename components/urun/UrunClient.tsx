"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  addRecipeLine,
  deleteRecipeLine,
} from "@/lib/actions/urun";
import { RawMaterial } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

interface RecipeWithMaterial {
  id: string;
  productId: string;
  rawMaterialId: string;
  quantityPerUnit: Decimal;
  rawMaterial: RawMaterial;
}

interface ProductWithRecipes {
  id: string;
  name: string;
  unitWeight: Decimal | null;
  createdAt: Date;
  recipes: RecipeWithMaterial[];
}

interface UrunClientProps {
  initialProducts: ProductWithRecipes[];
  rawMaterials: RawMaterial[];
}

type ModalType = "create" | "edit" | "recete" | "delete" | null;

export function UrunClient({ initialProducts, rawMaterials }: UrunClientProps) {
  const [products, setProducts] = useState<ProductWithRecipes[]>(initialProducts);
  const [modal, setModal] = useState<ModalType>(null);
  const [selected, setSelected] = useState<ProductWithRecipes | null>(null);
  const [error, setError] = useState("");
  const [recipeError, setRecipeError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setError("");
    setRecipeError("");
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleCreate = async (formData: FormData) => {
    setError("");
    startTransition(async () => {
      try {
        await createProduct(formData);
        closeModal();
        showSuccess("Ürün eklendi.");
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
        await updateProduct(selected.id, formData);
        closeModal();
        showSuccess("Ürün güncellendi.");
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
        await deleteProduct(selected.id);
        closeModal();
        showSuccess("Ürün silindi.");
        window.location.reload();
      } catch (e: unknown) {
        setError((e as Error).message);
      }
    });
  };

  const handleAddRecipe = async (formData: FormData) => {
    if (!selected) return;
    setRecipeError("");
    formData.set("productId", selected.id);
    startTransition(async () => {
      try {
        await addRecipeLine(formData);
        showSuccess("Reçete satırı eklendi.");
        window.location.reload();
      } catch (e: unknown) {
        setRecipeError((e as Error).message);
      }
    });
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    setRecipeError("");
    startTransition(async () => {
      try {
        await deleteRecipeLine(recipeId);
        showSuccess("Reçete satırı silindi.");
        window.location.reload();
      } catch (e: unknown) {
        setRecipeError((e as Error).message);
      }
    });
  };

  const selectedRecipes = selected?.recipes || [];
  const totalGram = selectedRecipes.reduce(
    (sum, r) => sum + parseFloat(r.quantityPerUnit.toString()),
    0
  );

  // Reçetede olmayan hammaddeler
  const availableMaterials = rawMaterials.filter(
    (m) => !selectedRecipes.find((r) => r.rawMaterialId === m.id)
  );

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Ürünler & Reçeteler</h1>
        <button className="btn-primary btn" onClick={() => setModal("create")}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Yeni Ürün Ekle
        </button>
      </div>

      <div className="page-body">
        {success && <div className="alert-success mb-4">{success}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="stat-card">
            <div className="text-2xl font-bold text-slate-800">{products.length}</div>
            <div className="text-sm text-slate-500 mt-1">Toplam Ürün</div>
          </div>
          <div className="stat-card">
            <div className="text-2xl font-bold text-blue-600">
              {products.filter((p) => p.recipes.length > 0).length}
            </div>
            <div className="text-sm text-slate-500 mt-1">Reçetesi Tanımlı</div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-slate-700">Ürün Listesi</h2>
            <span className="text-sm text-slate-400">{products.length} ürün</span>
          </div>
          <div className="table-wrapper rounded-t-none border-0">
            {products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-slate-500 font-medium">Henüz ürün eklenmemiş</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ürün Adı</th>
                    <th>Reçete (Hammadde Sayısı)</th>
                    <th>Toplam Gramaj</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const total = p.recipes.reduce(
                      (sum, r) => sum + parseFloat(r.quantityPerUnit.toString()),
                      0
                    );
                    return (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-800">{p.name}</td>
                        <td>
                          {p.recipes.length === 0 ? (
                            <span className="badge-yellow">Reçete yok</span>
                          ) : (
                            <span className="badge-blue">{p.recipes.length} hammadde</span>
                          )}
                        </td>
                        <td className="text-slate-600">
                          {p.recipes.length > 0 ? `${total.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} birim/adet` : "—"}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => { setSelected(p); setModal("recete"); }}
                            >
                              Reçete Düzenle
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => { setSelected(p); setModal("edit"); }}
                            >
                              Düzenle
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => { setSelected(p); setModal("delete"); }}
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
        title="Yeni Ürün Ekle"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button form="form-create-urun" type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <form id="form-create-urun" action={handleCreate} className="space-y-4">
          <div>
            <label className="form-label">Ürün Adı *</label>
            <input name="name" required className="form-input" placeholder="örn: PVC Boru 10mm" />
          </div>
        </form>
      </Modal>

      {/* ─── EDIT MODAL ─── */}
      <Modal
        isOpen={modal === "edit"}
        onClose={closeModal}
        title="Ürün Düzenle"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button form="form-edit-urun" type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? "Güncelleniyor..." : "Güncelle"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <form id="form-edit-urun" action={handleUpdate} className="space-y-4">
          <div>
            <label className="form-label">Ürün Adı *</label>
            <input name="name" required defaultValue={selected?.name} className="form-input" />
          </div>
        </form>
      </Modal>

      {/* ─── DELETE MODAL ─── */}
      <Modal
        isOpen={modal === "delete"}
        onClose={closeModal}
        title="Ürünü Sil"
        footer={
          <>
            <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={isPending}>
              {isPending ? "Siliniyor..." : "Evet, Sil"}
            </button>
          </>
        }
      >
        {error && <div className="alert-error mb-2">{error}</div>}
        <p className="text-slate-600 text-sm">
          <strong>{selected?.name}</strong> ürününü silmek istiyor musunuz? Ürünün reçetesi de silinecek.
        </p>
      </Modal>

      {/* ─── REÇETE DÜZENLE MODAL ─── */}
      <Modal
        isOpen={modal === "recete"}
        onClose={closeModal}
        title={`Reçete — ${selected?.name}`}
        size="lg"
        footer={
          <button className="btn btn-secondary" onClick={closeModal}>Kapat</button>
        }
      >
        <div className="space-y-5">
          {recipeError && <div className="alert-error">{recipeError}</div>}

          {/* Toplam bilgi */}
          {selectedRecipes.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-700">
              <strong>Toplam:</strong>{" "}
              {totalGram.toLocaleString("tr-TR", { maximumFractionDigits: 3 })} birim / adet
            </div>
          )}

          {/* Mevcut reçete satırları */}
          {selectedRecipes.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg">
              Henüz reçete satırı eklenmemiş.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hammadde</th>
                    <th>Miktar/Adet</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipes.map((r) => (
                    <tr key={r.id}>
                      <td className="font-medium text-slate-800">{r.rawMaterial.name}</td>
                      <td>
                        {parseFloat(r.quantityPerUnit.toString()).toLocaleString("tr-TR", { maximumFractionDigits: 3 })} {r.rawMaterial.unit}
                      </td>
                      <td>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteRecipe(r.id)}
                          disabled={isPending}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Yeni satır ekleme formu */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Hammadde Ekle</p>
            {rawMaterials.length === 0 ? (
              <div className="alert-warning text-sm">
                Önce /hammaddeler sayfasından hammadde tanımlayın.
              </div>
            ) : availableMaterials.length === 0 ? (
              <div className="alert-info text-sm">
                Tüm hammaddeler zaten bu reçetede mevcut.
              </div>
            ) : (
              <form action={handleAddRecipe} className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="form-label text-xs">Hammadde</label>
                  <select name="rawMaterialId" required className="form-select">
                    <option value="">Seçin...</option>
                    {availableMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-36">
                  <label className="form-label text-xs">Miktar/Adet</label>
                  <input
                    name="quantityPerUnit"
                    type="number"
                    min="0.001"
                    step="0.001"
                    required
                    className="form-input"
                    placeholder="0"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isPending}
                >
                  Ekle
                </button>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
