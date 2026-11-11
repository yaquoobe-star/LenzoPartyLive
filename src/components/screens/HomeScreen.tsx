import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { LiveStream, PartyRoom, UserProfile, ScreenType } from '../../types';

interface HomeScreenProps {
  liveStreams: LiveStream[];
  partyRooms: PartyRoom[];
  topHosts: UserProfile[];
  onSelectLive: (stream: LiveStream) => void;
  onSelectRoom: (room: PartyRoom) => void;
  onSelectUser: (user: UserProfile) => void;
  onNavigate: (screen: ScreenType) => void;
  onOpenPK: () => void;
  onOpenGiftShop: () => void;
  onOpenMicMenu?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  liveStreams,
  partyRooms,
  topHosts,
  onSelectLive,
  onSelectRoom,
  onSelectUser,
  onNavigate,
  onOpenPK,
  onOpenGiftShop,
  onOpenMicMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'foryou' | 'popular' | 'nearby' | 'following' | 'live'>('foryou');


  return (
    <div className="w-full pb-20 sm:pb-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 pt-3 space-y-6">
        
        {/* Category Feed Tabs matching Lonzo Party Live brand */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'foryou', label: 'For You', action: () => setActiveTab('foryou') },
            { id: 'live', label: 'Live', action: () => onNavigate('party') },
            { id: 'videos', label: 'Videos', action: () => onNavigate('videos') },
            { id: 'following', label: 'Following', action: () => setActiveTab('following') },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md shadow-[#F328D5]/25'
                  : 'bg-[#160C25] text-[#B9AECF] hover:text-white border border-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hero Promotional Banner matching reference screen #1: "Dream Big Go Live! [Go Live]" */}
        <div 
          onClick={onOpenMicMenu || (() => onNavigate('create_live'))}
          className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-r from-[#211333] via-[#351854] to-[#611979] border border-[#F328D5]/35 p-5 sm:p-7 shadow-xl shadow-[#8B20FF]/20 cursor-pointer group hover:border-[#F328D5]/65 transition-all"
        >
          {/* Ambient glow backgrounds */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-[#F328D5]/30 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="max-w-xs sm:max-w-md">
              <h2 className="text-2xl sm:text-3xl font-black text-white font-display leading-tight mb-1 group-hover:text-pink-200 transition-colors">
                Dream Big <br />
                <span className="bg-gradient-to-r from-[#FFC84A] via-[#F328D5] to-[#8B20FF] bg-clip-text text-transparent">
                  Go Live!
                </span>
              </h2>
              <p className="text-xs text-[#B9AECF] mb-4">
                Share Your Talent With The World!
              </p>
              
              <div className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-gradient-to-r from-[#F328D5] to-[#8B20FF] text-white font-extrabold text-xs shadow-lg shadow-[#F328D5]/35 group-hover:scale-105 transition-transform">
                <span>Go Live</span>
              </div>
            </div>

            {/* Featured Creator Image with Headphones on right matching reference #1 */}
            <div className="relative shrink-0 hidden xs:block">
              <div className="relative w-28 h-36 sm:w-36 sm:h-44 rounded-2xl overflow-hidden ring-2 ring-[#F328D5]/60 shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                  alt="Featured Host"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  LIVE
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Popular Live Section matching reference screen #1 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white font-display flex items-center gap-1.5">
                <span>Popular Live</span>
                <span className="text-[#F328D5]">🔥</span>
              </h3>
            </div>
            <button
              onClick={() => onNavigate('party')}
              className="text-xs text-[#B9AECF] hover:text-[#F328D5] flex items-center gap-0.5 font-semibold transition-colors"
            >
              <span>See All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Stream Cards Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {liveStreams.map((stream) => (
              <div
                key={stream.id}
                onClick={() => onSelectLive(stream)}
                className="group relative rounded-2xl overflow-hidden bg-[#160C25] border border-white/10 hover:border-[#F328D5]/60 transition-all duration-300 shadow-lg cursor-pointer flex flex-col"
              >
                {/* Stream Cover Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#211333]">
                  <img
                    src={stream.coverImage}
                    alt={stream.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Dark gradient scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

                  {/* Top Badges: Live tag + Viewer count */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                    <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>

                    <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
                      <span>👤</span>
                      <span>{stream.viewerCount}</span>
                    </span>
                  </div>

                  {/* Bottom Host Info with Follow button matching reference screen #1 */}
                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src={stream.host.avatar}
                        alt={stream.host.name}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-white/50 shrink-0"
                      />
                      <span className="text-xs font-bold text-white truncate drop-shadow">
                        {stream.host.name}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // quick follow toggle
                      }}
                      className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[10px] font-bold shadow-md hover:scale-105 transition-transform shrink-0"
                    >
                      Follow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
