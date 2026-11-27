import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Lock,
  Mic,
  PowerOff,
  Radio,
  RefreshCw,
  Search,
  Tv,
  Users,
} from 'lucide-react';
import {
  AdminActiveLiveStream,
  AdminActivePartyRoom,
  AdminReportRecord,
  adminEndLiveStream,
  adminEndPartyRoom,
} from '../../services/superAdminService';

interface AdminLiveRoomsSectionProps {
  activeRooms: AdminActivePartyRoom[];
  activeStreams: AdminActiveLiveStream[];
  reports: AdminReportRecord[];
  onRefreshBackend: () => void;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type SessionFilter = 'all' | 'party_rooms' | 'live_streams' | 'reported';

export const AdminLiveRoomsSection: React.FC<AdminLiveRoomsSectionProps> = ({
  activeRooms,
  activeStreams,
  reports,
  onRefreshBackend,
  onNotify,
  onError,
}) => {
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [endingTarget, setEndingTarget] = useState<{
    kind: 'room' | 'stream';
    id: string;
    title: string;
  } | null>(null);
  const [endReason, setEndReason] = useState('Ended by Super Admin for policy / safety moderation.');
  const [busyId, setBusyId] = useState<string | null>(null);

  const openReportsByTarget = useMemo(() => {
    const map = new Map<string, AdminReportRecord[]>();
    for (const r of reports) {
      if (r.status === 'resolved' || r.status === 'dismissed') continue;
      if (r.targetType === 'room' || r.targetType === 'stream') {
        const list = map.get(r.targetId) || [];
        list.push(r);
        map.set(r.targetId, list);
      }
    }
    return map;
  }, [reports]);

  const filteredRooms = useMemo(() => {
    if (filter === 'live_streams') return [];
    const q = searchQuery.trim().toLowerCase();
    return activeRooms.filter((r) => {
      if (filter === 'reported' && !openReportsByTarget.has(r.id)) return false;
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.displayId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.hostName.toLowerCase().includes(q) ||
        r.hostId.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [activeRooms, filter, searchQuery, openReportsByTarget]);

  const filteredStreams = useMemo(() => {
    if (filter === 'party_rooms') return [];
    const q = searchQuery.trim().toLowerCase();
    return activeStreams.filter((s) => {
      if (filter === 'reported' && !openReportsByTarget.has(s.id)) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.title.toLowerCase().includes(q) ||
        s.hostName.toLowerCase().includes(q) ||
        s.hostId.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      );
    });
  }, [activeStreams, filter, searchQuery, openReportsByTarget]);

  const totalParticipants = useMemo(
    () =>
      activeRooms.reduce((sum, r) => sum + (r.participantsCount || 0), 0) +
      activeStreams.reduce((sum, s) => sum + (s.viewersCount || 0), 0),
    [activeRooms, activeStreams]
  );

  const handleConfirmEnd = async () => {
    if (!endingTarget) return;
    setBusyId(endingTarget.id);
    const res =
      endingTarget.kind === 'room'
        ? await adminEndPartyRoom({
            roomId: endingTarget.id,
            roomTitle: endingTarget.title,
            reason: endReason,
          })
        : await adminEndLiveStream({
            streamId: endingTarget.id,
            streamTitle: endingTarget.title,
            reason: endReason,
          });
    setBusyId(null);
    if (res.success) {
      onNotify(
        `${endingTarget.kind === 'room' ? 'Party Room' : 'Live Stream'} "${endingTarget.title}" ended immediately.`
      );
      setEndingTarget(null);
      onRefreshBackend();
    } else {
      onError(res.error || 'Failed to terminate session.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#130E24] border border-[#261E40]">
          <div className="text-[11px] text-[#988DB9]">Active Party Rooms</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
            {activeRooms.length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#130E24] border border-[#261E40]">
          <div className="text-[11px] text-[#988DB9]">Active Live Streams</div>
          <div className="text-xl font-bold text-rose-400 font-mono tabular-nums mt-1">
            {activeStreams.length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#130E24] border border-[#261E40]">
          <div className="text-[11px] text-[#988DB9]">Live Audience Total</div>
          <div className="text-xl font-bold text-emerald-400 font-mono tabular-nums mt-1">
            {totalParticipants.toLocaleString()}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#130E24] border border-[#261E40]">
          <div className="text-[11px] text-[#988DB9]">Reported Sessions</div>
          <div className="text-xl font-bold text-amber-400 font-mono tabular-nums mt-1">
            {openReportsByTarget.size}
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#8E83B0] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Room ID, title, category, or owner..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#130E24] border border-[#261E40] text-xs text-white placeholder-[#7C719D] focus:outline-none focus:border-[#FFC84A]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5">
            {(
              [
                { id: 'all', label: 'All Live' },
                { id: 'party_rooms', label: `Rooms (${activeRooms.length})` },
                { id: 'live_streams', label: `Streams (${activeStreams.length})` },
                { id: 'reported', label: `Reported (${openReportsByTarget.size})` },
              ] as Array<{ id: SessionFilter; label: string }>
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFilter(opt.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === opt.id
                    ? 'bg-[#FFC84A] text-[#0B0716]'
                    : 'text-[#A59BC4] hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefreshBackend}
            className="px-3 py-2 rounded-lg bg-[#1A1330] border border-[#2B2248] hover:border-[#FFC84A]/50 text-xs font-semibold text-white flex items-center gap-1.5 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* End Room / Stream Confirmation Banner */}
      {endingTarget && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-rose-200 flex items-center gap-2">
                <PowerOff className="w-4 h-4 text-rose-400" />
                <span>
                  Force-End {endingTarget.kind === 'room' ? 'Party Room' : 'Live Stream'}: &ldquo;
                  {endingTarget.title}&rdquo;
                </span>
              </h4>
              <p className="text-xs text-rose-200/80 mt-0.5">
                This will immediately disconnect participants, close the session on the backend server &amp; Firestore, and log the action.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              placeholder="Moderation reason..."
              className="flex-1 px-3 py-2 rounded-lg bg-[#0B0716] border border-rose-500/30 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={busyId === endingTarget.id}
                onClick={handleConfirmEnd}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white whitespace-nowrap disabled:opacity-50"
              >
                {busyId === endingTarget.id ? 'Ending...' : 'Confirm End Session'}
              </button>
              <button
                type="button"
                onClick={() => setEndingTarget(null)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Audio Party Rooms Table */}
      {(filter === 'all' || filter === 'party_rooms' || filter === 'reported') && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#241C3C] flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mic className="w-4 h-4 text-violet-400" />
              <span>Active Audio Party Rooms ({filteredRooms.length})</span>
            </h3>
          </div>
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E83B0]">
              No matching active party rooms right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                    <th className="py-2.5 px-4 font-semibold">Room &amp; ID</th>
                    <th className="py-2.5 px-4 font-semibold">Owner</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Seats</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Participants</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#211A36] text-xs">
                  {filteredRooms.map((room) => {
                    const roomReports = openReportsByTarget.get(room.id) || [];
                    return (
                      <tr key={room.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white flex items-center gap-1.5">
                            <span>{room.title}</span>
                            {room.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="text-[11px] font-mono text-[#8E83B0]">
                            {room.displayId} · {room.category}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{room.hostName}</div>
                          <div className="text-[11px] font-mono text-[#8E83B0] truncate max-w-[160px]">
                            {room.hostId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#D6CFE9]">
                          {room.occupiedSeats} / {room.maxSeats}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {room.participantsCount}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`text-[11px] font-semibold ${
                                room.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {room.status === 'active' ? 'Live Audio' : room.status}
                              {room.hostPresent ? '' : ' (Host Away)'}
                            </span>
                            {roomReports.length > 0 && (
                              <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {roomReports.length} open report{roomReports.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={busyId === room.id}
                            onClick={() =>
                              setEndingTarget({ kind: 'room', id: room.id, title: room.title })
                            }
                            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-semibold whitespace-nowrap transition-colors"
                          >
                            End Room
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Active Solo Video Live Streams Table */}
      {(filter === 'all' || filter === 'live_streams' || filter === 'reported') && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#241C3C] flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tv className="w-4 h-4 text-rose-400" />
              <span>Active Solo Video Live Streams ({filteredStreams.length})</span>
            </h3>
          </div>
          {filteredStreams.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E83B0]">
              No matching active live video streams right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                    <th className="py-2.5 px-4 font-semibold">Stream &amp; ID</th>
                    <th className="py-2.5 px-4 font-semibold">Broadcaster</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Viewers</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Gifts Value</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#211A36] text-xs">
                  {filteredStreams.map((stream) => {
                    const streamReports = openReportsByTarget.get(stream.id) || [];
                    return (
                      <tr key={stream.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{stream.title}</div>
                          <div className="text-[11px] font-mono text-[#8E83B0]">
                            {stream.id} · {stream.category}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-white font-medium">{stream.hostName}</div>
                          <div className="text-[11px] font-mono text-[#8E83B0] truncate max-w-[160px]">
                            {stream.hostId}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-rose-400 font-semibold">
                          {stream.viewersCount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#FFC84A]">
                          {stream.giftsCoinValue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                              <Radio className="w-3 h-3" />
                              {stream.isPrivate ? 'Private Video' : 'Live Video'}
                            </span>
                            {streamReports.length > 0 && (
                              <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {streamReports.length} open report{streamReports.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={busyId === stream.id}
                            onClick={() =>
                              setEndingTarget({ kind: 'stream', id: stream.id, title: stream.title })
                            }
                            className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white text-xs font-semibold whitespace-nowrap transition-colors"
                          >
                            End Stream
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
