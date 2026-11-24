/**
 * Lenzo Party Live — Permanent Screen Awake Manager
 *
 * Keeps the screen permanently ON during active Live Party Room sessions for:
 *  - Party Host
 *  - Seated Party Participants
 *  - Non-seated Party Listeners
 *
 * Uses reference-counted ownership to prevent duplicate/conflicting Wake Lock calls:
 *  1. Android Native (Capacitor): WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
 *     (never modifies global Android display timeout settings).
 *  2. Web / Mobile Browser: Screen Wake Lock API (navigator.wakeLock.request('screen'))
 *     with automatic lifecycle re-acquisition on visibility/appState resume.
 *
 * Releases automatically when the user leaves the Party Room, closes the session,
 * or the screen unmounts / unloads.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { setNativeKeepScreenOn } from './mediaDeviceHelper';

interface WakeLockSentinelLike {
  released?: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

class ScreenWakeLockManager {
  private activeOwners = new Set<string>();
  private nativeFlagApplied = false;
  private webSentinel: WakeLockSentinelLike | null = null;
  private lifecycleBound = false;
  private acquiringWebLock = false;
  private appStateRemove: (() => Promise<void>) | null = null;

  private bindLifecycleListeners() {
    if (this.lifecycleBound || typeof window === 'undefined') return;
    this.lifecycleBound = true;

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
    window.addEventListener('pagehide', this.handlePageTeardown);
    window.addEventListener('beforeunload', this.handlePageTeardown);

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive && this.activeOwners.size > 0) {
          void this.applyKeepAwake(true);
        }
      })
        .then((handle) => {
          this.appStateRemove = () => handle.remove();
        })
        .catch(() => {});
    }
  }

  private handleVisibilityChange = () => {
    if (typeof document === 'undefined') return;
    if (document.visibilityState === 'visible' && this.activeOwners.size > 0) {
      void this.applyKeepAwake(true);
    }
  };

  private handlePageTeardown = () => {
    if (this.activeOwners.size > 0 || this.nativeFlagApplied || this.webSentinel) {
      this.activeOwners.clear();
      void this.applyKeepAwake(false);
    }
  };

  private async requestWebWakeLock(): Promise<void> {
    if (typeof navigator === 'undefined' || this.acquiringWebLock) return;
    const navAny = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    };
    if (!navAny.wakeLock || typeof navAny.wakeLock.request !== 'function') return;
    if (this.webSentinel && !this.webSentinel.released) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;

    this.acquiringWebLock = true;
    try {
      const sentinel = await navAny.wakeLock.request('screen');
      if (this.activeOwners.size === 0) {
        // Released while request was in-flight
        await sentinel.release().catch(() => {});
        return;
      }
      this.webSentinel = sentinel;
      sentinel.addEventListener?.('release', () => {
        if (this.webSentinel === sentinel) {
          this.webSentinel = null;
        }
      });
    } catch {
      // Some browsers reject Wake Lock until a gesture or when battery saver is active;
      // Android native FLAG_KEEP_SCREEN_ON remains active independently.
    } finally {
      this.acquiringWebLock = false;
    }
  }

  private async releaseWebWakeLock(): Promise<void> {
    const sentinel = this.webSentinel;
    this.webSentinel = null;
    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release();
      } catch {
        // ignore
      }
    }
  }

  private async applyKeepAwake(enabled: boolean): Promise<void> {
    if (enabled) {
      if (Capacitor.isNativePlatform()) {
        this.nativeFlagApplied = true;
        await setNativeKeepScreenOn(true);
      }
      await this.requestWebWakeLock();
    } else {
      if (this.nativeFlagApplied || Capacitor.isNativePlatform()) {
        this.nativeFlagApplied = false;
        await setNativeKeepScreenOn(false);
      }
      await this.releaseWebWakeLock();
    }
  }

  /**
   * Acquire screen awake lock for a specific room/session owner ID.
   * Safe to call repeatedly with the same ownerId (idempotent, no duplicates).
   */
  public async acquire(ownerId: string): Promise<void> {
    if (!ownerId) return;
    this.bindLifecycleListeners();
    const hadOwners = this.activeOwners.size > 0;
    this.activeOwners.add(ownerId);
    if (!hadOwners || !this.nativeFlagApplied || !this.webSentinel) {
      await this.applyKeepAwake(true);
    }
  }

  /**
   * Release screen awake lock for a specific owner ID.
   * Restores normal system screen timeout as soon as no active rooms remain.
   */
  public async release(ownerId: string): Promise<void> {
    if (!ownerId) return;
    this.activeOwners.delete(ownerId);
    if (this.activeOwners.size === 0) {
      await this.applyKeepAwake(false);
    }
  }

  /**
   * Force-release all locks (e.g., on logout or fatal termination).
   */
  public async releaseAll(): Promise<void> {
    this.activeOwners.clear();
    await this.applyKeepAwake(false);
  }

  public isActive(): boolean {
    return this.activeOwners.size > 0;
  }

  public dispose(): void {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.handlePageTeardown);
      window.removeEventListener('beforeunload', this.handlePageTeardown);
    }
    if (this.appStateRemove) {
      void this.appStateRemove().catch(() => {});
      this.appStateRemove = null;
    }
    this.lifecycleBound = false;
    void this.releaseAll();
  }
}

export const screenWakeLockManager = new ScreenWakeLockManager();

export const acquirePartyScreenWakeLock = (ownerId: string) =>
  screenWakeLockManager.acquire(ownerId);

export const releasePartyScreenWakeLock = (ownerId: string) =>
  screenWakeLockManager.release(ownerId);
