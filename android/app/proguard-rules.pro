-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.firebase.database.IgnoreExtraProperties *;
    @com.google.firebase.database.PropertyName *;
}
-keep class com.nonsensechat.app.model.** { *; }
