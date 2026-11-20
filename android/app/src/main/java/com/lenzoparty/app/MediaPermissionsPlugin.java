package com.lenzoparty.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "MediaPermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
    }
)
public class MediaPermissionsPlugin extends Plugin {

    private JSObject buildStatusObject(boolean requestedBefore) {
        Activity activity = getActivity();
        boolean camGranted =
            getPermissionState("camera") == PermissionState.GRANTED ||
            (activity != null &&
                ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED);
        boolean micGranted =
            getPermissionState("microphone") == PermissionState.GRANTED ||
            (activity != null &&
                ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED);

        boolean camPermanentlyDenied = false;
        boolean micPermanentlyDenied = false;
        if (activity != null && requestedBefore) {
            if (!camGranted && !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.CAMERA)) {
                camPermanentlyDenied = true;
            }
            if (!micGranted && !ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.RECORD_AUDIO)) {
                micPermanentlyDenied = true;
            }
        }

        JSObject result = new JSObject();
        result.put("camera", camGranted);
        result.put("microphone", micGranted);
        result.put("cameraPermanentlyDenied", camPermanentlyDenied);
        result.put("microphonePermanentlyDenied", micPermanentlyDenied);
        return result;
    }

    @PluginMethod
    public void checkMediaPermissions(PluginCall call) {
        call.resolve(buildStatusObject(false));
    }

    @PluginMethod
    public void requestMediaPermissions(PluginCall call) {
        boolean needVideo = Boolean.TRUE.equals(call.getBoolean("video", true));
        boolean needAudio = Boolean.TRUE.equals(call.getBoolean("audio", true));

        List<String> aliasesToRequest = new ArrayList<>();
        if (needVideo && getPermissionState("camera") != PermissionState.GRANTED) {
            aliasesToRequest.add("camera");
        }
        if (needAudio && getPermissionState("microphone") != PermissionState.GRANTED) {
            aliasesToRequest.add("microphone");
        }

        if (aliasesToRequest.isEmpty()) {
            call.resolve(buildStatusObject(false));
            return;
        }

        requestPermissionForAliases(
            aliasesToRequest.toArray(new String[0]),
            call,
            "mediaPermissionsCallback"
        );
    }

    @PermissionCallback
    private void mediaPermissionsCallback(PluginCall call) {
        if (call == null) {
            return;
        }
        call.resolve(buildStatusObject(true));
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", activity.getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            activity.startActivity(intent);
            JSObject res = new JSObject();
            res.put("opened", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Unable to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setCommunicationAudioMode(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        Context context = getContext();
        if (context == null) {
            call.resolve();
            return;
        }
        try {
            AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (enabled) {
                    audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                    audioManager.setSpeakerphoneOn(true);
                } else {
                    audioManager.setSpeakerphoneOn(false);
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                }
            }
        } catch (Exception ignored) {
            // Audio routing best-effort
        }
        call.resolve();
    }
}
