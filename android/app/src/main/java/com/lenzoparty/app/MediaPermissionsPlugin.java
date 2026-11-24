package com.lenzoparty.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.AudioDeviceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMuxer;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.provider.Settings;
import android.view.Window;
import android.view.WindowManager;
import androidx.activity.result.ActivityResult;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(
    name = "MediaPermissions",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA }),
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "mediaAudio", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "mediaVideo", strings = { Manifest.permission.READ_MEDIA_VIDEO }),
        @Permission(alias = "legacyStorage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE })
    }
)
public class MediaPermissionsPlugin extends Plugin {
    private static final long MAX_PARTY_MEDIA_BYTES = 200L * 1024L * 1024L;
    private static final int MAX_CACHED_PARTY_FILES = 10;
    private AudioFocusRequest activeFocusRequest = null;
    private final ExecutorService mediaIoExecutor = Executors.newSingleThreadExecutor();
    private volatile String pendingMediaKind = "audio";

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

    @PluginMethod
    public void pickPartyMediaFile(PluginCall call) {
        String kind = call.getString("mediaKind", "audio");
        this.pendingMediaKind = "video".equalsIgnoreCase(kind) ? "video" : "audio";

        // Request Android runtime media permission on first use so gallery/media providers grant access seamlessly;
        // ACTION_OPEN_DOCUMENT (SAF) also grants per-URI read permission even if user declines broad library access.
        String alias;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            alias = "video".equals(this.pendingMediaKind) ? "mediaVideo" : "mediaAudio";
        } else {
            alias = "legacyStorage";
        }

        if (getPermissionState(alias) != PermissionState.GRANTED) {
            requestPermissionForAlias(alias, call, "partyMediaPermissionCallback");
            return;
        }

        launchPartyMediaDocumentPicker(call, this.pendingMediaKind);
    }

    @PermissionCallback
    private void partyMediaPermissionCallback(PluginCall call) {
        if (call == null) {
            return;
        }
        // Proceed with SAF ACTION_OPEN_DOCUMENT even if broad storage permission was denied,
        // because Android SAF grants temporary read access to the user-selected content:// URI.
        launchPartyMediaDocumentPicker(call, this.pendingMediaKind);
    }

    private void launchPartyMediaDocumentPicker(PluginCall call, String mediaKind) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity unavailable");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            if ("video".equals(mediaKind)) {
                intent.setType("video/*");
                intent.putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    new String[] {
                        "video/mp4",
                        "video/quicktime",
                        "video/webm",
                        "video/x-matroska",
                        "video/3gpp",
                        "video/mp4v-es",
                        "video/*"
                    }
                );
            } else {
                intent.setType("audio/*");
                intent.putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    new String[] {
                        "audio/mpeg",
                        "audio/mp4",
                        "audio/aac",
                        "audio/x-m4a",
                        "audio/m4a",
                        "audio/wav",
                        "audio/x-wav",
                        "audio/ogg",
                        "audio/flac",
                        "audio/webm",
                        "audio/3gpp",
                        "audio/*"
                    }
                );
            }
            startActivityForResult(call, intent, "handlePartyMediaPickResult");
        } catch (Exception e) {
            call.reject("Unable to open device media picker: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void handlePartyMediaPickResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }
        if (result == null || result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        final Uri uri = result.getData().getData();
        if (uri == null) {
            JSObject cancelled = new JSObject();
            cancelled.put("cancelled", true);
            call.resolve(cancelled);
            return;
        }

        final Context appContext = getContext() != null ? getContext().getApplicationContext() : null;
        if (appContext == null) {
            call.reject("Application context unavailable");
            return;
        }

        final String mediaKind = this.pendingMediaKind;
        mediaIoExecutor.execute(() -> processSelectedPartyMediaUri(appContext, uri, mediaKind, call));
    }

    private void processSelectedPartyMediaUri(Context context, Uri uri, String mediaKind, PluginCall call) {
        File copiedSourceFile = null;
        try {
            ContentResolver resolver = context.getContentResolver();
            String displayName = resolveDisplayName(resolver, uri, mediaKind);
            String detectedMime = resolver.getType(uri);
            if (detectedMime == null || detectedMime.trim().isEmpty()) {
                detectedMime = guessMimeFromFileName(displayName, mediaKind);
            }

            File cacheDir = new File(context.getCacheDir(), "party_music");
            if (!cacheDir.exists() && !cacheDir.mkdirs()) {
                call.reject("Unable to prepare app media cache directory.");
                return;
            }
            pruneOldPartyMusicCache(cacheDir);

            String ext = resolveSafeExtension(displayName, detectedMime, mediaKind);
            String stamp = String.valueOf(System.currentTimeMillis());
            copiedSourceFile = new File(cacheDir, "src_" + stamp + "." + ext);

            long copiedBytes = 0L;
            try (InputStream in = resolver.openInputStream(uri);
                 FileOutputStream out = new FileOutputStream(copiedSourceFile)) {
                if (in == null) {
                    call.reject("Unable to read selected file from Android storage. Please choose a local device file.");
                    return;
                }
                byte[] buffer = new byte[65536];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    copiedBytes += read;
                    if (copiedBytes > MAX_PARTY_MEDIA_BYTES) {
                        throw new IllegalStateException("Selected media file is too large (max 200 MB).");
                    }
                    out.write(buffer, 0, read);
                }
                out.flush();
            }

            if (copiedBytes <= 0L) {
                safeDeleteFile(copiedSourceFile);
                call.reject("Selected file is empty or unreadable.");
                return;
            }

            // Inspect real container tracks & audio codec with Android MediaExtractor
            MediaExtractor extractor = new MediaExtractor();
            int audioTrackIndex = -1;
            MediaFormat audioFormat = null;
            String audioCodec = "";
            double durationSec = 0.0;
            int sampleRate = 0;
            int channelCount = 0;

            try {
                extractor.setDataSource(copiedSourceFile.getAbsolutePath());
                int trackCount = extractor.getTrackCount();
                for (int i = 0; i < trackCount; i++) {
                    MediaFormat format = extractor.getTrackFormat(i);
                    String trackMime = format.getString(MediaFormat.KEY_MIME);
                    if (trackMime != null && trackMime.toLowerCase(Locale.US).startsWith("audio/")) {
                        audioTrackIndex = i;
                        audioFormat = format;
                        audioCodec = trackMime;
                        if (format.containsKey(MediaFormat.KEY_DURATION)) {
                            durationSec = Math.max(0.0, format.getLong(MediaFormat.KEY_DURATION) / 1_000_000.0);
                        }
                        if (format.containsKey(MediaFormat.KEY_SAMPLE_RATE)) {
                            sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE);
                        }
                        if (format.containsKey(MediaFormat.KEY_CHANNEL_COUNT)) {
                            channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT);
                        }
                        break;
                    }
                }

                if (audioTrackIndex < 0 || audioFormat == null) {
                    safeDeleteFile(copiedSourceFile);
                    call.reject(
                        "video".equals(mediaKind)
                            ? "This video file does not contain an audio track."
                            : "No playable audio track found in this file. Try MP3, AAC, M4A, WAV, OGG, FLAC, or MP4."
                    );
                    return;
                }

                File finalOutputFile = copiedSourceFile;
                String finalMime = canonicalizeAudioOrVideoMime(detectedMime, audioCodec, mediaKind);
                boolean extractedAudioOnly = false;

                // For Gallery Video, extract ONLY the audio track losslessly via MediaMuxer.
                // This avoids HEVC/H.265/4K video codec failures in WebView while keeping crisp original audio!
                if ("video".equals(mediaKind)) {
                    File remuxed = tryExtractAudioOnlyTrack(extractor, audioTrackIndex, audioFormat, audioCodec, cacheDir, stamp);
                    if (remuxed != null && remuxed.exists() && remuxed.length() > 0) {
                        safeDeleteFile(copiedSourceFile);
                        finalOutputFile = remuxed;
                        extractedAudioOnly = true;
                        finalMime = remuxed.getName().endsWith(".webm") ? "audio/webm" : "audio/mp4";
                    }
                }

                JSObject res = new JSObject();
                res.put("cancelled", false);
                res.put("nativeFilePath", finalOutputFile.getAbsolutePath());
                res.put("fileName", displayName);
                res.put("mimeType", finalMime);
                res.put("audioCodec", audioCodec);
                res.put("durationSec", durationSec);
                res.put("sampleRate", sampleRate);
                res.put("channelCount", channelCount);
                res.put("fileSize", finalOutputFile.length());
                res.put("extractedAudioOnly", extractedAudioOnly);
                call.resolve(res);
            } finally {
                try {
                    extractor.release();
                } catch (Exception ignored) {
                    // ignore
                }
            }
        } catch (Exception e) {
            safeDeleteFile(copiedSourceFile);
            String msg = e.getMessage();
            if (msg == null || msg.trim().isEmpty()) {
                msg = "Unable to open or decode the selected media file. Try MP3, AAC, M4A, WAV, or MP4.";
            }
            call.reject(msg);
        }
    }

    private File tryExtractAudioOnlyTrack(
        MediaExtractor extractor,
        int audioTrackIndex,
        MediaFormat audioFormat,
        String audioCodec,
        File cacheDir,
        String stamp
    ) {
        String lowerCodec = audioCodec != null ? audioCodec.toLowerCase(Locale.US) : "";
        int outputFormat;
        String outExt;
        if (
            lowerCodec.equals("audio/mp4a-latm") ||
            lowerCodec.equals("audio/mp4") ||
            lowerCodec.equals("audio/mpeg") ||
            lowerCodec.equals("audio/3gpp") ||
            lowerCodec.equals("audio/amr-wb")
        ) {
            outputFormat = MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4;
            outExt = "m4a";
        } else if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP &&
            (lowerCodec.equals("audio/vorbis") || lowerCodec.equals("audio/opus"))
        ) {
            outputFormat = MediaMuxer.OutputFormat.MUXER_OUTPUT_WEBM;
            outExt = "webm";
        } else {
            return null;
        }

        File outFile = new File(cacheDir, "audio_" + stamp + "." + outExt);
        MediaMuxer muxer = null;
        boolean muxerStarted = false;
        try {
            extractor.selectTrack(audioTrackIndex);
            extractor.seekTo(0, MediaExtractor.SEEK_TO_CLOSEST_SYNC);

            int maxBufSize = 256 * 1024;
            if (audioFormat.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) {
                int fmtMax = audioFormat.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE);
                if (fmtMax > 0) {
                    maxBufSize = Math.max(fmtMax, 64 * 1024);
                }
            }

            muxer = new MediaMuxer(outFile.getAbsolutePath(), outputFormat);
            int muxTrackIndex = muxer.addTrack(audioFormat);
            muxer.start();
            muxerStarted = true;

            ByteBuffer buffer = ByteBuffer.allocate(maxBufSize);
            MediaCodec.BufferInfo bufferInfo = new MediaCodec.BufferInfo();
            long lastPts = -1L;

            while (true) {
                buffer.clear();
                int sampleSize = extractor.readSampleData(buffer, 0);
                if (sampleSize < 0) {
                    break;
                }
                long pts = extractor.getSampleTime();
                if (pts < 0) {
                    pts = lastPts >= 0 ? lastPts + 20000L : 0L;
                }
                if (lastPts >= 0 && pts < lastPts) {
                    pts = lastPts;
                }
                lastPts = pts;

                bufferInfo.offset = 0;
                bufferInfo.size = sampleSize;
                bufferInfo.presentationTimeUs = pts;
                int sampleFlags = extractor.getSampleFlags();
                int codecFlags = 0;
                if ((sampleFlags & MediaExtractor.SAMPLE_FLAG_SYNC) != 0) {
                    codecFlags |= MediaCodec.BUFFER_FLAG_KEY_FRAME;
                }
                bufferInfo.flags = codecFlags;

                muxer.writeSampleData(muxTrackIndex, buffer, bufferInfo);
                extractor.advance();
            }

            muxer.stop();
            muxerStarted = false;
            muxer.release();
            muxer = null;
            return outFile.exists() && outFile.length() > 0 ? outFile : null;
        } catch (Exception ignored) {
            if (muxer != null) {
                try {
                    if (muxerStarted) {
                        muxer.stop();
                    }
                } catch (Exception ignoredStop) {
                    // ignore
                }
                try {
                    muxer.release();
                } catch (Exception ignoredRel) {
                    // ignore
                }
            }
            safeDeleteFile(outFile);
            return null;
        }
    }

    private String resolveDisplayName(ContentResolver resolver, Uri uri, String mediaKind) {
        Cursor cursor = null;
        try {
            cursor = resolver.query(uri, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null);
            if (cursor != null && cursor.moveToFirst()) {
                int idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (idx >= 0) {
                    String name = cursor.getString(idx);
                    if (name != null && !name.trim().isEmpty()) {
                        return name.trim();
                    }
                }
            }
        } catch (Exception ignored) {
            // fallback below
        } finally {
            if (cursor != null) {
                cursor.close();
            }
        }
        String lastSeg = uri.getLastPathSegment();
        if (lastSeg != null && !lastSeg.trim().isEmpty()) {
            int slash = lastSeg.lastIndexOf('/');
            String cleaned = slash >= 0 ? lastSeg.substring(slash + 1) : lastSeg;
            if (!cleaned.trim().isEmpty()) {
                return cleaned.trim();
            }
        }
        return "video".equals(mediaKind) ? "Gallery Video.mp4" : "Gallery Audio.mp3";
    }

    private String guessMimeFromFileName(String name, String mediaKind) {
        String lower = name != null ? name.toLowerCase(Locale.US) : "";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".m4a")) return "audio/mp4";
        if (lower.endsWith(".aac")) return "audio/aac";
        if (lower.endsWith(".wav")) return "audio/wav";
        if (lower.endsWith(".ogg") || lower.endsWith(".opus")) return "audio/ogg";
        if (lower.endsWith(".flac")) return "audio/flac";
        if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
        if (lower.endsWith(".mov")) return "video/quicktime";
        if (lower.endsWith(".webm")) return "video".equals(mediaKind) ? "video/webm" : "audio/webm";
        if (lower.endsWith(".mkv")) return "video/x-matroska";
        if (lower.endsWith(".3gp")) return "video/3gpp";
        return "video".equals(mediaKind) ? "video/mp4" : "audio/mpeg";
    }

    private String canonicalizeAudioOrVideoMime(String detectedMime, String audioCodec, String mediaKind) {
        String lowerMime = detectedMime != null ? detectedMime.toLowerCase(Locale.US) : "";
        String lowerCodec = audioCodec != null ? audioCodec.toLowerCase(Locale.US) : "";
        if ("video".equals(mediaKind)) {
            if (lowerMime.startsWith("video/")) return lowerMime;
            return "video/mp4";
        }
        if (lowerCodec.equals("audio/mpeg") || lowerMime.equals("audio/mp3")) return "audio/mpeg";
        if (lowerCodec.equals("audio/mp4a-latm") || lowerMime.equals("audio/x-m4a") || lowerMime.equals("audio/m4a")) return "audio/mp4";
        if (lowerCodec.equals("audio/flac")) return "audio/flac";
        if (lowerCodec.equals("audio/vorbis") || lowerCodec.equals("audio/opus")) return "audio/ogg";
        if (lowerCodec.equals("audio/raw")) return "audio/wav";
        if (lowerMime.startsWith("audio/")) return lowerMime;
        return "audio/mpeg";
    }

    private String resolveSafeExtension(String displayName, String mimeType, String mediaKind) {
        if (displayName != null) {
            int dot = displayName.lastIndexOf('.');
            if (dot >= 0 && dot < displayName.length() - 1) {
                String ext = displayName.substring(dot + 1).toLowerCase(Locale.US).replaceAll("[^a-z0-9]", "");
                if (!ext.isEmpty() && ext.length() <= 6) {
                    return ext;
                }
            }
        }
        String lowerMime = mimeType != null ? mimeType.toLowerCase(Locale.US) : "";
        if (lowerMime.contains("mpeg") || lowerMime.contains("mp3")) return "mp3";
        if (lowerMime.contains("mp4") && "audio".equals(mediaKind)) return "m4a";
        if (lowerMime.contains("aac")) return "aac";
        if (lowerMime.contains("wav")) return "wav";
        if (lowerMime.contains("ogg") || lowerMime.contains("opus")) return "ogg";
        if (lowerMime.contains("flac")) return "flac";
        if (lowerMime.contains("webm")) return "webm";
        if (lowerMime.contains("matroska")) return "mkv";
        return "video".equals(mediaKind) ? "mp4" : "mp3";
    }

    private void pruneOldPartyMusicCache(File cacheDir) {
        try {
            File[] files = cacheDir.listFiles();
            if (files == null || files.length <= MAX_CACHED_PARTY_FILES) {
                return;
            }
            Arrays.sort(files, Comparator.comparingLong(File::lastModified));
            int toDelete = files.length - MAX_CACHED_PARTY_FILES;
            for (int i = 0; i < toDelete; i++) {
                safeDeleteFile(files[i]);
            }
        } catch (Exception ignored) {
            // ignore
        }
    }

    private void safeDeleteFile(File f) {
        if (f != null && f.exists()) {
            try {
                //noinspection ResultOfMethodCallIgnored
                f.delete();
            } catch (Exception ignored) {
                // ignore
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            mediaIoExecutor.shutdownNow();
        } catch (Exception ignored) {
            // ignore
        }
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
