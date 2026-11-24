package com.nonsensechat.rn

import android.Manifest
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Build
import android.util.Base64
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import kotlin.math.max

class VoiceRecorderModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var recorder: MediaRecorder? = null
    private var outputFile: File? = null
    private var startTimeMs: Long = 0L

    override fun getName(): String = "VoiceRecorderModule"

    @ReactMethod
    fun startRecording(maxDurationMs: Int, promise: Promise) {
        try {
            val granted = ContextCompat.checkSelfPermission(
                reactApplicationContext,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                promise.reject("PERMISSION_DENIED", "Нет разрешения на доступ к микрофону")
                return
            }

            cleanupRecorder()

            val file = File(reactApplicationContext.cacheDir, "voice_rec.m4a")
            if (file.exists()) file.delete()
            outputFile = file

            val rec = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(reactApplicationContext)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            rec.setAudioSource(MediaRecorder.AudioSource.MIC)
            rec.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            rec.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            rec.setAudioSamplingRate(44100)
            rec.setAudioEncodingBitRate(64000)
            rec.setOutputFile(file.absolutePath)
            if (maxDurationMs > 0) {
                rec.setMaxDuration(maxDurationMs)
            }

            rec.prepare()
            rec.start()
            recorder = rec
            startTimeMs = System.currentTimeMillis()
            promise.resolve(true)
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("RECORD_START_ERROR", e.message ?: "Ошибка записи", e)
        }
    }

    @ReactMethod
    fun stopRecording(promise: Promise) {
        try {
            val rec = recorder
            val file = outputFile
            if (rec == null || file == null) {
                promise.reject("NOT_RECORDING", "Запись не активна")
                return
            }
            try {
                rec.stop()
            } catch (_: Exception) {}
            try {
                rec.release()
            } catch (_: Exception) {}
            recorder = null

            val durationSec = max(1, ((System.currentTimeMillis() - startTimeMs) / 1000.0).toInt())
            if (!file.exists() || file.length() == 0L) {
                promise.reject("EMPTY_AUDIO", "Аудиозапись пуста")
                return
            }
            val bytes = file.readBytes()
            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            val map = Arguments.createMap().apply {
                putString("dataUrl", "data:audio/mp4;base64,$b64")
                putInt("duration", durationSec)
                putInt("fileSize", bytes.size)
            }
            file.delete()
            outputFile = null
            promise.resolve(map)
        } catch (e: Exception) {
            cleanupRecorder()
            promise.reject("RECORD_STOP_ERROR", e.message ?: "Ошибка завершения записи", e)
        }
    }

    @ReactMethod
    fun cancelRecording() {
        cleanupRecorder()
        try {
            outputFile?.delete()
            outputFile = null
        } catch (_: Exception) {}
    }

    private fun cleanupRecorder() {
        try {
            recorder?.let {
                try { it.stop() } catch (_: Exception) {}
                try { it.release() } catch (_: Exception) {}
            }
            recorder = null
        } catch (_: Exception) {}
    }
}
