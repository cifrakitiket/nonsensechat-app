package com.nonsensechat.rn

import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream
import kotlin.concurrent.thread
import kotlin.math.PI
import kotlin.math.exp
import kotlin.math.sin
import kotlin.random.Random

class SoundPlayerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var activePlayer: MediaPlayer? = null
    private var voicePlayer: MediaPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = "SoundPlayerModule"

    @ReactMethod
    fun playPreset(presetId: String) {
        thread(start = true) {
            try {
                val sampleRate = 44100
                val durationSec = when (presetId) {
                    "pop", "blip", "punch", "hit", "drum" -> 0.30
                    "coin", "laser", "nom", "pirozhok", "cyber", "meow" -> 0.50
                    "magic", "bell", "chime", "tada" -> 0.70
                    "victory", "levelup" -> 0.80
                    else -> 0.45
                }
                val numSamples = (sampleRate * durationSec).toInt()
                val pcm = ShortArray(numSamples)

                for (i in 0 until numSamples) {
                    val t = i.toDouble() / sampleRate
                    val env = exp(-t * (if (durationSec < 0.38) 10.5 else 4.2))
                    val sample: Double = when (presetId) {
                        "coin" -> {
                            val freq = if (t < 0.11) 987.77 else 1318.51
                            sin(2.0 * PI * freq * t) * env
                        }
                        "magic" -> {
                            val f = when {
                                t < 0.15 -> 659.25
                                t < 0.30 -> 880.0
                                t < 0.45 -> 1174.66
                                else -> 1567.98
                            }
                            (sin(2.0 * PI * f * t) * 0.7 + sin(2.0 * PI * f * 1.5 * t) * 0.3) * exp(-t * 3.8)
                        }
                        "victory", "levelup" -> {
                            val freq = when {
                                t < 0.16 -> 523.25
                                t < 0.32 -> 659.25
                                t < 0.48 -> 783.99
                                else -> 1046.50
                            }
                            sin(2.0 * PI * freq * t) * exp(-(t % 0.18) * 3.0) * 0.85
                        }
                        "nom", "pirozhok" -> {
                            val freq = if (t < 0.14) 587.33 else if (t < 0.28) 880.0 else 1174.66
                            (sin(2.0 * PI * freq * t) + 0.3 * sin(2.0 * PI * freq * 2.0 * t)) * 0.7 * env
                        }
                        "meow" -> {
                            val freq = 620.0 + 380.0 * sin(PI * (t / durationSec))
                            sin(2.0 * PI * freq * t) * env
                        }
                        "laser" -> {
                            val freq = 1400.0 * exp(-t * 6.5) + 120.0
                            sin(2.0 * PI * freq * t) * env
                        }
                        "punch", "hit", "drum" -> {
                            val freq = 180.0 * exp(-t * 16.0) + 48.0
                            val noise = (Random.nextDouble() * 2.0 - 1.0) * 0.4
                            (sin(2.0 * PI * freq * t) * 0.75 + noise) * exp(-t * 13.0)
                        }
                        "bell", "chime" -> {
                            (sin(2.0 * PI * 880.0 * t) * 0.6 + sin(2.0 * PI * 1320.0 * t) * 0.4) * env
                        }
                        "pop" -> {
                            val freq = 320.0 + 880.0 * exp(-t * 22.0)
                            sin(2.0 * PI * freq * t) * exp(-t * 16.0)
                        }
                        "blip" -> {
                            val freq = if (t < 0.1) 660.0 else 990.0
                            (if (sin(2.0 * PI * freq * t) >= 0.0) 0.6 else -0.6) * exp(-t * 12.0)
                        }
                        "cyber" -> {
                            val mod = sin(2.0 * PI * 12.0 * t) * 180.0
                            sin(2.0 * PI * (520.0 + mod + t * 500.0) * t) * env
                        }
                        "tada" -> {
                            val chord = sin(2.0 * PI * 523.25 * t) * 0.35 +
                                    sin(2.0 * PI * 659.25 * t) * 0.35 +
                                    sin(2.0 * PI * 783.99 * t) * 0.30
                            chord * exp(-t * 3.5)
                        }
                        else -> sin(2.0 * PI * 740.0 * t) * env
                    }
                    val clamped = (sample * 24000.0).toInt().coerceIn(-32767, 32767)
                    pcm[i] = clamped.toShort()
                }

                val minBuf = AudioTrack.getMinBufferSize(
                    sampleRate,
                    AudioFormat.CHANNEL_OUT_MONO,
                    AudioFormat.ENCODING_PCM_16BIT
                )
                val track = AudioTrack.Builder()
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
                    )
                    .setAudioFormat(
                        AudioFormat.Builder()
                            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                            .setSampleRate(sampleRate)
                            .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                            .build()
                    )
                    .setBufferSizeInBytes(maxOf(minBuf, pcm.size * 2))
                    .setTransferMode(AudioTrack.MODE_STATIC)
                    .build()

                track.write(pcm, 0, pcm.size)
                track.play()
                Thread.sleep((durationSec * 1000).toLong() + 120)
                track.stop()
                track.release()
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun playAudioSource(source: String) {
        if (source.startsWith("preset:")) {
            playPreset(source.removePrefix("preset:"))
            return
        }
        thread(start = true) {
            try {
                stopActivePlayer()
                val player = preparePlayerFromSource(source, "prefix_sound_tmp.mp3") ?: return@thread
                player.setOnCompletionListener {
                    it.release()
                    if (activePlayer === it) activePlayer = null
                }
                activePlayer = player
                player.start()
                // Strict 2.0-second limit for prefix sounds
                mainHandler.postDelayed({
                    try {
                        if (activePlayer === player) {
                            player.stop()
                            player.release()
                            activePlayer = null
                        }
                    } catch (_: Exception) {}
                }, 2050)
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun playVoiceAudio(source: String) {
        thread(start = true) {
            try {
                stopVoiceAudio()
                val player = preparePlayerFromSource(source, "voice_msg_tmp.m4a") ?: return@thread
                player.setOnCompletionListener {
                    it.release()
                    if (voicePlayer === it) voicePlayer = null
                }
                voicePlayer = player
                player.start()
            } catch (_: Exception) {}
        }
    }

    @ReactMethod
    fun stopVoiceAudio() {
        try {
            voicePlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            voicePlayer = null
        } catch (_: Exception) {}
    }

    private fun preparePlayerFromSource(source: String, cacheFileName: String): MediaPlayer? {
        val player = MediaPlayer()
        player.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build()
        )
        if (source.startsWith("data:audio")) {
            val commaIdx = source.indexOf(',')
            if (commaIdx == -1) {
                player.release()
                return null
            }
            val b64 = source.substring(commaIdx + 1)
            val bytes = Base64.decode(b64, Base64.DEFAULT)
            val tmp = File(reactApplicationContext.cacheDir, cacheFileName)
            FileOutputStream(tmp).use { it.write(bytes) }
            player.setDataSource(tmp.absolutePath)
        } else {
            player.setDataSource(source)
        }
        player.prepare()
        return player
    }

    private fun stopActivePlayer() {
        try {
            activePlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            activePlayer = null
        } catch (_: Exception) {}
    }
}
