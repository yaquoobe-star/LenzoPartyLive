export interface UserWalletData {
  userId: string;
  walletPurchasedCoins: number; // Purchased coins ONLY (can only be used for gifting/store, non-withdrawable)
  totalCoinsPurchased: number;
  totalCoinsSpent: number;
  updatedAt: string;
}

export interface UserEarningsData {
  userId: string;
  availableEarningsCoins: number; // Net earnings from gifts received, withdrawable or convertible
  pendingWithdrawalCoins: number; // Reserved during active withdrawal requests
  totalWithdrawnCoins: number;    // Successfully paid out
  grossGiftCoinsReceived: number; // Total raw gift coins received before commission
  totalCommissionDeducted: number;// Total platform commission
  totalConvertedToWallet: number; // Total earnings converted into purchased coins
  totalGiftsCount: number;
  updatedAt: string;
}

export interface WalletSettings {
  commissionRatePercent: number; // default 20%
  exchangeRatePkrPerCoin: number; // default 2 PKR per coin
  minWithdrawalCoins: number;    // default 2,500 coins (= 5,000 PKR)
  maxWithdrawalCoins: number;    // default 250,000 coins (= 500,000 PKR)
  withdrawalFeePercent: number;  // default 2%
  earningsToWalletConversionRate: number; // default 1.0 (1 earned coin = 1 wallet coin)
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
