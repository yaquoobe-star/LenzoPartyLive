import React, { useMemo, useState } from 'react';
import { Activity, Gift, History, Search, ShieldAlert, Users, Wallet } from 'lucide-react';
import { AdminUserRecord } from '../../services/adminService';
import {
  UserActivityHistory,
  fetchUserTransactionHistory,
} from '../../services/superAdminService';
import { AdminUsersControlTab } from '../screens/AdminUsersControlTab';

interface AdminUsersAndActivitySectionProps {
  users: AdminUserRecord[];
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminUsersAndActivitySection: React.FC<AdminUsersAndActivitySectionProps> = ({
  users,
  onNotify,
  onError,
}) => {
  const [view, setView] = useState<'directory' | 'activity_inspector'>('directory');
  const [lookupQuery, setLookupQuery] = useState('');
  const [inspectedUser, setInspectedUser] = useState<AdminUserRecord | null>(null);
  const [history, setHistory] = useState<UserActivityHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const matchingUsers = useMemo(() => {
    const q = lookupQuery.trim().toLowerCase();
    if (!q) return users.slice(0, 20);
    return users
      .filter(
        (u) =>
          u.uid.toLowerCase().includes(q) ||
          u.displayId.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [users, lookupQuery]);

  const handleInspectUser = async (user: AdminUserRecord) => {
    setInspectedUser(user);
    setLoadingHistory(true);
    try {
      const data = await fetchUserTransactionHistory(user.uid);
      setHistory(data);
    } catch (err: any) {
      onError(err?.message || 'Unable to load user transaction history.');
      setHistory({ walletTransactions: [], giftTransactions: [], reportsAgainst: [] });
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5">
        <button
          type="button"
          onClick={() => setView('directory')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            view === 'directory' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users Control ({users.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setView('activity_inspector')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            view === 'activity_inspector'
              ? 'bg-[#FFC84A] text-[#0B0716]'
              : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Activity &amp; Transaction History</span>
        </button>
      </div>

      {view === 'directory' ? (
        <AdminUsersControlTab onNotify={onNotify} onError={onError} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left picker */}
          <div className="lg:col-span-4 rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden flex flex-col max-h-[680px]">
            <div className="p-3 border-b border-[#241C3C]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E83B0] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lookupQuery}
                  onChange={(e) => setLookupQuery(e.target.value)}
                  placeholder="Find user by UID, name, username..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#0B0716] border border-[#2B2248] text-xs text-white placeholder-[#7C719D] focus:outline-none focus:border-[#FFC84A]"
                />
              </div>
            </div>
            <div className="divide-y divide-[#211A36] overflow-y-auto flex-1">
              {matchingUsers.map((u) => {
                const active = inspectedUser?.uid === u.uid;
                return (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => handleInspectUser(u)}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-2 transition-colors ${
                      active ? 'bg-[#FFC84A]/15 border-l-2 border-[#FFC84A]' : 'hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{u.fullName}</div>
                      <div className="text-[11px] font-mono text-[#8E83B0] truncate">
                        {u.username} · {u.displayId}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-[11px] text-[#FFC84A]">{u.coins.toLocaleString()}</div>
                      <div className="text-[10px] text-[#8E83B0]">Lv.{u.level}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right detail timeline */}
          <div className="lg:col-span-8 space-y-4">
            {!inspectedUser ? (
              <div className="p-10 rounded-xl bg-[#130E24] border border-[#261E40] text-center text-xs text-[#8E83B0]">
                Select any registered user from the left to inspect their live wallet transactions, gift history, and moderation reports.
              </div>
            ) : (
              <>
                <div className="p-4 rounded-xl bg-[#130E24] border border-[#261E40] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{inspectedUser.fullName}</div>
                    <div className="text-xs font-mono text-[#988DB9]">
                      UID: {inspectedUser.uid} · {inspectedUser.email}
                    </div>
                    <div className="text-[11px] text-[#8E83B0] mt-1">
                      Registered:{' '}
                      <span className="font-mono">
                        {inspectedUser.createdAt
                          ? new Date(inspectedUser.createdAt).toLocaleDateString()
                          : 'Unknown'}
                      </span>{' '}
                      · Status:{' '}
                      <span className="uppercase font-semibold text-[#FFC84A]">
                        {inspectedUser.accountStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 font-mono tabular-nums text-xs">
                    <div>
                      <div className="text-[10px] text-[#8E83B0]">COINS</div>
                      <div className="text-sm font-bold text-[#FFC84A]">
                        {inspectedUser.coins.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8E83B0]">DIAMONDS</div>
                      <div className="text-sm font-bold text-sky-400">
                        {inspectedUser.diamonds.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#8E83B0]">LEVEL</div>
                      <div className="text-sm font-bold text-white">Lv.{inspectedUser.level}</div>
                    </div>
                  </div>
                </div>

                {loadingHistory ? (
                  <div className="p-8 rounded-xl bg-[#130E24] border border-[#261E40] text-center text-xs text-[#8E83B0]">
                    Loading Firestore transaction &amp; moderation records...
                  </div>
                ) : (
                  <>
                    {/* Wallet Ledger */}
                    <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#241C3C] text-xs font-bold text-white flex items-center gap-2">
                        <Wallet className="w-3.5 h-3.5 text-[#FFC84A]" />
                        <span>Wallet Transactions ({history?.walletTransactions.length || 0})</span>
                      </div>
                      {!history?.walletTransactions.length ? (
                        <div className="p-5 text-center text-xs text-[#8E83B0]">No wallet transactions found.</div>
                      ) : (
                        <div className="divide-y divide-[#211A36] max-h-60 overflow-y-auto text-xs">
                          {history.walletTransactions.map((tx) => (
                            <div key={tx.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-white font-medium truncate">
                                  {tx.description || tx.category}
                                </div>
                                <div className="text-[10px] font-mono text-[#8E83B0]">
                                  {tx.category} · {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ''}
                                </div>
                              </div>
                              <div className="text-right font-mono tabular-nums shrink-0">
                                <div className={tx.amount >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                                  {tx.amount >= 0 ? '+' : ''}
                                  {tx.amount.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-[#8E83B0]">
                                  Bal: {tx.balanceAfter.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gift Activity */}
                    <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#241C3C] text-xs font-bold text-white flex items-center gap-2">
                        <Gift className="w-3.5 h-3.5 text-fuchsia-400" />
                        <span>Gift Activity ({history?.giftTransactions.length || 0})</span>
                      </div>
                      {!history?.giftTransactions.length ? (
                        <div className="p-5 text-center text-xs text-[#8E83B0]">No gift activity found.</div>
                      ) : (
                        <div className="divide-y divide-[#211A36] max-h-60 overflow-y-auto text-xs">
                          {history.giftTransactions.map((g) => (
                            <div key={g.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-white font-medium">
                                  {g.direction === 'sent' ? 'Sent' : 'Received'} {g.giftName}
                                </div>
                                <div className="text-[10px] font-mono text-[#8E83B0] truncate">
                                  {g.direction === 'sent' ? 'To' : 'From'}: {g.counterpartyId}
                                </div>
                              </div>
                              <div className="text-right font-mono tabular-nums shrink-0">
                                <div className="text-[#FFC84A] font-semibold">
                                  {g.coinAmount.toLocaleString()} coins
                                </div>
                                <div className="text-[10px] text-[#8E83B0]">
                                  {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Reports Against User */}
                    <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#241C3C] text-xs font-bold text-white flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Moderation Reports Targeting User ({history?.reportsAgainst.length || 0})</span>
                      </div>
                      {!history?.reportsAgainst.length ? (
                        <div className="p-5 text-center text-xs text-[#8E83B0]">No reports filed against this user.</div>
                      ) : (
                        <div className="divide-y divide-[#211A36] text-xs">
                          {history.reportsAgainst.map((r) => (
                            <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-white font-medium">{r.reason}</div>
                                <div className="text-[11px] text-[#8E83B0] truncate">{r.details || r.actionTaken}</div>
                              </div>
                              <span className="text-[11px] font-mono uppercase text-amber-400 shrink-0">
                                {r.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
