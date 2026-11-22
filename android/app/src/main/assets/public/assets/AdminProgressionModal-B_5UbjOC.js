import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { $t as CircleAlert, A as Shield, C as Star, E as Smartphone, Ft as EyeOff, G as Plus, H as RefreshCw, Ht as Crown, J as Phone, Jt as Clock, L as Search, M as ShieldCheck, N as ShieldAlert, Nt as FileClock, Pt as Eye, R as Save, Vt as Database, Xt as CirclePause, Yt as CircleX, Z as PenLine, Zt as CircleCheck, dt as LockOpen, hn as Ban, ht as Layers, in as Check, k as ShoppingBag, l as Users, m as Upload, nt as Minus, ot as MessageCircle, qt as Coins, r as X, un as Building2, v as Trash2, w as Sparkles, wn as require_react, yt as IdCard } from "./vendor-icons-CKZC98wp.js";
import { r as auth } from "./firebase-zc-_OxQs.js";
import { A as adminUnbanDevice, C as VipTierBadge, D as adminSendSystemCoinsToAgency, E as adminEditUserProfileAndProgression, M as subscribeAllUsersForAdmin, N as subscribeBannedDevicesForAdmin, O as adminSetUserBlockStatus, S as SuperVipTierBadge, T as adminBanDevice, _ as subscribeAllAgenciesForAdmin, b as LevelEmblemBadge, d as VerifiedTick, dt as uploadReelVideoAndThumbnail, gt as isAuthorizedAdminEmail, h as buildWhatsAppUrl, j as subscribeAdminAuditLogs, k as adminSetUserSuspension, lt as uploadMediaDataUrlWithProgress, m as adminSetAgencyStatus, p as adminReviewAgencyApplication, v as subscribeAllAgencyApplications, w as adminAdjustUserCoins, wt as ALL_100_LEVELS, y as LevelBadge } from "./index-C_n6rme9.js";
import { i as require_jsx_runtime } from "./vendor-motion-BGGq0eX2.js";
import { f as STORE_ANIMATION_PRESET_OPTIONS, i as adminSeedDefaultStoreCatalog, n as adminDeleteStoreProduct, r as adminSaveStoreProduct, s as subscribeStoreProducts, t as StoreAssetPreview, u as DEFAULT_STORE_CATEGORIES } from "./StoreAssetPreview-C5DuShFD.js";
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
// src/components/screens/AdminProgressionModal.tsx
var AdminProgressionModal = ({ isOpen, onClose, currentUserEmail }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)("users");
	const [error, setError] = (0, import_react.useState)(null);
	const [statusMsg, setStatusMsg] = (0, import_react.useState)(null);
	const [auditLogs, setAuditLogs] = (0, import_react.useState)([]);
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
	const tabs = [
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
