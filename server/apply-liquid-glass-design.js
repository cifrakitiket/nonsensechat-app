const fs = require('fs');
const path = require('path');

const resDir = path.join('android', 'app', 'src', 'main', 'res');
const drawableDir = path.join(resDir, 'drawable');
const valuesDir = path.join(resDir, 'values');

// 1. Update colors.xml with Liquid Glass tokens
const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Backgrounds (Liquid Space Dark & Translucent Glass) -->
    <color name="bg_main">#080C14</color>
    <color name="bg_surface">#0F172A</color>
    <color name="bg_card">#131D31</color>
    <color name="bg_card_dark">#121D2C</color>
    <color name="bg_card_hover">#1A263E</color>
    <color name="bg_elevated">#1E293B</color>

    <!-- Liquid Glass Tokens -->
    <color name="glass_bg_translucent">#1A162438</color>
    <color name="glass_card_bg">#26152336</color>
    <color name="glass_border">#2EFFFFFF</color>
    <color name="glass_border_glow">#4D00D2FF</color>
    <color name="glass_input_bg">#2B1A2C42</color>

    <!-- Bubbles (Liquid Glass) -->
    <color name="bubble_outgoing">#F0103A50</color>
    <color name="bubble_outgoing_border">#3D00D2FF</color>
    <color name="bubble_incoming">#F016253B</color>
    <color name="bubble_incoming_border">#24FFFFFF</color>

    <!-- Accents & Highlights -->
    <color name="accent_green">#00FF88</color>
    <color name="accent_green_glow">#3300FF88</color>
    <color name="accent_cyan">#00D2FF</color>
    <color name="accent_cyan_glow">#3300D2FF</color>
    <color name="accent_purple">#8B5CF6</color>
    <color name="accent_indigo">#6366F1</color>

    <!-- Typography -->
    <color name="text_primary">#F8FAFC</color>
    <color name="text_secondary">#94A3B8</color>
    <color name="text_tertiary">#64748B</color>
    <color name="text_disabled">#475569</color>

    <!-- Statuses -->
    <color name="online_green">#22C55E</color>
    <color name="online_glow">#4D22C55E</color>
    <color name="danger_red">#EF4444</color>
    <color name="warning_orange">#F59E0B</color>

    <!-- Borders & Dividers -->
    <color name="border_subtle">#1F2B3E</color>
    <color name="border_focus">#00FF88</color>
    <color name="border_glass">#26FFFFFF</color>

    <!-- Overlay & Spoilers -->
    <color name="spoiler_dust_tint">#0D1626</color>
    <color name="overlay_dim">#99000000</color>
    <color name="frosted_button">#40111827</color>
</resources>`;

fs.writeFileSync(path.join(valuesDir, 'colors.xml'), colorsXml, 'utf8');
console.log('colors.xml updated with Liquid Glass tokens');

// 2. Liquid Glass Drawables
const drawables = {
  // Bubble Me (Liquid Cyan/Teal Glass with rounded Telegram corners)
  'bg_bubble_me.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="135"
        android:startColor="#E6103D55"
        android:endColor="#CC0D2E42" />
    <corners
        android:topLeftRadius="18dp"
        android:topRightRadius="18dp"
        android:bottomLeftRadius="18dp"
        android:bottomRightRadius="4dp" />
    <stroke
        android:width="1dp"
        android:color="#3300D2FF" />
</shape>`,

  // Bubble Other (Liquid Obsidian Glass with rounded Telegram corners)
  'bg_bubble_other.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="135"
        android:startColor="#E616253B"
        android:endColor="#D9111E2E" />
    <corners
        android:topLeftRadius="18dp"
        android:topRightRadius="18dp"
        android:bottomLeftRadius="4dp"
        android:bottomRightRadius="18dp" />
    <stroke
        android:width="1dp"
        android:color="#1FFFFFFF" />
</shape>`,

  // Liquid Input Bar (Pill shape frosted glass)
  'bg_input_bar.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#241B2D42" />
    <corners android:radius="24dp" />
    <stroke
        android:width="1dp"
        android:color="#26FFFFFF" />
</shape>`,

  // Liquid Glass Card (Dialogs and Cards)
  'bg_card_dark.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="135"
        android:startColor="#F0132032"
        android:endColor="#E60D1724" />
    <corners android:radius="20dp" />
    <stroke
        android:width="1.2dp"
        android:color="#26FFFFFF" />
</shape>`,

  // Liquid Primary Button (Glowing Emerald-Cyan Pill)
  'bg_primary_button.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <gradient
        android:angle="90"
        android:startColor="#00FF88"
        android:endColor="#00E5FF" />
    <corners android:radius="24dp" />
</shape>`,

  // Liquid Tab Inactive (Frosted Glass Pill)
  'bg_tab_inactive.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#14FFFFFF" />
    <corners android:radius="20dp" />
    <stroke
        android:width="1dp"
        android:color="#1AFFFFFF" />
</shape>`,

  // Liquid Reaction Chip
  'bg_reaction_chip.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#261B2E44" />
    <corners android:radius="14dp" />
    <stroke
        android:width="1dp"
        android:color="#26FFFFFF" />
    <padding android:left="8dp" android:top="4dp" android:right="8dp" android:bottom="4dp" />
</shape>`,

  // Liquid Reaction Chip Selected (Glowing emerald)
  'bg_reaction_chip_selected.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#3300FF88" />
    <corners android:radius="14dp" />
    <stroke
        android:width="1.5dp"
        android:color="#00FF88" />
    <padding android:left="8dp" android:top="4dp" android:right="8dp" android:bottom="4dp" />
</shape>`,

  // Liquid Reply Preview Box
  'bg_reply_box.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#21152336" />
    <corners android:radius="10dp" />
    <stroke
        android:width="1dp"
        android:color="#1FFFFFFF" />
    <padding android:left="8dp" android:top="6dp" android:right="8dp" android:bottom="6dp" />
</shape>`,

  // Liquid Pinned Bar
  'bg_pinned_bar.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#E6101B2B" />
    <stroke
        android:width="1dp"
        android:color="#26FFFFFF" />
</shape>`,

  // Web Emoji Picker Icon (Smiley face from web emoji-btn)
  'ic_emoji_smile.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FFFFFFFF"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M12,12m-9,0a9,9 0,1 1,18 0a9,9 0,1 1,-18 0"/>
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FFFFFFFF"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:pathData="M8,14s1.5,2 4,2 4,-2 4,-2"/>
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M9,9m-1.2,0a1.2,1.2 0,1 1,2.4 0a1.2,1.2 0,1 1,-2.4 0"/>
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M15,9m-1.2,0a1.2,1.2 0,1 1,2.4 0a1.2,1.2 0,1 1,-2.4 0"/>
</vector>`,

  // Web Attachment Icons:
  // 1. Photo and Video
  'ic_attach_photo.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF00D2FF"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M19,3H5C3.9,3 3,3.9 3,5v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5C21,3.9 20.1,3 19,3z"/>
  <path
      android:fillColor="#FF00D2FF"
      android:pathData="M8.5,10.5m-1.5,0a1.5,1.5 0,1 1,3 0a1.5,1.5 0,1 1,-3 0"/>
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF00D2FF"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M21,15l-5,-5L5,21"/>
</vector>`,

  // 2. Music (from attachMenu)
  'ic_attach_music.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FF8B5CF6"
      android:pathData="M12,3v10.55c-0.59,-0.34 -1.27,-0.55 -2,-0.55 -2.21,0 -4,1.79 -4,4s1.79,4 4,4 4,-1.79 4,-4V7h4V3h-6z"/>
</vector>`,

  // 3. File (from attachMenu)
  'ic_attach_file.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF00FF88"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M16.5,6v11.5c0,2.21 -1.79,4 -4,4s-4,-1.79 -4,-4V5a2.5,2.5 0,0 1,5 0v10.5c0,0.83 -0.67,1.5 -1.5,1.5s-1.5,-0.67 -1.5,-1.5V6H9v9.5a3,3 0,0 0,6 0V5c0,-2.21 -1.79,-4 -4,-4S7,2.79 7,5v12.5c0,3.04 2.46,5.5 5.5,5.5s5.5,-2.46 5.5,-5.5V6h-1.5z"/>
</vector>`,

  // 4. Poll chart (from attachMenu)
  'ic_attach_poll.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFF59E0B"
      android:pathData="M4,9h4v11H4zM10,4h4v16h-4zM16,13h4v7h-4z"/>
</vector>`,

  // Phone Call Icon (Matching web's call button)
  'ic_phone_call.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF00FF88"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M22,16.92v3a2,2 0,0 1,-2.18,2 19.79,19.79 0,0 1,-8.63,-3.07 19.5,19.5 0,0 1,-6,-6 19.79,19.79 0,0 1,-3.07,-8.67A2,2 0,0 1,4.11,2h3a2,2 0,0 1,2,1.72 12.84,12.84 0,0 0,0.7,2.81 2,2 0,0 1,-0.45,2.11L8.09,9.91a16,16 0,0 0,6,6l1.27,-1.27a2,2 0,0 1,2.11,-0.45 12.84,12.84 0,0 0,2.81,0.7A2,2 0,0 1,22,16.92z"/>
</vector>`,

  // Search Icon (Matching web search)
  'ic_search.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF94A3B8"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M11,11m-8,0a8,8 0,1 1,16 0a8,8 0,1 1,-18 0"/>
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF94A3B8"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:pathData="M21,21l-4.35,-4.35"/>
</vector>`,

  // Settings Gear (Matching web settings)
  'ic_settings_gear.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF94A3B8"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M12,12m-3,0a3,3 0,1 1,6 0a3,3 0,1 1,-6 0"/>
  <path
      android:fillColor="#00000000"
      android:strokeColor="#FF94A3B8"
      android:strokeWidth="1.8"
      android:strokeLineCap="round"
      android:strokeLineJoin="round"
      android:pathData="M19.4,15a1.65,1.65 0,0 0,0.33,1.82l0.06,0.06a2,2 0,0 1,0,2.83 2,2 0,0 1,-2.83,0l-0.06,-0.06a1.65,1.65 0,0 0,-1.82,-0.33 1.65,1.65 0,0 0,-1,1.51V21a2,2 0,0 1,-2,2 2,2 0,0 1,-2,-2v-0.09A1.65,1.65 0,0 0,9,19.4a1.65,1.65 0,0 0,-1.82,0.33l-0.06,0.06a2,2 0,0 1,-2.83,0 2,2 0,0 1,0,-2.83l0.06,-0.06a1.65,1.65 0,0 0,0.33,-1.82 1.65,1.65 0,0 0,-1.51,-1H3a2,2 0,0 1,-2,-2 2,2 0,0 1,2,-2h0.09A1.65,1.65 0,0 0,4.6,9a1.65,1.65 0,0 0,-0.33,-1.82l-0.06,-0.06a2,2 0,0 1,0,-2.83 2,2 0,0 1,2.83,0l0.06,0.06a1.65,1.65 0,0 0,1.82,0.33H9a1.65,1.65 0,0 0,1,-1.51V3a2,2 0,0 1,2,-2 2,2 0,0 1,2,2v0.09a1.65,1.65 0,0 0,1,1.51 1.65,1.65 0,0 0,1.82,-0.33l0.06,-0.06a2,2 0,0 1,2.83,0 2,2 0,0 1,0,2.83l-0.06,0.06a1.65,1.65 0,0 0,-0.33,1.82V9a1.65,1.65 0,0 0,1.51,1H21a2,2 0,0 1,2,2 2,2 0,0 1,-2,2h-0.09a1.65,1.65 0,0 0,-1.51,1z"/>
</vector>`,

  // Bookmark / Favorite icon (Matching web's FAV_AVA cyan star bookmark)
  'ic_bookmark.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FF00D2FF"
      android:pathData="M17,3H7C5.9,3 5,3.9 5,5v16l7,-3 7,3V5C19,3.9 18.1,3 17,3z"/>
</vector>`
};

for (const [name, content] of Object.entries(drawables)) {
  fs.writeFileSync(path.join(drawableDir, name), content, 'utf8');
  console.log('Written drawable:', name);
}
