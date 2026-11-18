import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

const DEFAULT_BACKEND_API_ORIGIN = 'https://api.lenzoparty.com';
const FRONTEND_PRODUCTION_HOSTS = new Set([
  'lenzoparty.com',
  'www.lenzoparty.com',
]);

/**
 * Resolve the Railway Backend API base URL across Web, Cloudflare Production, and Capacitor Android.
 * - If VITE_API_BASE_URL is explicitly defined, always honor it.
 * - On Native Android/iOS (Capacitor WebView runs at https://localhost), use https://api.lenzoparty.com.
 * - On Cloudflare-hosted Web frontend (lenzoparty.com / www.lenzoparty.com), use https://api.lenzoparty.com.
 * - On AI Studio Preview (*.run.app) or localhost:3000 (where Express + Vite share origin), use relative paths.
 */
export function getApiBaseUrl(): string {
  const envBase = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  if (envBase && envBase.trim().length > 0) {
    return envBase.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    if (Capacitor.isNativePlatform()) {
      return DEFAULT_BACKEND_API_ORIGIN;
    }

    const host = window.location.hostname.toLowerCase();
    if (FRONTEND_PRODUCTION_HOSTS.has(host)) {
      return DEFAULT_BACKEND_API_ORIGIN;
    }
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
 * Perform an authenticated API request to the shared Express backend (Railway / local server),
 * automatically attaching the current Firebase User's ID Token as a Bearer token when available.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  try {
    const user = auth.currentUser;
    if (user && !headers.has('Authorization')) {
      const idToken = await user.getIdToken();
      if (idToken) {
        headers.set('Authorization', `Bearer ${idToken}`);
      }
    }
  } catch (e) {
    console.warn('[API] Could not attach Firebase ID token:', e);
  }

  return fetch(apiUrl(path), {
    ...init,
    headers,
  });
}

/**
 * Build a WebSocket URL matching either the Railway/explicit API origin or current browser host.
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

  if (typeof window !== 'undefined' && !Capacitor.isNativePlatform()) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}${normalizedPath}`;
  }

  return `wss://api.lenzoparty.com${normalizedPath}`;
}
