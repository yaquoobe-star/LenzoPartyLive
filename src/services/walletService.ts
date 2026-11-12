import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import {
  UserWalletData,
  UserEarningsData,
  WalletSettings,
  WalletRechargePackage,
  FinancialTransaction,
  WithdrawalRequest,
  PayoutMethodConfig,
  UserProfile,
  GiftItem,
} from '../types';

// Default Global Wallet Settings
export const DEFAULT_WALLET_SETTINGS: WalletSettings = {
  commissionRatePercent: 20, // 20% platform commission on gifts received
  exchangeRatePkrPerCoin: 2.0, // 1 coin = 2 PKR
  minWithdrawalCoins: 2500, // min 2,500 coins (= 5,000 PKR)
  maxWithdrawalCoins: 250000, // max 250,000 coins (= 500,000 PKR)
  withdrawalFeePercent: 2.0, // 2% processing fee
  earningsToWalletConversionRate: 1.0, // 1 earned coin = 1 wallet purchased coin
};

// Default Coin Recharge Packages
export const DEFAULT_COIN_PACKAGES: WalletRechargePackage[] = [
  {
    id: 'pack_1000',
    coins: 1000,
    bonusCoins: 0,
    pricePkr: 2000,
    displayPrice: 'PKR 2,000',
    badge: 'STARTER',
    enabled: true,
  },
  {
    id: 'pack_5000',
    coins: 5000,
    bonusCoins: 250,
    pricePkr: 10000,
    displayPrice: 'PKR 10,000',
    isPopular: true,
    badge: '+5% BONUS',
    enabled: true,
  },
  {
    id: 'pack_10000',
    coins: 10000,
    bonusCoins: 1000,
    pricePkr: 20000,
    displayPrice: 'PKR 20,000',
    isPopular: true,
    badge: '+10% BONUS',
    enabled: true,
  },
  {
    id: 'pack_25000',
    coins: 25000,
    bonusCoins: 3500,
    pricePkr: 50000,
    displayPrice: 'PKR 50,000',
    badge: '+14% BONUS',
    enabled: true,
  },
  {
    id: 'pack_50000',
    coins: 50000,
    bonusCoins: 10000,
    pricePkr: 100000,
    displayPrice: 'PKR 100,000',
    badge: '+20% BONUS',
    enabled: true,
  },
  {
    id: 'pack_100000',
    coins: 100000,
    bonusCoins: 25000,
    pricePkr: 200000,
    displayPrice: 'PKR 200,000',
    badge: 'VIP ELITE',
    enabled: true,
  },
];

// Default Payout Methods
export const DEFAULT_PAYOUT_METHODS: PayoutMethodConfig[] = [
  {
    id: 'bank_transfer',
    name: 'Direct Bank Transfer (1Link / IBFT)',
    type: 'bank_transfer',
    enabled: true,
    instructions: 'Provide your Full Account Title, Bank Name, and 24-digit IBAN (PK...)',
    minAmountCoins: 2500,
  },
  {
    id: 'jazzcash',
    name: 'JazzCash Mobile Wallet',
    type: 'jazzcash',
    enabled: true,
    instructions: 'Provide registered JazzCash 11-digit mobile number and Account Title',
    minAmountCoins: 2500,
  },
  {
    id: 'easypaisa',
    name: 'EasyPaisa Mobile Wallet',
    type: 'easypaisa',
    enabled: true,
    instructions: 'Provide registered EasyPaisa mobile number and CNIC details',
    minAmountCoins: 2500,
  },
  {
    id: 'cash_pickup',
    name: 'Authorized Cash Out Agent',
    type: 'cash_pickup',
    enabled: true,
    instructions: 'Withdraw directly in cash at our verified city merchant partner desks',
    minAmountCoins: 5000,
  },
];

/**
 * 1. SETTINGS & CONFIGURATION SERVICE
 */
export function subscribeWalletSettings(onUpdate: (settings: WalletSettings) => void) {
  const docRef = doc(db, 'wallet_settings', 'global');
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate({ ...DEFAULT_WALLET_SETTINGS, ...snap.data() } as WalletSettings);
      } else {
        // Seed default settings into Firestore
        setDoc(docRef, DEFAULT_WALLET_SETTINGS, { merge: true }).catch((err) =>
          console.warn('Failed to auto-seed wallet settings:', err)
        );
        onUpdate(DEFAULT_WALLET_SETTINGS);
      }
    },
    (err) => {
      console.warn('Wallet settings subscription notice:', err);
      onUpdate(DEFAULT_WALLET_SETTINGS);
    }
  );
}

export async function updateWalletSettings(settings: Partial<WalletSettings>): Promise<void> {
  const docRef = doc(db, 'wallet_settings', 'global');
  try {
    await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, 'wallet_settings/global');
  }
}

/**
 * 2. COIN RECHARGE PACKAGES SERVICE
 */
export function subscribeCoinPackages(onUpdate: (packages: WalletRechargePackage[]) => void) {
  const collRef = collection(db, 'coin_packages');
  return onSnapshot(
    collRef,
    (snap) => {
      if (!snap.empty) {
        const pkgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WalletRechargePackage));
        pkgs.sort((a, b) => a.coins - b.coins);
        onUpdate(pkgs);
      } else {
        // Seed initial packages
        DEFAULT_COIN_PACKAGES.forEach((pkg) => {
          setDoc(doc(db, 'coin_packages', pkg.id), pkg, { merge: true }).catch(console.warn);
        });
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
    await setDoc(docRef, pkg, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `coin_packages/${pkg.id}`);
  }
}

/**
 * 3. REAL USER WALLET (PURCHASED COINS) SERVICE
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
          walletPurchasedCoins: data.walletPurchasedCoins ?? 0,
          totalCoinsPurchased: data.totalCoinsPurchased ?? 0,
          totalCoinsSpent: data.totalCoinsSpent ?? 0,
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        });
      } else {
        const initial: UserWalletData = {
          userId,
          walletPurchasedCoins: 10000, // Initial welcome balance
          totalCoinsPurchased: 10000,
          totalCoinsSpent: 0,
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
 * 4. REAL USER EARNINGS (GIFTS RECEIVED) SERVICE
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
        onUpdate({
          userId,
          availableEarningsCoins: data.availableEarningsCoins ?? 0,
          pendingWithdrawalCoins: data.pendingWithdrawalCoins ?? 0,
          totalWithdrawnCoins: data.totalWithdrawnCoins ?? 0,
          grossGiftCoinsReceived: data.grossGiftCoinsReceived ?? 0,
          totalCommissionDeducted: data.totalCommissionDeducted ?? 0,
          totalConvertedToWallet: data.totalConvertedToWallet ?? 0,
          totalGiftsCount: data.totalGiftsCount ?? 0,
          updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate().toISOString() : new Date().toISOString(),
        });
      } else {
        const initial: UserEarningsData = {
          userId,
          availableEarningsCoins: 4500, // Initial sample earnings
          pendingWithdrawalCoins: 0,
          totalWithdrawnCoins: 0,
          grossGiftCoinsReceived: 5625,
          totalCommissionDeducted: 1125,
          totalConvertedToWallet: 0,
          totalGiftsCount: 6,
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
 * 5. ATOMIC WALLET COIN RECHARGE (PURCHASE)
 */
export async function purchaseCoins(
  userId: string,
  packageId: string,
  settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  try {
    const pkg = DEFAULT_COIN_PACKAGES.find((p) => p.id === packageId) || DEFAULT_COIN_PACKAGES[0];
    const totalCoinsToAdd = pkg.coins + (pkg.bonusCoins || 0);

    const walletRef = doc(db, 'wallets', userId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (tx) => {
      const walletSnap = await tx.get(walletRef);
      const currentPurchased = walletSnap.exists() ? (walletSnap.data().walletPurchasedCoins || 0) : 0;
      const currentTotalPurchased = walletSnap.exists() ? (walletSnap.data().totalCoinsPurchased || 0) : 0;

      const newPurchased = currentPurchased + totalCoinsToAdd;

      tx.set(
        walletRef,
        {
          userId,
          walletPurchasedCoins: newPurchased,
          totalCoinsPurchased: currentTotalPurchased + totalCoinsToAdd,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also update user profile display coins
      tx.set(
        userRef,
        {
          coins: newPurchased,
        },
        { merge: true }
      );

      // Record immutable financial transaction
      const txDocRef = doc(collection(db, 'wallet_transactions'));
      tx.set(txDocRef, {
        id: txDocRef.id,
        userId,
        category: 'coin_purchase',
        balanceType: 'wallet',
        amount: totalCoinsToAdd,
        pkrAmount: pkg.pricePkr,
        status: 'completed',
        description: `Purchased ${pkg.coins.toLocaleString()} Coins${pkg.bonusCoins ? ` (+${pkg.bonusCoins} Bonus)` : ''} for ${pkg.displayPrice}`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
        referenceId: packageId,
        metadata: {
          packageName: pkg.coins.toString(),
          pricePkr: pkg.pricePkr,
          bonusCoins: pkg.bonusCoins || 0,
        },
      });
    });

    return { success: true, newBalance: totalCoinsToAdd };
  } catch (err: any) {
    return { success: false, newBalance: 0, error: err?.message || 'Recharge transaction failed' };
  }
}

/**
 * 6. ATOMIC GIFT SENDING & COMMISSION SYSTEM
 * - Deducts gift cost from sender's walletPurchasedCoins.
 * - Deducts application commission % (default 20%).
 * - Credits net eligible amount to recipient's availableEarningsCoins.
 * - Records all transactions immutably.
 */
export async function processGiftTransaction(
  senderUser: UserProfile,
  recipientUser: UserProfile,
  gift: GiftItem,
  quantity: number = 1,
  settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; netEarnings: number; commission: number; error?: string }> {
  try {
    const totalCost = gift.coins * quantity;
    if (totalCost <= 0) return { success: false, netEarnings: 0, commission: 0, error: 'Invalid gift amount' };

    const senderWalletRef = doc(db, 'wallets', senderUser.id);
    const recipientEarningsRef = doc(db, 'earnings', recipientUser.id);
    const senderUserRef = doc(db, 'users', senderUser.id);
    const recipientUserRef = doc(db, 'users', recipientUser.id);

    // Calculate commission
    const commissionPercent = settings.commissionRatePercent || 20;
    const commissionCoins = Math.round(totalCost * (commissionPercent / 100));
    const netEarningsCoins = totalCost - commissionCoins;

    await runTransaction(db, async (tx) => {
      // 1. Check sender's purchased wallet balance
      const senderSnap = await tx.get(senderWalletRef);
      const senderCoins = senderSnap.exists() ? (senderSnap.data().walletPurchasedCoins ?? 0) : senderUser.coins;

      if (senderCoins < totalCost) {
        throw new Error(`Insufficient wallet balance. You have ${senderCoins.toLocaleString()} coins, but need ${totalCost.toLocaleString()} coins.`);
      }

      // 2. Deduct from sender's wallet
      const newSenderCoins = senderCoins - totalCost;
      const prevSpent = senderSnap.exists() ? (senderSnap.data().totalCoinsSpent || 0) : 0;

      tx.set(
        senderWalletRef,
        {
          userId: senderUser.id,
          walletPurchasedCoins: newSenderCoins,
          totalCoinsSpent: prevSpent + totalCost,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(
        senderUserRef,
        {
          coins: newSenderCoins,
        },
        { merge: true }
      );

      // 3. Credit recipient's earnings
      const recipientSnap = await tx.get(recipientEarningsRef);
      const currentEarnings = recipientSnap.exists() ? (recipientSnap.data().availableEarningsCoins || 0) : 0;
      const prevGross = recipientSnap.exists() ? (recipientSnap.data().grossGiftCoinsReceived || 0) : 0;
      const prevCommission = recipientSnap.exists() ? (recipientSnap.data().totalCommissionDeducted || 0) : 0;
      const prevGiftCount = recipientSnap.exists() ? (recipientSnap.data().totalGiftsCount || 0) : 0;

      const newAvailableEarnings = currentEarnings + netEarningsCoins;

      tx.set(
        recipientEarningsRef,
        {
          userId: recipientUser.id,
          availableEarningsCoins: newAvailableEarnings,
          grossGiftCoinsReceived: prevGross + totalCost,
          totalCommissionDeducted: prevCommission + commissionCoins,
          totalGiftsCount: prevGiftCount + quantity,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Recipient diamonds track earnings
      tx.set(
        recipientUserRef,
        {
          diamonds: newAvailableEarnings,
        },
        { merge: true }
      );

      // 4. Create Transaction for Sender in wallet_transactions
      const senderTxRef = doc(collection(db, 'wallet_transactions'));
      tx.set(senderTxRef, {
        id: senderTxRef.id,
        userId: senderUser.id,
        category: 'gift_sent',
        balanceType: 'wallet',
        amount: -totalCost,
        pkrAmount: Math.round(totalCost * settings.exchangeRatePkrPerCoin),
        status: 'completed',
        description: `Sent ${quantity}x ${gift.name} ${gift.icon} to ${recipientUser.name}`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
        referenceId: gift.id,
        metadata: {
          recipientId: recipientUser.id,
          recipientName: recipientUser.name,
          giftName: gift.name,
          quantity,
        },
      });

      // 5. Create Transaction for Recipient in earnings_transactions
      const recipientTxRef = doc(collection(db, 'earnings_transactions'));
      tx.set(recipientTxRef, {
        id: recipientTxRef.id,
        userId: recipientUser.id,
        category: 'gift_received',
        balanceType: 'earnings',
        amount: netEarningsCoins,
        pkrAmount: Math.round(netEarningsCoins * settings.exchangeRatePkrPerCoin),
        status: 'completed',
        description: `Received ${quantity}x ${gift.name} ${gift.icon} from ${senderUser.name} (${netEarningsCoins.toLocaleString()} net after ${commissionPercent}% platform commission)`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
        referenceId: gift.id,
        metadata: {
          senderId: senderUser.id,
          senderName: senderUser.name,
          grossGiftCost: totalCost,
          commissionCoins,
          commissionPercent,
        },
      });

      // 6. Record Platform Commission Transaction
      const commissionTxRef = doc(collection(db, 'commission_transactions'));
      tx.set(commissionTxRef, {
        id: commissionTxRef.id,
        senderId: senderUser.id,
        recipientId: recipientUser.id,
        grossCost: totalCost,
        commissionCoins,
        netEarningsCoins,
        commissionPercent,
        timestamp: serverTimestamp(),
        timestampMillis: Date.now(),
      });
    });

    return {
      success: true,
      netEarnings: netEarningsCoins,
      commission: commissionCoins,
    };
  } catch (err: any) {
    return { success: false, netEarnings: 0, commission: 0, error: err?.message || 'Gift transaction failed' };
  }
}

/**
 * 7. ATOMIC CONVERSION OF EARNINGS INTO WALLET COINS
 * - User enters eligible earnings coins.
 * - Deducts from availableEarningsCoins.
 * - Credits to walletPurchasedCoins.
 * - Converted coins can be used for gifting, but never counted as new earnings.
 */
export async function convertEarningsToWallet(
  userId: string,
  coinsToConvert: number,
  settings: WalletSettings = DEFAULT_WALLET_SETTINGS
): Promise<{ success: boolean; walletCoinsReceived: number; error?: string }> {
  try {
    if (coinsToConvert <= 0) {
      return { success: false, walletCoinsReceived: 0, error: 'Please enter a valid amount to convert' };
    }

    const conversionRate = settings.earningsToWalletConversionRate || 1.0;
    const walletCoinsReceived = Math.round(coinsToConvert * conversionRate);

    const earningsRef = doc(db, 'earnings', userId);
    const walletRef = doc(db, 'wallets', userId);
    const userRef = doc(db, 'users', userId);

    await runTransaction(db, async (tx) => {
      const earningsSnap = await tx.get(earningsRef);
      const availableEarnings = earningsSnap.exists() ? (earningsSnap.data().availableEarningsCoins || 0) : 0;

      if (availableEarnings < coinsToConvert) {
        throw new Error(`Insufficient earnings. Available: ${availableEarnings.toLocaleString()} coins.`);
      }

      const walletSnap = await tx.get(walletRef);
      const currentWalletCoins = walletSnap.exists() ? (walletSnap.data().walletPurchasedCoins || 0) : 0;
      const prevConverted = earningsSnap.exists() ? (earningsSnap.data().totalConvertedToWallet || 0) : 0;

      // Deduct from earnings
      const newAvailableEarnings = availableEarnings - coinsToConvert;
      tx.set(
        earningsRef,
        {
          availableEarningsCoins: newAvailableEarnings,
          totalConvertedToWallet: prevConverted + coinsToConvert,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Credit to wallet
      const newWalletCoins = currentWalletCoins + walletCoinsReceived;
      tx.set(
        walletRef,
        {
          walletPurchasedCoins: newWalletCoins,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Update user coins profile
      tx.set(userRef, { coins: newWalletCoins, diamonds: newAvailableEarnings }, { merge: true });

      // Transaction in earnings
      const earningsTx = doc(collection(db, 'earnings_transactions'));
      tx.set(earningsTx, {
        id: earningsTx.id,
        userId,
        category: 'earnings_conversion',
        balanceType: 'earnings',
        amount: -coinsToConvert,
        status: 'completed',
        description: `Converted ${coinsToConvert.toLocaleString()} earnings coins to ${walletCoinsReceived.toLocaleString()} Wallet Coins`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
      });

      // Transaction in wallet
      const walletTx = doc(collection(db, 'wallet_transactions'));
      tx.set(walletTx, {
        id: walletTx.id,
        userId,
        category: 'earnings_conversion',
        balanceType: 'wallet',
        amount: walletCoinsReceived,
        status: 'completed',
        description: `Received ${walletCoinsReceived.toLocaleString()} Wallet Coins converted from Creator Earnings`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
      });
    });

    return { success: true, walletCoinsReceived };
  } catch (err: any) {
    return { success: false, walletCoinsReceived: 0, error: err?.message || 'Conversion failed' };
  }
}

/**
 * 8. ATOMIC WITHDRAWAL REQUEST
 * - Deducts requested coins from availableEarningsCoins.
 * - Moves them into pendingWithdrawalCoins.
 * - Creates a withdrawal_requests document with status: 'pending'.
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
    if (coinsRequested < settings.minWithdrawalCoins) {
      return { success: false, requestId: '', finalPayablePkr: 0, error: `Minimum withdrawal limit is ${settings.minWithdrawalCoins.toLocaleString()} coins (PKR ${(settings.minWithdrawalCoins * settings.exchangeRatePkrPerCoin).toLocaleString()})` };
    }
    if (coinsRequested > settings.maxWithdrawalCoins) {
      return { success: false, requestId: '', finalPayablePkr: 0, error: `Maximum withdrawal limit is ${settings.maxWithdrawalCoins.toLocaleString()} coins per transaction` };
    }

    const exchangeRate = settings.exchangeRatePkrPerCoin || 2.0;
    const grossPkr = Math.round(coinsRequested * exchangeRate);
    const feePkr = Math.round(grossPkr * ((settings.withdrawalFeePercent || 2.0) / 100));
    const finalPayablePkr = grossPkr - feePkr;

    const earningsRef = doc(db, 'earnings', userId);
    const userRef = doc(db, 'users', userId);
    let createdReqId = '';

    await runTransaction(db, async (tx) => {
      const earningsSnap = await tx.get(earningsRef);
      const available = earningsSnap.exists() ? (earningsSnap.data().availableEarningsCoins || 0) : 0;
      const pending = earningsSnap.exists() ? (earningsSnap.data().pendingWithdrawalCoins || 0) : 0;

      if (available < coinsRequested) {
        throw new Error(`Insufficient available earnings. Available: ${available.toLocaleString()} coins.`);
      }

      // Deduct from available, add to pending
      const newAvailable = available - coinsRequested;
      const newPending = pending + coinsRequested;

      tx.set(
        earningsRef,
        {
          availableEarningsCoins: newAvailable,
          pendingWithdrawalCoins: newPending,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      tx.set(userRef, { diamonds: newAvailable }, { merge: true });

      // Create withdrawal request doc
      const reqDocRef = doc(collection(db, 'withdrawal_requests'));
      createdReqId = reqDocRef.id;

      const reqData: WithdrawalRequest = {
        id: reqDocRef.id,
        userId,
        userName,
        userEmail: auth.currentUser?.email || '',
        coinsRequested,
        exchangeRatePkr: exchangeRate,
        grossAmountPkr: grossPkr,
        feeAmountPkr: feePkr,
        finalPayablePkr,
        paymentMethod,
        paymentDetails,
        status: 'pending',
        requestedAt: new Date().toLocaleString(),
        requestedAtMillis: Date.now(),
        updatedAt: new Date().toLocaleString(),
      };

      tx.set(reqDocRef, reqData);

      // Record in earnings_transactions
      const txDocRef = doc(collection(db, 'earnings_transactions'));
      tx.set(txDocRef, {
        id: txDocRef.id,
        userId,
        category: 'withdrawal_request',
        balanceType: 'earnings',
        amount: -coinsRequested,
        pkrAmount: finalPayablePkr,
        status: 'pending',
        description: `Withdrawal request #${reqDocRef.id.slice(-6).toUpperCase()} for ${coinsRequested.toLocaleString()} coins (PKR ${finalPayablePkr.toLocaleString()} via ${paymentDetails.bankOrProviderName})`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: Date.now(),
        referenceId: reqDocRef.id,
      });
    });

    return { success: true, requestId: createdReqId, finalPayablePkr };
  } catch (err: any) {
    return { success: false, requestId: '', finalPayablePkr: 0, error: err?.message || 'Withdrawal submission failed' };
  }
}

/**
 * 9. ADMIN WITHDRAWAL STATUS MANAGEMENT
 * - If Approved/Processing/Paid: moves pending to totalWithdrawn.
 * - If Rejected/Cancelled: atomically returns reserved coins to availableEarningsCoins!
 */
export async function adminUpdateWithdrawalStatus(
  request: WithdrawalRequest,
  newStatus: 'approved' | 'processing' | 'paid' | 'rejected' | 'cancelled',
  adminRemarks: string = '',
  paymentReference: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqRef = doc(db, 'withdrawal_requests', request.id);
    const earningsRef = doc(db, 'earnings', request.userId);
    const userRef = doc(db, 'users', request.userId);

    await runTransaction(db, async (tx) => {
      const earningsSnap = await tx.get(earningsRef);
      const pending = earningsSnap.exists() ? (earningsSnap.data().pendingWithdrawalCoins || 0) : 0;
      const available = earningsSnap.exists() ? (earningsSnap.data().availableEarningsCoins || 0) : 0;
      const totalWithdrawn = earningsSnap.exists() ? (earningsSnap.data().totalWithdrawnCoins || 0) : 0;

      if (newStatus === 'paid') {
        // Permanently deduct from pending and add to totalWithdrawn
        const newPending = Math.max(0, pending - request.coinsRequested);
        const newTotalWithdrawn = totalWithdrawn + request.coinsRequested;

        tx.set(
          earningsRef,
          {
            pendingWithdrawalCoins: newPending,
            totalWithdrawnCoins: newTotalWithdrawn,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        tx.update(reqRef, {
          status: 'paid',
          adminRemarks: adminRemarks || 'Payout completed successfully.',
          paymentReference: paymentReference || `IBFT-${Date.now().toString().slice(-8)}`,
          updatedAt: new Date().toLocaleString(),
        });
      } else if (newStatus === 'rejected' || newStatus === 'cancelled') {
        // RETURN FUNDS TO AVAILABLE EARNINGS
        const newPending = Math.max(0, pending - request.coinsRequested);
        const newAvailable = available + request.coinsRequested;

        tx.set(
          earningsRef,
          {
            pendingWithdrawalCoins: newPending,
            availableEarningsCoins: newAvailable,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        tx.set(userRef, { diamonds: newAvailable }, { merge: true });

        tx.update(reqRef, {
          status: newStatus,
          adminRemarks: adminRemarks || 'Request rejected. Coins returned to your available earnings balance.',
          updatedAt: new Date().toLocaleString(),
        });

        // Add refund audit transaction
        const refundTx = doc(collection(db, 'earnings_transactions'));
        tx.set(refundTx, {
          id: refundTx.id,
          userId: request.userId,
          category: 'withdrawal_refund',
          balanceType: 'earnings',
          amount: request.coinsRequested,
          pkrAmount: request.finalPayablePkr,
          status: 'completed',
          description: `Withdrawal #${request.id.slice(-6).toUpperCase()} rejected: ${adminRemarks || 'Funds restored to available earnings.'}`,
          timestamp: new Date().toLocaleString(),
          timestampMillis: Date.now(),
          referenceId: request.id,
        });
      } else {
        // 'approved' or 'processing'
        tx.update(reqRef, {
          status: newStatus,
          adminRemarks,
          updatedAt: new Date().toLocaleString(),
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update withdrawal status' };
  }
}

/**
 * 10. REAL-TIME TRANSACTIONS LISTENER
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
    limit(50)
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

/**
 * 11. ADMIN ALL WITHDRAWAL REQUESTS LISTENER
 */
export function subscribeAllWithdrawalRequests(
  onUpdate: (requests: WithdrawalRequest[]) => void
) {
  const q = query(collection(db, 'withdrawal_requests'), orderBy('requestedAtMillis', 'desc'), limit(100));
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
 * 12. ADMIN BALANCE ADJUSTMENT WITH AUDIT TRAIL
 */
export async function adminAdjustBalance(
  targetUserId: string,
  balanceType: 'wallet' | 'earnings',
  coinDelta: number,
  reason: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const docRef = doc(db, balanceType === 'wallet' ? 'wallets' : 'earnings', targetUserId);
    const userRef = doc(db, 'users', targetUserId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      if (balanceType === 'wallet') {
        const current = snap.exists() ? (snap.data().walletPurchasedCoins || 0) : 0;
        const next = Math.max(0, current + coinDelta);
        tx.set(docRef, { walletPurchasedCoins: next, updatedAt: serverTimestamp() }, { merge: true });
        tx.set(userRef, { coins: next }, { merge: true });

        const txRef = doc(collection(db, 'wallet_transactions'));
        tx.set(txRef, {
          id: txRef.id,
          userId: targetUserId,
          category: 'admin_adjustment',
          balanceType: 'wallet',
          amount: coinDelta,
          status: 'completed',
          description: `Admin Adjustment (${adminEmail}): ${reason}`,
          timestamp: new Date().toLocaleString(),
          timestampMillis: Date.now(),
        });
      } else {
        const current = snap.exists() ? (snap.data().availableEarningsCoins || 0) : 0;
        const next = Math.max(0, current + coinDelta);
        tx.set(docRef, { availableEarningsCoins: next, updatedAt: serverTimestamp() }, { merge: true });
        tx.set(userRef, { diamonds: next }, { merge: true });

        const txRef = doc(collection(db, 'earnings_transactions'));
        tx.set(txRef, {
          id: txRef.id,
          userId: targetUserId,
          category: 'admin_adjustment',
          balanceType: 'earnings',
          amount: coinDelta,
          status: 'completed',
          description: `Admin Adjustment (${adminEmail}): ${reason}`,
          timestamp: new Date().toLocaleString(),
          timestampMillis: Date.now(),
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Admin adjustment failed' };
  }
}
