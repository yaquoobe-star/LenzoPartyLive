package com.linzo.partylive;

import android.app.Activity;
import android.content.Intent;
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
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

@CapacitorPlugin(name = "NativeGoogleAuth")
public class NativeGoogleAuthPlugin extends Plugin {
    private static final String FALLBACK_WEB_CLIENT_ID =
            "238539539886-0f0ps46a223ktq8cv07bv6ias2qfnuc9.apps.googleusercontent.com";

    private GoogleSignInClient getClient() {
        int resId = getContext().getResources().getIdentifier(
                "default_web_client_id", "string", getContext().getPackageName()
        );
        String webClientId = resId != 0 ? getContext().getString(resId) : FALLBACK_WEB_CLIENT_ID;

        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(webClientId)
                .requestEmail()
                .requestProfile()
                .build();

        return GoogleSignIn.getClient(getActivity(), gso);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Android activity unavailable for Google Sign-In.");
            return;
        }
        GoogleSignInClient client = getClient();
        client.signOut().addOnCompleteListener(activity, task -> {
            Intent signInIntent = client.getSignInIntent();
            startActivityForResult(call, signInIntent, "handleGoogleSignInResult");
        });
    }

    @ActivityCallback
    private void handleGoogleSignInResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        if (result.getData() == null) {
            call.reject("CANCELLED: Google Sign-In was cancelled.");
            return;
        }

        Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(result.getData());
        try {
            GoogleSignInAccount account = task.getResult(ApiException.class);
            String idToken = account != null ? account.getIdToken() : null;
            if (idToken == null || idToken.isEmpty()) {
                call.reject("Google Sign-In succeeded but ID token was empty. Verify Web Client ID in google-services.json.");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("idToken", idToken);
            ret.put("email", account.getEmail() != null ? account.getEmail() : "");
            ret.put("displayName", account.getDisplayName() != null ? account.getDisplayName() : "");
            ret.put("photoUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : "");
            call.resolve(ret);
        } catch (ApiException e) {
            int code = e.getStatusCode();
            if (code == 12501) {
                call.reject("CANCELLED: Google Sign-In was cancelled by user.");
            } else if (code == 10) {
                call.reject("DEVELOPER_ERROR (status code: 10): Verify SHA-1 fingerprint & package name com.linzo.partylive in Firebase Console.");
            } else {
                call.reject("Google Sign-In failed with status code: " + code + " (" + e.getMessage() + ")");
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
        getClient().signOut().addOnCompleteListener(activity, task -> call.resolve());
    }
}
