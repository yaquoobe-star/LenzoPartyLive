import React, { useEffect, useState } from 'react';
import { Award, Layers, Save, ShoppingBag } from 'lucide-react';
import { ALL_100_LEVELS } from '../../utils/levelAndVipConfig';
import { AdminStoreTab } from '../screens/AdminStoreTab';
import { LevelBadge } from '../common/LevelBadge';
import { LevelEmblemBadge } from '../common/LevelEmblemBadge';
import { SuperVipTierBadge, VipTierBadge } from '../common/AvatarWithFrame';
import { liveAndRoomService } from '../../services/liveAndRoomService';
import { RankingConfig } from '../../types';

interface AdminStoreAndProgressionSectionProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminStoreAndProgressionSection: React.FC<AdminStoreAndProgressionSectionProps> = ({
  onNotify,
  onError,
}) => {
  const [subTab, setSubTab] = useState<'store' | 'levels' | 'rankings'>('store');
  const [weights, setWeights] = useState<RankingConfig>({
    giftValueWeight: 1,
    uniqueViewerWeight: 2,
    engagementWeight: 1,
    activeLiveBoost: 150,
  });
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    if (subTab !== 'rankings') return;
    liveAndRoomService.fetchAdminRankingConfig().then((cfg) => {
      if (cfg) setWeights(cfg);
    });
  }, [subTab]);

  const handleSaveWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeights(true);
    try {
      const updated = await liveAndRoomService.updateRankingConfig(weights);
      setWeights(updated);
      onNotify('Broadcaster ranking weights saved and broadcast live.');
    } catch (err: any) {
      onError(err?.message || 'Failed to update ranking weights.');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5">
        <button
          type="button"
          onClick={() => setSubTab('store')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'store' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Lenzo Party Store</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('levels')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'levels' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Levels 0–100 &amp; VIP</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('rankings')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'rankings' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>Ranking Weights</span>
        </button>
      </div>

      {subTab === 'store' && <AdminStoreTab onNotify={onNotify} onError={onError} />}

      {subTab === 'levels' && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">100-Level &amp; VIP / Super VIP Matrix</h3>
              <p className="text-xs text-[#988DB9]">
                Reference thresholds across all 101 progression levels (0 to 2,000,000,000 qualifying coins).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <VipTierBadge tier={12} size="xs" />
              <SuperVipTierBadge tier={6} size="xs" />
            </div>
          </div>
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto border border-[#241C3C] rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-[#0B0716]">
                <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                  <th className="py-2 px-3">Level</th>
                  <th className="py-2 px-3">Tier</th>
                  <th className="py-2 px-3 text-right">Cumulative Coins</th>
                  <th className="py-2 px-3 text-right">VIP / SVIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#211A36]">
                {ALL_100_LEVELS.map((lv) => (
                  <tr key={lv.level} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <LevelEmblemBadge level={lv.level} size="xs" />
                        <LevelBadge level={lv.level} size="xs" />
                      </div>
                    </td>
                    <td className="py-2 px-3 text-[#C5B9DE] font-medium">{lv.tierName}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-[#FFC84A]">
                      {lv.cumulativeCoins.toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-[11px] text-[#988DB9]">
                      {lv.vipUnlockTier ? `VIP ${lv.vipUnlockTier}` : '—'}
                      {lv.superVipUnlockTier ? ` · SVIP ${lv.superVipUnlockTier}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'rankings' && (
        <form
          onSubmit={handleSaveWeights}
          className="p-5 rounded-xl bg-[#130E24] border border-[#261E40] space-y-4 max-w-xl"
        >
          <div>
            <h3 className="text-sm font-bold text-white">Broadcaster Ranking Algorithm Weights</h3>
            <p className="text-xs text-[#988DB9] mt-0.5">
              Enforced server-side via <code className="font-mono text-[#FFC84A]">PUT /api/admin/ranking-config</code>.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Gift Value Weight</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={weights.giftValueWeight}
                onChange={(e) => setWeights({ ...weights, giftValueWeight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Unique Viewer Weight</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={weights.uniqueViewerWeight}
                onChange={(e) => setWeights({ ...weights, uniqueViewerWeight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Engagement Weight</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={weights.engagementWeight}
                onChange={(e) => setWeights({ ...weights, engagementWeight: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#A59BC4] mb-1">Active Live Boost</label>
              <input
                type="number"
                min={0}
                value={weights.activeLiveBoost}
                onChange={(e) => setWeights({ ...weights, activeLiveBoost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs font-mono text-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingWeights}
              className="px-4 py-2 rounded-lg bg-[#FFC84A] hover:bg-[#f5bc38] text-[#0B0716] text-xs font-bold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingWeights ? 'Saving...' : 'Save Ranking Weights'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
