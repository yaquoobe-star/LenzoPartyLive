import { RoomSeatRequest, UserProfile } from '../types';

class RoomService {
  public async fetchRoomSeats(roomId: string): Promise<{ seats: (UserProfile | null)[]; pendingRequests: RoomSeatRequest[] }> {
    try {
      const res = await fetch(`/api/rooms/${roomId}/seats`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch room seats from backend:', e);
    }
    return { seats: Array(8).fill(null), pendingRequests: [] };
  }

  public async requestSeat(roomId: string, user: UserProfile, requestedSeatIndex: number, roomHostId: string): Promise<RoomSeatRequest> {
    const res = await fetch(`/api/rooms/${roomId}/request_seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, requestedSeatIndex, roomHostId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request seat' }));
      throw new Error(err.error || 'Failed to request seat');
    }
    const data = await res.json();
    return data.request;
  }

  public async cancelSeatRequest(roomId: string, userId: string): Promise<void> {
    await fetch(`/api/rooms/${roomId}/cancel_seat_request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
  }

  public async respondSeatRequest(
    roomId: string,
    hostId: string,
    applicantId: string,
    approve: boolean,
    targetSeatIndex?: number
  ): Promise<{ success: boolean; seats?: (UserProfile | null)[] }> {
    const res = await fetch(`/api/rooms/${roomId}/respond_seat_request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId, applicantId, approve, targetSeatIndex })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      throw new Error(err.error || 'Host response failed');
    }
    return await res.json();
  }

  public async removeSeat(roomId: string, hostId: string, seatIndex: number): Promise<void> {
    const res = await fetch(`/api/rooms/${roomId}/remove_seat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId, seatIndex })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Action failed' }));
      throw new Error(err.error || 'Failed to remove user from seat');
    }
  }
}

export const roomService = new RoomService();
