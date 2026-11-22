import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Bt as DollarSign, Cn as require_react, E as Smartphone, G as Plus, Gt as Copy, J as Phone, Jt as Clock, L as Search, M as ShieldCheck, O as SlidersVertical, Qt as CircleAlert, S as Store, Sn as ArrowDownLeft, Xt as CircleCheck, Z as PenLine, a as Wallet, bn as ArrowRightLeft, en as ChevronRight, hn as BadgeCheck, ln as Building2, ot as MessageCircle, qt as Coins, r as X, rn as Check, st as MapPin, ut as Lock, v as Trash2, vn as ArrowUpRight, w as Sparkles, xn as ArrowLeft, xt as History } from "./vendor-icons-8ivBScnZ.js";
import { A as adminAdjustBalance, B as subscribeUserEarnings, D as DEFAULT_COIN_PACKAGES, F as saveCoinSellerAgency, H as subscribeWalletSettings, I as subscribeAllWithdrawalRequests, L as subscribeCoinPackages, M as convertEarningsToWallet, N as deleteCoinSellerAgency, O as DEFAULT_PAYOUT_METHODS, P as requestWithdrawal, R as subscribeCoinSellerAgencies, U as updateWalletSettings, V as subscribeUserWallet, _ as subscribeActiveAgencies, j as adminUpdateWithdrawalStatus, k as DEFAULT_WALLET_SETTINGS, z as subscribeTransactions } from "./index-BNHhc6LD.js";
import { r as auth } from "./firebase-zc-_OxQs.js";
import { i as require_jsx_runtime } from "./vendor-motion-DFP_D_jg.js";
// src/components/screens/WalletModal.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
function sanitizePhoneDigits(raw) {
	return (raw || "").replace(/[^0-9]/g, "");
}
function buildSafeWhatsAppUrl(phone, message) {
	const digits = sanitizePhoneDigits(phone);
	if (!digits) return "#";
	return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
function buildSafeTelUrl(phone) {
	const digits = sanitizePhoneDigits(phone);
	if (!digits) return "#";
	return `tel:+${digits}`;
}
var WalletModal = ({ isOpen, onClose, currentUser, onRechargeSuccess, initialTab = "wallet", onSendMessage }) => {
	const [activeMainTab, setActiveMainTab] = (0, import_react.useState)(initialTab);
	const [settings, setSettings] = (0, import_react.useState)(DEFAULT_WALLET_SETTINGS);
	const [coinPackages, setCoinPackages] = (0, import_react.useState)(DEFAULT_COIN_PACKAGES);
	const [coinSellerAgencies, setCoinSellerAgencies] = (0, import_react.useState)([]);
	const [approvedDualCoinSellers, setApprovedDualCoinSellers] = (0, import_react.useState)([]);
	const [comingSoonPkg, setComingSoonPkg] = (0, import_react.useState)(null);
	const [isAgencyDirectoryOpen, setIsAgencyDirectoryOpen] = (0, import_react.useState)(false);
	const [selectedInquiryPkg, setSelectedInquiryPkg] = (0, import_react.useState)(null);
	const [agencySearchQuery, setAgencySearchQuery] = (0, import_react.useState)("");
	const [selectedAgencyCity, setSelectedAgencyCity] = (0, import_react.useState)("ALL");
	const [copiedIdFlag, setCopiedIdFlag] = (0, import_react.useState)(false);
	const [walletData, setWalletData] = (0, import_react.useState)({
		userId: currentUser.id,
		walletPurchasedCoins: currentUser.coins || 0,
		totalCoinsPurchased: currentUser.coins || 0,
		totalCoinsSpent: 0,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	const [earningsData, setEarningsData] = (0, import_react.useState)({
		userId: currentUser.id,
		availableEarningsCoins: currentUser.diamonds || 0,
		pendingWithdrawalCoins: 0,
		totalWithdrawnCoins: 0,
		grossGiftCoinsReceived: 0,
		totalCommissionDeducted: 0,
		totalConvertedToWallet: 0,
		totalGiftsCount: 0,
		updatedAt: (/* @__PURE__ */ new Date()).toISOString()
	});
	const [walletTransactions, setWalletTransactions] = (0, import_react.useState)([]);
	const [earningsTransactions, setEarningsTransactions] = (0, import_react.useState)([]);
	const [selectedTxFilter, setSelectedTxFilter] = (0, import_react.useState)("all");
	const [isConvertModalOpen, setIsConvertModalOpen] = (0, import_react.useState)(false);
	const [convertCoinsInput, setConvertCoinsInput] = (0, import_react.useState)("1000");
	const [isConverting, setIsConverting] = (0, import_react.useState)(false);
	const [isWithdrawModalOpen, setIsWithdrawModalOpen] = (0, import_react.useState)(false);
	const [withdrawCoinsInput, setWithdrawCoinsInput] = (0, import_react.useState)("5000");
	const [selectedPayoutMethod, setSelectedPayoutMethod] = (0, import_react.useState)("bank_transfer");
	const [accountTitle, setAccountTitle] = (0, import_react.useState)(currentUser.name || "");
	const [accountNumber, setAccountNumber] = (0, import_react.useState)("");
	const [bankOrProviderName, setBankOrProviderName] = (0, import_react.useState)("Meezan Bank");
	const [phoneNumber, setPhoneNumber] = (0, import_react.useState)("");
	const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = (0, import_react.useState)(false);
	const [isAdminPanelOpen, setIsAdminPanelOpen] = (0, import_react.useState)(false);
	const [adminRequests, setAdminRequests] = (0, import_react.useState)([]);
	const [adminCommissionInput, setAdminCommissionInput] = (0, import_react.useState)(settings.commissionRatePercent);
	const [adminExchangeRateInput, setAdminExchangeRateInput] = (0, import_react.useState)(settings.exchangeRatePkrPerCoin);
	const [adminMinWithdrawInput, setAdminMinWithdrawInput] = (0, import_react.useState)(settings.minWithdrawalCoins);
	const [adminMaxWithdrawInput, setAdminMaxWithdrawInput] = (0, import_react.useState)(settings.maxWithdrawalCoins);
	const [adminSelectedReq, setAdminSelectedReq] = (0, import_react.useState)(null);
	const [adminRemarksInput, setAdminRemarksInput] = (0, import_react.useState)("");
	const [adminRefInput, setAdminRefInput] = (0, import_react.useState)("");
	const [editingAgencyId, setEditingAgencyId] = (0, import_react.useState)(null);
	const [agencyFormName, setAgencyFormName] = (0, import_react.useState)("");
	const [agencyFormOwner, setAgencyFormOwner] = (0, import_react.useState)("");
	const [agencyFormCode, setAgencyFormCode] = (0, import_react.useState)("");
	const [agencyFormCity, setAgencyFormCity] = (0, import_react.useState)("");
	const [agencyFormCountry, setAgencyFormCountry] = (0, import_react.useState)("Pakistan");
	const [agencyFormWhatsapp, setAgencyFormWhatsapp] = (0, import_react.useState)("");
	const [agencyFormPhone, setAgencyFormPhone] = (0, import_react.useState)("");
	const [agencyFormPayments, setAgencyFormPayments] = (0, import_react.useState)("JazzCash, EasyPaisa, Bank Transfer, Cash");
	const [agencyFormHours, setAgencyFormHours] = (0, import_react.useState)("24/7 Instant Delivery");
	const [agencyFormRateNote, setAgencyFormRateNote] = (0, import_react.useState)("Official Rate • Instant Top-Up");
	const [agencyFormBadge, setAgencyFormBadge] = (0, import_react.useState)("VERIFIED");
	const [agencyFormOnline, setAgencyFormOnline] = (0, import_react.useState)(true);
	const [agencyFormEnabled, setAgencyFormEnabled] = (0, import_react.useState)(true);
	const [isSavingAgency, setIsSavingAgency] = (0, import_react.useState)(false);
	const [creditTargetUid, setCreditTargetUid] = (0, import_react.useState)("");
	const [creditCoinsAmount, setCreditCoinsAmount] = (0, import_react.useState)("");
	const [creditReasonNote, setCreditReasonNote] = (0, import_react.useState)("Offline Coin Seller Agency Order");
	const [isCreditingCoins, setIsCreditingCoins] = (0, import_react.useState)(false);
	const [toastMessage, setToastMessage] = (0, import_react.useState)(null);
	const [errorMessage, setErrorMessage] = (0, import_react.useState)(null);
	const showToast = (msg) => {
		setToastMessage(msg);
		setTimeout(() => setToastMessage(null), 3500);
	};
	const showError = (msg) => {
		setErrorMessage(msg);
		setTimeout(() => setErrorMessage(null), 4e3);
	};
	const isAdminUser = auth.currentUser?.email?.toLowerCase() === "yaquoobe@gmail.com" && auth.currentUser?.emailVerified === true;
	(0, import_react.useEffect)(() => {
		if (!isOpen) return;
		const unsubSettings = subscribeWalletSettings((s) => {
			setSettings(s);
			setAdminCommissionInput(s.commissionRatePercent);
			setAdminExchangeRateInput(s.exchangeRatePkrPerCoin);
			setAdminMinWithdrawInput(s.minWithdrawalCoins);
			setAdminMaxWithdrawInput(s.maxWithdrawalCoins);
		});
		const unsubPackages = subscribeCoinPackages((p) => setCoinPackages(p));
		const unsubAgencies = subscribeCoinSellerAgencies(isAdminUser, (a) => setCoinSellerAgencies(a));
		const unsubApprovedDual = subscribeActiveAgencies("coin_seller", (list) => setApprovedDualCoinSellers(list));
		const unsubWallet = subscribeUserWallet(currentUser.id, (w) => setWalletData(w));
		const unsubEarnings = subscribeUserEarnings(currentUser.id, (e) => setEarningsData(e));
		const unsubWalletTx = subscribeTransactions(currentUser.id, "wallet", (txs) => setWalletTransactions(txs));
		const unsubEarningsTx = subscribeTransactions(currentUser.id, "earnings", (txs) => setEarningsTransactions(txs));
		const unsubAllReqs = isAdminUser ? subscribeAllWithdrawalRequests((reqs) => setAdminRequests(reqs)) : () => {};
		return () => {
			unsubSettings();
			unsubPackages();
			unsubAgencies();
			unsubApprovedDual();
			unsubWallet();
			unsubEarnings();
			unsubWalletTx();
			unsubEarningsTx();
			unsubAllReqs();
		};
	}, [
		isOpen,
		currentUser.id,
		isAdminUser
	]);
	const activeAgencies = (0, import_react.useMemo)(() => {
		const mappedDual = approvedDualCoinSellers.map((a) => ({
			id: a.id,
			name: a.name,
			ownerName: a.ownerName,
			agencyCode: a.agencyCode,
			city: "Official Seller",
			country: "Verified",
			whatsapp: a.whatsappNumber,
			phone: a.whatsappNumber,
			paymentMethods: [
				"JazzCash",
				"EasyPaisa",
				"Bank Transfer"
			],
			workingHours: a.isOnline ? "Online Now • Instant Transfer" : "Contact via WhatsApp",
			minCoinsOrder: 500,
			rateNote: a.description || "Verified Coin Seller Agency",
			badge: "VERIFIED SELLER",
			isVerified: a.isVerified,
			isOnline: a.isOnline,
			enabled: a.status === "active"
		}));
		const existingIds = new Set(mappedDual.map((m) => m.id));
		return [...mappedDual, ...coinSellerAgencies.filter((a) => a.enabled && !existingIds.has(a.id))];
	}, [approvedDualCoinSellers, coinSellerAgencies]);
	const agencyCities = (0, import_react.useMemo)(() => {
		return ["ALL", ...Array.from(new Set(activeAgencies.map((a) => a.city).filter(Boolean)))];
	}, [activeAgencies]);
	const filteredAgencies = (0, import_react.useMemo)(() => {
		const q = agencySearchQuery.trim().toLowerCase();
		return activeAgencies.filter((agency) => {
			if (selectedAgencyCity !== "ALL" && agency.city !== selectedAgencyCity) return false;
			if (!q) return true;
			return agency.name.toLowerCase().includes(q) || agency.city.toLowerCase().includes(q) || agency.country.toLowerCase().includes(q) || agency.agencyCode.toLowerCase().includes(q) || agency.ownerName.toLowerCase().includes(q) || agency.paymentMethods.some((pm) => pm.toLowerCase().includes(q));
		});
	}, [
		activeAgencies,
		agencySearchQuery,
		selectedAgencyCity
	]);
	if (!isOpen) return null;
	const userDisplayId = currentUser.displayId || currentUser.id;
	const handleCopyText = async (text, label) => {
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
			showToast(`${label} copied: ${text}`);
		} catch {
			showToast(`${label}: ${text}`);
		}
	};
	const handleCopyMyId = async () => {
		await handleCopyText(userDisplayId, "Lenzo ID");
		setCopiedIdFlag(true);
		setTimeout(() => setCopiedIdFlag(false), 2e3);
	};
	const handleSelectPackageComingSoon = (pkg) => {
		setComingSoonPkg(pkg);
	};
	const handleOpenOfflineAgencies = (pkgForInquiry) => {
		setComingSoonPkg(null);
		if (pkgForInquiry) setSelectedInquiryPkg(pkgForInquiry);
		setIsAgencyDirectoryOpen(true);
	};
	const resetAgencyForm = () => {
		setEditingAgencyId(null);
		setAgencyFormName("");
		setAgencyFormOwner("");
		setAgencyFormCode("");
		setAgencyFormCity("");
		setAgencyFormCountry("Pakistan");
		setAgencyFormWhatsapp("");
		setAgencyFormPhone("");
		setAgencyFormPayments("JazzCash, EasyPaisa, Bank Transfer, Cash");
		setAgencyFormHours("24/7 Instant Delivery");
		setAgencyFormRateNote("Official Rate • Instant Top-Up");
		setAgencyFormBadge("VERIFIED");
		setAgencyFormOnline(true);
		setAgencyFormEnabled(true);
	};
	const handleEditAgency = (agency) => {
		setEditingAgencyId(agency.id);
		setAgencyFormName(agency.name);
		setAgencyFormOwner(agency.ownerName);
		setAgencyFormCode(agency.agencyCode);
		setAgencyFormCity(agency.city);
		setAgencyFormCountry(agency.country);
		setAgencyFormWhatsapp(agency.whatsapp);
		setAgencyFormPhone(agency.phone);
		setAgencyFormPayments(agency.paymentMethods.join(", "));
		setAgencyFormHours(agency.workingHours);
		setAgencyFormRateNote(agency.rateNote || "");
		setAgencyFormBadge(agency.badge || "VERIFIED");
		setAgencyFormOnline(agency.isOnline);
		setAgencyFormEnabled(agency.enabled);
	};
	const handleSaveAgency = async () => {
		if (!agencyFormName.trim() || !agencyFormCity.trim() || !agencyFormWhatsapp.trim()) {
			showError("Please enter Agency Name, City, and WhatsApp Number");
			return;
		}
		setIsSavingAgency(true);
		const id = editingAgencyId || `agency_${Date.now()}`;
		const methods = agencyFormPayments.split(",").map((s) => s.trim()).filter(Boolean);
		const res = await saveCoinSellerAgency({
			id,
			name: agencyFormName.trim(),
			ownerName: agencyFormOwner.trim() || agencyFormName.trim(),
			agencyCode: agencyFormCode.trim() || `LP-COIN-${Math.floor(10 + Math.random() * 89)}`,
			city: agencyFormCity.trim(),
			country: agencyFormCountry.trim() || "Pakistan",
			whatsapp: agencyFormWhatsapp.trim(),
			phone: agencyFormPhone.trim() || agencyFormWhatsapp.trim(),
			paymentMethods: methods.length > 0 ? methods : [
				"JazzCash",
				"EasyPaisa",
				"Bank Transfer"
			],
			workingHours: agencyFormHours.trim() || "24/7 Support",
			minCoinsOrder: 1e3,
			rateNote: agencyFormRateNote.trim() || "Official Rate • Instant Top-Up",
			badge: agencyFormBadge.trim() || "VERIFIED",
			isVerified: true,
			isOnline: agencyFormOnline,
			enabled: agencyFormEnabled
		});
		setIsSavingAgency(false);
		if (res.success) {
			showToast(editingAgencyId ? "Coin Seller Agency updated!" : "New Official Coin Seller Agency added!");
			resetAgencyForm();
		} else showError(res.error || "Failed to save Coin Seller Agency");
	};
	const handleToggleAgencyOnline = async (agency) => {
		const res = await saveCoinSellerAgency({
			...agency,
			isOnline: !agency.isOnline
		});
		if (res.success) showToast(`${agency.name} marked ${!agency.isOnline ? "ONLINE" : "OFFLINE"}`);
		else showError(res.error || "Failed to update status");
	};
	const handleToggleAgencyEnabled = async (agency) => {
		const res = await saveCoinSellerAgency({
			...agency,
			enabled: !agency.enabled
		});
		if (res.success) showToast(`${agency.name} ${!agency.enabled ? "enabled" : "hidden from list"}`);
		else showError(res.error || "Failed to update visibility");
	};
	const handleDeleteAgency = async (agency) => {
		const res = await deleteCoinSellerAgency(agency.id);
		if (res.success) {
			showToast(`Removed ${agency.name}`);
			if (editingAgencyId === agency.id) resetAgencyForm();
		} else showError(res.error || "Failed to remove agency");
	};
	const handleAdminCreditUserCoins = async () => {
		const uid = creditTargetUid.trim();
		const amount = parseInt(creditCoinsAmount, 10);
		if (!uid) {
			showError("Please enter target user Firebase UID");
			return;
		}
		if (isNaN(amount) || amount === 0) {
			showError("Please enter a valid non-zero coin amount");
			return;
		}
		setIsCreditingCoins(true);
		const res = await adminAdjustBalance(uid, "wallet", amount, creditReasonNote.trim() || "Offline Coin Seller Agency Top-Up", auth.currentUser?.email || "admin");
		setIsCreditingCoins(false);
		if (res.success) {
			showToast(`${amount > 0 ? "+" : ""}${amount.toLocaleString()} coins applied to ${uid.slice(0, 10)}...`);
			setCreditTargetUid("");
			setCreditCoinsAmount("");
		} else showError(res.error || "Failed to adjust user wallet coins");
	};
	const handleConvertEarnings = async () => {
		const num = parseInt(convertCoinsInput, 10);
		if (isNaN(num) || num <= 0) {
			showError("Please enter a valid number of Diamonds to exchange");
			return;
		}
		if (num > earningsData.availableEarningsCoins) {
			showError(`Cannot exchange more than available Diamonds (💎 ${earningsData.availableEarningsCoins.toLocaleString()})`);
			return;
		}
		setIsConverting(true);
		const res = await convertEarningsToWallet(currentUser.id, num, settings);
		setIsConverting(false);
		if (res.success) {
			setIsConvertModalOpen(false);
			showToast(`Exchanged 💎 ${num.toLocaleString()} Diamonds into 🪙 ${res.walletCoinsReceived.toLocaleString()} Gifting Wallet Coins!`);
			if (onRechargeSuccess) onRechargeSuccess(res.walletCoinsReceived);
		} else showError(res.error || "Exchange failed");
	};
	const handleSubmitWithdrawal = async () => {
		const num = parseInt(withdrawCoinsInput, 10);
		if (isNaN(num) || num < settings.minWithdrawalCoins) {
			showError(`Minimum withdrawal is 💎 ${settings.minWithdrawalCoins.toLocaleString()} Diamonds (PKR ${(settings.minWithdrawalCoins * settings.exchangeRatePkrPerCoin).toLocaleString()})`);
			return;
		}
		if (num > settings.maxWithdrawalCoins) {
			showError(`Maximum withdrawal is 💎 ${settings.maxWithdrawalCoins.toLocaleString()} Diamonds per request`);
			return;
		}
		if (num > earningsData.availableEarningsCoins) {
			showError(`Insufficient available Diamonds (💎 ${earningsData.availableEarningsCoins.toLocaleString()} available)`);
			return;
		}
		const resolvedProvider = selectedPayoutMethod === "easypaisa" ? "EasyPaisa" : selectedPayoutMethod === "jazzcash" ? "JazzCash" : bankOrProviderName.trim();
		if (!accountTitle.trim() || !accountNumber.trim() || !resolvedProvider) {
			showError(selectedPayoutMethod === "bank_transfer" ? "Please enter Account Title, Bank Name, and Account / IBAN Number" : `Please enter Account Title and 11-digit ${resolvedProvider} mobile number`);
			return;
		}
		setIsSubmittingWithdrawal(true);
		const res = await requestWithdrawal(currentUser.id, currentUser.name, num, selectedPayoutMethod, {
			accountTitle: accountTitle.trim(),
			accountNumber: accountNumber.trim(),
			bankOrProviderName: resolvedProvider,
			phoneNumber: phoneNumber.trim() || (selectedPayoutMethod !== "bank_transfer" ? accountNumber.trim() : "")
		}, settings);
		setIsSubmittingWithdrawal(false);
		if (res.success) {
			setIsWithdrawModalOpen(false);
			showToast(`Diamond withdrawal #${res.requestId.slice(-6).toUpperCase()} submitted via ${resolvedProvider}! Net PKR ${res.finalPayablePkr.toLocaleString()}.`);
		} else showError(res.error || "Withdrawal submission failed");
	};
	const handleAdminStatusChange = async (req, status) => {
		const res = await adminUpdateWithdrawalStatus(req, status, adminRemarksInput, adminRefInput);
		if (res.success) {
			showToast(`Request #${req.id.slice(-6).toUpperCase()} updated to ${status.toUpperCase()}!`);
			setAdminSelectedReq(null);
			setAdminRemarksInput("");
			setAdminRefInput("");
		} else showError(res.error || "Status update failed");
	};
	const handleSaveAdminSettings = async () => {
		await updateWalletSettings({
			commissionRatePercent: adminCommissionInput,
			exchangeRatePkrPerCoin: adminExchangeRateInput,
			minWithdrawalCoins: adminMinWithdrawInput,
			maxWithdrawalCoins: adminMaxWithdrawInput
		});
		showToast("Admin wallet settings saved successfully!");
	};
	const convertCoinsNum = parseInt(convertCoinsInput || "0", 10);
	const willReceiveWalletCoins = Math.round(convertCoinsNum * settings.earningsToWalletConversionRate);
	const withdrawCoinsNum = parseInt(withdrawCoinsInput || "0", 10);
	const withdrawGrossPkr = Math.round(withdrawCoinsNum * settings.exchangeRatePkrPerCoin);
	const withdrawFeePkr = Math.round(withdrawGrossPkr * (settings.withdrawalFeePercent / 100));
	const withdrawNetPkr = Math.max(0, withdrawGrossPkr - withdrawFeePkr);
	const filteredTxs = (activeMainTab === "wallet" ? walletTransactions : earningsTransactions).filter((tx) => {
		if (selectedTxFilter === "all") return true;
		return tx.category === selectedTxFilter;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-center justify-center px-2 sm:px-4 bg-black/85 backdrop-blur-md animate-fade-in select-none",
		style: {
			paddingTop: "max(0.75rem, var(--app-safe-top))",
			paddingBottom: "max(0.75rem, var(--app-safe-bottom))"
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-2xl bg-[#0e071c] border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-full",
			onClick: (e) => e.stopPropagation(),
			children: [
				toastMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/95 text-white text-xs font-bold py-2 px-5 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-400 animate-bounce",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: toastMessage })]
				}),
				errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600/95 text-white text-xs font-bold py-2 px-5 rounded-2xl shadow-xl flex items-center gap-2 border border-rose-400",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: errorMessage })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-4 sm:p-5 pb-3 border-b border-white/[0.08] flex items-center justify-between bg-[#150a26]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white flex items-center justify-center shadow-md",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "w-5 h-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-lg font-black text-white tracking-wide",
								children: "WALLET"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] px-2 py-0.5 rounded-full font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30",
								children: "Verified Currency"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-[#A59AB8]",
							children: "Coins Buying/Gifting Wallet & Diamonds Earnings Wallet"
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [isAdminUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setIsAdminPanelOpen(!isAdminPanelOpen),
							className: "px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#FFC84A] text-xs font-bold flex items-center gap-1.5 transition-colors",
							title: "Admin Financial Controls & Withdrawal Approvals",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersVertical, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: "Admin Panel"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors",
							"aria-label": "Close",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 p-2 bg-[#120822] border-b border-white/[0.06] gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setActiveMainTab("wallet");
							setSelectedTxFilter("all");
						},
						className: `flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${activeMainTab === "wallet" ? "bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-600/20 border border-amber-400/50 text-[#FFC84A] shadow-[0_4px_16px_rgba(255,200,74,0.2)]" : "text-[#A59AB8] hover:text-white hover:bg-white/5 border border-transparent"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-base",
								children: "🪙"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WALLET (COINS)" }),
							activeMainTab === "wallet" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-[#FFC84A] animate-pulse" })
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setActiveMainTab("earnings");
							setSelectedTxFilter("all");
						},
						className: `flex items-center justify-center gap-2 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all ${activeMainTab === "earnings" ? "bg-gradient-to-r from-cyan-500/25 via-[#8B20FF]/25 to-[#F328D5]/25 border border-cyan-400/50 text-cyan-200 shadow-[0_4px_16px_rgba(34,211,238,0.2)]" : "text-[#A59AB8] hover:text-white hover:bg-white/5 border border-transparent"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-base",
								children: "💎"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "EARNINGS (DIAMONDS)" }),
							activeMainTab === "earnings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-cyan-300 animate-pulse" })
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex-1 overflow-y-auto no-scrollbar p-4 sm:p-5 space-y-5",
					children: [activeMainTab === "wallet" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative p-5 rounded-3xl bg-gradient-to-br from-[#2a1745] via-[#1b0d2f] to-[#120822] border border-amber-400/30 shadow-xl overflow-hidden",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between mb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs font-bold text-[#d2c5e6] flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🪙" }), " Available Purchased Coins"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-amber-300 font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30",
											children: "Non-Withdrawable"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-baseline justify-between flex-wrap gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-3xl sm:text-4xl font-black text-[#FFC84A] font-mono tracking-tight",
												children: walletData.walletPurchasedCoins.toLocaleString()
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-[#A59AB8] font-bold",
												children: "Coins"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-sm font-extrabold text-emerald-400 font-mono",
												children: ["≈ PKR ", (walletData.walletPurchasedCoins * settings.exchangeRatePkrPerCoin).toLocaleString()]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-[#A59AB8]",
												children: ["Exchange: 1 Coin = PKR ", settings.exchangeRatePkrPerCoin]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#A59AB8] block",
											children: "Total Purchased"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-white font-mono",
											children: ["🪙 ", walletData.totalCoinsPurchased.toLocaleString()]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#A59AB8] block",
											children: "Total Spent on Gifts"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-rose-300 font-mono",
											children: ["🪙 ", walletData.totalCoinsSpent.toLocaleString()]
										})] })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200/90 leading-tight flex items-start gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Purchased coins can only be used for sending gifts to hosts, party rooms, and PK battles. They cannot be withdrawn as cash." })]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
											className: "text-sm font-black text-white flex items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4 text-[#FFC84A]" }),
												"Online Recharge Packages",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30",
													children: "Coming Soon"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-[#A59AB8]",
											children: "Online card purchasing is coming soon • Buy coins right now via Official Offline Agencies below"
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs text-emerald-400 font-bold",
											children: ["1 Coin ≈ PKR ", settings.exchangeRatePkrPerCoin]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "grid grid-cols-2 sm:grid-cols-3 gap-3",
										children: coinPackages.filter((p) => p.enabled).map((pkg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											role: "button",
											tabIndex: 0,
											onClick: () => handleSelectPackageComingSoon(pkg),
											onKeyDown: (e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													handleSelectPackageComingSoon(pkg);
												}
											},
											className: `relative p-3.5 rounded-2xl bg-[#170c2a] border transition-all flex flex-col justify-between group cursor-pointer active:scale-[0.98] ${pkg.isPopular ? "border-amber-400/50 shadow-[0_4px_16px_rgba(255,200,74,0.12)] bg-gradient-to-b from-[#24133f] to-[#170c2a]" : "border-white/10 hover:border-amber-400/40"}`,
											children: [
												pkg.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "absolute -top-2 right-2 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow",
													children: pkg.badge
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5 text-lg font-black text-white font-mono",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🪙" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: pkg.coins.toLocaleString() })]
												}), pkg.bonusCoins > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] font-bold text-amber-400 block mt-0.5",
													children: [
														"+",
														pkg.bonusCoins.toLocaleString(),
														" Bonus"
													]
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-xs font-black text-white font-mono",
														children: pkg.displayPrice
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
														type: "button",
														onClick: (e) => {
															e.stopPropagation();
															handleSelectPackageComingSoon(pkg);
														},
														className: "px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-[10px] font-black flex items-center gap-1 transition-all shrink-0",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "w-3 h-3 text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Soon" })]
													})]
												})
											]
										}, pkg.id))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-[#15112c] to-amber-950/35 border border-emerald-400/40 shadow-[0_8px_28px_rgba(16,185,129,0.16)] space-y-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex items-start justify-between gap-3",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-3 min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-black flex items-center justify-center shrink-0 shadow-lg",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "w-5 h-5" })
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center gap-1.5 flex-wrap",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
																className: "text-sm font-black text-white",
																children: "Visit Offline Agency"
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40",
																children: "Official Coin Sellers"
															})]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "text-[11px] text-[#c7bdd9] mt-0.5 leading-snug",
															children: "Contact our verified offline Coin Seller Agencies to purchase Lenzo Coins instantly via JazzCash, EasyPaisa, Bank Transfer, or Cash."
														})]
													})]
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between gap-2 flex-wrap text-[10px] text-emerald-200/90 bg-black/25 rounded-xl px-3 py-2 border border-white/5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "flex items-center gap-1.5 font-bold",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2 h-2 rounded-full bg-emerald-400 animate-pulse" }),
														activeAgencies.filter((a) => a.isOnline).length,
														" Verified Agencies Online Now"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[#A59AB8] font-mono",
													children: ["Your ID: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-white",
														children: userDisplayId
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: () => handleOpenOfflineAgencies(null),
												className: "w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400 hover:brightness-105 text-black text-xs sm:text-sm font-black shadow-[0_6px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-[0.98] transition-all",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "w-4 h-4" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visit Offline Coin Seller Agency" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4" })
												]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "text-sm font-black text-white flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "w-4 h-4 text-[#A59AB8]" }), "Coin Transaction History"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: selectedTxFilter,
										onChange: (e) => setSelectedTxFilter(e.target.value),
										className: "bg-[#1b0e33] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "all",
												children: "All Transactions"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "coin_purchase",
												children: "Coin Purchases"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "gift_sent",
												children: "Gifts Sent"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "earnings_conversion",
												children: "Converted Coins"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "admin_adjustment",
												children: "Adjustments"
											})
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2",
									children: filteredTxs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-8 text-center text-[#8e82a3] bg-[#140a24] rounded-2xl border border-white/5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-bold text-white",
											children: "No Coin Transactions Yet"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] mt-0.5",
											children: "Recharge or send gifts to generate transaction records."
										})]
									}) : filteredTxs.map((tx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-2xl bg-[#140a24] border border-white/5 flex items-center justify-between text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2.5 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.amount > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`,
												children: tx.amount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownLeft, { className: "w-4 h-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "w-4 h-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-bold text-white truncate text-[11px]",
													children: tx.description
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] text-gray-500",
													children: tx.timestamp
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right shrink-0 ml-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `font-mono font-bold ${tx.amount > 0 ? "text-emerald-400" : "text-rose-400"}`,
												children: [tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString(), " 🪙"]
											}), tx.pkrAmount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[9px] text-[#A59AB8]",
												children: ["≈ PKR ", tx.pkrAmount.toLocaleString()]
											})]
										})]
									}, tx.id))
								})]
							})
						]
					}), activeMainTab === "earnings" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative p-5 rounded-3xl bg-gradient-to-br from-[#0E2444] via-[#1B103D] to-[#120624] border border-cyan-400/35 shadow-xl overflow-hidden",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-10 -right-10 w-44 h-44 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 mb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs font-bold text-cyan-100 flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "💎" }), " Available Diamonds"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[10px] text-cyan-200 font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/35",
											children: [
												100 - settings.commissionRatePercent,
												"% Host Share • ",
												settings.commissionRatePercent,
												"% App"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-baseline justify-between flex-wrap gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-baseline gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-3xl sm:text-4xl font-black text-cyan-300 font-mono tabular-nums tracking-tight",
												children: earningsData.availableEarningsCoins.toLocaleString()
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs text-cyan-100/80 font-extrabold uppercase tracking-wide",
												children: "Diamonds"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-sm font-extrabold text-emerald-400 font-mono tabular-nums",
												children: ["≈ PKR ", (earningsData.availableEarningsCoins * settings.exchangeRatePkrPerCoin).toLocaleString()]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-[#B9AECF]",
												children: [
													"Converted from ",
													100 - settings.commissionRatePercent,
													"% of gifts received"
												]
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] text-[#A59AB8] block",
												children: "Pending Payout"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-bold text-amber-300 font-mono tabular-nums",
												children: ["💎 ", earningsData.pendingWithdrawalCoins.toLocaleString()]
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] text-[#A59AB8] block",
												children: "Withdrawn Paid"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-bold text-emerald-400 font-mono tabular-nums",
												children: ["💎 ", earningsData.totalWithdrawnCoins.toLocaleString()]
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] text-[#A59AB8] block",
												children: "Exchanged to Coins"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-bold text-cyan-300 font-mono tabular-nums",
												children: ["💎 ", earningsData.totalConvertedToWallet.toLocaleString()]
											})] })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4 pt-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setIsWithdrawModalOpen(true),
											className: "min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-105 text-[#041B10] text-xs font-black shadow-[0_4px_16px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Withdraw Diamonds" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => setIsConvertModalOpen(true),
											className: "min-h-[46px] py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-[#8B20FF] to-[#F328D5] hover:brightness-105 text-white text-xs font-black shadow-[0_4px_16px_rgba(139,32,255,0.35)] flex items-center justify-center gap-2 active:scale-95 transition-all",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exchange Diamonds → Coins" })]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-[#150a25] border border-white/10 space-y-2.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs border-b border-white/5 pb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8]",
											children: "Gift Earnings Split:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-cyan-300",
											children: [
												100 - settings.commissionRatePercent,
												"% Host Diamonds / ",
												settings.commissionRatePercent,
												"% App"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs border-b border-white/5 pb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8]",
											children: "Diamond Cash Value:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-emerald-400",
											children: ["1 💎 Diamond = PKR ", settings.exchangeRatePkrPerCoin]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs border-b border-white/5 pb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8]",
											children: "Supported Payout Methods:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-white",
											children: "Bank Transfer · EasyPaisa · JazzCash"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8]",
											children: "Diamond → Coin Exchange Rate:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-amber-300",
											children: "1 💎 Diamond = 1 🪙 Gifting Coin"
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
										className: "text-sm font-black text-white flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(History, { className: "w-4 h-4 text-cyan-300" }), "Diamonds History"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: selectedTxFilter,
										onChange: (e) => setSelectedTxFilter(e.target.value),
										className: "bg-[#1b0e33] border border-white/10 rounded-xl px-2.5 py-1 text-[11px] text-white focus:outline-none",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "all",
												children: "All Diamond Events"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "gift_received",
												children: "Gifts Received (60% 💎)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "withdrawal_request",
												children: "Diamond Withdrawals"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "earnings_conversion",
												children: "Exchanged to Coins"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "withdrawal_refund",
												children: "Refunds"
											})
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2",
									children: filteredTxs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-8 text-center text-[#8e82a3] bg-[#140a24] rounded-2xl border border-white/5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-bold text-white",
											children: "No Diamond Earnings Yet"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] mt-0.5",
											children: [
												"Receive gifts in Live Streams, Audio Party Rooms, Reels, or Chat to earn ",
												100 - settings.commissionRatePercent,
												"% as Diamonds."
											]
										})]
									}) : filteredTxs.map((tx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3 rounded-2xl bg-[#140a24] border border-white/5 flex items-center justify-between text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2.5 min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.amount > 0 ? "bg-cyan-500/20 text-cyan-300" : "bg-pink-500/20 text-pink-300"}`,
												children: tx.amount > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownLeft, { className: "w-4 h-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "w-4 h-4" })
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-bold text-white truncate text-[11px]",
													children: tx.description
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] text-gray-400",
													children: tx.timestamp
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-right shrink-0 ml-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: `font-mono font-bold tabular-nums ${tx.amount > 0 ? "text-cyan-300" : "text-pink-300"}`,
												children: [tx.amount > 0 ? `+${tx.amount.toLocaleString()}` : tx.amount.toLocaleString(), " 💎"]
											}), tx.pkrAmount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[9px] text-emerald-300 font-mono",
												children: ["≈ PKR ", tx.pkrAmount.toLocaleString()]
											})]
										})]
									}, tx.id))
								})]
							})
						]
					})]
				}),
				isConvertModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-sm rounded-3xl bg-[#190e2e] border border-cyan-400/25 p-5 space-y-4 shadow-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pb-2 border-b border-white/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-sm font-black text-white flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRightLeft, { className: "w-4 h-4 text-cyan-300" }), "Exchange Diamonds to Coins"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setIsConvertModalOpen(false),
									className: "text-gray-400 hover:text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#110820] border border-white/5 space-y-1.5 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-[#A59AB8]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Available Diamonds:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-mono font-bold text-cyan-300 tabular-nums",
										children: ["💎 ", earningsData.availableEarningsCoins.toLocaleString()]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-[#A59AB8]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Exchange Rate:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-amber-300",
										children: "1 💎 Diamond = 1 🪙 Coin"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-bold text-gray-300",
								children: "Enter Diamonds to Exchange"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative mt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: convertCoinsInput,
									onChange: (e) => setConvertCoinsInput(e.target.value),
									max: earningsData.availableEarningsCoins,
									className: "w-full bg-[#23133e] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-cyan-400"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setConvertCoinsInput(earningsData.availableEarningsCoins.toString()),
									className: "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-black bg-cyan-500/20 text-cyan-200",
									children: "MAX"
								})]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-xl bg-purple-900/30 border border-amber-400/25 text-xs flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[#d7c9ec]",
									children: "Credited to Gifting Wallet:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-sm font-black text-amber-300 font-mono tabular-nums",
									children: [
										"🪙 ",
										willReceiveWalletCoins.toLocaleString(),
										" Coins"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] text-gray-400 leading-relaxed",
								children: "* Exchanged Coins are credited immediately to your Buying/Gifting Wallet for sending gifts, buying frames, and store items. Exchanged Coins cannot be withdrawn back as cash."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setIsConvertModalOpen(false),
									className: "flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isConverting || convertCoinsNum <= 0 || convertCoinsNum > earningsData.availableEarningsCoins,
									onClick: handleConvertEarnings,
									className: "flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-[#8B20FF] to-[#F328D5] text-white text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all",
									children: isConverting ? "Exchanging..." : "Confirm Exchange"
								})]
							})
						]
					})
				}),
				isWithdrawModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-md rounded-3xl bg-[#170a29] border border-cyan-400/25 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pb-2 border-b border-white/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "w-5 h-5 text-emerald-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-base font-black text-white",
										children: "Withdraw Diamonds"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setIsWithdrawModalOpen(false),
									className: "text-gray-400 hover:text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2 text-[11px] p-3 rounded-2xl bg-[#10061e] border border-white/5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#A59AB8] block",
										children: "Available Diamonds:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-cyan-300 font-mono tabular-nums",
										children: ["💎 ", earningsData.availableEarningsCoins.toLocaleString()]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#A59AB8] block",
										children: "Payout Rate:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-emerald-400 font-mono",
										children: ["1 💎 = PKR ", settings.exchangeRatePkrPerCoin]
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-1 border-t border-white/5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8] block",
											children: "Min Limit:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-amber-300 font-mono tabular-nums",
											children: ["💎 ", settings.minWithdrawalCoins.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-1 border-t border-white/5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[#A59AB8] block",
											children: "Processing Fee:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-purple-300 font-mono",
											children: [settings.withdrawalFeePercent, "%"]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-bold text-gray-300",
								children: "Diamonds to Withdraw"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative mt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "number",
									value: withdrawCoinsInput,
									onChange: (e) => setWithdrawCoinsInput(e.target.value),
									min: settings.minWithdrawalCoins,
									max: Math.min(settings.maxWithdrawalCoins, earningsData.availableEarningsCoins),
									className: "w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono font-bold focus:outline-none focus:border-emerald-400"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setWithdrawCoinsInput(earningsData.availableEarningsCoins.toString()),
									className: "absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-300",
									children: "MAX"
								})]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-bold text-gray-300",
								children: "Select Withdrawal Method"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-3 gap-2 mt-1.5",
								children: DEFAULT_PAYOUT_METHODS.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										setSelectedPayoutMethod(m.type);
										if (m.type === "easypaisa") setBankOrProviderName("EasyPaisa");
										else if (m.type === "jazzcash") setBankOrProviderName("JazzCash");
										else if (bankOrProviderName === "EasyPaisa" || bankOrProviderName === "JazzCash") setBankOrProviderName("");
									},
									className: `min-h-[58px] p-2.5 rounded-xl border text-left text-xs transition-all ${selectedPayoutMethod === m.type ? "border-emerald-400 bg-emerald-950/40 text-white font-black shadow" : "border-white/10 bg-[#22103a] text-[#A59AB8] hover:text-white"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 mb-0.5",
										children: [
											m.type === "bank_transfer" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "w-3.5 h-3.5 text-emerald-400 shrink-0" }),
											m.type === "easypaisa" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-3.5 h-3.5 text-teal-400 shrink-0" }),
											m.type === "jazzcash" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "w-3.5 h-3.5 text-amber-400 shrink-0" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate text-[11px]",
												children: m.type === "bank_transfer" ? "Bank" : m.name
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[9px] opacity-75 block truncate",
										children: m.type === "bank_transfer" ? "IBAN / 1Link" : "Mobile Wallet"
									})]
								}, m.id))
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-semibold text-gray-300",
										children: "Account Title / Full Name *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: accountTitle,
										onChange: (e) => setAccountTitle(e.target.value),
										placeholder: "e.g. Muhammad Ali",
										className: "w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
									})] }),
									selectedPayoutMethod === "bank_transfer" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-semibold text-gray-300",
										children: "Bank Name *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: bankOrProviderName,
										onChange: (e) => setBankOrProviderName(e.target.value),
										placeholder: "e.g. Meezan Bank / HBL / UBL / Alfalah",
										className: "w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white mt-0.5 focus:outline-none focus:border-emerald-400"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-semibold text-gray-300",
										children: selectedPayoutMethod === "bank_transfer" ? "Bank Account Number / 24-Digit IBAN *" : selectedPayoutMethod === "easypaisa" ? "EasyPaisa 11-Digit Mobile Number *" : "JazzCash 11-Digit Mobile Number *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: accountNumber,
										onChange: (e) => setAccountNumber(e.target.value),
										placeholder: selectedPayoutMethod === "bank_transfer" ? "PK00MEZN0000000000000000" : "03XXXXXXXXX",
										className: "w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-[11px] font-semibold text-gray-300",
										children: "Contact Phone / WhatsApp (Optional)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "tel",
										value: phoneNumber,
										onChange: (e) => setPhoneNumber(e.target.value),
										placeholder: "03XXXXXXXXX",
										className: "w-full bg-[#22103a] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono mt-0.5 focus:outline-none focus:border-emerald-400"
									})] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border border-emerald-500/30 space-y-1.5 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-[#A59AB8]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Gross Value (💎 ",
											withdrawCoinsNum.toLocaleString(),
											"):"
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-white tabular-nums",
											children: ["PKR ", withdrawGrossPkr.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between text-[#A59AB8]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Processing Fee (",
											settings.withdrawalFeePercent,
											"%):"
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-rose-300 tabular-nums",
											children: ["- PKR ", withdrawFeePkr.toLocaleString()]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between pt-1 border-t border-emerald-500/20 font-black text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-white",
											children: "Final Payable Amount:"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono text-emerald-400 tabular-nums",
											children: ["PKR ", withdrawNetPkr.toLocaleString()]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setIsWithdrawModalOpen(false),
									className: "flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isSubmittingWithdrawal || withdrawCoinsNum < settings.minWithdrawalCoins || withdrawCoinsNum > earningsData.availableEarningsCoins,
									onClick: handleSubmitWithdrawal,
									className: "flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#041B10] text-xs font-black shadow-lg disabled:opacity-50 active:scale-95 transition-all",
									children: isSubmittingWithdrawal ? "Submitting..." : "Request Payout"
								})]
							})
						]
					})
				}),
				comingSoonPkg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4",
					onClick: () => setComingSoonPkg(null),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "w-full max-w-sm rounded-3xl bg-[#160b2b] border border-amber-400/35 p-5 space-y-4 shadow-2xl",
						onClick: (e) => e.stopPropagation(),
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-yellow-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-5 h-5" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-black uppercase tracking-wider text-amber-300",
										children: "Payment Notice"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-base font-black text-white leading-tight",
										children: "Online Purchasing Coming Soon"
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setComingSoonPkg(null),
									className: "w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white shrink-0",
									"aria-label": "Close notice",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-2xl bg-[#10061e] border border-white/10 flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Selected Package"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-base font-black text-[#FFC84A] font-mono",
										children: [
											"🪙 ",
											comingSoonPkg.coins.toLocaleString(),
											" Coins"
										]
									}),
									comingSoonPkg.bonusCoins > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[10px] text-amber-300 font-bold",
										children: [
											"+",
											comingSoonPkg.bonusCoins.toLocaleString(),
											" Bonus Coins"
										]
									})
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-right",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Official Price"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-black text-white font-mono",
										children: comingSoonPkg.displayPrice
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-xs text-amber-100/95 leading-relaxed",
								children: [
									"Direct online card / in-app purchasing is ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "coming soon" }),
									". Coins cannot be added without verified payment.",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-emerald-300 font-bold block mt-1.5",
										children: "Need coins now? Visit our Official Offline Coin Seller Agencies to purchase safely!"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#A59AB8] block",
										children: "Your Lenzo User ID"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-bold text-white truncate block",
										children: userDisplayId
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: handleCopyMyId,
									className: "px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 shrink-0",
									children: [copiedIdFlag ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5 text-emerald-400" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: copiedIdFlag ? "Copied" : "Copy ID" })]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-2 pt-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => handleOpenOfflineAgencies(comingSoonPkg),
									className: "w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-105 text-black text-xs font-black shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "w-4 h-4" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visit Offline Agency" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "w-4 h-4" })
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setComingSoonPkg(null),
									className: "w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-bold",
									children: "Close"
								})]
							})
						]
					})
				}),
				isAgencyDirectoryOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-0 z-40 bg-[#0d061b] flex flex-col overflow-hidden animate-in slide-in-from-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "p-4 pb-3 border-b border-white/10 bg-[#150a26] flex items-center justify-between gap-2 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2.5 min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setIsAgencyDirectoryOpen(false),
								className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0",
								"aria-label": "Back to Wallet",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-4 h-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm sm:text-base font-black text-white truncate",
										children: "Offline Coin Seller Agencies"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "w-4 h-4 text-emerald-400 shrink-0" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] text-[#A59AB8] truncate",
									children: "Verified agencies • Contact on WhatsApp or Call to buy coins"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setIsAgencyDirectoryOpen(false),
							className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white shrink-0",
							"aria-label": "Close directory",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 overflow-y-auto no-scrollbar p-4 space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-gradient-to-r from-[#1f103a] to-[#131d2d] border border-emerald-400/30 flex items-center justify-between gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] font-bold text-emerald-300 uppercase tracking-wider block",
										children: "Share This ID With Coin Seller"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs sm:text-sm font-black text-white font-mono truncate",
										children: [
											currentUser.name,
											" • ID: ",
											userDisplayId
										]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: handleCopyMyId,
									className: "px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-black flex items-center gap-1.5 shrink-0",
									children: [copiedIdFlag ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: copiedIdFlag ? "Copied!" : "Copy ID" })]
								})]
							}),
							selectedInquiryPkg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-between gap-2 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-amber-200 font-bold truncate",
									children: [
										"Inquiring for: 🪙 ",
										selectedInquiryPkg.coins.toLocaleString(),
										" Coins (",
										selectedInquiryPkg.displayPrice,
										")"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setSelectedInquiryPkg(null),
									className: "text-amber-300 hover:text-white shrink-0",
									"aria-label": "Clear selected package",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3.5 h-3.5" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "w-4 h-4 text-[#A59AB8] absolute left-3 top-1/2 -translate-y-1/2" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										value: agencySearchQuery,
										onChange: (e) => setAgencySearchQuery(e.target.value),
										placeholder: "Search agency name, city, code, JazzCash, EasyPaisa...",
										className: "w-full bg-[#170c2a] border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-[#7e7294] focus:outline-none focus:border-emerald-400"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1",
									children: agencyCities.map((city) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setSelectedAgencyCity(city),
										className: `px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border ${selectedAgencyCity === city ? "bg-emerald-500/20 border-emerald-400/50 text-emerald-300" : "bg-[#170c2a] border-white/10 text-[#A59AB8] hover:text-white"}`,
										children: city === "ALL" ? `All Cities (${activeAgencies.length})` : city
									}, city))
								})]
							}),
							filteredAgencies.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-8 text-center rounded-2xl bg-[#150a25] border border-white/5 text-[#A59AB8]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "w-8 h-8 mx-auto mb-2 opacity-50" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-bold text-white",
										children: "No matching Coin Seller Agency found"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] mt-0.5",
										children: "Try clearing your search or selecting \"All Cities\"."
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-3",
								children: filteredAgencies.map((agency) => {
									const waMessage = selectedInquiryPkg ? `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to buy ${selectedInquiryPkg.coins.toLocaleString()} Lenzo Coins (${selectedInquiryPkg.displayPrice}). My Lenzo Name: ${currentUser.name}, Lenzo ID: ${userDisplayId}.` : `Assalam-o-Alaikum ${agency.name} (${agency.agencyCode}), I want to purchase Lenzo Party Coins. My Lenzo Name: ${currentUser.name}, Lenzo ID: ${userDisplayId}.`;
									const waUrl = buildSafeWhatsAppUrl(agency.whatsapp, waMessage);
									const telUrl = buildSafeTelUrl(agency.phone || agency.whatsapp);
									const matchedDual = approvedDualCoinSellers.find((d) => d.id === agency.id) || null;
									const canOpenInbox = Boolean(onSendMessage && matchedDual && matchedDual.ownerUid !== currentUser.id);
									const openAgencyInboxFromWallet = () => {
										if (!onSendMessage || !matchedDual) return;
										const ownerProfile = {
											id: matchedDual.ownerUid,
											displayId: matchedDual.ownerDisplayId || matchedDual.ownerUid.slice(0, 8),
											name: matchedDual.name || matchedDual.ownerName || "Coin Seller Agency",
											username: matchedDual.ownerUsername || `@${matchedDual.agencyCode.toLowerCase()}`,
											avatar: matchedDual.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(matchedDual.name || "Agency")}&background=8B20FF&color=fff`,
											bio: matchedDual.description || "Official Verified Lenzo Coin Seller Agency",
											level: 1,
											vipLevel: 0,
											isVIP: false,
											coins: 0,
											diamonds: 0,
											followersCount: 0,
											followingCount: 0,
											fansCount: "0",
											likesCount: "0"
										};
										setIsAgencyDirectoryOpen(false);
										onClose();
										onSendMessage(ownerProfile);
									};
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => {
											if (canOpenInbox) openAgencyInboxFromWallet();
										},
										className: `p-4 rounded-2xl bg-[#160b29] border border-white/10 hover:border-emerald-400/35 transition-all space-y-3 shadow-lg ${canOpenInbox ? "cursor-pointer" : ""}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start justify-between gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-1.5 flex-wrap",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
															className: "text-sm font-black text-white leading-snug",
															children: agency.name
														}), agency.isVerified && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BadgeCheck, { className: "w-4 h-4 text-sky-400 shrink-0" })]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2 flex-wrap mt-1 text-[11px] text-[#A59AB8]",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "inline-flex items-center gap-1 text-emerald-300 font-bold",
																children: [
																	/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "w-3 h-3" }),
																	agency.city,
																	", ",
																	agency.country
																]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "•" }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-mono text-amber-300 font-bold",
																children: agency.agencyCode
															})
														]
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-col items-end gap-1 shrink-0",
													children: [agency.badge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-400/30",
														children: agency.badge
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: `text-[10px] font-bold inline-flex items-center gap-1 ${agency.isOnline ? "text-emerald-400" : "text-gray-400"}`,
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `w-1.5 h-1.5 rounded-full ${agency.isOnline ? "bg-emerald-400 animate-pulse" : "bg-gray-500"}` }), agency.isOnline ? "Online" : "Away"]
													})]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#100720] border border-white/5 text-[11px]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[10px] text-[#A59AB8] block",
														children: "Agent / Desk"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-white truncate block",
														children: agency.ownerName
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[10px] text-[#A59AB8] block",
														children: "Working Hours"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-gray-200 truncate block",
														children: agency.workingHours
													})] }),
													agency.rateNote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "col-span-2 pt-1 border-t border-white/5 flex items-center justify-between gap-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-emerald-300 font-semibold",
															children: agency.rateNote
														}), agency.minCoinsOrder ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-[10px] text-[#A59AB8] font-mono shrink-0",
															children: [
																"Min: ",
																agency.minCoinsOrder.toLocaleString(),
																" 🪙"
															]
														}) : null]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex items-center gap-1.5 flex-wrap",
												children: agency.paymentMethods.map((method) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-[#d8cee8]",
													children: method
												}, method))
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "space-y-2 pt-1",
												children: [canOpenInbox && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: (e) => {
														e.stopPropagation();
														openAgencyInboxFromWallet();
													},
													className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FFC84A] via-[#F59E0B] to-[#F97316] text-[#090611] text-xs font-black flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Open In-App Agency Inbox (Buy Coins)" })]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "grid grid-cols-3 gap-2",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
															href: waUrl,
															target: "_blank",
															rel: "noopener noreferrer",
															onClick: (e) => e.stopPropagation(),
															className: "col-span-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:brightness-110 text-white text-[11px] font-black flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "WhatsApp" })]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
															href: telUrl,
															onClick: (e) => e.stopPropagation(),
															className: "col-span-1 py-2.5 rounded-xl bg-sky-600/25 hover:bg-sky-600/40 border border-sky-400/35 text-sky-200 text-[11px] font-black flex items-center justify-center gap-1.5 active:scale-95 transition-all",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Call" })]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
															type: "button",
															onClick: (e) => {
																e.stopPropagation();
																handleCopyText(agency.whatsapp || agency.phone, "Agency Number");
															},
															className: "col-span-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Copy No." })]
														})
													]
												})]
											})
										]
									}, agency.id);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-amber-500/10 border border-amber-400/25 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-4 h-4 text-amber-400 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Always confirm the Official Agency Code before sending payment. Never share your password or OTP — verified Coin Seller Agencies only require your ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Lenzo ID" }),
									"."
								] })]
							})
						]
					})]
				}),
				isAdminUser && isAdminPanelOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute inset-0 z-40 bg-[#120822]/98 backdrop-blur-xl p-4 sm:p-5 flex flex-col overflow-y-auto no-scrollbar animate-in slide-in-from-right",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between pb-3 border-b border-white/10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SlidersVertical, { className: "w-5 h-5 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-black text-white",
								children: "Admin Financial & Agency Controls"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setIsAdminPanelOpen(false),
							className: "text-gray-400 hover:text-white",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-5 h-5" })
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-6 pt-4 pb-8",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-[#1b0e33] border border-emerald-400/30 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
										className: "text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-4 h-4" }), "Credit User Wallet (Offline Agency Top-Up)"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "User Firebase UID"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: creditTargetUid,
												onChange: (e) => setCreditTargetUid(e.target.value),
												placeholder: "Paste buyer Firebase UID",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Coins Amount (+/-)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: creditCoinsAmount,
												onChange: (e) => setCreditCoinsAmount(e.target.value),
												placeholder: "e.g. 5000",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "sm:col-span-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[11px] text-[#A59AB8]",
													children: "Order / Agency Reference Note"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: creditReasonNote,
													onChange: (e) => setCreditReasonNote(e.target.value),
													placeholder: "Offline Coin Seller Agency Order",
													className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
												})]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: isCreditingCoins,
										onClick: handleAdminCreditUserCoins,
										className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-black shadow disabled:opacity-50 active:scale-95 transition-all",
										children: isCreditingCoins ? "Applying..." : "Apply Wallet Coin Credit"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-[#1b0e33] border border-white/10 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
											className: "text-xs font-black text-[#FFC84A] uppercase tracking-wider flex items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Store, { className: "w-4 h-4" }),
												"Official Coin Seller Agencies (",
												coinSellerAgencies.length,
												")"
											]
										}), editingAgencyId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: resetAgencyForm,
											className: "text-[11px] font-bold text-rose-300 hover:text-white",
											children: "Cancel Edit"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Agency Name *"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormName,
												onChange: (e) => setAgencyFormName(e.target.value),
												placeholder: "e.g. Lenzo Coin Desk Lahore",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Owner / Desk Name"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormOwner,
												onChange: (e) => setAgencyFormOwner(e.target.value),
												placeholder: "e.g. Ali Khan",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Agency Code"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormCode,
												onChange: (e) => setAgencyFormCode(e.target.value),
												placeholder: "LP-COIN-06",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "City *"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormCity,
												onChange: (e) => setAgencyFormCity(e.target.value),
												placeholder: "Lahore / Karachi / Dubai",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "WhatsApp Number (with country code) *"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormWhatsapp,
												onChange: (e) => setAgencyFormWhatsapp(e.target.value),
												placeholder: "+923001234567",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Phone Number"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormPhone,
												onChange: (e) => setAgencyFormPhone(e.target.value),
												placeholder: "+923001234567",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "sm:col-span-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[11px] text-[#A59AB8]",
													children: "Payment Methods (comma separated)"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: agencyFormPayments,
													onChange: (e) => setAgencyFormPayments(e.target.value),
													placeholder: "JazzCash, EasyPaisa, Bank Transfer, Cash",
													className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Working Hours"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormHours,
												onChange: (e) => setAgencyFormHours(e.target.value),
												placeholder: "24/7 Instant Delivery",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Badge Label"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: agencyFormBadge,
												onChange: (e) => setAgencyFormBadge(e.target.value),
												placeholder: "OFFICIAL HQ / VERIFIED",
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "sm:col-span-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "text-[11px] text-[#A59AB8]",
													children: "Rate / Service Note"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													value: agencyFormRateNote,
													onChange: (e) => setAgencyFormRateNote(e.target.value),
													placeholder: "Official Rate • Instant Top-Up",
													className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white mt-1"
												})]
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-4 text-xs pt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-2 text-gray-200 cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: agencyFormOnline,
												onChange: (e) => setAgencyFormOnline(e.target.checked)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Online Now" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex items-center gap-2 text-gray-200 cursor-pointer",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "checkbox",
												checked: agencyFormEnabled,
												onChange: (e) => setAgencyFormEnabled(e.target.checked)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Visible to Users" })]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: isSavingAgency,
										onClick: handleSaveAgency,
										className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isSavingAgency ? "Saving..." : editingAgencyId ? "Update Coin Seller Agency" : "Add Coin Seller Agency" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "space-y-2 pt-2 border-t border-white/10",
										children: coinSellerAgencies.map((agency) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "p-2.5 rounded-xl bg-[#110722] border border-white/10 flex items-center justify-between gap-2 text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "font-bold text-white truncate",
													children: [
														agency.name,
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-amber-300 font-mono text-[10px]",
															children: [
																"(",
																agency.agencyCode,
																")"
															]
														})
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] text-[#A59AB8] truncate",
													children: [
														agency.city,
														" • ",
														agency.whatsapp,
														" • ",
														agency.enabled ? "Visible" : "Hidden"
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1 shrink-0",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => handleToggleAgencyOnline(agency),
														className: `px-2 py-1 rounded-lg text-[10px] font-bold ${agency.isOnline ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-gray-400"}`,
														children: agency.isOnline ? "Online" : "Away"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => handleToggleAgencyEnabled(agency),
														className: "px-2 py-1 rounded-lg bg-white/10 text-[10px] font-bold text-white",
														children: agency.enabled ? "Hide" : "Show"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => handleEditAgency(agency),
														className: "p-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30",
														"aria-label": "Edit agency",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PenLine, { className: "w-3.5 h-3.5" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => handleDeleteAgency(agency),
														className: "p-1.5 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30",
														"aria-label": "Delete agency",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "w-3.5 h-3.5" })
													})
												]
											})]
										}, agency.id))
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-4 rounded-2xl bg-[#1b0e33] border border-white/10 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
										className: "text-xs font-black text-[#FFC84A] uppercase tracking-wider",
										children: "Global Rate & Limit Settings"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-3 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Commission Rate (%)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: adminCommissionInput,
												onChange: (e) => setAdminCommissionInput(parseFloat(e.target.value) || 0),
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Exchange Rate (PKR per Coin)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "0.1",
												value: adminExchangeRateInput,
												onChange: (e) => setAdminExchangeRateInput(parseFloat(e.target.value) || 1),
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Min Withdrawal (Coins)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: adminMinWithdrawInput,
												onChange: (e) => setAdminMinWithdrawInput(parseInt(e.target.value, 10) || 1e3),
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] text-[#A59AB8]",
												children: "Max Withdrawal (Coins)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: adminMaxWithdrawInput,
												onChange: (e) => setAdminMaxWithdrawInput(parseInt(e.target.value, 10) || 1e5),
												className: "w-full bg-[#110722] border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono mt-1"
											})] })
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: handleSaveAdminSettings,
										className: "w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-black shadow active:scale-95 transition-all",
										children: "Save Global Financial Rules"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
										className: "text-xs font-black text-white uppercase tracking-wider",
										children: [
											"Creator Withdrawal Requests (",
											adminRequests.length,
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-[#A59AB8]",
										children: "Live requests from creators"
									})]
								}), adminRequests.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-6 text-center text-xs text-[#A59AB8] bg-[#170c2a] rounded-2xl border border-white/5",
									children: "No active withdrawal requests at this moment."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "space-y-2.5",
									children: adminRequests.map((req) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "p-3.5 rounded-2xl bg-[#170c2a] border border-white/10 space-y-2 text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center justify-between",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-bold text-white text-sm",
													children: req.userName
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] text-[#A59AB8] block",
													children: [
														"ID: #",
														req.id.slice(-6).toUpperCase(),
														" • ",
														req.requestedAt
													]
												})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${req.status === "paid" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : req.status === "rejected" ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"}`,
													children: req.status
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#10061e] text-[11px]",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[#A59AB8] block",
														children: "Requested:"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono font-bold text-white",
														children: [
															"🪙 ",
															req.coinsRequested.toLocaleString(),
															" Coins"
														]
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-[#A59AB8] block",
														children: "Payable PKR:"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-mono font-bold text-emerald-400",
														children: ["PKR ", req.finalPayablePkr.toLocaleString()]
													})] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "col-span-2 pt-1 border-t border-white/5",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[#A59AB8] block",
															children: "Payout Details:"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "font-mono text-gray-200",
															children: [
																req.paymentDetails.bankOrProviderName,
																" - ",
																req.paymentDetails.accountTitle,
																" (",
																req.paymentDetails.accountNumber,
																")"
															]
														})]
													})
												]
											}),
											req.adminRemarks && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-[10px] text-[#A59AB8] italic",
												children: [
													"Remarks: ",
													req.adminRemarks,
													" ",
													req.paymentReference ? `(Ref: ${req.paymentReference})` : ""
												]
											}),
											req.status === "pending" || req.status === "under_review" || req.status === "approved" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 pt-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => handleAdminStatusChange(req, "paid"),
													className: "flex-1 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]",
													children: "Approve & Mark Paid"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => handleAdminStatusChange(req, "rejected"),
													className: "px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-[11px]",
													children: "Reject & Return Coins"
												})]
											}) : null
										]
									}, req.id))
								})]
							})
						]
					})]
				})
			]
		})
	});
};
export { WalletModal };
