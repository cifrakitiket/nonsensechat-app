const fs = require('fs');
const path = require('path');

const resDir = path.join('android', 'app', 'src', 'main', 'res', 'drawable');

const drawables = {
  'ic_close.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z"/>
</vector>`,

  'ic_reply.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M10,9V5l-7,7 7,7v-4.1c5,0 8.5,1.6 11,5.1 -1,-5 -4,-10 -11,-11z"/>
</vector>`,

  'ic_copy.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M16,1H4c-1.1,0 -2,0.9 -2,2v14h2V3h12V1zm3,4H8c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h11c1.1,0 2,-0.9 2,-2V7c0,-1.1 -0.9,-2 -2,-2zm0,16H8V7h11v14z"/>
</vector>`,

  'ic_edit.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z"/>
</vector>`,

  'ic_pin.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M16,9V4l1,0V2H7v2l1,0v5c0,1.66 -1.34,3 -3,3v2h5.97v7l1,1 1,-1v-7H19v-2c-1.66,0 -3,-1.34 -3,-3z"/>
</vector>`,

  'ic_forward.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M14,9V5l7,7 -7,7v-4.1c-5,0 -8.5,1.6 -11,5.1 1,-5 4,-10 11,-11z"/>
</vector>`,

  'ic_delete.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6v12zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z"/>
</vector>`,

  'ic_document.xml': `<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
  <path
      android:fillColor="#FFFFFFFF"
      android:pathData="M14,2H6c-1.1,0 -1.99,0.9 -1.99,2L4,20c0,1.1 0.89,2 1.99,2H18c1.1,0 2,-0.9 2,-2V8l-6,-6zm2,16H8v-2h8v2zm0,-4H8v-2h8v2zm-3,-5V3.5L18.5,9H13z"/>
</vector>`,

  'bg_reaction_chip.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1A2D42" />
    <stroke android:width="1dp" android:color="#2C4460" />
    <corners android:radius="14dp" />
    <padding android:left="8dp" android:top="4dp" android:right="8dp" android:bottom="4dp" />
</shape>`,

  'bg_reaction_chip_selected.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#1B3B32" />
    <stroke android:width="1.5dp" android:color="#00FF88" />
    <corners android:radius="14dp" />
    <padding android:left="8dp" android:top="4dp" android:right="8dp" android:bottom="4dp" />
</shape>`,

  'bg_reply_box.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#141E2D" />
    <corners android:radius="8dp" />
    <padding android:left="8dp" android:top="6dp" android:right="8dp" android:bottom="6dp" />
</shape>`,

  'bg_pinned_bar.xml': `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#121D2C" />
    <stroke android:width="1dp" android:color="#1F2F44" />
</shape>`
};

for (const [filename, content] of Object.entries(drawables)) {
  const filePath = path.join(resDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Created drawable:', filename);
}
