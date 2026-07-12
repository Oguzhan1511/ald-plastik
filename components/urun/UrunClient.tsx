"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  wastePercentage: Decimal;
  rawMaterial: RawMaterial;
}

interface ProductWithRecipes {
  id: string;
  name: string;
  code: string | null;
  parentProduct: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "recipe_desc" | "recipe_asc">("name_asc");
  const [newRecipes, setNewRecipes] = useState<{rawMaterialId: string, quantityPerUnit: string, wastePercentage: string}[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setProducts(initialProducts);
    if (selected) {
      const updatedSelected = initialProducts.find((p) => p.id === selected.id);
      setSelected(updatedSelected || null);
    }
  }, [initialProducts, selected?.id]);

  // Ürün listesi arama ve sıralama
  const filteredProducts = useMemo(() => {
    let result = products;

    // Arama
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.code && p.code.toLowerCase().includes(q))
      );
    }

    // Sıralama
    return [...result].sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return a.name.localeCompare(b.name, "tr-TR");
        case "name_desc":
          return b.name.localeCompare(a.name, "tr-TR");
        case "recipe_desc":
          return b.recipes.length - a.recipes.length;
        case "recipe_asc":
          return a.recipes.length - b.recipes.length;
        default:
          return 0;
      }
    });
  }, [products, searchQuery, sortBy]);

  const closeModal = () => {
    setModal(null);
    setSelected(null);
    setError("");
    setRecipeError("");
    setNewRecipes([]);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  const handleCreate = async (formData: FormData) => {
    setError("");
    
    // Geçerli reçete satırlarını filtrele ve formData'ya ekle
    const validRecipes = newRecipes.filter(r => r.rawMaterialId && r.quantityPerUnit);
    if (validRecipes.length > 0) {
      formData.append("recipes", JSON.stringify(validRecipes));
    }

    startTransition(async () => {
      try {
        const res = await createProduct(formData);
        closeModal();
        showSuccess(res.warning || "Ürün eklendi.");
        router.refresh();
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
        const res = await updateProduct(selected.id, formData);
        closeModal();
        showSuccess(res.warning || "Ürün güncellendi.");
        router.refresh();
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
        router.refresh();
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
        router.refresh();
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
        router.refresh();
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
          <div className="card-header flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-700 flex-shrink-0">Ürün Listesi</h2>
            
            <div className="flex flex-1 w-full md:max-w-xl gap-3 items-center justify-end">
              {/* Arama kutusu */}
              <div className="relative flex-1 max-w-xs">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  id="input-urun-ara"
                  className="form-input pl-9 text-sm py-1.5"
                  placeholder="Ad veya kod ile ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Sıralama Kutusu */}
              <div className="flex-shrink-0">
                <select
                  className="form-select text-sm py-1.5"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="name_asc">A'dan Z'ye</option>
                  <option value="name_desc">Z'den A'ya</option>
                  <option value="recipe_desc">Hammadde: Önce En Çok</option>
                  <option value="recipe_asc">Reçetesi Olmayanlar Önce</option>
                </select>
              </div>
              
              <span className="text-sm text-slate-400 hidden lg:inline-block flex-shrink-0">{filteredProducts.length} ürün</span>
            </div>
          </div>
          <div className="table-wrapper rounded-t-none border-0">
            {filteredProducts.length === 0 ? (
              <div className="empty-state">
                {products.length === 0 ? (
                  <>
                    <div className="empty-state-icon">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-slate-500 font-medium">Henüz ürün eklenmemiş</p>
                  </>
                ) : (
                  <p className="text-slate-400 text-sm">
                    &quot;{searchQuery}&quot; ile eşleşen ürün bulunamadı.
                  </p>
                )}
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ürün Adı</th>
                    <th>Ait Olduğu Mamül</th>
                    <th>Kod</th>
                    <th>Reçete (Hammadde Sayısı)</th>
                    <th>Toplam Gramaj</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const total = p.recipes.reduce(
                      (sum, r) => sum + parseFloat(r.quantityPerUnit.toString()),
                      0
                    );
                    return (
                      <tr key={p.id}>
                        <td className="font-medium text-slate-800">{p.name}</td>
                        <td className="text-slate-600">{p.parentProduct || <span className="text-slate-300">—</span>}</td>
                        <td>
                          {p.code ? (
                            <span className="badge-blue font-mono text-xs">{p.code}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
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
                              className="btn btn-primary btn-sm whitespace-nowrap"
                              onClick={() => { setSelected(p); setModal("recete"); }}
                            >
                              Reçete Düzenle
                            </button>
                            <button
                              className="btn btn-secondary btn-sm whitespace-nowrap"
                              onClick={() => { setSelected(p); setModal("edit"); }}
                            >
                              Düzenle
                            </button>
                            <button
                              className="btn btn-danger btn-sm whitespace-nowrap"
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
        size="lg"
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
        <form id="form-create-urun" action={handleCreate} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="form-label">Ürün Adı *</label>
              <input name="name" required className="form-input" placeholder="örn: PVC Boru 10mm" />
            </div>
            <div>
              <label className="form-label">Ürün Kodu <span className="text-slate-400 font-normal">(opsiyonel)</span></label>
              <input
                name="code"
                className="form-input font-mono"
                placeholder="örn: 602051Z"
                autoComplete="off"
              />
              <p className="text-xs text-slate-400 mt-1">Benzersiz bir kod — üretim formunda arama için kullanılır.</p>
            </div>
            <div>
              <label className="form-label">Ait Olduğu Mamül <span className="text-slate-400 font-normal">(opsiyonel)</span></label>
              <input name="parentProduct" className="form-input" placeholder="örn: Beyaz Koltuk" />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0 text-slate-700">Başlangıç Reçetesi (Opsiyonel)</label>
              <button
                type="button"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
                onClick={() => setNewRecipes([...newRecipes, { rawMaterialId: "", quantityPerUnit: "", wastePercentage: "" }])}
              >
                + Hammadde Ekle
              </button>
            </div>
            
            {newRecipes.length === 0 ? (
              <p className="text-sm text-slate-500">Ürünü oluşturduktan sonra da reçete tanımlayabilirsiniz.</p>
            ) : (
              <div className="space-y-3">
                {newRecipes.map((r, idx) => (
                  <div key={idx} className="flex gap-2 items-end bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex-1">
                      <label className="form-label text-xs">Hammadde</label>
                      <select 
                        required
                        className="form-select text-sm py-1.5"
                        value={r.rawMaterialId}
                        onChange={(e) => {
                          const arr = [...newRecipes];
                          arr[idx].rawMaterialId = e.target.value;
                          setNewRecipes(arr);
                        }}
                      >
                        <option value="">Seçin...</option>
                        {rawMaterials.map(m => (
                          <option key={m.id} value={m.id} disabled={newRecipes.some((nr, i) => i !== idx && nr.rawMaterialId === m.id)}>
                            {m.name} {m.code ? `(${m.code})` : ""} ({m.unit})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <label className="form-label text-xs">Miktar</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        required
                        className="form-input text-sm py-1.5"
                        placeholder="0"
                        value={r.quantityPerUnit}
                        onChange={(e) => {
                          const arr = [...newRecipes];
                          arr[idx].quantityPerUnit = e.target.value;
                          setNewRecipes(arr);
                        }}
                      />
                    </div>
                    <div className="w-24">
                      <label className="form-label text-xs">Fire %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="form-input text-sm py-1.5"
                        placeholder="0"
                        value={r.wastePercentage}
                        onChange={(e) => {
                          const arr = [...newRecipes];
                          arr[idx].wastePercentage = e.target.value;
                          setNewRecipes(arr);
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm mb-[1px] px-2"
                      onClick={() => setNewRecipes(newRecipes.filter((_, i) => i !== idx))}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
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
          <div>
            <label className="form-label">Ürün Kodu <span className="text-slate-400 font-normal">(opsiyonel)</span></label>
            <input
              name="code"
              defaultValue={selected?.code ?? ""}
              className="form-input font-mono"
              placeholder="örn: 602051Z"
              autoComplete="off"
            />
            <p className="text-xs text-slate-400 mt-1">Benzersiz — boş bırakılırsa silinir.</p>
          </div>
          <div>
            <label className="form-label">Ait Olduğu Mamül <span className="text-slate-400 font-normal">(opsiyonel)</span></label>
            <input
              name="parentProduct"
              defaultValue={selected?.parentProduct ?? ""}
              className="form-input"
              placeholder="örn: Beyaz Koltuk"
            />
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
        title={`Reçete — ${selected?.name}${selected?.code ? ` (${selected.code})` : ""}`}
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
                    <th>Fire Oranı</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecipes.map((r) => {
                    const wastePercent = parseFloat(r.wastePercentage.toString()) * 100;
                    return (
                      <tr key={r.id}>
                        <td className="font-medium text-slate-800">
                          {r.rawMaterial.name}
                          {r.rawMaterial.code && <span className="text-slate-400 text-sm ml-1 font-mono">({r.rawMaterial.code})</span>}
                        </td>
                        <td>
                          {parseFloat(r.quantityPerUnit.toString()).toLocaleString("tr-TR", { maximumFractionDigits: 3 })} {r.rawMaterial.unit}
                        </td>
                        <td>
                          {wastePercent > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                              %{wastePercent.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} fire
                            </span>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
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
                    );
                  })}
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
              <form action={handleAddRecipe} className="space-y-3">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="form-label text-xs">Hammadde</label>
                    <select name="rawMaterialId" required className="form-select">
                      <option value="">Seçin...</option>
                      {availableMaterials.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} {m.code ? `(${m.code})` : ""} ({m.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
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
                  <div className="w-28">
                    <label className="form-label text-xs">Fire Oranı</label>
                    <div className="relative">
                      <input
                        name="wastePercentage"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        className="form-input pr-7"
                        placeholder="0"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">%</span>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary flex-shrink-0"
                    disabled={isPending}
                  >
                    Ekle
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Fire oranı opsiyonel — örn. 3 yazarsanız %3 fire ile düşüm yapılır.
                </p>
              </form>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
