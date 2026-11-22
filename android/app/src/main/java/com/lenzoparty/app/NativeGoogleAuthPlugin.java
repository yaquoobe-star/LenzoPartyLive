package com.lenzoparty.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.content.pm.SigningInfo;
import android.os.Build;
import android.util.Log;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInStatusCodes;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String TAG = "LenzoGoogleAuth";
    private static final String EXPECTED_PACKAGE_NAME = "com.lenzoparty.app";
    private static final String FALLBACK_WEB_CLIENT_ID =
            "238539539886-0f0ps46a223ktq8cv07bv6ias2qfnuc9.apps.googleusercontent.com";

    private static final class ResolvedWebClientConfig {
        final String clientId;
        final String source;

        ResolvedWebClientConfig(String clientId, String source) {
            this.clientId = clientId;
            this.source = source;
        }
    }

    private ResolvedWebClientConfig resolveWebClientConfig() {
        Context context = getContext();
        int resId = context.getResources().getIdentifier(
                "default_web_client_id", "string", context.getPackageName()
        );
        if (resId != 0) {
            String fromResources = context.getString(resId);
            if (fromResources != null && !fromResources.trim().isEmpty()) {
                return new ResolvedWebClientConfig(fromResources.trim(), "google-services.json");
            }
        }
        Log.w(TAG, "R.string.default_web_client_id missing or empty; falling back to configured Web OAuth Client ID.");
        return new ResolvedWebClientConfig(FALLBACK_WEB_CLIENT_ID, "fallback_constant");
    }

    private GoogleSignInClient buildClient(Activity activity, ResolvedWebClientConfig config) {
        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(config.clientId)
                .requestEmail()
                .requestProfile()
                .build();
        return GoogleSignIn.getClient(activity, gso);
    }

    private String maskWebClientId(String clientId) {
        if (clientId == null || clientId.isEmpty()) {
            return "<empty>";
        }
        int suffixIdx = clientId.indexOf(".apps.googleusercontent.com");
        String core = suffixIdx > 0 ? clientId.substring(0, suffixIdx) : clientId;
        if (core.length() <= 18) {
            return core + (suffixIdx > 0 ? ".apps.googleusercontent.com" : "");
        }
        return core.substring(0, 17) + "..." + core.substring(core.length() - 5)
                + (suffixIdx > 0 ? ".apps.googleusercontent.com" : "");
    }

    private long getAppVersionCode(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                return info.getLongVersionCode();
            }
            @SuppressWarnings("deprecation")
            long legacyCode = info.versionCode;
            return legacyCode;
        } catch (Exception e) {
            return -1L;
        }
    }

    private String getAppVersionName(Context context) {
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return info.versionName != null ? info.versionName : "unknown";
        } catch (Exception e) {
            return "unknown";
        }
    }

    /**
     * Reads the live signing certificate SHA-1 of the currently installed APK on this device.
     * For Play Store installs this reports the actual Play App Signing SHA-1; for direct APK
     * installs it reports the Upload Key SHA-1. Never hard-coded.
     */
    private String getInstalledSigningSha1(Context context) {
        try {
            PackageManager pm = context.getPackageManager();
            String pkg = context.getPackageName();
            Signature[] signatures = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                PackageInfo pkgInfo = pm.getPackageInfo(pkg, PackageManager.GET_SIGNING_CERTIFICATES);
                SigningInfo signingInfo = pkgInfo.signingInfo;
                if (signingInfo != null) {
                    signatures = signingInfo.hasMultipleSigners()
                            ? signingInfo.getApkContentsSigners()
                            : signingInfo.getSigningCertificateHistory();
                }
            } else {
                @SuppressWarnings("deprecation")
                PackageInfo pkgInfo = pm.getPackageInfo(pkg, PackageManager.GET_SIGNATURES);
                @SuppressWarnings("deprecation")
                Signature[] legacySignatures = pkgInfo.signatures;
                signatures = legacySignatures;
            }

            if (signatures == null || signatures.length == 0) {
                return "unavailable";
            }

            MessageDigest md = MessageDigest.getInstance("SHA-1");
            List<String> fingerprints = new ArrayList<>();
            for (Signature sig : signatures) {
                byte[] digest = md.digest(sig.toByteArray());
                StringBuilder hex = new StringBuilder();
                for (int i = 0; i < digest.length; i++) {
                    if (i > 0) {
                        hex.append(':');
                    }
                    hex.append(String.format(Locale.US, "%02X", digest[i]));
                }
                fingerprints.add(hex.toString());
            }
            return String.join(",", fingerprints);
        } catch (Exception e) {
            Log.w(TAG, "Unable to compute runtime APK signing SHA-1: " + e.getClass().getSimpleName());
            return "unavailable";
        }
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            Log.e(TAG, "signIn aborted: Android Activity is null.");
            call.reject("Android activity unavailable for Google Sign-In.");
            return;
        }

        Context context = getContext();
        String runtimePackage = context.getPackageName();
        long versionCode = getAppVersionCode(context);
        String versionName = getAppVersionName(context);
        String runtimeSha1 = getInstalledSigningSha1(context);
        ResolvedWebClientConfig webConfig = resolveWebClientConfig();

        int playServicesStatus = GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(activity);
        Log.i(TAG, "Starting native Google Sign-In | pkg=" + runtimePackage
                + " | version=" + versionName + " (" + versionCode + ")"
                + " | playServicesStatus=" + playServicesStatus
                + " | webClientIdSource=" + webConfig.source
                + " | webClientId=" + maskWebClientId(webConfig.clientId)
                + " | installedSha1=" + runtimeSha1);

        if (!EXPECTED_PACKAGE_NAME.equals(runtimePackage)) {
            Log.e(TAG, "Package mismatch detected: expected " + EXPECTED_PACKAGE_NAME + " but got " + runtimePackage);
        }

        if (playServicesStatus != ConnectionResult.SUCCESS) {
            String statusText = GoogleApiAvailability.getInstance().getErrorString(playServicesStatus);
            Log.e(TAG, "Google Play Services unavailable: status=" + playServicesStatus + " (" + statusText + ")");
            call.reject("Google Play Services unavailable (status " + playServicesStatus + ": " + statusText
                    + "). Update Google Play Services on this device and try again.");
            return;
        }

        if (!webConfig.clientId.endsWith(".apps.googleusercontent.com")) {
            Log.e(TAG, "Invalid default_web_client_id format from " + webConfig.source);
            call.reject("Invalid Web OAuth Client ID configuration (" + webConfig.source + "). Rebuild with a valid google-services.json.");
            return;
        }

        GoogleSignInClient client = buildClient(activity, webConfig);
        GoogleSignInAccount cachedAccount = GoogleSignIn.getLastSignedInAccount(activity);
        if (cachedAccount != null) {
            try {
                client.signOut().addOnCompleteListener(activity, task -> {
                    if (!task.isSuccessful()) {
                        Log.w(TAG, "Pre-signIn client.signOut() did not succeed; proceeding to account picker.");
                    }
                    launchSignInIntent(call, client);
                });
            } catch (Exception signOutErr) {
                Log.w(TAG, "Pre-signIn client.signOut() threw; launching picker directly: " + signOutErr.getMessage());
                launchSignInIntent(call, client);
            }
        } else {
            launchSignInIntent(call, client);
        }
    }

    private void launchSignInIntent(PluginCall call, GoogleSignInClient client) {
        try {
            Intent signInIntent = client.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleGoogleSignInResult");
        } catch (Exception launchErr) {
            Log.e(TAG, "Failed to launch Google Sign-In intent: " + launchErr.getMessage());
            call.reject("Unable to launch Google Sign-In picker: " + launchErr.getMessage());
        }
    }

    @ActivityCallback
    private void handleGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        Context context = getContext();
        String runtimePackage = context.getPackageName();
        long versionCode = getAppVersionCode(context);
        String versionName = getAppVersionName(context);
        String runtimeSha1 = getInstalledSigningSha1(context);
        ResolvedWebClientConfig webConfig = resolveWebClientConfig();

        if (result == null || result.getData() == null) {
            Log.i(TAG, "Google Sign-In activity returned without intent data (cancelled). resultCode="
                    + (result != null ? result.getResultCode() : -999));
            call.reject("CANCELLED: Google Sign-In was cancelled.");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account != null ? account.getIdToken() : null;
            boolean hasIdToken = idToken != null && !idToken.isEmpty();
            int jwtSegments = hasIdToken ? idToken.split("\\.").length : 0;

            // Never log idToken, accessToken, or secrets — log presence & structural metadata only.
            Log.i(TAG, "Native Google Sign-In result received | pkg=" + runtimePackage
                    + " | version=" + versionName + " (" + versionCode + ")"
                    + " | idTokenPresent=" + hasIdToken
                    + " | jwtSegments=" + jwtSegments
                    + " | webClientIdSource=" + webConfig.source);

            if (!hasIdToken || jwtSegments != 3) {
                Log.e(TAG, "Google Sign-In returned missing or malformed ID token. webClientIdSource="
                        + webConfig.source + " | webClientId=" + maskWebClientId(webConfig.clientId));
                call.reject("Google Sign-In succeeded but ID token was empty or malformed. Verify default_web_client_id ("
                        + maskWebClientId(webConfig.clientId) + ") in google-services.json.");
                return;
            }

            JSObject diagnostics = new JSObject();
            diagnostics.put("packageName", runtimePackage);
            diagnostics.put("versionName", versionName);
            diagnostics.put("versionCode", versionCode);
            diagnostics.put("webClientIdSource", webConfig.source);
            diagnostics.put("webClientIdMasked", maskWebClientId(webConfig.clientId));
            diagnostics.put("installedSigningSha1", runtimeSha1);

            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", account.getEmail() != null ? account.getEmail() : "");
            ret.put("displayName", account.getDisplayName() != null ? account.getDisplayName() : "");
            ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            ret.put("diagnostics", diagnostics);
            call.resolve(ret);
        } catch (ApiException e) {
            int code = e.getStatusCode();
            String statusName = GoogleSignInStatusCodes.getStatusCodeString(code);
            Log.e(TAG, "Google Sign-In ApiException | code=" + code + " (" + statusName + ")"
                    + " | pkg=" + runtimePackage
                    + " | version=" + versionName + " (" + versionCode + ")"
                    + " | webClientIdSource=" + webConfig.source
                    + " | webClientId=" + maskWebClientId(webConfig.clientId)
                    + " | installedSha1=" + runtimeSha1);

            if (code == 12501) {
                call.reject("CANCELLED: Google Sign-In was cancelled by user.");
            } else if (code == 10) {
                call.reject("DEVELOPER_ERROR (status code: 10) for package " + runtimePackage
                        + " v" + versionName + " (" + versionCode + ")."
                        + " Installed APK SHA-1: " + runtimeSha1 + "."
                        + " Web Client ID (" + webConfig.source + "): " + maskWebClientId(webConfig.clientId) + "."
                        + " Google Play Services rejected the Android OAuth client configuration."
                        + " Verify in Google Cloud Console & Firebase project confident-drake-3bcxw that an active Android OAuth client exists for package "
                        + runtimePackage + " with SHA-1 " + runtimeSha1
                        + ", that Google provider is enabled in Firebase Authentication with this Web Client ID, and that OAuth consent screen is configured."
                        + " Exception: " + e.getMessage());
            } else {
                call.reject("Google Sign-In failed with status code: " + code + " (" + statusName + ": " + e.getMessage() + ")");
            }
        }
    }

    @PluginMethod
    public void signOut(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.resolve();
            return;
        }
        ResolvedWebClientConfig webConfig = resolveWebClientConfig();
        buildClient(activity, webConfig).signOut().addOnCompleteListener(activity, task -> {
            Log.i(TAG, "Native Google Sign-Out completed | success=" + task.isSuccessful());
            call.resolve();
        });
    }
}
