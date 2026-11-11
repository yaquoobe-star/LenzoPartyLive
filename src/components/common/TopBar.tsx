import React from 'react';
import { Search, Bell, Plus, Crown, Sparkles } from 'lucide-react';
import { UserProfile, ScreenType } from '../../types';
import { AvatarWithFrame } from './AvatarWithFrame';
import { LevelBadge } from './LevelBadge';
import { COIN_CONFIG } from '../../utils/coinConfig';

interface TopBarProps {
  currentUser: UserProfile;
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onOpenVIP: () => void;
  unreadCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  currentScreen,
  onNavigate,
  onOpenWallet,
  onOpenNotifications,
  onOpenSearch,
  onOpenVIP,
  unreadCount = 1,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#090611]/90 backdrop-blur-md border-b border-white/[0.06] px-3.5 sm:px-6 py-2.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: User mini profile badge */}
        <div 
          onClick={() => onNavigate('profile')} 
          className="flex items-center gap-2.5 cursor-pointer group hover:opacity-90 active:scale-[0.98] transition-transform select-none"
        >
          <div className="relative">
            <AvatarWithFrame
              src={currentUser.avatar}
              name={currentUser.name}
              level={currentUser.level}
              vipLevel={currentUser.vipLevel}
              isVIP={currentUser.isVIP}
              size="sm"
              showFrame={true}
              showVipBadge={true}
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors leading-tight truncate max-w-[100px] sm:max-w-[140px]">
                {currentUser.name}
              </span>
              <LevelBadge level={currentUser.level} size="xs" />
            </div>
            <span className="text-[11px] text-[#B9AECF] font-mono leading-tight">
              ID: {currentUser.displayId}
            </span>
          </div>
        </div>

        {/* Right Action Icons: Search, Notifications, Coin Balance */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search Trigger */}
          <button
            onClick={onOpenSearch}
            aria-label="Search"
            className="w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white/90 hover:text-white transition-all active:scale-95"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-[#F328D5]/50 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Coins Balance Pill with Recharge '+' and PKR tooltip */}
          <div 
            onClick={onOpenWallet}
            title={`Coin Balance: ${currentUser.coins.toLocaleString()} (${COIN_CONFIG.formatPkrEquivalent(currentUser.coins)})`}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#160C25] to-[#211333] hover:from-[#211333] hover:to-[#2d1b46] border border-[#FFC84A]/30 hover:border-[#FFC84A]/60 rounded-full px-2.5 sm:px-3 py-1 cursor-pointer shadow-sm transition-all active:scale-95 group"
          >
            <span className="text-sm">🪙</span>
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs sm:text-sm font-extrabold text-[#FFC84A] font-mono tracking-tight">
                {currentUser.coins.toLocaleString()}
              </span>
            </div>
            <div className="w-4 h-4 rounded-full bg-[#FFC84A] text-[#090611] flex items-center justify-center group-hover:scale-110 transition-transform ml-0.5 shadow-sm">
              <Plus className="w-3 h-3 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
