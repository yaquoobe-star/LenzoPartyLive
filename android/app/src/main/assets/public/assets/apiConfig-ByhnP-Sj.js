import { t as Capacitor } from "./dist-BtMCkNml.js";
import { r as auth } from "./firebase-CcEQ85aw.js";
// src/utils/apiConfig.ts
var DEFAULT_BACKEND_API_ORIGIN = "https://api.lenzoparty.com";
var FRONTEND_PRODUCTION_HOSTS = /* @__PURE__ */ new Set(["lenzoparty.com", "www.lenzoparty.com"]);
/**
* Resolve the Railway Backend API base URL across Web, Cloudflare Production, and Capacitor Android.
* - If VITE_RAILWAY_API_URL or VITE_API_BASE_URL is explicitly defined, always honor it.
* - On Native Android/iOS (Capacitor WebView runs at https://localhost), use https://api.lenzoparty.com.
* - On Cloudflare-hosted Web frontend (lenzoparty.com / www.lenzoparty.com), use https://api.lenzoparty.com.
* - On AI Studio Preview (*.run.app) or localhost:3000 (where Express + Vite share origin), use relative paths.
*/
function getApiBaseUrl() {
	const envBase = "".trim().replace(/\/+$/, "");
	if (envBase.length > 0) {
		try {
			const parsed = new URL(envBase);
			if (FRONTEND_PRODUCTION_HOSTS.has(parsed.hostname.toLowerCase())) return DEFAULT_BACKEND_API_ORIGIN;
		} catch {}
		return envBase;
	}
	if (typeof window !== "undefined") {
		if (Capacitor.isNativePlatform()) return DEFAULT_BACKEND_API_ORIGIN;
		const host = window.location.hostname.toLowerCase();
		if (FRONTEND_PRODUCTION_HOSTS.has(host) || host.endsWith(".pages.dev")) return DEFAULT_BACKEND_API_ORIGIN;
	}
	return "";
}
/**
* Build a full REST API URL for fetch calls.
*/
function apiUrl(path) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	return `${getApiBaseUrl()}${normalizedPath}`;
}
/**
* Resolve stored media URLs so relative /api/* paths work seamlessly across Web,
* Cloudflare Pages, and Capacitor Android WebView while keeping absolute URLs intact.
*/
function resolveMediaUrl(url) {
	if (!url) return "";
	const trimmed = String(url).trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("https://") || trimmed.startsWith("http://") || trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;
	if (/^(javascript|vbscript):/i.test(trimmed)) return "";
	if (trimmed.startsWith("/api/")) return apiUrl(trimmed);
	return trimmed;
}
/**
* Perform an authenticated API request to the shared Express backend (Railway / local server),
* automatically attaching the current Firebase User's ID Token as a Bearer token when available.
*/
async function apiFetch(path, init = {}) {
	const { timeoutMs = 12e3, skipAuth = false, ...fetchInit } = init;
	const headers = new Headers(fetchInit.headers || {});
	if (fetchInit.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
	if (Capacitor.isNativePlatform() && !headers.has("X-Platform")) headers.set("X-Platform", "android");
	if (!skipAuth) try {
		const user = auth.currentUser;
		if (user && !headers.has("Authorization")) {
			const idToken = await user.getIdToken();
			if (idToken) headers.set("Authorization", `Bearer ${idToken}`);
		}
	} catch (e) {
		console.warn("[API] Could not attach Firebase ID token:", e);
	}
	const targetUrl = apiUrl(path);
	const callerSignal = fetchInit.signal;
	let controller = null;
	let timeoutId = null;
	let didTimeout = false;
	let signal = callerSignal ?? void 0;
	const onCallerAbort = () => {
		controller?.abort();
	};
	if (typeof AbortController !== "undefined" && (timeoutMs > 0 || callerSignal)) {
		controller = new AbortController();
		signal = controller.signal;
		if (callerSignal) {
			if (callerSignal.aborted) controller.abort();
			else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
		}
		if (timeoutMs > 0) timeoutId = setTimeout(() => {
			didTimeout = true;
			controller?.abort();
		}, timeoutMs);
	}
	const isSameOriginRequest = !getApiBaseUrl();
	try {
		return await fetch(targetUrl, {
			...fetchInit,
			headers,
			signal,
			...isSameOriginRequest && !fetchInit.credentials ? { credentials: "include" } : {}
		});
	} catch (err) {
		if (callerSignal?.aborted && !didTimeout) {
			const abortErr = /* @__PURE__ */ new Error("Request cancelled.");
			abortErr.name = "AbortError";
			throw abortErr;
		}
		const detail = err?.name === "AbortError" || didTimeout ? `Request timed out after ${timeoutMs}ms (${path})` : `Unable to reach backend (${targetUrl}): ${err?.message || "Network unavailable"}`;
		console.warn("[API]", detail);
		const wrapped = new Error(detail);
		wrapped.cause = err;
		wrapped.isNetworkError = true;
		throw wrapped;
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
		if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
	}
}
/**
* Build a WebSocket URL matching either the Railway/explicit API origin or current browser host.
*/
function getWsUrl(path) {
	const normalizedPath = path.startsWith("/") ? path : `/${path}`;
	const base = getApiBaseUrl();
	if (base) try {
		const parsed = new URL(base);
		return `${parsed.protocol === "https:" ? "wss:" : "ws:"}//${parsed.host}${normalizedPath}`;
	} catch {}
	if (typeof window !== "undefined" && !Capacitor.isNativePlatform()) return `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${normalizedPath}`;
	return `wss://api.lenzoparty.com${normalizedPath}`;
}
export { getWsUrl as a, getApiBaseUrl as i, apiFetch as n, resolveMediaUrl as o, apiUrl as r, DEFAULT_BACKEND_API_ORIGIN as t };
