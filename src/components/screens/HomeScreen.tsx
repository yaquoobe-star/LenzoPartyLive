import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Radio,
  Video,
  Crown,
  Users,
  Sparkles,
  Flame,
  Eye,
  Heart,
  Mic,
  BadgeCheck,
  ShieldCheck,
  Coins,
  MessageCircle,
  MessageSquare,
  Receipt,
  Building2,
} from 'lucide-react';
import {
  BroadcasterRankingEntry,
  LiveStream,
  PartyRoom,
  ScreenType,
  UserProfile,
} from '../../types';
import {
  countActiveOccupiedSeats,
  getActiveSeatCapacity,
  normalizePartyMaxSeats,
} from '../../utils/partySeatRules';
import { LevelBadge } from '../common/LevelBadge';
import {
  DualAgencyRecord,
  buildWhatsAppUrl,
  subscribeActiveAgencies,
} from '../../services/agencyService';
import { CoinSlipOrderModal } from '../agency/CoinSlipOrderModal';

interface HomeScreenProps {
  currentUser?: UserProfile;
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
  onSendMessage?: (user: UserProfile) => void;
}

interface OriginalTopHostItem {
  rank: number;
  host: UserProfile;
  sourceType: 'live' | 'party';
  stream?: LiveStream;
  room?: PartyRoom;
  liveCount: number;
  score: number;
  formattedScore: string;
}

const FAKE_HOST_PATTERN = /^(demo|mock|fake|seed|sample|bot|test_host)[_-]?/i;

function isOriginalRealHost(user?: UserProfile | null): boolean {
  if (!user || !user.id || !user.name) return false;
  const id = String(user.id).trim();
  const name = String(user.name).trim();
  if (id.length < 4 || name.length < 1) return false;
  if (FAKE_HOST_PATTERN.test(id) || FAKE_HOST_PATTERN.test(name)) return false;
  return true;
}

function formatCompactScore(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(Math.max(0, Math.round(num)));
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  currentUser,
  liveStreams,
  partyRooms,
  topBroadcasters = [],
  onSelectLive,
  onSelectRoom,
  onSelectUser,
  onNavigate,
  onToggleFollow,
  onSendMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'foryou' | 'live' | 'following'>('foryou');
  const [streamCategoryTab, setStreamCategoryTab] = useState<'live_stream' | 'audio_party'>('live_stream');

  // Active Coin Seller Agencies (Live Firestore Subscription for Moving Carousel)
  const [coinSellerAgencies, setCoinSellerAgencies] = useState<DualAgencyRecord[]>([]);
  const [agenciesLoaded, setAgenciesLoaded] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const [slipModalAgency, setSlipModalAgency] = useState<DualAgencyRecord | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const didSwipeCarouselRef = useRef<boolean>(false);

  useEffect(() => {
    const unsub = subscribeActiveAgencies('all', (list) => {
      setCoinSellerAgencies(list);
      setAgenciesLoaded(true);
    });
    return () => unsub();
  }, []);

  // Clamp slide index if agency list changes
  useEffect(() => {
    if (coinSellerAgencies.length === 0) {
      setActiveSlideIndex(0);
    } else if (activeSlideIndex >= coinSellerAgencies.length) {
      setActiveSlideIndex(0);
    }
  }, [coinSellerAgencies.length, activeSlideIndex]);

  // Smooth auto-advance across ALL active agency cards
  useEffect(() => {
    if (coinSellerAgencies.length <= 1 || isCarouselPaused || slipModalAgency) return;
    const timer = window.setInterval(() => {
      setActiveSlideIndex((prev) => (prev + 1) % coinSellerAgencies.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [coinSellerAgencies.length, isCarouselPaused, slipModalAgency]);

  const goToPrevAgency = () => {
    if (coinSellerAgencies.length <= 1) return;
    setActiveSlideIndex((prev) => (prev - 1 + coinSellerAgencies.length) % coinSellerAgencies.length);
  };

  const goToNextAgency = () => {
    if (coinSellerAgencies.length <= 1) return;
    setActiveSlideIndex((prev) => (prev + 1) % coinSellerAgencies.length);
  };

  const handleCarouselTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    didSwipeCarouselRef.current = false;
    setIsCarouselPaused(true);
  };

  const handleCarouselTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    setIsCarouselPaused(false);
    if (startX === null || endX === null) return;
    const delta = startX - endX;
    if (Math.abs(delta) > 36) {
      didSwipeCarouselRef.current = true;
      if (delta > 0) goToNextAgency();
      else goToPrevAgency();
      window.setTimeout(() => {
        didSwipeCarouselRef.current = false;
      }, 250);
    }
  };

  const handleInAppAgencyChat = (agency: DualAgencyRecord) => {
    // Never redirect to Profile / Agency Center when tapping an agency card!
    // Always open direct In-App Inbox with the tapped agency (or Inbox messages if it's your own agency).
    if (!onSendMessage || (currentUser && agency.ownerUid === currentUser.id)) {
      onNavigate('chat');
      return;
    }
    const ownerProfile: UserProfile = {
      id: agency.ownerUid,
      displayId: agency.ownerDisplayId || agency.ownerUid.slice(0, 8),
      name: agency.name || agency.ownerName || 'Verified Agency',
      username: agency.ownerUsername || `@${agency.agencyCode.toLowerCase()}`,
      avatar:
        agency.ownerAvatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(agency.name || 'Agency')}&background=8B20FF&color=fff`,
      bio: agency.description || 'Official Verified Lenzo Agency',
      level: 1,
      vipLevel: 0,
      isVIP: false,
      coins: 0,
      diamonds: 0,
      followersCount: 0,
      followingCount: 0,
      fansCount: '0',
      likesCount: '0',
    };
    onSendMessage(ownerProfile);
  };

  // STRICTLY ORIGINAL LIVE / ACTIVE PARTY HOSTS FOR TOP BROADCASTERS (NO FAKE HOSTS!)
  const originalTopBroadcasters = useMemo<OriginalTopHostItem[]>(() => {
    const scoreByHostId = new Map<string, OriginalTopHostItem>();
    const rankingLookup = new Map<string, BroadcasterRankingEntry>();
    topBroadcasters.forEach((entry) => {
      if (entry?.user?.id) {
        rankingLookup.set(entry.user.id, entry);
      }
    });

    // 1. Add real active live video stream hosts
    liveStreams.forEach((stream) => {
      if (!isOriginalRealHost(stream.host)) return;
      const viewers = Number(stream.numericViewers ?? 0) || 0;
      const likes = Number(stream.likesCount ?? 0) || 0;
      const level = Number(stream.host.level ?? 0) || 0;
      const matchedRank = rankingLookup.get(stream.host.id);
      const liveEngagementScore =
        viewers * 15 + likes * 3 + level * 5 + (matchedRank ? Number(matchedRank.score || 0) : 0);

      const existing = scoreByHostId.get(stream.host.id);
      if (!existing || liveEngagementScore > existing.score) {
        scoreByHostId.set(stream.host.id, {
          rank: 1,
          host: stream.host,
          sourceType: 'live',
          stream,
          liveCount: viewers,
          score: Math.max(1, Math.round(liveEngagementScore)),
          formattedScore: formatCompactScore(Math.max(1, Math.round(liveEngagementScore))),
        });
      }
    });

    // 2. Add real active audio party hosts
    partyRooms.forEach((room) => {
      if (!isOriginalRealHost(room.host)) return;
      const host = room.host;
      const participants =
        typeof room.numericParticipants === 'number'
          ? room.numericParticipants
          : parseInt(String(room.participantCount || '0'), 10) || 0;
      const level = Number(host.level ?? 0) || 0;
      const matchedRank = rankingLookup.get(host.id);
      const roomScore =
        participants * 12 + level * 5 + (matchedRank ? Number(matchedRank.score || 0) : 0);

      const existing = scoreByHostId.get(host.id);
      if (!existing || roomScore > existing.score) {
        scoreByHostId.set(host.id, {
          rank: 1,
          host,
          sourceType: 'party',
          room,
          liveCount: participants,
          score: Math.max(1, Math.round(roomScore)),
          formattedScore: formatCompactScore(Math.max(1, Math.round(roomScore))),
        });
      }
    });

    return Array.from(scoreByHostId.values())
      .sort((a, b) => b.score - a.score || b.liveCount - a.liveCount)
      .slice(0, 2)
      .map((item, idx) => ({
        ...item,
        rank: idx + 1,
      }));
  }, [liveStreams, partyRooms, topBroadcasters]);

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

  const visibleLiveCards = filteredStreams;
  const visiblePartyRooms = filteredPartyRooms;

  const handleOpenOriginalTopHost = (item: OriginalTopHostItem) => {
    if (item.sourceType === 'live' && item.stream) {
      onSelectLive(item.stream);
      return;
    }
    if (item.sourceType === 'party' && item.room) {
      onSelectRoom(item.room);
      return;
    }
    onSelectUser(item.host);
  };

  const buyerDisplayId = currentUser?.displayId || currentUser?.id?.slice(0, 8) || 'Guest';

  return (
    <div className="w-full pb-28 md:pb-12 animate-fade-in">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 safe-pt-3 space-y-5">
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

        {/* ===================================================================== */}
        {/* 1. AUTO-SLIDING ACTIVE AGENCIES CAROUSEL (DIRECT INBOX & WHATSAPP)   */}
        {/* ===================================================================== */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#FFC84A] to-[#F97316] flex items-center justify-center text-[#090611] shrink-0 shadow">
                <Coins className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-xs sm:text-sm font-black tracking-wide text-white uppercase truncate">
                Active Official Agencies
              </h2>
            </div>

            {coinSellerAgencies.length > 1 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-[#C5B9DE] tabular-nums">
                  {activeSlideIndex + 1} / {coinSellerAgencies.length}
                </span>
                <button
                  type="button"
                  onClick={goToPrevAgency}
                  aria-label="Previous Agency"
                  className="w-8 h-8 rounded-full bg-[#190D2E] hover:bg-[#281547] border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goToNextAgency}
                  aria-label="Next Agency"
                  className="w-8 h-8 rounded-full bg-[#190D2E] hover:bg-[#281547] border border-white/15 flex items-center justify-center text-white active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {coinSellerAgencies.length === 0 ? (
            /* Honest Empty State — Zero Fake/Mock Agencies & Never Redirects to Profile */
            <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#23113E] via-[#1A0C30] to-[#3A164B] border border-amber-400/30 p-5 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-[#FFC84A]" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-black text-white font-display leading-snug">
                    {agenciesLoaded ? 'No Active Agencies Yet' : 'Loading Active Agencies...'}
                  </h3>
                  <p className="text-xs text-[#C5B9DE] leading-relaxed">
                    All approved active agencies appear here automatically as sliding cards with direct WhatsApp &amp; In-App Inbox contact for coins.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Smooth Auto-Sliding & Swipeable Moving Agency Cards Track */
            <div
              className="relative overflow-hidden rounded-3xl"
              onMouseEnter={() => setIsCarouselPaused(true)}
              onMouseLeave={() => setIsCarouselPaused(false)}
              onTouchStart={handleCarouselTouchStart}
              onTouchEnd={handleCarouselTouchEnd}
            >
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeSlideIndex * 100}%)` }}
              >
                {coinSellerAgencies.map((agency) => {
                  const isCoinSeller = agency.agencyType === 'coin_seller';
                  const isOwnAgency = Boolean(currentUser && agency.ownerUid === currentUser.id);
                  const waText = isCoinSeller
                    ? `Salam ${agency.name} (${agency.agencyCode})! I want to buy Lenzo Coins. My Lenzo ID is ${buyerDisplayId}. Please share your payment details so I can send my payment receipt.`
                    : `Salam ${agency.name} (${agency.agencyCode})! I want to contact your agency on Lenzo Party Live. My Lenzo ID is ${buyerDisplayId}.`;
                  const waHref = buildWhatsAppUrl(agency.whatsappNumber, waText);

                  return (
                    <div key={agency.id} className="w-full shrink-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (didSwipeCarouselRef.current) return;
                          handleInAppAgencyChat(agency);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleInAppAgencyChat(agency);
                          }
                        }}
                        className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#261242] via-[#190B2E] to-[#3B144A] border border-amber-400/45 hover:border-amber-300/75 p-4 sm:p-5 shadow-xl shadow-[#8B20FF]/20 cursor-pointer transition-all group"
                      >
                        {/* Subtle ambient sheen */}
                        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-amber-400/10 blur-2xl pointer-events-none" />
                        <div className="absolute -bottom-12 -left-10 w-44 h-44 rounded-full bg-[#F328D5]/15 blur-2xl pointer-events-none" />

                        <div className="relative z-10 space-y-3">
                          {/* Top Meta Strip (Clean, Low-Clutter) */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                                <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
                                <span>{isCoinSeller ? 'Coin Seller Agency' : 'Official Host Agency'}</span>
                              </span>
                              <span className="text-[#6F5F8E]">•</span>
                              <span className="text-[10px] font-mono font-bold text-[#FFC84A] truncate">
                                {agency.agencyCode}
                              </span>
                            </div>

                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-bold shrink-0 ${
                                agency.isOnline ? 'text-emerald-300' : 'text-[#B9AECF]'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  agency.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-[#A59AB8]'
                                }`}
                              />
                              {agency.isOnline ? 'Active Now' : 'Online'}
                            </span>
                          </div>

                          {/* Agency Identity Row */}
                          <div className="flex items-center gap-3">
                            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#FFC84A] via-[#F59E0B] to-[#FA26A0] p-[2px] shrink-0 shadow-lg">
                              <div className="w-full h-full rounded-[14px] bg-[#160A26] overflow-hidden flex items-center justify-center">
                                {agency.ownerAvatar ? (
                                  <img
                                    src={agency.ownerAvatar}
                                    alt={agency.name}
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Coins className="w-6 h-6 text-[#FFC84A]" />
                                )}
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <h3 className="text-base sm:text-xl font-black text-white group-hover:text-[#FFC84A] transition-colors font-display leading-tight truncate">
                                {agency.name}
                              </h3>
                              <p className="text-[11px] text-[#D8CEE8] truncate mt-0.5">
                                {agency.ownerName} · {isOwnAgency ? 'Tap to open your Agency Inbox' : 'Tap card to message agency for coins'}
                              </p>
                              <p className="text-[11px] text-[#B9AECF] line-clamp-1 mt-0.5">
                                {agency.description ||
                                  'Order coins via In-App Inbox or WhatsApp, send payment receipt & receive real coins directly.'}
                              </p>
                            </div>
                          </div>

                          {/* Direct Actions: In-App Agency Inbox, Direct WhatsApp, Send Receipt */}
                          <div className={`grid gap-2 pt-0.5 ${isCoinSeller && !isOwnAgency ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInAppAgencyChat(agency);
                              }}
                              className="min-h-[44px] py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F97316] text-[#090611] text-xs font-black flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition-transform"
                            >
                              <MessageSquare className="w-4 h-4 shrink-0" />
                              <span className="truncate">
                                {isOwnAgency ? 'Agency Inbox' : 'In-App Inbox'}
                              </span>
                            </button>

                            {isCoinSeller && !isOwnAgency ? (
                              <div className="grid grid-cols-2 sm:contents gap-2">
                                {waHref ? (
                                  <a
                                    href={waHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#22c55e] text-[#041B0D] text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                                  >
                                    <MessageCircle className="w-4 h-4 shrink-0" />
                                    <span className="truncate">WhatsApp</span>
                                  </a>
                                ) : (
                                  <span className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/5 text-[#8E7FA8] text-xs font-bold flex items-center justify-center">
                                    No WhatsApp
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (currentUser) {
                                      setSlipModalAgency(agency);
                                    } else {
                                      handleInAppAgencyChat(agency);
                                    }
                                  }}
                                  className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                                >
                                  <Receipt className="w-4 h-4 text-[#FFC84A] shrink-0" />
                                  <span className="truncate">Send Receipt</span>
                                </button>
                              </div>
                            ) : waHref ? (
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#22c55e] text-[#041B0D] text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                              >
                                <MessageCircle className="w-4 h-4 shrink-0" />
                                <span className="truncate">WhatsApp</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInAppAgencyChat(agency);
                                }}
                                className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-black flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                              >
                                <MessageSquare className="w-4 h-4 text-[#FFC84A] shrink-0" />
                                <span className="truncate">Message</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slide Indicator Dots */}
              {coinSellerAgencies.length > 1 && (
                <div className="flex items-center justify-center gap-1.5 pt-2.5">
                  {coinSellerAgencies.map((ag, idx) => (
                    <button
                      key={ag.id}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      aria-label={`View ${ag.name}`}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeSlideIndex
                          ? 'w-7 bg-gradient-to-r from-[#FFC84A] to-[#F328D5]'
                          : 'w-2 bg-white/25 hover:bg-white/45'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ===================================================================== */}
        {/* 2. QUICK ACTION ROW: GO STREAM & CREATE PARTY (Directly below Slider) */}
        {/* ===================================================================== */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('create_live')}
            className="group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-[#8B20FF] via-[#B91CE5] to-[#F328D5] border border-pink-300/35 shadow-lg shadow-[#F328D5]/25 text-left flex items-center gap-3 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-black/25 border border-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-base font-black text-white leading-tight truncate">
                Go Stream
              </span>
              <span className="block text-[10px] sm:text-[11px] text-white/85 truncate mt-0.5">
                Start HD Live Video
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('create_room')}
            className="group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-r from-[#231042] via-[#3A1464] to-[#6B177C] border border-[#FA26A0]/50 shadow-lg shadow-[#8B20FF]/25 text-left flex items-center gap-3 active:scale-[0.98] transition-all"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#FA26A0] to-[#8B20FF] flex items-center justify-center text-white shrink-0 shadow group-hover:scale-105 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm sm:text-base font-black text-white leading-tight truncate">
                Create Party
              </span>
              <span className="block text-[10px] sm:text-[11px] text-[#E5D4FA] truncate mt-0.5">
                Host Audio Party Room
              </span>
            </div>
          </button>
        </div>

        {/* ===================================================================== */}
        {/* 3. TOP BROADCASTERS — ABOVE CARDS, STRICTLY ORIGINAL REAL HOSTS ONLY  */}
        {/* ===================================================================== */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-white font-display flex items-center gap-2">
              <Crown className="w-5 h-5 text-[#FFC84A]" />
              <span>TOP BROADCASTERS</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('rankings')}
              className="text-xs text-[#B9AECF] hover:text-[#F328D5] flex items-center gap-0.5 font-semibold transition-colors"
            >
              <span>Leaderboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {originalTopBroadcasters.length === 0 ? (
            <div className="rounded-2xl bg-[#160C25] border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#211333] border border-[#FFC84A]/30 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-[#FFC84A]" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white">No Original Hosts Live Right Now</h4>
                  <p className="text-xs text-[#B9AECF]">
                    Only real, currently live hosts appear here. Go Stream or Create Party to claim #1!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('create_live')}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shrink-0 active:scale-95 transition-transform"
              >
                Go Live to Claim #1
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {originalTopBroadcasters.map((entry) => {
                const isFirst = entry.rank === 1;
                return (
                  <div
                    key={entry.host.id}
                    onClick={() => handleOpenOriginalTopHost(entry)}
                    className={`relative rounded-2xl overflow-hidden p-3.5 sm:p-4 cursor-pointer transition-all border shadow-xl group ${
                      isFirst
                        ? 'bg-gradient-to-br from-[#2B193D] via-[#1C0F2E] to-[#3B174A] border-[#FFC84A]/60 hover:border-[#FFC84A]'
                        : 'bg-gradient-to-br from-[#1C1230] via-[#160C25] to-[#24133D] border-slate-300/40 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {entry.host.avatar ? (
                            <img
                              src={entry.host.avatar}
                              alt={entry.host.name}
                              referrerPolicy="no-referrer"
                              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl object-cover ring-2 ${
                                isFirst ? 'ring-[#FFC84A]' : 'ring-slate-300'
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center font-black text-lg text-white ring-2 bg-[#2A1645] ${
                                isFirst ? 'ring-[#FFC84A]' : 'ring-slate-300'
                              }`}
                            >
                              {(entry.host.name || 'H').charAt(0).toUpperCase()}
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
                              {entry.host.name}
                            </span>
                            <LevelBadge level={entry.host.level || 0} size="sm" />
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-[#B9AECF] mt-1 font-mono">
                            <span className="flex items-center gap-1 text-cyan-300">
                              {entry.sourceType === 'live' ? (
                                <Eye className="w-3 h-3" />
                              ) : (
                                <Users className="w-3 h-3" />
                              )}
                              {entry.liveCount.toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1 text-[#FFC84A]">
                              <Flame className="w-3 h-3" />
                              {entry.formattedScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {entry.sourceType === 'live' ? (
                          <span className="bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            WATCH LIVE
                          </span>
                        ) : (
                          <span className="bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                            <Mic className="w-3 h-3" />
                            JOIN PARTY
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

        {/* ===================================================================== */}
        {/* 4. LIVE STREAM & AUDIO PARTY CARDS (Below Top Broadcasters)           */}
        {/* ===================================================================== */}
        <section className="space-y-3.5">
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
              <span>{streamCategoryTab === 'live_stream' ? 'Go Stream' : 'Create Party Room'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* TAB 1: LIVE STREAM CARDS */}
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
                  type="button"
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
                  const topRankIndex = originalTopBroadcasters.findIndex(
                    (b) => b.host.id === stream.host.id
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
          ) : /* TAB 2: AUDIO PARTY ROOM CARDS */
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
                  : 'Launch a 5-seat, 8-seat, or 16-seat live audio party room and talk with friends in real time.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('create_room')}
                className="px-5 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-bold shadow-lg shadow-[#8B20FF]/35 active:scale-95 transition-all"
              >
                Create Party Room
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {visiblePartyRooms.map((room) => {
                const maxSeats = normalizePartyMaxSeats(room.maxSeats, room.host?.level);
                const activeCapacity = getActiveSeatCapacity(maxSeats, room.host?.level);
                const occupiedSeats = countActiveOccupiedSeats(room.seats, maxSeats, room.host?.level);
                const availableSeats = Math.max(0, activeCapacity - occupiedSeats);
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
                            {occupiedSeats}/{activeCapacity} Seats
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
      </div>

      {/* Payment Slip Order Modal for Selected Coin Seller Agency */}
      {currentUser && (
        <CoinSlipOrderModal
          isOpen={Boolean(slipModalAgency)}
          onClose={() => setSlipModalAgency(null)}
          agency={slipModalAgency}
          currentUser={currentUser}
          onSendMessage={onSendMessage}
        />
      )}
    </div>
  );
};
