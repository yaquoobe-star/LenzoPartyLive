import React, { useState, useEffect } from 'react';
import { 
  X, 
  Crown, 
  Sparkles, 
  Check, 
  Lock, 
  ShieldCheck, 
  ChevronRight, 
  Coins, 
  Flame, 
  Star, 
  Trophy, 
  Gem, 
  Zap, 
  ArrowRight,
  Info
} from 'lucide-react';
import { UserProfile } from '../../types';
import { 
  LEVEL_DEFINITIONS, 
  VIP_FRAME_DEFINITIONS, 
  calculateLevelProgression, 
  MAJOR_TIERS,
  getLevelDefinition,
  getVipFrameDefinition
} from '../../utils/levelAndVipConfig';
import { LevelDefinition, VipFrameDefinition, LevelMajorTier, UserLevelProgression } from '../../types/levelAndVip';
import { LevelBadge } from '../common/LevelBadge';
import { AvatarWithFrame } from '../common/AvatarWithFrame';
import { subscribeUserLevelProgression, equipVipFrame } from '../../services/levelAndVipService';

interface LevelAndVIPModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateUser?: (updated: Partial<UserProfile>) => void;
}

export const LevelAndVIPModal: React.FC<LevelAndVIPModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'vip' | 'levels'>('vip');
  const [selectedTierFilter, setSelectedTierFilter] = useState<'all' | LevelMajorTier>('all');
  const [selectedLevelDetail, setSelectedLevelDetail] = useState<LevelDefinition | null>(null);
  const [progression, setProgression] = useState<UserLevelProgression>(() => 
    calculateLevelProgression(
      currentUser.level ? (currentUser.level * 1500) : 0, 
      currentUser.id,
      currentUser.equippedVipFrame || undefined
    )
  );
  const [equippingTier, setEquippingTier] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Subscribe to real-time progression from Firestore
  useEffect(() => {
    if (!isOpen || !currentUser.id) return;

    const initialCoins = currentUser.level ? (currentUser.level * 1500) : 0;
    const unsubscribe = subscribeUserLevelProgression(currentUser.id, initialCoins, (updated) => {
      setProgression(updated);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentLevelDef = getLevelDefinition(progression.currentLevel);

  const handleEquipFrame = async (tier: number | null) => {
    setEquippingTier(tier);
    try {
      const res = await equipVipFrame(currentUser.id, tier);
      if (res.success) {
        setProgression(prev => ({
          ...prev,
          equippedVipFrame: tier || 0,
        }));
        if (onUpdateUser) {
          onUpdateUser({
            equippedVipFrame: tier || undefined,
            vipLevel: tier || currentUser.vipLevel,
            isVIP: tier !== null && tier > 0,
          });
        }
        showToast(tier ? `Equipped VIP ${tier} Frame! ✨` : 'Default avatar frame restored');
      } else {
        showToast(res.message || res.error || 'Failed to equip frame');
      }
    } catch (err) {
      console.error('Error equipping frame:', err);
      showToast('Failed to equip frame. Please try again.');
    } finally {
      setEquippingTier(null);
    }
  };

  // Filter levels for the 50 level list
  const filteredLevels = selectedTierFilter === 'all'
    ? LEVEL_DEFINITIONS
    : LEVEL_DEFINITIONS.filter(l => l.tier === selectedTierFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl max-h-[92vh] bg-[#12081f] border border-[#FFC84A]/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-1/4 w-80 h-36 bg-gradient-to-r from-[#F328D5]/20 via-[#8B20FF]/25 to-[#FFC84A]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#160C25] border border-[#FFC84A] text-white px-4 py-2 rounded-full text-xs font-bold shadow-2xl animate-bounce flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FFC84A]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FFC84A] via-[#F328D5] to-[#8B20FF] p-[2px] shadow-lg shadow-[#FFC84A]/20">
              <div className="w-full h-full rounded-[14px] bg-[#160C25] flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#FFC84A]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-white font-display tracking-tight flex items-center gap-2">
                LEVEL &amp; VIP
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-[#FFC84A]/20 to-[#FA26A0]/20 text-[#FFC84A] border border-[#FFC84A]/40 uppercase tracking-widest">
                  Progression
                </span>
              </h2>
              <p className="text-[11px] text-[#B9AECF]">
                Gift to level up and unlock prestigious VIP frames
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Current Progression Summary Card */}
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1c0f2e] via-[#160C25] to-[#25103a] border border-white/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center gap-4">
              {/* DP with equipped frame */}
              <div className="shrink-0">
                <AvatarWithFrame
                  src={currentUser.avatar}
                  name={currentUser.name}
                  level={progression.currentLevel}
                  vipLevel={progression.equippedVipFrame || undefined}
                  isVIP={!!progression.equippedVipFrame}
                  size="lg"
                  showFrame={true}
                  showVipBadge={false}
                />
              </div>

              {/* Level & Status Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <LevelBadge level={progression.currentLevel} size="md" />
                  <span className="text-xs font-extrabold text-white">
                    {currentLevelDef.name}
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-white/10 text-[#FFC84A] border border-white/10">
                    {progression.currentTier} Tier
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full mt-2">
                  <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
                    <span className="text-[#B9AECF]">
                      Level Progress: <strong className="text-white">{progression.progressPercent}%</strong>
                    </span>
                    <span className="text-[#FFC84A] font-bold">
                      {progression.coinsInCurrentLevel.toLocaleString()} / {progression.coinsNeededForNextLevel.toLocaleString()} Coins
                    </span>
                  </div>

                  <div className="w-full h-2.5 rounded-full bg-black/50 border border-white/10 overflow-hidden relative">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] transition-all duration-700 shadow-[0_0_12px_rgba(255,200,74,0.7)]"
                      style={{ width: `${Math.min(100, Math.max(3, progression.progressPercent))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#B9AECF] mt-1.5">
                    <span>Total Qualifying: <strong className="text-white font-mono">{progression.totalQualifyingCoinsSpent.toLocaleString()} Coins</strong></span>
                    {progression.currentLevel < 50 ? (
                      <span className="text-[#FFC84A] font-medium">
                        {progression.remainingCoins.toLocaleString()} coins to Level {progression.currentLevel + 1}
                      </span>
                    ) : (
                      <span className="text-[#00FFCC] font-bold">Max Level Achieved 🏆</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Tab Switcher */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('vip')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'vip'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-lg shadow-pink-900/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            <Crown className="w-4 h-4 text-[#FFC84A]" />
            <span>VIP FRAMES (8 Tiers)</span>
          </button>

          <button
            onClick={() => setActiveTab('levels')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'levels'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-lg shadow-pink-900/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
          >
            <Trophy className="w-4 h-4 text-[#FFC84A]" />
            <span>50 LEVEL TIER LIST</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* ========================================================
              SECTION A: VIP FRAMES (8 TIERS)
             ======================================================== */}
          {activeTab === 'vip' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white font-display">
                    8 Exclusive VIP Frames
                  </h3>
                  <p className="text-[11px] text-[#B9AECF]">
                    Permanently unlocked at every 6 level milestones. Equip anywhere across the app.
                  </p>
                </div>
                {progression.equippedVipFrame ? (
                  <button
                    onClick={() => handleEquipFrame(null)}
                    disabled={equippingTier !== null}
                    className="text-[11px] text-white/60 hover:text-white underline font-medium px-2 py-1"
                  >
                    Remove Frame
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {VIP_FRAME_DEFINITIONS.map((frame) => {
                  const isUnlocked = progression.unlockedVipTiers.includes(frame.tier);
                  const isEquipped = progression.equippedVipFrame === frame.tier;
                  const levelsNeeded = Math.max(0, frame.unlockLevel - progression.currentLevel);

                  return (
                    <div
                      key={frame.tier}
                      className={`relative p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isEquipped 
                          ? 'bg-gradient-to-b from-[#2a1347] to-[#1a0a2e] border-[#FFC84A] shadow-[0_0_20px_rgba(255,200,74,0.25)]'
                          : isUnlocked 
                          ? 'bg-[#180C2A] border-white/15 hover:border-white/30' 
                          : 'bg-[#130720]/80 border-white/5 opacity-75'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/10">
                          {frame.name}
                        </span>
                        {isEquipped ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <Check className="w-3 h-3" /> EQUIPPED
                          </span>
                        ) : isUnlocked ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            UNLOCKED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Lv.{frame.unlockLevel}
                          </span>
                        )}
                      </div>

                      {/* Center Frame Showcase Preview */}
                      <div className="flex items-center gap-4 my-2">
                        <div className="shrink-0 relative">
                          <AvatarWithFrame
                            src={currentUser.avatar}
                            name={currentUser.name}
                            level={frame.unlockLevel}
                            vipLevel={frame.tier}
                            isVIP={true}
                            size="lg"
                            showFrame={true}
                            showVipBadge={false}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-extrabold text-white truncate">
                            {frame.name}
                          </h4>
                          <span className="text-[10px] text-amber-300 font-mono mt-1 block">
                            Unlocks at Level {frame.unlockLevel}
                          </span>
                        </div>
                      </div>

                      {/* Frame Perks list */}
                      <div className="my-2.5 p-2 rounded-xl bg-black/30 border border-white/5 space-y-1">
                        {frame.perks.slice(0, 2).map((perk, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[10px] text-[#D8CFEB]">
                            <Sparkles className="w-2.5 h-2.5 text-[#FFC84A] shrink-0" />
                            <span className="truncate">{perk}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action Button */}
                      <div className="pt-2">
                        {isEquipped ? (
                          <button
                            onClick={() => handleEquipFrame(null)}
                            disabled={equippingTier === frame.tier}
                            className="w-full py-2 rounded-xl bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-emerald-600/40"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Equipped (Tap to Unequip)</span>
                          </button>
                        ) : isUnlocked ? (
                          <button
                            onClick={() => handleEquipFrame(frame.tier)}
                            disabled={equippingTier === frame.tier}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] hover:opacity-95 text-white font-extrabold text-xs shadow-md shadow-pink-900/30 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#FFC84A]" />
                            <span>{equippingTier === frame.tier ? 'Equipping...' : 'Equip Frame'}</span>
                          </button>
                        ) : (
                          <div className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-[#B9AECF] font-bold text-xs text-center flex items-center justify-center gap-1.5">
                            <Lock className="w-3 h-3 text-amber-400" />
                            <span>{levelsNeeded} {levelsNeeded === 1 ? 'level' : 'levels'} needed to unlock</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              SECTION B: 50 LEVEL TIER LIST
             ======================================================== */}
          {activeTab === 'levels' && (
            <div className="space-y-4">
              {/* Major Tier Filter Tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedTierFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedTierFilter === 'all'
                      ? 'bg-white text-black font-black'
                      : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  All (50 Levels)
                </button>
                {MAJOR_TIERS.map(t => (
                  <button
                    key={t.tier}
                    onClick={() => setSelectedTierFilter(t.tier)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                      selectedTierFilter === t.tier
                        ? 'bg-gradient-to-r from-[#FFC84A] to-[#FA26A0] text-black font-black shadow-md'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="text-[10px] opacity-75">({t.range})</span>
                  </button>
                ))}
              </div>

              {/* Levels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredLevels.map((lvl) => {
                  const isCompleted = progression.currentLevel > lvl.level;
                  const isCurrent = progression.currentLevel === lvl.level;
                  const isNext = progression.currentLevel + 1 === lvl.level;

                  return (
                    <div
                      key={lvl.level}
                      onClick={() => setSelectedLevelDetail(lvl)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isCurrent
                          ? 'bg-gradient-to-r from-[#2c134d] via-[#1d0e33] to-[#25103a] border-[#FFC84A] shadow-[0_0_15px_rgba(255,200,74,0.3)] ring-1 ring-[#FFC84A]/60'
                          : isNext
                          ? 'bg-[#1b0e30] border-[#FA26A0]/60 shadow-md'
                          : isCompleted
                          ? 'bg-[#150a24] border-emerald-500/20 hover:border-emerald-500/40'
                          : 'bg-[#11061c]/80 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Unique Level Badge */}
                        <div className="shrink-0">
                          <LevelBadge level={lvl.level} size="md" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white truncate">
                              {lvl.name}
                            </span>
                            {isCompleted && (
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#B9AECF] flex items-center gap-1 mt-0.5">
                            <Coins className="w-2.5 h-2.5 text-[#FFC84A]" />
                            <span className="font-mono">{lvl.requiredCoins.toLocaleString()} Coins</span>
                          </span>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      <div className="shrink-0 text-right">
                        {isCurrent ? (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#FFC84A] text-black">
                            Current
                          </span>
                        ) : isNext ? (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#FA26A0]/20 text-[#FA26A0] border border-[#FA26A0]/40">
                            Next
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-400">
                            Completed
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-[10px] text-white/40">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Locked</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ========================================================
            INTERACTIVE LEVEL DETAIL MODAL / DRAWER
           ======================================================== */}
        {selectedLevelDetail && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-fade-in">
            <div className="w-full max-w-sm bg-[#160C25] border border-[#FFC84A]/40 rounded-3xl p-5 shadow-2xl relative flex flex-col items-center text-center space-y-3">
              <button
                onClick={() => setSelectedLevelDetail(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Showcase Badge */}
              <div className="pt-2">
                <LevelBadge level={selectedLevelDetail.level} size="xl" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FFC84A] bg-[#FFC84A]/10 px-2.5 py-0.5 rounded-full border border-[#FFC84A]/30">
                  {selectedLevelDetail.tier} Tier • {selectedLevelDetail.tierRank}
                </span>
                <h3 className="text-xl font-black text-white font-display mt-1">
                  Level {selectedLevelDetail.level} — {selectedLevelDetail.name}
                </h3>
              </div>

              {/* Coins comparison */}
              <div className="w-full p-3 rounded-2xl bg-[#211333] border border-white/10 text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-[#B9AECF]">Required Qualifying Coins:</span>
                  <span className="font-mono font-bold text-[#FFC84A]">{selectedLevelDetail.requiredCoins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B9AECF]">Your Qualifying Coins:</span>
                  <span className="font-mono font-bold text-white">{progression.totalQualifyingCoinsSpent.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-1.5">
                  <span className="text-[#B9AECF]">Status:</span>
                  <span className="font-bold">
                    {progression.currentLevel >= selectedLevelDetail.level ? (
                      <span className="text-emerald-400">Unlocked &amp; Claimed ✓</span>
                    ) : (
                      <span className="text-amber-400">
                        {Math.max(0, selectedLevelDetail.requiredCoins - progression.totalQualifyingCoinsSpent).toLocaleString()} coins needed
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Perks list */}
              <div className="w-full text-left space-y-1">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
                  Level Perks:
                </span>
                {selectedLevelDetail.perks.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-[#D8CFEB]">
                    <Sparkles className="w-3 h-3 text-[#FFC84A] shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelectedLevelDetail(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs"
              >
                Close Details
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
