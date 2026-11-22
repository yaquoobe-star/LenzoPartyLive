import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { A as Shield, C as Star, Cn as require_react, Ft as EyeOff, G as Plus, H as RefreshCw, Ht as Crown, J as Phone, Jt as Clock, M as ShieldCheck, Nt as FileClock, Pt as Eye, Qt as CircleAlert, R as Save, Vt as Database, Xt as CircleCheck, Yt as CircleX, Z as PenLine, gn as Award, ht as Layers, k as ShoppingBag, l as Users, ln as Building2, m as Upload, mn as Ban, nt as Minus, ot as MessageCircle, qt as Coins, r as X, rn as Check, v as Trash2, w as Sparkles, yt as IdCard } from "./vendor-icons-8ivBScnZ.js";
import { C as updateDoc, O as doc } from "./vendor-firebase-pU_0pKhI.js";
import { i as db, r as auth } from "./firebase-zc-_OxQs.js";
import { n as apiFetch } from "./apiConfig-CPEwW-gN.js";
import { C as SuperVipTierBadge, St as getProgressionMathAudit, b as LevelBadge, d as VerifiedTick, et as uploadMediaDataUrlWithProgress, g as buildWhatsAppUrl, h as adminSetAgencyStatus, m as adminReviewAgencyApplication, nt as uploadReelVideoAndThumbnail, p as adminAdjustAgencyCoinBalance, pt as ALL_100_LEVELS, v as subscribeAllAgenciesForAdmin, w as VipTierBadge, x as LevelEmblemBadge, y as subscribeAllAgencyApplications } from "./index-BNHhc6LD.js";
import { f as STORE_ANIMATION_PRESET_OPTIONS, i as adminSeedDefaultStoreCatalog, n as adminDeleteStoreProduct, r as adminSaveStoreProduct, s as subscribeStoreProducts, t as StoreAssetPreview, u as DEFAULT_STORE_CATEGORIES } from "./StoreAssetPreview-BMYpByWo.js";
import { i as require_jsx_runtime } from "./vendor-motion-DFP_D_jg.js";
// src/components/screens/AdminStoreTab.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
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
// src/components/screens/AdminAgenciesTab.tsx
var AdminAgenciesTab = ({ onNotify, onError }) => {
	const [applications, setApplications] = (0, import_react.useState)([]);
	const [agencies, setAgencies] = (0, import_react.useState)([]);
	const [subTab, setSubTab] = (0, import_react.useState)("applications");
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
		const res = await adminAdjustAgencyCoinBalance(agency.id, sign * Math.floor(raw));
		setBusyId(null);
		if (res.success) {
			onNotify(`${agency.name} balance updated to ${(res.newBalance ?? 0).toLocaleString()} coins.`);
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
						}), isCoinSeller ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "p-3 rounded-xl bg-black/35 border border-amber-400/20 space-y-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
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
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
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
										placeholder: "Coins amount (e.g. 50000)",
										className: "flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: busyId === agency.id,
										onClick: () => void handleAdjustBalance(agency, 1),
										className: "px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Add Coins" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										disabled: busyId === agency.id,
										onClick: () => void handleAdjustBalance(agency, -1),
										className: "px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/45 border border-rose-400/35 text-rose-200 text-xs font-black flex items-center gap-1 shrink-0 disabled:opacity-50",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Deduct" })]
									})
								]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between p-3 rounded-xl bg-black/35 border border-fuchsia-400/20 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "w-4 h-4 text-fuchsia-300" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[#C5B9DE]",
										children: "Total Active Hosts:"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-black text-white tabular-nums",
										children: agency.totalHosts || 0
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] text-[#A59AB8]",
								children: agency.isOnline ? "Accepting Host Requests" : "Away"
							})]
						})]
					}, agency.id);
				})
			})
		]
	});
};
// src/components/screens/AdminProgressionModal.tsx
var AdminProgressionModal = ({ isOpen, onClose, currentUserEmail }) => {
	const [activeTab, setActiveTab] = (0, import_react.useState)("agencies");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	const [statusMsg, setStatusMsg] = (0, import_react.useState)(null);
	const [overview, setOverview] = (0, import_react.useState)(null);
	const [editingVip, setEditingVip] = (0, import_react.useState)(null);
	const [editingSuperVip, setEditingSuperVip] = (0, import_react.useState)(null);
	const [editingAch, setEditingAch] = (0, import_react.useState)(null);
	const [adjustTargetUid, setAdjustTargetUid] = (0, import_react.useState)("");
	const [adjustCoins, setAdjustCoins] = (0, import_react.useState)("0");
	const [adjustAchId, setAdjustAchId] = (0, import_react.useState)("");
	const [adjustVerificationTier, setAdjustVerificationTier] = (0, import_react.useState)("");
	const [adjustVerifiedTag, setAdjustVerifiedTag] = (0, import_react.useState)("");
	const [adjustReason, setAdjustReason] = (0, import_react.useState)("Admin QA / Support Verification");
	const getTokenHeaders = async () => {
		const token = await auth.currentUser?.getIdToken(true);
		return token ? { Authorization: `Bearer ${token}` } : {};
	};
	const fetchOverview = async () => {
		setLoading(true);
		setError(null);
		try {
			const headers = await getTokenHeaders();
			const res = await apiFetch("/api/admin/progression/overview", { headers });
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(data.error || `Access denied (HTTP ${res.status})`);
				setOverview(null);
			} else setOverview(data);
		} catch (err) {
			setError(err?.message || "Failed to load admin progression overview.");
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (isOpen) fetchOverview();
	}, [isOpen]);
	if (!isOpen) return null;
	const notify = (msg) => {
		setStatusMsg(msg);
		setTimeout(() => setStatusMsg(null), 3e3);
	};
	const handleSaveConfig = async (section, id, patch) => {
		try {
			const headers = await getTokenHeaders();
			const res = await apiFetch("/api/admin/progression/config", {
				method: "PUT",
				headers,
				body: JSON.stringify({
					section,
					id,
					patch
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(data.error || "Failed to save configuration");
				return;
			}
			setEditingVip(null);
			setEditingSuperVip(null);
			setEditingAch(null);
			notify("Configuration saved & logged in audit trail");
			await fetchOverview();
		} catch (err) {
			setError(err?.message || "Save failed");
		}
	};
	const handleAdjustUser = async (e) => {
		e.preventDefault();
		if (!adjustTargetUid.trim()) {
			setError("Target User ID is required.");
			return;
		}
		const targetUid = adjustTargetUid.trim();
		try {
			const headers = await getTokenHeaders();
			const res = await apiFetch("/api/admin/progression/adjust-user", {
				method: "POST",
				headers,
				body: JSON.stringify({
					targetUserId: targetUid,
					addCoins: Number(adjustCoins || 0),
					awardAchievementId: adjustAchId || void 0,
					verificationTier: adjustVerificationTier || void 0,
					verifiedTag: adjustVerifiedTag.trim() ? adjustVerifiedTag.trim() : void 0,
					reason: adjustReason.trim() || "Admin adjustment"
				})
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				setError(data.error || "Adjustment failed");
				return;
			}
			if (adjustVerificationTier === "blue" || adjustVerificationTier === "gold" || adjustVerificationTier === "none") try {
				const userRef = doc(db, "users", targetUid);
				const patch = {
					verificationTier: adjustVerificationTier,
					isVerified: adjustVerificationTier !== "none"
				};
				if (adjustVerifiedTag.trim()) patch.verifiedTag = adjustVerifiedTag.trim().slice(0, 32);
				else if (adjustVerificationTier === "none") patch.verifiedTag = "";
				await updateDoc(userRef, patch);
			} catch (fsErr) {
				console.warn("Firestore user verification sync notice:", fsErr);
			}
			const verifySummary = adjustVerificationTier === "gold" ? " · Golden Tick (Legend)" : adjustVerificationTier === "blue" ? " · Blue Tick (Respect)" : adjustVerificationTier === "none" ? " · Unverified" : "";
			notify(`Updated user ${targetUid} → Level ${data.progression?.currentLevel}${verifySummary}`);
			await fetchOverview();
		} catch (err) {
			setError(err?.message || "Adjustment failed");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-4xl bg-[#0F071C] border border-[#FFC84A]/35 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]",
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "px-5 py-4 bg-gradient-to-r from-[#24103F] via-[#1B0C31] to-[#140924] border-b border-white/10 flex items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-10 h-10 rounded-2xl bg-[#FFC84A]/20 border border-[#FFC84A]/50 text-[#FFC84A] flex items-center justify-center shrink-0",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-5 h-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-base sm:text-lg font-black text-white truncate",
								children: "Lenzo Admin — Progression Management Console"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-[#C5B9DE] truncate",
								children: [
									"Authorized Admin: ",
									currentUserEmail || auth.currentUser?.email || "Not Verified",
									" · Audited RBAC Protected"
								]
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 shrink-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: fetchOverview,
							className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center",
							title: "Refresh",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-4 h-4 ${loading ? "animate-spin" : ""}` })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
						})]
					})]
				}),
				statusMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-5 mt-3 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: statusMsg })]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-5 mt-3 px-4 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-bold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "w-4 h-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error })]
				}),
				(() => {
					const localAudit = getProgressionMathAudit();
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-5 mt-3 p-3 rounded-2xl bg-[#180C2F] border border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#B9AECF] block",
								children: "Total Levels"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-black font-mono text-white",
								children: localAudit.totalLevels
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#B9AECF] block",
								children: "Lv 1–50 Exact Sum"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-black font-mono text-emerald-400",
								children: localAudit.sumLevels1To50.toLocaleString()
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#B9AECF] block",
								children: "Lv 51–100 Exact Sum"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-black font-mono text-fuchsia-300",
								children: localAudit.sumLevels51To100.toLocaleString()
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#B9AECF] block",
								children: "Grand Total (Exact)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-black font-mono text-[#FFC84A]",
								children: localAudit.grandTotalCoins.toLocaleString()
							})] })
						]
					});
				})(),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "px-5 pt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar",
					children: [
						{
							id: "agencies",
							label: "Agencies",
							icon: Building2
						},
						{
							id: "levels",
							label: "Levels 0–100",
							icon: Layers
						},
						{
							id: "vip",
							label: "VIP & Super VIP",
							icon: Crown
						},
						{
							id: "achievements",
							label: "Achievements",
							icon: Award
						},
						{
							id: "store",
							label: "Store Catalog",
							icon: ShoppingBag
						},
						{
							id: "users",
							label: "Users & Adjust",
							icon: Users
						},
						{
							id: "audit",
							label: "Audit Logs",
							icon: FileClock
						}
					].map((tab) => {
						const Icon = tab.icon;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setActiveTab(tab.id),
							className: `px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shrink-0 transition-all ${activeTab === tab.id ? "bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-[#090611]" : "bg-white/[0.06] text-[#C5B9DE] hover:text-white"}`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tab.label })]
						}, tab.id);
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex-1 overflow-y-auto p-5 space-y-4",
					children: activeTab === "agencies" ? auth.currentUser?.email?.toLowerCase() === "yaquoobe@gmail.com" || currentUserEmail?.toLowerCase() === "yaquoobe@gmail.com" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminAgenciesTab, {
						onNotify: (msg) => notify(msg),
						onError: (msg) => setError(msg)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-14 text-center space-y-2 rounded-2xl bg-white/[0.03] border border-white/10 px-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-10 h-10 text-rose-400 mx-auto" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold text-white",
							children: "Administrator Authorization Required"
						})]
					}) : activeTab === "store" ? auth.currentUser?.email?.toLowerCase() === "yaquoobe@gmail.com" || currentUserEmail?.toLowerCase() === "yaquoobe@gmail.com" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminStoreTab, {
						onNotify: (msg) => notify(msg),
						onError: (msg) => setError(msg)
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-14 text-center space-y-2 rounded-2xl bg-white/[0.03] border border-white/10 px-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-10 h-10 text-rose-400 mx-auto" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-bold text-white",
							children: "Administrator Authorization Required"
						})]
					}) : loading && !overview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-16 flex flex-col items-center gap-2 text-[#B9AECF] text-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-8 h-8 border-2 border-[#FFC84A] border-t-transparent rounded-full animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Verifying Admin Token & Loading Progression Registry..." })]
					}) : !overview ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-14 text-center space-y-2 rounded-2xl bg-white/[0.03] border border-white/10 px-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "w-10 h-10 text-rose-400 mx-auto" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm font-bold text-white",
								children: "Administrator Authorization Required"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#B9AECF] max-w-md mx-auto",
								children: "Only the verified administrator account (yaquoobe@gmail.com) can access or modify Lenzo Party progression tables and audit logs."
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
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
						activeTab === "vip" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-black uppercase tracking-wider text-[#FFC84A] mb-2.5 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "12 VIP Tiers (Unlocks Every 8 Levels)" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
								children: overview.vipTiers.map((vip) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
											tier: vip.tier,
											size: "xs"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-mono text-[#C5B9DE]",
											children: ["Unlock: Lv.", vip.unlockLevel]
										})]
									}), editingVip?.tier === vip.tier ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: editingVip.frameName,
												onChange: (e) => setEditingVip({
													...editingVip,
													frameName: e.target.value
												}),
												className: "w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white",
												placeholder: "Frame Name"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: editingVip.perk0,
												onChange: (e) => setEditingVip({
													...editingVip,
													perk0: e.target.value
												}),
												className: "w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white",
												placeholder: "Primary Perk"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													onClick: () => handleSaveConfig("vip", vip.tier, {
														frameName: editingVip.frameName,
														perks: [editingVip.perk0, ...vip.perks.slice(1)]
													}),
													className: "px-3 py-1.5 rounded-lg bg-[#FFC84A] text-black text-xs font-black flex items-center gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Save" })]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => setEditingVip(null),
													className: "px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold",
													children: "Cancel"
												})]
											})
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-bold text-white truncate",
												children: vip.frameName
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-[#B9AECF] truncate",
												children: vip.perks[0]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setEditingVip({
												tier: vip.tier,
												frameName: vip.frameName,
												perk0: vip.perks[0] || ""
											}),
											className: "px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0",
											children: "Edit"
										})]
									})]
								}, vip.tier))
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-black uppercase tracking-wider text-fuchsia-300 mb-2.5 flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "6 Super VIP Tiers (Unlocks Every 12 Levels)" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
								children: overview.superVipTiers.map((sv) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/25 space-y-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
											tier: sv.tier,
											size: "xs"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] font-mono text-fuchsia-200",
											children: ["Unlock: Lv.", sv.unlockLevel]
										})]
									}), editingSuperVip?.tier === sv.tier ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: editingSuperVip.name,
												onChange: (e) => setEditingSuperVip({
													...editingSuperVip,
													name: e.target.value
												}),
												className: "w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: editingSuperVip.frameName,
												onChange: (e) => setEditingSuperVip({
													...editingSuperVip,
													frameName: e.target.value
												}),
												className: "w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex gap-2",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => handleSaveConfig("super_vip", sv.tier, {
														name: editingSuperVip.name,
														frameName: editingSuperVip.frameName
													}),
													className: "px-3 py-1.5 rounded-lg bg-fuchsia-500 text-white text-xs font-black",
													children: "Save"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => setEditingSuperVip(null),
													className: "px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold",
													children: "Cancel"
												})]
											})
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-bold text-white truncate",
												children: sv.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[10px] text-[#C5B9DE] truncate",
												children: sv.frameName
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setEditingSuperVip({
												tier: sv.tier,
												name: sv.name,
												frameName: sv.frameName
											}),
											className: "px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold shrink-0",
											children: "Edit"
										})]
									})]
								}, sv.tier))
							})] })]
						}),
						activeTab === "achievements" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-2.5",
							children: overview.achievements.map((ach) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2",
								children: editingAch?.id === ach.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: editingAch.name,
												onChange: (e) => setEditingAch({
													...editingAch,
													name: e.target.value
												}),
												className: "px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: editingAch.targetValue,
												onChange: (e) => setEditingAch({
													...editingAch,
													targetValue: Number(e.target.value)
												}),
												className: "px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white font-mono"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: editingAch.description,
											onChange: (e) => setEditingAch({
												...editingAch,
												description: e.target.value
											}),
											className: "w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 text-xs text-white"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => handleSaveConfig("achievement", ach.id, {
													name: editingAch.name,
													description: editingAch.description,
													targetValue: editingAch.targetValue
												}),
												className: "px-3 py-1.5 rounded-lg bg-[#FFC84A] text-black text-xs font-black",
												children: "Save Changes"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setEditingAch(null),
												className: "px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold",
												children: "Cancel"
											})]
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-extrabold text-white",
												children: ach.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-[#FFC84A]",
												children: ["Target: ", ach.targetValue.toLocaleString()]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-[#C5B9DE] mt-0.5",
											children: ach.description
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setEditingAch({
											id: ach.id,
											name: ach.name,
											description: ach.description,
											targetValue: ach.targetValue
										}),
										className: "px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold shrink-0",
										children: "Edit"
									})]
								})
							}, ach.id))
						}),
						activeTab === "users" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
								onSubmit: handleAdjustUser,
								className: "p-4 rounded-2xl bg-[#180C2F] border border-[#FFC84A]/30 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
										children: "Audited User Progression Adjustment"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: adjustTargetUid,
												onChange: (e) => setAdjustTargetUid(e.target.value),
												placeholder: "Target User UID",
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												value: adjustCoins,
												onChange: (e) => setAdjustCoins(e.target.value),
												placeholder: "Qualifying Coins Delta (+ or -)",
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white font-mono"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: adjustAchId,
												onChange: (e) => setAdjustAchId(e.target.value),
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "",
													children: "Optional: Award Achievement Badge..."
												}), overview.achievements.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
													value: a.id,
													children: [
														a.name,
														" (",
														a.id,
														")"
													]
												}, a.id))]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
												value: adjustVerificationTier,
												onChange: (e) => setAdjustVerificationTier(e.target.value),
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "",
														children: "Verification Badge: Keep Current"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "blue",
														children: "Blue Tick — Verified for Respect"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "gold",
														children: "Golden Tick — Verified for Legends"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "none",
														children: "Remove Verification Tick"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "auto",
														children: "Auto (Level / VIP Based)"
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: adjustVerifiedTag,
												onChange: (e) => setAdjustVerifiedTag(e.target.value),
												maxLength: 32,
												placeholder: "Optional Custom Tag (e.g. Respect / Legend)",
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												value: adjustReason,
												onChange: (e) => setAdjustReason(e.target.value),
												placeholder: "Audit Reason (Required)",
												className: "px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-xs text-white sm:col-span-2"
											})
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										className: "px-4 py-2 rounded-xl bg-gradient-to-r from-[#FFC84A] to-[#F59E0B] text-black text-xs font-black",
										children: "Apply Audited Adjustment"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-xs font-bold uppercase tracking-wider text-[#B9AECF]",
									children: [
										"Tracked Users (",
										overview.users.length,
										")"
									]
								}), overview.users.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-[#B9AECF] py-6 text-center rounded-2xl bg-white/[0.03]",
									children: "No users recorded in backend progression store yet."
								}) : overview.users.map((u) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 flex-wrap",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs font-bold text-white",
													children: u.userName || u.userId
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
													level: u.progression.currentLevel,
													size: "xs"
												}),
												u.progression.highestUnlockedVipTier > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VipTierBadge, {
													tier: u.progression.highestUnlockedVipTier,
													size: "xs"
												}),
												u.progression.highestUnlockedSuperVipTier > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SuperVipTierBadge, {
													tier: u.progression.highestUnlockedSuperVipTier,
													size: "xs"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[10px] font-mono text-[#B9AECF] mt-1",
											children: [
												"UID: ",
												u.userId,
												" · Spent: ",
												u.progression.totalQualifyingCoinsSpent.toLocaleString(),
												" coins ·",
												" ",
												u.earnedAchievementsCount,
												"/10 badges"
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setAdjustTargetUid(u.userId),
										className: "px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold",
										children: "Select UID"
									})]
								}, u.userId))]
							})]
						}),
						activeTab === "audit" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "text-xs font-black uppercase tracking-wider text-[#FFC84A]",
								children: [
									"Chronological Audit & Coin Deduction Trail (",
									overview.auditLogs.length,
									")"
								]
							}), overview.auditLogs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-[#B9AECF] py-8 text-center rounded-2xl bg-white/[0.03]",
								children: "No audit events logged yet."
							}) : overview.auditLogs.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 text-[10px]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-black uppercase tracking-wider text-[#FFC84A]",
											children: log.action
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-[#B9AECF]",
											children: new Date(log.timestamp).toLocaleString()
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs font-semibold text-white",
										children: log.summary
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[10px] font-mono text-[#B9AECF]",
										children: [
											"Actor: ",
											log.actorEmail || log.actorId,
											log.targetUserId ? ` · Target: ${log.targetUserId}` : ""
										]
									})
								]
							}, log.id))]
						})
					] })
				})
			]
		})
	});
};
export { AdminProgressionModal };
