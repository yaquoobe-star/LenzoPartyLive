import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Coins, Landmark, UserCheck, Users } from 'lucide-react';
import { AdminAgenciesTab } from '../screens/AdminAgenciesTab';
import {
  AdminHostMembershipRecord,
  adminUpdateAgencyHostMembership,
  subscribeAllAgencyHostRequestsForAdmin,
} from '../../services/superAdminService';
import {
  adminMarkAgencyCommissionPaid,
  subscribeAgencyCommissions,
} from '../../services/financialService';
import { AgencyCommissionRecord } from '../../types';

interface AdminAgenciesAndHostsSectionProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type AgencySubTab = 'directory' | 'hosts' | 'settlements';

export const AdminAgenciesAndHostsSection: React.FC<AdminAgenciesAndHostsSectionProps> = ({
  onNotify,
  onError,
}) => {
  const [subTab, setSubTab] = useState<AgencySubTab>('directory');
  const [hostMemberships, setHostMemberships] = useState<AdminHostMembershipRecord[]>([]);
  const [commissions, setCommissions] = useState<AgencyCommissionRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubHosts = subscribeAllAgencyHostRequestsForAdmin(
      (items) => setHostMemberships(items),
      (err) => onError(err)
    );
    const unsubComm = subscribeAgencyCommissions((items) => setCommissions(items));
    return () => {
      unsubHosts();
      unsubComm();
    };
  }, [onError]);

  const activeHostsCount = hostMemberships.filter((h) => h.status === 'accepted').length;
  const unpaidCommissionsCount = commissions.filter((c) => c.status !== 'paid').length;

  return (
    <div className="space-y-5">
      <div className="inline-flex flex-wrap rounded-lg bg-[#0B0716] border border-[#261E40] p-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => setSubTab('directory')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'directory' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Agencies &amp; Applications</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('hosts')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'hosts' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Host Memberships ({activeHostsCount} active)</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('settlements')}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
            subTab === 'settlements' ? 'bg-[#FFC84A] text-[#0B0716]' : 'text-[#A59BC4] hover:text-white'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>Commission Settlements ({unpaidCommissionsCount} pending)</span>
        </button>
      </div>

      {subTab === 'directory' && <AdminAgenciesTab onNotify={onNotify} onError={onError} />}

      {subTab === 'hosts' && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#241C3C] flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#FFC84A]" />
              <span>Agency Host Contracts &amp; Memberships ({hostMemberships.length})</span>
            </h3>
          </div>
          {hostMemberships.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E83B0]">
              No host agency membership requests or active host contracts found yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                    <th className="py-2.5 px-4">Host</th>
                    <th className="py-2.5 px-4">Agency</th>
                    <th className="py-2.5 px-4 text-right">Commission</th>
                    <th className="py-2.5 px-4 text-right">Target Coins / Hrs</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#211A36]">
                  {hostMemberships.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{m.hostName}</div>
                        <div className="text-[11px] font-mono text-[#8E83B0]">
                          {m.hostDisplayId || m.hostUid.slice(0, 10)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white">{m.agencyName}</div>
                        <div className="text-[11px] font-mono text-[#8E83B0]">{m.agencyId}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#FFC84A]">
                        {m.dealCommissionPercent}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#C5B9DE]">
                        {m.dealTargetCoins.toLocaleString()} / {m.dealTargetHours}h
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[11px]">
                        <span
                          className={
                            m.status === 'accepted'
                              ? 'text-emerald-400'
                              : m.status === 'pending'
                                ? 'text-amber-400'
                                : 'text-[#8E83B0]'
                          }
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {m.status !== 'accepted' && (
                            <button
                              type="button"
                              disabled={busyId === m.id}
                              onClick={async () => {
                                setBusyId(m.id);
                                const res = await adminUpdateAgencyHostMembership({
                                  request: m,
                                  status: 'accepted',
                                });
                                setBusyId(null);
                                if (res.success) onNotify(`Host ${m.hostName} approved for ${m.agencyName}.`);
                                else onError(res.error || 'Action failed.');
                              }}
                              className="px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white font-semibold"
                            >
                              Approve
                            </button>
                          )}
                          {m.status === 'accepted' && (
                            <button
                              type="button"
                              disabled={busyId === m.id}
                              onClick={async () => {
                                setBusyId(m.id);
                                const res = await adminUpdateAgencyHostMembership({
                                  request: m,
                                  status: 'removed',
                                });
                                setBusyId(null);
                                if (res.success) onNotify(`Removed ${m.hostName} from ${m.agencyName}.`);
                                else onError(res.error || 'Action failed.');
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-200 hover:text-white font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {subTab === 'settlements' && (
        <div className="rounded-xl bg-[#130E24] border border-[#261E40] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#241C3C] flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-[#FFC84A]" />
              <span>Agency Commission &amp; Settlement Ledger ({commissions.length})</span>
            </h3>
          </div>
          {commissions.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#8E83B0]">
              No agency commission settlement records generated yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#241C3C] text-[11px] text-[#8E83B0] uppercase">
                    <th className="py-2.5 px-4">Agency / Period</th>
                    <th className="py-2.5 px-4">Host</th>
                    <th className="py-2.5 px-4 text-right">Commission %</th>
                    <th className="py-2.5 px-4 text-right">Payout (PKR)</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Settlement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#211A36]">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{c.agencyName || c.agencyId}</div>
                        <div className="text-[11px] font-mono text-[#8E83B0]">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : c.id}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#C5B9DE] font-mono text-[11px]">
                        {c.hostName || c.hostUid}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-[#FFC84A]">
                        {Number(c.commissionPercent || 0)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                        Rs. {Number(c.commissionPkr || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-[11px]">
                        <span className={c.status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.status !== 'paid' ? (
                          <button
                            type="button"
                            disabled={busyId === c.id}
                            onClick={async () => {
                              setBusyId(c.id);
                              const res = await adminMarkAgencyCommissionPaid(
                                c,
                                `SUPERADMIN-${Date.now()}`
                              );
                              setBusyId(null);
                              if (res.success) onNotify(`Commission ${c.id} marked paid with audit record.`);
                              else onError(res.error || 'Settlement failed.');
                            }}
                            className="px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-200 hover:text-white font-semibold inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Paid</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#8E83B0]">Settled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
