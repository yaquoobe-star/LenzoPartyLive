import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Dn as ArrowLeft, Dt as Globe, En as ArrowRightLeft, L as Send, N as ShieldCheck, Yt as Copy, _ as TriangleAlert, _n as Bell, a as Wallet, an as ChevronRight, cn as Check, ct as Megaphone, dt as LogOut, f as UserX, ft as Lock, ht as Link2, j as Shield, kn as require_react, l as Vibrate, nt as Moon, r as X, s as Volume2, st as MessageCircle, ut as Mail, vn as BellRing, y as Trash2, zt as ExternalLink } from "./vendor-icons-sqDS8tFw.js";
import { a as getPushPermissionState, b as DEFAULT_NOTIFICATION_PREFERENCES, f as registerDeviceForPushNotifications, h as sendSelfTestPushNotification, v as unregisterDevicePushNotifications } from "./pushNotificationService-Bs8cZsF9.js";
import { At as getSavedDeviceAccounts, Mt as saveUserSettingsToFirestore, Nt as submitAccountDeletionRequest, Ot as getLinkedAuthProviders, Pt as subscribeUserSettings, jt as loadUserSettingsFromFirestore, kt as linkGoogleAccount, n as BlockedUsersModal, t as SecureAccountPasswordCard } from "./index-DdKfydiO.js";
import { r as auth, t as FIREBASE_RUNTIME_INFO } from "./firebase-CIREZBAE.js";
import { i as require_jsx_runtime } from "./vendor-motion-CI-970bO.js";
// src/components/screens/SettingsScreen.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var SettingsScreen = ({ currentUser, onNavigate, onLogout, onOpenWallet, onOpenAccountSwitcher, isAdmin = false, onOpenAdminProgression, blockedUsers = [], onUnblockUser, moderators = [], onRemoveModerator, onUpdateProfile }) => {
	const [notifications, setNotifications] = (0, import_react.useState)(true);
	const [notifPrefs, setNotifPrefs] = (0, import_react.useState)({ ...DEFAULT_NOTIFICATION_PREFERENCES });
	const [pushPermission, setPushPermission] = (0, import_react.useState)("default");
	const [showPushSettingsModal, setShowPushSettingsModal] = (0, import_react.useState)(false);
	const [isUpdatingPush, setIsUpdatingPush] = (0, import_react.useState)(false);
	const [isSendingTestPush, setIsSendingTestPush] = (0, import_react.useState)(false);
	const [darkMode, setDarkMode] = (0, import_react.useState)(true);
	const [showOnlineStatus, setShowOnlineStatus] = (0, import_react.useState)(true);
	const [allowDirectMessages, setAllowDirectMessages] = (0, import_react.useState)("everyone");
	const [cacheSize, setCacheSize] = (0, import_react.useState)("12.5MB");
	const [language, setLanguage] = (0, import_react.useState)("English");
	const [showLanguageModal, setShowLanguageModal] = (0, import_react.useState)(false);
	const [showSecurityModal, setShowSecurityModal] = (0, import_react.useState)(false);
	const [showPrivacyModal, setShowPrivacyModal] = (0, import_react.useState)(false);
	const [showDeleteAccountModal, setShowDeleteAccountModal] = (0, import_react.useState)(false);
	const [deleteReason, setDeleteReason] = (0, import_react.useState)("");
	const [isDeletingAccount, setIsDeletingAccount] = (0, import_react.useState)(false);
	const [isLinkingGoogle, setIsLinkingGoogle] = (0, import_react.useState)(false);
	const [showLinkPasswordCard, setShowLinkPasswordCard] = (0, import_react.useState)(false);
	const [linkedProviders, setLinkedProviders] = (0, import_react.useState)(() => getLinkedAuthProviders());
	const [isBlockedModalOpen, setIsBlockedModalOpen] = (0, import_react.useState)(false);
	const [isModeratorsModalOpen, setIsModeratorsModalOpen] = (0, import_react.useState)(false);
	const [removingModId, setRemovingModId] = (0, import_react.useState)(null);
	const [toastMessage, setToastMessage] = (0, import_react.useState)(null);
	const savedAccountsCount = getSavedDeviceAccounts().length;
	(0, import_react.useEffect)(() => {
		getPushPermissionState().then(setPushPermission);
	}, []);
	(0, import_react.useEffect)(() => {
		const uid = auth.currentUser?.uid || currentUser.id;
		if (!uid || uid === "user_current_01") return;
		loadUserSettingsFromFirestore(uid).then((settings) => {
			setNotifications(settings.notificationsEnabled);
			setNotifPrefs(settings.notificationPreferences);
			setDarkMode(settings.darkMode);
			setLanguage(settings.language);
			setShowOnlineStatus(settings.showOnlineStatus);
			setAllowDirectMessages(settings.allowDirectMessages);
		});
		const unsub = subscribeUserSettings(uid, (settings) => {
			setNotifications(settings.notificationsEnabled);
			setNotifPrefs(settings.notificationPreferences);
			setDarkMode(settings.darkMode);
			setLanguage(settings.language);
			setShowOnlineStatus(settings.showOnlineStatus);
			setAllowDirectMessages(settings.allowDirectMessages);
		});
		return () => unsub();
	}, [currentUser.id]);
	const persistSetting = (partial) => {
		const uid = auth.currentUser?.uid;
		if (uid) saveUserSettingsToFirestore(uid, partial).catch(() => {});
	};
	const showToast = (msg) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 2800);
	};
	const handleClearCache = () => {
		setCacheSize("0.0MB");
		showToast("App cache successfully cleared! 12.5MB freed.");
	};
	const handleLinkGoogle = async () => {
		setIsLinkingGoogle(true);
		try {
			const updated = await linkGoogleAccount();
			setLinkedProviders(updated);
			showToast("Google sign-in linked to your permanent Lenzo account!");
		} catch (err) {
			showToast(err?.message || "Could not link Google account.");
		} finally {
			setIsLinkingGoogle(false);
		}
	};
	const handleConfirmDeleteAccount = async () => {
		if (isDeletingAccount) return;
		setIsDeletingAccount(true);
		try {
			await submitAccountDeletionRequest(deleteReason || "User requested account deletion");
			if (auth.currentUser) {
				await auth.currentUser.delete();
				showToast("Your account was permanently deleted.");
				setShowDeleteAccountModal(false);
				setTimeout(() => onLogout(), 1e3);
			}
		} catch (err) {
			if (err?.code === "auth/requires-recent-login") showToast("Deletion request logged. For security, please log out and log in again to complete immediate deletion.");
			else showToast(err?.message || "Deletion request logged. Please re-authenticate to finalize.");
			setShowDeleteAccountModal(false);
		} finally {
			setIsDeletingAccount(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "w-full pb-28 md:pb-12 animate-fade-in select-none",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-2xl mx-auto px-3.5 sm:px-6 safe-pt-3 space-y-4",
			children: [
				toastMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[140] bg-[#8B20FF] text-white text-xs font-bold py-2 px-4 rounded-full shadow-lg shadow-[#8B20FF]/50 max-w-[90vw] text-center",
					children: toastMessage
				}),
				showPushSettingsModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-base font-extrabold text-white flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BellRing, { className: "w-5 h-5 text-[#F328D5]" }), "Push Notifications"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setShowPushSettingsModal(false),
									className: "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-2xl bg-gradient-to-r from-[#8B20FF]/20 to-[#F328D5]/15 border border-[#F328D5]/30 space-y-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-black text-white",
										children: "Device Push Status"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-[#C5B9DE]",
										children: pushPermission === "granted" ? "Active — alerts delivered even when minimized" : pushPermission === "denied" ? "Blocked in browser/OS settings — enable in site/app settings" : "Tap Enable to receive real-time OS push notifications"
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${pushPermission === "granted" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/35" : pushPermission === "denied" ? "bg-rose-500/20 text-rose-300 border border-rose-400/35" : "bg-amber-500/20 text-amber-300 border border-amber-400/35"}`,
										children: pushPermission === "granted" ? "Active" : pushPermission === "denied" ? "Blocked" : "Off"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: isUpdatingPush,
										onClick: async () => {
											setIsUpdatingPush(true);
											try {
												const res = await registerDeviceForPushNotifications({ requestPermission: true });
												setPushPermission(res.permission);
												if (res.permission === "granted") {
													setNotifications(true);
													persistSetting({ notificationsEnabled: true });
													showToast("Device push notifications activated!");
												} else if (res.permission === "denied") showToast("Permission blocked. Please allow Notifications in device/browser settings.");
												else showToast("Notification permission dismissed.");
											} finally {
												setIsUpdatingPush(false);
											}
										},
										className: "flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-black disabled:opacity-50",
										children: isUpdatingPush ? "Activating..." : pushPermission === "granted" ? "Refresh Device Subscription" : "Enable Device Push"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: isSendingTestPush,
										onClick: async () => {
											setIsSendingTestPush(true);
											try {
												await sendSelfTestPushNotification();
												showToast("Test push notification dispatched!");
											} finally {
												setIsSendingTestPush(false);
											}
										},
										className: "px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isSendingTestPush ? "Sending..." : "Test" })]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-extrabold text-white",
									children: "All Push Notifications"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] text-[#B9AECF]",
									children: "Master switch for all real-time alerts"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										const next = !notifications;
										setNotifications(next);
										persistSetting({ notificationsEnabled: next });
										if (!next) unregisterDevicePushNotifications();
										else registerDeviceForPushNotifications({ requestPermission: true }).then((r) => setPushPermission(r.permission));
										showToast(next ? "All push notifications enabled" : "Push notifications muted");
									},
									className: `w-11 h-6 rounded-full transition-colors relative p-0.5 ${notifications ? "bg-[#F328D5]" : "bg-[#211333]"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-5 h-5 rounded-full bg-white transition-transform ${notifications ? "translate-x-5" : "translate-x-0"}` })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] font-black uppercase tracking-wider text-[#B9AECF] px-1",
									children: "Alert Categories"
								}), [
									{
										key: "messages",
										label: "Direct Messages & Reactions",
										desc: "Chats, voice notes, photos & invites"
									},
									{
										key: "gifts",
										label: "Gifts & Diamond Earnings",
										desc: "Every virtual gift and Host Diamonds credited"
									},
									{
										key: "followers",
										label: "Followers, Likes & Comments",
										desc: "New followers and reel interactions"
									},
									{
										key: "rooms",
										label: "Live Streams & Party Rooms",
										desc: "Followed hosts going live & moderator updates"
									},
									{
										key: "pk",
										label: "PK Battle Challenges & Results",
										desc: "Incoming PK invites, starts & winners"
									},
									{
										key: "wallet",
										label: "Wallet, Coins & Withdrawals",
										desc: "Recharges, payout approvals & transfers"
									},
									{
										key: "agency",
										label: "Agency & Commissions",
										desc: "Host contracts, slip orders & agency commissions"
									},
									{
										key: "progression",
										label: "Levels, VIP & Store Unlocks",
										desc: "Level ups, VIP upgrades & store rewards"
									},
									{
										key: "system",
										label: "Official Announcements & Security",
										desc: "Admin broadcasts & account alerts"
									}
								].map((item) => {
									const enabled = notifPrefs[item.key];
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-bold text-white truncate",
												children: item.label
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-[#B9AECF] truncate",
												children: item.desc
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												const updated = {
													...notifPrefs,
													[item.key]: !enabled
												};
												setNotifPrefs(updated);
												persistSetting({ notificationPreferences: updated });
											},
											className: `w-10 h-5.5 rounded-full transition-colors relative p-0.5 shrink-0 ${enabled && notifications ? "bg-[#8B20FF]" : "bg-[#211333]"}`,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-4.5 h-4.5 rounded-full bg-white transition-transform ${enabled && notifications ? "translate-x-4.5" : "translate-x-0"}` })
										})]
									}, item.key);
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										const updated = {
											...notifPrefs,
											soundEnabled: !notifPrefs.soundEnabled
										};
										setNotifPrefs(updated);
										persistSetting({ notificationPreferences: updated });
									},
									className: `p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${notifPrefs.soundEnabled ? "bg-[#8B20FF]/20 border-[#8B20FF]/50 text-white" : "bg-white/[0.03] border-white/10 text-[#B9AECF]"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Volume2, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Sound: ", notifPrefs.soundEnabled ? "On" : "Off"] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										const updated = {
											...notifPrefs,
											vibrateEnabled: !notifPrefs.vibrateEnabled
										};
										setNotifPrefs(updated);
										persistSetting({ notificationPreferences: updated });
									},
									className: `p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 ${notifPrefs.vibrateEnabled ? "bg-[#F328D5]/20 border-[#F328D5]/50 text-white" : "bg-white/[0.03] border-white/10 text-[#B9AECF]"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Vibrate, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Vibrate: ", notifPrefs.vibrateEnabled ? "On" : "Off"] })]
								})]
							})
						]
					})
				}),
				showLanguageModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-[#160C25] border border-white/10 rounded-3xl p-5 max-w-xs w-full",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold text-white font-display mb-3",
								children: "Select Language"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2 mb-4",
								children: [
									"English",
									"Español",
									"العربية",
									"اردو",
									"Français",
									"Türkçe"
								].map((lang) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => {
										setLanguage(lang);
										persistSetting({ language: lang });
										setShowLanguageModal(false);
										showToast(`Language saved to cloud: ${lang}`);
									},
									className: `w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${language === lang ? "bg-[#8B20FF] text-white" : "bg-[#211333] text-[#B9AECF] hover:text-white"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: lang }), language === lang && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4" })]
								}, lang))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowLanguageModal(false),
								className: "w-full py-2 rounded-xl bg-white/10 text-white text-xs font-bold",
								children: "Close"
							})
						]
					})
				}),
				showSecurityModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-md w-full space-y-4 shadow-2xl",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-base font-extrabold text-white flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-5 h-5 text-[#8B20FF]" }), "Account Security & Identity"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowSecurityModal(false),
								className: "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2.5 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-bold text-[#B9AECF] uppercase",
										children: "Permanent Firebase UID"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-white truncate",
											children: auth.currentUser?.uid || currentUser.id
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												navigator.clipboard?.writeText(auth.currentUser?.uid || currentUser.id).catch(() => {});
												showToast("Permanent UID copied!");
											},
											className: "p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" })
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#B9AECF] block",
											children: "Lenzo ID"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-bold text-white",
											children: currentUser.displayId
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#B9AECF] block",
											children: "Firebase Project"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-bold text-emerald-300 truncate block",
											children: FIREBASE_RUNTIME_INFO.projectId
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2.5",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-bold text-[#B9AECF] uppercase",
												children: "Linked Sign-In Providers"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `px-2 py-0.5 rounded-md text-[10px] font-bold ${linkedProviders.includes("password") || currentUser.passwordRegistered ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border border-amber-500/30"}`,
												children: ["Password: ", linkedProviders.includes("password") || currentUser.passwordRegistered ? "Registered" : "Not Set"]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1.5",
											children: linkedProviders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#B9AECF]",
												children: "Session sign-in active"
											}) : linkedProviders.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]",
												children: p === "google.com" ? "Google Account" : p === "password" ? "Email & Password" : p
											}, p))
										}),
										!linkedProviders.includes("password") && !currentUser.passwordRegistered && auth.currentUser?.email && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												setShowSecurityModal(false);
												setShowLinkPasswordCard(true);
											},
											className: "mt-1 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-md",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Register Password for Email Login" })]
										}),
										!linkedProviders.includes("google.com") && auth.currentUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isLinkingGoogle,
											onClick: () => void handleLinkGoogle(),
											className: "mt-1 w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/90 disabled:opacity-50",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link2, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isLinkingGoogle ? "Linking Google..." : "Link Google Sign-In to This UID" })]
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#B9AECF]",
										children: "Firebase App Check"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `font-bold text-[11px] ${FIREBASE_RUNTIME_INFO.appCheckEnabled ? "text-emerald-400" : "text-amber-300"}`,
										children: FIREBASE_RUNTIME_INFO.appCheckEnabled ? "Active" : "Ready (Site Key Pending)"
									})]
								})
							]
						})]
					})
				}),
				showPrivacyModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-[#160C25] border border-white/15 rounded-3xl p-5 max-w-sm w-full space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-base font-extrabold text-white flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-4 h-4 text-[#8B20FF]" }), "Privacy Settings"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setShowPrivacyModal(false),
									className: "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between p-3 rounded-2xl bg-white/[0.04] border border-white/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-bold text-white",
									children: "Show Online Status"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[10px] text-[#B9AECF]",
									children: "Allow others to see when you are active"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										const next = !showOnlineStatus;
										setShowOnlineStatus(next);
										persistSetting({ showOnlineStatus: next });
										showToast("Privacy setting synced");
									},
									className: `w-11 h-6 rounded-full transition-colors relative p-0.5 ${showOnlineStatus ? "bg-[#8B20FF]" : "bg-[#211333]"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-5 h-5 rounded-full bg-white transition-transform ${showOnlineStatus ? "translate-x-5" : "translate-x-0"}` })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs font-bold text-white",
									children: "Who can send direct messages"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-3 gap-1.5",
									children: [
										"everyone",
										"followers",
										"nobody"
									].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => {
											setAllowDirectMessages(opt);
											persistSetting({ allowDirectMessages: opt });
											showToast(`Messages allowed from: ${opt}`);
										},
										className: `py-2 rounded-xl text-[11px] font-bold capitalize border transition-colors ${allowDirectMessages === opt ? "bg-[#8B20FF] border-[#F328D5] text-white" : "bg-white/[0.04] border-white/10 text-[#B9AECF]"}`,
										children: opt
									}, opt))
								})]
							})
						]
					})
				}),
				showDeleteAccountModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "bg-[#160C25] border border-rose-500/40 rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-6 h-6" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-extrabold text-white text-center",
								children: "Delete Account Permanently?"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#B9AECF] text-center leading-relaxed",
								children: "This logs an official deletion request and permanently deletes your Firebase Auth credentials. This action cannot be undone."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 2,
								placeholder: "Optional reason for leaving...",
								value: deleteReason,
								onChange: (e) => setDeleteReason(e.target.value),
								maxLength: 250,
								className: "w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder-[#B9AECF]/50 outline-none"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isDeletingAccount,
									onClick: () => setShowDeleteAccountModal(false),
									className: "flex-1 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isDeletingAccount,
									onClick: () => void handleConfirmDeleteAccount(),
									className: "flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold disabled:opacity-50",
									children: isDeletingAccount ? "Deleting..." : "Delete Forever"
								})]
							})
						]
					})
				}),
				showLinkPasswordCard && auth.currentUser?.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecureAccountPasswordCard, {
					email: auth.currentUser.email,
					userName: currentUser.name,
					onSuccess: ({ providerIds, profile }) => {
						setLinkedProviders(providerIds.length > 0 ? providerIds : getLinkedAuthProviders());
						onUpdateProfile?.({
							...currentUser,
							...profile || {},
							providerIds,
							passwordRegistered: true
						});
						setShowLinkPasswordCard(false);
						showToast("Password registered! You can now log in with Email & Password or Google.");
					},
					onLater: () => setShowLinkPasswordCard(false)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => onNavigate("profile"),
						className: "w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-4 h-4" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-xl font-extrabold text-white font-display",
						children: "Settings"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2 pt-2",
					children: [
						onOpenAccountSwitcher && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: onOpenAccountSwitcher,
							className: "flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#fe2c55]/15 via-[#160C25] to-[#25f4ee]/10 hover:opacity-95 border border-[#fe2c55]/35 transition-all cursor-pointer group shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-8 h-8 rounded-xl bg-gradient-to-tr from-[#fe2c55] to-[#8B20FF] text-white flex items-center justify-center shadow-sm",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "w-4 h-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-black text-white flex items-center gap-1.5",
									children: ["Switch Account", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-[#25f4ee] font-mono",
										children: [
											savedAccountsCount,
											"/",
											5,
											" SAVED"
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-[#B9AECF] block",
									children: "Manage up to 5 accounts on this device with isolated data"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#25f4ee] group-hover:translate-x-1 transition-transform" })]
						}),
						onOpenWallet && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: onOpenWallet,
							className: "flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#F328D5]/15 to-[#8B20FF]/15 hover:opacity-95 border border-amber-400/40 transition-all cursor-pointer group shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-black flex items-center justify-center font-black shadow-sm",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "w-4 h-4 text-black" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-black text-white flex items-center gap-1.5",
									children: ["WALLET & EARNINGS", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono",
										children: "PKR CASHOUT"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-[#B9AECF] block",
									children: "Recharge coins, convert earnings, and request bank payouts"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#FFC84A] group-hover:translate-x-1 transition-transform" })]
						}),
						isAdmin && onOpenAdminProgression && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: onOpenAdminProgression,
							className: "flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-[#2D1154] via-[#1C0B36] to-[#2B1707] hover:opacity-95 border border-[#FFC84A]/50 transition-all cursor-pointer group shadow-md",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-8 h-8 rounded-xl bg-[#FFC84A]/20 border border-[#FFC84A]/50 text-[#FFC84A] flex items-center justify-center font-black",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-4 h-4" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-black text-white flex items-center gap-1.5",
									children: ["ADMIN PROGRESSION PANEL", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[9px] px-1.5 py-0.5 rounded bg-[#FFC84A]/20 text-[#FFC84A] font-mono",
										children: "100 LV · VIP · SVIP"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-[#C5B9DE] block",
									children: "Inspect 100 levels, edit VIP/Super VIP/badges & audit logs"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#FFC84A] group-hover:translate-x-1 transition-transform" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => {
								setLinkedProviders(getLinkedAuthProviders());
								setShowSecurityModal(true);
							},
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-5 h-5 text-[#8B20FF]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white block",
									children: "Account Security"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-[#B9AECF]",
									children: "Permanent UID, Linked Providers & App Check"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => setShowPushSettingsModal(true),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-[#F328D5]/25 transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "w-5 h-5 text-[#F328D5] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-sm font-semibold text-white flex items-center gap-1.5",
										children: ["Push Notifications", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${notifications && pushPermission === "granted" ? "bg-emerald-500/20 text-emerald-300" : notifications ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-[#B9AECF]"}`,
											children: !notifications ? "Muted" : pushPermission === "granted" ? "Active" : "Setup"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#B9AECF] block truncate",
										children: "Chats, gifts, live rooms, PK battles, wallet, agency & test push"
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF] group-hover:translate-x-0.5 transition-transform shrink-0" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => setShowLanguageModal(true),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "w-5 h-5 text-[#06B6D4]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "Language"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-[#B9AECF]",
									children: language
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] border border-white/[0.08]",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "w-5 h-5 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "Dark Mode"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									const next = !darkMode;
									setDarkMode(next);
									persistSetting({ darkMode: next });
									showToast("Theme preference synced to your account");
								},
								className: `w-11 h-6 rounded-full transition-colors relative p-0.5 ${darkMode ? "bg-[#8B20FF]" : "bg-[#211333]"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-5 h-5 rounded-full bg-white transition-transform ${darkMode ? "translate-x-5" : "translate-x-0"}` })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => setShowPrivacyModal(true),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-5 h-5 text-[#8B20FF]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "Privacy Settings"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => setIsModeratorsModalOpen(true),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-cyan-500/20 hover:border-cyan-400/40 transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-5 h-5 text-cyan-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white block",
									children: "Moderation & Moderators"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-[#B9AECF]",
									children: "Manage lifetime moderators for your Party Rooms"
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-[11px] font-bold text-cyan-300",
									children: moderators.length
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => setIsBlockedModalOpen(true),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserX, { className: "w-5 h-5 text-rose-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "Blocked Users"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-[#B9AECF]",
									children: blockedUsers.length
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
							})]
						}),
						isModeratorsModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "w-full max-w-md rounded-3xl bg-[#140A24] border border-cyan-500/30 shadow-2xl overflow-hidden flex flex-col max-h-[82vh]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-5 py-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-cyan-950/60 via-[#1A0D30] to-indigo-950/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "w-9 h-9 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-5 h-5 text-cyan-300" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "text-sm font-black text-white",
												children: "My Room Moderators"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[11px] text-cyan-200/80",
												children: "Active for life across all your broadcasts until removed"
											})] })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setIsModeratorsModalOpen(false),
											className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "p-4 overflow-y-auto flex-1 space-y-2.5",
										children: moderators.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "py-10 px-4 text-center space-y-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "w-12 h-12 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-6 h-6 text-cyan-300/70" })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-sm font-bold text-white",
													children: "No Moderators Assigned Yet"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-xs text-[#B9AECF] leading-relaxed",
													children: [
														"Open your Party Room, tap any user on a seat, comment, or audience list, and choose",
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-cyan-300 font-bold",
															children: "Make Moderator"
														}),
														". They will keep Moderator powers across all your future rooms until you remove them here."
													]
												})
											]
										}) : moderators.map((mod) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-3 min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
													src: mod.moderatorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mod.moderatorName || "M")}&background=0891b2&color=fff`,
													alt: mod.moderatorName,
													className: "w-11 h-11 rounded-full object-cover border-2 border-cyan-400/70 shrink-0"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1.5 flex-wrap",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-xs font-black text-white truncate",
																children: mod.moderatorName
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-[8.5px] font-black uppercase text-white",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-2.5 h-2.5" }), "MOD"]
															})]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "text-[10px] text-[#B9AECF] truncate",
															children: [mod.moderatorUsername ? `${mod.moderatorUsername} · ` : "", mod.moderatorDisplayId ? `ID: ${mod.moderatorDisplayId}` : "Lifetime Moderator"]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "text-[9.5px] text-white/45 mt-0.5",
															children: ["Added ", new Date(mod.assignedAt || Date.now()).toLocaleDateString()]
														})
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												disabled: removingModId === mod.moderatorUserId,
												onClick: async () => {
													if (!onRemoveModerator) return;
													setRemovingModId(mod.moderatorUserId);
													try {
														await onRemoveModerator(mod.moderatorUserId, mod.moderatorName);
														showToast(`${mod.moderatorName} removed from Moderators.`);
													} finally {
														setRemovingModId(null);
													}
												},
												className: "shrink-0 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/40 text-rose-300 text-[11px] font-bold transition-all active:scale-95 disabled:opacity-50",
												children: removingModId === mod.moderatorUserId ? "Removing..." : "Remove"
											})]
										}, mod.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "px-4 py-3 border-t border-white/10 bg-white/[0.02] text-[10.5px] text-[#B9AECF] leading-relaxed",
										children: "Moderators can control seats, accept requests, kick or block users (except the Host), and delete or clear chat history."
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockedUsersModal, {
							isOpen: isBlockedModalOpen,
							onClose: () => setIsBlockedModalOpen(false),
							blockedUsers,
							onUnblock: async (uid, uname) => {
								if (onUnblockUser) await onUnblockUser(uid, uname);
								showToast(`${uname} has been unblocked.`);
							}
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "pt-2 space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "px-1 flex items-center justify-between",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-black uppercase tracking-wider text-[#B9AECF]",
										children: "Official Support & Community"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-sky-400/20 hover:border-sky-400/40 transition-all",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "mailto:lenzopartyofficial@gmail.com?subject=Lenzo%20Party%20Live%20Official%20Support",
										className: "flex items-center gap-3 min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "w-4 h-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-white block",
												children: "Official Support Email"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-mono text-sky-300 block truncate",
												children: "lenzopartyofficial@gmail.com"
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												navigator.clipboard?.writeText("lenzopartyofficial@gmail.com").catch(() => {});
												showToast("Official Support Email copied!");
											},
											title: "Copy Support Email",
											className: "p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 text-[#C5B9DE] hover:text-white transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: "mailto:lenzopartyofficial@gmail.com?subject=Lenzo%20Party%20Live%20Official%20Support",
											className: "px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-sky-200 text-[11px] font-bold flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-3 h-3" })]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-emerald-400/25 hover:border-emerald-400/45 transition-all",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
										href: "https://wa.me/97470769910?text=Hello%20Lenzo%20Party%20Official%20Support",
										target: "_blank",
										rel: "noopener noreferrer",
										className: "flex items-center gap-3 min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 flex items-center justify-center shrink-0",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "w-4 h-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-white block",
												children: "Official WhatsApp Support"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-mono text-emerald-300 block truncate",
												children: "0097470769910"
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 shrink-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												navigator.clipboard?.writeText("0097470769910").catch(() => {});
												showToast("Official WhatsApp number copied!");
											},
											title: "Copy WhatsApp Number",
											className: "p-2 rounded-xl bg-white/[0.07] hover:bg-white/15 text-[#C5B9DE] hover:text-white transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: "https://wa.me/97470769910?text=Hello%20Lenzo%20Party%20Official%20Support",
											target: "_blank",
											rel: "noopener noreferrer",
											className: "px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#051810] text-[11px] font-black flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Chat" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-3 h-3" })]
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: "https://whatsapp.com/channel/0029Vb8oDxx3mFY75AcHGd3n",
									target: "_blank",
									rel: "noopener noreferrer",
									className: "flex items-center justify-between gap-2 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-[#160C25] to-teal-500/10 hover:opacity-95 border border-emerald-400/35 transition-all group",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3 min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-[#051810] flex items-center justify-center shrink-0 shadow-sm",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "w-4 h-4" })
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-black text-white block",
												children: "Join Official WhatsApp Channel"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[11px] text-[#C5B9DE] block truncate",
												children: "Official updates, events & announcements"
											})]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] font-black flex items-center gap-1 shrink-0 group-hover:bg-emerald-500 group-hover:text-[#051810] transition-colors",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Join" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "w-3 h-3" })]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: () => showToast(`Lenzo Party Live v1.0.7 (Build 8 · ${FIREBASE_RUNTIME_INFO.projectId} · com.lenzoparty.app)`),
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: "/app-icon.png?v=3",
									alt: "Lenzo Party LIVE",
									className: "w-7 h-7 object-contain drop-shadow-[0_2px_8px_rgba(168,85,247,0.5)] shrink-0"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "About Lenzo Party Live"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-[#B9AECF]",
									children: "v1.0.7 (Build 8)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							onClick: handleClearCache,
							className: "flex items-center justify-between p-4 rounded-2xl bg-[#160C25] hover:bg-[#211333] border border-white/[0.08] transition-all cursor-pointer group",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-5 h-5 text-[#B9AECF]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-semibold text-white",
									children: "Clear Cache"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-mono text-[#B9AECF]",
									children: cacheSize
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4 text-[#B9AECF]" })]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pt-4 space-y-2.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: onLogout,
						className: "w-full py-3.5 rounded-2xl bg-[#211333] hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-500 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Log Out" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setShowDeleteAccountModal(true),
						className: "w-full py-2.5 rounded-xl bg-transparent hover:bg-rose-950/20 text-rose-500/70 hover:text-rose-400 font-medium text-xs flex items-center justify-center gap-1.5 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Delete Account" })]
					})]
				})
			]
		})
	});
};
export { SettingsScreen };
