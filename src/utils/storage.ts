import { UserProfile, Transaction } from '../types';
import { CURRENT_USER } from '../data/mockData';
import { getExpNeededForLevel } from './levelSystem';

const STORAGE_KEY_USER = 'lenzo_party_user_profile_v3';
const STORAGE_KEY_TRANSACTIONS = 'lenzo_party_transactions_v3';

export function getInitialUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return {
      ...CURRENT_USER,
      currentExp: 0,
      nextLevelExp: getExpNeededForLevel(1),
      totalGiftsReceived: 0,
      totalGiftsValue: 0,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      if (parsed && parsed.id && parsed.id !== 'user_current_01' && parsed.username !== '@queensara') {
        return {
          ...CURRENT_USER,
          ...parsed,
          currentExp: typeof parsed.currentExp === 'number' ? parsed.currentExp : 0,
          nextLevelExp: typeof parsed.nextLevelExp === 'number' ? parsed.nextLevelExp : getExpNeededForLevel(parsed.level || 1),
          totalGiftsReceived: typeof parsed.totalGiftsReceived === 'number' ? parsed.totalGiftsReceived : 0,
          totalGiftsValue: typeof parsed.totalGiftsValue === 'number' ? parsed.totalGiftsValue : 0,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to read from localStorage:', err);
  }

  return {
    ...CURRENT_USER,
    currentExp: 0,
    nextLevelExp: getExpNeededForLevel(1),
    totalGiftsReceived: 0,
    totalGiftsValue: 0,
  };
}

export function saveStoredUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const safeProfile: UserProfile = {
      ...profile,
      id: profile.id || CURRENT_USER.id,
      displayId: profile.displayId || CURRENT_USER.displayId,
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
