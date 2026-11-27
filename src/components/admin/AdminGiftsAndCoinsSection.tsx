import React, { useMemo, useState } from 'react';
import {
  Coins,
  Edit3,
  Gift,
  History,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { ALL_500_GIFTS } from '../../data/giftCatalog';
import {
  AdminGiftCatalogRecord,
  adminDeleteGiftCatalogItem,
  adminSaveGiftCatalogItem,
} from '../../services/superAdminService';
import { GiftTransactionRecord } from '../../types';
import { AdminFinanceTab } from '../screens/AdminFinanceTab';

interface AdminGiftsAndCoinsSectionProps {
  giftOverrides: AdminGiftCatalogRecord[];
  giftTxs: GiftTransactionRecord[];
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type CoinsGiftsSubTab = 'catalog' | 'gift_history' | 'finance_economy';

const GIFT_CATEGORY_OPTIONS = ['Popular', 'Love', 'Luxury', 'Special', 'Exclusive'];
const ANIMATION_OPTIONS: Array<'pop' | 'glow' | 'float' | 'blast'> = ['pop', 'glow', 'float', 'blast'];
const GRADIENT_PRESETS = [
  { label: 'Violet Pink', value: 'from-[#8B20FF] to-[#F328D5]' },
  { label: 'Royal Gold', value: 'from-amber-400 to-yellow-600' },
  { label: 'Crimson Rose', value: 'from-rose-500 to-red-600' },
  { label: 'Ocean Cyan', value: 'from-cyan-400 to-blue-600' },
  { label: 'Emerald Mint', value: 'from-emerald-400 to-teal-600' },
];

export const AdminGiftsAndCoinsSection: React.FC<AdminGiftsAndCoinsSectionProps> = ({
  giftOverrides,
  giftTxs,
  onNotify,
  onError,
}) => {
  const [subTab, setSubTab] = useState<CoinsGiftsSubTab>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogFilter, setCatalogFilter] = useState<'all' | 'custom_or_edited' | 'disabled'>('all');
  const [historySearch, setHistorySearch] = useState('');

  // Editor state
  const [editingGift, setEditingGift] = useState<{
    id: string;
    name: string;
    category: string;
    coins: string;
    icon: string;
    imageColor: string;
    animationType: 'pop' | 'glow' | 'float' | 'blast';
    animationUrl: string;
    enabled: boolean;
    sortOrder: string;
    isCustom: boolean;
  } | null>(null);
  const [savingGift, setSavingGift] = useState(false);

  const overrideMap = useMemo(() => {
    const map = new Map<string, AdminGiftCatalogRecord>();
    giftOverrides.forEach((g) => map.set(g.id, g));
    return map;
  }, [giftOverrides]);

  const combinedCatalog = useMemo(() => {
    const baseIds = new Set(ALL_500_GIFTS.map((g) => g.id));
    const list: Array<{
      id: string;
      name: string;
      category: string;
      coins: number;
      icon: string;
      imageColor: string;
      animationType: 'pop' | 'glow' | 'float' | 'blast';
      animationUrl: string;
      enabled: boolean;
      sortOrder: number;
      isCustom: boolean;
      isOverridden: boolean;
    }> = [];

    // Custom admin gifts first
    giftOverrides
      .filter((ov) => !baseIds.has(ov.id))
      .forEach((ov) => {
        list.push({
          id: ov.id,
          name: ov.name,
          category: ov.category,
          coins: ov.coins,
          icon: ov.icon,
          imageColor: ov.imageColor,
          animationType: ov.animationType,
          animationUrl: ov.animationUrl || '',
          enabled: ov.enabled,
          sortOrder: ov.sortOrder,
          isCustom: true,
          isOverridden: true,
        });
      });

    // Base catalog items merged with Firestore overrides
    ALL_500_GIFTS.forEach((base, idx) => {
      const ov = overrideMap.get(base.id);
      list.push({
        id: base.id,
        name: ov?.name ?? base.name,
        category: ov?.category ?? base.category,
        coins: ov?.coins ?? base.coins,
        icon: ov?.icon ?? base.icon,
        imageColor: ov?.imageColor ?? base.imageColor,
        animationType: ov?.animationType ?? base.animationType,
        animationUrl: ov?.animationUrl ?? '',
        enabled: ov ? ov.enabled : true,
        sortOrder: ov?.sortOrder ?? idx + 100,
        isCustom: false,
        isOverridden: Boolean(ov),
      });
    });

    const q = catalogSearch.trim().toLowerCase();
    return list.filter((item) => {
      if (catalogFilter === 'custom_or_edited' && !item.isOverridden) return false;
      if (catalogFilter === 'disabled' && item.enabled) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        String(item.coins).includes(q)
      );
    });
  }, [giftOverrides, overrideMap, catalogSearch, catalogFilter]);

  const filteredGiftHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return giftTxs.slice(0, 120);
    return giftTxs
      .filter(
        (tx) =>
          (tx.giftName || '').toLowerCase().includes(q) ||
          (tx.senderId || '').toLowerCase().includes(q) ||
          (tx.receiverId || '').toLowerCase().includes(q) ||
          (tx.id || '').toLowerCase().includes(q)
      )
      .slice(0, 120);
  }, [giftTxs, historySearch]);

  const openNewGiftModal = () => {
    setEditingGift({
      id: `custom_${Date.now().toString(36)}`,
      name: '',
      category: 'Exclusive',
      coins: '500',
      icon: '👑',
      imageColor: GRADIENT_PRESETS[1].value,
      animationType: 'blast',
      animationUrl: '',
      enabled: true,
      sortOrder: '1',
      isCustom: true,
    });
  };

  const handleSaveGift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGift) return;
    setSavingGift(true);
    const res = await adminSaveGiftCatalogItem({
      id: editingGift.id,
      name: editingGift.name,
      category: editingGift.category,
      coins: Math.max(1, Math.floor(Number(editingGift.coins || 1))),
      icon: editingGift.icon || '🎁',
      imageColor: editingGift.imageColor,
      animationType: editingGift.animationType,
      animationUrl: editingGift.animationUrl,
      enabled: editingGift.enabled,
      sortOrder: Math.max(0, Math.floor(Number(editingGift.sortOrder || 10))),
      isCustom: editingGift.isCustom,
    });
    setSavingGift(false);
    if (res.success) {
      onNotify(`Gift "${editingGift.name}" saved and synced live to all rooms & streams.`);
      setEditingGift(null);
    } else {
      onError(res.error || 'Failed to save gift.');
    }
  };

  const handleToggleAvailability = async (item: (typeof combinedCatalog)[number]) => {
    const res = await adminSaveGiftCatalogItem({
      id: item.id,
      name: item.name,
      category: item.category,
      coins: item.coins,
      icon: item.icon,
      imageColor: item.imageColor,
      animationType: item.animationType,
      animationUrl: item.animationUrl,
      enabled: !item.enabled,
      sortOrder: item.sortOrder,
      isCustom: item.isCustom,
    });
    if (res.success) {
      onNotify(`Gift "${item.name}" is now ${!item.enabled ? 'available' : 'disabled'}.`);
    } else {
      onError(res.error || 'Failed to update gift availability.');
    }
  };

  const handleRemoveOverride = async (id: string, name: string, isCustom: boolean) => {
    const res = await adminDeleteGiftCatalogItem(id, name);
    if (res.success) {
      onNotify(
        isCustom
          ? `Custom gift "${name}" deleted.`
          : `Gift "${name}" restored to default catalog values.`
      );
    } else {
      onError(res.error || 'Failed to delete gift override.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              subTab === 'catalog' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Gift Catalog ({combinedCatalog.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('gift_history')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              subTab === 'gift_history'
                ? 'bg-[#FFC84A] text-[#0B0716]'
                : 'text-[#A59BC4] hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Gift History ({giftTxs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('finance_economy')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
              subTab === 'finance_economy'
                ? 'bg-[#FFC84A] text-[#0B0716]'
                : 'text-[#A59BC4] hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Coins, Ledger &amp; Economy</span>
          </button>
        </div>

        {subTab === 'catalog' && (
          <button
            type="button"
            onClick={openNewGiftModal}
            className="px-3.5 py-2 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Gift</span>
          </button>
        )}
      </div>

      {/* SUB-TAB 1: GIFT CATALOG MANAGER */}
      {subTab === 'catalog' && (
        <div className="space-y-4">
          {/* Create / Edit Gift Form */}
          {editingGift && (
            <form
              onSubmit={handleSaveGift}
              className="p-4 sm:p-5 rounded-xl bg-[#16102A] border border-[#FFC84A]/40 space-y-4"
            >
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#271F42]">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFC84A]" />
                  <span>{editingGift.isCustom ? 'Create / Edit Custom Gift' : `Edit Catalog Gift (${editingGift.id})`}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingGift(null)}
                  className="p-1.5 rounded-lg text-[#988DB9] hover:text-white hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Gift Name</label>
                  <input
                    type="text"
                    required
                    value={editingGift.name}
                    onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                    placeholder="e.g. Royal Falcon"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Price (Coins)</label>
                  <input
                    type="number"
                    min={1}
                    max={100000000}
                    required
                    value={editingGift.coins}
                    onChange={(e) => setEditingGift({ ...editingGift, coins: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Icon (Emoji)</label>
                  <input
                    type="text"
                    required
                    value={editingGift.icon}
                    onChange={(e) => setEditingGift({ ...editingGift, icon: e.target.value })}
                    placeholder="👑"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-sm text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Category</label>
                  <select
                    value={editingGift.category}
                    onChange={(e) => setEditingGift({ ...editingGift, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                  >
                    {GIFT_CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Animation Effect</label>
                  <select
                    value={editingGift.animationType}
                    onChange={(e) =>
                      setEditingGift({
                        ...editingGift,
                        animationType: e.target.value as 'pop' | 'glow' | 'float' | 'blast',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                  >
                    {ANIMATION_OPTIONS.map((a) => (
                      <option key={a} value={a}>
                        {a.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Accent Color</label>
                  <select
                    value={editingGift.imageColor}
                    onChange={(e) => setEditingGift({ ...editingGift, imageColor: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                  >
                    {GRADIENT_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">
                    Animation Asset URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={editingGift.animationUrl}
                    onChange={(e) => setEditingGift({ ...editingGift, animationUrl: e.target.value })}
                    placeholder="https://.../gift.json"
                    className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-white font-medium">
                    <input
                      type="checkbox"
                      checked={editingGift.enabled}
                      onChange={(e) => setEditingGift({ ...editingGift, enabled: e.target.checked })}
                      className="rounded border-white/20 bg-[#0B0716] text-[#FFC84A]"
                    />
                    <span>Available in Gift Shop</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGift(null)}
                  className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGift}
                  className="px-4 py-2 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingGift ? 'Saving...' : 'Save Gift'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#8E83B0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search gift by name, ID, category, or coin price..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#130E24] border border-[#261E40] text-xs text-white placeholder-[#7C719D] focus:outline-none focus:border-[#FFC84A]"
              />
            </div>

            <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 self-start sm:self-auto">
              {(
                [
                  { id: 'all', label: 'All Gifts' },
                  { id: 'custom_or_edited', label: `Edited / Custom (${giftOverrides.length})` },
                  { id: 'disabled', label: 'Disabled' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCatalogFilter(f.id)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                    catalogFilter === f.id
                      ? 'bg-[#FFC84A] text-[#0B0716]'
                      : 'text-[#A59BC4] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gift Catalog Table */}
          <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                    <th className="py-2.5 px-4 font-semibold">Gift</th>
                    <th className="py-2.5 px-4 font-semibold">Category</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Price (Coins)</th>
                    <th className="py-2.5 px-4 font-semibold">Animation</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#211A36] text-xs">
                  {combinedCatalog.slice(0, 80).map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.imageColor} flex items-center justify-center text-base shrink-0`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{item.name}</div>
                            <div className="text-[10px] font-mono text-[#8E83B0]">
                              {item.id} {item.isCustom ? '· Custom' : item.isOverridden ? '· Edited' : ''}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-[#C5B9DE]">{item.category}</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#FFC84A]">
                        {item.coins.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 uppercase font-mono text-[11px] text-[#A59BC4]">
                        {item.animationType}
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`text-xs font-semibold ${
                            item.enabled ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingGift({
                                id: item.id,
                                name: item.name,
                                category: item.category,
                                coins: String(item.coins),
                                icon: item.icon,
                                imageColor: item.imageColor,
                                animationType: item.animationType,
                                animationUrl: item.animationUrl,
                                enabled: item.enabled,
                                sortOrder: String(item.sortOrder),
                                isCustom: item.isCustom,
                              })
                            }
                            className="p-1.5 rounded-md bg-white/5 hover:bg-white/15 text-[#D6CFE9]"
                            title="Edit Gift"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {item.isOverridden && (
                            <button
                              type="button"
                              onClick={() => handleRemoveOverride(item.id, item.name, item.isCustom)}
                              className="p-1.5 rounded-md bg-rose-500/15 hover:bg-rose-500/30 text-rose-300"
                              title={item.isCustom ? 'Delete Custom Gift' : 'Reset to Default'}
                            >
                              {item.isCustom ? (
                                <Trash2 className="w-3.5 h-3.5" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {combinedCatalog.length > 80 && (
              <div className="px-4 py-2.5 border-t border-[#241C3C] text-[11px] text-[#8E83B0]">
                Showing first 80 of {combinedCatalog.length} matching gifts. Refine your search to locate any specific item.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GIFT HISTORY LEDGER */}
      {subTab === 'gift_history' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-[#8E83B0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search gift history by gift name, sender UID, receiver UID, or TX ID..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#130E24] border border-[#261E40] text-xs text-white placeholder-[#7C719D] focus:outline-none focus:border-[#FFC84A]"
            />
          </div>

          <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
            {filteredGiftHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#8E83B0]">
                No gift transactions found matching your query.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                      <th className="py-2.5 px-4 font-semibold">Gift</th>
                      <th className="py-2.5 px-4 font-semibold">Sender UID</th>
                      <th className="py-2.5 px-4 font-semibold">Receiver UID</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Coins</th>
                      <th className="py-2.5 px-4 font-semibold text-right">App Beans</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Host Diamonds</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#211A36] text-xs">
                    {filteredGiftHistory.map((tx) => (
                      <tr key={tx.id} className="hover:bg-white/[0.02]">
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-white">{tx.giftName || tx.giftId}</div>
                          <div className="text-[10px] font-mono text-[#8E83B0] truncate max-w-[140px]">
                            {tx.id}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#C5B9DE] truncate max-w-[130px]">
                          {tx.senderId}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#C5B9DE] truncate max-w-[130px]">
                          {tx.receiverId}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#FFC84A]">
                          {Number(tx.coinAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-emerald-400">
                          {Number(tx.appBeansAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-sky-400">
                          {Number(tx.hostDiamondsAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[11px] text-[#8E83B0] whitespace-nowrap">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FULL FINANCIAL & ECONOMY SUITE */}
      {subTab === 'finance_economy' && (
        <AdminFinanceTab onNotify={onNotify} onError={onError} />
      )}
    </div>
  );
};
