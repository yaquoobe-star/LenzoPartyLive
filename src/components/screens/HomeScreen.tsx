import React, { useState } from 'react';
import {
  ChevronRight,
  Radio,
  Video,
  Crown,
  Users,
  Sparkles,
  Plus,
  Flame,
  Eye,
  Heart,
  Mic,
} from 'lucide-react';
import {
  BroadcasterRankingEntry,
  LiveStream,
  PartyRoom,
  ScreenType,
  UserProfile,
} from '../../types';
import { LevelBadge } from '../common/LevelBadge';

interface HomeScreenProps {
  liveStreams: LiveStream[];
  partyRooms: PartyRoom[];
  topHosts: UserProfile[];
  topBroadcasters?: BroadcasterRankingEntry[];
  onSelectLive: (stream: LiveStream) => void;
  onSelectRoom: (room: PartyRoom) => void;
  onSelectUser: (user: UserProfile) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenPK: () => void;
  onOpenGiftShop: () => void;
  onOpenMicMenu?: () => void;
  onToggleFollow?: (userId: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  liveStreams,
  partyRooms,
  topBroadcasters = [],
  onSelectLive,
  onSelectRoom,
  onSelectUser,
  onNavigate,
  onOpenMicMenu,
  onToggleFollow,
}) => {
  const [activeTab, setActiveTab] = useState<'foryou' | 'live' | 'following'>('foryou');
  const [streamCategoryTab, setStreamCategoryTab] = useState<'live_stream' | 'audio_party'>('live_stream');

  const topTwoBroadcasters = topBroadcasters.slice(0, 2);

  const filteredStreams = liveStreams.filter((stream) => {
    if (activeTab === 'following') {
      return Boolean(stream.host.isFollowing);
    }
    return true;
  });

  const filteredPartyRooms = partyRooms.filter((room) => {
    if (activeTab === 'following') {
      return Boolean(room.host?.isFollowing);
    }
    return true;
  });

  // Always show all active real-time live streams as clickable live cards
  const visibleLiveCards = filteredStreams;
  const visiblePartyRooms = filteredPartyRooms;

  const heroFeaturedStream = liveStreams[0] || null;
  const heroFeaturedBroadcaster = topTwoBroadcasters[0] || null;
  const heroAvatar =
    heroFeaturedStream?.coverImage ||
    heroFeaturedBroadcaster?.user.coverImage ||
    heroFeaturedBroadcaster?.user.avatar ||
    null;

  const handleOpenBroadcaster = (entry: BroadcasterRankingEntry) => {
    const matchingStream = liveStreams.find(
      (s) => s.id === entry.liveStreamId || s.host.id === entry.user.id
    );
    if (matchingStream) {
      onSelectLive(matchingStream);
      return;
    }
    onSelectUser(entry.user);
  };

  return (
    <div className="w-full pb-24 sm:pb-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 space-y-5">
        {/* Category Feed Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'foryou', label: 'For You', isActive: activeTab === 'foryou', action: () => setActiveTab('foryou') },
            { id: 'live', label: 'Live', isActive: activeTab === 'live', action: () => setActiveTab('live') },
            { id: 'rooms', label: 'Rooms', isActive: false, action: () => onNavigate('rooms') },
            { id: 'videos', label: 'Videos', isActive: false, action: () => onNavigate('videos') },
            { id: 'following', label: 'Following', isActive: activeTab === 'following', action: () => setActiveTab('following') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                tab.isActive
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/25'
                  : 'bg-[#160C25] text-[#B9AECF] hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 1. HERO BANNER: Dream Big Go Live */}
        <div
          onClick={onOpenMicMenu || (() => onNavigate('create_live'))}
          className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#211333] via-[#351854] to-[#611979] border border-[#F328D5]/35 p-5 sm:p-7 shadow-xl shadow-[#8B20FF]/20 cursor-pointer group hover:border-[#F328D5]/65 transition-all"
        >
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#F328D5]/30 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="max-w-xs sm:max-w-md">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold text-[#FFC84A] mb-2">
                <Radio className="w-3 h-3 text-[#F328D5]" />
                <span>LENZO PARTY LIVE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display leading-tight mb-1 group-hover:text-pink-200 transition-colors">
                Dream Big <br />
                <span className="bg-gradient-to-r from-[#FFC84A] via-[#F328D5] to-[#8B20FF] bg-clip-text text-transparent">
                  Go Live!
                </span>
              </h2>
              <p className="text-xs text-[#B9AECF] mb-4">
                Start a real-time video broadcast & connect with fans worldwide.
              </p>

              <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-white font-extrabold text-xs shadow-lg shadow-[#F328D5]/35 group-hover:scale-105 transition-transform">
                <Video className="w-3.5 h-3.5" />
                <span>Go Live</span>
              </div>
            </div>

            <div className="relative shrink-0 hidden xs:block">
              {heroAvatar ? (
                <div className="relative w-28 h-36 sm:w-36 sm:h-44 rounded-2xl overflow-hidden ring-2 ring-[#F328D5]/60 shadow-2xl bg-[#160C25]">
                  <img
                    src={heroAvatar}
                    alt={heroFeaturedStream?.host.name || heroFeaturedBroadcaster?.user.name || 'Live Stream'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    LIVE
                  </div>
                </div>
              ) : (
                <div className="w-28 h-32 sm:w-36 sm:h-40 rounded-2xl bg-[#160C25]/90 border border-[#F328D5]/40 flex flex-col items-center justify-center p-3 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8B20FF] to-[#F328D5] flex items-center justify-center text-white mb-2 shadow-lg shadow-[#F328D5]/40">
                    <Video className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-extrabold text-white text-center">Start Studio</span>
                  <span className="text-[9px] text-[#B9AECF] text-center mt-0.5">HD Live Stream</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. STREAMING CATEGORY TABS (LIVE STREAM & AUDIO PARTY) + UNIFIED CARD GRID */}
        <section className="space-y-3.5">
          {/* Primary Lenzo Party Category Switcher Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div
              role="tablist"
              aria-label="Streaming categories"
              className="grid grid-cols-2 p-1 rounded-2xl bg-[#140A24] border border-[#8B20FF]/35 shadow-[0_0_20px_rgba(139,32,255,0.18)] w-full sm:w-auto sm:min-w-[330px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={streamCategoryTab === 'live_stream'}
                onClick={() => setStreamCategoryTab('live_stream')}
                className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-200 ${
                  streamCategoryTab === 'live_stream'
                    ? 'bg-gradient-to-r from-[#8B20FF] via-[#C026D3] to-[#F328D5] text-white shadow-[0_0_18px_rgba(243,40,213,0.45)]'
                    : 'text-[#B9AECF] hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="w-3.5 h-3.5 shrink-0" />
                <span>LIVE STREAM</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
                    streamCategoryTab === 'live_stream'
                      ? 'bg-black/30 text-white'
                      : 'bg-white/10 text-[#B9AECF]'
                  }`}
                >
                  {visibleLiveCards.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={streamCategoryTab === 'audio_party'}
                onClick={() => setStreamCategoryTab('audio_party')}
                className={`relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-wide transition-all duration-200 ${
                  streamCategoryTab === 'audio_party'
                    ? 'bg-gradient-to-r from-[#8B20FF] via-[#A855F7] to-[#FA26A0] text-white shadow-[0_0_18px_rgba(139,32,255,0.5)]'
                    : 'text-[#B9AECF] hover:text-white hover:bg-white/5'
                }`}
              >
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <span>AUDIO PARTY</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
                    streamCategoryTab === 'audio_party'
                      ? 'bg-black/30 text-white'
                      : 'bg-white/10 text-[#B9AECF]'
                  }`}
                >
                  {visiblePartyRooms.length}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() =>
                onNavigate(streamCategoryTab === 'live_stream' ? 'create_live' : 'create_room')
              }
              className="self-end sm:self-auto text-xs text-[#F328D5] hover:text-pink-300 flex items-center gap-0.5 font-bold transition-colors"
            >
              <span>{streamCategoryTab === 'live_stream' ? 'Go Live' : 'Create Party Room'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: LIVE STREAM CARDS (Existing Card Design Preserved) */}
          {streamCategoryTab === 'live_stream' ? (
            visibleLiveCards.length === 0 ? (
              <div className="py-10 px-4 rounded-3xl bg-[#160C25] border border-white/10 text-center flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-[#211333] flex items-center justify-center mb-2.5 text-[#F328D5]">
                  <Radio className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  {activeTab === 'following'
                    ? 'No Followed Hosts Are Live'
                    : 'No Live Streams Active'}
                </h4>
                <p className="text-xs text-[#B9AECF] max-w-xs mb-3.5">
                  {activeTab === 'following'
                    ? 'Follow broadcasters to see their live streams here as soon as they start.'
                    : 'Be the first to go live and showcase your talent in real time.'}
                </p>
                <button
                  onClick={() => onNavigate('create_live')}
                  className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-lg shadow-[#F328D5]/30 active:scale-95 transition-all"
                >
                  Go Live Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {visibleLiveCards.map((stream) => {
                  const cardImage = stream.coverImage || stream.host.coverImage || stream.host.avatar;
                  const topRankIndex = topTwoBroadcasters.findIndex(
                    (b) => b.liveStreamId === stream.id || b.user.id === stream.host.id
                  );
                  return (
                    <div
                      key={stream.id}
                      onClick={() => onSelectLive(stream)}
                      className="group relative rounded-2xl overflow-hidden bg-[#160C25] border border-white/10 hover:border-[#F328D5]/60 transition-all duration-300 shadow-lg cursor-pointer flex flex-col"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#211333]">
                        {cardImage ? (
                          <img
                            src={cardImage}
                            alt={stream.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#211333] to-[#3B174A]">
                            <Video className="w-10 h-10 text-white/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                        {/* Top Badges: LIVE + Optional Top Rank + Viewer Count */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs gap-1">
                          <div className="flex items-center gap-1">
                            <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                              LIVE
                            </span>
                            {topRankIndex >= 0 && (
                              <span className="bg-[#FFC84A] text-[#090611] font-black text-[9px] px-1.5 py-0.5 rounded-full shadow">
                                #{topRankIndex + 1}
                              </span>
                            )}
                          </div>

                          <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                            <Eye className="w-3 h-3 text-cyan-300" />
                            <span>{stream.numericViewers ?? 0}</span>
                          </span>
                        </div>

                        {/* Stream Title */}
                        <div className="absolute bottom-10 left-2.5 right-2.5">
                          <p className="text-xs font-extrabold text-white truncate drop-shadow">
                            {stream.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <LevelBadge level={stream.host.level || 0} size="sm" />
                            <span className="text-[10px] text-rose-300 flex items-center gap-0.5 font-mono">
                              <Heart className="w-2.5 h-2.5 fill-rose-400" />
                              {stream.likesCount || 0}
                            </span>
                          </div>
                        </div>

                        {/* Bottom Host Info with Follow Button */}
                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {stream.host.avatar ? (
                              <img
                                src={stream.host.avatar}
                                alt={stream.host.name}
                                referrerPolicy="no-referrer"
                                className="w-5 h-5 rounded-full object-cover ring-1 ring-white/50 shrink-0"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[#8B20FF] text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white/50 shrink-0">
                                {(stream.host.name || 'H').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-bold text-white truncate drop-shadow">
                              {stream.host.name}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleFollow?.(stream.host.id);
                            }}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md hover:scale-105 transition-transform shrink-0 ${
                              stream.host.isFollowing
                                ? 'bg-white/20 text-white'
                                : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white'
                            }`}
                          >
                            {stream.host.isFollowing ? 'Following' : 'Follow'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : /* TAB 2: AUDIO PARTY ROOM CARDS (Consistent Visual Grid, Real Backend/Firestore Data Only) */
          visiblePartyRooms.length === 0 ? (
            <div className="py-10 px-4 rounded-3xl bg-[#160C25] border border-white/10 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-[#211333] flex items-center justify-center mb-2.5 text-[#A855F7]">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-1">
                {activeTab === 'following'
                  ? 'No Followed Audio Party Rooms Active'
                  : 'No Audio Party Rooms Active'}
              </h4>
              <p className="text-xs text-[#B9AECF] max-w-xs mb-3.5">
                {activeTab === 'following'
                  ? 'Follow party hosts to see their live audio rooms right here.'
                  : 'Launch an 8-seat or 16-seat live audio party room and talk with friends in real time.'}
              </p>
              <button
                onClick={() => onNavigate('create_room')}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold shadow-lg shadow-[#8B20FF]/35 active:scale-95 transition-all"
              >
                Create Party Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {visiblePartyRooms.map((room) => {
                const maxSeats = room.maxSeats === 16 ? 16 : 8;
                const occupiedSeats = Array.isArray(room.seats) ? room.seats.filter(Boolean).length : 0;
                const availableSeats = Math.max(0, maxSeats - occupiedSeats);
                const onlineCount =
                  typeof room.numericParticipants === 'number'
                    ? room.numericParticipants
                    : parseInt(String(room.participantCount || '0'), 10) || 0;
                const cardImage = room.coverImage || room.host?.coverImage || room.host?.avatar;

                return (
                  <div
                    key={room.id}
                    onClick={() => onSelectRoom(room)}
                    className="group relative rounded-2xl overflow-hidden bg-[#160C25] border border-[#8B20FF]/30 hover:border-[#FA26A0]/70 transition-all duration-300 shadow-lg cursor-pointer flex flex-col"
                  >
                    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#1C0D33]">
                      {cardImage ? (
                        <img
                          src={cardImage}
                          alt={room.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#240F42] via-[#3A125C] to-[#1A092B]">
                          <Mic className="w-10 h-10 text-[#C084FC]/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090414]/95 via-[#140724]/30 to-black/35" />

                      {/* Top Badges: AUDIO PARTY Status + Participant Count */}
                      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs gap-1">
                        <span className="bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white font-black text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                          <Mic className="w-2.5 h-2.5" />
                          <span>AUDIO PARTY</span>
                        </span>

                        <span className="bg-black/65 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                          <Users className="w-3 h-3 text-emerald-300" />
                          <span>{onlineCount}</span>
                        </span>
                      </div>

                      {/* Room Title & Seat Availability */}
                      <div className="absolute bottom-10 left-2.5 right-2.5 space-y-1">
                        <p className="text-xs font-extrabold text-white truncate drop-shadow">
                          {room.title}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#1D0B38]/90 border border-[#A855F7]/40 text-[9px] font-bold text-[#E9D5FF]">
                            {occupiedSeats}/{maxSeats} Seats
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                              availableSeats > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                            }`}
                          >
                            {availableSeats > 0 ? `${availableSeats} Open` : 'Full'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Host Info + Join Action */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {room.host?.avatar ? (
                            <img
                              src={room.host.avatar}
                              alt={room.host.name}
                              referrerPolicy="no-referrer"
                              className="w-5 h-5 rounded-full object-cover ring-1 ring-[#FA26A0]/70 shrink-0"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[#8B20FF] text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white/50 shrink-0">
                              {(room.host?.name || 'H').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-bold text-white truncate drop-shadow">
                            {room.host?.name || 'Host'}
                          </span>
                        </div>

                        <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-[10px] font-black shadow-md shrink-0">
                          Join
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* 4. PROMINENT PARTY ROOM CREATION CARD */}
        <div
          onClick={() => onNavigate('create_room')}
          className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-r from-[#1A0D2E] via-[#261042] to-[#3B0F54] border border-[#FA26A0]/35 p-4 sm:p-5 shadow-lg cursor-pointer group hover:border-[#FA26A0]/70 transition-all"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FA26A0] to-[#8B20FF] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#FA26A0]/30 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-white font-display tracking-wide">
                  CREATE YOUR PARTY ROOM
                </h3>
                <p className="text-xs text-[#B9AECF] truncate">
                  Launch an 8-seat or 16-seat live audio party room & invite friends
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('create_room');
              }}
              className="px-4 py-2 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-[#FA26A0]/35 shrink-0 active:scale-95 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
              <span>Create Room</span>
            </button>
          </div>
        </div>

        {/* 5. TOP BROADCASTERS (STRICTLY TOP 1 & TOP 2) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-white font-display flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FFC84A]" />
              <span>TOP BROADCASTERS</span>
            </h3>
            <button
              onClick={() => onNavigate('rankings')}
              className="text-xs text-[#B9AECF] hover:text-[#F328D5] flex items-center gap-0.5 font-semibold transition-colors"
            >
              <span>Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topTwoBroadcasters.length === 0 ? (
            <div className="rounded-2xl bg-[#160C25] border border-white/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#211333] border border-[#FFC84A]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#FFC84A]" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">No Ranked Broadcasters Yet</h4>
                  <p className="text-xs text-[#B9AECF]">
                    Top #1 and #2 broadcasters are ranked live by viewers, gifts & engagement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('create_live')}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shrink-0 active:scale-95 transition-transform"
              >
                Go Live to Claim #1
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {topTwoBroadcasters.map((entry, idx) => {
                const isFirst = entry.rank === 1 || idx === 0;
                const matchingStream = liveStreams.find(
                  (s) => s.id === entry.liveStreamId || s.host.id === entry.user.id
                );

                return (
                  <div
                    key={entry.user.id}
                    onClick={() => handleOpenBroadcaster(entry)}
                    className={`relative rounded-2xl overflow-hidden p-4 cursor-pointer transition-all border shadow-xl group ${
                      isFirst
                        ? 'bg-gradient-to-br from-[#2B193D] via-[#1C0F2E] to-[#3B174A] border-[#FFC84A]/60 hover:border-[#FFC84A]'
                        : 'bg-gradient-to-br from-[#1C1230] via-[#160C25] to-[#24133D] border-slate-300/40 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {entry.user.avatar ? (
                            <img
                              src={entry.user.avatar}
                              alt={entry.user.name}
                              referrerPolicy="no-referrer"
                              className={`w-14 h-14 rounded-2xl object-cover ring-2 ${
                                isFirst ? 'ring-[#FFC84A]' : 'ring-slate-300'
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white ring-2 bg-[#2A1645] ${
                                isFirst ? 'ring-[#FFC84A]' : 'ring-slate-300'
                              }`}
                            >
                              {(entry.user.name || 'B').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -top-2 -left-2 px-2 py-0.5 rounded-full text-[10px] font-black shadow ${
                              isFirst
                                ? 'bg-[#FFC84A] text-[#090611]'
                                : 'bg-slate-200 text-[#090611]'
                            }`}
                          >
                            #{entry.rank}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-white truncate">
                              {entry.user.name}
                            </span>
                            <LevelBadge level={entry.user.level || 0} size="sm" />
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#B9AECF] mt-1 font-mono">
                            <span className="flex items-center gap-1 text-cyan-300">
                              <Eye className="w-3 h-3" />
                              {entry.breakdown.uniqueViewers.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1 text-[#FFC84A]">
                              <Flame className="w-3 h-3" />
                              {entry.formattedScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {entry.isCurrentlyLive || matchingStream ? (
                          <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            WATCH LIVE
                          </span>
                        ) : (
                          <span className="bg-white/10 text-white/80 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            Profile
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
