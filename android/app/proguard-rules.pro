# Production ProGuard / R8 Rules for Linzo Party Live
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes JavascriptInterface

# Keep Capacitor Native Bridge and Plugins
-keep public class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Firebase SDK classes
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod
-dontwarn com.google.firebase.**
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# Keep Agora RTC native WebRTC classes
-keep class io.agora.** { *; }
-dontwarn io.agora.**

# Keep FileProvider
-keep public class androidx.core.content.FileProvider { *; }

# Preserve custom Android Activity & App components
-keep public class com.linzo.partylive.MainActivity { *; }
