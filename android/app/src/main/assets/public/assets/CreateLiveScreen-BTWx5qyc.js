import { a as __toESM } from "./rolldown-runtime-DQp2zzRu.js";
import { Sn as CameraOff, _n as ChevronDown, d as Users, i as X, l as Video, lt as Mic, q as RefreshCw, ut as MicOff, vt as Lock, xn as Camera, zn as require_react } from "./vendor-icons-RA12uJu8.js";
import { r as auth } from "./firebase-CIREZBAE.js";
import { _t as isNativeAndroidApp, bt as stopMediaStream, gt as createAudioAnalyser, ht as acquireRealMicrophone, mt as acquireRealDeviceCamera, vt as openNativeAppSettings, yt as setStagedLiveStream } from "./index-ooNtX3bK.js";
import { i as require_jsx_runtime } from "./vendor-motion-BNHB1rOc.js";
// src/components/screens/CreateLiveScreen.tsx
var import_react = /* @__PURE__ */ __toESM(require_react(), 1);
var import_jsx_runtime = require_jsx_runtime();
var CreateLiveScreen = ({ currentUser, onClose, onStartLive }) => {
	const [streamMode, setStreamMode] = (0, import_react.useState)("stream");
	const [title, setTitle] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("Music");
	const [allowGuests, setAllowGuests] = (0, import_react.useState)(true);
	const [isPrivate, setIsPrivate] = (0, import_react.useState)(false);
	const [isCameraPreviewOn, setIsCameraPreviewOn] = (0, import_react.useState)(true);
	const [isMicOn, setIsMicOn] = (0, import_react.useState)(true);
	const [isFrontCamera, setIsFrontCamera] = (0, import_react.useState)(true);
	const [hasWebcam, setHasWebcam] = (0, import_react.useState)(false);
	const [hasMic, setHasMic] = (0, import_react.useState)(false);
	const [audioVolumeLevel, setAudioVolumeLevel] = (0, import_react.useState)(0);
	const [isFlippingCamera, setIsFlippingCamera] = (0, import_react.useState)(false);
	const [isStartingLive, setIsStartingLive] = (0, import_react.useState)(false);
	const isStartingLiveRef = (0, import_react.useRef)(false);
	const videoPreviewRef = (0, import_react.useRef)(null);
	const streamRef = (0, import_react.useRef)(null);
	const cameraMetaRef = (0, import_react.useRef)({
		label: "Front Camera",
		isRealBackCamera: false
	});
	const audioAnalyserRef = (0, import_react.useRef)(null);
	const volumeRafRef = (0, import_react.useRef)(null);
	const [coverUrl, setCoverUrl] = (0, import_react.useState)("https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80");
	const [error, setError] = (0, import_react.useState)(null);
	const [mediaPermissionError, setMediaPermissionError] = (0, import_react.useState)(null);
	const [isPermanentlyDenied, setIsPermanentlyDenied] = (0, import_react.useState)(false);
	const [isRequestingMedia, setIsRequestingMedia] = (0, import_react.useState)(false);
	const sampleCovers = [
		"https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80",
		"https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&auto=format&fit=crop&q=80"
	];
	const startPreview = async (front = isFrontCamera) => {
		if (audioAnalyserRef.current) {
			audioAnalyserRef.current.cleanup();
			audioAnalyserRef.current = null;
		}
		if (streamRef.current) {
			stopMediaStream(streamRef.current);
			streamRef.current = null;
		}
		if (!isCameraPreviewOn && !isMicOn) {
			setHasWebcam(false);
			setHasMic(false);
			setAudioVolumeLevel(0);
			setMediaPermissionError(null);
			return true;
		}
		setIsRequestingMedia(true);
		setMediaPermissionError(null);
		try {
			const result = await acquireRealDeviceCamera({
				isFront: front,
				enableAudio: isMicOn,
				idealWidth: 720,
				idealHeight: 1280
			});
			streamRef.current = result.stream;
			cameraMetaRef.current = {
				label: result.label,
				isRealBackCamera: result.isRealBackCamera
			};
			result.stream.getAudioTracks().forEach((t) => {
				t.enabled = isMicOn;
			});
			if (videoPreviewRef.current && isCameraPreviewOn) {
				videoPreviewRef.current.srcObject = result.stream;
				videoPreviewRef.current.play().catch(() => {});
			}
			setHasWebcam(isCameraPreviewOn && result.stream.getVideoTracks().length > 0);
			setHasMic(result.hasAudio && isMicOn);
			setMediaPermissionError(null);
			setIsPermanentlyDenied(false);
			if (result.hasAudio && isMicOn) {
				const controller = createAudioAnalyser(result.stream);
				audioAnalyserRef.current = controller;
			}
			return true;
		} catch (err) {
			console.warn("Real camera/mic preview acquisition error:", err);
			setHasWebcam(false);
			setHasMic(false);
			const permBlocked = Boolean(err?.permanentlyDenied);
			setIsPermanentlyDenied(permBlocked);
			const errMsg = permBlocked ? "Camera & Microphone are blocked in Android Settings. Tap Open Settings -> Permissions -> Allow Camera & Microphone." : err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError" ? "Camera & Microphone permission denied. Tap below to allow real device access." : err?.name === "NotFoundError" ? "No camera or microphone detected on this device." : "Tap below to connect your real Camera & Microphone.";
			setMediaPermissionError(errMsg);
			return false;
		} finally {
			setIsRequestingMedia(false);
		}
	};
	(0, import_react.useEffect)(() => {
		const onResume = () => {
			if (document.visibilityState === "visible" && isCameraPreviewOn && !streamRef.current) startPreview(isFrontCamera);
		};
		document.addEventListener("visibilitychange", onResume);
		window.addEventListener("focus", onResume);
		return () => {
			document.removeEventListener("visibilitychange", onResume);
			window.removeEventListener("focus", onResume);
		};
	}, [isCameraPreviewOn, isFrontCamera]);
	(0, import_react.useEffect)(() => {
		if (hasWebcam && isCameraPreviewOn && videoPreviewRef.current && streamRef.current) {
			videoPreviewRef.current.srcObject = streamRef.current;
			videoPreviewRef.current.play().catch(() => {});
		}
	}, [
		hasWebcam,
		isCameraPreviewOn,
		isFrontCamera
	]);
	(0, import_react.useEffect)(() => {
		if (streamRef.current) {
			const audioTracks = streamRef.current.getAudioTracks();
			if (audioTracks.length > 0) {
				audioTracks.forEach((t) => {
					t.enabled = isMicOn;
				});
				setHasMic(isMicOn);
			} else if (isMicOn && isCameraPreviewOn) startPreview(isFrontCamera);
		}
	}, [isMicOn]);
	(0, import_react.useEffect)(() => {
		let active = true;
		const poll = () => {
			if (!active) return;
			if (audioAnalyserRef.current && isMicOn) {
				const level = audioAnalyserRef.current.getVolumeLevel();
				setAudioVolumeLevel(level);
			} else setAudioVolumeLevel(0);
			volumeRafRef.current = requestAnimationFrame(poll);
		};
		volumeRafRef.current = requestAnimationFrame(poll);
		return () => {
			active = false;
			if (volumeRafRef.current) cancelAnimationFrame(volumeRafRef.current);
		};
	}, [isMicOn]);
	(0, import_react.useEffect)(() => {
		if (isCameraPreviewOn) startPreview(isFrontCamera);
		else {
			if (audioAnalyserRef.current) {
				audioAnalyserRef.current.cleanup();
				audioAnalyserRef.current = null;
			}
			if (streamRef.current) {
				stopMediaStream(streamRef.current);
				streamRef.current = null;
			}
			setHasWebcam(false);
			setAudioVolumeLevel(0);
		}
		return () => {
			if (audioAnalyserRef.current) audioAnalyserRef.current.cleanup();
			if (streamRef.current) stopMediaStream(streamRef.current);
		};
	}, [isCameraPreviewOn]);
	const handleFlipCamera = async () => {
		setIsFlippingCamera(true);
		const nextFront = !isFrontCamera;
		setIsFrontCamera(nextFront);
		await startPreview(nextFront);
		setTimeout(() => setIsFlippingCamera(false), 400);
	};
	const handleSubmit = async (e) => {
		e.preventDefault();
		if (isStartingLiveRef.current) return;
		if (!auth.currentUser || !currentUser.id || currentUser.id === "guest") {
			setError("Please sign in first to start a live broadcast.");
			return;
		}
		if (!title.trim()) {
			setError("Please enter a live stream title");
			return;
		}
		isStartingLiveRef.current = true;
		setIsStartingLive(true);
		let liveStreamToHandoff = streamRef.current;
		const hasLiveVideo = Boolean(liveStreamToHandoff?.getVideoTracks().some((t) => t.readyState === "live"));
		const hasLiveAudio = Boolean(liveStreamToHandoff?.getAudioTracks().some((t) => t.readyState === "live"));
		if (isCameraPreviewOn && !hasLiveVideo) {
			setIsRequestingMedia(true);
			try {
				const acquired = await acquireRealDeviceCamera({
					isFront: isFrontCamera,
					enableAudio: isMicOn,
					idealWidth: 1280,
					idealHeight: 720
				});
				liveStreamToHandoff = acquired.stream;
				cameraMetaRef.current = {
					label: acquired.label,
					isRealBackCamera: acquired.isRealBackCamera
				};
				setHasWebcam(acquired.stream.getVideoTracks().length > 0);
				setHasMic(acquired.hasAudio && isMicOn);
				setMediaPermissionError(null);
				setIsPermanentlyDenied(false);
			} catch (permErr) {
				console.warn("[CreateLive] Camera acquisition on Start Live:", permErr);
				const permBlocked = Boolean(permErr?.permanentlyDenied);
				setIsPermanentlyDenied(permBlocked);
				setMediaPermissionError(permBlocked ? "Camera & Microphone are blocked in Android Settings. Tap Open Settings to enable them." : "Camera & Microphone permission is required before starting video live. Tap Allow Camera & Mic or switch Cam OFF for Audio Mode.");
				setError(permBlocked ? "Please allow Camera & Microphone in Phone Settings, then tap Start Live again." : "Camera & Microphone access was denied. Please tap Allow Camera & Mic (or turn Cam OFF for Voice Live).");
				setIsRequestingMedia(false);
				isStartingLiveRef.current = false;
				setIsStartingLive(false);
				return;
			} finally {
				setIsRequestingMedia(false);
			}
		} else if (!isCameraPreviewOn && isMicOn && !hasLiveAudio) try {
			liveStreamToHandoff = await acquireRealMicrophone();
		} catch (micErr) {
			console.warn("[CreateLive] Mic acquisition on Start Live:", micErr);
			const permBlocked = Boolean(micErr?.permanentlyDenied);
			setIsPermanentlyDenied(permBlocked);
			setError(permBlocked ? "Microphone is blocked in Phone Settings. Open Settings to allow Microphone." : "Microphone permission was denied. Please allow Microphone access to broadcast voice.");
			isStartingLiveRef.current = false;
			setIsStartingLive(false);
			return;
		}
		if (audioAnalyserRef.current) {
			audioAnalyserRef.current.cleanup();
			audioAnalyserRef.current = null;
		}
		if (liveStreamToHandoff) {
			liveStreamToHandoff.getAudioTracks().forEach((t) => {
				t.enabled = isMicOn;
			});
			liveStreamToHandoff.getVideoTracks().forEach((t) => {
				t.enabled = isCameraPreviewOn;
			});
			setStagedLiveStream({
				stream: liveStreamToHandoff,
				isFront: isFrontCamera,
				isCameraOn: isCameraPreviewOn && liveStreamToHandoff.getVideoTracks().length > 0,
				isMicOn,
				label: cameraMetaRef.current.label,
				isRealBackCamera: cameraMetaRef.current.isRealBackCamera,
				hasAudio: liveStreamToHandoff.getAudioTracks().length > 0
			});
			streamRef.current = null;
		}
		const hostProfile = {
			...currentUser,
			id: auth.currentUser.uid
		};
		onStartLive({
			id: `live_${Date.now()}`,
			title: title.trim(),
			category,
			host: hostProfile,
			coverImage: coverUrl,
			viewerCount: "0",
			numericViewers: 0,
			isLive: true,
			tags: [category, "Live"],
			guests: [],
			likesCount: 0,
			commentsCount: 0,
			startTime: Date.now(),
			allowGuests,
			isPrivate
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "relative min-h-dvh-screen w-full bg-[#090611] flex flex-col justify-between px-4 sm:px-6 safe-pt-4 safe-pb-4 select-none animate-fade-in",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-lg mx-auto w-full",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "w-9 h-9 rounded-full bg-[#160C25] hover:bg-[#211333] border border-white/10 flex items-center justify-center text-white transition-colors",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "w-4 h-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-lg font-bold text-white font-display",
							children: "Create Live"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-9" }),
						" "
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex p-1 bg-[#160C25] rounded-2xl border border-white/10 mb-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setStreamMode("stream"),
						className: `flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${streamMode === "stream" ? "bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md" : "text-[#B9AECF] hover:text-white"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Live Stream" })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setStreamMode("video"),
						className: `flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${streamMode === "video" ? "bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white shadow-md" : "text-[#B9AECF] hover:text-white"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-4 h-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Video" })]
					})]
				}),
				error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs py-2 px-3 rounded-xl mb-4",
					children: error
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mb-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-bold text-white",
								children: "Live Camera & Cover Preview"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 flex-wrap",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setIsCameraPreviewOn(!isCameraPreviewOn),
										className: `px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${isCameraPreviewOn ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`,
										children: [isCameraPreviewOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-3 h-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CameraOff, { className: "w-3 h-3" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isCameraPreviewOn ? "Cam ON" : "Cam OFF" })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setIsMicOn(!isMicOn),
										className: `px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all ${isMicOn ? audioVolumeLevel > 8 ? "bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"}`,
										children: [
											isMicOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: `w-3 h-3 ${audioVolumeLevel > 8 ? "animate-pulse text-emerald-300" : ""}` }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "w-3 h-3" }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isMicOn ? audioVolumeLevel > 8 ? "Speaking 🔊" : "Mic ON" : "Muted" }),
											isMicOn && audioVolumeLevel > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-[9px] text-[#FFC84A]",
												children: [audioVolumeLevel, "%"]
											})
										]
									}),
									isCameraPreviewOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: handleFlipCamera,
										disabled: isFlippingCamera,
										className: `px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${!isFrontCamera ? "bg-[#00F2FE]/20 text-[#00F2FE] border-[#00F2FE]/40" : "bg-white/10 hover:bg-white/20 text-white border-white/10"}`,
										title: "Rotate Camera to Back or Front Camera",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `w-3 h-3 ${isFlippingCamera ? "animate-spin" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isFrontCamera ? "Front" : "📷 Back" })]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative h-48 rounded-2xl overflow-hidden border border-white/20 hover:border-[#F328D5] bg-[#160C25] group",
							children: isCameraPreviewOn && hasWebcam ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative w-full h-full",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("video", {
										ref: videoPreviewRef,
										autoPlay: true,
										playsInline: true,
										muted: true,
										className: `w-full h-full object-cover transition-all ${isFrontCamera ? "-scale-x-100" : "scale-x-100"}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 text-[10px] font-bold flex items-center gap-1.5 border border-emerald-500/40 shadow",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isFrontCamera ? "🤳 Front Camera" : "📷 Back Camera (Rear)" })]
									}),
									isMicOn && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/10 shadow",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "w-3 h-3 text-emerald-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-end gap-0.5 h-2.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "w-0.5 bg-emerald-400 rounded-full",
													style: { height: `${Math.max(2, Math.min(10, 2 + audioVolumeLevel * .1))}%` }
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "w-0.5 bg-emerald-400 rounded-full",
													style: { height: `${Math.max(3, Math.min(10, 3 + audioVolumeLevel * .15))}%` }
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "w-0.5 bg-emerald-400 rounded-full",
													style: { height: `${Math.max(2, Math.min(10, 2 + audioVolumeLevel * .08))}%` }
												})
											]
										})]
									})
								]
							}) : isCameraPreviewOn ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative w-full h-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: coverUrl,
									alt: "Live Cover",
									referrerPolicy: "no-referrer",
									className: "w-full h-full object-cover filter brightness-50"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-black/45 backdrop-blur-[2px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold text-white mb-2 max-w-xs",
										children: mediaPermissionError || "Camera & Microphone permission is required for live video."
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											disabled: isRequestingMedia,
											onClick: () => {
												startPreview(isFrontCamera);
											},
											className: "px-4 py-2 rounded-full bg-gradient-to-r from-[#8B20FF] to-[#F328D5] text-white text-xs font-extrabold shadow-lg shadow-[#F328D5]/40 flex items-center gap-1.5 active:scale-95 transition-all",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Camera, { className: "w-3.5 h-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isRequestingMedia ? "Connecting Camera & Mic..." : "Allow Camera & Mic" })]
										}), (isPermanentlyDenied || isNativeAndroidApp()) && mediaPermissionError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => {
												openNativeAppSettings();
											},
											className: "px-3.5 py-2 rounded-full bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold active:scale-95 transition-all",
											children: "Open Phone Settings"
										})]
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "w-full h-full flex flex-col items-center justify-center bg-[#130a21] text-center p-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CameraOff, { className: "w-6 h-6" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-bold text-white",
										children: "Camera is Turned OFF"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[10px] text-[#B9AECF]",
										children: "Live stream will start in Voice / Audio mode"
									})
								]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[10px] text-[#B9AECF]",
								children: "Presets:"
							}), sampleCovers.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setCoverUrl(c),
								className: `w-7 h-7 rounded-lg overflow-hidden border ${coverUrl === c ? "ring-2 ring-[#F328D5]" : "border-white/20"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: c,
									alt: "cover",
									className: "w-full h-full object-cover"
								})
							}, i))]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit,
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-xs font-bold text-white mb-1.5",
							children: "Live Title *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							placeholder: "Enter Live Title... (e.g. Party Jam & PK Battle 🔥)",
							value: title,
							onChange: (e) => {
								setTitle(e.target.value);
								if (error) setError(null);
							},
							className: "w-full bg-[#160C25] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-3 text-sm text-white placeholder-[#B9AECF]/50 outline-none transition-colors"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "block text-xs font-bold text-white mb-1.5",
							children: "Select Category"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								value: category,
								onChange: (e) => setCategory(e.target.value),
								className: "w-full appearance-none bg-[#160C25] border border-white/10 focus:border-[#F328D5] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Music",
										className: "bg-[#160C25] text-white",
										children: "Music & Singing"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Chat",
										className: "bg-[#160C25] text-white",
										children: "Chat & Hangout"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Gaming",
										className: "bg-[#160C25] text-white",
										children: "Gaming & Esports"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Dance",
										className: "bg-[#160C25] text-white",
										children: "Dance & Party"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "PK Battle",
										className: "bg-[#160C25] text-white",
										children: "PK Battle"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "Friendship",
										className: "bg-[#160C25] text-white",
										children: "Friendship & Match"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "w-4 h-4 text-[#B9AECF] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" })]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 pt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between p-3.5 rounded-xl bg-[#160C25] border border-white/[0.08]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "w-4 h-4 text-[#06B6D4]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-white",
											children: "Allow Guests"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#B9AECF]",
											children: "Viewers can request video or voice seats"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setAllowGuests(!allowGuests),
									className: `w-11 h-6 rounded-full transition-colors relative p-0.5 ${allowGuests ? "bg-[#F328D5]" : "bg-[#211333]"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-5 h-5 rounded-full bg-white transition-transform ${allowGuests ? "translate-x-5" : "translate-x-0"}` })
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between p-3.5 rounded-xl bg-[#160C25] border border-white/[0.08]",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "w-4 h-4 text-[#FFC84A]" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-bold text-white",
											children: "Private Live"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[10px] text-[#B9AECF]",
											children: "Only invited followers can join"
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setIsPrivate(!isPrivate),
									className: `w-11 h-6 rounded-full transition-colors relative p-0.5 ${isPrivate ? "bg-[#F328D5]" : "bg-[#211333]"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `w-5 h-5 rounded-full bg-white transition-transform ${isPrivate ? "translate-x-5" : "translate-x-0"}` })
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "pt-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "submit",
								disabled: isStartingLive,
								className: `w-full py-4 rounded-xl bg-gradient-to-r from-[#8B20FF] via-[#F328D5] to-[#FFC84A] text-white font-extrabold text-sm shadow-xl shadow-[#F328D5]/30 transition-all flex items-center justify-center gap-2 ${isStartingLive ? "opacity-70 cursor-not-allowed" : "hover:opacity-95 active:scale-98"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isStartingLive ? "Starting Live..." : "Start Live" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "w-2.5 h-2.5 rounded-full bg-white animate-ping" })]
							})
						})
					]
				})
			]
		})
	});
};
export { CreateLiveScreen };
