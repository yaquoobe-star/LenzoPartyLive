import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Coins,
  Users,
  MessageCircle,
  Phone,
  IdCard,
  Clock,
  ShieldCheck,
  Ban,
  Plus,
  Minus,
} from 'lucide-react';
import {
  AgencyApplicationRecord,
  DualAgencyRecord,
  adminAdjustAgencyCoinBalance,
  adminReviewAgencyApplication,
  adminSetAgencyStatus,
  buildWhatsAppUrl,
  subscribeAllAgenciesForAdmin,
  subscribeAllAgencyApplications,
} from '../../services/agencyService';

interface AdminAgenciesTabProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const AdminAgenciesTab: React.FC<AdminAgenciesTabProps> = ({ onNotify, onError }) => {
  const [applications, setApplications] = useState<AgencyApplicationRecord[]>([]);
  const [agencies, setAgencies] = useState<DualAgencyRecord[]>([]);
  const [subTab, setSubTab] = useState<'applications' | 'active'>('applications');
  const [typeFilter, setTypeFilter] = useState<'all' | 'coin_seller' | 'host_agency'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Per-application review inputs
  const [initialCoinsMap, setInitialCoinsMap] = useState<Record<string, string>>({});
  const [adminNotesMap, setAdminNotesMap] = useState<Record<string, string>>({});

  // Per-agency coin balance adjustment inputs
  const [adjustAmountMap, setAdjustAmountMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubApps = subscribeAllAgencyApplications((list) => setApplications(list));
    const unsubAgencies = subscribeAllAgenciesForAdmin((list) => setAgencies(list));
    return () => {
      unsubApps();
      unsubAgencies();
    };
  }, []);

  const pendingCount = useMemo(
    () => applications.filter((a) => a.status === 'pending').length,
    [applications]
  );

  const filteredApps = useMemo(
    () =>
      applications.filter((a) => (typeFilter === 'all' ? true : a.agencyType === typeFilter)),
    [applications, typeFilter]
  );

  const filteredAgencies = useMemo(
    () =>
      agencies.filter((a) => (typeFilter === 'all' ? true : a.agencyType === typeFilter)),
    [agencies, typeFilter]
  );

  const handleReview = async (
    app: AgencyApplicationRecord,
    decision: 'approved' | 'rejected'
  ) => {
    setBusyId(app.id);
    const initialCoins = Number(initialCoinsMap[app.id] || 0);
    const note = adminNotesMap[app.id] || '';
    const res = await adminReviewAgencyApplication({
      application: app,
      decision,
      adminNote: note,
      initialCoinBalance: app.agencyType === 'coin_seller' ? initialCoins : 0,
    });
    setBusyId(null);
    if (res.success) {
      onNotify(
        decision === 'approved'
          ? `${app.agencyName} (${app.agencyType === 'coin_seller' ? 'Coin Seller' : 'Host Agency'}) approved & activated!`
          : `Application for ${app.agencyName} rejected.`
      );
    } else {
      onError(res.error || 'Failed to review application.');
    }
  };

  const handleAdjustBalance = async (agency: DualAgencyRecord, sign: 1 | -1) => {
    const raw = Number(adjustAmountMap[agency.id] || 0);
    if (!Number.isFinite(raw) || raw <= 0) {
      onError('Enter a positive coin amount first.');
      return;
    }
    setBusyId(agency.id);
    const res = await adminAdjustAgencyCoinBalance(agency.id, sign * Math.floor(raw));
    setBusyId(null);
    if (res.success) {
      onNotify(
        `${agency.name} balance updated to ${(res.newBalance ?? 0).toLocaleString()} coins.`
      );
      setAdjustAmountMap((prev) => ({ ...prev, [agency.id]: '' }));
    } else {
      onError(res.error || 'Failed to update agency coin balance.');
    }
  };

  const handleToggleStatus = async (agency: DualAgencyRecord) => {
    setBusyId(agency.id);
    const nextStatus = agency.status === 'active' ? 'suspended' : 'active';
    const res = await adminSetAgencyStatus(agency.id, nextStatus);
    setBusyId(null);
    if (res.success) {
      onNotify(`${agency.name} is now ${nextStatus.toUpperCase()}.`);
    } else {
      onError(res.error || 'Failed to update agency status.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation + Type Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setSubTab('applications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              subTab === 'applications'
                ? 'bg-[#FFC84A] text-black'
                : 'text-[#C5B9DE] hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Applications</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black leading-none">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${
              subTab === 'active'
                ? 'bg-[#FFC84A] text-black'
                : 'text-[#C5B9DE] hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Active Agencies ({agencies.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          {([
            { id: 'all', label: 'All Types' },
            { id: 'coin_seller', label: 'Coin Seller' },
            { id: 'host_agency', label: 'Host Agency' },
          ] as const).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTypeFilter(f.id)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                typeFilter === f.id
                  ? 'bg-[#8B20FF] text-white'
                  : 'bg-white/[0.06] text-[#B9AECF] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* APPLICATIONS LIST */}
      {subTab === 'applications' && (
        <div className="space-y-3">
          {filteredApps.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <Building2 className="w-8 h-8 text-[#B9AECF]/50 mx-auto" />
              <p className="text-xs font-bold text-white">No agency applications found</p>
              <p className="text-[11px] text-[#B9AECF]">
                Coin Seller and Host Agency applications submitted by users appear here live.
              </p>
            </div>
          ) : (
            filteredApps.map((app) => {
              const isCoinSeller = app.agencyType === 'coin_seller';
              const waUrl = buildWhatsAppUrl(
                app.whatsappNumber,
                `Hello ${app.fullName}, this is Lenzo Party Admin regarding your ${
                  isCoinSeller ? 'Coin Seller Agency' : 'Host Agency'
                } application (${app.agencyName}).`
              );

              return (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isCoinSeller
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                              : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/35'
                          }`}
                        >
                          {isCoinSeller ? 'Coin Seller Agency' : 'Host Agency'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            app.status === 'pending'
                              ? 'bg-sky-500/20 text-sky-300'
                              : app.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1">{app.agencyName}</h4>
                      <p className="text-[11px] text-[#C5B9DE]">
                        Applicant: <strong className="text-white">{app.fullName}</strong> ({app.username}) · ID:{' '}
                        <span className="font-mono text-[#FFC84A]">{app.applicantDisplayId}</span>
                      </p>
                    </div>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-[11px] font-extrabold flex items-center gap-1.5 shrink-0"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {/* Full Applicant KYC Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-black/35 border border-white/[0.07] text-[11px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Phone className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-[#A59AB8] block">Phone / WhatsApp</span>
                        <span className="font-mono text-white block truncate">
                          {app.phoneNumber}
                          {app.whatsappNumber !== app.phoneNumber ? ` / ${app.whatsappNumber}` : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <IdCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] text-[#A59AB8] block">ID Card / CNIC</span>
                        <span className="font-mono text-white block truncate">{app.idCardNumber}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] text-[#A59AB8] block">Firebase UID</span>
                      <span className="font-mono text-[#C5B9DE] block truncate">{app.applicantUid}</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#D5CBE8] bg-white/[0.03] rounded-xl p-2.5 border border-white/5 leading-relaxed">
                    {app.description}
                  </p>

                  {app.status === 'pending' ? (
                    <div className="pt-1 space-y-2.5 border-t border-white/10">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {isCoinSeller && (
                          <div>
                            <label className="text-[10px] font-bold text-[#FFC84A] block mb-1">
                              Initial Agency Coin Balance (Optional)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={initialCoinsMap[app.id] ?? ''}
                              onChange={(e) =>
                                setInitialCoinsMap((prev) => ({
                                  ...prev,
                                  [app.id]: e.target.value,
                                }))
                              }
                              placeholder="e.g. 50000"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
                            />
                          </div>
                        )}
                        <div className={isCoinSeller ? '' : 'sm:col-span-2'}>
                          <label className="text-[10px] font-bold text-[#C5B9DE] block mb-1">
                            Admin Review Note (Optional)
                          </label>
                          <input
                            type="text"
                            value={adminNotesMap[app.id] ?? ''}
                            onChange={(e) =>
                              setAdminNotesMap((prev) => ({
                                ...prev,
                                [app.id]: e.target.value,
                              }))
                            }
                            placeholder="Approval welcome note or rejection reason..."
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void handleReview(app, 'approved')}
                          className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{busyId === app.id ? 'Processing...' : 'Approve & Activate'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => void handleReview(app, 'rejected')}
                          className="px-4 py-2.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    app.adminNote && (
                      <p className="text-[11px] text-[#A59AB8]">
                        Admin Note: <span className="text-white">{app.adminNote}</span>
                      </p>
                    )
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ACTIVE AGENCIES MANAGEMENT */}
      {subTab === 'active' && (
        <div className="space-y-3">
          {filteredAgencies.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
              <ShieldCheck className="w-8 h-8 text-[#B9AECF]/50 mx-auto" />
              <p className="text-xs font-bold text-white">No approved agencies yet</p>
              <p className="text-[11px] text-[#B9AECF]">
                Approve pending applications to activate Coin Seller or Host Agencies.
              </p>
            </div>
          ) : (
            filteredAgencies.map((agency) => {
              const isCoinSeller = agency.agencyType === 'coin_seller';
              const waUrl = buildWhatsAppUrl(
                agency.whatsappNumber,
                `Hello ${agency.ownerName} (${agency.name}), this is Lenzo Party Admin.`
              );

              return (
                <div
                  key={agency.id}
                  className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            isCoinSeller
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-400/35'
                              : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/35'
                          }`}
                        >
                          {isCoinSeller ? 'Coin Seller' : 'Host Agency'}
                        </span>
                        <span className="text-[10px] font-mono text-[#FFC84A] bg-white/[0.06] px-2 py-0.5 rounded">
                          {agency.agencyCode}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                            agency.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {agency.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-black text-white mt-1">{agency.name}</h4>
                      <p className="text-[11px] text-[#C5B9DE]">
                        Owner: <strong className="text-white">{agency.ownerName}</strong> ({agency.ownerUsername}) · WhatsApp:{' '}
                        <span className="font-mono text-emerald-300">{agency.whatsappNumber}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </a>
                      )}
                      <button
                        type="button"
                        disabled={busyId === agency.id}
                        onClick={() => void handleToggleStatus(agency)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                          agency.status === 'active'
                            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{agency.status === 'active' ? 'Suspend' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics & Coin Balance Top-Up for Coin Seller Agencies */}
                  {isCoinSeller ? (
                    <div className="p-3 rounded-xl bg-black/35 border border-amber-400/20 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          <Coins className="w-4 h-4 text-[#FFC84A]" />
                          <span className="text-[#C5B9DE]">Agency Coin Balance:</span>
                          <span className="font-mono font-black text-base text-[#FFC84A] tabular-nums">
                            {(agency.coinBalance || 0).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#A59AB8] font-mono tabular-nums">
                          Sent: {(agency.totalTransferredCoins || 0).toLocaleString()} · PIN:{' '}
                          <strong className={agency.hasPin ? 'text-emerald-300' : 'text-amber-300'}>
                            {agency.hasPin ? 'Set' : 'Not Set'}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={adjustAmountMap[agency.id] ?? ''}
                          onChange={(e) =>
                            setAdjustAmountMap((prev) => ({
                              ...prev,
                              [agency.id]: e.target.value,
                            }))
                          }
                          placeholder="Coins amount (e.g. 50000)"
                          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
                        />
                        <button
                          type="button"
                          disabled={busyId === agency.id}
                          onClick={() => void handleAdjustBalance(agency, 1)}
                          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Coins</span>
                        </button>
                        <button
                          type="button"
                          disabled={busyId === agency.id}
                          onClick={() => void handleAdjustBalance(agency, -1)}
                          className="px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/35 text-rose-200 text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          <span>Deduct</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-black/35 border border-fuchsia-400/20 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-fuchsia-300" />
                        <span className="text-[#C5B9DE]">Total Active Hosts:</span>
                        <span className="font-mono font-black text-white tabular-nums">
                          {agency.totalHosts || 0}
                        </span>
                      </div>
                      <span className="text-[11px] text-[#A59AB8]">
                        {agency.isOnline ? 'Accepting Host Requests' : 'Away'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
