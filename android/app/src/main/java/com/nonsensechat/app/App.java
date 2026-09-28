package com.nonsensechat.app;

import android.app.Application;
import android.util.Log;
import androidx.appcompat.app.AppCompatDelegate;
import com.google.firebase.FirebaseApp;
import com.nonsensechat.app.data.FirebaseManager;

public class App extends Application {
    private static final String TAG = "NonsenseChatApp";
    private static App instance;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        // Force Dark Theme
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES);

        // Global crash guard to prevent unexpected random crashes
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught Exception in thread " + thread.getName(), throwable);
        });

        // Initialize Firebase
        try {
            FirebaseApp.initializeApp(this);
        } catch (Exception e) {
            Log.e(TAG, "FirebaseApp.initializeApp error", e);
        }

        FirebaseManager.getInstance().init(this);
        FirebaseManager.getInstance().setupPresence();
    }

    public static App getInstance() {
        return instance;
    }
}
