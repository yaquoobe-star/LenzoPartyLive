import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ALL_100_LEVELS } from '../utils/levelAndVipConfig';
import { isAuthorizedAdminEmail } from '../utils/adminAuth';
import { VerificationTier } from '../types';

export interface AdminUserRecord {
  uid: string;
  displayId: string;
  fullName: string;
  username: string;
  email: string;
  profileImage: string;
  coins: number;
  diamonds: number;
  level: number;
  totalQualifyingCoinsSpent: number;
  vipLevel: number;
  superVipLevel: number;
  isVIP: boolean;
  isSuperVIP: boolean;
  isVerified: boolean;
  verificationTier: VerificationTier;
  verifiedTag: string;
  isOnline: boolean;
  accountStatus: 'active' | 'suspended' | 'pending' | 'blocked';
  isBlocked: boolean;
  blockReason: string;
  blockedAt: string;
  blockedBy: string;
  suspendedUntil: number;
  suspendReason: string;
  suspendedAt: string;
  suspendedBy: string;
  isDeviceBanned: boolean;
  lastDeviceId: string;
  lastDeviceInfo: string;
  agencyId: string;
  agencyName: string;
  createdAt: string;
  lastLogin: string;
  lastActiveAt: string;
}

export interface BannedDeviceRecord {
  deviceId: string;
  targetUid: string;
  targetUserName: string;
  targetUserEmail: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  active: boolean;
}

export interface AdminAuditLogRecord {
  id: string;
  adminEmail: string;
  adminUid: string;
  action: string;
  targetUid: string;
  targetLabel: string;
  summary: string;
  reason: string;
  createdAt: string;
}

function assertAuthorizedAdmin(): { uid: string; email: string } {
  const user = auth.currentUser;
  const email = (user?.email || '').trim().toLowerCase();
  if (!user || !isAuthorizedAdminEmail(email)) {
    throw new Error('Access denied: Only authorized Lenzo Party administrators can perform this action.');
  }
  if (!user.emailVerified) {
    throw new Error(
      'Your admin email must be verified in Firebase Auth (sign in with Google or verify your email) to write administration changes.'
    );
  }
  return { uid: user.uid, email };
}

function makeAuditId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_\-]/g, '');
}

async function writeAdminAuditLog(params: {
  adminUid: string;
  adminEmail: string;
  action: string;
  targetUid: string;
  targetLabel: string;
  summary: string;
  reason: string;
}): Promise<void> {
  const logId = makeAuditId('adm');
  await setDoc(doc(db, 'progression_audit_logs', logId), {
    id: logId,
    adminUid: params.adminUid,
    adminEmail: params.adminEmail,
    action: params.action.slice(0, 80),
    targetUid: params.targetUid.slice(0, 128),
    targetLabel: params.targetLabel.slice(0, 120),
    summary: params.summary.slice(0, 360),
    reason: (params.reason || 'Admin control action').slice(0, 240),
    createdAt: new Date().toISOString(),
  });
}

function mapDocToAdminUser(id: string, data: Record<string, any>): AdminUserRecord {
  const uid = String(data.uid || id);
  const rawEmail = String(data.email || '');
  const rawUsername = String(data.username || '');
  const normalizedUsername = rawUsername
    ? rawUsername.startsWith('@')
      ? rawUsername
      : `@${rawUsername}`
    : `@${(rawEmail.split('@')[0] || 'user').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
  const vipLevel = Math.max(0, Math.min(12, Math.floor(Number(data.vipLevel || 0))));
  const superVipLevel = Math.max(0, Math.min(6, Math.floor(Number(data.superVipLevel || 0))));
  const accountStatus: AdminUserRecord['accountStatus'] =
    data.accountStatus === 'blocked' || data.isBlocked
      ? 'blocked'
      : data.accountStatus === 'suspended'
        ? 'suspended'
        : data.accountStatus === 'pending'
          ? 'pending'
          : 'active';

  return {
    uid,
    displayId: String(data.displayId || `LP${uid.slice(0, 6).toUpperCase()}`),
    fullName: String(data.fullName || 'Lenzo User'),
    username: normalizedUsername,
    email: rawEmail,
    profileImage: String(data.profileImage || ''),
    coins: Math.max(0, Math.floor(Number(data.coins || 0))),
    diamonds: Math.max(0, Math.floor(Number(data.diamonds || 0))),
    level: Math.max(0, Math.min(100, Math.floor(Number(data.level || 0)))),
    totalQualifyingCoinsSpent: Math.max(0, Math.floor(Number(data.totalQualifyingCoinsSpent || 0))),
    vipLevel,
    superVipLevel,
    isVIP: Boolean(data.isVIP || vipLevel > 0),
    isSuperVIP: Boolean(data.isSuperVIP || superVipLevel > 0),
    isVerified: Boolean(data.isVerified),
    verificationTier:
      data.verificationTier === 'gold' || data.verificationTier === 'blue' || data.verificationTier === 'none'
        ? data.verificationTier
        : 'none',
    verifiedTag: String(data.verifiedTag || ''),
    isOnline: Boolean(data.isOnline),
    accountStatus,
    isBlocked: Boolean(data.isBlocked || accountStatus === 'blocked'),
    blockReason: String(data.blockReason || ''),
    blockedAt: String(data.blockedAt || ''),
    blockedBy: String(data.blockedBy || ''),
    suspendedUntil: Number(data.suspendedUntil || 0) || 0,
    suspendReason: String(data.suspendReason || ''),
    suspendedAt: String(data.suspendedAt || ''),
    suspendedBy: String(data.suspendedBy || ''),
    isDeviceBanned: Boolean(data.isDeviceBanned),
    lastDeviceId: String(data.lastDeviceId || ''),
    lastDeviceInfo: String(data.lastDeviceInfo || ''),
    agencyId: String(data.agencyId || ''),
    agencyName: String(data.agencyName || ''),
    createdAt: String(data.createdAt || ''),
    lastLogin: String(data.lastLogin || ''),
    lastActiveAt: String(data.lastActiveAt || data.lastLogin || data.createdAt || ''),
  };
}

/**
 * Subscribe to ALL registered user accounts in real time (Admin only).
 */
export function subscribeAllUsersForAdmin(
  onUpdate: (users: AdminUserRecord[]) => void,
  onError?: (message: string) => void
) {
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const list = snap.docs
        .map((d) => mapDocToAdminUser(d.id, d.data() as Record<string, any>))
        .sort((a, b) => {
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          return (b.lastActiveAt || '').localeCompare(a.lastActiveAt || '');
        });
      onUpdate(list);
    },
    (err) => {
      console.warn('[Admin] Users listener error:', err);
      onError?.(err?.message || 'Unable to load users list. Verify your admin account email is verified.');
      onUpdate([]);
    }
  );
}

/**
 * Subscribe to all banned devices in real time (Admin only).
 */
export function subscribeBannedDevicesForAdmin(
  onUpdate: (devices: BannedDeviceRecord[]) => void,
  onError?: (message: string) => void
) {
  return onSnapshot(
    collection(db, 'banned_devices'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            deviceId: String(data.deviceId || d.id),
            targetUid: String(data.targetUid || ''),
            targetUserName: String(data.targetUserName || ''),
            targetUserEmail: String(data.targetUserEmail || ''),
            reason: String(data.reason || 'Banned by Administration'),
            bannedBy: String(data.bannedBy || ''),
            bannedAt: String(data.bannedAt || ''),
            active: data.active !== false,
          } satisfies BannedDeviceRecord;
        })
        .sort((a, b) => (b.bannedAt || '').localeCompare(a.bannedAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('[Admin] Banned devices listener error:', err);
      onError?.(err?.message || 'Unable to load banned devices.');
      onUpdate([]);
    }
  );
}

/**
 * Real-time client-side listener checking whether THIS device ID is banned.
 */
export function subscribeDeviceBanStatus(
  deviceId: string,
  onUpdate: (record: BannedDeviceRecord | null) => void
) {
  if (!deviceId || !/^[a-zA-Z0-9_\-]{6,64}$/.test(deviceId)) {
    onUpdate(null);
    return () => {};
  }
  return onSnapshot(
    doc(db, 'banned_devices', deviceId),
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = snap.data() as Record<string, any>;
      if (data.active === false) {
        onUpdate(null);
        return;
      }
      onUpdate({
        deviceId: String(data.deviceId || snap.id),
        targetUid: String(data.targetUid || ''),
        targetUserName: String(data.targetUserName || ''),
        targetUserEmail: String(data.targetUserEmail || ''),
        reason: String(data.reason || 'This device has been banned by Lenzo Party Administration.'),
        bannedBy: String(data.bannedBy || ''),
        bannedAt: String(data.bannedAt || ''),
        active: true,
      });
    },
    () => {
      onUpdate(null);
    }
  );
}

/**
 * Subscribe to real-time Administration Audit Logs stored directly in Firestore.
 */
export function subscribeAdminAuditLogs(
  onUpdate: (logs: AdminAuditLogRecord[]) => void,
  onError?: (message: string) => void
) {
  return onSnapshot(
    collection(db, 'progression_audit_logs'),
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data() as Record<string, any>;
          return {
            id: d.id,
            adminEmail: String(data.adminEmail || ''),
            adminUid: String(data.adminUid || ''),
            action: String(data.action || 'admin_action'),
            targetUid: String(data.targetUid || ''),
            targetLabel: String(data.targetLabel || data.targetUid || ''),
            summary: String(data.summary || data.reason || ''),
            reason: String(data.reason || ''),
            createdAt: String(data.createdAt || ''),
          } satisfies AdminAuditLogRecord;
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 120);
      onUpdate(list);
    },
    (err) => {
      console.warn('[Admin] Audit logs listener error:', err);
      onError?.(err?.message || 'Unable to load audit logs.');
      onUpdate([]);
    }
  );
}

/**
 * Directly add, deduct, or set a user's Coin balance in real time (syncs `users/{uid}`, `wallets/{uid}`, `wallet_transactions`, and audit logs).
 */
export async function adminAdjustUserCoins(params: {
  targetUid: string;
  amount: number;
  mode: 'add' | 'deduct' | 'set';
  reason?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const targetUid = params.targetUid.trim();
    const numericAmount = Math.trunc(Number(params.amount));
    if (!targetUid) return { success: false, error: 'Target user ID is required.' };
    if (!Number.isFinite(numericAmount) || (params.mode !== 'set' && numericAmount <= 0) || numericAmount < 0) {
      return { success: false, error: 'Enter a valid coin amount.' };
    }

    const userRef = doc(db, 'users', targetUid);
    const walletRef = doc(db, 'wallets', targetUid);
    let nextBalance = 0;
    let deltaApplied = 0;
    let targetName = targetUid;

    await runTransaction(db, async (tx) => {
      const [userSnap, walletSnap] = await Promise.all([tx.get(userRef), tx.get(walletRef)]);
      if (!userSnap.exists()) {
        throw new Error('Target user account not found.');
      }
      const userData = userSnap.data() as Record<string, any>;
      targetName = String(userData.fullName || userData.displayId || targetUid);
      const walletData = walletSnap.exists() ? (walletSnap.data() as Record<string, any>) : null;
      const currentBalance = Math.max(
        0,
        Math.floor(Number(walletData?.walletPurchasedCoins ?? userData.coins ?? 0))
      );

      if (params.mode === 'add') {
        nextBalance = currentBalance + numericAmount;
      } else if (params.mode === 'deduct') {
        nextBalance = Math.max(0, currentBalance - numericAmount);
      } else {
        nextBalance = Math.max(0, numericAmount);
      }
      deltaApplied = nextBalance - currentBalance;

      const prevPurchased = Math.max(0, Math.floor(Number(walletData?.totalCoinsPurchased ?? currentBalance)));
      const prevSpent = Math.max(0, Math.floor(Number(walletData?.totalCoinsSpent ?? 0)));

      tx.update(userRef, {
        coins: nextBalance,
      });

      if (walletSnap.exists()) {
        tx.update(walletRef, {
          userId: targetUid,
          walletPurchasedCoins: nextBalance,
          totalCoinsPurchased: deltaApplied > 0 ? prevPurchased + deltaApplied : prevPurchased,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(walletRef, {
          userId: targetUid,
          walletPurchasedCoins: nextBalance,
          totalCoinsPurchased: nextBalance,
          totalCoinsSpent: prevSpent,
          updatedAt: serverTimestamp(),
        });
      }

      const txId = makeAuditId('admc');
      tx.set(doc(db, 'wallet_transactions', txId), {
        userId: targetUid,
        category: 'admin_adjustment',
        amount: deltaApplied,
        balanceAfter: nextBalance,
        description:
          params.reason?.trim() ||
          `Admin ${params.mode === 'add' ? 'System Coin Credit' : params.mode === 'deduct' ? 'Coin Deduction' : 'Balance Set'} by ${admin.email}`,
        metadata: {
          adminEmail: admin.email,
          mode: params.mode,
          previousBalance: currentBalance,
        },
        createdAt: serverTimestamp(),
      });
    });

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: `user_coins_${params.mode}`,
      targetUid,
      targetLabel: targetName,
      summary: `${params.mode === 'add' ? 'Added' : params.mode === 'deduct' ? 'Deducted' : 'Set'} coins (${deltaApplied >= 0 ? '+' : ''}${deltaApplied.toLocaleString()}) -> New balance: ${nextBalance.toLocaleString()} coins for ${targetName}`,
      reason: params.reason?.trim() || 'Direct admin coin adjustment',
    });

    return { success: true, newBalance: nextBalance };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update user coins.' };
  }
}

/**
 * Edit any user's Name, Username, Level (0-100), VIP (0-12), Super VIP (0-6), and Verification Tier in real time.
 * Syncs both `users/{uid}` and `user_levels/{uid}` so progression listeners immediately reflect the exact edits.
 */
export async function adminEditUserProfileAndProgression(params: {
  targetUid: string;
  fullName: string;
  username: string;
  level: number;
  vipLevel: number;
  superVipLevel: number;
  verificationTier: VerificationTier;
  verifiedTag?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const targetUid = params.targetUid.trim();
    if (!targetUid) return { success: false, error: 'Target user UID is required.' };

    const cleanName = params.fullName.trim().replace(/\s+/g, ' ').slice(0, 60);
    if (cleanName.length < 2) {
      return { success: false, error: 'Name must be at least 2 characters.' };
    }

    const rawHandle = params.username.trim().replace(/^@+/, '').replace(/[^a-zA-Z0-9_.]/g, '').toLowerCase();
    if (rawHandle.length < 2) {
      return { success: false, error: 'Username must have at least 2 letters or numbers.' };
    }
    const cleanUsername = `@${rawHandle}`.slice(0, 40);

    const safeLevel = Math.max(0, Math.min(100, Math.floor(Number(params.level || 0))));
    const safeVip = Math.max(0, Math.min(12, Math.floor(Number(params.vipLevel || 0))));
    const safeSuperVip = Math.max(0, Math.min(6, Math.floor(Number(params.superVipLevel || 0))));
    const safeVerificationTier: VerificationTier =
      params.verificationTier === 'gold' || params.verificationTier === 'blue' ? params.verificationTier : 'none';
    const cleanVerifiedTag = (params.verifiedTag || '').trim().slice(0, 32);

    const levelEntry = ALL_100_LEVELS.find((l) => l.level === safeLevel) || ALL_100_LEVELS[0];
    const targetQualifyingCoins = Math.min(2_000_000_000, Math.max(0, levelEntry?.cumulativeCoins ?? 0));

    const unlockedVipTiers = Array.from({ length: safeVip }, (_, idx) => idx + 1);
    const unlockedSuperVipTiers = Array.from({ length: safeSuperVip }, (_, idx) => idx + 1);
    const activeFrameType: 'none' | 'vip' | 'super_vip' =
      safeSuperVip > 0 ? 'super_vip' : safeVip > 0 ? 'vip' : 'none';
    const equippedVipFrame = activeFrameType === 'vip' ? safeVip : 0;
    const equippedSuperVipFrame = activeFrameType === 'super_vip' ? safeSuperVip : 0;

    const userRef = doc(db, 'users', targetUid);
    const userLevelRef = doc(db, 'user_levels', targetUid);

    await runTransaction(db, async (tx) => {
      const [userSnap, levelSnap] = await Promise.all([tx.get(userRef), tx.get(userLevelRef)]);
      if (!userSnap.exists()) {
        throw new Error('User document not found.');
      }

      const existingLevelData = levelSnap.exists() ? (levelSnap.data() as Record<string, any>) : {};

      tx.update(userRef, {
        fullName: cleanName,
        username: cleanUsername,
        level: safeLevel,
        totalQualifyingCoinsSpent: targetQualifyingCoins,
        vipLevel: safeVip,
        isVIP: safeVip > 0,
        superVipLevel: safeSuperVip,
        isSuperVIP: safeSuperVip > 0,
        unlockedVipTiers,
        unlockedSuperVipTiers,
        activeFrameType,
        equippedVipFrame,
        equippedSuperVipFrame,
        isVerified: safeVerificationTier !== 'none',
        verificationTier: safeVerificationTier,
        verifiedTag: cleanVerifiedTag,
      });

      const levelDocPayload = {
        userId: targetUid,
        currentLevel: safeLevel,
        totalQualifyingCoinsSpent: targetQualifyingCoins,
        vipLevel: safeVip,
        superVipLevel: safeSuperVip,
        unlockedVipTiers,
        unlockedSuperVipTiers,
        equippedVipFrame,
        equippedSuperVipFrame,
        activeFrameType,
        equippedAchievementBadges: Array.isArray(existingLevelData.equippedAchievementBadges)
          ? existingLevelData.equippedAchievementBadges.slice(0, 3)
          : [],
        earnedAchievements: Array.isArray(existingLevelData.earnedAchievements)
          ? existingLevelData.earnedAchievements
          : [],
        updatedAt: new Date().toISOString(),
      };

      if (levelSnap.exists()) {
        tx.update(userLevelRef, levelDocPayload);
      } else {
        tx.set(userLevelRef, levelDocPayload);
      }
    });

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'user_profile_progression_edited',
      targetUid,
      targetLabel: `${cleanName} (${cleanUsername})`,
      summary: `Updated ${cleanName} (${cleanUsername}): Lv.${safeLevel}, VIP ${safeVip}, SVIP ${safeSuperVip}, Tick: ${safeVerificationTier}`,
      reason: params.reason?.trim() || 'Admin profile/level/VIP edit',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save user changes.' };
  }
}

/**
 * Permanently block or unblock a user account globally in real time.
 */
export async function adminSetUserBlockStatus(params: {
  targetUid: string;
  targetName: string;
  blocked: boolean;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const targetUid = params.targetUid.trim();
    if (!targetUid) return { success: false, error: 'Target UID is required.' };
    if (targetUid === admin.uid && params.blocked) {
      return { success: false, error: 'You cannot block your own active admin account.' };
    }

    const nowIso = new Date().toISOString();
    const cleanReason = (params.reason || (params.blocked ? 'Blocked by Administration' : '')).trim().slice(0, 280);

    await updateDoc(doc(db, 'users', targetUid), {
      isBlocked: params.blocked,
      accountStatus: params.blocked ? 'blocked' : 'active',
      blockReason: params.blocked ? cleanReason : '',
      blockedAt: params.blocked ? nowIso : '',
      blockedBy: params.blocked ? admin.email : '',
      ...(params.blocked
        ? {}
        : {
            suspendedUntil: 0,
            suspendReason: '',
          }),
    });

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: params.blocked ? 'user_blocked' : 'user_unblocked',
      targetUid,
      targetLabel: params.targetName || targetUid,
      summary: `${params.blocked ? 'Blocked' : 'Unblocked'} user ${params.targetName || targetUid}`,
      reason: cleanReason || (params.blocked ? 'Blocked by Admin' : 'Unblocked by Admin'),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update block status.' };
  }
}

/**
 * Suspend (temporary or permanent) or unsuspend a user ID in real time.
 * durationHours === 0 means Permanent Suspension until manually unsuspended.
 */
export async function adminSetUserSuspension(params: {
  targetUid: string;
  targetName: string;
  suspended: boolean;
  durationHours?: number;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const targetUid = params.targetUid.trim();
    if (!targetUid) return { success: false, error: 'Target UID is required.' };
    if (targetUid === admin.uid && params.suspended) {
      return { success: false, error: 'You cannot suspend your own active admin account.' };
    }

    const nowIso = new Date().toISOString();
    const hours = Math.max(0, Math.floor(Number(params.durationHours || 0)));
    const suspendedUntil = params.suspended && hours > 0 ? Date.now() + hours * 3_600_000 : 0;
    const cleanReason = (params.reason || (params.suspended ? 'Suspended by Administration' : '')).trim().slice(0, 280);

    await updateDoc(doc(db, 'users', targetUid), {
      accountStatus: params.suspended ? 'suspended' : 'active',
      isBlocked: false,
      suspendedUntil: params.suspended ? suspendedUntil : 0,
      suspendReason: params.suspended ? cleanReason : '',
      suspendedAt: params.suspended ? nowIso : '',
      suspendedBy: params.suspended ? admin.email : '',
    });

    const durationLabel = !params.suspended
      ? 'Restored'
      : hours === 0
        ? 'Permanent'
        : hours >= 24
          ? `${Math.round(hours / 24)} day(s)`
          : `${hours} hour(s)`;

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: params.suspended ? 'user_suspended' : 'user_unsuspended',
      targetUid,
      targetLabel: params.targetName || targetUid,
      summary: `${params.suspended ? `Suspended (${durationLabel})` : 'Unsuspended'} user ${params.targetName || targetUid}`,
      reason: cleanReason || durationLabel,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update suspension status.' };
  }
}

/**
 * Ban a device ID in real time (`banned_devices/{deviceId}`) and mark the user's `isDeviceBanned = true`.
 */
export async function adminBanDevice(params: {
  deviceId: string;
  targetUid?: string;
  targetUserName?: string;
  targetUserEmail?: string;
  reason?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const cleanDeviceId = params.deviceId.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
    if (cleanDeviceId.length < 6) {
      return { success: false, error: 'Valid Device ID is required (user must sign in at least once to register a Device ID).' };
    }
    if (params.targetUid && params.targetUid === admin.uid) {
      return { success: false, error: 'You cannot ban your own active admin device.' };
    }

    const nowIso = new Date().toISOString();
    const cleanReason = (params.reason || 'Device permanently banned by Lenzo Party Administration.').trim().slice(0, 280);

    await setDoc(doc(db, 'banned_devices', cleanDeviceId), {
      deviceId: cleanDeviceId,
      targetUid: (params.targetUid || '').slice(0, 128),
      targetUserName: (params.targetUserName || '').slice(0, 80),
      targetUserEmail: (params.targetUserEmail || '').slice(0, 120),
      reason: cleanReason,
      bannedBy: admin.email,
      bannedAt: nowIso,
      active: true,
    });

    if (params.targetUid) {
      const userRef = doc(db, 'users', params.targetUid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await updateDoc(userRef, {
          isDeviceBanned: true,
          lastDeviceId: cleanDeviceId,
        });
      }
    }

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'device_banned',
      targetUid: params.targetUid || cleanDeviceId,
      targetLabel: params.targetUserName || cleanDeviceId,
      summary: `Banned device ${cleanDeviceId}${params.targetUserName ? ` (${params.targetUserName})` : ''}`,
      reason: cleanReason,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to ban device.' };
  }
}

/**
 * Remove a device ban and clear `isDeviceBanned` on the associated user document if present.
 */
export async function adminUnbanDevice(params: {
  deviceId: string;
  targetUid?: string;
  targetUserName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const cleanDeviceId = params.deviceId.trim().replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
    if (!cleanDeviceId) return { success: false, error: 'Device ID is required.' };

    await deleteDoc(doc(db, 'banned_devices', cleanDeviceId));

    if (params.targetUid) {
      const userRef = doc(db, 'users', params.targetUid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        await updateDoc(userRef, {
          isDeviceBanned: false,
        });
      }
    }

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: 'device_unbanned',
      targetUid: params.targetUid || cleanDeviceId,
      targetLabel: params.targetUserName || cleanDeviceId,
      summary: `Unbanned device ${cleanDeviceId}${params.targetUserName ? ` (${params.targetUserName})` : ''}`,
      reason: 'Device ban lifted by Admin',
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to unban device.' };
  }
}

/**
 * Send system-generated coins to (or deduct from) any agency and record an immutable audit log.
 */
export async function adminSendSystemCoinsToAgency(params: {
  agencyId: string;
  amount: number;
  direction: 1 | -1;
  note?: string;
}): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const admin = assertAuthorizedAdmin();
    const absAmount = Math.trunc(Math.abs(Number(params.amount)));
    if (!Number.isFinite(absAmount) || absAmount <= 0) {
      return { success: false, error: 'Enter a valid coin amount greater than 0.' };
    }
    const delta = absAmount * params.direction;
    const agencyRef = doc(db, 'agencies', params.agencyId);
    let nextBalance = 0;
    let agencyLabel = params.agencyId;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(agencyRef);
      if (!snap.exists()) throw new Error('Agency not found.');
      const data = snap.data() as Record<string, any>;
      agencyLabel = `${data.name || params.agencyId} (${data.agencyCode || ''})`.trim();
      const prevBalance = Math.max(0, Math.floor(Number(data.coinBalance || 0)));
      nextBalance = Math.max(0, prevBalance + delta);
      tx.update(agencyRef, {
        coinBalance: nextBalance,
        updatedAt: new Date().toISOString(),
      });
    });

    await writeAdminAuditLog({
      adminUid: admin.uid,
      adminEmail: admin.email,
      action: params.direction > 0 ? 'agency_system_coins_sent' : 'agency_system_coins_deducted',
      targetUid: params.agencyId,
      targetLabel: agencyLabel,
      summary: `${params.direction > 0 ? 'Sent' : 'Deducted'} ${absAmount.toLocaleString()} system-generated coins ${params.direction > 0 ? 'to' : 'from'} ${agencyLabel} -> Balance: ${nextBalance.toLocaleString()}`,
      reason: params.note?.trim() || 'System-generated agency coin grant',
    });

    return { success: true, newBalance: nextBalance };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update agency coin balance.' };
  }
}
