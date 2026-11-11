import React from 'react';
import { 
  Home, 
  Sparkles, 
  Video, 
  Radio, 
  Gift, 
  Trophy, 
  MessageCircle, 
  User, 
  Settings, 
  Swords, 
  PlusCircle, 
  Coins, 
  Crown,
  LogOut
} from 'lucide-react';
import { LonzoLogo } from './LonzoLogo';
import { ScreenType, UserProfile } from '../../types';
import { AvatarWithFrame } from './AvatarWithFrame';
import { LevelBadge } from './LevelBadge';
import { COIN_CONFIG } from '../../utils/coinConfig';

interface DesktopSidebarProps {
  currentScreen: ScreenType;
  currentUser: UserProfile;
  onNavigate: (screen: ScreenType) => void;
  onOpenCreateLive: () => void;
  onOpenCreateRoom: () => void;
  onOpenWallet: () => void;
  onOpenGiftShop: () => void;
  onOpenPKModal: () => void;
  onOpenVIP: () => void;
  onLogout: () => void;
  unreadMessagesCount?: number;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentScreen,
  currentUser,
  onNavigate,
  onOpenCreateLive,
  onOpenCreateRoom,
  onOpenWallet,
  onOpenGiftShop,
  onOpenPKModal,
  onOpenVIP,
  onLogout,
  unreadMessagesCount = 99,
}) => {
  const mainNavItems = [
    { id: 'home' as ScreenType, label: 'Home Feed', icon: Home },
    { id: 'party' as ScreenType, label: 'Rooms & Voice Party', icon: Video },
    { id: 'rankings' as ScreenType, label: 'Rankings & Stars', icon: Trophy },
    { id: 'messages' as ScreenType, label: 'Messages', icon: MessageCircle, badge: unreadMessagesCount > 0 ? '99+' : undefined },
    { id: 'profile' as ScreenType, label: 'Me / Profile', icon: User },
    { id: 'settings' as ScreenType, label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 shrink-0 h-screen sticky top-0 bg-[#0c0717] border-r border-white/[0.08] p-5 justify-between overflow-y-auto no-scrollbar z-30">
      <div className="flex flex-col gap-6">
        {/* Brand Header */}
        <div 
          onClick={() => onNavigate('home')} 
          className="cursor-pointer pt-1"
        >
          <LonzoLogo size="sm" horizontal showTagline={true} />
        </div>

        {/* User Mini Profile Card */}
        <div 
          onClick={() => onNavigate('profile')}
          className="p-3 rounded-2xl bg-gradient-to-br from-[#160C25] to-[#211333] border border-white/10 hover:border-[#F328D5]/40 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-3">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white group-hover:text-[#F328D5] transition-colors truncate">
                  {currentUser.name}
                </span>
                <LevelBadge level={currentUser.level} size="xs" />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-[#B9AECF]">
                <span className="font-mono">{currentUser.username || '@queensara'}</span>
              </div>
            </div>
          </div>

          {/* Quick Balance Strip inside user card */}
          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between text-xs">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onOpenWallet();
              }}
              title={COIN_CONFIG.formatPkrEquivalent(currentUser.coins)}
              className="flex items-center gap-1.5 text-[#FFC84A] font-semibold hover:opacity-80 transition-opacity"
            >
              <span>🪙</span>
              <span>{currentUser.coins.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ({COIN_CONFIG.formatPkrEquivalent(currentUser.coins)})
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenVIP();
              }}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 transition-colors flex items-center gap-1"
            >
              <span>VIP {currentUser.vipLevel}</span>
              <span>›</span>
            </button>
          </div>
        </div>


        {/* Quick Broadcast Launch CTAs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenCreateLive}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] hover:opacity-95 text-white text-xs font-bold shadow-md shadow-[#F328D5]/20 active:scale-98 transition-all"
          >
            <Video className="w-4 h-4" />
            <span>Go Live</span>
          </button>
          <button
            onClick={onOpenCreateRoom}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#211333] hover:bg-[#2d1b46] border border-[#8B20FF]/40 text-white text-xs font-bold active:scale-98 transition-all"
          >
            <Radio className="w-4 h-4 text-[#FFC84A]" />
            <span>New Room</span>
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1">
          <div className="text-[10px] font-bold tracking-wider text-[#B9AECF]/60 uppercase px-3 mb-1">
            Menu
          </div>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#8B20FF]/25 to-[#F328D5]/20 text-white border border-[#F328D5]/40 shadow-sm' 
                    : 'text-[#B9AECF] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F328D5]' : 'text-[#B9AECF]'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-[10px] font-bold text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="text-[10px] font-bold tracking-wider text-[#B9AECF]/60 uppercase px-3 mt-3 mb-1">
            Entertainment
          </div>
          
          {/* Quick Gift Shop Trigger */}
          <button
            onClick={onOpenGiftShop}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#B9AECF] hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <Gift className="w-4 h-4 text-[#FFC84A]" />
              <span>Gift Shop</span>
            </div>
            <span className="text-[10px] text-[#FFC84A] font-bold bg-[#FFC84A]/10 px-2 py-0.5 rounded">
              Store
            </span>
          </button>

          {/* Quick PK Battle Arena Trigger */}
          <button
            onClick={onOpenPKModal}
            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-[#B9AECF] hover:text-white hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-3">
              <Swords className="w-4 h-4 text-[#F328D5]" />
              <span>PK Battle Arena</span>
            </div>
            <span className="text-[10px] text-[#F328D5] font-bold bg-[#F328D5]/10 px-2 py-0.5 rounded">
              Live PK
            </span>
          </button>
        </nav>
      </div>

      {/* Bottom Card: Wallet Recharge & Logout */}
      <div className="pt-4 border-t border-white/[0.08] flex flex-col gap-3">
        <div 
          onClick={onOpenWallet}
          className="p-3 rounded-xl bg-gradient-to-r from-[#FFC84A]/10 via-[#F328D5]/10 to-[#8B20FF]/10 border border-[#FFC84A]/30 flex items-center justify-between cursor-pointer hover:border-[#FFC84A]/60 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-[#FFC84A]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Recharge Center</span>
              <span className="text-[10px] text-[#B9AECF]">Get up to +25% bonus coins</span>
            </div>
          </div>
          <span className="text-xs font-extrabold text-[#FFC84A]">›</span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-2 px-3 py-2 text-xs text-[#B9AECF] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Account / Logout</span>
        </button>
      </div>
    </aside>
  );
};
