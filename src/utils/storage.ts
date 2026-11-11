import { UserProfile, Transaction } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { getExpNeededForLevel } from './levelSystem';

const STORAGE_KEY_USER = 'lonzo_party_user_profile_v2';
const STORAGE_KEY_TRANSACTIONS = 'lonzo_party_transactions_v2';

export function getInitialUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return {
      ...CURRENT_USER,
      username: '@queensara',
      currentExp: 8450,
      nextLevelExp: getExpNeededForLevel(42),
      totalGiftsReceived: 482,
      totalGiftsValue: 96400,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      // Ensure required new fields exist even if legacy storage format
      return {
        ...CURRENT_USER,
        ...parsed,
        username: parsed.username || '@queensara',
        currentExp: typeof parsed.currentExp === 'number' ? parsed.currentExp : 8450,
        nextLevelExp: typeof parsed.nextLevelExp === 'number' ? parsed.nextLevelExp : getExpNeededForLevel(parsed.level || 42),
        totalGiftsReceived: typeof parsed.totalGiftsReceived === 'number' ? parsed.totalGiftsReceived : 482,
        totalGiftsValue: typeof parsed.totalGiftsValue === 'number' ? parsed.totalGiftsValue : 96400,
      };
    }
  } catch (err) {
    console.warn('Failed to read from localStorage:', err);
  }

  return {
    ...CURRENT_USER,
    username: '@queensara',
    currentExp: 8450,
    nextLevelExp: getExpNeededForLevel(42),
    totalGiftsReceived: 482,
    totalGiftsValue: 96400,
  };
}

export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    // Security check: Guard protected fields
    const safeProfile: UserProfile = {
      ...profile,
      id: CURRENT_USER.id, // Immutable internal ID
      displayId: CURRENT_USER.displayId, // Immutable unique account ID
    };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(safeProfile));
  } catch (err) {
    console.error('Failed to save user profile to localStorage:', err);
  }
}

export function loadStoredTransactions(defaultTxs: Transaction[]): Transaction[] {
  if (typeof window === 'undefined') return defaultTxs;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load transactions:', err);
  }
  return defaultTxs;
}

export function saveStoredTransactions(txs: Transaction[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txs));
  } catch (err) {
    console.error('Failed to save transactions:', err);
  }
}
