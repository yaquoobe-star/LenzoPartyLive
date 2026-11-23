import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { $t as CircleX, A as ShoppingBag, D as Smartphone, Ft as FileSpreadsheet, Gt as Database, It as FileClock, K as Plus, Kt as Crown, L as Send, Lt as Eye, N as ShieldCheck, P as ShieldAlert, Q as PenLine, Qt as Clock, R as Search, Rt as EyeOff, T as Sparkles, U as RefreshCw, Ut as Download, Wt as DollarSign, Y as Phone, Zt as Coins, _ as TriangleAlert, _t as Layers, a as Wallet, bn as Ban, cn as Check, ct as Megaphone, en as CirclePause, h as Upload, j as Shield, k as SlidersVertical, kn as require_react, kt as Gem, mn as Building2, pt as LockOpen, r as X, rn as CircleAlert, rt as Minus, st as MessageCircle, tn as CircleCheck, u as Users, un as ChartColumn, v as TrendingUp, vt as Landmark, w as Star, xt as IdCard, y as Trash2, z as Save } from "./vendor-icons-sqDS8tFw.js";
import { i as db, r as auth } from "./firebase-CcEQ85aw.js";
import { i as isVerifiedAdminSession, r as isAuthorizedAdminEmail } from "./adminAuth-CSEij6hU.js";
import { A as adminUnbanDevice, B as adminUpdateWithdrawalStatus, C as VipTierBadge, D as adminSendSystemCoinsToAgency, E as adminEditUserProfileAndProgression, Ft as ALL_100_LEVELS, G as subscribeAllWithdrawalRequests, K as subscribeCoinPackages, M as subscribeAllUsersForAdmin, N as subscribeBannedDevicesForAdmin, O as adminSetUserBlockStatus, S as SuperVipTierBadge, St as uploadMediaDataUrlWithProgress, T as adminBanDevice, _ as subscribeAllAgenciesForAdmin, at as calculateWithdrawalWaterfall, b as LevelEmblemBadge, ct as normalizeEconomyConfig, d as VerifiedTick, dt as validateEconomySettings, h as buildWhatsAppUrl, it as calculateGiftSplit, j as subscribeAdminAuditLogs, k as adminSetUserSuspension, lt as roundPkr, m as adminSetAgencyStatus, nt as OFFICIAL_ECONOMY_DEFAULTS, ot as getDayKey, p as adminReviewAgencyApplication, rt as calculateCoinPurchasePricePkr, st as getMonthKey, tt as OFFICIAL_DEFAULT_COIN_PACKAGES, ut as runFinancialQaAssertions, v as subscribeAllAgencyApplications, w as adminAdjustUserCoins, wt as uploadReelVideoAndThumbnail, y as LevelBadge } from "./index-BlxLtZF6.js";
import { m as sendPushNotification, p as sendAdminGlobalPushBroadcast } from "./pushNotificationService-C6Lw_OKQ.js";
import { i as require_jsx_runtime } from "./vendor-motion-CI-970bO.js";
import { f as STORE_ANIMATION_PRESET_OPTIONS, i as adminSeedDefaultStoreCatalog, n as adminDeleteStoreProduct, r as adminSaveStoreProduct, s as subscribeStoreProducts, t as StoreAssetPreview, u as DEFAULT_STORE_CATEGORIES } from "./StoreAssetPreview-DapRaNl4.js";
import { N as serverTimestamp, O as collection, S as setDoc, b as query, f as deleteDoc, g as limit, h as getDocs, j as increment, k as doc, p as getDoc, v as onSnapshot, x as runTransaction, y as orderBy } from "./vendor-firebase-BXfD3et1.js";
import { r as apiUrl } from "./apiConfig-ByhnP-Sj.js";
// src/components/screens/AdminUsersControlTab.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var QUICK_COIN_PRESETS = [
	1e4,
	5e4,
	1e5,
	5e5,
	1e6,
	5e6
];
var SUSPEND_DURATIONS = [
	{
		label: "24 Hours",
		hours: 24
	},
	{
		label: "7 Days",
		hours: 168
	},
	{
		label: "30 Days",
		hours: 720
	},
	{
		label: "Permanent",
		hours: 0
	}
];
var AdminUsersControlTab = ({ onNotify, onError }) => {
	const [users, setUsers] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [searchQuery, setSearchQuery] = (0, import_react.useState)("");
	const [statusFilter, setStatusFilter] = (0, import_react.useState)("all");
	const [selectedUid, setSelectedUid] = (0, import_react.useState)(null);
	const [busyAction, setBusyAction] = (0, import_react.useState)(null);
	const [coinAmountInput, setCoinAmountInput] = (0, import_react.useState)("50000");
	const [coinReason, setCoinReason] = (0, import_react.useState)("Direct Admin Coin Grant");
	const [editName, setEditName] = (0, import_react.useState)("");
	const [editUsername, setEditUsername] = (0, import_react.useState)("");
	const [editLevel, setEditLevel] = (0, import_react.useState)("0");
	const [editVipLevel, setEditVipLevel] = (0, import_react.useState)("0");
	const [editSuperVipLevel, setEditSuperVipLevel] = (0, import_react.useState)("0");
	const [editVerificationTier, setEditVerificationTier] = (0, import_react.useState)("none");
	const [editVerifiedTag, setEditVerifiedTag] = (0, import_react.useState)("");
	const [enforcementReason, setEnforcementReason] = (0, import_react.useState)("");
	const [suspendHours, setSuspendHours] = (0, import_react.useState)(24);
	const [manualDeviceIdInput, setManualDeviceIdInput] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		setLoading(true);
		const unsub = subscribeAllUsersForAdmin((list) => {
			setUsers(list);
			setLoading(false);
		}, (errMsg) => {
			setLoading(false);
			onError(errMsg);
		});
		return () => unsub();
	}, [onError]);
	const selectedUser = (0, import_react.useMemo)(() => users.find((u) => u.uid === selectedUid) || null, [users, selectedUid]);
	(0, import_react.useEffect)(() => {
		if (!selectedUser) return;
		setEditName(selectedUser.fullName);
		setEditUsername(selectedUser.username.replace(/^@/, ""));
		setEditLevel(String(selectedUser.level));
		setEditVipLevel(String(selectedUser.vipLevel));
		setEditSuperVipLevel(String(selectedUser.superVipLevel));
		setEditVerificationTier(selectedUser.verificationTier);
		setEditVerifiedTag(selectedUser.verifiedTag);
		setEnforcementReason(selectedUser.blockReason || selectedUser.suspendReason || "");
		setManualDeviceIdInput(selectedUser.lastDeviceId || "");
	}, [selectedUser?.uid]);
	const stats = (0, import_react.useMemo)(() => {
		const now = Date.now();
		let online = 0;
		let blocked = 0;
		let suspended = 0;
		let deviceBanned = 0;
		let vip = 0;
		users.forEach((u) => {
			if (u.isOnline) online += 1;
			if (u.isBlocked || u.accountStatus === "blocked") blocked += 1;
			if (u.accountStatus === "suspended" && (!u.suspendedUntil || u.suspendedUntil > now)) suspended += 1;
			if (u.isDeviceBanned) deviceBanned += 1;
			if (u.vipLevel > 0 || u.superVipLevel > 0) vip += 1;
		});
		return {
			total: users.length,
			online,
			blocked,
			suspended,
			deviceBanned,
			vip
		};
	}, [users]);
	const filteredUsers = (0, import_react.useMemo)(() => {
		const q = searchQuery.trim().toLowerCase();
		const now = Date.now();
		return users.filter((u) => {
			if (statusFilter === "active") {
				if (u.isBlocked || u.accountStatus === "blocked" || u.accountStatus === "suspended" || u.isDeviceBanned) return false;
			} else if (statusFilter === "blocked") {
				if (!u.isBlocked && u.accountStatus !== "blocked") return false;
			} else if (statusFilter === "suspended") {
				if (u.accountStatus !== "suspended" || u.suspendedUntil > 0 && u.suspendedUntil <= now) return false;
			} else if (statusFilter === "device_banned") {
				if (!u.isDeviceBanned) return false;
			} else if (statusFilter === "vip") {
				if (u.vipLevel <= 0 && u.superVipLevel <= 0) return false;
			}
			if (!q) return true;
			return u.fullName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.displayId.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q) || u.lastDeviceId.toLowerCase().includes(q);
		});
	}, [
		users,
		searchQuery,
		statusFilter
	]);
	const handleCoinAction = async (mode) => {
		if (!selectedUser) return;
		const amt = Math.trunc(Number(coinAmountInput));
		if (!Number.isFinite(amt) || mode !== "set" && amt <= 0 || amt < 0) {
			onError("Please enter a valid coin amount.");
			return;
		}
		setBusyAction(`coins_${mode}`);
		const res = await adminAdjustUserCoins({
			targetUid: selectedUser.uid,
			amount: amt,
			mode,
			reason: coinReason
		});
		setBusyAction(null);
		if (res.success) onNotify(`${selectedUser.fullName}: Coin balance updated to ${(res.newBalance ?? 0).toLocaleString()} coins.`);
		else onError(res.error || "Failed to adjust coins.");
	};
	const handleSaveProfileAndProgression = async (e) => {
		e.preventDefault();
		if (!selectedUser) return;
		setBusyAction("save_profile");
		const res = await adminEditUserProfileAndProgression({
			targetUid: selectedUser.uid,
			fullName: editName,
			username: editUsername,
			level: Number(editLevel),
			vipLevel: Number(editVipLevel),
			superVipLevel: Number(editSuperVipLevel),
			verificationTier: editVerificationTier,
			verifiedTag: editVerifiedTag,
			reason: "Admin direct profile, level & VIP update"
		});
		setBusyAction(null);
		if (res.success) onNotify(`Saved ${editName.trim()} (@${editUsername.replace(/^@/, "")}) · Lv.${editLevel} · VIP ${editVipLevel}`);
		else onError(res.error || "Failed to update user profile.");
	};
	const handleToggleBlock = async (blocked) => {
		if (!selectedUser) return;
		setBusyAction("block");
		const res = await adminSetUserBlockStatus({
			targetUid: selectedUser.uid,
			targetName: selectedUser.fullName,
			blocked,
			reason: enforcementReason || (blocked ? "Blocked by Lenzo Administration" : "Unblocked by Administration")
		});
		setBusyAction(null);
		if (res.success) onNotify(blocked ? `Blocked ${selectedUser.fullName}.` : `Unblocked ${selectedUser.fullName}.`);
		else onError(res.error || "Failed to update block status.");
	};
	const handleToggleSuspend = async (suspended) => {
		if (!selectedUser) return;
		setBusyAction("suspend");
		const res = await adminSetUserSuspension({
			targetUid: selectedUser.uid,
			targetName: selectedUser.fullName,
			suspended,
			durationHours: suspendHours,
			reason: enforcementReason || (suspended ? "ID Suspended by Lenzo Administration" : "Suspension lifted")
		});
		setBusyAction(null);
		if (res.success) onNotify(suspended ? `Suspended ${selectedUser.fullName} (${suspendHours === 0 ? "Permanent" : `${suspendHours}h`}).` : `Restored ${selectedUser.fullName} from suspension.`);
		else onError(res.error || "Failed to update suspension status.");
	};
	const handleBanOrUnbanDevice = async (ban) => {
		if (!selectedUser) return;
		const deviceId = (manualDeviceIdInput || selectedUser.lastDeviceId || "").trim();
		if (!deviceId) {
			onError("No Device ID recorded yet for this account. Enter a Device ID manually or wait for user sign-in.");
			return;
		}
		setBusyAction("device_ban");
		const res = ban ? await adminBanDevice({
			deviceId,
			targetUid: selectedUser.uid,
			targetUserName: selectedUser.fullName,
			targetUserEmail: selectedUser.email,
			reason: enforcementReason || "Device permanently banned by Lenzo Administration"
		}) : await adminUnbanDevice({
			deviceId,
			targetUid: selectedUser.uid,
			targetUserName: selectedUser.fullName
		});
		setBusyAction(null);
		if (res.success) onNotify(ban ? `Device ${deviceId} banned immediately.` : `Device ${deviceId} unbanned.`);
		else onError(res.error || "Device ban action failed.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-3 sm:grid-cols-6 gap-2",
				children: [
					{
						label: "Total IDs",
						value: stats.total,
						color: "text-white",
						bg: "bg-white/[0.04]"
					},
					{
						label: "Online",
						value: stats.online,
						color: "text-emerald-300",
						bg: "bg-emerald-500/10"
					},
					{
						label: "VIP Users",
						value: stats.vip,
						color: "text-[#FFC84A]",
						bg: "bg-amber-500/10"
					},
					{
						label: "Blocked",
						value: stats.blocked,
						color: "text-rose-300",
						bg: "bg-rose-500/10"
					},
					{
						label: "Suspended",
						value: stats.suspended,
						color: "text-orange-300",
						bg: "bg-orange-500/10"
					},
					{
						label: "Device Ban",
						value: stats.deviceBanned,
						color: "text-fuchsia-300",
						bg: "bg-fuchsia-500/10"
					}
				].map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `p-2.5 rounded-xl border border-white/10 ${item.bg} text-center`,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: `text-base font-black font-mono tabular-nums ${item.color}`,
						children: item.value.toLocaleString()
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[10px] font-bold text-[#B9AECF] uppercase tracking-wider",
						children: item.label
					})]
				}, item.label))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-[#B9AECF] absolute left-3.5 top-1/2 -translate-y-1/2" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: searchQuery,
							onChange: (e) => setSearchQuery(e.target.value),
							placeholder: "Search by Name, @username, Email, Lenzo ID (LP...), UID or Device ID...",
							className: "w-full pl-10 pr-9 py-2.5 rounded-xl bg-black/45 border border-white/15 text-xs text-white placeholder:text-[#9A8DB5] focus:outline-none focus:border-[#FFC84A]/60"
						}),
						searchQuery && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSearchQuery(""),
							className: "absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#B9AECF] hover:text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5",
					children: [
						{
							id: "all",
							label: `All IDs (${stats.total})`
						},
						{
							id: "active",
							label: "Active"
						},
						{
							id: "vip",
							label: `VIP (${stats.vip})`
						},
						{
							id: "blocked",
							label: `Blocked (${stats.blocked})`
						},
						{
							id: "suspended",
							label: `Suspended (${stats.suspended})`
						},
						{
							id: "device_banned",
							label: `Device Banned (${stats.deviceBanned})`
						}
					].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setStatusFilter(f.id),
						className: `px-3 py-1.5 rounded-xl text-[11px] font-extrabold whitespace-nowrap transition-all ${statusFilter === f.id ? "bg-[#FFC84A] text-[#090611]" : "bg-white/[0.06] text-[#C5B9DE] hover:text-white"}`,
						children: f.label
					}, f.id))
				})]
			}),
			loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "py-12 flex flex-col items-center gap-2 text-xs text-[#B9AECF]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-6 h-6 animate-spin text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Streaming all user accounts in real time..." })]
			}) : filteredUsers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "w-8 h-8 text-[#B9AECF]/50 mx-auto" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-bold text-white",
						children: "No matching user accounts found"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-[11px] text-[#B9AECF]",
						children: "Try clearing your search or status filter."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2.5",
				children: filteredUsers.map((u) => {
					const isSuspendedActive = u.accountStatus === "suspended" && (!u.suspendedUntil || u.suspendedUntil > Date.now());
					const isSelected = selectedUid === u.uid;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `p-3.5 rounded-2xl border transition-all ${isSelected ? "bg-[#21103C] border-[#FFC84A]/60 shadow-[0_0_24px_rgba(255,200,74,0.12)]" : "bg-[#160B2B] border-white/10 hover:border-white/20"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-3 min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: u.profileImage || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + u.uid,
										alt: u.fullName,
										className: "w-11 h-11 rounded-full object-cover border border-white/15 bg-black/40"
									}), u.isOnline && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#160B2B] absolute -bottom-0.5 -right-0.5" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1 space-y-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 flex-wrap",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-black text-white truncate max-w-[180px]",
													children: u.fullName
												}),
												u.verificationTier === "gold" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VerifiedTick, {
													tier: "gold",
													size: "xs"
												}),
												u.verificationTier === "blue" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VerifiedTick, {
													tier: "blue",
													size: "xs"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, {
													level: u.level,
													size: "xs"
												}),
												u.vipLevel > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
													tier: u.vipLevel,
													size: "xs"
												}),
												u.superVipLevel > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
													tier: u.superVipLevel,
													size: "xs"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap text-[11px] text-[#C5B9DE]",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-[#E8DEFA]",
													children: u.username
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-[#FFC84A]",
													children: u.displayId
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "·" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "truncate max-w-[190px]",
													children: u.email || "No email"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap text-[11px]",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/25 text-[#FFC84A] font-mono font-bold tabular-nums",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-3 h-3" }), u.coins.toLocaleString()]
												}),
												u.lastDeviceId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/[0.06] text-[#B9AECF] font-mono text-[10px]",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-3 h-3 text-sky-400" }), u.lastDeviceId.slice(0, 14)]
												}),
												u.isBlocked && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-[10px] font-black uppercase",
													children: "BLOCKED"
												}),
												isSuspendedActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "px-2 py-0.5 rounded-lg bg-orange-500/20 border border-orange-400/40 text-orange-200 text-[10px] font-black uppercase",
													children: "SUSPENDED"
												}),
												u.isDeviceBanned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "px-2 py-0.5 rounded-lg bg-fuchsia-500/25 border border-fuchsia-400/45 text-fuchsia-200 text-[10px] font-black uppercase",
													children: "DEVICE BANNED"
												})
											]
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSelectedUid(isSelected ? null : u.uid),
								className: `px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 transition-all ${isSelected ? "bg-white/15 text-white" : "bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] hover:brightness-110"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isSelected ? "Close" : "Control" })]
							})]
						}), isSelected && selectedUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 pt-4 border-t border-white/10 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/[0.07] text-[10px] font-mono text-[#B9AECF]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "truncate",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#8E81AA]",
												children: "UID:"
											}),
											" ",
											selectedUser.uid
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "truncate",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#8E81AA]",
												children: "Device:"
											}),
											" ",
											selectedUser.lastDeviceId ? `${selectedUser.lastDeviceId} (${selectedUser.lastDeviceInfo || "Registered"})` : "Not recorded yet"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 rounded-2xl bg-black/35 border border-amber-400/25 space-y-2.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2 flex-wrap",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
												className: "text-xs font-black text-[#FFC84A] uppercase tracking-wider flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Direct User Coins Control" })]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-mono font-black text-white tabular-nums",
												children: [
													"Balance: ",
													selectedUser.coins.toLocaleString(),
													" coins"
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex items-center gap-1.5 flex-wrap",
											children: QUICK_COIN_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => setCoinAmountInput(String(preset)),
												className: "px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[11px] font-mono font-bold text-[#FFC84A]",
												children: ["+", preset >= 1e6 ? `${preset / 1e6}M` : `${preset / 1e3}K`]
											}, preset))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: "0",
												value: coinAmountInput,
												onChange: (e) => setCoinAmountInput(e.target.value),
												placeholder: "Enter coins amount",
												className: "px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: coinReason,
												onChange: (e) => setCoinReason(e.target.value),
												placeholder: "Reason / Note",
												className: "px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: busyAction !== null,
													onClick: () => void handleCoinAction("add"),
													className: "flex-1 min-w-[110px] py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busyAction === "coins_add" ? "Adding..." : "Add Coins" })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: busyAction !== null,
													onClick: () => void handleCoinAction("deduct"),
													className: "px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/35 text-rose-200 text-xs font-black disabled:opacity-50",
													children: busyAction === "coins_deduct" ? "..." : "Deduct"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													disabled: busyAction !== null,
													onClick: () => void handleCoinAction("set"),
													className: "px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold disabled:opacity-50",
													children: busyAction === "coins_set" ? "..." : "Set Exact"
												})
											]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleSaveProfileAndProgression,
									className: "p-3.5 rounded-2xl bg-black/35 border border-fuchsia-400/25 space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
											className: "text-xs font-black text-fuchsia-300 uppercase tracking-wider flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-4 h-4 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Edit Name, Username, Level (0–100) & VIP" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
													children: "Display Name"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: editName,
													onChange: (e) => setEditName(e.target.value),
													maxLength: 60,
													className: "w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
													children: "Username (without @)"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "relative",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#9A8DB5]",
														children: "@"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "text",
														value: editUsername,
														onChange: (e) => setEditUsername(e.target.value.replace(/^@+/, "")),
														maxLength: 36,
														className: "w-full pl-7 pr-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
													})]
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
													children: "Level (0 – 100)"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													min: 0,
													max: 100,
													value: editLevel,
													onChange: (e) => setEditLevel(e.target.value),
													className: "w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "grid grid-cols-2 gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
														className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
														children: "VIP (0–12)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
														value: editVipLevel,
														onChange: (e) => setEditVipLevel(e.target.value),
														className: "w-full px-2.5 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white",
														children: Array.from({ length: 13 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: i,
															children: i === 0 ? "No VIP" : `VIP ${i}`
														}, i))
													})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
														className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
														children: "Super VIP (0–6)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
														value: editSuperVipLevel,
														onChange: (e) => setEditSuperVipLevel(e.target.value),
														className: "w-full px-2.5 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white",
														children: Array.from({ length: 7 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: i,
															children: i === 0 ? "None" : `SVIP ${i}`
														}, i))
													})] })]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
													children: "Verification Tick"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													value: editVerificationTier,
													onChange: (e) => setEditVerificationTier(e.target.value),
													className: "w-full px-3 py-2 rounded-xl bg-black/70 border border-white/15 text-xs text-white",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "none",
															children: "None / Standard"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "blue",
															children: "Blue Tick — Respect"
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
															value: "gold",
															children: "Golden Tick — Legend"
														})
													]
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[10px] font-bold text-[#B9AECF] block mb-1",
													children: "Custom Verified Tag (Optional)"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: editVerifiedTag,
													onChange: (e) => setEditVerifiedTag(e.target.value),
													maxLength: 32,
													placeholder: "e.g. Official, Legend",
													className: "w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
												})] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "submit",
											disabled: busyAction !== null,
											className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] hover:brightness-110 text-white text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busyAction === "save_profile" ? "Saving Live Changes..." : "Save Profile, Level & VIP (Real-Time)" })]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3.5 rounded-2xl bg-black/35 border border-rose-500/25 space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
											className: "text-xs font-black text-rose-300 uppercase tracking-wider flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldAlert, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Block User, Suspend ID & Device Ban" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: enforcementReason,
											onChange: (e) => setEnforcementReason(e.target.value),
											placeholder: "Enforcement reason shown to user (e.g. Policy violation, Spam, Fraud)...",
											className: "w-full px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5 flex-wrap",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-bold text-[#B9AECF] mr-1",
												children: "Suspend Duration:"
											}), SUSPEND_DURATIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setSuspendHours(opt.hours),
												className: `px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${suspendHours === opt.hours ? "bg-orange-500 text-black" : "bg-white/[0.07] text-[#C5B9DE] hover:text-white"}`,
												children: opt.label
											}, opt.label))]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
											children: [selectedUser.isBlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												disabled: busyAction !== null,
												onClick: () => void handleToggleBlock(false),
												className: "py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center justify-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unblock User" })]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												disabled: busyAction !== null,
												onClick: () => void handleToggleBlock(true),
												className: "py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center justify-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Block User Permanently" })]
											}), selectedUser.accountStatus === "suspended" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												disabled: busyAction !== null,
												onClick: () => void handleToggleSuspend(false),
												className: "py-2.5 px-3 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center justify-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unsuspend ID" })]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												disabled: busyAction !== null,
												onClick: () => void handleToggleSuspend(true),
												className: "py-2.5 px-3 rounded-xl bg-orange-500/25 hover:bg-orange-500/35 border border-orange-400/45 text-orange-200 text-xs font-black flex items-center justify-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CirclePause, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Suspend ID (",
													suspendHours === 0 ? "Permanent" : `${suspendHours >= 24 ? `${Math.round(suspendHours / 24)}d` : `${suspendHours}h`}`,
													")"
												] })]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "pt-2 border-t border-white/10 space-y-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: manualDeviceIdInput,
													onChange: (e) => setManualDeviceIdInput(e.target.value),
													placeholder: "User Device ID (auto-filled on login)",
													className: "flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/55 border border-white/15 text-xs text-white font-mono"
												}), selectedUser.isDeviceBanned ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: busyAction !== null,
													onClick: () => void handleBanOrUnbanDevice(false),
													className: "px-3.5 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unban Device" })]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: busyAction !== null,
													onClick: () => void handleBanOrUnbanDevice(true),
													className: "px-3.5 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black flex items-center gap-1.5 shrink-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ban Device" })]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-[#A59AB8]",
												children: "Device Ban immediately locks out this device across all accounts in real time until unbanned."
											})]
										})
									]
								})
							]
						})]
					}, u.uid);
				})
			})
		]
	});
};
// src/components/screens/AdminAgenciesTab.tsx
var AGENCY_COIN_PRESETS = [
	5e4,
	1e5,
	5e5,
	1e6,
	5e6
];
var AdminAgenciesTab = ({ onNotify, onError }) => {
	const [applications, setApplications] = (0, import_react.useState)([]);
	const [agencies, setAgencies] = (0, import_react.useState)([]);
	const [subTab, setSubTab] = (0, import_react.useState)("active");
	const [typeFilter, setTypeFilter] = (0, import_react.useState)("all");
	const [busyId, setBusyId] = (0, import_react.useState)(null);
	const [initialCoinsMap, setInitialCoinsMap] = (0, import_react.useState)({});
	const [adminNotesMap, setAdminNotesMap] = (0, import_react.useState)({});
	const [adjustAmountMap, setAdjustAmountMap] = (0, import_react.useState)({});
	(0, import_react.useEffect)(() => {
		const unsubApps = subscribeAllAgencyApplications((list) => setApplications(list));
		const unsubAgencies = subscribeAllAgenciesForAdmin((list) => setAgencies(list));
		return () => {
			unsubApps();
			unsubAgencies();
		};
	}, []);
	const pendingCount = (0, import_react.useMemo)(() => applications.filter((a) => a.status === "pending").length, [applications]);
	const filteredApps = (0, import_react.useMemo)(() => applications.filter((a) => typeFilter === "all" ? true : a.agencyType === typeFilter), [applications, typeFilter]);
	const filteredAgencies = (0, import_react.useMemo)(() => agencies.filter((a) => typeFilter === "all" ? true : a.agencyType === typeFilter), [agencies, typeFilter]);
	const handleReview = async (app, decision) => {
		setBusyId(app.id);
		const initialCoins = Number(initialCoinsMap[app.id] || 0);
		const note = adminNotesMap[app.id] || "";
		const res = await adminReviewAgencyApplication({
			application: app,
			decision,
			adminNote: note,
			initialCoinBalance: app.agencyType === "coin_seller" ? initialCoins : 0
		});
		setBusyId(null);
		if (res.success) onNotify(decision === "approved" ? `${app.agencyName} (${app.agencyType === "coin_seller" ? "Coin Seller" : "Host Agency"}) approved & activated!` : `Application for ${app.agencyName} rejected.`);
		else onError(res.error || "Failed to review application.");
	};
	const handleAdjustBalance = async (agency, sign) => {
		const raw = Number(adjustAmountMap[agency.id] || 0);
		if (!Number.isFinite(raw) || raw <= 0) {
			onError("Enter a positive coin amount first.");
			return;
		}
		setBusyId(agency.id);
		const res = await adminSendSystemCoinsToAgency({
			agencyId: agency.id,
			amount: Math.floor(raw),
			direction: sign,
			note: sign > 0 ? "System-Generated Coins Sent by Admin" : "Admin Agency Coin Deduction"
		});
		setBusyId(null);
		if (res.success) {
			onNotify(`${sign > 0 ? "Sent" : "Deducted"} ${Math.floor(raw).toLocaleString()} system coins (${agency.name}). New balance: ${(res.newBalance ?? 0).toLocaleString()} coins.`);
			setAdjustAmountMap((prev) => ({
				...prev,
				[agency.id]: ""
			}));
		} else onError(res.error || "Failed to update agency coin balance.");
	};
	const handleToggleStatus = async (agency) => {
		setBusyId(agency.id);
		const nextStatus = agency.status === "active" ? "suspended" : "active";
		const res = await adminSetAgencyStatus(agency.id, nextStatus);
		setBusyId(null);
		if (res.success) onNotify(`${agency.name} is now ${nextStatus.toUpperCase()}.`);
		else onError(res.error || "Failed to update agency status.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-1.5 bg-white/[0.05] p-1 rounded-xl border border-white/10",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSubTab("applications"),
						className: `px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${subTab === "applications" ? "bg-[#FFC84A] text-black" : "text-[#C5B9DE] hover:text-white"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3.5 h-3.5" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Applications" }),
							pendingCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black leading-none",
								children: pendingCount
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSubTab("active"),
						className: `px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all ${subTab === "active" ? "bg-[#FFC84A] text-black" : "text-[#C5B9DE] hover:text-white"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Active Agencies (",
							agencies.length,
							")"
						] })]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center gap-1",
					children: [
						{
							id: "all",
							label: "All Types"
						},
						{
							id: "coin_seller",
							label: "Coin Seller"
						},
						{
							id: "host_agency",
							label: "Host Agency"
						}
					].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setTypeFilter(f.id),
						className: `px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${typeFilter === f.id ? "bg-[#8B20FF] text-white" : "bg-white/[0.06] text-[#B9AECF] hover:text-white"}`,
						children: f.label
					}, f.id))
				})]
			}),
			subTab === "applications" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: filteredApps.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-8 h-8 text-[#B9AECF]/50 mx-auto" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-bold text-white",
							children: "No agency applications found"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-[#B9AECF]",
							children: "Coin Seller and Host Agency applications submitted by users appear here live."
						})
					]
				}) : filteredApps.map((app) => {
					const isCoinSeller = app.agencyType === "coin_seller";
					const waUrl = buildWhatsAppUrl(app.whatsappNumber, `Hello ${app.fullName}, this is Lenzo Party Admin regarding your ${isCoinSeller ? "Coin Seller Agency" : "Host Agency"} application (${app.agencyName}).`);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-2 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${isCoinSeller ? "bg-amber-500/20 text-amber-300 border border-amber-400/35" : "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/35"}`,
												children: isCoinSeller ? "Coin Seller Agency" : "Host Agency"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${app.status === "pending" ? "bg-sky-500/20 text-sky-300" : app.status === "approved" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`,
												children: app.status
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
											className: "text-sm font-black text-white mt-1",
											children: app.agencyName
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] text-[#C5B9DE]",
											children: [
												"Applicant: ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
													className: "text-white",
													children: app.fullName
												}),
												" (",
												app.username,
												") · ID:",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-[#FFC84A]",
													children: app.applicantDisplayId
												})
											]
										})
									]
								}), waUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: waUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "px-3 py-1.5 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-[11px] font-extrabold flex items-center gap-1.5 shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WhatsApp" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-black/35 border border-white/[0.07] text-[11px]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5 text-sky-400 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] text-[#A59AB8] block",
												children: "Phone / WhatsApp"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-white block truncate",
												children: [app.phoneNumber, app.whatsappNumber !== app.phoneNumber ? ` / ${app.whatsappNumber}` : ""]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(IdCard, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] text-[#A59AB8] block",
												children: "ID Card / CNIC"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-white block truncate",
												children: app.idCardNumber
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#A59AB8] block",
											children: "Firebase UID"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[#C5B9DE] block truncate",
											children: app.applicantUid
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#D5CBE8] bg-white/[0.03] rounded-xl p-2.5 border border-white/5 leading-relaxed",
								children: app.description
							}),
							app.status === "pending" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "pt-1 space-y-2.5 border-t border-white/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
									children: [isCoinSeller && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[10px] font-bold text-[#FFC84A] block mb-1",
										children: "Initial Agency Coin Balance (Optional)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: "0",
										value: initialCoinsMap[app.id] ?? "",
										onChange: (e) => setInitialCoinsMap((prev) => ({
											...prev,
											[app.id]: e.target.value
										})),
										placeholder: "e.g. 50000",
										className: "w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: isCoinSeller ? "" : "sm:col-span-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[10px] font-bold text-[#C5B9DE] block mb-1",
											children: "Admin Review Note (Optional)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: adminNotesMap[app.id] ?? "",
											onChange: (e) => setAdminNotesMap((prev) => ({
												...prev,
												[app.id]: e.target.value
											})),
											placeholder: "Approval welcome note or rejection reason...",
											className: "w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: busyId === app.id,
										onClick: () => void handleReview(app, "approved"),
										className: "flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busyId === app.id ? "Processing..." : "Approve & Activate" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: busyId === app.id,
										onClick: () => void handleReview(app, "rejected"),
										className: "px-4 py-2.5 rounded-xl bg-rose-600/25 hover:bg-rose-600/40 border border-rose-500/40 text-rose-200 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Reject" })]
									})]
								})]
							}) : app.adminNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-[#A59AB8]",
								children: ["Admin Note: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-white",
									children: app.adminNote
								})]
							})
						]
					}, app.id);
				})
			}),
			subTab === "active" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: filteredAgencies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-8 h-8 text-[#B9AECF]/50 mx-auto" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-bold text-white",
							children: "No approved agencies yet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-[#B9AECF]",
							children: "Approve pending applications to activate Coin Seller or Host Agencies."
						})
					]
				}) : filteredAgencies.map((agency) => {
					const isCoinSeller = agency.agencyType === "coin_seller";
					const waUrl = buildWhatsAppUrl(agency.whatsappNumber, `Hello ${agency.ownerName} (${agency.name}), this is Lenzo Party Admin.`);
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-2 flex-wrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2 flex-wrap",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isCoinSeller ? "bg-amber-500/20 text-amber-300 border border-amber-400/35" : "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-400/35"}`,
												children: isCoinSeller ? "Coin Seller" : "Host Agency"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-mono text-[#FFC84A] bg-white/[0.06] px-2 py-0.5 rounded",
												children: agency.agencyCode
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${agency.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}`,
												children: agency.status
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
										className: "text-sm font-black text-white mt-1",
										children: agency.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-[#C5B9DE]",
										children: [
											"Owner: ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
												className: "text-white",
												children: agency.ownerName
											}),
											" (",
											agency.ownerUsername,
											") · WhatsApp:",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-emerald-300",
												children: agency.whatsappNumber
											})
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 shrink-0",
								children: [waUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: waUrl,
									target: "_blank",
									rel: "noopener noreferrer",
									className: "px-2.5 py-1.5 rounded-lg bg-emerald-600/25 border border-emerald-400/40 text-emerald-200 text-[11px] font-bold flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WA" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									disabled: busyId === agency.id,
									onClick: () => void handleToggleStatus(agency),
									className: `px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 ${agency.status === "active" ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30" : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: agency.status === "active" ? "Suspend" : "Activate" })]
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 rounded-xl bg-black/35 border border-amber-400/20 space-y-2.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 flex-wrap text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-4 h-4 text-[#FFC84A]" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#C5B9DE]",
												children: "Agency Coin Balance:"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono font-black text-base text-[#FFC84A] tabular-nums",
												children: (agency.coinBalance || 0).toLocaleString()
											})
										]
									}), isCoinSeller ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] text-[#A59AB8] font-mono tabular-nums",
										children: [
											"Sent: ",
											(agency.totalTransferredCoins || 0).toLocaleString(),
											" · PIN:",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
												className: agency.hasPin ? "text-emerald-300" : "text-amber-300",
												children: agency.hasPin ? "Set" : "Not Set"
											})
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] text-fuchsia-300 font-semibold flex items-center gap-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "w-3.5 h-3.5" }),
											"Hosts: ",
											agency.totalHosts || 0,
											" · ",
											agency.isOnline ? "Accepting" : "Away"
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex items-center gap-1.5 flex-wrap",
									children: AGENCY_COIN_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setAdjustAmountMap((prev) => ({
											...prev,
											[agency.id]: String(preset)
										})),
										className: "px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[10px] font-mono font-bold text-[#FFC84A]",
										children: ["+", preset >= 1e6 ? `${preset / 1e6}M` : `${preset / 1e3}K`]
									}, preset))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: "1",
											value: adjustAmountMap[agency.id] ?? "",
											onChange: (e) => setAdjustAmountMap((prev) => ({
												...prev,
												[agency.id]: e.target.value
											})),
											placeholder: "System-generated coins (e.g. 500000)",
											className: "flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: busyId === agency.id,
											onClick: () => void handleAdjustBalance(agency, 1),
											className: "px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Send Coins" })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: busyId === agency.id,
											onClick: () => void handleAdjustBalance(agency, -1),
											className: "px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/35 text-rose-200 text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Deduct" })]
										})
									]
								})
							]
						})]
					}, agency.id);
				})
			})
		]
	});
};
// src/components/screens/AdminDeviceBansTab.tsx
var AdminDeviceBansTab = ({ onNotify, onError }) => {
	const [devices, setDevices] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [deviceIdInput, setDeviceIdInput] = (0, import_react.useState)("");
	const [reasonInput, setReasonInput] = (0, import_react.useState)("Permanent Device Ban by Lenzo Administration");
	const [busyId, setBusyId] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		setLoading(true);
		const unsub = subscribeBannedDevicesForAdmin((list) => {
			setDevices(list);
			setLoading(false);
		}, (err) => {
			setLoading(false);
			onError(err);
		});
		return () => unsub();
	}, [onError]);
	const handleManualBan = async (e) => {
		e.preventDefault();
		if (!deviceIdInput.trim()) {
			onError("Enter a valid Device ID to ban.");
			return;
		}
		setBusyId("manual");
		const res = await adminBanDevice({
			deviceId: deviceIdInput.trim(),
			reason: reasonInput.trim() || "Banned by Administration"
		});
		setBusyId(null);
		if (res.success) {
			onNotify(`Device ${deviceIdInput.trim()} added to permanent Device Ban registry.`);
			setDeviceIdInput("");
		} else onError(res.error || "Failed to ban device.");
	};
	const handleUnban = async (rec) => {
		setBusyId(rec.deviceId);
		const res = await adminUnbanDevice({
			deviceId: rec.deviceId,
			targetUid: rec.targetUid || void 0,
			targetUserName: rec.targetUserName || void 0
		});
		setBusyId(null);
		if (res.success) onNotify(`Device ${rec.deviceId} unbanned.`);
		else onError(res.error || "Failed to unban device.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: handleManualBan,
			className: "p-4 rounded-2xl bg-[#160B2B] border border-fuchsia-400/25 space-y-2.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-xs font-black uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ban Device ID Manually" })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: deviceIdInput,
						onChange: (e) => setDeviceIdInput(e.target.value),
						placeholder: "Device ID (e.g. dev_a1b2c3d4...)",
						className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: reasonInput,
						onChange: (e) => setReasonInput(e.target.value),
						placeholder: "Reason for Device Ban",
						className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "submit",
					disabled: busyId === "manual",
					className: "px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ban, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busyId === "manual" ? "Banning..." : "Ban Device Immediately" })]
				})
			]
		}), loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "py-10 flex flex-col items-center gap-2 text-xs text-[#B9AECF]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-5 h-5 animate-spin text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Loading banned devices registry..." })]
		}) : devices.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "py-12 text-center rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-8 h-8 text-emerald-400/60 mx-auto" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs font-bold text-white",
					children: "No Banned Devices"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-[#B9AECF]",
					children: "You can ban any user's device from the Users tab or enter a Device ID above."
				})
			]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2.5",
			children: devices.map((rec) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 flex items-center justify-between gap-3 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 space-y-1",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 flex-wrap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2 py-0.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 font-mono text-xs font-bold",
									children: rec.deviceId
								}),
								rec.targetUserName && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-black text-white",
									children: rec.targetUserName
								}),
								rec.targetUserEmail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-[#C5B9DE]",
									children: rec.targetUserEmail
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-rose-200",
							children: rec.reason
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[10px] font-mono text-[#A59AB8]",
							children: [
								"Banned by ",
								rec.bannedBy || "Admin",
								" ·",
								" ",
								rec.bannedAt ? new Date(rec.bannedAt).toLocaleString() : "Active"
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					disabled: busyId === rec.deviceId,
					onClick: () => void handleUnban(rec),
					className: "px-3.5 py-2 rounded-xl bg-emerald-600/25 hover:bg-emerald-600/35 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0 disabled:opacity-50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LockOpen, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: busyId === rec.deviceId ? "Unbanning..." : "Unban Device" })]
				})]
			}, rec.deviceId))
		})]
	});
};
// src/components/screens/AdminStoreTab.tsx
var DEFAULT_COLORS_BY_CATEGORY = {
	vip_frames: {
		primaryColor: "#FF8A00",
		secondaryColor: "#FFC84A",
		accentColor: "#FFE082",
		glowColor: "rgba(255, 160, 24, 0.75)",
		preset: "royal_flame"
	},
	special_entry: {
		primaryColor: "#F59E0B",
		secondaryColor: "#9333EA",
		accentColor: "#FEF08A",
		glowColor: "rgba(245, 158, 11, 0.78)",
		preset: "imperial_carpet"
	},
	custom_gift: {
		primaryColor: "#9333EA",
		secondaryColor: "#FFC84A",
		accentColor: "#F472B6",
		glowColor: "rgba(168, 85, 247, 0.8)",
		preset: "velvet_gift_box"
	},
	premium_assets: {
		primaryColor: "#A855F7",
		secondaryColor: "#EC4899",
		accentColor: "#F5D0FE",
		glowColor: "rgba(168, 85, 247, 0.82)",
		preset: "amethyst_prism"
	}
};
function createEmptyDraft(categoryId = "vip_frames") {
	const palette = DEFAULT_COLORS_BY_CATEGORY[categoryId];
	return {
		id: "",
		name: "",
		categoryId,
		priceCoins: 2500,
		description: "",
		imageUrl: "",
		animationUrl: "",
		animationPreset: palette.preset,
		primaryColor: palette.primaryColor,
		secondaryColor: palette.secondaryColor,
		accentColor: palette.accentColor,
		glowColor: palette.glowColor,
		badgeText: "",
		durationDays: 0,
		isFeatured: false,
		enabled: true,
		sortOrder: 10
	};
}
var AdminStoreTab = ({ onNotify, onError }) => {
	const [products, setProducts] = (0, import_react.useState)([]);
	const [filterCat, setFilterCat] = (0, import_react.useState)("all");
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [uploadingField, setUploadingField] = (0, import_react.useState)(null);
	const [uploadPercent, setUploadPercent] = (0, import_react.useState)(0);
	const [confirmDeleteId, setConfirmDeleteId] = (0, import_react.useState)(null);
	const [seeding, setSeeding] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const unsub = subscribeStoreProducts(setProducts, { includeDisabled: true });
		return () => unsub();
	}, []);
	const filteredProducts = (0, import_react.useMemo)(() => {
		if (filterCat === "all") return products;
		return products.filter((p) => p.categoryId === filterCat);
	}, [products, filterCat]);
	const handleUploadAsset = async (file, field) => {
		if (!editing) return;
		setUploadingField(field);
		setUploadPercent(0);
		try {
			if ((file.type || "").toLowerCase().startsWith("video/") || /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)$/i.test(file.name || "")) {
				const assetId = `store_vid_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
				const uploaded = await uploadReelVideoAndThumbnail({
					reelId: assetId,
					videoFile: file,
					onProgress: (pct) => {
						setUploadPercent(Math.max(0, Math.min(100, Math.round(pct))));
					}
				});
				setUploadPercent(100);
				setEditing((prev) => prev ? {
					...prev,
					[field]: uploaded.videoUrl
				} : null);
				onNotify("Uploaded animated video asset!");
				return;
			}
			const dataUrl = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onprogress = (ev) => {
					if (ev.lengthComputable && ev.total > 0) setUploadPercent(Math.min(20, Math.round(ev.loaded / ev.total * 20)));
				};
				reader.onload = () => resolve(String(reader.result || ""));
				reader.onerror = () => reject(/* @__PURE__ */ new Error("Failed to read file"));
				reader.readAsDataURL(file);
			});
			const res = await uploadMediaDataUrlWithProgress({
				dataUrl,
				filename: file.name,
				folder: "store_assets",
				onProgress: (pct) => {
					setUploadPercent(Math.min(100, Math.max(20, Math.round(20 + pct * .8))));
				}
			});
			if (res.ok && res.url) {
				setUploadPercent(100);
				setEditing((prev) => prev ? {
					...prev,
					[field]: res.url
				} : null);
				onNotify(`Uploaded ${field === "imageUrl" ? "product image" : "animation asset"}!`);
			} else if (file.size < 45e4) {
				setUploadPercent(100);
				setEditing((prev) => prev ? {
					...prev,
					[field]: dataUrl
				} : null);
				onNotify("Asset attached directly to product.");
			} else onError(res.error || "Upload failed. Try a smaller file or paste an HTTPS URL.");
		} catch (err) {
			onError(err instanceof Error ? err.message : "Asset upload failed.");
		} finally {
			setUploadingField(null);
			setUploadPercent(0);
		}
	};
	const handleSave = async () => {
		if (!editing) return;
		if (!editing.name.trim()) {
			onError("Product name is required.");
			return;
		}
		if (!editing.priceCoins || editing.priceCoins < 1) {
			onError("Coin price must be greater than 0.");
			return;
		}
		setSaving(true);
		const res = await adminSaveStoreProduct(editing);
		setSaving(false);
		if (!res.success) {
			onError(res.error || "Failed to save product.");
			return;
		}
		setEditing(null);
		onNotify(`Saved "${editing.name}" — Store updated live!`);
	};
	const handleQuickToggle = async (product, patch, label) => {
		const res = await adminSaveStoreProduct({
			...product,
			...patch
		});
		if (res.success) onNotify(`${product.name}: ${label}`);
		else onError(res.error || "Failed to update product.");
	};
	const handleDelete = async (productId, productName) => {
		const res = await adminDeleteStoreProduct(productId);
		setConfirmDeleteId(null);
		if (res.success) onNotify(`Deleted "${productName}" from Lenzo Store.`);
		else onError(res.error || "Failed to delete product.");
	};
	const handleSeedDefaults = async () => {
		setSeeding(true);
		const res = await adminSeedDefaultStoreCatalog();
		setSeeding(false);
		if (res.success) onNotify(`Synced ${res.count} official Lenzo Store products to Firestore!`);
		else onError(res.error || "Failed to seed catalog.");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
					children: [
						"Lenzo Store Catalog Manager (",
						products.length,
						" Products)"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[11px] text-[#B9AECF]",
					children: "Add, edit, price, enable/disable, or upload animated assets. Changes sync live to Store."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: seeding,
						onClick: () => void handleSeedDefaults(),
						className: "px-3 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 text-[11px] font-bold text-purple-200 flex items-center gap-1.5 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Database, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: seeding ? "Syncing..." : "Sync Default Catalog" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setEditing(createEmptyDraft(filterCat === "all" ? "vip_frames" : filterCat)),
						className: "px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black flex items-center gap-1.5 shadow",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5 stroke-[3]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Product" })]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => setFilterCat("all"),
					className: `px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 ${filterCat === "all" ? "bg-purple-600 text-white" : "bg-white/[0.05] text-[#C5B9DE] hover:text-white"}`,
					children: [
						"All (",
						products.length,
						")"
					]
				}), DEFAULT_STORE_CATEGORIES.map((cat) => {
					const count = products.filter((p) => p.categoryId === cat.id).length;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setFilterCat(cat.id),
						className: `px-3 py-1.5 rounded-lg text-[11px] font-extrabold shrink-0 ${filterCat === cat.id ? "bg-purple-600 text-white" : "bg-white/[0.05] text-[#C5B9DE] hover:text-white"}`,
						children: [
							cat.title,
							" (",
							count,
							")"
						]
					}, cat.id);
				})]
			}),
			editing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-[#FFC84A]/45 bg-[#180A32] p-4 space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
						children: editing.id ? `Edit Store Product (${editing.id})` : "Create New Store Product"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setEditing(null),
						className: "w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-3 gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl bg-[#0C041A] border border-purple-500/30 p-4 flex flex-col items-center justify-center text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-black uppercase tracking-widest text-purple-300 mb-3",
								children: "Live Store Preview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
								product: editing,
								size: "lg",
								isPlaying: true
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-3 text-sm font-black text-white",
								children: editing.name || "Product Name"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs font-bold text-amber-300",
								children: [(editing.priceCoins || 0).toLocaleString(), " Coins"]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Product Name"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: editing.name,
								onChange: (e) => setEditing({
									...editing,
									name: e.target.value
								}),
								placeholder: "e.g. Royal Flame",
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Store Category"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: editing.categoryId,
								onChange: (e) => {
									const nextCat = e.target.value;
									const defaults = DEFAULT_COLORS_BY_CATEGORY[nextCat];
									setEditing({
										...editing,
										categoryId: nextCat,
										animationPreset: defaults.preset,
										primaryColor: defaults.primaryColor,
										secondaryColor: defaults.secondaryColor,
										accentColor: defaults.accentColor,
										glowColor: defaults.glowColor
									});
								},
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white",
								children: DEFAULT_STORE_CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: c.id,
									className: "bg-[#140A24]",
									children: c.title
								}, c.id))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Coin Price"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 1,
								value: editing.priceCoins,
								onChange: (e) => setEditing({
									...editing,
									priceCoins: Math.max(0, Number(e.target.value))
								}),
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-amber-300 font-bold"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Animation Preset FX"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
								value: editing.animationPreset,
								onChange: (e) => setEditing({
									...editing,
									animationPreset: e.target.value
								}),
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white",
								children: STORE_ANIMATION_PRESET_OPTIONS.map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: opt.value,
									className: "bg-[#140A24]",
									children: opt.label
								}, opt.value))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Badge Label (Optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: editing.badgeText || "",
								onChange: (e) => setEditing({
									...editing,
									badgeText: e.target.value
								}),
								placeholder: "POPULAR / HOT / ROYAL",
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
								children: "Sort Order"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 0,
								value: editing.sortOrder,
								onChange: (e) => setEditing({
									...editing,
									sortOrder: Number(e.target.value) || 0
								}),
								className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
									children: "Custom Image URL (Optional)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: editing.imageUrl || "",
										onChange: (e) => setEditing({
											...editing,
											imageUrl: e.target.value
										}),
										placeholder: "https://... or upload",
										className: "flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "px-2.5 py-2 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-400/40 text-white cursor-pointer flex items-center gap-1 shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono tabular-nums",
												children: uploadingField === "imageUrl" ? `${uploadPercent}%` : "Up"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "file",
												accept: "image/*",
												disabled: uploadingField !== null,
												className: "hidden",
												onChange: (e) => {
													const file = e.target.files?.[0];
													if (file) handleUploadAsset(file, "imageUrl");
												}
											})
										]
									})]
								}),
								uploadingField === "imageUrl" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "progressbar",
									"aria-valuenow": uploadPercent,
									"aria-valuemin": 0,
									"aria-valuemax": 100,
									className: "mt-1.5 w-full h-1.5 rounded-full bg-white/10 overflow-hidden",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-full w-full origin-left bg-[#FA26A0] transition-transform duration-150",
										style: { transform: `scaleX(${Math.max(.02, uploadPercent / 100)})` }
									})
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
									children: "Animation Asset URL (GIF/WebM/MP4)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: editing.animationUrl || "",
										onChange: (e) => setEditing({
											...editing,
											animationUrl: e.target.value
										}),
										placeholder: "https://... or upload",
										className: "flex-1 min-w-0 px-2.5 py-2 rounded-xl bg-black/40 border border-white/15 text-white"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "px-2.5 py-2 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-400/40 text-white cursor-pointer flex items-center gap-1 shrink-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono tabular-nums",
												children: uploadingField === "animationUrl" ? `${uploadPercent}%` : "Up"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "file",
												accept: "image/gif,image/webp,video/mp4,video/webm",
												disabled: uploadingField !== null,
												className: "hidden",
												onChange: (e) => {
													const file = e.target.files?.[0];
													if (file) handleUploadAsset(file, "animationUrl");
												}
											})
										]
									})]
								}),
								uploadingField === "animationUrl" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "progressbar",
									"aria-valuenow": uploadPercent,
									"aria-valuemin": 0,
									"aria-valuemax": 100,
									className: "mt-1.5 w-full h-1.5 rounded-full bg-white/10 overflow-hidden",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-full w-full origin-left bg-[#FA26A0] transition-transform duration-150",
										style: { transform: `scaleX(${Math.max(.02, uploadPercent / 100)})` }
									})
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sm:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[10px] font-bold text-[#B9AECF] uppercase block mb-1",
									children: "Description"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 2,
									value: editing.description,
									onChange: (e) => setEditing({
										...editing,
										description: e.target.value
									}),
									placeholder: "Describe the luxury visual effect and animation...",
									className: "w-full px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-white resize-none"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 cursor-pointer text-xs font-bold text-white",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: editing.enabled,
											onChange: (e) => setEditing({
												...editing,
												enabled: e.target.checked
											}),
											className: "accent-emerald-400 w-4 h-4"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Enabled in Store" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-200",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: editing.isFeatured,
											onChange: (e) => setEditing({
												...editing,
												isFeatured: e.target.checked
											}),
											className: "accent-amber-400 w-4 h-4"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Featured Product" })]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setEditing(null),
										className: "px-3.5 py-2 rounded-xl bg-white/10 text-xs font-bold text-white",
										children: "Cancel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: saving,
										onClick: () => void handleSave(),
										className: "px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#07140E] text-xs font-black flex items-center gap-1.5 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: saving ? "Saving..." : "Save Product" })]
									})]
								})]
							})
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
				children: filteredProducts.map((prod) => {
					const catTitle = DEFAULT_STORE_CATEGORIES.find((c) => c.id === prod.categoryId)?.title || prod.categoryId;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `p-3.5 rounded-2xl border flex items-center gap-3 transition-all ${prod.enabled ? "bg-white/[0.04] border-white/10" : "bg-white/[0.02] border-rose-500/25 opacity-65"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
								product: prod,
								size: "sm",
								isPlaying: false
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 flex-wrap",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-200",
												children: catTitle
											}),
											prod.isFeatured && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-200 flex items-center gap-0.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "w-2.5 h-2.5 fill-current" }), "Featured"]
											}),
											!prod.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-200",
												children: "Disabled"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mt-1 text-sm font-black text-white truncate",
										children: prod.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs font-extrabold text-amber-300 tabular-nums",
										children: [prod.priceCoins.toLocaleString(), " Coins"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-1.5 shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											title: prod.isFeatured ? "Unmark Featured" : "Mark Featured",
											onClick: () => void handleQuickToggle(prod, { isFeatured: !prod.isFeatured }, prod.isFeatured ? "Removed featured badge" : "Marked as Featured"),
											className: `p-1.5 rounded-lg border ${prod.isFeatured ? "bg-amber-400/25 border-amber-300/50 text-amber-200" : "bg-white/5 border-white/10 text-[#B9AECF] hover:text-white"}`,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											title: prod.enabled ? "Disable Product" : "Enable Product",
											onClick: () => void handleQuickToggle(prod, { enabled: !prod.enabled }, prod.enabled ? "Disabled in Store" : "Enabled in Store"),
											className: `p-1.5 rounded-lg border ${prod.enabled ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300" : "bg-rose-500/20 border-rose-400/40 text-rose-300"}`,
											children: prod.enabled ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "w-3.5 h-3.5" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											title: "Edit Product",
											onClick: () => setEditing({ ...prod }),
											className: "p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "w-3.5 h-3.5" })
										}),
										confirmDeleteId === prod.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											title: "Confirm Delete",
											onClick: () => void handleDelete(prod.id, prod.name),
											className: "px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-black flex items-center gap-0.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3 h-3" }), "Del"]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											title: "Delete Product",
											onClick: () => setConfirmDeleteId(prod.id),
											className: "p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
										})
									]
								})
							})
						]
					}, prod.id);
				})
			})
		]
	});
};
// src/services/financialService.ts
function makeId(prefix) {
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`.replace(/[^a-zA-Z0-9_-]/g, "");
}
async function getAdminHeaders() {
	const headers = { "Content-Type": "application/json" };
	try {
		const token = await auth.currentUser?.getIdToken();
		if (token) headers.Authorization = `Bearer ${token}`;
	} catch {}
	return headers;
}
var EMPTY_PLATFORM_REVENUE = {
	id: "global",
	totalBeansEarned: 0,
	totalGiftingCoinsProcessed: 0,
	totalHostDiamondsIssued: 0,
	totalGiftCount: 0,
	totalCoinPurchaseRevenuePkr: 0,
	totalCoinsSoldPaid: 0,
	totalBonusCoinsIssued: 0,
	totalWithdrawalsPaidPkr: 0,
	totalDiamondsWithdrawn: 0,
	totalAgencyCommissionPkr: 0,
	dailyBeansEarned: 0,
	dailyGiftingCoins: 0,
	dailyDayKey: getDayKey(),
	monthlyBeansEarned: 0,
	monthlyGiftingCoins: 0,
	monthlyMonthKey: getMonthKey(),
	updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
/**
* 1. PLATFORM ECONOMY SETTINGS (Real-time + Audited Save)
*/
function subscribePlatformFinancialSettings(onUpdate) {
	return onSnapshot(doc(db, "platform_financial_settings", "global"), (snap) => {
		if (snap.exists()) onUpdate(normalizeEconomyConfig(snap.data()));
		else onUpdate({ ...OFFICIAL_ECONOMY_DEFAULTS });
	}, () => onUpdate({ ...OFFICIAL_ECONOMY_DEFAULTS }));
}
async function adminSaveEconomySettings(nextInput, reason) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized: Only authorized Super Admins can modify financial settings."
		};
		const trimmedReason = reason.trim();
		if (!trimmedReason) return {
			success: false,
			error: "Please provide a reason for this economy setting change."
		};
		const canonicalRef = doc(db, "platform_financial_settings", "global");
		const legacyRef = doc(db, "wallet_settings", "global");
		const currentSnap = await getDoc(canonicalRef);
		const previousConfig = currentSnap.exists() ? normalizeEconomyConfig(currentSnap.data()) : { ...OFFICIAL_ECONOMY_DEFAULTS };
		const validation = validateEconomySettings({
			...previousConfig,
			...nextInput
		});
		if (!validation.valid || !validation.normalized) return {
			success: false,
			error: validation.error || "Invalid economy settings."
		};
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		const adminUid = auth.currentUser?.uid || "";
		const adminEmail = auth.currentUser?.email || "";
		const nextConfig = {
			...validation.normalized,
			configVersion: previousConfig.configVersion + 1,
			updatedAt: nowIso,
			updatedByUid: adminUid,
			updatedByEmail: adminEmail,
			lastChangeReason: trimmedReason
		};
		await runTransaction(db, async (tx) => {
			tx.set(canonicalRef, nextConfig, { merge: true });
			tx.set(legacyRef, {
				configVersion: nextConfig.configVersion,
				commissionPolicyVersion: nextConfig.policyVersion,
				coinPurchasePkrPer100k: nextConfig.coinPurchasePkrPer100k,
				coinPurchasePkrPerCoin: nextConfig.coinPurchasePkrPerCoin,
				commissionRatePercent: nextConfig.appSharePercent,
				hostSharePercent: nextConfig.hostSharePercent,
				diamondConversionRatio: nextConfig.diamondConversionRatio,
				diamondWithdrawalPkrPer100k: nextConfig.diamondWithdrawalPkrPer100k,
				exchangeRatePkrPerCoin: nextConfig.diamondWithdrawalPkrPerDiamond,
				minWithdrawalCoins: nextConfig.minWithdrawalDiamonds,
				maxWithdrawalCoins: nextConfig.maxWithdrawalDiamonds,
				agencyCommissionPercent: nextConfig.agencyCommissionPercent,
				withdrawalFeePercent: nextConfig.withdrawalProcessingFeePercent,
				bonusCoinsEnabled: nextConfig.bonusCoinsEnabled,
				maxBonusCoinPercent: nextConfig.maxBonusCoinPercent,
				enabledPaymentMethods: nextConfig.enabledPaymentMethods,
				earningsToWalletConversionRate: 1,
				updatedAt: serverTimestamp(),
				updatedByEmail: adminEmail,
				lastChangeReason: trimmedReason
			}, { merge: true });
			const auditId = makeId("faudit_cfg");
			tx.set(doc(db, "financial_audit_logs", auditId), {
				id: auditId,
				adminUid,
				adminEmail,
				action: "economy_settings_update",
				targetId: "platform_financial_settings/global",
				targetLabel: `Economy Settings v${nextConfig.configVersion}`,
				previousValue: {
					coinPurchasePkrPer100k: previousConfig.coinPurchasePkrPer100k,
					appSharePercent: previousConfig.appSharePercent,
					hostSharePercent: previousConfig.hostSharePercent,
					diamondWithdrawalPkrPer100k: previousConfig.diamondWithdrawalPkrPer100k,
					minWithdrawalDiamonds: previousConfig.minWithdrawalDiamonds,
					maxWithdrawalDiamonds: previousConfig.maxWithdrawalDiamonds,
					agencyCommissionPercent: previousConfig.agencyCommissionPercent,
					withdrawalProcessingFeePercent: previousConfig.withdrawalProcessingFeePercent
				},
				newValue: {
					coinPurchasePkrPer100k: nextConfig.coinPurchasePkrPer100k,
					appSharePercent: nextConfig.appSharePercent,
					hostSharePercent: nextConfig.hostSharePercent,
					diamondWithdrawalPkrPer100k: nextConfig.diamondWithdrawalPkrPer100k,
					minWithdrawalDiamonds: nextConfig.minWithdrawalDiamonds,
					maxWithdrawalDiamonds: nextConfig.maxWithdrawalDiamonds,
					agencyCommissionPercent: nextConfig.agencyCommissionPercent,
					withdrawalProcessingFeePercent: nextConfig.withdrawalProcessingFeePercent
				},
				reason: trimmedReason,
				createdAt: nowIso,
				createdAtMillis: nowMillis
			});
		});
		try {
			const headers = await getAdminHeaders();
			await fetch(apiUrl("/api/finance/admin/settings"), {
				method: "POST",
				headers,
				body: JSON.stringify({
					settings: nextConfig,
					reason: trimmedReason
				})
			});
		} catch {}
		return {
			success: true,
			config: nextConfig
		};
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to save economy settings."
		};
	}
}
/**
* 2. APP BEANS / REVENUE WALLET & LEDGER LISTENERS (Admin-Only)
*/
function subscribePlatformRevenue(onUpdate) {
	return onSnapshot(doc(db, "platform_revenue", "global"), (snap) => {
		if (snap.exists()) {
			const d = snap.data();
			onUpdate({
				...EMPTY_PLATFORM_REVENUE,
				...d,
				totalBeansEarned: Number(d.totalBeansEarned || 0),
				totalGiftingCoinsProcessed: Number(d.totalGiftingCoinsProcessed || 0),
				totalHostDiamondsIssued: Number(d.totalHostDiamondsIssued || 0),
				totalGiftCount: Number(d.totalGiftCount || 0),
				totalCoinPurchaseRevenuePkr: Number(d.totalCoinPurchaseRevenuePkr || 0),
				totalCoinsSoldPaid: Number(d.totalCoinsSoldPaid || 0),
				totalBonusCoinsIssued: Number(d.totalBonusCoinsIssued || 0),
				totalWithdrawalsPaidPkr: Number(d.totalWithdrawalsPaidPkr || 0),
				totalDiamondsWithdrawn: Number(d.totalDiamondsWithdrawn || 0),
				totalAgencyCommissionPkr: Number(d.totalAgencyCommissionPkr || 0)
			});
		} else onUpdate(EMPTY_PLATFORM_REVENUE);
	}, () => onUpdate(EMPTY_PLATFORM_REVENUE));
}
function subscribePlatformBeansLedger(onUpdate) {
	const q = query(collection(db, "platform_beans_ledger"), orderBy("createdAtMillis", "desc"), limit(250));
	return onSnapshot(q, (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
function subscribeGiftTransactions(onUpdate) {
	const q = query(collection(db, "gift_transactions"), orderBy("createdAtMillis", "desc"), limit(250));
	return onSnapshot(q, (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
function subscribeCoinPurchases(onUpdate) {
	const q = query(collection(db, "coin_purchases"), orderBy("createdAtMillis", "desc"), limit(200));
	return onSnapshot(q, (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
function subscribeAllHostEarnings(onUpdate) {
	return onSnapshot(collection(db, "earnings"), (snap) => {
		const todayKey = getDayKey();
		const monthKey = getMonthKey();
		const rows = snap.docs.map((d) => {
			const data = d.data();
			const available = Number(data.availableEarningsCoins || 0);
			const pending = Number(data.pendingWithdrawalCoins || 0);
			const withdrawn = Number(data.totalWithdrawnCoins || 0);
			return {
				userId: d.id,
				availableEarningsCoins: available,
				pendingWithdrawalCoins: pending,
				totalWithdrawnCoins: withdrawn,
				totalEarnedDiamonds: Math.max(Number(data.totalEarnedDiamonds || 0), available + pending + withdrawn),
				dailyEarnedDiamonds: data.lastEarnedDayKey === todayKey ? Number(data.dailyEarnedDiamonds || 0) : 0,
				monthlyEarnedDiamonds: data.lastEarnedMonthKey === monthKey ? Number(data.monthlyEarnedDiamonds || 0) : 0,
				lastEarnedDayKey: data.lastEarnedDayKey || todayKey,
				lastEarnedMonthKey: data.lastEarnedMonthKey || monthKey,
				grossGiftCoinsReceived: Number(data.grossGiftCoinsReceived || 0),
				totalCommissionDeducted: Number(data.totalCommissionDeducted || 0),
				totalConvertedToWallet: Number(data.totalConvertedToWallet || 0),
				totalGiftsCount: Number(data.totalGiftsCount || 0),
				updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : ""
			};
		});
		rows.sort((a, b) => (b.totalEarnedDiamonds || 0) - (a.totalEarnedDiamonds || 0));
		onUpdate(rows);
	}, () => onUpdate([]));
}
function subscribeAgencyCommissions(onUpdate) {
	const q = query(collection(db, "agency_commissions"), orderBy("createdAtMillis", "desc"), limit(200));
	return onSnapshot(q, (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
function subscribeAgencyFinancialRecords(onUpdate) {
	return onSnapshot(collection(db, "agency_financial_records"), (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
function subscribeFinancialAuditLogs(onUpdate) {
	const q = query(collection(db, "financial_audit_logs"), orderBy("createdAtMillis", "desc"), limit(200));
	return onSnapshot(q, (snap) => {
		onUpdate(snap.docs.map((d) => ({
			id: d.id,
			...d.data()
		})));
	}, () => onUpdate([]));
}
/**
* 3. COIN PACKAGE MANAGEMENT (CRUD + Official Rate Reset + Audit)
*/
async function adminSaveCoinPackage(pkg, reason) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized."
		};
		const cleanId = pkg.id.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
		if (!cleanId || pkg.coins <= 0 || pkg.pricePkr <= 0) return {
			success: false,
			error: "Package ID, paid coins, and PKR price must be positive."
		};
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		const pkgRef = doc(db, "coin_packages", cleanId);
		const prevSnap = await getDoc(pkgRef);
		const payload = {
			...pkg,
			id: cleanId,
			coins: Math.floor(pkg.coins),
			bonusCoins: Math.max(0, Math.floor(pkg.bonusCoins || 0)),
			pricePkr: roundPkr(pkg.pricePkr),
			displayPrice: `PKR ${roundPkr(pkg.pricePkr).toLocaleString()}`,
			visibility: pkg.visibility || "public",
			updatedAt: nowIso
		};
		await setDoc(pkgRef, payload, { merge: true });
		const auditId = makeId("faudit_pkg");
		await setDoc(doc(db, "financial_audit_logs", auditId), {
			id: auditId,
			adminUid: auth.currentUser?.uid || "",
			adminEmail: auth.currentUser?.email || "",
			action: "coin_package_save",
			targetId: cleanId,
			targetLabel: `${payload.coins.toLocaleString()} Coins (+${payload.bonusCoins.toLocaleString()} Bonus) = ${payload.displayPrice}`,
			previousValue: prevSnap.exists() ? prevSnap.data() : null,
			newValue: payload,
			reason: reason.trim() || "Saved coin package",
			createdAt: nowIso,
			createdAtMillis: nowMillis
		});
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to save coin package."
		};
	}
}
async function adminDeleteCoinPackage(pkgId, reason) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized."
		};
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		await deleteDoc(doc(db, "coin_packages", pkgId));
		const auditId = makeId("faudit_pkgdel");
		await setDoc(doc(db, "financial_audit_logs", auditId), {
			id: auditId,
			adminUid: auth.currentUser?.uid || "",
			adminEmail: auth.currentUser?.email || "",
			action: "coin_package_delete",
			targetId: pkgId,
			targetLabel: `Deleted Coin Package ${pkgId}`,
			reason: reason.trim() || "Removed coin package",
			createdAt: nowIso,
			createdAtMillis: nowMillis
		});
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to delete coin package."
		};
	}
}
async function adminSeedOfficialCoinPackages() {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized."
		};
		const existing = await getDocs(collection(db, "coin_packages"));
		for (const d of existing.docs) if (d.id === "pack_1000" || d.id === "pack_5000" || d.id === "pack_25000") await deleteDoc(d.ref);
		for (const pkg of OFFICIAL_DEFAULT_COIN_PACKAGES) await setDoc(doc(db, "coin_packages", pkg.id), {
			...pkg,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		}, { merge: true });
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to sync official coin packages."
		};
	}
}
/**
* 4. VERIFIED COIN PURCHASE FULFILLMENT (Separates Paid Coins & Bonus Coins + Idempotency)
*/
async function adminCreditVerifiedCoinPurchase(params) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized: Super Admin required."
		};
		const paidCoins = Math.floor(Number(params.paidCoins || 0));
		const bonusCoins = Math.max(0, Math.floor(Number(params.bonusCoins || 0)));
		const totalCoins = paidCoins + bonusCoins;
		if (!params.targetUid.trim() || paidCoins <= 0 || !params.paymentReference.trim()) return {
			success: false,
			error: "Target user, positive paid coins, and payment reference are required."
		};
		const cfg = params.economyConfig || OFFICIAL_ECONOMY_DEFAULTS;
		const priceInfo = calculateCoinPurchasePricePkr(paidCoins, cfg);
		const purchaseId = params.idempotencyKey || makeId(`buy_${params.targetUid.slice(0, 6)}`);
		try {
			const headers = await getAdminHeaders();
			if ((await fetch(apiUrl("/api/finance/verify-purchase"), {
				method: "POST",
				headers,
				body: JSON.stringify({
					userId: params.targetUid.trim(),
					paidCoins,
					bonusCoins,
					paymentReference: params.paymentReference.trim(),
					idempotencyKey: purchaseId
				})
			})).status === 409) return {
				success: false,
				error: "Duplicate payment reference / idempotency key rejected."
			};
		} catch {}
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		const nowDisplay = new Date(nowMillis).toLocaleString();
		const adminUid = auth.currentUser?.uid || "";
		const adminEmail = auth.currentUser?.email || "";
		const purchaseRef = doc(db, "coin_purchases", purchaseId);
		const walletRef = doc(db, "wallets", params.targetUid.trim());
		const userRef = doc(db, "users", params.targetUid.trim());
		const platformRevenueRef = doc(db, "platform_revenue", "global");
		await runTransaction(db, async (tx) => {
			if ((await tx.get(purchaseRef)).exists()) throw new Error("This coin purchase has already been credited.");
			const walletSnap = await tx.get(walletRef);
			const userSnap = await tx.get(userRef);
			const currentCoins = walletSnap.exists() ? Number(walletSnap.data().walletPurchasedCoins || 0) : userSnap.exists() ? Number(userSnap.data().coins || 0) : 0;
			const currentBonusBal = walletSnap.exists() ? Number(walletSnap.data().bonusCoinsBalance || 0) : 0;
			const prevPurchased = walletSnap.exists() ? Number(walletSnap.data().totalCoinsPurchased || 0) : 0;
			const prevBonusTotal = walletSnap.exists() ? Number(walletSnap.data().totalBonusCoinsReceived || 0) : 0;
			const nextCoins = currentCoins + totalCoins;
			tx.set(walletRef, {
				userId: params.targetUid.trim(),
				walletPurchasedCoins: nextCoins,
				bonusCoinsBalance: currentBonusBal + bonusCoins,
				totalCoinsPurchased: prevPurchased + paidCoins,
				totalBonusCoinsReceived: prevBonusTotal + bonusCoins,
				updatedAt: serverTimestamp()
			}, { merge: true });
			tx.set(userRef, { coins: nextCoins }, { merge: true });
			tx.set(purchaseRef, {
				id: purchaseId,
				idempotencyKey: purchaseId,
				userId: params.targetUid.trim(),
				userName: params.targetName || "Lenzo User",
				userDisplayId: params.targetDisplayId || "",
				packageId: params.packageId || "custom_verified",
				paidCoins,
				bonusCoins,
				totalCoinsCredited: totalCoins,
				amountPkr: priceInfo.pricePkr,
				coinPurchaseRatePkr: priceInfo.ratePkrPerCoin,
				paymentMethod: params.paymentMethod.trim() || "Verified Bank/Wallet",
				paymentReference: params.paymentReference.trim(),
				verifiedBy: adminEmail,
				status: "completed",
				configVersion: cfg.configVersion,
				createdAt: nowIso,
				createdAtMillis: nowMillis
			});
			if (params.packageId && params.packageId !== "custom_verified") tx.set(doc(db, "coin_packages", params.packageId), {
				purchaseCount: increment(1),
				totalRevenuePkr: increment(priceInfo.pricePkr)
			}, { merge: true });
			tx.set(platformRevenueRef, {
				id: "global",
				totalCoinPurchaseRevenuePkr: increment(priceInfo.pricePkr),
				totalCoinsSoldPaid: increment(paidCoins),
				totalBonusCoinsIssued: increment(bonusCoins),
				updatedAt: nowIso
			}, { merge: true });
			const txId = `${purchaseId}_wtx`;
			const txPayload = {
				id: txId,
				userId: params.targetUid.trim(),
				category: "coin_purchase",
				balanceType: "wallet",
				amount: totalCoins,
				paidCoins,
				bonusCoins,
				pkrAmount: priceInfo.pricePkr,
				status: "completed",
				description: `Verified Coin Purchase: +${paidCoins.toLocaleString()} Paid${bonusCoins > 0 ? ` + ${bonusCoins.toLocaleString()} Bonus` : ""} Coins (PKR ${priceInfo.pricePkr.toLocaleString()} • Ref: ${params.paymentReference.trim()})`,
				timestamp: nowDisplay,
				timestampMillis: nowMillis,
				referenceId: purchaseId,
				idempotencyKey: purchaseId,
				configVersion: cfg.configVersion
			};
			tx.set(doc(db, "wallet_transactions", txId), txPayload);
			tx.set(doc(db, "users", params.targetUid.trim(), "coin_transactions", txId), txPayload);
			const auditId = makeId("faudit_buy");
			tx.set(doc(db, "financial_audit_logs", auditId), {
				id: auditId,
				adminUid,
				adminEmail,
				action: "coin_purchase_verified",
				targetId: params.targetUid.trim(),
				targetLabel: `${params.targetName} (+${paidCoins.toLocaleString()} Paid / +${bonusCoins.toLocaleString()} Bonus Coins = PKR ${priceInfo.pricePkr.toLocaleString()})`,
				newValue: {
					paidCoins,
					bonusCoins,
					amountPkr: priceInfo.pricePkr,
					paymentReference: params.paymentReference.trim()
				},
				reason: `Verified payment ref ${params.paymentReference.trim()} via ${params.paymentMethod}`,
				createdAt: nowIso,
				createdAtMillis: nowMillis
			});
		});
		sendPushNotification({
			targetUserId: params.targetUid.trim(),
			type: "wallet",
			title: `🪙 +${(paidCoins + bonusCoins).toLocaleString()} Coins Credited!`,
			message: `Your verified purchase of ${paidCoins.toLocaleString()} Coins${bonusCoins > 0 ? ` + ${bonusCoins.toLocaleString()} Bonus Coins` : ""} (PKR ${priceInfo.pricePkr.toLocaleString()}) is now in your wallet.`,
			actionType: "open_wallet",
			targetId: purchaseId,
			priority: "high",
			allowSelf: true,
			eventKey: "coin_purchase"
		});
		return {
			success: true,
			purchaseId
		};
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to verify and credit coin purchase."
		};
	}
}
/**
* 5. AGENCY COMMISSION RULE & PAYOUT MANAGEMENT
*/
async function adminUpdateAgencyCommissionOverride(params) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized."
		};
		if (params.commissionPercentOverride !== null && (params.commissionPercentOverride < 0 || params.commissionPercentOverride > 50)) return {
			success: false,
			error: "Agency commission override must be between 0% and 50%."
		};
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		const finRef = doc(db, "agency_financial_records", params.agencyId);
		const prevSnap = await getDoc(finRef);
		await setDoc(finRef, {
			id: params.agencyId,
			agencyId: params.agencyId,
			agencyName: params.agencyName,
			agencyOwnerUid: params.agencyOwnerUid,
			commissionPercentOverride: params.commissionPercentOverride,
			updatedAt: nowIso
		}, { merge: true });
		const auditId = makeId("faudit_agrule");
		await setDoc(doc(db, "financial_audit_logs", auditId), {
			id: auditId,
			adminUid: auth.currentUser?.uid || "",
			adminEmail: auth.currentUser?.email || "",
			action: "agency_commission_update",
			targetId: params.agencyId,
			targetLabel: `Agency ${params.agencyName} commission rule`,
			previousValue: prevSnap.exists() ? { commissionPercentOverride: prevSnap.data().commissionPercentOverride ?? null } : null,
			newValue: { commissionPercentOverride: params.commissionPercentOverride },
			reason: params.reason.trim() || "Updated agency commission percentage",
			createdAt: nowIso,
			createdAtMillis: nowMillis
		});
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to update agency commission rule."
		};
	}
}
async function adminMarkAgencyCommissionPaid(commission, paymentReference) {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized."
		};
		const nowMillis = Date.now();
		const nowIso = new Date(nowMillis).toISOString();
		const commRef = doc(db, "agency_commissions", commission.id);
		const finRef = doc(db, "agency_financial_records", commission.agencyId);
		await runTransaction(db, async (tx) => {
			const snap = await tx.get(commRef);
			if (!snap.exists()) throw new Error("Agency commission record not found.");
			if (snap.data().status === "paid") throw new Error("Agency commission already marked as paid.");
			const finSnap = await tx.get(finRef);
			const prevPaid = finSnap.exists() ? Number(finSnap.data().totalCommissionPaidPkr || 0) : 0;
			const prevPending = finSnap.exists() ? Number(finSnap.data().pendingCommissionPkr || 0) : 0;
			tx.update(commRef, {
				status: "paid",
				paymentReference: paymentReference.trim() || `AGPAY-${nowMillis.toString().slice(-6)}`,
				paidAt: nowIso
			});
			tx.set(finRef, {
				id: commission.agencyId,
				agencyId: commission.agencyId,
				agencyName: commission.agencyName,
				agencyOwnerUid: commission.agencyOwnerUid,
				totalCommissionPaidPkr: roundPkr(prevPaid + commission.commissionPkr),
				pendingCommissionPkr: Math.max(0, roundPkr(prevPending - commission.commissionPkr)),
				updatedAt: nowIso
			}, { merge: true });
			const auditId = makeId("faudit_agpay");
			tx.set(doc(db, "financial_audit_logs", auditId), {
				id: auditId,
				adminUid: auth.currentUser?.uid || "",
				adminEmail: auth.currentUser?.email || "",
				action: "agency_commission_payout",
				targetId: commission.id,
				targetLabel: `${commission.agencyName} (PKR ${commission.commissionPkr.toLocaleString()})`,
				previousValue: { status: commission.status },
				newValue: {
					status: "paid",
					paymentReference: paymentReference.trim()
				},
				reason: `Paid agency commission for withdrawal ${commission.withdrawalId}`,
				createdAt: nowIso,
				createdAtMillis: nowMillis
			});
		});
		if (commission.agencyOwnerUid) sendPushNotification({
			targetUserId: commission.agencyOwnerUid,
			type: "agency",
			title: `💵 Agency Commission Paid: PKR ${commission.commissionPkr.toLocaleString()}`,
			message: `Commission for ${commission.agencyName} has been settled.${paymentReference ? ` Ref: ${paymentReference}` : ""}`,
			actionType: "open_agency",
			targetId: commission.id,
			priority: "high",
			allowSelf: true,
			eventKey: "ag_comm_paid"
		});
		return { success: true };
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Failed to mark agency commission as paid."
		};
	}
}
async function runFinancialMigrationAndReconciliation() {
	try {
		if (!isVerifiedAdminSession()) return {
			success: false,
			error: "Unauthorized: Super Admin required."
		};
		const [usersSnap, walletsSnap, earningsSnap] = await Promise.all([
			getDocs(collection(db, "users")),
			getDocs(collection(db, "wallets")),
			getDocs(collection(db, "earnings"))
		]);
		const walletMap = /* @__PURE__ */ new Map();
		walletsSnap.docs.forEach((d) => walletMap.set(d.id, d.data()));
		const earningsMap = /* @__PURE__ */ new Map();
		earningsSnap.docs.forEach((d) => earningsMap.set(d.id, d.data()));
		let walletsSynchronized = 0;
		let earningsSynchronized = 0;
		let totalCirculatingCoins = 0;
		let totalAvailableDiamonds = 0;
		let totalPendingDiamonds = 0;
		let totalWithdrawnDiamonds = 0;
		const flags = [];
		const nowIso = (/* @__PURE__ */ new Date()).toISOString();
		for (const uDoc of usersSnap.docs) {
			const uid = uDoc.id;
			const u = uDoc.data();
			const userName = String(u.fullName || u.name || u.username || uid.slice(0, 8));
			const profileCoins = Number(u.coins || 0);
			const profileDiamonds = Number(u.diamonds || 0);
			const w = walletMap.get(uid);
			if (!w) {
				await setDoc(doc(db, "wallets", uid), {
					userId: uid,
					walletPurchasedCoins: profileCoins,
					bonusCoinsBalance: 0,
					totalCoinsPurchased: profileCoins,
					totalBonusCoinsReceived: 0,
					totalCoinsSpent: 0,
					totalRefundedCoins: 0,
					updatedAt: serverTimestamp()
				}, { merge: true });
				walletsSynchronized += 1;
				totalCirculatingCoins += profileCoins;
			} else {
				const wCoins = Number(w.walletPurchasedCoins || 0);
				totalCirculatingCoins += wCoins;
				if (Math.abs(profileCoins - wCoins) > 0) flags.push({
					uid,
					userName,
					field: "coins",
					profileValue: profileCoins,
					ledgerValue: wCoins,
					delta: wCoins - profileCoins,
					note: "Profile coins differs from wallets/{uid} ledger — preserved without overwrite; review before syncing."
				});
			}
			const e = earningsMap.get(uid);
			if (!e) {
				await setDoc(doc(db, "earnings", uid), {
					userId: uid,
					availableEarningsCoins: profileDiamonds,
					pendingWithdrawalCoins: 0,
					totalWithdrawnCoins: 0,
					totalEarnedDiamonds: profileDiamonds,
					dailyEarnedDiamonds: 0,
					monthlyEarnedDiamonds: 0,
					lastEarnedDayKey: getDayKey(),
					lastEarnedMonthKey: getMonthKey(),
					grossGiftCoinsReceived: 0,
					totalCommissionDeducted: 0,
					totalConvertedToWallet: 0,
					totalGiftsCount: 0,
					updatedAt: serverTimestamp()
				}, { merge: true });
				earningsSynchronized += 1;
				totalAvailableDiamonds += profileDiamonds;
			} else {
				const eDia = Number(e.availableEarningsCoins || 0);
				const ePend = Number(e.pendingWithdrawalCoins || 0);
				const eWith = Number(e.totalWithdrawnCoins || 0);
				totalAvailableDiamonds += eDia;
				totalPendingDiamonds += ePend;
				totalWithdrawnDiamonds += eWith;
				if (Math.abs(profileDiamonds - eDia) > 0) flags.push({
					uid,
					userName,
					field: "diamonds",
					profileValue: profileDiamonds,
					ledgerValue: eDia,
					delta: eDia - profileDiamonds,
					note: "Profile diamonds differs from earnings/{uid} ledger — preserved without overwrite; review before syncing."
				});
			}
		}
		if (!(await getDoc(doc(db, "platform_financial_settings", "global"))).exists()) await setDoc(doc(db, "platform_financial_settings", "global"), {
			...OFFICIAL_ECONOMY_DEFAULTS,
			updatedAt: nowIso,
			updatedByEmail: auth.currentUser?.email || ""
		}, { merge: true });
		if (!(await getDoc(doc(db, "platform_revenue", "global"))).exists()) await setDoc(doc(db, "platform_revenue", "global"), {
			...EMPTY_PLATFORM_REVENUE,
			updatedAt: nowIso
		}, { merge: true });
		const report = {
			executedAt: nowIso,
			usersScanned: usersSnap.size,
			walletsSynchronized,
			earningsSynchronized,
			totalCirculatingCoins,
			totalAvailableDiamonds,
			totalPendingDiamonds,
			totalWithdrawnDiamonds,
			flags
		};
		const auditId = makeId("faudit_recon");
		await setDoc(doc(db, "financial_audit_logs", auditId), {
			id: auditId,
			adminUid: auth.currentUser?.uid || "",
			adminEmail: auth.currentUser?.email || "",
			action: "balance_reconciliation",
			targetId: "platform_wide",
			targetLabel: `Scanned ${report.usersScanned} users · ${flags.length} discrepancies flagged`,
			newValue: {
				walletsSynchronized,
				earningsSynchronized,
				totalCirculatingCoins,
				totalAvailableDiamonds,
				flagsCount: flags.length
			},
			reason: "Idempotent non-destructive migration & financial balance reconciliation",
			createdAt: nowIso,
			createdAtMillis: Date.now()
		});
		return {
			success: true,
			report
		};
	} catch (err) {
		return {
			success: false,
			error: err?.message || "Reconciliation failed."
		};
	}
}
/**
* 7. CSV REPORT EXPORTER (Zero external deps)
*/
function downloadCsvReport(filename, headers, rows) {
	const escapeCell = (val) => {
		const s = String(val ?? "");
		if (/[",\n]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
		return s;
	};
	const csv = [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join("\n");
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.setAttribute("download", filename);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
// src/components/screens/AdminFinanceTab.tsx
var WITHDRAWAL_STATUS_OPTIONS = [
	"pending",
	"under_review",
	"approved",
	"processing",
	"paid",
	"rejected",
	"cancelled"
];
var AdminFinanceTab = ({ onNotify, onError }) => {
	const [subTab, setSubTab] = (0, import_react.useState)("overview");
	const [economy, setEconomy] = (0, import_react.useState)(OFFICIAL_ECONOMY_DEFAULTS);
	const [revenue, setRevenue] = (0, import_react.useState)(EMPTY_PLATFORM_REVENUE);
	const [beansLedger, setBeansLedger] = (0, import_react.useState)([]);
	const [giftTxs, setGiftTxs] = (0, import_react.useState)([]);
	const [coinPurchases, setCoinPurchases] = (0, import_react.useState)([]);
	const [packages, setPackages] = (0, import_react.useState)([]);
	const [hostEarnings, setHostEarnings] = (0, import_react.useState)([]);
	const [withdrawals, setWithdrawals] = (0, import_react.useState)([]);
	const [agencyCommissions, setAgencyCommissions] = (0, import_react.useState)([]);
	const [agencyRecords, setAgencyRecords] = (0, import_react.useState)([]);
	const [auditLogs, setAuditLogs] = (0, import_react.useState)([]);
	const [users, setUsers] = (0, import_react.useState)([]);
	const [dualAgencies, setDualAgencies] = (0, import_react.useState)([]);
	const [cfgPurchase100k, setCfgPurchase100k] = (0, import_react.useState)("3000");
	const [cfgAppShare, setCfgAppShare] = (0, import_react.useState)("40");
	const [cfgHostShare, setCfgHostShare] = (0, import_react.useState)("60");
	const [cfgDiamondRatio, setCfgDiamondRatio] = (0, import_react.useState)("1");
	const [cfgWithdraw100k, setCfgWithdraw100k] = (0, import_react.useState)("2600");
	const [cfgMinWd, setCfgMinWd] = (0, import_react.useState)("10000");
	const [cfgMaxWd, setCfgMaxWd] = (0, import_react.useState)("10000000");
	const [cfgAgencyComm, setCfgAgencyComm] = (0, import_react.useState)("0");
	const [cfgFeePct, setCfgFeePct] = (0, import_react.useState)("0");
	const [cfgBonusEnabled, setCfgBonusEnabled] = (0, import_react.useState)(true);
	const [cfgMaxBonusPct, setCfgMaxBonusPct] = (0, import_react.useState)("25");
	const [cfgMethods, setCfgMethods] = (0, import_react.useState)([
		"bank_transfer",
		"easypaisa",
		"jazzcash"
	]);
	const [cfgReason, setCfgReason] = (0, import_react.useState)("");
	const [savingCfg, setSavingCfg] = (0, import_react.useState)(false);
	const [pkgId, setPkgId] = (0, import_react.useState)("");
	const [pkgCoins, setPkgCoins] = (0, import_react.useState)("100000");
	const [pkgBonus, setPkgBonus] = (0, import_react.useState)("0");
	const [pkgPricePkr, setPkgPricePkr] = (0, import_react.useState)("3000");
	const [pkgBadge, setPkgBadge] = (0, import_react.useState)("OFFICIAL");
	const [pkgVisibility, setPkgVisibility] = (0, import_react.useState)("public");
	const [pkgPopular, setPkgPopular] = (0, import_react.useState)(false);
	const [pkgPromo, setPkgPromo] = (0, import_react.useState)(false);
	const [pkgEnabled, setPkgEnabled] = (0, import_react.useState)(true);
	const [savingPkg, setSavingPkg] = (0, import_react.useState)(false);
	const [buyTargetUid, setBuyTargetUid] = (0, import_react.useState)("");
	const [buyPaidCoins, setBuyPaidCoins] = (0, import_react.useState)("100000");
	const [buyBonusCoins, setBuyBonusCoins] = (0, import_react.useState)("0");
	const [buyMethod, setBuyMethod] = (0, import_react.useState)("Bank Transfer");
	const [buyRef, setBuyRef] = (0, import_react.useState)("");
	const [creditingBuy, setCreditingBuy] = (0, import_react.useState)(false);
	const [dateRangeFilter, setDateRangeFilter] = (0, import_react.useState)("all");
	const [hostSearch, setHostSearch] = (0, import_react.useState)("");
	const [wdFilter, setWdFilter] = (0, import_react.useState)("all");
	const [wdSearch, setWdSearch] = (0, import_react.useState)("");
	const [selectedWd, setSelectedWd] = (0, import_react.useState)(null);
	const [wdRemarks, setWdRemarks] = (0, import_react.useState)("");
	const [wdPayRef, setWdPayRef] = (0, import_react.useState)("");
	const [processingWd, setProcessingWd] = (0, import_react.useState)(false);
	const [agencyOverrideInputs, setAgencyOverrideInputs] = (0, import_react.useState)({});
	const [qaResults, setQaResults] = (0, import_react.useState)(null);
	const [reconReport, setReconReport] = (0, import_react.useState)(null);
	const [runningRecon, setRunningRecon] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const unsubs = [
			subscribePlatformFinancialSettings((cfg) => {
				setEconomy(cfg);
				setCfgPurchase100k(String(cfg.coinPurchasePkrPer100k));
				setCfgAppShare(String(cfg.appSharePercent));
				setCfgHostShare(String(cfg.hostSharePercent));
				setCfgDiamondRatio(String(cfg.diamondConversionRatio));
				setCfgWithdraw100k(String(cfg.diamondWithdrawalPkrPer100k));
				setCfgMinWd(String(cfg.minWithdrawalDiamonds));
				setCfgMaxWd(String(cfg.maxWithdrawalDiamonds));
				setCfgAgencyComm(String(cfg.agencyCommissionPercent));
				setCfgFeePct(String(cfg.withdrawalProcessingFeePercent));
				setCfgBonusEnabled(cfg.bonusCoinsEnabled);
				setCfgMaxBonusPct(String(cfg.maxBonusCoinPercent));
				setCfgMethods(cfg.enabledPaymentMethods);
			}),
			subscribePlatformRevenue(setRevenue),
			subscribePlatformBeansLedger(setBeansLedger),
			subscribeGiftTransactions(setGiftTxs),
			subscribeCoinPurchases(setCoinPurchases),
			subscribeCoinPackages(setPackages),
			subscribeAllHostEarnings(setHostEarnings),
			subscribeAllWithdrawalRequests(setWithdrawals),
			subscribeAgencyCommissions(setAgencyCommissions),
			subscribeAgencyFinancialRecords(setAgencyRecords),
			subscribeFinancialAuditLogs(setAuditLogs),
			subscribeAllUsersForAdmin(setUsers),
			subscribeAllAgenciesForAdmin(setDualAgencies)
		];
		return () => unsubs.forEach((u) => u());
	}, []);
	const userMap = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		users.forEach((u) => map.set(u.uid, u));
		return map;
	}, [users]);
	const todayKey = getDayKey();
	const monthKey = getMonthKey();
	const analytics = (0, import_react.useMemo)(() => {
		const filteredBeans = beansLedger.filter((entry) => {
			if (dateRangeFilter === "today") return entry.dayKey === todayKey;
			if (dateRangeFilter === "month") return entry.monthKey === monthKey;
			return true;
		});
		const dailyBeans = beansLedger.filter((e) => e.dayKey === todayKey).reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
		const monthlyBeans = beansLedger.filter((e) => e.monthKey === monthKey).reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
		const filteredBeansSum = filteredBeans.reduce((sum, e) => sum + Number(e.beansAmount || 0), 0);
		const filteredGrossCoins = filteredBeans.reduce((sum, e) => sum + Number(e.grossCoins || 0), 0);
		const pendingWithdrawals = withdrawals.filter((w) => ![
			"paid",
			"rejected",
			"cancelled"
		].includes(w.status));
		const pendingWithdrawalsPkr = pendingWithdrawals.reduce((sum, w) => sum + Number(w.finalPayablePkr || 0), 0);
		const pendingWithdrawalsDiamonds = pendingWithdrawals.reduce((sum, w) => sum + Number(w.coinsRequested || 0), 0);
		const totalHostDiamondsAvailable = hostEarnings.reduce((s, h) => s + Number(h.availableEarningsCoins || 0), 0);
		const totalHostDiamondsEarned = hostEarnings.reduce((s, h) => s + Number(h.totalEarnedDiamonds || 0), 0);
		const totalHostDiamondsWithdrawn = hostEarnings.reduce((s, h) => s + Number(h.totalWithdrawnCoins || 0), 0);
		const activeHostsCount = hostEarnings.filter((h) => (h.totalEarnedDiamonds || 0) > 0).length;
		const totalAgencyCommissionAccruedPkr = agencyCommissions.reduce((s, c) => s + Number(c.commissionPkr || 0), 0);
		const totalCoinsBought = revenue.totalCoinsSoldPaid > 0 ? revenue.totalCoinsSoldPaid : coinPurchases.reduce((s, c) => s + Number(c.paidCoins || 0), 0);
		return {
			dailyBeans,
			monthlyBeans,
			filteredBeansSum,
			filteredGrossCoins,
			pendingWithdrawalsCount: pendingWithdrawals.length,
			pendingWithdrawalsPkr: roundPkr(pendingWithdrawalsPkr),
			pendingWithdrawalsDiamonds,
			totalHostDiamondsAvailable,
			totalHostDiamondsEarned,
			totalHostDiamondsWithdrawn,
			activeHostsCount,
			totalAgencyCommissionAccruedPkr: roundPkr(totalAgencyCommissionAccruedPkr),
			totalCoinsBought
		};
	}, [
		beansLedger,
		withdrawals,
		hostEarnings,
		agencyCommissions,
		coinPurchases,
		revenue,
		dateRangeFilter,
		todayKey,
		monthKey
	]);
	const draftEconomyPreview = (0, import_react.useMemo)(() => {
		const candidate = {
			coinPurchasePkrPer100k: Number(cfgPurchase100k),
			appSharePercent: Number(cfgAppShare),
			hostSharePercent: Number(cfgHostShare),
			diamondConversionRatio: Number(cfgDiamondRatio),
			diamondWithdrawalPkrPer100k: Number(cfgWithdraw100k),
			minWithdrawalDiamonds: Number(cfgMinWd),
			maxWithdrawalDiamonds: Number(cfgMaxWd),
			agencyCommissionPercent: Number(cfgAgencyComm),
			withdrawalProcessingFeePercent: Number(cfgFeePct),
			bonusCoinsEnabled: cfgBonusEnabled,
			maxBonusCoinPercent: Number(cfgMaxBonusPct),
			enabledPaymentMethods: cfgMethods
		};
		const check = validateEconomySettings(candidate);
		if (!check.valid || !check.normalized) return {
			valid: false,
			error: check.error,
			gift100k: null,
			wd100k: null,
			wd100kAgency: null
		};
		return {
			valid: true,
			error: null,
			gift100k: calculateGiftSplit(1e5, check.normalized),
			wd100k: calculateWithdrawalWaterfall(1e5, check.normalized, { hostHasActiveAgency: false }),
			wd100kAgency: calculateWithdrawalWaterfall(1e5, check.normalized, { hostHasActiveAgency: true })
		};
	}, [
		cfgPurchase100k,
		cfgAppShare,
		cfgHostShare,
		cfgDiamondRatio,
		cfgWithdraw100k,
		cfgMinWd,
		cfgMaxWd,
		cfgAgencyComm,
		cfgFeePct,
		cfgBonusEnabled,
		cfgMaxBonusPct,
		cfgMethods
	]);
	const handleSaveEconomy = async () => {
		if (!draftEconomyPreview.valid) {
			onError(draftEconomyPreview.error || "Please fix economy validation errors.");
			return;
		}
		if (!cfgReason.trim()) {
			onError("Please enter a Change Reason for the immutable financial audit log.");
			return;
		}
		setSavingCfg(true);
		const res = await adminSaveEconomySettings({
			coinPurchasePkrPer100k: Number(cfgPurchase100k),
			appSharePercent: Number(cfgAppShare),
			hostSharePercent: Number(cfgHostShare),
			diamondConversionRatio: Number(cfgDiamondRatio),
			diamondWithdrawalPkrPer100k: Number(cfgWithdraw100k),
			minWithdrawalDiamonds: Number(cfgMinWd),
			maxWithdrawalDiamonds: Number(cfgMaxWd),
			agencyCommissionPercent: Number(cfgAgencyComm),
			withdrawalProcessingFeePercent: Number(cfgFeePct),
			bonusCoinsEnabled: cfgBonusEnabled,
			maxBonusCoinPercent: Number(cfgMaxBonusPct),
			enabledPaymentMethods: cfgMethods
		}, cfgReason);
		setSavingCfg(false);
		if (res.success) {
			setCfgReason("");
			onNotify(`Economy Settings saved (v${res.config?.configVersion}) and logged to audit trail.`);
		} else onError(res.error || "Failed to update economy settings.");
	};
	const handleSavePkg = async () => {
		const coinsNum = parseInt(pkgCoins, 10);
		const bonusNum = parseInt(pkgBonus || "0", 10);
		const priceNum = parseFloat(pkgPricePkr);
		if (!Number.isFinite(coinsNum) || coinsNum <= 0 || !Number.isFinite(priceNum) || priceNum <= 0) {
			onError("Enter valid positive Coin quantity and PKR price.");
			return;
		}
		setSavingPkg(true);
		const id = pkgId.trim() || `pack_${coinsNum}`;
		const res = await adminSaveCoinPackage({
			id,
			coins: coinsNum,
			bonusCoins: Math.max(0, bonusNum || 0),
			pricePkr: priceNum,
			displayPrice: `PKR ${priceNum.toLocaleString()}`,
			badge: pkgBadge.trim() || void 0,
			visibility: pkgVisibility,
			isPopular: pkgPopular,
			isPromotional: pkgPromo,
			enabled: pkgEnabled
		}, pkgId ? `Updated coin package ${id}` : `Created coin package ${id}`);
		setSavingPkg(false);
		if (res.success) {
			onNotify(`Saved Coin Package ${id} (${coinsNum.toLocaleString()} Coins = PKR ${priceNum.toLocaleString()}).`);
			setPkgId("");
		} else onError(res.error || "Failed to save package.");
	};
	const handleCreditVerifiedPurchase = async () => {
		const uid = buyTargetUid.trim();
		const paid = parseInt(buyPaidCoins, 10);
		const bonus = parseInt(buyBonusCoins || "0", 10);
		if (!uid || !Number.isFinite(paid) || paid <= 0 || !buyRef.trim()) {
			onError("Select/enter User UID, positive Paid Coins, and Payment Reference.");
			return;
		}
		const targetUser = userMap.get(uid);
		setCreditingBuy(true);
		const res = await adminCreditVerifiedCoinPurchase({
			targetUid: uid,
			targetName: targetUser?.fullName || uid.slice(0, 10),
			targetDisplayId: targetUser?.displayId || "",
			paidCoins: paid,
			bonusCoins: Math.max(0, bonus || 0),
			paymentMethod: buyMethod,
			paymentReference: buyRef.trim(),
			economyConfig: economy
		});
		setCreditingBuy(false);
		if (res.success) {
			onNotify(`Credited ${paid.toLocaleString()} Paid + ${Math.max(0, bonus || 0).toLocaleString()} Bonus Coins (TX ${res.purchaseId?.slice(-6).toUpperCase()}).`);
			setBuyRef("");
		} else onError(res.error || "Failed to credit verified coin purchase.");
	};
	const handleUpdateWithdrawal = async (req, status) => {
		setProcessingWd(true);
		const res = await adminUpdateWithdrawalStatus(req, status, wdRemarks, wdPayRef);
		setProcessingWd(false);
		if (res.success) {
			onNotify(`Withdrawal #${req.id.slice(-6).toUpperCase()} updated to ${status.toUpperCase()}.`);
			setSelectedWd(null);
			setWdRemarks("");
			setWdPayRef("");
		} else onError(res.error || "Failed to update withdrawal.");
	};
	const handleRunQaSuite = () => {
		const report = runFinancialQaAssertions();
		setQaResults(report.results);
		if (report.allPassed) onNotify("All Financial QA Assertions (Tests A–E) PASSED 100%.");
		else onError("One or more QA assertions failed — inspect results below.");
	};
	const handleRunReconciliation = async () => {
		setRunningRecon(true);
		const res = await runFinancialMigrationAndReconciliation();
		setRunningRecon(false);
		if (res.success && res.report) {
			setReconReport(res.report);
			onNotify(`Reconciliation complete: ${res.report.usersScanned} users scanned, ${res.report.flags.length} discrepancies flagged.`);
		} else onError(res.error || "Reconciliation failed.");
	};
	const filteredHostEarnings = (0, import_react.useMemo)(() => {
		const q = hostSearch.trim().toLowerCase();
		return hostEarnings.filter((h) => {
			if (!q) return true;
			const u = userMap.get(h.userId);
			return h.userId.toLowerCase().includes(q) || (u?.fullName || "").toLowerCase().includes(q) || (u?.username || "").toLowerCase().includes(q) || (u?.displayId || "").toLowerCase().includes(q);
		});
	}, [
		hostEarnings,
		hostSearch,
		userMap
	]);
	const filteredWithdrawals = (0, import_react.useMemo)(() => {
		const q = wdSearch.trim().toLowerCase();
		return withdrawals.filter((w) => {
			if (wdFilter !== "all" && w.status !== wdFilter) return false;
			if (!q) return true;
			return w.id.toLowerCase().includes(q) || w.userId.toLowerCase().includes(q) || w.userName.toLowerCase().includes(q) || (w.userDisplayId || "").toLowerCase().includes(q) || (w.paymentReference || "").toLowerCase().includes(q);
		});
	}, [
		withdrawals,
		wdFilter,
		wdSearch
	]);
	const hostAgencies = (0, import_react.useMemo)(() => dualAgencies.filter((a) => a.agencyType === "host_agency"), [dualAgencies]);
	const subTabs = [
		{
			id: "overview",
			label: "Analytics",
			icon: ChartColumn
		},
		{
			id: "economy",
			label: "Economy Settings",
			icon: SlidersVertical
		},
		{
			id: "packages",
			label: "Coin Packages",
			icon: Coins
		},
		{
			id: "hosts",
			label: "Host Earnings",
			icon: Gem
		},
		{
			id: "withdrawals",
			label: `Withdrawals (${analytics.pendingWithdrawalsCount})`,
			icon: Landmark
		},
		{
			id: "agencies",
			label: "Agency Comm",
			icon: Building2
		},
		{
			id: "ledger",
			label: "Beans & Audit",
			icon: FileSpreadsheet
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1",
				children: subTabs.map((t) => {
					const Icon = t.icon;
					const active = subTab === t.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setSubTab(t.id),
						className: `px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 shrink-0 border transition-all ${active ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200" : "bg-[#160B2B] border-white/10 text-[#B9AECF] hover:text-white"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: t.label })]
					}, t.id);
				})
			}),
			subTab === "overview" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-3.5 rounded-2xl bg-gradient-to-r from-[#1e1038] via-[#131d33] to-[#122620] border border-emerald-400/30 flex items-center justify-between flex-wrap gap-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] font-black uppercase tracking-wider text-emerald-300",
								children: ["Active Economy Config v", economy.configVersion]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-bold text-white",
								children: [
									"100k Coins = PKR ",
									economy.coinPurchasePkrPer100k.toLocaleString(),
									" · Split ",
									economy.appSharePercent,
									"% App / ",
									economy.hostSharePercent,
									"% Host · 100k 💎 = PKR ",
									economy.diamondWithdrawalPkrPer100k.toLocaleString()
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [[
								"all",
								"today",
								"month"
							].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setDateRangeFilter(r),
								className: `px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${dateRangeFilter === r ? "bg-[#FFC84A] text-[#090611]" : "bg-white/10 text-[#C5B9DE] hover:text-white"}`,
								children: r
							}, r)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => downloadCsvReport(`lenzo-financial-overview-${todayKey}.csv`, [
									"TX_ID",
									"Date",
									"Sender",
									"Receiver",
									"Gross_Coins",
									"App_Beans_40%",
									"Host_Diamonds_60%",
									"Host_Gross_PKR",
									"Config_Ver"
								], giftTxs.map((g) => [
									g.id,
									g.createdAt,
									g.senderName,
									g.receiverName,
									g.coinAmount,
									g.appBeansAmount,
									g.hostDiamondsAmount,
									g.hostGrossPkr,
									g.configVersion
								])),
								className: "px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[10px] font-black flex items-center gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3 h-3" }), "CSV"]
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-amber-400/25",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Total Coins Purchased"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-[#FFC84A] font-mono",
										children: analytics.totalCoinsBought.toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-emerald-300 block font-mono",
										children: ["PKR ", roundPkr(revenue.totalCoinPurchaseRevenuePkr).toLocaleString()]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-rose-400/25",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Total Coins Gifted"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-rose-300 font-mono",
										children: (dateRangeFilter === "all" ? revenue.totalGiftingCoinsProcessed : analytics.filteredGrossCoins).toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: [revenue.totalGiftCount.toLocaleString(), " Gifts"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-emerald-400/35",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: [
											"App Beans Revenue (",
											economy.appSharePercent,
											"%)"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-emerald-300 font-mono",
										children: (dateRangeFilter === "all" ? revenue.totalBeansEarned : analytics.filteredBeansSum).toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-emerald-200/80 block font-mono",
										children: [
											"Today: ",
											analytics.dailyBeans.toLocaleString(),
											" · Mo: ",
											analytics.monthlyBeans.toLocaleString()
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-cyan-400/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: [
											"Host Diamonds Earned (",
											economy.hostSharePercent,
											"%)"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-cyan-300 font-mono",
										children: analytics.totalHostDiamondsEarned.toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-cyan-200/80 block",
										children: [analytics.activeHostsCount, " Active Hosts"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-white/10",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Diamonds Withdrawn"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-white font-mono",
										children: analytics.totalHostDiamondsWithdrawn.toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-emerald-400 block font-mono",
										children: ["Paid PKR ", roundPkr(revenue.totalWithdrawalsPaidPkr).toLocaleString()]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-amber-400/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Pending Withdrawals"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-base font-black text-amber-300 font-mono",
										children: ["PKR ", analytics.pendingWithdrawalsPkr.toLocaleString()]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: [
											analytics.pendingWithdrawalsCount,
											" req · ",
											analytics.pendingWithdrawalsDiamonds.toLocaleString(),
											" 💎"
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-purple-400/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Agency Commissions"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-base font-black text-purple-300 font-mono",
										children: ["PKR ", analytics.totalAgencyCommissionAccruedPkr.toLocaleString()]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: [agencyCommissions.length, " Records"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#160B2B] border border-white/10",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Tracked Bonus Coins"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-base font-black text-amber-200 font-mono",
										children: revenue.totalBonusCoinsIssued.toLocaleString()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: "Separate from Paid Coins"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 lg:grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
								className: "text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "w-3.5 h-3.5" }), " Top Earning Hosts (Real-Time)"]
							}), hostEarnings.slice(0, 6).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#A59AB8] py-4 text-center",
								children: "No host diamond earnings recorded yet."
							}) : hostEarnings.slice(0, 6).map((h, idx) => {
								const u = userMap.get(h.userId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-xs p-2 rounded-xl bg-white/[0.03] border border-white/5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-bold text-white truncate",
											children: [
												"#",
												idx + 1,
												" ",
												u?.fullName || h.userId.slice(0, 10),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] text-[#A59AB8] font-mono",
													children: u?.displayId || ""
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-[#A59AB8]",
											children: [
												"Available: 💎 ",
												h.availableEarningsCoins.toLocaleString(),
												" · Withdrawn: 💎 ",
												h.totalWithdrawnCoins.toLocaleString()
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-right shrink-0 ml-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-mono font-black text-cyan-300",
											children: ["💎 ", (h.totalEarnedDiamonds || 0).toLocaleString()]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-emerald-400 font-mono",
											children: ["PKR ", roundPkr((h.totalEarnedDiamonds || 0) * economy.diamondWithdrawalPkrPerDiamond).toLocaleString()]
										})]
									})]
								}, h.userId);
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
								className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
								children: [
									"Recent Live Gift Splits (",
									giftTxs.length,
									")"
								]
							}), giftTxs.slice(0, 6).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#A59AB8] py-4 text-center",
								children: "No gifts recorded in gift_transactions yet."
							}) : giftTxs.slice(0, 6).map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "font-bold text-white truncate",
										children: [
											g.senderName,
											" → ",
											g.receiverName,
											" (",
											g.quantity,
											"x ",
											g.giftName,
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[10px] text-[#A59AB8] font-mono",
										children: [
											"Coins: ",
											g.coinAmount.toLocaleString(),
											" · App: ",
											g.appBeansAmount.toLocaleString(),
											" Beans · Host: ",
											g.hostDiamondsAmount.toLocaleString(),
											" 💎"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[10px] font-mono text-emerald-300 shrink-0",
									children: ["PKR ", g.hostGrossPkr.toLocaleString()]
								})]
							}, g.id))]
						})]
					})
				]
			}),
			subTab === "economy" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 rounded-2xl bg-[#160B2B] border border-[#FFC84A]/30 space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-sm font-black text-white",
								children: "LENZO PARTY ADMIN → FINANCIAL MANAGEMENT → ECONOMY SETTINGS"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-[#B9AECF]",
								children: [
									"Config v",
									economy.configVersion,
									" · Updates apply strictly to new transactions and are immutably audited."
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: handleRunQaSuite,
								className: "px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[11px] font-black flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-3.5 h-3.5" }), "Run QA Tests A–E"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "1. Coin Purchase Rate (PKR / 100k Coins)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: cfgPurchase100k,
										onChange: (e) => setCfgPurchase100k(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Default: PKR 3,000 / 100,000 Coins"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "2. App Revenue Share (%)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: cfgAppShare,
										onChange: (e) => {
											setCfgAppShare(e.target.value);
											const n = Number(e.target.value);
											if (Number.isFinite(n) && n >= 0 && n <= 100) setCfgHostShare(String(100 - n));
										},
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Default: 40% (App Beans Ledger)"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "3. Host Revenue Share (%)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: cfgHostShare,
										onChange: (e) => setCfgHostShare(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Must satisfy App % + Host % = 100%"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "4. Diamond Conversion Ratio"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										step: "0.01",
										value: cfgDiamondRatio,
										onChange: (e) => setCfgDiamondRatio(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Default: 1.0 (100k Coins → 60k 💎)"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "5. Diamond Withdrawal Rate (PKR / 100k 💎)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: cfgWithdraw100k,
										onChange: (e) => setCfgWithdraw100k(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Default: PKR 2,600 / 100,000 Diamonds"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-bold text-[#C5B9DE]",
									children: "6. Minimum Withdrawal (Diamonds)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: cfgMinWd,
									onChange: (e) => setCfgMinWd(e.target.value),
									className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-bold text-[#C5B9DE]",
									children: "7. Maximum Withdrawal (Diamonds)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: cfgMaxWd,
									onChange: (e) => setCfgMaxWd(e.target.value),
									className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "8. Default Agency Commission (%)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										step: "0.5",
										value: cfgAgencyComm,
										onChange: (e) => setCfgAgencyComm(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "Independent from 40/60 split (agency hosts only)"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-bold text-[#C5B9DE]",
										children: "9. Withdrawal Processing Fee (%)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										step: "0.5",
										value: cfgFeePct,
										onChange: (e) => setCfgFeePct(e.target.value),
										className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8]",
										children: "0% = exact PKR 2,600 payable per 100k 💎"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-bold text-[#C5B9DE]",
									children: "10. Max Promotional Bonus Coins (%)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: cfgMaxBonusPct,
									onChange: (e) => setCfgMaxBonusPct(e.target.value),
									className: "mt-1 w-full bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 pt-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										id: "bonusEnabledToggle",
										type: "checkbox",
										checked: cfgBonusEnabled,
										onChange: (e) => setCfgBonusEnabled(e.target.checked),
										className: "w-4 h-4 accent-[#FFC84A]"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "bonusEnabledToggle",
										className: "text-xs font-bold text-white",
										children: "11. Enable Tracked Bonus Coins"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-bold text-[#C5B9DE]",
									children: "12. Enabled Payout Methods"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap gap-1.5 mt-1.5",
									children: [
										"bank_transfer",
										"easypaisa",
										"jazzcash",
										"cash_pickup"
									].map((m) => {
										const active = cfgMethods.includes(m);
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setCfgMethods((prev) => prev.includes(m) ? prev.length > 1 ? prev.filter((x) => x !== m) : prev : [...prev, m]),
											className: `px-2 py-1 rounded-lg text-[10px] font-bold border ${active ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-200" : "bg-white/5 border-white/10 text-[#A59AB8]"}`,
											children: m.replace("_", " ")
										}, m);
									})
								})] })
							]
						}),
						!draftEconomyPreview.valid ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-xs text-rose-200 font-bold",
							children: ["Validation Error: ", draftEconomyPreview.error]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/30 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-black uppercase text-emerald-300 block",
								children: "Live Impact: 100,000 Gifted Coins"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-white font-mono",
								children: [
									"App: ",
									draftEconomyPreview.gift100k?.appBeansAmount.toLocaleString(),
									" Beans · Host: ",
									draftEconomyPreview.gift100k?.hostDiamondsAmount.toLocaleString(),
									" 💎 (PKR ",
									draftEconomyPreview.gift100k?.hostGrossPkrValue.toLocaleString(),
									")"
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-black uppercase text-cyan-300 block",
								children: "Live Impact: 100,000 Diamonds Withdrawal"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-white font-mono",
								children: [
									"Independent: PKR ",
									draftEconomyPreview.wd100k?.netPayablePkr.toLocaleString(),
									" · Agency Host: PKR ",
									draftEconomyPreview.wd100kAgency?.netPayablePkr.toLocaleString()
								]
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col sm:flex-row gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: cfgReason,
								onChange: (e) => setCfgReason(e.target.value),
								placeholder: "Required Audit Reason (e.g. Verified official launch economy rates)",
								className: "flex-1 bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2.5 text-xs text-white"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: savingCfg || !draftEconomyPreview.valid,
								onClick: handleSaveEconomy,
								className: "px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-xs font-black disabled:opacity-50",
								children: savingCfg ? "Saving..." : "Save Economy Settings"
							})]
						})
					]
				}), qaResults && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 rounded-2xl bg-[#160B2B] border border-cyan-400/30 space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
						className: "text-xs font-black uppercase tracking-wider text-cyan-300",
						children: "Production Financial QA Assertions (Tests A–E)"
					}), qaResults.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${r.passed ? "bg-emerald-500/10 border-emerald-400/30 text-emerald-100" : "bg-rose-500/15 border-rose-400/40 text-rose-100"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-black",
							children: [
								r.testId,
								": ",
								r.name
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[11px] font-mono opacity-85",
							children: ["Actual: ", r.actual]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-black text-[10px] uppercase px-2 py-0.5 rounded-md bg-black/30",
							children: r.passed ? "PASS" : "FAIL"
						})]
					}, r.testId))]
				})]
			}),
			subTab === "packages" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-emerald-400/30 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "w-4 h-4" }), " Credit Verified Coin Purchase (Tracks Paid vs Bonus Coins Separately)"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
									value: buyTargetUid,
									onChange: (e) => setBuyTargetUid(e.target.value),
									className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "",
										children: "Select Verified Buyer Account..."
									}), users.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
										value: u.uid,
										children: [
											u.fullName,
											" (",
											u.displayId || u.uid.slice(0, 8),
											") — ",
											u.coins.toLocaleString(),
											" 🪙"
										]
									}, u.uid))]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: buyPaidCoins,
									onChange: (e) => setBuyPaidCoins(e.target.value),
									placeholder: "Paid Coins (e.g. 100000)",
									className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: buyBonusCoins,
									onChange: (e) => setBuyBonusCoins(e.target.value),
									placeholder: "Bonus Coins (Tracked Separately)",
									className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: buyMethod,
									onChange: (e) => setBuyMethod(e.target.value),
									placeholder: "Payment Method (Bank / EasyPaisa / JazzCash)",
									className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: buyRef,
									onChange: (e) => setBuyRef(e.target.value),
									placeholder: "Verified Payment Reference / Slip ID *",
									className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: creditingBuy,
									onClick: handleCreditVerifiedPurchase,
									className: "py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#041B10] font-black text-xs disabled:opacity-50",
									children: creditingBuy ? "Crediting..." : `Credit (PKR ${calculateCoinPurchasePricePkr(Number(buyPaidCoins || 0), economy).pricePkr.toLocaleString()})`
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between flex-wrap gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
									className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
									children: [
										"Coin Package Catalog (",
										packages.length,
										")"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: async () => {
										const res = await adminSeedOfficialCoinPackages();
										if (res.success) onNotify("Official 100k = PKR 3,000 coin packages synced to Firestore.");
										else onError(res.error || "Failed to sync packages.");
									},
									className: "px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-[11px] font-black",
									children: "Sync Official 100k = PKR 3,000 Packs"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: pkgCoins,
										onChange: (e) => {
											setPkgCoins(e.target.value);
											const calc = calculateCoinPurchasePricePkr(Number(e.target.value || 0), economy);
											setPkgPricePkr(String(calc.pricePkr));
										},
										placeholder: "Paid Coins",
										className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: pkgBonus,
										onChange: (e) => setPkgBonus(e.target.value),
										placeholder: "Bonus Coins",
										className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										value: pkgPricePkr,
										onChange: (e) => setPkgPricePkr(e.target.value),
										placeholder: "Price PKR",
										className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: pkgBadge,
										onChange: (e) => setPkgBadge(e.target.value),
										placeholder: "Promo Badge",
										className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: pkgVisibility,
										onChange: (e) => setPkgVisibility(e.target.value),
										className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "public",
												children: "Public"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "vip_only",
												children: "VIP Only"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "hidden",
												children: "Hidden"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-1.5 text-white px-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: pkgPopular,
											onChange: (e) => setPkgPopular(e.target.checked)
										}), "Popular"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-center gap-1.5 text-white px-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: pkgEnabled,
											onChange: (e) => setPkgEnabled(e.target.checked)
										}), "Active"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: savingPkg,
										onClick: handleSavePkg,
										className: "py-2 px-3 rounded-xl bg-[#FFC84A] text-[#090611] font-black flex items-center justify-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), pkgId ? "Update Pack" : "Save Pack"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2",
								children: packages.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-[#0F071E] border border-white/10 flex items-center justify-between gap-2 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-black text-[#FFC84A] font-mono",
											children: [
												"🪙 ",
												p.coins.toLocaleString(),
												" ",
												p.bonusCoins > 0 ? `(+${p.bonusCoins.toLocaleString()} bonus)` : ""
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-bold text-white font-mono",
											children: [
												"PKR ",
												p.pricePkr.toLocaleString(),
												" · ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] text-[#A59AB8]",
													children: p.enabled ? "ACTIVE" : "DISABLED"
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-emerald-300 font-mono",
											children: [
												"Sales: ",
												p.purchaseCount || 0,
												" · Rev: PKR ",
												(p.totalRevenuePkr || 0).toLocaleString()
											]
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setPkgId(p.id);
												setPkgCoins(String(p.coins));
												setPkgBonus(String(p.bonusCoins || 0));
												setPkgPricePkr(String(p.pricePkr));
												setPkgBadge(p.badge || "");
												setPkgVisibility(p.visibility || "public");
												setPkgPopular(Boolean(p.isPopular));
												setPkgPromo(Boolean(p.isPromotional));
												setPkgEnabled(p.enabled);
											},
											className: "p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "w-3.5 h-3.5" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: async () => {
												const res = await adminDeleteCoinPackage(p.id, "Removed package from Admin Catalog");
												if (res.success) onNotify(`Deleted ${p.id}`);
												else onError(res.error || "Delete failed");
											},
											className: "p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
										})]
									})]
								}, p.id))
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "text-xs font-black uppercase tracking-wider text-white",
							children: [
								"Verified Coin Purchases (",
								coinPurchases.length,
								")"
							]
						}), coinPurchases.slice(0, 15).map((cp) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-bold text-white",
								children: [
									cp.userName,
									" · +",
									cp.paidCoins.toLocaleString(),
									" Paid",
									cp.bonusCoins > 0 ? ` + ${cp.bonusCoins.toLocaleString()} Bonus` : "",
									" 🪙"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] text-[#A59AB8] font-mono",
								children: [
									"Ref: ",
									cp.paymentReference,
									" · By: ",
									cp.verifiedBy,
									" · ",
									cp.createdAt.slice(0, 16)
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono font-black text-emerald-400",
								children: ["PKR ", cp.amountPkr.toLocaleString()]
							})]
						}, cp.id))]
					})
				]
			}),
			subTab === "hosts" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1 min-w-[200px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-[#A59AB8] absolute left-3 top-1/2 -translate-y-1/2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: hostSearch,
							onChange: (e) => setHostSearch(e.target.value),
							placeholder: "Search host by Name, Username, Lenzo ID, or UID...",
							className: "w-full bg-[#160B2B] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => downloadCsvReport(`lenzo-host-earnings-${todayKey}.csv`, [
							"UID",
							"Name",
							"DisplayID",
							"Available_Diamonds",
							"Pending_Diamonds",
							"Withdrawn_Diamonds",
							"Total_Earned",
							"Daily",
							"Monthly",
							"Est_Available_PKR"
						], filteredHostEarnings.map((h) => {
							const u = userMap.get(h.userId);
							return [
								h.userId,
								u?.fullName || "",
								u?.displayId || "",
								h.availableEarningsCoins,
								h.pendingWithdrawalCoins,
								h.totalWithdrawnCoins,
								h.totalEarnedDiamonds || 0,
								h.dailyEarnedDiamonds || 0,
								h.monthlyEarnedDiamonds || 0,
								roundPkr(h.availableEarningsCoins * economy.diamondWithdrawalPkrPerDiamond)
							];
						})),
						className: "px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3.5 h-3.5" }), " Export Host Report"]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto rounded-2xl border border-white/10 bg-[#160B2B]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-left text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-white/[0.06] text-[10px] uppercase tracking-wider text-[#C5B9DE]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Host"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Available 💎"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Pending 💎"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Withdrawn 💎"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Today / Month"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "py-2.5 px-3",
									children: "Payout Value"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
							className: "divide-y divide-white/[0.06]",
							children: filteredHostEarnings.map((h) => {
								const u = userMap.get(h.userId);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
									className: "hover:bg-white/[0.03]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "font-bold text-white",
												children: u?.fullName || h.userId.slice(0, 10)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-[#A59AB8] font-mono",
												children: [
													u?.username || "",
													" · ID: ",
													u?.displayId || h.userId.slice(0, 8)
												]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-3 font-mono font-bold text-cyan-300",
											children: h.availableEarningsCoins.toLocaleString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-3 font-mono text-amber-300",
											children: h.pendingWithdrawalCoins.toLocaleString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
											className: "py-2 px-3 font-mono text-emerald-400",
											children: h.totalWithdrawnCoins.toLocaleString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-3 font-mono text-white",
											children: [
												(h.dailyEarnedDiamonds || 0).toLocaleString(),
												" / ",
												(h.monthlyEarnedDiamonds || 0).toLocaleString()
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
											className: "py-2 px-3 font-mono font-bold text-emerald-300",
											children: ["PKR ", roundPkr(h.availableEarningsCoins * economy.diamondWithdrawalPkrPerDiamond).toLocaleString()]
										})
									]
								}, h.userId);
							})
						})]
					})
				})]
			}),
			subTab === "withdrawals" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 flex-wrap",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: wdSearch,
							onChange: (e) => setWdSearch(e.target.value),
							placeholder: "Search withdrawal ID, host name, ref...",
							className: "flex-1 min-w-[180px] bg-[#160B2B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: wdFilter,
							onChange: (e) => setWdFilter(e.target.value),
							className: "bg-[#160B2B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: "all",
								children: [
									"All Statuses (",
									withdrawals.length,
									")"
								]
							}), WITHDRAWAL_STATUS_OPTIONS.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: st,
								children: st.replace("_", " ").toUpperCase()
							}, st))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => downloadCsvReport(`lenzo-withdrawals-${todayKey}.csv`, [
								"Withdrawal_ID",
								"Host",
								"Diamonds",
								"Gross_PKR",
								"Agency_Comm_PKR",
								"Fee_PKR",
								"Net_Payable_PKR",
								"Method",
								"Account",
								"Status",
								"Payment_Ref"
							], filteredWithdrawals.map((w) => [
								w.id,
								w.userName,
								w.coinsRequested,
								w.grossAmountPkr,
								w.agencyCommissionPkr || 0,
								w.feeAmountPkr || 0,
								w.finalPayablePkr,
								w.paymentDetails.bankOrProviderName,
								w.paymentDetails.accountNumber,
								w.status,
								w.paymentReference || ""
							])),
							className: "px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "w-3.5 h-3.5" }), " CSV"]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2.5",
					children: filteredWithdrawals.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-8 text-center rounded-2xl bg-[#160B2B] border border-white/10 text-xs text-[#A59AB8]",
						children: "No withdrawal requests match the current filter."
					}) : filteredWithdrawals.map((w) => {
						const isFinal = [
							"paid",
							"rejected",
							"cancelled"
						].includes(w.status);
						const isOpen = selectedWd?.id === w.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start justify-between gap-2 flex-wrap",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-black text-white",
											children: [
												w.userName,
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-[10px] text-[#A59AB8]",
													children: ["#", w.id.slice(-8).toUpperCase()]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] text-[#B9AECF]",
											children: [
												w.paymentDetails.bankOrProviderName,
												" · ",
												w.paymentDetails.accountTitle,
												" ·",
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-mono text-white",
													children: w.paymentDetails.accountNumber
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-[#A59AB8] font-mono",
											children: [
												"💎 ",
												w.coinsRequested.toLocaleString(),
												" → Gross PKR ",
												w.grossAmountPkr.toLocaleString(),
												" ",
												"− Agency PKR ",
												(w.agencyCommissionPkr || 0).toLocaleString(),
												" ",
												"− Fee PKR ",
												(w.feeAmountPkr || 0).toLocaleString(),
												" ",
												"= ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
													className: "text-emerald-400",
													children: ["Net PKR ", w.finalPayablePkr.toLocaleString()]
												})
											]
										})
									] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${w.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : w.status === "rejected" || w.status === "cancelled" ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/20 text-amber-300"}`,
											children: w.status.replace("_", " ")
										}), !isFinal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												setSelectedWd(isOpen ? null : w);
												setWdRemarks(w.adminRemarks || "");
												setWdPayRef(w.paymentReference || "");
											},
											className: "px-3 py-1 rounded-lg bg-[#FFC84A] text-[#090611] text-[10px] font-black",
											children: isOpen ? "Close" : "Process"
										})]
									})]
								}),
								w.paymentReference && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] font-mono text-cyan-300",
									children: [
										"Payment Ref: ",
										w.paymentReference,
										" ",
										w.processedByAdmin ? `· Processed by ${w.processedByAdmin}` : ""
									]
								}),
								isOpen && !isFinal && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-2 border-t border-white/10 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: wdPayRef,
											onChange: (e) => setWdPayRef(e.target.value),
											placeholder: "Bank UTR / EasyPaisa / JazzCash TX ID",
											className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white font-mono"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: wdRemarks,
											onChange: (e) => setWdRemarks(e.target.value),
											placeholder: "Admin remarks / verification note",
											className: "bg-[#0F071E] border border-white/15 rounded-xl px-3 py-2 text-white"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex flex-wrap gap-1.5",
										children: [
											"under_review",
											"approved",
											"processing",
											"paid",
											"rejected",
											"cancelled"
										].map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: processingWd,
											onClick: () => handleUpdateWithdrawal(w, st),
											className: `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${st === "paid" ? "bg-emerald-500 text-[#041B10]" : st === "rejected" || st === "cancelled" ? "bg-rose-500/25 text-rose-200 border border-rose-400/40" : "bg-white/10 text-white hover:bg-white/20"}`,
											children: ["Mark ", st.replace("_", " ")]
										}, st))
									})]
								})
							]
						}, w.id);
					})
				})]
			}),
			subTab === "agencies" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 rounded-2xl bg-[#160B2B] border border-purple-400/30 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
							className: "text-xs font-black uppercase tracking-wider text-purple-200",
							children: "Host Agency Commission Rules (Independent from 40% App / 60% Host Split)"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-[#B9AECF]",
							children: [
								"Agency commission is calculated ONLY once on Host withdrawal Gross PKR (Diamonds × ",
								economy.diamondWithdrawalPkrPerDiamond,
								") and never deducted twice."
							]
						}),
						hostAgencies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-[#A59AB8] py-4 text-center",
							children: "No active Host Agencies registered yet."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2",
							children: hostAgencies.map((ag) => {
								const rec = agencyRecords.find((r) => r.agencyId === ag.id);
								const currentInput = agencyOverrideInputs[ag.id] ?? (rec?.commissionPercentOverride !== void 0 && rec?.commissionPercentOverride !== null ? String(rec.commissionPercentOverride) : String(economy.agencyCommissionPercent));
								const preview = calculateWithdrawalWaterfall(1e5, economy, {
									hostHasActiveAgency: true,
									agencyCommissionOverridePercent: Number(currentInput || 0)
								});
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-xl bg-[#0F071E] border border-white/10 space-y-2 text-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between flex-wrap gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "font-black text-white",
											children: [
												ag.name,
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-mono text-amber-300",
													children: [
														"(",
														ag.agencyCode,
														")"
													]
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[10px] text-[#A59AB8]",
											children: [
												"Owner: ",
												ag.ownerName,
												" · Hosts: ",
												ag.totalHosts || 0,
												" · Earned Comm: PKR ",
												(rec?.totalCommissionEarnedPkr || 0).toLocaleString(),
												" · Pending: PKR ",
												(rec?.pendingCommissionPkr || 0).toLocaleString()
											]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													step: "0.5",
													min: 0,
													max: 50,
													value: currentInput,
													onChange: (e) => setAgencyOverrideInputs((prev) => ({
														...prev,
														[ag.id]: e.target.value
													})),
													className: "w-20 bg-[#160B2B] border border-white/15 rounded-lg px-2 py-1 text-white font-mono text-center"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[#A59AB8]",
													children: "%"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: async () => {
														const pct = Number(currentInput);
														const res = await adminUpdateAgencyCommissionOverride({
															agencyId: ag.id,
															agencyName: ag.name,
															agencyOwnerUid: ag.ownerUid,
															commissionPercentOverride: Number.isFinite(pct) ? pct : null,
															reason: `Set ${ag.name} commission to ${pct}%`
														});
														if (res.success) onNotify(`Updated ${ag.name} commission to ${pct}%.`);
														else onError(res.error || "Update failed.");
													},
													className: "px-3 py-1 rounded-lg bg-[#FFC84A] text-[#090611] font-black text-[10px]",
													children: "Apply"
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[10px] font-mono text-cyan-200",
										children: [
											"Impact on 100k 💎 Withdrawal: Gross PKR ",
											preview.grossAmountPkr.toLocaleString(),
											" → Agency PKR ",
											preview.agencyCommissionPkr.toLocaleString(),
											" · Host Net PKR ",
											preview.netPayablePkr.toLocaleString()
										]
									})]
								}, ag.id);
							})
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
						className: "text-xs font-black uppercase tracking-wider text-white",
						children: [
							"Agency Commission Ledger (",
							agencyCommissions.length,
							")"
						]
					}), agencyCommissions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-[#A59AB8] py-4 text-center",
						children: "No agency commissions accrued yet."
					}) : agencyCommissions.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2 text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "font-bold text-white",
							children: [
								c.agencyName,
								" ← ",
								c.hostName,
								" (",
								c.commissionPercent,
								"%)"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-[10px] text-[#A59AB8] font-mono",
							children: [
								"WD #",
								c.withdrawalId.slice(-6).toUpperCase(),
								" · ",
								c.diamondsWithdrawn.toLocaleString(),
								" 💎 · ",
								c.status.toUpperCase()
							]
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono font-black text-purple-300",
								children: ["PKR ", c.commissionPkr.toLocaleString()]
							}), c.status === "accrued" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: async () => {
									const res = await adminMarkAgencyCommissionPaid(c, `AG-${Date.now().toString().slice(-6)}`);
									if (res.success) onNotify(`Marked agency commission PKR ${c.commissionPkr.toLocaleString()} PAID.`);
									else onError(res.error || "Failed to mark paid.");
								},
								className: "px-2.5 py-1 rounded-lg bg-emerald-500 text-[#041B10] text-[10px] font-black",
								children: "Mark Paid"
							})]
						})]
					}, c.id))]
				})]
			}),
			subTab === "ledger" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-cyan-400/30 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between flex-wrap gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-xs font-black uppercase tracking-wider text-cyan-300",
								children: "Idempotent Migration & Balance Reconciliation"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-[#B9AECF]",
								children: "Verifies all existing user Coin & Diamond ledgers without ever resetting, overwriting, or inventing balances."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: runningRecon,
								onClick: handleRunReconciliation,
								className: "px-3.5 py-2 rounded-xl bg-cyan-500 text-[#041B10] text-xs font-black flex items-center gap-1.5 disabled:opacity-50",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-3.5 h-3.5 ${runningRecon ? "animate-spin" : ""}` }), runningRecon ? "Scanning..." : "Run Reconciliation Audit"]
							})]
						}), reconReport && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 rounded-xl bg-[#0F071E] border border-white/10 space-y-2 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Users Scanned: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-white",
										children: reconReport.usersScanned
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Circulating Coins: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-[#FFC84A]",
										children: reconReport.totalCirculatingCoins.toLocaleString()
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Host Diamonds: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-cyan-300",
										children: reconReport.totalAvailableDiamonds.toLocaleString()
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Flags: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: reconReport.flags.length ? "text-amber-300" : "text-emerald-400",
										children: reconReport.flags.length
									})] })
								]
							}), reconReport.flags.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-1 pt-2 border-t border-white/10",
								children: reconReport.flags.map((f, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-amber-200 flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
										f.userName,
										" (",
										f.field,
										"): profile=",
										f.profileValue.toLocaleString(),
										" vs ledger=",
										f.ledgerValue.toLocaleString(),
										" — ",
										f.note
									] })]
								}, `${f.uid}_${f.field}_${idx}`))
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-emerald-400/25 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "text-xs font-black uppercase tracking-wider text-emerald-300",
							children: [
								"App Beans / Platform Revenue Ledger (",
								beansLedger.length,
								")"
							]
						}), beansLedger.slice(0, 20).map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-bold text-white",
								children: [
									"+",
									b.beansAmount.toLocaleString(),
									" App Beans (",
									b.appSharePercent,
									"%) · ",
									b.senderName,
									" → ",
									b.receiverName
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] text-[#A59AB8] font-mono",
								children: [
									"Gross: ",
									b.grossCoins.toLocaleString(),
									" 🪙 · Host: ",
									b.hostDiamondsIssued.toLocaleString(),
									" 💎 · v",
									b.configVersion,
									" · ",
									b.dayKey
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-mono text-emerald-300 font-bold",
								children: ["≈ PKR ", b.estimatedAppRevenuePkr.toLocaleString()]
							})]
						}, b.id))]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 rounded-2xl bg-[#160B2B] border border-white/10 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
							className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
							children: [
								"Financial Admin Audit Trail (",
								auditLogs.length,
								")"
							]
						}), auditLogs.slice(0, 25).map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-2.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-0.5 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-[10px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-black uppercase text-[#FFC84A]",
										children: log.action
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono text-[#A59AB8]",
										children: log.createdAt.slice(0, 19).replace("T", " ")
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-bold text-white",
									children: log.targetLabel
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[10px] font-mono text-[#B9AECF]",
									children: [
										"Admin: ",
										log.adminEmail,
										" · Reason: ",
										log.reason
									]
								})
							]
						}, log.id))]
					})
				]
			})
		]
	});
};
// src/components/screens/AdminProgressionModal.tsx
var AdminProgressionModal = ({ isOpen, onClose, currentUserEmail }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)("users");
	const [error, setError] = (0, import_react.useState)(null);
	const [statusMsg, setStatusMsg] = (0, import_react.useState)(null);
	const [auditLogs, setAuditLogs] = (0, import_react.useState)([]);
	const [pushMode, setPushMode] = (0, import_react.useState)("global");
	const [pushTargetUid, setPushTargetUid] = (0, import_react.useState)("");
	const [pushTitle, setPushTitle] = (0, import_react.useState)("");
	const [pushMessage, setPushMessage] = (0, import_react.useState)("");
	const [pushCategory, setPushCategory] = (0, import_react.useState)("system");
	const [pushPriority, setPushPriority] = (0, import_react.useState)("high");
	const [sendingPush, setSendingPush] = (0, import_react.useState)(false);
	const activeEmail = (auth.currentUser?.email || currentUserEmail || "").trim().toLowerCase();
	const isAuthorized = isAuthorizedAdminEmail(activeEmail);
	const isEmailVerified = auth.currentUser ? auth.currentUser.emailVerified === true : false;
	(0, import_react.useEffect)(() => {
		if (!isOpen || !isAuthorized) {
			setAuditLogs([]);
			return;
		}
		const unsub = subscribeAdminAuditLogs((logs) => setAuditLogs(logs), (msg) => setError(msg));
		return () => unsub();
	}, [isOpen, isAuthorized]);
	if (!isOpen) return null;
	const notify = (msg) => {
		setError(null);
		setStatusMsg(msg);
		setTimeout(() => setStatusMsg(null), 3500);
	};
	const reportError = (msg) => {
		setError(msg);
		setTimeout(() => setError(null), 5e3);
	};
	const handleDispatchAdminPush = async (e) => {
		e.preventDefault();
		const cleanTitle = pushTitle.trim();
		const cleanMessage = pushMessage.trim();
		if (!cleanTitle || !cleanMessage) {
			reportError("Please enter both a push notification title and message.");
			return;
		}
		if (pushMode === "single" && !pushTargetUid.trim()) {
			reportError("Please enter the target User UID for a direct push notification.");
			return;
		}
		setSendingPush(true);
		try {
			if (pushMode === "global") {
				const result = await sendAdminGlobalPushBroadcast({
					title: cleanTitle,
					message: cleanMessage,
					category: pushCategory,
					priority: pushPriority
				});
				notify(`Global push sent! (${result.webPushSent} OS Web Push, ${result.activeWebSocketClients} live sockets, Firestore announcement published)`);
			} else {
				await sendPushNotification({
					targetUserId: pushTargetUid.trim(),
					type: pushCategory,
					title: cleanTitle,
					message: cleanMessage,
					senderName: "Lenzo Party Official",
					actionType: "open_notifications",
					priority: pushPriority,
					allowSelf: true,
					eventKey: "admin_direct_push"
				});
				notify(`Direct push notification sent to UID ${pushTargetUid.trim()}!`);
			}
			setPushTitle("");
			setPushMessage("");
			if (pushMode === "single") setPushTargetUid("");
		} catch (err) {
			reportError(err?.message || "Failed to send push notification.");
		} finally {
			setSendingPush(false);
		}
	};
	const tabs = [
		{
			id: "finance",
			label: "Financial Management",
			icon: DollarSign
		},
		{
			id: "users",
			label: "Users Control",
			icon: Users
		},
		{
			id: "agencies",
			label: "Agencies & Coins",
			icon: Building2
		},
		{
			id: "devices",
			label: "Device Bans",
			icon: Smartphone
		},
		{
			id: "store",
			label: "Store",
			icon: ShoppingBag
		},
		{
			id: "push",
			label: "Push Broadcast",
			icon: Megaphone
		},
		{
			id: "levels",
			label: "Levels 0–100",
			icon: Layers
		},
		{
			id: "audit",
			label: `Audit (${auditLogs.length})`,
			icon: FileClock
		}
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-4xl h-[94dvh] sm:h-[90vh] bg-[#0F071E] border border-[#FFC84A]/30 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden",
			onClick: (e) => e.stopPropagation(),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "px-4 sm:px-5 py-3.5 bg-gradient-to-r from-[#24103F] via-[#1A0B30] to-[#120722] border-b border-white/10 flex items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3 min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC84A] to-[#F59E0B] text-[#090611] flex items-center justify-center shadow-lg shrink-0",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-5 h-5" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-sm sm:text-base font-black text-white truncate",
							children: "Lenzo Administration Console"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-[11px] text-[#C5B9DE] truncate",
							children: [
								"Real-Time User Control · Agencies & System Coins · Device Bans ·",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-[#FFC84A]",
									children: activeEmail || "Restricted"
								})
							]
						})]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onClose,
					className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center shrink-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
				})]
			}), !isAuthorized ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-400/35 flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-7 h-7 text-rose-400" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-base font-black text-white",
						children: "Access Denied"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-[#B9AECF] max-w-sm",
						children: "This Administration Console is strictly restricted to authorized Lenzo Party administrators."
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
				!isEmailVerified && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-200 text-xs flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Note: Please sign in via Google or verify your admin email in Firebase Auth so live Firestore write permissions are active." })]
				}),
				statusMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: statusMsg })]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-xs font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-4 py-3 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar",
					children: tabs.map((tab) => {
						const Icon = tab.icon;
						const active = activeTab === tab.id;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => setActiveTab(tab.id),
							className: `px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${active ? "bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow-md" : "bg-white/[0.06] text-[#C5B9DE] hover:text-white"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tab.label })]
						}, tab.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto p-4 sm:p-5 space-y-4",
					children: [
						activeTab === "finance" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminFinanceTab, {
							onNotify: notify,
							onError: reportError
						}),
						activeTab === "users" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminUsersControlTab, {
							onNotify: notify,
							onError: reportError
						}),
						activeTab === "agencies" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminAgenciesTab, {
							onNotify: notify,
							onError: reportError
						}),
						activeTab === "devices" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminDeviceBansTab, {
							onNotify: notify,
							onError: reportError
						}),
						activeTab === "store" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminStoreTab, {
							onNotify: notify,
							onError: reportError
						}),
						activeTab === "push" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-gradient-to-br from-[#23113E] via-[#180B2E] to-[#120722] border border-[#FFC84A]/25 space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "w-4 h-4 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-black text-white",
										children: "Real-Time Push Notification Broadcast"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-[#C5B9DE]",
									children: "Send instant OS Web Push, Android alerts, real-time WebSocket banners, and Firestore Notification Center alerts to all users or a specific user UID."
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: handleDispatchAdminPush,
								className: "p-4 sm:p-5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setPushMode("global"),
											className: `py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all ${pushMode === "global" ? "bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] border-transparent" : "bg-white/[0.04] text-[#C5B9DE] border-white/10 hover:text-white"}`,
											children: "Global Broadcast (All Users)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setPushMode("single"),
											className: `py-2.5 px-3 rounded-xl text-xs font-extrabold border transition-all ${pushMode === "single" ? "bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white border-transparent" : "bg-white/[0.04] text-[#C5B9DE] border-white/10 hover:text-white"}`,
											children: "Direct User Push (UID)"
										})]
									}),
									pushMode === "single" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold uppercase tracking-wider text-[#C5B9DE]",
											children: "Target User UID"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: pushTargetUid,
											onChange: (e) => setPushTargetUid(e.target.value),
											placeholder: "Paste exact Firebase User UID...",
											className: "w-full px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/15 text-xs font-mono text-white placeholder:text-[#7E709B] focus:outline-none focus:border-[#FFC84A]"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold uppercase tracking-wider text-[#C5B9DE]",
												children: "Category"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: pushCategory,
												onChange: (e) => setPushCategory(e.target.value),
												className: "w-full px-3.5 py-2.5 rounded-xl bg-[#0F071E] border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-[#FFC84A]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "system",
														children: "System / Announcement"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "rooms",
														children: "Live & Party Rooms"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "gifts",
														children: "Gifts & Events"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "wallet",
														children: "Wallet & Withdrawals"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "agency",
														children: "Agency Updates"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "pk",
														children: "PK Battles"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "progression",
														children: "VIP & Levels"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "messages",
														children: "Direct Messages"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "followers",
														children: "Social & Followers"
													})
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold uppercase tracking-wider text-[#C5B9DE]",
												children: "Priority"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: pushPriority,
												onChange: (e) => setPushPriority(e.target.value),
												className: "w-full px-3.5 py-2.5 rounded-xl bg-[#0F071E] border border-white/15 text-xs font-semibold text-white focus:outline-none focus:border-[#FFC84A]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "normal",
														children: "Normal"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "high",
														children: "High (Sound + Heads-Up)"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "urgent",
														children: "Urgent (Extended Alert + Vibration)"
													})
												]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold uppercase tracking-wider text-[#C5B9DE]",
											children: "Notification Title"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											maxLength: 140,
											value: pushTitle,
											onChange: (e) => setPushTitle(e.target.value),
											placeholder: "e.g., Lenzo Party Mega PK Event Starts Now!",
											className: "w-full px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/15 text-xs text-white placeholder:text-[#7E709B] focus:outline-none focus:border-[#FFC84A]"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold uppercase tracking-wider text-[#C5B9DE]",
											children: "Notification Message"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
											rows: 3,
											maxLength: 420,
											value: pushMessage,
											onChange: (e) => setPushMessage(e.target.value),
											placeholder: "Write the alert message that will appear on users' devices...",
											className: "w-full px-3.5 py-2.5 rounded-xl bg-black/35 border border-white/15 text-xs text-white placeholder:text-[#7E709B] focus:outline-none focus:border-[#FFC84A] resize-none"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "submit",
										disabled: sendingPush,
										className: "w-full py-3 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] hover:brightness-105 disabled:opacity-50 text-[#090611] text-xs font-black flex items-center justify-center gap-2 shadow-lg transition-all",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sendingPush ? "Dispatching Push Notification..." : pushMode === "global" ? "Send Global Push to All Users" : "Send Direct Push Notification" })]
									})
								]
							})]
						}),
						activeTab === "levels" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "overflow-x-auto rounded-2xl border border-white/10",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
								className: "w-full text-left text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
									className: "bg-white/[0.06] text-[10px] uppercase tracking-wider text-[#C5B9DE]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "Level"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "Tier"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "Level Cost"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "Cumulative"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
											className: "py-2.5 px-3",
											children: "Milestones"
										})
									] })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
									className: "divide-y divide-white/[0.06]",
									children: ALL_100_LEVELS.map((lvl) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
										className: "hover:bg-white/[0.03]",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2 px-3",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelEmblemBadge, {
														level: lvl.level,
														size: "xs"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, {
														level: lvl.level,
														size: "xs"
													})]
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
												className: "py-2 px-3 font-bold text-white",
												children: [
													lvl.tierName,
													" ",
													lvl.subRank
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2 px-3 font-mono text-white tabular-nums",
												children: lvl.coinsForThisLevel.toLocaleString()
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2 px-3 font-mono text-[#FFC84A] tabular-nums",
												children: lvl.cumulativeCoins.toLocaleString()
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
												className: "py-2 px-3",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1 flex-wrap",
													children: [
														lvl.vipUnlockTier && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
															tier: lvl.vipUnlockTier,
															size: "xs"
														}),
														lvl.superVipUnlockTier && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
															tier: lvl.superVipUnlockTier,
															size: "xs"
														}),
														!lvl.vipUnlockTier && !lvl.superVipUnlockTier && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[#B9AECF]/60",
															children: "—"
														})
													]
												})
											})
										]
									}, lvl.level))
								})]
							})
						}),
						activeTab === "audit" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
								children: [
									"Real-Time Administration Audit Trail (",
									auditLogs.length,
									")"
								]
							}), auditLogs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#B9AECF] py-10 text-center rounded-2xl bg-white/[0.03] border border-white/10",
								children: "No administration audit logs recorded yet."
							}) : auditLogs.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-2xl bg-[#160B2B] border border-white/10 space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 text-[10px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-black uppercase tracking-wider text-[#FFC84A]",
											children: log.action
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[#B9AECF]",
											children: log.createdAt ? new Date(log.createdAt).toLocaleString() : ""
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-semibold text-white",
										children: log.summary
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[10px] font-mono text-[#B9AECF]",
										children: [
											"Admin: ",
											log.adminEmail,
											" · Target: ",
											log.targetLabel,
											" · Reason: ",
											log.reason
										]
									})
								]
							}, log.id))]
						})
					]
				})
			] })]
		})
	});
};
export { AdminProgressionModal };
