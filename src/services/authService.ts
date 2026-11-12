import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';

export interface FirestoreUserData {
  uid: string;
  fullName: string;
  email: string;
  profileImage?: string;
  authProvider: 'google' | 'password';
  createdAt: string;
  lastLogin: string;
  isOnline: boolean;
  followersCount: number;
  followingCount: number;
  level: number;
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
  const displayId = data.uid.substring(0, 6).toUpperCase();
  const rawEmailName = data.email ? data.email.split('@')[0] : 'user';
  const username = `@${rawEmailName.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;

  return {
    id: data.uid,
    displayId: displayId,
    name: data.fullName || fallbackUser?.displayName || 'Linzo Star',
    username: username,
    avatar: data.profileImage || fallbackUser?.photoURL || DEFAULT_AVATARS[0],
    coverImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80',
    bio: '🎵 Living in the moment on Linzo Party Live! ✨ Drop gifts & let vibes flow! 💖',
    level: data.level || 1,
    currentExp: 150,
    nextLevelExp: 500,
    vipLevel: 1,
    isVIP: false,
    fansCount: (data.followersCount || 0).toLocaleString(),
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    likesCount: '1.2K',
    totalLikes: 1200,
    coins: 5000,
    diamonds: 200,
    gender: 'unspecified',
    country: 'Global',
    isFollowing: false,
  };
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
      // User exists: update lastLogin and online status
      const existingData = existingSnap.data() as FirestoreUserData;
      const updatePayload: Partial<FirestoreUserData> = {
        lastLogin: now,
        isOnline: true,
      };

      if (extra?.fullName && !existingData.fullName) {
        updatePayload.fullName = extra.fullName;
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
      // New user: create comprehensive Firestore record
      const newUserData: FirestoreUserData = {
        uid: user.uid,
        fullName: extra?.fullName || user.displayName || 'Linzo User',
        email: user.email || '',
        profileImage: extra?.profileImage || user.photoURL || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
        authProvider: authProvider,
        createdAt: now,
        lastLogin: now,
        isOnline: true,
        followersCount: 0,
        followingCount: 0,
        level: 1,
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

/**
 * Check if the user is returning from a Google redirect authentication flow
 */
export async function checkRedirectAuthResult(): Promise<UserProfile | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      console.log('[Google Auth] Successfully received redirect authentication for UID:', result.user.uid);
      const firestoreData = await syncUserInFirestore(result.user, 'google', {
        fullName: result.user.displayName || undefined,
        profileImage: result.user.photoURL || undefined,
      });
      return mapFirestoreUserToProfile(firestoreData, result.user);
    }
  } catch (err: any) {
    console.error('[Google Redirect Result Error]:', err);
    if (err.code === 'auth/unauthorized-domain') {
      console.error(
        `[Firebase Auth] Domain unauthorized: "${window.location.hostname}" must be added to Authorized domains in Firebase Console (project confident-drake-3bcxw).`
      );
    }
  }
  return null;
}

/**
 * REAL Google Sign-In via Firebase (supports popup and seamless mobile redirect)
 */
export async function signInWithGoogle(): Promise<{ user: FirebaseUser; profile: UserProfile } | null> {
  try {
    // Ensure local persistence for Google login
    await setPersistence(auth, browserLocalPersistence);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // On mobile devices or browsers that strictly restrict popups, attempt popup first, fallback to redirect
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const firestoreData = await syncUserInFirestore(user, 'google', {
        fullName: user.displayName || undefined,
        profileImage: user.photoURL || undefined,
      });

      const profile = mapFirestoreUserToProfile(firestoreData, user);
      return { user, profile };
    } catch (popupError: any) {
      // If popup was blocked by browser (especially on mobile), automatically initiate redirect
      if (
        popupError.code === 'auth/popup-blocked' ||
        popupError.code === 'auth/cancelled-popup-request' ||
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
      throw new Error(
        `Domain unauthorized (${currentHost}). Please add "${currentHost}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`
      );
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

    const profile = mapFirestoreUserToProfile(firestoreData, user);
    return { user, profile };
  } catch (error: any) {
    console.error('[Email Register Error]:', error);
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email address already exists. Please log in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
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
    const profile = mapFirestoreUserToProfile(firestoreData, user);
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

export { DEFAULT_AVATARS };
