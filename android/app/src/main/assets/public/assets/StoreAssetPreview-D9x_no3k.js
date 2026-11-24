import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { D as Sparkles, Ln as require_react, en as Crown } from "./vendor-icons-iizCEidI.js";
import { D as Timestamp, E as writeBatch, N as serverTimestamp, O as collection, S as setDoc, T as where, b as query, f as deleteDoc, h as getDocs, k as doc, v as onSnapshot, x as runTransaction } from "./vendor-firebase-AVvshUH2.js";
import { i as db, r as auth } from "./firebase-CIREZBAE.js";
import { i as require_jsx_runtime } from "./vendor-motion-BVNOodou.js";
import { Ht as isVerifiedAdminSession, It as sendPushNotification } from "./index-BqBTFT3-.js";
// src/assets/images/store_cat_vip_frames_1795168966830.jpg
var store_cat_vip_frames_1795168966830_default = "/assets/store_cat_vip_frames_1795168966830-BDdPQwha.jpg";
// src/assets/images/store_cat_special_entry_1795168967865.jpg
var store_cat_special_entry_1795168967865_default = "/assets/store_cat_special_entry_1795168967865-Ol8b5Jm5.jpg";
// src/assets/images/store_cat_custom_gift_1795168966908.jpg
var store_cat_custom_gift_1795168966908_default = "/assets/store_cat_custom_gift_1795168966908-CaomyxCi.jpg";
// src/assets/images/store_cat_premium_assets_1795168967977.jpg
var store_cat_premium_assets_1795168967977_default = "/assets/store_cat_premium_assets_1795168967977-Bx3yRfqB.jpg";
// src/data/storeCatalog.ts
var STORE_CATEGORY_ICONS = {
	vip_frames: store_cat_vip_frames_1795168966830_default,
	special_entry: store_cat_special_entry_1795168967865_default,
	custom_gift: store_cat_custom_gift_1795168966908_default,
	premium_assets: store_cat_premium_assets_1795168967977_default
};
var DEFAULT_STORE_CATEGORIES = [
	{
		id: "vip_frames",
		title: "VIP FRAMES",
		subtitle: "Royal animated avatar crowns & neon halos",
		imageUrl: store_cat_vip_frames_1795168966830_default,
		accentFrom: "#FFC84A",
		accentTo: "#A855F7",
		glowColor: "rgba(168, 85, 247, 0.72)",
		order: 1,
		enabled: true
	},
	{
		id: "special_entry",
		title: "SPECIAL ENTRY",
		subtitle: "Grand royal gates, red carpets & spotlights",
		imageUrl: store_cat_special_entry_1795168967865_default,
		accentFrom: "#F59E0B",
		accentTo: "#EC4899",
		glowColor: "rgba(245, 158, 11, 0.65)",
		order: 2,
		enabled: true
	},
	{
		id: "custom_gift",
		title: "CUSTOM GIFT",
		subtitle: "Luxury animated gift boxes & golden bursts",
		imageUrl: store_cat_custom_gift_1795168966908_default,
		accentFrom: "#C084FC",
		accentTo: "#F59E0B",
		glowColor: "rgba(192, 132, 252, 0.72)",
		order: 3,
		enabled: true
	},
	{
		id: "premium_assets",
		title: "PREMIUM ASSETS",
		subtitle: "Prismatic diamonds, aura crests & media FX",
		imageUrl: store_cat_premium_assets_1795168967977_default,
		accentFrom: "#D946EF",
		accentTo: "#7C3AED",
		glowColor: "rgba(217, 70, 239, 0.72)",
		order: 4,
		enabled: true
	}
];
var STORE_ANIMATION_PRESET_OPTIONS = [
	{
		value: "royal_flame",
		label: "Royal Flame Crown Ring",
		categoryId: "vip_frames"
	},
	{
		value: "neon_galaxy",
		label: "Neon Galaxy Orbit Halo",
		categoryId: "vip_frames"
	},
	{
		value: "diamond_aura",
		label: "Diamond Aura Prism Frame",
		categoryId: "vip_frames"
	},
	{
		value: "imperial_carpet",
		label: "Imperial Red Carpet Walk",
		categoryId: "special_entry"
	},
	{
		value: "golden_gate",
		label: "Royal Golden Gate Opening",
		categoryId: "special_entry"
	},
	{
		value: "phantom_spotlight",
		label: "Phantom VIP Spotlight Arrival",
		categoryId: "special_entry"
	},
	{
		value: "velvet_gift_box",
		label: "Velvet Galaxy Gift Burst",
		categoryId: "custom_gift"
	},
	{
		value: "golden_ribbon_gift",
		label: "Golden Ribbon Treasure Box",
		categoryId: "custom_gift"
	},
	{
		value: "starburst_chest",
		label: "Starburst Crown Luxury Chest",
		categoryId: "custom_gift"
	},
	{
		value: "amethyst_prism",
		label: "Amethyst Prism Diamond Aura",
		categoryId: "premium_assets"
	},
	{
		value: "neon_diamond_crest",
		label: "Neon Diamond Crest FX",
		categoryId: "premium_assets"
	},
	{
		value: "celestial_crystal",
		label: "Celestial Crystal Orb Pack",
		categoryId: "premium_assets"
	}
];
var DEFAULT_STORE_PRODUCTS = [
	{
		id: "vip_frame_royal_flame",
		name: "Royal Flame",
		categoryId: "vip_frames",
		priceCoins: 2500,
		description: "Blazing golden crown crest with rotating molten-amber flame ring and rising royal embers around your profile avatar.",
		animationPreset: "royal_flame",
		primaryColor: "#FF8A00",
		secondaryColor: "#FFC84A",
		accentColor: "#FFE082",
		glowColor: "rgba(255, 160, 24, 0.75)",
		badgeText: "POPULAR",
		durationDays: 0,
		isFeatured: true,
		enabled: true,
		sortOrder: 1
	},
	{
		id: "vip_frame_neon_galaxy",
		name: "Neon Galaxy",
		categoryId: "vip_frames",
		priceCoins: 4800,
		description: "Orbiting electric magenta-violet cosmic vortex with dual stardust particles and shimmering neon halo.",
		animationPreset: "neon_galaxy",
		primaryColor: "#A855F7",
		secondaryColor: "#EC4899",
		accentColor: "#38BDF8",
		glowColor: "rgba(192, 68, 255, 0.8)",
		badgeText: "HOT",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 2
	},
	{
		id: "vip_frame_diamond_aura",
		name: "Diamond Aura",
		categoryId: "vip_frames",
		priceCoins: 7200,
		description: "Ultra-luxury crystalline diamond halo with prismatic star-flares, royal platinum rim and sparkling prism aura.",
		animationPreset: "diamond_aura",
		primaryColor: "#38BDF8",
		secondaryColor: "#C084FC",
		accentColor: "#F8FAFC",
		glowColor: "rgba(56, 189, 248, 0.8)",
		badgeText: "LEGENDARY",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 3
	},
	{
		id: "entry_imperial_carpet",
		name: "Imperial Carpet",
		categoryId: "special_entry",
		priceCoins: 6500,
		description: "Roll out a plush crimson carpet with gleaming golden stanchions and animated twin spotlights every time you enter a room.",
		animationPreset: "imperial_carpet",
		primaryColor: "#DC2626",
		secondaryColor: "#FFC84A",
		accentColor: "#FDE68A",
		glowColor: "rgba(245, 158, 11, 0.78)",
		badgeText: "VIP ENTRY",
		durationDays: 0,
		isFeatured: true,
		enabled: true,
		sortOrder: 1
	},
	{
		id: "entry_golden_gate",
		name: "Royal Gate",
		categoryId: "special_entry",
		priceCoins: 9800,
		description: "Twin sculpted golden palace gates swing open with violet laser rays and golden stardust announcing your arrival.",
		animationPreset: "golden_gate",
		primaryColor: "#F59E0B",
		secondaryColor: "#9333EA",
		accentColor: "#FEF08A",
		glowColor: "rgba(255, 200, 74, 0.82)",
		badgeText: "ROYAL",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 2
	},
	{
		id: "entry_phantom_spotlight",
		name: "Neon Spotlight",
		categoryId: "special_entry",
		priceCoins: 14500,
		description: "Dramatic sweeping purple and magenta stage spotlights with holographic Lenzo banner across live broadcasts.",
		animationPreset: "phantom_spotlight",
		primaryColor: "#D946EF",
		secondaryColor: "#7C3AED",
		accentColor: "#F0ABFC",
		glowColor: "rgba(217, 70, 239, 0.85)",
		badgeText: "MYTHIC",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 3
	},
	{
		id: "gift_velvet_galaxy",
		name: "Velvet Gift Box",
		categoryId: "custom_gift",
		priceCoins: 1800,
		description: "Glowing violet crystal gift box wrapped in liquid gold ribbon that pops open in a shower of hearts and stardust.",
		animationPreset: "velvet_gift_box",
		primaryColor: "#9333EA",
		secondaryColor: "#FFC84A",
		accentColor: "#F472B6",
		glowColor: "rgba(168, 85, 247, 0.8)",
		badgeText: "CUSTOM",
		durationDays: 0,
		isFeatured: true,
		enabled: true,
		sortOrder: 1
	},
	{
		id: "gift_golden_ribbon",
		name: "Golden Ribbon",
		categoryId: "custom_gift",
		priceCoins: 3600,
		description: "Hand-crafted gilded surprise chest with animated satin bow unfurling golden coin rain across the room.",
		animationPreset: "golden_ribbon_gift",
		primaryColor: "#F59E0B",
		secondaryColor: "#EC4899",
		accentColor: "#FEF08A",
		glowColor: "rgba(245, 158, 11, 0.8)",
		badgeText: "LUXURY",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 2
	},
	{
		id: "gift_starburst_chest",
		name: "Crown Treasure",
		categoryId: "custom_gift",
		priceCoins: 8500,
		description: "Royal amethyst treasure box bursting with a 3D crown hologram, golden sparks, and floating neon gems.",
		animationPreset: "starburst_chest",
		primaryColor: "#C026D3",
		secondaryColor: "#FACC15",
		accentColor: "#E879F9",
		glowColor: "rgba(192, 38, 211, 0.85)",
		badgeText: "EXCLUSIVE",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 3
	},
	{
		id: "asset_amethyst_prism",
		name: "Amethyst Prism",
		categoryId: "premium_assets",
		priceCoins: 3200,
		description: "Rotating neon purple cut diamond emblem with prismatic violet aura rings for your profile & party seat.",
		animationPreset: "amethyst_prism",
		primaryColor: "#A855F7",
		secondaryColor: "#EC4899",
		accentColor: "#F5D0FE",
		glowColor: "rgba(168, 85, 247, 0.82)",
		badgeText: "PREMIUM",
		durationDays: 0,
		isFeatured: true,
		enabled: true,
		sortOrder: 1
	},
	{
		id: "asset_neon_diamond_crest",
		name: "Diamond Crest",
		categoryId: "premium_assets",
		priceCoins: 5900,
		description: "High-gloss violet diamond crest emitting synchronized neon pulse waves and floating crystal shards.",
		animationPreset: "neon_diamond_crest",
		primaryColor: "#D946EF",
		secondaryColor: "#38BDF8",
		accentColor: "#FDE047",
		glowColor: "rgba(217, 70, 239, 0.82)",
		badgeText: "ELITE",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 2
	},
	{
		id: "asset_celestial_crystal",
		name: "Celestial Orb",
		categoryId: "premium_assets",
		priceCoins: 11e3,
		description: "Complete luxury visual asset bundle: orbital sapphire-amethyst crystal core with animated golden star halo.",
		animationPreset: "celestial_crystal",
		primaryColor: "#8B5CF6",
		secondaryColor: "#F59E0B",
		accentColor: "#67E8F9",
		glowColor: "rgba(139, 92, 246, 0.88)",
		badgeText: "MYTHIC",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 3
	}
];
// src/services/storeService.ts
function toIsoDate(val) {
	if (!val) return (/* @__PURE__ */ new Date()).toISOString();
	if (typeof val === "string") return val;
	if (val instanceof Timestamp) return val.toDate().toISOString();
	if (typeof val.toDate === "function") return val.toDate().toISOString();
	return (/* @__PURE__ */ new Date()).toISOString();
}
async function getAuthHeaders() {
	const headers = { "Content-Type": "application/json" };
	const user = auth.currentUser;
	if (user) try {
		const token = await user.getIdToken();
		if (token) headers.Authorization = `Bearer ${token}`;
	} catch {}
	return headers;
}
/**
* Subscribe to the 4 official Lenzo Store Categories in real time.
* Always resolves the local ES-bundled 3D emblem fallback if a Firestore doc omits imageUrl.
*/
function subscribeStoreCategories(onUpdate) {
	const collRef = collection(db, "store_categories");
	return onSnapshot(collRef, (snap) => {
		if (snap.empty) {
			if (isVerifiedAdminSession()) DEFAULT_STORE_CATEGORIES.forEach((cat) => {
				setDoc(doc(db, "store_categories", cat.id), {
					id: cat.id,
					title: cat.title,
					subtitle: cat.subtitle,
					accentFrom: cat.accentFrom,
					accentTo: cat.accentTo,
					glowColor: cat.glowColor,
					order: cat.order,
					enabled: cat.enabled,
					updatedAt: serverTimestamp()
				}, { merge: true }).catch(() => {});
			});
			onUpdate(DEFAULT_STORE_CATEGORIES);
			return;
		}
		const map = /* @__PURE__ */ new Map();
		DEFAULT_STORE_CATEGORIES.forEach((c) => map.set(c.id, c));
		snap.docs.forEach((d) => {
			const raw = d.data();
			const id = d.id;
			if (!map.has(id)) return;
			const base = map.get(id);
			map.set(id, {
				...base,
				...raw,
				id,
				imageUrl: raw.imageUrl && raw.imageUrl.startsWith("http") ? raw.imageUrl : STORE_CATEGORY_ICONS[id]
			});
		});
		onUpdate(Array.from(map.values()).filter((c) => c.enabled !== false).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
	}, () => {
		onUpdate(DEFAULT_STORE_CATEGORIES);
	});
}
/**
* Subscribe to all Store Products in real time from Firestore `store_products`.
* Automatically falls back to / merges with the default Lenzo catalog if Firestore is empty,
* and ensures admin edits reflect immediately across Web & Android.
*/
function subscribeStoreProducts(onUpdate, options) {
	const includeDisabled = Boolean(options?.includeDisabled);
	const collRef = collection(db, "store_products");
	return onSnapshot(collRef, (snap) => {
		if (snap.empty) {
			if (isVerifiedAdminSession()) DEFAULT_STORE_PRODUCTS.forEach((prod) => {
				setDoc(doc(db, "store_products", prod.id), {
					...prod,
					createdAt: serverTimestamp(),
					updatedAt: serverTimestamp()
				}, { merge: true }).catch(() => {});
			});
			onUpdate(includeDisabled ? [...DEFAULT_STORE_PRODUCTS] : DEFAULT_STORE_PRODUCTS.filter((p) => p.enabled));
			return;
		}
		const list = snap.docs.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				name: String(data.name || "Unnamed Item"),
				categoryId: data.categoryId || "vip_frames",
				priceCoins: Math.max(0, Math.round(Number(data.priceCoins ?? 0))),
				description: String(data.description || ""),
				imageUrl: data.imageUrl ? String(data.imageUrl) : "",
				animationUrl: data.animationUrl ? String(data.animationUrl) : "",
				animationPreset: data.animationPreset || "royal_flame",
				primaryColor: String(data.primaryColor || "#A855F7"),
				secondaryColor: String(data.secondaryColor || "#FFC84A"),
				accentColor: String(data.accentColor || "#F0ABFC"),
				glowColor: String(data.glowColor || "rgba(168, 85, 247, 0.75)"),
				badgeText: data.badgeText ? String(data.badgeText) : "",
				durationDays: Number(data.durationDays ?? 0),
				isFeatured: Boolean(data.isFeatured),
				enabled: data.enabled !== false,
				sortOrder: Number(data.sortOrder ?? 99),
				createdAt: toIsoDate(data.createdAt),
				updatedAt: toIsoDate(data.updatedAt)
			};
		});
		const filtered = includeDisabled ? list : list.filter((p) => p.enabled);
		filtered.sort((a, b) => {
			if (a.categoryId !== b.categoryId) return a.categoryId.localeCompare(b.categoryId);
			if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
			return a.priceCoins - b.priceCoins;
		});
		onUpdate(filtered);
	}, async () => {
		try {
			const res = await fetch("/api/store/catalog");
			if (res.ok) {
				const payload = await res.json();
				if (Array.isArray(payload.products)) {
					onUpdate(includeDisabled ? payload.products : payload.products.filter((p) => p.enabled !== false));
					return;
				}
			}
		} catch {}
		onUpdate(includeDisabled ? [...DEFAULT_STORE_PRODUCTS] : DEFAULT_STORE_PRODUCTS.filter((p) => p.enabled));
	});
}
/**
* Subscribe to the authenticated user's real-time Store inventory (`user_inventory`).
*/
function subscribeUserInventory(userId, onUpdate) {
	if (!userId) {
		onUpdate([]);
		return () => {};
	}
	const q = query(collection(db, "user_inventory"), where("userId", "==", userId));
	return onSnapshot(q, (snap) => {
		const items = snap.docs.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				userId: String(data.userId || userId),
				productId: String(data.productId || ""),
				productName: String(data.productName || ""),
				categoryId: data.categoryId || "vip_frames",
				animationPreset: data.animationPreset || "royal_flame",
				imageUrl: data.imageUrl ? String(data.imageUrl) : "",
				animationUrl: data.animationUrl ? String(data.animationUrl) : "",
				pricePaidCoins: Number(data.pricePaidCoins ?? 0),
				equipped: Boolean(data.equipped),
				purchasedAt: toIsoDate(data.purchasedAt),
				expiresAt: data.expiresAt ? toIsoDate(data.expiresAt) : null
			};
		});
		items.sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime());
		onUpdate(items);
	}, () => {
		onUpdate([]);
	});
}
var inFlightPurchases = /* @__PURE__ */ new Set();
/**
* Secure, atomic, idempotent Lenzo Store purchase flow:
* 1. Guards against concurrent double-taps with an in-flight lock.
* 2. Validates the product, authoritative price, and purchase eligibility with the Lenzo backend API.
* 3. Runs a Firestore atomic `runTransaction` that:
*    - Verifies deterministic doc `user_inventory/{uid}_{productId}` does NOT exist (blocks duplicate purchases).
*    - Reads authoritative balance from `wallets/{uid}` + `users/{uid}` (never trusts client state).
*    - Deducts exact coins from both `wallets/{uid}` and `users/{uid}`.
*    - Creates `user_inventory/{uid}_{productId}` and immutable `coin_transactions/{txId}`.
*/
async function purchaseStoreProduct(params) {
	const { userId, product } = params;
	if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return {
		success: false,
		errorCode: "UNAUTHENTICATED",
		message: "Please sign in to your Lenzo Party account to make a purchase."
	};
	const idempotencyKey = `store_${userId}_${product.id}`;
	if (inFlightPurchases.has(idempotencyKey)) return {
		success: false,
		errorCode: "TRANSACTION_FAILED",
		message: "Purchase is already being processed. Please wait."
	};
	inFlightPurchases.add(idempotencyKey);
	try {
		let authoritativePrice = Math.max(1, Math.round(Number(product.priceCoins)));
		let authoritativeName = product.name;
		let authoritativeCategory = product.categoryId;
		try {
			const headers = await getAuthHeaders();
			const validateRes = await fetch("/api/store/purchase/validate", {
				method: "POST",
				headers,
				body: JSON.stringify({
					productId: product.id,
					idempotencyKey
				})
			});
			if (validateRes.ok) {
				const vData = await validateRes.json();
				if (vData.alreadyOwned) return {
					success: false,
					errorCode: "ALREADY_OWNED",
					message: `You already own ${product.name}. You can equip it immediately!`
				};
				if (vData.product && typeof vData.product.priceCoins === "number") {
					authoritativePrice = Math.max(1, Math.round(vData.product.priceCoins));
					authoritativeName = String(vData.product.name || product.name);
					authoritativeCategory = vData.product.categoryId || product.categoryId;
				}
			} else if (validateRes.status === 404 || validateRes.status === 410) return {
				success: false,
				errorCode: "PRODUCT_UNAVAILABLE",
				message: "This store item is no longer available."
			};
		} catch {}
		const walletRef = doc(db, "wallets", userId);
		const userRef = doc(db, "users", userId);
		const productRef = doc(db, "store_products", product.id);
		const inventoryDocId = `${userId}_${product.id}`;
		const inventoryRef = doc(db, "user_inventory", inventoryDocId);
		const txId = `storetx_${userId.slice(0, 12)}_${product.id.slice(0, 24)}_${Date.now()}`;
		const txRef = doc(db, "coin_transactions", txId);
		let finalBalance = 0;
		let finalBalanceBefore = 0;
		let createdInventory = null;
		await runTransaction(db, async (tx) => {
			const [walletSnap, userSnap, prodSnap, invSnap] = await Promise.all([
				tx.get(walletRef),
				tx.get(userRef),
				tx.get(productRef),
				tx.get(inventoryRef)
			]);
			if (invSnap.exists()) throw new Error("ERR_ALREADY_OWNED");
			let txPrice = authoritativePrice;
			let txName = authoritativeName;
			let txCategory = authoritativeCategory;
			let txPreset = product.animationPreset;
			let txImageUrl = product.imageUrl || "";
			let txAnimationUrl = product.animationUrl || "";
			if (prodSnap.exists()) {
				const pData = prodSnap.data();
				if (pData.enabled === false) throw new Error("ERR_PRODUCT_UNAVAILABLE");
				if (typeof pData.priceCoins === "number" && pData.priceCoins > 0) txPrice = Math.round(pData.priceCoins);
				if (pData.name) txName = String(pData.name);
				if (pData.categoryId) txCategory = pData.categoryId;
				if (pData.animationPreset) txPreset = pData.animationPreset;
				if (typeof pData.imageUrl === "string") txImageUrl = pData.imageUrl;
				if (typeof pData.animationUrl === "string") txAnimationUrl = pData.animationUrl;
			}
			const walletCoins = walletSnap.exists() ? Number(walletSnap.data().walletPurchasedCoins ?? 0) : 0;
			const userCoins = userSnap.exists() ? Number(userSnap.data().coins ?? 0) : 0;
			const currentBalance = walletSnap.exists() && walletCoins > 0 ? walletCoins : Math.max(walletCoins, userCoins);
			if (currentBalance < txPrice) throw new Error("ERR_INSUFFICIENT_COINS");
			const nextBalance = currentBalance - txPrice;
			const prevTotalSpent = walletSnap.exists() ? Number(walletSnap.data().totalCoinsSpent ?? 0) : 0;
			const prevTotalPurchased = walletSnap.exists() ? Number(walletSnap.data().totalCoinsPurchased ?? currentBalance) : currentBalance;
			finalBalanceBefore = currentBalance;
			finalBalance = nextBalance;
			const nowIso = (/* @__PURE__ */ new Date()).toISOString();
			tx.set(walletRef, {
				userId,
				walletPurchasedCoins: nextBalance,
				totalCoinsPurchased: prevTotalPurchased,
				totalCoinsSpent: prevTotalSpent + txPrice,
				updatedAt: serverTimestamp()
			}, { merge: true });
			if (userSnap.exists()) tx.update(userRef, {
				coins: nextBalance,
				updatedAt: serverTimestamp()
			});
			const invDoc = {
				userId,
				productId: product.id,
				productName: txName,
				categoryId: txCategory,
				animationPreset: txPreset,
				imageUrl: txImageUrl,
				animationUrl: txAnimationUrl,
				pricePaidCoins: txPrice,
				equipped: false,
				purchasedAt: serverTimestamp()
			};
			tx.set(inventoryRef, invDoc);
			tx.set(txRef, {
				userId,
				type: "store_purchase",
				productId: product.id,
				productName: txName,
				categoryId: txCategory,
				amount: -txPrice,
				balanceBefore: currentBalance,
				balanceAfter: nextBalance,
				idempotencyKey,
				status: "completed",
				createdAt: serverTimestamp()
			});
			createdInventory = {
				id: inventoryDocId,
				userId,
				productId: product.id,
				productName: txName,
				categoryId: txCategory,
				animationPreset: txPreset,
				imageUrl: txImageUrl,
				animationUrl: txAnimationUrl,
				pricePaidCoins: txPrice,
				equipped: false,
				purchasedAt: nowIso
			};
		});
		try {
			const headers = await getAuthHeaders();
			await fetch("/api/store/purchase/record", {
				method: "POST",
				headers,
				body: JSON.stringify({
					productId: product.id,
					idempotencyKey,
					transactionId: txId,
					pricePaidCoins: finalBalanceBefore - finalBalance,
					balanceBefore: finalBalanceBefore,
					balanceAfter: finalBalance
				})
			});
		} catch {}
		sendPushNotification({
			targetUserId: userId,
			type: "progression",
			title: `✨ Unlocked: ${product.name}`,
			message: `${product.name} has been added to your inventory (${(finalBalanceBefore - finalBalance).toLocaleString()} Coins).`,
			actionType: "open_store",
			targetId: product.id,
			allowSelf: true,
			eventKey: "store_unlock"
		});
		return {
			success: true,
			message: `${product.name} unlocked and added to your inventory!`,
			newBalance: finalBalance,
			inventoryItem: createdInventory || void 0,
			transactionId: txId
		};
	} catch (err) {
		const errMsg = err instanceof Error ? err.message : String(err);
		if (errMsg === "ERR_ALREADY_OWNED") return {
			success: false,
			errorCode: "ALREADY_OWNED",
			message: `You already own ${product.name}. Tap Equip to use it!`
		};
		if (errMsg === "ERR_INSUFFICIENT_COINS") return {
			success: false,
			errorCode: "INSUFFICIENT_COINS",
			message: "Not enough coins. Please recharge your Lenzo Wallet."
		};
		if (errMsg === "ERR_PRODUCT_UNAVAILABLE") return {
			success: false,
			errorCode: "PRODUCT_UNAVAILABLE",
			message: "This item is currently disabled by Lenzo Store."
		};
		console.error("[StoreService] Purchase transaction failed:", err);
		return {
			success: false,
			errorCode: "TRANSACTION_FAILED",
			message: "Unable to complete purchase right now. No coins were deducted."
		};
	} finally {
		inFlightPurchases.delete(idempotencyKey);
	}
}
/**
* Equip or unequip an owned Store item in `user_inventory` and mirror the active equip to `users/{uid}`.
* Ensures only one item per category is equipped at a time.
*/
async function toggleEquipInventoryItem(params) {
	const { userId, item, equip } = params;
	if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return {
		success: false,
		message: "Please sign in first."
	};
	try {
		const q = query(collection(db, "user_inventory"), where("userId", "==", userId));
		const snap = await getDocs(q);
		const batch = writeBatch(db);
		snap.docs.forEach((d) => {
			const data = d.data();
			if (data.categoryId === item.categoryId) {
				const shouldBeEquipped = equip && d.id === item.id;
				if (Boolean(data.equipped) !== shouldBeEquipped) batch.update(d.ref, {
					equipped: shouldBeEquipped,
					updatedAt: serverTimestamp()
				});
			}
		});
		const userFieldMap = {
			vip_frames: "equippedStoreFrame",
			special_entry: "equippedStoreEntry",
			custom_gift: "equippedStoreGift",
			premium_assets: "equippedStoreAsset"
		};
		const userRef = doc(db, "users", userId);
		batch.set(userRef, {
			[userFieldMap[item.categoryId]]: equip ? {
				productId: item.productId,
				productName: item.productName,
				animationPreset: item.animationPreset,
				imageUrl: item.imageUrl || "",
				animationUrl: item.animationUrl || ""
			} : null,
			updatedAt: serverTimestamp()
		}, { merge: true });
		await batch.commit();
		return {
			success: true,
			message: equip ? `${item.productName} is now equipped!` : `${item.productName} unequipped.`
		};
	} catch (err) {
		console.error("[StoreService] Equip error:", err);
		return {
			success: false,
			message: "Could not update equipped item. Please try again."
		};
	}
}
/**
* ADMIN CRUD — Create or update a Store Product in Firestore + Backend API.
* Strictly restricted to verified Lenzo Party Admins.
*/
async function adminSaveStoreProduct(product) {
	if (!isVerifiedAdminSession()) return {
		success: false,
		error: "Admin authorization required."
	};
	const sanitizedId = product.id?.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || `${product.categoryId}_${Date.now()}`;
	const payload = {
		...product,
		id: sanitizedId,
		name: product.name.trim().slice(0, 64),
		description: (product.description || "").trim().slice(0, 320),
		priceCoins: Math.max(1, Math.round(Number(product.priceCoins || 100))),
		imageUrl: (product.imageUrl || "").trim(),
		animationUrl: (product.animationUrl || "").trim(),
		badgeText: (product.badgeText || "").trim().slice(0, 24),
		sortOrder: Math.max(0, Math.round(Number(product.sortOrder ?? 10))),
		enabled: product.enabled !== false,
		isFeatured: Boolean(product.isFeatured)
	};
	try {
		await setDoc(doc(db, "store_products", sanitizedId), {
			...payload,
			updatedAt: serverTimestamp(),
			createdAt: product.createdAt || serverTimestamp()
		}, { merge: true });
		try {
			const headers = await getAuthHeaders();
			await fetch("/api/admin/store/products", {
				method: "POST",
				headers,
				body: JSON.stringify(payload)
			});
		} catch {}
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Failed to save store product."
		};
	}
}
/**
* ADMIN CRUD — Delete a Store Product from Firestore + Backend API.
*/
async function adminDeleteStoreProduct(productId) {
	if (!isVerifiedAdminSession()) return {
		success: false,
		error: "Admin authorization required."
	};
	try {
		await deleteDoc(doc(db, "store_products", productId));
		try {
			const headers = await getAuthHeaders();
			await fetch(`/api/admin/store/products/${encodeURIComponent(productId)}`, {
				method: "DELETE",
				headers
			});
		} catch {}
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err instanceof Error ? err.message : "Failed to delete product."
		};
	}
}
/**
* ADMIN UTILITY — Seed default Lenzo Store catalog into Firestore if empty or reset requested.
*/
async function adminSeedDefaultStoreCatalog() {
	if (!isVerifiedAdminSession()) return {
		success: false,
		count: 0,
		error: "Admin authorization required."
	};
	try {
		const batch = writeBatch(db);
		DEFAULT_STORE_CATEGORIES.forEach((cat) => {
			batch.set(doc(db, "store_categories", cat.id), {
				id: cat.id,
				title: cat.title,
				subtitle: cat.subtitle,
				accentFrom: cat.accentFrom,
				accentTo: cat.accentTo,
				glowColor: cat.glowColor,
				order: cat.order,
				enabled: cat.enabled,
				updatedAt: serverTimestamp()
			}, { merge: true });
		});
		DEFAULT_STORE_PRODUCTS.forEach((prod) => {
			batch.set(doc(db, "store_products", prod.id), {
				...prod,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			}, { merge: true });
		});
		await batch.commit();
		return {
			success: true,
			count: DEFAULT_STORE_PRODUCTS.length
		};
	} catch (err) {
		return {
			success: false,
			count: 0,
			error: err instanceof Error ? err.message : "Failed to seed catalog."
		};
	}
}
// src/components/common/StoreAssetPreview.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var SIZE_CLASSES = {
	sm: {
		box: "w-[74px] h-[74px]",
		avatar: "w-11 h-11",
		crown: "w-4 h-4"
	},
	md: {
		box: "w-[104px] h-[104px]",
		avatar: "w-14 h-14",
		crown: "w-5 h-5"
	},
	lg: {
		box: "w-[126px] h-[126px]",
		avatar: "w-16 h-16",
		crown: "w-6 h-6"
	},
	xl: {
		box: "w-[220px] h-[220px]",
		avatar: "w-28 h-28",
		crown: "w-9 h-9"
	}
};
function isVideoUrl(url) {
	if (!url) return false;
	return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith("data:video/");
}
/**
* Real GPU-accelerated animated visual showcase for all 4 Lenzo Party Store categories:
* - VIP FRAMES: rotating flame/galaxy/diamond halos around the user's real avatar
* - SPECIAL ENTRY: opening golden palace gates, red carpet shimmer & sweeping spotlights
* - CUSTOM GIFT: bouncing glowing gift box with popping lid & rising particle burst
* - PREMIUM ASSETS: floating multifaceted neon purple diamond with orbital light rings
* Also supports admin-uploaded custom image / GIF / video assets seamlessly.
*/
var StoreAssetPreview = ({ product, userAvatar, userName = "VIP", size = "md", isPlaying = true, className = "" }) => {
	const s = SIZE_CLASSES[size];
	const videoRef = (0, import_react.useRef)(null);
	const customAnimUrl = product.animationUrl?.trim();
	const customImgUrl = product.imageUrl?.trim();
	(0, import_react.useEffect)(() => {
		const vid = videoRef.current;
		if (!vid) return;
		if (isPlaying) vid.play().catch(() => {});
		else vid.pause();
	}, [isPlaying, customAnimUrl]);
	if (customAnimUrl && isVideoUrl(customAnimUrl)) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`,
		style: {
			boxShadow: `0 0 24px ${product.glowColor}`,
			background: "radial-gradient(circle at center, rgba(139,32,255,0.28), rgba(9,4,18,0.95))"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
			ref: videoRef,
			src: customAnimUrl,
			loop: true,
			muted: true,
			playsInline: true,
			autoPlay: isPlaying,
			className: "w-full h-full object-cover"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "pointer-events-none absolute inset-0 rounded-2xl border",
			style: { borderColor: `${product.accentColor}66` }
		})]
	});
	if (customAnimUrl && !isVideoUrl(customAnimUrl) || customImgUrl) {
		const mediaSrc = customAnimUrl || customImgUrl;
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`,
			style: {
				boxShadow: `0 0 22px ${product.glowColor}`,
				background: "radial-gradient(circle at center, rgba(139,32,255,0.26), rgba(8,4,16,0.95))"
			},
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `absolute inset-0 pointer-events-none ${isPlaying ? "animate-lenzo-glow" : ""}`,
				style: {
					background: `radial-gradient(circle, ${product.glowColor} 0%, transparent 70%)`,
					opacity: .45
				}
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: mediaSrc,
				alt: product.name,
				className: `relative z-10 w-[88%] h-[88%] object-contain rounded-xl ${isPlaying ? "animate-store-diamond" : ""}`
			})]
		});
	}
	if (product.categoryId === "vip_frames") {
		const preset = product.animationPreset;
		const isFlame = preset === "royal_flame";
		const isDiamond = preset === "diamond_aura";
		const ringConic = isFlame ? "conic-gradient(from 0deg, #FFF7CC, #FFC84A, #FF6B00, #DC2626, #FF9900, #FFF7CC)" : isDiamond ? "conic-gradient(from 0deg, #FFFFFF, #38BDF8, #C084FC, #E0F2FE, #818CF8, #FFFFFF)" : "conic-gradient(from 0deg, #F0ABFC, #A855F7, #EC4899, #38BDF8, #7C3AED, #F0ABFC)";
		const outerGlow = isFlame ? "radial-gradient(circle, rgba(255,140,0,0.65) 0%, rgba(255,60,0,0.2) 55%, transparent 75%)" : isDiamond ? "radial-gradient(circle, rgba(56,189,248,0.65) 0%, rgba(192,132,252,0.24) 55%, transparent 75%)" : "radial-gradient(circle, rgba(192,38,211,0.68) 0%, rgba(124,58,237,0.25) 55%, transparent 75%)";
		const initials = (userName || "LP").slice(0, 2).toUpperCase();
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `relative ${s.box} flex items-center justify-center select-none ${className}`,
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `absolute inset-0 rounded-full blur-md pointer-events-none ${isPlaying ? isFlame ? "animate-store-flame" : "animate-lenzo-glow" : ""}`,
				style: { background: outerGlow }
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `relative flex items-center justify-center rounded-full p-[3.5px] ${size === "xl" ? "w-36 h-36 p-[6px]" : size === "lg" ? "w-[88px] h-[88px] p-[4.5px]" : size === "md" ? "w-[74px] h-[74px] p-[4px]" : "w-[56px] h-[56px] p-[3px]"}`,
				style: { boxShadow: `0 0 ${size === "xl" ? "34px" : "16px"} ${product.glowColor}` },
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `absolute inset-0 rounded-full ${isPlaying ? "animate-lenzo-orbit-fast" : ""}`,
						style: { background: ringConic }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `absolute -inset-[3px] rounded-full border border-dashed opacity-75 pointer-events-none ${isPlaying ? "animate-store-reverse-orbit" : ""}`,
						style: { borderColor: product.accentColor }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative z-10 w-full h-full rounded-full overflow-hidden bg-[#120724] ring-2 ring-[#0A0314] flex items-center justify-center",
						children: userAvatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: userAvatar,
							alt: userName,
							referrerPolicy: "no-referrer",
							className: "w-full h-full object-cover"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-black text-amber-200 tracking-wider",
							children: initials
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `pointer-events-none absolute ${size === "xl" ? "-top-5 w-11 h-11" : size === "lg" ? "-top-3.5 w-7 h-7" : "-top-2.5 w-5 h-5"} left-1/2 -translate-x-1/2 z-20 rounded-full flex items-center justify-center border shadow-lg ${isPlaying ? "animate-lenzo-particle" : ""}`,
						style: {
							background: `linear-gradient(135deg, ${product.secondaryColor}, ${product.primaryColor})`,
							borderColor: product.accentColor,
							boxShadow: `0 0 14px ${product.glowColor}`
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: `${size === "xl" ? "w-6 h-6" : "w-3 h-3"} text-white fill-amber-200` })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `pointer-events-none absolute -top-1 -right-1 w-2 h-2 rounded-full z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
						style: {
							backgroundColor: product.accentColor,
							boxShadow: `0 0 10px ${product.accentColor}`
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `pointer-events-none absolute bottom-0 -left-1.5 w-1.5 h-1.5 rounded-full z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
						style: {
							backgroundColor: product.secondaryColor,
							boxShadow: `0 0 10px ${product.secondaryColor}`,
							animationDelay: "0.8s"
						}
					}),
					isDiamond && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: `pointer-events-none absolute -bottom-2 right-0 z-20 ${size === "xl" ? "w-6 h-6" : "w-3.5 h-3.5"} text-cyan-200 ${isPlaying ? "animate-lenzo-glow" : ""}` })
				]
			})]
		});
	}
	if (product.categoryId === "special_entry") {
		const isSpotlight = product.animationPreset === "phantom_spotlight";
		const carpetColor = isSpotlight ? "#9333EA" : "#DC2626";
		const carpetEdge = isSpotlight ? "#F0ABFC" : "#FACC15";
		return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: `relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`,
			style: {
				background: "radial-gradient(circle at 50% 25%, rgba(147,51,234,0.42) 0%, rgba(16,6,34,0.96) 72%)",
				boxShadow: `inset 0 0 18px ${product.glowColor}`
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `pointer-events-none absolute -top-3 left-1/4 w-10 h-[125%] origin-top blur-[2px] ${isPlaying ? "animate-store-spot-left" : ""}`,
					style: {
						background: `linear-gradient(180deg, ${product.secondaryColor}aa 0%, transparent 88%)`,
						clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)"
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `pointer-events-none absolute -top-3 right-1/4 w-10 h-[125%] origin-top blur-[2px] ${isPlaying ? "animate-store-spot-right" : ""}`,
					style: {
						background: `linear-gradient(180deg, ${product.primaryColor}aa 0%, transparent 88%)`,
						clipPath: "polygon(35% 0%, 65% 0%, 100% 100%, 0% 100%)"
					}
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 120 120",
					className: "relative z-10 w-[94%] h-[94%]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
							id: `goldArch_${product.id}`,
							x1: "0%",
							y1: "0%",
							x2: "100%",
							y2: "100%",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "0%",
									stopColor: "#FFF4B8"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "45%",
									stopColor: "#F59E0B"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
									offset: "100%",
									stopColor: "#B45309"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
							id: `carpet_${product.id}`,
							x1: "0%",
							y1: "0%",
							x2: "0%",
							y2: "100%",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: carpetColor,
								stopOpacity: "0.95"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#450A0A"
							})]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
							cx: "60",
							cy: "56",
							rx: "28",
							ry: "32",
							fill: product.secondaryColor,
							opacity: "0.28"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
							points: "43,78 77,78 98,118 22,118",
							fill: `url(#carpet_${product.id})`,
							stroke: carpetEdge,
							strokeWidth: "2.2"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "60",
							y1: "80",
							x2: "60",
							y2: "116",
							stroke: carpetEdge,
							strokeWidth: "1",
							strokeDasharray: "3 3",
							opacity: "0.7"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
							className: isPlaying ? "animate-store-gate-left" : "",
							style: { transformOrigin: "32px 58px" },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
									x: "33",
									y: "36",
									width: "26",
									height: "44",
									rx: "2",
									fill: "#2A104E",
									stroke: `url(#goldArch_${product.id})`,
									strokeWidth: "2.2"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "41",
									y1: "38",
									x2: "41",
									y2: "78",
									stroke: "#FCD34D",
									strokeWidth: "1.2",
									opacity: "0.85"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "50",
									y1: "38",
									x2: "50",
									y2: "78",
									stroke: "#FCD34D",
									strokeWidth: "1.2",
									opacity: "0.85"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
							className: isPlaying ? "animate-store-gate-right" : "",
							style: { transformOrigin: "88px 58px" },
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
									x: "61",
									y: "36",
									width: "26",
									height: "44",
									rx: "2",
									fill: "#2A104E",
									stroke: `url(#goldArch_${product.id})`,
									strokeWidth: "2.2"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "70",
									y1: "38",
									x2: "70",
									y2: "78",
									stroke: "#FCD34D",
									strokeWidth: "1.2",
									opacity: "0.85"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
									x1: "79",
									y1: "38",
									x2: "79",
									y2: "78",
									stroke: "#FCD34D",
									strokeWidth: "1.2",
									opacity: "0.85"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M24 84 L24 44 C24 22 96 22 96 44 L96 84",
							fill: "none",
							stroke: `url(#goldArch_${product.id})`,
							strokeWidth: "6.5",
							strokeLinecap: "round"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M48 21 L52 11 L60 17 L68 11 L72 21 Z",
							fill: `url(#goldArch_${product.id})`,
							stroke: "#FFFBEB",
							strokeWidth: "1"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "24",
							cy: "90",
							r: "3",
							fill: "#FDE047"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "24",
							y1: "93",
							x2: "24",
							y2: "112",
							stroke: "#F59E0B",
							strokeWidth: "2.5"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "96",
							cy: "90",
							r: "3",
							fill: "#FDE047"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
							x1: "96",
							y1: "93",
							x2: "96",
							y2: "112",
							stroke: "#F59E0B",
							strokeWidth: "2.5"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `pointer-events-none absolute bottom-4 left-1/2 w-2 h-2 rounded-full bg-amber-300 z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
					style: { boxShadow: "0 0 10px #FDE047" }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: `pointer-events-none absolute bottom-6 left-1/3 w-1.5 h-1.5 rounded-full bg-fuchsia-300 z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
					style: {
						boxShadow: "0 0 10px #F0ABFC",
						animationDelay: "0.7s"
					}
				})
			]
		});
	}
	if (product.categoryId === "custom_gift") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`,
		style: { background: "radial-gradient(circle at 50% 55%, rgba(168,85,247,0.42) 0%, rgba(14,5,28,0.96) 72%)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `pointer-events-none absolute w-20 h-20 rounded-full blur-xl ${isPlaying ? "animate-lenzo-glow" : ""}`,
				style: {
					background: product.glowColor,
					opacity: .65
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `pointer-events-none absolute top-1/3 left-1/3 w-2 h-2 rounded-full bg-amber-300 z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
				style: { boxShadow: "0 0 10px #FACC15" }
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `pointer-events-none absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-pink-400 z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
				style: {
					boxShadow: "0 0 10px #F472B6",
					animationDelay: "0.55s"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `pointer-events-none absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-cyan-300 z-20 ${isPlaying ? "animate-store-sparkle-rise" : ""}`,
				style: {
					boxShadow: "0 0 8px #67E8F9",
					animationDelay: "1.1s"
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 120 120",
				className: `relative z-10 w-[86%] h-[86%] drop-shadow-[0_6px_14px_rgba(168,85,247,0.65)] ${isPlaying ? "animate-store-gift-bounce" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: `boxBody_${product.id}`,
						x1: "0%",
						y1: "0%",
						x2: "100%",
						y2: "100%",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "0%",
							stopColor: product.primaryColor
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
							offset: "100%",
							stopColor: "#3B0764"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: `ribbonGold_${product.id}`,
						x1: "0%",
						y1: "0%",
						x2: "100%",
						y2: "100%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#FEF08A"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "50%",
								stopColor: "#F59E0B"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#B45309"
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "24",
						y: "52",
						width: "72",
						height: "50",
						rx: "10",
						fill: `url(#boxBody_${product.id})`,
						stroke: "#E879F9",
						strokeWidth: "2.2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "52",
						y: "52",
						width: "16",
						height: "50",
						fill: `url(#ribbonGold_${product.id})`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
						x: "30",
						y: "58",
						width: "14",
						height: "36",
						rx: "4",
						fill: "#FFFFFF",
						opacity: "0.14"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", {
						className: isPlaying ? "animate-store-gift-lid" : "",
						style: { transformOrigin: "60px 52px" },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: "18",
								y: "36",
								width: "84",
								height: "19",
								rx: "6",
								fill: `url(#boxBody_${product.id})`,
								stroke: "#F0ABFC",
								strokeWidth: "2.2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
								x: "52",
								y: "36",
								width: "16",
								height: "19",
								fill: `url(#ribbonGold_${product.id})`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M60 36 C46 14 26 22 36 35 C42 40 54 37 60 36 Z",
								fill: `url(#ribbonGold_${product.id})`,
								stroke: "#FFFBEB",
								strokeWidth: "1.2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
								d: "M60 36 C74 14 94 22 84 35 C78 40 66 37 60 36 Z",
								fill: `url(#ribbonGold_${product.id})`,
								stroke: "#FFFBEB",
								strokeWidth: "1.2"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
								cx: "60",
								cy: "35",
								r: "5.5",
								fill: "#FEF08A",
								stroke: "#D97706",
								strokeWidth: "1.5"
							})
						]
					})
				]
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `relative ${s.box} rounded-2xl overflow-hidden flex items-center justify-center select-none ${className}`,
		style: { background: "radial-gradient(circle at center, rgba(168,85,247,0.38) 0%, rgba(11,4,24,0.96) 72%)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `pointer-events-none absolute w-[86%] h-[86%] rounded-full border-2 opacity-75 ${isPlaying ? "animate-lenzo-orbit" : ""}`,
				style: {
					borderColor: `${product.primaryColor} transparent ${product.secondaryColor} transparent`,
					boxShadow: `0 0 18px ${product.glowColor}`
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `pointer-events-none absolute w-[72%] h-[72%] rounded-full border border-dashed opacity-70 ${isPlaying ? "animate-store-reverse-orbit" : ""}`,
				style: { borderColor: product.accentColor }
			}),
			isPlaying && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-y-0 w-10 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-store-shimmer" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
				viewBox: "0 0 120 120",
				className: `relative z-10 w-[72%] h-[72%] drop-shadow-[0_0_16px_rgba(217,70,239,0.85)] ${isPlaying ? "animate-store-diamond" : ""}`,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: `gemTop_${product.id}`,
						x1: "0%",
						y1: "0%",
						x2: "100%",
						y2: "100%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: "#FDF4FF"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "45%",
								stopColor: product.primaryColor
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: product.secondaryColor
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
						id: `gemBot_${product.id}`,
						x1: "0%",
						y1: "0%",
						x2: "100%",
						y2: "100%",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "0%",
								stopColor: product.secondaryColor
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "55%",
								stopColor: "#6D28D9"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
								offset: "100%",
								stopColor: "#2E1065"
							})
						]
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
						points: "32,26 88,26 104,50 16,50",
						fill: `url(#gemTop_${product.id})`,
						stroke: "#FDE047",
						strokeWidth: "2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
						points: "16,50 104,50 60,104",
						fill: `url(#gemBot_${product.id})`,
						stroke: "#FDE047",
						strokeWidth: "2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
						points: "32,26 42,50 60,104 78,50 88,26",
						fill: "none",
						stroke: "#F5D0FE",
						strokeWidth: "1.5",
						opacity: "0.85"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polyline", {
						points: "42,50 60,26 78,50",
						fill: "none",
						stroke: "#FFFFFF",
						strokeWidth: "1.5",
						opacity: "0.85"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
						points: "42,50 78,50 60,104",
						fill: "#FFFFFF",
						opacity: "0.14"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: `pointer-events-none absolute top-2 right-2 w-3.5 h-3.5 text-amber-300 z-20 ${isPlaying ? "animate-lenzo-particle" : ""}` }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, {
				className: `pointer-events-none absolute bottom-2 left-2 w-3 h-3 text-fuchsia-300 z-20 ${isPlaying ? "animate-lenzo-particle" : ""}`,
				style: { animationDelay: "0.9s" }
			})
		]
	});
};
export { purchaseStoreProduct as a, subscribeUserInventory as c, DEFAULT_STORE_PRODUCTS as d, STORE_ANIMATION_PRESET_OPTIONS as f, adminSeedDefaultStoreCatalog as i, toggleEquipInventoryItem as l, adminDeleteStoreProduct as n, subscribeStoreCategories as o, adminSaveStoreProduct as r, subscribeStoreProducts as s, StoreAssetPreview as t, DEFAULT_STORE_CATEGORIES as u };
