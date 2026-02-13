# NxStops ProGuard Rules
# ============================================================================

# Capacitor / Cordova — keep WebView JavaScript interfaces
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-dontwarn com.getcapacitor.**

# Keep Cordova plugin classes
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**

# Keep native biometric plugin
-keep class com.nicksomoza.** { *; }
-dontwarn com.nicksomoza.**

# Google Play Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Keep line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep annotations
-keepattributes *Annotation*

# Suppress warnings for common Android libraries
-dontwarn javax.**
-dontwarn org.xml.**
-dontwarn org.w3c.**
