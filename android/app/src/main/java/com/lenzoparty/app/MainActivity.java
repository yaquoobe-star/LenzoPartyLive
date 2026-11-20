package com.lenzoparty.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
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
    private final List<PermissionRequest> pendingWebPermissionRequests = new ArrayList<>();
    private boolean permissionDialogInFlight = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        FirebaseApp.initializeApp(this);
        registerPlugin(NativeGoogleAuthPlugin.class);
        registerPlugin(MediaPermissionsPlugin.class);
        super.onCreate(savedInstanceState);

        configureWebViewForLiveMedia();
    }

    private void configureWebViewForLiveMedia() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        // Allow real-time live video & party voice playback without user-gesture blocks
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setDomStorageEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

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
