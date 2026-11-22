import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { isVerifiedAdminSession } from '../utils/adminAuth';
import { apiUrl } from '../utils/apiConfig';
import {
  OFFICIAL_DEFAULT_COIN_PACKAGES,
  OFFICIAL_ECONOMY_DEFAULTS,
  OFFICIAL_POLICY_VERSION,
  PlatformEconomyConfig,
  calculateGiftSplit,
  calculateWithdrawalWaterfall,
  getDayKey,
  getMonthKey,
  normalizeEconomyConfig,
  roundPkr,
} from '../shared/financialEngine';
import {
  UserWalletData,
  UserEarningsData,
  WalletSettings,
  WalletRechargePackage,
  FinancialTransaction,
  WithdrawalRequest,
  WithdrawalStatus,
  PayoutMethodConfig,
  CoinSellerAgency,
  UserProfile,
  GiftItem,
} from '../types';

function economyToWalletSettings(cfg: PlatformEconomyConfig): WalletSettings {
  return {
    configVersion: cfg.configVersion,
    commissionPolicyVersion: cfg.policyVersion,
    coinPurchasePkrPer100k: cfg.coinPurchasePkrPer100k,
    coinPurchasePkrPerCoin: cfg.coinPurchasePkrPerCoin,
    commissionRatePercent: cfg.appSharePercent,
    hostSharePercent: cfg.hostSharePercent,
    diamondConversionRatio: cfg.diamondConversionRatio,
    diamondWithdrawalPkrPer100k: cfg.diamondWithdrawalPkrPer100k,
    exchangeRatePkrPerCoin: cfg.diamondWithdrawalPkrPerDiamond,
    minWithdrawalCoins: cfg.minWithdrawalDiamonds,
    maxWithdrawalCoins: cfg.maxWithdrawalDiamonds,
    agencyCommissionPercent: cfg.agencyCommissionPercent,
    withdrawalFeePercent: cfg.withdrawalProcessingFeePercent,
    bonusCoinsEnabled: cfg.bonusCoinsEnabled,
    maxBonusCoinPercent: cfg.maxBonusCoinPercent,
    enabledPaymentMethods: cfg.enabledPaymentMethods,
    earningsToWalletConversionRate: 1.0,
    updatedAt: cfg.updatedAt,
    updatedByEmail: cfg.updatedByEmail,
    lastChangeReason: cfg.lastChangeReason,
  };
}

export function walletSettingsToEconomyConfig(settings?: Partial<WalletSettings> | null): PlatformEconomyConfig {
  if (!settings) return { ...OFFICIAL_ECONOMY_DEFAULTS };
  const isLegacyV2 = settings.commissionPolicyVersion !== OFFICIAL_POLICY_VERSION;
  if (isLegacyV2) {
    return { ...OFFICIAL_ECONOMY_DEFAULTS };
  }
  return normalizeEconomyConfig({
    configVersion: settings.configVersion ?? OFFICIAL_ECONOMY_DEFAULTS.configVersion,
    coinPurchasePkrPer100k:
      settings.coinPurchasePkrPer100k ?? OFFICIAL_ECONOMY_DEFAULTS.coinPurchasePkrPer100k,
    appSharePercent: settings.commissionRatePercent ?? OFFICIAL_ECONOMY_DEFAULTS.appSharePercent,
    hostSharePercent:
      settings.hostSharePercent ?? (100 - (settings.commissionRatePercent ?? OFFICIAL_ECONOMY_DEFAULTS.appSharePercent)),
    diamondConversionRatio: settings.diamondConversionRatio ?? OFFICIAL_ECONOMY_DEFAULTS.diamondConversionRatio,
    diamondWithdrawalPkrPer100k:
      settings.diamondWithdrawalPkrPer100k ?? OFFICIAL_ECONOMY_DEFAULTS.diamondWithdrawalPkrPer100k,
    minWithdrawalDiamonds: settings.minWithdrawalCoins ?? OFFICIAL_ECONOMY_DEFAULTS.minWithdrawalDiamonds,
    maxWithdrawalDiamonds: settings.maxWithdrawalCoins ?? OFFICIAL_ECONOMY_DEFAULTS.maxWithdrawalDiamonds,
    agencyCommissionPercent:
      settings.agencyCommissionPercent ?? OFFICIAL_ECONOMY_DEFAULTS.agencyCommissionPercent,
    withdrawalProcessingFeePercent:
      settings.withdrawalFeePercent ?? OFFICIAL_ECONOMY_DEFAULTS.withdrawalProcessingFeePercent,
    bonusCoinsEnabled: settings.bonusCoinsEnabled ?? OFFICIAL_ECONOMY_DEFAULTS.bonusCoinsEnabled,
    maxBonusCoinPercent: settings.maxBonusCoinPercent ?? OFFICIAL_ECONOMY_DEFAULTS.maxBonusCoinPercent,
    enabledPaymentMethods: settings.enabledPaymentMethods ?? OFFICIAL_ECONOMY_DEFAULTS.enabledPaymentMethods,
  });
}

// Official Final Global Wallet Settings:
// 100,000 Coins = PKR 3,000 | 40% App Beans / 60% Host Diamonds | 100,000 Diamonds = PKR 2,600
export const DEFAULT_WALLET_SETTINGS: WalletSettings = economyToWalletSettings(OFFICIAL_ECONOMY_DEFAULTS);

// Official Default Coin Recharge Packages strictly aligned to 100,000 Coins = PKR 3,000
export const DEFAULT_COIN_PACKAGES: WalletRechargePackage[] = OFFICIAL_DEFAULT_COIN_PACKAGES.map((p) => ({
  ...p,
}));

// Default Payout Methods (Bank Transfer, EasyPaisa, JazzCash)
export const DEFAULT_PAYOUT_METHODS: PayoutMethodConfig[] = [
  {
    id: 'bank_transfer',
    name: 'Bank Transfer (IBFT / 1Link)',
    type: 'bank_transfer',
    enabled: true,
    instructions: 'Provide your Full Account Title, Bank Name, and Account Number / 24-digit IBAN',
    minAmountCoins: OFFICIAL_ECONOMY_DEFAULTS.minWithdrawalDiamonds,
  },
  {
    id: 'easypaisa',
    name: 'EasyPaisa',
    type: 'easypaisa',
    enabled: true,
    instructions: 'Provide your registered EasyPaisa 11-digit mobile number and Account Title',
    minAmountCoins: OFFICIAL_ECONOMY_DEFAULTS.minWithdrawalDiamonds,
  },
  {
    id: 'jazzcash',
    name: 'JazzCash',
    type: 'jazzcash',
    enabled: true,
    instructions: 'Provide your registered JazzCash 11-digit mobile number and Account Title',
    minAmountCoins: OFFICIAL_ECONOMY_DEFAULTS.minWithdrawalDiamonds,
  },
];

// Strictly real Firestore agencies only — NO fake/mock placeholder agencies
export const DEFAULT_COIN_SELLER_AGENCIES: CoinSellerAgency[] = [];

const LEGACY_PLACEHOLDER_AGENCY_IDS = new Set([
  'agency_lenzo_hq_lhr',
  'agency_karachi_gold',
  'agency_isb_rwp_prime',
  'agency_multan_fsd_star',
  'agency_gulf_international',
]);

const TERMINAL_WITHDRAWAL_STATUSES = new Set<WithdrawalStatus>(['paid', 'rejected', 'cancelled']);

function generateIdempotencyId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function getBearerAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const token = await auth.currentUser?.getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // non-fatal
  }
  return headers;
}

/**
 * 1. SETTINGS & CONFIGURATION SERVICE (Synced with platform_financial_settings/global)
 */
export function subscribeWalletSettings(onUpdate: (settings: WalletSettings) => void) {
  const canonicalRef = doc(db, 'platform_financial_settings', 'global');
  const legacyRef = doc(db, 'wallet_settings', 'global');

  return onSnapshot(
    canonicalRef,
    (snap) => {
      if (snap.exists()) {
        const cfg = normalizeEconomyConfig(snap.data() as Partial<PlatformEconomyConfig>);
        onUpdate(economyToWalletSettings(cfg));
      } else {
        // Auto-bootstrap v3 official economy settings when an authorized Admin connects (never touches user balances!)
        if (isVerifiedAdminSession()) {
          const seedCfg: PlatformEconomyConfig = {
            ...OFFICIAL_ECONOMY_DEFAULTS,
            updatedAt: new Date().toISOString(),
            updatedByUid: auth.currentUser?.uid || '',
            updatedByEmail: auth.currentUser?.email || '',
            lastChangeReason: 'Initial v3 official economy configuration sync',
          };
          setDoc(canonicalRef, seedCfg, { merge: true }).catch(() => {});
          setDoc(
            legacyRef,
            { ...economyToWalletSettings(seedCfg), updatedAt: serverTimestamp() },
            { merge: true }
          ).catch(() => {});
        }
        onUpdate(DEFAULT_WALLET_SETTINGS);
      }
    },
    (err) => {
      console.warn('Financial settings subscription notice:', err);
      onUpdate(DEFAULT_WALLET_SETTINGS);
    }
  );
}

export async function updateWalletSettings(settings: Partial<WalletSettings>): Promise<void> {
  const canonicalRef = doc(db, 'platform_financial_settings', 'global');
  const legacyRef = doc(db, 'wallet_settings', 'global');
  try {
    const mergedEconomy = normalizeEconomyConfig({
      coinPurchasePkrPer100k: settings.coinPurchasePkrPer100k,
      appSharePercent: settings.commissionRatePercent,
      hostSharePercent:
        settings.hostSharePercent ??
        (settings.commissionRatePercent !== undefined ? 100 - settings.commissionRatePercent : undefined),
      diamondConversionRatio: settings.diamondConversionRatio,
      diamondWithdrawalPkrPer100k:
        settings.diamondWithdrawalPkrPer100k ??
        (settings.exchangeRatePkrPerCoin !== undefined
          ? roundPkr(settings.exchangeRatePkrPerCoin * 100000)
          : undefined),
      minWithdrawalDiamonds: settings.minWithdrawalCoins,
      maxWithdrawalDiamonds: settings.maxWithdrawalCoins,
      agencyCommissionPercent: settings.agencyCommissionPercent,
      withdrawalProcessingFeePercent: settings.withdrawalFeePercent,
      updatedAt: new Date().toISOString(),
      updatedByUid: auth.currentUser?.uid || '',
      updatedByEmail: auth.currentUser?.email || '',
    });

    await setDoc(canonicalRef, mergedEconomy, { merge: true });
    await setDoc(
      legacyRef,
      { ...economyToWalletSettings(mergedEconomy), updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'platform_financial_settings/global');
  }
}

/**
 * 2. COIN RECHARGE PACKAGES SERVICE (Aligned to 100,000 Coins = PKR 3,000)
 */
export function subscribeCoinPackages(onUpdate: (packages: WalletRechargePackage[]) => void) {
  const collRef = collection(db, 'coin_packages');
  return onSnapshot(
    collRef,
    (snap) => {
      if (!snap.empty) {
        const pkgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletRechargePackage));
        // Detect if collection still only contains pre-v3 legacy packages (e.g., 1,000 coins = PKR 2,000)
        const hasLegacyPriceBug = pkgs.some(
          (p) => p.id === 'pack_1000' && p.coins === 1000 && p.pricePkr === 2000
        );
        if (hasLegacyPriceBug) {
          onUpdate(DEFAULT_COIN_PACKAGES);
          return;
        }
        pkgs.sort((a, b) => a.coins - b.coins);
        onUpdate(pkgs);
      } else {
        if (isVerifiedAdminSession()) {
          DEFAULT_COIN_PACKAGES.forEach((pkg) => {
            setDoc(doc(db, 'coin_packages', pkg.id), pkg, { merge: true }).catch(console.warn);
          });
        }
        onUpdate(DEFAULT_COIN_PACKAGES);
      }
    },
    () => {
      onUpdate(DEFAULT_COIN_PACKAGES);
    }
  );
}

export async function saveCoinPackage(pkg: WalletRechargePackage): Promise<void> {
  const docRef = doc(db, 'coin_packages', pkg.id);
  try {
    await setDoc(
      docRef,
      {
        ...pkg,
        displayPrice: pkg.displayPrice || `PKR ${Number(pkg.pricePkr || 0).toLocaleString()}`,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `coin_packages/${pkg.id}`);
  }
}

/**
 * 2B. REAL COIN SELLER AGENCIES SERVICE (ZERO FAKE/MOCK SEEDING)
 */
export function subscribeCoinSellerAgencies(
  isAdmin: boolean,
  onUpdate: (agencies: CoinSellerAgency[]) => void
) {
  const collRef = collection(db, 'coin_seller_agencies');
  const q = isAdmin ? collRef : query(collRef, where('enabled', '==', true));

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as CoinSellerAgency))
        .filter((item) => !LEGACY_PLACEHOLDER_AGENCY_IDS.has(item.id));
      items.sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return (a.agencyCode || a.name).localeCompare(b.agencyCode || b.name);
      });
      onUpdate(items);
    },
    (err) => {
      console.warn('Coin seller agencies listener notice:', err);
      onUpdate([]);
    }
  );
}

export async function saveCoinSellerAgency(agency: CoinSellerAgency): Promise<{ success: boolean; error?: string }> {
  const cleanId = agency.id.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!cleanId) return { success: false, error: 'Invalid agency ID' };
  const docRef = doc(db, 'coin_seller_agencies', cleanId);
  try {
    await setDoc(
      docRef,
      {
        id: cleanId,
        name: agency.name.trim().slice(0, 80),
        ownerName: agency.ownerName.trim().slice(0, 60),
        agencyCode: agency.agencyCode.trim().toUpperCase().slice(0, 24),
        city: agency.city.trim().slice(0, 50),
        country: agency.country.trim().slice(0, 50),
        whatsapp: agency.whatsapp.trim().slice(0, 24),
        phone: agency.phone.trim().slice(0, 24),
        paymentMethods: agency.paymentMethods.slice(0, 8).map((m) => m.trim().slice(0, 32)).filter(Boolean),
        workingHours: agency.workingHours.trim().slice(0, 60),
        minCoinsOrder: Math.max(0, Number(agency.minCoinsOrder || 0)),
        rateNote: (agency.rateNote || '').trim().slice(0, 120),
        badge: (agency.badge || 'VERIFIED').trim().slice(0, 24),
        isVerified: Boolean(agency.isVerified),
        isOnline: Boolean(agency.isOnline),
        enabled: Boolean(agency.enabled),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save coin seller agency' };
  }
}

export async function deleteCoinSellerAgency(agencyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(db, 'coin_seller_agencies', agencyId));
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete agency' };
  }
}

/**
 * 3. REAL USER COIN WALLET (PURCHASED COINS + TRACKED BONUS COINS)
 */
export function subscribeUserWallet(
  userId: string,
  onUpdate: (wallet: UserWalletData) => void
) {
  const docRef = doc(db, 'wallets', userId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          userId,
          walletPurchasedCoins: Number(data.walletPurchasedCoins ?? 0),
          bonusCoinsBalance: Number(data.bonusCoinsBalance ?? 0),
          totalCoinsPurchased: Number(data.totalCoinsPurchased ?? 0),
          totalBonusCoinsReceived: Number(data.totalBonusCoinsReceived ?? 0),
          totalCoinsSpent: Number(data.totalCoinsSpent ?? 0),
          totalRefundedCoins: Number(data.totalRefundedCoins ?? 0),
          updatedAt:
            data.updatedAt && typeof (data.updatedAt as Timestamp).toDate === 'function'
              ? (data.updatedAt as Timestamp).toDate().toISOString()
              : typeof data.updatedAt === 'string'
                ? data.updatedAt
                : new Date().toISOString(),
        });
      } else {
        const initial: UserWalletData = {
          userId,
          walletPurchasedCoins: 0,
          bonusCoinsBalance: 0,
          totalCoinsPurchased: 0,
          totalBonusCoinsReceived: 0,
          totalCoinsSpent: 0,
          totalRefundedCoins: 0,
          updatedAt: new Date().toISOString(),
        };
        setDoc(docRef, { ...initial, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
        onUpdate(initial);
      }
    },
    (err) => {
      console.warn('Wallet listener notice:', err);
    }
  );
}

/**
 * 4. REAL HOST DIAMOND EARNINGS WALLET (60% GIFT SHARE -> DIAMONDS ONLY)
 */
export function subscribeUserEarnings(
  userId: string,
  onUpdate: (earnings: UserEarningsData) => void
) {
  const docRef = doc(db, 'earnings', userId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const todayKey = getDayKey();
        const monthKey = getMonthKey();
        const available = Number(data.availableEarningsCoins ?? 0);
        const pending = Number(data.pendingWithdrawalCoins ?? 0);
        const withdrawn = Number(data.totalWithdrawnCoins ?? 0);
        const computedTotalEarned = Math.max(
          Number(data.totalEarnedDiamonds ?? 0),
          available + pending + withdrawn
        );
        onUpdate({
          userId,
          availableEarningsCoins: available,
          pendingWithdrawalCoins: pending,
          totalWithdrawnCoins: withdrawn,
          totalEarnedDiamonds: computedTotalEarned,
          dailyEarnedDiamonds:
            data.lastEarnedDayKey === todayKey ? Number(data.dailyEarnedDiamonds ?? 0) : 0,
          monthlyEarnedDiamonds:
            data.lastEarnedMonthKey === monthKey ? Number(data.monthlyEarnedDiamonds ?? 0) : 0,
          lastEarnedDayKey: data.lastEarnedDayKey || todayKey,
          lastEarnedMonthKey: data.lastEarnedMonthKey || monthKey,
          grossGiftCoinsReceived: Number(data.grossGiftCoinsReceived ?? 0),
          totalCommissionDeducted: Number(data.totalCommissionDeducted ?? 0),
          totalConvertedToWallet: Number(data.totalConvertedToWallet ?? 0),
          totalGiftsCount: Number(data.totalGiftsCount ?? 0),
          updatedAt:
            data.updatedAt && typeof (data.updatedAt as Timestamp).toDate === 'function'
              ? (data.updatedAt as Timestamp).toDate().toISOString()
              : typeof data.updatedAt === 'string'
                ? data.updatedAt
                : new Date().toISOString(),
        });
      } else {
        const initial: UserEarningsData = {
          userId,
          availableEarningsCoins: 0,
          pendingWithdrawalCoins: 0,
          totalWithdrawnCoins: 0,
          totalEarnedDiamonds: 0,
          dailyEarnedDiamonds: 0,
          monthlyEarnedDiamonds: 0,
          lastEarnedDayKey: getDayKey(),
          lastEarnedMonthKey: getMonthKey(),
          grossGiftCoinsReceived: 0,
          totalCommissionDeducted: 0,
          totalConvertedToWallet: 0,
          totalGiftsCount: 0,
          updatedAt: new Date().toISOString(),
        };
        setDoc(docRef, { ...initial, updatedAt: serverTimestamp() }, { merge: true }).catch(console.warn);
        onUpdate(initial);
      }
    },
    (err) => {
      console.warn('Earnings listener notice:', err);
    }
  );
}

/**
 * 5. ONLINE COIN RECHARGE — LOCKED UNTIL VERIFIED PAYMENT GATEWAY
 * Only verified Admin / Coin Seller Agency payments can credit Coins.
 */
export async function purchaseCoins(
  _userId: string,
  _packageId: string,
  _settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  return {
    success: false,
    newBalance: 0,
    error: 'Online payment gateway is coming soon. Please purchase verified Coins via Official Offline Coin Seller Agencies.',
  };
}

/**
 * 6. PRODUCTION AUTOMATIC GIFTING ENGINE
 *    - Authenticates sender & requests backend authoritative gift quote (`/api/finance/quote-gift`).
 *    - Enforces idempotency via `gift_transactions/{idempotencyKey}` inside Firestore `runTransaction`.
 *    - Deducts 100% Coins from Sender Coin Wallet (`wallets/{senderId}` & `users/{senderId}.coins`).
 *    - Credits 60% Host Share directly as Diamonds (`earnings/{receiverId}` & `users/{receiverId}.diamonds`).
 *      Host NEVER receives gifted Coins as earnings.
 *    - Credits 40% App Share as App Beans to `platform_revenue/global` AND immutable `platform_beans_ledger/{idempotencyKey}`.
 *    - Records immutable audit ledgers across root & user subcollections in real time.
 */
export async function processGiftTransaction(
  senderUser: UserProfile,
  recipientUser: UserProfile,
  gift: GiftItem,
  quantity: number = 1,
  settings: WalletSettings = DEFAULT_WALLET_SETTINGS,
  options?: {
    context?: 'live_stream' | 'party_room' | 'pk_battle' | 'private_room' | 'direct';
    roomId?: string;
    idempotencyKey?: string;
  }
): Promise<{
  success: boolean;
  netEarnings: number;
  commission: number;
  transactionId?: string;
  error?: string;
}> {
  try {
    const authUid = auth.currentUser?.uid;
    if (!authUid || authUid !== senderUser.id) {
      return { success: false, netEarnings: 0, commission: 0, error: 'Authentication required to send gifts.' };
    }
    const qty = Math.floor(Number(quantity || 1));
    const unitCoins = Math.floor(Number(gift.coins || 0));
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitCoins) || unitCoins <= 0) {
      return { success: false, netEarnings: 0, commission: 0, error: 'Invalid gift amount.' };
    }

    const idempotencyKey = options?.idempotencyKey || generateIdempotencyId(`gift_${senderUser.id.slice(0, 6)}`);
    const economyCfg = walletSettingsToEconomyConfig(settings);

    // Authoritative server-side gift quote & split calculation (falls back to identical shared engine only if backend unreachable)
    let split = calculateGiftSplit(unitCoins * qty, economyCfg);
    let verifiedGrossCoins = unitCoins * qty;

    try {
      const headers = await getBearerAuthHeaders();
      const resp = await fetch(apiUrl('/api/finance/quote-gift'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          receiverId: recipientUser.id,
          giftId: gift.id,
          giftName: gift.name,
          quantity: qty,
          customStoreGiftPriceCoins: unitCoins,
          idempotencyKey,
        }),
      });
      if (resp.status === 409) {
        return {
          success: false,
          netEarnings: 0,
          commission: 0,
          error: 'Duplicate gift transaction prevented.',
        };
      }
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.quote) {
          verifiedGrossCoins = Number(data.quote.grossCoins);
          split = {
            grossCoins: verifiedGrossCoins,
            appSharePercent: Number(data.quote.appSharePercent),
            hostSharePercent: Number(data.quote.hostSharePercent),
            appBeansAmount: Number(data.quote.appBeansAmount),
            hostShareCoins: Number(data.quote.hostShareCoins),
            hostDiamondsAmount: Number(data.quote.hostDiamondsAmount),
            appRevenuePkrEstimate: Number(data.quote.appRevenuePkrEstimate),
            hostGrossPkrValue: Number(data.quote.hostGrossPkrValue),
            configVersion: Number(data.quote.configVersion || economyCfg.configVersion),
          };
        }
      }
    } catch {
      // Offline / static hosting fallback uses identical deterministic shared financialEngine
    }

    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const nowDisplay = new Date(nowMillis).toLocaleString();
    const todayKey = getDayKey(new Date(nowMillis));
    const monthKey = getMonthKey(new Date(nowMillis));

    const giftTxRef = doc(db, 'gift_transactions', idempotencyKey);
    const senderWalletRef = doc(db, 'wallets', senderUser.id);
    const recipientEarningsRef = doc(db, 'earnings', recipientUser.id);
    const senderUserRef = doc(db, 'users', senderUser.id);
    const recipientUserRef = doc(db, 'users', recipientUser.id);
    const platformRevenueRef = doc(db, 'platform_revenue', 'global');
    const beansLedgerRef = doc(db, 'platform_beans_ledger', idempotencyKey);

    await runTransaction(db, async (tx) => {
      // 1. Idempotency check: reject duplicate transaction replay
      const existingGiftSnap = await tx.get(giftTxRef);
      if (existingGiftSnap.exists()) {
        throw new Error('This gift transaction was already processed.');
      }

      // 2. Verify sender available Coin Wallet balance
      const senderSnap = await tx.get(senderWalletRef);
      const senderUserSnap = await tx.get(senderUserRef);
      const walletCoins = senderSnap.exists() ? Number(senderSnap.data().walletPurchasedCoins ?? 0) : 0;
      const profileCoins = senderUserSnap.exists() ? Number(senderUserSnap.data().coins ?? 0) : 0;
      const senderCoins = senderSnap.exists() && walletCoins > 0 ? walletCoins : Math.max(walletCoins, profileCoins);

      if (senderCoins < verifiedGrossCoins) {
        throw new Error(
          `Insufficient Coin Wallet balance. You have ${senderCoins.toLocaleString()} Coins, but need ${verifiedGrossCoins.toLocaleString()} Coins.`
        );
      }

      const recipientSnap = await tx.get(recipientEarningsRef);

      // 3. Deduct 100% Coins from sender's Coin Wallet
      const newSenderCoins = senderCoins - verifiedGrossCoins;
      const prevSpent = senderSnap.exists() ? Number(senderSnap.data().totalCoinsSpent || 0) : 0;

      tx.set(
        senderWalletRef,
        {
          userId: senderUser.id,
          walletPurchasedCoins: newSenderCoins,
          totalCoinsSpent: prevSpent + verifiedGrossCoins,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(senderUserRef, { coins: newSenderCoins }, { merge: true });

      // 4. Credit 60% Host Share directly as Diamonds to receiver's Diamond Earnings Wallet (NEVER Coins!)
      const currentDiamonds = recipientSnap.exists() ? Number(recipientSnap.data().availableEarningsCoins || 0) : 0;
      const prevTotalEarned = recipientSnap.exists()
        ? Math.max(Number(recipientSnap.data().totalEarnedDiamonds || 0), currentDiamonds)
        : 0;
      const prevDaily =
        recipientSnap.exists() && recipientSnap.data().lastEarnedDayKey === todayKey
          ? Number(recipientSnap.data().dailyEarnedDiamonds || 0)
          : 0;
      const prevMonthly =
        recipientSnap.exists() && recipientSnap.data().lastEarnedMonthKey === monthKey
          ? Number(recipientSnap.data().monthlyEarnedDiamonds || 0)
          : 0;
      const prevGross = recipientSnap.exists() ? Number(recipientSnap.data().grossGiftCoinsReceived || 0) : 0;
      const prevCommission = recipientSnap.exists() ? Number(recipientSnap.data().totalCommissionDeducted || 0) : 0;
      const prevGiftCount = recipientSnap.exists() ? Number(recipientSnap.data().totalGiftsCount || 0) : 0;

      const newAvailableDiamonds = currentDiamonds + split.hostDiamondsAmount;

      tx.set(
        recipientEarningsRef,
        {
          userId: recipientUser.id,
          availableEarningsCoins: newAvailableDiamonds,
          totalEarnedDiamonds: prevTotalEarned + split.hostDiamondsAmount,
          dailyEarnedDiamonds: prevDaily + split.hostDiamondsAmount,
          monthlyEarnedDiamonds: prevMonthly + split.hostDiamondsAmount,
          lastEarnedDayKey: todayKey,
          lastEarnedMonthKey: monthKey,
          grossGiftCoinsReceived: prevGross + verifiedGrossCoins,
          totalCommissionDeducted: prevCommission + split.appBeansAmount,
          totalGiftsCount: prevGiftCount + qty,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(recipientUserRef, { diamonds: newAvailableDiamonds }, { merge: true });

      // 5. Credit 40% App Share to App Beans / Revenue Wallet (atomic upward-only increment; private to Admin)
      tx.set(
        platformRevenueRef,
        {
          id: 'global',
          totalBeansEarned: increment(split.appBeansAmount),
          totalGiftingCoinsProcessed: increment(verifiedGrossCoins),
          totalHostDiamondsIssued: increment(split.hostDiamondsAmount),
          totalGiftCount: increment(qty),
          updatedAt: nowIso,
        },
        { merge: true }
      );

      // 6. Immutable App Beans Revenue Ledger Entry
      tx.set(beansLedgerRef, {
        id: idempotencyKey,
        idempotencyKey,
        source: 'gift_split',
        senderId: senderUser.id,
        senderName: senderUser.name || 'User',
        receiverId: recipientUser.id,
        receiverName: recipientUser.name || 'Host',
        giftId: gift.id,
        giftName: gift.name,
        context: options?.context || 'live_stream',
        grossCoins: verifiedGrossCoins,
        appSharePercent: split.appSharePercent,
        hostSharePercent: split.hostSharePercent,
        beansAmount: split.appBeansAmount,
        hostDiamondsIssued: split.hostDiamondsAmount,
        estimatedAppRevenuePkr: split.appRevenuePkrEstimate,
        hostGrossPkr: split.hostGrossPkrValue,
        configVersion: split.configVersion,
        dayKey: todayKey,
        monthKey,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });

      // 7. Immutable Master Gift Transaction Record
      tx.set(giftTxRef, {
        id: idempotencyKey,
        idempotencyKey,
        senderId: senderUser.id,
        senderName: senderUser.name || 'User',
        receiverId: recipientUser.id,
        receiverName: recipientUser.name || 'Host',
        giftId: gift.id,
        giftName: gift.name,
        giftIcon: gift.icon || '🎁',
        quantity: qty,
        unitPriceCoins: unitCoins,
        coinAmount: verifiedGrossCoins,
        appSharePercent: split.appSharePercent,
        hostSharePercent: split.hostSharePercent,
        appBeansAmount: split.appBeansAmount,
        hostDiamondsAmount: split.hostDiamondsAmount,
        hostGrossPkr: split.hostGrossPkrValue,
        context: options?.context || 'live_stream',
        roomId: options?.roomId || '',
        configVersion: split.configVersion,
        status: 'completed',
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });

      // 8. Sender Coin Wallet Transaction (root + per-user subcollection)
      const senderTxId = `${idempotencyKey}_coin`;
      const senderTxPayload = {
        id: senderTxId,
        userId: senderUser.id,
        category: 'gift_sent',
        balanceType: 'wallet',
        amount: -verifiedGrossCoins,
        pkrAmount: roundPkr(verifiedGrossCoins * economyCfg.coinPurchasePkrPerCoin),
        status: 'completed',
        description: `Sent ${qty}x ${gift.name} ${gift.icon} to ${recipientUser.name}`,
        timestamp: nowDisplay,
        timestampMillis: nowMillis,
        referenceId: idempotencyKey,
        idempotencyKey,
        configVersion: split.configVersion,
        metadata: {
          recipientId: recipientUser.id,
          recipientName: recipientUser.name,
          giftId: gift.id,
          giftName: gift.name,
          quantity: qty,
          context: options?.context || 'live_stream',
        },
      };
      tx.set(doc(db, 'wallet_transactions', senderTxId), senderTxPayload);
      tx.set(doc(db, 'users', senderUser.id, 'coin_transactions', senderTxId), senderTxPayload);

      // 9. Receiver Host Diamond Earnings Transaction (root + per-user subcollection)
      const receiverTxId = `${idempotencyKey}_dia`;
      const receiverTxPayload = {
        id: receiverTxId,
        userId: recipientUser.id,
        category: 'gift_received',
        balanceType: 'earnings',
        amount: split.hostDiamondsAmount,
        pkrAmount: split.hostGrossPkrValue,
        status: 'completed',
        description: `Received ${qty}x ${gift.name} ${gift.icon} from ${senderUser.name} (+${split.hostDiamondsAmount.toLocaleString()} Diamonds • ${split.hostSharePercent}% Host Share)`,
        timestamp: nowDisplay,
        timestampMillis: nowMillis,
        referenceId: idempotencyKey,
        idempotencyKey,
        configVersion: split.configVersion,
        metadata: {
          senderId: senderUser.id,
          senderName: senderUser.name,
          grossGiftCost: verifiedGrossCoins,
          appBeansAmount: split.appBeansAmount,
          appSharePercent: split.appSharePercent,
          hostSharePercent: split.hostSharePercent,
          hostGrossPkr: split.hostGrossPkrValue,
        },
      };
      tx.set(doc(db, 'earnings_transactions', receiverTxId), receiverTxPayload);
      tx.set(doc(db, 'users', recipientUser.id, 'diamond_transactions', receiverTxId), receiverTxPayload);

      // 10. Legacy commission_transactions audit mirror
      const commTxId = `${idempotencyKey}_comm`;
      tx.set(doc(db, 'commission_transactions', commTxId), {
        id: commTxId,
        senderId: senderUser.id,
        recipientId: recipientUser.id,
        grossCost: verifiedGrossCoins,
        commissionCoins: split.appBeansAmount,
        netEarningsCoins: split.hostDiamondsAmount,
        commissionPercent: split.appSharePercent,
        configVersion: split.configVersion,
        timestamp: serverTimestamp(),
        timestampMillis: nowMillis,
      });
    });

    return {
      success: true,
      netEarnings: split.hostDiamondsAmount,
      commission: split.appBeansAmount,
      transactionId: idempotencyKey,
    };
  } catch (err: any) {
    return {
      success: false,
      netEarnings: 0,
      commission: 0,
      error: err?.message || 'Gift transaction failed.',
    };
  }
}

/**
 * 7. DIAMONDS CANNOT BE USED TO PURCHASE GIFTS (Policy Section 2B)
 * Kept as a safe explicit guard so no code path can convert Host Diamonds into gifting Coins.
 */
export async function convertEarningsToWallet(
  _userId: string,
  _coinsToConvert: number,
  _settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; walletCoinsReceived: number; error?: string }> {
  return {
    success: false,
    walletCoinsReceived: 0,
    error: 'Host Diamonds are strictly for earnings withdrawal (100,000 Diamonds = PKR 2,600) and cannot be used to purchase gifts.',
  };
}

/**
 * Helper: Look up whether host is actively linked to a Host Agency (for transparent Agency Commission waterfall)
 */
export async function lookupActiveHostAgencyContract(hostUid: string): Promise<{
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  dealCommissionPercent: number | null;
} | null> {
  try {
    const q = query(
      collection(db, 'agency_host_requests'),
      where('hostUid', '==', hostUid),
      where('status', '==', 'accepted'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const data = snap.docs[0].data();
    const agencyId = String(data.agencyId || '');
    if (!agencyId) return null;

    // Check if Admin configured an agency-specific commission override
    let overridePct: number | null =
      typeof data.dealCommissionPercent === 'number' && Number.isFinite(data.dealCommissionPercent)
        ? data.dealCommissionPercent
        : null;
    try {
      const finSnap = await getDoc(doc(db, 'agency_financial_records', agencyId));
      if (finSnap.exists() && typeof finSnap.data().commissionPercentOverride === 'number') {
        overridePct = Number(finSnap.data().commissionPercentOverride);
      }
    } catch {
      // non-fatal
    }

    return {
      agencyId,
      agencyName: String(data.agencyName || 'Host Agency'),
      agencyOwnerUid: String(data.agencyOwnerUid || ''),
      dealCommissionPercent: overridePct,
    };
  } catch {
    return null;
  }
}

/**
 * 8. PRODUCTION ATOMIC DIAMOND WITHDRAWAL REQUEST
 *    Official Rate: 100,000 Diamonds = PKR 2,600 (1 Diamond = PKR 0.026)
 *    - Verifies identity, min/max limits, and available Diamond balance.
 *    - Applies independently configured Agency Commission (ONLY if host has active agency) and Processing Fee (never deducted twice).
 *    - Reserves Diamonds atomically into `pendingWithdrawalCoins`.
 *    - Writes `withdrawal_requests/{reqId}` + `users/{uid}/withdrawals/{reqId}` + `earnings_transactions` + `users/{uid}/diamond_transactions`.
 */
export async function requestWithdrawal(
  userId: string,
  userName: string,
  coinsRequested: number,
  paymentMethod: 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'cash_pickup',
  paymentDetails: {
    accountTitle: string;
    accountNumber: string;
    bankOrProviderName: string;
    phoneNumber?: string;
    cnicOrId?: string;
    city?: string;
  },
  settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; requestId: string; finalPayablePkr: number; error?: string }> {
  try {
    const authUid = auth.currentUser?.uid;
    if (!authUid || authUid !== userId) {
      return { success: false, requestId: '', finalPayablePkr: 0, error: 'Authentication required to submit withdrawal.' };
    }

    const diamondsReq = Math.floor(Number(coinsRequested || 0));
    const economyCfg = walletSettingsToEconomyConfig(settings);

    if (diamondsReq < economyCfg.minWithdrawalDiamonds) {
      const minPkr = roundPkr(economyCfg.minWithdrawalDiamonds * economyCfg.diamondWithdrawalPkrPerDiamond);
      return {
        success: false,
        requestId: '',
        finalPayablePkr: 0,
        error: `Minimum withdrawal limit is ${economyCfg.minWithdrawalDiamonds.toLocaleString()} Diamonds (PKR ${minPkr.toLocaleString()}).`,
      };
    }
    if (diamondsReq > economyCfg.maxWithdrawalDiamonds) {
      return {
        success: false,
        requestId: '',
        finalPayablePkr: 0,
        error: `Maximum withdrawal limit is ${economyCfg.maxWithdrawalDiamonds.toLocaleString()} Diamonds per transaction.`,
      };
    }

    const activeAgency = await lookupActiveHostAgencyContract(userId);
    const idempotencyKey = generateIdempotencyId(`wd_${userId.slice(0, 6)}`);

    let waterfall = calculateWithdrawalWaterfall(diamondsReq, economyCfg, {
      hostHasActiveAgency: Boolean(activeAgency),
      agencyCommissionOverridePercent: activeAgency?.dealCommissionPercent ?? null,
    });

    // Authoritative server-side withdrawal calculation
    try {
      const headers = await getBearerAuthHeaders();
      const resp = await fetch(apiUrl('/api/finance/quote-withdrawal'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          diamondsRequested: diamondsReq,
          hostHasActiveAgency: Boolean(activeAgency),
          agencyCommissionOverridePercent: activeAgency?.dealCommissionPercent ?? null,
          idempotencyKey,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.success && data?.quote) {
          waterfall = {
            diamondsRequested: Number(data.quote.diamondsRequested),
            diamondRatePkr: Number(data.quote.diamondRatePkr),
            grossAmountPkr: Number(data.quote.grossAmountPkr),
            agencyCommissionPercent: Number(data.quote.agencyCommissionPercent),
            agencyCommissionPkr: Number(data.quote.agencyCommissionPkr),
            processingFeePercent: Number(data.quote.processingFeePercent),
            processingFeePkr: Number(data.quote.processingFeePkr),
            totalDeductionsPkr: Number(data.quote.totalDeductionsPkr),
            netPayablePkr: Number(data.quote.netPayablePkr),
            configVersion: Number(data.quote.configVersion || economyCfg.configVersion),
          };
        }
      }
    } catch {
      // Fallback to identical shared engine
    }

    const nowMillis = Date.now();
    const nowDisplay = new Date(nowMillis).toLocaleString();
    const earningsRef = doc(db, 'earnings', userId);
    const userRef = doc(db, 'users', userId);
    const reqDocRef = doc(db, 'withdrawal_requests', idempotencyKey);
    const userWithdrawRef = doc(db, 'users', userId, 'withdrawals', idempotencyKey);

    await runTransaction(db, async (tx) => {
      const earningsSnap = await tx.get(earningsRef);
      const userSnap = await tx.get(userRef);
      const available = earningsSnap.exists() ? Number(earningsSnap.data().availableEarningsCoins || 0) : 0;
      const pending = earningsSnap.exists() ? Number(earningsSnap.data().pendingWithdrawalCoins || 0) : 0;

      if (available < diamondsReq) {
        throw new Error(`Insufficient available Diamonds. Available: ${available.toLocaleString()} Diamonds.`);
      }

      const newAvailable = available - diamondsReq;
      const newPending = pending + diamondsReq;

      tx.set(
        earningsRef,
        {
          userId,
          availableEarningsCoins: newAvailable,
          pendingWithdrawalCoins: newPending,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      tx.set(userRef, { diamonds: newAvailable }, { merge: true });

      const userDisplayId = userSnap.exists() ? String(userSnap.data().displayId || '') : '';
      const reqData: WithdrawalRequest = {
        id: idempotencyKey,
        userId,
        userName,
        userEmail: auth.currentUser?.email || '',
        userDisplayId,
        coinsRequested: diamondsReq,
        exchangeRatePkr: waterfall.diamondRatePkr,
        grossAmountPkr: waterfall.grossAmountPkr,
        agencyCommissionPercent: waterfall.agencyCommissionPercent,
        agencyCommissionPkr: waterfall.agencyCommissionPkr,
        processingFeePercent: waterfall.processingFeePercent,
        feeAmountPkr: waterfall.processingFeePkr,
        finalPayablePkr: waterfall.netPayablePkr,
        ...(activeAgency
          ? {
              agencyId: activeAgency.agencyId,
              agencyName: activeAgency.agencyName,
              agencyOwnerUid: activeAgency.agencyOwnerUid,
            }
          : {}),
        paymentMethod,
        paymentDetails,
        status: 'pending',
        idempotencyKey,
        configVersion: waterfall.configVersion,
        requestedAt: nowDisplay,
        requestedAtMillis: nowMillis,
        updatedAt: nowDisplay,
      };

      tx.set(reqDocRef, reqData);
      tx.set(userWithdrawRef, reqData);

      const txId = `${idempotencyKey}_req`;
      const txPayload = {
        id: txId,
        userId,
        category: 'withdrawal_request',
        balanceType: 'earnings',
        amount: -diamondsReq,
        pkrAmount: waterfall.netPayablePkr,
        status: 'pending',
        description: `Withdrawal #${idempotencyKey.slice(-6).toUpperCase()}: ${diamondsReq.toLocaleString()} Diamonds -> Net PKR ${waterfall.netPayablePkr.toLocaleString()} via ${paymentDetails.bankOrProviderName}`,
        timestamp: nowDisplay,
        timestampMillis: nowMillis,
        referenceId: idempotencyKey,
        idempotencyKey,
        configVersion: waterfall.configVersion,
      };
      tx.set(doc(db, 'earnings_transactions', txId), txPayload);
      tx.set(doc(db, 'users', userId, 'diamond_transactions', txId), txPayload);
    });

    return { success: true, requestId: idempotencyKey, finalPayablePkr: waterfall.netPayablePkr };
  } catch (err: any) {
    return { success: false, requestId: '', finalPayablePkr: 0, error: err?.message || 'Withdrawal submission failed.' };
  }
}

/**
 * 9. PRODUCTION ADMIN WITHDRAWAL LIFECYCLE MANAGEMENT
 *    Supports all 7 statuses: pending | under_review | approved | processing | paid | rejected | cancelled.
 *    - Enforces strict terminal-state lock inside `runTransaction` so a withdrawal can NEVER be paid twice or double-refunded!
 *    - Records `agency_commissions` + `agency_financial_records` on `paid` if linked to a Host Agency.
 *    - Updates `platform_revenue/global` payout totals & writes immutable `financial_audit_logs`.
 */
export async function adminUpdateWithdrawalStatus(
  request: WithdrawalRequest,
  newStatus: WithdrawalStatus,
  adminRemarks: string = '',
  paymentReference: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) {
      return { success: false, error: 'Unauthorized: Admin verification required.' };
    }

    const adminUid = auth.currentUser?.uid || '';
    const adminEmail = auth.currentUser?.email || '';
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const nowDisplay = new Date(nowMillis).toLocaleString();

    const reqRef = doc(db, 'withdrawal_requests', request.id);
    const userWithdrawRef = doc(db, 'users', request.userId, 'withdrawals', request.id);
    const earningsRef = doc(db, 'earnings', request.userId);
    const userRef = doc(db, 'users', request.userId);
    const platformRevenueRef = doc(db, 'platform_revenue', 'global');

    await runTransaction(db, async (tx) => {
      const liveReqSnap = await tx.get(reqRef);
      if (!liveReqSnap.exists()) {
        throw new Error('Withdrawal request no longer exists.');
      }
      const liveReq = liveReqSnap.data() as WithdrawalRequest;

      // Double-payout & double-refund prevention
      if (TERMINAL_WITHDRAWAL_STATUSES.has(liveReq.status)) {
        throw new Error(
          `Withdrawal #${request.id.slice(-6).toUpperCase()} is already finalized as "${liveReq.status.toUpperCase()}" and cannot be processed twice.`
        );
      }
      if (liveReq.status === newStatus) {
        throw new Error(`Withdrawal is already in "${newStatus}" status.`);
      }

      const earningsSnap = await tx.get(earningsRef);
      const pending = earningsSnap.exists() ? Number(earningsSnap.data().pendingWithdrawalCoins || 0) : 0;
      const available = earningsSnap.exists() ? Number(earningsSnap.data().availableEarningsCoins || 0) : 0;
      const totalWithdrawn = earningsSnap.exists() ? Number(earningsSnap.data().totalWithdrawnCoins || 0) : 0;

      const userWithdrawSnap = await tx.get(userWithdrawRef);

      let agencyFinSnap: any = null;
      const agencyFinRef = liveReq.agencyId ? doc(db, 'agency_financial_records', liveReq.agencyId) : null;
      if (newStatus === 'paid' && agencyFinRef) {
        agencyFinSnap = await tx.get(agencyFinRef);
      }

      const resolvedRef = paymentReference.trim() || liveReq.paymentReference || `LP-PAY-${nowMillis.toString().slice(-8)}`;

      if (newStatus === 'paid') {
        const newPending = Math.max(0, pending - liveReq.coinsRequested);
        const newTotalWithdrawn = totalWithdrawn + liveReq.coinsRequested;

        tx.set(
          earningsRef,
          {
            userId: liveReq.userId,
            pendingWithdrawalCoins: newPending,
            totalWithdrawnCoins: newTotalWithdrawn,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const reqPatch = {
          status: 'paid' as WithdrawalStatus,
          adminRemarks: adminRemarks.trim() || 'Payout completed successfully.',
          paymentReference: resolvedRef,
          paidAt: nowIso,
          processedByAdmin: adminEmail,
          updatedAt: nowDisplay,
        };
        tx.update(reqRef, reqPatch);
        if (userWithdrawSnap.exists()) {
          tx.update(userWithdrawRef, reqPatch);
        }

        // Track platform payout totals
        const agencyCommPkr = Number(liveReq.agencyCommissionPkr || 0);
        tx.set(
          platformRevenueRef,
          {
            id: 'global',
            totalWithdrawalsPaidPkr: increment(Number(liveReq.finalPayablePkr || 0)),
            totalDiamondsWithdrawn: increment(Number(liveReq.coinsRequested || 0)),
            totalAgencyCommissionPkr: increment(agencyCommPkr),
            updatedAt: nowIso,
          },
          { merge: true }
        );

        // Payment completion transaction record
        const payTxId = `${liveReq.id}_paid`;
        const payTxPayload = {
          id: payTxId,
          userId: liveReq.userId,
          category: 'withdrawal_payment',
          balanceType: 'earnings',
          amount: 0,
          pkrAmount: liveReq.finalPayablePkr,
          status: 'completed',
          description: `Payout PAID #${liveReq.id.slice(-6).toUpperCase()} — PKR ${liveReq.finalPayablePkr.toLocaleString()} (Ref: ${resolvedRef})`,
          timestamp: nowDisplay,
          timestampMillis: nowMillis,
          referenceId: liveReq.id,
        };
        tx.set(doc(db, 'earnings_transactions', payTxId), payTxPayload);
        tx.set(doc(db, 'users', liveReq.userId, 'diamond_transactions', payTxId), payTxPayload);

        // Agency Commission accounting record (ONLY if host has active agency & commission > 0)
        if (liveReq.agencyId && liveReq.agencyOwnerUid && agencyCommPkr > 0) {
          const commId = `agcomm_${liveReq.id}`;
          tx.set(doc(db, 'agency_commissions', commId), {
            id: commId,
            agencyId: liveReq.agencyId,
            agencyName: liveReq.agencyName || 'Host Agency',
            agencyOwnerUid: liveReq.agencyOwnerUid,
            hostUid: liveReq.userId,
            hostName: liveReq.userName,
            withdrawalId: liveReq.id,
            diamondsWithdrawn: liveReq.coinsRequested,
            hostGrossPkr: liveReq.grossAmountPkr,
            commissionPercent: Number(liveReq.agencyCommissionPercent || 0),
            commissionPkr: agencyCommPkr,
            status: 'accrued',
            createdAt: nowIso,
            createdAtMillis: nowMillis,
          });

          if (agencyFinRef) {
            const prevEarned = agencyFinSnap?.exists() ? Number(agencyFinSnap.data().totalCommissionEarnedPkr || 0) : 0;
            const prevPendingComm = agencyFinSnap?.exists() ? Number(agencyFinSnap.data().pendingCommissionPkr || 0) : 0;
            const prevHostWdPkr = agencyFinSnap?.exists() ? Number(agencyFinSnap.data().totalHostWithdrawalsPkr || 0) : 0;
            const prevHostDia = agencyFinSnap?.exists() ? Number(agencyFinSnap.data().totalHostDiamondsEarned || 0) : 0;
            tx.set(
              agencyFinRef,
              {
                id: liveReq.agencyId,
                agencyId: liveReq.agencyId,
                agencyName: liveReq.agencyName || 'Host Agency',
                agencyOwnerUid: liveReq.agencyOwnerUid,
                totalHostDiamondsEarned: prevHostDia + liveReq.coinsRequested,
                totalHostWithdrawalsPkr: roundPkr(prevHostWdPkr + liveReq.grossAmountPkr),
                totalCommissionEarnedPkr: roundPkr(prevEarned + agencyCommPkr),
                pendingCommissionPkr: roundPkr(prevPendingComm + agencyCommPkr),
                updatedAt: nowIso,
              },
              { merge: true }
            );
          }
        }
      } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
        // Atomically return reserved Diamonds to Host's available Diamond Earnings Wallet
        const newPending = Math.max(0, pending - liveReq.coinsRequested);
        const newAvailable = available + liveReq.coinsRequested;

        tx.set(
          earningsRef,
          {
            userId: liveReq.userId,
            pendingWithdrawalCoins: newPending,
            availableEarningsCoins: newAvailable,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        tx.set(userRef, { diamonds: newAvailable }, { merge: true });

        const reqPatch = {
          status: newStatus,
          adminRemarks: adminRemarks.trim() || `Request ${newStatus}. Diamonds returned to your Earnings Wallet.`,
          processedByAdmin: adminEmail,
          updatedAt: nowDisplay,
        };
        tx.update(reqRef, reqPatch);
        if (userWithdrawSnap.exists()) {
          tx.update(userWithdrawRef, reqPatch);
        }

        const refundTxId = `${liveReq.id}_refund`;
        const refundPayload = {
          id: refundTxId,
          userId: liveReq.userId,
          category: 'withdrawal_refund',
          balanceType: 'earnings',
          amount: liveReq.coinsRequested,
          pkrAmount: liveReq.finalPayablePkr,
          status: 'completed',
          description: `Withdrawal #${liveReq.id.slice(-6).toUpperCase()} ${newStatus}: +${liveReq.coinsRequested.toLocaleString()} Diamonds restored`,
          timestamp: nowDisplay,
          timestampMillis: nowMillis,
          referenceId: liveReq.id,
        };
        tx.set(doc(db, 'earnings_transactions', refundTxId), refundPayload);
        tx.set(doc(db, 'users', liveReq.userId, 'diamond_transactions', refundTxId), refundPayload);
      } else {
        // 'pending' | 'under_review' | 'approved' | 'processing'
        const reqPatch = {
          status: newStatus,
          adminRemarks: adminRemarks.trim() || liveReq.adminRemarks || '',
          paymentReference: paymentReference.trim() || liveReq.paymentReference || '',
          processedByAdmin: adminEmail,
          updatedAt: nowDisplay,
        };
        tx.update(reqRef, reqPatch);
        if (userWithdrawSnap.exists()) {
          tx.update(userWithdrawRef, reqPatch);
        }
      }

      // Immutable Financial Audit Log
      const auditId = generateIdempotencyId('faudit_wd');
      tx.set(doc(db, 'financial_audit_logs', auditId), {
        id: auditId,
        adminUid,
        adminEmail,
        action: 'withdrawal_status_change',
        targetId: liveReq.id,
        targetLabel: `${liveReq.userName} (${liveReq.coinsRequested.toLocaleString()} 💎 -> PKR ${liveReq.finalPayablePkr.toLocaleString()})`,
        previousValue: { status: liveReq.status },
        newValue: { status: newStatus, paymentReference: resolvedRef },
        reason: adminRemarks.trim() || `Updated withdrawal status to ${newStatus}`,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update withdrawal status.' };
  }
}

/**
 * 10. REAL-TIME TRANSACTIONS & USER WITHDRAWALS LISTENERS
 */
export function subscribeTransactions(
  userId: string,
  balanceType: 'wallet' | 'earnings',
  onUpdate: (transactions: FinancialTransaction[]) => void
) {
  const collName = balanceType === 'wallet' ? 'wallet_transactions' : 'earnings_transactions';
  const q = query(
    collection(db, collName),
    where('userId', '==', userId),
    orderBy('timestampMillis', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialTransaction));
      onUpdate(items);
    },
    (err) => {
      console.warn(`Transactions (${balanceType}) listener notice:`, err);
    }
  );
}

export function subscribeUserWithdrawalRequests(
  userId: string,
  onUpdate: (requests: WithdrawalRequest[]) => void
) {
  const q = query(
    collection(db, 'withdrawal_requests'),
    where('userId', '==', userId),
    orderBy('requestedAtMillis', 'desc'),
    limit(50)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithdrawalRequest));
      onUpdate(items);
    },
    (err) => {
      console.warn('User withdrawal requests listener notice:', err);
    }
  );
}

/**
 * 11. ADMIN ALL WITHDRAWAL REQUESTS LISTENER
 */
export function subscribeAllWithdrawalRequests(
  onUpdate: (requests: WithdrawalRequest[]) => void
) {
  const q = query(collection(db, 'withdrawal_requests'), orderBy('requestedAtMillis', 'desc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithdrawalRequest));
      onUpdate(items);
    },
    (err) => {
      console.warn('Admin withdrawal requests listener notice:', err);
    }
  );
}

/**
 * 12. ADMIN BALANCE ADJUSTMENT WITH IMMUTABLE AUDIT TRAIL
 */
export async function adminAdjustBalance(
  targetUserId: string,
  balanceType: 'wallet' | 'earnings',
  coinDelta: number,
  reason: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isVerifiedAdminSession()) {
      return { success: false, error: 'Unauthorized: Verified admin required.' };
    }
    const adminUid = auth.currentUser?.uid || '';
    const nowMillis = Date.now();
    const nowIso = new Date(nowMillis).toISOString();
    const nowDisplay = new Date(nowMillis).toLocaleString();
    const docRef = doc(db, balanceType === 'wallet' ? 'wallets' : 'earnings', targetUserId);
    const userRef = doc(db, 'users', targetUserId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (balanceType === 'wallet') {
        const current = snap.exists() ? Number(snap.data().walletPurchasedCoins || 0) : 0;
        const prevPurchased = snap.exists() ? Number(snap.data().totalCoinsPurchased || 0) : 0;
        const next = Math.max(0, current + coinDelta);
        tx.set(
          docRef,
          {
            userId: targetUserId,
            walletPurchasedCoins: next,
            totalCoinsPurchased: coinDelta > 0 ? prevPurchased + coinDelta : prevPurchased,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        tx.set(userRef, { coins: next }, { merge: true });

        const txId = generateIdempotencyId('adj_coin');
        const payload = {
          id: txId,
          userId: targetUserId,
          category: 'admin_adjustment',
          balanceType: 'wallet',
          amount: coinDelta,
          status: 'completed',
          description: `Admin Adjustment (${adminEmail}): ${reason}`,
          timestamp: nowDisplay,
          timestampMillis: nowMillis,
        };
        tx.set(doc(db, 'wallet_transactions', txId), payload);
        tx.set(doc(db, 'users', targetUserId, 'coin_transactions', txId), payload);

        const auditId = generateIdempotencyId('faudit_adj');
        tx.set(doc(db, 'financial_audit_logs', auditId), {
          id: auditId,
          adminUid,
          adminEmail,
          action: 'balance_adjustment',
          targetId: targetUserId,
          targetLabel: `Coin Wallet (${coinDelta >= 0 ? '+' : ''}${coinDelta.toLocaleString()} Coins)`,
          previousValue: { walletPurchasedCoins: current },
          newValue: { walletPurchasedCoins: next },
          reason: reason || 'Admin manual adjustment',
          createdAt: nowIso,
          createdAtMillis: nowMillis,
        });
      } else {
        const current = snap.exists() ? Number(snap.data().availableEarningsCoins || 0) : 0;
        const next = Math.max(0, current + coinDelta);
        tx.set(
          docRef,
          { userId: targetUserId, availableEarningsCoins: next, updatedAt: serverTimestamp() },
          { merge: true }
        );
        tx.set(userRef, { diamonds: next }, { merge: true });

        const txId = generateIdempotencyId('adj_dia');
        const payload = {
          id: txId,
          userId: targetUserId,
          category: 'admin_adjustment',
          balanceType: 'earnings',
          amount: coinDelta,
          status: 'completed',
          description: `Admin Adjustment (${adminEmail}): ${reason}`,
          timestamp: nowDisplay,
          timestampMillis: nowMillis,
        };
        tx.set(doc(db, 'earnings_transactions', txId), payload);
        tx.set(doc(db, 'users', targetUserId, 'diamond_transactions', txId), payload);

        const auditId = generateIdempotencyId('faudit_adj');
        tx.set(doc(db, 'financial_audit_logs', auditId), {
          id: auditId,
          adminUid,
          adminEmail,
          action: 'balance_adjustment',
          targetId: targetUserId,
          targetLabel: `Diamond Earnings (${coinDelta >= 0 ? '+' : ''}${coinDelta.toLocaleString()} 💎)`,
          previousValue: { availableEarningsCoins: current },
          newValue: { availableEarningsCoins: next },
          reason: reason || 'Admin manual adjustment',
          createdAt: nowIso,
          createdAtMillis: nowMillis,
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Admin adjustment failed' };
  }
}
