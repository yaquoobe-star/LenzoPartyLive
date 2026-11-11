import React from 'react';
import { Home, LayoutGrid, MessageSquare, User, Plus, Film } from 'lucide-react';
import { ScreenType } from '../../types';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenCreate: () => void;
  unreadMessagesCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenCreate,
  unreadMessagesCount = 99,
}) => {
  // CRITICAL RULE: Global bottom navigation must ONLY appear on main browsing screens.
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
    'create_room'
  ].includes(currentScreen)) {
    return null;
  }

  const isRoomsActive = currentScreen === 'party' || currentScreen === 'rooms' || currentScreen === 'live_rooms';
  const isInboxActive = currentScreen === 'messages' || currentScreen === 'inbox' || currentScreen === 'notifications';
  const isProfileActive = currentScreen === 'profile' || currentScreen === 'settings' || currentScreen === 'wallet';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#090611]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 pb-safe pt-1.5 md:hidden select-none">
      <div className="flex items-center justify-between relative max-w-lg mx-auto h-14">
        {/* 1. Home */}
        <button
          onClick={() => onNavigate('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            currentScreen === 'home' ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
        >
          <Home className={`w-5 h-5 ${currentScreen === 'home' ? 'scale-110 stroke-[2.5] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] tracking-tight mt-1 ${currentScreen === 'home' ? 'font-bold text-white' : 'font-medium'}`}>
            Home
          </span>
        </button>

        {/* 2. Rooms (Matching reference showcase Screen C) */}
        <button
          onClick={() => onNavigate('rooms')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isRoomsActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
        >
          <LayoutGrid className={`w-5 h-5 ${isRoomsActive ? 'scale-110 stroke-[2.5] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] tracking-tight mt-1 ${isRoomsActive ? 'font-bold text-white' : 'font-medium'}`}>
            Rooms
          </span>
        </button>

        {/* 3. Central Create (+) Button */}
        <div className="relative -top-3 flex items-center justify-center px-1">
          <button
            onClick={onOpenCreate}
            aria-label="Create Live or Party Room"
            className="group relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#c415f5] flex items-center justify-center text-white shadow-[0_8px_25px_rgba(243,40,213,0.55)] active:scale-95 transition-all duration-200"
          >
            <Plus className="w-7 h-7 stroke-[2.8] group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* 4. Videos / Reels (Matching Reference Screen 1 & Screen 4) */}
        <button
          onClick={() => onNavigate('videos')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            currentScreen === 'videos' ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
        >
          <Film className={`w-5 h-5 ${currentScreen === 'videos' ? 'scale-110 stroke-[2.5] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] tracking-tight mt-1 ${currentScreen === 'videos' ? 'font-bold text-white' : 'font-medium'}`}>
            Videos
          </span>
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200 active:scale-90 ${
            isProfileActive ? 'text-[#F328D5]' : 'text-[#B9AECF] hover:text-white'
          }`}
        >
          <User className={`w-5 h-5 ${isProfileActive ? 'scale-110 stroke-[2.5] text-[#F328D5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] tracking-tight mt-1 ${isProfileActive ? 'font-bold text-white' : 'font-medium'}`}>
            Profile
          </span>
        </button>
      </div>
    </nav>
  );
};
