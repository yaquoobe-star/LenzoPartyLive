import React from 'react';
import { ShoppingBag, Home, LayoutGrid, Plus, Film, MessageCircle, User } from 'lucide-react';
import { ScreenType } from '../../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenCreate: () => void;
  unreadMessagesCount?: number;
  storeNotificationCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenCreate,
  unreadMessagesCount = 0,
  storeNotificationCount = 0,
}) => {
  // Global bottom navigation must ONLY appear on main browsing screens.
  if ([
    'splash',
    'auth',
    'login',
    'signup',
    'live_active',
    'audio_room',
    'party_8',
    'party_16',
    'battle',
    'match_request',
    'upload_video',
    'create_live',
    'create_room',
  ].includes(currentScreen)) {
    return null;
  }

  const isHomeActive = currentScreen === 'home';
  const isRoomsActive = currentScreen === 'party' || currentScreen === 'rooms' || currentScreen === 'live_rooms';
  const isStoreActive = currentScreen === 'store';
  const isVideosActive = currentScreen === 'videos';
  const isChatActive = currentScreen === 'messages' || currentScreen === 'chat' || currentScreen === 'inbox';
  const isProfileActive = currentScreen === 'profile' || currentScreen === 'settings' || currentScreen === 'wallet';

  // Dedicated Store Screen 5-Tab Bottom Navigation matching Lenzo Store visual spec:
  // Home | Rooms | Store (glowing purple pill & shopping bag) | Videos | Profile
  if (isStoreActive) {
    return (
      <nav
        aria-label="Store Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0318]/95 backdrop-blur-xl border-t border-purple-500/30 px-2 pb-safe pt-1.5 md:hidden select-none shadow-[0_-8px_28px_rgba(88,28,135,0.45)]"
      >
        <div className="grid grid-cols-5 items-center max-w-lg mx-auto h-14">
          <button
            onClick={() => onNavigate('home')}
            className="flex flex-col items-center justify-center py-1 text-[#C4B5FD]/80 hover:text-white active:scale-90 transition-all"
            aria-label="Home"
          >
            <Home className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-semibold mt-0.5">Home</span>
          </button>

          <button
            onClick={() => onNavigate('rooms')}
            className="flex flex-col items-center justify-center py-1 text-[#C4B5FD]/80 hover:text-white active:scale-90 transition-all"
            aria-label="Rooms"
          >
            <LayoutGrid className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-semibold mt-0.5">Rooms</span>
          </button>

          <button
            onClick={() => onNavigate('store')}
            className="relative flex flex-col items-center justify-center -mt-2 active:scale-95 transition-all"
            aria-label="Store"
          >
            <div
              className="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-2xl border border-fuchsia-300/60 text-white"
              style={{
                background: 'linear-gradient(135deg, #9333EA 0%, #C026D3 55%, #7C3AED 100%)',
                boxShadow: '0 0 22px rgba(192, 38, 211, 0.85), 0 4px 14px rgba(0, 0, 0, 0.6)',
              }}
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.4] text-white" />
              <span className="text-[10px] font-black tracking-wide text-white mt-0.5">Store</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('videos')}
            className="flex flex-col items-center justify-center py-1 text-[#C4B5FD]/80 hover:text-white active:scale-90 transition-all"
            aria-label="Videos"
          >
            <Film className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-semibold mt-0.5">Videos</span>
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="flex flex-col items-center justify-center py-1 text-[#C4B5FD]/80 hover:text-white active:scale-90 transition-all"
            aria-label="Profile"
          >
            <User className="w-5 h-5 stroke-[1.9]" />
            <span className="text-[10px] font-semibold mt-0.5">Profile</span>
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090611]/95 backdrop-blur-xl border-t border-white/[0.08] px-1 pb-safe pt-1 md:hidden select-none">
      <div className="flex items-center justify-between relative max-w-lg mx-auto h-14">
        {/* 1. HOME */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isHomeActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Home"
        >
          <Home className={`w-5 h-5 ${isHomeActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] tracking-tight mt-0.5 ${isHomeActive ? 'font-bold text-white' : 'font-medium'}`}>
            Home
          </span>
        </button>

        {/* 2. ROOMS */}
        <button
          onClick={() => onNavigate('rooms')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isRoomsActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Rooms"
        >
          <LayoutGrid className={`w-5 h-5 ${isRoomsActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] tracking-tight mt-0.5 ${isRoomsActive ? 'font-bold text-white' : 'font-medium'}`}>
            Rooms
          </span>
        </button>

        {/* 3. STORE */}
        <button
          onClick={() => onNavigate('store')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isStoreActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Store"
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${isStoreActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
            {storeNotificationCount > 0 && !isStoreActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-gradient-to-r from-[#F328D5] to-[#FF6B00] animate-pulse" />
            )}
          </div>
          <span className={`text-[9px] tracking-tight mt-0.5 ${isStoreActive ? 'font-bold text-white' : 'font-medium'}`}>
            Store
          </span>
        </button>

        {/* 4. PLUS (CENTRAL CREATE BUTTON) */}
        <div className="relative -top-3 flex items-center justify-center px-0.5">
          <button
            onClick={onOpenCreate}
            aria-label="Create Video, Live or Room"
            className="group relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#c415f5] flex items-center justify-center text-white shadow-[0_8px_25px_rgba(243,40,213,0.55)] active:scale-95 transition-all duration-200"
          >
            <Plus className="w-6 h-6 stroke-[2.8] group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* 5. VIDEOS */}
        <button
          onClick={() => onNavigate('videos')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isVideosActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Videos"
        >
          <Film className={`w-5 h-5 ${isVideosActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] tracking-tight mt-0.5 ${isVideosActive ? 'font-bold text-white' : 'font-medium'}`}>
            Videos
          </span>
        </button>

        {/* 6. CHAT */}
        <button
          onClick={() => onNavigate('messages')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isChatActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Chat"
        >
          <div className="relative">
            <MessageCircle className={`w-5 h-5 ${isChatActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
            {unreadMessagesCount > 0 && (
              <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-[#F328D5] text-[9px] font-black text-white flex items-center justify-center shadow-[0_0_8px_rgba(243,40,213,0.8)] border border-[#090611]">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </div>
          <span className={`text-[9px] tracking-tight mt-0.5 ${isChatActive ? 'font-bold text-white' : 'font-medium'}`}>
            Chat
          </span>
        </button>

        {/* 7. PROFILE */}
        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isProfileActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
          aria-label="Profile"
        >
          <User className={`w-5 h-5 ${isProfileActive ? 'scale-110 stroke-[2.4] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[9px] tracking-tight mt-0.5 ${isProfileActive ? 'font-bold text-white' : 'font-medium'}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
