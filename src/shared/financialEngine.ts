/**
 * LENZO PARTY — PRODUCTION FINANCIAL ENGINE (SHARED SINGLE SOURCE OF TRUTH)
 *
 * Used identically by:
 *   - Backend API (`server.ts` — authoritative quote, validation & QA verification)
 *   - Client Firestore Services (`walletService.ts`, `financialService.ts`)
 *   - Admin Economy Settings & Financial Analytics (`AdminFinanceTab.tsx`)
 *   - User Wallet & Withdrawal UI (`WalletModal.tsx`)
 *
 * OFFICIAL FINAL RATES:
 *   - Coin Purchase Rate:      100,000 Coins    = PKR 3,000 (1 Coin = PKR 0.03)
 *   - Gifting Split:           40% App Beans    / 60% Host Diamonds (Sum = 100%)
 *   - Diamond Conversion:      100,000 gifted Coins -> 60,000 Host Diamonds + 40,000 App Beans
 *   - Diamond Withdrawal Rate: 100,000 Diamonds = PKR 2,600 (1 Diamond = PKR 0.026)
 */

export const OFFICIAL_POLICY_VERSION = 'v3_official_economy';

export interface PlatformEconomyConfig {
  configVersion: number;
  policyVersion: string;
  // Coin Purchase Rate
  coinPurchasePkrPer100k: number;       // 3000 PKR per 100,000 Coins
  coinPurchasePkrPerCoin: number;       // 0.03 PKR per Coin
  coinsPerPkr: number;                  // 33.333333 Coins per PKR
  // Gifting Distribution (Must always total 100%)
  appSharePercent: number;              // 40%
  hostSharePercent: number;             // 60%
  // Diamond Conversion
  diamondConversionRatio: number;       // 1.0 (1 host-share coin = 1 Diamond)
  // Diamond Withdrawal Rate
  diamondWithdrawalPkrPer100k: number;  // 2600 PKR per 100,000 Diamonds
  diamondWithdrawalPkrPerDiamond: number; // 0.026 PKR per Diamond
  // Withdrawal Limits (in Diamonds)
  minWithdrawalDiamonds: number;        // 10,000 Diamonds (= PKR 260)
  maxWithdrawalDiamonds: number;        // 10,000,000 Diamonds (= PKR 260,000)
  // Independently configurable deductions (never deducted twice; default 0 so 100k Diamonds = PKR 2,600 net)
  agencyCommissionPercent: number;      // 0% default (configurable 0–30%)
  withdrawalProcessingFeePercent: number; // 0% default (configurable 0–25%)
  // Bonus Coin Rules
  bonusCoinsEnabled: boolean;
  maxBonusCoinPercent: number;          // Up to 25% promotional bonus tracked separately from paid coins
  // Enabled Payout Methods
  enabledPaymentMethods: Array<'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cash_pickup'>;
  // Metadata
  updatedAt?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  lastChangeReason?: string;
}

export const OFFICIAL_ECONOMY_DEFAULTS: PlatformEconomyConfig = {
  configVersion: 3,
  policyVersion: OFFICIAL_POLICY_VERSION,
  coinPurchasePkrPer100k: 3000,
  coinPurchasePkrPerCoin: 0.03,
  coinsPerPkr: 33.333333,
  appSharePercent: 40,
  hostSharePercent: 60,
  diamondConversionRatio: 1.0,
  diamondWithdrawalPkrPer100k: 2600,
  diamondWithdrawalPkrPerDiamond: 0.026,
  minWithdrawalDiamonds: 10000,
  maxWithdrawalDiamonds: 10000000,
  agencyCommissionPercent: 0,
  withdrawalProcessingFeePercent: 0,
  bonusCoinsEnabled: true,
  maxBonusCoinPercent: 25,
  enabledPaymentMethods: ['bank_transfer', 'easypaisa', 'jazzcash'],
};

export interface OfficialCoinPackageSeed {
  id: string;
  coins: number;         // Paid coins (billed at PKR 3,000 / 100,000 Coins)
  bonusCoins: number;    // Promotional bonus coins tracked separately for accounting/refunds
  pricePkr: number;
  displayPrice: string;
  isPopular?: boolean;
  isPromotional?: boolean;
  promoLabel?: string;
  badge?: string;
  visibility?: 'public' | 'vip_only' | 'hidden';
  enabled: boolean;
  purchaseCount?: number;
  totalRevenuePkr?: number;
}

// Official Coin Packages strictly aligned to 100,000 Coins = PKR 3,000 (1 Coin = PKR 0.03)
export const OFFICIAL_DEFAULT_COIN_PACKAGES: OfficialCoinPackageSeed[] = [
  {
    id: 'pack_10000',
    coins: 10000,
    bonusCoins: 0,
    pricePkr: 300,
    displayPrice: 'PKR 300',
    badge: 'STARTER',
    visibility: 'public',
    enabled: true,
  },
  {
    id: 'pack_50000',
    coins: 50000,
    bonusCoins: 0,
    pricePkr: 1500,
    displayPrice: 'PKR 1,500',
    badge: 'POPULAR',
    isPopular: true,
    visibility: 'public',
    enabled: true,
  },
  {
    id: 'pack_100000',
    coins: 100000,
    bonusCoins: 0,
    pricePkr: 3000,
    displayPrice: 'PKR 3,000',
    badge: 'OFFICIAL 100K',
    isPopular: true,
    visibility: 'public',
    enabled: true,
  },
  {
    id: 'pack_250000',
    coins: 250000,
    bonusCoins: 5000,
    pricePkr: 7500,
    displayPrice: 'PKR 7,500',
    badge: '+5K BONUS',
    isPromotional: true,
    promoLabel: 'Tracked Bonus',
    visibility: 'public',
    enabled: true,
  },
  {
    id: 'pack_500000',
    coins: 500000,
    bonusCoins: 15000,
    pricePkr: 15000,
    displayPrice: 'PKR 15,000',
    badge: '+15K BONUS',
    isPromotional: true,
    promoLabel: 'Tracked Bonus',
    visibility: 'public',
    enabled: true,
  },
  {
    id: 'pack_1000000',
    coins: 1000000,
    bonusCoins: 50000,
    pricePkr: 30000,
    displayPrice: 'PKR 30,000',
    badge: 'VIP 1M',
    isPromotional: true,
    promoLabel: 'VIP Pack',
    visibility: 'public',
    enabled: true,
  },
];

// Authoritative Gift Catalog for backend price verification (prevents client price tampering)
export const OFFICIAL_GIFT_CATALOG: Record<string, { id: string; name: string; coins: number; icon: string }> = {
  gift_rose: { id: 'gift_rose', name: 'Rose', coins: 5, icon: '🌹' },
  gift_heart: { id: 'gift_heart', name: 'Heart', coins: 10, icon: '💖' },
  gift_crown: { id: 'gift_crown', name: 'Crown', coins: 20, icon: '👑' },
  gift_teddy: { id: 'gift_teddy', name: 'Teddy Bear', coins: 30, icon: '🧸' },
  gift_yacht: { id: 'gift_yacht', name: 'Yacht', coins: 50, icon: '🛥️' },
  gift_diamond: { id: 'gift_diamond', name: 'Diamond', coins: 100, icon: '💎' },
  gift_rocket: { id: 'gift_rocket', name: 'Rocket', coins: 200, icon: '🚀' },
  gift_castle: { id: 'gift_castle', name: 'Castle', coins: 500, icon: '🏰' },
  gift_car: { id: 'gift_car', name: 'Sports Car', coins: 1000, icon: '🏎️' },
  gift_dragon: { id: 'gift_dragon', name: 'Dragon', coins: 10000, icon: '🐉' },
  gift_love: { id: 'gift_love', name: 'Love', coins: 20000, icon: '💖' },
  gift_fireworks: { id: 'gift_fireworks', name: 'Fireworks', coins: 50000, icon: '🎆' },
  gift_galaxy: { id: 'gift_galaxy', name: 'Galaxy', coins: 80000, icon: '🌌' },
  gift_sports_car: { id: 'gift_sports_car', name: 'Supercar', coins: 100000, icon: '🚀' },
};

export function roundPkr(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getDayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

export function getMonthKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 7); // YYYY-MM (UTC)
}

export function normalizeEconomyConfig(raw?: Partial<PlatformEconomyConfig> | null): PlatformEconomyConfig {
  const base = { ...OFFICIAL_ECONOMY_DEFAULTS, ...(raw || {}) };
  const coinPurchasePkrPer100k =
    Number.isFinite(Number(base.coinPurchasePkrPer100k)) && Number(base.coinPurchasePkrPer100k) > 0
      ? Number(base.coinPurchasePkrPer100k)
      : OFFICIAL_ECONOMY_DEFAULTS.coinPurchasePkrPer100k;
  const coinPurchasePkrPerCoin = Number((coinPurchasePkrPer100k / 100000).toFixed(6));
  const coinsPerPkr = Number((100000 / coinPurchasePkrPer100k).toFixed(6));

  const diamondWithdrawalPkrPer100k =
    Number.isFinite(Number(base.diamondWithdrawalPkrPer100k)) && Number(base.diamondWithdrawalPkrPer100k) > 0
      ? Number(base.diamondWithdrawalPkrPer100k)
      : OFFICIAL_ECONOMY_DEFAULTS.diamondWithdrawalPkrPer100k;
  const diamondWithdrawalPkrPerDiamond = Number((diamondWithdrawalPkrPer100k / 100000).toFixed(6));

  const appSharePercent = Number.isFinite(Number(base.appSharePercent))
    ? Number(base.appSharePercent)
    : OFFICIAL_ECONOMY_DEFAULTS.appSharePercent;
  const hostSharePercent = Number.isFinite(Number(base.hostSharePercent))
    ? Number(base.hostSharePercent)
    : 100 - appSharePercent;

  return {
    ...base,
    configVersion: Math.max(3, Math.floor(Number(base.configVersion || 3))),
    policyVersion: OFFICIAL_POLICY_VERSION,
    coinPurchasePkrPer100k,
    coinPurchasePkrPerCoin,
    coinsPerPkr,
    appSharePercent,
    hostSharePercent,
    diamondConversionRatio:
      Number.isFinite(Number(base.diamondConversionRatio)) && Number(base.diamondConversionRatio) > 0
        ? Number(base.diamondConversionRatio)
        : 1.0,
    diamondWithdrawalPkrPer100k,
    diamondWithdrawalPkrPerDiamond,
    minWithdrawalDiamonds: Math.max(100, Math.floor(Number(base.minWithdrawalDiamonds ?? 10000))),
    maxWithdrawalDiamonds: Math.max(1000, Math.floor(Number(base.maxWithdrawalDiamonds ?? 10000000))),
    agencyCommissionPercent: Math.min(50, Math.max(0, Number(base.agencyCommissionPercent ?? 0))),
    withdrawalProcessingFeePercent: Math.min(50, Math.max(0, Number(base.withdrawalProcessingFeePercent ?? 0))),
    bonusCoinsEnabled: base.bonusCoinsEnabled !== false,
    maxBonusCoinPercent: Math.min(100, Math.max(0, Number(base.maxBonusCoinPercent ?? 25))),
    enabledPaymentMethods:
      Array.isArray(base.enabledPaymentMethods) && base.enabledPaymentMethods.length > 0
        ? base.enabledPaymentMethods
        : ['bank_transfer', 'easypaisa', 'jazzcash'],
  };
}

export function validateEconomySettings(
  input: Partial<PlatformEconomyConfig>
): { valid: boolean; error?: string; normalized?: PlatformEconomyConfig } {
  const appShare = Number(input.appSharePercent);
  const hostShare = Number(input.hostSharePercent);
  if (!Number.isFinite(appShare) || !Number.isFinite(hostShare)) {
    return { valid: false, error: 'App Share % and Host Share % must be valid numbers.' };
  }
  if (appShare < 0 || appShare > 100 || hostShare < 0 || hostShare > 100) {
    return { valid: false, error: 'App Share % and Host Share % must each be between 0 and 100.' };
  }
  if (Math.round((appShare + hostShare) * 1000) !== 100000) {
    return {
      valid: false,
      error: `App Share (${appShare}%) + Host Share (${hostShare}%) must equal exactly 100%.`,
    };
  }

  const purchaseRate100k = Number(input.coinPurchasePkrPer100k);
  if (!Number.isFinite(purchaseRate100k) || purchaseRate100k <= 0) {
    return { valid: false, error: 'Coin Purchase Rate (PKR per 100,000 Coins) must be greater than 0.' };
  }

  const withdrawRate100k = Number(input.diamondWithdrawalPkrPer100k);
  if (!Number.isFinite(withdrawRate100k) || withdrawRate100k <= 0) {
    return { valid: false, error: 'Diamond Withdrawal Rate (PKR per 100,000 Diamonds) must be greater than 0.' };
  }

  const convRatio = Number(input.diamondConversionRatio ?? 1.0);
  if (!Number.isFinite(convRatio) || convRatio <= 0 || convRatio > 10) {
    return { valid: false, error: 'Diamond Conversion Ratio must be between 0.01 and 10.' };
  }

  const minW = Math.floor(Number(input.minWithdrawalDiamonds));
  const maxW = Math.floor(Number(input.maxWithdrawalDiamonds));
  if (!Number.isFinite(minW) || minW < 100) {
    return { valid: false, error: 'Minimum withdrawal must be at least 100 Diamonds.' };
  }
  if (!Number.isFinite(maxW) || maxW < minW) {
    return { valid: false, error: 'Maximum withdrawal must be greater than or equal to minimum withdrawal.' };
  }

  const agencyPct = Number(input.agencyCommissionPercent ?? 0);
  if (!Number.isFinite(agencyPct) || agencyPct < 0 || agencyPct > 50) {
    return { valid: false, error: 'Agency Commission % must be between 0% and 50%.' };
  }

  const feePct = Number(input.withdrawalProcessingFeePercent ?? 0);
  if (!Number.isFinite(feePct) || feePct < 0 || feePct > 50) {
    return { valid: false, error: 'Withdrawal Processing Fee % must be between 0% and 50%.' };
  }

  if (agencyPct + feePct >= 100) {
    return { valid: false, error: 'Combined Agency Commission and Processing Fee cannot reach 100%.' };
  }

  return { valid: true, normalized: normalizeEconomyConfig(input) };
}

/**
 * Coin Purchase Calculator
 * Official Rate: 100,000 Coins = PKR 3,000 (1 Coin = PKR 0.03)
 */
export function calculateCoinPurchasePricePkr(
  paidCoins: number,
  config: PlatformEconomyConfig = OFFICIAL_ECONOMY_DEFAULTS
): { paidCoins: number; pricePkr: number; ratePkrPerCoin: number } {
  const safeCoins = Math.max(0, Math.floor(Number(paidCoins || 0)));
  const rate = config.coinPurchasePkrPer100k / 100000;
  const pricePkr = roundPkr(safeCoins * rate);
  return {
    paidCoins: safeCoins,
    pricePkr,
    ratePkrPerCoin: Number(rate.toFixed(6)),
  };
}

export interface GiftSplitCalculation {
  grossCoins: number;
  appSharePercent: number;
  hostSharePercent: number;
  appBeansAmount: number;       // 40% App Beans / Revenue equivalent
  hostShareCoins: number;       // 60% Host share before diamond ratio
  hostDiamondsAmount: number;   // 60% converted into Host Diamonds (60,000 per 100,000 Coins)
  appRevenuePkrEstimate: number; // App share valued at coin purchase rate
  hostGrossPkrValue: number;    // Host Diamonds valued at withdrawal rate (60,000 * 0.026 = PKR 1,560)
  configVersion: number;
}

/**
 * Authoritative Gifting Revenue Split Calculator
 * Official Rule:
 *   - Sender spends:  100% Coins (e.g. 100,000 Coins)
 *   - App receives:   40% Beans/Revenue Ledger (40,000)
 *   - Host receives:  60% Diamonds (60,000 Diamonds -> PKR 1,560 gross withdrawal value)
 *   - App Share + Host Share ALWAYS equals 100%.
 */
export function calculateGiftSplit(
  grossCoinsInput: number,
  config: PlatformEconomyConfig = OFFICIAL_ECONOMY_DEFAULTS
): GiftSplitCalculation {
  const grossCoins = Math.floor(Number(grossCoinsInput || 0));
  if (!Number.isFinite(grossCoins) || grossCoins <= 0) {
    throw new Error('Gift coin amount must be a positive integer.');
  }

  const appSharePercent = config.appSharePercent;
  const hostSharePercent = config.hostSharePercent;
  if (Math.round((appSharePercent + hostSharePercent) * 1000) !== 100000) {
    throw new Error('Invalid financial configuration: App Share + Host Share must equal 100%.');
  }

  const appBeansAmount = Math.round(grossCoins * (appSharePercent / 100));
  const hostShareCoins = grossCoins - appBeansAmount; // Exact conservation: app + host = 100%
  const convRatio = config.diamondConversionRatio || 1.0;
  const hostDiamondsAmount = Math.round(hostShareCoins * convRatio);

  const coinPkrRate = config.coinPurchasePkrPer100k / 100000;
  const diamondPkrRate = config.diamondWithdrawalPkrPer100k / 100000;

  return {
    grossCoins,
    appSharePercent,
    hostSharePercent,
    appBeansAmount,
    hostShareCoins,
    hostDiamondsAmount,
    appRevenuePkrEstimate: roundPkr(appBeansAmount * coinPkrRate),
    hostGrossPkrValue: roundPkr(hostDiamondsAmount * diamondPkrRate),
    configVersion: config.configVersion,
  };
}

export interface WithdrawalWaterfallCalculation {
  diamondsRequested: number;
  diamondRatePkr: number;
  grossAmountPkr: number;
  agencyCommissionPercent: number;
  agencyCommissionPkr: number;
  processingFeePercent: number;
  processingFeePkr: number;
  totalDeductionsPkr: number;
  netPayablePkr: number;
  configVersion: number;
}

/**
 * Authoritative Diamond Withdrawal Waterfall Calculator
 * Official Formula:
 *   Gross Withdrawal = Diamonds × 0.026  (100,000 Diamonds = PKR 2,600)
 *   Agency Commission = Gross × (agencyCommissionPercent / 100)  [ONLY if host belongs to an active Host Agency]
 *   Processing Fee    = Gross × (withdrawalProcessingFeePercent / 100)
 *   Net Payable PKR   = Gross - Agency Commission - Processing Fee
 *
 * Guarantees:
 *   - Agency commission and processing fee are independently configured and NEVER deducted twice.
 *   - When configured fees are 0%, 100,000 Diamonds = PKR 2,600.00 net payable exact.
 */
export function calculateWithdrawalWaterfall(
  diamondsRequestedInput: number,
  config: PlatformEconomyConfig = OFFICIAL_ECONOMY_DEFAULTS,
  options?: {
    hostHasActiveAgency?: boolean;
    agencyCommissionOverridePercent?: number | null;
  }
): WithdrawalWaterfallCalculation {
  const diamondsRequested = Math.floor(Number(diamondsRequestedInput || 0));
  if (!Number.isFinite(diamondsRequested) || diamondsRequested <= 0) {
    throw new Error('Withdrawal Diamonds amount must be a positive integer.');
  }

  const diamondRatePkr = config.diamondWithdrawalPkrPer100k / 100000;
  const grossAmountPkr = roundPkr(diamondsRequested * diamondRatePkr);

  const hasAgency = Boolean(options?.hostHasActiveAgency);
  const rawAgencyPct =
    hasAgency
      ? options?.agencyCommissionOverridePercent !== undefined && options?.agencyCommissionOverridePercent !== null
        ? Number(options.agencyCommissionOverridePercent)
        : Number(config.agencyCommissionPercent || 0)
      : 0;
  const agencyCommissionPercent = Math.min(50, Math.max(0, Number.isFinite(rawAgencyPct) ? rawAgencyPct : 0));

  const rawFeePct = Number(config.withdrawalProcessingFeePercent || 0);
  const processingFeePercent = Math.min(50, Math.max(0, Number.isFinite(rawFeePct) ? rawFeePct : 0));

  const agencyCommissionPkr = roundPkr(grossAmountPkr * (agencyCommissionPercent / 100));
  const processingFeePkr = roundPkr(grossAmountPkr * (processingFeePercent / 100));
  const totalDeductionsPkr = roundPkr(agencyCommissionPkr + processingFeePkr);
  const netPayablePkr = Math.max(0, roundPkr(grossAmountPkr - totalDeductionsPkr));

  return {
    diamondsRequested,
    diamondRatePkr: Number(diamondRatePkr.toFixed(6)),
    grossAmountPkr,
    agencyCommissionPercent,
    agencyCommissionPkr,
    processingFeePercent,
    processingFeePkr,
    totalDeductionsPkr,
    netPayablePkr,
    configVersion: config.configVersion,
  };
}

export interface QaAssertionResult {
  testId: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

/**
 * Production QA Test Suite (Tests A, B, C, D, E)
 * Verifies exact math & guardrails required by the Lenzo Party Financial Specification.
 */
export function runFinancialQaAssertions(): { allPassed: boolean; results: QaAssertionResult[] } {
  const results: QaAssertionResult[] = [];

  // TEST A: Coin Purchase Test (100,000 Coins = PKR 3,000)
  const testA = calculateCoinPurchasePricePkr(100000, OFFICIAL_ECONOMY_DEFAULTS);
  results.push({
    testId: 'TEST_A',
    name: 'Coin Purchase Test (100,000 Coins = PKR 3,000)',
    passed: testA.paidCoins === 100000 && testA.pricePkr === 3000 && testA.ratePkrPerCoin === 0.03,
    expected: '100,000 Coins = PKR 3,000 (0.03/Coin)',
    actual: `${testA.paidCoins.toLocaleString()} Coins = PKR ${testA.pricePkr.toLocaleString()} (${testA.ratePkrPerCoin}/Coin)`,
  });

  // TEST B: Gifting Test (100,000 Coins -> 40,000 App Beans, 60,000 Host Diamonds, PKR 1,560 gross)
  const testB = calculateGiftSplit(100000, OFFICIAL_ECONOMY_DEFAULTS);
  results.push({
    testId: 'TEST_B',
    name: 'Gifting Split Test (100,000 Coins -> 40% App / 60% Host)',
    passed:
      testB.grossCoins === 100000 &&
      testB.appBeansAmount === 40000 &&
      testB.hostDiamondsAmount === 60000 &&
      testB.hostGrossPkrValue === 1560 &&
      testB.appBeansAmount + testB.hostDiamondsAmount === testB.grossCoins,
    expected: 'App=40,000 Beans, Host=60,000 Diamonds, Gross=PKR 1,560',
    actual: `App=${testB.appBeansAmount.toLocaleString()} Beans, Host=${testB.hostDiamondsAmount.toLocaleString()} Diamonds, Gross=PKR ${testB.hostGrossPkrValue.toLocaleString()}`,
  });

  // TEST B2: 50,000 Coins Example
  const testB50k = calculateGiftSplit(50000, OFFICIAL_ECONOMY_DEFAULTS);
  results.push({
    testId: 'TEST_B_50K',
    name: 'Gifting Split 50k Example (50,000 Coins -> 20k App / 30k Host)',
    passed: testB50k.appBeansAmount === 20000 && testB50k.hostDiamondsAmount === 30000,
    expected: 'App=20,000, Host=30,000 Diamonds',
    actual: `App=${testB50k.appBeansAmount.toLocaleString()}, Host=${testB50k.hostDiamondsAmount.toLocaleString()} Diamonds`,
  });

  // TEST C: Withdrawal Test (100,000 Diamonds = PKR 2,600 when fees = 0; also 200k/500k/1M)
  const testC100k = calculateWithdrawalWaterfall(100000, OFFICIAL_ECONOMY_DEFAULTS);
  const testC200k = calculateWithdrawalWaterfall(200000, OFFICIAL_ECONOMY_DEFAULTS);
  const testC500k = calculateWithdrawalWaterfall(500000, OFFICIAL_ECONOMY_DEFAULTS);
  const testC1M = calculateWithdrawalWaterfall(1000000, OFFICIAL_ECONOMY_DEFAULTS);
  results.push({
    testId: 'TEST_C',
    name: 'Withdrawal Test (100k=2,600 | 200k=5,200 | 500k=13,000 | 1M=26,000 PKR)',
    passed:
      testC100k.grossAmountPkr === 2600 &&
      testC100k.netPayablePkr === 2600 &&
      testC200k.netPayablePkr === 5200 &&
      testC500k.netPayablePkr === 13000 &&
      testC1M.netPayablePkr === 26000,
    expected: 'PKR 2,600 / 5,200 / 13,000 / 26,000',
    actual: `PKR ${testC100k.netPayablePkr} / ${testC200k.netPayablePkr} / ${testC500k.netPayablePkr} / ${testC1M.netPayablePkr}`,
  });

  // TEST C2: Agency Commission + Processing Fee Single-Deduction Waterfall
  const testCWaterfall = calculateWithdrawalWaterfall(
    100000,
    { ...OFFICIAL_ECONOMY_DEFAULTS, agencyCommissionPercent: 10, withdrawalProcessingFeePercent: 2 },
    { hostHasActiveAgency: true }
  );
  results.push({
    testId: 'TEST_C_WATERFALL',
    name: 'Agency Commission (10%) + Fee (2%) No Double-Deduction',
    passed:
      testCWaterfall.grossAmountPkr === 2600 &&
      testCWaterfall.agencyCommissionPkr === 260 &&
      testCWaterfall.processingFeePkr === 52 &&
      testCWaterfall.netPayablePkr === 2288,
    expected: 'Gross=2,600, Agency=260, Fee=52, Net=2,288 PKR',
    actual: `Gross=${testCWaterfall.grossAmountPkr}, Agency=${testCWaterfall.agencyCommissionPkr}, Fee=${testCWaterfall.processingFeePkr}, Net=${testCWaterfall.netPayablePkr} PKR`,
  });

  // TEST D: Large Transaction Test (1,000,000 gifted Coins -> 400,000 App / 600,000 Host / PKR 15,600)
  const testD = calculateGiftSplit(1000000, OFFICIAL_ECONOMY_DEFAULTS);
  results.push({
    testId: 'TEST_D',
    name: 'Large Transaction Test (1,000,000 Coins -> 400k App / 600k Diamonds / PKR 15,600)',
    passed:
      testD.appBeansAmount === 400000 &&
      testD.hostDiamondsAmount === 600000 &&
      testD.hostGrossPkrValue === 15600,
    expected: 'App=400,000, Host=600,000 Diamonds, Gross=PKR 15,600',
    actual: `App=${testD.appBeansAmount.toLocaleString()}, Host=${testD.hostDiamondsAmount.toLocaleString()} Diamonds, Gross=PKR ${testD.hostGrossPkrValue.toLocaleString()}`,
  });

  // TEST E: Security & Validation Guards (Split != 100%, negative/zero amounts)
  const invalidSplit = validateEconomySettings({ ...OFFICIAL_ECONOMY_DEFAULTS, appSharePercent: 45, hostSharePercent: 60 });
  let negativeGiftRejected = false;
  try {
    calculateGiftSplit(-500, OFFICIAL_ECONOMY_DEFAULTS);
  } catch {
    negativeGiftRejected = true;
  }
  let zeroWithdrawRejected = false;
  try {
    calculateWithdrawalWaterfall(0, OFFICIAL_ECONOMY_DEFAULTS);
  } catch {
    zeroWithdrawRejected = true;
  }
  results.push({
    testId: 'TEST_E',
    name: 'Security Validation Guards (Invalid Split, Negative Gift, Zero Withdrawal)',
    passed: !invalidSplit.valid && negativeGiftRejected && zeroWithdrawRejected,
    expected: 'All invalid financial inputs rejected',
    actual: `invalidSplit=${!invalidSplit.valid}, negativeGiftRejected=${negativeGiftRejected}, zeroWithdrawRejected=${zeroWithdrawRejected}`,
  });

  return {
    allPassed: results.every((r) => r.passed),
    results,
  };
}
