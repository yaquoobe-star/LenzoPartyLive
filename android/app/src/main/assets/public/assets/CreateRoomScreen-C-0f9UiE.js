import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { D as Sparkles, Dt as Image, Kt as Eye, Ln as ArrowLeft, bt as LoaderCircle, d as Users, g as Upload, qt as EyeOff, tn as Crown, vn as Check, vt as Lock, xn as Camera, zn as require_react } from "./vendor-icons-RA12uJu8.js";
import { r as auth } from "./firebase-CIREZBAE.js";
import { At as getActiveSeatCapacity, Et as uploadUserImage, Mt as isSeatModeUnlockedForLevel, Ot as PARTY_SEAT_TIERS, c as DEFAULT_PARTY_BACKGROUND_ID, d as resolvePartyRoomBackground, jt as getAllowedSeatTierForLevel, kt as clampPartyMaxSeatsForHostLevel, l as PARTY_BACKGROUND_PRESETS, u as resolvePartyBackgroundImageUrl, wt as uploadPartyBackgroundImage } from "./index-BPJaaocP.js";
import { i as require_jsx_runtime } from "./vendor-motion-BNHB1rOc.js";
// src/components/screens/CreateRoomScreen.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CreateRoomScreen = ({ currentUser, onClose, onCreateRoom }) => {
	const seatTierState = getAllowedSeatTierForLevel(currentUser.level);
	const hostLevel = seatTierState.hostLevel;
	const [roomName, setRoomName] = (0, import_react.useState)("");
	const [maxSeats, setMaxSeats] = (0, import_react.useState)(() => seatTierState.maxUnlockedSeats);
	const hasManuallyPickedSeatsRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		setMaxSeats((prev) => {
			if (!hasManuallyPickedSeatsRef.current) return seatTierState.maxUnlockedSeats;
			return clampPartyMaxSeatsForHostLevel(prev, hostLevel);
		});
	}, [hostLevel, seatTierState.maxUnlockedSeats]);
	const [isPrivate, setIsPrivate] = (0, import_react.useState)(false);
	const [password, setPassword] = (0, import_react.useState)("");
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [announcement, setAnnouncement] = (0, import_react.useState)("");
	const [coverUrl, setCoverUrl] = (0, import_react.useState)("https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80");
	const [backgroundType, setBackgroundType] = (0, import_react.useState)("preset");
	const [backgroundId, setBackgroundId] = (0, import_react.useState)(DEFAULT_PARTY_BACKGROUND_ID);
	const [backgroundImage, setBackgroundImage] = (0, import_react.useState)("");
	const [isUploadingCover, setIsUploadingCover] = (0, import_react.useState)(false);
	const [isUploadingBg, setIsUploadingBg] = (0, import_react.useState)(false);
	const [bgUploadProgress, setBgUploadProgress] = (0, import_react.useState)(0);
	const [error, setError] = (0, import_react.useState)(null);
	const coverFileRef = (0, import_react.useRef)(null);
	const bgFileRef = (0, import_react.useRef)(null);
	const sampleCovers = [
		"https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80"
	];
	const handleCoverGallerySelect = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setError("Please select a valid image for the room cover.");
			return;
		}
		setError(null);
		setIsUploadingCover(true);
		try {
			const url = await uploadUserImage(file, "covers");
			if (url) setCoverUrl(url);
		} catch (err) {
			setError(err?.message || "Could not upload cover image.");
		} finally {
			setIsUploadingCover(false);
		}
	};
	const handleBackgroundGallerySelect = async (e) => {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		if (!file.type.startsWith("image/")) {
			setError("Please select a valid image from your gallery for the party background.");
			return;
		}
		if (file.size > 12582912) {
			setError("Background image must be 12 MB or smaller.");
			return;
		}
		setError(null);
		setIsUploadingBg(true);
		setBgUploadProgress(15);
		try {
			const uploadedUrl = await uploadPartyBackgroundImage(file, (pct) => {
				setBgUploadProgress(pct);
			});
			if (!uploadedUrl) throw new Error("Could not upload background photo.");
			setBackgroundType("custom");
			setBackgroundImage(uploadedUrl);
		} catch (err) {
			setError(err?.message || "Failed to upload party background from gallery.");
		} finally {
			setIsUploadingBg(false);
			setBgUploadProgress(0);
		}
	};
	const resolvedStagePreview = resolvePartyRoomBackground({
		backgroundType,
		backgroundId,
		backgroundImage,
		hostAvatar: currentUser.avatar
	});
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!auth.currentUser || !currentUser.id || currentUser.id === "guest") {
			setError("Please sign in first to create a party room.");
			return;
		}
		if (isUploadingCover || isUploadingBg) {
			setError("Please wait for your image upload to finish.");
			return;
		}
		if (!roomName.trim()) {
			setError("Please enter a room name");
			return;
		}
		if (isPrivate && !password.trim()) {
			setError("Please enter a room password for private room");
			return;
		}
		const hostProfile = {
			...currentUser,
			id: auth.currentUser.uid
		};
		const effectiveMaxSeats = clampPartyMaxSeatsForHostLevel(maxSeats, hostLevel);
		const activeCapacity = getActiveSeatCapacity(effectiveMaxSeats, hostLevel);
		const emptySeats = Array(effectiveMaxSeats).fill(null);
		emptySeats[0] = hostProfile;
		onCreateRoom({
			id: `room_${Date.now()}`,
			displayId: Math.floor(1e4 + Math.random() * 9e4).toString(),
			title: roomName.trim(),
			category: "Party",
			host: hostProfile,
			coverImage: coverUrl,
			iconType: "heart",
			participantCount: `1/${activeCapacity}`,
			numericParticipants: 1,
			isAudioRoom: true,
			maxSeats: effectiveMaxSeats,
			roomType: isPrivate ? "private" : "public",
			...isPrivate && password.trim() ? { password: password.trim() } : {},
			announcement: announcement.trim() || "Welcome to my party voice room! Respect everyone and enjoy!",
			seats: emptySeats,
			mutedSeatIndices: [],
			isLocked: false,
			allowJoin: true,
			startTime: Date.now(),
			likesCount: 0,
			backgroundType,
			backgroundId,
			backgroundImage: backgroundType === "host_dp" ? hostProfile.avatar || "" : backgroundType === "custom" ? backgroundImage : ""
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative min-h-dvh-screen w-full bg-[#080413] flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in text-white font-sans",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md mx-auto w-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "w-9 h-9 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 flex items-center justify-center text-white transition-colors active:scale-95",
							title: "Back to Rooms",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-4 h-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-black text-white font-display",
							children: "Create Room"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-9" }),
						" "
					]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4 animate-shake",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: coverFileRef,
					type: "file",
					accept: "image/*",
					onChange: handleCoverGallerySelect,
					className: "hidden"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					ref: bgFileRef,
					type: "file",
					accept: "image/*",
					onChange: handleBackgroundGallerySelect,
					className: "hidden"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mb-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						onClick: () => coverFileRef.current?.click(),
						className: "relative h-40 rounded-2xl overflow-hidden border border-dashed border-white/20 hover:border-[#FA26A0] bg-[#140D20] group cursor-pointer",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: resolvePartyBackgroundImageUrl(coverUrl),
							alt: "Room Cover",
							referrerPolicy: "no-referrer",
							className: "w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform",
								children: isUploadingCover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-5 h-5 text-white animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-5 h-5 text-white stroke-[1.8]" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold text-white",
								children: isUploadingCover ? "Uploading Cover..." : "Tap to Choose Room Cover"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 mt-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#9E97AA]",
								children: "Covers:"
							}),
							sampleCovers.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setCoverUrl(c),
								className: `w-7 h-7 rounded-lg overflow-hidden border ${coverUrl === c ? "ring-2 ring-[#FA26A0] border-[#FA26A0]" : "border-white/20"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: c,
									alt: "preset",
									className: "w-full h-full object-cover"
								})
							}, i)),
							currentUser.avatar && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setCoverUrl(currentUser.avatar),
								className: `px-2 py-1 rounded-lg text-[10px] font-bold border ${coverUrl === currentUser.avatar ? "bg-[#FA26A0]/25 border-[#FA26A0] text-white" : "bg-[#140D20] border-white/15 text-white/80"}`,
								children: "My DP"
							})
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-5 p-3.5 rounded-2xl bg-[#140D20] border border-white/10 space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "w-4 h-4 text-[#FA26A0]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-black text-white",
									children: "Party Stage Background"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] font-bold text-[#D8B4FE]",
								children: resolvedStagePreview.label
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative h-24 rounded-xl overflow-hidden border border-white/15",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-0",
									style: { background: resolvedStagePreview.preset.gradient }
								}),
								resolvedStagePreview.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: resolvedStagePreview.imageUrl,
									alt: "Stage Preview",
									referrerPolicy: "no-referrer",
									className: `absolute inset-0 w-full h-full object-cover ${resolvedStagePreview.useSoftBlur ? "scale-110 blur-[3px] opacity-75" : resolvedStagePreview.type === "custom" ? "opacity-85" : "opacity-55"}`
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "absolute inset-0 opacity-60",
									style: { background: resolvedStagePreview.preset.glow }
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-b from-[#060212]/60 via-[#080216]/30 to-[#060212]/80" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative z-10 h-full px-3 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [currentUser.avatar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: currentUser.avatar,
											alt: currentUser.name,
											className: "w-10 h-10 rounded-full object-cover ring-2 ring-[#FFDF00]"
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-10 h-10 rounded-full bg-[#8B20FF] ring-2 ring-[#FFDF00] flex items-center justify-center text-xs font-black",
											children: (currentUser.name || "H").charAt(0).toUpperCase()
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] font-black text-white block drop-shadow",
											children: roomName.trim() || `${currentUser.name || "Host"}'s Party`
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] text-white/75 block",
											children: "Visible to Host, Guests & all Viewers"
										})] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "px-2 py-0.5 rounded-full bg-black/45 border border-white/20 text-[9px] font-black text-[#FFDF00]",
										children: "LIVE PREVIEW"
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: !currentUser.avatar || isUploadingBg,
								onClick: () => {
									if (!currentUser.avatar) return;
									setBackgroundType("host_dp");
									setBackgroundImage(currentUser.avatar);
								},
								className: `py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${backgroundType === "host_dp" ? "bg-[#FFDF00]/20 border-[#FFDF00] text-[#FFE875]" : "bg-[#1C1130] border-white/15 text-white/90 hover:border-[#FFDF00]/60"} ${!currentUser.avatar ? "opacity-45 cursor-not-allowed" : ""}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: "w-3.5 h-3.5 text-[#FFDF00]" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Use Host DP" }),
									backgroundType === "host_dp" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" })
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								disabled: isUploadingBg,
								onClick: () => bgFileRef.current?.click(),
								className: `py-2 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 transition-all ${backgroundType === "custom" ? "bg-[#FA26A0]/25 border-[#FA26A0] text-[#FFB8E2]" : "bg-[#1C1130] border-white/15 text-white/90 hover:border-[#FA26A0]/70"}`,
								children: isUploadingBg ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "w-3.5 h-3.5 animate-spin text-[#FA26A0]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [bgUploadProgress, "%"] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-3.5 h-3.5 text-[#FA26A0]" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Gallery Photo" }),
									backgroundType === "custom" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-3.5 h-3.5" })
								] })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[10px] font-bold text-[#B9AECF] flex items-center gap-1 mb-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "w-3 h-3 text-[#C77DFF]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Or choose a Party Theme:" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex gap-2 overflow-x-auto no-scrollbar pb-1",
							children: PARTY_BACKGROUND_PRESETS.map((preset) => {
								const selected = backgroundType === "preset" && backgroundId === preset.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => {
										setBackgroundType("preset");
										setBackgroundId(preset.id);
										setBackgroundImage("");
									},
									className: `relative shrink-0 w-20 h-14 rounded-xl overflow-hidden border transition-all ${selected ? "border-[#FA26A0] ring-2 ring-[#FA26A0]/70 scale-[1.02]" : "border-white/15 opacity-85 hover:opacity-100"}`,
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "absolute inset-0",
											style: { background: preset.gradient }
										}),
										preset.imageUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
											src: preset.imageUrl,
											alt: preset.name,
											referrerPolicy: "no-referrer",
											className: "absolute inset-0 w-full h-full object-cover opacity-55"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" }),
										selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FA26A0] text-white flex items-center justify-center",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "w-2.5 h-2.5 stroke-[3]" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute bottom-1 left-1.5 right-1 text-[9px] font-black text-white truncate text-left",
											children: preset.name
										})
									]
								}, preset.id);
							})
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-xs font-bold text-white mb-1.5",
							children: "Room Name"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							placeholder: "Enter room name...",
							value: roomName,
							onChange: (e) => {
								setRoomName(e.target.value);
								if (error) setError(null);
							},
							className: "w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-3 text-xs text-white placeholder-[#9E97AA] outline-none transition-colors"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-xs font-bold text-white",
									children: "Room Seat Mode"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "px-2 py-0.5 rounded-full bg-[#24113D] border border-[#A855F7]/40 text-[10px] font-black text-[#E9D5FF]",
									children: ["Your Level: Lv.", hostLevel]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-3 gap-2",
								children: PARTY_SEAT_TIERS.map((tier) => {
									const unlocked = isSeatModeUnlockedForLevel(tier.maxSeats, hostLevel);
									const selected = maxSeats === tier.maxSeats;
									const tierLabelText = `${tier.maxSeats} Seats`;
									const subText = tier.maxSeats === 5 ? "Free Tier" : unlocked ? "Unlocked" : `Lv.${tier.minLevel} Lock`;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											if (!unlocked) {
												setError(`Reach Level ${tier.minLevel} to unlock ${tier.maxSeats}-seat Party Rooms (You are Lv.${hostLevel}).`);
												return;
											}
											setError(null);
											hasManuallyPickedSeatsRef.current = true;
											setMaxSeats(tier.maxSeats);
										},
										className: `relative py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center gap-1 transition-all border ${selected ? "bg-gradient-to-b from-[#FA26A0] to-[#B5179E] text-white border-[#FF85C8] shadow-lg shadow-[#FA26A0]/35" : unlocked ? "bg-[#140D20] text-white/90 hover:border-[#FA26A0]/60 border-white/10" : "bg-[#10091A] text-white/45 border-white/5 opacity-80"}`,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${selected ? "bg-black/25 text-white" : unlocked ? "bg-[#8B20FF]/25 text-[#D8B4FE]" : "bg-white/5 text-white/45"}`,
												children: tier.tierLabel
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1 text-xs font-black",
												children: [unlocked ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "w-3.5 h-3.5 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-3.5 h-3.5 text-amber-300/80 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tierLabelText })]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: `text-[9px] font-bold leading-tight ${selected ? "text-white/90" : unlocked ? "text-emerald-300/90" : "text-amber-300/80"}`,
												children: subText
											})
										]
									}, tier.maxSeats);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2.5 grid grid-cols-2 gap-1.5 text-[10px]",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-2.5 py-1.5 rounded-xl border bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-black block",
											children: "✓ Default • 5 Seats"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] text-white/70",
											children: "All 5 Seats Open by Default"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "px-2.5 py-1.5 rounded-xl border bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-black block",
											children: "✓ Side Seat #2 Open"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] text-white/70",
											children: "Unlocked for All Hosts"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `px-2.5 py-1.5 rounded-xl border ${hostLevel >= 10 ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200" : "bg-[#10091A] border-white/10 text-white/55"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-black block",
											children: [hostLevel >= 10 ? "✓ " : "🔒 ", "Lv.10 • 8 Seats"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] text-white/70",
											children: "+3 Lower Guest Seats Added"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: `px-2.5 py-1.5 rounded-xl border ${hostLevel >= 20 ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200" : "bg-[#10091A] border-white/10 text-white/55"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-black block",
											children: [hostLevel >= 20 ? "✓ " : "🔒 ", "Lv.20 • 16 Seats"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] text-white/70",
											children: "Select 5, 8, or 16 Anytime"
										})]
									})
								]
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-xs font-bold text-white mb-2",
							children: "Room Privacy"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								onClick: () => setIsPrivate(false),
								className: `p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${!isPrivate ? "bg-[#160E24] border-[#FA26A0]/60" : "bg-[#140D20] border-white/10"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${!isPrivate ? "border-[#FA26A0]" : "border-white/30"}`,
										children: !isPrivate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-2.5 h-2.5 rounded-full bg-[#FA26A0]" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col text-left",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-white",
											children: "Public Room"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#9E97AA]",
											children: "Anyone can join"
										})]
									})]
								})
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								onClick: () => setIsPrivate(true),
								className: `p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${isPrivate ? "bg-[#160E24] border-[#FA26A0]/60" : "bg-[#140D20] border-white/10"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isPrivate ? "border-[#FA26A0]" : "border-white/30"}`,
										children: isPrivate && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-2.5 h-2.5 rounded-full bg-[#FA26A0]" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col text-left",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-white",
											children: "Private Room"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#9E97AA]",
											children: "Only with password"
										})]
									})]
								})
							})]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "block text-xs font-bold text-white mb-1.5",
							children: ["Room Password ", isPrivate ? "*" : "(Optional)"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex items-center bg-[#140D20] border border-white/10 focus-within:border-[#FA26A0] rounded-xl px-3.5 py-3 transition-colors",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-4 h-4 text-[#9E97AA] shrink-0 mr-2.5" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: showPassword ? "text" : "password",
									placeholder: "Enter password...",
									value: password,
									onChange: (e) => setPassword(e.target.value),
									className: "w-full bg-transparent text-xs text-white placeholder-[#9E97AA] outline-none"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowPassword(!showPassword),
									className: "text-[#9E97AA] hover:text-white shrink-0 ml-2",
									children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "w-4 h-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "w-4 h-4" })
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-bold text-white",
								children: "Room Announcement (Optional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-[10px] text-[#9E97AA] font-mono",
								children: [announcement.length, "/100"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							rows: 3,
							maxLength: 100,
							placeholder: "Enter announcement...",
							value: announcement,
							onChange: (e) => setAnnouncement(e.target.value),
							className: "w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#9E97AA] outline-none resize-none transition-colors"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-3 pb-6",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								className: "w-full py-4 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-[#FA26A0]/40 hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Create Room" })
							})
						})
					]
				})
			]
		})
	});
};
export { CreateRoomScreen };
