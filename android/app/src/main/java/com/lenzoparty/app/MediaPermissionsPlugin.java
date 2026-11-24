package com.lenzoparty.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
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
    private AudioFocusRequest activeFocusRequest = null;

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

    private boolean isExternalHeadsetConnected(AudioManager audioManager) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                AudioDeviceInfo[] outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
                for (AudioDeviceInfo dev : outputs) {
                    int type = dev.getType();
                    if (
                        type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                        type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                        type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                        type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                        (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && type == AudioDeviceInfo.TYPE_BLE_HEADSET)
                    ) {
                        return true;
                    }
                }
            } else {
                return audioManager.isWiredHeadsetOn() || audioManager.isBluetoothScoOn() || audioManager.isBluetoothA2dpOn();
            }
        } catch (Exception ignored) {
            // Fallback to default speaker routing
        }
        return false;
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
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        AudioAttributes attrs = new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                            .build();
                        activeFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                            .setAudioAttributes(attrs)
                            .setAcceptsDelayedFocusGain(true)
                            .build();
                        audioManager.requestAudioFocus(activeFocusRequest);
                    }
                    audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                    // Only enable speakerphone if no wired or Bluetooth headset is connected
                    boolean hasHeadset = isExternalHeadsetConnected(audioManager);
                    audioManager.setSpeakerphoneOn(!hasHeadset);
                } else {
                    audioManager.setSpeakerphoneOn(false);
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && activeFocusRequest != null) {
                        audioManager.abandonAudioFocusRequest(activeFocusRequest);
                        activeFocusRequest = null;
                    }
                }
            }
        } catch (Exception ignored) {
            // Audio routing best-effort
        }
        call.resolve();
    }

    @PluginMethod
    public void setKeepScreenOn(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        final Activity activity = getActivity();
        if (activity == null) {
            JSObject res = new JSObject();
            res.put("enabled", false);
            call.resolve(res);
            return;
        }
        try {
            if (activity instanceof MainActivity) {
                ((MainActivity) activity).setKeepScreenOnEnabled(enabled);
            } else {
                activity.runOnUiThread(() -> {
                    Window window = activity.getWindow();
                    if (window == null) {
                        return;
                    }
                    if (enabled) {
                        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    } else {
                        window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    }
                });
            }
            JSObject res = new JSObject();
            res.put("enabled", enabled);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Unable to update screen wake state: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getKeepScreenOnState(PluginCall call) {
        Activity activity = getActivity();
        boolean active = false;
        if (activity instanceof MainActivity) {
            active = ((MainActivity) activity).isKeepScreenOnEnabled();
        } else if (activity != null && activity.getWindow() != null) {
            active =
                (activity.getWindow().getAttributes().flags & WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) != 0;
        }
        JSObject res = new JSObject();
        res.put("enabled", active);
        call.resolve(res);
    }

    @Override
    protected void handleOnDestroy() {
        Activity activity = getActivity();
        if (activity instanceof MainActivity) {
            ((MainActivity) activity).setKeepScreenOnEnabled(false);
        } else if (activity != null) {
            activity.runOnUiThread(() -> {
                Window window = activity.getWindow();
                if (window != null) {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                }
            });
        }
        super.handleOnDestroy();
    }
}
