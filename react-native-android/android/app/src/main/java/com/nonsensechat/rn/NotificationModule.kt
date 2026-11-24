package com.nonsensechat.rn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.firebase.messaging.FirebaseMessaging
import java.util.concurrent.atomic.AtomicInteger

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID = "nonsense_chat_messages_v3"
        const val CHANNEL_NAME = "Сообщения NonsenseChat"
        private val notifIdCounter = AtomicInteger(2000)
        private val recentNotifications = java.util.concurrent.ConcurrentHashMap<String, Long>()

        fun createNotificationChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                val audioAttributes = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                    .build()

                val channel = NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Уведомления о новых сообщениях, заявках и событиях"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 220, 100, 220)
                    setSound(soundUri, audioAttributes)
                    enableLights(true)
                    lightColor = Color.parseColor("#10B981")
                    setShowBadge(true)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                }

                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                notificationManager?.createNotificationChannel(channel)
            }
        }

        fun showNotificationStatic(context: Context, title: String, body: String, chatId: String) {
            // Cancel legacy persistent notification 1001 if present
            try {
                val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                nm?.cancel(1001)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    nm?.deleteNotificationChannel("nonsense_sync_channel")
                }
            } catch (_: Exception) {}

            val cleanBody = body.trim()
            val dedupKey = "$chatId:$cleanBody"
            val now = System.currentTimeMillis()
            val lastTime = recentNotifications[dedupKey] ?: 0L

            // Drop duplicate notifications within 3.5 seconds
            if (now - lastTime < 3500) {
                return
            }
            recentNotifications[dedupKey] = now
            if (recentNotifications.size > 200) {
                recentNotifications.clear()
            }

            createNotificationChannel(context)

            // Vibrate immediately
            try {
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 220, 100, 220), -1))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(longArrayOf(0, 220, 100, 220), -1)
                    }
                }
            } catch (_: Exception) {}

            // Wake up screen briefly so notification is seen
            try {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                @Suppress("DEPRECATION")
                val wakeLock = powerManager?.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                    "nonsensechat:notif_wakelock"
                )
                wakeLock?.acquire(3000)
            } catch (_: Exception) {}

            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("chatId", chatId)
                putExtra("openChat", chatId)
            }

            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_UPDATE_CURRENT
            }

            val notifId = if (chatId.isNotEmpty()) {
                (Math.abs(chatId.hashCode()) % 8000) + 2000
            } else {
                notifIdCounter.incrementAndGet()
            }
            val pendingIntent = PendingIntent.getActivity(
                context,
                notifId,
                intent,
                flags
            )

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle(if (title.isNotEmpty()) title else "Беспонтовый Чат")
                .setContentText(if (body.isNotEmpty()) body else "Новое сообщение")
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setSound(soundUri)
                .setOnlyAlertOnce(false)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            val notificationManager = NotificationManagerCompat.from(context)
            try {
                notificationManager.notify(notifId, builder.build())
            } catch (_: SecurityException) {
            }
        }
    }

    init {
        createNotificationChannel(reactApplicationContext)
    }

    override fun getName(): String = "NotificationModule"

    @ReactMethod
    fun areNotificationsEnabled(promise: Promise) {
        try {
            val enabled = NotificationManagerCompat.from(reactApplicationContext).areNotificationsEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun openNotificationSettings(promise: Promise) {
        try {
            val intent = Intent().apply {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    action = Settings.ACTION_APP_NOTIFICATION_SETTINGS
                    putExtra(Settings.EXTRA_APP_PACKAGE, reactApplicationContext.packageName)
                } else {
                    action = "android.settings.APP_NOTIFICATION_SETTINGS"
                    putExtra("app_package", reactApplicationContext.packageName)
                    putExtra("app_uid", reactApplicationContext.applicationInfo.uid)
                }
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OPEN_SETTINGS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun testNotification(promise: Promise) {
        try {
            showNotificationStatic(
                reactApplicationContext,
                "Тест уведомлений 🔔",
                "Звук, вибрация и статус-бар работают идеально!",
                ""
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("TEST_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startBackgroundSync(uid: String, promise: Promise) {
        try {
            NonsenseBackgroundService.start(reactApplicationContext, uid)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopBackgroundSync(promise: Promise) {
        try {
            NonsenseBackgroundService.stop(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_SERVICE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun isBackgroundSyncRunning(promise: Promise) {
        promise.resolve(NonsenseBackgroundService.isServiceRunning)
    }

    @ReactMethod
    fun clearAllNotifications() {
        try {
            NotificationManagerCompat.from(reactApplicationContext).cancelAll()
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun showNotification(title: String, body: String, chatId: String) {
        showNotificationStatic(reactApplicationContext, title, body, chatId)
    }

    @ReactMethod
    fun getFcmToken(promise: Promise) {
        try {
            FirebaseMessaging.getInstance().token
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        val token = task.result
                        promise.resolve(token)
                    } else {
                        promise.reject("FCM_ERROR", task.exception?.message ?: "Failed to get FCM token")
                    }
                }
        } catch (e: Exception) {
            promise.reject("FCM_EXCEPTION", e.message, e)
        }
    }
}
