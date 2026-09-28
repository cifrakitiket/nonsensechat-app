// server/generate-android-native-java.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'android');

function writeFile(relPath, content) {
  const fullPath = path.join(root, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim() + '\n', 'utf8');
  console.log('✓ Created:', relPath);
}

console.log('Generating Android Native Java project...');

// 1. root build.gradle
writeFile('build.gradle', `
plugins {
    id 'com.android.application' version '8.8.0' apply false
    id 'com.google.gms.google-services' version '4.4.2' apply false
}

tasks.register('clean', Delete) {
    delete rootProject.layout.buildDirectory
}
`);

// 2. settings.gradle
writeFile('settings.gradle', `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven { url 'https://jitpack.io' }
    }
}

rootProject.name = "NonsenseChat"
include ':app'
`);

// 3. gradle.properties
writeFile('gradle.properties', `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.enableJetifier=true
android.nonTransitiveRClass=true
`);

// 4. gradlew.bat
writeFile('gradlew.bat', `@rem
@rem Copyright 2015 the original author or authors.
@rem
@if "%DEBUG%"=="" @echo off
@rem ##########################################################################
@rem
@rem  Gradle startup script for Windows
@rem
@rem ##########################################################################

@rem Set local scope for the variables with windows NT shell
if "%OS%"=="Windows_NT" setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

@rem Resolve Java executable
if defined JAVA_HOME goto findJavaFromJavaHome

set JAVA_EXE=java.exe
%JAVA_EXE% -version >NUL 2>&1
if %ERRORLEVEL% equ 0 goto execute

echo.
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:findJavaFromJavaHome
set JAVA_HOME=%JAVA_HOME:"=%
set JAVA_EXE=%JAVA_HOME%/bin/java.exe

if exist "%JAVA_EXE%" goto execute

echo.
echo ERROR: JAVA_HOME is set to an invalid directory: %JAVA_HOME%
echo.
echo Please set the JAVA_HOME variable in your environment to match the
echo location of your Java installation.

goto fail

:execute
@rem Setup the command line

set CLASSPATH=%APP_HOME%\\gradle\\wrapper\\gradle-wrapper.jar

@rem Execute Gradle
"%JAVA_EXE%" -Dorg.gradle.appname=%APP_BASE_NAME% -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*

:fail
if  not "" == "%GRADLE_EXIT_CONSOLE%" exit 1
exit /b 1
`);

// 5. app/build.gradle
writeFile('app/build.gradle', `
plugins {
    id 'com.android.application'
    id 'com.google.gms.google-services'
}

android {
    namespace 'com.nonsensechat.app'
    compileSdk 35

    defaultConfig {
        applicationId "com.nonsensechat.app"
        minSdk 26
        targetSdk 35
        versionCode 1
        versionName "1.0.0"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        debug {
            applicationIdSuffix ".debug"
            debuggable true
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }

    buildFeatures {
        viewBinding true
        buildConfig true
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.2.0'
    implementation 'androidx.recyclerview:recyclerview:1.4.0'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'
    implementation 'androidx.cardview:cardview:1.0.0'
    implementation 'androidx.core:core:1.15.0'

    // Firebase
    implementation platform('com.google.firebase:firebase-bom:33.8.0')
    implementation 'com.google.firebase:firebase-analytics'
    implementation 'com.google.firebase:firebase-auth'
    implementation 'com.google.firebase:firebase-database'
    implementation 'com.google.firebase:firebase-messaging'

    // Glide for image loading & caching
    implementation 'com.github.bumptech.glide:glide:4.16.0'
    annotationProcessor 'com.github.bumptech.glide:compiler:4.16.0'

    // Networking and JSON
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'com.google.code.gson:gson:2.11.0'
}
`);

// 6. app/proguard-rules.pro
writeFile('app/proguard-rules.pro', `
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.firebase.database.IgnoreExtraProperties *;
    @com.google.firebase.database.PropertyName *;
}
-keep class com.nonsensechat.app.model.** { *; }
`);

// 7. app/google-services.json
writeFile('app/google-services.json', `{
  "project_info": {
    "project_number": "497380539024",
    "firebase_url": "https://nonsensechattm-e5d18-default-rtdb.firebaseio.com",
    "project_id": "nonsensechattm-e5d18",
    "storage_bucket": "nonsensechattm-e5d18.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:497380539024:android:cace5570f62f9e073af615",
        "android_client_info": {
          "package_name": "com.nonsensechat.app"
        }
      },
      "oauth_client": [
        {
          "client_id": "497380539024-client.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": []
        }
      }
    },
    {
      "client_info": {
        "mobilesdk_app_id": "1:497380539024:android:cace5570f62f9e073af616",
        "android_client_info": {
          "package_name": "com.nonsensechat.app.debug"
        }
      },
      "oauth_client": [],
      "api_key": [
        {
          "current_key": "AIzaSyCVH8_UhxO5hAj0ZBlA_lRw3B0hnN1zEOc"
        }
      ],
      "services": {}
    }
  ],
  "configuration_version": "1"
}`);

// 8. AndroidManifest.xml
writeFile('app/src/main/AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:name=".App"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher"
        android:supportsRtl="true"
        android:theme="@style/Theme.NonsenseChat">

        <activity
            android:name=".ui.SplashActivity"
            android:exported="true"
            android:screenOrientation="portrait">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.auth.AuthActivity"
            android:exported="false"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize" />

        <activity
            android:name=".ui.main.MainActivity"
            android:exported="false"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize" />

        <activity
            android:name=".ui.chat.ChatActivity"
            android:exported="false"
            android:screenOrientation="portrait"
            android:windowSoftInputMode="adjustResize" />

    </application>

</manifest>
`);

console.log('Build configuration and manifest written successfully!');
