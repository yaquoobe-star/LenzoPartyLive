export type PartySeatCount = 5 | 8 | 16;

export interface PartySeatTierInfo {
  tierNumber: 1 | 2 | 3;
  tierLabel: string;
  maxSeats: PartySeatCount;
  minLevel: number;
  title: string;
  shortLabel: string;
  description: string;
}

export const PARTY_SEAT_TIERS: PartySeatTierInfo[] = [
  {
    tierNumber: 1,
    tierLabel: 'Level 1',
    maxSeats: 5,
    minLevel: 0,
    title: '4 / 5 Seats',
    shortLabel: '5 Seats',
    description: 'Host + side co-host (unlocks Lv.5) + 3 guest seats',
  },
  {
    tierNumber: 2,
    tierLabel: 'Level 2',
    maxSeats: 8,
    minLevel: 10,
    title: '8 Seats',
    shortLabel: '8 Seats',
    description: '5 upper seats + 3 lower seats (unlocks Lv.10)',
  },
  {
    tierNumber: 3,
    tierLabel: 'Level 3',
    maxSeats: 16,
    minLevel: 20,
    title: '16 Seats',
    shortLabel: '16 Seats',
    description: 'Full 16-seat party stage (unlocks Lv.20)',
  },
];

export function sanitizeUserLevel(rawLevel?: number | null): number {
  if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel)) return 0;
  return Math.max(0, Math.floor(rawLevel));
}

export function normalizePartyMaxSeats(raw?: number | null, hostLevel?: number): PartySeatCount {
  const num = Number(raw);
  if (num === 16) return 16;
  if (num === 5 || num === 4) return 5;
  if (num === 8) return 8;
  if (typeof hostLevel === 'number') {
    return getAllowedSeatTierForLevel(hostLevel).maxUnlockedSeats;
  }
  return 5;
}

export function getAllowedSeatTierForLevel(rawHostLevel?: number | null): {
  hostLevel: number;
  maxUnlockedSeats: PartySeatCount;
  isCoHostSeatUnlocked: boolean;
  canSelect8Seats: boolean;
  canSelect16Seats: boolean;
  unlockedOptions: PartySeatCount[];
} {
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  const isCoHostSeatUnlocked = hostLevel >= 5;
  const canSelect8Seats = hostLevel >= 10;
  const canSelect16Seats = hostLevel >= 20;

  const unlockedOptions: PartySeatCount[] = [5];
  if (canSelect8Seats) unlockedOptions.push(8);
  if (canSelect16Seats) unlockedOptions.push(16);

  const maxUnlockedSeats: PartySeatCount = canSelect16Seats ? 16 : canSelect8Seats ? 8 : 5;

  return {
    hostLevel,
    maxUnlockedSeats,
    isCoHostSeatUnlocked,
    canSelect8Seats,
    canSelect16Seats,
    unlockedOptions,
  };
}

export function isSeatModeUnlockedForLevel(seats: PartySeatCount, rawHostLevel?: number | null): boolean {
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  if (seats === 16) return hostLevel >= 20;
  if (seats === 8) return hostLevel >= 10;
  return true;
}

export function clampPartyMaxSeatsForHostLevel(
  requestedSeats: number | undefined | null,
  rawHostLevel?: number | null
): PartySeatCount {
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  const num = Number(requestedSeats);
  if (num === 16 && hostLevel >= 20) return 16;
  if (num === 8 && hostLevel >= 10) return 8;
  if (num === 5 || num === 4) return 5;
  return getAllowedSeatTierForLevel(hostLevel).maxUnlockedSeats;
}

/**
 * Seat #2 (index 1, right next to the Host) is locked for Hosts below Level 5.
 * Unlocks automatically when Host reaches Level 5+.
 */
export function isSeatLockedByHostLevel(seatIndex: number, rawHostLevel?: number | null): boolean {
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  return seatIndex === 1 && hostLevel < 5;
}

/**
 * Returns the number of usable (non-level-locked) seats in the room.
 * For Level 0–4 hosts in a 5-slot room, Seat 1 is locked, leaving 4 active seats (Host + 3 guests).
 */
export function getActiveSeatCapacity(maxSeats: number, rawHostLevel?: number | null): number {
  const normalized = normalizePartyMaxSeats(maxSeats, rawHostLevel ?? undefined);
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  if (normalized === 5 && hostLevel < 5) {
    return 4;
  }
  return normalized;
}
