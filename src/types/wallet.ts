import { PlatformEconomyConfig } from '../shared/financialEngine';

export interface UserWalletData {
  userId: string;
  walletPurchasedCoins: number; // Purchased coins ONLY (used for gifting/store, non-withdrawable)
  bonusCoinsBalance?: number;   // Promotional bonus coins tracked separately for accounting/refunds
  totalCoinsPurchased: number;
  totalBonusCoinsReceived?: number;
  totalCoinsSpent: number;
  totalRefundedCoins?: number;
  updatedAt: string;
}

export interface UserEarningsData {
  userId: string;
  availableEarningsCoins: number; // Available Host Diamonds (60% share of gifted Coins, withdrawable at 100k = PKR 2,600)
  pendingWithdrawalCoins: number; // Diamonds reserved during active withdrawal requests
  totalWithdrawnCoins: number;    // Diamonds successfully paid out
  totalEarnedDiamonds?: number;   // Cumulative lifetime Diamonds earned by host
  dailyEarnedDiamonds?: number;   // Today's earned Diamonds
  monthlyEarnedDiamonds?: number; // Current month's earned Diamonds
  lastEarnedDayKey?: string;      // YYYY-MM-DD UTC
  lastEarnedMonthKey?: string;    // YYYY-MM UTC
  grossGiftCoinsReceived: number; // Total gross gift coins received before 40% app share
  totalCommissionDeducted: number;// Total 40% platform App Beans share
  totalConvertedToWallet: number; // Historical legacy field (kept read-only for backward compatibility)
  totalGiftsCount: number;
  updatedAt: string;
}

export interface WalletSettings {
  // Official Economy Settings (v3)
  configVersion?: number;
  commissionPolicyVersion?: string;
  coinPurchasePkrPer100k?: number;         // default 3000 (100,000 Coins = PKR 3,000)
  coinPurchasePkrPerCoin?: number;         // default 0.03 (1 Coin = PKR 0.03)
  commissionRatePercent: number;           // default 40% (App Share = 40%)
  hostSharePercent?: number;               // default 60% (Host Share = 60%)
  diamondConversionRatio?: number;         // default 1.0 (100k Coins -> 60k Host Diamonds)
  diamondWithdrawalPkrPer100k?: number;    // default 2600 (100,000 Diamonds = PKR 2,600)
  exchangeRatePkrPerCoin: number;          // default 0.026 PKR per Diamond
  minWithdrawalCoins: number;              // default 10,000 Diamonds (= PKR 260)
  maxWithdrawalCoins: number;              // default 10,000,000 Diamonds (= PKR 260,000)
  agencyCommissionPercent?: number;        // default 0% (independently configurable)
  withdrawalFeePercent: number;            // default 0% (independently configurable)
  bonusCoinsEnabled?: boolean;
  maxBonusCoinPercent?: number;
  enabledPaymentMethods?: Array<'bank_transfer' | 'easypaisa' | 'jazzcash' | 'cash_pickup'>;
  earningsToWalletConversionRate: number;  // legacy compatibility field
  updatedAt?: string;
  updatedByEmail?: string;
  lastChangeReason?: string;
}

export type PlatformFinancialSettings = PlatformEconomyConfig;

export interface WalletRechargePackage {
  id: string;
  coins: number;           // Paid coins
  bonusCoins: number;      // Tracked separately from paid coins
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
  updatedAt?: string;
}

export type FinancialTransactionCategory =
  | 'coin_purchase'
  | 'bonus_coins'
  | 'coin_refund'
  | 'gift_sent'
  | 'gift_received'
  | 'application_commission'
  | 'earnings_credit'
  | 'earnings_conversion'
  | 'withdrawal_request'
  | 'withdrawal_payment'
  | 'withdrawal_refund'
  | 'agency_commission'
  | 'admin_adjustment';

export interface FinancialTransaction {
  id: string;
  userId: string;
  category: FinancialTransactionCategory;
  balanceType: 'wallet' | 'earnings' | 'beans';
  amount: number; // positive or negative
  paidCoins?: number;
  bonusCoins?: number;
  pkrAmount?: number;
  status: 'completed' | 'pending' | 'rejected' | 'processing' | 'reversed';
  description: string;
  timestamp: string;
  timestampMillis: number;
  referenceId?: string;
  idempotencyKey?: string;
  configVersion?: number;
  metadata?: Record<string, any>;
}

export type WithdrawalStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userDisplayId?: string;
  coinsRequested: number;          // Diamonds requested
  exchangeRatePkr: number;         // 0.026 PKR per Diamond
  grossAmountPkr: number;          // Diamonds × 0.026
  agencyCommissionPercent?: number;
  agencyCommissionPkr?: number;
  processingFeePercent?: number;
  feeAmountPkr: number;            // Withdrawal processing fee PKR
  finalPayablePkr: number;         // Net payable PKR = Gross - AgencyCommission - ProcessingFee
  agencyId?: string;
  agencyName?: string;
  agencyOwnerUid?: string;
  paymentMethod: 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'cash_pickup';
  paymentDetails: {
    accountTitle: string;
    accountNumber: string; // IBAN or mobile account number
    bankOrProviderName: string;
    phoneNumber?: string;
    cnicOrId?: string;
    city?: string;
  };
  status: WithdrawalStatus;
  idempotencyKey?: string;
  configVersion?: number;
  requestedAt: string;
  requestedAtMillis: number;
  updatedAt: string;
  paidAt?: string;
  processedByAdmin?: string;
  adminRemarks?: string;
  paymentReference?: string; // Bank UTR or Transaction ID
}

export interface PlatformRevenueSummary {
  id: string; // 'global'
  totalBeansEarned: number;             // Total 40% App Beans accumulated
  totalGiftingCoinsProcessed: number;   // Gross gifted coins across entire platform
  totalHostDiamondsIssued: number;      // Total 60% Host Diamonds issued
  totalGiftCount: number;
  totalCoinPurchaseRevenuePkr: number;  // Verified coin purchase PKR
  totalCoinsSoldPaid: number;
  totalBonusCoinsIssued: number;
  totalWithdrawalsPaidPkr: number;
  totalDiamondsWithdrawn: number;
  totalAgencyCommissionPkr: number;
  dailyBeansEarned: number;
  dailyGiftingCoins: number;
  dailyDayKey: string;
  monthlyBeansEarned: number;
  monthlyGiftingCoins: number;
  monthlyMonthKey: string;
  updatedAt: string;
}

export interface PlatformBeansLedgerEntry {
  id: string;
  idempotencyKey: string;
  source: 'gift_split' | 'agency_settlement' | 'reconciliation' | 'admin_adjustment';
  senderId: string;
  senderName?: string;
  receiverId: string;
  receiverName?: string;
  giftId?: string;
  giftName?: string;
  context?: string; // live_stream | party_room | pk_battle | private_room | direct
  grossCoins: number;
  appSharePercent: number;
  hostSharePercent: number;
  beansAmount: number;          // 40% App Share
  hostDiamondsIssued: number;   // 60% Host Share
  estimatedAppRevenuePkr: number;
  hostGrossPkr: number;
  configVersion: number;
  dayKey: string;
  monthKey: string;
  createdAt: string;
  createdAtMillis: number;
}

export interface GiftTransactionRecord {
  id: string;
  idempotencyKey: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  giftId: string;
  giftName: string;
  giftIcon?: string;
  quantity: number;
  unitPriceCoins: number;
  coinAmount: number;
  appSharePercent: number;
  hostSharePercent: number;
  appBeansAmount: number;
  hostDiamondsAmount: number;
  hostGrossPkr: number;
  context?: string;
  roomId?: string;
  configVersion: number;
  status: 'completed';
  createdAt: string;
  createdAtMillis: number;
}

export interface CoinPurchaseRecord {
  id: string;
  idempotencyKey: string;
  userId: string;
  userName: string;
  userDisplayId?: string;
  packageId?: string;
  paidCoins: number;
  bonusCoins: number;
  totalCoinsCredited: number;
  amountPkr: number;
  coinPurchaseRatePkr: number;
  paymentMethod: string;
  paymentReference: string;
  verifiedBy: string; // Admin email or verified Coin Seller Agency code
  status: 'completed' | 'refunded';
  configVersion: number;
  createdAt: string;
  createdAtMillis: number;
}

export interface AgencyCommissionRecord {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  hostUid: string;
  hostName: string;
  withdrawalId: string;
  diamondsWithdrawn: number;
  hostGrossPkr: number;
  commissionPercent: number;
  commissionPkr: number;
  status: 'accrued' | 'paid' | 'reversed';
  paymentReference?: string;
  createdAt: string;
  createdAtMillis: number;
  paidAt?: string;
}

export interface AgencyFinancialRecord {
  id: string; // agencyId
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  commissionPercentOverride?: number | null;
  totalHostDiamondsEarned: number;
  totalHostWithdrawalsPkr: number;
  totalCommissionEarnedPkr: number;
  totalCommissionPaidPkr: number;
  pendingCommissionPkr: number;
  activeHostsCount: number;
  updatedAt: string;
}

export interface FinancialAuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  action:
    | 'economy_settings_update'
    | 'coin_package_save'
    | 'coin_package_delete'
    | 'coin_purchase_verified'
    | 'withdrawal_status_change'
    | 'agency_commission_update'
    | 'agency_commission_payout'
    | 'balance_reconciliation'
    | 'balance_adjustment';
  targetId: string;
  targetLabel: string;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason: string;
  createdAt: string;
  createdAtMillis: number;
}

export interface PayoutMethodConfig {
  id: string;
  name: string;
  type: 'bank_transfer' | 'jazzcash' | 'easypaisa' | 'cash_pickup';
  enabled: boolean;
  instructions: string;
  minAmountCoins: number;
}

export interface CoinSellerAgency {
  id: string;
  name: string;
  ownerName: string;
  agencyCode: string;
  city: string;
  country: string;
  whatsapp: string;
  phone: string;
  paymentMethods: string[];
  workingHours: string;
  minCoinsOrder?: number;
  rateNote?: string;
  badge?: string;
  isVerified: boolean;
  isOnline: boolean;
  enabled: boolean;
  updatedAt?: string;
}
