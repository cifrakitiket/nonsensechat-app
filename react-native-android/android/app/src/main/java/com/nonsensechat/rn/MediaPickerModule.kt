package com.nonsensechat.rn

import android.Manifest
import android.app.Activity
import android.content.ContentResolver
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import android.util.Size
import androidx.core.content.ContextCompat
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
        private const val REQ_TAKE_PHOTO = 4102
    }

    private var pendingPromise: Promise? = null
    private var pendingMode: Int = 0

    private val activityListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
            if (requestCode != REQ_TAKE_PHOTO) return
            val promise = pendingPromise
            val mode = pendingMode
            pendingPromise = null
            pendingMode = 0

            if (promise == null) return
            if (resultCode != Activity.RESULT_OK || data == null) {
                promise.reject("CANCELLED", "Съёмка отменена")
                return
            }

            thread(start = true) {
                try {
                    if (mode == REQ_TAKE_PHOTO) {
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
                } catch (e: Exception) {
                    promise.reject("PICK_ERROR", e.message ?: "Ошибка обработки фото", e)
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityListener)
    }

    override fun getName(): String = "MediaPickerModule"

    private fun hasPermission(perm: String): Boolean {
        return ContextCompat.checkSelfPermission(reactApplicationContext, perm) == PackageManager.PERMISSION_GRANTED
    }

    private fun hasImagePermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= 34) {
            hasPermission(Manifest.permission.READ_MEDIA_IMAGES) ||
                hasPermission("android.permission.READ_MEDIA_VISUAL_USER_SELECTED")
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission(Manifest.permission.READ_MEDIA_IMAGES)
        } else {
            hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
    }

    private fun hasAudioPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasPermission(Manifest.permission.READ_MEDIA_AUDIO)
        } else {
            hasPermission(Manifest.permission.READ_EXTERNAL_STORAGE)
        }
    }

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

    private fun makeThumbnailDataUrl(cr: ContentResolver, id: Long, contentUri: Uri): String? {
        return try {
            val thumbBmp: Bitmap? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                cr.loadThumbnail(contentUri, Size(220, 220), null)
            } else {
                @Suppress("DEPRECATION")
                MediaStore.Images.Thumbnails.getThumbnail(
                    cr,
                    id,
                    MediaStore.Images.Thumbnails.MINI_KIND,
                    null
                )
            }
            if (thumbBmp == null) return null
            val baos = ByteArrayOutputStream()
            thumbBmp.compress(Bitmap.CompressFormat.JPEG, 65, baos)
            val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
            "data:image/jpeg;base64,$b64"
        } catch (_: Exception) {
            null
        }
    }

    @ReactMethod
    fun getRecentPhotos(limit: Int, promise: Promise) {
        if (!hasImagePermission()) {
            promise.reject("PERMISSION_DENIED", "Нет доступа к фотографиям")
            return
        }
        thread(start = true) {
            try {
                val cr = reactApplicationContext.contentResolver
                val cap = minOf(if (limit > 0) limit else 48, 48)
                val projection = arrayOf(
                    MediaStore.Images.Media._ID,
                    MediaStore.Images.Media.DISPLAY_NAME,
                    MediaStore.Images.Media.SIZE,
                    MediaStore.Images.Media.WIDTH,
                    MediaStore.Images.Media.HEIGHT,
                    MediaStore.Images.Media.DATE_ADDED,
                    MediaStore.Images.Media.MIME_TYPE
                )
                val result = Arguments.createArray()
                val sortOrder = "${MediaStore.Images.Media.DATE_ADDED} DESC"
                val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    val queryArgs = Bundle().apply {
                        putStringArray(ContentResolver.QUERY_ARG_SORT_COLUMNS, arrayOf(MediaStore.Images.Media.DATE_ADDED))
                        putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
                        putInt(ContentResolver.QUERY_ARG_LIMIT, cap)
                    }
                    cr.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, queryArgs, null)
                } else {
                    cr.query(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, projection, null, null, sortOrder)
                }

                cursor?.use { c ->
                    val idCol = c.getColumnIndexOrThrow(MediaStore.Images.Media._ID)
                    val nameCol = c.getColumnIndex(MediaStore.Images.Media.DISPLAY_NAME)
                    val sizeCol = c.getColumnIndex(MediaStore.Images.Media.SIZE)
                    val wCol = c.getColumnIndex(MediaStore.Images.Media.WIDTH)
                    val hCol = c.getColumnIndex(MediaStore.Images.Media.HEIGHT)
                    val dateCol = c.getColumnIndex(MediaStore.Images.Media.DATE_ADDED)
                    val mimeCol = c.getColumnIndex(MediaStore.Images.Media.MIME_TYPE)

                    var count = 0
                    while (c.moveToNext() && count < cap) {
                        val id = c.getLong(idCol)
                        val contentUri = ContentUris.withAppendedId(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, id)
                        val thumbDataUrl = makeThumbnailDataUrl(cr, id, contentUri)
                        val item = Arguments.createMap().apply {
                            putString("id", id.toString())
                            putString("uri", contentUri.toString())
                            if (thumbDataUrl != null) putString("thumbDataUrl", thumbDataUrl)
                            putString("fileName", if (nameCol >= 0) c.getString(nameCol) ?: "photo_$id.jpg" else "photo_$id.jpg")
                            putDouble("size", if (sizeCol >= 0) c.getLong(sizeCol).toDouble() else 0.0)
                            putInt("width", if (wCol >= 0) c.getInt(wCol) else 0)
                            putInt("height", if (hCol >= 0) c.getInt(hCol) else 0)
                            putDouble("dateAdded", if (dateCol >= 0) c.getLong(dateCol).toDouble() else 0.0)
                            putString("mimeType", if (mimeCol >= 0) c.getString(mimeCol) ?: "image/jpeg" else "image/jpeg")
                        }
                        result.pushMap(item)
                        count++
                    }
                }
                promise.resolve(result)
            } catch (se: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Нет доступа к фотографиям", se)
            } catch (e: Exception) {
                promise.reject("MEDIA_QUERY_ERROR", e.message ?: "Ошибка чтения галереи", e)
            }
        }
    }

    @ReactMethod
    fun getRecentFiles(limit: Int, promise: Promise) {
        thread(start = true) {
            try {
                val cr = reactApplicationContext.contentResolver
                val result = Arguments.createArray()
                val seen = HashSet<String>()
                val cap = minOf(if (limit > 0) limit else 30, 40)

                val projection = arrayOf(
                    MediaStore.Files.FileColumns._ID,
                    MediaStore.Files.FileColumns.DISPLAY_NAME,
                    MediaStore.Files.FileColumns.SIZE,
                    MediaStore.Files.FileColumns.DATE_MODIFIED,
                    MediaStore.Files.FileColumns.MIME_TYPE
                )
                val selection = "${MediaStore.Files.FileColumns.SIZE} > 0 AND ${MediaStore.Files.FileColumns.SIZE} <= 52428800"
                val sortOrder = "${MediaStore.Files.FileColumns.DATE_MODIFIED} DESC"

                fun runQuery(targetUri: Uri) {
                    val cursor = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val queryArgs = Bundle().apply {
                            putString(ContentResolver.QUERY_ARG_SQL_SELECTION, selection)
                            putStringArray(ContentResolver.QUERY_ARG_SORT_COLUMNS, arrayOf(MediaStore.Files.FileColumns.DATE_MODIFIED))
                            putInt(ContentResolver.QUERY_ARG_SORT_DIRECTION, ContentResolver.QUERY_SORT_DIRECTION_DESCENDING)
                            putInt(ContentResolver.QUERY_ARG_LIMIT, cap)
                        }
                        cr.query(targetUri, projection, queryArgs, null)
                    } else {
                        cr.query(targetUri, projection, selection, null, sortOrder)
                    }

                    cursor?.use { c ->
                        val idCol = c.getColumnIndexOrThrow(MediaStore.Files.FileColumns._ID)
                        val nameCol = c.getColumnIndex(MediaStore.Files.FileColumns.DISPLAY_NAME)
                        val sizeCol = c.getColumnIndex(MediaStore.Files.FileColumns.SIZE)
                        val dateCol = c.getColumnIndex(MediaStore.Files.FileColumns.DATE_MODIFIED)
                        val mimeCol = c.getColumnIndex(MediaStore.Files.FileColumns.MIME_TYPE)

                        while (c.moveToNext() && result.size() < cap) {
                            val id = c.getLong(idCol)
                            val contentUri = ContentUris.withAppendedId(targetUri, id)
                            val uriStr = contentUri.toString()
                            if (!seen.add(uriStr)) continue
                            val fileName = if (nameCol >= 0) c.getString(nameCol) else null
                            if (fileName.isNullOrBlank() || fileName.startsWith(".")) continue
                            val item = Arguments.createMap().apply {
                                putString("id", id.toString())
                                putString("uri", uriStr)
                                putString("fileName", fileName)
                                putDouble("size", if (sizeCol >= 0) c.getLong(sizeCol).toDouble() else 0.0)
                                putDouble("dateModified", if (dateCol >= 0) c.getLong(dateCol).toDouble() else 0.0)
                                putString("mimeType", if (mimeCol >= 0) c.getString(mimeCol) ?: "application/octet-stream" else "application/octet-stream")
                            }
                            result.pushMap(item)
                        }
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    runQuery(MediaStore.Downloads.EXTERNAL_CONTENT_URI)
                    if (result.size() == 0 && hasImagePermission()) {
                        runQuery(MediaStore.Files.getContentUri("external"))
                    }
                } else {
                    runQuery(MediaStore.Files.getContentUri("external"))
                }

                promise.resolve(result)
            } catch (se: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Нет доступа к файлам", se)
            } catch (e: Exception) {
                promise.reject("FILE_QUERY_ERROR", e.message ?: "Ошибка чтения файлов", e)
            }
        }
    }

    @ReactMethod
    fun getRecentAudio(limit: Int, promise: Promise) {
        if (!hasAudioPermission()) {
            promise.reject("PERMISSION_DENIED", "Нет доступа к аудиофайлам")
            return
        }
        thread(start = true) {
            try {
                val cr = reactApplicationContext.contentResolver
                val projection = arrayOf(
                    MediaStore.Audio.Media._ID,
                    MediaStore.Audio.Media.DISPLAY_NAME,
                    MediaStore.Audio.Media.SIZE,
                    MediaStore.Audio.Media.DURATION,
                    MediaStore.Audio.Media.DATE_ADDED,
                    MediaStore.Audio.Media.MIME_TYPE
                )
                val result = Arguments.createArray()
                val selection = "${MediaStore.Audio.Media.SIZE} > 0"
                val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"
                cr.query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    selection,
                    null,
                    sortOrder
                )?.use { cursor ->
                    val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                    val nameCol = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
                    val sizeCol = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE)
                    val durCol = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION)
                    val dateCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)
                    val mimeCol = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE)

                    var count = 0
                    val cap = if (limit > 0) limit else 50
                    while (cursor.moveToNext() && count < cap) {
                        val id = cursor.getLong(idCol)
                        val contentUri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
                        val item = Arguments.createMap().apply {
                            putString("id", id.toString())
                            putString("uri", contentUri.toString())
                            putString("fileName", if (nameCol >= 0) cursor.getString(nameCol) ?: "audio_$id.mp3" else "audio_$id.mp3")
                            putDouble("size", if (sizeCol >= 0) cursor.getLong(sizeCol).toDouble() else 0.0)
                            putDouble("duration", if (durCol >= 0) cursor.getLong(durCol).toDouble() else 0.0)
                            putDouble("dateAdded", if (dateCol >= 0) cursor.getLong(dateCol).toDouble() else 0.0)
                            putString("mimeType", if (mimeCol >= 0) cursor.getString(mimeCol) ?: "audio/mpeg" else "audio/mpeg")
                        }
                        result.pushMap(item)
                        count++
                    }
                }
                promise.resolve(result)
            } catch (se: SecurityException) {
                promise.reject("PERMISSION_DENIED", "Нет доступа к аудиофайлам", se)
            } catch (e: Exception) {
                promise.reject("AUDIO_QUERY_ERROR", e.message ?: "Ошибка чтения аудио", e)
            }
        }
    }

    @ReactMethod
    fun encodeImageUri(uriStr: String, maxDim: Int, promise: Promise) {
        thread(start = true) {
            try {
                val uri = Uri.parse(uriStr)
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
                val targetMax = if (maxDim > 0) maxDim else 1280
                val curMax = max(bmp.width, bmp.height)
                val scaled = if (curMax > targetMax) {
                    val ratio = targetMax.toFloat() / curMax.toFloat()
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
                    putInt("width", scaled.width)
                    putInt("height", scaled.height)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("ENCODE_ERROR", e.message ?: "Ошибка сжатия фото", e)
            }
        }
    }

    @ReactMethod
    fun encodeFileUri(uriStr: String, maxBytes: Int, promise: Promise) {
        thread(start = true) {
            try {
                val uri = Uri.parse(uriStr)
                val cr = reactApplicationContext.contentResolver
                val limit = if (maxBytes > 0) maxBytes else 4 * 1024 * 1024
                val mb = (limit / (1024.0 * 1024.0))

                // Pre-check OpenableColumns.SIZE before reading stream
                try {
                    cr.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { c ->
                        val sizeIdx = c.getColumnIndex(OpenableColumns.SIZE)
                        if (sizeIdx >= 0 && c.moveToFirst()) {
                            val declaredSize = c.getLong(sizeIdx)
                            if (declaredSize > limit) {
                                promise.reject("TOO_LARGE", String.format("Максимальный размер файла — %.1f МБ", mb))
                                return@thread
                            }
                        }
                    }
                } catch (_: Exception) {}

                val baos = ByteArrayOutputStream()
                val inputStream = cr.openInputStream(uri)
                if (inputStream == null) {
                    promise.reject("READ_ERROR", "Не удалось прочитать файл")
                    return@thread
                }

                inputStream.use { stream ->
                    val buf = ByteArray(16384)
                    var total = 0
                    while (true) {
                        val read = stream.read(buf)
                        if (read <= 0) break
                        total += read
                        if (total > limit) {
                            promise.reject("TOO_LARGE", String.format("Максимальный размер файла — %.1f МБ", mb))
                            return@thread
                        }
                        baos.write(buf, 0, read)
                    }
                }

                val bytes = baos.toByteArray()
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
            } catch (e: Exception) {
                promise.reject("ENCODE_ERROR", e.message ?: "Ошибка чтения файла", e)
            }
        }
    }

    @ReactMethod
    fun takePhoto(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "Экран приложения недоступен")
            return
        }
        pendingPromise?.reject("CANCELLED", "Прервано новым запросом")
        pendingPromise = promise
        pendingMode = REQ_TAKE_PHOTO
        try {
            val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            activity.startActivityForResult(intent, REQ_TAKE_PHOTO)
        } catch (e: Exception) {
            pendingPromise = null
            pendingMode = 0
            promise.reject("LAUNCH_ERROR", e.message, e)
        }
    }
}
