package com.nonsensechat.rn

import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import com.google.firebase.database.ChildEventListener
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import java.util.concurrent.ConcurrentHashMap

class NonsenseBackgroundService : Service() {

    companion object {
        const val CHANNEL_SYNC_ID = "nonsense_sync_channel"
        const val CHANNEL_SYNC_NAME = "Фоновая служба сообщений"
        const val FOREGROUND_NOTIF_ID = 1001

        const val ACTION_START = "com.nonsensechat.rn.START_SYNC"
        const val ACTION_STOP = "com.nonsensechat.rn.STOP_SYNC"
        const val EXTRA_UID = "extra_uid"

        private const val PREFS_NAME = "NonsenseChatPrefs"
        private const val KEY_SYNC_UID = "sync_uid"
        private const val KEY_SYNC_ENABLED = "sync_enabled"

        @Volatile
        var isServiceRunning: Boolean = false
            private set

        fun start(context: Context, uid: String) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_SYNC_UID, uid).putBoolean(KEY_SYNC_ENABLED, true).apply()

            val intent = Intent(context, NonsenseBackgroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_UID, uid)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_SYNC_ENABLED, false).apply()

            val intent = Intent(context, NonsenseBackgroundService::class.java).apply {
                action = ACTION_STOP
            }
            context.startService(intent)
        }
    }

    private var currentUid: String = ""
    private var childListener: ChildEventListener? = null
    private val lastKnownAt = ConcurrentHashMap<String, Long>()
    private var serviceStartTime = 0L

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        isServiceRunning = true
        serviceStartTime = System.currentTimeMillis()
        createSyncChannel()
    }

    private fun createSyncChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_SYNC_ID,
                CHANNEL_SYNC_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Обеспечивает доставку уведомлений в реальном времени"
                setShowBadge(false)
                lockscreenVisibility = Notification.VISIBILITY_SECRET
            }
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            nm?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }
        val pendingIntent = PendingIntent.getActivity(this, 1002, launchIntent, flags)

        return NotificationCompat.Builder(this, CHANNEL_SYNC_ID)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Беспонтовый Чат")
            .setContentText("Служба сообщений активна в фоне")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .build()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action ?: ACTION_START

        if (action == ACTION_STOP) {
            stopListening()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
            isServiceRunning = false
            return START_NOT_STICKY
        }

        // Start foreground notification immediately
        try {
            val notification = buildForegroundNotification()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(
                    FOREGROUND_NOTIF_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
                )
            } else {
                startForeground(FOREGROUND_NOTIF_ID, notification)
            }
        } catch (_: Exception) {}

        val uidFromIntent = intent?.getStringExtra(EXTRA_UID)
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val uid = uidFromIntent ?: prefs.getString(KEY_SYNC_UID, null) ?: ""

        if (uid.isNotEmpty() && uid != currentUid) {
            currentUid = uid
            startListening(uid)
        }

        return START_STICKY
    }

    private fun startListening(uid: String) {
        stopListening()
        try {
            val db = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com")
            val chatsRef = db.getReference("chats")

            val listener = object : ChildEventListener {
                override fun onChildAdded(snapshot: DataSnapshot, previousChildName: String?) {
                    val cid = snapshot.key ?: return
                    val msgAt = snapshot.child("lastMsgAt").getValue(Long::class.java) ?: 0L
                    lastKnownAt[cid] = maxOf(lastKnownAt[cid] ?: 0L, msgAt)
                }

                override fun onChildChanged(snapshot: DataSnapshot, previousChildName: String?) {
                    val cid = snapshot.key ?: return
                    val rawMsg = snapshot.child("lastMsg").getValue(String::class.java) ?: ""
                    val msgAt = snapshot.child("lastMsgAt").getValue(Long::class.java) ?: 0L
                    val msgUid = snapshot.child("lastMsgUid").getValue(String::class.java) ?: ""
                    val chatName = snapshot.child("name").getValue(String::class.java) ?: "Новое сообщение"

                    // Check membership
                    val membersSnap = snapshot.child("members")
                    var isMember = false
                    if (cid == "aihub_$uid" || cid.contains(uid)) {
                        isMember = true
                    } else {
                        for (m in membersSnap.children) {
                            if (m.getValue(String::class.java) == uid) {
                                isMember = true
                                break
                            }
                        }
                    }

                    if (!isMember) return

                    val prevAt = lastKnownAt[cid] ?: 0L
                    lastKnownAt[cid] = msgAt

                    // If message is new and not sent by current user
                    if (msgAt > prevAt && msgUid != uid && msgAt >= (serviceStartTime - 5000)) {
                        val cleanBody = rawMsg.replace(Regex("<[^>]+>"), "").trim()
                        val preview = if (cleanBody.isNotEmpty()) cleanBody else "Новое сообщение"
                        NotificationModule.showNotificationStatic(
                            applicationContext,
                            chatName,
                            preview,
                            cid
                        )
                    }
                }

                override fun onChildRemoved(snapshot: DataSnapshot) {
                    snapshot.key?.let { lastKnownAt.remove(it) }
                }

                override fun onChildMoved(snapshot: DataSnapshot, previousChildName: String?) {}
                override fun onCancelled(error: DatabaseError) {}
            }

            chatsRef.addChildEventListener(listener)
            childListener = listener
        } catch (_: Exception) {}
    }

    private fun stopListening() {
        childListener?.let { l ->
            try {
                val db = FirebaseDatabase.getInstance("https://nonsensechattm-e5d18-default-rtdb.firebaseio.com")
                db.getReference("chats").removeEventListener(l)
            } catch (_: Exception) {}
            childListener = null
        }
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val syncEnabled = prefs.getBoolean(KEY_SYNC_ENABLED, false)
        val uid = prefs.getString(KEY_SYNC_UID, "") ?: ""

        if (syncEnabled && uid.isNotEmpty()) {
            val restartIntent = Intent(applicationContext, NonsenseBackgroundService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_UID, uid)
            }
            val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
            } else {
                PendingIntent.FLAG_ONE_SHOT
            }
            val restartPendingIntent = PendingIntent.getService(
                applicationContext,
                1003,
                restartIntent,
                flags
            )
            val alarmManager = getSystemService(Context.ALARM_SERVICE) as? AlarmManager
            alarmManager?.set(
                AlarmManager.ELAPSED_REALTIME_WAKEUP,
                SystemClock.elapsedRealtime() + 2000,
                restartPendingIntent
            )
        }
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        isServiceRunning = false
        stopListening()
        super.onDestroy()
    }
}
