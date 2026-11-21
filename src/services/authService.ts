import {
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { apiFetch } from '../utils/apiConfig';
import { UserProfile } from '../types';
import { rememberAuthenticatedAccount } from './accountSwitcherService';

interface NativeGoogleAuthPlugin {
  signIn(): Promise<{
    idToken: string;
    email?: string;
    displayName?: string;
    photoUrl?: string;
  }>;
  signOut(): Promise<void>;
}

const NativeGoogleAuth = registerPlugin<NativeGoogleAuthPlugin>('NativeGoogleAuth');

export interface FirestoreUserData {
  uid: string;
  fullName: string;
  email: string;
  username?: string;
  displayId?: string;
  phoneNumber?: string;
  profileImage?: string;
  coverImage?: string;
  bio?: string;
  authProvider: 'google' | 'password';
  providerIds?: string[];
  createdAt: string;
  lastLogin: string;
  lastActiveAt?: string;
  isOnline: boolean;
  followersCount: number;
  followingCount: number;
  level: number;
  coins?: number;
  diamonds?: number;
  vipLevel?: number;
  isVIP?: boolean;
  superVipLevel?: number;
  isSuperVIP?: boolean;
  activeFrameType?: 'none' | 'vip' | 'super_vip';
  equippedVipFrame?: number;
  equippedSuperVipFrame?: number;
  totalQualifyingCoinsSpent?: number;
  unlockedVipTiers?: number[];
  unlockedSuperVipTiers?: number[];
  earnedAchievements?: Array<{ badgeId: string; earnedAt: string; source?: string }>;
  giftsSentCount?: number;
  pkWinsCount?: number;
  eventsWonCount?: number;
  gender?: 'female' | 'male' | 'other' | 'unspecified';
  country?: string;
  birthday?: string;
  showGender?: boolean;
  showAge?: boolean;
  showOnlineStatus?: boolean;
  equippedBadges?: string[];
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
  agencyLogo?: string;
  agencyRole?: 'member' | 'host' | 'manager' | 'founder';
  agencyStatus?: 'none' | 'pending' | 'active';
  crewName?: string;
  crewBadge?: string;
  savedVideoIds?: string[];
  likedVideoIds?: string[];
  liveSessionsHosted?: number;
  loginStreakDays?: number;
  isVerified?: boolean;
  verificationTier?: 'none' | 'blue' | 'gold';
  verifiedTag?: string;
  accountStatus: 'active' | 'suspended' | 'pending';
}

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
];

/**
 * Convert a Firestore user profile document to the app's UserProfile model
 */
export function mapFirestoreUserToProfile(
  data: FirestoreUserData,
  fallbackUser?: FirebaseUser | null
): UserProfile {
  const displayId = data.displayId || data.uid.substring(0, 6).toUpperCase();
  const rawEmailName = data.email ? data.email.split('@')[0] : 'user';
  const username = data.username || `@${rawEmailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
  const vipTier = data.vipLevel ?? data.equippedVipFrame ?? 0;
  const superVipTier = data.superVipLevel ?? data.equippedSuperVipFrame ?? 0;
  const userEmail = data.email || fallbackUser?.email || '';

  return {
    id: data.uid,
    displayId: displayId,
    name: data.fullName || fallbackUser?.displayName || 'User',
    username: username,
    email: userEmail,
    avatar: data.profileImage || fallbackUser?.photoURL || DEFAULT_AVATARS[0],
    coverImage: data.coverImage || '',
    bio: data.bio || '',
    level:
      typeof data.level === 'number'
        ? Math.max(0, Math.min(100, Math.floor(data.level)))
        : 0,
    currentExp: 0,
    nextLevelExp: 1000000,
    totalQualifyingCoinsSpent: data.totalQualifyingCoinsSpent ?? 0,
    vipLevel: vipTier || 0,
    isVIP: data.isVIP ?? vipTier > 0,
    superVipLevel: superVipTier || 0,
    isSuperVIP: data.isSuperVIP ?? superVipTier > 0,
    activeFrameType: data.activeFrameType || (data.equippedSuperVipFrame ? 'super_vip' : data.equippedVipFrame ? 'vip' : 'none'),
    equippedVipFrame: data.equippedVipFrame ?? 0,
    equippedSuperVipFrame: data.equippedSuperVipFrame ?? 0,
    unlockedVipTiers: Array.isArray(data.unlockedVipTiers) ? data.unlockedVipTiers : [],
    unlockedSuperVipTiers: Array.isArray(data.unlockedSuperVipTiers) ? data.unlockedSuperVipTiers : [],
    earnedAchievements: Array.isArray(data.earnedAchievements) ? data.earnedAchievements : [],
    giftsSentCount: data.giftsSentCount ?? 0,
    pkWinsCount: data.pkWinsCount ?? 0,
    eventsWonCount: data.eventsWonCount ?? 0,
    isAdmin: userEmail.toLowerCase() === 'yaquoobe@gmail.com',
    fansCount: (data.followersCount || 0).toLocaleString(),
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    likesCount: '0',
    totalLikes: 0,
    coins: typeof data.coins === 'number' ? data.coins : 0,
    diamonds: typeof data.diamonds === 'number' ? data.diamonds : 0,
    gender: data.gender || 'unspecified',
    country: data.country || '',
    birthday: data.birthday || '',
    isOnline: data.isOnline ?? true,
    showGender: data.showGender ?? true,
    showAge: data.showAge ?? true,
    showOnlineStatus: data.showOnlineStatus ?? true,
    isVerified: data.isVerified,
    verificationTier: data.verificationTier,
    verifiedTag: data.verifiedTag || '',
    equippedBadges: Array.isArray(data.equippedBadges) ? data.equippedBadges.slice(0, 3) : [],
    agencyId: data.agencyId || '',
    agencyName: data.agencyName || '',
    agencyCode: data.agencyCode || '',
    agencyLogo: data.agencyLogo || '',
    agencyRole: data.agencyRole,
    agencyStatus: data.agencyStatus || (data.agencyId ? 'active' : 'none'),
    crewName: data.crewName || '',
    crewBadge: data.crewBadge || '',
    savedVideoIds: Array.isArray(data.savedVideoIds) ? data.savedVideoIds : [],
    likedVideoIds: Array.isArray(data.likedVideoIds) ? data.likedVideoIds : [],
    liveSessionsHosted: data.liveSessionsHosted || 0,
    loginStreakDays: data.loginStreakDays || 1,
    createdAt: data.createdAt,
    isFollowing: false,
  };
}

export const FIREBASE_AUTH_SETTINGS_URL =
  'https://console.firebase.google.com/project/confident-drake-3bcxw/authentication/settings';

function normalizeDisplayName(rawName?: string | null, fallback: string = 'Lenzo User'): string {
  const cleaned = (rawName || fallback).trim().replace(/\s+/g, ' ');
  if (cleaned.length < 2) return fallback;
  return cleaned.slice(0, 60);
}

/**
 * Create or sync user in Firestore `users/{uid}`
 */
export async function syncUserInFirestore(
  user: FirebaseUser,
  authProvider: 'google' | 'password',
  extra?: { fullName?: string; profileImage?: string }
): Promise<FirestoreUserData> {
  const userRef = doc(db, 'users', user.uid);
  const now = new Date().toISOString();

  try {
    const existingSnap = await getDoc(userRef);

    if (existingSnap.exists()) {
      // User exists: preserve permanent UID, coins, level, VIP, createdAt; only refresh session/missing identity fields
      const existingData = existingSnap.data() as FirestoreUserData;
      const providerIds = Array.from(
        new Set(user.providerData.map((p) => p.providerId).filter(Boolean))
      );
      const updatePayload: Partial<FirestoreUserData> = {
        lastLogin: now,
        lastActiveAt: now,
        isOnline: true,
        ...(providerIds.length > 0 ? { providerIds } : {}),
      };

      if (!existingData.displayId) {
        updatePayload.displayId = `LP${user.uid.substring(0, 6).toUpperCase()}`;
      }
      if (!existingData.username) {
        const rawEmailName = (existingData.email || user.email || 'user').split('@')[0];
        updatePayload.username = `@${rawEmailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'lenzouser'}`;
      }
      if (user.phoneNumber && !existingData.phoneNumber) {
        updatePayload.phoneNumber = user.phoneNumber;
      }
      if (!existingData.fullName || existingData.fullName.trim().length < 2) {
        updatePayload.fullName = normalizeDisplayName(extra?.fullName || user.displayName, 'Lenzo User');
      }
      if (extra?.profileImage && !existingData.profileImage) {
        updatePayload.profileImage = extra.profileImage;
      }

      await updateDoc(userRef, updatePayload);
      return {
        ...existingData,
        ...updatePayload,
      };
    } else {
      // New user: create permanent Firestore user record bound to Firebase UID
      const safeFullName = normalizeDisplayName(extra?.fullName || user.displayName, 'Lenzo User');
      const rawEmailName = (user.email || 'user').split('@')[0];
      const generatedUsername = `@${rawEmailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'lenzouser'}`;
      const providerIds = Array.from(
        new Set(user.providerData.map((p) => p.providerId).filter(Boolean))
      );
      const newUserData: FirestoreUserData = {
        uid: user.uid,
        displayId: `LP${user.uid.substring(0, 6).toUpperCase()}`,
        username: generatedUsername,
        fullName: safeFullName,
        email: (user.email || '').slice(0, 120),
        ...(user.phoneNumber ? { phoneNumber: user.phoneNumber } : {}),
        profileImage: (extra?.profileImage || user.photoURL || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]).slice(0, 1500),
        authProvider: authProvider,
        providerIds: providerIds.length > 0 ? providerIds : [authProvider === 'google' ? 'google.com' : 'password'],
        createdAt: now,
        lastLogin: now,
        lastActiveAt: now,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        level: 0,
        coins: 0,
        diamonds: 0,
        vipLevel: 0,
        accountStatus: 'active',
      };

      await setDoc(userRef, newUserData);
      return newUserData;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    throw err;
  }
}

export interface RedirectAuthOutcome {
  profile: UserProfile | null;
  error?: string;
  unauthorizedDomain?: string;
}

/**
 * Check if the user is returning from a Google redirect authentication flow (with error reporting)
 */
export async function checkRedirectAuthOutcome(): Promise<RedirectAuthOutcome> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('[Google Auth] Successfully received redirect authentication for UID:', result.user.uid);
      const firestoreData = await syncUserInFirestore(result.user, 'google', {
        fullName: result.user.displayName || undefined,
        profileImage: result.user.photoURL || undefined,
      });
      await syncBackendAuthSession(result.user);
      const profile = mapFirestoreUserToProfile(firestoreData, result.user);
      rememberAuthenticatedAccount(profile, 'google');
      return { profile };
    }
    return { profile: null };
  } catch (err: any) {
    console.error('[Google Redirect Result Error]:', err);
    if (err.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'lenzoparty.com';
      return {
        profile: null,
        unauthorizedDomain: currentHost,
        error: `Google Sign-In is blocked because "${currentHost}" is not yet added to Firebase Console Authorized Domains.`,
      };
    }
    return {
      profile: null,
      error: err?.message || 'Google authentication redirect failed.',
    };
  }
}

/**
 * Check if the user is returning from a Google redirect authentication flow
 */
export async function checkRedirectAuthResult(): Promise<UserProfile | null> {
  const outcome = await checkRedirectAuthOutcome();
  return outcome.profile;
}

async function syncBackendAuthSession(user: FirebaseUser): Promise<void> {
  try {
    const idToken = await user.getIdToken();
    if (!idToken) return;
    await apiFetch('/api/auth/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'X-Platform': Capacitor.isNativePlatform() ? 'android' : 'web',
      },
      body: JSON.stringify({
        uid: user.uid,
        email: user.email || '',
        platform: Capacitor.isNativePlatform() ? 'android' : 'web',
      }),
    });
  } catch (err) {
    console.warn('[Backend Auth Sync] Non-blocking notice:', err);
  }
}

/**
 * REAL Google Sign-In via Native Android Credential/Play Services OR Firebase Web Popup/Redirect
 * Both platforms authenticate into the exact same Firebase project (`confident-drake-3bcxw`) and Firestore DB.
 */
export async function signInWithGoogle(options?: {
  loginHint?: string;
  forceAccountPicker?: boolean;
}): Promise<{ user: FirebaseUser; profile: UserProfile } | null> {
  try {
    await setPersistence(auth, browserLocalPersistence);

    // 1. Native Android (Capacitor): use Google Play Services Native Account Picker -> Firebase signInWithCredential
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      try {
        const nativeRes = await NativeGoogleAuth.signIn();
        if (!nativeRes?.idToken) {
          throw new Error('Google Sign-In did not return an ID token.');
        }

        const credential = GoogleAuthProvider.credential(nativeRes.idToken);
        const result = await signInWithCredential(auth, credential);
        const user = result.user;

        const firestoreData = await syncUserInFirestore(user, 'google', {
          fullName: nativeRes.displayName || user.displayName || undefined,
          profileImage: nativeRes.photoUrl || user.photoURL || undefined,
        });

        await syncBackendAuthSession(user);
        const profile = mapFirestoreUserToProfile(firestoreData, user);
        rememberAuthenticatedAccount(profile, 'google');
        return { user, profile };
      } catch (nativeErr: any) {
        const rawMsg = String(nativeErr?.message || nativeErr || '');
        if (rawMsg.includes('CANCELLED') || rawMsg.includes('12501')) {
          throw new Error('Google Sign-In was cancelled.');
        }
        if (rawMsg.includes('DEVELOPER_ERROR') || rawMsg.includes('status code: 10') || rawMsg.includes('code=10')) {
          // Do not display a hard-coded SHA-1 here: the installed Play build may be signed
          // with a different certificate than the local/upload build. Preserve the real
          // Google Play Services status so support can diagnose the installed artifact.
          throw new Error(
            'Google Sign-In failed with Android DEVELOPER_ERROR (status code 10) for package com.lenzoparty.app. The app is still receiving an OAuth configuration error. Verify that the installed Play release uses the latest google-services.json, that the Play App Signing SHA-1 is registered on this exact Firebase Android app, and that Google provider is enabled in Firebase Authentication. Original error: ' + rawMsg
          );
        }
        throw nativeErr;
      }
    }

    // 2. Web Browser (lenzoparty.com & AI Studio preview): Firebase Google Popup + Redirect fallback
    const provider = new GoogleAuthProvider();
    const customParams: Record<string, string> = {
      prompt: options?.forceAccountPicker === false ? 'none' : 'select_account',
    };
    if (options?.loginHint && options.loginHint.trim()) {
      customParams.login_hint = options.loginHint.trim();
      customParams.prompt = 'select_account';
    }
    provider.setCustomParameters(customParams);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const firestoreData = await syncUserInFirestore(user, 'google', {
        fullName: user.displayName || undefined,
        profileImage: user.photoURL || undefined,
      });

      await syncBackendAuthSession(user);
      const profile = mapFirestoreUserToProfile(firestoreData, user);
      rememberAuthenticatedAccount(profile, 'google');
      return { user, profile };
    } catch (popupError: any) {
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/cancelled-popup-request' ||
        popupError.code === 'auth/operation-not-supported-in-this-environment' ||
        popupError.code === 'auth/internal-error'
      ) {
        console.warn('[Google Auth] Popup restricted, falling back to full-page redirect flow...');
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error('[Google Auth Error]:', error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In was cancelled.');
    } else if (error.code === 'auth/unauthorized-domain') {
      const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'lenzoparty.com';
      const domainError: any = new Error(
        `Google Sign-In blocked on "${currentHost}". Add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains, or sign in with Email below.`
      );
      domainError.code = 'auth/unauthorized-domain';
      domainError.unauthorizedDomain = currentHost;
      throw domainError;
    } else if (error.code === 'auth/account-exists-with-different-credential') {
      throw new Error('An account already exists with this email using password login. Please sign in with Email.');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled. Please contact support.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw new Error(error.message || 'Google Authentication failed.');
  }
}

/**
 * REAL Email & Password Registration via Firebase
 */
export async function registerWithEmail(params: {
  fullName: string;
  email: string;
  password: string;
  profileImage?: string;
}): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  try {
    await setPersistence(auth, browserLocalPersistence);

    const credential = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const user = credential.user;

    // Update Firebase Auth user display name and avatar
    const chosenAvatar = params.profileImage || DEFAULT_AVATARS[0];
    await updateProfile(user, {
      displayName: params.fullName,
      photoURL: chosenAvatar,
    }).catch((e) => console.warn('Could not update Auth display name:', e));

    // Send email verification link
    try {
      await sendEmailVerification(user);
    } catch (verifErr) {
      console.warn('[Firebase] Email verification send notice:', verifErr);
    }

    // Create Firestore document
    const firestoreData = await syncUserInFirestore(user, 'password', {
      fullName: params.fullName,
      profileImage: chosenAvatar,
    });

    await syncBackendAuthSession(user);
    const profile = mapFirestoreUserToProfile(firestoreData, user);
    rememberAuthenticatedAccount(profile, 'password');
    return { user, profile };
  } catch (error: any) {
    console.error('[Email Register Error]:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists. Please log in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication -> Sign-in method, or use Google Login.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw new Error(error.message || 'Registration failed.');
  }
}

/**
 * REAL Email & Password Login via Firebase
 */
export async function loginWithEmail(
  email: string,
  pass: string,
  rememberMe: boolean = true
): Promise<{ user: FirebaseUser; profile: UserProfile }> {
  try {
    await setPersistence(
      auth,
      rememberMe ? browserLocalPersistence : browserSessionPersistence
    );

    const credential = await signInWithEmailAndPassword(auth, email, pass);
    const user = credential.user;

    // Sync lastLogin in Firestore
    const firestoreData = await syncUserInFirestore(user, 'password');
    await syncBackendAuthSession(user);
    const profile = mapFirestoreUserToProfile(firestoreData, user);
    rememberAuthenticatedAccount(profile, 'password');
    return { user, profile };
  } catch (error: any) {
    console.error('[Email Login Error]:', error);
    if (
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      throw new Error('Invalid email or password. Please check your credentials.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/Password sign-in is disabled in Firebase Console. Enable it under Authentication -> Sign-in method, or use Google Login.');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please reset your password or try again later.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw new Error(error.message || 'Login failed.');
  }
}

/**
 * REAL Password Reset Email via Firebase
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('[Password Reset Error]:', error);
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }
    throw new Error(error.message || 'Failed to send password reset email.');
  }
}

/**
 * Resend Email Verification
 */
export async function resendVerification(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('No user is currently signed in.');
  }
  await sendEmailVerification(auth.currentUser);
}

/**
 * REAL Sign Out via Firebase
 */
export async function logoutUser(): Promise<void> {
  try {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { isOnline: false }).catch(() => {});
    }
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
      await NativeGoogleAuth.signOut().catch(() => {});
    }
    await signOut(auth);
  } catch (error: any) {
    console.error('[Sign Out Error]:', error);
    throw new Error(error.message || 'Logout failed.');
  }
}

/**
 * Retrieve user profile from Firestore or current Firebase User
 */
export async function fetchCurrentFirestoreProfile(uid: string): Promise<UserProfile | null> {
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return mapFirestoreUserToProfile(snap.data() as FirestoreUserData, auth.currentUser);
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch user document:', err);
    return null;
  }
}

/**
 * Safe verified provider linking: links Google sign-in to the currently authenticated UID
 * without ever merging unverified accounts.
 */
export async function linkGoogleAccount(): Promise<string[]> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in first before linking a Google account.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await linkWithPopup(user, provider);
    const providerIds = Array.from(
      new Set(result.user.providerData.map((p) => p.providerId).filter(Boolean))
    );
    await updateDoc(doc(db, 'users', user.uid), {
      providerIds,
      lastActiveAt: new Date().toISOString(),
    }).catch(() => {});
    return providerIds;
  } catch (err: any) {
    if (err.code === 'auth/credential-already-in-use') {
      throw new Error('This Google account is already linked to another Lenzo Party account.');
    }
    if (err.code === 'auth/provider-already-linked') {
      return getLinkedAuthProviders();
    }
    if (err.code === 'auth/popup-closed-by-user') {
      throw new Error('Google account linking was cancelled.');
    }
    throw new Error(err?.message || 'Failed to link Google account.');
  }
}

export function getLinkedAuthProviders(): string[] {
  const user = auth.currentUser;
  if (!user) return [];
  return Array.from(new Set(user.providerData.map((p) => p.providerId).filter(Boolean)));
}

export { DEFAULT_AVATARS };
