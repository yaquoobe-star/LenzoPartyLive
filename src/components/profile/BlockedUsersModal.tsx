import React, { useMemo, useState } from 'react';
import { Ban, Search, ShieldCheck, Unlock, UserX, X } from 'lucide-react';
import { BlockedUserRecord } from '../../services/blockService';

interface BlockedUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  blockedUsers: BlockedUserRecord[];
  onUnblock: (userId: string, userName: string) => Promise<void> | void;
}

export const BlockedUsersModal: React.FC<BlockedUsersModalProps> = ({
  isOpen,
  onClose,
  blockedUsers,
  onUnblock,
}) => {
  const [search, setSearch] = useState('');
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return blockedUsers;
    return blockedUsers.filter(
      (u) =>
        u.blockedUserName.toLowerCase().includes(q) ||
        (u.blockedUserUsername || '').toLowerCase().includes(q) ||
        (u.blockedUserDisplayId || '').toLowerCase().includes(q)
    );
  }, [blockedUsers, search]);

  if (!isOpen) return null;

  const handleUnblockClick = async (record: BlockedUserRecord) => {
    if (unblockingId) return;
    setUnblockingId(record.blockedUserId);
    try {
      await onUnblock(record.blockedUserId, record.blockedUserName);
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[82vh] flex flex-col rounded-3xl bg-[#130824] border border-white/15 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-gradient-to-r from-[#1E0C3A] to-[#130824]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/35 flex items-center justify-center text-rose-400">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white font-display">
                Blocked Users ({blockedUsers.length})
              </h3>
              <p className="text-[11px] text-[#B9AECF]">
                Blocked users cannot join your streams, rooms, or message you.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Blocked Users"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        {blockedUsers.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#B9AECF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search blocked users by name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/35 border border-white/10 text-xs text-white placeholder-[#9B8DB8] focus:outline-none focus:border-rose-400/50"
              />
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-400/25 flex items-center justify-center mx-auto text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-white">
                {blockedUsers.length === 0 ? 'No Blocked Users' : 'No matching blocked users'}
              </p>
              <p className="text-xs text-[#B9AECF] max-w-xs mx-auto leading-relaxed">
                {blockedUsers.length === 0
                  ? 'Users you block from their profile, live stream, room, or messages will appear here so you can manage them anytime.'
                  : 'Try a different name or Lenzo ID.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const initials = (item.blockedUserName || 'U').slice(0, 2).toUpperCase();
              const isBusy = unblockingId === item.blockedUserId;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-[#241242] border border-rose-400/30 flex items-center justify-center shrink-0">
                      {item.blockedUserAvatar ? (
                        <img
                          src={item.blockedUserAvatar}
                          alt={item.blockedUserName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-black text-rose-200">{initials}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-extrabold text-white truncate">
                          {item.blockedUserName}
                        </span>
                        <UserX className="w-3 h-3 text-rose-400 shrink-0" />
                      </div>
                      <div className="text-[10px] text-[#B9AECF] font-mono truncate">
                        {item.blockedUserUsername || `ID: ${item.blockedUserDisplayId || item.blockedUserId.slice(0, 8)}`}
                      </div>
                      <div className="text-[10px] text-[#8E7FA8] mt-0.5">
                        Blocked {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => void handleUnblockClick(item)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/45 text-[11px] font-bold text-white hover:text-emerald-200 flex items-center gap-1 shrink-0 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Unlock className="w-3 h-3" />
                    <span>{isBusy ? '...' : 'Unblock'}</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
