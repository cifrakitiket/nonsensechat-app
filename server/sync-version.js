const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function syncVersion(customVersion) {
  let version = customVersion;

  const versionJsonPath = path.join(rootDir, 'public', 'version.json');
  if (!version && fs.existsSync(versionJsonPath)) {
    try {
      const vData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
      if (vData && vData.v) version = String(vData.v).trim();
    } catch (_) {}
  }

  if (!version) version = '2.9.7';

  // Extract numeric code e.g. "2.9.7" -> 297
  const digits = version.replace(/[^0-9]/g, '');
  const versionCode = parseInt(digits, 10) || 297;

  console.log(`[Version Sync] Target Version: ${version} (versionCode: ${versionCode})`);

  // 1. Update public/version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify({ v: version }) + '\n');
  console.log(`[Version Sync] Updated public/version.json`);

  // 2. Update public/index.html
  const indexPath = path.join(rootDir, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf8');

    // Update APP_LOCAL_VERSION
    indexHtml = indexHtml.replace(
      /(?:const|let)\s+APP_LOCAL_VERSION\s*=\s*['"][^'"]+['"];/,
      `let APP_LOCAL_VERSION = '${version}';`
    );

    // Update APP_LOCAL_VERSION_CODE
    indexHtml = indexHtml.replace(
      /(?:const|let)\s+APP_LOCAL_VERSION_CODE\s*=\s*\d+;/,
      `let APP_LOCAL_VERSION_CODE = ${versionCode};`
    );

    // Update modal header version text if present
    indexHtml = indexHtml.replace(
      /<(?:div|span)([^>]*id="apkUpdateVersion"[^>]*)>[^<]*<\/(?:div|span)>/,
      `<span$1>Версия v${version}</span>`
    );

    fs.writeFileSync(indexPath, indexHtml, 'utf8');
    console.log(`[Version Sync] Updated public/index.html (APP_LOCAL_VERSION='${version}', CODE=${versionCode})`);
  }

  // 3. Update react-native-android/android/app/build.gradle
  const gradlePath = path.join(rootDir, 'react-native-android', 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradlePath)) {
    let gradle = fs.readFileSync(gradlePath, 'utf8');
    gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
    gradle = gradle.replace(/versionName\s+["'][^"']+["']/, `versionName "${version}"`);
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    console.log(`[Version Sync] Updated build.gradle (versionCode ${versionCode}, versionName "${version}")`);
  }

  // 4. Update public/apk-version.json
  const apkVersionPath = path.join(rootDir, 'public', 'apk-version.json');
  if (fs.existsSync(apkVersionPath)) {
    try {
      const apkData = JSON.parse(fs.readFileSync(apkVersionPath, 'utf8'));
      apkData.version = version;
      apkData.versionCode = versionCode;
      apkData.publishedAt = new Date().toISOString();
      fs.writeFileSync(apkVersionPath, JSON.stringify(apkData, null, 2) + '\n');
      console.log(`[Version Sync] Updated public/apk-version.json`);
    } catch (_) {}
  }

  console.log(`[Version Sync] All version references are synchronized to ${version} (${versionCode})!`);
  return { version, versionCode };
}

if (require.main === module) {
  const arg = process.argv[2];
  syncVersion(arg);
}

module.exports = { syncVersion };
