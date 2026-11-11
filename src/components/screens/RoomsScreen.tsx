import React, { useState } from 'react';
import { 
  Search, 
  Bell, 
  Plus, 
  Users, 
  Flame, 
  Radio, 
  SlidersHorizontal,
  X,
  Sparkles,
  ArrowRight,
  Mic
} from 'lucide-react';
import { PartyRoom, ScreenType } from '../../types';

interface RoomsScreenProps {
  partyRooms: PartyRoom[];
  onSelectRoom: (room: PartyRoom) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenCreateRoom: () => void;
  onOpenSearch: () => void;
  onOpenMicMenu?: () => void;
}

export const RoomsScreen: React.FC<RoomsScreenProps> = ({
  partyRooms,
  onSelectRoom,
  onNavigate,
  onOpenCreateRoom,
  onOpenSearch,
  onOpenMicMenu,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Trending');
  const [seatFilter, setSeatFilter] = useState<'all' | '8' | '16'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const categories = [
    { id: 'Trending', label: '🔥 Trending' },
    { id: 'Popular', label: 'Popular' },
    { id: 'New', label: 'New' },
    { id: 'Friends', label: 'Friends' },
  ];

  // Filtering logic matching both 8-seat and 16-seat specifications
  const filteredRooms = partyRooms.filter((room) => {
    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = room.title.toLowerCase().includes(q);
      const matchesHost = room.host.name.toLowerCase().includes(q);
      const matchesId = room.displayId?.includes(q) || room.id.includes(q);
      if (!matchesTitle && !matchesHost && !matchesId) return false;
    }

    // Capacity filter (8 vs 16 seats)
    if (seatFilter === '8' && room.maxSeats !== 8) return false;
    if (seatFilter === '16' && room.maxSeats !== 16) return false;

    // Category filter
    if (activeCategory === 'Trending') return true;
    if (activeCategory === 'Popular') return room.numericParticipants >= 8 || room.participantCount.includes('K') || room.maxSeats === 16;
    if (activeCategory === 'New') return room.id.includes('chill') || room.id.includes('urdu') || room.id.includes('music_vibes');
    if (activeCategory === 'Friends') return room.title.toLowerCase().includes('friend') || room.category === 'Friendship' || room.host.isFollowing;
    
    return true;
  });

  return (
    <div className="w-full min-h-screen pb-28 select-none animate-fade-in bg-[#080413] text-white">
      <div className="max-w-md md:max-w-3xl mx-auto px-4 pt-2 space-y-4">
        
        {/* ========================================================
            1. HEADER (Lonzo Party Live + Search + Notifications)
            Matching Screenshot 1 top-left
           ======================================================== */}
        <header className="flex items-center justify-between pt-1">
          {/* Logo: Lonzo (white) + Party Live (pink #FA26A0) */}
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => onNavigate('home')}>
            <h1 className="text-xl font-black tracking-tight font-display">
              <span className="text-white">Lonzo </span>
              <span className="text-[#FA26A0]">Party Live</span>
            </h1>
          </div>

          {/* Right Action Icons: Microphone Broadcast, Search & Bell */}
          <div className="flex items-center gap-2.5">
            {/* Microphone Button (Triggers Go Live vs Create Room) */}
            <button
              onClick={onOpenMicMenu || onOpenCreateRoom}
              className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#FF007A] to-[#FA26A0] hover:opacity-90 flex items-center justify-center text-white shadow-md shadow-pink-900/40 transition-all active:scale-95"
              title="Broadcast (Go Live / Create Room)"
            >
              <Mic className="w-4 h-4 stroke-[2.2]" />
            </button>

            <button
              onClick={onOpenSearch}
              className="w-9 h-9 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('messages')}
              className="relative w-9 h-9 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FA26A0] text-white text-[9px] font-bold flex items-center justify-center shadow">
                1
              </span>
            </button>
          </div>
        </header>

        {/* ========================================================
            2. SUB-NAVIGATION TABS (Live | Rooms [active] | Reels | Videos)
            Matching Screenshot 1
           ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onNavigate('home')}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-[#9E97AA] hover:text-white transition-colors"
          >
            Live
          </button>
          <button
            className="px-5 py-1.5 rounded-full text-xs font-extrabold bg-[#FA26A0] text-white shadow-md shadow-[#FA26A0]/30 transition-transform"
          >
            Rooms
          </button>
          <button
            onClick={() => onNavigate('videos')}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-[#9E97AA] hover:text-white transition-colors"
          >
            Reels
          </button>
          <button
            onClick={() => onNavigate('videos')}
            className="px-4 py-1.5 rounded-full text-xs font-bold text-[#9E97AA] hover:text-white transition-colors"
          >
            Videos
          </button>
        </div>

        {/* ========================================================
            3. HERO PROMOTIONAL BANNER: "Party Rooms"
            Matching Screenshot 1 top-left design
            "Create or join voice rooms and make new friends"
            Button: "Create Room +"
            Graphic: Glowing magenta 3D headphones + microphone
           ======================================================== */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#190C2B] via-[#220E38] to-[#2D0F47] border border-[#FA26A0]/30 p-5 shadow-xl shadow-pink-950/20">
          <div className="flex items-center justify-between">
            {/* Left Content */}
            <div className="flex flex-col items-start max-w-[65%] z-10">
              <h2 className="text-xl font-black text-white font-display tracking-tight mb-1">
                Party Rooms
              </h2>
              <p className="text-xs text-[#B9AECF] font-medium leading-relaxed mb-4">
                Create or join voice rooms and make new friends
              </p>
              <button
                onClick={onOpenCreateRoom}
                className="px-4 py-2 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white text-xs font-black shadow-lg shadow-[#FA26A0]/40 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <span>Create Room</span>
                <span className="text-sm font-bold leading-none">+</span>
              </button>
            </div>

            {/* Right Graphic: Stylized Glowing Magenta 3D Headphones & Retro Mic */}
            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 rounded-full bg-[#FA26A0]/25 blur-xl animate-pulse" />
              <svg viewBox="0 0 100 100" className="w-24 h-24 filter drop-shadow-[0_0_15px_#FA26A0]">
                {/* Headphone Arch */}
                <path
                  d="M18 55 A 32 32 0 0 1 82 55"
                  fill="none"
                  stroke="#FA26A0"
                  strokeWidth="6"
                  strokeLinecap="round"
                />
                {/* Left Ear Cushion */}
                <rect x="12" y="46" width="12" height="22" rx="6" fill="#FF45B5" stroke="#FA26A0" strokeWidth="2" />
                {/* Right Ear Cushion */}
                <rect x="76" y="46" width="12" height="22" rx="6" fill="#FF45B5" stroke="#FA26A0" strokeWidth="2" />
                {/* Vintage Mic in Center */}
                <rect x="42" y="36" width="16" height="26" rx="8" fill="#FFFFFF" opacity="0.9" />
                <line x1="42" y1="44" x2="58" y2="44" stroke="#080413" strokeWidth="1.5" />
                <line x1="42" y1="52" x2="58" y2="52" stroke="#080413" strokeWidth="1.5" />
                {/* Mic Stand */}
                <path d="M38 48 C 38 64 62 64 62 48" fill="none" stroke="#FA26A0" strokeWidth="3" />
                <line x1="50" y1="64" x2="50" y2="76" stroke="#FA26A0" strokeWidth="4" />
                <ellipse cx="50" cy="78" rx="14" ry="4" fill="#FA26A0" />
              </svg>
            </div>
          </div>
        </div>

        {/* ========================================================
            4. SEARCH & SEAT FILTER BAR
            Matching Screenshot 2
           ======================================================== */}
        <div className="relative flex items-center gap-2">
          <div className="flex-1 relative flex items-center bg-[#140D20] border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#FA26A0] transition-colors">
            <Search className="w-4 h-4 text-[#9E97AA] shrink-0 mr-2.5" />
            <input
              type="text"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-[#9E97AA] outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-[#9E97AA] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Seat Capacity Filter Toggle (8 Seats vs 16 Seats vs All) */}
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all ${
              seatFilter !== 'all'
                ? 'bg-[#FA26A0] border-[#FA26A0] text-white shadow'
                : 'bg-[#140D20] border-white/10 text-white/80 hover:text-white'
            }`}
            title="Filter by Capacity (8 vs 16 Seats)"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Popup Menu */}
        {showFilterDropdown && (
          <div className="bg-[#140D20] border border-white/10 rounded-2xl p-2 flex items-center justify-between gap-2 animate-fade-in shadow-xl">
            <span className="text-[11px] font-bold text-[#9E97AA] ml-2">Capacity:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'all', label: 'All Seats' },
                { id: '8', label: '8 Seats' },
                { id: '16', label: '16 Seats' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSeatFilter(f.id as any);
                    setShowFilterDropdown(false);
                  }}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                    seatFilter === f.id
                      ? 'bg-[#FA26A0] text-white shadow-sm'
                      : 'bg-white/5 text-[#9E97AA] hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            5. CATEGORY TABS (🔥 Trending | Popular | New | Friends)
            Matching Screenshot 1
           ======================================================== */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-[#FA26A0] text-white shadow-md shadow-[#FA26A0]/25'
                  : 'bg-[#140D20] text-[#9E97AA] hover:text-white border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ========================================================
            6. ROOM CARDS LIST (Matching Screenshot 1 & Screenshot 2)
            - Circular host avatar with glowing rim
            - Room name with emoji ("Music Lovers 🎵", "Friends Party ❤️", etc.)
            - Host username ("Sara Khan", "Ali Khan", "Zara", "Usman")
            - Participants count: "👥 6/8", "👥 12/16", "👥 4/8", "👥 15/16"
            - Solid Pink "Join" button (#FA26A0)
           ======================================================== */}
        <div className="space-y-3 pt-1">
          {filteredRooms.map((room) => {
            const isFull = room.numericParticipants >= room.maxSeats;
            return (
              <div
                key={room.id}
                onClick={() => onSelectRoom(room)}
                className="group relative flex items-center justify-between p-3.5 rounded-2xl bg-[#140D20] border border-white/[0.08] hover:border-[#FA26A0]/60 transition-all duration-200 shadow-lg cursor-pointer active:scale-[0.99]"
              >
                {/* Left Side: Circular Host Avatar */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={room.host.avatar || room.coverImage}
                      alt={room.host.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#FA26A0]/50 group-hover:ring-[#FA26A0] transition-all"
                    />
                    {/* Tiny music icon badge */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FA26A0] text-white flex items-center justify-center text-[9px] shadow">
                      🎙️
                    </div>
                  </div>

                  {/* Middle Content */}
                  <div className="flex flex-col min-w-0">
                    {/* Room Name with Emoji */}
                    <h3 className="text-sm font-extrabold text-white group-hover:text-[#FA26A0] transition-colors truncate leading-snug">
                      {room.title}
                    </h3>
                    
                    {/* Host Name */}
                    <span className="text-xs text-[#9E97AA] font-medium truncate leading-snug">
                      {room.host.name}
                    </span>

                    {/* Room ID & Tag */}
                    {room.displayId && (
                      <span className="text-[10px] text-[#6E677A] font-mono leading-none mt-0.5">
                        ID: {room.displayId}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side: Participant Count & Pink Join Button */}
                <div className="flex items-center gap-3 shrink-0 ml-2">
                  {/* Current Participants / Capacity Badge: 👥 6/8 */}
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-white/90">
                    <Users className="w-3.5 h-3.5 text-[#9E97AA]" />
                    <span>{room.participantCount || `${room.numericParticipants}/${room.maxSeats}`}</span>
                  </div>

                  {/* Pink "Join" Button matching Screenshot 1 exactly */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRoom(room);
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white text-xs font-black shadow-md shadow-[#FA26A0]/30 active:scale-95 transition-all"
                  >
                    Join
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredRooms.length === 0 && (
          <div className="py-16 text-center flex flex-col items-center">
            <Radio className="w-12 h-12 text-[#9E97AA]/40 mb-3" />
            <h4 className="text-base font-bold text-white mb-1">No rooms found</h4>
            <p className="text-xs text-[#9E97AA] max-w-xs mb-4">
              Be the first to start a party voice room!
            </p>
            <button
              onClick={onOpenCreateRoom}
              className="px-5 py-2.5 rounded-full bg-[#FA26A0] text-white text-xs font-bold shadow-lg shadow-[#FA26A0]/40"
            >
              Create Room Now
            </button>
          </div>
        )}

      </div>

      {/* ========================================================
      {/* 7. FLOATING MICROPHONE BROADCAST BUTTON (Bottom-Right) */}
      <div className="fixed bottom-20 right-5 z-30 sm:hidden">
        <button
          onClick={onOpenMicMenu || onOpenCreateRoom}
          aria-label="Microphone Broadcast & Rooms"
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#FF007A] to-[#FA26A0] text-white flex items-center justify-center shadow-[0_6px_25px_rgba(250,38,160,0.6)] hover:scale-105 active:scale-95 transition-all"
        >
          <Mic className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
