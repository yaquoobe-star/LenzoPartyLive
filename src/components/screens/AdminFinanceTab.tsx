import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Coins,
  Download,
  Edit3,
  FileSpreadsheet,
  Gem,
  Landmark,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sliders,
  Trash2,
  TrendingUp,
  Wallet,
  AlertTriangle,
} from 'lucide-react';
import {
  OFFICIAL_ECONOMY_DEFAULTS,
  PlatformEconomyConfig,
  QaAssertionResult,
  calculateCoinPurchasePricePkr,
  calculateGiftSplit,
  calculateWithdrawalWaterfall,
  getDayKey,
  getMonthKey,
  roundPkr,
  runFinancialQaAssertions,
  validateEconomySettings,
} from '../../shared/financialEngine';
import {
  AgencyCommissionRecord,
  AgencyFinancialRecord,
  CoinPurchaseRecord,
  FinancialAuditLog,
  GiftTransactionRecord,
  PlatformBeansLedgerEntry,
  PlatformRevenueSummary,
  UserEarningsData,
  WalletRechargePackage,
  WithdrawalRequest,
  WithdrawalStatus,
} from '../../types';
import {
  EMPTY_PLATFORM_REVENUE,
  ReconciliationReport,
  adminCreditVerifiedCoinPurchase,
  adminDeleteCoinPackage,
  adminMarkAgencyCommissionPaid,
  adminSaveCoinPackage,
  adminSaveEconomySettings,
  adminSeedOfficialCoinPackages,
  adminUpdateAgencyCommissionOverride,
  downloadCsvReport,
  runFinancialMigrationAndReconciliation,
  subscribeAgencyCommissions,
  subscribeAgencyFinancialRecords,
  subscribeAllHostEarnings,
  subscribeCoinPurchases,
  subscribeFinancialAuditLogs,
  subscribeGiftTransactions,
  subscribePlatformBeansLedger,
  subscribePlatformFinancialSettings,
  subscribePlatformRevenue,
} from '../../services/financialService';
import {
  adminUpdateWithdrawalStatus,
  subscribeAllWithdrawalRequests,
  subscribeCoinPackages,
} from '../../services/walletService';
import { AdminUserRecord, subscribeAllUsersForAdmin } from '../../services/adminService';
import { DualAgencyRecord, subscribeAllAgenciesForAdmin } from '../../services/agencyService';

interface AdminFinanceTabProps {
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

type FinanceSubTab =
  | 'overview'
  | 'economy'
  | 'packages'
  | 'hosts'
  | 'withdrawals'
  | 'agencies'
  | 'ledger';

const WITHDRAWAL_STATUS_OPTIONS: WithdrawalStatus[] = [
  'pending',
  'under_review',
  'approved',
  'processing',
  'paid',
  'rejected',
  'cancelled',
];

export const AdminFinanceTab: React.FC<AdminFinanceTabProps> = ({ onNotify, onError }) => {
  const [subTab, setSubTab] = useState<FinanceSubTab>('overview');

  // Live Real-Time Firestore Financial State
  const [economy, setEconomy] = useState<PlatformEconomyConfig>(OFFICIAL_ECONOMY_DEFAULTS);
  const [revenue, setRevenue] = useState<PlatformRevenueSummary>(EMPTY_PLATFORM_REVENUE);
  const [beansLedger, setBeansLedger] = useState<PlatformBeansLedgerEntry[]>([]);
  const [giftTxs, setGiftTxs] = useState<GiftTransactionRecord[]>([]);
  const [coinPurchases, setCoinPurchases] = useState<CoinPurchaseRecord[]>([]);
  const [packages, setPackages] = useState<WalletRechargePackage[]>([]);
  const [hostEarnings, setHostEarnings] = useState<UserEarningsData[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [agencyCommissions, setAgencyCommissions] = useState<AgencyCommissionRecord[]>([]);
  const [agencyRecords, setAgencyRecords] = useState<AgencyFinancialRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [dualAgencies, setDualAgencies] = useState<DualAgencyRecord[]>([]);

  // Economy Settings Form State
  const [cfgPurchase100k, setCfgPurchase100k] = useState('3000');
  const [cfgAppShare, setCfgAppShare] = useState('40');
  const [cfgHostShare, setCfgHostShare] = useState('60');
  const [cfgDiamondRatio, setCfgDiamondRatio] = useState('1');
  const [cfgWithdraw100k, setCfgWithdraw100k] = useState('2600');
  const [cfgMinWd, setCfgMinWd] = useState('10000');
  const [cfgMaxWd, setCfgMaxWd] = useState('10000000');
  const [cfgAgencyComm, setCfgAgencyComm] = useState('0');
  const [cfgFeePct, setCfgFeePct] = useState('0');
  const [cfgBonusEnabled, setCfgBonusEnabled] = useState(true);
  const [cfgMaxBonusPct, setCfgMaxBonusPct] = useState('25');
  const [cfgMethods, setCfgMethods] = useState<Array<'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cash_pickup'>>([
    'bank_transfer',
    'easypaisa',
    'jazzcash',
  ]);
  const [cfgReason, setCfgReason] = useState('');
  const [savingCfg, setSavingCfg] = useState(false);

  // Coin Package Editor + Verified Purchase Form
  const [pkgId, setPkgId] = useState('');
  const [pkgCoins, setPkgCoins] = useState('100000');
  const [pkgBonus, setPkgBonus] = useState('0');
  const [pkgPricePkr, setPkgPricePkr] = useState('3000');
  const [pkgBadge, setPkgBadge] = useState('OFFICIAL');
  const [pkgVisibility, setPkgVisibility] = useState<'public' | 'vip_only' | 'hidden'>('public');
  const [pkgPopular, setPkgPopular] = useState(false);
  const [pkgPromo, setPkgPromo] = useState(false);
  const [pkgEnabled, setPkgEnabled] = useState(true);
  const [savingPkg, setSavingPkg] = useState(false);

  const [buyTargetUid, setBuyTargetUid] = useState('');
  const [buyPaidCoins, setBuyPaidCoins] = useState('100000');
  const [buyBonusCoins, setBuyBonusCoins] = useState('0');
  const [buyMethod, setBuyMethod] = useState('Bank Transfer');
  const [buyRef, setBuyRef] = useState('');
  const [creditingBuy, setCreditingBuy] = useState(false);

  // Filters & Drill-Down
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'today' | 'month'>('all');
  const [hostSearch, setHostSearch] = useState('');
  const [wdFilter, setWdFilter] = useState<'all' | WithdrawalStatus>('all');
  const [wdSearch, setWdSearch] = useState('');
  const [selectedWd, setSelectedWd] = useState<WithdrawalRequest | null>(null);
  const [wdRemarks, setWdRemarks] = useState('');
  const [wdPayRef, setWdPayRef] = useState('');
  const [processingWd, setProcessingWd] = useState(false);

  // Agency Rule Editor
  const [agencyOverrideInputs, setAgencyOverrideInputs] = useState<Record<string, string>>({});

  // QA Suite & Reconciliation
  const [qaResults, setQaResults] = useState<QaAssertionResult[] | null>(null);
  const [reconReport, setReconReport] = useState<ReconciliationReport | null>(null);
  const [runningRecon, setRunningRecon] = useState(false);

  useEffect(() => {
    const unsubs = [
      subscribePlatformFinancialSettings((cfg) => {
        setEconomy(cfg);
        setCfgPurchase100k(String(cfg.coinPurchasePkrPer100k));
        setCfgAppShare(String(cfg.appSharePercent));
        setCfgHostShare(String(cfg.hostSharePercent));
        setCfgDiamondRatio(String(cfg.diamondConversionRatio));
        setCfgWithdraw100k(String(cfg.diamondWithdrawalPkrPer100k));
        setCfgMinWd(String(cfg.minWithdrawalDiamonds));
        setCfgMaxWd(String(cfg.maxWithdrawalDiamonds));
        setCfgAgencyComm(String(cfg.agencyCommissionPercent));
        setCfgFeePct(String(cfg.withdrawalProcessingFeePercent));
        setCfgBonusEnabled(cfg.bonusCoinsEnabled);
        setCfgMaxBonusPct(String(cfg.maxBonusCoinPercent));
        setCfgMethods(cfg.enabledPaymentMethods);
      }),
      subscribePlatformRevenue(setRevenue),
      subscribePlatformBeansLedger(setBeansLedger),
      subscribeGiftTransactions(setGiftTxs),
      subscribeCoinPurchases(setCoinPurchases),
      subscribeCoinPackages(setPackages),
      subscribeAllHostEarnings(setHostEarnings),
      subscribeAllWithdrawalRequests(setWithdrawals),
      subscribeAgencyCommissions(setAgencyCommissions),
      subscribeAgencyFinancialRecords(setAgencyRecords),
      subscribeFinancialAuditLogs(setAuditLogs),
      subscribeAllUsersForAdmin(setUsers),
      subscribeAllAgenciesForAdmin(setDualAgencies),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const userMap = useMemo(() => {
    const map = new Map<string, AdminUserRecord>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const todayKey = getDayKey();
  const monthKey = getMonthKey();

  const analytics = useMemo(() => {
    const filteredBeans = beansLedger.filter((entry) => {
      if (dateRangeFilter === 'today') return entry.dayKey === todayKey;
      if (dateRangeFilter === 'month') return entry.monthKey === monthKey;
      return true;
    });

    const dailyBeans = beansLedger
      .filter((e) => e.dayKey === todayKey)
      .reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
    const monthlyBeans = beansLedger
      .filter((e) => e.monthKey === monthKey)
      .reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
    const filteredBeansSum = filteredBeans.reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
    const filteredGrossCoins = filteredBeans.reduce((sum, e) => sum + Number(e.grossCoins || 0), 0);

    const pendingWithdrawals = withdrawals.filter(
      (w) => !['paid', 'rejected', 'cancelled'].includes(w.status)
    );
    const pendingWithdrawalsPkr = pendingWithdrawals.reduce((sum, w) => sum + Number(w.finalPayablePkr || 0), 0);
    const pendingWithdrawalsDiamonds = pendingWithdrawals.reduce((sum, w) => sum + Number(w.coinsRequested || 0), 0);

    const totalHostDiamondsAvailable = hostEarnings.reduce((s, h) => s + Number(h.availableEarningsCoins || 0), 0);
    const totalHostDiamondsEarned = hostEarnings.reduce((s, h) => s + Number(h.totalEarnedDiamonds || 0), 0);
    const totalHostDiamondsWithdrawn = hostEarnings.reduce((s, h) => s + Number(h.totalWithdrawnCoins || 0), 0);
    const activeHostsCount = hostEarnings.filter((h) => (h.totalEarnedDiamonds || 0) > 0).length;

    const totalAgencyCommissionAccruedPkr = agencyCommissions.reduce((s, c) => s + Number(c.commissionPkr || 0), 0);

    const totalCoinsBought =
      revenue.totalCoinsSoldPaid > 0
        ? revenue.totalCoinsSoldPaid
        : coinPurchases.reduce((s, c) => s + Number(c.paidCoins || 0), 0);

    return {
      dailyBeans,
      monthlyBeans,
      filteredBeansSum,
      filteredGrossCoins,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsPkr: roundPkr(pendingWithdrawalsPkr),
      pendingWithdrawalsDiamonds,
      totalHostDiamondsAvailable,
      totalHostDiamondsEarned,
      totalHostDiamondsWithdrawn,
      activeHostsCount,
      totalAgencyCommissionAccruedPkr: roundPkr(totalAgencyCommissionAccruedPkr),
      totalCoinsBought,
    };
  }, [beansLedger, withdrawals, hostEarnings, agencyCommissions, coinPurchases, revenue, dateRangeFilter, todayKey, monthKey]);

  const draftEconomyPreview = useMemo(() => {
    const candidate: Partial<PlatformEconomyConfig> = {
      coinPurchasePkrPer100k: Number(cfgPurchase100k),
      appSharePercent: Number(cfgAppShare),
      hostSharePercent: Number(cfgHostShare),
      diamondConversionRatio: Number(cfgDiamondRatio),
      diamondWithdrawalPkrPer100k: Number(cfgWithdraw100k),
      minWithdrawalDiamonds: Number(cfgMinWd),
      maxWithdrawalDiamonds: Number(cfgMaxWd),
      agencyCommissionPercent: Number(cfgAgencyComm),
      withdrawalProcessingFeePercent: Number(cfgFeePct),
      bonusCoinsEnabled: cfgBonusEnabled,
      maxBonusCoinPercent: Number(cfgMaxBonusPct),
      enabledPaymentMethods: cfgMethods,
    };
    const check = validateEconomySettings(candidate);
    if (!check.valid || !check.normalized) {
      return { valid: false, error: check.error, gift100k: null, wd100k: null, wd100kAgency: null };
    }
    return {
      valid: true,
      error: null,
      gift100k: calculateGiftSplit(100000, check.normalized),
      wd100k: calculateWithdrawalWaterfall(100000, check.normalized, { hostHasActiveAgency: false }),
      wd100kAgency: calculateWithdrawalWaterfall(100000, check.normalized, { hostHasActiveAgency: true }),
    };
  }, [
    cfgPurchase100k,
    cfgAppShare,
    cfgHostShare,
    cfgDiamondRatio,
    cfgWithdraw100k,
    cfgMinWd,
    cfgMaxWd,
    cfgAgencyComm,
    cfgFeePct,
    cfgBonusEnabled,
    cfgMaxBonusPct,
    cfgMethods,
  ]);

  const handleSaveEconomy = async () => {
    if (!draftEconomyPreview.valid) {
      onError(draftEconomyPreview.error || 'Please fix economy validation errors.');
      return;
    }
    if (!cfgReason.trim()) {
      onError('Please enter a Change Reason for the immutable financial audit log.');
      return;
    }
    setSavingCfg(true);
    const res = await adminSaveEconomySettings(
      {
        coinPurchasePkrPer100k: Number(cfgPurchase100k),
        appSharePercent: Number(cfgAppShare),
        hostSharePercent: Number(cfgHostShare),
        diamondConversionRatio: Number(cfgDiamondRatio),
        diamondWithdrawalPkrPer100k: Number(cfgWithdraw100k),
        minWithdrawalDiamonds: Number(cfgMinWd),
        maxWithdrawalDiamonds: Number(cfgMaxWd),
        agencyCommissionPercent: Number(cfgAgencyComm),
        withdrawalProcessingFeePercent: Number(cfgFeePct),
        bonusCoinsEnabled: cfgBonusEnabled,
        maxBonusCoinPercent: Number(cfgMaxBonusPct),
        enabledPaymentMethods: cfgMethods,
      },
      cfgReason
    );
    setSavingCfg(false);
    if (res.success) {
      setCfgReason('');
      onNotify(`Economy Settings saved (v${res.config?.configVersion}) and logged to audit trail.`);
    } else {
      onError(res.error || 'Failed to update economy settings.');
    }
  };

  const handleSavePkg = async () => {
    const coinsNum = parseInt(pkgCoins, 10);
    const bonusNum = parseInt(pkgBonus || '0', 10);
    const priceNum = parseFloat(pkgPricePkr);
    if (!Number.isFinite(coinsNum) || coinsNum <= 0 || !Number.isFinite(priceNum) || priceNum <= 0) {
      onError('Enter valid positive Coin quantity and PKR price.');
      return;
    }
    setSavingPkg(true);
    const id = pkgId.trim() || `pack_${coinsNum}`;
    const res = await adminSaveCoinPackage(
      {
        id,
        coins: coinsNum,
        bonusCoins: Math.max(0, bonusNum || 0),
        pricePkr: priceNum,
        displayPrice: `PKR ${priceNum.toLocaleString()}`,
        badge: pkgBadge.trim() || undefined,
        visibility: pkgVisibility,
        isPopular: pkgPopular,
        isPromotional: pkgPromo,
        enabled: pkgEnabled,
      },
      pkgId ? `Updated coin package ${id}` : `Created coin package ${id}`
    );
    setSavingPkg(false);
    if (res.success) {
      onNotify(`Saved Coin Package ${id} (${coinsNum.toLocaleString()} Coins = PKR ${priceNum.toLocaleString()}).`);
      setPkgId('');
    } else {
      onError(res.error || 'Failed to save package.');
    }
  };

  const handleCreditVerifiedPurchase = async () => {
    const uid = buyTargetUid.trim();
    const paid = parseInt(buyPaidCoins, 10);
    const bonus = parseInt(buyBonusCoins || '0', 10);
    if (!uid || !Number.isFinite(paid) || paid <= 0 || !buyRef.trim()) {
      onError('Select/enter User UID, positive Paid Coins, and Payment Reference.');
      return;
    }
    const targetUser = userMap.get(uid);
    setCreditingBuy(true);
    const res = await adminCreditVerifiedCoinPurchase({
      targetUid: uid,
      targetName: targetUser?.fullName || uid.slice(0, 10),
      targetDisplayId: targetUser?.displayId || '',
      paidCoins: paid,
      bonusCoins: Math.max(0, bonus || 0),
      paymentMethod: buyMethod,
      paymentReference: buyRef.trim(),
      economyConfig: economy,
    });
    setCreditingBuy(false);
    if (res.success) {
      onNotify(`Credited ${paid.toLocaleString()} Paid + ${Math.max(0, bonus || 0).toLocaleString()} Bonus Coins (TX ${res.purchaseId?.slice(-6).toUpperCase()}).`);
      setBuyRef('');
    } else {
      onError(res.error || 'Failed to credit verified coin purchase.');
    }
  };

  const handleUpdateWithdrawal = async (req: WithdrawalRequest, status: WithdrawalStatus) => {
    setProcessingWd(true);
    const res = await adminUpdateWithdrawalStatus(req, status, wdRemarks, wdPayRef);
    setProcessingWd(false);
    if (res.success) {
      onNotify(`Withdrawal #${req.id.slice(-6).toUpperCase()} updated to ${status.toUpperCase()}.`);
      setSelectedWd(null);
      setWdRemarks('');
      setWdPayRef('');
    } else {
      onError(res.error || 'Failed to update withdrawal.');
    }
  };

  const handleRunQaSuite = () => {
    const report = runFinancialQaAssertions();
    setQaResults(report.results);
    if (report.allPassed) {
      onNotify('All Financial QA Assertions (Tests A–E) PASSED 100%.');
    } else {
      onError('One or more QA assertions failed — inspect results below.');
    }
  };

  const handleRunReconciliation = async () => {
    setRunningRecon(true);
    const res = await runFinancialMigrationAndReconciliation();
    setRunningRecon(false);
    if (res.success && res.report) {
      setReconReport(res.report);
      onNotify(
        `Reconciliation complete: ${res.report.usersScanned} users scanned, ${res.report.flags.length} discrepancies flagged.`
      );
    } else {
      onError(res.error || 'Reconciliation failed.');
    }
  };

  const filteredHostEarnings = useMemo(() => {
    const q = hostSearch.trim().toLowerCase();
    return hostEarnings.filter((h) => {
      if (!q) return true;
      const u = userMap.get(h.userId);
      return (
        h.userId.toLowerCase().includes(q) ||
        (u?.fullName || '').toLowerCase().includes(q) ||
        (u?.username || '').toLowerCase().includes(q) ||
        (u?.displayId || '').toLowerCase().includes(q)
      );
    });
  }, [hostEarnings, hostSearch, userMap]);

  const filteredWithdrawals = useMemo(() => {
    const q = wdSearch.trim().toLowerCase();
    return withdrawals.filter((w) => {
      if (wdFilter !== 'all' && w.status !== wdFilter) return false;
      if (!q) return true;
      return (
        w.id.toLowerCase().includes(q) ||
        w.userId.toLowerCase().includes(q) ||
        w.userName.toLowerCase().includes(q) ||
        (w.userDisplayId || '').toLowerCase().includes(q) ||
        (w.paymentReference || '').toLowerCase().includes(q)
      );
    });
  }, [withdrawals, wdFilter, wdSearch]);

  const hostAgencies = useMemo(
    () => dualAgencies.filter((a) => a.agencyType === 'host_agency'),
    [dualAgencies]
  );

  const subTabs: Array<{ id: FinanceSubTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Analytics', icon: BarChart3 },
    { id: 'economy', label: 'Economy Settings', icon: Sliders },
    { id: 'packages', label: 'Coin Packages', icon: Coins },
    { id: 'hosts', label: 'Host Earnings', icon: Gem },
    { id: 'withdrawals', label: `Withdrawals (${analytics.pendingWithdrawalsCount})`, icon: Landmark },
    { id: 'agencies', label: 'Agency Comm', icon: Building2 },
    { id: 'ledger', label: 'Beans & Audit', icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 border transition-all ${
                active
                  ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                  : 'bg-[#160B2B] border-white/10 text-[#B9AECF] hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* 1. FINANCIAL OVERVIEW ANALYTICS                                   */}
      {/* ================================================================= */}
      {subTab === 'overview' && (
        <div className="space-y-4">
          {/* Rate Summary Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#1e1038] via-[#131d33] to-[#122620] border border-emerald-400/30 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="space-y-0.5">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                Active Economy Config v{economy.configVersion}
              </div>
              <div className="font-bold text-white">
                100k Coins = PKR {economy.coinPurchasePkrPer100k.toLocaleString()} · Split {economy.appSharePercent}% App / {economy.hostSharePercent}% Host · 100k 💎 = PKR {economy.diamondWithdrawalPkrPer100k.toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'today', 'month'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRangeFilter(r)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                    dateRangeFilter === r
                      ? 'bg-[#FFC84A] text-[#090611]'
                      : 'bg-white/10 text-[#C5B9DE] hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  downloadCsvReport(
                    `lenzo-financial-overview-${todayKey}.csv`,
                    ['TX_ID', 'Date', 'Sender', 'Receiver', 'Gross_Coins', 'App_Beans_40%', 'Host_Diamonds_60%', 'Host_Gross_PKR', 'Config_Ver'],
                    giftTxs.map((g) => [
                      g.id,
                      g.createdAt,
                      g.senderName,
                      g.receiverName,
                      g.coinAmount,
                      g.appBeansAmount,
                      g.hostDiamondsAmount,
                      g.hostGrossPkr,
                      g.configVersion,
                    ])
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-black flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
            </div>
          </div>

          {/* Three-Wallet KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-amber-400/25">
              <span className="text-[10px] text-[#A59AB8] block">Total Coins Purchased</span>
              <span className="text-base font-black text-[#FFC84A] font-mono">{analytics.totalCoinsBought.toLocaleString()}</span>
              <span className="text-[10px] text-emerald-300 block font-mono">
                PKR {roundPkr(revenue.totalCoinPurchaseRevenuePkr).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-rose-400/25">
              <span className="text-[10px] text-[#A59AB8] block">Total Coins Gifted</span>
              <span className="text-base font-black text-rose-300 font-mono">
                {(dateRangeFilter === 'all' ? revenue.totalGiftingCoinsProcessed : analytics.filteredGrossCoins).toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF] block">{revenue.totalGiftCount.toLocaleString()} Gifts</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-emerald-400/35">
              <span className="text-[10px] text-[#A59AB8] block">App Beans Revenue ({economy.appSharePercent}%)</span>
              <span className="text-base font-black text-emerald-300 font-mono">
                {(dateRangeFilter === 'all' ? revenue.totalBeansEarned : analytics.filteredBeansSum).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-200/80 block font-mono">
                Today: {analytics.dailyBeans.toLocaleString()} · Mo: {analytics.monthlyBeans.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-cyan-400/30">
              <span className="text-[10px] text-[#A59AB8] block">Host Diamonds Earned ({economy.hostSharePercent}%)</span>
              <span className="text-base font-black text-cyan-300 font-mono">
                {analytics.totalHostDiamondsEarned.toLocaleString()}
              </span>
              <span className="text-[10px] text-cyan-200/80 block">
                {analytics.activeHostsCount} Active Hosts
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-white/10">
              <span className="text-[10px] text-[#A59AB8] block">Diamonds Withdrawn</span>
              <span className="text-base font-black text-white font-mono">
                {analytics.totalHostDiamondsWithdrawn.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                Paid PKR {roundPkr(revenue.totalWithdrawalsPaidPkr).toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-amber-400/30">
              <span className="text-[10px] text-[#A59AB8] block">Pending Withdrawals</span>
              <span className="text-base font-black text-amber-300 font-mono">
                PKR {analytics.pendingWithdrawalsPkr.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF] block">
                {analytics.pendingWithdrawalsCount} req · {analytics.pendingWithdrawalsDiamonds.toLocaleString()} 💎
              </span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-purple-400/30">
              <span className="text-[10px] text-[#A59AB8] block">Agency Commissions</span>
              <span className="text-base font-black text-purple-300 font-mono">
                PKR {analytics.totalAgencyCommissionAccruedPkr.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF] block">{agencyCommissions.length} Records</span>
            </div>
            <div className="p-3 rounded-2xl bg-[#160B2B] border border-white/10">
              <span className="text-[10px] text-[#A59AB8] block">Tracked Bonus Coins</span>
              <span className="text-base font-black text-amber-200 font-mono">
                {revenue.totalBonusCoinsIssued.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#B9AECF] block">Separate from Paid Coins</span>
            </div>
          </div>

          {/* Top Earning Hosts + Recent Gift Transactions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Top Earning Hosts (Real-Time)
              </h4>
              {hostEarnings.slice(0, 6).length === 0 ? (
                <p className="text-xs text-[#A59AB8] py-4 text-center">No host diamond earnings recorded yet.</p>
              ) : (
                hostEarnings.slice(0, 6).map((h, idx) => {
                  const u = userMap.get(h.userId);
                  return (
                    <div
                      key={h.userId}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.03] border border-white/5"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          #{idx + 1} {u?.fullName || h.userId.slice(0, 10)}{' '}
                          <span className="text-[10px] text-[#A59AB8] font-mono">{u?.displayId || ''}</span>
                        </div>
                        <div className="text-[10px] text-[#A59AB8]">
                          Available: 💎 {h.availableEarningsCoins.toLocaleString()} · Withdrawn: 💎 {h.totalWithdrawnCoins.toLocaleString()}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="font-mono font-black text-cyan-300">
                          💎 {(h.totalEarnedDiamonds || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-mono">
                          PKR {roundPkr((h.totalEarnedDiamonds || 0) * economy.diamondWithdrawalPkrPerDiamond).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
                Recent Live Gift Splits ({giftTxs.length})
              </h4>
              {giftTxs.slice(0, 6).length === 0 ? (
                <p className="text-xs text-[#A59AB8] py-4 text-center">No gifts recorded in gift_transactions yet.</p>
              ) : (
                giftTxs.slice(0, 6).map((g) => (
                  <div
                    key={g.id}
                    className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-white truncate">
                        {g.senderName} → {g.receiverName} ({g.quantity}x {g.giftName})
                      </div>
                      <div className="text-[10px] text-[#A59AB8] font-mono">
                        Coins: {g.coinAmount.toLocaleString()} · App: {g.appBeansAmount.toLocaleString()} Beans · Host: {g.hostDiamondsAmount.toLocaleString()} 💎
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                      PKR {g.hostGrossPkr.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 2. ECONOMY SETTINGS (ALL 12 PARAMETERS + QA SUITE)                */}
      {/* ================================================================= */}
      {subTab === 'economy' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-[#FFC84A]/30 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-black text-white">
                  LENZO PARTY ADMIN → FINANCIAL MANAGEMENT → ECONOMY SETTINGS
                </h3>
                <p className="text-[11px] text-[#B9AECF]">
                  Config v{economy.configVersion} · Updates apply strictly to new transactions and are immutably audited.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunQaSuite}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-black flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Run QA Tests A–E
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">1. Coin Purchase Rate (PKR / 100k Coins)</label>
                <input
                  type="number"
                  value={cfgPurchase100k}
                  onChange={(e) => setCfgPurchase100k(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Default: PKR 3,000 / 100,000 Coins</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">2. App Revenue Share (%)</label>
                <input
                  type="number"
                  value={cfgAppShare}
                  onChange={(e) => {
                    setCfgAppShare(e.target.value);
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 0 && n <= 100) setCfgHostShare(String(100 - n));
                  }}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Default: 40% (App Beans Ledger)</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">3. Host Revenue Share (%)</label>
                <input
                  type="number"
                  value={cfgHostShare}
                  onChange={(e) => setCfgHostShare(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Must satisfy App % + Host % = 100%</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">4. Diamond Conversion Ratio</label>
                <input
                  type="number"
                  step="0.01"
                  value={cfgDiamondRatio}
                  onChange={(e) => setCfgDiamondRatio(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Default: 1.0 (100k Coins → 60k 💎)</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">5. Diamond Withdrawal Rate (PKR / 100k 💎)</label>
                <input
                  type="number"
                  value={cfgWithdraw100k}
                  onChange={(e) => setCfgWithdraw100k(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Default: PKR 2,600 / 100,000 Diamonds</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">6. Minimum Withdrawal (Diamonds)</label>
                <input
                  type="number"
                  value={cfgMinWd}
                  onChange={(e) => setCfgMinWd(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">7. Maximum Withdrawal (Diamonds)</label>
                <input
                  type="number"
                  value={cfgMaxWd}
                  onChange={(e) => setCfgMaxWd(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">8. Default Agency Commission (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfgAgencyComm}
                  onChange={(e) => setCfgAgencyComm(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">Independent from 40/60 split (agency hosts only)</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">9. Withdrawal Processing Fee (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={cfgFeePct}
                  onChange={(e) => setCfgFeePct(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-[#A59AB8]">0% = exact PKR 2,600 payable per 100k 💎</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">10. Max Promotional Bonus Coins (%)</label>
                <input
                  type="number"
                  value={cfgMaxBonusPct}
                  onChange={(e) => setCfgMaxBonusPct(e.target.value)}
                  className="mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <input
                  id="bonusEnabledToggle"
                  type="checkbox"
                  checked={cfgBonusEnabled}
                  onChange={(e) => setCfgBonusEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#FFC84A]"
                />
                <label htmlFor="bonusEnabledToggle" className="text-xs font-bold text-white">
                  11. Enable Tracked Bonus Coins
                </label>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#C5B9DE]">12. Enabled Payout Methods</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {(['bank_transfer', 'easypaisa', 'jazzcash', 'cash_pickup'] as const).map((m) => {
                    const active = cfgMethods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() =>
                          setCfgMethods((prev) =>
                            prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
                          )
                        }
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          active
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-white/5 border-white/10 text-[#A59AB8]'
                        }`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Impact Preview */}
            {!draftEconomyPreview.valid ? (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 font-bold">
                Validation Error: {draftEconomyPreview.error}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-300 block">
                    Live Impact: 100,000 Gifted Coins
                  </span>
                  <div className="text-white font-mono">
                    App: {draftEconomyPreview.gift100k?.appBeansAmount.toLocaleString()} Beans · Host: {draftEconomyPreview.gift100k?.hostDiamondsAmount.toLocaleString()} 💎 (PKR {draftEconomyPreview.gift100k?.hostGrossPkrValue.toLocaleString()})
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-cyan-300 block">
                    Live Impact: 100,000 Diamonds Withdrawal
                  </span>
                  <div className="text-white font-mono">
                    Independent: PKR {draftEconomyPreview.wd100k?.netPayablePkr.toLocaleString()} · Agency Host: PKR {draftEconomyPreview.wd100kAgency?.netPayablePkr.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={cfgReason}
                onChange={(e) => setCfgReason(e.target.value)}
                placeholder="Required Audit Reason (e.g. Verified official launch economy rates)"
                className="flex-1 bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
              />
              <button
                type="button"
                disabled={savingCfg || !draftEconomyPreview.valid}
                onClick={handleSaveEconomy}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black disabled:opacity-50"
              >
                {savingCfg ? 'Saving...' : 'Save Economy Settings'}
              </button>
            </div>
          </div>

          {/* QA Verification Report */}
          {qaResults && (
            <div className="p-4 rounded-2xl bg-[#160B2B] border border-cyan-400/30 space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                Production Financial QA Assertions (Tests A–E)
              </h4>
              {qaResults.map((r) => (
                <div
                  key={r.testId}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                    r.passed
                      ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-100'
                      : 'bg-rose-500/15 border-rose-400/40 text-rose-100'
                  }`}
                >
                  <div>
                    <div className="font-black">{r.testId}: {r.name}</div>
                    <div className="text-[11px] font-mono opacity-85">Actual: {r.actual}</div>
                  </div>
                  <span className="font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-black/30">
                    {r.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. COIN PACKAGES & VERIFIED PURCHASE CREDITING                    */}
      {/* ================================================================= */}
      {subTab === 'packages' && (
        <div className="space-y-4">
          {/* Verified Coin Purchase Credit Tool */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-emerald-400/30 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> Credit Verified Coin Purchase (Tracks Paid vs Bonus Coins Separately)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <select
                value={buyTargetUid}
                onChange={(e) => setBuyTargetUid(e.target.value)}
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
              >
                <option value="">Select Verified Buyer Account...</option>
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.fullName} ({u.displayId || u.uid.slice(0, 8)}) — {u.coins.toLocaleString()} 🪙
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={buyPaidCoins}
                onChange={(e) => setBuyPaidCoins(e.target.value)}
                placeholder="Paid Coins (e.g. 100000)"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <input
                type="number"
                value={buyBonusCoins}
                onChange={(e) => setBuyBonusCoins(e.target.value)}
                placeholder="Bonus Coins (Tracked Separately)"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <input
                type="text"
                value={buyMethod}
                onChange={(e) => setBuyMethod(e.target.value)}
                placeholder="Payment Method (Bank / EasyPaisa / JazzCash)"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <input
                type="text"
                value={buyRef}
                onChange={(e) => setBuyRef(e.target.value)}
                placeholder="Verified Payment Reference / Slip ID *"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <button
                type="button"
                disabled={creditingBuy}
                onClick={handleCreditVerifiedPurchase}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#041B10] font-black text-xs disabled:opacity-50"
              >
                {creditingBuy
                  ? 'Crediting...'
                  : `Credit (PKR ${calculateCoinPurchasePricePkr(Number(buyPaidCoins || 0), economy).pricePkr.toLocaleString()})`}
              </button>
            </div>
          </div>

          {/* Coin Package CRUD */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
                Coin Package Catalog ({packages.length})
              </h4>
              <button
                type="button"
                onClick={async () => {
                  const res = await adminSeedOfficialCoinPackages();
                  if (res.success) onNotify('Official 100k = PKR 3,000 coin packages synced to Firestore.');
                  else onError(res.error || 'Failed to sync packages.');
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-black"
              >
                Sync Official 100k = PKR 3,000 Packs
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <input
                type="number"
                value={pkgCoins}
                onChange={(e) => {
                  setPkgCoins(e.target.value);
                  const calc = calculateCoinPurchasePricePkr(Number(e.target.value || 0), economy);
                  setPkgPricePkr(String(calc.pricePkr));
                }}
                placeholder="Paid Coins"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <input
                type="number"
                value={pkgBonus}
                onChange={(e) => setPkgBonus(e.target.value)}
                placeholder="Bonus Coins"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <input
                type="number"
                value={pkgPricePkr}
                onChange={(e) => setPkgPricePkr(e.target.value)}
                placeholder="Price PKR"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
              />
              <input
                type="text"
                value={pkgBadge}
                onChange={(e) => setPkgBadge(e.target.value)}
                placeholder="Promo Badge"
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
              />
              <select
                value={pkgVisibility}
                onChange={(e) => setPkgVisibility(e.target.value as any)}
                className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
              >
                <option value="public">Public</option>
                <option value="vip_only">VIP Only</option>
                <option value="hidden">Hidden</option>
              </select>
              <label className="flex items-center gap-1.5 text-white px-2">
                <input type="checkbox" checked={pkgPopular} onChange={(e) => setPkgPopular(e.target.checked)} />
                Popular
              </label>
              <label className="flex items-center gap-1.5 text-white px-2">
                <input type="checkbox" checked={pkgEnabled} onChange={(e) => setPkgEnabled(e.target.checked)} />
                Active
              </label>
              <button
                type="button"
                disabled={savingPkg}
                onClick={handleSavePkg}
                className="py-2 px-3 rounded-xl bg-[#FFC84A] text-[#090611] font-black flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                {pkgId ? 'Update Pack' : 'Save Pack'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
              {packages.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-2xl bg-[#0F071E] border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-black text-[#FFC84A] font-mono">
                      🪙 {p.coins.toLocaleString()} {p.bonusCoins > 0 ? `(+${p.bonusCoins.toLocaleString()} bonus)` : ''}
                    </div>
                    <div className="font-bold text-white font-mono">
                      PKR {p.pricePkr.toLocaleString()} · <span className="text-[10px] text-[#A59AB8]">{p.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                    </div>
                    <div className="text-[10px] text-emerald-300 font-mono">
                      Sales: {p.purchaseCount || 0} · Rev: PKR {(p.totalRevenuePkr || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPkgId(p.id);
                        setPkgCoins(String(p.coins));
                        setPkgBonus(String(p.bonusCoins || 0));
                        setPkgPricePkr(String(p.pricePkr));
                        setPkgBadge(p.badge || '');
                        setPkgVisibility(p.visibility || 'public');
                        setPkgPopular(Boolean(p.isPopular));
                        setPkgPromo(Boolean(p.isPromotional));
                        setPkgEnabled(p.enabled);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await adminDeleteCoinPackage(p.id, 'Removed package from Admin Catalog');
                        if (res.success) onNotify(`Deleted ${p.id}`);
                        else onError(res.error || 'Delete failed');
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verified Purchase History */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Verified Coin Purchases ({coinPurchases.length})
            </h4>
            {coinPurchases.slice(0, 15).map((cp) => (
              <div
                key={cp.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    {cp.userName} · +{cp.paidCoins.toLocaleString()} Paid
                    {cp.bonusCoins > 0 ? ` + ${cp.bonusCoins.toLocaleString()} Bonus` : ''} 🪙
                  </div>
                  <div className="text-[10px] text-[#A59AB8] font-mono">
                    Ref: {cp.paymentReference} · By: {cp.verifiedBy} · {cp.createdAt.slice(0, 16)}
                  </div>
                </div>
                <span className="font-mono font-black text-emerald-400">PKR {cp.amountPkr.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. HOST DIAMOND EARNINGS MANAGEMENT                               */}
      {/* ================================================================= */}
      {subTab === 'hosts' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-[#A59AB8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={hostSearch}
                onChange={(e) => setHostSearch(e.target.value)}
                placeholder="Search host by Name, Username, Lenzo ID, or UID..."
                className="w-full bg-[#160B2B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                downloadCsvReport(
                  `lenzo-host-earnings-${todayKey}.csv`,
                  ['UID', 'Name', 'DisplayID', 'Available_Diamonds', 'Pending_Diamonds', 'Withdrawn_Diamonds', 'Total_Earned', 'Daily', 'Monthly', 'Est_Available_PKR'],
                  filteredHostEarnings.map((h) => {
                    const u = userMap.get(h.userId);
                    return [
                      h.userId,
                      u?.fullName || '',
                      u?.displayId || '',
                      h.availableEarningsCoins,
                      h.pendingWithdrawalCoins,
                      h.totalWithdrawnCoins,
                      h.totalEarnedDiamonds || 0,
                      h.dailyEarnedDiamonds || 0,
                      h.monthlyEarnedDiamonds || 0,
                      roundPkr(h.availableEarningsCoins * economy.diamondWithdrawalPkrPerDiamond),
                    ];
                  })
                )
              }
              className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export Host Report
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#160B2B]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.06] text-[10px] uppercase tracking-wider text-[#C5B9DE]">
                <tr>
                  <th className="py-2.5 px-3">Host</th>
                  <th className="py-2.5 px-3">Available 💎</th>
                  <th className="py-2.5 px-3">Pending 💎</th>
                  <th className="py-2.5 px-3">Withdrawn 💎</th>
                  <th className="py-2.5 px-3">Today / Month</th>
                  <th className="py-2.5 px-3">Payout Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredHostEarnings.map((h) => {
                  const u = userMap.get(h.userId);
                  return (
                    <tr key={h.userId} className="hover:bg-white/[0.03]">
                      <td className="py-2 px-3">
                        <div className="font-bold text-white">{u?.fullName || h.userId.slice(0, 10)}</div>
                        <div className="text-[10px] text-[#A59AB8] font-mono">
                          {u?.username || ''} · ID: {u?.displayId || h.userId.slice(0, 8)}
                        </div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-cyan-300">
                        {h.availableEarningsCoins.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-amber-300">
                        {h.pendingWithdrawalCoins.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-emerald-400">
                        {h.totalWithdrawnCoins.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono text-white">
                        {(h.dailyEarnedDiamonds || 0).toLocaleString()} / {(h.monthlyEarnedDiamonds || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-300">
                        PKR {roundPkr(h.availableEarningsCoins * economy.diamondWithdrawalPkrPerDiamond).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 5. WITHDRAWAL MANAGEMENT (ALL 7 STATUSES + NO DOUBLE PAYOUT)      */}
      {/* ================================================================= */}
      {subTab === 'withdrawals' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={wdSearch}
              onChange={(e) => setWdSearch(e.target.value)}
              placeholder="Search withdrawal ID, host name, ref..."
              className="flex-1 min-w-[180px] bg-[#160B2B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            />
            <select
              value={wdFilter}
              onChange={(e) => setWdFilter(e.target.value as any)}
              className="bg-[#160B2B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="all">All Statuses ({withdrawals.length})</option>
              {WITHDRAWAL_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>
                  {st.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                downloadCsvReport(
                  `lenzo-withdrawals-${todayKey}.csv`,
                  ['Withdrawal_ID', 'Host', 'Diamonds', 'Gross_PKR', 'Agency_Comm_PKR', 'Fee_PKR', 'Net_Payable_PKR', 'Method', 'Account', 'Status', 'Payment_Ref'],
                  filteredWithdrawals.map((w) => [
                    w.id,
                    w.userName,
                    w.coinsRequested,
                    w.grossAmountPkr,
                    w.agencyCommissionPkr || 0,
                    w.feeAmountPkr || 0,
                    w.finalPayablePkr,
                    w.paymentDetails.bankOrProviderName,
                    w.paymentDetails.accountNumber,
                    w.status,
                    w.paymentReference || '',
                  ])
                )
              }
              className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredWithdrawals.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#160B2B] border border-white/10 text-xs text-[#A59AB8]">
                No withdrawal requests match the current filter.
              </div>
            ) : (
              filteredWithdrawals.map((w) => {
                const isFinal = ['paid', 'rejected', 'cancelled'].includes(w.status);
                const isOpen = selectedWd?.id === w.id;
                return (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-black text-white">
                          {w.userName} <span className="font-mono text-[10px] text-[#A59AB8]">#{w.id.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="text-[11px] text-[#B9AECF]">
                          {w.paymentDetails.bankOrProviderName} · {w.paymentDetails.accountTitle} ·{' '}
                          <span className="font-mono text-white">{w.paymentDetails.accountNumber}</span>
                        </div>
                        <div className="text-[10px] text-[#A59AB8] font-mono">
                          💎 {w.coinsRequested.toLocaleString()} → Gross PKR {w.grossAmountPkr.toLocaleString()}
                          {' '}− Agency PKR {(w.agencyCommissionPkr || 0).toLocaleString()}
                          {' '}− Fee PKR {(w.feeAmountPkr || 0).toLocaleString()}
                          {' '}= <strong className="text-emerald-400">Net PKR {w.finalPayablePkr.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            w.status === 'paid'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : w.status === 'rejected' || w.status === 'cancelled'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {w.status.replace('_', ' ')}
                        </span>
                        {!isFinal && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWd(isOpen ? null : w);
                              setWdRemarks(w.adminRemarks || '');
                              setWdPayRef(w.paymentReference || '');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#FFC84A] text-[#090611] text-[10px] font-black"
                          >
                            {isOpen ? 'Close' : 'Process'}
                          </button>
                        )}
                      </div>
                    </div>

                    {w.paymentReference && (
                      <div className="text-[10px] font-mono text-cyan-300">
                        Payment Ref: {w.paymentReference} {w.processedByAdmin ? `· Processed by ${w.processedByAdmin}` : ''}
                      </div>
                    )}

                    {isOpen && !isFinal && (
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={wdPayRef}
                            onChange={(e) => setWdPayRef(e.target.value)}
                            placeholder="Bank UTR / EasyPaisa / JazzCash TX ID"
                            className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
                          />
                          <input
                            type="text"
                            value={wdRemarks}
                            onChange={(e) => setWdRemarks(e.target.value)}
                            placeholder="Admin remarks / verification note"
                            className="bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(['under_review', 'approved', 'processing', 'paid', 'rejected', 'cancelled'] as WithdrawalStatus[]).map(
                            (st) => (
                              <button
                                key={st}
                                type="button"
                                disabled={processingWd}
                                onClick={() => handleUpdateWithdrawal(w, st)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${
                                  st === 'paid'
                                    ? 'bg-emerald-500 text-[#041B10]'
                                    : st === 'rejected' || st === 'cancelled'
                                      ? 'bg-rose-500/25 text-rose-200 border border-rose-400/40'
                                      : 'bg-white/10 text-white hover:bg-white/20'
                                }`}
                              >
                                Mark {st.replace('_', ' ')}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 6. AGENCY COMMISSION MANAGEMENT                                   */}
      {/* ================================================================= */}
      {subTab === 'agencies' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-purple-400/30 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-purple-200">
              Host Agency Commission Rules (Independent from 40% App / 60% Host Split)
            </h4>
            <p className="text-[11px] text-[#B9AECF]">
              Agency commission is calculated ONLY once on Host withdrawal Gross PKR (Diamonds × {economy.diamondWithdrawalPkrPerDiamond}) and never deducted twice.
            </p>

            {hostAgencies.length === 0 ? (
              <p className="text-xs text-[#A59AB8] py-4 text-center">No active Host Agencies registered yet.</p>
            ) : (
              <div className="space-y-2">
                {hostAgencies.map((ag) => {
                  const rec = agencyRecords.find((r) => r.agencyId === ag.id);
                  const currentInput =
                    agencyOverrideInputs[ag.id] ??
                    (rec?.commissionPercentOverride !== undefined && rec?.commissionPercentOverride !== null
                      ? String(rec.commissionPercentOverride)
                      : String(economy.agencyCommissionPercent));
                  const preview = calculateWithdrawalWaterfall(100000, economy, {
                    hostHasActiveAgency: true,
                    agencyCommissionOverridePercent: Number(currentInput || 0),
                  });

                  return (
                    <div
                      key={ag.id}
                      className="p-3 rounded-xl bg-[#0F071E] border border-white/10 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-black text-white">
                            {ag.name} <span className="font-mono text-amber-300">({ag.agencyCode})</span>
                          </div>
                          <div className="text-[10px] text-[#A59AB8]">
                            Owner: {ag.ownerName} · Hosts: {ag.totalHosts || 0} · Earned Comm: PKR {(rec?.totalCommissionEarnedPkr || 0).toLocaleString()} · Pending: PKR {(rec?.pendingCommissionPkr || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={50}
                            value={currentInput}
                            onChange={(e) =>
                              setAgencyOverrideInputs((prev) => ({ ...prev, [ag.id]: e.target.value }))
                            }
                            className="w-20 bg-[#160B2B] border border-white/15 rounded-lg px-2 py-1 text-white font-mono text-center"
                          />
                          <span className="text-[#A59AB8]">%</span>
                          <button
                            type="button"
                            onClick={async () => {
                              const pct = Number(currentInput);
                              const res = await adminUpdateAgencyCommissionOverride({
                                agencyId: ag.id,
                                agencyName: ag.name,
                                agencyOwnerUid: ag.ownerUid,
                                commissionPercentOverride: Number.isFinite(pct) ? pct : null,
                                reason: `Set ${ag.name} commission to ${pct}%`,
                              });
                              if (res.success) onNotify(`Updated ${ag.name} commission to ${pct}%.`);
                              else onError(res.error || 'Update failed.');
                            }}
                            className="px-3 py-1 rounded-lg bg-[#FFC84A] text-[#090611] font-black text-[10px]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-cyan-200">
                        Impact on 100k 💎 Withdrawal: Gross PKR {preview.grossAmountPkr.toLocaleString()} → Agency PKR {preview.agencyCommissionPkr.toLocaleString()} · Host Net PKR {preview.netPayablePkr.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Commission Payout History */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-white">
              Agency Commission Ledger ({agencyCommissions.length})
            </h4>
            {agencyCommissions.length === 0 ? (
              <p className="text-xs text-[#A59AB8] py-4 text-center">No agency commissions accrued yet.</p>
            ) : (
              agencyCommissions.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">
                      {c.agencyName} ← {c.hostName} ({c.commissionPercent}%)
                    </div>
                    <div className="text-[10px] text-[#A59AB8] font-mono">
                      WD #{c.withdrawalId.slice(-6).toUpperCase()} · {c.diamondsWithdrawn.toLocaleString()} 💎 · {c.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-purple-300">PKR {c.commissionPkr.toLocaleString()}</span>
                    {c.status === 'accrued' && (
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await adminMarkAgencyCommissionPaid(c, `AG-${Date.now().toString().slice(-6)}`);
                          if (res.success) onNotify(`Marked agency commission PKR ${c.commissionPkr.toLocaleString()} PAID.`);
                          else onError(res.error || 'Failed to mark paid.');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-[#041B10] text-[10px] font-black"
                      >
                        Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 7. APP BEANS LEDGER, AUDIT LOGS & NON-DESTRUCTIVE RECONCILIATION  */}
      {/* ================================================================= */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          {/* Non-Destructive Idempotent Migration & Balance Reconciliation */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-cyan-400/30 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                  Idempotent Migration &amp; Balance Reconciliation
                </h4>
                <p className="text-[11px] text-[#B9AECF]">
                  Verifies all existing user Coin &amp; Diamond ledgers without ever resetting, overwriting, or inventing balances.
                </p>
              </div>
              <button
                type="button"
                disabled={runningRecon}
                onClick={handleRunReconciliation}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 text-[#041B10] text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningRecon ? 'animate-spin' : ''}`} />
                {runningRecon ? 'Scanning...' : 'Run Reconciliation Audit'}
              </button>
            </div>

            {reconReport && (
              <div className="p-3 rounded-xl bg-[#0F071E] border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
                  <div>Users Scanned: <strong className="text-white">{reconReport.usersScanned}</strong></div>
                  <div>Circulating Coins: <strong className="text-[#FFC84A]">{reconReport.totalCirculatingCoins.toLocaleString()}</strong></div>
                  <div>Host Diamonds: <strong className="text-cyan-300">{reconReport.totalAvailableDiamonds.toLocaleString()}</strong></div>
                  <div>Flags: <strong className={reconReport.flags.length ? 'text-amber-300' : 'text-emerald-400'}>{reconReport.flags.length}</strong></div>
                </div>
                {reconReport.flags.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-white/10">
                    {reconReport.flags.map((f, idx) => (
                      <div key={`${f.uid}_${f.field}_${idx}`} className="text-[11px] text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {f.userName} ({f.field}): profile={f.profileValue.toLocaleString()} vs ledger={f.ledgerValue.toLocaleString()} — {f.note}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* App Beans Revenue Ledger */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-emerald-400/25 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
              App Beans / Platform Revenue Ledger ({beansLedger.length})
            </h4>
            {beansLedger.slice(0, 20).map((b) => (
              <div
                key={b.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">
                    +{b.beansAmount.toLocaleString()} App Beans ({b.appSharePercent}%) · {b.senderName} → {b.receiverName}
                  </div>
                  <div className="text-[10px] text-[#A59AB8] font-mono">
                    Gross: {b.grossCoins.toLocaleString()} 🪙 · Host: {b.hostDiamondsIssued.toLocaleString()} 💎 · v{b.configVersion} · {b.dayKey}
                  </div>
                </div>
                <span className="font-mono text-emerald-300 font-bold">
                  ≈ PKR {b.estimatedAppRevenuePkr.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Financial Audit Trail */}
          <div className="p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#FFC84A]">
              Financial Admin Audit Trail ({auditLogs.length})
            </h4>
            {auditLogs.slice(0, 25).map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-xs"
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-black uppercase text-[#FFC84A]">{log.action}</span>
                  <span className="font-mono text-[#A59AB8]">{log.createdAt.slice(0, 19).replace('T', ' ')}</span>
                </div>
                <div className="font-bold text-white">{log.targetLabel}</div>
                <div className="text-[10px] font-mono text-[#B9AECF]">
                  Admin: {log.adminEmail} · Reason: {log.reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
