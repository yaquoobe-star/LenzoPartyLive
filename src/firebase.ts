import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  enableNetwork,
  doc,
  getDocFromServer,
  type Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize or retrieve existing Firebase App (Lenzo Party dedicated project: confident-drake-3bcxw)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore using the specific provisioned database ID from config.
// Force long-polling transport to prevent 10-second WebChannel streaming stalls behind
// proxies, Cloud Run preview iframes, VPNs, and Android WebViews.
function createFirestoreInstance(): Firestore {
  const databaseId = firebaseConfig.firestoreDatabaseId;
  try {
    return initializeFirestore(
      app,
      {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      },
      databaseId
    );
  } catch {
    return getFirestore(app, databaseId);
  }
}

export const db = createFirestoreInstance();

// Firebase Authentication instance
export const auth = getAuth(app);

// Firebase Storage instance for real media and reel uploads
export const storage = getStorage(app);

// Firebase App Check (activated automatically when VITE_RECAPTCHA_SITE_KEY or recaptchaSiteKey is configured)
let appCheckInstance: AppCheck | null = null;
let appCheckProviderName: string = 'not_configured';

if (typeof window !== 'undefined') {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env || {};
  const debugToken = env.VITE_APP_CHECK_DEBUG_TOKEN;
  if (debugToken) {
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN =
      debugToken === 'true' ? true : debugToken;
  }
  const siteKey = (env.VITE_RECAPTCHA_SITE_KEY || firebaseConfig.recaptchaSiteKey || '').trim();
  if (siteKey) {
    try {
      const useEnterprise = env.VITE_RECAPTCHA_ENTERPRISE !== 'false';
      const provider = useEnterprise
        ? new ReCaptchaEnterpriseProvider(siteKey)
        : new ReCaptchaV3Provider(siteKey);
      appCheckInstance = initializeAppCheck(app, {
        provider,
        isTokenAutoRefreshEnabled: true,
      });
      appCheckProviderName = useEnterprise ? 'recaptcha_enterprise' : 'recaptcha_v3';
    } catch (err) {
      console.warn('[Firebase App Check] Initialization notice:', err);
      appCheckProviderName = 'init_error';
    }
  }
}

export const appCheck = appCheckInstance;

// Firebase Analytics (safely initialized only in supported browser contexts with a measurementId)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  void isAnalyticsSupported()
    .then((supported) => {
      if (supported) {
        analyticsInstance = getAnalytics(app);
      }
    })
    .catch(() => {});
}

export const getFirebaseAnalytics = (): Analytics | null => analyticsInstance;

export const FIREBASE_RUNTIME_INFO = {
  projectId: firebaseConfig.projectId,
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId,
  storageBucket: firebaseConfig.storageBucket,
  authDomain: firebaseConfig.authDomain,
  appCheckEnabled: Boolean(appCheckInstance),
  appCheckProvider: appCheckProviderName,
  analyticsConfigured: Boolean(firebaseConfig.measurementId),
};

// Automatically reconnect Firestore if browser/device connectivity recovers
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void enableNetwork(db).catch(() => {});
  });
}

// Test connection on boot per Firebase skill guidelines
async function testConnection(retryAttempt = 0) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log(
      '[Firebase] Connection established successfully with Firestore database:',
      firebaseConfig.firestoreDatabaseId
    );
  } catch (error) {
    const code = (error as { code?: string })?.code || '';
    const message = error instanceof Error ? error.message : String(error);

    // A permission-denied response proves Cloud Firestore backend responded live
    if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
      return;
    }

    if (message.includes('the client is offline') || code === 'unavailable') {
      if (retryAttempt < 1) {
        await enableNetwork(db).catch(() => {});
        setTimeout(() => {
          void testConnection(retryAttempt + 1);
        }, 2500);
        return;
      }
      console.warn(
        '[Firebase] Firestore backend temporarily unreachable; operating with offline cache until network recovers.'
      );
    }
  }
}

void testConnection();

// Standardized Firestore Error Handling per Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('[Firestore Error]:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
