import { r as auth } from "./firebase-zc-_OxQs.js";
var AUTHORIZED_ADMIN_EMAIL_SET = /* @__PURE__ */ new Set([
	"saifkhokhar657@gmail.com",
	"lenzopartyofficial@gmail.com",
	"malikyaqoobniaz@gmail.com"
]);
function isAuthorizedAdminEmail(email) {
	if (!email || typeof email !== "string") return false;
	return AUTHORIZED_ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}
/**
* Strict check used before privileged writes requiring verified Firebase token claims.
*/
function isVerifiedAdminSession() {
	const liveUser = auth.currentUser;
	if (!liveUser) return false;
	return isAuthorizedAdminEmail(liveUser.email) && liveUser.emailVerified === true;
}
var DEVICE_ID_STORAGE_KEY = "lenzo_device_id_v1";
function generateSafeDeviceId() {
	try {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `dev_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
	} catch {}
	return `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 10)}`.replace(/[^a-zA-Z0-9_\-]/g, "").slice(0, 48);
}
/**
* Returns a persistent, Firestore-ID-safe device identifier stored on this device.
* Matches `^[a-zA-Z0-9_\-]+$` (max 64 chars) so it can be used directly as `/banned_devices/{deviceId}`.
*/
function getOrCreateDeviceId() {
	if (typeof window === "undefined") return "dev_server";
	try {
		const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);
		if (existing && /^[a-zA-Z0-9_\-]{8,64}$/.test(existing)) return existing;
		const created = generateSafeDeviceId();
		window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, created);
		return created;
	} catch {
		return generateSafeDeviceId();
	}
}
/**
* Returns a short, safe device/platform summary label (max 180 chars) for admin diagnostics.
*/
function getDeviceSummaryLabel() {
	if (typeof navigator === "undefined") return "Unknown Device";
	const ua = navigator.userAgent || "";
	const isAndroid = /Android/i.test(ua);
	const isIOS = /iPhone|iPad|iPod/i.test(ua);
	const platform = typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.()) ? isAndroid ? "Android App" : isIOS ? "iOS App" : "Native App" : isAndroid ? "Android Web" : isIOS ? "iOS Web" : /Windows/i.test(ua) ? "Windows Web" : /Mac/i.test(ua) ? "macOS Web" : /Linux/i.test(ua) ? "Linux Web" : "Web Browser";
	const model = ua.match(/Android\s[\d.]+;\s*([^;)]+)/i)?.[1]?.trim();
	return (model ? `${platform} · ${model}` : platform).replace(/[<>]/g, "").slice(0, 180);
}
export { isVerifiedAdminSession as i, getOrCreateDeviceId as n, isAuthorizedAdminEmail as r, getDeviceSummaryLabel as t };
