package com.lenzoparty.app;

import android.Manifest;
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

    @PluginMethod
    public void checkMediaPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera") == PermissionState.GRANTED);
        result.put("microphone", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(result);
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
            JSObject result = new JSObject();
            result.put("camera", getPermissionState("camera") == PermissionState.GRANTED);
            result.put("microphone", getPermissionState("microphone") == PermissionState.GRANTED);
            call.resolve(result);
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
        JSObject result = new JSObject();
        result.put("camera", getPermissionState("camera") == PermissionState.GRANTED);
        result.put("microphone", getPermissionState("microphone") == PermissionState.GRANTED);
        call.resolve(result);
    }
}
