import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile } from '../types';

export type DualAgencyType = 'coin_seller' | 'host_agency';

export interface AgencyApplicationRecord {
  id: string;
  applicantUid: string;
  applicantDisplayId: string;
  agencyType: DualAgencyType;
  fullName: string;
  agencyName: string;
  username: string;
  phoneNumber: string;
  whatsappNumber: string;
  idCardNumber: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  createdAgencyId?: string;
  createdAt: string;
  createdAtMillis: number;
  reviewedAt?: string;
}

export interface DualAgencyRecord {
  id: string;
  agencyType: DualAgencyType;
  name: string;
  agencyCode: string;
  ownerUid: string;
  ownerName: string;
  ownerUsername: string;
  ownerDisplayId: string;
  ownerAvatar?: string;
  whatsappNumber: string;
  description: string;
  status: 'active' | 'suspended';
  isVerified: boolean;
  isOnline: boolean;
  coinBalance: number;
  totalTransferredCoins: number;
  totalHosts: number;
  hasPin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyCoinTransferRecord {
  id: string;
  agencyId: string;
  agencyName: string;
  senderUid: string;
  recipientUid: string;
  recipientName: string;
  recipientUsername: string;
  recipientDisplayId: string;
  recipientAvatar?: string;
  amount: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
  createdAtMillis: number;
}

export interface AgencyHostRequestRecord {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyOwnerUid: string;
  agencyWhatsapp: string;
  hostUid: string;
  hostName: string;
  hostUsername: string;
  hostDisplayId: string;
  hostAvatar?: string;
  hostWhatsapp: string;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'removed' | 'cancelled';
  dealCommissionPercent: number;
  dealTargetCoins: number;
  dealTargetHours: number;
  dealNotes: string;
  createdAt: string;
  createdAtMillis: number;
  updatedAt: string;
}

export interface TransferRecipientCandidate {
  uid: string;
  fullName: string;
  username: string;
  displayId: string;
  email: string;
  avatar: string;
  level: number;
  coins: number;
}

// ============================================================
// SANITIZATION & WHATSAPP DEEP-LINK HELPERS
// ============================================================

export function sanitizeWhatsappNumber(raw: string): string {
  const trimmed = (raw || '').trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return hasPlus ? `+${digits}` : `+${digits}`;
}

export function buildWhatsAppUrl(rawPhone: string, message: string): string {
  const digits = (rawPhone || '').replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function isValidSecretPin(pin: string): boolean {
  return /^\d{4,5}$/.test((pin || '').trim());
}

export function getDeterministicAgencyId(type: DualAgencyType, ownerUid: string): string {
  return type === 'coin_seller' ? `cs_${ownerUid}` : `ha_${ownerUid}`;
}

// ============================================================
// CRYPTOGRAPHIC PIN HASHING (Salted SHA-256 — Never Plaintext)
// ============================================================

function generateRandomSaltHex(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Pure-JS SHA-256 fallback for environments without Web Crypto subtle (e.g., non-HTTPS WebView)
function sha256FallbackHex(ascii: string): string {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  let padded = ascii + '\x80';
  while ((padded.length % 64) - 56) padded += '\x00';
  for (let i = 0; i < padded.length; i++) {
    const j = padded.charCodeAt(i);
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash.unshift((temp1 + temp2) | 0);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

async function hashPinWithSalt(pin: string, salt: string): Promise<string> {
  const payload = `lenzo-agency-pin:${salt}:${pin.trim()}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return sha256FallbackHex(payload);
}

// ============================================================
// 1. AGENCY APPLICATIONS (Submit -> Admin Review)
// ============================================================

export async function submitAgencyApplication(params: {
  applicantUid: string;
  applicantDisplayId: string;
  agencyType: DualAgencyType;
  fullName: string;
  agencyName: string;
  username: string;
  phoneNumber: string;
  whatsappNumber: string;
  idCardNumber: string;
  description: string;
}): Promise<{ success: boolean; applicationId?: string; error?: string }> {
  try {
    const cleanPhone = sanitizeWhatsappNumber(params.phoneNumber);
    const cleanWhatsapp = sanitizeWhatsappNumber(params.whatsappNumber || params.phoneNumber);
    if (!cleanPhone) {
      return { success: false, error: 'Please enter a valid Phone Number (include country code, e.g. +923001234567).' };
    }
    if (!cleanWhatsapp) {
      return { success: false, error: 'Please enter a valid WhatsApp Number (7-15 digits).' };
    }
    if (params.fullName.trim().length < 2) {
      return { success: false, error: 'Please enter your full name.' };
    }
    if (params.agencyName.trim().length < 2) {
      return { success: false, error: 'Please enter your desired agency name.' };
    }
    if (params.username.trim().length < 2) {
      return { success: false, error: 'Please enter your username.' };
    }
    if (params.idCardNumber.trim().length < 5) {
      return { success: false, error: 'Please enter a valid ID Card / CNIC number.' };
    }
    if (params.description.trim().length < 5) {
      return { success: false, error: 'Please write a short description about your agency.' };
    }

    // Check if user already has an active agency of this type
    const deterministicId = getDeterministicAgencyId(params.agencyType, params.applicantUid);
    const existingAgencySnap = await getDoc(doc(db, 'agencies', deterministicId));
    if (existingAgencySnap.exists() && existingAgencySnap.data()?.status === 'active') {
      return {
        success: false,
        error: `You already own an active ${params.agencyType === 'coin_seller' ? 'Coin Seller Agency' : 'Host Agency'}.`,
      };
    }

    // Prevent duplicate pending application of the same type
    const existingAppsSnap = await getDocs(
      query(collection(db, 'agency_applications'), where('applicantUid', '==', params.applicantUid))
    );
    const hasPending = existingAppsSnap.docs.some((d) => {
      const data = d.data();
      return data.agencyType === params.agencyType && data.status === 'pending';
    });
    if (hasPending) {
      return {
        success: false,
        error: 'You already have a pending application for this agency type. Please wait for Admin review.',
      };
    }

    const appRef = doc(collection(db, 'agency_applications'));
    const nowIso = new Date().toISOString();
    const record: AgencyApplicationRecord = {
      id: appRef.id,
      applicantUid: params.applicantUid,
      applicantDisplayId: params.applicantDisplayId.trim().slice(0, 32),
      agencyType: params.agencyType,
      fullName: params.fullName.trim().slice(0, 80),
      agencyName: params.agencyName.trim().slice(0, 80),
      username: params.username.trim().slice(0, 60),
      phoneNumber: cleanPhone.slice(0, 32),
      whatsappNumber: cleanWhatsapp.slice(0, 32),
      idCardNumber: params.idCardNumber.trim().slice(0, 40),
      description: params.description.trim().slice(0, 600),
      status: 'pending',
      createdAt: nowIso,
      createdAtMillis: Date.now(),
    };

    await setDoc(appRef, record);
    return { success: true, applicationId: appRef.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit agency application.' };
  }
}

export function subscribeMyAgencyApplications(
  uid: string,
  onUpdate: (apps: AgencyApplicationRecord[]) => void
) {
  const q = query(collection(db, 'agency_applications'), where('applicantUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyApplicationRecord))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('My agency applications listener notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeAllAgencyApplications(
  onUpdate: (apps: AgencyApplicationRecord[]) => void
) {
  const collRef = collection(db, 'agency_applications');
  return onSnapshot(
    collRef,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyApplicationRecord))
        .sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return (b.createdAtMillis || 0) - (a.createdAtMillis || 0);
        });
      onUpdate(list);
    },
    (err) => {
      console.warn('All agency applications listener notice:', err);
      onUpdate([]);
    }
  );
}

export async function adminReviewAgencyApplication(params: {
  application: AgencyApplicationRecord;
  decision: 'approved' | 'rejected';
  adminNote?: string;
  initialCoinBalance?: number;
}): Promise<{ success: boolean; agencyId?: string; error?: string }> {
  try {
    const { application, decision } = params;
    const nowIso = new Date().toISOString();
    const appRef = doc(db, 'agency_applications', application.id);

    if (decision === 'rejected') {
      await updateDoc(appRef, {
        status: 'rejected',
        adminNote: (params.adminNote || 'Application rejected by admin.').trim().slice(0, 300),
        reviewedAt: nowIso,
      });
      return { success: true };
    }

    // Approved: create/activate deterministic DualAgency document (NO CNIC / NO PIN stored here)
    const agencyId = getDeterministicAgencyId(application.agencyType, application.applicantUid);
    const agencyRef = doc(db, 'agencies', agencyId);
    const codePrefix = application.agencyType === 'coin_seller' ? 'LP-CS' : 'LP-HA';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const agencyCode = `${codePrefix}-${randomSuffix}`;
    const initialCoins =
      application.agencyType === 'coin_seller'
        ? Math.max(0, Math.floor(Number(params.initialCoinBalance || 0)))
        : 0;

    // Try to fetch applicant avatar safely
    let ownerAvatar = '';
    try {
      const userSnap = await getDoc(doc(db, 'users', application.applicantUid));
      if (userSnap.exists()) {
        ownerAvatar = String(userSnap.data()?.profileImage || userSnap.data()?.avatar || '').slice(0, 1500);
      }
    } catch {
      // Ignore avatar lookup error
    }

    await runTransaction(db, async (tx) => {
      const existingAgency = await tx.get(agencyRef);
      if (existingAgency.exists()) {
        const prev = existingAgency.data();
        tx.update(agencyRef, {
          name: application.agencyName.trim().slice(0, 80),
          ownerName: application.fullName.trim().slice(0, 80),
          ownerUsername: application.username.trim().slice(0, 60),
          ownerDisplayId: application.applicantDisplayId.trim().slice(0, 32),
          whatsappNumber: application.whatsappNumber.trim().slice(0, 32),
          description: application.description.trim().slice(0, 600),
          status: 'active',
          isVerified: true,
          isOnline: true,
          coinBalance:
            application.agencyType === 'coin_seller'
              ? Number(prev.coinBalance || 0) + initialCoins
              : 0,
          updatedAt: nowIso,
        });
      } else {
        const newAgency: DualAgencyRecord = {
          id: agencyId,
          agencyType: application.agencyType,
          name: application.agencyName.trim().slice(0, 80),
          agencyCode,
          ownerUid: application.applicantUid,
          ownerName: application.fullName.trim().slice(0, 80),
          ownerUsername: application.username.trim().slice(0, 60),
          ownerDisplayId: application.applicantDisplayId.trim().slice(0, 32),
          ownerAvatar,
          whatsappNumber: application.whatsappNumber.trim().slice(0, 32),
          description: application.description.trim().slice(0, 600),
          status: 'active',
          isVerified: true,
          isOnline: true,
          coinBalance: initialCoins,
          totalTransferredCoins: 0,
          totalHosts: 0,
          hasPin: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        tx.set(agencyRef, newAgency);
      }

      tx.update(appRef, {
        status: 'approved',
        adminNote: (params.adminNote || 'Approved & Activated by Admin').trim().slice(0, 300),
        createdAgencyId: agencyId,
        reviewedAt: nowIso,
      });
    });

    return { success: true, agencyId };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to review agency application.' };
  }
}

// ============================================================
// 2. ACTIVE AGENCIES & OWNER / ADMIN MANAGEMENT
// ============================================================

export function subscribeActiveAgencies(
  agencyType: DualAgencyType | 'all',
  onUpdate: (agencies: DualAgencyRecord[]) => void
) {
  const collRef = collection(db, 'agencies');
  const q =
    agencyType === 'all'
      ? query(collRef, where('status', '==', 'active'))
      : query(collRef, where('agencyType', '==', agencyType), where('status', '==', 'active'));

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as DualAgencyRecord))
        .sort((a, b) => {
          if (agencyType === 'all' && a.agencyType !== b.agencyType) {
            return a.agencyType === 'coin_seller' ? -1 : 1;
          }
          if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
        });
      onUpdate(list);
    },
    (err) => {
      console.warn('Active agencies listener notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeAllAgenciesForAdmin(
  onUpdate: (agencies: DualAgencyRecord[]) => void
) {
  const collRef = collection(db, 'agencies');
  return onSnapshot(
    collRef,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as DualAgencyRecord))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Admin agencies listener notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeMyOwnedAgencies(
  uid: string,
  onUpdate: (owned: { coinSeller: DualAgencyRecord | null; hostAgency: DualAgencyRecord | null }) => void
) {
  let coinSeller: DualAgencyRecord | null = null;
  let hostAgency: DualAgencyRecord | null = null;
  const emit = () => onUpdate({ coinSeller, hostAgency });

  const unsubCs = onSnapshot(
    doc(db, 'agencies', getDeterministicAgencyId('coin_seller', uid)),
    (snap) => {
      coinSeller = snap.exists() ? ({ id: snap.id, ...snap.data() } as DualAgencyRecord) : null;
      emit();
    },
    () => {
      coinSeller = null;
      emit();
    }
  );

  const unsubHa = onSnapshot(
    doc(db, 'agencies', getDeterministicAgencyId('host_agency', uid)),
    (snap) => {
      hostAgency = snap.exists() ? ({ id: snap.id, ...snap.data() } as DualAgencyRecord) : null;
      emit();
    },
    () => {
      hostAgency = null;
      emit();
    }
  );

  return () => {
    unsubCs();
    unsubHa();
  };
}

export async function updateAgencyProfile(
  agencyId: string,
  patch: {
    name?: string;
    whatsappNumber?: string;
    description?: string;
    isOnline?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (typeof patch.name === 'string') {
      if (patch.name.trim().length < 2) return { success: false, error: 'Agency name is too short.' };
      updateData.name = patch.name.trim().slice(0, 80);
    }
    if (typeof patch.whatsappNumber === 'string') {
      const cleanWa = sanitizeWhatsappNumber(patch.whatsappNumber);
      if (!cleanWa) return { success: false, error: 'Enter a valid WhatsApp number (include country code).' };
      updateData.whatsappNumber = cleanWa.slice(0, 32);
    }
    if (typeof patch.description === 'string') {
      updateData.description = patch.description.trim().slice(0, 600);
    }
    if (typeof patch.isOnline === 'boolean') {
      updateData.isOnline = patch.isOnline;
    }

    await updateDoc(doc(db, 'agencies', agencyId), updateData);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update agency details.' };
  }
}

export async function adminAdjustAgencyCoinBalance(
  agencyId: string,
  coinDelta: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    const delta = Math.trunc(Number(coinDelta));
    if (!Number.isFinite(delta) || delta === 0) {
      return { success: false, error: 'Enter a valid non-zero coin amount.' };
    }
    const agencyRef = doc(db, 'agencies', agencyId);
    let nextBalance = 0;

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(agencyRef);
      if (!snap.exists()) throw new Error('Agency not found.');
      const data = snap.data();
      if (data.agencyType !== 'coin_seller') {
        throw new Error('Only Coin Seller Agencies hold a transferable coin balance.');
      }
      const prevBalance = Number(data.coinBalance || 0);
      nextBalance = Math.max(0, prevBalance + delta);
      tx.update(agencyRef, {
        coinBalance: nextBalance,
        updatedAt: new Date().toISOString(),
      });
    });

    return { success: true, newBalance: nextBalance };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to adjust agency coin balance.' };
  }
}

export async function adminSetAgencyStatus(
  agencyId: string,
  status: 'active' | 'suspended'
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'agencies', agencyId), {
      status,
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update agency status.' };
  }
}

// ============================================================
// 3. COIN SELLER PERSONAL SECRET TRANSFER PIN (4 or 5 Digits)
// ============================================================

export async function saveAgencySecretPin(params: {
  agencyId: string;
  newPin: string;
  currentPin?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanNew = (params.newPin || '').trim();
    if (!isValidSecretPin(cleanNew)) {
      return { success: false, error: 'PIN must be exactly 4 or 5 digits (numbers only).' };
    }

    const secretRef = doc(db, 'agencies', params.agencyId, 'secrets', 'pin');
    const existingSnap = await getDoc(secretRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      const currentInput = (params.currentPin || '').trim();
      if (!currentInput) {
        return { success: false, error: 'Please enter your current PIN to set a new PIN.' };
      }
      const computedCurrentHash = await hashPinWithSalt(currentInput, String(existingData.pinSalt || ''));
      if (computedCurrentHash !== String(existingData.pinHash || '')) {
        return { success: false, error: 'Current PIN is incorrect.' };
      }
    }

    const salt = generateRandomSaltHex();
    const hash = await hashPinWithSalt(cleanNew, salt);
    const nowIso = new Date().toISOString();

    await setDoc(secretRef, {
      pinHash: hash,
      pinSalt: salt,
      pinLength: cleanNew.length,
      updatedAt: nowIso,
    });

    await updateDoc(doc(db, 'agencies', params.agencyId), {
      hasPin: true,
      updatedAt: nowIso,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save transfer PIN.' };
  }
}

export async function verifyAgencySecretPin(
  agencyId: string,
  pinInput: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const cleanPin = (pinInput || '').trim();
    if (!isValidSecretPin(cleanPin)) {
      return { valid: false, error: 'Enter your 4 or 5 digit secret PIN.' };
    }

    const secretRef = doc(db, 'agencies', agencyId, 'secrets', 'pin');
    const snap = await getDoc(secretRef);
    if (!snap.exists()) {
      return { valid: false, error: 'Please create your 4 or 5 digit personal PIN first before transferring coins.' };
    }

    const data = snap.data();
    const computed = await hashPinWithSalt(cleanPin, String(data.pinSalt || ''));
    if (computed !== String(data.pinHash || '')) {
      return { valid: false, error: 'Incorrect Transfer PIN. Please try again.' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Could not verify PIN.' };
  }
}

// ============================================================
// 4. COIN SELLER USER SEARCH & ATOMIC COIN TRANSFER
// ============================================================

export async function searchUsersForCoinTransfer(
  rawQuery: string,
  excludeUid?: string
): Promise<{ users: TransferRecipientCandidate[]; error?: string }> {
  try {
    const q = (rawQuery || '').trim();
    if (!q) return { users: [] };
    const qLower = q.toLowerCase();
    const qNoAt = qLower.replace(/^@/, '');

    const mapDoc = (id: string, d: any): TransferRecipientCandidate => ({
      uid: String(d.uid || id),
      fullName: String(d.fullName || d.name || 'Lenzo User'),
      username: String(d.username || `@${String(d.displayId || id.slice(0, 6)).toLowerCase()}`),
      displayId: String(d.displayId || id.slice(0, 8).toUpperCase()),
      email: String(d.email || ''),
      avatar: String(d.profileImage || d.avatar || ''),
      level: Number(d.level || 0),
      coins: Number(d.coins || 0),
    });

    const matchesMap = new Map<string, TransferRecipientCandidate>();

    // 1. Direct UID lookup (works instantly for pasted Firebase UIDs)
    // 1. Direct UID lookup (works even if user isn't in the first 300 docs)
    if (/^[a-zA-Z0-9_-]{6,128}$/.test(q)) {
      try {
        const directSnap = await getDoc(doc(db, 'users', q));
        if (directSnap.exists()) {
          const cand = mapDoc(directSnap.id, directSnap.data());
          if (!excludeUid || cand.uid !== excludeUid) {
            matchesMap.set(cand.uid, cand);
          }
        }
      } catch {
        // Continue to targeted queries & collection search
      }
    }

    // 1b. Targeted exact lookups by email, displayId, and username (scales beyond 300 users)
    const exactLookups: Array<Promise<void>> = [];
    const runExactLookup = (field: string, value: string) =>
      getDocs(query(collection(db, 'users'), where(field, '==', value), limit(10)))
        .then((snap) => {
          snap.docs.forEach((docSnap) => {
            const cand = mapDoc(docSnap.id, docSnap.data());
            if (!excludeUid || cand.uid !== excludeUid) {
              matchesMap.set(cand.uid, cand);
            }
          });
        })
        .catch(() => {
          // Non-fatal; collection scan below will still match
        });

    if (qLower.includes('@') && qLower.includes('.')) {
      exactLookups.push(runExactLookup('email', qLower));
      if (q !== qLower) exactLookups.push(runExactLookup('email', q));
    } else {
      exactLookups.push(runExactLookup('displayId', q));
      exactLookups.push(runExactLookup('username', `@${qNoAt}`));
      exactLookups.push(runExactLookup('username', qNoAt));
    }
    await Promise.all(exactLookups);

    // 2. Collection query for partial name / username / email / ID matches
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(300)));
    usersSnap.docs.forEach((docSnap) => {
      const cand = mapDoc(docSnap.id, docSnap.data());
      if (excludeUid && cand.uid === excludeUid) return;
      const uidLow = cand.uid.toLowerCase();
      const dispLow = cand.displayId.toLowerCase();
      const userLow = cand.username.toLowerCase().replace(/^@/, '');
      const nameLow = cand.fullName.toLowerCase();
      const emailLow = cand.email.toLowerCase();

      if (
        uidLow.includes(qLower) ||
        dispLow.includes(qLower) ||
        userLow.includes(qNoAt) ||
        nameLow.includes(qLower) ||
        emailLow.includes(qLower)
      ) {
        matchesMap.set(cand.uid, cand);
      }
    });

    const results = Array.from(matchesMap.values()).sort((a, b) => {
      const aExact =
        a.uid.toLowerCase() === qLower ||
        a.displayId.toLowerCase() === qLower ||
        a.username.toLowerCase().replace(/^@/, '') === qNoAt ||
        a.email.toLowerCase() === qLower;
      const bExact =
        b.uid.toLowerCase() === qLower ||
        b.displayId.toLowerCase() === qLower ||
        b.username.toLowerCase().replace(/^@/, '') === qNoAt ||
        b.email.toLowerCase() === qLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.fullName.localeCompare(b.fullName);
    });

    return { users: results.slice(0, 20) };
  } catch (err: any) {
    return { users: [], error: err?.message || 'Unable to search users right now.' };
  }
}

export async function transferCoinsFromAgency(params: {
  agencyId: string;
  recipient: TransferRecipientCandidate;
  amount: number;
  pin: string;
  note?: string;
}): Promise<{ success: boolean; newAgencyBalance?: number; error?: string }> {
  try {
    const senderUid = auth.currentUser?.uid;
    if (!senderUid) {
      return { success: false, error: 'Please sign in to transfer coins.' };
    }

    const coinAmount = Math.floor(Number(params.amount));
    if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
      return { success: false, error: 'Enter a valid coin amount greater than 0.' };
    }
    if (params.recipient.uid === senderUid) {
      return { success: false, error: 'You cannot transfer agency coins to your own account.' };
    }

    // Step 1: Verify Owner's Personal Secret PIN before touching balances
    const pinCheck = await verifyAgencySecretPin(params.agencyId, params.pin);
    if (!pinCheck.valid) {
      return { success: false, error: pinCheck.error || 'Invalid PIN.' };
    }

    const agencyRef = doc(db, 'agencies', params.agencyId);
    const recipientUserRef = doc(db, 'users', params.recipient.uid);
    const recipientWalletRef = doc(db, 'wallets', params.recipient.uid);
    const nowIso = new Date().toISOString();
    const nowMillis = Date.now();
    let updatedAgencyBalance = 0;

    // Step 2: Atomic Firestore Transaction (enforced identically by firestore.rules get/getAfter!)
    await runTransaction(db, async (tx) => {
      const [agencySnap, recipientUserSnap, recipientWalletSnap] = await Promise.all([
        tx.get(agencyRef),
        tx.get(recipientUserRef),
        tx.get(recipientWalletRef),
      ]);

      if (!agencySnap.exists()) {
        throw new Error('Coin Seller Agency not found.');
      }
      const agencyData = agencySnap.data();
      if (agencyData.ownerUid !== senderUid || agencyData.agencyType !== 'coin_seller') {
        throw new Error('Only the approved Coin Seller Agency owner can transfer coins.');
      }
      if (agencyData.status !== 'active') {
        throw new Error('Your Coin Seller Agency is currently suspended.');
      }
      if (!recipientUserSnap.exists()) {
        throw new Error('Recipient account not found in Firestore.');
      }

      const currentAgencyBalance = Number(agencyData.coinBalance || 0);
      const prevTransferred = Number(agencyData.totalTransferredCoins || 0);
      if (currentAgencyBalance < coinAmount) {
        throw new Error(
          `Insufficient Agency Balance. Available: ${currentAgencyBalance.toLocaleString()} coins.`
        );
      }

      updatedAgencyBalance = currentAgencyBalance - coinAmount;

      // 1) Deduct from agencies/{cs_senderUid}
      tx.update(agencyRef, {
        coinBalance: updatedAgencyBalance,
        totalTransferredCoins: prevTransferred + coinAmount,
        updatedAt: nowIso,
      });

      // 2) Credit users/{recipientUid}.coins (ONLY 'coins' affected to satisfy security rule)
      const prevUserCoins = Number(recipientUserSnap.data()?.coins || 0);
      tx.update(recipientUserRef, {
        coins: prevUserCoins + coinAmount,
      });

      // 3) Credit wallets/{recipientUid}
      if (recipientWalletSnap.exists()) {
        const wData = recipientWalletSnap.data();
        const prevWalletCoins = Number(wData.walletPurchasedCoins || 0);
        const prevTotalPurchased = Number(wData.totalCoinsPurchased || 0);
        tx.update(recipientWalletRef, {
          userId: params.recipient.uid,
          walletPurchasedCoins: prevWalletCoins + coinAmount,
          totalCoinsPurchased: prevTotalPurchased + coinAmount,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(recipientWalletRef, {
          userId: params.recipient.uid,
          walletPurchasedCoins: coinAmount,
          totalCoinsPurchased: coinAmount,
          totalCoinsSpent: 0,
          updatedAt: serverTimestamp(),
        });
      }

      // 4) Record wallet_transactions entry for recipient's Wallet history
      const walletTxRef = doc(collection(db, 'wallet_transactions'));
      tx.set(walletTxRef, {
        id: walletTxRef.id,
        userId: params.recipient.uid,
        category: 'coin_purchase',
        balanceType: 'wallet',
        amount: coinAmount,
        status: 'completed',
        description: `Coins received from ${agencyData.name} (${agencyData.agencyCode})${params.note ? ` — ${params.note.trim().slice(0, 80)}` : ''}`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: nowMillis,
      });

      // 5) Record immutable agency_coin_transfers audit entry
      const transferRef = doc(collection(db, 'agency_coin_transfers'));
      const transferRecord: AgencyCoinTransferRecord = {
        id: transferRef.id,
        agencyId: params.agencyId,
        agencyName: String(agencyData.name || 'Coin Seller Agency'),
        senderUid,
        recipientUid: params.recipient.uid,
        recipientName: params.recipient.fullName.slice(0, 80),
        recipientUsername: params.recipient.username.slice(0, 60),
        recipientDisplayId: params.recipient.displayId.slice(0, 32),
        recipientAvatar: params.recipient.avatar.slice(0, 1500),
        amount: coinAmount,
        balanceAfter: updatedAgencyBalance,
        note: (params.note || '').trim().slice(0, 200),
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      };
      tx.set(transferRef, transferRecord);
    });

    return { success: true, newAgencyBalance: updatedAgencyBalance };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Coin transfer failed. Please try again.' };
  }
}

export function subscribeAgencyCoinTransfers(
  senderUid: string,
  onUpdate: (transfers: AgencyCoinTransferRecord[]) => void
) {
  const q = query(
    collection(db, 'agency_coin_transfers'),
    where('senderUid', '==', senderUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyCoinTransferRecord))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
        .slice(0, 50);
      onUpdate(list);
    },
    (err) => {
      console.warn('Agency transfers listener notice:', err);
      onUpdate([]);
    }
  );
}

// ============================================================
// 5. HOST AGENCY REQUESTS, PENDING QUEUE & CONTRACT DEALS
// ============================================================

export async function sendHostJoinRequest(params: {
  agency: DualAgencyRecord;
  hostUser: UserProfile;
  hostWhatsapp: string;
  message: string;
}): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    if (params.agency.agencyType !== 'host_agency' || params.agency.status !== 'active') {
      return { success: false, error: 'This Host Agency is not currently accepting requests.' };
    }
    if (params.agency.ownerUid === params.hostUser.id) {
      return { success: false, error: 'You are already the owner of this Host Agency.' };
    }

    const cleanWa = sanitizeWhatsappNumber(params.hostWhatsapp);
    if (!cleanWa) {
      return { success: false, error: 'Please enter a valid WhatsApp number so the agency holder can contact you.' };
    }

    // Check for duplicate active/pending request with this agency
    const existingSnap = await getDocs(
      query(collection(db, 'agency_host_requests'), where('hostUid', '==', params.hostUser.id))
    );
    const alreadyActive = existingSnap.docs.some((d) => {
      const data = d.data();
      return (
        data.agencyId === params.agency.id &&
        (data.status === 'pending' || data.status === 'accepted')
      );
    });
    if (alreadyActive) {
      return {
        success: false,
        error: 'You already have a pending or accepted request with this Host Agency.',
      };
    }

    const reqRef = doc(collection(db, 'agency_host_requests'));
    const nowIso = new Date().toISOString();
    const record: AgencyHostRequestRecord = {
      id: reqRef.id,
      agencyId: params.agency.id,
      agencyName: params.agency.name.slice(0, 80),
      agencyOwnerUid: params.agency.ownerUid,
      agencyWhatsapp: params.agency.whatsappNumber.slice(0, 32),
      hostUid: params.hostUser.id,
      hostName: (params.hostUser.name || 'Host').slice(0, 80),
      hostUsername: (params.hostUser.username || `@${params.hostUser.displayId}`).slice(0, 60),
      hostDisplayId: (params.hostUser.displayId || params.hostUser.id.slice(0, 8)).slice(0, 32),
      hostAvatar: (params.hostUser.avatar || '').slice(0, 1500),
      hostWhatsapp: cleanWa.slice(0, 32),
      message: (params.message || 'Interested in joining your Host Agency.').trim().slice(0, 400),
      status: 'pending',
      dealCommissionPercent: 0,
      dealTargetCoins: 0,
      dealTargetHours: 0,
      dealNotes: '',
      createdAt: nowIso,
      createdAtMillis: Date.now(),
      updatedAt: nowIso,
    };

    await setDoc(reqRef, record);
    return { success: true, requestId: reqRef.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send host join request.' };
  }
}

export function subscribeHostAgencyRequestsForOwner(
  agencyOwnerUid: string,
  onUpdate: (requests: AgencyHostRequestRecord[]) => void
) {
  const q = query(
    collection(db, 'agency_host_requests'),
    where('agencyOwnerUid', '==', agencyOwnerUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyHostRequestRecord))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('Owner host requests listener notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeMyHostRequests(
  hostUid: string,
  onUpdate: (requests: AgencyHostRequestRecord[]) => void
) {
  const q = query(
    collection(db, 'agency_host_requests'),
    where('hostUid', '==', hostUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyHostRequestRecord))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0));
      onUpdate(list);
    },
    (err) => {
      console.warn('My host requests listener notice:', err);
      onUpdate([]);
    }
  );
}

export async function acceptHostRequestWithDeal(params: {
  request: AgencyHostRequestRecord;
  dealCommissionPercent: number;
  dealTargetCoins: number;
  dealTargetHours: number;
  dealNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const pct = Math.min(100, Math.max(0, Number(params.dealCommissionPercent)));
    const targetCoins = Math.max(0, Math.floor(Number(params.dealTargetCoins)));
    const targetHours = Math.min(744, Math.max(0, Number(params.dealTargetHours)));

    if (!Number.isFinite(pct) || !Number.isFinite(targetCoins) || !Number.isFinite(targetHours)) {
      return { success: false, error: 'Please enter valid numbers for commission %, target, and hours.' };
    }

    const reqRef = doc(db, 'agency_host_requests', params.request.id);
    const agencyRef = doc(db, 'agencies', params.request.agencyId);
    const nowIso = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const [reqSnap, agencySnap] = await Promise.all([tx.get(reqRef), tx.get(agencyRef)]);
      if (!reqSnap.exists()) throw new Error('Host request not found.');
      const wasAccepted = reqSnap.data()?.status === 'accepted';

      tx.update(reqRef, {
        status: 'accepted',
        dealCommissionPercent: pct,
        dealTargetCoins: targetCoins,
        dealTargetHours: targetHours,
        dealNotes: (params.dealNotes || '').trim().slice(0, 300),
        updatedAt: nowIso,
      });

      if (!wasAccepted && agencySnap.exists()) {
        const currentHosts = Number(agencySnap.data()?.totalHosts || 0);
        tx.update(agencyRef, {
          totalHosts: currentHosts + 1,
          updatedAt: nowIso,
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to accept host request.' };
  }
}

export async function updateHostDealTerms(params: {
  requestId: string;
  dealCommissionPercent: number;
  dealTargetCoins: number;
  dealTargetHours: number;
  dealNotes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const pct = Math.min(100, Math.max(0, Number(params.dealCommissionPercent)));
    const targetCoins = Math.max(0, Math.floor(Number(params.dealTargetCoins)));
    const targetHours = Math.min(744, Math.max(0, Number(params.dealTargetHours)));

    await updateDoc(doc(db, 'agency_host_requests', params.requestId), {
      dealCommissionPercent: pct,
      dealTargetCoins: targetCoins,
      dealTargetHours: targetHours,
      dealNotes: (params.dealNotes || '').trim().slice(0, 300),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update host deal.' };
  }
}

export async function rejectOrRemoveHostRequest(params: {
  request: AgencyHostRequestRecord;
  nextStatus: 'rejected' | 'removed';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const reqRef = doc(db, 'agency_host_requests', params.request.id);
    const agencyRef = doc(db, 'agencies', params.request.agencyId);
    const nowIso = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const [reqSnap, agencySnap] = await Promise.all([tx.get(reqRef), tx.get(agencyRef)]);
      if (!reqSnap.exists()) throw new Error('Host request not found.');
      const wasAccepted = reqSnap.data()?.status === 'accepted';

      tx.update(reqRef, {
        status: params.nextStatus,
        updatedAt: nowIso,
      });

      if (wasAccepted && agencySnap.exists()) {
        const currentHosts = Number(agencySnap.data()?.totalHosts || 0);
        tx.update(agencyRef, {
          totalHosts: Math.max(0, currentHosts - 1),
          updatedAt: nowIso,
        });
      }
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update host request.' };
  }
}

export async function cancelMyPendingHostRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'agency_host_requests', requestId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel request.' };
  }
}

// ============================================================
// 6. COIN PURCHASE ORDERS & PAYMENT SLIPS (In-App + WhatsApp)
// ============================================================

export interface AgencyCoinOrderRecord {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyCode: string;
  agencyOwnerUid: string;
  agencyWhatsapp: string;
  buyerUid: string;
  buyerName: string;
  buyerUsername: string;
  buyerDisplayId: string;
  buyerAvatar?: string;
  buyerWhatsapp: string;
  coinsRequested: number;
  coinsSent?: number;
  paidAmountText?: string;
  paymentMethod: string;
  transactionRef?: string;
  paymentSlipUrl?: string;
  buyerNote?: string;
  sellerNote?: string;
  confirmedTransferId?: string;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  createdAt: string;
  createdAtMillis: number;
  updatedAt: string;
}

export async function submitCoinPurchaseSlipOrder(params: {
  agency: DualAgencyRecord;
  buyer: UserProfile;
  coinsRequested: number;
  paidAmountText?: string;
  paymentMethod: string;
  transactionRef?: string;
  paymentSlipUrl?: string;
  buyerWhatsapp?: string;
  buyerNote?: string;
}): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    if (params.agency.agencyType !== 'coin_seller' || params.agency.status !== 'active') {
      return { success: false, error: 'This Coin Seller Agency is currently unavailable.' };
    }
    if (params.agency.ownerUid === params.buyer.id) {
      return { success: false, error: 'You cannot submit a coin order to your own agency.' };
    }
    const coins = Math.floor(Number(params.coinsRequested));
    if (!Number.isFinite(coins) || coins <= 0) {
      return { success: false, error: 'Enter a valid number of coins to request.' };
    }
    if (!params.paymentSlipUrl && !(params.transactionRef || '').trim()) {
      return {
        success: false,
        error: 'Please upload your Payment Slip image or enter the Transaction / Reference ID.',
      };
    }

    const orderRef = doc(collection(db, 'agency_coin_orders'));
    const nowIso = new Date().toISOString();
    const record: AgencyCoinOrderRecord = {
      id: orderRef.id,
      agencyId: params.agency.id,
      agencyName: params.agency.name.slice(0, 80),
      agencyCode: params.agency.agencyCode.slice(0, 24),
      agencyOwnerUid: params.agency.ownerUid,
      agencyWhatsapp: params.agency.whatsappNumber.slice(0, 32),
      buyerUid: params.buyer.id,
      buyerName: (params.buyer.name || 'Buyer').slice(0, 80),
      buyerUsername: (params.buyer.username || `@${params.buyer.displayId}`).slice(0, 60),
      buyerDisplayId: (params.buyer.displayId || params.buyer.id.slice(0, 8)).slice(0, 32),
      buyerAvatar: (params.buyer.avatar || '').slice(0, 1500),
      buyerWhatsapp: (params.buyerWhatsapp || '').trim().slice(0, 32),
      coinsRequested: coins,
      paidAmountText: (params.paidAmountText || '').trim().slice(0, 60),
      paymentMethod: (params.paymentMethod || 'JazzCash').trim().slice(0, 40),
      transactionRef: (params.transactionRef || '').trim().slice(0, 120),
      paymentSlipUrl: (params.paymentSlipUrl || '').slice(0, 350000),
      buyerNote: (params.buyerNote || '').trim().slice(0, 300),
      status: 'pending',
      createdAt: nowIso,
      createdAtMillis: Date.now(),
      updatedAt: nowIso,
    };

    await setDoc(orderRef, record);
    return { success: true, orderId: orderRef.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit payment slip order.' };
  }
}

export function subscribeBuyerCoinOrders(
  buyerUid: string,
  onUpdate: (orders: AgencyCoinOrderRecord[]) => void
) {
  const q = query(collection(db, 'agency_coin_orders'), where('buyerUid', '==', buyerUid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyCoinOrderRecord))
        .sort((a, b) => (b.createdAtMillis || 0) - (a.createdAtMillis || 0))
        .slice(0, 30);
      onUpdate(list);
    },
    (err) => {
      console.warn('Buyer coin orders listener notice:', err);
      onUpdate([]);
    }
  );
}

export function subscribeAgencyCoinOrdersForSeller(
  agencyOwnerUid: string,
  onUpdate: (orders: AgencyCoinOrderRecord[]) => void
) {
  const q = query(
    collection(db, 'agency_coin_orders'),
    where('agencyOwnerUid', '==', agencyOwnerUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as AgencyCoinOrderRecord))
        .sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return (b.createdAtMillis || 0) - (a.createdAtMillis || 0);
        })
        .slice(0, 50);
      onUpdate(list);
    },
    (err) => {
      console.warn('Seller coin orders listener notice:', err);
      onUpdate([]);
    }
  );
}

export async function confirmCoinOrderAndSendCoins(params: {
  order: AgencyCoinOrderRecord;
  coinsToSend: number;
  pin: string;
  sellerNote?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const sellerUid = auth.currentUser?.uid;
    if (!sellerUid) return { success: false, error: 'Please sign in first.' };

    const coinAmount = Math.floor(Number(params.coinsToSend));
    if (!Number.isFinite(coinAmount) || coinAmount <= 0) {
      return { success: false, error: 'Enter a valid positive coin amount to send.' };
    }

    const pinCheck = await verifyAgencySecretPin(params.order.agencyId, params.pin);
    if (!pinCheck.valid) {
      return { success: false, error: pinCheck.error || 'Incorrect Transfer PIN.' };
    }

    const agencyRef = doc(db, 'agencies', params.order.agencyId);
    const orderRef = doc(db, 'agency_coin_orders', params.order.id);
    const buyerUserRef = doc(db, 'users', params.order.buyerUid);
    const buyerWalletRef = doc(db, 'wallets', params.order.buyerUid);
    const nowIso = new Date().toISOString();
    const nowMillis = Date.now();

    await runTransaction(db, async (tx) => {
      const [agencySnap, orderSnap, buyerUserSnap, buyerWalletSnap] = await Promise.all([
        tx.get(agencyRef),
        tx.get(orderRef),
        tx.get(buyerUserRef),
        tx.get(buyerWalletRef),
      ]);

      if (!agencySnap.exists()) throw new Error('Coin Seller Agency not found.');
      if (!orderSnap.exists()) throw new Error('Coin order not found.');
      if (orderSnap.data()?.status !== 'pending') {
        throw new Error('This payment slip order has already been processed.');
      }
      if (!buyerUserSnap.exists()) throw new Error('Buyer account not found.');

      const agencyData = agencySnap.data();
      if (agencyData.ownerUid !== sellerUid || agencyData.status !== 'active') {
        throw new Error('Only the active Coin Seller Agency owner can confirm orders.');
      }

      const currentBal = Number(agencyData.coinBalance || 0);
      const prevTransferred = Number(agencyData.totalTransferredCoins || 0);
      if (currentBal < coinAmount) {
        throw new Error(`Insufficient Agency Balance (${currentBal.toLocaleString()} coins available).`);
      }

      const nextAgencyBal = currentBal - coinAmount;

      // 1) Deduct from agency balance
      tx.update(agencyRef, {
        coinBalance: nextAgencyBal,
        totalTransferredCoins: prevTransferred + coinAmount,
        updatedAt: nowIso,
      });

      // 2) Credit buyer users/{uid}.coins
      const prevUserCoins = Number(buyerUserSnap.data()?.coins || 0);
      tx.update(buyerUserRef, {
        coins: prevUserCoins + coinAmount,
      });

      // 3) Credit buyer wallets/{uid}
      if (buyerWalletSnap.exists()) {
        const wData = buyerWalletSnap.data();
        tx.update(buyerWalletRef, {
          userId: params.order.buyerUid,
          walletPurchasedCoins: Number(wData.walletPurchasedCoins || 0) + coinAmount,
          totalCoinsPurchased: Number(wData.totalCoinsPurchased || 0) + coinAmount,
          updatedAt: serverTimestamp(),
        });
      } else {
        tx.set(buyerWalletRef, {
          userId: params.order.buyerUid,
          walletPurchasedCoins: coinAmount,
          totalCoinsPurchased: coinAmount,
          totalCoinsSpent: 0,
          updatedAt: serverTimestamp(),
        });
      }

      // 4) Record wallet_transactions entry
      const walletTxRef = doc(collection(db, 'wallet_transactions'));
      tx.set(walletTxRef, {
        id: walletTxRef.id,
        userId: params.order.buyerUid,
        category: 'coin_purchase',
        balanceType: 'wallet',
        amount: coinAmount,
        status: 'completed',
        description: `Slip Order Confirmed by ${agencyData.name} (${agencyData.agencyCode})`,
        timestamp: new Date().toLocaleString(),
        timestampMillis: nowMillis,
      });

      // 5) Record agency_coin_transfers audit entry
      const transferRef = doc(collection(db, 'agency_coin_transfers'));
      tx.set(transferRef, {
        id: transferRef.id,
        agencyId: params.order.agencyId,
        agencyName: String(agencyData.name || 'Coin Seller Agency'),
        senderUid: sellerUid,
        recipientUid: params.order.buyerUid,
        recipientName: params.order.buyerName,
        recipientUsername: params.order.buyerUsername,
        recipientDisplayId: params.order.buyerDisplayId,
        recipientAvatar: params.order.buyerAvatar || '',
        amount: coinAmount,
        balanceAfter: nextAgencyBal,
        note: `Order #${params.order.id.slice(-6).toUpperCase()} (${params.order.paymentMethod})`,
        createdAt: nowIso,
        createdAtMillis: nowMillis,
      });

      // 6) Mark payment slip order confirmed atomically
      tx.update(orderRef, {
        status: 'confirmed',
        coinsSent: coinAmount,
        confirmedTransferId: transferRef.id,
        sellerNote: (params.sellerNote || 'Payment slip verified & coins transferred!').trim().slice(0, 300),
        updatedAt: nowIso,
      });
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to confirm order & transfer coins.' };
  }
}

export async function rejectCoinOrder(
  orderId: string,
  sellerNote?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'agency_coin_orders', orderId), {
      status: 'rejected',
      sellerNote: (sellerNote || 'Payment slip could not be verified.').trim().slice(0, 300),
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reject order.' };
  }
}

export async function cancelMyPendingCoinOrder(
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'agency_coin_orders', orderId), {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel order.' };
  }
}
