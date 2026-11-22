import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { isVerifiedAdminSession } from '../utils/adminAuth';
import { apiUrl } from '../utils/apiConfig';
import { sendPushNotification } from './pushNotificationService';
import {
  OFFICIAL_DEFAULT_COIN_PACKAGES,
  OFFICIAL_ECONOMY_DEFAULTS,
  PlatformEconomyConfig,
  calculateCoinPurchasePricePkr,
  getDayKey,
  getMonthKey,
  normalizeEconomyConfig,
  roundPkr,
  validateEconomySettings,
} from '../shared/financialEngine';
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
} from '../types';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function getAdminHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // non-fatal
  }
  return headers;
}

export const EMPTY_PLATFORM_REVENUE: PlatformRevenueSummary = {
  id: 'global',
  totalBeansEarned: 0,
  totalGiftingCoinsProcessed: 0,
  totalHostDiamondsIssued: 0,
  totalGiftCount: 0,
  totalCoinPurchaseRevenuePkr: 0,
  totalCoinsSoldPaid: 0,
  totalBonusCoinsIssued: 0,
  totalWithdrawalsPaidPkr: 0,
  totalDiamondsWithdrawn: 0,
  totalAgencyCommissionPkr: 0,
  dailyBeansEarned: 0,
  dailyGiftingCoins: 0,
  dailyDayKey: getDayKey(),
  monthlyBeansEarned: 0,
  monthlyGiftingCoins: 0,
  monthlyMonthKey: getMonthKey(),
  updatedAt: new Date().toISOString(),
};

/**
 * 1. PLATFORM ECONOMY SETTINGS (Real-time + Audited Save)
 */
export function subscribePlatformFinancialSettings(
  onUpdate: (config: PlatformEconomyConfig) => void
) {
  return onSnapshot(
    doc(db, 'platform_financial_settings', 'global'),
    (snap) => {
      if (snap.exists()) {
        onUpdate(normalizeEconomyConfig(snap.data() as Partial<PlatformEconomyConfig>));
      } else {
        onUpdate({ ...OFFICIAL_ECONOMY_DEFAULTS });
      }
    },
    () => onUpdate({ ...OFFICIAL_ECONOMY_DEFAULTS })
  );
}

export async function adminSaveEconomySettings(
  nextInput: Partial<PlatformEconomyConfig>,
  reason: string
): Promise<{ success: boolean; config?: PlatformEconomyConfig; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) {
      return { success: false, error: 'Unauthorized: Only authorized Super Admins can modify financial settings.' };
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      return { success: false, error: 'Please provide a reason for this economy setting change.' };
    }

    const canonicalRef = doc(db, 'platform_financial_settings', 'global');
    const legacyRef = doc(db, 'wallet_settings', 'global');
    const currentSnap = await getDoc(canonicalRef);
    const previousConfig = currentSnap.exists()
      ? normalizeEconomyConfig(currentSnap.data() as Partial<PlatformEconomyConfig>)
      : { ...OFFICIAL_ECONOMY_DEFAULTS };

    const validation = validateEconomySettings({
      ...previousConfig,
      ...nextInput,
    });
    if (!validation.valid || !validation.normalized) {
      return { success: false, error: validation.error || 'Invalid economy settings.' };
    }

    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const adminUid = auth.currentUser?.uid || '';
    const adminEmail = auth.currentUser?.email || '';

    const nextConfig: PlatformEconomyConfig = {
      ...validation.normalized,
      configVersion: previousConfig.configVersion + 1,
      updatedAt: nowIso,
      updatedByUid: adminUid,
      updatedByEmail: adminEmail,
      lastChangeReason: trimmedReason,
    };

    // Persist to Firestore canonical + legacy wallet_settings + immutable audit trail
    await runTransaction(db, async (tx) => {
      tx.set(canonicalRef, nextConfig, { merge: true });
      tx.set(
        legacyRef,
        {
          configVersion: nextConfig.configVersion,
          commissionPolicyVersion: nextConfig.policyVersion,
          coinPurchasePkrPer100k: nextConfig.coinPurchasePkrPer100k,
          coinPurchasePkrPerCoin: nextConfig.coinPurchasePkrPerCoin,
          commissionRatePercent: nextConfig.appSharePercent,
          hostSharePercent: nextConfig.hostSharePercent,
          diamondConversionRatio: nextConfig.diamondConversionRatio,
          diamondWithdrawalPkrPer100k: nextConfig.diamondWithdrawalPkrPer100k,
          exchangeRatePkrPerCoin: nextConfig.diamondWithdrawalPkrPerDiamond,
          minWithdrawalCoins: nextConfig.minWithdrawalDiamonds,
          maxWithdrawalCoins: nextConfig.maxWithdrawalDiamonds,
          agencyCommissionPercent: nextConfig.agencyCommissionPercent,
          withdrawalFeePercent: nextConfig.withdrawalProcessingFeePercent,
          bonusCoinsEnabled: nextConfig.bonusCoinsEnabled,
          maxBonusCoinPercent: nextConfig.maxBonusCoinPercent,
          enabledPaymentMethods: nextConfig.enabledPaymentMethods,
          earningsToWalletConversionRate: 1.0,
          updatedAt: serverTimestamp(),
          updatedByEmail: adminEmail,
          lastChangeReason: trimmedReason,
        },
        { merge: true }
      );

      const auditId = makeId('faudit_cfg');
      tx.set(doc(db, 'financial_audit_logs', auditId), {
        id: auditId,
        adminUid,
        adminEmail,
        action: 'economy_settings_update',
        targetId: 'platform_financial_settings/global',
        targetLabel: `Economy Settings v${nextConfig.configVersion}`,
        previousValue: {
          coinPurchasePkrPer100k: previousConfig.coinPurchasePkrPer100k,
          appSharePercent: previousConfig.appSharePercent,
          hostSharePercent: previousConfig.hostSharePercent,
          diamondWithdrawalPkrPer100k: previousConfig.diamondWithdrawalPkrPer100k,
          minWithdrawalDiamonds: previousConfig.minWithdrawalDiamonds,
          maxWithdrawalDiamonds: previousConfig.maxWithdrawalDiamonds,
          agencyCommissionPercent: previousConfig.agencyCommissionPercent,
          withdrawalProcessingFeePercent: previousConfig.withdrawalProcessingFeePercent,
        },
        newValue: {
          coinPurchasePkrPer100k: nextConfig.coinPurchasePkrPer100k,
          appSharePercent: nextConfig.appSharePercent,
          hostSharePercent: nextConfig.hostSharePercent,
          diamondWithdrawalPkrPer100k: nextConfig.diamondWithdrawalPkrPer100k,
          minWithdrawalDiamonds: nextConfig.minWithdrawalDiamonds,
          maxWithdrawalDiamonds: nextConfig.maxWithdrawalDiamonds,
          agencyCommissionPercent: nextConfig.agencyCommissionPercent,
          withdrawalProcessingFeePercent: nextConfig.withdrawalProcessingFeePercent,
        },
        reason: trimmedReason,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });
    });

    // Sync authoritative server.ts engine cache (non-blocking if static host)
    try {
      const headers = await getAdminHeaders();
      await fetch(apiUrl('/api/finance/admin/settings'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings: nextConfig, reason: trimmedReason }),
      });
    } catch {
      // non-fatal
    }

    return { success: true, config: nextConfig };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save economy settings.' };
  }
}

/**
 * 2. APP BEANS / REVENUE WALLET & LEDGER LISTENERS (Admin-Only)
 */
export function subscribePlatformRevenue(onUpdate: (summary: PlatformRevenueSummary) => void) {
  return onSnapshot(
    doc(db, 'platform_revenue', 'global'),
    (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        onUpdate({
          ...EMPTY_PLATFORM_REVENUE,
          ...d,
          totalBeansEarned: Number(d.totalBeansEarned || 0),
          totalGiftingCoinsProcessed: Number(d.totalGiftingCoinsProcessed || 0),
          totalHostDiamondsIssued: Number(d.totalHostDiamondsIssued || 0),
          totalGiftCount: Number(d.totalGiftCount || 0),
          totalCoinPurchaseRevenuePkr: Number(d.totalCoinPurchaseRevenuePkr || 0),
          totalCoinsSoldPaid: Number(d.totalCoinsSoldPaid || 0),
          totalBonusCoinsIssued: Number(d.totalBonusCoinsIssued || 0),
          totalWithdrawalsPaidPkr: Number(d.totalWithdrawalsPaidPkr || 0),
          totalDiamondsWithdrawn: Number(d.totalDiamondsWithdrawn || 0),
          totalAgencyCommissionPkr: Number(d.totalAgencyCommissionPkr || 0),
        });
      } else {
        onUpdate(EMPTY_PLATFORM_REVENUE);
      }
    },
    () => onUpdate(EMPTY_PLATFORM_REVENUE)
  );
}

export function subscribePlatformBeansLedger(onUpdate: (entries: PlatformBeansLedgerEntry[]) => void) {
  const q = query(collection(db, 'platform_beans_ledger'), orderBy('createdAtMillis', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformBeansLedgerEntry)));
    },
    () => onUpdate([])
  );
}

export function subscribeGiftTransactions(onUpdate: (txs: GiftTransactionRecord[]) => void) {
  const q = query(collection(db, 'gift_transactions'), orderBy('createdAtMillis', 'desc'), limit(250));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GiftTransactionRecord)));
    },
    () => onUpdate([])
  );
}

export function subscribeCoinPurchases(onUpdate: (purchases: CoinPurchaseRecord[]) => void) {
  const q = query(collection(db, 'coin_purchases'), orderBy('createdAtMillis', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoinPurchaseRecord)));
    },
    () => onUpdate([])
  );
}

export function subscribeAllHostEarnings(onUpdate: (list: UserEarningsData[]) => void) {
  return onSnapshot(
    collection(db, 'earnings'),
    (snap) => {
      const todayKey = getDayKey();
      const monthKey = getMonthKey();
      const rows = snap.docs.map((d) => {
        const data = d.data();
        const available = Number(data.availableEarningsCoins || 0);
        const pending = Number(data.pendingWithdrawalCoins || 0);
        const withdrawn = Number(data.totalWithdrawnCoins || 0);
        return {
          userId: d.id,
          availableEarningsCoins: available,
          pendingWithdrawalCoins: pending,
          totalWithdrawnCoins: withdrawn,
          totalEarnedDiamonds: Math.max(Number(data.totalEarnedDiamonds || 0), available + pending + withdrawn),
          dailyEarnedDiamonds: data.lastEarnedDayKey === todayKey ? Number(data.dailyEarnedDiamonds || 0) : 0,
          monthlyEarnedDiamonds: data.lastEarnedMonthKey === monthKey ? Number(data.monthlyEarnedDiamonds || 0) : 0,
          lastEarnedDayKey: data.lastEarnedDayKey || todayKey,
          lastEarnedMonthKey: data.lastEarnedMonthKey || monthKey,
          grossGiftCoinsReceived: Number(data.grossGiftCoinsReceived || 0),
          totalCommissionDeducted: Number(data.totalCommissionDeducted || 0),
          totalConvertedToWallet: Number(data.totalConvertedToWallet || 0),
          totalGiftsCount: Number(data.totalGiftsCount || 0),
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
        } as UserEarningsData;
      });
      rows.sort((a, b) => (b.totalEarnedDiamonds || 0) - (a.totalEarnedDiamonds || 0));
      onUpdate(rows);
    },
    () => onUpdate([])
  );
}

export function subscribeAgencyCommissions(onUpdate: (items: AgencyCommissionRecord[]) => void) {
  const q = query(collection(db, 'agency_commissions'), orderBy('createdAtMillis', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AgencyCommissionRecord)));
    },
    () => onUpdate([])
  );
}

export function subscribeAgencyFinancialRecords(onUpdate: (items: AgencyFinancialRecord[]) => void) {
  return onSnapshot(
    collection(db, 'agency_financial_records'),
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AgencyFinancialRecord)));
    },
    () => onUpdate([])
  );
}

export function subscribeFinancialAuditLogs(onUpdate: (logs: FinancialAuditLog[]) => void) {
  const q = query(collection(db, 'financial_audit_logs'), orderBy('createdAtMillis', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialAuditLog)));
    },
    () => onUpdate([])
  );
}

/**
 * 3. COIN PACKAGE MANAGEMENT (CRUD + Official Rate Reset + Audit)
 */
export async function adminSaveCoinPackage(
  pkg: WalletRechargePackage,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized.' };
    const cleanId = pkg.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    if (!cleanId || pkg.coins <= 0 || pkg.pricePkr <= 0) {
      return { success: false, error: 'Package ID, paid coins, and PKR price must be positive.' };
    }
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const pkgRef = doc(db, 'coin_packages', cleanId);
    const prevSnap = await getDoc(pkgRef);

    const payload: WalletRechargePackage = {
      ...pkg,
      id: cleanId,
      coins: Math.floor(pkg.coins),
      bonusCoins: Math.max(0, Math.floor(pkg.bonusCoins || 0)),
      pricePkr: roundPkr(pkg.pricePkr),
      displayPrice: `PKR ${roundPkr(pkg.pricePkr).toLocaleString()}`,
      visibility: pkg.visibility || 'public',
      updatedAt: nowIso,
    };

    await setDoc(pkgRef, payload, { merge: true });

    const auditId = makeId('faudit_pkg');
    await setDoc(doc(db, 'financial_audit_logs', auditId), {
      id: auditId,
      adminUid: auth.currentUser?.uid || '',
      adminEmail: auth.currentUser?.email || '',
      action: 'coin_package_save',
      targetId: cleanId,
      targetLabel: `${payload.coins.toLocaleString()} Coins (+${payload.bonusCoins.toLocaleString()} Bonus) = ${payload.displayPrice}`,
      previousValue: prevSnap.exists() ? prevSnap.data() : null,
      newValue: payload,
      reason: reason.trim() || 'Saved coin package',
      createdAt: nowIso,
      createdAtMillis: nowMillis,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save coin package.' };
  }
}

export async function adminDeleteCoinPackage(
  pkgId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized.' };
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    await deleteDoc(doc(db, 'coin_packages', pkgId));

    const auditId = makeId('faudit_pkgdel');
    await setDoc(doc(db, 'financial_audit_logs', auditId), {
      id: auditId,
      adminUid: auth.currentUser?.uid || '',
      adminEmail: auth.currentUser?.email || '',
      action: 'coin_package_delete',
      targetId: pkgId,
      targetLabel: `Deleted Coin Package ${pkgId}`,
      reason: reason.trim() || 'Removed coin package',
      createdAt: nowIso,
      createdAtMillis: nowMillis,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete coin package.' };
  }
}

export async function adminSeedOfficialCoinPackages(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized.' };
    const existing = await getDocs(collection(db, 'coin_packages'));
    // Remove legacy pre-v3 packages if they exist
    for (const d of existing.docs) {
      if (d.id === 'pack_1000' || d.id === 'pack_5000' || d.id === 'pack_25000') {
        await deleteDoc(d.ref);
      }
    }
    for (const pkg of OFFICIAL_DEFAULT_COIN_PACKAGES) {
      await setDoc(
        doc(db, 'coin_packages', pkg.id),
        { ...pkg, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to sync official coin packages.' };
  }
}

/**
 * 4. VERIFIED COIN PURCHASE FULFILLMENT (Separates Paid Coins & Bonus Coins + Idempotency)
 */
export async function adminCreditVerifiedCoinPurchase(params: {
  targetUid: string;
  targetName: string;
  targetDisplayId?: string;
  packageId?: string;
  paidCoins: number;
  bonusCoins?: number;
  paymentMethod: string;
  paymentReference: string;
  economyConfig?: PlatformEconomyConfig;
  idempotencyKey?: string;
}): Promise<{ success: boolean; purchaseId?: string; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized: Super Admin required.' };

    const paidCoins = Math.floor(Number(params.paidCoins || 0));
    const bonusCoins = Math.max(0, Math.floor(Number(params.bonusCoins || 0)));
    const totalCoins = paidCoins + bonusCoins;
    if (!params.targetUid.trim() || paidCoins <= 0 || !params.paymentReference.trim()) {
      return { success: false, error: 'Target user, positive paid coins, and payment reference are required.' };
    }

    const cfg = params.economyConfig || OFFICIAL_ECONOMY_DEFAULTS;
    const priceInfo = calculateCoinPurchasePricePkr(paidCoins, cfg);
    const purchaseId = params.idempotencyKey || makeId(`buy_${params.targetUid.slice(0, 6)}`);

    // Verify with backend idempotency guard if reachable
    try {
      const headers = await getAdminHeaders();
      const resp = await fetch(apiUrl('/api/finance/verify-purchase'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: params.targetUid.trim(),
          paidCoins,
          bonusCoins,
          paymentReference: params.paymentReference.trim(),
          idempotencyKey: purchaseId,
        }),
      });
      if (resp.status === 409) {
        return { success: false, error: 'Duplicate payment reference / idempotency key rejected.' };
      }
    } catch {
      // fallback to Firestore transaction idempotency check
    }

    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const nowDisplay = new Date(nowMillis).toLocaleString();
    const adminUid = auth.currentUser?.uid || '';
    const adminEmail = auth.currentUser?.email || '';

    const purchaseRef = doc(db, 'coin_purchases', purchaseId);
    const walletRef = doc(db, 'wallets', params.targetUid.trim());
    const userRef = doc(db, 'users', params.targetUid.trim());
    const platformRevenueRef = doc(db, 'platform_revenue', 'global');

    await runTransaction(db, async (tx) => {
      const existingPurchase = await tx.get(purchaseRef);
      if (existingPurchase.exists()) {
        throw new Error('This coin purchase has already been credited.');
      }

      const walletSnap = await tx.get(walletRef);
      const userSnap = await tx.get(userRef);
      const currentCoins = walletSnap.exists()
        ? Number(walletSnap.data().walletPurchasedCoins || 0)
        : userSnap.exists()
          ? Number(userSnap.data().coins || 0)
          : 0;
      const currentBonusBal = walletSnap.exists() ? Number(walletSnap.data().bonusCoinsBalance || 0) : 0;
      const prevPurchased = walletSnap.exists() ? Number(walletSnap.data().totalCoinsPurchased || 0) : 0;
      const prevBonusTotal = walletSnap.exists() ? Number(walletSnap.data().totalBonusCoinsReceived || 0) : 0;

      const nextCoins = currentCoins + totalCoins;

      tx.set(
        walletRef,
        {
          userId: params.targetUid.trim(),
          walletPurchasedCoins: nextCoins,
          bonusCoinsBalance: currentBonusBal + bonusCoins,
          totalCoinsPurchased: prevPurchased + paidCoins,
          totalBonusCoinsReceived: prevBonusTotal + bonusCoins,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(userRef, { coins: nextCoins }, { merge: true });

      // Record verified Coin Purchase
      tx.set(purchaseRef, {
        id: purchaseId,
        idempotencyKey: purchaseId,
        userId: params.targetUid.trim(),
        userName: params.targetName || 'Lenzo User',
        userDisplayId: params.targetDisplayId || '',
        packageId: params.packageId || 'custom_verified',
        paidCoins,
        bonusCoins,
        totalCoinsCredited: totalCoins,
        amountPkr: priceInfo.pricePkr,
        coinPurchaseRatePkr: priceInfo.ratePkrPerCoin,
        paymentMethod: params.paymentMethod.trim() || 'Verified Bank/Wallet',
        paymentReference: params.paymentReference.trim(),
        verifiedBy: adminEmail,
        status: 'completed',
        configVersion: cfg.configVersion,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });

      // Update Package purchase stats if packageId given
      if (params.packageId && params.packageId !== 'custom_verified') {
        tx.set(
          doc(db, 'coin_packages', params.packageId),
          {
            purchaseCount: increment(1),
            totalRevenuePkr: increment(priceInfo.pricePkr),
          },
          { merge: true }
        );
      }

      // Update Platform Revenue coin sales counters
      tx.set(
        platformRevenueRef,
        {
          id: 'global',
          totalCoinPurchaseRevenuePkr: increment(priceInfo.pricePkr),
          totalCoinsSoldPaid: increment(paidCoins),
          totalBonusCoinsIssued: increment(bonusCoins),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // Wallet Transactions (root + user subcollection)
      const txId = `${purchaseId}_wtx`;
      const txPayload = {
        id: txId,
        userId: params.targetUid.trim(),
        category: 'coin_purchase',
        balanceType: 'wallet',
        amount: totalCoins,
        paidCoins,
        bonusCoins,
        pkrAmount: priceInfo.pricePkr,
        status: 'completed',
        description: `Verified Coin Purchase: +${paidCoins.toLocaleString()} Paid${bonusCoins > 0 ? ` + ${bonusCoins.toLocaleString()} Bonus` : ''} Coins (PKR ${priceInfo.pricePkr.toLocaleString()} • Ref: ${params.paymentReference.trim()})`,
        timestamp: nowDisplay,
        timestampMillis: nowMillis,
        referenceId: purchaseId,
        idempotencyKey: purchaseId,
        configVersion: cfg.configVersion,
      };
      tx.set(doc(db, 'wallet_transactions', txId), txPayload);
      tx.set(doc(db, 'users', params.targetUid.trim(), 'coin_transactions', txId), txPayload);

      // Immutable Financial Audit Log
      const auditId = makeId('faudit_buy');
      tx.set(doc(db, 'financial_audit_logs', auditId), {
        id: auditId,
        adminUid,
        adminEmail,
        action: 'coin_purchase_verified',
        targetId: params.targetUid.trim(),
        targetLabel: `${params.targetName} (+${paidCoins.toLocaleString()} Paid / +${bonusCoins.toLocaleString()} Bonus Coins = PKR ${priceInfo.pricePkr.toLocaleString()})`,
        newValue: { paidCoins, bonusCoins, amountPkr: priceInfo.pricePkr, paymentReference: params.paymentReference.trim() },
        reason: `Verified payment ref ${params.paymentReference.trim()} via ${params.paymentMethod}`,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });
    });

    void sendPushNotification({
      targetUserId: params.targetUid.trim(),
      type: 'wallet',
      title: `🪙 +${(paidCoins + bonusCoins).toLocaleString()} Coins Credited!`,
      message: `Your verified purchase of ${paidCoins.toLocaleString()} Coins${bonusCoins > 0 ? ` + ${bonusCoins.toLocaleString()} Bonus Coins` : ''} (PKR ${priceInfo.pricePkr.toLocaleString()}) is now in your wallet.`,
      actionType: 'open_wallet',
      targetId: purchaseId,
      priority: 'high',
      allowSelf: true,
      eventKey: 'coin_purchase',
    });

    return { success: true, purchaseId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to verify and credit coin purchase.' };
  }
}

/**
 * 5. AGENCY COMMISSION RULE & PAYOUT MANAGEMENT
 */
export async function adminUpdateAgencyCommissionOverride(params: {
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  commissionPercentOverride: number | null;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized.' };
    if (
      params.commissionPercentOverride !== null &&
      (params.commissionPercentOverride < 0 || params.commissionPercentOverride > 50)
    ) {
      return { success: false, error: 'Agency commission override must be between 0% and 50%.' };
    }
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const finRef = doc(db, 'agency_financial_records', params.agencyId);
    const prevSnap = await getDoc(finRef);

    await setDoc(
      finRef,
      {
        id: params.agencyId,
        agencyId: params.agencyId,
        agencyName: params.agencyName,
        agencyOwnerUid: params.agencyOwnerUid,
        commissionPercentOverride: params.commissionPercentOverride,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    const auditId = makeId('faudit_agrule');
    await setDoc(doc(db, 'financial_audit_logs', auditId), {
      id: auditId,
      adminUid: auth.currentUser?.uid || '',
      adminEmail: auth.currentUser?.email || '',
      action: 'agency_commission_update',
      targetId: params.agencyId,
      targetLabel: `Agency ${params.agencyName} commission rule`,
      previousValue: prevSnap.exists() ? { commissionPercentOverride: prevSnap.data().commissionPercentOverride ?? null } : null,
      newValue: { commissionPercentOverride: params.commissionPercentOverride },
      reason: params.reason.trim() || 'Updated agency commission percentage',
      createdAt: nowIso,
      createdAtMillis: nowMillis,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update agency commission rule.' };
  }
}

export async function adminMarkAgencyCommissionPaid(
  commission: AgencyCommissionRecord,
  paymentReference: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) return { success: false, error: 'Unauthorized.' };
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const commRef = doc(db, 'agency_commissions', commission.id);
    const finRef = doc(db, 'agency_financial_records', commission.agencyId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(commRef);
      if (!snap.exists()) throw new Error('Agency commission record not found.');
      if (snap.data().status === 'paid') throw new Error('Agency commission already marked as paid.');

      const finSnap = await tx.get(finRef);
      const prevPaid = finSnap.exists() ? Number(finSnap.data().totalCommissionPaidPkr || 0) : 0;
      const prevPending = finSnap.exists() ? Number(finSnap.data().pendingCommissionPkr || 0) : 0;

      tx.update(commRef, {
        status: 'paid',
        paymentReference: paymentReference.trim() || `AGPAY-${nowMillis.toString().slice(-6)}`,
        paidAt: nowIso,
      });

      tx.set(
        finRef,
        {
          id: commission.agencyId,
          agencyId: commission.agencyId,
          agencyName: commission.agencyName,
          agencyOwnerUid: commission.agencyOwnerUid,
          totalCommissionPaidPkr: roundPkr(prevPaid + commission.commissionPkr),
          pendingCommissionPkr: Math.max(0, roundPkr(prevPending - commission.commissionPkr)),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      const auditId = makeId('faudit_agpay');
      tx.set(doc(db, 'financial_audit_logs', auditId), {
        id: auditId,
        adminUid: auth.currentUser?.uid || '',
        adminEmail: auth.currentUser?.email || '',
        action: 'agency_commission_payout',
        targetId: commission.id,
        targetLabel: `${commission.agencyName} (PKR ${commission.commissionPkr.toLocaleString()})`,
        previousValue: { status: commission.status },
        newValue: { status: 'paid', paymentReference: paymentReference.trim() },
        reason: `Paid agency commission for withdrawal ${commission.withdrawalId}`,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });
    });

    if (commission.agencyOwnerUid) {
      void sendPushNotification({
        targetUserId: commission.agencyOwnerUid,
        type: 'agency',
        title: `💵 Agency Commission Paid: PKR ${commission.commissionPkr.toLocaleString()}`,
        message: `Commission for ${commission.agencyName} has been settled.${paymentReference ? ` Ref: ${paymentReference}` : ''}`,
        actionType: 'open_agency',
        targetId: commission.id,
        priority: 'high',
        allowSelf: true,
        eventKey: 'ag_comm_paid',
      });
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to mark agency commission as paid.' };
  }
}

/**
 * 6. IDEMPOTENT NON-DESTRUCTIVE MIGRATION & BALANCE RECONCILIATION
 *    - NEVER resets, overwrites, or invents any user coin/diamond balance.
 *    - Ensures `wallets/{uid}` and `earnings/{uid}` exist for all existing users while preserving real balances.
 *    - Flags any discrepancies between `users/{uid}.coins` vs `wallets/{uid}.walletPurchasedCoins`
 *      or `users/{uid}.diamonds` vs `earnings/{uid}.availableEarningsCoins` for admin review.
 */
export interface ReconciliationFlag {
  uid: string;
  userName: string;
  field: 'coins' | 'diamonds';
  profileValue: number;
  ledgerValue: number;
  delta: number;
  note: string;
}

export interface ReconciliationReport {
  executedAt: string;
  usersScanned: number;
  walletsSynchronized: number;
  earningsSynchronized: number;
  totalCirculatingCoins: number;
  totalAvailableDiamonds: number;
  totalPendingDiamonds: number;
  totalWithdrawnDiamonds: number;
  flags: ReconciliationFlag[];
}

export async function runFinancialMigrationAndReconciliation(): Promise<{
  success: boolean;
  report?: ReconciliationReport;
  error?: string;
}> {
  try {
    if (!isVerifiedAdminSession()) {
      return { success: false, error: 'Unauthorized: Super Admin required.' };
    }

    const [usersSnap, walletsSnap, earningsSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'wallets')),
      getDocs(collection(db, 'earnings')),
    ]);

    const walletMap = new Map<string, any>();
    walletsSnap.docs.forEach((d) => walletMap.set(d.id, d.data()));
    const earningsMap = new Map<string, any>();
    earningsSnap.docs.forEach((d) => earningsMap.set(d.id, d.data()));

    let walletsSynchronized = 0;
    let earningsSynchronized = 0;
    let totalCirculatingCoins = 0;
    let totalAvailableDiamonds = 0;
    let totalPendingDiamonds = 0;
    let totalWithdrawnDiamonds = 0;
    const flags: ReconciliationFlag[] = [];
    const nowIso = new Date().toISOString();

    for (const uDoc of usersSnap.docs) {
      const uid = uDoc.id;
      const u = uDoc.data();
      const userName = String(u.fullName || u.name || u.username || uid.slice(0, 8));
      const profileCoins = Number(u.coins || 0);
      const profileDiamonds = Number(u.diamonds || 0);

      const w = walletMap.get(uid);
      if (!w) {
        // Non-destructive initialization preserving existing profile coins
        await setDoc(
          doc(db, 'wallets', uid),
          {
            userId: uid,
            walletPurchasedCoins: profileCoins,
            bonusCoinsBalance: 0,
            totalCoinsPurchased: profileCoins,
            totalBonusCoinsReceived: 0,
            totalCoinsSpent: 0,
            totalRefundedCoins: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        walletsSynchronized += 1;
        totalCirculatingCoins += profileCoins;
      } else {
        const wCoins = Number(w.walletPurchasedCoins || 0);
        totalCirculatingCoins += wCoins;
        if (Math.abs(profileCoins - wCoins) > 0) {
          flags.push({
            uid,
            userName,
            field: 'coins',
            profileValue: profileCoins,
            ledgerValue: wCoins,
            delta: wCoins - profileCoins,
            note: 'Profile coins differs from wallets/{uid} ledger — preserved without overwrite; review before syncing.',
          });
        }
      }

      const e = earningsMap.get(uid);
      if (!e) {
        await setDoc(
          doc(db, 'earnings', uid),
          {
            userId: uid,
            availableEarningsCoins: profileDiamonds,
            pendingWithdrawalCoins: 0,
            totalWithdrawnCoins: 0,
            totalEarnedDiamonds: profileDiamonds,
            dailyEarnedDiamonds: 0,
            monthlyEarnedDiamonds: 0,
            lastEarnedDayKey: getDayKey(),
            lastEarnedMonthKey: getMonthKey(),
            grossGiftCoinsReceived: 0,
            totalCommissionDeducted: 0,
            totalConvertedToWallet: 0,
            totalGiftsCount: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        earningsSynchronized += 1;
        totalAvailableDiamonds += profileDiamonds;
      } else {
        const eDia = Number(e.availableEarningsCoins || 0);
        const ePend = Number(e.pendingWithdrawalCoins || 0);
        const eWith = Number(e.totalWithdrawnCoins || 0);
        totalAvailableDiamonds += eDia;
        totalPendingDiamonds += ePend;
        totalWithdrawnDiamonds += eWith;
        if (Math.abs(profileDiamonds - eDia) > 0) {
          flags.push({
            uid,
            userName,
            field: 'diamonds',
            profileValue: profileDiamonds,
            ledgerValue: eDia,
            delta: eDia - profileDiamonds,
            note: 'Profile diamonds differs from earnings/{uid} ledger — preserved without overwrite; review before syncing.',
          });
        }
      }
    }

    // Ensure platform_financial_settings/global and platform_revenue/global exist non-destructively
    const cfgSnap = await getDoc(doc(db, 'platform_financial_settings', 'global'));
    if (!cfgSnap.exists()) {
      await setDoc(
        doc(db, 'platform_financial_settings', 'global'),
        { ...OFFICIAL_ECONOMY_DEFAULTS, updatedAt: nowIso, updatedByEmail: auth.currentUser?.email || '' },
        { merge: true }
      );
    }
    const revSnap = await getDoc(doc(db, 'platform_revenue', 'global'));
    if (!revSnap.exists()) {
      await setDoc(doc(db, 'platform_revenue', 'global'), { ...EMPTY_PLATFORM_REVENUE, updatedAt: nowIso }, { merge: true });
    }

    const report: ReconciliationReport = {
      executedAt: nowIso,
      usersScanned: usersSnap.size,
      walletsSynchronized,
      earningsSynchronized,
      totalCirculatingCoins,
      totalAvailableDiamonds,
      totalPendingDiamonds,
      totalWithdrawnDiamonds,
      flags,
    };

    const auditId = makeId('faudit_recon');
    await setDoc(doc(db, 'financial_audit_logs', auditId), {
      id: auditId,
      adminUid: auth.currentUser?.uid || '',
      adminEmail: auth.currentUser?.email || '',
      action: 'balance_reconciliation',
      targetId: 'platform_wide',
      targetLabel: `Scanned ${report.usersScanned} users · ${flags.length} discrepancies flagged`,
      newValue: {
        walletsSynchronized,
        earningsSynchronized,
        totalCirculatingCoins,
        totalAvailableDiamonds,
        flagsCount: flags.length,
      },
      reason: 'Idempotent non-destructive migration & financial balance reconciliation',
      createdAt: nowIso,
      createdAtMillis: Date.now(),
    });

    return { success: true, report };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Reconciliation failed.' };
  }
}

/**
 * 7. CSV REPORT EXPORTER (Zero external deps)
 */
export function downloadCsvReport(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
