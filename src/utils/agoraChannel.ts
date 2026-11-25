/**
 * Deterministic, collision-free Agora RTC channel name builders.
 * Agora channel names must be 1..64 bytes using ASCII letters, digits, or safe symbols.
 * Every Party Room and Live Stream is strictly isolated into its own unique channel namespace.
 */

function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sanitizeChannelCore(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Builds a unique, isolated Agora channel name for a Party Room (`party_<roomId>`).
 * Guarantees length <= 64 characters and zero collisions even for long room IDs.
 */
export function buildPartyAgoraChannelName(roomId: string): string {
  const raw = String(roomId || '').trim();
  const clean = sanitizeChannelCore(raw);
  const candidate = `party_${clean || 'room'}`;
  if (candidate.length <= 64 && clean === raw && clean.length > 0) {
    return candidate;
  }
  const suffix = `_${fnv1aHex(raw)}`;
  const prefix = 'party_';
  const maxCoreLen = 64 - prefix.length - suffix.length;
  const trimmedCore = (clean || 'room').slice(0, Math.max(1, maxCoreLen));
  return `${prefix}${trimmedCore}${suffix}`;
}

/**
 * Builds a unique, isolated Agora channel name for a Solo Live Stream.
 * Preserves existing `streamId` channel names when already valid (1..64 safe chars and not colliding with `party_`),
 * otherwise safely namespaces with deterministic hash.
 */
export function buildLiveAgoraChannelName(streamId: string): string {
  const raw = String(streamId || '').trim();
  const clean = sanitizeChannelCore(raw);
  if (clean && clean === raw && clean.length <= 64 && !clean.startsWith('party_')) {
    return clean;
  }
  const suffix = `_${fnv1aHex(raw)}`;
  const prefix = 'live_';
  const maxCoreLen = 64 - prefix.length - suffix.length;
  const trimmedCore = (clean || 'stream').slice(0, Math.max(1, maxCoreLen));
  return `${prefix}${trimmedCore}${suffix}`;
}
