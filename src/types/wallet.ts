export interface UserWalletData {
  userId: string;
  walletPurchasedCoins: number; // Purchased coins ONLY (can only be used for gifting/store, non-withdrawable)
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  updatedAt: string;
}

export interface UserEarningsData {
  userId: string;
  availableEarningsCoins: number; // Net Diamonds earned from 60% host share of gifts, withdrawable or exchangeable to Coins
  pendingWithdrawalCoins: number; // Diamonds reserved during active withdrawal requests
  totalWithdrawnCoins: number;    // Diamonds successfully paid out
  grossGiftCoinsReceived: number; // Total gross gift coins received before 40% app share
  totalCommissionDeducted: number;// Total 40% platform share
  totalConvertedToWallet: number; // Total Diamonds exchanged into Gifting Wallet Coins
  totalGiftsCount: number;
  updatedAt: string;
}

export interface WalletSettings {
  commissionRatePercent: number; // default 40% (60% Host Diamonds / 40% App)
  exchangeRatePkrPerCoin: number; // default 2 PKR per Diamond
  minWithdrawalCoins: number;    // default 2,500 Diamonds (= 5,000 PKR)
  maxWithdrawalCoins: number;    // default 250,000 Diamonds (= 500,000 PKR)
  withdrawalFeePercent: number;  // default 2%
  earningsToWalletConversionRate: number; // default 1.0 (1 Diamond = 1 Gifting Wallet Coin)
  commissionPolicyVersion?: string;
}

export interface WalletRechargePackage {
  id: string;
  coins: number;
  bonusCoins: number;
  pricePkr: number;
  displayPrice: string;
  isPopular?: boolean;
  badge?: string;
  enabled: boolean;
}

export type FinancialTransactionCategory =
  | 'coin_purchase'
  | 'gift_sent'
  | 'gift_received'
  | 'application_commission'
  | 'earnings_credit'
  | 'earnings_conversion'
  | 'withdrawal_request'
  | 'withdrawal_payment'
  | 'withdrawal_refund'
  | 'admin_adjustment';

export interface FinancialTransaction {
  id: string;
  userId: string;
  category: FinancialTransactionCategory;
  balanceType: 'wallet' | 'earnings';
  amount: number; // positive or negative
  pkrAmount?: number;
  status: 'completed' | 'pending' | 'rejected' | 'processing';
  description: string;
  timestamp: string;
  timestampMillis: number;
  referenceId?: string; // giftId, packageId, withdrawalId
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
  coinsRequested: number;
  exchangeRatePkr: number;
  grossAmountPkr: number;
  feeAmountPkr: number;
  finalPayablePkr: number;
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
  requestedAt: string;
  requestedAtMillis: number;
  updatedAt: string;
  adminRemarks?: string;
  paymentReference?: string; // Bank UTR or Transaction ID
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

