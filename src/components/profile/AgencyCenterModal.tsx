import React, { useState, useEffect } from 'react';
import {
  X,
  Building2,
  Users,
  Search,
  Check,
  Copy,
  ShieldCheck,
  PlusCircle,
  LogOut,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { AgencyInfo, UserProfile } from '../../types';
import {
  createAgency,
  fetchAgencies,
  joinAgency,
  leaveAgency,
} from '../../services/profileModuleService';

interface AgencyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialMode?: 'center' | 'join' | 'create';
  onProfileUpdated: (updated: UserProfile) => void;
}

export const AgencyCenterModal: React.FC<AgencyCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  initialMode = 'center',
  onProfileUpdated,
}) => {
  const hasAgency = Boolean(currentUser.agencyId && currentUser.agencyStatus === 'active');
  const [activeTab, setActiveTab] = useState<'my_agency' | 'directory' | 'create'>(
    initialMode === 'create'
      ? 'create'
      : initialMode === 'join' || !hasAgency
      ? 'directory'
      : 'my_agency'
  );
  const [agencies, setAgencies] = useState<AgencyInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Agency Form
  const [newName, setNewName] = useState('');
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewBadge, setNewCrewBadge] = useState('');
  const [newRegion, setNewRegion] = useState(currentUser.country || 'Global');
  const [newDescription, setNewDescription] = useState('');
  const [newLogo, setNewLogo] = useState('👑');

  useEffect(() => {
    if (!isOpen) return;
    setFeedback(null);
    setConfirmLeave(false);
    setActiveTab(
      initialMode === 'create'
        ? 'create'
        : initialMode === 'join' || !hasAgency
        ? 'directory'
        : 'my_agency'
    );
    loadAgencies('');
  }, [isOpen, initialMode, hasAgency]);

  const loadAgencies = async (q: string) => {
    setIsLoading(true);
    try {
      const list = await fetchAgencies(q);
      setAgencies(list);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const myAgency = agencies.find((ag) => ag.id === currentUser.agencyId) || null;

  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      setFeedback({ type: 'error', text: 'Enter an Agency invite code (e.g., LENZO01).' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await joinAgency(currentUser, { code: inviteCode.trim() });
      onProfileUpdated(res.updatedProfile);
      setInviteCode('');
      setFeedback({ type: 'success', text: `Joined ${res.agency.name} (${res.agency.crewName})!` });
      await loadAgencies('');
      setActiveTab('my_agency');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Could not join agency.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinAgency = async (agencyId: string) => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await joinAgency(currentUser, { agencyId });
      onProfileUpdated(res.updatedProfile);
      setFeedback({ type: 'success', text: `Welcome to ${res.agency.name}!` });
      await loadAgencies('');
      setActiveTab('my_agency');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to join agency.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim().length < 3) {
      setFeedback({ type: 'error', text: 'Agency name must be at least 3 characters.' });
      return;
    }
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await createAgency(currentUser, {
        name: newName,
        description: newDescription,
        crewName: newCrewName || `${newName.trim()} Crew`,
        crewBadge: newCrewBadge || newName.trim().slice(0, 6).toUpperCase(),
        region: newRegion,
        logo: newLogo,
      });
      onProfileUpdated(res.updatedProfile);
      setNewName('');
      setNewCrewName('');
      setNewCrewBadge('');
      setNewDescription('');
      setFeedback({
        type: 'success',
        text: `Agency "${res.agency.name}" created! Invite Code: ${res.agency.code}`,
      });
      await loadAgencies('');
      setActiveTab('my_agency');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to create agency.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLeaveAgency = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const updated = await leaveAgency(currentUser);
      onProfileUpdated(updated);
      setConfirmLeave(false);
      setFeedback({ type: 'success', text: 'You have left your agency.' });
      await loadAgencies('');
      setActiveTab('directory');
    } catch (err: any) {
      setFeedback({ type: 'error', text: err?.message || 'Failed to leave agency.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCode = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#140B24] border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#A855F7]" />
              <span>Agency & Crew Center</span>
            </h3>
            <p className="text-xs text-[#B9AECF] mt-0.5">
              {hasAgency
                ? `Active Member · ${currentUser.agencyName}`
                : 'Join a Lenzo Party partner agency or launch your own crew'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Agency Center"
            className="min-h-[44px] min-w-[44px] rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 flex items-center gap-2">
          {hasAgency && (
            <button
              onClick={() => setActiveTab('my_agency')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === 'my_agency'
                  ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                  : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
              }`}
            >
              My Agency
            </button>
          )}
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeTab === 'directory'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
            }`}
          >
            {hasAgency ? 'Browse Agencies' : 'Join Agency'}
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                : 'bg-white/[0.05] text-[#B9AECF] hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create Agency</span>
          </button>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`mx-5 mt-1 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/35 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/35 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
          {activeTab === 'my_agency' && hasAgency && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-[#231042] via-[#190D30] to-[#120822] border border-[#A855F7]/35 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-2xl shrink-0">
                      {currentUser.agencyLogo || myAgency?.logo || '👑'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-base font-extrabold text-white truncate">
                          {currentUser.agencyName}
                        </h4>
                        {myAgency?.isVerified && (
                          <ShieldCheck className="w-4 h-4 text-[#06B6D4] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#B9AECF]">
                        Role: <span className="text-white font-semibold capitalize">{currentUser.agencyRole || 'Host'}</span>
                        {currentUser.crewName ? ` · Crew: ${currentUser.crewName}` : ''}
                      </p>
                    </div>
                  </div>
                  {currentUser.crewBadge && (
                    <span className="px-2.5 py-1 rounded-lg bg-[#FA26A0]/20 border border-[#FA26A0]/40 text-[#FF85C8] text-[10px] font-black tracking-wider uppercase shrink-0">
                      {currentUser.crewBadge}
                    </span>
                  )}
                </div>

                {myAgency?.description && (
                  <p className="text-xs text-[#D7CEEB] leading-relaxed">{myAgency.description}</p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[10px] text-[#B9AECF] block">Invite Code</span>
                    <button
                      onClick={() => copyCode(currentUser.agencyCode || myAgency?.code || '')}
                      className="text-xs font-mono font-bold text-[#FFC84A] flex items-center gap-1 mt-0.5"
                    >
                      <span>{currentUser.agencyCode || myAgency?.code || 'N/A'}</span>
                      {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[10px] text-[#B9AECF] block">Status</span>
                    <span className="text-xs font-bold text-emerald-400 mt-0.5 block">Active</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                    <span className="text-[10px] text-[#B9AECF] block">Members</span>
                    <span className="text-xs font-mono font-bold text-white mt-0.5 block tabular-nums">
                      {Math.max(1, myAgency?.membersCount || 1)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Member Roster */}
              {myAgency && myAgency.members.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-[#B9AECF] uppercase tracking-wider">
                    Active Roster
                  </h5>
                  {myAgency.members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={m.avatar || currentUser.avatar}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover border border-white/15"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{m.name}</p>
                          <p className="text-[11px] text-[#B9AECF] font-mono truncate">{m.username}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white/10 text-[#D7CEEB]">
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Leave Agency */}
              <div className="pt-2 border-t border-white/[0.08]">
                {!confirmLeave ? (
                  <button
                    onClick={() => setConfirmLeave(true)}
                    className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Agency</span>
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                    <p className="text-xs text-rose-200 font-semibold">
                      Leave {currentUser.agencyName}? Your agency and crew badge will be removed from your profile.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmLeave(false)}
                        className="flex-1 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLeaveAgency}
                        disabled={isSubmitting}
                        className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        {isSubmitting ? 'Leaving...' : 'Confirm Leave'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'directory' && (
            <div className="space-y-4">
              {/* Join by Invite Code */}
              <form
                onSubmit={handleJoinByCode}
                className="p-3.5 rounded-2xl bg-[#1B0E32] border border-white/10 space-y-2.5"
              >
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#FFC84A]" />
                  <span>Join with Agency Invite Code</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. LENZO01)"
                    className="flex-1 bg-[#090611] border border-white/10 focus:border-[#FA26A0] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold whitespace-nowrap active:scale-95 transition-transform disabled:opacity-50"
                  >
                    {isSubmitting ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </form>

              {/* Search */}
              <div className="flex items-center bg-[#090611] border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-[#8B20FF]">
                <Search className="w-4 h-4 text-[#B9AECF] mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    loadAgencies(e.target.value);
                  }}
                  placeholder="Search agencies by name, crew, or code..."
                  className="bg-transparent text-xs text-white placeholder-[#B9AECF]/60 outline-none w-full"
                />
              </div>

              {/* Agency Cards */}
              {isLoading ? (
                <div className="py-10 flex flex-col items-center gap-2">
                  <div className="w-7 h-7 border-2 border-[#FA26A0] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#B9AECF]">Loading agencies...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {agencies.map((ag) => {
                    const isMember = currentUser.agencyId === ag.id;
                    return (
                      <div
                        key={ag.id}
                        className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center text-xl shrink-0">
                              {ag.logo}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h4 className="text-sm font-bold text-white truncate">{ag.name}</h4>
                                {ag.isVerified && (
                                  <ShieldCheck className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#B9AECF] flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[#FFC84A]">{ag.code}</span>
                                <span>·</span>
                                <span>Crew: {ag.crewName}</span>
                                <span>·</span>
                                <span>{ag.region}</span>
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleJoinAgency(ag.id)}
                            disabled={isMember || isSubmitting}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                              isMember
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white hover:opacity-95 active:scale-95'
                            }`}
                          >
                            {isMember ? 'Joined' : 'Join'}
                          </button>
                        </div>

                        <p className="text-xs text-[#B9AECF] leading-relaxed">{ag.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-[#B9AECF] pt-1 border-t border-white/[0.06]">
                          <span className="flex items-center gap-1 tabular-nums">
                            <Users className="w-3.5 h-3.5 text-[#A855F7]" />
                            {ag.membersCount} registered host{ag.membersCount === 1 ? '' : 's'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white/[0.06] text-white/80 font-mono text-[10px]">
                            TAG: {ag.crewBadge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateAgency} className="space-y-3.5">
              <div className="grid grid-cols-4 gap-2">
                {['👑', '⚡', '🎙️', '🔥', '💎', '✨', '🚀', '🎵'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setNewLogo(em)}
                    className={`h-11 rounded-xl text-lg flex items-center justify-center border transition-all ${
                      newLogo === em
                        ? 'bg-[#8B20FF]/25 border-[#FA26A0]'
                        : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.08]'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Agency Name *</label>
                <input
                  type="text"
                  maxLength={50}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Starlight Live Talent"
                  className="w-full bg-[#090611] border border-white/10 focus:border-[#FA26A0] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Crew Name</label>
                  <input
                    type="text"
                    maxLength={40}
                    value={newCrewName}
                    onChange={(e) => setNewCrewName(e.target.value)}
                    placeholder="e.g. Starlight Crew"
                    className="w-full bg-[#090611] border border-white/10 focus:border-[#8B20FF] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white block mb-1">Crew Badge Tag</label>
                  <input
                    type="text"
                    maxLength={8}
                    value={newCrewBadge}
                    onChange={(e) => setNewCrewBadge(e.target.value.toUpperCase())}
                    placeholder="e.g. STAR"
                    className="w-full bg-[#090611] border border-white/10 focus:border-[#8B20FF] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Region</label>
                <input
                  type="text"
                  maxLength={40}
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  placeholder="Global"
                  className="w-full bg-[#090611] border border-white/10 focus:border-[#8B20FF] rounded-xl px-3.5 py-2.5 text-xs text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white block mb-1">Agency Description</label>
                <textarea
                  rows={3}
                  maxLength={220}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe your agency focus, live schedule, and host perks..."
                  className="w-full bg-[#090611] border border-white/10 focus:border-[#8B20FF] rounded-xl p-3 text-xs text-white outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold shadow-lg shadow-[#8B20FF]/25 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Agency...' : 'Create Agency & Crew'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
