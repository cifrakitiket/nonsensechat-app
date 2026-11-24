package com.nonsensechat.rn

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeStorageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val prefs by lazy {
        reactApplicationContext.getSharedPreferences("NonsenseChatRNStorage", Context.MODE_PRIVATE)
    }

    override fun getName(): String = "NativeStorageModule"

    @ReactMethod
    fun getItem(key: String, promise: Promise) {
        try {
            val value = prefs.getString(key, null)
            promise.resolve(value)
        } catch (e: Exception) {
            promise.reject("STORAGE_GET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun setItem(key: String, value: String, promise: Promise) {
        try {
            prefs.edit().putString(key, value).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STORAGE_SET_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun removeItem(key: String, promise: Promise) {
        try {
            prefs.edit().remove(key).apply()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("STORAGE_REMOVE_ERROR", e.message, e)
        }
    }
}
