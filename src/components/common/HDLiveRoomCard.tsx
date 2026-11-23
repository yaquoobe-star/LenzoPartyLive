import React, { useEffect, useState } from 'react';
import { Crown, Eye, Heart, Mic, Radio, Users } from 'lucide-react';
import { LiveStream, PartyRoom, UserProfile } from '../../types';
import { LevelBadge } from './LevelBadge';
import { formatCountdownMMSS } from '../../shared/roomLifecycleConfig';
import {
  countActiveOccupiedSeats,
  getActiveSeatCapacity,
  normalizePartyMaxSeats,
} from '../../utils/partySeatRules';

export interface HDLiveRoomCardProps {
  variant: 'live' | 'party';
  stream?: LiveStream;
  room?: PartyRoom;
  topRankIndex?: number;
  onSelect: () => void;
  onToggleFollow?: (hostId: string) => void;
}

function resolveHostHdPhoto(host?: UserProfile | null, fallbackCover?: string): string {
  const avatar = typeof host?.avatar === 'string' ? host.avatar.trim() : '';
  if (avatar) return avatar;
  const cover = typeof fallbackCover === 'string' ? fallbackCover.trim() : '';
  if (cover) return cover;
  const hostCover = typeof host?.coverImage === 'string' ? host.coverImage.trim() : '';
  return hostCover;
}

export const HDLiveRoomCard: React.FC<HDLiveRoomCardProps> = ({
  variant,
  stream,
  room,
  topRankIndex = -1,
  onSelect,
  onToggleFollow,
}) => {
  const isParty = variant === 'party';
  const host = isParty ? room?.host : stream?.host;
  const title = isParty ? room?.title || 'Party Room' : stream?.title || 'Solo Live';
  const status = isParty ? room?.status || 'active' : stream?.status || 'active';
  const closesAt = isParty ? room?.closesAt ?? null : stream?.closesAt ?? null;
  const hostPresent = isParty
    ? room?.hostPresent ?? room?.isOwnerPresent ?? true
    : stream?.hostPresent ?? true;

  // Live 1-second tick ONLY when the room is in EMPTY countdown mode
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    if (status !== 'empty' || !closesAt) return;
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [status, closesAt]);

  const remainingMs = status === 'empty' && closesAt ? Math.max(0, closesAt - nowMs) : 0;
  const isEmptyState = status === 'empty';

  // Host's actual uploaded HD profile picture fills the entire card (zero animated background, zero duplicate avatar)
  const hdPhotoUrl = resolveHostHdPhoto(host, isParty ? room?.coverImage : stream?.coverImage);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [hdPhotoUrl]);

  // Exact viewer / participant count (accurately reaches 0)
  const viewerCount = isParty
    ? typeof room?.numericParticipants === 'number'
      ? Math.max(0, room.numericParticipants)
      : Math.max(0, parseInt(String(room?.participantCount || '0'), 10) || 0)
    : typeof stream?.numericViewers === 'number'
      ? Math.max(0, stream.numericViewers)
      : Math.max(0, parseInt(String(stream?.viewerCount || '0'), 10) || 0);

  // Party seat metrics
  const maxSeats = isParty && room ? normalizePartyMaxSeats(room.maxSeats, host?.level) : 0;
  const activeCapacity = isParty && room ? getActiveSeatCapacity(maxSeats, host?.level) : 0;
  const occupiedSeats =
    isParty && room ? countActiveOccupiedSeats(room.seats, maxSeats, host?.level) : 0;

  // VIP / Super VIP badge detection
  const superVipLvl = Math.max(host?.superVipLevel || 0, host?.equippedSuperVipFrame || 0);
  const isSuperVip = Boolean(host?.isSuperVIP || superVipLvl > 0);
  const vipLvl = Math.max(host?.vipLevel || 0, host?.equippedVipFrame || 0);
  const isVip = Boolean(!isSuperVip && (host?.isVIP || vipLvl > 0));

  const roomTypeLabel = isParty
    ? 'PARTY'
    : stream?.streamType === 'pk'
      ? 'PK LIVE'
      : stream?.streamType === 'live'
        ? 'LIVE'
        : 'SOLO LIVE';

  const initials = (host?.name || 'L').trim().charAt(0).toUpperCase();

  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden bg-[#120820] border transition-all duration-300 shadow-[0_10px_28px_rgba(0,0,0,0.45)] cursor-pointer flex flex-col active:scale-[0.985] ${
        isEmptyState
          ? 'border-amber-400/35 hover:border-amber-400/70'
          : isParty
            ? 'border-[#8B20FF]/35 hover:border-[#FA26A0]/75'
            : 'border-white/12 hover:border-[#F328D5]/75'
      }`}
    >
      {/* Full-Bleed 3:4 HD Host Profile Portrait Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#1A0B2E]">
        {hdPhotoUrl && !imgFailed ? (
          <img
            src={hdPhotoUrl}
            alt={host?.name || title}
            referrerPolicy="no-referrer"
            decoding="async"
            loading="eager"
            onError={() => setImgFailed(true)}
            className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03] ${
              isEmptyState ? 'brightness-[0.86]' : ''
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#230E3D] via-[#311352] to-[#12071F] select-none">
            <span className="text-4xl font-black text-white/35 tracking-tight">{initials}</span>
          </div>
        )}

        {/* Portrait-Safe Top Vignette (does not obscure Host's face) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/55 via-black/20 to-transparent" />

        {/* Portrait-Safe Bottom Scrim ONLY on lower third for crisp legibility */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-[#080312]/95 via-[#080312]/62 via-45% to-transparent" />

        {/* TOP BAR: Room Type + Live/Empty Status (Left) | Actual Viewer Count (Right) */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              {isEmptyState ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/90 text-[#120820] text-[9px] font-black tracking-wide shadow-md tabular-nums">
                  <span>EMPTY</span>
                  {closesAt ? <span>· {formatCountdownMMSS(remainingMs)}</span> : null}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-white text-[9px] font-black tracking-wide shadow-md ${
                    isParty
                      ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]'
                      : 'bg-gradient-to-r from-[#E11D48] to-[#FF2E93]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
                  {isParty ? (
                    <Mic className="w-2.5 h-2.5 shrink-0" />
                  ) : (
                    <Radio className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>{roomTypeLabel}</span>
                </span>
              )}

              {!isParty && topRankIndex >= 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-[#FFC84A] text-[#090611] text-[9px] font-black shadow">
                  #{topRankIndex + 1}
                </span>
              )}
            </div>

            {!hostPresent && !isEmptyState && (
              <span className="inline-flex items-center self-start px-1.5 py-0.5 rounded bg-black/65 border border-white/15 text-[9px] font-bold text-amber-200/95">
                Host Left
              </span>
            )}
          </div>

          {/* Exact Real-Time Viewer / Participant Count */}
          <div
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm border border-white/15 text-white text-[10px] font-extrabold tabular-nums shrink-0 shadow"
            title={isParty ? 'Active participants' : 'Live viewers'}
          >
            {isParty ? (
              <Users className="w-3 h-3 text-emerald-300 shrink-0" />
            ) : (
              <Eye className="w-3 h-3 text-cyan-300 shrink-0" />
            )}
            <span>{viewerCount.toLocaleString()}</span>
          </div>
        </div>

        {/* BOTTOM OVERLAY: Title, Host Name, Level, VIP/SVIP Badge & Room Metadata */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex flex-col gap-1">
          {/* Room / Stream Title */}
          <p className="text-[12px] font-extrabold text-white leading-tight truncate drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {title}
          </p>

          {/* Host Name + Level + VIP/SVIP Badge (Zero duplicate avatar image!) */}
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <span className="text-[11px] font-bold text-white/95 truncate max-w-[58%] drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              {host?.name || 'Host'}
            </span>
            <LevelBadge level={host?.level || 0} size="sm" />
            {isSuperVip ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-gradient-to-r from-[#FF3B7F] via-[#F59E0B] to-[#FFC84A] text-[#14071E] text-[8px] font-black tracking-wide shadow">
                <Crown className="w-2.5 h-2.5 shrink-0" />
                <span>SVIP{superVipLvl > 0 ? ` ${superVipLvl}` : ''}</span>
              </span>
            ) : isVip ? (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-[1px] rounded bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#14071E] text-[8px] font-black tracking-wide shadow">
                <Crown className="w-2.5 h-2.5 shrink-0" />
                <span>VIP{vipLvl > 0 ? ` ${vipLvl}` : ''}</span>
              </span>
            ) : null}
          </div>

          {/* Bottom Meta Row: Seats / Likes + Primary Action */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            {isParty ? (
              <>
                <span className="text-[10px] font-semibold text-[#E9D5FF]/90 tabular-nums truncate">
                  {occupiedSeats}/{activeCapacity} Seats
                  {isEmptyState ? ' · Closing soon' : ''}
                </span>
                <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-[10px] font-black shadow shrink-0">
                  Join
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-200/95 tabular-nums truncate">
                  <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400 shrink-0" />
                  <span>{(stream?.likesCount || 0).toLocaleString()}</span>
                  {isEmptyState ? <span className="text-amber-300">· Empty</span> : null}
                </span>

                {onToggleFollow && host?.id ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFollow(host.id);
                    }}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold shadow transition-transform active:scale-95 shrink-0 ${
                      host.isFollowing
                        ? 'bg-white/20 text-white border border-white/20'
                        : 'bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white'
                    }`}
                  >
                    {host.isFollowing ? 'Following' : 'Follow'}
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-[10px] font-black shadow shrink-0">
                    Watch
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
