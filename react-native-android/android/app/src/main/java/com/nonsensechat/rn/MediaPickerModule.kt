package com.nonsensechat.rn

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.ByteArrayOutputStream
import kotlin.concurrent.thread
import kotlin.math.max
import kotlin.math.roundToInt

class MediaPickerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val REQ_PICK_IMAGE = 4101
        private const val REQ_TAKE_PHOTO = 4102
        private const val REQ_PICK_FILE = 4103
        private const val REQ_PICK_AUDIO = 4104
    }

    private var pendingPromise: Promise? = null
    private var pendingMode: Int = 0

    private val activityListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode !in listOf(REQ_PICK_IMAGE, REQ_TAKE_PHOTO, REQ_PICK_FILE, REQ_PICK_AUDIO)) return
            val promise = pendingPromise
            val mode = pendingMode
            pendingPromise = null
            pendingMode = 0

            if (promise == null) return
            if (resultCode != Activity.RESULT_OK || data == null) {
                promise.reject("CANCELLED", "Выбор отменён")
                return
            }

            thread(start = true) {
                try {
                    when (mode) {
                        REQ_TAKE_PHOTO -> {
                            @Suppress("DEPRECATION")
                            val bmp = data.extras?.get("data") as? Bitmap
                            if (bmp == null) {
                                promise.reject("NO_PHOTO", "Не удалось получить фото с камеры")
                                return@thread
                            }
                            val baos = ByteArrayOutputStream()
                            bmp.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                            val bytes = baos.toByteArray()
                            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                            val map = Arguments.createMap().apply {
                                putString("dataUrl", "data:image/jpeg;base64,$b64")
                                putString("fileName", "camera_${System.currentTimeMillis()}.jpg")
                                putInt("fileSize", bytes.size)
                            }
                            promise.resolve(map)
                        }
                        REQ_PICK_IMAGE -> {
                            val uri = data.data
                            if (uri == null) {
                                promise.reject("NO_URI", "Изображение не выбрано")
                                return@thread
                            }
                            val cr = reactApplicationContext.contentResolver
                            val rawBytes = cr.openInputStream(uri)?.use { it.readBytes() }
                            if (rawBytes == null) {
                                promise.reject("READ_ERROR", "Не удалось прочитать изображение")
                                return@thread
                            }
                            val bmp = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
                            if (bmp == null) {
                                promise.reject("DECODE_ERROR", "Некорректный формат изображения")
                                return@thread
                            }
                            val maxDim = 1280
                            val curMax = max(bmp.width, bmp.height)
                            val scaled = if (curMax > maxDim) {
                                val ratio = maxDim.toFloat() / curMax.toFloat()
                                Bitmap.createScaledBitmap(
                                    bmp,
                                    (bmp.width * ratio).roundToInt().coerceAtLeast(1),
                                    (bmp.height * ratio).roundToInt().coerceAtLeast(1),
                                    true
                                )
                            } else {
                                bmp
                            }
                            val baos = ByteArrayOutputStream()
                            scaled.compress(Bitmap.CompressFormat.JPEG, 82, baos)
                            val outBytes = baos.toByteArray()
                            val b64 = Base64.encodeToString(outBytes, Base64.NO_WRAP)
                            val fileName = queryFileName(uri) ?: "photo_${System.currentTimeMillis()}.jpg"
                            val map = Arguments.createMap().apply {
                                putString("dataUrl", "data:image/jpeg;base64,$b64")
                                putString("fileName", fileName)
                                putInt("fileSize", outBytes.size)
                            }
                            promise.resolve(map)
                        }
                        REQ_PICK_FILE -> {
                            val uri = data.data
                            if (uri == null) {
                                promise.reject("NO_URI", "Файл не выбран")
                                return@thread
                            }
                            val cr = reactApplicationContext.contentResolver
                            val bytes = cr.openInputStream(uri)?.use { it.readBytes() }
                            if (bytes == null) {
                                promise.reject("READ_ERROR", "Не удалось прочитать файл")
                                return@thread
                            }
                            if (bytes.size > 4 * 1024 * 1024) {
                                promise.reject("TOO_LARGE", "Максимальный размер файла — 4 МБ")
                                return@thread
                            }
                            val mime = cr.getType(uri) ?: "application/octet-stream"
                            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                            val fileName = queryFileName(uri) ?: "file_${System.currentTimeMillis()}"
                            val map = Arguments.createMap().apply {
                                putString("dataUrl", "data:$mime;base64,$b64")
                                putString("fileName", fileName)
                                putInt("fileSize", bytes.size)
                                putString("mimeType", mime)
                            }
                            promise.resolve(map)
                        }
                        REQ_PICK_AUDIO -> {
                            val uri = data.data
                            if (uri == null) {
                                promise.reject("NO_URI", "Аудиофайл не выбран")
                                return@thread
                            }
                            val cr = reactApplicationContext.contentResolver
                            val bytes = cr.openInputStream(uri)?.use { it.readBytes() }
                            if (bytes == null) {
                                promise.reject("READ_ERROR", "Не удалось прочитать аудио")
                                return@thread
                            }
                            if (bytes.size > (1.5 * 1024 * 1024).toInt()) {
                                promise.reject("TOO_LARGE", "Максимальный размер аудио — 1.5 МБ")
                                return@thread
                            }
                            val mime = cr.getType(uri) ?: "audio/mpeg"
                            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                            val fileName = queryFileName(uri) ?: "audio_${System.currentTimeMillis()}.mp3"
                            val map = Arguments.createMap().apply {
                                putString("dataUrl", "data:$mime;base64,$b64")
                                putString("fileName", fileName)
                                putInt("fileSize", bytes.size)
                            }
                            promise.resolve(map)
                        }
                    }
                } catch (e: Exception) {
                    promise.reject("PICK_ERROR", e.message ?: "Ошибка обработки файла", e)
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    override fun getName(): String = "MediaPickerModule"

    private fun queryFileName(uri: Uri): String? {
        return try {
            reactApplicationContext.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0 && cursor.moveToFirst()) cursor.getString(nameIndex) else null
            }
        } catch (_: Exception) {
            null
        }
    }

    private fun launchPicker(intent: Intent, reqCode: Int, promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Экран приложения недоступен")
            return
        }
        pendingPromise?.reject("CANCELLED", "Прервано новым запросом")
        pendingPromise = promise
        pendingMode = reqCode
        try {
            activity.startActivityForResult(intent, reqCode)
        } catch (e: Exception) {
            pendingPromise = null
            pendingMode = 0
            promise.reject("LAUNCH_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun pickImage(promise: Promise) {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        launchPicker(Intent.createChooser(intent, "Выберите фото"), REQ_PICK_IMAGE, promise)
    }

    @ReactMethod
    fun takePhoto(promise: Promise) {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        launchPicker(intent, REQ_TAKE_PHOTO, promise)
    }

    @ReactMethod
    fun pickFile(promise: Promise) {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "*/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        launchPicker(Intent.createChooser(intent, "Выберите файл"), REQ_PICK_FILE, promise)
    }

    @ReactMethod
    fun pickAudio(promise: Promise) {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "audio/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        launchPicker(Intent.createChooser(intent, "Выберите аудиофайл"), REQ_PICK_AUDIO, promise)
    }
}
