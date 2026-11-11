import React, { useState } from 'react';
import { 
  X, 
  Search, 
  TrendingUp, 
  Clock, 
  Radio, 
  Video, 
  User, 
  Sparkles, 
  Trash2 
} from 'lucide-react';
import { LiveStream, PartyRoom, UserProfile } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveStreams: LiveStream[];
  partyRooms: PartyRoom[];
  users: UserProfile[];
  onSelectLive: (stream: LiveStream) => void;
  onSelectRoom: (room: PartyRoom) => void;
  onSelectUser: (user: UserProfile) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  liveStreams,
  partyRooms,
  users,
  onSelectLive,
  onSelectRoom,
  onSelectUser,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'All' | 'Hosts' | 'Rooms' | 'Live'>('All');
  const [recentSearches, setRecentSearches] = useState(['Angel Girl', 'Music Party', 'PK Battle', 'Gaming']);

  if (!isOpen) return null;

  const normalizedQuery = query.toLowerCase().trim();

  const matchedHosts = users.filter((u) => 
    !normalizedQuery || u.name.toLowerCase().includes(normalizedQuery) || u.displayId.includes(normalizedQuery)
  );

  const matchedRooms = partyRooms.filter((r) => 
    !normalizedQuery || r.title.toLowerCase().includes(normalizedQuery) || r.category.toLowerCase().includes(normalizedQuery)
  );

  const matchedLive = liveStreams.filter((l) => 
    !normalizedQuery || l.title.toLowerCase().includes(normalizedQuery) || l.host.name.toLowerCase().includes(normalizedQuery)
  );

  const hasResults = (matchedHosts.length > 0 && ['All', 'Hosts'].includes(filterType)) ||
                     (matchedRooms.length > 0 && ['All', 'Rooms'].includes(filterType)) ||
                     (matchedLive.length > 0 && ['All', 'Live'].includes(filterType));

  const handleClearHistory = () => {
    setRecentSearches([]);
  };

  const handleSelectRecent = (term: string) => {
    setQuery(term);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-xl bg-[#160C25] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] mt-4 sm:mt-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/[0.08] flex items-center gap-3">
          <div className="flex-1 flex items-center bg-[#211333] border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#F328D5] transition-colors">
            <Search className="w-4 h-4 text-[#B9AECF] mr-2 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search hosts, party rooms, ID or categories..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#B9AECF]/50 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-[#B9AECF] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-[#211333] hover:bg-[#2e1a47] flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Type Pills: All, Hosts, Rooms, Live */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] overflow-x-auto no-scrollbar">
          {(['All', 'Hosts', 'Rooms', 'Live'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                filterType === type
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow'
                  : 'bg-[#211333] text-[#B9AECF] hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto no-scrollbar flex-1 space-y-5">
          {/* Recent Searches (when query is empty) */}
          {!query && recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#B9AECF] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent Searches
                </span>
                <button
                  onClick={handleClearHistory}
                  className="text-[11px] text-[#B9AECF] hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectRecent(term)}
                    className="px-3 py-1.5 rounded-xl bg-[#211333] hover:bg-[#2c1745] text-xs text-white border border-white/5 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending Searches */}
          {!query && (
            <div>
              <span className="text-xs font-bold text-[#FFC84A] flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5" />
                Trending Topics
              </span>
              <div className="flex flex-wrap gap-2">
                {['🔥 Hot PK Battle', '🎶 Late Night Jam', '💎 VIP Lounge', '🎮 Esports Squad', '💖 Love Match'].map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuery(t.replace(/[^a-zA-Z ]/g, '').trim())}
                    className="px-3 py-1.5 rounded-xl bg-[#211333] hover:bg-[#2e1a47] text-xs text-[#B9AECF] hover:text-white border border-white/5 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {query && (
            <div className="space-y-4">
              {/* Matched Live Streams */}
              {['All', 'Live'].includes(filterType) && matchedLive.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#B9AECF] uppercase mb-2">Live Broadcasts</h4>
                  <div className="space-y-2">
                    {matchedLive.map((stream) => (
                      <div
                        key={stream.id}
                        onClick={() => {
                          onClose();
                          onSelectLive(stream);
                        }}
                        className="p-2.5 rounded-2xl bg-[#211333] hover:bg-[#2b1742] border border-white/5 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={stream.coverImage}
                            alt={stream.title}
                            className="w-12 h-12 rounded-xl object-cover"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-[#F328D5] transition-colors">
                              {stream.title}
                            </span>
                            <span className="text-[11px] text-[#B9AECF]">
                              Host: {stream.host.name} • 👤 {stream.viewerCount}
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-rose-600 text-white text-[10px] font-black">
                          LIVE
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Hosts */}
              {['All', 'Hosts'].includes(filterType) && matchedHosts.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#B9AECF] uppercase mb-2">Creators & Hosts</h4>
                  <div className="space-y-2">
                    {matchedHosts.map((host) => (
                      <div
                        key={host.id}
                        onClick={() => {
                          onClose();
                          onSelectUser(host);
                        }}
                        className="p-2.5 rounded-2xl bg-[#211333] hover:bg-[#2b1742] border border-white/5 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={host.avatar}
                            alt={host.name}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#8B20FF]"
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-[#F328D5] transition-colors">
                              {host.name}
                            </span>
                            <span className="text-[10px] text-[#B9AECF] font-mono">
                              ID: {host.displayId} • {host.fansCount} fans
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-[#FFC84A] font-bold">
                          View ›
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Rooms */}
              {['All', 'Rooms'].includes(filterType) && matchedRooms.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-[#B9AECF] uppercase mb-2">Party Rooms</h4>
                  <div className="space-y-2">
                    {matchedRooms.map((room) => (
                      <div
                        key={room.id}
                        onClick={() => {
                          onClose();
                          onSelectRoom(room);
                        }}
                        className="p-2.5 rounded-2xl bg-[#211333] hover:bg-[#2b1742] border border-white/5 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white">
                            <Radio className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white group-hover:text-[#F328D5] transition-colors">
                              {room.title}
                            </span>
                            <span className="text-[10px] text-[#B9AECF]">
                              {room.category} • 👤 {room.participantCount} online
                            </span>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[11px] font-bold shadow">
                          Join
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No results message */}
              {!hasResults && (
                <div className="py-12 text-center flex flex-col items-center">
                  <Search className="w-10 h-10 text-[#B9AECF]/40 mb-2" />
                  <h4 className="text-sm font-bold text-white mb-1">No results for "{query}"</h4>
                  <p className="text-xs text-[#B9AECF]">
                    Try searching for Angel Girl, Music Party, Gaming, or KingRaja
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
