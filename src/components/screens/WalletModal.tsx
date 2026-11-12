import React, { useState, useEffect } from 'react';
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
  Filter
} from 'lucide-react';
import { 
  UserProfile, 
  UserWalletData, 
  UserEarningsData, 
  WalletSettings, 
  WalletRechargePackage, 
  FinancialTransaction, 
  WithdrawalRequest,
  WithdrawalStatus 
} from '../../types';
import { 
  subscribeWalletSettings, 
  subscribeCoinPackages, 
  subscribeUserWallet, 
  subscribeUserEarnings, 
  subscribeTransactions, 
  subscribeAllWithdrawalRequests, 
  purchaseCoins, 
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

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRechargeSuccess?: (addedCoins: number) => void;
  initialTab?: 'wallet' | 'earnings';
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRechargeSuccess,
  initialTab = 'wallet',
}) => {
  // Main Dashboard Tab: 'wallet' (Purchased Coins) vs 'earnings' (Creator Revenue)
  const [activeMainTab, setActiveMainTab] = useState<'wallet' | 'earnings'>(initialTab);

  // Settings & Live Balances from Firestore
  const [settings, setSettings] = useState<WalletSettings>(DEFAULT_WALLET_SETTINGS);
  const [coinPackages, setCoinPackages] = useState<WalletRechargePackage[]>(DEFAULT_COIN_PACKAGES);
  
  const [walletData, setWalletData] = useState<UserWalletData>({
    userId: currentUser.id,
    walletPurchasedCoins: currentUser.coins || 10000,
    totalCoinsPurchased: currentUser.coins || 10000,
    totalCoinsSpent: 0,
    updatedAt: new Date().toISOString(),
  });

  const [earningsData, setEarningsData] = useState<UserEarningsData>({
    userId: currentUser.id,
    availableEarningsCoins: currentUser.diamonds || 4500,
    pendingWithdrawalCoins: 0,
    totalWithdrawnCoins: 0,
    grossGiftCoinsReceived: 5625,
    totalCommissionDeducted: 1125,
    totalConvertedToWallet: 0,
    totalGiftsCount: 6,
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
    const unsubWallet = subscribeUserWallet(currentUser.id, (w) => setWalletData(w));
    const unsubEarnings = subscribeUserEarnings(currentUser.id, (e) => setEarningsData(e));
    const unsubWalletTx = subscribeTransactions(currentUser.id, 'wallet', (txs) => setWalletTransactions(txs));
    const unsubEarningsTx = subscribeTransactions(currentUser.id, 'earnings', (txs) => setEarningsTransactions(txs));
    const unsubAllReqs = subscribeAllWithdrawalRequests((reqs) => setAdminRequests(reqs));

    return () => {
      unsubSettings();
      unsubPackages();
      unsubWallet();
      unsubEarnings();
      unsubWalletTx();
      unsubEarningsTx();
      unsubAllReqs();
    };
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  // Handlers
  const handleBuyPackage = async (pkg: WalletRechargePackage) => {
    showToast(`Processing purchase of ${pkg.coins.toLocaleString()} coins...`);
    const res = await purchaseCoins(currentUser.id, pkg.id, settings);
    if (res.success) {
      showToast(`Recharge successful! +${(pkg.coins + (pkg.bonusCoins || 0)).toLocaleString()} Coins added to your Wallet.`);
      if (onRechargeSuccess) {
        onRechargeSuccess(pkg.coins + (pkg.bonusCoins || 0));
      }
    } else {
      showError(res.error || 'Failed to complete coin recharge');
    }
  };

  const handleConvertEarnings = async () => {
    const num = parseInt(convertCoinsInput, 10);
    if (isNaN(num) || num <= 0) {
      showError('Please enter a valid amount of coins to convert');
      return;
    }
    if (num > earningsData.availableEarningsCoins) {
      showError(`Cannot convert more than available earnings (${earningsData.availableEarningsCoins.toLocaleString()} coins)`);
      return;
    }

    setIsConverting(true);
    const res = await convertEarningsToWallet(currentUser.id, num, settings);
    setIsConverting(false);

    if (res.success) {
      setIsConvertModalOpen(false);
      showToast(`Successfully converted ${num.toLocaleString()} earnings into ${res.walletCoinsReceived.toLocaleString()} Wallet Coins!`);
      if (onRechargeSuccess) onRechargeSuccess(res.walletCoinsReceived);
    } else {
      showError(res.error || 'Conversion failed');
    }
  };

  const handleSubmitWithdrawal = async () => {
    const num = parseInt(withdrawCoinsInput, 10);
    if (isNaN(num) || num < settings.minWithdrawalCoins) {
      showError(`Minimum withdrawal is ${settings.minWithdrawalCoins.toLocaleString()} coins (PKR ${(settings.minWithdrawalCoins * settings.exchangeRatePkrPerCoin).toLocaleString()})`);
      return;
    }
    if (num > settings.maxWithdrawalCoins) {
      showError(`Maximum withdrawal is ${settings.maxWithdrawalCoins.toLocaleString()} coins per request`);
      return;
    }
    if (num > earningsData.availableEarningsCoins) {
      showError(`Insufficient available earnings (${earningsData.availableEarningsCoins.toLocaleString()} coins available)`);
      return;
    }
    if (!accountTitle.trim() || !accountNumber.trim()) {
      showError('Please enter valid account title and account / IBAN number');
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
        bankOrProviderName: bankOrProviderName.trim(),
        phoneNumber: phoneNumber.trim(),
      },
      settings
    );
    setIsSubmittingWithdrawal(false);

    if (res.success) {
      setIsWithdrawModalOpen(false);
      showToast(`Withdrawal request #${res.requestId.slice(-6).toUpperCase()} submitted! PKR ${res.finalPayablePkr.toLocaleString()} will be sent upon review.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in select-none">
      <div 
        className="w-full max-w-2xl bg-[#0e071c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[92vh]"
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
              <p className="text-[11px] text-[#A59AB8]">Separate Purchased Coins & Creator Earnings System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Admin Controls Trigger */}
            <button
              onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFC84A] text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="Admin Financial Controls & Withdrawal Approvals"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Panel</span>
            </button>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. TWO MAIN TABS: 1. WALLET | 2. EARNINGS */}
        <div className="grid grid-cols-2 p-2 bg-[#120822] border-b border-white/[0.06] gap-2">
          {/* TAB 1: WALLET */}
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
            <span>WALLET COINS</span>
            {activeMainTab === 'wallet' && (
              <span className="w-2 h-2 rounded-full bg-[#FFC84A] animate-pulse" />
            )}
          </button>

          {/* TAB 2: EARNINGS */}
          <button
            onClick={() => {
              setActiveMainTab('earnings');
              setSelectedTxFilter('all');
            }}
            className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${
              activeMainTab === 'earnings'
                ? 'bg-gradient-to-r from-[#8B20FF]/25 via-[#F328D5]/20 to-[#FA26A0]/20 border border-[#F328D5]/50 text-[#ff7df1] shadow-[0_4px_16px_rgba(243,40,213,0.2)]'
                : 'text-[#A59AB8] hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#F328D5]" />
            <span>EARNINGS</span>
            {activeMainTab === 'earnings' && (
              <span className="w-2 h-2 rounded-full bg-[#F328D5] animate-pulse" />
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

              {/* Coin Recharge Packages Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FFC84A]" />
                      Recharge Packages
                    </h3>
                    <p className="text-[11px] text-[#A59AB8]">Instant automated delivery with bonus coin perks</p>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">1 Coin ≈ PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {coinPackages.filter((p) => p.enabled).map((pkg) => (
                    <div
                      key={pkg.id}
                      className={`relative p-3.5 rounded-2xl bg-[#170c2a] border transition-all flex flex-col justify-between group ${
                        pkg.isPopular
                          ? 'border-amber-400/60 shadow-[0_4px_16px_rgba(255,200,74,0.15)] bg-gradient-to-b from-[#24133f] to-[#170c2a]'
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

                      <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-black text-white font-mono">{pkg.displayPrice}</span>
                        <button
                          onClick={() => handleBuyPackage(pkg)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:opacity-95 text-black text-xs font-black shadow active:scale-95 transition-all"
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
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
          {/* TAB 2 CONTENT: CREATOR EARNINGS & WITHDRAWAL SYSTEM       */}
          {/* ========================================================== */}
          {activeMainTab === 'earnings' && (
            <div className="space-y-5">
              {/* Earnings Balance Card */}
              <div className="relative p-5 rounded-3xl bg-gradient-to-br from-[#2a0e42] via-[#1a0833] to-[#100520] border border-[#F328D5]/30 shadow-xl overflow-hidden">
                <div className="absolute -top-10 -right-10 w-44 h-44 bg-[#F328D5]/15 rounded-full blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-[#e1d5f3] flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-[#F328D5]" />
                    Available Net Earnings
                  </span>
                  <span className="text-[10px] text-pink-300 font-extrabold px-2 py-0.5 rounded-full bg-[#F328D5]/20 border border-[#F328D5]/30">
                    Eligible for Cash Payout
                  </span>
                </div>

                <div className="flex items-baseline justify-between flex-wrap gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black text-[#ff83f3] font-mono tracking-tight">
                      {earningsData.availableEarningsCoins.toLocaleString()}
                    </span>
                    <span className="text-xs text-[#A59AB8] font-bold">Coins</span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      ≈ PKR {(earningsData.availableEarningsCoins * settings.exchangeRatePkrPerCoin).toLocaleString()}
                    </span>
                    <div className="text-[10px] text-[#A59AB8]">Net after {settings.commissionRatePercent}% Commission</div>
                  </div>
                </div>

                {/* Sub-balances breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Pending Payout</span>
                    <span className="font-bold text-amber-300 font-mono">🪙 {earningsData.pendingWithdrawalCoins.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Withdrawn Paid</span>
                    <span className="font-bold text-emerald-400 font-mono">🪙 {earningsData.totalWithdrawnCoins.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A59AB8] block">Gross Received</span>
                    <span className="font-bold text-purple-300 font-mono">🪙 {earningsData.grossGiftCoinsReceived.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons: WITHDRAW & Convert Earnings to Wallet */}
                <div className="flex items-center gap-3 mt-4 pt-2">
                  <button
                    onClick={() => setIsWithdrawModalOpen(true)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white text-xs font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>WITHDRAW CASH</span>
                  </button>

                  <button
                    onClick={() => setIsConvertModalOpen(true)}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#c415f5] hover:opacity-95 text-white text-xs font-black shadow-[0_4px_16px_rgba(243,40,213,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Convert to Wallet</span>
                  </button>
                </div>
              </div>

              {/* Commission & Earnings Metrics Card */}
              <div className="p-4 rounded-2xl bg-[#150a25] border border-white/10 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Platform Commission Rate:</span>
                  <span className="font-bold text-amber-300">{settings.commissionRatePercent}%</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Exchange Rate:</span>
                  <span className="font-bold text-emerald-400">1 Coin = PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-white/5 pb-2">
                  <span className="text-[#A59AB8]">Total Platform Commission Paid:</span>
                  <span className="font-mono text-purple-300">🪙 {earningsData.totalCommissionDeducted.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#A59AB8]">Total Converted to Wallet Coins:</span>
                  <span className="font-mono text-cyan-300">🪙 {earningsData.totalConvertedToWallet.toLocaleString()}</span>
                </div>
              </div>

              {/* Earnings Transaction History */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#A59AB8]" />
                    Earnings & Payout History
                  </h3>
                  <select
                    value={selectedTxFilter}
                    onChange={(e) => setSelectedTxFilter(e.target.value)}
                    className="bg-[#1b0e33] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none"
                  >
                    <option value="all">All Earnings Events</option>
                    <option value="gift_received">Gifts Received</option>
                    <option value="withdrawal_request">Withdrawals</option>
                    <option value="earnings_conversion">Converted to Wallet</option>
                    <option value="withdrawal_refund">Refunds</option>
                  </select>
                </div>

                <div className="space-y-2">
                  {filteredTxs.length === 0 ? (
                    <div className="p-8 text-center text-[#8e82a3] bg-[#140a24] rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-white">No Earnings History</p>
                      <p className="text-[11px] mt-0.5">Host live rooms, stream PK battles, or receive virtual gifts to build earnings.</p>
                    </div>
                  ) : (
                    filteredTxs.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[#140a24] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            tx.amount > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-pink-500/20 text-pink-400'
                          }`}>
                            {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate text-[11px]">{tx.description}</p>
                            <span className="text-[10px] text-gray-500">{tx.timestamp}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-pink-400'}`}>
                            {tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString()} 🪙
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
        {/* MODAL 1: CONVERT EARNINGS TO WALLET COINS                  */}
        {/* ========================================================== */}
        {isConvertModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[#190e2e] border border-white/15 p-5 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-[#F328D5]" />
                  Convert Earnings to Wallet
                </h3>
                <button onClick={() => setIsConvertModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-[#110820] border border-white/5 space-y-1 text-xs">
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Available Earnings:</span>
                  <span className="font-mono font-bold text-white">🪙 {earningsData.availableEarningsCoins.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Conversion Rate:</span>
                  <span className="font-bold text-amber-300">1:1 (No conversion fee)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300">Enter Coins to Convert</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={convertCoinsInput}
                    onChange={(e) => setConvertCoinsInput(e.target.value)}
                    max={earningsData.availableEarningsCoins}
                    className="w-full bg-[#23133e] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-[#F328D5]"
                  />
                  <button
                    onClick={() => setConvertCoinsInput(earningsData.availableEarningsCoins.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#F328D5]/20 text-[#ff8cf4]"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Conversion Preview */}
              <div className="p-3 rounded-xl bg-purple-900/30 border border-purple-500/20 text-xs flex items-center justify-between">
                <span className="text-[#d7c9ec]">You will receive:</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  🪙 {willReceiveWalletCoins.toLocaleString()} Wallet Coins
                </span>
              </div>

              <p className="text-[10px] text-gray-400 leading-tight">
                * Converted coins will be instantly credited to your Wallet Coins balance and can be used for gifting. Converted coins cannot be withdrawn as cash.
              </p>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setIsConvertModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  disabled={isConverting || convertCoinsNum <= 0 || convertCoinsNum > earningsData.availableEarningsCoins}
                  onClick={handleConvertEarnings}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-bold shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isConverting ? 'Converting...' : 'Confirm Conversion'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* MODAL 2: WITHDRAWAL REQUEST SYSTEM                         */}
        {/* ========================================================== */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md rounded-3xl bg-[#170a29] border border-white/15 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-black text-white">Withdraw Creator Earnings</h3>
                </div>
                <button onClick={() => setIsWithdrawModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Limits Strip */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-[#10061e] border border-white/5">
                <div>
                  <span className="text-[#A59AB8] block">Available Earnings:</span>
                  <span className="font-bold text-white font-mono">🪙 {earningsData.availableEarningsCoins.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#A59AB8] block">Exchange Rate:</span>
                  <span className="font-bold text-emerald-400 font-mono">1 Coin = PKR {settings.exchangeRatePkrPerCoin}</span>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <span className="text-[#A59AB8] block">Min Limit:</span>
                  <span className="font-bold text-amber-300 font-mono">🪙 {settings.minWithdrawalCoins.toLocaleString()}</span>
                </div>
                <div className="pt-1 border-t border-white/5">
                  <span className="text-[#A59AB8] block">Withdrawal Fee:</span>
                  <span className="font-bold text-purple-300 font-mono">{settings.withdrawalFeePercent}%</span>
                </div>
              </div>

              {/* Amount to Withdraw */}
              <div>
                <label className="text-xs font-bold text-gray-300">Withdrawal Amount (in Coins)</label>
                <div className="relative mt-1">
                  <input
                    type="number"
                    value={withdrawCoinsInput}
                    onChange={(e) => setWithdrawCoinsInput(e.target.value)}
                    min={settings.minWithdrawalCoins}
                    max={Math.min(settings.maxWithdrawalCoins, earningsData.availableEarningsCoins)}
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={() => setWithdrawCoinsInput(earningsData.availableEarningsCoins.toString())}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Payout Method Selection */}
              <div>
                <label className="text-xs font-bold text-gray-300">Select Payout Method</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {DEFAULT_PAYOUT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedPayoutMethod(m.type)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        selectedPayoutMethod === m.type
                          ? 'border-emerald-400 bg-emerald-950/30 text-white font-bold shadow'
                          : 'border-white/10 bg-[#22103a] text-[#A59AB8] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {m.type === 'bank_transfer' && <Building2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {m.type === 'jazzcash' && <Smartphone className="w-3.5 h-3.5 text-amber-400" />}
                        {m.type === 'easypaisa' && <Smartphone className="w-3.5 h-3.5 text-teal-400" />}
                        {m.type === 'cash_pickup' && <CreditCard className="w-3.5 h-3.5 text-cyan-400" />}
                        <span className="truncate">{m.name.split(' ')[0]}</span>
                      </div>
                      <span className="text-[10px] opacity-70 block">{m.type === 'bank_transfer' ? 'IBAN / 1Link' : 'Mobile Account'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Details Form */}
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-gray-300">Account Title / Full Legal Name</label>
                  <input
                    type="text"
                    value={accountTitle}
                    onChange={(e) => setAccountTitle(e.target.value)}
                    placeholder="e.g. Sara Ali Khan"
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-300">
                    {selectedPayoutMethod === 'bank_transfer' ? 'Bank Name' : 'Provider Name'}
                  </label>
                  <input
                    type="text"
                    value={bankOrProviderName}
                    onChange={(e) => setBankOrProviderName(e.target.value)}
                    placeholder="e.g. Meezan Bank / HBL / JazzCash"
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-300">
                    {selectedPayoutMethod === 'bank_transfer' ? 'Account Number / 24-Digit IBAN' : 'Mobile Account Number'}
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder={selectedPayoutMethod === 'bank_transfer' ? 'PK00MEZN0000000000000000' : '03001234567'}
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-300">Contact Mobile Number (for confirmation)</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="03001234567"
                    className="w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              {/* Net Payable Breakdown Card */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 space-y-1.5 text-xs">
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Gross Equivalent (PKR):</span>
                  <span className="font-mono text-white">PKR {withdrawGrossPkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[#A59AB8]">
                  <span>Processing Fee ({settings.withdrawalFeePercent}%):</span>
                  <span className="font-mono text-rose-300">- PKR {withdrawFeePkr.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-emerald-500/20 font-black text-sm">
                  <span className="text-white">Final Payable Amount:</span>
                  <span className="font-mono text-emerald-400">PKR {withdrawNetPkr.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15"
                >
                  Cancel
                </button>
                <button
                  disabled={isSubmittingWithdrawal || withdrawCoinsNum < settings.minWithdrawalCoins || withdrawCoinsNum > earningsData.availableEarningsCoins}
                  onClick={handleSubmitWithdrawal}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isSubmittingWithdrawal ? 'Submitting...' : 'Confirm & Request Payout'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* DRAWER: ADMIN FINANCIAL CONTROLS & WITHDRAWAL REVIEW       */}
        {/* ========================================================== */}
        {isAdminPanelOpen && (
          <div className="absolute inset-0 z-40 bg-[#120822]/98 backdrop-blur-xl p-4 sm:p-5 flex flex-col overflow-y-auto no-scrollbar animate-in slide-in-from-right">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#FFC84A]" />
                <h3 className="text-base font-black text-white">Admin Financial & Payout Controls</h3>
              </div>
              <button onClick={() => setIsAdminPanelOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 pt-4">
              {/* Settings Configuration Card */}
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

              {/* Pending Withdrawal Requests Table */}
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
