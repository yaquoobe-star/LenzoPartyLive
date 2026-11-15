import { Capacitor } from '@capacitor/core';

const DEFAULT_NATIVE_API_ORIGIN = 'https://lenzoparty.com';

/**
 * Resolve the API base URL across Web and Native Capacitor Android environments.
 * - On Web (lenzoparty.com, localhost:3000, preview), uses relative paths unless VITE_API_BASE_URL overrides it.
 * - On Native Android/iOS (Capacitor WebView runs at https://localhost), uses VITE_API_BASE_URL or https://lenzoparty.com.
 */
export function getApiBaseUrl(): string {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    return DEFAULT_NATIVE_API_ORIGIN;
  }

  return '';
}

/**
 * Build a full REST API URL for fetch calls.
 */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  return `${base}${normalizedPath}`;
}

/**
 * Build a WebSocket URL matching either the explicit/native API origin or current browser host.
 */
export function getWsUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();

  if (base) {
    try {
      const parsed = new URL(base);
      const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${parsed.host}${normalizedPath}`;
    } catch {
      // Fallback below
    }
  }

  if (typeof window !== 'undefined') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${normalizedPath}`;
  }

  return `wss://lenzoparty.com${normalizedPath}`;
}
