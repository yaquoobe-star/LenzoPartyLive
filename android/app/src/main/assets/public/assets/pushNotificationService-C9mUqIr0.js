const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/web-CT-1hVF3.js","assets/dist-BtMCkNml.js"])))=>i.map(i=>d[i]);
import { r as registerPlugin, t as Capacitor } from "./dist-BtMCkNml.js";
import { C as updateDoc, D as collection, N as serverTimestamp, O as doc, T as writeBatch, _ as onSnapshot, f as deleteDoc, g as limit, h as getDocs, v as orderBy, w as where, x as setDoc, y as query } from "./vendor-firebase-pU_0pKhI.js";
import { i as db, r as auth } from "./firebase-zc-_OxQs.js";
import { n as apiFetch } from "./apiConfig-CPEwW-gN.js";
import { i as isVerifiedAdminSession } from "./adminAuth-D6F5ZQ0I.js";
// src/types/index.ts
var DEFAULT_NOTIFICATION_PREFERENCES = {
	messages: true,
	gifts: true,
	followers: true,
	rooms: true,
	pk: true,
	wallet: true,
	agency: true,
	progression: true,
	system: true,
	soundEnabled: true,
	vibrateEnabled: true
};
// node_modules/@capacitor/local-notifications/dist/esm/definitions.js
/**
* Day of the week. Used for scheduling notifications on a particular weekday.
*/
var Weekday;
(function(Weekday) {
	Weekday[Weekday["Sunday"] = 1] = "Sunday";
	Weekday[Weekday["Monday"] = 2] = "Monday";
	Weekday[Weekday["Tuesday"] = 3] = "Tuesday";
	Weekday[Weekday["Wednesday"] = 4] = "Wednesday";
	Weekday[Weekday["Thursday"] = 5] = "Thursday";
	Weekday[Weekday["Friday"] = 6] = "Friday";
	Weekday[Weekday["Saturday"] = 7] = "Saturday";
})(Weekday || (Weekday = {}));
// \0vite/preload-helper.js
var scriptRel = "modulepreload";
var assetsURL = function(dep) {
	return "/" + dep;
};
var seen = {};
var isCssPreloadUrl = function isCssPreloadUrl(url) {
	return url.pathname.endsWith(".css");
};
var preloadOnce = function preloadOnce(seen, href, preload) {
	if (href in seen) return seen[href];
	const promise = preload();
	if (!promise) {
		seen[href] = void 0;
		return;
	}
	const preloadPromise = promise.then(() => {
		seen[href] = void 0;
	}, (err) => {
		seen[href] = void 0;
		throw err;
	});
	seen[href] = preloadPromise;
	return preloadPromise;
};
var __vitePreload = function preload(baseModule, deps, importerUrl) {
	let promise = Promise.resolve();
	if (deps && deps.length > 0) {
		let preloadedHrefs;
		const cspNonceMeta = document.querySelector("meta[property=csp-nonce]");
		const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
		function allSettled(promises) {
			return Promise.all(promises.map((p) => Promise.resolve(p).then((value) => ({
				status: "fulfilled",
				value
			}), (reason) => ({
				status: "rejected",
				reason
			}))));
		}
		function importMetaResolve(specifier) {
			if (import.meta.resolve) return new URL(import.meta.resolve(specifier));
			return new URL(
				specifier,
				/** #__KEEP__ */
				import.meta.url
			);
		}
		promise = allSettled(deps.map((depString) => {
			depString = assetsURL(depString, importerUrl);
			const dep = importMetaResolve(depString);
			const isCss = isCssPreloadUrl(dep);
			return preloadOnce(seen, dep.href, () => {
				if (preloadedHrefs === void 0) {
					preloadedHrefs = {
						all: /* @__PURE__ */ new Set(),
						styles: /* @__PURE__ */ new Set()
					};
					const links = document.getElementsByTagName("link");
					for (let i = links.length - 1; i >= 0; i--) {
						const link = links[i];
						preloadedHrefs.all.add(link.href);
						if (link.rel === "stylesheet") preloadedHrefs.styles.add(link.href);
					}
				}
				if ((isCss ? preloadedHrefs.styles : preloadedHrefs.all).has(dep.href)) return;
				const link = document.createElement("link");
				link.rel = isCss ? "stylesheet" : scriptRel;
				if (!isCss) link.as = "script";
				link.crossOrigin = "";
				link.href = dep.href;
				if (cspNonce) link.setAttribute("nonce", cspNonce);
				document.head.appendChild(link);
				if (isCss) return new Promise((res, rej) => {
					const handleSettle = (e) => {
						link.removeEventListener("load", handleSettle);
						link.removeEventListener("error", handleSettle);
						if (e.type === "error") rej(/* @__PURE__ */ new Error(`Unable to preload CSS for ${dep}`));
						else res(e);
					};
					link.addEventListener("load", handleSettle);
					link.addEventListener("error", handleSettle);
				});
			});
		}).filter((p) => p !== void 0));
	}
	function handlePreloadError(err) {
		const e = new Event("vite:preloadError", { cancelable: true });
		e.payload = err;
		window.dispatchEvent(e);
		if (!e.defaultPrevented) throw err;
	}
	return promise.then((res) => {
		for (const item of res || []) {
			if (item.status !== "rejected") continue;
			handlePreloadError(item.reason);
		}
		return baseModule().catch(handlePreloadError);
	});
};
// node_modules/@capacitor/local-notifications/dist/esm/index.js
var LocalNotifications = registerPlugin("LocalNotifications", { web: () => __vitePreload(() => import("./web-CT-1hVF3.js").then((m) => new m.LocalNotificationsWeb()), __vite__mapDeps([0,1])) });
// src/services/pushNotificationService.ts
var ANDROID_CHANNEL_ID = "lenzo_party_alerts";
var SEEN_PUSH_IDS = /* @__PURE__ */ new Set();
var MAX_SEEN_CACHE = 250;
var swRegistrationCache = null;
var androidChannelReady = false;
var audioCtx = null;
function rememberSeenPushId(id) {
	if (!id) return false;
	if (SEEN_PUSH_IDS.has(id)) return true;
	SEEN_PUSH_IDS.add(id);
	if (SEEN_PUSH_IDS.size > MAX_SEEN_CACHE) {
		const first = SEEN_PUSH_IDS.values().next().value;
		if (first) SEEN_PUSH_IDS.delete(first);
	}
	return false;
}
function normalizeNotificationCategory(rawType) {
	switch (String(rawType || "").toLowerCase()) {
		case "messages":
		case "message":
		case "chat": return "messages";
		case "gifts":
		case "gift": return "gifts";
		case "followers":
		case "follow":
		case "like":
		case "comment": return "followers";
		case "rooms":
		case "room":
		case "live": return "rooms";
		case "pk": return "pk";
		case "wallet":
		case "coins":
		case "diamonds":
		case "withdrawal": return "wallet";
		case "agency": return "agency";
		case "progression":
		case "level":
		case "vip": return "progression";
		default: return "system";
	}
}
function formatRelativeNotificationTime(ms) {
	if (!ms || !Number.isFinite(ms)) return "Just now";
	const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1e3));
	if (diffSec < 45) return "Just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h ago`;
	const diffDay = Math.floor(diffHr / 24);
	if (diffDay === 1) return "Yesterday";
	if (diffDay < 7) return `${diffDay}d ago`;
	return new Date(ms).toLocaleDateString();
}
function isCategoryEnabledForUser(type, masterEnabled, prefs) {
	if (!masterEnabled) return false;
	const normalized = normalizeNotificationCategory(type);
	return {
		...DEFAULT_NOTIFICATION_PREFERENCES,
		...prefs || {}
	}[normalized] !== false;
}
function makeSafeId(prefix) {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, "");
}
function urlBase64ToUint8Array(base64String) {
	const base64 = (base64String + "=".repeat((4 - base64String.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
	const rawData = window.atob(base64);
	const buffer = new ArrayBuffer(rawData.length);
	const outputArray = new Uint8Array(buffer);
	for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
	return outputArray;
}
/**
* Play a subtle dual-tone chime via Web Audio API without requiring external audio assets.
*/
function playNotificationChime(priority = "normal") {
	if (typeof window === "undefined") return;
	try {
		const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextCtor) return;
		if (!audioCtx) audioCtx = new AudioContextCtor();
		if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
		const now = audioCtx.currentTime;
		(priority === "urgent" ? [
			784,
			1046.5,
			1318.5
		] : [659.25, 987.77]).forEach((freq, idx) => {
			if (!audioCtx) return;
			const osc = audioCtx.createOscillator();
			const gain = audioCtx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, now + idx * .085);
			gain.gain.setValueAtTime(1e-4, now + idx * .085);
			gain.gain.exponentialRampToValueAtTime(.08, now + idx * .085 + .02);
			gain.gain.exponentialRampToValueAtTime(1e-4, now + idx * .085 + .22);
			osc.connect(gain);
			gain.connect(audioCtx.destination);
			osc.start(now + idx * .085);
			osc.stop(now + idx * .085 + .24);
		});
	} catch {}
}
function triggerNotificationVibration(priority = "normal") {
	if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
	try {
		navigator.vibrate(priority === "urgent" ? [
			140,
			60,
			140,
			60,
			140
		] : [
			75,
			40,
			75
		]);
	} catch {}
}
/**
* Query current platform notification permission status.
*/
async function getPushPermissionState() {
	if (typeof window === "undefined") return "unsupported";
	try {
		if (Capacitor.isNativePlatform()) {
			const perm = await LocalNotifications.checkPermissions();
			if (perm.display === "granted") return "granted";
			if (perm.display === "denied") return "denied";
			return "default";
		}
		if (!("Notification" in window)) return "unsupported";
		return Notification.permission;
	} catch {
		return "unsupported";
	}
}
async function ensureAndroidChannel() {
	if (!Capacitor.isNativePlatform() || androidChannelReady) return;
	try {
		await LocalNotifications.createChannel({
			id: ANDROID_CHANNEL_ID,
			name: "Lenzo Party Live Alerts",
			description: "Real-time alerts for messages, gifts, live streams, party rooms, PK battles, wallet, and agency updates",
			importance: 5,
			visibility: 1,
			vibration: true,
			lights: true,
			lightColor: "#F328D5"
		});
		androidChannelReady = true;
	} catch {}
}
/**
* Register Service Worker + Web Push VAPID subscription OR Native Android notification channel.
*/
async function registerDeviceForPushNotifications(options = {}) {
	const user = auth.currentUser;
	const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() === "ios" ? "ios" : "android" : "web";
	if (typeof window === "undefined") return {
		permission: "unsupported",
		subscribed: false,
		platform
	};
	if (Capacitor.isNativePlatform()) try {
		await ensureAndroidChannel();
		let perm = await LocalNotifications.checkPermissions();
		if (perm.display !== "granted" && options.requestPermission) perm = await LocalNotifications.requestPermissions();
		const mapped = perm.display === "granted" ? "granted" : perm.display === "denied" ? "denied" : "default";
		if (mapped === "granted" && user) {
			const nativeEndpoint = `capacitor://${platform}/${user.uid}`;
			const subId = `cap_${platform}_${user.uid.slice(0, 16)}`.replace(/[^a-zA-Z0-9_-]/g, "");
			await setDoc(doc(db, `users/${user.uid}/push_subscriptions`, subId), {
				userId: user.uid,
				platform,
				endpoint: nativeEndpoint,
				deviceLabel: `${platform.toUpperCase()} Native App`,
				updatedAt: (/* @__PURE__ */ new Date()).toISOString()
			}, { merge: true }).catch(() => {});
			apiFetch("/api/push/subscribe", {
				method: "POST",
				body: JSON.stringify({
					endpoint: nativeEndpoint,
					platform,
					deviceLabel: `${platform.toUpperCase()} Native App`
				})
			}).catch(() => {});
			return {
				permission: "granted",
				subscribed: true,
				platform
			};
		}
		return {
			permission: mapped,
			subscribed: false,
			platform
		};
	} catch (err) {
		return {
			permission: "default",
			subscribed: false,
			platform,
			error: err?.message || "Native notification permission error"
		};
	}
	if (!("Notification" in window)) return {
		permission: "unsupported",
		subscribed: false,
		platform
	};
	let permission = Notification.permission;
	if (permission === "default" && options.requestPermission) try {
		permission = await Notification.requestPermission();
	} catch {
		permission = Notification.permission;
	}
	if (permission !== "granted") return {
		permission,
		subscribed: false,
		platform
	};
	if (!user) return {
		permission: "granted",
		subscribed: false,
		platform
	};
	try {
		let subscribed = false;
		if ("serviceWorker" in navigator) {
			const reg = swRegistrationCache || await navigator.serviceWorker.register("/sw.js", { scope: "/" });
			swRegistrationCache = reg;
			if ("PushManager" in window) {
				const keyRes = await apiFetch("/api/push/vapid-public-key", { skipAuth: true });
				const keyJson = keyRes.ok ? await keyRes.json().catch(() => null) : null;
				const vapidPublicKey = String(keyJson?.publicKey || "").trim();
				if (vapidPublicKey) {
					let subscription = await reg.pushManager.getSubscription();
					if (!subscription) subscription = await reg.pushManager.subscribe({
						userVisibleOnly: true,
						applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
					});
					if (subscription) {
						const subJson = subscription.toJSON();
						const deviceLabel = `${navigator.platform || "Web"} · ${/Mobile|Android|iPhone/i.test(navigator.userAgent) ? "Mobile Browser" : "Desktop Browser"}`.slice(0, 120);
						const res = await apiFetch("/api/push/subscribe", {
							method: "POST",
							body: JSON.stringify({
								subscription: subJson,
								platform: "web",
								deviceLabel
							})
						});
						if (res.ok) {
							subscribed = true;
							const data = await res.json().catch(() => ({}));
							const subId = String(data?.subscriptionId || makeSafeId("websub")).slice(0, 64);
							await setDoc(doc(db, `users/${user.uid}/push_subscriptions`, subId), {
								userId: user.uid,
								platform: "web",
								endpoint: String(subJson.endpoint || "").slice(0, 1024),
								deviceLabel,
								updatedAt: (/* @__PURE__ */ new Date()).toISOString()
							}, { merge: true }).catch(() => {});
						}
					}
				}
			}
		}
		return {
			permission: "granted",
			subscribed: subscribed || permission === "granted",
			platform
		};
	} catch (err) {
		console.warn("[Push] Web Push registration notice:", err);
		return {
			permission: "granted",
			subscribed: false,
			platform,
			error: err?.message
		};
	}
}
/**
* Unsubscribe current browser/device push endpoint (called when disabling push or logging out).
*/
async function unregisterDevicePushNotifications() {
	try {
		if (!Capacitor.isNativePlatform() && "serviceWorker" in navigator) {
			const sub = await (swRegistrationCache || await navigator.serviceWorker.getRegistration("/"))?.pushManager?.getSubscription();
			if (sub) {
				const endpoint = sub.endpoint;
				await sub.unsubscribe().catch(() => {});
				if (auth.currentUser) await apiFetch("/api/push/unsubscribe", {
					method: "POST",
					body: JSON.stringify({ endpoint })
				}).catch(() => {});
			}
		}
	} catch {}
}
/**
* Show an OS-level notification (Native Android Local Notification or Browser Notification)
* with automatic deduplication so a push never appears twice.
*/
async function deliverOsDeviceNotification(payload, prefs) {
	if (rememberSeenPushId(`os_${payload.id}`)) return false;
	const merged = {
		...DEFAULT_NOTIFICATION_PREFERENCES,
		...prefs || {}
	};
	const priority = payload.priority || "normal";
	if (merged.soundEnabled) playNotificationChime(priority);
	if (merged.vibrateEnabled) triggerNotificationVibration(priority);
	if (Capacitor.isNativePlatform()) {
		try {
			await ensureAndroidChannel();
			if ((await LocalNotifications.checkPermissions()).display === "granted") {
				const numericId = Math.abs(Array.from(payload.id).reduce((acc, ch) => (acc << 5) - acc + ch.charCodeAt(0) | 0, 0)) % 214748e4;
				await LocalNotifications.schedule({ notifications: [{
					id: numericId || Math.floor(Math.random() * 999999),
					title: payload.title,
					body: payload.message,
					channelId: ANDROID_CHANNEL_ID,
					schedule: { at: new Date(Date.now() + 80) },
					extra: {
						id: payload.id,
						type: payload.type,
						actionType: payload.actionType || "open_notifications",
						targetId: payload.targetId || "",
						senderId: payload.senderId || ""
					}
				}] });
				return true;
			}
		} catch (err) {
			console.warn("[Push] Android local notification error:", err);
		}
		return false;
	}
	if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
		if (document.hidden) try {
			const reg = swRegistrationCache || await navigator.serviceWorker?.getRegistration("/");
			if (reg && typeof reg.showNotification === "function") {
				await reg.showNotification(payload.title, {
					body: payload.message,
					icon: payload.avatar || "/app-icon.png?v=3",
					badge: "/app-icon.png?v=3",
					tag: `lenzo-${payload.type}-${payload.id}`,
					data: {
						id: payload.id,
						type: payload.type,
						actionType: payload.actionType || "open_notifications",
						targetId: payload.targetId || "",
						senderId: payload.senderId || ""
					}
				});
				return true;
			}
			new Notification(payload.title, {
				body: payload.message,
				icon: payload.avatar || "/app-icon.png?v=3",
				tag: `lenzo-${payload.type}-${payload.id}`
			});
			return true;
		} catch {}
	}
	return false;
}
/**
* Listen for OS notification taps (both Native Android Capacitor & Web Service Worker postMessage).
*/
function bindNotificationClickListener(onAction) {
	const cleanups = [];
	if (typeof window !== "undefined" && "serviceWorker" in navigator) {
		const swHandler = (event) => {
			if (event.data?.type === "LENZO_PUSH_NOTIFICATION_CLICK" && event.data?.payload) {
				const p = event.data.payload;
				onAction({
					actionType: p.actionType,
					targetId: p.targetId,
					senderId: p.senderId,
					type: normalizeNotificationCategory(p.type)
				});
			}
		};
		navigator.serviceWorker.addEventListener("message", swHandler);
		cleanups.push(() => navigator.serviceWorker.removeEventListener("message", swHandler));
	}
	if (Capacitor.isNativePlatform()) {
		let removed = false;
		LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
			if (removed) return;
			const extra = event?.notification?.extra || {};
			onAction({
				actionType: extra.actionType,
				targetId: extra.targetId,
				senderId: extra.senderId,
				type: normalizeNotificationCategory(extra.type)
			});
		}).then((handle) => {
			if (removed) handle.remove();
			else cleanups.push(() => {
				handle.remove();
			});
		}).catch(() => {});
		cleanups.push(() => {
			removed = true;
		});
	}
	return () => cleanups.forEach((fn) => fn());
}
/**
* Universal Single-User Push Dispatcher:
* 1) Persists notification in Firestore `users/{targetUserId}/notifications/{id}`
* 2) Dispatches real-time OS Web Push + WebSocket push via `/api/push/send`
*/
async function sendPushNotification(input) {
	const targetUserId = String(input.targetUserId || "").trim();
	if (!targetUserId || targetUserId === "user_current_01") return;
	const currentUid = auth.currentUser?.uid || "";
	if (!input.allowSelf && currentUid && targetUserId === currentUid) return;
	const notifId = makeSafeId(input.eventKey || input.type || "ntf");
	const title = String(input.title || "Lenzo Party Live").trim().slice(0, 140);
	const message = String(input.message || "").trim().slice(0, 420);
	if (!title || !message) return;
	const type = normalizeNotificationCategory(input.type);
	const priority = input.priority === "urgent" || input.priority === "high" ? input.priority : "normal";
	const firestoreDoc = {
		title,
		message,
		type,
		isRead: false,
		priority,
		createdAt: serverTimestamp()
	};
	if (input.avatar && typeof input.avatar === "string") firestoreDoc.avatar = input.avatar.slice(0, 512);
	if (input.senderId || currentUid) firestoreDoc.senderId = String(input.senderId || currentUid).slice(0, 128);
	if (input.senderName) firestoreDoc.senderName = String(input.senderName).slice(0, 120);
	if (input.actionType) firestoreDoc.actionType = String(input.actionType).slice(0, 48);
	if (input.targetId) firestoreDoc.targetId = String(input.targetId).slice(0, 160);
	if (input.actionUrl) firestoreDoc.actionUrl = String(input.actionUrl).slice(0, 240);
	if (input.eventKey) firestoreDoc.eventKey = String(input.eventKey).slice(0, 128);
	const writeFirestore = setDoc(doc(db, `users/${targetUserId}/notifications`, notifId), firestoreDoc).catch((err) => {
		console.warn("[Push] Firestore notification write notice:", err?.message || err);
	});
	const writeBackend = apiFetch("/api/push/send", {
		method: "POST",
		timeoutMs: 8e3,
		body: JSON.stringify({
			id: notifId,
			targetUserIds: [targetUserId],
			type,
			title,
			message,
			avatar: firestoreDoc.avatar,
			senderName: firestoreDoc.senderName,
			actionType: firestoreDoc.actionType || "open_notifications",
			targetId: firestoreDoc.targetId || "",
			actionUrl: firestoreDoc.actionUrl || "/",
			priority
		})
	}).catch(() => {});
	await Promise.allSettled([writeFirestore, writeBackend]);
}
/**
* Universal Multi-User Push Dispatcher (e.g., notifying all followers when a Host goes Live or opens a Party Room).
*/
async function sendPushNotificationToMany(targetUserIds, input) {
	const currentUid = auth.currentUser?.uid || "";
	const uniqueTargets = Array.from(new Set(targetUserIds.map((id) => String(id || "").trim()).filter((id) => id.length > 0 && id !== "user_current_01" && (input.allowSelf || id !== currentUid)))).slice(0, 120);
	if (uniqueTargets.length === 0) return;
	const baseId = makeSafeId(input.eventKey || input.type || "multi");
	const title = String(input.title || "Lenzo Party Live").trim().slice(0, 140);
	const message = String(input.message || "").trim().slice(0, 420);
	if (!title || !message) return;
	const type = normalizeNotificationCategory(input.type);
	const priority = input.priority === "urgent" || input.priority === "high" ? input.priority : "normal";
	const firestorePayload = {
		title,
		message,
		type,
		isRead: false,
		priority,
		createdAt: serverTimestamp()
	};
	if (input.avatar) firestorePayload.avatar = input.avatar.slice(0, 512);
	if (input.senderId || currentUid) firestorePayload.senderId = String(input.senderId || currentUid).slice(0, 128);
	if (input.senderName) firestorePayload.senderName = String(input.senderName).slice(0, 120);
	if (input.actionType) firestorePayload.actionType = String(input.actionType).slice(0, 48);
	if (input.targetId) firestorePayload.targetId = String(input.targetId).slice(0, 160);
	if (input.eventKey) firestorePayload.eventKey = String(input.eventKey).slice(0, 128);
	const batchPromises = [];
	for (let i = 0; i < uniqueTargets.length; i += 40) {
		const chunk = uniqueTargets.slice(i, i + 40);
		const batch = writeBatch(db);
		chunk.forEach((uid, idx) => {
			batch.set(doc(db, `users/${uid}/notifications`, `${baseId}_${i + idx}`), firestorePayload);
		});
		batchPromises.push(batch.commit().catch(() => {}));
	}
	const serverPush = apiFetch("/api/push/send", {
		method: "POST",
		timeoutMs: 1e4,
		body: JSON.stringify({
			id: baseId,
			targetUserIds: uniqueTargets,
			type,
			title,
			message,
			avatar: firestorePayload.avatar,
			senderName: firestorePayload.senderName,
			actionType: firestorePayload.actionType || "open_notifications",
			targetId: firestorePayload.targetId || "",
			priority
		})
	}).catch(() => {});
	await Promise.allSettled([...batchPromises, serverPush]);
}
/**
* Notify all followers of a Host when they start a Live Stream or open a Party Room.
*/
async function notifyFollowersOfLiveOrRoom(params) {
	try {
		const q = query(collection(db, "follows"), where("followingId", "==", params.hostId), limit(120));
		const followerIds = (await getDocs(q)).docs.map((d) => String(d.data()?.followerId || "").trim()).filter((id) => id.length > 0 && id !== params.hostId);
		if (followerIds.length === 0) return;
		const isLive = params.mode === "live";
		await sendPushNotificationToMany(followerIds, {
			type: "rooms",
			title: isLive ? `🔴 ${params.hostName} is LIVE now!` : `🎙️ ${params.hostName} opened a Party Room!`,
			message: params.sessionTitle ? `Join "${params.sessionTitle}" right now on Lenzo Party Live!` : isLive ? "Tap to watch the live broadcast and say hello." : "Tap to grab a mic seat and join the party!",
			avatar: params.hostAvatar,
			senderId: params.hostId,
			senderName: params.hostName,
			actionType: isLive ? "open_live" : "open_room",
			targetId: params.targetId,
			priority: "high",
			eventKey: isLive ? "host_live" : "host_room"
		});
	} catch (err) {
		console.warn("[Push] notifyFollowersOfLiveOrRoom notice:", err);
	}
}
/**
* Send a real-time push notification to all verified platform administrators (e.g., new withdrawal or agency request).
*/
async function notifyAdminsOfEvent(params) {
	try {
		const adminUids = (await getDocs(query(collection(db, "admins"), limit(10)))).docs.map((d) => d.id).filter(Boolean);
		if (adminUids.length === 0) return;
		await sendPushNotificationToMany(adminUids, {
			type: params.type,
			title: params.title,
			message: params.message,
			actionType: params.actionType || "open_admin",
			targetId: params.targetId,
			priority: params.priority || "high",
			allowSelf: true
		});
	} catch {}
}
/**
* Send a self-test push notification (OS Web Push + WebSocket + Firestore + Native Android)
* so the user can verify push notifications are active immediately.
*/
async function sendSelfTestPushNotification() {
	const user = auth.currentUser;
	if (!user) return {
		ok: false,
		webPushSent: 0
	};
	await sendPushNotification({
		targetUserId: user.uid,
		type: "system",
		title: "🔔 Lenzo Party Push Notifications Active!",
		message: "All real-time alerts are enabled for messages, gifts, live rooms, PK battles, wallet, and agency events.",
		actionType: "open_notifications",
		priority: "high",
		allowSelf: true,
		eventKey: "self_test"
	});
	try {
		const res = await apiFetch("/api/push/test", { method: "POST" });
		const data = res.ok ? await res.json().catch(() => ({})) : {};
		return {
			ok: true,
			webPushSent: Number(data?.webPushSent || 0)
		};
	} catch {
		return {
			ok: true,
			webPushSent: 0
		};
	}
}
/**
* Super Admin ONLY: Send a Global Push Notification Broadcast to ALL Lenzo Party users.
*/
async function sendAdminGlobalPushBroadcast(params) {
	const user = auth.currentUser;
	if (!user || !isVerifiedAdminSession()) throw new Error("Only verified Lenzo Party Super Admins can send global push broadcasts.");
	const title = params.title.trim().slice(0, 140);
	const message = params.message.trim().slice(0, 500);
	if (!title || !message) throw new Error("Broadcast title and message are required.");
	const broadcastId = makeSafeId("bcast");
	const category = params.category || "system";
	const priority = params.priority || "high";
	await setDoc(doc(db, "push_announcements", broadcastId), {
		id: broadcastId,
		adminUid: user.uid,
		adminEmail: (user.email || "").toLowerCase(),
		title,
		message,
		category,
		priority,
		active: true,
		createdAt: (/* @__PURE__ */ new Date()).toISOString(),
		createdAtMillis: Date.now()
	});
	const res = await apiFetch("/api/push/broadcast", {
		method: "POST",
		body: JSON.stringify({
			id: broadcastId,
			title,
			message,
			category,
			priority
		})
	});
	if (!res.ok) {
		const errJson = await res.json().catch(() => ({}));
		throw new Error(errJson?.error || "Failed to dispatch global push broadcast.");
	}
	const data = await res.json();
	return {
		broadcastId,
		subscribedUsersCount: Number(data?.subscribedUsersCount || 0),
		webPushSent: Number(data?.webPushSent || 0),
		activeWebSocketClients: Number(data?.activeWebSocketClients || 0)
	};
}
/**
* Subscribe to the signed-in user's Notification Center in real time (Firestore).
*/
function subscribeRealTimeNotifications(userId, onUpdate) {
	if (!userId || userId === "user_current_01") {
		onUpdate([], []);
		return () => {};
	}
	let initialHydrated = false;
	const knownIds = /* @__PURE__ */ new Set();
	const q = query(collection(db, `users/${userId}/notifications`), orderBy("createdAt", "desc"), limit(60));
	return onSnapshot(q, (snap) => {
		const newlyAdded = [];
		const items = snap.docs.map((d) => {
			const data = d.data();
			const createdAtMs = typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : typeof data.createdAt === "number" ? data.createdAt : Date.now();
			const item = {
				id: d.id,
				type: normalizeNotificationCategory(data.type),
				title: String(data.title || "Lenzo Party Live"),
				message: String(data.message || ""),
				avatar: typeof data.avatar === "string" ? data.avatar : void 0,
				senderId: typeof data.senderId === "string" ? data.senderId : void 0,
				senderName: typeof data.senderName === "string" ? data.senderName : void 0,
				actionType: data.actionType,
				targetId: typeof data.targetId === "string" ? data.targetId : void 0,
				actionUrl: typeof data.actionUrl === "string" ? data.actionUrl : void 0,
				priority: data.priority === "urgent" || data.priority === "high" ? data.priority : "normal",
				timestamp: formatRelativeNotificationTime(createdAtMs),
				createdAtMs,
				isRead: Boolean(data.isRead)
			};
			if (initialHydrated && !knownIds.has(d.id) && !item.isRead) newlyAdded.push(item);
			knownIds.add(d.id);
			return item;
		});
		initialHydrated = true;
		onUpdate(items, newlyAdded);
	}, (err) => {
		console.warn("[Push] subscribeRealTimeNotifications notice:", err?.message || err);
	});
}
/**
* Subscribe to global admin push announcements in real time.
*/
function subscribeGlobalPushAnnouncements(onAnnouncement) {
	let hydrated = false;
	const seen = /* @__PURE__ */ new Set();
	const q = query(collection(db, "push_announcements"), where("active", "==", true), orderBy("createdAtMillis", "desc"), limit(10));
	return onSnapshot(q, (snap) => {
		snap.docs.forEach((d) => {
			const data = d.data();
			if (!seen.has(d.id)) {
				seen.add(d.id);
				if (hydrated) onAnnouncement({
					id: d.id,
					type: normalizeNotificationCategory(data.category || "system"),
					title: String(data.title || "Lenzo Party Announcement"),
					message: String(data.message || ""),
					senderName: "Lenzo Party Official",
					actionType: "open_notifications",
					priority: data.priority === "urgent" || data.priority === "high" ? data.priority : "high",
					createdAtMs: Number(data.createdAtMillis || Date.now())
				});
			}
		});
		hydrated = true;
	}, () => {});
}
async function markNotificationAsRead(userId, notificationId) {
	if (!userId || !notificationId) return;
	try {
		await updateDoc(doc(db, `users/${userId}/notifications`, notificationId), { isRead: true });
	} catch {}
}
async function markAllNotificationsAsRead(userId, notificationIds) {
	if (!userId || notificationIds.length === 0) return;
	try {
		for (let i = 0; i < notificationIds.length; i += 40) {
			const batch = writeBatch(db);
			notificationIds.slice(i, i + 40).forEach((id) => {
				batch.update(doc(db, `users/${userId}/notifications`, id), { isRead: true });
			});
			await batch.commit();
		}
	} catch {}
}
async function deleteSingleNotification(userId, notificationId) {
	if (!userId || !notificationId) return;
	try {
		await deleteDoc(doc(db, `users/${userId}/notifications`, notificationId));
	} catch {}
}
async function clearAllNotifications(userId, notificationIds) {
	if (!userId || notificationIds.length === 0) return;
	try {
		for (let i = 0; i < notificationIds.length; i += 40) {
			const batch = writeBatch(db);
			notificationIds.slice(i, i + 40).forEach((id) => {
				batch.delete(doc(db, `users/${userId}/notifications`, id));
			});
			await batch.commit();
		}
	} catch {}
}
export { subscribeRealTimeNotifications as _, getPushPermissionState as a, DEFAULT_NOTIFICATION_PREFERENCES as b, markNotificationAsRead as c, notifyFollowersOfLiveOrRoom as d, registerDeviceForPushNotifications as f, subscribeGlobalPushAnnouncements as g, sendSelfTestPushNotification as h, deliverOsDeviceNotification as i, normalizeNotificationCategory as l, sendPushNotification as m, clearAllNotifications as n, isCategoryEnabledForUser as o, sendAdminGlobalPushBroadcast as p, deleteSingleNotification as r, markAllNotificationsAsRead as s, bindNotificationClickListener as t, notifyAdminsOfEvent as u, unregisterDevicePushNotifications as v, __vitePreload as y };
