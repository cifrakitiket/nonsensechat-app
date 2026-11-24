package com.nonsensechat.rn

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class AppUpdaterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    @Volatile
    private var cancelled = false

    override fun getName(): String = "AppUpdaterModule"

    private fun emitProgress(progress: Int, downloadedBytes: Long, totalBytes: Long) {
        try {
            val map = Arguments.createMap().apply {
                putInt("progress", progress)
                putDouble("downloadedBytes", downloadedBytes.toDouble())
                putDouble("totalBytes", totalBytes.toDouble())
            }
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("AppUpdateProgress", map)
        } catch (_: Exception) {}
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun canRequestPackageInstalls(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(reactApplicationContext.packageManager.canRequestPackageInstalls())
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${reactApplicationContext.packageName}")
                ).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", e.message ?: "Не удалось открыть настройки", e)
        }
    }

    @ReactMethod
    fun cancelDownload() {
        cancelled = true
    }

    @ReactMethod
    fun downloadAndInstallApk(apkUrl: String, promise: Promise) {
        cancelled = false
        thread(start = true) {
            var conn: HttpURLConnection? = null
            try {
                val updatesDir = File(reactApplicationContext.cacheDir, "updates")
                if (!updatesDir.exists()) updatesDir.mkdirs()
                val outFile = File(updatesDir, "NonsenseChat-update.apk")
                if (outFile.exists()) outFile.delete()

                val url = URL(apkUrl)
                conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 20000
                    readTimeout = 30000
                    instanceFollowRedirects = true
                }
                conn.connect()

                val code = conn.responseCode
                if (code !in 200..299) {
                    promise.reject("HTTP_ERROR", "Сервер вернул код $code")
                    return@thread
                }

                val totalBytes = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    conn.contentLengthLong
                } else {
                    conn.contentLength.toLong()
                }

                var downloaded = 0L
                var lastEmitTime = 0L
                val buf = ByteArray(32768)

                conn.inputStream.use { input ->
                    FileOutputStream(outFile).use { output ->
                        while (true) {
                            if (cancelled) {
                                outFile.delete()
                                promise.reject("CANCELLED", "Загрузка отменена")
                                return@thread
                            }
                            val read = input.read(buf)
                            if (read <= 0) break
                            output.write(buf, 0, read)
                            downloaded += read

                            val now = System.currentTimeMillis()
                            if (now - lastEmitTime >= 150) {
                                lastEmitTime = now
                                val pct = if (totalBytes > 0) ((downloaded * 100L) / totalBytes).toInt().coerceIn(0, 100) else 0
                                emitProgress(pct, downloaded, totalBytes)
                            }
                        }
                    }
                }

                emitProgress(100, downloaded, if (totalBytes > 0) totalBytes else downloaded)

                val authority = "${reactApplicationContext.packageName}.fileprovider"
                val apkUri: Uri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    FileProvider.getUriForFile(reactApplicationContext, authority, outFile)
                } else {
                    Uri.fromFile(outFile)
                }

                val installIntent = Intent(Intent.ACTION_VIEW).apply {
                    setDataAndType(apkUri, "application/vnd.android.package-archive")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                reactApplicationContext.startActivity(installIntent)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("UPDATE_ERROR", e.message ?: "Ошибка загрузки обновления", e)
            } finally {
                try {
                    conn?.disconnect()
                } catch (_: Exception) {}
            }
        }
    }
}
