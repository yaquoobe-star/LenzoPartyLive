export type RoomLifecycleStatus = 'active' | 'empty' | 'closed';

/**
 * Default duration (5 minutes) an empty Party Room or Solo Live Room
 * stays visible before the backend automatically closes it.
 */
export const EMPTY_ROOM_CLEANUP_MS = 5 * 60 * 1000;

/**
 * Default grace period (30 seconds) before an unexpectedly disconnected
 * WebSocket participant is marked as LEFT and removed from their seat.
 */
export const DISCONNECT_GRACE_MS = 30 * 1000;

/**
 * Default heartbeat stale threshold (45 seconds) for participants with no
 * open WebSocket connection.
 */
export const HEARTBEAT_STALE_MS = 45 * 1000;

/**
 * Duration (15 minutes) to remember auto-closed/ended room IDs on the server
 * so late Firestore hydration or stale heartbeats cannot resurrect them.
 */
export const RECENTLY_CLOSED_TTL_MS = 15 * 60 * 1000;

/**
 * Format remaining countdown milliseconds as MM:SS (e.g. "04:59").
 */
export function formatCountdownMMSS(remainingMs: number): string {
  const safeSec = Math.max(0, Math.ceil(remainingMs / 1000));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
