import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Database,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_STORE_CATEGORIES,
  STORE_ANIMATION_PRESET_OPTIONS,
} from '../../data/storeCatalog';
import {
  adminDeleteStoreProduct,
  adminSaveStoreProduct,
  adminSeedDefaultStoreCatalog,
  subscribeStoreProducts,
} from '../../services/storeService';
import {
  LenzoStoreProduct,
  StoreAnimationPreset,
  StoreCategoryId,
} from '../../types/store';
import { apiFetch } from '../../utils/apiConfig';
import { auth } from '../../firebase';
import { StoreAssetPreview } from '../common/StoreAssetPreview';

interface AdminStoreTabProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const DEFAULT_COLORS_BY_CATEGORY: Record<
  StoreCategoryId,
  { primaryColor: string; secondaryColor: string; accentColor: string; glowColor: string; preset: StoreAnimationPreset }
> = {
  vip_frames: {
    primaryColor: '#FF8A00',
    secondaryColor: '#FFC84A',
    accentColor: '#FFE082',
    glowColor: 'rgba(255, 160, 24, 0.75)',
    preset: 'royal_flame',
  },
  special_entry: {
    primaryColor: '#F59E0B',
    secondaryColor: '#9333EA',
    accentColor: '#FEF08A',
    glowColor: 'rgba(245, 158, 11, 0.78)',
    preset: 'imperial_carpet',
  },
  custom_gift: {
    primaryColor: '#9333EA',
    secondaryColor: '#FFC84A',
    accentColor: '#F472B6',
    glowColor: 'rgba(168, 85, 247, 0.8)',
    preset: 'velvet_gift_box',
  },
  premium_assets: {
    primaryColor: '#A855F7',
    secondaryColor: '#EC4899',
    accentColor: '#F5D0FE',
    glowColor: 'rgba(168, 85, 247, 0.82)',
    preset: 'amethyst_prism',
  },
};

function createEmptyDraft(categoryId: StoreCategoryId = 'vip_frames'): LenzoStoreProduct {
  const palette = DEFAULT_COLORS_BY_CATEGORY[categoryId];
  return {
    id: '',
    name: '',
    categoryId,
    priceCoins: 2500,
    description: '',
    imageUrl: '',
    animationUrl: '',
    animationPreset: palette.preset,
    primaryColor: palette.primaryColor,
    secondaryColor: palette.secondaryColor,
    accentColor: palette.accentColor,
    glowColor: palette.glowColor,
    badgeText: '',
    durationDays: 0,
    isFeatured: false,
    enabled: true,
    sortOrder: 10,
  };
}

export const AdminStoreTab: React.FC<AdminStoreTabProps> = ({ onNotify, onError }) => {
  const [products, setProducts] = useState<LenzoStoreProduct[]>([]);
  const [filterCat, setFilterCat] = useState<StoreCategoryId | 'all'>('all');
  const [editing, setEditing] = useState<LenzoStoreProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'animationUrl' | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const unsub = subscribeStoreProducts(setProducts, { includeDisabled: true });
    return () => unsub();
  }, []);

  const filteredProducts = useMemo(() => {
    if (filterCat === 'all') return products;
    return products.filter((p) => p.categoryId === filterCat);
  }, [products, filterCat]);

  const handleUploadAsset = async (
    file: File,
    field: 'imageUrl' | 'animationUrl'
  ) => {
    if (!editing) return;
    setUploadingField(field);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });

      const token = await auth.currentUser?.getIdToken();
      const res = await apiFetch('/api/media/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          dataUrl,
          filename: file.name,
          folder: 'store_assets',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.url) {
        setEditing((prev) => (prev ? { ...prev, [field]: json.url } : null));
        onNotify(`Uploaded ${field === 'imageUrl' ? 'product image' : 'animation asset'}!`);
      } else {
        // Fallback to inline data URL for small icons/images
        if (file.size < 450_000) {
          setEditing((prev) => (prev ? { ...prev, [field]: dataUrl } : null));
          onNotify('Asset attached directly to product.');
        } else {
          onError(json.error || 'Upload failed. Try a smaller file or paste an HTTPS URL.');
        }
      }
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Asset upload failed.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      onError('Product name is required.');
      return;
    }
    if (!editing.priceCoins || editing.priceCoins < 1) {
      onError('Coin price must be greater than 0.');
      return;
    }

    setSaving(true);
    const res = await adminSaveStoreProduct(editing);
    setSaving(false);
    if (!res.success) {
      onError(res.error || 'Failed to save product.');
      return;
    }
    setEditing(null);
    onNotify(`Saved "${editing.name}" — Store updated live!`);
  };

  const handleQuickToggle = async (
    product: LenzoStoreProduct,
    patch: Partial<LenzoStoreProduct>,
    label: string
  ) => {
    const res = await adminSaveStoreProduct({ ...product, ...patch });
    if (res.success) {
      onNotify(`${product.name}: ${label}`);
    } else {
      onError(res.error || 'Failed to update product.');
    }
  };

  const handleDelete = async (productId: string, productName: string) => {
    const res = await adminDeleteStoreProduct(productId);
    setConfirmDeleteId(null);
    if (res.success) {
      onNotify(`Deleted "${productName}" from Lenzo Store.`);
    } else {
      onError(res.error || 'Failed to delete product.');
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    const res = await adminSeedDefaultStoreCatalog();
    setSeeding(false);
    if (res.success) {
      onNotify(`Synced ${res.count} official Lenzo Store products to Firestore!`);
    } else {
      onError(res.error || 'Failed to seed catalog.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
            Lenzo Store Catalog Manager ({products.length} Products)
          </h3>
          <p className="text-[11px] text-[#B9AECF]">
            Add, edit, price, enable/disable, or upload animated assets. Changes sync live to Store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={seeding}
            onClick={() => void handleSeedDefaults()}
            className="px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-purple-200 flex items-center gap-1.5 disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{seeding ? 'Syncing...' : 'Sync Default Catalog'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setEditing(
                createEmptyDraft(filterCat === 'all' ? 'vip_frames' : filterCat)
              )
            }
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setFilterCat('all')}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 ${
            filterCat === 'all'
              ? 'bg-purple-600 text-white'
              : 'bg-white/[0.05] text-[#C5B9DE] hover:text-white'
          }`}
        >
          All ({products.length})
        </button>
        {DEFAULT_STORE_CATEGORIES.map((cat) => {
          const count = products.filter((p) => p.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFilterCat(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 ${
                filterCat === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/[0.05] text-[#C5B9DE] hover:text-white'
              }`}
            >
              {cat.title} ({count})
            </button>
          );
        })}
      </div>

      {/* Add / Edit Product Form */}
      {editing && (
        <div className="rounded-2xl border border-[#FFC84A]/45 bg-[#180A32] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
              {editing.id ? `Edit Store Product (${editing.id})` : 'Create New Store Product'}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Live Preview Column */}
            <div className="rounded-2xl bg-[#0C041A] border border-purple-500/30 p-4 flex flex-col items-center justify-center text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-3">
                Live Store Preview
              </span>
              <StoreAssetPreview product={editing} size="lg" isPlaying={true} />
              <div className="mt-3 text-sm font-black text-white">
                {editing.name || 'Product Name'}
              </div>
              <div className="text-xs font-bold text-amber-300">
                {(editing.priceCoins || 0).toLocaleString()} Coins
              </div>
            </div>

            {/* Form Inputs Column (Span 2) */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Product Name
                </label>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Royal Flame"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Store Category
                </label>
                <select
                  value={editing.categoryId}
                  onChange={(e) => {
                    const nextCat = e.target.value as StoreCategoryId;
                    const defaults = DEFAULT_COLORS_BY_CATEGORY[nextCat];
                    setEditing({
                      ...editing,
                      categoryId: nextCat,
                      animationPreset: defaults.preset,
                      primaryColor: defaults.primaryColor,
                      secondaryColor: defaults.secondaryColor,
                      accentColor: defaults.accentColor,
                      glowColor: defaults.glowColor,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                >
                  {DEFAULT_STORE_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#140A24]">
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Coin Price
                </label>
                <input
                  type="number"
                  min={1}
                  value={editing.priceCoins}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priceCoins: Math.max(0, Number(e.target.value)),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Animation Preset FX
                </label>
                <select
                  value={editing.animationPreset}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      animationPreset: e.target.value as StoreAnimationPreset,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                >
                  {STORE_ANIMATION_PRESET_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="bg-[#140A24]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Badge Label (Optional)
                </label>
                <input
                  value={editing.badgeText || ''}
                  onChange={(e) => setEditing({ ...editing, badgeText: e.target.value })}
                  placeholder="POPULAR / HOT / ROYAL"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({ ...editing, sortOrder: Number(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                />
              </div>

              {/* Custom Product Image URL + File Upload */}
              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Custom Image URL (Optional)
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={editing.imageUrl || ''}
                    onChange={(e) => setEditing({ ...editing, imageUrl: e.target.value })}
                    placeholder="https://... or upload"
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                  <label className="px-2.5 py-2 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-400/40 text-white cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'imageUrl' ? '...' : 'Up'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadAsset(file, 'imageUrl');
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Custom Animation Asset URL + File Upload */}
              <div>
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Animation Asset URL (GIF/WebM/MP4)
                </label>
                <div className="flex gap-1.5">
                  <input
                    value={editing.animationUrl || ''}
                    onChange={(e) => setEditing({ ...editing, animationUrl: e.target.value })}
                    placeholder="https://... or upload"
                    className="flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
                  />
                  <label className="px-2.5 py-2 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-400/40 text-white cursor-pointer flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingField === 'animationUrl' ? '...' : 'Up'}</span>
                    <input
                      type="file"
                      accept="image/gif,image/webp,video/mp4,video/webm"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadAsset(file, 'animationUrl');
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold text-[#B9AECF] uppercase block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  placeholder="Describe the luxury visual effect and animation..."
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white resize-none"
                />
              </div>

              <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                    <input
                      type="checkbox"
                      checked={editing.enabled}
                      onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })}
                      className="accent-emerald-400 w-4 h-4"
                    />
                    <span>Enabled in Store</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-200">
                    <input
                      type="checkbox"
                      checked={editing.isFeatured}
                      onChange={(e) => setEditing({ ...editing, isFeatured: e.target.checked })}
                      className="accent-amber-400 w-4 h-4"
                    />
                    <span>Featured Product</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 text-xs font-bold text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#07140E] text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Product'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredProducts.map((prod) => {
          const catTitle =
            DEFAULT_STORE_CATEGORIES.find((c) => c.id === prod.categoryId)?.title ||
            prod.categoryId;

          return (
            <div
              key={prod.id}
              className={`p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${
                prod.enabled
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-white/[0.02] border-rose-500/25 opacity-65'
              }`}
            >
              <StoreAssetPreview product={prod} size="sm" isPlaying={false} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-200">
                    {catTitle}
                  </span>
                  {prod.isFeatured && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-200 flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />
                      Featured
                    </span>
                  )}
                  {!prod.enabled && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-200">
                      Disabled
                    </span>
                  )}
                </div>

                <div className="mt-1 text-sm font-black text-white truncate">
                  {prod.name}
                </div>
                <div className="text-xs font-extrabold text-amber-300 tabular-nums">
                  {prod.priceCoins.toLocaleString()} Coins
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title={prod.isFeatured ? 'Unmark Featured' : 'Mark Featured'}
                    onClick={() =>
                      void handleQuickToggle(
                        prod,
                        { isFeatured: !prod.isFeatured },
                        prod.isFeatured ? 'Removed featured badge' : 'Marked as Featured'
                      )
                    }
                    className={`p-1.5 rounded-lg border ${
                      prod.isFeatured
                        ? 'bg-amber-400/25 border-amber-300/50 text-amber-200'
                        : 'bg-white/5 border-white/10 text-[#B9AECF] hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    title={prod.enabled ? 'Disable Product' : 'Enable Product'}
                    onClick={() =>
                      void handleQuickToggle(
                        prod,
                        { enabled: !prod.enabled },
                        prod.enabled ? 'Disabled in Store' : 'Enabled in Store'
                      )
                    }
                    className={`p-1.5 rounded-lg border ${
                      prod.enabled
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                        : 'bg-rose-500/20 border-rose-400/40 text-rose-300'
                    }`}
                  >
                    {prod.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    title="Edit Product"
                    onClick={() => setEditing({ ...prod })}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {confirmDeleteId === prod.id ? (
                    <button
                      type="button"
                      title="Confirm Delete"
                      onClick={() => void handleDelete(prod.id, prod.name)}
                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black flex items-center gap-0.5"
                    >
                      <Check className="w-3 h-3" />
                      Del
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Delete Product"
                      onClick={() => setConfirmDeleteId(prod.id)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
