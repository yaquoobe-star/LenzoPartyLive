import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Building2,
  Coins,
  Users,
  Search,
  Send,
  Lock,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  MessageSquare,
  Save,
  UserPlus,
  Percent,
  Target,
  Timer,
  Edit3,
  Trash2,
  History,
  FileText,
  Sparkles,
  Copy,
  Receipt,
  Image as ImageIcon,
  XCircle,
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  AgencyApplicationRecord,
  AgencyCoinOrderRecord,
  AgencyCoinTransferRecord,
  AgencyHostRequestRecord,
  DualAgencyRecord,
  DualAgencyType,
  TransferRecipientCandidate,
  acceptHostRequestWithDeal,
  buildWhatsAppUrl,
  cancelMyPendingHostRequest,
  confirmCoinOrderAndSendCoins,
  isValidSecretPin,
  rejectCoinOrder,
  rejectOrRemoveHostRequest,
  saveAgencySecretPin,
  searchUsersForCoinTransfer,
  sendHostJoinRequest,
  submitAgencyApplication,
  subscribeActiveAgencies,
  subscribeAgencyCoinOrdersForSeller,
  subscribeAgencyCoinTransfers,
  subscribeHostAgencyRequestsForOwner,
  subscribeMyAgencyApplications,
  subscribeMyHostRequests,
  subscribeMyOwnedAgencies,
  transferCoinsFromAgency,
  updateAgencyProfile,
  updateHostDealTerms,
} from '../../services/agencyService';

interface AgencyCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  initialMode?: 'center' | 'join' | 'create';
  onProfileUpdated: (updated: UserProfile) => void;
  onSendMessage?: (user: UserProfile) => void;
}

export const AgencyCenterModal: React.FC<AgencyCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSendMessage,
}) => {
  // Primary Dual Agency Switcher
  const [agencyTypeTab, setAgencyTypeTab] = useState<DualAgencyType>('coin_seller');

  // Sub-tabs for each state
  const [coinSellerOwnerTab, setCoinSellerOwnerTab] = useState<'slips' | 'transfer' | 'pin' | 'history'>('slips');
  const [coinSellerGuestTab, setCoinSellerGuestTab] = useState<'apply' | 'directory'>('apply');
  const [hostAgencyOwnerTab, setHostAgencyOwnerTab] = useState<'pending' | 'hosts' | 'settings'>('pending');
  const [hostAgencyGuestTab, setHostAgencyGuestTab] = useState<'directory' | 'my_deals' | 'apply'>('directory');

  // Live Firestore State
  const [ownedAgencies, setOwnedAgencies] = useState<{
    coinSeller: DualAgencyRecord | null;
    hostAgency: DualAgencyRecord | null;
  }>({ coinSeller: null, hostAgency: null });
  const [myApplications, setMyApplications] = useState<AgencyApplicationRecord[]>([]);
  const [activeCoinSellers, setActiveCoinSellers] = useState<DualAgencyRecord[]>([]);
  const [activeHostAgencies, setActiveHostAgencies] = useState<DualAgencyRecord[]>([]);
  const [myTransfers, setMyTransfers] = useState<AgencyCoinTransferRecord[]>([]);
  const [incomingCoinOrders, setIncomingCoinOrders] = useState<AgencyCoinOrderRecord[]>([]);
  const [incomingHostRequests, setIncomingHostRequests] = useState<AgencyHostRequestRecord[]>([]);
  const [myHostRequests, setMyHostRequests] = useState<AgencyHostRequestRecord[]>([]);

  // Coin Seller — Payment Slip Confirmation State
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);
  const [orderCoinsToSend, setOrderCoinsToSend] = useState('');
  const [orderConfirmPin, setOrderConfirmPin] = useState('');
  const [orderSellerNote, setOrderSellerNote] = useState('');
  const [slipLightboxUrl, setSlipLightboxUrl] = useState<string | null>(null);

  // Feedback Banners
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Application Form State (shared across Coin Seller & Host Agency apply views)
  const [appFullName, setAppFullName] = useState(currentUser.name || '');
  const [appUserId, setAppUserId] = useState(currentUser.displayId || currentUser.id.slice(0, 8));
  const [appAgencyName, setAppAgencyName] = useState('');
  const [appUsername, setAppUsername] = useState(currentUser.username || `@${currentUser.displayId}`);
  const [appPhone, setAppPhone] = useState('');
  const [appWhatsapp, setAppWhatsapp] = useState('');
  const [appIdCard, setAppIdCard] = useState('');
  const [appDescription, setAppDescription] = useState('');

  // Coin Seller — Secret PIN Form (4 or 5 digits personal PIN, NOT OTP)
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Coin Seller — Agency Profile / WhatsApp Edit
  const [csEditName, setCsEditName] = useState('');
  const [csEditWhatsapp, setCsEditWhatsapp] = useState('');
  const [csEditDesc, setCsEditDesc] = useState('');
  const [csEditOnline, setCsEditOnline] = useState(true);

  // Coin Seller — Recipient Search & Coin Transfer
  const [recipientQuery, setRecipientQuery] = useState('');
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [searchResults, setSearchResults] = useState<TransferRecipientCandidate[]>([]);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<TransferRecipientCandidate | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferPin, setTransferPin] = useState('');
  const [transferNote, setTransferNote] = useState('');

  // Host Agency — Agency Profile / WhatsApp Edit
  const [haEditName, setHaEditName] = useState('');
  const [haEditWhatsapp, setHaEditWhatsapp] = useState('');
  const [haEditDesc, setHaEditDesc] = useState('');
  const [haEditOnline, setHaEditOnline] = useState(true);

  // Host Agency — Owner Deal Finalization / Edit State
  const [dealEditingReqId, setDealEditingReqId] = useState<string | null>(null);
  const [dealPercentInput, setDealPercentInput] = useState('15');
  const [dealTargetCoinsInput, setDealTargetCoinsInput] = useState('50000');
  const [dealTargetHoursInput, setDealTargetHoursInput] = useState('60');
  const [dealNotesInput, setDealNotesInput] = useState('');

  // Host Guest — Join Request Modal/Inline Panel
  const [joiningHostAgency, setJoiningHostAgency] = useState<DualAgencyRecord | null>(null);
  const [hostJoinWhatsapp, setHostJoinWhatsapp] = useState('');
  const [hostJoinMessage, setHostJoinMessage] = useState('');

  const showSuccess = (msg: string) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setStatusMessage(null);
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4500);
  };

  // Real-time Firestore subscriptions
  useEffect(() => {
    if (!isOpen || !currentUser?.id) return;

    const unsubOwned = subscribeMyOwnedAgencies(currentUser.id, (owned) => {
      setOwnedAgencies(owned);
      if (owned.coinSeller) {
        setCsEditName(owned.coinSeller.name || '');
        setCsEditWhatsapp(owned.coinSeller.whatsappNumber || '');
        setCsEditDesc(owned.coinSeller.description || '');
        setCsEditOnline(owned.coinSeller.isOnline ?? true);
      }
      if (owned.hostAgency) {
        setHaEditName(owned.hostAgency.name || '');
        setHaEditWhatsapp(owned.hostAgency.whatsappNumber || '');
        setHaEditDesc(owned.hostAgency.description || '');
        setHaEditOnline(owned.hostAgency.isOnline ?? true);
      }
    });

    const unsubApps = subscribeMyAgencyApplications(currentUser.id, setMyApplications);
    const unsubCsDir = subscribeActiveAgencies('coin_seller', setActiveCoinSellers);
    const unsubHaDir = subscribeActiveAgencies('host_agency', setActiveHostAgencies);
    const unsubTransfers = subscribeAgencyCoinTransfers(currentUser.id, setMyTransfers);
    const unsubCoinOrders = subscribeAgencyCoinOrdersForSeller(currentUser.id, setIncomingCoinOrders);
    const unsubIncoming = subscribeHostAgencyRequestsForOwner(currentUser.id, setIncomingHostRequests);
    const unsubMyHostReqs = subscribeMyHostRequests(currentUser.id, setMyHostRequests);

    return () => {
      unsubOwned();
      unsubApps();
      unsubCsDir();
      unsubHaDir();
      unsubTransfers();
      unsubCoinOrders();
      unsubIncoming();
      unsubMyHostReqs();
    };
  }, [isOpen, currentUser?.id]);

  // Derived values
  const myCoinSeller = ownedAgencies.coinSeller?.status === 'active' ? ownedAgencies.coinSeller : null;
  const myHostAgency = ownedAgencies.hostAgency?.status === 'active' ? ownedAgencies.hostAgency : null;

  const latestAppForType = useMemo(
    () => myApplications.find((a) => a.agencyType === agencyTypeTab) || null,
    [myApplications, agencyTypeTab]
  );

  const pendingCoinOrders = useMemo(
    () => incomingCoinOrders.filter((o) => o.status === 'pending'),
    [incomingCoinOrders]
  );

  const pendingHostRequests = useMemo(
    () => incomingHostRequests.filter((r) => r.status === 'pending'),
    [incomingHostRequests]
  );

  const acceptedHosts = useMemo(
    () => incomingHostRequests.filter((r) => r.status === 'accepted'),
    [incomingHostRequests]
  );

  if (!isOpen) return null;

  // Helper to open in-app direct chat with an agency holder or host
  const handleInAppContact = (target: {
    uid: string;
    name: string;
    username?: string;
    displayId?: string;
    avatar?: string;
  }) => {
    if (!onSendMessage) {
      showError('In-app chat shortcut is unavailable from this view. Use WhatsApp or open the Chat tab.');
      return;
    }
    if (target.uid === currentUser.id) {
      showError('This is your own account.');
      return;
    }
    const stubProfile: UserProfile = {
      id: target.uid,
      displayId: target.displayId || target.uid.slice(0, 8),
      name: target.name || 'Agency Partner',
      username: target.username || `@${(target.displayId || target.uid.slice(0, 6)).toLowerCase()}`,
      avatar:
        target.avatar ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(target.name || 'User')}&background=8B20FF&color=fff`,
      bio: '',
      level: 1,
      vipLevel: 0,
      isVIP: false,
      coins: 0,
      diamonds: 0,
      followersCount: 0,
      followingCount: 0,
      fansCount: '0',
      likesCount: '0',
    };
    onClose();
    onSendMessage(stubProfile);
  };

  const handleCopyText = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(text);
    }
    showSuccess(`${label} copied: ${text}`);
  };

  // 1. Submit Agency Application (Coin Seller or Host Agency)
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBusy(true);
    const res = await submitAgencyApplication({
      applicantUid: currentUser.id,
      applicantDisplayId: appUserId,
      agencyType: agencyTypeTab,
      fullName: appFullName,
      agencyName: appAgencyName,
      username: appUsername,
      phoneNumber: appPhone,
      whatsappNumber: appWhatsapp || appPhone,
      idCardNumber: appIdCard,
      description: appDescription,
    });
    setIsBusy(false);

    if (res.success) {
      setAppAgencyName('');
      setAppIdCard('');
      setAppDescription('');
      showSuccess(
        `Your ${
          agencyTypeTab === 'coin_seller' ? 'Coin Seller Agency' : 'Host Agency'
        } application has been sent to Admin for approval!`
      );
    } else {
      showError(res.error || 'Could not submit application.');
    }
  };

  // 2. Coin Seller — Save/Update 4-5 Digit Secret PIN
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCoinSeller) return;
    if (!isValidSecretPin(newPinInput)) {
      showError('PIN must be 4 or 5 digits (numbers only).');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      showError('New PIN and Confirm PIN do not match.');
      return;
    }
    setIsBusy(true);
    const res = await saveAgencySecretPin({
      agencyId: myCoinSeller.id,
      newPin: newPinInput,
      currentPin: myCoinSeller.hasPin ? currentPinInput : undefined,
    });
    setIsBusy(false);
    if (res.success) {
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      showSuccess('Personal Secret Transfer PIN saved securely!');
    } else {
      showError(res.error || 'Failed to save PIN.');
    }
  };

  // 3. Save Agency Profile / WhatsApp
  const handleSaveAgencySettings = async (type: DualAgencyType) => {
    const targetAgency = type === 'coin_seller' ? myCoinSeller : myHostAgency;
    if (!targetAgency) return;
    setIsBusy(true);
    const res = await updateAgencyProfile(targetAgency.id, {
      name: type === 'coin_seller' ? csEditName : haEditName,
      whatsappNumber: type === 'coin_seller' ? csEditWhatsapp : haEditWhatsapp,
      description: type === 'coin_seller' ? csEditDesc : haEditDesc,
      isOnline: type === 'coin_seller' ? csEditOnline : haEditOnline,
    });
    setIsBusy(false);
    if (res.success) {
      showSuccess('Agency WhatsApp & details updated!');
    } else {
      showError(res.error || 'Failed to update agency settings.');
    }
  };

  // 4. Coin Seller — Search Recipient User (ID / Username / Name / Email)
  const handleSearchRecipient = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recipientQuery.trim()) {
      showError('Enter User ID, Username, Name, or Email to search.');
      return;
    }
    setSearchingUsers(true);
    setHasSearchedOnce(true);
    const res = await searchUsersForCoinTransfer(recipientQuery, currentUser.id);
    setSearchingUsers(false);
    if (res.error) {
      showError(res.error);
      setSearchResults([]);
    } else {
      setSearchResults(res.users);
    }
  };

  // 5. Coin Seller — Execute Atomic Coin Transfer
  const handleExecuteCoinTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myCoinSeller || !selectedRecipient) return;
    if (!myCoinSeller.hasPin) {
      showError('Please create your 4 or 5 digit Personal Secret PIN first.');
      setCoinSellerOwnerTab('pin');
      return;
    }
    const amt = Math.floor(Number(transferAmount));
    if (!Number.isFinite(amt) || amt <= 0) {
      showError('Enter a valid coin amount.');
      return;
    }
    if (!isValidSecretPin(transferPin)) {
      showError('Enter your 4 or 5 digit personal secret PIN.');
      return;
    }

    setIsBusy(true);
    const res = await transferCoinsFromAgency({
      agencyId: myCoinSeller.id,
      recipient: selectedRecipient,
      amount: amt,
      pin: transferPin,
      note: transferNote,
    });
    setIsBusy(false);

    if (res.success) {
      showSuccess(
        `Sent ${amt.toLocaleString()} coins to ${selectedRecipient.fullName} (ID: ${selectedRecipient.displayId})!`
      );
      setTransferAmount('');
      setTransferPin('');
      setTransferNote('');
      setSelectedRecipient(null);
      setSearchResults([]);
      setRecipientQuery('');
      setHasSearchedOnce(false);
    } else {
      showError(res.error || 'Coin transfer failed.');
    }
  };

  // 5b. Coin Seller — Confirm Incoming Payment Slip Order & Send Coins Atomically
  const openSlipConfirmForm = (order: AgencyCoinOrderRecord) => {
    setConfirmingOrderId(order.id);
    setOrderCoinsToSend(String(order.coinsRequested));
    setOrderConfirmPin('');
    setOrderSellerNote('');
  };

  const handleConfirmSlipOrder = async (order: AgencyCoinOrderRecord) => {
    if (!myCoinSeller) return;
    if (!myCoinSeller.hasPin) {
      showError('Please create your 4 or 5 digit Personal Secret PIN first.');
      setCoinSellerOwnerTab('pin');
      return;
    }
    const amt = Math.floor(Number(orderCoinsToSend));
    if (!Number.isFinite(amt) || amt <= 0) {
      showError('Enter a valid coin amount to send.');
      return;
    }
    if (!isValidSecretPin(orderConfirmPin)) {
      showError('Enter your 4 or 5 digit personal secret PIN.');
      return;
    }

    setIsBusy(true);
    const res = await confirmCoinOrderAndSendCoins({
      order,
      coinsToSend: amt,
      pin: orderConfirmPin,
      sellerNote: orderSellerNote,
    });
    setIsBusy(false);

    if (res.success) {
      setConfirmingOrderId(null);
      setOrderConfirmPin('');
      setOrderSellerNote('');
      showSuccess(
        `Order #${order.id.slice(-6).toUpperCase()} confirmed! ${amt.toLocaleString()} coins sent to ${order.buyerName}.`
      );
    } else {
      showError(res.error || 'Could not confirm order & send coins.');
    }
  };

  const handleRejectSlipOrder = async (order: AgencyCoinOrderRecord) => {
    setIsBusy(true);
    const res = await rejectCoinOrder(
      order.id,
      orderSellerNote.trim() || 'Payment slip could not be verified. Please contact us on WhatsApp or In-App Chat.'
    );
    setIsBusy(false);
    if (res.success) {
      if (confirmingOrderId === order.id) setConfirmingOrderId(null);
      showSuccess(`Order #${order.id.slice(-6).toUpperCase()} marked rejected.`);
    } else {
      showError(res.error || 'Could not reject order.');
    }
  };

  // 6. Host Guest — Send Join Request to a Host Agency
  const handleSendHostRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningHostAgency) return;
    setIsBusy(true);
    const res = await sendHostJoinRequest({
      agency: joiningHostAgency,
      hostUser: currentUser,
      hostWhatsapp: hostJoinWhatsapp,
      message: hostJoinMessage,
    });
    setIsBusy(false);
    if (res.success) {
      showSuccess(`Join request sent to ${joiningHostAgency.name}!`);
      setJoiningHostAgency(null);
      setHostJoinMessage('');
      setHostAgencyGuestTab('my_deals');
    } else {
      showError(res.error || 'Could not send request.');
    }
  };

  // 7. Host Agency Owner — Open Deal Form for Pending Request or Active Host
  const openDealEditor = (req: AgencyHostRequestRecord) => {
    setDealEditingReqId(req.id);
    setDealPercentInput(String(req.dealCommissionPercent || 15));
    setDealTargetCoinsInput(String(req.dealTargetCoins || 50000));
    setDealTargetHoursInput(String(req.dealTargetHours || 60));
    setDealNotesInput(req.dealNotes || '');
  };

  const handleConfirmHostDeal = async (req: AgencyHostRequestRecord) => {
    setIsBusy(true);
    const res =
      req.status === 'pending'
        ? await acceptHostRequestWithDeal({
            request: req,
            dealCommissionPercent: Number(dealPercentInput || 0),
            dealTargetCoins: Number(dealTargetCoinsInput || 0),
            dealTargetHours: Number(dealTargetHoursInput || 0),
            dealNotes: dealNotesInput,
          })
        : await updateHostDealTerms({
            requestId: req.id,
            dealCommissionPercent: Number(dealPercentInput || 0),
            dealTargetCoins: Number(dealTargetCoinsInput || 0),
            dealTargetHours: Number(dealTargetHoursInput || 0),
            dealNotes: dealNotesInput,
          });
    setIsBusy(false);
    if (res.success) {
      setDealEditingReqId(null);
      showSuccess(
        req.status === 'pending'
          ? `${req.hostName} accepted! Deal (${dealPercentInput}%, ${Number(dealTargetCoinsInput).toLocaleString()} target, ${dealTargetHoursInput}h) finalized.`
          : `Updated target & deal terms for ${req.hostName}.`
      );
    } else {
      showError(res.error || 'Failed to save host deal.');
    }
  };

  const handleRejectOrRemoveHost = async (
    req: AgencyHostRequestRecord,
    nextStatus: 'rejected' | 'removed'
  ) => {
    setIsBusy(true);
    const res = await rejectOrRemoveHostRequest({ request: req, nextStatus });
    setIsBusy(false);
    if (res.success) {
      showSuccess(
        nextStatus === 'rejected'
          ? `Request from ${req.hostName} rejected.`
          : `${req.hostName} removed from active hosts.`
      );
    } else {
      showError(res.error || 'Operation failed.');
    }
  };

  const handleCancelMyHostRequest = async (reqId: string) => {
    setIsBusy(true);
    const res = await cancelMyPendingHostRequest(reqId);
    setIsBusy(false);
    if (res.success) {
      showSuccess('Pending request cancelled.');
    } else {
      showError(res.error || 'Could not cancel request.');
    }
  };

  // Shared Application Form Renderer (Coin Seller & Host Agency)
  const renderApplicationForm = (type: DualAgencyType) => {
    const isCoinSeller = type === 'coin_seller';
    const hasPendingApp = latestAppForType?.status === 'pending';

    return (
      <div className="space-y-4">
        {/* Status Banner if user already applied */}
        {latestAppForType && (
          <div
            className={`p-3.5 rounded-2xl border space-y-1.5 ${
              latestAppForType.status === 'pending'
                ? 'bg-sky-500/15 border-sky-400/40'
                : latestAppForType.status === 'approved'
                  ? 'bg-emerald-500/15 border-emerald-400/40'
                  : 'bg-rose-500/15 border-rose-400/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                {latestAppForType.status === 'pending' ? (
                  <Clock className="w-4 h-4 text-sky-300" />
                ) : latestAppForType.status === 'approved' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-300" />
                )}
                <span>
                  {latestAppForType.status === 'pending'
                    ? 'Application Under Admin Review'
                    : latestAppForType.status === 'approved'
                      ? 'Application Approved!'
                      : 'Previous Application Rejected'}
                </span>
              </span>
              <span className="text-[10px] font-mono uppercase font-black px-2 py-0.5 rounded bg-black/35 text-white">
                {latestAppForType.status}
              </span>
            </div>
            <p className="text-[11px] text-[#D8CEE8]">
              Agency: <strong>{latestAppForType.agencyName}</strong> · Submitted by {latestAppForType.fullName}
            </p>
            {latestAppForType.adminNote && (
              <p className="text-[11px] text-amber-200">Admin Note: {latestAppForType.adminNote}</p>
            )}
          </div>
        )}

        {hasPendingApp ? (
          <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 text-center space-y-2">
            <ShieldCheck className="w-9 h-9 text-sky-400 mx-auto" />
            <h4 className="text-sm font-black text-white">Request Sent to Admin</h4>
            <p className="text-xs text-[#B9AECF] leading-relaxed">
              Your {isCoinSeller ? 'Coin Seller Agency' : 'Host Agency'} application is waiting for Admin verification. Once approved, your full agency panel will activate automatically here.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className="space-y-3">
            <div
              className={`p-3.5 rounded-2xl border ${
                isCoinSeller
                  ? 'bg-amber-500/10 border-amber-400/30'
                  : 'bg-fuchsia-500/10 border-fuchsia-400/30'
              }`}
            >
              <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                <Sparkles className={`w-4 h-4 ${isCoinSeller ? 'text-[#FFC84A]' : 'text-fuchsia-300'}`} />
                <span>
                  Apply for {isCoinSeller ? 'Coin Seller Agency' : 'Host Agency'}
                </span>
              </h4>
              <p className="text-[11px] text-[#C5B9DE] mt-1 leading-relaxed">
                {isCoinSeller
                  ? 'Complete your verified details below. Once Admin approves, you will get your Coin Balance, 4–5 digit Secret Transfer PIN, and instant User Search & Coin Transfer panel.'
                  : 'Complete your verified details below. Once Admin approves, you can recruit hosts, receive host requests, set % commission, coin targets, and monthly hours.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={appFullName}
                  onChange={(e) => setAppFullName(e.target.value)}
                  placeholder="Your legal full name"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">User ID *</label>
                <input
                  type="text"
                  required
                  value={appUserId}
                  onChange={(e) => setAppUserId(e.target.value)}
                  placeholder="Your Lenzo User ID"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Agency Name *</label>
                <input
                  type="text"
                  required
                  value={appAgencyName}
                  onChange={(e) => setAppAgencyName(e.target.value)}
                  placeholder={isCoinSeller ? 'e.g. Royal Coin Desk' : 'e.g. Starlight Host Agency'}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={appUsername}
                  onChange={(e) => setAppUsername(e.target.value)}
                  placeholder="@username"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={appPhone}
                  onChange={(e) => setAppPhone(e.target.value)}
                  placeholder="+923001234567"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-emerald-300 block mb-1">WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={appWhatsapp}
                  onChange={(e) => setAppWhatsapp(e.target.value)}
                  placeholder="+923001234567"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-emerald-400/30 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                  ID Card / CNIC Number *
                </label>
                <input
                  type="text"
                  required
                  value={appIdCard}
                  onChange={(e) => setAppIdCard(e.target.value)}
                  placeholder="e.g. 35202-1234567-1 (kept private — Admin only)"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white font-mono focus:outline-none focus:border-[#FFC84A]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                  Agency Description *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={600}
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder={
                    isCoinSeller
                      ? 'Describe your payment methods, city, hours, and coin selling experience...'
                      : 'Describe your host recruitment plan, target support, and agency benefits...'
                  }
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white resize-none focus:outline-none focus:border-[#FFC84A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className={`w-full py-3 rounded-2xl text-xs sm:text-sm font-black shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 ${
                isCoinSeller
                  ? 'bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611]'
                  : 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
              }`}
            >
              {isBusy
                ? 'Submitting to Admin...'
                : isCoinSeller
                  ? 'Apply for Coin Seller Agency'
                  : 'Apply for Host Agency'}
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md"
      style={{
        paddingTop: 'max(0.75rem, var(--app-safe-top))',
        paddingBottom: 'max(0.5rem, var(--app-safe-bottom))',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0E071B] border border-white/12 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-white/10 bg-[#150A28] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#FA26A0] to-[#FFC84A] text-white flex items-center justify-center shrink-0 shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">Agency Center</h3>
              <p className="text-[11px] text-[#B9AECF] truncate">
                Coin Seller Agency &amp; Host Agency Hub
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Agency Center"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Agency Primary Switcher */}
        <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#120822] border-b border-white/[0.08]">
          <button
            type="button"
            onClick={() => setAgencyTypeTab('coin_seller')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              agencyTypeTab === 'coin_seller'
                ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/20 border border-amber-400/55 text-[#FFC84A] shadow-[0_4px_14px_rgba(255,200,74,0.18)]'
                : 'bg-white/[0.04] border border-transparent text-[#B9AECF] hover:text-white'
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="truncate">Coin Seller Agency</span>
            {myCoinSeller && (
              pendingCoinOrders.length > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black leading-none shrink-0">
                  {pendingCoinOrders.length}
                </span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              )
            )}
          </button>

          <button
            type="button"
            onClick={() => setAgencyTypeTab('host_agency')}
            className={`py-2.5 px-3 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
              agencyTypeTab === 'host_agency'
                ? 'bg-gradient-to-r from-[#8B20FF]/30 to-[#FA26A0]/25 border border-[#FA26A0]/55 text-[#ff86e8] shadow-[0_4px_14px_rgba(250,38,160,0.2)]'
                : 'bg-white/[0.04] border border-transparent text-[#B9AECF] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">Host Agency</span>
            {myHostAgency && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#FA26A0] text-white text-[9px] font-black leading-none">
                {pendingHostRequests.length > 0 ? pendingHostRequests.length : 'ON'}
              </span>
            )}
          </button>
        </div>

        {/* Status / Error Alerts */}
        {statusMessage && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/45 text-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ================================================================ */}
          {/* SECTION A: COIN SELLER AGENCY                                    */}
          {/* ================================================================ */}
          {agencyTypeTab === 'coin_seller' && (
            <>
              {myCoinSeller ? (
                /* ACTIVE COIN SELLER AGENCY DASHBOARD */
                <div className="space-y-4">
                  {/* Hero Coin Balance Card */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-[#2B1948] via-[#1C0E34] to-[#120822] border border-amber-400/40 shadow-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[9px] font-black uppercase">
                            Active Coin Seller
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(myCoinSeller.agencyCode, 'Agency Code')}
                            className="px-2 py-0.5 rounded-md bg-white/10 text-[#FFC84A] text-[10px] font-mono font-bold flex items-center gap-1"
                          >
                            <span>{myCoinSeller.agencyCode}</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <h4 className="text-base font-black text-white mt-1 truncate">
                          {myCoinSeller.name}
                        </h4>
                      </div>

                      <span
                        className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 ${
                          myCoinSeller.hasPin
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-400/35'
                        }`}
                      >
                        {myCoinSeller.hasPin ? 'PIN Active' : 'Set PIN'}
                      </span>
                    </div>

                    <div className="flex items-end justify-between gap-2 pt-1">
                      <div>
                        <span className="text-[11px] text-[#C5B9DE] block">Agency Coin Balance</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black font-mono text-[#FFC84A] tabular-nums">
                            {(myCoinSeller.coinBalance || 0).toLocaleString()}
                          </span>
                          <span className="text-xs font-bold text-[#B9AECF]">Coins</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-[#A59AB8] block">Total Transferred</span>
                        <span className="text-xs font-mono font-black text-emerald-300 tabular-nums">
                          {(myCoinSeller.totalTransferredCoins || 0).toLocaleString()} Coins
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px]">
                      <span className="text-[#C5B9DE] font-mono truncate">
                        WA: <strong className="text-emerald-300">{myCoinSeller.whatsappNumber}</strong>
                      </span>
                      <span className="text-[10px] text-[#A59AB8]">
                        {myCoinSeller.isOnline ? 'Online for Buyers' : 'Away'}
                      </span>
                    </div>
                  </div>

                  {/* Owner Sub-Tabs */}
                  <div className="grid grid-cols-4 gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
                    {([
                      { id: 'slips', label: 'Slips', count: pendingCoinOrders.length, icon: Receipt },
                      { id: 'transfer', label: 'Send', count: 0, icon: Send },
                      { id: 'pin', label: 'PIN', count: 0, icon: KeyRound },
                      { id: 'history', label: 'Log', count: 0, icon: History },
                    ] as const).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setCoinSellerOwnerTab(t.id)}
                          className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all ${
                            coinSellerOwnerTab === t.id
                              ? 'bg-[#FFC84A] text-black'
                              : 'text-[#C5B9DE] hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{t.label}</span>
                          {t.count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-black leading-none">
                              {t.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* OWNER TAB 0: INCOMING BUYER PAYMENT SLIPS & ORDERS */}
                  {coinSellerOwnerTab === 'slips' && (
                    <div className="space-y-3">
                      {!myCoinSeller.hasPin && (
                        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-2.5">
                          <p className="text-[11px] text-amber-100 font-bold">
                            Set your 4–5 digit Secret PIN before confirming payment slips.
                          </p>
                          <button
                            type="button"
                            onClick={() => setCoinSellerOwnerTab('pin')}
                            className="px-3 py-1.5 rounded-xl bg-[#FFC84A] text-black text-[11px] font-black shrink-0"
                          >
                            Set PIN
                          </button>
                        </div>
                      )}

                      {incomingCoinOrders.length === 0 ? (
                        <div className="py-10 px-4 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                          <Receipt className="w-8 h-8 text-[#FFC84A]/55 mx-auto" />
                          <p className="text-xs font-black text-white">No Payment Slips Received Yet</p>
                          <p className="text-[11px] text-[#A59AB8]">
                            When buyers send coin payment slips from your Home Page card, they appear here for instant PIN confirmation.
                          </p>
                        </div>
                      ) : (
                        incomingCoinOrders.map((order) => {
                          const isPending = order.status === 'pending';
                          const isExpanded = confirmingOrderId === order.id;
                          const buyerWaUrl = order.buyerWhatsapp
                            ? buildWhatsAppUrl(
                                order.buyerWhatsapp,
                                `Salam ${order.buyerName}! Regarding your Lenzo coin order #${order.id.slice(-6).toUpperCase()} (${order.coinsRequested.toLocaleString()} coins) with ${myCoinSeller.name}.`
                              )
                            : '';

                          return (
                            <div
                              key={order.id}
                              className={`p-3.5 rounded-2xl border space-y-2.5 ${
                                isPending
                                  ? 'bg-[#190D30] border-amber-400/45 shadow-lg'
                                  : 'bg-[#140A24] border-white/10 opacity-90'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-white truncate">
                                      {order.buyerName}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-[#FFC84A]">
                                      ID: {order.buyerDisplayId}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#B9AECF] truncate mt-0.5">
                                    #{order.id.slice(-6).toUpperCase()} · {order.paymentMethod}
                                    {order.paidAmountText ? ` · ${order.paidAmountText}` : ''} ·{' '}
                                    {new Date(order.createdAt).toLocaleString()}
                                  </p>
                                </div>

                                <span
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase shrink-0 ${
                                    order.status === 'confirmed'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                      : order.status === 'rejected'
                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-400/40'
                                        : order.status === 'cancelled'
                                          ? 'bg-white/10 text-[#B9AECF]'
                                          : 'bg-amber-500/20 text-[#FFC84A] border border-amber-400/45'
                                  }`}
                                >
                                  {order.status === 'confirmed'
                                    ? `Sent ${(order.coinsSent || order.coinsRequested).toLocaleString()}`
                                    : order.status}
                                </span>
                              </div>

                              {/* Requested Coins + Ref + Slip Preview */}
                              <div className="p-2.5 rounded-xl bg-black/35 border border-white/[0.06] flex items-center justify-between gap-3">
                                <div className="min-w-0 space-y-0.5">
                                  <p className="text-sm font-mono font-black text-[#FFC84A] tabular-nums">
                                    {order.coinsRequested.toLocaleString()} Coins Requested
                                  </p>
                                  {order.transactionRef && (
                                    <p className="text-[10px] font-mono text-cyan-200 truncate">
                                      TID / Ref: {order.transactionRef}
                                    </p>
                                  )}
                                  {order.buyerNote && (
                                    <p className="text-[11px] text-[#D8CEE8] line-clamp-2">
                                      Note: {order.buyerNote}
                                    </p>
                                  )}
                                </div>

                                {order.paymentSlipUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setSlipLightboxUrl(order.paymentSlipUrl || null)}
                                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-amber-400/50 shrink-0 group"
                                  >
                                    <img
                                      src={order.paymentSlipUrl}
                                      alt="Buyer Payment Slip"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <span className="absolute inset-x-0 bottom-0 bg-black/75 text-[9px] font-black text-white py-0.5 text-center">
                                      View Slip
                                    </span>
                                  </button>
                                )}
                              </div>

                              {/* Contact Buyer + Action Buttons */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.paymentSlipUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setSlipLightboxUrl(order.paymentSlipUrl || null)}
                                    className="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <ImageIcon className="w-3 h-3" />
                                    <span>Slip</span>
                                  </button>
                                )}
                                {buyerWaUrl && (
                                  <a
                                    href={buyerWaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 text-[10px] font-bold flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInAppContact({
                                      uid: order.buyerUid,
                                      name: order.buyerName,
                                      username: order.buyerUsername,
                                      displayId: order.buyerDisplayId,
                                      avatar: order.buyerAvatar,
                                    })
                                  }
                                  className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-[10px] font-bold flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>In-App Chat</span>
                                </button>

                                {isPending && !isExpanded && (
                                  <button
                                    type="button"
                                    onClick={() => openSlipConfirmForm(order)}
                                    className="ml-auto px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-[11px] font-black flex items-center gap-1 shadow"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Confirm &amp; Send Coins</span>
                                  </button>
                                )}
                              </div>

                              {/* Inline PIN Confirmation Drawer */}
                              {isPending && isExpanded && (
                                <div className="p-3 rounded-xl bg-black/50 border border-amber-400/40 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-[#C5B9DE] block mb-1">
                                        Coins to Send *
                                      </label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={orderCoinsToSend}
                                        onChange={(e) => setOrderCoinsToSend(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-white/[0.07] border border-white/15 text-xs font-mono font-black text-[#FFC84A]"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] font-bold text-[#FFC84A] block mb-1">
                                        Secret PIN (4–5 Digits) *
                                      </label>
                                      <input
                                        type="password"
                                        inputMode="numeric"
                                        maxLength={5}
                                        value={orderConfirmPin}
                                        onChange={(e) =>
                                          setOrderConfirmPin(
                                            e.target.value.replace(/[^0-9]/g, '').slice(0, 5)
                                          )
                                        }
                                        placeholder="••••"
                                        className="w-full px-2.5 py-2 rounded-lg bg-white/[0.07] border border-amber-400/45 text-xs font-mono tracking-[0.25em] text-white"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-[#C5B9DE] block mb-1">
                                      Confirmation Note (Optional)
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={200}
                                      value={orderSellerNote}
                                      onChange={(e) => setOrderSellerNote(e.target.value)}
                                      placeholder="e.g. Slip verified, coins credited!"
                                      className="w-full px-2.5 py-2 rounded-lg bg-white/[0.07] border border-white/15 text-xs text-white"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleConfirmSlipOrder(order)}
                                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black flex items-center justify-center gap-1 disabled:opacity-50"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>{isBusy ? 'Sending...' : 'Confirm & Send'}</span>
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleRejectSlipOrder(order)}
                                      className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      <span>Reject</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmingOrderId(null)}
                                      className="px-2.5 py-2 rounded-xl bg-white/10 text-[#C5B9DE] text-xs font-bold"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* OWNER TAB 1: SEARCH USER & TRANSFER COINS */}
                  {coinSellerOwnerTab === 'transfer' && (
                    <div className="space-y-4">
                      {!myCoinSeller.hasPin && (
                        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-between gap-3">
                          <div className="text-xs text-amber-100">
                            <p className="font-black">Create Your 4–5 Digit Transfer PIN First</p>
                            <p className="text-[11px] text-amber-200/85 mt-0.5">
                              Set your own personal secret PIN (not OTP) before transferring coins.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCoinSellerOwnerTab('pin')}
                            className="px-3 py-2 rounded-xl bg-[#FFC84A] text-black text-xs font-black shrink-0"
                          >
                            Set PIN
                          </button>
                        </div>
                      )}

                      {/* Search Recipient Box */}
                      <form onSubmit={handleSearchRecipient} className="space-y-2">
                        <label className="text-xs font-black text-white block">
                          Find Recipient (User ID, Username, Name, or Email)
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 min-w-0">
                            <Search className="w-4 h-4 text-[#A59AB8] absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={recipientQuery}
                              onChange={(e) => setRecipientQuery(e.target.value)}
                              placeholder="Search ID, @username, name, or email..."
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-xs text-white focus:outline-none focus:border-[#FFC84A]"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={searchingUsers}
                            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-black shrink-0 disabled:opacity-50"
                          >
                            {searchingUsers ? '...' : 'Search'}
                          </button>
                        </div>
                      </form>

                      {/* Search Results */}
                      {hasSearchedOnce && !selectedRecipient && (
                        <div className="space-y-2">
                          {searchResults.length === 0 ? (
                            <p className="text-xs text-[#A59AB8] text-center py-5 rounded-2xl bg-white/[0.03] border border-white/10">
                              No user matched &ldquo;{recipientQuery}&rdquo;. Try exact User ID, username, name, or email.
                            </p>
                          ) : (
                            searchResults.map((cand) => (
                              <button
                                key={cand.uid}
                                type="button"
                                onClick={() => setSelectedRecipient(cand)}
                                className="w-full p-3 rounded-2xl bg-[#170C2B] hover:bg-[#20113B] border border-white/10 hover:border-[#FFC84A]/50 flex items-center justify-between gap-3 text-left transition-all"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={
                                      cand.avatar ||
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(cand.fullName)}&background=8B20FF&color=fff`
                                    }
                                    alt={cand.fullName}
                                    className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{cand.fullName}</p>
                                    <p className="text-[11px] text-[#C5B9DE] truncate">
                                      {cand.username} · ID:{' '}
                                      <span className="font-mono text-[#FFC84A]">{cand.displayId}</span>
                                    </p>
                                    {cand.email && (
                                      <p className="text-[10px] text-[#9A8DB3] truncate">{cand.email}</p>
                                    )}
                                  </div>
                                </div>
                                <span className="px-3 py-1.5 rounded-xl bg-[#FFC84A] text-black text-[11px] font-black shrink-0">
                                  Select
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* Selected Recipient Transfer Form */}
                      {selectedRecipient && (
                        <form
                          onSubmit={handleExecuteCoinTransfer}
                          className="p-4 rounded-2xl bg-[#180C2F] border border-amber-400/40 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/10">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img
                                src={
                                  selectedRecipient.avatar ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedRecipient.fullName)}&background=8B20FF&color=fff`
                                }
                                alt={selectedRecipient.fullName}
                                className="w-10 h-10 rounded-full object-cover border border-amber-400/50 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white truncate">
                                  {selectedRecipient.fullName}
                                </p>
                                <p className="text-[11px] text-[#FFC84A] font-mono truncate">
                                  ID: {selectedRecipient.displayId} · {selectedRecipient.username}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedRecipient(null)}
                              className="text-[11px] font-bold text-rose-300 hover:text-white shrink-0"
                            >
                              Change
                            </button>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              Coins to Transfer *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={myCoinSeller.coinBalance}
                              required
                              value={transferAmount}
                              onChange={(e) => setTransferAmount(e.target.value)}
                              placeholder="Enter coin amount"
                              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-sm font-mono font-black text-[#FFC84A] focus:outline-none focus:border-[#FFC84A]"
                            />
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                              {[500, 1000, 5000, 10000].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setTransferAmount(String(preset))}
                                  className="px-2.5 py-1 rounded-lg bg-white/[0.07] hover:bg-amber-500/25 text-[11px] font-mono font-bold text-white"
                                >
                                  +{preset.toLocaleString()}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-amber-300 flex items-center gap-1 mb-1">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Personal Secret Transfer PIN (4–5 Digits, Not OTP) *</span>
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={5}
                              required
                              value={transferPin}
                              onChange={(e) => setTransferPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                              placeholder="Enter your 4 or 5 digit PIN"
                              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-amber-400/35 text-sm font-mono tracking-[0.35em] text-white focus:outline-none focus:border-[#FFC84A]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              Transfer Note (Optional)
                            </label>
                            <input
                              type="text"
                              maxLength={120}
                              value={transferNote}
                              onChange={(e) => setTransferNote(e.target.value)}
                              placeholder="e.g. Paid via JazzCash / EasyPaisa"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white focus:outline-none"
                            />
                          </div>

                          <button
                            type="submit"
                            disabled={isBusy}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            <span>
                              {isBusy
                                ? 'Verifying PIN & Sending...'
                                : `Transfer ${Number(transferAmount || 0).toLocaleString()} Coins`}
                            </span>
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* OWNER TAB 2: PERSONAL SECRET PIN & WHATSAPP SETTINGS */}
                  {coinSellerOwnerTab === 'pin' && (
                    <div className="space-y-4">
                      {/* Secret PIN Setup / Update */}
                      <form
                        onSubmit={handleSavePin}
                        className="p-4 rounded-2xl bg-[#170C2B] border border-amber-400/30 space-y-3"
                      >
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-[#FFC84A]" />
                          <h4 className="text-xs font-black text-white">
                            {myCoinSeller.hasPin ? 'Update Personal Transfer PIN' : 'Create Personal Secret Transfer PIN'}
                          </h4>
                        </div>
                        <p className="text-[11px] text-[#B9AECF] leading-relaxed">
                          Choose your own secret <strong>4 or 5 digit PIN</strong>. This is your personal PIN (not an OTP) and is required every time you transfer coins to any user.
                        </p>

                        {myCoinSeller.hasPin && (
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              Current PIN *
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={5}
                              required
                              value={currentPinInput}
                              onChange={(e) =>
                                setCurrentPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))
                              }
                              placeholder="Current 4–5 digit PIN"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs font-mono tracking-[0.3em] text-white"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              New PIN (4–5 Digits) *
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={5}
                              required
                              value={newPinInput}
                              onChange={(e) =>
                                setNewPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))
                              }
                              placeholder="••••"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs font-mono tracking-[0.3em] text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              Confirm PIN *
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={5}
                              required
                              value={confirmPinInput}
                              onChange={(e) =>
                                setConfirmPinInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))
                              }
                              placeholder="••••"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs font-mono tracking-[0.3em] text-white"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={isBusy}
                          className="w-full py-2.5 rounded-xl bg-[#FFC84A] text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{myCoinSeller.hasPin ? 'Update Secret PIN' : 'Save Secret PIN'}</span>
                        </button>
                      </form>

                      {/* WhatsApp & Agency Profile Settings */}
                      <div className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3">
                        <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp &amp; Agency Contact Profile</span>
                        </h4>
                        <div className="space-y-2.5">
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Agency Name</label>
                            <input
                              type="text"
                              value={csEditName}
                              onChange={(e) => setCsEditName(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                              WhatsApp Number (with country code)
                            </label>
                            <input
                              type="tel"
                              value={csEditWhatsapp}
                              onChange={(e) => setCsEditWhatsapp(e.target.value)}
                              placeholder="+923001234567"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-400/35 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Description</label>
                            <textarea
                              rows={2}
                              value={csEditDesc}
                              onChange={(e) => setCsEditDesc(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white resize-none"
                            />
                          </div>
                          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                            <input
                              type="checkbox"
                              checked={csEditOnline}
                              onChange={(e) => setCsEditOnline(e.target.checked)}
                            />
                            <span>Show Online &amp; Available to Coin Buyers</span>
                          </label>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => void handleSaveAgencySettings('coin_seller')}
                            className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save WhatsApp &amp; Profile</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OWNER TAB 3: COIN TRANSFER HISTORY */}
                  {coinSellerOwnerTab === 'history' && (
                    <div className="space-y-2.5">
                      {myTransfers.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <History className="w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No coin transfers yet</p>
                          <p className="text-[11px] text-[#A59AB8]">
                            Every verified coin transfer you send will be logged here.
                          </p>
                        </div>
                      ) : (
                        myTransfers.map((tx) => (
                          <div
                            key={tx.id}
                            className="p-3 rounded-2xl bg-[#170C2B] border border-white/10 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-white truncate">
                                To: {tx.recipientName} ({tx.recipientDisplayId})
                              </p>
                              <p className="text-[10px] text-[#B9AECF] truncate">
                                {tx.recipientUsername} · {new Date(tx.createdAt).toLocaleString()}
                              </p>
                              {tx.note && (
                                <p className="text-[10px] text-amber-200/85 truncate mt-0.5">{tx.note}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="text-xs font-mono font-black text-[#FFC84A] tabular-nums block">
                                -{tx.amount.toLocaleString()} 🪙
                              </span>
                              <span className="text-[10px] font-mono text-[#A59AB8] tabular-nums">
                                Bal: {tx.balanceAfter.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* GUEST COIN SELLER VIEW: APPLY OR BROWSE VERIFIED COIN SELLERS */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-1.5 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => setCoinSellerGuestTab('apply')}
                      className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                        coinSellerGuestTab === 'apply'
                          ? 'bg-[#FFC84A] text-black'
                          : 'text-[#C5B9DE] hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Apply for Agency</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoinSellerGuestTab('directory')}
                      className={`py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 ${
                        coinSellerGuestTab === 'directory'
                          ? 'bg-[#FFC84A] text-black'
                          : 'text-[#C5B9DE] hover:text-white'
                      }`}
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Coin Sellers ({activeCoinSellers.length})</span>
                    </button>
                  </div>

                  {coinSellerGuestTab === 'apply' ? (
                    renderApplicationForm('coin_seller')
                  ) : (
                    <div className="space-y-3">
                      {activeCoinSellers.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <Coins className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No Coin Seller Agencies active yet</p>
                          <p className="text-[11px] text-[#B9AECF] mt-0.5">
                            Apply now to become an official verified Coin Seller Agency!
                          </p>
                        </div>
                      ) : (
                        activeCoinSellers.map((agency) => {
                          const waUrl = buildWhatsAppUrl(
                            agency.whatsappNumber,
                            `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to buy Lenzo Coins. My Lenzo ID is ${currentUser.displayId}.`
                          );
                          return (
                            <div
                              key={agency.id}
                              className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-black text-white truncate">{agency.name}</h4>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-[#FFC84A]">
                                      {agency.agencyCode}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#B9AECF]">
                                    Owner: <strong className="text-white">{agency.ownerName}</strong> ·{' '}
                                    {agency.ownerUsername}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                    agency.isOnline
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-white/10 text-gray-400'
                                  }`}
                                >
                                  {agency.isOnline ? 'Online' : 'Away'}
                                </span>
                              </div>

                              {agency.description && (
                                <p className="text-xs text-[#D5CBE8] leading-relaxed">{agency.description}</p>
                              )}

                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {waUrl ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                ) : (
                                  <div />
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInAppContact({
                                      uid: agency.ownerUid,
                                      name: agency.ownerName,
                                      username: agency.ownerUsername,
                                      displayId: agency.ownerDisplayId,
                                      avatar: agency.ownerAvatar,
                                    })
                                  }
                                  className="py-2.5 rounded-xl bg-[#8B20FF]/30 hover:bg-[#8B20FF]/45 border border-[#8B20FF]/50 text-white text-xs font-black flex items-center justify-center gap-1.5"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>In-App Chat</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ================================================================ */}
          {/* SECTION B: HOST AGENCY                                           */}
          {/* ================================================================ */}
          {agencyTypeTab === 'host_agency' && (
            <>
              {myHostAgency ? (
                /* ACTIVE HOST AGENCY DASHBOARD */
                <div className="space-y-4">
                  {/* Host Agency Summary Header */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-[#2E114B] via-[#1C0B35] to-[#120822] border border-[#FA26A0]/40 shadow-xl space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 text-[9px] font-black uppercase">
                            Active Host Agency
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(myHostAgency.agencyCode, 'Agency Code')}
                            className="px-2 py-0.5 rounded-md bg-white/10 text-[#FFC84A] text-[10px] font-mono font-bold flex items-center gap-1"
                          >
                            <span>{myHostAgency.agencyCode}</span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <h4 className="text-base font-black text-white mt-1 truncate">
                          {myHostAgency.name}
                        </h4>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="p-3 rounded-2xl bg-black/35 border border-white/10">
                        <span className="text-[10px] text-[#C5B9DE] block">Total Active Hosts</span>
                        <span className="text-2xl font-black font-mono text-white tabular-nums">
                          {acceptedHosts.length}
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl bg-black/35 border border-white/10">
                        <span className="text-[10px] text-[#C5B9DE] block">Pending Requests</span>
                        <span className="text-2xl font-black font-mono text-[#ff86e8] tabular-nums">
                          {pendingHostRequests.length}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] text-[#C5B9DE] font-mono pt-1 border-t border-white/10">
                      WhatsApp: <strong className="text-emerald-300">{myHostAgency.whatsappNumber}</strong>
                    </div>
                  </div>

                  {/* Host Agency Owner Sub-Tabs */}
                  <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
                    {([
                      { id: 'pending', label: `Pending (${pendingHostRequests.length})` },
                      { id: 'hosts', label: `Hosts (${acceptedHosts.length})` },
                      { id: 'settings', label: 'WhatsApp' },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setHostAgencyOwnerTab(t.id)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all ${
                          hostAgencyOwnerTab === t.id
                            ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                            : 'text-[#C5B9DE] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* OWNER TAB 1: PENDING HOST REQUESTS */}
                  {hostAgencyOwnerTab === 'pending' && (
                    <div className="space-y-3">
                      {pendingHostRequests.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <Clock className="w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No pending host requests</p>
                          <p className="text-[11px] text-[#A59AB8] mt-0.5">
                            When hosts apply to join your agency, they appear here for contact &amp; deal confirmation.
                          </p>
                        </div>
                      ) : (
                        pendingHostRequests.map((req) => {
                          const waUrl = buildWhatsAppUrl(
                            req.hostWhatsapp,
                            `Assalam-o-Alaikum ${req.hostName}, this is ${myHostAgency.name} (${myHostAgency.agencyCode}). Let's finalize your host deal & monthly target!`
                          );
                          const isEditingThis = dealEditingReqId === req.id;

                          return (
                            <div
                              key={req.id}
                              className="p-4 rounded-2xl bg-[#170C2B] border border-fuchsia-400/25 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={
                                      req.hostAvatar ||
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(req.hostName)}&background=FA26A0&color=fff`
                                    }
                                    alt={req.hostName}
                                    className="w-10 h-10 rounded-full object-cover border border-white/15 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{req.hostName}</p>
                                    <p className="text-[11px] text-[#C5B9DE] truncate">
                                      {req.hostUsername} · ID: <span className="font-mono text-[#FFC84A]">{req.hostDisplayId}</span>
                                    </p>
                                    <p className="text-[10px] font-mono text-emerald-300">{req.hostWhatsapp}</p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-black uppercase shrink-0">
                                  Pending
                                </span>
                              </div>

                              {req.message && (
                                <p className="text-xs text-[#D8CEE8] bg-black/30 rounded-xl p-2.5 border border-white/5">
                                  &ldquo;{req.message}&rdquo;
                                </p>
                              )}

                              {/* Contact Host Buttons (WhatsApp + In-App) */}
                              <div className="grid grid-cols-2 gap-2">
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-2 rounded-xl bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-extrabold flex items-center justify-center gap-1.5"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp Host</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInAppContact({
                                      uid: req.hostUid,
                                      name: req.hostName,
                                      username: req.hostUsername,
                                      displayId: req.hostDisplayId,
                                      avatar: req.hostAvatar,
                                    })
                                  }
                                  className="py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[11px] font-extrabold flex items-center justify-center gap-1.5"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>In-App Chat</span>
                                </button>
                              </div>

                              {/* Inline Deal Finalization Panel */}
                              {isEditingThis ? (
                                <div className="p-3 rounded-xl bg-black/45 border border-[#FFC84A]/35 space-y-2.5">
                                  <p className="text-[11px] font-black text-[#FFC84A]">
                                    Finalize Host Deal &amp; Target
                                  </p>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Commission %</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={dealPercentInput}
                                        onChange={(e) => setDealPercentInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Target Coins</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={dealTargetCoinsInput}
                                        onChange={(e) => setDealTargetCoinsInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Hours / Mo</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="744"
                                        value={dealTargetHoursInput}
                                        onChange={(e) => setDealTargetHoursInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={dealNotesInput}
                                    onChange={(e) => setDealNotesInput(e.target.value)}
                                    placeholder="Deal notes (e.g. Live 2 hrs daily, payout on 1st of month)"
                                    className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleConfirmHostDeal(req)}
                                      className="flex-1 py-2 rounded-xl bg-emerald-500 text-black text-xs font-black"
                                    >
                                      {isBusy ? 'Saving...' : 'Accept & Confirm Deal'}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDealEditingReqId(null)}
                                      className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => openDealEditor(req)}
                                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black"
                                  >
                                    Accept &amp; Set Deal
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleRejectOrRemoveHost(req, 'rejected')}
                                    className="px-4 py-2.5 rounded-xl bg-rose-600/25 border border-rose-400/35 text-rose-200 text-xs font-black"
                                  >
                                    Reject
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* OWNER TAB 2: ACTIVE HOSTS & TARGET MANAGEMENT */}
                  {hostAgencyOwnerTab === 'hosts' && (
                    <div className="space-y-3">
                      {acceptedHosts.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <Users className="w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No active hosts yet</p>
                          <p className="text-[11px] text-[#A59AB8]">
                            Accept incoming host requests to build your roster and assign monthly targets.
                          </p>
                        </div>
                      ) : (
                        acceptedHosts.map((host) => {
                          const waUrl = buildWhatsAppUrl(
                            host.hostWhatsapp,
                            `Hello ${host.hostName}, checking in from ${myHostAgency.name} regarding your target (${host.dealTargetCoins.toLocaleString()} coins / ${host.dealTargetHours} hrs).`
                          );
                          const isEditingThis = dealEditingReqId === host.id;

                          return (
                            <div
                              key={host.id}
                              className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <img
                                    src={
                                      host.hostAvatar ||
                                      `https://ui-avatars.com/api/?name=${encodeURIComponent(host.hostName)}&background=8B20FF&color=fff`
                                    }
                                    alt={host.hostName}
                                    className="w-10 h-10 rounded-full object-cover border border-emerald-400/40 shrink-0"
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-black text-white truncate">{host.hostName}</p>
                                    <p className="text-[11px] text-[#C5B9DE] truncate">
                                      {host.hostUsername} · ID: <span className="font-mono text-[#FFC84A]">{host.hostDisplayId}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase shrink-0">
                                  Active Host
                                </span>
                              </div>

                              {/* Deal Terms Metrics */}
                              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/35 border border-white/5 text-center">
                                <div>
                                  <span className="text-[10px] text-[#A59AB8] flex items-center justify-center gap-1">
                                    <Percent className="w-3 h-3 text-fuchsia-300" />
                                    Share
                                  </span>
                                  <span className="text-xs font-mono font-black text-white tabular-nums">
                                    {host.dealCommissionPercent}%
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#A59AB8] flex items-center justify-center gap-1">
                                    <Target className="w-3 h-3 text-[#FFC84A]" />
                                    Target
                                  </span>
                                  <span className="text-xs font-mono font-black text-[#FFC84A] tabular-nums">
                                    {host.dealTargetCoins.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-[#A59AB8] flex items-center justify-center gap-1">
                                    <Timer className="w-3 h-3 text-sky-300" />
                                    Time
                                  </span>
                                  <span className="text-xs font-mono font-black text-sky-300 tabular-nums">
                                    {host.dealTargetHours} hrs
                                  </span>
                                </div>
                              </div>

                              {host.dealNotes && (
                                <p className="text-[11px] text-[#C5B9DE]">Deal Note: {host.dealNotes}</p>
                              )}

                              {isEditingThis ? (
                                <div className="p-3 rounded-xl bg-black/45 border border-[#FFC84A]/35 space-y-2.5">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Commission %</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={dealPercentInput}
                                        onChange={(e) => setDealPercentInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Target Coins</label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={dealTargetCoinsInput}
                                        onChange={(e) => setDealTargetCoinsInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-[#C5B9DE] block mb-1">Hours / Mo</label>
                                      <input
                                        type="number"
                                        min="0"
                                        max="744"
                                        value={dealTargetHoursInput}
                                        onChange={(e) => setDealTargetHoursInput(e.target.value)}
                                        className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs font-mono text-white"
                                      />
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={dealNotesInput}
                                    onChange={(e) => setDealNotesInput(e.target.value)}
                                    placeholder="Deal notes"
                                    className="w-full px-2.5 py-2 rounded-lg bg-black/60 border border-white/15 text-xs text-white"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() => void handleConfirmHostDeal(host)}
                                      className="flex-1 py-2 rounded-xl bg-[#FFC84A] text-black text-xs font-black"
                                    >
                                      Save Target &amp; Deal
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDealEditingReqId(null)}
                                      className="px-3 py-2 rounded-xl bg-white/10 text-white text-xs font-bold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {waUrl && (
                                    <a
                                      href={waUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-3 py-2 rounded-xl bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      <span>WA</span>
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleInAppContact({
                                        uid: host.hostUid,
                                        name: host.hostName,
                                        username: host.hostUsername,
                                        displayId: host.hostDisplayId,
                                        avatar: host.hostAvatar,
                                      })
                                    }
                                    className="px-3 py-2 rounded-xl bg-white/10 text-white text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>Chat</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openDealEditor(host)}
                                    className="flex-1 py-2 rounded-xl bg-[#8B20FF]/30 border border-[#8B20FF]/50 text-white text-[11px] font-black flex items-center justify-center gap-1"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Target</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleRejectOrRemoveHost(host, 'removed')}
                                    className="p-2 rounded-xl bg-rose-500/20 text-rose-300"
                                    title="Remove Host"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* OWNER TAB 3: HOST AGENCY WHATSAPP & SETTINGS */}
                  {hostAgencyOwnerTab === 'settings' && (
                    <div className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3">
                      <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span>Host Agency WhatsApp &amp; Contact Settings</span>
                      </h4>
                      <div className="space-y-2.5">
                        <div>
                          <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Agency Name</label>
                          <input
                            type="text"
                            value={haEditName}
                            onChange={(e) => setHaEditName(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                            WhatsApp Number (for Host Recruitment)
                          </label>
                          <input
                            type="tel"
                            value={haEditWhatsapp}
                            onChange={(e) => setHaEditWhatsapp(e.target.value)}
                            placeholder="+923001234567"
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-400/35 text-xs font-mono text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">Description</label>
                          <textarea
                            rows={2}
                            value={haEditDesc}
                            onChange={(e) => setHaEditDesc(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white resize-none"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={haEditOnline}
                            onChange={(e) => setHaEditOnline(e.target.checked)}
                          />
                          <span>Accepting New Host Requests</span>
                        </label>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleSaveAgencySettings('host_agency')}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Host Agency Settings</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* GUEST HOST AGENCY VIEW: BROWSE/JOIN, MY REQUESTS/DEALS, OR APPLY FOR OWN HOST AGENCY */
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-1.5 bg-white/[0.04] p-1 rounded-2xl border border-white/10">
                    {([
                      { id: 'directory', label: `Agencies (${activeHostAgencies.length})` },
                      { id: 'my_deals', label: `My Deals (${myHostRequests.length})` },
                      { id: 'apply', label: 'Apply Agency' },
                    ] as const).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setHostAgencyGuestTab(t.id)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-extrabold transition-all ${
                          hostAgencyGuestTab === t.id
                            ? 'bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white'
                            : 'text-[#C5B9DE] hover:text-white'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* GUEST TAB 1: HOST AGENCIES DIRECTORY + SEND JOIN REQUEST */}
                  {hostAgencyGuestTab === 'directory' && (
                    <div className="space-y-3">
                      {joiningHostAgency && (
                        <form
                          onSubmit={handleSendHostRequest}
                          className="p-4 rounded-2xl bg-[#1D0E36] border border-[#FA26A0]/50 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-black text-white">
                              Join Request → {joiningHostAgency.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => setJoiningHostAgency(null)}
                              className="text-[11px] font-bold text-rose-300"
                            >
                              Cancel
                            </button>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-emerald-300 block mb-1">
                              Your WhatsApp Number *
                            </label>
                            <input
                              type="tel"
                              required
                              value={hostJoinWhatsapp}
                              onChange={(e) => setHostJoinWhatsapp(e.target.value)}
                              placeholder="+923001234567"
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-emerald-400/35 text-xs font-mono text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-[#C5B9DE] block mb-1">
                              Message / Hosting Schedule
                            </label>
                            <textarea
                              rows={2}
                              value={hostJoinMessage}
                              onChange={(e) => setHostJoinMessage(e.target.value)}
                              placeholder="Introduce yourself and share how many hours you can host..."
                              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white resize-none"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isBusy}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-black"
                          >
                            {isBusy ? 'Sending Request...' : 'Send Host Join Request'}
                          </button>
                        </form>
                      )}

                      {activeHostAgencies.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <Users className="w-8 h-8 text-fuchsia-400/60 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No Host Agencies active yet</p>
                          <p className="text-[11px] text-[#B9AECF] mt-0.5">
                            Tap &ldquo;Apply Agency&rdquo; to launch your own verified Host Agency!
                          </p>
                        </div>
                      ) : (
                        activeHostAgencies.map((agency) => {
                          const waUrl = buildWhatsAppUrl(
                            agency.whatsappNumber,
                            `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to join your Host Agency on Lenzo Party. My ID is ${currentUser.displayId}.`
                          );
                          const existingReq = myHostRequests.find(
                            (r) =>
                              r.agencyId === agency.id &&
                              (r.status === 'pending' || r.status === 'accepted')
                          );

                          return (
                            <div
                              key={agency.id}
                              className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-black text-white truncate">{agency.name}</h4>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-200">
                                      {agency.agencyCode}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[#B9AECF]">
                                    Holder: <strong className="text-white">{agency.ownerName}</strong> ·{' '}
                                    {agency.totalHosts || 0} Active Hosts
                                  </p>
                                </div>
                              </div>

                              {agency.description && (
                                <p className="text-xs text-[#D5CBE8] leading-relaxed">{agency.description}</p>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 rounded-xl bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-black flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInAppContact({
                                      uid: agency.ownerUid,
                                      name: agency.ownerName,
                                      username: agency.ownerUsername,
                                      displayId: agency.ownerDisplayId,
                                      avatar: agency.ownerAvatar,
                                    })
                                  }
                                  className="px-3 py-2 rounded-xl bg-white/10 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>In-App</span>
                                </button>

                                {existingReq ? (
                                  <span
                                    className={`flex-1 py-2 rounded-xl text-center text-[11px] font-black ${
                                      existingReq.status === 'accepted'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                                        : 'bg-sky-500/20 text-sky-300 border border-sky-400/35'
                                    }`}
                                  >
                                    {existingReq.status === 'accepted' ? 'Joined ✓' : 'Request Pending'}
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setJoiningHostAgency(agency)}
                                    className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-[11px] font-black flex items-center justify-center gap-1"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Request to Join</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* GUEST TAB 2: MY HOST REQUESTS & FINALIZED DEALS */}
                  {hostAgencyGuestTab === 'my_deals' && (
                    <div className="space-y-3">
                      {myHostRequests.length === 0 ? (
                        <div className="py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10">
                          <FileText className="w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" />
                          <p className="text-xs font-bold text-white">No host agency requests yet</p>
                          <p className="text-[11px] text-[#A59AB8] mt-0.5">
                            Browse Host Agencies and send a request to negotiate your target &amp; commission deal.
                          </p>
                        </div>
                      ) : (
                        myHostRequests.map((req) => {
                          const waUrl = buildWhatsAppUrl(
                            req.agencyWhatsapp,
                            `Hello ${req.agencyName}, this is ${currentUser.name} (ID: ${currentUser.displayId}) regarding my host agency request.`
                          );
                          return (
                            <div
                              key={req.id}
                              className="p-4 rounded-2xl bg-[#170C2B] border border-white/10 space-y-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-black text-white truncate">{req.agencyName}</h4>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    req.status === 'accepted'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : req.status === 'pending'
                                        ? 'bg-sky-500/20 text-sky-300'
                                        : 'bg-rose-500/20 text-rose-300'
                                  }`}
                                >
                                  {req.status}
                                </span>
                              </div>

                              {req.status === 'accepted' && (
                                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-400/30 text-center">
                                  <div>
                                    <span className="text-[10px] text-emerald-200/80 block">Commission</span>
                                    <span className="text-xs font-mono font-black text-white">
                                      {req.dealCommissionPercent}%
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-emerald-200/80 block">Target</span>
                                    <span className="text-xs font-mono font-black text-[#FFC84A]">
                                      {req.dealTargetCoins.toLocaleString()}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-emerald-200/80 block">Monthly Time</span>
                                    <span className="text-xs font-mono font-black text-sky-300">
                                      {req.dealTargetHours} hrs
                                    </span>
                                  </div>
                                </div>
                              )}

                              {req.dealNotes && (
                                <p className="text-[11px] text-[#D8CEE8]">Deal Notes: {req.dealNotes}</p>
                              )}

                              <div className="flex items-center gap-2">
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-2 rounded-xl bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleInAppContact({
                                      uid: req.agencyOwnerUid,
                                      name: req.agencyName,
                                    })
                                  }
                                  className="px-3 py-2 rounded-xl bg-white/10 text-white text-[11px] font-bold flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  <span>In-App Chat</span>
                                </button>
                                {req.status === 'pending' && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => void handleCancelMyHostRequest(req.id)}
                                    className="ml-auto px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 text-[11px] font-bold"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* GUEST TAB 3: APPLY FOR OWN HOST AGENCY */}
                  {hostAgencyGuestTab === 'apply' && renderApplicationForm('host_agency')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Slip Fullscreen Preview Lightbox */}
      {slipLightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4"
          onClick={() => setSlipLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setSlipLightboxUrl(null)}
            aria-label="Close Slip Preview"
            className="absolute top-6 right-5 w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={slipLightboxUrl}
            alt="Buyer Payment Slip"
            className="max-w-full max-h-[82vh] rounded-2xl object-contain border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
