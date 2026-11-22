import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { sendPushNotification } from './pushNotificationService';
import { isVerifiedAdminSession } from '../utils/adminAuth';
import {
  DEFAULT_STORE_CATEGORIES,
  DEFAULT_STORE_PRODUCTS,
  STORE_CATEGORY_ICONS,
} from '../data/storeCatalog';
import {
  LenzoStoreProduct,
  StoreCategoryId,
  StoreCategoryRecord,
  StoreCoinTransaction,
  UserInventoryItem,
} from '../types/store';

function toIsoDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof (val as { toDate?: () => Date }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return new Date().toISOString();
}

// Admin session verification imported from ../utils/adminAuth

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    } catch {
      // fallback without token
    }
  }
  return headers;
}

/**
 * Subscribe to the 4 official Lenzo Store Categories in real time.
 * Always resolves the local ES-bundled 3D emblem fallback if a Firestore doc omits imageUrl.
 */
export function subscribeStoreCategories(
  onUpdate: (categories: StoreCategoryRecord[]) => void
): () => void {
  const collRef = collection(db, 'store_categories');
  return onSnapshot(
    collRef,
    (snap) => {
      if (snap.empty) {
        if (isVerifiedAdminSession()) {
          DEFAULT_STORE_CATEGORIES.forEach((cat) => {
            setDoc(
              doc(db, 'store_categories', cat.id),
              {
                id: cat.id,
                title: cat.title,
                subtitle: cat.subtitle,
                accentFrom: cat.accentFrom,
                accentTo: cat.accentTo,
                glowColor: cat.glowColor,
                order: cat.order,
                enabled: cat.enabled,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => {});
          });
        }
        onUpdate(DEFAULT_STORE_CATEGORIES);
        return;
      }

      const map = new Map<StoreCategoryId, StoreCategoryRecord>();
      DEFAULT_STORE_CATEGORIES.forEach((c) => map.set(c.id, c));

      snap.docs.forEach((d) => {
        const raw = d.data() as Partial<StoreCategoryRecord>;
        const id = d.id as StoreCategoryId;
        if (!map.has(id)) return;
        const base = map.get(id)!;
        map.set(id, {
          ...base,
          ...raw,
          id,
          imageUrl:
            raw.imageUrl && raw.imageUrl.startsWith('http')
              ? raw.imageUrl
              : STORE_CATEGORY_ICONS[id],
        });
      });

      const merged = Array.from(map.values())
        .filter((c) => c.enabled !== false)
        .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
      onUpdate(merged);
    },
    () => {
      onUpdate(DEFAULT_STORE_CATEGORIES);
    }
  );
}

/**
 * Subscribe to all Store Products in real time from Firestore `store_products`.
 * Automatically falls back to / merges with the default Lenzo catalog if Firestore is empty,
 * and ensures admin edits reflect immediately across Web & Android.
 */
export function subscribeStoreProducts(
  onUpdate: (products: LenzoStoreProduct[]) => void,
  options?: { includeDisabled?: boolean }
): () => void {
  const includeDisabled = Boolean(options?.includeDisabled);
  const collRef = collection(db, 'store_products');

  return onSnapshot(
    collRef,
    (snap) => {
      if (snap.empty) {
        if (isVerifiedAdminSession()) {
          DEFAULT_STORE_PRODUCTS.forEach((prod) => {
            setDoc(
              doc(db, 'store_products', prod.id),
              {
                ...prod,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            ).catch(() => {});
          });
        }
        const defaults = includeDisabled
          ? [...DEFAULT_STORE_PRODUCTS]
          : DEFAULT_STORE_PRODUCTS.filter((p) => p.enabled);
        onUpdate(defaults);
        return;
      }

      const list: LenzoStoreProduct[] = snap.docs.map((d) => {
        const data = d.data() as Partial<LenzoStoreProduct>;
        return {
          id: d.id,
          name: String(data.name || 'Unnamed Item'),
          categoryId: (data.categoryId as StoreCategoryId) || 'vip_frames',
          priceCoins: Math.max(0, Math.round(Number(data.priceCoins ?? 0))),
          description: String(data.description || ''),
          imageUrl: data.imageUrl ? String(data.imageUrl) : '',
          animationUrl: data.animationUrl ? String(data.animationUrl) : '',
          animationPreset: data.animationPreset || 'royal_flame',
          primaryColor: String(data.primaryColor || '#A855F7'),
          secondaryColor: String(data.secondaryColor || '#FFC84A'),
          accentColor: String(data.accentColor || '#F0ABFC'),
          glowColor: String(data.glowColor || 'rgba(168, 85, 247, 0.75)'),
          badgeText: data.badgeText ? String(data.badgeText) : '',
          durationDays: Number(data.durationDays ?? 0),
          isFeatured: Boolean(data.isFeatured),
          enabled: data.enabled !== false,
          sortOrder: Number(data.sortOrder ?? 99),
          createdAt: toIsoDate(data.createdAt),
          updatedAt: toIsoDate(data.updatedAt),
        };
      });

      const filtered = includeDisabled ? list : list.filter((p) => p.enabled);
      filtered.sort((a, b) => {
        if (a.categoryId !== b.categoryId) {
          return a.categoryId.localeCompare(b.categoryId);
        }
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.priceCoins - b.priceCoins;
      });
      onUpdate(filtered);
    },
    async () => {
      // Fallback to backend API if Firestore listener cannot connect
      try {
        const res = await fetch('/api/store/catalog');
        if (res.ok) {
          const payload = await res.json();
          if (Array.isArray(payload.products)) {
            const list = includeDisabled
              ? payload.products
              : payload.products.filter((p: LenzoStoreProduct) => p.enabled !== false);
            onUpdate(list);
            return;
          }
        }
      } catch {
        // ignore
      }
      onUpdate(
        includeDisabled
          ? [...DEFAULT_STORE_PRODUCTS]
          : DEFAULT_STORE_PRODUCTS.filter((p) => p.enabled)
      );
    }
  );
}

/**
 * Subscribe to the authenticated user's real-time Store inventory (`user_inventory`).
 */
export function subscribeUserInventory(
  userId: string,
  onUpdate: (items: UserInventoryItem[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'user_inventory'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items: UserInventoryItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || userId),
          productId: String(data.productId || ''),
          productName: String(data.productName || ''),
          categoryId: (data.categoryId as StoreCategoryId) || 'vip_frames',
          animationPreset: data.animationPreset || 'royal_flame',
          imageUrl: data.imageUrl ? String(data.imageUrl) : '',
          animationUrl: data.animationUrl ? String(data.animationUrl) : '',
          pricePaidCoins: Number(data.pricePaidCoins ?? 0),
          equipped: Boolean(data.equipped),
          purchasedAt: toIsoDate(data.purchasedAt),
          expiresAt: data.expiresAt ? toIsoDate(data.expiresAt) : null,
        };
      });
      items.sort(
        (a, b) =>
          new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
      );
      onUpdate(items);
    },
    () => {
      onUpdate([]);
    }
  );
}

/**
 * Subscribe to the user's Store coin transactions (`coin_transactions`).
 */
export function subscribeUserCoinTransactions(
  userId: string,
  onUpdate: (txs: StoreCoinTransaction[]) => void
): () => void {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const q = query(
    collection(db, 'coin_transactions'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: StoreCoinTransaction[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: String(data.userId || userId),
          type: data.type || 'store_purchase',
          productId: data.productId ? String(data.productId) : undefined,
          productName: data.productName ? String(data.productName) : undefined,
          categoryId: data.categoryId as StoreCategoryId | undefined,
          amount: Number(data.amount ?? 0),
          balanceBefore: Number(data.balanceBefore ?? 0),
          balanceAfter: Number(data.balanceAfter ?? 0),
          idempotencyKey: String(data.idempotencyKey || d.id),
          status: data.status === 'failed' ? 'failed' : 'completed',
          createdAt: toIsoDate(data.createdAt),
        };
      });
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onUpdate(list);
    },
    () => {
      onUpdate([]);
    }
  );
}

export interface StorePurchaseResult {
  success: boolean;
  errorCode?:
    | 'UNAUTHENTICATED'
    | 'INSUFFICIENT_COINS'
    | 'ALREADY_OWNED'
    | 'PRODUCT_UNAVAILABLE'
    | 'TRANSACTION_FAILED';
  message: string;
  newBalance?: number;
  inventoryItem?: UserInventoryItem;
  transactionId?: string;
}

const inFlightPurchases = new Set<string>();

/**
 * Secure, atomic, idempotent Lenzo Store purchase flow:
 * 1. Guards against concurrent double-taps with an in-flight lock.
 * 2. Validates the product, authoritative price, and purchase eligibility with the Lenzo backend API.
 * 3. Runs a Firestore atomic `runTransaction` that:
 *    - Verifies deterministic doc `user_inventory/{uid}_{productId}` does NOT exist (blocks duplicate purchases).
 *    - Reads authoritative balance from `wallets/{uid}` + `users/{uid}` (never trusts client state).
 *    - Deducts exact coins from both `wallets/{uid}` and `users/{uid}`.
 *    - Creates `user_inventory/{uid}_{productId}` and immutable `coin_transactions/{txId}`.
 */
export async function purchaseStoreProduct(params: {
  userId: string;
  product: LenzoStoreProduct;
  fallbackBalanceCoins?: number;
}): Promise<StorePurchaseResult> {
  const { userId, product } = params;
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return {
      success: false,
      errorCode: 'UNAUTHENTICATED',
      message: 'Please sign in to your Lenzo Party account to make a purchase.',
    };
  }

  const idempotencyKey = `store_${userId}_${product.id}`;
  if (inFlightPurchases.has(idempotencyKey)) {
    return {
      success: false,
      errorCode: 'TRANSACTION_FAILED',
      message: 'Purchase is already being processed. Please wait.',
    };
  }

  inFlightPurchases.add(idempotencyKey);

  try {
    // Step 1: Validate product & authoritative price via backend API
    let authoritativePrice = Math.max(1, Math.round(Number(product.priceCoins)));
    let authoritativeName = product.name;
    let authoritativeCategory = product.categoryId;

    try {
      const headers = await getAuthHeaders();
      const validateRes = await fetch('/api/store/purchase/validate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          idempotencyKey,
        }),
      });
      if (validateRes.ok) {
        const vData = await validateRes.json();
        if (vData.alreadyOwned) {
          return {
            success: false,
            errorCode: 'ALREADY_OWNED',
            message: `You already own ${product.name}. You can equip it immediately!`,
          };
        }
        if (vData.product && typeof vData.product.priceCoins === 'number') {
          authoritativePrice = Math.max(1, Math.round(vData.product.priceCoins));
          authoritativeName = String(vData.product.name || product.name);
          authoritativeCategory =
            (vData.product.categoryId as StoreCategoryId) || product.categoryId;
        }
      } else if (validateRes.status === 404 || validateRes.status === 410) {
        return {
          success: false,
          errorCode: 'PRODUCT_UNAVAILABLE',
          message: 'This store item is no longer available.',
        };
      }
    } catch {
      // Continue into Firestore atomic transaction which also enforces authoritative store_products price if present
    }

    // Step 2: Atomic Firestore Transaction
    const walletRef = doc(db, 'wallets', userId);
    const userRef = doc(db, 'users', userId);
    const productRef = doc(db, 'store_products', product.id);
    const inventoryDocId = `${userId}_${product.id}`;
    const inventoryRef = doc(db, 'user_inventory', inventoryDocId);
    const txId = `storetx_${userId.slice(0, 12)}_${product.id.slice(0, 24)}_${Date.now()}`;
    const txRef = doc(db, 'coin_transactions', txId);

    let finalBalance = 0;
    let finalBalanceBefore = 0;
    let createdInventory: UserInventoryItem | null = null;

    await runTransaction(db, async (tx) => {
      const [walletSnap, userSnap, prodSnap, invSnap] = await Promise.all([
        tx.get(walletRef),
        tx.get(userRef),
        tx.get(productRef),
        tx.get(inventoryRef),
      ]);

      // Prevent duplicate purchase
      if (invSnap.exists()) {
        throw new Error('ERR_ALREADY_OWNED');
      }

      // Authoritative Firestore catalog price check if doc exists
      let txPrice = authoritativePrice;
      let txName = authoritativeName;
      let txCategory = authoritativeCategory;
      let txPreset = product.animationPreset;
      let txImageUrl = product.imageUrl || '';
      let txAnimationUrl = product.animationUrl || '';

      if (prodSnap.exists()) {
        const pData = prodSnap.data() as Partial<LenzoStoreProduct>;
        if (pData.enabled === false) {
          throw new Error('ERR_PRODUCT_UNAVAILABLE');
        }
        if (typeof pData.priceCoins === 'number' && pData.priceCoins > 0) {
          txPrice = Math.round(pData.priceCoins);
        }
        if (pData.name) txName = String(pData.name);
        if (pData.categoryId) txCategory = pData.categoryId as StoreCategoryId;
        if (pData.animationPreset) txPreset = pData.animationPreset;
        if (typeof pData.imageUrl === 'string') txImageUrl = pData.imageUrl;
        if (typeof pData.animationUrl === 'string') txAnimationUrl = pData.animationUrl;
      }

      // Authoritative balance check across wallets/{uid} and users/{uid}
      const walletCoins = walletSnap.exists()
        ? Number(walletSnap.data().walletPurchasedCoins ?? 0)
        : 0;
      const userCoins = userSnap.exists()
        ? Number(userSnap.data().coins ?? 0)
        : 0;

      // Pick the synced authoritative balance (wallets/{uid} is primary; if wallet doc was never seeded but users/{uid} has coins, mirror it cleanly)
      const currentBalance =
        walletSnap.exists() && walletCoins > 0
          ? walletCoins
          : Math.max(walletCoins, userCoins);

      if (currentBalance < txPrice) {
        throw new Error('ERR_INSUFFICIENT_COINS');
      }

      const nextBalance = currentBalance - txPrice;
      const prevTotalSpent = walletSnap.exists()
        ? Number(walletSnap.data().totalCoinsSpent ?? 0)
        : 0;
      const prevTotalPurchased = walletSnap.exists()
        ? Number(walletSnap.data().totalCoinsPurchased ?? currentBalance)
        : currentBalance;

      finalBalanceBefore = currentBalance;
      finalBalance = nextBalance;

      const nowIso = new Date().toISOString();

      // 1. Update wallets/{uid}
      tx.set(
        walletRef,
        {
          userId,
          walletPurchasedCoins: nextBalance,
          totalCoinsPurchased: prevTotalPurchased,
          totalCoinsSpent: prevTotalSpent + txPrice,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // 2. Sync users/{uid}.coins
      if (userSnap.exists()) {
        tx.update(userRef, {
          coins: nextBalance,
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Grant inventory item (deterministic ID prevents duplicates)
      const invDoc = {
        userId,
        productId: product.id,
        productName: txName,
        categoryId: txCategory,
        animationPreset: txPreset,
        imageUrl: txImageUrl,
        animationUrl: txAnimationUrl,
        pricePaidCoins: txPrice,
        equipped: false,
        purchasedAt: serverTimestamp(),
      };
      tx.set(inventoryRef, invDoc);

      // 4. Record immutable coin_transactions audit entry
      tx.set(txRef, {
        userId,
        type: 'store_purchase',
        productId: product.id,
        productName: txName,
        categoryId: txCategory,
        amount: -txPrice,
        balanceBefore: currentBalance,
        balanceAfter: nextBalance,
        idempotencyKey,
        status: 'completed',
        createdAt: serverTimestamp(),
      });

      createdInventory = {
        id: inventoryDocId,
        userId,
        productId: product.id,
        productName: txName,
        categoryId: txCategory,
        animationPreset: txPreset,
        imageUrl: txImageUrl,
        animationUrl: txAnimationUrl,
        pricePaidCoins: txPrice,
        equipped: false,
        purchasedAt: nowIso,
      };
    });

    // Step 3: Notify backend server ledger asynchronously (keeps Express analytics/inventory in sync)
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/store/purchase/record', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          idempotencyKey,
          transactionId: txId,
          pricePaidCoins: finalBalanceBefore - finalBalance,
          balanceBefore: finalBalanceBefore,
          balanceAfter: finalBalance,
        }),
      });
    } catch {
      // Firestore transaction already succeeded atomically
    }

    void sendPushNotification({
      targetUserId: userId,
      type: 'progression',
      title: `✨ Unlocked: ${product.name}`,
      message: `${product.name} has been added to your inventory (${(finalBalanceBefore - finalBalance).toLocaleString()} Coins).`,
      actionType: 'open_store',
      targetId: product.id,
      allowSelf: true,
      eventKey: 'store_unlock',
    });

    return {
      success: true,
      message: `${product.name} unlocked and added to your inventory!`,
      newBalance: finalBalance,
      inventoryItem: createdInventory || undefined,
      transactionId: txId,
    };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg === 'ERR_ALREADY_OWNED') {
      return {
        success: false,
        errorCode: 'ALREADY_OWNED',
        message: `You already own ${product.name}. Tap Equip to use it!`,
      };
    }
    if (errMsg === 'ERR_INSUFFICIENT_COINS') {
      return {
        success: false,
        errorCode: 'INSUFFICIENT_COINS',
        message: 'Not enough coins. Please recharge your Lenzo Wallet.',
      };
    }
    if (errMsg === 'ERR_PRODUCT_UNAVAILABLE') {
      return {
        success: false,
        errorCode: 'PRODUCT_UNAVAILABLE',
        message: 'This item is currently disabled by Lenzo Store.',
      };
    }
    console.error('[StoreService] Purchase transaction failed:', err);
    return {
      success: false,
      errorCode: 'TRANSACTION_FAILED',
      message: 'Unable to complete purchase right now. No coins were deducted.',
    };
  } finally {
    inFlightPurchases.delete(idempotencyKey);
  }
}

/**
 * Equip or unequip an owned Store item in `user_inventory` and mirror the active equip to `users/{uid}`.
 * Ensures only one item per category is equipped at a time.
 */
export async function toggleEquipInventoryItem(params: {
  userId: string;
  item: UserInventoryItem;
  equip: boolean;
}): Promise<{ success: boolean; message: string }> {
  const { userId, item, equip } = params;
  if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) {
    return { success: false, message: 'Please sign in first.' };
  }

  try {
    const q = query(
      collection(db, 'user_inventory'),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach((d) => {
      const data = d.data();
      if (data.categoryId === item.categoryId) {
        const shouldBeEquipped = equip && d.id === item.id;
        if (Boolean(data.equipped) !== shouldBeEquipped) {
          batch.update(d.ref, {
            equipped: shouldBeEquipped,
            updatedAt: serverTimestamp(),
          });
        }
      }
    });

    const userFieldMap: Record<StoreCategoryId, string> = {
      vip_frames: 'equippedStoreFrame',
      special_entry: 'equippedStoreEntry',
      custom_gift: 'equippedStoreGift',
      premium_assets: 'equippedStoreAsset',
    };

    const userRef = doc(db, 'users', userId);
    batch.set(
      userRef,
      {
        [userFieldMap[item.categoryId]]: equip
          ? {
              productId: item.productId,
              productName: item.productName,
              animationPreset: item.animationPreset,
              imageUrl: item.imageUrl || '',
              animationUrl: item.animationUrl || '',
            }
          : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    return {
      success: true,
      message: equip
        ? `${item.productName} is now equipped!`
        : `${item.productName} unequipped.`,
    };
  } catch (err) {
    console.error('[StoreService] Equip error:', err);
    return {
      success: false,
      message: 'Could not update equipped item. Please try again.',
    };
  }
}

/**
 * ADMIN CRUD — Create or update a Store Product in Firestore + Backend API.
 * Strictly restricted to verified Lenzo Party Admins.
 */
export async function adminSaveStoreProduct(
  product: LenzoStoreProduct
): Promise<{ success: boolean; error?: string }> {
  if (!isVerifiedAdminSession()) {
    return { success: false, error: 'Admin authorization required.' };
  }

  const sanitizedId =
    product.id?.trim().replace(/[^a-zA-Z0-9_-]/g, '_') ||
    `${product.categoryId}_${Date.now()}`;

  const payload: LenzoStoreProduct = {
    ...product,
    id: sanitizedId,
    name: product.name.trim().slice(0, 64),
    description: (product.description || '').trim().slice(0, 320),
    priceCoins: Math.max(1, Math.round(Number(product.priceCoins || 100))),
    imageUrl: (product.imageUrl || '').trim(),
    animationUrl: (product.animationUrl || '').trim(),
    badgeText: (product.badgeText || '').trim().slice(0, 24),
    sortOrder: Math.max(0, Math.round(Number(product.sortOrder ?? 10))),
    enabled: product.enabled !== false,
    isFeatured: Boolean(product.isFeatured),
  };

  try {
    await setDoc(
      doc(db, 'store_products', sanitizedId),
      {
        ...payload,
        updatedAt: serverTimestamp(),
        createdAt: product.createdAt || serverTimestamp(),
      },
      { merge: true }
    );

    // Sync to Express backend catalog as well
    try {
      const headers = await getAuthHeaders();
      await fetch('/api/admin/store/products', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    } catch {
      // Firestore write is authoritative
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to save store product.';
    return { success: false, error: msg };
  }
}

/**
 * ADMIN CRUD — Delete a Store Product from Firestore + Backend API.
 */
export async function adminDeleteStoreProduct(
  productId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isVerifiedAdminSession()) {
    return { success: false, error: 'Admin authorization required.' };
  }

  try {
    await deleteDoc(doc(db, 'store_products', productId));

    try {
      const headers = await getAuthHeaders();
      await fetch(`/api/admin/store/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers,
      });
    } catch {
      // Firestore delete already succeeded
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete product.';
    return { success: false, error: msg };
  }
}

/**
 * ADMIN UTILITY — Seed default Lenzo Store catalog into Firestore if empty or reset requested.
 */
export async function adminSeedDefaultStoreCatalog(): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  if (!isVerifiedAdminSession()) {
    return { success: false, count: 0, error: 'Admin authorization required.' };
  }

  try {
    const batch = writeBatch(db);
    DEFAULT_STORE_CATEGORIES.forEach((cat) => {
      batch.set(
        doc(db, 'store_categories', cat.id),
        {
          id: cat.id,
          title: cat.title,
          subtitle: cat.subtitle,
          accentFrom: cat.accentFrom,
          accentTo: cat.accentTo,
          glowColor: cat.glowColor,
          order: cat.order,
          enabled: cat.enabled,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    DEFAULT_STORE_PRODUCTS.forEach((prod) => {
      batch.set(
        doc(db, 'store_products', prod.id),
        {
          ...prod,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    await batch.commit();
    return { success: true, count: DEFAULT_STORE_PRODUCTS.length };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to seed catalog.';
    return { success: false, count: 0, error: msg };
  }
}
