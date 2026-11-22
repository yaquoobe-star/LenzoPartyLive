// src/utils/partySeatRules.ts
var PARTY_SEAT_TIERS = [
	{
		tierNumber: 1,
		tierLabel: "Level 1",
		maxSeats: 5,
		minLevel: 0,
		title: "5 Seats",
		shortLabel: "5 Seats",
		description: "Lv.0–4: 4 open + Seat #2 locked (unlocks at Lv.5)"
	},
	{
		tierNumber: 2,
		tierLabel: "Level 2",
		maxSeats: 8,
		minLevel: 10,
		title: "8 Seats",
		shortLabel: "8 Seats",
		description: "5 upper seats + 3 lower seats (unlocks at Lv.10)"
	},
	{
		tierNumber: 3,
		tierLabel: "Level 3",
		maxSeats: 16,
		minLevel: 20,
		title: "16 Seats",
		shortLabel: "16 Seats",
		description: "Full 16-seat party stage (unlocks at Lv.20)"
	}
];
function sanitizeUserLevel(rawLevel) {
	if (typeof rawLevel !== "number" || !Number.isFinite(rawLevel)) return 0;
	return Math.max(0, Math.floor(rawLevel));
}
function getAllowedSeatTierForLevel(rawHostLevel) {
	const hostLevel = sanitizeUserLevel(rawHostLevel);
	const isCoHostSeatUnlocked = hostLevel >= 5;
	const canSelect8Seats = hostLevel >= 10;
	const canSelect16Seats = hostLevel >= 20;
	const unlockedOptions = [5];
	if (canSelect8Seats) unlockedOptions.push(8);
	if (canSelect16Seats) unlockedOptions.push(16);
	return {
		hostLevel,
		maxUnlockedSeats: canSelect16Seats ? 16 : canSelect8Seats ? 8 : 5,
		isCoHostSeatUnlocked,
		canSelect8Seats,
		canSelect16Seats,
		unlockedOptions
	};
}
function isSeatModeUnlockedForLevel(seats, rawHostLevel) {
	const hostLevel = sanitizeUserLevel(rawHostLevel);
	if (seats === 16) return hostLevel >= 20;
	if (seats === 8) return hostLevel >= 10;
	return true;
}
function clampPartyMaxSeatsForHostLevel(requestedSeats, rawHostLevel) {
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
* - Lv.0–9  => max 5 seats (Seat #2 locked until Lv.5)
* - Lv.10–19 => 5 or 8 seats
* - Lv.20+  => 5, 8, or 16 seats
*/
function normalizePartyMaxSeats(raw, hostLevel) {
	if (typeof hostLevel === "number" && Number.isFinite(hostLevel)) return clampPartyMaxSeatsForHostLevel(raw, hostLevel);
	const num = Number(raw);
	if (num === 16) return 16;
	if (num === 8) return 8;
	if (num === 5 || num === 4) return 5;
	return 5;
}
/**
* Seat #2 (index 1, directly beside the Host) is locked for Hosts below Level 5.
* Unlocks automatically when Host reaches Level 5+.
*/
function isSeatLockedByHostLevel(seatIndex, rawHostLevel) {
	const hostLevel = sanitizeUserLevel(rawHostLevel);
	return seatIndex === 1 && hostLevel < 5;
}
/**
* Checks whether a seat index is within the host's unlocked seat tier AND not level-locked.
*/
function isSeatIndexAllowedForRoom(seatIndex, maxSeats, rawHostLevel) {
	if (typeof seatIndex !== "number" || !Number.isInteger(seatIndex) || seatIndex < 0) return false;
	if (seatIndex >= clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel)) return false;
	if (isSeatLockedByHostLevel(seatIndex, rawHostLevel)) return false;
	return true;
}
/**
* Sanitizes a room's seat array so its length matches the host's clamped `maxSeats`
* and Seat #2 (index 1) is always empty when Host Level < 5.
*/
function sanitizePartySeatsForHostLevel(rawSeats, maxSeats, rawHostLevel) {
	const safeMax = clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel);
	const next = Array(safeMax).fill(null);
	if (Array.isArray(rawSeats)) {
		for (let i = 0; i < Math.min(safeMax, rawSeats.length); i++) if (rawSeats[i] && !isSeatLockedByHostLevel(i, rawHostLevel)) next[i] = rawSeats[i];
	}
	return next;
}
/**
* Counts currently occupied valid (non-level-locked, in-bounds) seats.
*/
function countActiveOccupiedSeats(rawSeats, maxSeats, rawHostLevel) {
	const safeMax = clampPartyMaxSeatsForHostLevel(maxSeats, rawHostLevel);
	if (!Array.isArray(rawSeats)) return 0;
	let count = 0;
	for (let i = 0; i < Math.min(safeMax, rawSeats.length); i++) if (rawSeats[i] && !isSeatLockedByHostLevel(i, rawHostLevel)) count++;
	return count;
}
/**
* Returns the number of usable (non-level-locked) seats in the room.
* For Level 0–4 hosts in a 5-slot room, Seat #2 (index 1) is locked, leaving 4 active seats (Host + 3 guests).
*/
function getActiveSeatCapacity(maxSeats, rawHostLevel) {
	const hostLevel = sanitizeUserLevel(rawHostLevel);
	const clamped = clampPartyMaxSeatsForHostLevel(maxSeats, hostLevel);
	if (clamped === 5 && hostLevel < 5) return 4;
	return clamped;
}
/**
* Enforces seat-tier clamping and locked-seat stripping on any PartyRoom object.
*/
function enforcePartyRoomSeatPolicy(room) {
	const hostLevel = sanitizeUserLevel(room?.host?.level);
	const safeMaxSeats = clampPartyMaxSeatsForHostLevel(room?.maxSeats, hostLevel);
	const safeSeats = Array.isArray(room?.seats) ? sanitizePartySeatsForHostLevel(room.seats, safeMaxSeats, hostLevel) : room?.seats;
	return {
		...room,
		maxSeats: safeMaxSeats,
		...safeSeats !== void 0 ? { seats: safeSeats } : {}
	};
}
export { getActiveSeatCapacity as a, isSeatLockedByHostLevel as c, sanitizePartySeatsForHostLevel as d, sanitizeUserLevel as f, enforcePartyRoomSeatPolicy as i, isSeatModeUnlockedForLevel as l, clampPartyMaxSeatsForHostLevel as n, getAllowedSeatTierForLevel as o, countActiveOccupiedSeats as r, isSeatIndexAllowedForRoom as s, PARTY_SEAT_TIERS as t, normalizePartyMaxSeats as u };
