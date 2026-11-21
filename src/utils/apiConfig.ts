import { Capacitor } from '@capacitor/core';
import { auth } from '../firebase';

const DEFAULT_BACKEND_API_ORIGIN = 'https://api.lenzoparty.com';
const FRONTEND_PRODUCTION_HOSTS = new Set([
  'lenzoparty.com',
  'www.lenzoparty.com',
]);

/**
 * Resolve the Railway Backend API base URL across Web, Cloudflare Production, and Capacitor Android.
 * - If VITE_RAILWAY_API_URL or VITE_API_BASE_URL is explicitly defined, always honor it.
 * - On Native Android/iOS (Capacitor WebView runs at https://localhost), use https://api.lenzoparty.com.
 * - On Cloudflare-hosted Web frontend (lenzoparty.com / www.lenzoparty.com), use https://api.lenzoparty.com.
 * - On AI Studio Preview (*.run.app) or localhost:3000 (where Express + Vite share origin), use relative paths.
 */
export function getApiBaseUrl(): string {
  const railwayUrl = import.meta.env.VITE_RAILWAY_API_URL;
  const legacyBase = import.meta.env.VITE_API_BASE_URL;
  const envBase = railwayUrl || legacyBase;
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
 * Resolve stored media URLs so relative /api/* paths work seamlessly across Web,
 * Cloudflare Pages, and Capacitor Android WebView while keeping absolute URLs intact.
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!trimmed) return '';
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('data:')
  ) {
    return trimmed;
  }
  if (/^(javascript|vbscript):/i.test(trimmed)) {
    return '';
  }
  if (trimmed.startsWith('/api/')) {
    return apiUrl(trimmed);
  }
  return trimmed;
}

/**
 * Perform an authenticated API request to the shared Express backend (Railway / local server),
 * automatically attaching the current Firebase User's ID Token as a Bearer token when available.
 */
export async function apiFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 12000, ...fetchInit } = init;
  const headers = new Headers(fetchInit.headers || {});
  if (fetchInit.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (Capacitor.isNativePlatform() && !headers.has('X-Platform')) {
    headers.set('X-Platform', 'android');
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

  const targetUrl = apiUrl(path);
  const callerSignal = fetchInit.signal;
  let controller: AbortController | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let didTimeout = false;
  let signal: AbortSignal | undefined = callerSignal ?? undefined;

  const onCallerAbort = () => {
    controller?.abort();
  };

  if (typeof AbortController !== 'undefined' && (timeoutMs > 0 || callerSignal)) {
    controller = new AbortController();
    signal = controller.signal;
    if (callerSignal) {
      if (callerSignal.aborted) {
        controller.abort();
      } else {
        callerSignal.addEventListener('abort', onCallerAbort, { once: true });
      }
    }
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller?.abort();
      }, timeoutMs);
    }
  }

  try {
    return await fetch(targetUrl, {
      ...fetchInit,
      headers,
      signal,
    });
  } catch (err: any) {
    if (callerSignal?.aborted && !didTimeout) {
      const abortErr = new Error('Request cancelled.');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    const isAbort = err?.name === 'AbortError' || didTimeout;
    const detail = isAbort
      ? `Request timed out after ${timeoutMs}ms (${path})`
      : `Unable to reach backend (${targetUrl}): ${err?.message || 'Network unavailable'}`;
    console.warn('[API]', detail);
    const wrapped = new Error(detail);
    (wrapped as any).cause = err;
    (wrapped as any).isNetworkError = true;
    throw wrapped;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (callerSignal) {
      callerSignal.removeEventListener('abort', onCallerAbort);
    }
  }
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
