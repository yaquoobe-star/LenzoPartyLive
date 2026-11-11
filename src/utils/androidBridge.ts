import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export interface AndroidBackActionHandler {
  (): boolean; // Return true if handled, false to delegate
}

class AndroidBridgeService {
  private backHandlers: AndroidBackActionHandler[] = [];
  private isNativeAndroid: boolean = false;

  constructor() {
    this.isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  public initAndroidIntegration(onExitApp?: () => void) {
    if (!this.isNativeAndroid) {
      console.log('[Android Bridge] Running in Web Preview environment. Android hooks simulated.');
      return;
    }

    console.log('[Android Bridge] Initializing native Android environment...');

    // 1. Configure Android Status Bar to match dark purple/navy theme
    try {
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#060212' }).catch(() => {});
    } catch (e) {
      console.warn('[Android Bridge] StatusBar notice:', e);
    }

    // 2. Hide Native Splash Screen after web app bundles load
    try {
      SplashScreen.hide({ fadeOutDuration: 500 }).catch(() => {});
    } catch (e) {
      console.warn('[Android Bridge] SplashScreen notice:', e);
    }

    // 3. Android Hardware Back Button Listener
    try {
      CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Execute topmost back handler first
        for (let i = this.backHandlers.length - 1; i >= 0; i--) {
          const handled = this.backHandlers[i]();
          if (handled) return;
        }

        if (canGoBack) {
          window.history.back();
        } else if (onExitApp) {
          onExitApp();
        } else {
          CapacitorApp.exitApp();
        }
      });
    } catch (e) {
      console.warn('[Android Bridge] Back button registration notice:', e);
    }

    // 4. Keyboard Show/Hide listeners for smooth viewport resizing
    try {
      Keyboard.addListener('keyboardWillShow', (info) => {
        document.body.classList.add('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        document.body.classList.remove('keyboard-open');
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      });
    } catch (e) {
      console.warn('[Android Bridge] Keyboard listener notice:', e);
    }
  }

  /**
   * Register a custom hardware back button handler (e.g. closing an open modal or leaving active stream)
   * Returns an unregister function.
   */
  public registerBackHandler(handler: AndroidBackActionHandler): () => void {
    this.backHandlers.push(handler);
    return () => {
      this.backHandlers = this.backHandlers.filter((h) => h !== handler);
    };
  }

  public isNative(): boolean {
    return this.isNativeAndroid;
  }
}

export const androidBridge = new AndroidBridgeService();
