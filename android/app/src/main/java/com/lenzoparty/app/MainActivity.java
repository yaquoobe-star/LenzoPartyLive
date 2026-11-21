package com.lenzoparty.app;

import android.Manifest;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.firebase.FirebaseApp;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

public class MainActivity extends BridgeActivity {
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 4091;
    private static final int SYSTEM_BAR_BG_COLOR = Color.parseColor("#060212");
    private final List<PermissionRequest> pendingWebPermissionRequests = new ArrayList<>();
    private boolean permissionDialogInFlight = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        FirebaseApp.initializeApp(this);
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(MediaPermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        configureSystemBarsAndSafeViewport();
        configureWebViewForLiveMedia();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyDarkSystemBarIcons();
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.requestApplyInsets(contentView);
        }
    }

    /**
     * Universal Android WindowInsets & Display Cutout protection (Android 7 -> Android 16+ / API 24-36).
     * Ensures the entire WebView viewport starts strictly BELOW the device status bar (time, notifications,
     * Wi-Fi, signal, battery, notch/punch-hole cutout) and ends strictly ABOVE the bottom system gesture/nav bar
     * and soft keyboard (IME), preventing any app header, back button, or exit button from ever overlapping
     * system icons on any old or new Android device.
     */
    private void configureSystemBarsAndSafeViewport() {
        Window window = getWindow();
        if (window == null) {
            return;
        }

        // Take explicit, consistent control of system insets across Android 7-14 AND Android 15/16 mandatory edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = window.getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            window.setAttributes(lp);
        }

        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
        window.setStatusBarColor(SYSTEM_BAR_BG_COLOR);
        window.setNavigationBarColor(SYSTEM_BAR_BG_COLOR);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }

        applyDarkSystemBarIcons();

        View decorView = window.getDecorView();
        decorView.setBackgroundColor(SYSTEM_BAR_BG_COLOR);

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(SYSTEM_BAR_BG_COLOR);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (view, windowInsets) -> {
                Insets safeSystemBars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                        | WindowInsetsCompat.Type.navigationBars()
                        | WindowInsetsCompat.Type.displayCutout()
                );
                Insets imeInsets = windowInsets.getInsets(WindowInsetsCompat.Type.ime());

                int topInset = Math.max(0, safeSystemBars.top);
                int bottomInset = Math.max(0, Math.max(safeSystemBars.bottom, imeInsets.bottom));
                int leftInset = Math.max(0, safeSystemBars.left);
                int rightInset = Math.max(0, safeSystemBars.right);

                view.setPadding(leftInset, topInset, rightInset, bottomInset);

                // Consume insets so WebView does not apply duplicate CSS safe-area padding
                return WindowInsetsCompat.CONSUMED;
            });
            ViewCompat.requestApplyInsets(contentView);
        }
    }

    private void applyDarkSystemBarIcons() {
        Window window = getWindow();
        if (window == null) {
            return;
        }
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            // Dark background (#060212) -> light (white) clock, battery, signal & nav icons
            controller.setAppearanceLightStatusBars(false);
            controller.setAppearanceLightNavigationBars(false);
        }
    }

    private void configureWebViewForLiveMedia() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        // Enable WebView remote debugging only for debug builds (Play Store release hardened)
        boolean isDebuggable =
            (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);

        WebView webView = getBridge().getWebView();
        webView.setBackgroundColor(SYSTEM_BAR_BG_COLOR);

        WebSettings settings = webView.getSettings();
        // Allow real-time live video & party voice playback without user-gesture blocks
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        // Prevent oversized OS font-scale settings from breaking compact header buttons
        settings.setTextZoom(100);

        webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> handleWebViewMediaPermissionRequest(request));
            }

            @Override
            public void onPermissionRequestCanceled(final PermissionRequest request) {
                runOnUiThread(() -> pendingWebPermissionRequests.remove(request));
            }
        });
    }

    private void handleWebViewMediaPermissionRequest(PermissionRequest request) {
        if (request == null) {
            return;
        }
        String[] resources = request.getResources();
        Set<String> neededAndroidPermissions = new LinkedHashSet<>();

        for (String resource : resources) {
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                        != PackageManager.PERMISSION_GRANTED) {
                    neededAndroidPermissions.add(Manifest.permission.CAMERA);
                }
            } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                        != PackageManager.PERMISSION_GRANTED) {
                    neededAndroidPermissions.add(Manifest.permission.RECORD_AUDIO);
                }
            }
        }

        if (neededAndroidPermissions.isEmpty()) {
            try {
                request.grant(resources);
            } catch (Exception ignored) {
                // ignore if request already invalidated
            }
            return;
        }

        // Queue concurrent requests instead of denying earlier ones while OS dialog is visible
        pendingWebPermissionRequests.add(request);
        if (!permissionDialogInFlight) {
            permissionDialogInFlight = true;
            ActivityCompat.requestPermissions(
                this,
                neededAndroidPermissions.toArray(new String[0]),
                MEDIA_PERMISSION_REQUEST_CODE
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(
        int requestCode,
        @NonNull String[] permissions,
        @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == MEDIA_PERMISSION_REQUEST_CODE) {
            permissionDialogInFlight = false;
            List<PermissionRequest> requestsToResolve = new ArrayList<>(pendingWebPermissionRequests);
            pendingWebPermissionRequests.clear();

            Iterator<PermissionRequest> it = requestsToResolve.iterator();
            while (it.hasNext()) {
                PermissionRequest req = it.next();
                List<String> grantedResources = new ArrayList<>();
                for (String resource : req.getResources()) {
                    if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                                == PackageManager.PERMISSION_GRANTED) {
                            grantedResources.add(resource);
                        }
                    } else if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                                == PackageManager.PERMISSION_GRANTED) {
                            grantedResources.add(resource);
                        }
                    } else {
                        grantedResources.add(resource);
                    }
                }

                try {
                    if (!grantedResources.isEmpty()) {
                        req.grant(grantedResources.toArray(new String[0]));
                    } else {
                        req.deny();
                    }
                } catch (Exception ignored) {
                    // ignore stale WebView request
                }
            }
        }
    }
}
