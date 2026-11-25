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
    title: '5 Seats',
    shortLabel: '5 Seats',
    description: 'All 5 party seats open by default',
  },
  {
    tierNumber: 2,
    tierLabel: 'Level 2',
    maxSeats: 8,
    minLevel: 10,
    title: '8 Seats',
    shortLabel: '8 Seats',
    description: '5 upper seats + 3 lower seats (unlocks at Lv.10)',
  },
  {
    tierNumber: 3,
    tierLabel: 'Level 3',
    maxSeats: 16,
    minLevel: 20,
    title: '16 Seats',
    shortLabel: '16 Seats',
    description: 'Full 16-seat party stage (unlocks at Lv.20)',
  },
];

export function sanitizeUserLevel(rawLevel?: number | null): number {
  if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel)) return 0;
  return Math.max(0, Math.floor(rawLevel));
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
  const isCoHostSeatUnlocked = true;
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
 * Normalizes a party room's seat count.
 * Whenever `hostLevel` is provided, strictly clamps `maxSeats` to the host's unlocked tier:
 * - Lv.0–9  => max 5 seats (all 5 seats open by default)
 * - Lv.10–19 => 5 or 8 seats
 * - Lv.20+  => 5, 8, or 16 seats
 */
export function normalizePartyMaxSeats(raw?: number | null, hostLevel?: number | null): PartySeatCount {
  if (typeof hostLevel === 'number' && Number.isFinite(hostLevel)) {
    return clampPartyMaxSeatsForHostLevel(raw, hostLevel);
  }
  const num = Number(raw);
  if (num === 16) return 16;
  if (num === 8) return 8;
  if (num === 5 || num === 4) return 5;
  return 5;
}

/**
 * Seat #2 (index 1, directly beside the Host) is unlocked by default for all host levels.
 */
export function isSeatLockedByHostLevel(_seatIndex: number, _rawHostLevel?: number | null): boolean {
  return false;
}

/**
 * Checks whether a seat index is within the host's unlocked seat tier AND not level-locked.
 */
export function isSeatIndexAllowedForRoom(
  seatIndex: number,
  maxSeats: number | undefined | null,
  rawHostLevel?: number | null
): boolean {
  if (typeof seatIndex !== 'number' || !Number.isInteger(seatIndex) || seatIndex < 0) {
    return false;
  }
  const safeMax = clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel);
  if (seatIndex >= safeMax) return false;
  if (isSeatLockedByHostLevel(seatIndex, rawHostLevel)) return false;
  return true;
}

/**
 * Deduplicates a seat array so every user ID occupies AT MOST ONE seat
 * and every seat slot holds AT MOST ONE user (or null).
 * When a user appears in multiple slots, keeps the preferred slot (earliest by default,
 * or latest when `preferLatest` is true) and clears duplicates.
 */
export function deduplicatePartySeats<T extends { id?: string } | null | undefined>(
  rawSeats: T[] | undefined | null,
  targetLength?: number,
  preferLatest = false
): (Exclude<T, undefined> | null)[] {
  const arr = Array.isArray(rawSeats) ? rawSeats : [];
  const len = typeof targetLength === 'number' && targetLength > 0 ? targetLength : arr.length;
  const next: (Exclude<T, undefined> | null)[] = Array(len).fill(null);
  const seenIds = new Set<string>();

  if (preferLatest) {
    for (let i = Math.min(len, arr.length) - 1; i >= 0; i--) {
      const seat = arr[i];
      if (!seat) continue;
      const uid = typeof seat === 'object' && seat && 'id' in seat ? String((seat as any).id || '').trim() : '';
      if (uid) {
        if (seenIds.has(uid)) continue;
        seenIds.add(uid);
      }
      next[i] = seat as Exclude<T, undefined>;
    }
  } else {
    for (let i = 0; i < Math.min(len, arr.length); i++) {
      const seat = arr[i];
      if (!seat) continue;
      const uid = typeof seat === 'object' && seat && 'id' in seat ? String((seat as any).id || '').trim() : '';
      if (uid) {
        if (seenIds.has(uid)) continue;
        seenIds.add(uid);
      }
      next[i] = seat as Exclude<T, undefined>;
    }
  }

  return next;
}

/**
 * Sanitizes a room's seat array so its length matches the host's clamped `maxSeats`,
 * every user appears in at most one seat, and locked seats remain empty.
 */
export function sanitizePartySeatsForHostLevel<T>(
  rawSeats: (T | null | undefined)[] | undefined | null,
  maxSeats: number | undefined | null,
  rawHostLevel?: number | null
): (T | null)[] {
  const safeMax = clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel);
  const next: (T | null)[] = Array(safeMax).fill(null);
  const seenIds = new Set<string>();
  if (Array.isArray(rawSeats)) {
    for (let i = 0; i < Math.min(safeMax, rawSeats.length); i++) {
      const occupant = rawSeats[i];
      if (occupant && !isSeatLockedByHostLevel(i, rawHostLevel)) {
        const uid =
          typeof occupant === 'object' && occupant && 'id' in (occupant as any)
            ? String((occupant as any).id || '').trim()
            : '';
        if (uid) {
          if (seenIds.has(uid)) continue;
          seenIds.add(uid);
        }
        next[i] = occupant as T;
      }
    }
  }
  return next;
}

/**
 * Counts currently occupied valid (non-level-locked, in-bounds) seats.
 */
export function countActiveOccupiedSeats(
  rawSeats: (unknown | null | undefined)[] | undefined | null,
  maxSeats: number | undefined | null,
  rawHostLevel?: number | null
): number {
  const safeMax = clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel);
  if (!Array.isArray(rawSeats)) return 0;
  let count = 0;
  const seenIds = new Set<string>();
  for (let i = 0; i < Math.min(safeMax, rawSeats.length); i++) {
    const occupant = rawSeats[i];
    if (occupant && !isSeatLockedByHostLevel(i, rawHostLevel)) {
      const uid =
        typeof occupant === 'object' && occupant && 'id' in (occupant as any)
          ? String((occupant as any).id || '').trim()
          : '';
      if (uid) {
        if (seenIds.has(uid)) continue;
        seenIds.add(uid);
      }
      count++;
    }
  }
  return count;
}

/**
 * Returns the number of usable (non-level-locked) seats in the room.
 * All 5 base seats (including Seat #2) are available by default for all host levels.
 */
export function getActiveSeatCapacity(maxSeats: number, rawHostLevel?: number | null): number {
  const hostLevel = sanitizeUserLevel(rawHostLevel);
  return clampPartyMaxSeatsForHostLevel(maxSeats, hostLevel);
}

/**
 * Enforces seat-tier clamping, deduplication, and locked-seat stripping on any PartyRoom object.
 */
export function enforcePartyRoomSeatPolicy<
  T extends {
    maxSeats?: number;
    host?: { level?: number };
    seats?: (any | null)[];
  }
>(room: T): T {
  const hostLevel = sanitizeUserLevel(room?.host?.level);
  const storedValidMax =
    typeof room?.maxSeats === 'number' && [5, 8, 16].includes(room.maxSeats)
      ? (room.maxSeats as PartySeatCount)
      : clampPartyMaxSeatsForHostLevel(room?.maxSeats, hostLevel);
  const rawSeats = Array.isArray(room?.seats) ? room.seats : undefined;
  const safeMaxSeats = Math.max(storedValidMax, rawSeats ? rawSeats.length : 0);
  const safeSeats = rawSeats
    ? deduplicatePartySeats(rawSeats, safeMaxSeats)
    : undefined;
  return {
    ...room,
    maxSeats: safeMaxSeats,
    ...(safeSeats !== undefined ? { seats: safeSeats } : {}),
  };
}
