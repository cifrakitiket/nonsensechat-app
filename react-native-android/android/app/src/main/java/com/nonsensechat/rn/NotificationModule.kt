package com.nonsensechat.rn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.google.firebase.messaging.FirebaseMessaging

class NotificationModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val CHANNEL_ID = "nonsense_chat_channel"
        const val CHANNEL_NAME = "Сообщения NonsenseChat"

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
                    description = "Официальные уведомления Google FCM о сообщениях и звонках"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 200, 100, 200)
                    setSound(soundUri, audioAttributes)
                    enableLights(true)
                    setShowBadge(true)
                }

                val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                notificationManager?.createNotificationChannel(channel)
            }
        }

        fun showNotificationStatic(context: Context, title: String, body: String, chatId: String) {
            createNotificationChannel(context)

            try {
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                if (vibrator != null && vibrator.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vibrator.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 180, 80, 180), -1))
                    } else {
                        @Suppress("DEPRECATION")
                        vibrator.vibrate(longArrayOf(0, 180, 80, 180), -1)
                    }
                }
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

            val pendingIntent = PendingIntent.getActivity(
                context,
                if (chatId.isNotEmpty()) chatId.hashCode() else System.currentTimeMillis().toInt(),
                intent,
                flags
            )

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(if (title.isNotEmpty()) title else "Беспонтовый Чат")
                .setContentText(if (body.isNotEmpty()) body else "Новое сообщение")
                .setStyle(NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setSound(soundUri)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)

            val notificationManager = NotificationManagerCompat.from(context)
            try {
                val notifId = if (chatId.isNotEmpty()) chatId.hashCode() else (System.currentTimeMillis() % 100000).toInt()
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
