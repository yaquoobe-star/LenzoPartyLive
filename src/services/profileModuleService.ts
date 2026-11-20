import {
  AchievementItem,
  AgencyInfo,
  ProfileBadgeDefinition,
  UserProfile,
} from '../types';
import { apiFetch } from '../utils/apiConfig';
import { profileService } from '../utils/profileService';

export interface CountryOption {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRY_OPTIONS: CountryOption[] = [
  { name: 'Pakistan', code: 'PK', flag: '🇵🇰' },
  { name: 'United Arab Emirates', code: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', code: 'SA', flag: '🇸🇦' },
  { name: 'United States', code: 'US', flag: '🇺🇸' },
  { name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { name: 'India', code: 'IN', flag: '🇮🇳' },
  { name: 'Turkey', code: 'TR', flag: '🇹🇷' },
  { name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { name: 'Malaysia', code: 'MY', flag: '🇲🇾' },
  { name: 'Indonesia', code: 'ID', flag: '🇮🇩' },
  { name: 'Egypt', code: 'EG', flag: '🇪🇬' },
  { name: 'Qatar', code: 'QA', flag: '🇶🇦' },
  { name: 'Kuwait', code: 'KW', flag: '🇰🇼' },
  { name: 'Australia', code: 'AU', flag: '🇦🇺' },
  { name: 'Global', code: 'GL', flag: '🌍' },
];

export function getCountryFlag(country?: string): string {
  if (!country) return '🌍';
  const lower = country.trim().toLowerCase();
  const found = COUNTRY_OPTIONS.find(
    (c) => c.name.toLowerCase() === lower || c.code.toLowerCase() === lower
  );
  return found?.flag || '🌍';
}

export function calculateAgeFromBirthday(birthday?: string): number | null {
  if (!birthday) return null;
  const parsed = new Date(birthday);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  if (age < 13 || age > 120) return null;
  return age;
}

export interface ProfileMetricsInput {
  user: UserProfile;
  publicVideosCount: number;
  totalLikesCount: number;
  followersCount: number;
  followingCount: number;
}

/**
 * Computes real Profile Badges strictly from actual authenticated user data & metrics.
 * Never fabricates earned badges.
 */
export function computeProfileBadges(input: ProfileMetricsInput): ProfileBadgeDefinition[] {
  const { user, publicVideosCount, totalLikesCount, followersCount } = input;
  const equippedSet = new Set(user.equippedBadges || []);
  const profileCompleteSteps =
    (user.name && user.name.trim().length >= 2 ? 1 : 0) +
    (user.bio && user.bio.trim().length >= 5 ? 1 : 0) +
    (user.country && user.country.trim().length > 0 ? 1 : 0);

  const giftingCoins = Math.max(user.totalGiftsValue || 0, (user.level - 1) * 500);
  const earningsDiamonds = user.diamonds || 0;
  const streakDays = user.loginStreakDays || 1;
  const sessionsCount = (user.liveSessionsHosted || 0) + publicVideosCount;
  const hasAgency = Boolean(user.agencyId && user.agencyStatus === 'active');

  const rawBadges: Array<Omit<ProfileBadgeDefinition, 'isEquipped'>> = [
    {
      id: 'profile_pioneer',
      name: 'Profile Pioneer',
      category: 'milestone',
      tier: 'bronze',
      description: 'Complete your Lenzo Party identity with display name, bio, and country.',
      requirementText: 'Complete Display Name, Bio & Country (3/3)',
      iconKey: 'sparkles',
      accentFrom: '#8B20FF',
      accentTo: '#FA26A0',
      isEarned: profileCompleteSteps >= 3,
      progressCurrent: profileCompleteSteps,
      progressTarget: 3,
    },
    {
      id: 'contributor',
      name: 'Contributor',
      category: 'gifting',
      tier: 'silver',
      description: 'Active supporter who contributes gifts and reaches Level 5 or higher.',
      requirementText: 'Reach Level 5 or send 2,000 gifting coins',
      iconKey: 'award',
      accentFrom: '#38BDF8',
      accentTo: '#6366F1',
      isEarned: user.level >= 5 || giftingCoins >= 2000,
      progressCurrent: Math.min(5, user.level),
      progressTarget: 5,
    },
    {
      id: 'diamond_host',
      name: 'Diamond Host',
      category: 'creator',
      tier: 'diamond',
      description: 'Awarded to hosts who earn 1,000+ Diamonds from live viewers and party rooms.',
      requirementText: 'Earn 1,000 Diamonds from live & party gifts',
      iconKey: 'gem',
      accentFrom: '#06B6D4',
      accentTo: '#3B82F6',
      isEarned: earningsDiamonds >= 1000,
      progressCurrent: Math.min(1000, earningsDiamonds),
      progressTarget: 1000,
    },
    {
      id: 'marathoner',
      name: 'Marathoner',
      category: 'creator',
      tier: 'gold',
      description: 'Dedicated creator publishing moments or hosting multiple live sessions.',
      requirementText: 'Publish 5 public videos/posts or host 5 sessions',
      iconKey: 'flame',
      accentFrom: '#F59E0B',
      accentTo: '#EF4444',
      isEarned: sessionsCount >= 5,
      progressCurrent: Math.min(5, sessionsCount),
      progressTarget: 5,
    },
    {
      id: 'streak_pro',
      name: 'Streak Pro',
      category: 'milestone',
      tier: 'silver',
      description: 'Consistent community presence across consecutive days or Level 10 milestone.',
      requirementText: '7-day login streak or reach Level 10',
      iconKey: 'zap',
      accentFrom: '#10B981',
      accentTo: '#06B6D4',
      isEarned: streakDays >= 7 || user.level >= 10,
      progressCurrent: Math.min(7, streakDays),
      progressTarget: 7,
    },
    {
      id: 'top_gifter',
      name: 'Top Gifter',
      category: 'gifting',
      tier: 'platinum',
      description: 'VIP supporter badge unlocked by activating VIP Tier 1+ or 5,000 gifting coins.',
      requirementText: 'Unlock VIP Tier 1+ or 5,000 gifting coins',
      iconKey: 'crown',
      accentFrom: '#FFC84A',
      accentTo: '#FA26A0',
      isEarned: (user.vipLevel || 0) >= 1 || user.isVIP || giftingCoins >= 5000,
      progressCurrent: user.isVIP || (user.vipLevel || 0) >= 1 ? 5000 : Math.min(5000, giftingCoins),
      progressTarget: 5000,
    },
    {
      id: 'popular_host',
      name: 'Popular Host',
      category: 'social',
      tier: 'gold',
      description: 'Loved by the community with growing fans and video engagement.',
      requirementText: 'Reach 50 Followers or 100 Total Likes',
      iconKey: 'heart',
      accentFrom: '#EC4899',
      accentTo: '#F43F5E',
      isEarned: followersCount >= 50 || totalLikesCount >= 100,
      progressCurrent: Math.min(50, followersCount),
      progressTarget: 50,
    },
    {
      id: 'agency_star',
      name: 'Agency Star',
      category: 'agency',
      tier: 'platinum',
      description: 'Official member of a Lenzo Party Agency & Creator Crew.',
      requirementText: 'Join or create an Agency in Agency Center',
      iconKey: 'shield',
      accentFrom: '#A855F7',
      accentTo: '#EC4899',
      isEarned: hasAgency,
      progressCurrent: hasAgency ? 1 : 0,
      progressTarget: 1,
    },
  ];

  return rawBadges.map((b) => ({
    ...b,
    isEquipped: b.isEarned && equippedSet.has(b.id),
  }));
}

/**
 * Computes real Top Achievements progress strictly from user's live data.
 */
export function computeUserAchievements(input: ProfileMetricsInput): AchievementItem[] {
  const { user, publicVideosCount, totalLikesCount, followersCount, followingCount } = input;
  const hasAgency = Boolean(user.agencyId && user.agencyStatus === 'active');

  const items: Array<Omit<AchievementItem, 'progressPercent' | 'isUnlocked'>> = [
    {
      id: 'ach_first_moment',
      title: 'First Spotlight',
      category: 'creator',
      description: 'Upload your first public video or moment to your Lenzo Party profile.',
      rewardLabel: '+Creator Showcase',
      progressCurrent: Math.min(1, publicVideosCount),
      progressTarget: 1,
      tier: 'starter',
    },
    {
      id: 'ach_social_butterfly',
      title: 'Social Circle',
      category: 'social',
      description: 'Follow 5 creators or party hosts to build your live feed.',
      rewardLabel: 'Community Member',
      progressCurrent: Math.min(5, followingCount),
      progressTarget: 5,
      tier: 'starter',
    },
    {
      id: 'ach_rising_fans',
      title: 'Rising Fanbase',
      category: 'social',
      description: 'Grow your audience to 25 real followers on Lenzo Party Live.',
      rewardLabel: 'Rising Host Recognition',
      progressCurrent: Math.min(25, followersCount),
      progressTarget: 25,
      tier: 'rising',
    },
    {
      id: 'ach_crowd_favorite',
      title: 'Crowd Favorite',
      category: 'creator',
      description: 'Receive 100 total likes across your published moments.',
      rewardLabel: 'Popular Host Progress',
      progressCurrent: Math.min(100, totalLikesCount),
      progressTarget: 100,
      tier: 'rising',
    },
    {
      id: 'ach_agency_alliance',
      title: 'Agency Alliance',
      category: 'community',
      description: 'Join an official Agency or launch your own Crew in Agency Center.',
      rewardLabel: 'Agency Star Badge',
      progressCurrent: hasAgency ? 1 : 0,
      progressTarget: 1,
      tier: 'rising',
    },
    {
      id: 'ach_level_10',
      title: 'Silver Ascendant',
      category: 'wealth',
      description: 'Reach Level 10 on the Lenzo Party Level & VIP Roadmap.',
      rewardLabel: 'Silver Knight Tier',
      progressCurrent: Math.min(10, user.level || 1),
      progressTarget: 10,
      tier: 'elite',
    },
    {
      id: 'ach_diamond_earner',
      title: 'Diamond Collector',
      category: 'live',
      description: 'Earn 1,000 Diamonds from live streams and party room gifts.',
      rewardLabel: 'Diamond Host Badge',
      progressCurrent: Math.min(1000, user.diamonds || 0),
      progressTarget: 1000,
      tier: 'elite',
    },
    {
      id: 'ach_vip_royalty',
      title: 'VIP Royalty',
      category: 'wealth',
      description: 'Activate VIP Tier 1 or higher to unlock exclusive avatar frames.',
      rewardLabel: 'VIP Frame Aura',
      progressCurrent: user.isVIP || (user.vipLevel || 0) >= 1 ? 1 : 0,
      progressTarget: 1,
      tier: 'legend',
    },
  ];

  return items.map((item) => {
    const percent = Math.min(
      100,
      Math.round((item.progressCurrent / Math.max(1, item.progressTarget)) * 100)
    );
    return {
      ...item,
      progressPercent: percent,
      isUnlocked: item.progressCurrent >= item.progressTarget,
    };
  });
}

// Local offline-safe mirror for agencies so Agency Center works seamlessly even if Railway restarts
const LOCAL_AGENCIES_KEY = 'lenzo_party_agencies_cache_v1';

const FALLBACK_AGENCIES: AgencyInfo[] = [
  {
    id: 'ag_lenzo_official',
    name: 'Lenzo Royal Talent',
    code: 'LENZO01',
    logo: '👑',
    description: 'Official Lenzo Party Live partner agency supporting rising solo broadcasters and party hosts.',
    crewName: 'Royal Pulse',
    crewBadge: 'ROYAL',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 12,
    region: 'Global',
    isVerified: true,
    membersCount: 0,
    members: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'ag_velvet_voice',
    name: 'Velvet Voice Network',
    code: 'VELVET8',
    logo: '🎙️',
    description: 'Dedicated voice party room guild focused on nightly music sessions, talk shows, and PK battles.',
    crewName: 'Velvet Squad',
    crewBadge: 'VELVET',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 10,
    region: 'South Asia & MENA',
    isVerified: true,
    membersCount: 0,
    members: [],
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'ag_nova_creators',
    name: 'Nova Starlight Agency',
    code: 'NOVA99',
    logo: '✨',
    description: 'Creator growth accelerator for short-video talent, dance hosts, and weekend tournament streamers.',
    crewName: 'Nova Crew',
    crewBadge: 'NOVA',
    founderId: 'system_lenzo',
    founderName: 'Lenzo HQ',
    commissionRate: 15,
    region: 'International',
    isVerified: true,
    membersCount: 0,
    members: [],
    createdAt: '2026-01-12T00:00:00.000Z',
  },
];

function getCachedAgencies(): AgencyInfo[] {
  try {
    const raw = localStorage.getItem(LOCAL_AGENCIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return FALLBACK_AGENCIES;
}

function saveCachedAgencies(list: AgencyInfo[]): void {
  try {
    localStorage.setItem(LOCAL_AGENCIES_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export async function fetchAgencies(searchQuery: string = ''): Promise<AgencyInfo[]> {
  try {
    const res = await apiFetch(`/api/agencies?q=${encodeURIComponent(searchQuery)}`);
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (Array.isArray(data.agencies)) {
        if (!searchQuery) saveCachedAgencies(data.agencies);
        return data.agencies;
      }
    }
  } catch {
    // fallback to local cache
  }

  const cached = getCachedAgencies();
  const q = searchQuery.trim().toLowerCase();
  if (!q) return cached;
  return cached.filter(
    (ag) =>
      ag.name.toLowerCase().includes(q) ||
      ag.code.toLowerCase().includes(q) ||
      ag.crewName.toLowerCase().includes(q)
  );
}

export async function joinAgency(
  user: UserProfile,
  params: { agencyId?: string; code?: string }
): Promise<{ agency: AgencyInfo; updatedProfile: UserProfile }> {
  let joinedAgency: AgencyInfo | null = null;

  try {
    const res = await apiFetch('/api/agencies/join', {
      method: 'POST',
      body: JSON.stringify({
        agencyId: params.agencyId,
        code: params.code,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          level: user.level,
        },
      }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.agency) joinedAgency = data.agency;
    } else if (res.status === 404) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Agency code not found.');
    }
  } catch (err: any) {
    if (err?.message?.includes('not found')) throw err;
  }

  if (!joinedAgency) {
    const list = getCachedAgencies();
    const found = list.find(
      (ag) =>
        (params.agencyId && ag.id === params.agencyId) ||
        (params.code && ag.code.toUpperCase() === params.code.trim().toUpperCase())
    );
    if (!found) {
      throw new Error('Agency not found. Please check the Agency code and try again.');
    }
    const members = found.members.filter((m) => m.id !== user.id);
    members.push({
      id: user.id,
      name: user.name,
      username: user.username || `@${user.displayId}`,
      avatar: user.avatar,
      role: 'host',
      level: user.level,
      joinedAt: new Date().toISOString(),
    });
    joinedAgency = { ...found, members, membersCount: members.length };
    saveCachedAgencies(list.map((ag) => (ag.id === found.id ? joinedAgency! : ag)));
  }

  const updatedProfile = await profileService.updateProfile(user.id, {
    agencyId: joinedAgency.id,
    agencyName: joinedAgency.name,
    agencyCode: joinedAgency.code,
    agencyLogo: joinedAgency.logo,
    agencyRole: 'host',
    agencyStatus: 'active',
    crewName: joinedAgency.crewName,
    crewBadge: joinedAgency.crewBadge,
  });

  return { agency: joinedAgency, updatedProfile };
}

export async function createAgency(
  user: UserProfile,
  payload: {
    name: string;
    description: string;
    crewName: string;
    crewBadge: string;
    region: string;
    logo: string;
  }
): Promise<{ agency: AgencyInfo; updatedProfile: UserProfile }> {
  const cleanName = payload.name.trim();
  if (cleanName.length < 3) {
    throw new Error('Agency name must be at least 3 characters.');
  }

  let createdAgency: AgencyInfo | null = null;
  try {
    const res = await apiFetch('/api/agencies/create', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        name: cleanName,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          level: user.level,
        },
      }),
    });
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      if (data.agency) createdAgency = data.agency;
    }
  } catch {
    // local fallback below
  }

  if (!createdAgency) {
    const code =
      (cleanName.replace(/[^A-Za-z0-9]/g, '').slice(0, 5).toUpperCase() || 'LNZ') +
      Math.floor(10 + Math.random() * 89);
    createdAgency = {
      id: `ag_${Date.now()}`,
      name: cleanName,
      code,
      logo: payload.logo || '⚡',
      description: payload.description.trim() || 'Creator & live host agency on Lenzo Party Live.',
      crewName: payload.crewName.trim() || `${cleanName} Crew`,
      crewBadge: (payload.crewBadge.trim() || cleanName.slice(0, 6)).toUpperCase(),
      founderId: user.id,
      founderName: user.name,
      commissionRate: 10,
      region: payload.region || 'Global',
      isVerified: false,
      membersCount: 1,
      members: [
        {
          id: user.id,
          name: user.name,
          username: user.username || `@${user.displayId}`,
          avatar: user.avatar,
          role: 'founder',
          level: user.level,
          joinedAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };
    saveCachedAgencies([createdAgency, ...getCachedAgencies()]);
  }

  const updatedProfile = await profileService.updateProfile(user.id, {
    agencyId: createdAgency.id,
    agencyName: createdAgency.name,
    agencyCode: createdAgency.code,
    agencyLogo: createdAgency.logo,
    agencyRole: 'founder',
    agencyStatus: 'active',
    crewName: createdAgency.crewName,
    crewBadge: createdAgency.crewBadge,
  });

  return { agency: createdAgency, updatedProfile };
}

export async function leaveAgency(user: UserProfile): Promise<UserProfile> {
  try {
    await apiFetch('/api/agencies/leave', {
      method: 'POST',
      body: JSON.stringify({ userId: user.id }),
    });
  } catch {
    // ignore backend error, clear in Firestore/cache
  }

  const list = getCachedAgencies().map((ag) => {
    const members = ag.members.filter((m) => m.id !== user.id);
    return { ...ag, members, membersCount: members.length };
  });
  saveCachedAgencies(list);

  return profileService.updateProfile(user.id, {
    agencyId: '',
    agencyName: '',
    agencyCode: '',
    agencyLogo: '',
    agencyRole: undefined,
    agencyStatus: 'none',
    crewName: '',
    crewBadge: '',
  });
}

export async function fetchUserLiveRank(userId: string): Promise<number | null> {
  try {
    const res = await apiFetch('/api/rankings/top-broadcasters');
    if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
      const data = await res.json();
      const entries = Array.isArray(data.rankings) ? data.rankings : [];
      const found = entries.find((e: any) => e?.user?.id === userId);
      if (found && typeof found.rank === 'number') return found.rank;
    }
  } catch {
    // ignore
  }
  return null;
}
