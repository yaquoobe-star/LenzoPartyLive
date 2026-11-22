import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { At as Funnel, Kt as Crown, Lt as Eye, Sn as Award, T as Sparkles, Zt as Coins, _t as Layers, cn as Check, ft as Lock, j as Shield, kn as require_react, pn as Calendar, r as X, rn as CircleAlert, tn as CircleCheck, v as TrendingUp } from "./vendor-icons-sqDS8tFw.js";
import { r as isAuthorizedAdminEmail } from "./adminAuth-D6F5ZQ0I.js";
import { C as VipTierBadge, F as calculateLevelProgression, Ft as ALL_100_LEVELS, Ht as formatCoinsCompact, P as VIP_FRAME_DEFINITIONS, Pt as ACHIEVEMENT_BADGE_DEFINITIONS, Rt as LEVEL_TIER_CONFIGS, S as SuperVipTierBadge, Ut as getLevelDefinition, Vt as evaluateAchievementBadges, a as subscribeUserLevelProgression, b as LevelEmblemBadge, i as fetchAuthoritativeProgression, n as equipAchievementBadges, o as AchievementBadgeEmblem, r as equipActiveFrame, x as AvatarWithFrame, y as LevelBadge, zt as SUPER_VIP_TIER_DEFINITIONS } from "./index-DTa1xr8z.js";
import { i as require_jsx_runtime } from "./vendor-motion-CI-970bO.js";
// src/components/screens/LevelAndVIPModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var LevelAndVIPModal = ({ isOpen, onClose, currentUser, initialTab = "roadmap", onUpdateUser, onOpenAdminPanel }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)(initialTab);
	const [roadmapStatusFilter, setRoadmapStatusFilter] = (0, import_react.useState)("all");
	const [selectedTierFilter, setSelectedTierFilter] = (0, import_react.useState)("all");
	const [badgeFilter, setBadgeFilter] = (0, import_react.useState)("all");
	const [inspectedLevel, setInspectedLevel] = (0, import_react.useState)(null);
	const initialBaselineCoins = typeof currentUser.totalQualifyingCoinsSpent === "number" ? currentUser.totalQualifyingCoinsSpent : getLevelDefinition(Math.max(0, currentUser.level ?? 0)).cumulativeCoins;
	const [progression, setProgression] = (0, import_react.useState)(() => calculateLevelProgression(initialBaselineCoins, currentUser.id, currentUser.equippedVipFrame || 0, {
		activeFrameType: currentUser.activeFrameType,
		equippedSuperVipFrame: currentUser.equippedSuperVipFrame || 0,
		earnedAchievements: currentUser.earnedAchievements || [],
		equippedAchievementBadges: currentUser.equippedBadges || []
	}));
	const [serverAchievements, setServerAchievements] = (0, import_react.useState)(null);
	const [previewFrame, setPreviewFrame] = (0, import_react.useState)(null);
	const [busyKey, setBusyKey] = (0, import_react.useState)(null);
	const [toast, setToast] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (isOpen) {
			setActiveTab(initialTab);
			setPreviewFrame(null);
		}
	}, [isOpen, initialTab]);
	(0, import_react.useEffect)(() => {
		if (!isOpen || !currentUser.id) return;
		const unsub = subscribeUserLevelProgression(currentUser.id, initialBaselineCoins, (prog) => {
			setProgression(prog);
		});
		fetchAuthoritativeProgression(currentUser.id).then((res) => {
			if (res?.progression) setProgression(res.progression);
			if (Array.isArray(res?.achievements)) setServerAchievements(res.achievements);
		}).catch(() => {});
		return () => unsub();
	}, [
		isOpen,
		currentUser.id,
		initialBaselineCoins
	]);
	const showToast = (msg, type = "success") => {
		setToast({
			msg,
			type
		});
		setTimeout(() => setToast(null), 3200);
	};
	const achievementBadges = (0, import_react.useMemo)(() => {
		if (serverAchievements && serverAchievements.length > 0) {
			const equippedSet = new Set(progression.equippedAchievementBadges || currentUser.equippedBadges || []);
			return serverAchievements.map((b) => ({
				...b,
				isEquipped: b.isEarned && equippedSet.has(b.id)
			}));
		}
		const profileCompletedSteps = (currentUser.name && currentUser.name.trim().length >= 2 ? 1 : 0) + (currentUser.bio && currentUser.bio.trim().length >= 5 ? 1 : 0) + (currentUser.country && currentUser.country.trim().length > 0 ? 1 : 0);
		return evaluateAchievementBadges({
			totalQualifyingCoinsSpent: progression.totalQualifyingCoinsSpent,
			diamondsEarned: currentUser.diamonds || 0,
			publicVideosCount: 0,
			liveSessionsHosted: currentUser.liveSessionsHosted || 0,
			loginStreakDays: currentUser.loginStreakDays || 1,
			giftsSentCount: currentUser.giftsSentCount || 0,
			followersCount: currentUser.followersCount || 0,
			followingCount: currentUser.followingCount || 0,
			totalLikesCount: currentUser.totalLikes || 0,
			hasAgency: Boolean(currentUser.agencyId && currentUser.agencyStatus === "active"),
			pkWinsCount: currentUser.pkWinsCount || 0,
			eventsWonCount: currentUser.eventsWonCount || 0,
			profileCompletedSteps
		}, progression.earnedAchievements || currentUser.earnedAchievements || [], progression.equippedAchievementBadges || currentUser.equippedBadges || [], ACHIEVEMENT_BADGE_DEFINITIONS);
	}, [
		serverAchievements,
		progression,
		currentUser
	]);
	const filteredLevels = (0, import_react.useMemo)(() => {
		return ALL_100_LEVELS.filter((lvl) => {
			const isCompleted = lvl.level < progression.currentLevel || progression.isMaxMastery && lvl.level === 100;
			const isCurrent = lvl.level === progression.currentLevel && !isCompleted;
			const isLocked = lvl.level > progression.currentLevel;
			if (roadmapStatusFilter === "completed" && !isCompleted) return false;
			if (roadmapStatusFilter === "current" && !isCurrent) return false;
			if (roadmapStatusFilter === "locked" && !isLocked) return false;
			if (selectedTierFilter !== "all" && lvl.tierId !== selectedTierFilter) return false;
			return true;
		});
	}, [
		progression.currentLevel,
		progression.isMaxMastery,
		roadmapStatusFilter,
		selectedTierFilter
	]);
	if (!isOpen) return null;
	const handleEquipFrame = async (frameType, tier) => {
		const key = `${frameType}_${tier}`;
		if (busyKey) return;
		setBusyKey(key);
		const res = await equipActiveFrame(currentUser.id, frameType, tier);
		setBusyKey(null);
		if (res.success) {
			const nextVip = frameType === "vip" ? tier : 0;
			const nextSuperVip = frameType === "super_vip" ? tier : 0;
			setProgression((prev) => ({
				...prev,
				activeFrameType: frameType,
				equippedVipFrame: nextVip,
				equippedSuperVipFrame: nextSuperVip
			}));
			setPreviewFrame(null);
			if (onUpdateUser) onUpdateUser({
				activeFrameType: frameType,
				equippedVipFrame: nextVip,
				equippedSuperVipFrame: nextSuperVip,
				vipLevel: Math.max(progression.highestUnlockedVipTier, nextVip),
				isVIP: progression.highestUnlockedVipTier > 0 || nextVip > 0,
				superVipLevel: Math.max(progression.highestUnlockedSuperVipTier, nextSuperVip),
				isSuperVIP: progression.highestUnlockedSuperVipTier > 0 || nextSuperVip > 0
			});
			showToast(res.message || "Active frame updated!", "success");
		} else showToast(res.error || "Could not equip frame.", "error");
	};
	const handleToggleAchievementEquip = async (badge) => {
		if (!badge.isEarned || busyKey) return;
		const currentEquipped = new Set(progression.equippedAchievementBadges || currentUser.equippedBadges || []);
		if (currentEquipped.has(badge.id)) currentEquipped.delete(badge.id);
		else {
			if (currentEquipped.size >= 3) {
				showToast("Maximum 3 achievement badges can be equipped. Unequip one first.", "error");
				return;
			}
			currentEquipped.add(badge.id);
		}
		const nextIds = Array.from(currentEquipped);
		setBusyKey(`ach_${badge.id}`);
		const res = await equipAchievementBadges(currentUser.id, nextIds);
		setBusyKey(null);
		if (res.success) {
			const finalIds = res.equippedAchievementBadges || nextIds;
			setProgression((prev) => ({
				...prev,
				equippedAchievementBadges: finalIds
			}));
			if (onUpdateUser) onUpdateUser({ equippedBadges: finalIds });
			showToast(finalIds.includes(badge.id) ? `${badge.name} equipped to Profile` : `${badge.name} removed from Profile`, "success");
		} else showToast(res.error || "Could not update equipped badges.", "error");
	};
	const displayFrameType = previewFrame ? previewFrame.type : progression.activeFrameType;
	const displayVipTier = previewFrame?.type === "vip" ? previewFrame.tier : displayFrameType === "vip" ? progression.equippedVipFrame : 0;
	const displaySuperVipTier = previewFrame?.type === "super_vip" ? previewFrame.tier : displayFrameType === "super_vip" ? progression.equippedSuperVipFrame : 0;
	const earnedAchievementsCount = achievementBadges.filter((b) => b.isEarned).length;
	const equippedAchievementsCount = achievementBadges.filter((b) => b.isEquipped).length;
	const visibleAchievements = badgeFilter === "earned" ? achievementBadges.filter((b) => b.isEarned) : badgeFilter === "locked" ? achievementBadges.filter((b) => !b.isEarned) : achievementBadges;
	const nextVipUnlock = VIP_FRAME_DEFINITIONS.find((v) => v.unlockLevel > progression.currentLevel);
	const nextSuperVipUnlock = SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.unlockLevel > progression.currentLevel);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-2xl bg-[#110820] border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]",
			onClick: (e) => e.stopPropagation(),
			children: [
				toast && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border ${toast.type === "error" ? "bg-rose-950/95 border-rose-400/50 text-rose-100" : "bg-[#1F0F3E]/95 border-[#FFC84A]/60 text-white"}`,
					children: [toast.type === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 text-rose-400 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-[#FFC84A] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: toast.msg })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-4 sm:px-6 pt-4 pb-3 bg-gradient-to-r from-[#1D0C38] via-[#27104A] to-[#17092C] border-b border-white/10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-10 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2.5 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FFC84A] via-[#FA26A0] to-[#8B20FF] flex items-center justify-center text-white shadow-lg shrink-0",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-5 h-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base sm:text-lg font-black text-white tracking-tight truncate",
										children: "Lenzo Progression & Royalty"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-[#C5B9DE] truncate",
										children: "Levels 0–100 (101) · 12 VIP Tiers · 6 Super VIP · 10 Badges"
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 shrink-0",
								children: [isAuthorizedAdminEmail(currentUser.email) && onOpenAdminPanel && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => {
										onClose();
										onOpenAdminPanel();
									},
									className: "px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-[#FFC84A] text-[11px] font-black flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Admin" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: onClose,
									"aria-label": "Close Progression Center",
									className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-4 gap-1.5 mt-3.5 bg-[#090414]/80 p-1 rounded-2xl border border-white/[0.08]",
							children: [
								{
									id: "roadmap",
									label: "Lv 0–100",
									icon: TrendingUp
								},
								{
									id: "vip",
									label: "VIP (12)",
									icon: Crown
								},
								{
									id: "super_vip",
									label: "Super VIP (6)",
									icon: Sparkles
								},
								{
									id: "achievements",
									label: "Badges (10)",
									icon: Award
								}
							].map((tab) => {
								const Icon = tab.icon;
								const active = activeTab === tab.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => {
										setActiveTab(tab.id);
										setPreviewFrame(null);
									},
									className: `py-2 px-1.5 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all whitespace-nowrap ${active ? tab.id === "super_vip" ? "bg-gradient-to-r from-[#7C3AED] via-[#FA26A0] to-[#FFC84A] text-white shadow-md" : tab.id === "vip" ? "bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] shadow-md" : "bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow-md" : "text-[#B9AECF] hover:text-white hover:bg-white/[0.05]"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3.5 h-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "truncate",
										children: tab.label
									})]
								}, tab.id);
							})
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto p-4 sm:p-5 space-y-4",
					children: [
						activeTab === "roadmap" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-gradient-to-br from-[#231042] via-[#170B2D] to-[#110820] border border-white/15 space-y-3.5 shadow-xl",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelEmblemBadge, {
												level: progression.currentLevel,
												size: "lg",
												className: "shrink-0"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 flex-wrap",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, {
															level: progression.currentLevel,
															size: "md",
															showTierName: true
														}),
														progression.highestUnlockedVipTier > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
															tier: progression.highestUnlockedVipTier,
															size: "xs"
														}),
														progression.highestUnlockedSuperVipTier > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
															tier: progression.highestUnlockedSuperVipTier,
															size: "xs"
														})
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-[11px] text-[#C5B9DE] mt-1 font-mono tabular-nums",
													children: [
														"Total Spent:",
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-white font-bold",
															children: progression.totalQualifyingCoinsSpent.toLocaleString()
														}),
														" ",
														"/ ",
														1333333333 .toLocaleString(),
														" Coins"
													]
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right shrink-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-2xl font-black font-mono text-[#FFC84A] tabular-nums",
												children: [progression.percentage, "%"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "block text-[10px] uppercase tracking-wider text-[#B9AECF] font-bold",
												children: progression.isMaxMastery ? "LEGEND MASTERY" : `LV.${progression.currentLevel} PROGRESS`
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "h-3 rounded-full bg-black/55 border border-white/10 overflow-hidden p-0.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full rounded-full bg-gradient-to-r from-[#8B20FF] via-[#FA26A0] to-[#FFC84A] transition-all duration-500",
												style: { width: `${Math.max(3, progression.percentage)}%` }
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-[11px] tabular-nums gap-2 flex-wrap",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[#C5B9DE]",
												children: progression.isMaxMastery ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[#FFC84A] font-bold",
													children: [
														"All 100 Levels & ",
														1333333333 .toLocaleString(),
														" Coin Legend Mastery Complete!"
													]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
													"Need",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-white font-mono font-bold",
														children: progression.remainingCoinsNeeded.toLocaleString()
													}),
													" ",
													"more coins for",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[#FFC84A] font-bold",
														children: progression.currentLevel < 100 ? `Level ${progression.currentLevel + 1}` : "Level 100 Mastery"
													})
												] })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-[#FFC84A] font-bold",
												children: [
													progression.coinsInCurrentLevel.toLocaleString(),
													" /",
													" ",
													progression.coinsNeededForNextLevel.toLocaleString()
												]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.08]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "px-3 py-2 rounded-xl bg-black/35 border border-white/[0.06] flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] uppercase tracking-wider text-[#B9AECF] block",
												children: "Next VIP Unlock"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-extrabold text-[#FFC84A]",
												children: nextVipUnlock ? `${nextVipUnlock.code} at Lv.${nextVipUnlock.unlockLevel}` : "All 12 VIP Unlocked"
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-4 h-4 text-[#FFC84A]/80 shrink-0" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "px-3 py-2 rounded-xl bg-black/35 border border-white/[0.06] flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] uppercase tracking-wider text-[#B9AECF] block",
												children: "Next Super VIP"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-extrabold text-[#E879F9]",
												children: nextSuperVipUnlock ? `${nextSuperVipUnlock.code} at Lv.${nextSuperVipUnlock.unlockLevel}` : "All 6 Super VIP Unlocked"
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-[#E879F9]/80 shrink-0" })]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 flex-wrap",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex items-center gap-1.5 flex-wrap",
										children: [
											{
												id: "all",
												label: "All Levels (0–100)"
											},
											{
												id: "completed",
												label: "Completed"
											},
											{
												id: "current",
												label: "Current"
											},
											{
												id: "locked",
												label: "Locked"
											}
										].map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setRoadmapStatusFilter(f.id),
											className: `px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${roadmapStatusFilter === f.id ? "bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white shadow" : "bg-white/[0.05] text-[#B9AECF] hover:text-white"}`,
											children: f.label
										}, f.id))
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] font-mono text-[#B9AECF] flex items-center gap-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-3 h-3 text-[#FFC84A]" }),
											"Lv 1–50: ",
											formatCoinsCompact(2e7),
											" · Lv 51–100: ",
											formatCoinsCompact(1313333333)
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setSelectedTierFilter("all"),
										className: `px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 border transition-all flex items-center gap-1 ${selectedTierFilter === "all" ? "bg-white text-[#090611] border-white" : "bg-white/[0.04] text-[#B9AECF] border-white/10 hover:text-white"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "All 10 Tiers" })]
									}), LEVEL_TIER_CONFIGS.map((tier) => {
										const active = selectedTierFilter === tier.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setSelectedTierFilter(tier.id),
											style: active ? {
												background: tier.gradientCss,
												borderColor: tier.borderHex
											} : void 0,
											className: `px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider shrink-0 border transition-all ${active ? "text-white shadow-md" : "bg-white/[0.04] text-[#C5B9DE] border-white/10 hover:bg-white/[0.08]"}`,
											children: [
												tier.name,
												" (",
												tier.minLevel,
												"–",
												tier.maxLevel,
												")"
											]
										}, tier.id);
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: filteredLevels.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "py-10 text-center rounded-2xl bg-white/[0.03] border border-white/[0.08]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Layers, { className: "w-8 h-8 text-[#B9AECF]/50 mx-auto mb-2" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-bold text-white",
											children: "No levels match this filter"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-[#B9AECF] mt-1",
											children: "Switch back to All Levels (0–100) to explore all 101 level badges."
										})
									]
								}) : filteredLevels.map((lvl) => {
									const isCompleted = lvl.level < progression.currentLevel || progression.isMaxMastery && lvl.level === 100;
									const isCurrent = lvl.level === progression.currentLevel && !isCompleted;
									const isLocked = lvl.level > progression.currentLevel;
									const coinsToReach = Math.max(0, lvl.cumulativeCoins - progression.totalQualifyingCoinsSpent);
									const vipReward = lvl.vipUnlockTier ? VIP_FRAME_DEFINITIONS.find((v) => v.tier === lvl.vipUnlockTier) : void 0;
									const superVipReward = lvl.superVipUnlockTier ? SUPER_VIP_TIER_DEFINITIONS.find((sv) => sv.tier === lvl.superVipUnlockTier) : void 0;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setInspectedLevel(lvl),
										className: `w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isCurrent ? "bg-gradient-to-r from-[#2A114E] via-[#210E3E] to-[#170A2C] border-[#FA26A0] shadow-lg shadow-[#8B20FF]/20" : isCompleted ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-400/50" : "bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.05]"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelEmblemBadge, {
												level: lvl.level,
												size: "md",
												locked: isLocked,
												className: "shrink-0"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 flex-wrap",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-xs font-black text-white",
															children: [
																"Level ",
																lvl.level,
																" · ",
																lvl.title
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: `text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${isCurrent ? "bg-[#FA26A0] text-white" : isCompleted ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-white/10 text-[#B9AECF]"}`,
															children: isCurrent ? "Current" : isCompleted ? "Completed" : "Locked"
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 mt-1 text-[10px] font-mono text-[#C5B9DE] flex-wrap tabular-nums",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Required: ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																className: "text-white",
																children: ["+", lvl.coinsForThisLevel.toLocaleString()]
															})] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-white/25",
																children: "·"
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Target: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
																className: "text-[#FFC84A]",
																children: lvl.cumulativeCoins.toLocaleString()
															})] })
														]
													}),
													(vipReward || superVipReward) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 mt-1.5 flex-wrap",
														children: [vipReward && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-[#FFC84A]/15 border border-[#FFC84A]/40 text-[#FFC84A]",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-2.5 h-2.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																vipReward.code,
																": ",
																vipReward.frameName
															] })]
														}), superVipReward && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-200",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-2.5 h-2.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																superVipReward.code,
																": ",
																superVipReward.name
															] })]
														})]
													})
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-right shrink-0",
											children: isCompleted ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 flex items-center justify-center",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4" })
											}) : isCurrent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-mono font-black text-[#FFC84A] tabular-nums",
												children: [progression.percentage, "%"]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-col items-end",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3.5 h-3.5 text-[#B9AECF]/70 mb-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[9px] font-mono text-[#B9AECF] tabular-nums",
													children: ["+", formatCoinsCompact(coinsToReach)]
												})]
											})
										})]
									}, lvl.level);
								})
							})
						] }),
						activeTab === "vip" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 rounded-2xl bg-gradient-to-br from-[#2B1707] via-[#1B0D2E] to-[#110820] border border-[#FFC84A]/35 flex flex-col sm:flex-row items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarWithFrame, {
								src: currentUser.avatar,
								name: currentUser.name,
								level: progression.currentLevel,
								vipLevel: displayVipTier,
								superVipLevel: displaySuperVipTier,
								activeFrameType: displayFrameType,
								size: "xl",
								showFrame: true,
								showVipBadge: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 text-center sm:text-left space-y-1.5 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-center sm:justify-start gap-2 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
											tier: progression.highestUnlockedVipTier,
											size: "sm"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-bold text-[#C5B9DE]",
											children: [progression.unlockedVipTiers.length, " / 12 VIP Tiers Unlocked"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-base font-black text-white",
										children: previewFrame?.type === "vip" ? `Previewing VIP ${previewFrame.tier} Frame` : progression.activeFrameType === "vip" && progression.equippedVipFrame > 0 ? `Equipped: VIP ${progression.equippedVipFrame} Frame` : progression.activeFrameType === "super_vip" && progression.equippedSuperVipFrame > 0 ? `Super VIP ${progression.equippedSuperVipFrame} Frame Currently Active` : "VIP 1–12 Exclusive Frame Collection"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-[#C5B9DE]",
										children: "VIP unlocks every 8 user levels (Lv 8 → Lv 96). Equipping a VIP frame cleanly replaces any active Super VIP frame with zero overlap."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap",
										children: [previewFrame && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setPreviewFrame(null),
											className: "px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold",
											children: "Exit Preview"
										}), progression.activeFrameType !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleEquipFrame("none", 0),
											disabled: busyKey !== null,
											className: "px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] font-bold",
											children: "Remove Active Frame"
										})]
									})
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
							children: VIP_FRAME_DEFINITIONS.map((vip) => {
								const isUnlocked = progression.unlockedVipTiers.includes(vip.tier);
								const isEquipped = progression.activeFrameType === "vip" && progression.equippedVipFrame === vip.tier;
								const isPreviewing = previewFrame?.type === "vip" && previewFrame.tier === vip.tier;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${isEquipped ? "bg-[#26143E] border-[#FFC84A] shadow-lg shadow-[#FFC84A]/15" : isPreviewing ? "bg-[#201038] border-[#FA26A0]" : isUnlocked ? "bg-white/[0.04] border-white/15" : "bg-white/[0.02] border-white/[0.07] opacity-85"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarWithFrame, {
											src: currentUser.avatar,
											name: currentUser.name,
											vipLevel: vip.tier,
											activeFrameType: "vip",
											size: "md",
											showFrame: true,
											showVipBadge: false
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
														tier: vip.tier,
														size: "xs"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-[10px] font-bold flex items-center gap-1 ${isUnlocked ? "text-emerald-400" : "text-[#B9AECF]"}`,
														children: isUnlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unlocked" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Lv.", vip.unlockLevel] })] })
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
													className: "text-xs font-extrabold text-white mt-1 truncate",
													children: vip.frameName
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] text-[#B9AECF] truncate mt-0.5",
													children: vip.perks[0]
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setPreviewFrame({
												type: "vip",
												tier: vip.tier
											}),
											className: "flex-1 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] text-white text-[11px] font-bold flex items-center justify-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preview" })]
										}), isEquipped ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => handleEquipFrame("none", 0),
											disabled: busyKey !== null,
											className: "flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equipped" })]
										}) : isUnlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleEquipFrame("vip", vip.tier),
											disabled: busyKey !== null,
											className: "flex-1 py-2 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611] text-[11px] font-black hover:opacity-95 active:scale-95 transition-all",
											children: busyKey === `vip_${vip.tier}` ? "Equipping..." : "Equip"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											disabled: true,
											className: "flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#B9AECF] text-[11px] font-bold flex items-center justify-center gap-1 cursor-not-allowed",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Reach Lv.", vip.unlockLevel] })]
										})]
									})]
								}, vip.tier);
							})
						})] }),
						activeTab === "super_vip" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 rounded-2xl bg-gradient-to-br from-[#2B0C4E] via-[#1B0936] to-[#110622] border border-fuchsia-400/40 flex flex-col sm:flex-row items-center gap-4 shadow-xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarWithFrame, {
								src: currentUser.avatar,
								name: currentUser.name,
								level: progression.currentLevel,
								vipLevel: displayVipTier,
								superVipLevel: displaySuperVipTier,
								activeFrameType: displayFrameType,
								size: "xl",
								showFrame: true,
								showVipBadge: true
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex-1 text-center sm:text-left space-y-1.5 min-w-0",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-center sm:justify-start gap-2 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-[#7C3AED] via-[#FA26A0] to-[#FFC84A] text-white text-[10px] font-black uppercase tracking-wider",
											children: "SUPER VIP COLLECTION"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-bold text-fuchsia-200",
											children: [progression.unlockedSuperVipTiers.length, " / 6 Unlocked"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-base font-black text-white",
										children: previewFrame?.type === "super_vip" ? `Previewing Super VIP ${previewFrame.tier}` : progression.activeFrameType === "super_vip" && progression.equippedSuperVipFrame > 0 ? `Active: Super VIP ${progression.equippedSuperVipFrame} Frame` : "Ultra-Premium Animated Super VIP Frames"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-[#D7CEEB]",
										children: "Separate from normal VIP. Unlocks every 12 levels (Lv 12, 24, 36, 48, 60, 72) — Super VIP 6 remains the pinnacle through Level 100."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-center sm:justify-start gap-2 pt-1 flex-wrap",
										children: [previewFrame && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setPreviewFrame(null),
											className: "px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold",
											children: "Exit Preview"
										}), progression.activeFrameType !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleEquipFrame("none", 0),
											disabled: busyKey !== null,
											className: "px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-rose-200 text-[11px] font-bold",
											children: "Unequip Frame"
										})]
									})
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3.5",
							children: SUPER_VIP_TIER_DEFINITIONS.map((sv) => {
								const isUnlocked = progression.unlockedSuperVipTiers.includes(sv.tier);
								const isEquipped = progression.activeFrameType === "super_vip" && progression.equippedSuperVipFrame === sv.tier;
								const isPreviewing = previewFrame?.type === "super_vip" && previewFrame.tier === sv.tier;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${isEquipped ? "bg-gradient-to-br from-[#2B124C] to-[#17092B] border-[#FFC84A] shadow-xl shadow-fuchsia-500/20" : isPreviewing ? "bg-[#210D3F] border-fuchsia-400" : isUnlocked ? "bg-white/[0.04] border-white/15" : "bg-white/[0.02] border-white/[0.08] opacity-85"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-3.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AvatarWithFrame, {
											src: currentUser.avatar,
											name: currentUser.name,
											superVipLevel: sv.tier,
											activeFrameType: "super_vip",
											size: "lg",
											showFrame: true,
											showVipBadge: false
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0 flex-1 space-y-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
														tier: sv.tier,
														size: "xs"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-[10px] font-bold flex items-center gap-1 ${isUnlocked ? "text-emerald-400" : "text-[#B9AECF]"}`,
														children: isUnlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Unlocked" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Lv.", sv.unlockLevel] })] })
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
													className: "text-sm font-black text-white truncate",
													children: sv.name
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] text-[#C5B9DE] leading-snug",
													children: sv.perks[0]
												}),
												sv.tier === 6 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#FFC84A]/20 text-[#FFC84A]",
													children: "Supreme Tier · Lv 72–100"
												})
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => setPreviewFrame({
												type: "super_vip",
												tier: sv.tier
											}),
											className: "flex-1 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] font-bold flex items-center justify-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preview" })]
										}), isEquipped ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => handleEquipFrame("none", 0),
											disabled: busyKey !== null,
											className: "flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold flex items-center justify-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equipped" })]
										}) : isUnlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handleEquipFrame("super_vip", sv.tier),
											disabled: busyKey !== null,
											style: { background: sv.gradientCss },
											className: "flex-1 py-2 rounded-xl text-white text-[11px] font-black shadow-md hover:opacity-95 active:scale-95 transition-all",
											children: busyKey === `super_vip_${sv.tier}` ? "Equipping..." : "Equip Frame"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											disabled: true,
											className: "flex-1 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-[#B9AECF] text-[11px] font-bold flex items-center justify-center gap-1 cursor-not-allowed",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Unlock at Lv.", sv.unlockLevel] })]
										})]
									})]
								}, sv.tier);
							})
						})] }),
						activeTab === "achievements" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-4 rounded-2xl bg-[#180C2F] border border-white/10 flex items-center justify-between gap-3 flex-wrap",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-sm font-black text-white flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Award, { className: "w-4 h-4 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Achievement Badge Vault" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-[#C5B9DE] mt-0.5 tabular-nums",
								children: [
									"Independent from Level & VIP · ",
									earnedAchievementsCount,
									"/",
									achievementBadges.length,
									" earned ·",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[#FFC84A] font-bold",
										children: [equippedAchievementsCount, "/3 equipped on profile"]
									})
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1.5",
								children: [
									{
										id: "all",
										label: `All (${achievementBadges.length})`
									},
									{
										id: "earned",
										label: `Earned (${earnedAchievementsCount})`
									},
									{
										id: "locked",
										label: `Locked (${achievementBadges.length - earnedAchievementsCount})`
									}
								].map((tab) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setBadgeFilter(tab.id),
									className: `px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${badgeFilter === tab.id ? "bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white" : "bg-white/[0.06] text-[#B9AECF] hover:text-white"}`,
									children: tab.label
								}, tab.id))
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2.5",
							children: visibleAchievements.map((badge) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `p-3.5 rounded-2xl border transition-all ${badge.isEquipped ? "bg-[#241143] border-[#FA26A0]/60 shadow-lg shadow-[#8B20FF]/15" : badge.isEarned ? "bg-white/[0.04] border-white/15" : "bg-white/[0.02] border-white/[0.07] opacity-85"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-start gap-3.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AchievementBadgeEmblem, {
										shape: badge.shape,
										iconKey: badge.iconKey,
										accentFrom: badge.accentFrom,
										accentTo: badge.accentTo,
										borderHex: badge.borderHex,
										isEarned: badge.isEarned,
										size: "md"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-2 min-w-0 flex-wrap",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
														className: "text-sm font-extrabold text-white",
														children: badge.name
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 text-[#D7CEEB]",
														children: badge.rarity
													})]
												}), badge.isEarned ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => handleToggleAchievementEquip(badge),
													disabled: busyKey === `ach_${badge.id}`,
													className: `px-3 py-1.5 rounded-xl text-[11px] font-extrabold shrink-0 flex items-center gap-1 transition-all ${badge.isEquipped ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 hover:bg-emerald-500/30" : "bg-white/10 hover:bg-white/20 text-white"}`,
													children: badge.isEquipped ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equipped" })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Equip" })
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] font-bold text-[#B9AECF] flex items-center gap-1 shrink-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Locked" })]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs text-[#C5B9DE] mt-1 leading-relaxed",
												children: badge.description
											}),
											badge.isEarned ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 mt-2 text-[10px] text-emerald-300 font-semibold",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Earned",
													" ",
													badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : "Verified on Lenzo Party"
												] })]
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-2.5 space-y-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center justify-between text-[10px] text-[#B9AECF] gap-2",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "truncate",
														children: badge.unlockConditionText
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono text-white/85 shrink-0 tabular-nums",
														children: [
															badge.progressCurrent.toLocaleString(),
															" / ",
															badge.progressTarget.toLocaleString()
														]
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "h-1.5 rounded-full bg-white/10 overflow-hidden",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "h-full rounded-full bg-gradient-to-r from-[#8B20FF] to-[#FA26A0]",
														style: { width: `${Math.max(4, badge.progressPercent)}%` }
													})
												})]
											})
										]
									})]
								})
							}, badge.id))
						})] })
					]
				}),
				inspectedLevel && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm",
					onClick: () => setInspectedLevel(null),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-sm bg-[#160B2A] border border-white/15 rounded-3xl p-5 space-y-4 shadow-2xl",
						onClick: (e) => e.stopPropagation(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, {
									level: inspectedLevel.level,
									size: "lg",
									showTierName: true
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setInspectedLevel(null),
									className: "w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col items-center justify-center py-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelEmblemBadge, {
									level: inspectedLevel.level,
									size: "showcase",
									showSubLabel: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-black/40 border border-white/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: [
											"Level ",
											inspectedLevel.level,
											" Required"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-black font-mono text-white tabular-nums",
										children: inspectedLevel.coinsForThisLevel.toLocaleString()
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-black/40 border border-white/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#B9AECF] block",
										children: "Total Coins Threshold"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-black font-mono text-[#FFC84A] tabular-nums",
										children: inspectedLevel.cumulativeCoins.toLocaleString()
									})]
								})]
							}),
							inspectedLevel.level > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between text-[11px] font-mono tabular-nums",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[#B9AECF]",
									children: [
										"Range: ",
										inspectedLevel.cumulativeStart.toLocaleString(),
										" → ",
										inspectedLevel.cumulativeCoins.toLocaleString()
									]
								}), inspectedLevel.cumulativeCoins > progression.totalQualifyingCoinsSpent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[#FFC84A] font-bold",
									children: ["Need ", (inspectedLevel.cumulativeCoins - progression.totalQualifyingCoinsSpent).toLocaleString()]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-emerald-400 font-bold",
									children: "Unlocked"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] font-black uppercase tracking-wider text-[#B9AECF]",
									children: "Unlocked Privileges & Milestones"
								}), inspectedLevel.perks.map((perk, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 text-xs text-white/95 bg-white/[0.04] px-3 py-2 rounded-xl border border-white/[0.07]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-[#FFC84A] shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: perk })]
								}, idx))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setInspectedLevel(null),
								className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-[#8B20FF] to-[#FA26A0] text-white text-xs font-extrabold",
								children: "Close Level Details"
							})
						]
					})
				})
			]
		})
	});
};
export { LevelAndVIPModal };
