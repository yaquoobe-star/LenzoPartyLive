import { PartyRoom } from '../types';
import { apiUrl } from './apiConfig';

export type PartyBackgroundType = 'preset' | 'host_dp' | 'custom';

export interface PartyBackgroundPreset {
  id: string;
  name: string;
  tag: string;
  /** Primary CSS background gradient (also acts as instant placeholder/fallback) */
  gradient: string;
  /** Secondary radial stage glow overlay */
  glow: string;
  /** Optional scenic photo URL layered softly beneath the readability scrim */
  imageUrl?: string;
  /** Accent border/chip color for picker cards */
  accent: string;
}

export const DEFAULT_PARTY_BACKGROUND_ID = 'royal_neon';

export const PARTY_BACKGROUND_PRESETS: PartyBackgroundPreset[] = [
  {
    id: 'royal_neon',
    name: 'Royal Neon',
    tag: 'Classic',
    gradient:
      'radial-gradient(ellipse at top, #4B127A 0%, #1B0734 52%, #060212 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(255, 215, 0, 0.42) 0%, rgba(200, 80, 255, 0.25) 45%, transparent 75%)',
    accent: '#C77DFF',
  },
  {
    id: 'galaxy_aurora',
    name: 'Galaxy Aurora',
    tag: 'Cosmic',
    gradient:
      'radial-gradient(ellipse at 20% 10%, #0EA5E9 0%, #3B0764 46%, #050214 100%)',
    glow:
      'radial-gradient(circle at 75% 22%, rgba(56, 189, 248, 0.45) 0%, rgba(168, 85, 247, 0.3) 45%, transparent 72%)',
    imageUrl:
      'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=900&auto=format&fit=crop&q=75',
    accent: '#38BDF8',
  },
  {
    id: 'golden_vip',
    name: 'Golden Palace',
    tag: 'VIP',
    gradient:
      'radial-gradient(ellipse at top, #78350F 0%, #2C1208 48%, #0A040A 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(255, 215, 0, 0.55) 0%, rgba(245, 158, 11, 0.22) 50%, transparent 75%)',
    imageUrl:
      'https://images.unsplash.com/photo-1519750783826-e2420f4d687f?w=900&auto=format&fit=crop&q=75',
    accent: '#FACC15',
  },
  {
    id: 'midnight_concert',
    name: 'Concert Stage',
    tag: 'Live',
    gradient:
      'radial-gradient(ellipse at top, #9D174D 0%, #2B083B 50%, #070212 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(250, 38, 160, 0.5) 0%, rgba(139, 32, 255, 0.25) 48%, transparent 76%)',
    imageUrl:
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=900&auto=format&fit=crop&q=75',
    accent: '#FA26A0',
  },
  {
    id: 'cyberpunk_tokyo',
    name: 'Cyber Night',
    tag: 'Neon',
    gradient:
      'radial-gradient(ellipse at top, #0F172A 0%, #1E1B4B 45%, #050312 100%)',
    glow:
      'radial-gradient(circle at 25% 20%, rgba(236, 72, 153, 0.45) 0%, rgba(6, 182, 212, 0.35) 50%, transparent 75%)',
    imageUrl:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=900&auto=format&fit=crop&q=75',
    accent: '#22D3EE',
  },
  {
    id: 'velvet_rose',
    name: 'Velvet Rose',
    tag: 'Love',
    gradient:
      'radial-gradient(ellipse at top, #881337 0%, #3B0726 50%, #0C0310 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(251, 113, 133, 0.48) 0%, rgba(244, 63, 94, 0.22) 50%, transparent 76%)',
    imageUrl:
      'https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=900&auto=format&fit=crop&q=75',
    accent: '#FB7185',
  },
  {
    id: 'emerald_aura',
    name: 'Emerald Aura',
    tag: 'Chill',
    gradient:
      'radial-gradient(ellipse at top, #065F46 0%, #0A252B 50%, #030A10 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(52, 211, 153, 0.45) 0%, rgba(16, 185, 129, 0.2) 48%, transparent 76%)',
    accent: '#34D399',
  },
  {
    id: 'sunset_rooftop',
    name: 'Sunset Vibe',
    tag: 'Party',
    gradient:
      'radial-gradient(ellipse at top, #C2410C 0%, #4C1D57 52%, #0B0414 100%)',
    glow:
      'radial-gradient(ellipse at top, rgba(251, 146, 60, 0.48) 0%, rgba(217, 70, 239, 0.26) 48%, transparent 76%)',
    imageUrl:
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&auto=format&fit=crop&q=75',
    accent: '#FB923C',
  },
];

export function getPartyBackgroundPreset(id?: string | null): PartyBackgroundPreset {
  if (id) {
    const found = PARTY_BACKGROUND_PRESETS.find((p) => p.id === id);
    if (found) return found;
  }
  return PARTY_BACKGROUND_PRESETS[0];
}

/**
 * Safely resolve relative backend media URLs (e.g. /api/media/...) into full cross-platform URLs
 * so both Web and native Capacitor Android clients render custom backgrounds reliably.
 */
export function resolvePartyBackgroundImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/api/')) {
    return apiUrl(trimmed);
  }
  return trimmed;
}

export function normalizePartyBackgroundType(raw?: unknown): PartyBackgroundType {
  if (raw === 'host_dp' || raw === 'custom' || raw === 'preset') {
    return raw;
  }
  return 'preset';
}

export interface ResolvedPartyBackground {
  type: PartyBackgroundType;
  preset: PartyBackgroundPreset;
  imageUrl: string;
  label: string;
  useSoftBlur: boolean;
}

export function resolvePartyRoomBackground(params: {
  backgroundType?: PartyBackgroundType | string | null;
  backgroundId?: string | null;
  backgroundImage?: string | null;
  hostAvatar?: string | null;
}): ResolvedPartyBackground {
  const type = normalizePartyBackgroundType(params.backgroundType);
  const preset = getPartyBackgroundPreset(params.backgroundId);

  if (type === 'host_dp') {
    const dpUrl = resolvePartyBackgroundImageUrl(params.hostAvatar || params.backgroundImage);
    return {
      type: 'host_dp',
      preset,
      imageUrl: dpUrl,
      label: 'Host DP',
      useSoftBlur: true,
    };
  }

  if (type === 'custom') {
    const customUrl = resolvePartyBackgroundImageUrl(params.backgroundImage);
    if (customUrl) {
      return {
        type: 'custom',
        preset,
        imageUrl: customUrl,
        label: 'Gallery Photo',
        useSoftBlur: false,
      };
    }
  }

  return {
    type: 'preset',
    preset,
    imageUrl: preset.imageUrl || '',
    label: preset.name,
    useSoftBlur: false,
  };
}

export function extractRoomBackgroundConfig(room?: Partial<PartyRoom> | null): {
  backgroundType: PartyBackgroundType;
  backgroundId: string;
  backgroundImage: string;
} {
  return {
    backgroundType: normalizePartyBackgroundType(room?.backgroundType),
    backgroundId:
      typeof room?.backgroundId === 'string' && room.backgroundId.trim()
        ? room.backgroundId.trim()
        : DEFAULT_PARTY_BACKGROUND_ID,
    backgroundImage: typeof room?.backgroundImage === 'string' ? room.backgroundImage : '',
  };
}
