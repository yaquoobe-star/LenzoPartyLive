import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Wallet as WalletIcon, 
  TrendingUp, 
  Coins, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Sparkles, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  RefreshCw, 
  ArrowRightLeft, 
  Zap, 
  Sliders, 
  DollarSign, 
  Percent, 
  FileText, 
  Check, 
  ExternalLink,
  ChevronDown,
  Filter,
  Store,
  Phone,
  MessageCircle,
  Copy,
  MapPin,
  Search,
  Lock,
  ArrowLeft,
  BadgeCheck,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import { 
  UserProfile, 
  UserWalletData, 
  UserEarningsData, 
  WalletSettings, 
  WalletRechargePackage, 
  FinancialTransaction, 
  WithdrawalRequest,
  WithdrawalStatus,
  CoinSellerAgency
} from '../../types';
import { 
  subscribeWalletSettings, 
  subscribeCoinPackages, 
  subscribeCoinSellerAgencies,
  saveCoinSellerAgency,
  deleteCoinSellerAgency,
  subscribeUserWallet, 
  subscribeUserEarnings, 
  subscribeTransactions, 
  subscribeAllWithdrawalRequests, 
  convertEarningsToWallet, 
  requestWithdrawal, 
  adminUpdateWithdrawalStatus,
  updateWalletSettings,
  saveCoinPackage,
  adminAdjustBalance,
  DEFAULT_WALLET_SETTINGS,
  DEFAULT_COIN_PACKAGES,
  DEFAULT_PAYOUT_METHODS
} from '../../services/walletService';
import { auth } from '../../firebase';
import { subscribeActiveAgencies, DualAgencyRecord } from '../../services/agencyService';

function sanitizePhoneDigits(raw: string): string {
  return (raw || '').replace(/[^0-9]/g, '');
}

function buildSafeWhatsAppUrl(phone: string, message: string): string {
  const digits = sanitizePhoneDigits(phone);
  if (!digits) return '#';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildSafeTelUrl(phone: string): string {
  const digits = sanitizePhoneDigits(phone);
  if (!digits) return '#';
  return `tel:+${digits}`;
}

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRechargeSuccess?: (addedCoins: number) => void;
  initialTab?: 'wallet' | 'earnings';
  onSendMessage?: (user: UserProfile) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRechargeSuccess,
  initialTab = 'wallet',
  onSendMessage,
}) => {
  // Main Dashboard Tab: 'wallet' (Purchased Coins) vs 'earnings' (Creator Revenue)
  const [activeMainTab, setActiveMainTab] = useState<'wallet' | 'earnings'>(initialTab);

  // Settings & Live Balances from Firestore
  const [settings, setSettings] = useState<WalletSettings>(DEFAULT_WALLET_SETTINGS);
  const [coinPackages, setCoinPackages] = useState<WalletRechargePackage[]>(DEFAULT_COIN_PACKAGES);
  const [coinSellerAgencies, setCoinSellerAgencies] = useState<CoinSellerAgency[]>([]);
  const [approvedDualCoinSellers, setApprovedDualCoinSellers] = useState<DualAgencyRecord[]>([]);

  // Online Purchasing Coming Soon & Offline Agency Directory State
  const [comingSoonPkg, setComingSoonPkg] = useState<WalletRechargePackage | null>(null);
  const [isAgencyDirectoryOpen, setIsAgencyDirectoryOpen] = useState(false);
  const [selectedInquiryPkg, setSelectedInquiryPkg] = useState<WalletRechargePackage | null>(null);
  const [agencySearchQuery, setAgencySearchQuery] = useState('');
  const [selectedAgencyCity, setSelectedAgencyCity] = useState<string>('ALL');
  const [copiedIdFlag, setCopiedIdFlag] = useState(false);

  const [walletData, setWalletData] = useState<UserWalletData>({
    userId: currentUser.id,
    walletPurchasedCoins: currentUser.coins || 0,
    totalCoinsPurchased: currentUser.coins || 0,
    totalCoinsSpent: 0,
    updatedAt: new Date().toISOString(),
  });

  const [earningsData, setEarningsData] = useState<UserEarningsData>({
    userId: currentUser.id,
    availableEarningsCoins: currentUser.diamonds || 0,
    pendingWithdrawalCoins: 0,
    totalWithdrawnCoins: 0,
    grossGiftCoinsReceived: 0,
    totalCommissionDeducted: 0,
    totalConvertedToWallet: 0,
    totalGiftsCount: 0,
    updatedAt: new Date().toISOString(),
  });

  // Transactions State
  const [walletTransactions, setWalletTransactions] = useState<FinancialTransaction[]>([]);
  const [earningsTransactions, setEarningsTransactions] = useState<FinancialTransaction[]>([]);
  const [selectedTxFilter, setSelectedTxFilter] = useState<string>('all');

  // Sub-Modals
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertCoinsInput, setConvertCoinsInput] = useState<string>('1000');
  const [isConverting, setIsConverting] = useState(false);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawCoinsInput, setWithdrawCoinsInput] = useState<string>('5000');
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<'bank_transfer' | 'jazzcash' | 'easypaisa' | 'cash_pickup'>('bank_transfer');
  const [accountTitle, setAccountTitle] = useState(currentUser.name || '');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankOrProviderName, setBankOrProviderName] = useState('Meezan Bank');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  // Admin Controls Drawer
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminRequests, setAdminRequests] = useState<WithdrawalRequest[]>([]);
  const [adminCommissionInput, setAdminCommissionInput] = useState<number>(settings.commissionRatePercent);
  const [adminExchangeRateInput, setAdminExchangeRateInput] = useState<number>(settings.exchangeRatePkrPerCoin);
  const [adminMinWithdrawInput, setAdminMinWithdrawInput] = useState<number>(settings.minWithdrawalCoins);
  const [adminMaxWithdrawInput, setAdminMaxWithdrawInput] = useState<number>(settings.maxWithdrawalCoins);
  const [adminSelectedReq, setAdminSelectedReq] = useState<WithdrawalRequest | null>(null);
  const [adminRemarksInput, setAdminRemarksInput] = useState('');
  const [adminRefInput, setAdminRefInput] = useState('');

  // Admin Coin Seller Agency Editor State
  const [editingAgencyId, setEditingAgencyId] = useState<string | null>(null);
  const [agencyFormName, setAgencyFormName] = useState('');
  const [agencyFormOwner, setAgencyFormOwner] = useState('');
  const [agencyFormCode, setAgencyFormCode] = useState('');
  const [agencyFormCity, setAgencyFormCity] = useState('');
  const [agencyFormCountry, setAgencyFormCountry] = useState('Pakistan');
  const [agencyFormWhatsapp, setAgencyFormWhatsapp] = useState('');
  const [agencyFormPhone, setAgencyFormPhone] = useState('');
  const [agencyFormPayments, setAgencyFormPayments] = useState('JazzCash, EasyPaisa, Bank Transfer, Cash');
  const [agencyFormHours, setAgencyFormHours] = useState('24/7 Instant Delivery');
  const [agencyFormRateNote, setAgencyFormRateNote] = useState('Official Rate • Instant Top-Up');
  const [agencyFormBadge, setAgencyFormBadge] = useState('VERIFIED');
  const [agencyFormOnline, setAgencyFormOnline] = useState(true);
  const [agencyFormEnabled, setAgencyFormEnabled] = useState(true);
  const [isSavingAgency, setIsSavingAgency] = useState(false);

  // Admin Offline Agency Fulfillment (Direct Coin Credit)
  const [creditTargetUid, setCreditTargetUid] = useState('');
  const [creditCoinsAmount, setCreditCoinsAmount] = useState('');
  const [creditReasonNote, setCreditReasonNote] = useState('Offline Coin Seller Agency Order');
  const [isCreditingCoins, setIsCreditingCoins] = useState(false);

  // Status Alerts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const isAdminUser =
    auth.currentUser?.email?.toLowerCase() === 'yaquoobe@gmail.com' &&
    auth.currentUser?.emailVerified === true;

  // Subscriptions to Real-Time Firestore Services
  useEffect(() => {
    if (!isOpen) return;

    const unsubSettings = subscribeWalletSettings((s) => {
      setSettings(s);
      setAdminCommissionInput(s.commissionRatePercent);
      setAdminExchangeRateInput(s.exchangeRatePkrPerCoin);
      setAdminMinWithdrawInput(s.minWithdrawalCoins);
      setAdminMaxWithdrawInput(s.maxWithdrawalCoins);
    });

    const unsubPackages = subscribeCoinPackages((p) => setCoinPackages(p));
    const unsubAgencies = subscribeCoinSellerAgencies(isAdminUser, (a) => setCoinSellerAgencies(a));
    const unsubApprovedDual = subscribeActiveAgencies('coin_seller', (list) => setApprovedDualCoinSellers(list));
    const unsubWallet = subscribeUserWallet(currentUser.id, (w) => setWalletData(w));
    const unsubEarnings = subscribeUserEarnings(currentUser.id, (e) => setEarningsData(e));
    const unsubWalletTx = subscribeTransactions(currentUser.id, 'wallet', (txs) => setWalletTransactions(txs));
    const unsubEarningsTx = subscribeTransactions(currentUser.id, 'earnings', (txs) => setEarningsTransactions(txs));
    const unsubAllReqs = isAdminUser
      ? subscribeAllWithdrawalRequests((reqs) => setAdminRequests(reqs))
      : () => {};

    return () => {
      unsubSettings();
      unsubPackages();
      unsubAgencies();
      unsubApprovedDual();
      unsubWallet();
      unsubEarnings();
      unsubWalletTx();
      unsubEarningsTx();
      unsubAllReqs();
    };
  }, [isOpen, currentUser.id, isAdminUser]);

  const activeAgencies = useMemo(() => {
    const mappedDual: CoinSellerAgency[] = approvedDualCoinSellers.map((a) => ({
      id: a.id,
      name: a.name,
      ownerName: a.ownerName,
      agencyCode: a.agencyCode,
      city: 'Official Seller',
      country: 'Verified',
      whatsapp: a.whatsappNumber,
      phone: a.whatsappNumber,
      paymentMethods: ['JazzCash', 'EasyPaisa', 'Bank Transfer'],
      workingHours: a.isOnline ? 'Online Now • Instant Transfer' : 'Contact via WhatsApp',
      minCoinsOrder: 500,
      rateNote: a.description || 'Verified Coin Seller Agency',
      badge: 'VERIFIED SELLER',
      isVerified: a.isVerified,
      isOnline: a.isOnline,
      enabled: a.status === 'active',
    }));
    const existingIds = new Set(mappedDual.map((m) => m.id));
    const combined = [
      ...mappedDual,
      ...coinSellerAgencies.filter((a) => a.enabled && !existingIds.has(a.id)),
    ];
    return combined;
  }, [approvedDualCoinSellers, coinSellerAgencies]);

  const agencyCities = useMemo(() => {
    const unique = Array.from(new Set(activeAgencies.map((a) => a.city).filter(Boolean)));
    return ['ALL', ...unique];
  }, [activeAgencies]);

  const filteredAgencies = useMemo(() => {
    const q = agencySearchQuery.trim().toLowerCase();
    return activeAgencies.filter((agency) => {
      if (selectedAgencyCity !== 'ALL' && agency.city !== selectedAgencyCity) return false;
      if (!q) return true;
      return (
        agency.name.toLowerCase().includes(q) ||
        agency.city.toLowerCase().includes(q) ||
        agency.country.toLowerCase().includes(q) ||
        agency.agencyCode.toLowerCase().includes(q) ||
        agency.ownerName.toLowerCase().includes(q) ||
        agency.paymentMethods.some((pm) => pm.toLowerCase().includes(q))
      );
    });
  }, [activeAgencies, agencySearchQuery, selectedAgencyCity]);

  if (!isOpen) return null;

  const userDisplayId = currentUser.displayId || currentUser.id;

  const handleCopyText = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      showToast(`${label} copied: ${text}`);
    } catch {
      showToast(`${label}: ${text}`);
    }
  };

  const handleCopyMyId = async () => {
    await handleCopyText(userDisplayId, 'Lenzo ID');
    setCopiedIdFlag(true);
    setTimeout(() => setCopiedIdFlag(false), 2000);
  };

  // Package tap NEVER adds coins — opens Online Purchasing Coming Soon notice
  const handleSelectPackageComingSoon = (pkg: WalletRechargePackage) => {
    setComingSoonPkg(pkg);
  };

  const handleOpenOfflineAgencies = (pkgForInquiry?: WalletRechargePackage | null) => {
    setComingSoonPkg(null);
    if (pkgForInquiry) {
      setSelectedInquiryPkg(pkgForInquiry);
    }
    setIsAgencyDirectoryOpen(true);
  };

  const resetAgencyForm = () => {
    setEditingAgencyId(null);
    setAgencyFormName('');
    setAgencyFormOwner('');
    setAgencyFormCode('');
    setAgencyFormCity('');
    setAgencyFormCountry('Pakistan');
    setAgencyFormWhatsapp('');
    setAgencyFormPhone('');
    setAgencyFormPayments('JazzCash, EasyPaisa, Bank Transfer, Cash');
    setAgencyFormHours('24/7 Instant Delivery');
    setAgencyFormRateNote('Official Rate • Instant Top-Up');
    setAgencyFormBadge('VERIFIED');
    setAgencyFormOnline(true);
    setAgencyFormEnabled(true);
  };

  const handleEditAgency = (agency: CoinSellerAgency) => {
    setEditingAgencyId(agency.id);
    setAgencyFormName(agency.name);
    setAgencyFormOwner(agency.ownerName);
    setAgencyFormCode(agency.agencyCode);
    setAgencyFormCity(agency.city);
    setAgencyFormCountry(agency.country);
    setAgencyFormWhatsapp(agency.whatsapp);
    setAgencyFormPhone(agency.phone);
    setAgencyFormPayments(agency.paymentMethods.join(', '));
    setAgencyFormHours(agency.workingHours);
    setAgencyFormRateNote(agency.rateNote || '');
    setAgencyFormBadge(agency.badge || 'VERIFIED');
    setAgencyFormOnline(agency.isOnline);
    setAgencyFormEnabled(agency.enabled);
  };

  const handleSaveAgency = async () => {
    if (!agencyFormName.trim() || !agencyFormCity.trim() || !agencyFormWhatsapp.trim()) {
      showError('Please enter Agency Name, City, and WhatsApp Number');
      return;
    }
    setIsSavingAgency(true);
    const id = editingAgencyId || `agency_${Date.now()}`;
    const methods = agencyFormPayments
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await saveCoinSellerAgency({
      id,
      name: agencyFormName.trim(),
      ownerName: agencyFormOwner.trim() || agencyFormName.trim(),
      agencyCode: agencyFormCode.trim() || `LP-COIN-${Math.floor(10 + Math.random() * 89)}`,
      city: agencyFormCity.trim(),
      country: agencyFormCountry.trim() || 'Pakistan',
      whatsapp: agencyFormWhatsapp.trim(),
      phone: (agencyFormPhone.trim() || agencyFormWhatsapp.trim()),
      paymentMethods: methods.length > 0 ? methods : ['JazzCash', 'EasyPaisa', 'Bank Transfer'],
      workingHours: agencyFormHours.trim() || '24/7 Support',
      minCoinsOrder: 1000,
      rateNote: agencyFormRateNote.trim() || 'Official Rate • Instant Top-Up',
      badge: agencyFormBadge.trim() || 'VERIFIED',
      isVerified: true,
      isOnline: agencyFormOnline,
      enabled: agencyFormEnabled,
    });
    setIsSavingAgency(false);

    if (res.success) {
      showToast(editingAgencyId ? 'Coin Seller Agency updated!' : 'New Official Coin Seller Agency added!');
      resetAgencyForm();
    } else {
      showError(res.error || 'Failed to save Coin Seller Agency');
    }
  };

  const handleToggleAgencyOnline = async (agency: CoinSellerAgency) => {
    const res = await saveCoinSellerAgency({ ...agency, isOnline: !agency.isOnline });
    if (res.success) {
      showToast(`${agency.name} marked ${!agency.isOnline ? 'ONLINE' : 'OFFLINE'}`);
    } else {
      showError(res.error || 'Failed to update status');
    }
  };

  const handleToggleAgencyEnabled = async (agency: CoinSellerAgency) => {
    const res = await saveCoinSellerAgency({ ...agency, enabled: !agency.enabled });
    if (res.success) {
      showToast(`${agency.name} ${!agency.enabled ? 'enabled' : 'hidden from list'}`);
    } else {
      showError(res.error || 'Failed to update visibility');
    }
  };

  const handleDeleteAgency = async (agency: CoinSellerAgency) => {
    const res = await deleteCoinSellerAgency(agency.id);
    if (res.success) {
      showToast(`Removed ${agency.name}`);
      if (editingAgencyId === agency.id) resetAgencyForm();
    } else {
      showError(res.error || 'Failed to remove agency');
    }
  };

  const handleAdminCreditUserCoins = async () => {
    const uid = creditTargetUid.trim();
    const amount = parseInt(creditCoinsAmount, 10);
    if (!uid) {
      showError('Please enter target user Firebase UID');
      return;
    }
    if (isNaN(amount) || amount === 0) {
      showError('Please enter a valid non-zero coin amount');
      return;
    }
    setIsCreditingCoins(true);
    const res = await adminAdjustBalance(
      uid,
      'wallet',
      amount,
      creditReasonNote.trim() || 'Offline Coin Seller Agency Top-Up',
      auth.currentUser?.email || 'admin'
    );
    setIsCreditingCoins(false);
    if (res.success) {
      showToast(`${amount > 0 ? '+' : ''}${amount.toLocaleString()} coins applied to ${uid.slice(0, 10)}...`);
      setCreditTargetUid('');
      setCreditCoinsAmount('');
    } else {
      showError(res.error || 'Failed to adjust user wallet coins');
    }
  };

  const handleConvertEarnings = async () => {
    const num = parseInt(convertCoinsInput, 10);
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid number of Diamonds to exchange');
      return;
    }
    if (num > earningsData.availableEarningsCoins) {
      showError(`Cannot exchange more than available Diamonds (💎 ${earningsData.availableEarningsCoins.toLocaleString()})`);
      return;
    }

    setIsConverting(true);
    const res = await convertEarningsToWallet(currentUser.id, num, settings);
    setIsConverting(false);

    if (res.success) {
      setIsConvertModalOpen(false);
      showToast(`Exchanged 💎 ${num.toLocaleString()} Diamonds into 🪙 ${res.walletCoinsReceived.toLocaleString()} Gifting Wallet Coins!`);
      if (onRechargeSuccess) onRechargeSuccess(res.walletCoinsReceived);
    } else {
      showError(res.error || 'Exchange failed');
    }
  };

  const handleSubmitWithdrawal = async () => {
    const num = parseInt(withdrawCoinsInput, 10);
    if (isNaN(num) || num < settings.minWithdrawalCoins) {
      showError(`Minimum withdrawal is 💎 ${settings.minWithdrawalCoins.toLocaleString()} Diamonds (PKR ${(settings.minWithdrawalCoins * settings.exchangeRatePkrPerCoin).toLocaleString()})`);
      return;
    }
    if (num > settings.maxWithdrawalCoins) {
      showError(`Maximum withdrawal is 💎 ${settings.maxWithdrawalCoins.toLocaleString()} Diamonds per request`);
      return;
    }
    if (num > earningsData.availableEarningsCoins) {
      showError(`Insufficient available Diamonds (💎 ${earningsData.availableEarningsCoins.toLocaleString()} available)`);
      return;
    }
    const resolvedProvider =
      selectedPayoutMethod === 'easypaisa'
        ? 'EasyPaisa'
        : selectedPayoutMethod === 'jazzcash'
          ? 'JazzCash'
          : bankOrProviderName.trim();

    if (!accountTitle.trim() || !accountNumber.trim() || !resolvedProvider) {
      showError(
        selectedPayoutMethod === 'bank_transfer'
          ? 'Please enter Account Title, Bank Name, and Account / IBAN Number'
          : `Please enter Account Title and 11-digit ${resolvedProvider} mobile number`
      );
      return;
    }

    setIsSubmittingWithdrawal(true);
    const res = await requestWithdrawal(
      currentUser.id,
      currentUser.name,
      num,
      selectedPayoutMethod,
      {
        accountTitle: accountTitle.trim(),
        accountNumber: accountNumber.trim(),
        bankOrProviderName: resolvedProvider,
        phoneNumber: phoneNumber.trim() || (selectedPayoutMethod !== 'bank_transfer' ? accountNumber.trim() : ''),
      },
      settings
    );
    setIsSubmittingWithdrawal(false);

    if (res.success) {
      setIsWithdrawModalOpen(false);
      showToast(`Diamond withdrawal #${res.requestId.slice(-6).toUpperCase()} submitted via ${resolvedProvider}! Net PKR ${res.finalPayablePkr.toLocaleString()}.`);
    } else {
      showError(res.error || 'Withdrawal submission failed');
    }
  };

  const handleAdminStatusChange = async (
    req: WithdrawalRequest,
    status: 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled'
  ) => {
    const res = await adminUpdateWithdrawalStatus(
      req,
      status,
      adminRemarksInput,
      adminRefInput
    );
    if (res.success) {
      showToast(`Request #${req.id.slice(-6).toUpperCase()} updated to ${status.toUpperCase()}!`);
      setAdminSelectedReq(null);
      setAdminRemarksInput('');
      setAdminRefInput('');
    } else {
      showError(res.error || 'Status update failed');
    }
  };

  const handleSaveAdminSettings = async () => {
    await updateWalletSettings({
      commissionRatePercent: adminCommissionInput,
      exchangeRatePkrPerCoin: adminExchangeRateInput,
      minWithdrawalCoins: adminMinWithdrawInput,
      maxWithdrawalCoins: adminMaxWithdrawInput,
    });
    showToast('Admin wallet settings saved successfully!');
  };

  // Calculations for current inputs
  const convertCoinsNum = parseInt(convertCoinsInput || '0', 10);
  const willReceiveWalletCoins = Math.round(convertCoinsNum * settings.earningsToWalletConversionRate);

  const withdrawCoinsNum = parseInt(withdrawCoinsInput || '0', 10);
  const withdrawGrossPkr = Math.round(withdrawCoinsNum * settings.exchangeRatePkrPerCoin);
  const withdrawFeePkr = Math.round(withdrawGrossPkr * (settings.withdrawalFeePercent / 100));
  const withdrawNetPkr = Math.max(0, withdrawGrossPkr - withdrawFeePkr);

  // Filtered Transactions
  const currentTxs = activeMainTab === 'wallet' ? walletTransactions : earningsTransactions;
  const filteredTxs = currentTxs.filter((tx) => {
    if (selectedTxFilter === 'all') return true;
    return tx.category === selectedTxFilter;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 bg-black/85 backdrop-blur-md animate-fade-in select-none"
      style={{
        paddingTop: 'max(0.75rem, var(--app-safe-top))',
        paddingBottom: 'max(0.75rem, var(--app-safe-bottom))',
      }}
    >
      <div 
        className="w-full max-w-2xl bg-[#0e071c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toast / Error alerts */}
        {toastMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white text-xs font-bold py-2 px-5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-bounce">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 text-white text-xs font-bold py-2 px-5 rounded-2xl shadow-xl flex items-center gap-2 border border-rose-400">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Header with Feature Name "WALLET" and Admin Shortcut */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between bg-[#150a26]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white flex items-center justify-center shadow-md">
              <WalletIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">WALLET</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Verified Currency
                </span>
              </div>
              <p className="text-[11px] text-[#A59AB8]">Coins Buying/Gifting Wallet &amp; Diamonds Earnings Wallet</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Controls Trigger (Verified Admin Only) */}
            {isAdminUser && (
              <button
                onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFC84A] text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Admin Financial Controls & Withdrawal Approvals"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin Panel</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TWO MAIN TABS: 1. BUYING/GIFTING WALLET (COINS) | 2. EARNINGS WALLET (DIAMONDS) */}
        <div className="grid grid-cols-2 p-2 bg-[#120822] border-b border-white/[0.06] gap-2">
          {/* TAB 1: COINS WALLET */}
          <button
            onClick={() => {
              setActiveMainTab('wallet');
              setSelectedTxFilter('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeMainTab === 'wallet'
                ? 'bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/20 border border-amber-400/50 text-[#FFC84A] shadow-[0_4px_16px_rgba(255,200,74,0.2)]'
                : 'text-[#A59AB8] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-base">🪙</span>
            <span>WALLET (COINS)</span>
            {activeMainTab === 'wallet' && (
              <span className="w-2 h-2 rounded-full bg-[#FFC84A] animate-pulse" />
            )}
          </button>

          {/* TAB 2: DIAMONDS EARNINGS WALLET */}
          <button
            onClick={() => {
              setActiveMainTab('earnings');
              setSelectedTxFilter('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeMainTab === 'earnings'
                ? 'bg-gradient-to-r from-cyan-500/25 via-[#8B20FF]/25 to-[#F328D5]/25 border border-cyan-400/50 text-cyan-200 shadow-[0_4px_16px_rgba(34,211,238,0.2)]'
                : 'text-[#A59AB8] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <span className="text-base">💎</span>
            <span>EARNINGS (DIAMONDS)</span>
            {activeMainTab === 'earnings' && (
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse" />
            )}
          </button>
        </div>

        {/* 3. SCROLLABLE TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-5">
          {/* ========================================================== */}
          {/* TAB 1 CONTENT: WALLET COINS (Purchased Currency)           */}
          {/* ========================================================== */}
          {activeMainTab === 'wallet' && (
            <div className="space-y-5">
              {/* Wallet Balances Card */}
              <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#2a1745] via-[#1b0d2f] to-[#120822] border border-amber-400/30 shadow-xl overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#d2c5e6] flex items-center gap-1.5">
                    <span>🪙</span> Available Purchased Coins
                  </span>
                  <span className="text-[10px] text-amber-300 font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30">
                    Non-Withdrawable
                  </span>
                </div>

                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-[#FFC84A] font-mono tracking-tight">
                      {walletData.walletPurchasedCoins.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#A59AB8] font-bold">Coins</span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      ≈ PKR {(walletData.walletPurchasedCoins * settings.exchangeRatePkrPerCoin).toLocaleString()}
                    </span>
                    <div className="text-[10px] text-[#A59AB8]">Exchange: 1 Coin = PKR {settings.exchangeRatePkrPerCoin}</div>
                  </div>
                </div>

                {/* Lifetime Stats */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Total Purchased</span>
                    <span className="font-bold text-white font-mono">🪙 {walletData.totalCoinsPurchased.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Total Spent on Gifts</span>
                    <span className="font-bold text-rose-300 font-mono">🪙 {walletData.totalCoinsSpent.toLocaleString()}</span>
                  </div>
                </div>

                {/* Important Rules Banner */}
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-tight flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Purchased coins can only be used for sending gifts to hosts, party rooms, and PK battles. They cannot be withdrawn as cash.
                  </span>
                </div>
              </div>

              {/* Coin Recharge Packages Grid (Online Purchasing Coming Soon) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FFC84A]" />
                      Online Recharge Packages
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        Coming Soon
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#A59AB8]">
                      Online card purchasing is coming soon • Buy coins right now via Official Offline Agencies below
                    </p>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">1 Coin ≈ PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {coinPackages.filter((p) => p.enabled).map((pkg) => (
                    <div
                      key={pkg.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectPackageComingSoon(pkg)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectPackageComingSoon(pkg);
                        }
                      }}
                      className={`relative p-3.5 rounded-2xl bg-[#170c2a] border transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.98] ${
                        pkg.isPopular
                          ? 'border-amber-400/50 shadow-[0_4px_16px_rgba(255,200,74,0.12)] bg-gradient-to-b from-[#24133f] to-[#170c2a]'
                          : 'border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      {pkg.badge && (
                        <span className="absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow">
                          {pkg.badge}
                        </span>
                      )}

                      <div>
                        <div className="flex items-center gap-1.5 text-lg font-black text-white font-mono">
                          <span>🪙</span>
                          <span>{pkg.coins.toLocaleString()}</span>
                        </div>
                        {pkg.bonusCoins > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 block mt-0.5">
                            +{pkg.bonusCoins.toLocaleString()} Bonus
                          </span>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                        <span className="text-xs font-black text-white font-mono">{pkg.displayPrice}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPackageComingSoon(pkg);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-[10px] font-black flex items-center gap-1 transition-all shrink-0"
                        >
                          <Clock className="w-3 h-3 text-amber-300" />
                          <span>Soon</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* VISIT OFFLINE AGENCY — OFFICIAL COIN SELLER AGENCIES CTA */}
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#15112c] to-amber-950/35 border border-emerald-400/40 shadow-[0_8px_28px_rgba(16,185,129,0.16)] space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center shrink-0 shadow-lg">
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-black text-white">Visit Offline Agency</h4>
                          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                            Official Coin Sellers
                          </span>
                        </div>
                        <p className="text-[11px] text-[#c7bdd9] mt-0.5 leading-snug">
                          Contact our verified offline Coin Seller Agencies to purchase Lenzo Coins instantly via JazzCash, EasyPaisa, Bank Transfer, or Cash.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 flex-wrap text-[10px] text-emerald-200/90 bg-black/25 rounded-xl px-3 py-2 border border-white/5">
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {activeAgencies.filter((a) => a.isOnline).length} Verified Agencies Online Now
                    </span>
                    <span className="text-[#A59AB8] font-mono">
                      Your ID: <strong className="text-white">{userDisplayId}</strong>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenOfflineAgencies(null)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-105 text-black text-xs sm:text-sm font-black shadow-[0_6px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Store className="w-4 h-4" />
                    <span>Visit Offline Coin Seller Agency</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Wallet Transactions History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#A59AB8]" />
                    Coin Transaction History
                  </h3>
                  {/* Filter selector */}
                  <select
                    value={selectedTxFilter}
                    onChange={(e) => setSelectedTxFilter(e.target.value)}
                    className="bg-[#1b0e33] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  >
                    <option value="all">All Transactions</option>
                    <option value="coin_purchase">Coin Purchases</option>
                    <option value="gift_sent">Gifts Sent</option>
                    <option value="earnings_conversion">Converted Coins</option>
                    <option value="admin_adjustment">Adjustments</option>
                  </select>
                </div>

                <div className="space-y-2">
                  {filteredTxs.length === 0 ? (
                    <div className="p-8 text-center text-[#8e82a3] bg-[#140a24] rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-white">No Coin Transactions Yet</p>
                      <p className="text-[11px] mt-0.5">Recharge or send gifts to generate transaction records.</p>
                    </div>
                  ) : (
                    filteredTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[#140a24] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-[11px]">{tx.description}</p>
                            <span className="text-[10px] text-gray-500">{tx.timestamp}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 🪙
                          </span>
                          {tx.pkrAmount && (
                            <div className="text-[9px] text-[#A59AB8]">≈ PKR {tx.pkrAmount.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* TAB 2 CONTENT: EARNINGS WALLET (DIAMONDS ONLY)             */}
          {/* ========================================================== */}
          {activeMainTab === 'earnings' && (
            <div className="space-y-5">
              {/* Diamonds Earnings Balance Card */}
              <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#0E2444] via-[#1B103D] to-[#120624] border border-cyan-400/35 shadow-xl overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-cyan-100 flex items-center gap-1.5">
                    <span>💎</span> Available Diamonds
                  </span>
                  <span className="text-[10px] text-cyan-200 font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/35">
                    {100 - settings.commissionRatePercent}% Host Share • {settings.commissionRatePercent}% App
                  </span>
                </div>

                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-cyan-300 font-mono tabular-nums tracking-tight">
                      {earningsData.availableEarningsCoins.toLocaleString()}
                    </span>
                    <span className="text-xs text-cyan-100/80 font-extrabold uppercase tracking-wide">Diamonds</span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono tabular-nums">
                      ≈ PKR {(earningsData.availableEarningsCoins * settings.exchangeRatePkrPerCoin).toLocaleString()}
                    </span>
                    <div className="text-[10px] text-[#B9AECF]">
                      Converted from {100 - settings.commissionRatePercent}% of gifts received
                    </div>
                  </div>
                </div>

                {/* Sub-balances breakdown (Strictly Diamonds) */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Pending Payout</span>
                    <span className="font-bold text-amber-300 font-mono tabular-nums">💎 {earningsData.pendingWithdrawalCoins.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Withdrawn Paid</span>
                    <span className="font-bold text-emerald-400 font-mono tabular-nums">💎 {earningsData.totalWithdrawnCoins.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Exchanged to Coins</span>
                    <span className="font-bold text-cyan-300 font-mono tabular-nums">💎 {earningsData.totalConvertedToWallet.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons: WITHDRAW DIAMONDS & EXCHANGE DIAMONDS -> COINS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-105 text-[#041B10] text-xs font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <DollarSign className="w-4 h-4 shrink-0" />
                    <span>Withdraw Diamonds</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(true)}
                    className="min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-[#8B20FF] to-[#F328D5] hover:brightness-105 text-white text-xs font-black shadow-[0_4px_16px_rgba(139,32,255,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ArrowRightLeft className="w-4 h-4 shrink-0" />
                    <span>Exchange Diamonds → Coins</span>
                  </button>
                </div>
              </div>

              {/* Host Split & Diamonds Payout Metrics Card */}
              <div className="p-4 rounded-2xl bg-[#150a25] border border-white/10 space-y-2.5">
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Gift Earnings Split:</span>
                  <span className="font-bold text-cyan-300">
                    {100 - settings.commissionRatePercent}% Host Diamonds / {settings.commissionRatePercent}% App
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Diamond Cash Value:</span>
                  <span className="font-bold text-emerald-400">1 💎 Diamond = PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Supported Payout Methods:</span>
                  <span className="font-bold text-white">Bank Transfer · EasyPaisa · JazzCash</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A59AB8]">Diamond → Coin Exchange Rate:</span>
                  <span className="font-bold text-amber-300">1 💎 Diamond = 1 🪙 Gifting Coin</span>
                </div>
              </div>

              {/* Diamonds Earnings Transaction History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-cyan-300" />
                    Diamonds History
                  </h3>
                  <select
                    value={selectedTxFilter}
                    onChange={(e) => setSelectedTxFilter(e.target.value)}
                    className="bg-[#1b0e33] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  >
                    <option value="all">All Diamond Events</option>
                    <option value="gift_received">Gifts Received (60% 💎)</option>
                    <option value="withdrawal_request">Diamond Withdrawals</option>
                    <option value="earnings_conversion">Exchanged to Coins</option>
                    <option value="withdrawal_refund">Refunds</option>
                  </select>
                </div>

                <div className="space-y-2">
                  {filteredTxs.length === 0 ? (
                    <div className="p-8 text-center text-[#8e82a3] bg-[#140a24] rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-white">No Diamond Earnings Yet</p>
                      <p className="text-[11px] mt-0.5">
                        Receive gifts in Live Streams, Audio Party Rooms, Reels, or Chat to earn {100 - settings.commissionRatePercent}% as Diamonds.
                      </p>
                    </div>
                  ) : (
                    filteredTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[#140a24] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.amount > 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-pink-500/20 text-pink-300'
                          }`}>
                            {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-[11px]">{tx.description}</p>
                            <span className="text-[10px] text-gray-400">{tx.timestamp}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className={`font-mono font-bold tabular-nums ${tx.amount > 0 ? 'text-cyan-300' : 'text-pink-300'}`}>
                            {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 💎
                          </span>
                          {tx.pkrAmount && (
                            <div className="text-[9px] text-emerald-300 font-mono">≈ PKR {tx.pkrAmount.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/* MODAL 1: EXCHANGE DIAMONDS -> GIFTING WALLET COINS         */}
        {/* ========================================================== */}
        {isConvertModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#190e2e] border border-cyan-400/25 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-cyan-300" />
                  Exchange Diamonds to Coins
                </h3>
                <button onClick={() => setIsConvertModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#110820] border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Available Diamonds:</span>
                  <span className="font-mono font-bold text-cyan-300 tabular-nums">💎 {earningsData.availableEarningsCoins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Exchange Rate:</span>
                  <span className="font-bold text-amber-300">1 💎 Diamond = 1 🪙 Coin</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Enter Diamonds to Exchange</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={convertCoinsInput}
                    onChange={(e) => setConvertCoinsInput(e.target.value)}
                    max={earningsData.availableEarningsCoins}
                    className="w-full bg-[#23133e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                  <button
                    type="button"
                    onClick={() => setConvertCoinsInput(earningsData.availableEarningsCoins.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-black bg-cyan-500/20 text-cyan-200"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Exchange Preview */}
              <div className="p-3 rounded-xl bg-purple-900/30 border border-amber-400/25 text-xs flex items-center justify-between">
                <span className="text-[#d7c9ec]">Credited to Gifting Wallet:</span>
                <span className="text-sm font-black text-amber-300 font-mono tabular-nums">
                  🪙 {willReceiveWalletCoins.toLocaleString()} Coins
                </span>
              </div>

              <p className="text-[10px] text-gray-400 leading-relaxed">
                * Exchanged Coins are credited immediately to your Buying/Gifting Wallet for sending gifts, buying frames, and store items. Exchanged Coins cannot be withdrawn back as cash.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConvertModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isConverting || convertCoinsNum <= 0 || convertCoinsNum > earningsData.availableEarningsCoins}
                  onClick={handleConvertEarnings}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-[#8B20FF] to-[#F328D5] text-white text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isConverting ? 'Exchanging...' : 'Confirm Exchange'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* MODAL 2: WITHDRAW DIAMONDS (BANK / EASYPAISA / JAZZCASH)   */}
        {/* ========================================================== */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#170a29] border border-cyan-400/25 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">Withdraw Diamonds</h3>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Limits Strip (Strictly Diamonds) */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-[#10061e] border border-white/5">
                <div>
                  <span className="text-[#A59AB8] block">Available Diamonds:</span>
                  <span className="font-bold text-cyan-300 font-mono tabular-nums">💎 {earningsData.availableEarningsCoins.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#A59AB8] block">Payout Rate:</span>
                  <span className="font-bold text-emerald-400 font-mono">1 💎 = PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <span className="text-[#A59AB8] block">Min Limit:</span>
                  <span className="font-bold text-amber-300 font-mono tabular-nums">💎 {settings.minWithdrawalCoins.toLocaleString()}</span>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <span className="text-[#A59AB8] block">Processing Fee:</span>
                  <span className="font-bold text-purple-300 font-mono">{settings.withdrawalFeePercent}%</span>
                </div>
              </div>

              {/* Diamonds to Withdraw */}
              <div>
                <label className="text-xs font-bold text-gray-300">Diamonds to Withdraw</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={withdrawCoinsInput}
                    onChange={(e) => setWithdrawCoinsInput(e.target.value)}
                    min={settings.minWithdrawalCoins}
                    max={Math.min(settings.maxWithdrawalCoins, earningsData.availableEarningsCoins)}
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawCoinsInput(earningsData.availableEarningsCoins.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-300"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Payout Method Selection: Bank Transfer, EasyPaisa, JazzCash */}
              <div>
                <label className="text-xs font-bold text-gray-300">Select Withdrawal Method</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {DEFAULT_PAYOUT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedPayoutMethod(m.type);
                        if (m.type === 'easypaisa') setBankOrProviderName('EasyPaisa');
                        else if (m.type === 'jazzcash') setBankOrProviderName('JazzCash');
                        else if (bankOrProviderName === 'EasyPaisa' || bankOrProviderName === 'JazzCash') {
                          setBankOrProviderName('');
                        }
                      }}
                      className={`min-h-[58px] p-2.5 rounded-xl border text-left text-xs transition-all ${
                        selectedPayoutMethod === m.type
                          ? 'border-emerald-400 bg-emerald-950/40 text-white font-black shadow'
                          : 'border-white/10 bg-[#22103a] text-[#A59AB8] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {m.type === 'bank_transfer' && <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {m.type === 'easypaisa' && <Smartphone className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                        {m.type === 'jazzcash' && <Smartphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span className="truncate text-[11px]">
                          {m.type === 'bank_transfer' ? 'Bank' : m.name}
                        </span>
                      </div>
                      <span className="text-[9px] opacity-75 block truncate">
                        {m.type === 'bank_transfer' ? 'IBAN / 1Link' : 'Mobile Wallet'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300">Account Title / Full Name *</label>
                  <input
                    type="text"
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                    placeholder="e.g. Muhammad Ali"
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {selectedPayoutMethod === 'bank_transfer' && (
                  <div>
                    <label className="text-[11px] font-semibold text-gray-300">Bank Name *</label>
                    <input
                      type="text"
                      value={bankOrProviderName}
                      onChange={(e) => setBankOrProviderName(e.target.value)}
                      placeholder="e.g. Meezan Bank / HBL / UBL / Alfalah"
                      className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-gray-300">
                    {selectedPayoutMethod === 'bank_transfer'
                      ? 'Bank Account Number / 24-Digit IBAN *'
                      : selectedPayoutMethod === 'easypaisa'
                        ? 'EasyPaisa 11-Digit Mobile Number *'
                        : 'JazzCash 11-Digit Mobile Number *'}
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={selectedPayoutMethod === 'bank_transfer' ? 'PK00MEZN0000000000000000' : '03XXXXXXXXX'}
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-300">Contact Phone / WhatsApp (Optional)</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="03XXXXXXXXX"
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Net Payable Breakdown Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Gross Value (💎 {withdrawCoinsNum.toLocaleString()}):</span>
                  <span className="font-mono text-white tabular-nums">PKR {withdrawGrossPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Processing Fee ({settings.withdrawalFeePercent}%):</span>
                  <span className="font-mono text-rose-300 tabular-nums">- PKR {withdrawFeePkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-500/20 font-black text-sm">
                  <span className="text-white">Final Payable Amount:</span>
                  <span className="font-mono text-emerald-400 tabular-nums">PKR {withdrawNetPkr.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmittingWithdrawal || withdrawCoinsNum < settings.minWithdrawalCoins || withdrawCoinsNum > earningsData.availableEarningsCoins}
                  onClick={handleSubmitWithdrawal}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#041B10] text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isSubmittingWithdrawal ? 'Submitting...' : 'Request Payout'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* MODAL 3: ONLINE PURCHASING COMING SOON                     */}
        {/* ========================================================== */}
        {comingSoonPkg && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setComingSoonPkg(null)}
          >
            <div
              className="w-full max-w-sm rounded-3xl bg-[#160b2b] border border-amber-400/35 p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-yellow-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Payment Notice
                    </span>
                    <h3 className="text-base font-black text-white leading-tight">
                      Online Purchasing Coming Soon
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setComingSoonPkg(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white shrink-0"
                  aria-label="Close notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Selected Package Reference */}
              <div className="p-3.5 rounded-2xl bg-[#10061e] border border-white/10 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] text-[#A59AB8] block">Selected Package</span>
                  <div className="text-base font-black text-[#FFC84A] font-mono">
                    🪙 {comingSoonPkg.coins.toLocaleString()} Coins
                  </div>
                  {comingSoonPkg.bonusCoins > 0 && (
                    <span className="text-[10px] text-amber-300 font-bold">
                      +{comingSoonPkg.bonusCoins.toLocaleString()} Bonus Coins
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#A59AB8] block">Official Price</span>
                  <span className="text-sm font-black text-white font-mono">
                    {comingSoonPkg.displayPrice}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-xs text-amber-100/95 leading-relaxed">
                Direct online card / in-app purchasing is <strong>coming soon</strong>. Coins cannot be added without verified payment.
                <br />
                <span className="text-emerald-300 font-bold block mt-1.5">
                  Need coins now? Visit our Official Offline Coin Seller Agencies to purchase safely!
                </span>
              </div>

              {/* Quick Copy Lenzo ID */}
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-[#A59AB8] block">Your Lenzo User ID</span>
                  <span className="font-mono font-bold text-white truncate block">{userDisplayId}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
                >
                  {copiedIdFlag ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIdFlag ? 'Copied' : 'Copy ID'}</span>
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenOfflineAgencies(comingSoonPkg)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-105 text-black text-xs font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Store className="w-4 h-4" />
                  <span>Visit Offline Agency</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setComingSoonPkg(null)}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* DRAWER: OFFICIAL OFFLINE COIN SELLER AGENCIES DIRECTORY    */}
        {/* ========================================================== */}
        {isAgencyDirectoryOpen && (
          <div className="absolute inset-0 z-40 bg-[#0d061b] flex flex-col overflow-hidden animate-in slide-in-from-right">
            {/* Sticky Header */}
            <div className="p-4 pb-3 border-b border-white/10 bg-[#150a26] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsAgencyDirectoryOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
                  aria-label="Back to Wallet"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-white truncate">
                      Offline Coin Seller Agencies
                    </h3>
                    <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-[11px] text-[#A59AB8] truncate">
                    Verified agencies • Contact on WhatsApp or Call to buy coins
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAgencyDirectoryOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0"
                aria-label="Close directory"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
              {/* Your Lenzo ID Copy Strip */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-[#1f103a] to-[#131d2d] border border-emerald-400/30 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                    Share This ID With Coin Seller
                  </span>
                  <div className="text-xs sm:text-sm font-black text-white font-mono truncate">
                    {currentUser.name} • ID: {userDisplayId}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMyId}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0"
                >
                  {copiedIdFlag ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIdFlag ? 'Copied!' : 'Copy ID'}</span>
                </button>
              </div>

              {/* Optional Selected Package Reference Pill */}
              {selectedInquiryPkg && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2 text-xs">
                  <span className="text-amber-200 font-bold truncate">
                    Inquiring for: 🪙 {selectedInquiryPkg.coins.toLocaleString()} Coins ({selectedInquiryPkg.displayPrice})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInquiryPkg(null)}
                    className="text-amber-300 hover:text-white shrink-0"
                    aria-label="Clear selected package"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Search & City Filter */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#A59AB8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={agencySearchQuery}
                    onChange={(e) => setAgencySearchQuery(e.target.value)}
                    placeholder="Search agency name, city, code, JazzCash, EasyPaisa..."
                    className="w-full bg-[#170c2a] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#7e7294] focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {agencyCities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setSelectedAgencyCity(city)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${
                        selectedAgencyCity === city
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                          : 'bg-[#170c2a] border-white/10 text-[#A59AB8] hover:text-white'
                      }`}
                    >
                      {city === 'ALL' ? `All Cities (${activeAgencies.length})` : city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agencies List */}
              {filteredAgencies.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#150a25] border border-white/5 text-[#A59AB8]">
                  <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs font-bold text-white">No matching Coin Seller Agency found</p>
                  <p className="text-[11px] mt-0.5">Try clearing your search or selecting "All Cities".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAgencies.map((agency) => {
                    const waMessage = selectedInquiryPkg
                      ? `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to buy ${selectedInquiryPkg.coins.toLocaleString()} Lenzo Coins (${selectedInquiryPkg.displayPrice}). My Lenzo Name: ${currentUser.name}, Lenzo ID: ${userDisplayId}.`
                      : `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to purchase Lenzo Party Coins. My Lenzo Name: ${currentUser.name}, Lenzo ID: ${userDisplayId}.`;
                    const waUrl = buildSafeWhatsAppUrl(agency.whatsapp, waMessage);
                    const telUrl = buildSafeTelUrl(agency.phone || agency.whatsapp);
                    const matchedDual = approvedDualCoinSellers.find((d) => d.id === agency.id) || null;
                    const canOpenInbox = Boolean(
                      onSendMessage && matchedDual && matchedDual.ownerUid !== currentUser.id
                    );

                    const openAgencyInboxFromWallet = () => {
                      if (!onSendMessage || !matchedDual) return;
                      const ownerProfile: UserProfile = {
                        id: matchedDual.ownerUid,
                        displayId: matchedDual.ownerDisplayId || matchedDual.ownerUid.slice(0, 8),
                        name: matchedDual.name || matchedDual.ownerName || 'Coin Seller Agency',
                        username: matchedDual.ownerUsername || `@${matchedDual.agencyCode.toLowerCase()}`,
                        avatar:
                          matchedDual.ownerAvatar ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedDual.name || 'Agency')}&background=8B20FF&color=fff`,
                        bio: matchedDual.description || 'Official Verified Lenzo Coin Seller Agency',
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
                      setIsAgencyDirectoryOpen(false);
                      onClose();
                      onSendMessage(ownerProfile);
                    };

                    return (
                      <div
                        key={agency.id}
                        onClick={() => {
                          if (canOpenInbox) openAgencyInboxFromWallet();
                        }}
                        className={`p-4 rounded-2xl bg-[#160b29] border border-white/10 hover:border-emerald-400/35 transition-all space-y-3 shadow-lg ${
                          canOpenInbox ? 'cursor-pointer' : ''
                        }`}
                      >
                        {/* Top Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="text-sm font-black text-white leading-snug">
                                {agency.name}
                              </h4>
                              {agency.isVerified && (
                                <BadgeCheck className="w-4 h-4 text-sky-400 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap mt-1 text-[11px] text-[#A59AB8]">
                              <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
                                <MapPin className="w-3 h-3" />
                                {agency.city}, {agency.country}
                              </span>
                              <span>•</span>
                              <span className="font-mono text-amber-300 font-bold">
                                {agency.agencyCode}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {agency.badge && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30">
                                {agency.badge}
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-bold inline-flex items-center gap-1 ${
                                agency.isOnline ? 'text-emerald-400' : 'text-gray-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  agency.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                                }`}
                              />
                              {agency.isOnline ? 'Online' : 'Away'}
                            </span>
                          </div>
                        </div>

                        {/* Details Row */}
                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#100720] border border-white/5 text-[11px]">
                          <div>
                            <span className="text-[10px] text-[#A59AB8] block">Agent / Desk</span>
                            <span className="font-bold text-white truncate block">{agency.ownerName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#A59AB8] block">Working Hours</span>
                            <span className="font-bold text-gray-200 truncate block">{agency.workingHours}</span>
                          </div>
                          {agency.rateNote && (
                            <div className="col-span-2 pt-1 border-t border-white/5 flex items-center justify-between gap-2">
                              <span className="text-emerald-300 font-semibold">{agency.rateNote}</span>
                              {agency.minCoinsOrder ? (
                                <span className="text-[10px] text-[#A59AB8] font-mono shrink-0">
                                  Min: {agency.minCoinsOrder.toLocaleString()} 🪙
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>

                        {/* Payment Methods */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {agency.paymentMethods.map((method) => (
                            <span
                              key={method}
                              className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-[#d8cee8]"
                            >
                              {method}
                            </span>
                          ))}
                        </div>

                        {/* Contact Action Buttons */}
                        <div className="space-y-2 pt-1">
                          {canOpenInbox && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAgencyInboxFromWallet();
                              }}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F97316] text-[#090611] text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>Open In-App Agency Inbox (Buy Coins)</span>
                            </button>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="col-span-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:brightness-110 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </a>

                            <a
                              href={telUrl}
                              onClick={(e) => e.stopPropagation()}
                              className="col-span-1 py-2.5 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/35 text-sky-200 text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyText(agency.whatsapp || agency.phone, 'Agency Number');
                              }}
                              className="col-span-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy No.</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Buyer Safety Reminder */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Always confirm the Official Agency Code before sending payment. Never share your password or OTP — verified Coin Seller Agencies only require your <strong>Lenzo ID</strong>.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* DRAWER: ADMIN FINANCIAL CONTROLS & WITHDRAWAL REVIEW       */}
        {/* ========================================================== */}
        {isAdminUser && isAdminPanelOpen && (
          <div className="absolute inset-0 z-40 bg-[#120822]/98 backdrop-blur-xl p-4 sm:p-5 flex flex-col overflow-y-auto no-scrollbar animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#FFC84A]" />
                <h3 className="text-base font-black text-white">Admin Financial & Agency Controls</h3>
              </div>
              <button onClick={() => setIsAdminPanelOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4 pb-8">
              {/* 1. Admin Offline Agency Order Credit Tool */}
              <div className="p-4 rounded-2xl bg-[#1b0e33] border border-emerald-400/30 space-y-3">
                <h4 className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4" />
                  Credit User Wallet (Offline Agency Top-Up)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">User Firebase UID</label>
                    <input
                      type="text"
                      value={creditTargetUid}
                      onChange={(e) => setCreditTargetUid(e.target.value)}
                      placeholder="Paste buyer Firebase UID"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Coins Amount (+/-)</label>
                    <input
                      type="number"
                      value={creditCoinsAmount}
                      onChange={(e) => setCreditCoinsAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-[#A59AB8]">Order / Agency Reference Note</label>
                    <input
                      type="text"
                      value={creditReasonNote}
                      onChange={(e) => setCreditReasonNote(e.target.value)}
                      placeholder="Offline Coin Seller Agency Order"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isCreditingCoins}
                  onClick={handleAdminCreditUserCoins}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black shadow disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isCreditingCoins ? 'Applying...' : 'Apply Wallet Coin Credit'}
                </button>
              </div>

              {/* 2. Manage Official Offline Coin Seller Agencies */}
              <div className="p-4 rounded-2xl bg-[#1b0e33] border border-white/10 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-black text-[#FFC84A] uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-4 h-4" />
                    Official Coin Seller Agencies ({coinSellerAgencies.length})
                  </h4>
                  {editingAgencyId && (
                    <button
                      type="button"
                      onClick={resetAgencyForm}
                      className="text-[11px] font-bold text-rose-300 hover:text-white"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Agency Name *</label>
                    <input
                      type="text"
                      value={agencyFormName}
                      onChange={(e) => setAgencyFormName(e.target.value)}
                      placeholder="e.g. Lenzo Coin Desk Lahore"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Owner / Desk Name</label>
                    <input
                      type="text"
                      value={agencyFormOwner}
                      onChange={(e) => setAgencyFormOwner(e.target.value)}
                      placeholder="e.g. Ali Khan"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Agency Code</label>
                    <input
                      type="text"
                      value={agencyFormCode}
                      onChange={(e) => setAgencyFormCode(e.target.value)}
                      placeholder="LP-COIN-06"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">City *</label>
                    <input
                      type="text"
                      value={agencyFormCity}
                      onChange={(e) => setAgencyFormCity(e.target.value)}
                      placeholder="Lahore / Karachi / Dubai"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">WhatsApp Number (with country code) *</label>
                    <input
                      type="text"
                      value={agencyFormWhatsapp}
                      onChange={(e) => setAgencyFormWhatsapp(e.target.value)}
                      placeholder="+923001234567"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Phone Number</label>
                    <input
                      type="text"
                      value={agencyFormPhone}
                      onChange={(e) => setAgencyFormPhone(e.target.value)}
                      placeholder="+923001234567"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-[#A59AB8]">Payment Methods (comma separated)</label>
                    <input
                      type="text"
                      value={agencyFormPayments}
                      onChange={(e) => setAgencyFormPayments(e.target.value)}
                      placeholder="JazzCash, EasyPaisa, Bank Transfer, Cash"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Working Hours</label>
                    <input
                      type="text"
                      value={agencyFormHours}
                      onChange={(e) => setAgencyFormHours(e.target.value)}
                      placeholder="24/7 Instant Delivery"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Badge Label</label>
                    <input
                      type="text"
                      value={agencyFormBadge}
                      onChange={(e) => setAgencyFormBadge(e.target.value)}
                      placeholder="OFFICIAL HQ / VERIFIED"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-[#A59AB8]">Rate / Service Note</label>
                    <input
                      type="text"
                      value={agencyFormRateNote}
                      onChange={(e) => setAgencyFormRateNote(e.target.value)}
                      placeholder="Official Rate • Instant Top-Up"
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs pt-1">
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agencyFormOnline}
                      onChange={(e) => setAgencyFormOnline(e.target.checked)}
                    />
                    <span>Online Now</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agencyFormEnabled}
                      onChange={(e) => setAgencyFormEnabled(e.target.checked)}
                    />
                    <span>Visible to Users</span>
                  </label>
                </div>

                <button
                  type="button"
                  disabled={isSavingAgency}
                  onClick={handleSaveAgency}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSavingAgency ? 'Saving...' : editingAgencyId ? 'Update Coin Seller Agency' : 'Add Coin Seller Agency'}</span>
                </button>

                {/* Existing Agencies Quick List */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  {coinSellerAgencies.map((agency) => (
                    <div
                      key={agency.id}
                      className="p-2.5 rounded-xl bg-[#110722] border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {agency.name} <span className="text-amber-300 font-mono text-[10px]">({agency.agencyCode})</span>
                        </div>
                        <div className="text-[10px] text-[#A59AB8] truncate">
                          {agency.city} • {agency.whatsapp} • {agency.enabled ? 'Visible' : 'Hidden'}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleAgencyOnline(agency)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                            agency.isOnline
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-white/10 text-gray-400'
                          }`}
                        >
                          {agency.isOnline ? 'Online' : 'Away'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAgencyEnabled(agency)}
                          className="px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white"
                        >
                          {agency.enabled ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditAgency(agency)}
                          className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
                          aria-label="Edit agency"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgency(agency)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                          aria-label="Delete agency"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Settings Configuration Card */}
              <div className="p-4 rounded-2xl bg-[#1b0e33] border border-white/10 space-y-3">
                <h4 className="text-xs font-black text-[#FFC84A] uppercase tracking-wider">
                  Global Rate & Limit Settings
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Commission Rate (%)</label>
                    <input
                      type="number"
                      value={adminCommissionInput}
                      onChange={(e) => setAdminCommissionInput(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Exchange Rate (PKR per Coin)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={adminExchangeRateInput}
                      onChange={(e) => setAdminExchangeRateInput(parseFloat(e.target.value) || 1)}
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Min Withdrawal (Coins)</label>
                    <input
                      type="number"
                      value={adminMinWithdrawInput}
                      onChange={(e) => setAdminMinWithdrawInput(parseInt(e.target.value, 10) || 1000)}
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A59AB8]">Max Withdrawal (Coins)</label>
                    <input
                      type="number"
                      value={adminMaxWithdrawInput}
                      onChange={(e) => setAdminMaxWithdrawInput(parseInt(e.target.value, 10) || 100000)}
                      className="w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveAdminSettings}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow active:scale-95 transition-all"
                >
                  Save Global Financial Rules
                </button>
              </div>

              {/* 4. Pending Withdrawal Requests Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-white uppercase tracking-wider">
                    Creator Withdrawal Requests ({adminRequests.length})
                  </h4>
                  <span className="text-[11px] text-[#A59AB8]">Live requests from creators</span>
                </div>

                {adminRequests.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#A59AB8] bg-[#170c2a] rounded-2xl border border-white/5">
                    No active withdrawal requests at this moment.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {adminRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-2xl bg-[#170c2a] border border-white/10 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-white text-sm">{req.userName}</span>
                            <span className="text-[10px] text-[#A59AB8] block">ID: #{req.id.slice(-6).toUpperCase()} • {req.requestedAt}</span>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            req.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : req.status === 'rejected'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {req.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#10061e] text-[11px]">
                          <div>
                            <span className="text-[#A59AB8] block">Requested:</span>
                            <span className="font-mono font-bold text-white">🪙 {req.coinsRequested.toLocaleString()} Coins</span>
                          </div>
                          <div>
                            <span className="text-[#A59AB8] block">Payable PKR:</span>
                            <span className="font-mono font-bold text-emerald-400">PKR {req.finalPayablePkr.toLocaleString()}</span>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-white/5">
                            <span className="text-[#A59AB8] block">Payout Details:</span>
                            <span className="font-mono text-gray-200">
                              {req.paymentDetails.bankOrProviderName} - {req.paymentDetails.accountTitle} ({req.paymentDetails.accountNumber})
                            </span>
                          </div>
                        </div>

                        {req.adminRemarks && (
                          <div className="text-[10px] text-[#A59AB8] italic">
                            Remarks: {req.adminRemarks} {req.paymentReference ? `(Ref: ${req.paymentReference})` : ''}
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        {req.status === 'pending' || req.status === 'under_review' || req.status === 'approved' ? (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleAdminStatusChange(req, 'paid')}
                              className="flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                            >
                              Approve & Mark Paid
                            </button>
                            <button
                              onClick={() => handleAdminStatusChange(req, 'rejected')}
                              className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-[11px]"
                            >
                              Reject & Return Coins
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
