import React, { useState } from 'react';
import { X, Trophy, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { AchievementItem } from '../../types';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AchievementItem[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'in_progress'>('all');

  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;
  const filtered = achievements.filter((a) => {
    if (filter === 'unlocked') return a.isUnlocked;
    if (filter === 'in_progress') return !a.isUnlocked;
    return true;
  });

  const tierStyle = (tier: AchievementItem['tier']) => {
    switch (tier) {
      case 'legend':
        return 'text-[#FFC84A] bg-[#FFC84A]/15 border-[#FFC84A]/30';
      case 'elite':
        return 'text-[#C084FC] bg-[#8B20FF]/20 border-[#8B20FF]/40';
      case 'rising':
        return 'text-[#38BDF8] bg-[#06B6D4]/15 border-[#06B6D4]/30';
      default:
        return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#FFC84A]" />
              <span>Top Achievements</span>
            </h3>
            <p className="text-xs text-[#B9AECF] mt-0.5 tabular-nums">
              {unlockedCount} of {achievements.length} milestones unlocked from your live account activity
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Achievements"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Progress Bar */}
        <div className="px-5 py-3 bg-[#0E071B] border-b border-white/[0.06]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-[#D7CEEB] font-semibold">Overall Completion</span>
            <span className="font-mono font-bold text-[#FFC84A] tabular-nums">
              {Math.round((unlockedCount / Math.max(1, achievements.length)) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B20FF] via-[#FA26A0] to-[#FFC84A] transition-all duration-500"
              style={{
                width: `${Math.max(3, Math.round((unlockedCount / Math.max(1, achievements.length)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2">
          {([
            { id: 'all', label: `All (${achievements.length})` },
            { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
            { id: 'in_progress', label: `In Progress (${achievements.length - unlockedCount})` },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                  : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/[0.06]">
              <Sparkles className="w-8 h-8 text-[#B9AECF]/60 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">No achievements in this view yet</p>
              <p className="text-xs text-[#B9AECF] mt-1">
                Keep streaming, connecting, and uploading to unlock new milestones.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border ${
                  item.isUnlocked
                    ? 'bg-[#1D1035] border-[#FFC84A]/35'
                    : 'bg-white/[0.03] border-white/[0.07]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        item.isUnlocked
                          ? 'bg-gradient-to-br from-[#FFC84A] to-[#F59E0B] text-black'
                          : 'bg-white/[0.06] text-[#B9AECF]'
                      }`}
                    >
                      {item.isUnlocked ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${tierStyle(item.tier)}`}
                        >
                          {item.tier}
                        </span>
                      </div>
                      <p className="text-xs text-[#B9AECF] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#D7CEEB] font-medium">Reward: {item.rewardLabel}</span>
                    <span className="font-mono font-bold tabular-nums text-white">
                      {item.progressCurrent.toLocaleString()} / {item.progressTarget.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.isUnlocked
                          ? 'bg-gradient-to-r from-emerald-400 to-[#FFC84A]'
                          : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]'
                      }`}
                      style={{ width: `${Math.max(4, item.progressPercent)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
