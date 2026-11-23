import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Dn as ArrowLeft, Dt as Globe, Nt as Film, c as Video, h as Upload, kn as require_react, r as X, tn as CircleCheck } from "./vendor-icons-sqDS8tFw.js";
import { bt as createReelDocument, wt as uploadReelVideoAndThumbnail, xt as generateReelId } from "./index-2m6nzgVv.js";
import { i as require_jsx_runtime } from "./vendor-motion-CI-970bO.js";
// src/components/screens/UploadVideoScreen.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var MAX_REEL_FILE_BYTES = 104857600;
function formatSpeed(bytesPerSecond) {
	if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "";
	if (bytesPerSecond >= 1048576) return `${(bytesPerSecond / 1048576).toFixed(1)} MB/s`;
	return `${Math.max(1, Math.round(bytesPerSecond / 1024))} KB/s`;
}
function formatEta(seconds) {
	if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) return "";
	if (seconds < 60) return `${Math.ceil(seconds)}s left`;
	return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s left`;
}
var UploadVideoScreen = ({ currentUser, initialVideoUrl, initialFile, onClose, onUploadSuccess }) => {
	const [selectedFile, setSelectedFile] = (0, import_react.useState)(initialFile || null);
	const [previewUrl, setPreviewUrl] = (0, import_react.useState)(initialVideoUrl || "");
	const [caption, setCaption] = (0, import_react.useState)("");
	const [hashtags, setHashtags] = (0, import_react.useState)([
		"#party",
		"#viral",
		"#lenzo"
	]);
	const [newTagInput, setNewTagInput] = (0, import_react.useState)("");
	const [privacy, setPrivacy] = (0, import_react.useState)("public");
	const [isUploading, setIsUploading] = (0, import_react.useState)(false);
	const [uploadProgress, setUploadProgress] = (0, import_react.useState)(0);
	const [uploadPhase, setUploadPhase] = (0, import_react.useState)("idle");
	const [uploadStage, setUploadStage] = (0, import_react.useState)("Ready to upload");
	const [bytesTransferred, setBytesTransferred] = (0, import_react.useState)(0);
	const [totalBytes, setTotalBytes] = (0, import_react.useState)(0);
	const [uploadSpeedBps, setUploadSpeedBps] = (0, import_react.useState)(0);
	const [etaSeconds, setEtaSeconds] = (0, import_react.useState)(void 0);
	const [errorMessage, setErrorMessage] = (0, import_react.useState)(null);
	const [previewError, setPreviewError] = (0, import_react.useState)(false);
	const [isMuted] = (0, import_react.useState)(false);
	const videoPlayerRef = (0, import_react.useRef)(null);
	const fileInputRef = (0, import_react.useRef)(null);
	const abortControllerRef = (0, import_react.useRef)(null);
	const localObjectUrlRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		if (initialVideoUrl) {
			setPreviewUrl(initialVideoUrl);
			setPreviewError(false);
		}
		if (initialFile) setSelectedFile(initialFile);
	}, [initialVideoUrl, initialFile]);
	(0, import_react.useEffect)(() => {
		return () => {
			abortControllerRef.current?.abort();
			if (localObjectUrlRef.current) {
				URL.revokeObjectURL(localObjectUrlRef.current);
				localObjectUrlRef.current = null;
			}
		};
	}, []);
	const resetProgressState = () => {
		setIsUploading(false);
		setUploadProgress(0);
		setUploadPhase("idle");
		setUploadStage("Ready to upload");
		setBytesTransferred(0);
		setTotalBytes(0);
		setUploadSpeedBps(0);
		setEtaSeconds(void 0);
	};
	const handleFileChange = (e) => {
		setErrorMessage(null);
		if (e.target.files && e.target.files[0]) {
			const file = e.target.files[0];
			const mime = (file.type || "").toLowerCase();
			const nameLower = (file.name || "").toLowerCase();
			const hasVideoExt = /\.(mp4|webm|mov|m4v|ogv|ogg|3gp|mkv)$/i.test(nameLower);
			if (mime && !mime.startsWith("video/") && !hasVideoExt) {
				setErrorMessage("Please select a valid video file (MP4, WebM, MOV, or 3GP).");
				e.target.value = "";
				return;
			}
			if (file.size <= 0) {
				setErrorMessage("Selected video file is empty. Please choose another video.");
				e.target.value = "";
				return;
			}
			if (file.size > MAX_REEL_FILE_BYTES) {
				const sizeMb = (file.size / 1048576).toFixed(1);
				setErrorMessage(`Video is ${sizeMb} MB. Maximum allowed upload size is 100 MB.`);
				e.target.value = "";
				return;
			}
			if (localObjectUrlRef.current) URL.revokeObjectURL(localObjectUrlRef.current);
			const url = URL.createObjectURL(file);
			localObjectUrlRef.current = url;
			setSelectedFile(file);
			setPreviewUrl(url);
			setPreviewError(false);
		}
		e.target.value = "";
	};
	const handleAddHashtag = (tagToAdd) => {
		const raw = tagToAdd || newTagInput;
		if (!raw.trim()) return;
		const cleanTag = raw.startsWith("#") ? raw.trim() : `#${raw.trim()}`;
		if (!hashtags.includes(cleanTag)) setHashtags([...hashtags, cleanTag]);
		if (!tagToAdd) setNewTagInput("");
	};
	const handleRemoveTag = (tag) => {
		if (isUploading) return;
		setHashtags(hashtags.filter((t) => t !== tag));
	};
	const handleCancelOrClose = () => {
		if (isUploading) {
			abortControllerRef.current?.abort();
			abortControllerRef.current = null;
			resetProgressState();
			setErrorMessage("Upload cancelled.");
			return;
		}
		onClose();
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isUploading) return;
		setErrorMessage(null);
		if (!selectedFile) {
			setErrorMessage("Please select a video file to upload to Lenzo Reels.");
			fileInputRef.current?.click();
			return;
		}
		if (selectedFile.size > MAX_REEL_FILE_BYTES) {
			const sizeMb = (selectedFile.size / 1048576).toFixed(1);
			setErrorMessage(`Video is ${sizeMb} MB. Maximum allowed upload size is 100 MB.`);
			return;
		}
		if (!caption.trim()) {
			setErrorMessage("Please enter a caption for your reel.");
			return;
		}
		const controller = new AbortController();
		abortControllerRef.current = controller;
		setIsUploading(true);
		setUploadProgress(0);
		setUploadPhase("init");
		setUploadStage("Connecting to storage...");
		setBytesTransferred(0);
		setTotalBytes(selectedFile.size);
		setUploadSpeedBps(0);
		setEtaSeconds(void 0);
		try {
			const reelId = generateReelId();
			const uploaded = await uploadReelVideoAndThumbnail({
				reelId,
				videoFile: selectedFile,
				signal: controller.signal,
				onProgress: (pct, info) => {
					const normalizedPct = Math.max(0, Math.min(96, Math.round(pct)));
					setUploadProgress(normalizedPct);
					if (info && "percent" in info) {
						const progressInfo = info;
						if (typeof progressInfo.bytesTransferred === "number") setBytesTransferred(progressInfo.bytesTransferred);
						if (typeof progressInfo.totalBytes === "number" && progressInfo.totalBytes > 0) setTotalBytes(progressInfo.totalBytes);
						if (typeof progressInfo.bytesPerSecond === "number") setUploadSpeedBps(progressInfo.bytesPerSecond);
						setEtaSeconds(progressInfo.etaSeconds);
						if (progressInfo.phase) setUploadPhase(progressInfo.phase);
						if (progressInfo.stage) setUploadStage(progressInfo.stage);
					} else if (normalizedPct >= 91) {
						setUploadPhase("thumbnail");
						setUploadStage("Creating preview cover...");
					} else {
						setUploadPhase("uploading");
						setUploadStage(`Uploading video (${normalizedPct}%)`);
					}
				}
			});
			if (controller.signal.aborted) return;
			setUploadProgress(98);
			setUploadPhase("saving");
			setUploadStage("Publishing reel...");
			setEtaSeconds(void 0);
			const createdReel = await createReelDocument({
				reelId,
				creator: currentUser,
				videoUrl: uploaded.videoUrl,
				videoStoragePath: uploaded.videoStoragePath,
				thumbnailUrl: uploaded.thumbnailUrl,
				thumbnailStoragePath: uploaded.thumbnailStoragePath,
				caption: caption.trim(),
				hashtags,
				visibility: privacy,
				musicTitle: `${currentUser.name} - Original Sound`,
				fileSizeBytes: uploaded.fileSizeBytes,
				storageBackend: uploaded.storageBackend,
				videoMimeType: uploaded.videoMimeType,
				mediaChunkCount: uploaded.mediaChunkCount
			});
			setUploadProgress(100);
			setUploadPhase("complete");
			setUploadStage("Published");
			abortControllerRef.current = null;
			setTimeout(() => {
				setIsUploading(false);
				onUploadSuccess(createdReel);
			}, 350);
		} catch (err) {
			abortControllerRef.current = null;
			if (err?.name === "AbortError" || controller.signal.aborted) {
				resetProgressState();
				setErrorMessage("Upload cancelled.");
				return;
			}
			console.error("[Reel Upload Error]:", err);
			resetProgressState();
			setErrorMessage(err?.message || "Failed to upload reel. Please check your connection and try again.");
		}
	};
	const isBlobOrVideoUrl = Boolean(previewUrl) && (previewUrl.startsWith("blob:") || /\.(mp4|webm|mov|m4v|ogv|3gp|mkv)(\?|$)/i.test(previewUrl) || previewUrl.includes("/api/reels/media/") || previewUrl.includes("firebasestorage"));
	const selectedSizeMb = selectedFile ? (selectedFile.size / 1048576).toFixed(1) : null;
	const transferredMb = (bytesTransferred / 1048576).toFixed(1);
	const totalMb = ((totalBytes || selectedFile?.size || 0) / 1048576).toFixed(1);
	const speedText = uploadPhase === "uploading" ? formatSpeed(uploadSpeedBps) : "";
	const etaText = uploadPhase === "uploading" ? formatEta(etaSeconds) : "";
	const ringRadius = 38;
	const ringCircumference = 2 * Math.PI * ringRadius;
	const ringOffset = ringCircumference * (1 - Math.max(0, Math.min(100, uploadProgress)) / 100);
	const stepIndex = uploadPhase === "complete" ? 3 : uploadPhase === "saving" ? 2 : uploadPhase === "finalizing" || uploadPhase === "thumbnail" ? 1 : 0;
	const buttonLabel = !isUploading ? "Upload Video" : uploadProgress >= 100 ? "Published 100%" : uploadPhase === "saving" ? `Publishing ${uploadProgress}%` : uploadPhase === "finalizing" || uploadPhase === "thumbnail" ? `Processing ${uploadProgress}%` : `Uploading ${uploadProgress}%`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-dvh-screen w-full bg-[#080413] text-white flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in font-sans",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: fileInputRef,
			type: "file",
			accept: "video/mp4,video/webm,video/quicktime,video/3gpp,video/*",
			onChange: handleFileChange,
			disabled: isUploading,
			className: "hidden"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-lg mx-auto w-full flex-1 flex flex-col justify-between",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: handleCancelOrClose,
							className: "min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#160E24] hover:bg-[#201433] border border-white/10 text-xs font-bold text-[#9E97AA] hover:text-white transition-colors",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isUploading ? "Cancel Upload" : "Cancel" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base font-black text-white font-display",
							children: "Video Upload"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "w-16 text-right",
							children: isUploading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-mono font-bold text-[#FA26A0] tabular-nums",
								children: [uploadProgress, "%"]
							})
						})
					]
				}),
				errorMessage && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					role: "alert",
					className: "bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs py-2.5 px-3.5 rounded-2xl mb-4 animate-shake",
					children: errorMessage
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mb-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-xs font-bold text-white flex items-center gap-1.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, { className: "w-3.5 h-3.5 text-[#FA26A0]" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Video Preview" }),
								selectedSizeMb && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[11px] font-mono text-[#9E97AA] tabular-nums",
									children: [
										"· ",
										selectedSizeMb,
										" MB / 100 MB"
									]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							disabled: isUploading,
							onClick: () => fileInputRef.current?.click(),
							className: "min-h-[36px] text-[11px] font-bold text-[#FA26A0] hover:text-pink-300 disabled:opacity-40 transition-colors flex items-center gap-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Change Video" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "›" })]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative h-60 sm:h-72 w-full rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl flex items-center justify-center group",
						children: [isBlobOrVideoUrl && !previewError ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
							ref: videoPlayerRef,
							src: previewUrl,
							autoPlay: true,
							loop: true,
							playsInline: true,
							muted: isMuted,
							controls: !isUploading,
							onError: () => setPreviewError(true),
							className: "w-full h-full object-contain bg-black"
						}) : isBlobOrVideoUrl && previewError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "w-full h-full flex flex-col items-center justify-center gap-2 bg-[#140D20] px-6 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Film, { className: "w-6 h-6" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-bold text-white",
									children: "Video Selected & Ready"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-[#9E97AA]",
									children: "Preview unavailable for this codec, but your video can still be uploaded."
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => fileInputRef.current?.click(),
							className: "w-full h-full flex flex-col items-center justify-center gap-2.5 bg-[#140D20] hover:bg-[#1b122b] transition-colors px-6 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 rounded-full bg-[#FA26A0]/20 border border-[#FA26A0]/40 flex items-center justify-center text-[#FA26A0]",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "w-6 h-6" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-bold text-white",
									children: "Tap to Select Reel Video"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] text-[#9E97AA]",
									children: "MP4, WebM, or MOV · Max 100 MB"
								})
							]
						}), isUploading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							"aria-live": "polite",
							className: "absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center z-10 animate-fade-in",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative w-24 h-24 flex items-center justify-center mb-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
										className: "w-24 h-24 -rotate-90",
										viewBox: "0 0 96 96",
										"aria-hidden": "true",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											cx: "48",
											cy: "48",
											r: ringRadius,
											fill: "none",
											stroke: "rgba(255,255,255,0.14)",
											strokeWidth: "6"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
											cx: "48",
											cy: "48",
											r: ringRadius,
											fill: "none",
											stroke: uploadProgress >= 100 ? "#10B981" : "#FA26A0",
											strokeWidth: "6",
											strokeLinecap: "round",
											strokeDasharray: ringCircumference,
											strokeDashoffset: ringOffset,
											className: "transition-[stroke-dashoffset] duration-150 ease-out"
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "absolute inset-0 flex flex-col items-center justify-center",
										children: uploadProgress >= 100 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-8 h-8 text-emerald-400" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xl font-black font-mono tabular-nums text-white",
											children: [uploadProgress, "%"]
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-bold text-white leading-snug",
									children: uploadStage
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1.5 flex items-center justify-center gap-2 text-[11px] font-mono tabular-nums text-[#C9C3D4]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											transferredMb,
											" / ",
											totalMb,
											" MB"
										] }),
										speedText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											"aria-hidden": "true",
											children: "·"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: speedText })] }),
										etaText && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											"aria-hidden": "true",
											children: "·"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: etaText })] })
									]
								})
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					className: "space-y-4 flex-1 flex flex-col justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `space-y-3 transition-opacity ${isUploading ? "opacity-60 pointer-events-none" : ""}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between mb-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-xs font-bold text-white",
									children: "Caption *"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[10px] text-[#9E97AA] font-mono tabular-nums",
									children: [caption.length, "/150"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 3,
								maxLength: 150,
								disabled: isUploading,
								placeholder: "Write an engaging caption for your video...",
								value: caption,
								onChange: (e) => {
									setCaption(e.target.value);
									if (errorMessage) setErrorMessage(null);
								},
								className: "w-full bg-[#140D20] border border-white/10 focus:border-[#FA26A0] rounded-2xl p-3.5 text-xs text-white placeholder-[#9E97AA] outline-none resize-none transition-colors"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-[11px] font-bold text-[#9E97AA] mb-1.5",
									children: "Hashtags"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap items-center gap-1.5 mb-2",
									children: hashtags.map((tag) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "px-3 py-1 rounded-full bg-[#1A102B] border border-[#FA26A0]/30 text-xs text-[#FA26A0] font-bold flex items-center gap-1.5 shadow-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: tag }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											disabled: isUploading,
											onClick: () => handleRemoveTag(tag),
											"aria-label": `Remove ${tag}`,
											className: "hover:text-white transition-colors",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-3 h-3" })
										})]
									}, tag))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex flex-wrap items-center gap-2",
									children: [
										"#dance",
										"#music",
										"#friends",
										"#trending"
									].map((sug) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: isUploading,
										onClick: () => handleAddHashtag(sug),
										className: "px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] text-[#9E97AA] hover:text-white font-semibold transition-colors",
										children: sug
									}, sug))
								})
							] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3 rounded-2xl bg-[#140D20] border border-white/10 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "w-4 h-4 text-[#FA26A0]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-bold text-white",
										children: "Who can view"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex items-center gap-1.5",
									children: [
										"public",
										"friends",
										"private"
									].map((mode) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										disabled: isUploading,
										onClick: () => setPrivacy(mode),
										className: `px-3 py-1.5 rounded-full text-[11px] font-bold capitalize transition-all ${privacy === mode ? "bg-[#FA26A0] text-white shadow" : "text-[#9E97AA] hover:text-white"}`,
										children: mode
									}, mode))
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "pt-3 pb-4 space-y-2.5",
						children: [
							isUploading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "p-3.5 rounded-2xl bg-[#140D20] border border-white/10 space-y-2 animate-fade-in",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between gap-2 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-bold text-white truncate",
											children: uploadStage
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono font-black text-[#FA26A0] tabular-nums shrink-0",
											children: [uploadProgress, "%"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										role: "progressbar",
										"aria-label": "Video upload progress",
										"aria-valuenow": uploadProgress,
										"aria-valuemin": 0,
										"aria-valuemax": 100,
										className: "w-full h-2.5 rounded-full bg-white/10 overflow-hidden",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `h-full w-full origin-left transition-transform duration-150 ease-out ${uploadProgress >= 100 ? "bg-emerald-400" : "bg-gradient-to-r from-[#FF007A] to-[#FA26A0]"}`,
											style: { transform: `scaleX(${Math.max(.01, uploadProgress / 100)})` }
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between text-[11px] text-[#9E97AA]",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: stepIndex >= 0 ? "text-white font-semibold" : "",
													children: "Upload"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													children: "·"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: stepIndex >= 1 ? "text-white font-semibold" : "",
													children: "Process"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													"aria-hidden": "true",
													children: "·"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: stepIndex >= 2 ? "text-white font-semibold" : "",
													children: "Publish"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-mono tabular-nums",
											children: [
												transferredMb,
												" / ",
												totalMb,
												" MB"
											]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: isUploading,
								className: "w-full min-h-[48px] py-3.5 rounded-full bg-[#FA26A0] hover:bg-[#e01d8b] text-white font-black text-sm shadow-xl shadow-pink-900/40 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-75",
								children: [uploadProgress >= 100 && isUploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "w-4 h-4 text-white" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono tabular-nums sm:font-sans",
									children: buttonLabel
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: handleCancelOrClose,
								className: "w-full min-h-[44px] py-3 rounded-full bg-white/5 hover:bg-white/10 text-[#9E97AA] hover:text-white font-bold text-xs active:scale-[0.98] transition-all",
								children: isUploading ? "Cancel Upload" : "Cancel"
							})
						]
					})]
				})
			]
		})]
	});
};
export { UploadVideoScreen };
