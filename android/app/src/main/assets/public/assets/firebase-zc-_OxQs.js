import { $ as initializeApp, A as getFirestore, M as initializeFirestore, O as doc, Q as getApps, R as getAuth, Z as getApp, a as initializeAppCheck, c as getStorage, i as ReCaptchaV3Provider, k as enableNetwork, m as getDocFromServer, n as isSupported, r as ReCaptchaEnterpriseProvider, t as getAnalytics } from "./vendor-firebase-pU_0pKhI.js";
var firebase_applet_config_default = {
	projectId: "confident-drake-3bcxw",
	appId: "1:238539539886:web:0832836cf24ff0781df43f",
	apiKey: "AIzaSyD3lCt_E-vCqN3nTTRHYc5YV1myyfuBUps",
	authDomain: "confident-drake-3bcxw.firebaseapp.com",
	firestoreDatabaseId: "ai-studio-lenzopartylive-752abd83-49ce-4746-993c-862081735425",
	storageBucket: "confident-drake-3bcxw.firebasestorage.app",
	messagingSenderId: "238539539886",
	measurementId: "",
	oAuthClientId: "238539539886-0f0ps46a223ktq8cv07bv6ias2qfnuc9.apps.googleusercontent.com",
	recaptchaSiteKey: ""
};
// src/firebase.ts
var app = getApps().length > 0 ? getApp() : initializeApp(firebase_applet_config_default);
function createFirestoreInstance() {
	const databaseId = firebase_applet_config_default.firestoreDatabaseId;
	try {
		return initializeFirestore(app, {
			experimentalForceLongPolling: true,
			ignoreUndefinedProperties: true
		}, databaseId);
	} catch {
		return getFirestore(app, databaseId);
	}
}
var db = createFirestoreInstance();
var auth = getAuth(app);
var storage = getStorage(app);
var appCheckInstance = null;
var appCheckProviderName = "not_configured";
if (typeof window !== "undefined") {
	const env = {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": false
	};
	const debugToken = env.VITE_APP_CHECK_DEBUG_TOKEN;
	if (debugToken) self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
	const siteKey = (env.VITE_RECAPTCHA_SITE_KEY || firebase_applet_config_default.recaptchaSiteKey || "").trim();
	if (siteKey) try {
		const useEnterprise = env.VITE_RECAPTCHA_ENTERPRISE !== "false";
		const provider = useEnterprise ? new ReCaptchaEnterpriseProvider(siteKey) : new ReCaptchaV3Provider(siteKey);
		appCheckInstance = initializeAppCheck(app, {
			provider,
			isTokenAutoRefreshEnabled: true
		});
		appCheckProviderName = useEnterprise ? "recaptcha_enterprise" : "recaptcha_v3";
	} catch (err) {
		console.warn("[Firebase App Check] Initialization notice:", err);
		appCheckProviderName = "init_error";
	}
}
if (typeof window !== "undefined" && firebase_applet_config_default.measurementId) isSupported().then((supported) => {
	if (supported) getAnalytics(app);
}).catch(() => {});
var FIREBASE_RUNTIME_INFO = {
	projectId: firebase_applet_config_default.projectId,
	firestoreDatabaseId: firebase_applet_config_default.firestoreDatabaseId,
	storageBucket: firebase_applet_config_default.storageBucket,
	authDomain: firebase_applet_config_default.authDomain,
	appCheckEnabled: Boolean(appCheckInstance),
	appCheckProvider: appCheckProviderName,
	analyticsConfigured: Boolean(firebase_applet_config_default.measurementId)
};
if (typeof window !== "undefined") window.addEventListener("online", () => {
	enableNetwork(db).catch(() => {});
});
async function testConnection(retryAttempt = 0) {
	try {
		await getDocFromServer(doc(db, "test", "connection"));
		console.log("[Firebase] Connection established successfully with Firestore database:", firebase_applet_config_default.firestoreDatabaseId);
	} catch (error) {
		const code = error?.code || "";
		const message = error instanceof Error ? error.message : String(error);
		if (code === "permission-denied" || message.includes("Missing or insufficient permissions")) return;
		if (message.includes("the client is offline") || code === "unavailable") {
			if (retryAttempt < 1) {
				await enableNetwork(db).catch(() => {});
				setTimeout(() => {
					testConnection(retryAttempt + 1);
				}, 2500);
				return;
			}
			console.warn("[Firebase] Firestore backend temporarily unreachable; operating with offline cache until network recovers.");
		}
	}
}
testConnection();
var OperationType = /* @__PURE__ */ function(OperationType) {
	OperationType["CREATE"] = "create";
	OperationType["UPDATE"] = "update";
	OperationType["DELETE"] = "delete";
	OperationType["LIST"] = "list";
	OperationType["GET"] = "get";
	OperationType["WRITE"] = "write";
	return OperationType;
}({});
function handleFirestoreError(error, operationType, path) {
	const errInfo = {
		error: error instanceof Error ? error.message : String(error),
		authInfo: {
			userId: auth.currentUser?.uid,
			email: auth.currentUser?.email,
			emailVerified: auth.currentUser?.emailVerified,
			isAnonymous: auth.currentUser?.isAnonymous,
			tenantId: auth.currentUser?.tenantId,
			providerInfo: auth.currentUser?.providerData?.map((provider) => ({
				providerId: provider.providerId,
				email: provider.email
			})) || []
		},
		operationType,
		path
	};
	console.error("[Firestore Error]:", JSON.stringify(errInfo));
	throw new Error(JSON.stringify(errInfo));
}
export { handleFirestoreError as a, db as i, OperationType as n, storage as o, auth as r, FIREBASE_RUNTIME_INFO as t };
