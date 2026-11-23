import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { B as RotateCcw, K as Plus, N as ShieldCheck, T as Sparkles, Zt as Coins, a as Wallet, cn as Check, kn as require_react, on as ChevronLeft, q as Play, r as X, tn as CircleCheck } from "./vendor-icons-sqDS8tFw.js";
import { a as purchaseStoreProduct, c as subscribeUserInventory, d as DEFAULT_STORE_PRODUCTS, l as toggleEquipInventoryItem, o as subscribeStoreCategories, s as subscribeStoreProducts, t as StoreAssetPreview, u as DEFAULT_STORE_CATEGORIES } from "./StoreAssetPreview-DapRaNl4.js";
import { X as subscribeUserWallet } from "./index-2m6nzgVv.js";
import { i as require_jsx_runtime } from "./vendor-motion-CI-970bO.js";
// src/components/screens/StoreScreen.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
/**
* Reusable glossy metallic golden coin emblem
*/
var GoldenCoinIcon = ({ className = "w-4 h-4" }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
	viewBox: "0 0 24 24",
	className: `shrink-0 ${className}`,
	"aria-hidden": "true",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("radialGradient", {
			id: "lenzoGoldCoinGrad",
			cx: "35%",
			cy: "30%",
			r: "70%",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: "#FFF7CC"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "45%",
					stopColor: "#FFC84A"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "85%",
					stopColor: "#D97706"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: "#92400E"
				})
			]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "10.5",
			fill: "url(#lenzoGoldCoinGrad)",
			stroke: "#FEF08A",
			strokeWidth: "1.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "12",
			cy: "12",
			r: "7.5",
			fill: "none",
			stroke: "#FFFBEB",
			strokeOpacity: "0.65",
			strokeWidth: "1"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M12 7.2 L13.4 10.3 L16.8 10.7 L14.2 12.9 L14.9 16.3 L12 14.5 L9.1 16.3 L9.8 12.9 L7.2 10.7 L10.6 10.3 Z",
			fill: "#FFFBEB",
			opacity: "0.92"
		})
	]
});
/**
* Sculpted Golden Royal Crown Emblem above STORE title
*/
var StoreHeroCrown = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
	viewBox: "0 0 96 52",
	className: "w-16 h-9 mx-auto drop-shadow-[0_0_16px_rgba(255,200,74,0.85)]",
	"aria-hidden": "true",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
			id: "storeCrownGold",
			x1: "0%",
			y1: "0%",
			x2: "100%",
			y2: "100%",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: "#FFF8D6"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "38%",
					stopColor: "#FFC84A"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "72%",
					stopColor: "#EAB308"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: "#B45309"
				})
			]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M14 42 L8 16 L29 27 L48 8 L67 27 L88 16 L82 42 Z",
			fill: "url(#storeCrownGold)",
			stroke: "#FEF08A",
			strokeWidth: "2",
			strokeLinejoin: "round"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
			x: "14",
			y: "40",
			width: "68",
			height: "8",
			rx: "4",
			fill: "url(#storeCrownGold)",
			stroke: "#FFFBEB",
			strokeWidth: "1.4"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "8",
			cy: "14",
			r: "4",
			fill: "#FEF08A",
			stroke: "#D97706",
			strokeWidth: "1.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "48",
			cy: "6",
			r: "4.8",
			fill: "#FFFBEB",
			stroke: "#D97706",
			strokeWidth: "1.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "88",
			cy: "14",
			r: "4",
			fill: "#FEF08A",
			stroke: "#D97706",
			strokeWidth: "1.2"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
			points: "48,22 54,30 48,37 42,30",
			fill: "#C084FC",
			stroke: "#FFFBEB",
			strokeWidth: "1"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "30",
			cy: "33",
			r: "2.8",
			fill: "#F472B6"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
			cx: "66",
			cy: "33",
			r: "2.8",
			fill: "#F472B6"
		})
	]
});
/**
* Decorative Golden Laurel Wreath Branch flanking the STORE heading
*/
var GoldenLaurelBranch = ({ mirrored = false }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
	viewBox: "0 0 68 42",
	className: `w-12 h-8 sm:w-14 sm:h-9 shrink-0 drop-shadow-[0_0_10px_rgba(255,200,74,0.6)] ${mirrored ? "-scale-x-100" : ""}`,
	"aria-hidden": "true",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", {
			id: "laurelGold",
			x1: "0%",
			y1: "0%",
			x2: "100%",
			y2: "100%",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "0%",
					stopColor: "#FFF7CC"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "55%",
					stopColor: "#FFC84A"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", {
					offset: "100%",
					stopColor: "#B45309"
				})
			]
		}) }),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
			d: "M58 36 C36 35 18 24 10 6",
			fill: "none",
			stroke: "url(#laurelGold)",
			strokeWidth: "2.4",
			strokeLinecap: "round"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "14",
			cy: "12",
			rx: "6.5",
			ry: "3.2",
			transform: "rotate(-35 14 12)",
			fill: "url(#laurelGold)"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "22",
			cy: "18",
			rx: "7",
			ry: "3.4",
			transform: "rotate(-24 22 18)",
			fill: "url(#laurelGold)"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "32",
			cy: "24",
			rx: "7.2",
			ry: "3.5",
			transform: "rotate(-14 32 24)",
			fill: "url(#laurelGold)"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "44",
			cy: "30",
			rx: "7.4",
			ry: "3.5",
			transform: "rotate(-4 44 30)",
			fill: "url(#laurelGold)"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "19",
			cy: "25",
			rx: "6",
			ry: "3",
			transform: "rotate(28 19 25)",
			fill: "url(#laurelGold)",
			opacity: "0.88"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "30",
			cy: "32",
			rx: "6.5",
			ry: "3.2",
			transform: "rotate(20 30 32)",
			fill: "url(#laurelGold)",
			opacity: "0.88"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ellipse", {
			cx: "43",
			cy: "36",
			rx: "6.5",
			ry: "3",
			transform: "rotate(12 43 36)",
			fill: "url(#laurelGold)",
			opacity: "0.88"
		})
	]
});
var StoreScreen = ({ currentUser, onNavigate, onOpenWallet, onUpdateUserBalance, onCoinsSpent }) => {
	const [categories, setCategories] = (0, import_react.useState)(DEFAULT_STORE_CATEGORIES);
	const [products, setProducts] = (0, import_react.useState)(DEFAULT_STORE_PRODUCTS);
	const [inventory, setInventory] = (0, import_react.useState)([]);
	const [walletCoins, setWalletCoins] = (0, import_react.useState)(currentUser.coins ?? 0);
	const [selectedCategoryId, setSelectedCategoryId] = (0, import_react.useState)("vip_frames");
	const [selectedProductId, setSelectedProductId] = (0, import_react.useState)("vip_frame_royal_flame");
	const [previewModalProduct, setPreviewModalProduct] = (0, import_react.useState)(null);
	const [previewReplayKey, setPreviewReplayKey] = (0, import_react.useState)(0);
	const [confirmPurchaseProduct, setConfirmPurchaseProduct] = (0, import_react.useState)(null);
	const [isPurchasing, setIsPurchasing] = (0, import_react.useState)(false);
	const [equippingId, setEquippingId] = (0, import_react.useState)(null);
	const [purchaseSuccessModal, setPurchaseSuccessModal] = (0, import_react.useState)(null);
	const [toast, setToast] = (0, import_react.useState)(null);
	const showToast = (text, type = "info") => {
		setToast({
			type,
			text
		});
		window.setTimeout(() => {
			setToast((prev) => prev?.text === text ? null : prev);
		}, 3200);
	};
	(0, import_react.useEffect)(() => {
		const unsubCats = subscribeStoreCategories(setCategories);
		const unsubProds = subscribeStoreProducts(setProducts);
		const unsubInv = currentUser.id ? subscribeUserInventory(currentUser.id, setInventory) : () => {};
		const unsubWallet = currentUser.id ? subscribeUserWallet(currentUser.id, (w) => {
			const synced = w.walletPurchasedCoins > 0 ? w.walletPurchasedCoins : Math.max(w.walletPurchasedCoins, currentUser.coins ?? 0);
			setWalletCoins(synced);
		}) : () => {};
		return () => {
			unsubCats();
			unsubProds();
			unsubInv();
			unsubWallet();
			setPreviewModalProduct(null);
		};
	}, [currentUser.id]);
	(0, import_react.useEffect)(() => {
		if (typeof currentUser.coins === "number") setWalletCoins((prev) => currentUser.coins > prev ? currentUser.coins : prev || currentUser.coins);
	}, [currentUser.coins]);
	const categoryProducts = (0, import_react.useMemo)(() => {
		return products.filter((p) => p.enabled !== false && p.categoryId === selectedCategoryId).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
	}, [products, selectedCategoryId]);
	const featuredProduct = (0, import_react.useMemo)(() => {
		if (categoryProducts.length === 0) return null;
		const found = categoryProducts.find((p) => p.id === selectedProductId);
		if (found) return found;
		return categoryProducts.find((p) => p.isFeatured) || categoryProducts[0];
	}, [categoryProducts, selectedProductId]);
	const inventoryByProductId = (0, import_react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		inventory.forEach((item) => map.set(item.productId, item));
		return map;
	}, [inventory]);
	const handleSelectCategory = (catId) => {
		setPreviewModalProduct(null);
		setConfirmPurchaseProduct(null);
		setSelectedCategoryId(catId);
		const matching = products.filter((p) => p.enabled !== false && p.categoryId === catId).sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
		const nextFeatured = matching.find((p) => p.isFeatured) || matching[0];
		if (nextFeatured) setSelectedProductId(nextFeatured.id);
	};
	const handleOpenPreviewAnimation = (product) => {
		setSelectedProductId(product.id);
		setPreviewReplayKey((k) => k + 1);
		setPreviewModalProduct(product);
	};
	const handleTapGetNow = (product) => {
		const owned = inventoryByProductId.get(product.id);
		if (owned) {
			handleToggleEquip(owned, !owned.equipped);
			return;
		}
		const effectiveCoins = Math.max(walletCoins, currentUser.coins ?? 0);
		if (effectiveCoins < product.priceCoins) {
			showToast(`You need ${(product.priceCoins - effectiveCoins).toLocaleString()} more coins. Opening Coin Recharge...`, "info");
			onOpenWallet();
			return;
		}
		setConfirmPurchaseProduct(product);
	};
	const handleConfirmPurchase = async () => {
		if (!confirmPurchaseProduct || isPurchasing) return;
		setIsPurchasing(true);
		const targetProduct = confirmPurchaseProduct;
		const result = await purchaseStoreProduct({
			userId: currentUser.id,
			product: targetProduct,
			fallbackBalanceCoins: Math.max(walletCoins, currentUser.coins ?? 0)
		});
		setIsPurchasing(false);
		setConfirmPurchaseProduct(null);
		if (!result.success) {
			if (result.errorCode === "INSUFFICIENT_COINS") {
				showToast(result.message, "info");
				onOpenWallet();
				return;
			}
			showToast(result.message, result.errorCode === "ALREADY_OWNED" ? "info" : "error");
			return;
		}
		if (typeof result.newBalance === "number") {
			setWalletCoins(result.newBalance);
			onUpdateUserBalance(result.newBalance, currentUser.diamonds ?? 0);
		}
		if (onCoinsSpent && targetProduct.priceCoins > 0) onCoinsSpent(targetProduct.priceCoins, `store:${targetProduct.name}`);
		setPurchaseSuccessModal({
			product: targetProduct,
			inventoryItem: result.inventoryItem,
			newBalance: result.newBalance ?? walletCoins
		});
	};
	const handleToggleEquip = async (item, nextEquip) => {
		if (equippingId) return;
		setEquippingId(item.productId);
		const res = await toggleEquipInventoryItem({
			userId: currentUser.id,
			item,
			equip: nextEquip
		});
		setEquippingId(null);
		showToast(res.message, res.success ? "success" : "error");
	};
	const activeCategoryObj = categories.find((c) => c.id === selectedCategoryId) || DEFAULT_STORE_CATEGORIES[0];
	const featuredOwned = featuredProduct ? inventoryByProductId.get(featuredProduct.id) : void 0;
	const displayedCoins = Math.max(walletCoins, currentUser.coins ?? 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-dvh-screen w-full pb-28 md:pb-12 text-white select-none",
		style: { background: "radial-gradient(ellipse 90% 55% at 50% 0%, #360E6B 0%, #17062E 38%, #090314 76%, #05010B 100%)" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none fixed inset-0 overflow-hidden z-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute -top-24 left-1/2 -translate-x-1/2 w-[520px] h-[300px] rounded-full blur-[110px] opacity-40",
						style: { background: "radial-gradient(circle, #9333EA 0%, #EC4899 48%, transparent 75%)" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute bottom-24 -left-16 w-64 h-64 rounded-full blur-[100px] opacity-25",
						style: { background: "#7C3AED" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "absolute bottom-40 -right-16 w-64 h-64 rounded-full blur-[100px] opacity-20",
						style: { background: "#F59E0B" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-24 left-[12%] w-1.5 h-1.5 rounded-full bg-amber-300/70 animate-lenzo-particle" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute top-36 right-[16%] w-1.5 h-1.5 rounded-full bg-fuchsia-400/80 animate-lenzo-particle",
						style: { animationDelay: "0.7s" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute top-60 left-[84%] w-1 h-1 rounded-full bg-violet-300/80 animate-lenzo-particle",
						style: { animationDelay: "1.3s" }
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "absolute top-[460px] left-[8%] w-1.5 h-1.5 rounded-full bg-amber-200/60 animate-lenzo-particle",
						style: { animationDelay: "1.8s" }
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative z-10 max-w-xl mx-auto px-3.5 sm:px-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
						className: "sticky top-0 z-30 -mx-3.5 sm:-mx-5 px-3.5 sm:px-5 safe-pt-3 pb-3 backdrop-blur-xl bg-[#0D041D]/80 border-b border-purple-500/20",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => onNavigate("home"),
									"aria-label": "Go Back",
									className: "w-9 h-9 rounded-xl bg-white/[0.06] border border-purple-400/30 flex items-center justify-center text-white hover:bg-purple-500/20 hover:border-purple-300/60 active:scale-95 transition-all shadow-[0_0_12px_rgba(168,85,247,0.28)]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "w-5 h-5" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: "/app-icon.png?v=3",
										alt: "Lenzo Party LIVE",
										className: "w-7 h-7 object-contain drop-shadow-[0_2px_10px_rgba(168,85,247,0.55)] shrink-0"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-display text-lg sm:text-xl font-black italic tracking-tight bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(217,70,239,0.55)] truncate",
										style: { backgroundImage: "linear-gradient(90deg, #FFFFFF 0%, #F5D0FE 42%, #FFC84A 100%)" },
										children: "Lenzo Party"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: onOpenWallet,
									className: "group flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-[#190933]/90 border border-amber-400/45 shadow-[0_0_16px_rgba(255,200,74,0.24)] hover:border-amber-300 active:scale-95 transition-all",
									title: "Recharge Lenzo Coins",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenCoinIcon, { className: "w-4 h-4" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs sm:text-sm font-black text-amber-200 tabular-nums tracking-tight",
											children: displayedCoins.toLocaleString()
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "w-6 h-6 rounded-full bg-gradient-to-br from-[#FFC84A] via-[#F59E0B] to-[#D97706] text-[#1A0826] flex items-center justify-center shadow-[0_0_10px_rgba(255,200,74,0.65)] group-hover:scale-105 transition-transform",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5 stroke-[3]" })
										})
									]
								})
							]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "pt-4 pb-5 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreHeroCrown, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 flex items-center justify-center gap-2 sm:gap-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenLaurelBranch, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "font-display text-[32px] sm:text-[38px] leading-none font-black tracking-[0.14em] bg-clip-text text-transparent",
									style: {
										backgroundImage: "linear-gradient(180deg, #FFFDF2 0%, #FFE484 44%, #F59E0B 82%, #D97706 100%)",
										filter: "drop-shadow(0 0 18px rgba(255, 200, 74, 0.55))"
									},
									children: "STORE"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenLaurelBranch, { mirrored: true })
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						"aria-label": "Store Categories",
						className: "grid grid-cols-2 gap-3 sm:gap-3.5",
						children: categories.slice(0, 4).map((cat) => {
							const isSelected = cat.id === selectedCategoryId;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => handleSelectCategory(cat.id),
								className: `group relative rounded-[22px] p-[1.5px] text-left transition-all duration-300 active:scale-[0.97] ${isSelected ? "scale-[1.01]" : "opacity-90 hover:opacity-100"}`,
								style: {
									background: isSelected ? `linear-gradient(135deg, #FFC84A 0%, #EC4899 50%, #9333EA 100%)` : "linear-gradient(135deg, rgba(168,85,247,0.52) 0%, rgba(236,72,153,0.28) 55%, rgba(255,200,74,0.34) 100%)",
									boxShadow: isSelected ? `0 0 26px ${cat.glowColor}, 0 8px 22px rgba(0,0,0,0.6)` : "0 6px 18px rgba(0,0,0,0.5)"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative h-full rounded-[20.5px] px-2.5 pt-2.5 pb-3 flex flex-col items-center justify-between overflow-hidden",
									style: { background: isSelected ? "radial-gradient(circle at 50% 25%, #2D0D5C 0%, #140529 66%, #0B0318 100%)" : "radial-gradient(circle at 50% 25%, #210A42 0%, #100421 70%, #090213 100%)" },
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute top-0 inset-x-4 h-[1px] bg-gradient-to-r from-transparent via-white/45 to-transparent" }),
										isSelected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-amber-300 shadow-[0_0_12px_#FFC84A] animate-pulse" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "relative w-[86px] h-[86px] sm:w-[98px] sm:h-[98px] rounded-2xl overflow-hidden flex items-center justify-center",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `pointer-events-none absolute inset-1 rounded-full blur-lg transition-opacity duration-300 ${isSelected ? "opacity-65" : "opacity-30 group-hover:opacity-50"}`,
												style: { background: cat.glowColor }
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: cat.imageUrl,
												alt: cat.title,
												className: `relative z-10 w-full h-full object-cover rounded-2xl transition-transform duration-300 ${isSelected ? "scale-105" : "group-hover:scale-105"}`
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2 text-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: `font-display text-[13px] sm:text-sm font-black tracking-[0.08em] uppercase ${isSelected ? "text-amber-200 drop-shadow-[0_0_10px_rgba(255,200,74,0.65)]" : "text-white/95"}`,
												children: cat.title
											})
										})
									]
								})
							}, cat.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-3 px-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "w-1.5 h-5 rounded-full",
									style: {
										background: `linear-gradient(180deg, ${activeCategoryObj.accentFrom}, ${activeCategoryObj.accentTo})`,
										boxShadow: `0 0 10px ${activeCategoryObj.glowColor}`
									}
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-display text-sm sm:text-base font-black tracking-[0.1em] uppercase text-white",
									children: activeCategoryObj.title
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[11px] font-bold text-purple-200/80",
								children: [
									categoryProducts.length,
									" ",
									categoryProducts.length === 1 ? "Item" : "Items"
								]
							})]
						}), categoryProducts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-purple-500/30 bg-[#140729]/80 p-6 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-7 h-7 text-purple-300 mx-auto mb-2" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm font-bold text-white",
									children: ["No active items in ", activeCategoryObj.title]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-purple-200/70 mt-1",
									children: "New luxury items added from Lenzo Admin will appear here automatically."
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-3 gap-2.5 sm:gap-3",
							children: categoryProducts.map((product) => {
								const isSelected = featuredProduct?.id === product.id;
								const ownedItem = inventoryByProductId.get(product.id);
								const isEquipped = Boolean(ownedItem?.equipped);
								return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									onClick: () => setSelectedProductId(product.id),
									role: "button",
									tabIndex: 0,
									onKeyDown: (e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											setSelectedProductId(product.id);
										}
									},
									className: `group relative rounded-[18px] p-[1.5px] cursor-pointer transition-all duration-200 active:scale-[0.97] ${isSelected ? "-translate-y-0.5" : "hover:-translate-y-0.5"}`,
									style: {
										background: isSelected ? "linear-gradient(155deg, #FFC84A 0%, #EC4899 52%, #8B5CF6 100%)" : "linear-gradient(155deg, rgba(168,85,247,0.5) 0%, rgba(124,58,237,0.2) 100%)",
										boxShadow: isSelected ? `0 0 22px ${product.glowColor}` : "0 4px 14px rgba(0,0,0,0.45)"
									},
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative h-full rounded-[16.5px] px-2 pt-2.5 pb-2.5 flex flex-col items-center text-center overflow-hidden",
										style: { background: isSelected ? "linear-gradient(180deg, #270D4F 0%, #120526 100%)" : "linear-gradient(180deg, #1B0938 0%, #0E041E 100%)" },
										children: [
											ownedItem && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `absolute top-1.5 right-1.5 z-20 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${isEquipped ? "bg-emerald-500/90 text-white shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-purple-500/80 text-white"}`,
												children: isEquipped ? "ON" : "OWNED"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "my-0.5 flex items-center justify-center",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
													product,
													userAvatar: currentUser.avatar,
													userName: currentUser.name,
													size: "sm",
													isPlaying: isSelected
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-1.5 w-full truncate font-display text-[11px] sm:text-xs font-extrabold text-white tracking-tight",
												children: product.name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1 flex items-center justify-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenCoinIcon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[11px] sm:text-xs font-black text-amber-300 tabular-nums",
													children: product.priceCoins.toLocaleString()
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
												type: "button",
												onClick: (e) => {
													e.stopPropagation();
													handleOpenPreviewAnimation(product);
												},
												className: "mt-2 w-full py-1.5 px-2 rounded-lg bg-gradient-to-r from-[#7C3AED]/85 via-[#A855F7]/85 to-[#D946EF]/85 hover:from-[#8B5CF6] hover:to-[#EC4899] border border-purple-300/40 text-[10px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1 shadow-[0_0_12px_rgba(168,85,247,0.45)] active:scale-95 transition-all",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "w-2.5 h-2.5 fill-current" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Preview" })]
											})
										]
									})
								}, product.id);
							})
						})]
					}),
					featuredProduct && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
						"aria-label": "Featured Product Preview",
						className: "mt-5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative rounded-[24px] p-[1.5px]",
							style: {
								background: "linear-gradient(135deg, #FFC84A 0%, #EC4899 45%, #8B5CF6 100%)",
								boxShadow: `0 0 32px ${featuredProduct.glowColor}, 0 14px 30px rgba(0,0,0,0.65)`
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative rounded-[22.5px] p-4 sm:p-5 overflow-hidden",
								style: { background: "radial-gradient(circle at 22% 50%, #340F68 0%, #16062E 52%, #0B0319 100%)" },
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-4 sm:gap-5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => handleOpenPreviewAnimation(featuredProduct),
										role: "button",
										tabIndex: 0,
										onKeyDown: (e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleOpenPreviewAnimation(featuredProduct);
											}
										},
										className: "relative shrink-0 cursor-pointer group",
										title: "Tap to open full-stage animation preview",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "rounded-2xl p-2 border border-purple-400/35 bg-[#120526]/85 flex items-center justify-center",
											style: { boxShadow: `inset 0 0 22px ${featuredProduct.glowColor}` },
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
												product: featuredProduct,
												userAvatar: currentUser.avatar,
												userName: currentUser.name,
												size: "lg",
												isPlaying: !previewModalProduct
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#190833] border border-purple-400/50 text-[9px] font-black uppercase tracking-wider text-purple-200 whitespace-nowrap shadow",
											children: "Live FX"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5 flex-wrap",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[10px] font-black uppercase tracking-[0.12em] text-fuchsia-300",
													children: activeCategoryObj.title
												}), featuredProduct.badgeText && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/45 text-[9px] font-black uppercase text-amber-200",
													children: featuredProduct.badgeText
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "mt-1 font-display text-xl sm:text-2xl font-black text-white leading-tight truncate",
												children: featuredProduct.name
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1.5 flex items-center gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenCoinIcon, { className: "w-5 h-5" }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-lg sm:text-xl font-black text-amber-300 tabular-nums",
														children: featuredProduct.priceCoins.toLocaleString()
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-xs font-bold text-amber-200/80 uppercase",
														children: "Coins"
													})
												]
											}),
											featuredProduct.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "mt-1.5 text-[11px] leading-relaxed text-purple-100/75 line-clamp-2",
												children: featuredProduct.description
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-3.5 flex flex-col sm:flex-row gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => handleOpenPreviewAnimation(featuredProduct),
													className: "flex-1 py-2.5 px-3 rounded-xl bg-purple-600/35 hover:bg-purple-600/55 border border-purple-300/50 text-[11px] font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 shadow-[0_0_16px_rgba(168,85,247,0.35)] active:scale-95 transition-all",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, { className: "w-3.5 h-3.5 fill-current text-fuchsia-200" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "whitespace-nowrap",
														children: "Preview Animation"
													})]
												}), featuredOwned ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													disabled: equippingId === featuredProduct.id,
													onClick: () => void handleToggleEquip(featuredOwned, !featuredOwned.equipped),
													className: `flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all ${featuredOwned.equipped ? "bg-emerald-500/25 border border-emerald-400/70 text-emerald-200 shadow-[0_0_16px_rgba(16,185,129,0.35)]" : "bg-gradient-to-r from-[#9333EA] to-[#EC4899] border border-pink-300/50 text-white shadow-[0_0_18px_rgba(236,72,153,0.5)]"}`,
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-4 h-4 stroke-[3]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: equippingId === featuredProduct.id ? "Updating..." : featuredOwned.equipped ? "Equipped" : "Equip Now" })]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => handleTapGetNow(featuredProduct),
													className: "flex-1 py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_22px_rgba(255,200,74,0.55)]",
													style: { background: "linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)" },
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Get Now" })]
												})]
											})
										]
									})]
								})]
							})
						})
					})
				]
			}),
			toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed safe-top-offset-16 left-1/2 -translate-x-1/2 z-[80] w-[92%] max-w-sm pointer-events-none",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `px-4 py-3 rounded-2xl border backdrop-blur-xl text-xs font-bold text-center shadow-2xl ${toast.type === "success" ? "bg-emerald-950/90 border-emerald-400/60 text-emerald-100" : toast.type === "error" ? "bg-rose-950/90 border-rose-400/60 text-rose-100" : "bg-[#1D0A3D]/95 border-purple-400/60 text-purple-100"}`,
					children: toast.text
				})
			}),
			previewModalProduct && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4",
				onClick: () => setPreviewModalProduct(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative w-full max-w-sm rounded-[28px] p-[1.5px]",
					style: {
						background: "linear-gradient(145deg, #FFC84A 0%, #EC4899 50%, #7C3AED 100%)",
						boxShadow: `0 0 48px ${previewModalProduct.glowColor}`
					},
					onClick: (e) => e.stopPropagation(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative rounded-[26.5px] p-5 text-center overflow-hidden",
						style: { background: "radial-gradient(circle at 50% 28%, #36106B 0%, #140529 58%, #090214 100%)" },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setPreviewModalProduct(null),
								"aria-label": "Close Preview",
								className: "absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[10px] font-black uppercase tracking-[0.16em] text-amber-300",
								children: "Live Animation Preview"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-1 font-display text-2xl font-black text-white",
								children: previewModalProduct.name
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "my-5 flex items-center justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "p-4 rounded-3xl border border-purple-400/35 bg-[#0C031A]/80 shadow-inner",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
										product: previewModalProduct,
										userAvatar: currentUser.avatar,
										userName: currentUser.name,
										size: "xl",
										isPlaying: true
									})
								}, `${previewModalProduct.id}_${previewReplayKey}`)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-purple-100/80 leading-relaxed px-2",
								children: previewModalProduct.description
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 flex items-center justify-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenCoinIcon, { className: "w-5 h-5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xl font-black text-amber-300 tabular-nums",
									children: [previewModalProduct.priceCoins.toLocaleString(), " Coins"]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 grid grid-cols-2 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setPreviewReplayKey((k) => k + 1),
									className: "py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/15 border border-purple-300/35 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 active:scale-95 transition-all",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Replay FX" })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										const target = previewModalProduct;
										setPreviewModalProduct(null);
										handleTapGetNow(target);
									},
									className: "py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,200,74,0.55)]",
									style: { background: "linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)" },
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: inventoryByProductId.has(previewModalProduct.id) ? inventoryByProductId.get(previewModalProduct.id)?.equipped ? "Unequip" : "Equip Now" : "Get Now" })]
								})]
							})
						]
					})
				})
			}),
			confirmPurchaseProduct && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-[75] bg-black/85 backdrop-blur-md flex items-center justify-center p-4",
				onClick: () => !isPurchasing && setConfirmPurchaseProduct(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-full max-w-sm rounded-[26px] p-[1.5px]",
					style: {
						background: "linear-gradient(145deg, #FFC84A 0%, #A855F7 55%, #EC4899 100%)",
						boxShadow: "0 0 40px rgba(168,85,247,0.55)"
					},
					onClick: (e) => e.stopPropagation(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-[24.5px] bg-[#130527] p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "w-5 h-5 text-amber-300" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-display text-base font-black uppercase tracking-wide text-white",
										children: "Confirm Purchase"
									})]
								}), !isPurchasing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setConfirmPurchaseProduct(null),
									className: "w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/80 hover:text-white",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.04] border border-purple-400/25",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
									product: confirmPurchaseProduct,
									userAvatar: currentUser.avatar,
									userName: currentUser.name,
									size: "sm",
									isPlaying: true
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-display text-base font-black text-white truncate",
										children: confirmPurchaseProduct.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoldenCoinIcon, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-sm font-black text-amber-300 tabular-nums",
											children: [confirmPurchaseProduct.priceCoins.toLocaleString(), " Coins"]
										})]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 space-y-2 rounded-2xl bg-[#0B0318] border border-white/10 p-3.5 text-xs",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-purple-200/80",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wallet, { className: "w-3.5 h-3.5 text-amber-300" }), "Current Balance"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-white tabular-nums",
											children: [displayedCoins.toLocaleString(), " Coins"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-purple-200/80",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "w-3.5 h-3.5 text-fuchsia-300" }), "Item Price"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-rose-300 tabular-nums",
											children: [
												"-",
												confirmPurchaseProduct.priceCoins.toLocaleString(),
												" Coins"
											]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "pt-2 border-t border-white/10 flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-white",
											children: "Balance After"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-black text-amber-300 tabular-nums",
											children: [Math.max(0, displayedCoins - confirmPurchaseProduct.priceCoins).toLocaleString(), " Coins"]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 grid grid-cols-2 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isPurchasing,
									onClick: () => setConfirmPurchaseProduct(null),
									className: "py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-purple-100 disabled:opacity-50",
									children: "Cancel"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: isPurchasing,
									onClick: () => void handleConfirmPurchase(),
									className: "py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-[#1C072B] disabled:opacity-60 shadow-[0_0_20px_rgba(255,200,74,0.5)]",
									style: { background: "linear-gradient(135deg, #FFF3B0 0%, #FFC84A 48%, #F59E0B 100%)" },
									children: isPurchasing ? "Processing..." : "Confirm Buy"
								})]
							})
						]
					})
				})
			}),
			purchaseSuccessModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-[78] bg-black/85 backdrop-blur-md flex items-center justify-center p-4",
				onClick: () => setPurchaseSuccessModal(null),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "w-full max-w-sm rounded-[26px] p-[1.5px]",
					style: {
						background: "linear-gradient(145deg, #34D399 0%, #FFC84A 50%, #A855F7 100%)",
						boxShadow: "0 0 44px rgba(52,211,153,0.45)"
					},
					onClick: (e) => e.stopPropagation(),
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-[24.5px] bg-[#130527] p-6 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(16,185,129,0.5)]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-7 h-7 text-emerald-300" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-display text-xl font-black text-white",
								children: "Purchase Successful!"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 text-xs text-purple-200/80",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-amber-200",
										children: purchaseSuccessModal.product.name
									}),
									" ",
									"has been added to your Lenzo Party inventory."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "my-4 flex justify-center",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StoreAssetPreview, {
									product: purchaseSuccessModal.product,
									userAvatar: currentUser.avatar,
									userName: currentUser.name,
									size: "md",
									isPlaying: true
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[11px] font-bold text-amber-200/90 mb-4",
								children: [
									"Remaining Balance: ",
									purchaseSuccessModal.newBalance.toLocaleString(),
									" Coins"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-2 gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setPurchaseSuccessModal(null),
									className: "py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white",
									children: "Done"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: async () => {
										const inv = purchaseSuccessModal.inventoryItem || inventoryByProductId.get(purchaseSuccessModal.product.id);
										setPurchaseSuccessModal(null);
										if (inv) await handleToggleEquip(inv, true);
									},
									className: "py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#EC4899] text-xs font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(236,72,153,0.55)]",
									children: "Equip Now"
								})]
							})
						]
					})
				})
			})
		]
	});
};
export { StoreScreen };
