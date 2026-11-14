const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

console.log('Original index.html size:', html.length);

// 1. Add CSS for sliders and call device sheet
const cssSearch = '.settings-btn-action.active {';
const cssIdx = html.indexOf(cssSearch);
if (cssIdx === -1) {
  console.error('Could not find .settings-btn-action.active in CSS');
  process.exit(1);
}
const cssEndIdx = html.indexOf('}', cssIdx) + 1;

const newCSS = `
    .audio-range-slider {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.12);
      border-radius: 4px;
      outline: none;
      cursor: pointer;
      margin: 8px 0;
    }
    .audio-range-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--acc, #38bdf8);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
      cursor: pointer;
      border: 2px solid #fff;
      transition: transform 0.1s ease;
    }
    .audio-range-slider::-webkit-slider-thumb:hover {
      transform: scale(1.15);
    }
    .audio-range-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--acc, #38bdf8);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.5);
      cursor: pointer;
      border: 2px solid #fff;
    }
    .call-device-sheet {
      position: absolute;
      bottom: 96px;
      left: 50%;
      transform: translateX(-50%);
      width: 92%;
      max-width: 440px;
      background: rgba(15, 23, 42, 0.95);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 20px;
      padding: 18px 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75);
      z-index: 10000;
      color: #fff;
      animation: callSheetIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes callSheetIn {
      from { opacity: 0; transform: translate(-50%, 15px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .call-sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 8px;
    }
    .call-sheet-title {
      font-size: 14.5px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
    }
    .call-sheet-close {
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: color 0.15s ease;
    }
    .call-sheet-close:hover {
      color: #fff;
    }
    .call-sheet-group {
      margin-bottom: 12px;
    }
    .call-sheet-label {
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
    }
    .call-sheet-toggles {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
    }
    .call-sheet-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12.5px;
      color: #e2e8f0;
      cursor: pointer;
    }`;

html = html.slice(0, cssEndIdx) + '\n' + newCSS + html.slice(cssEndIdx);
console.log('[Step 1] Added Audio & Call Sheet CSS');

// 2. Add #callBtnDeviceSettings & #callDeviceSheet to call overlay
const callCtlSearch = '<button type="button" class="call-ctl-btn" id="callBtnScreen"';
const callCtlIdx = html.indexOf(callCtlSearch);
if (callCtlIdx !== -1) {
  const btnScreenEnd = html.indexOf('</button>', callCtlIdx) + 9;
  const newBtn = `\n      <button type="button" class="call-ctl-btn" id="callBtnDeviceSettings" onclick="toggleCallDeviceSheet()" title="Настройки звука и устройств">\n        <i class="fa-solid fa-sliders"></i>\n      </button>`;
  html = html.slice(0, btnScreenEnd) + newBtn + html.slice(btnScreenEnd);
  console.log('[Step 2] Added callBtnDeviceSettings');
} else {
  console.error('Could not find callBtnScreen in index.html');
}

// Add #callDeviceSheet inside #callOverlay
const callOverlaySearch = '<div class="call-overlay" id="callOverlay">';
const callOverlayIdx = html.indexOf(callOverlaySearch);
if (callOverlayIdx !== -1) {
  const insertPos = callOverlayIdx + callOverlaySearch.length;
  const sheetHtml = `
    <!-- IN-CALL AUDIO & DEVICE QUICK SETTINGS SHEET -->
    <div class="call-device-sheet" id="callDeviceSheet" style="display:none;" onclick="event.stopPropagation()">
      <div class="call-sheet-header">
        <div class="call-sheet-title"><i class="fa-solid fa-sliders"></i> Настройки звука звонка</div>
        <button type="button" class="call-sheet-close" onclick="closeCallDeviceSheet()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="call-sheet-body">
        <div class="call-sheet-group">
          <label class="call-sheet-label"><i class="fa-solid fa-microphone"></i> Микрофон (ввод)</label>
          <select id="callMicSelect" class="device-select-field" onchange="onCallChangeMic(this.value)">
            <option value="">По умолчанию</option>
          </select>
        </div>
        <div class="call-sheet-group" id="callSpeakerGroup">
          <label class="call-sheet-label"><i class="fa-solid fa-volume-high"></i> Динамик / Наушники (вывод)</label>
          <select id="callSpeakerSelect" class="device-select-field" onchange="onCallChangeSpeaker(this.value)">
            <option value="">По умолчанию</option>
          </select>
        </div>
        <div class="call-sheet-group">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <label class="call-sheet-label" style="margin:0;"><i class="fa-solid fa-volume-low"></i> Громкость собеседника</label>
            <span id="callPartnerVolVal" style="font-size:12px;font-weight:700;color:var(--acc);">100%</span>
          </div>
          <input type="range" id="callPartnerVolRange" min="0" max="100" value="100" class="audio-range-slider" oninput="onCallChangeVolume(this.value)">
        </div>
        <div class="call-sheet-toggles">
          <label class="call-sheet-toggle-row">
            <span>Шумоподавление (ClearVoice)</span>
            <input type="checkbox" id="callSheetNoiseSupp" onchange="onCallToggleNoise(this.checked)" style="accent-color:var(--acc);">
          </label>
          <label class="call-sheet-toggle-row">
            <span>Эхоподавление</span>
            <input type="checkbox" id="callSheetEchoCanc" onchange="onCallToggleEcho(this.checked)" style="accent-color:var(--acc);">
          </label>
        </div>
      </div>
    </div>`;
  html = html.slice(0, insertPos) + sheetHtml + html.slice(insertPos);
  console.log('[Step 3] Added callDeviceSheet to callOverlay');
}

// 3. Update navigation button text
html = html.replace(
  /<button type="button" class="settings-nav-btn" data-tab="audio" onclick="switchSettingsTab\('audio'\)"><i class="fa-solid fa-microphone"><\/i> <span>[^<]*<\/span><\/button>/,
  '<button type="button" class="settings-nav-btn" data-tab="audio" onclick="switchSettingsTab(\'audio\')"><i class="fa-solid fa-microphone"></i> <span>Звук и микрофон</span></button>'
);

// 4. Replace #setPane-audio with full proper sound settings
const paneAudioSearch = '<div class="settings-pane" id="setPane-audio">';
const paneAudioStart = html.indexOf(paneAudioSearch);
if (paneAudioStart !== -1) {
  const paneVideoSearch = '<div class="settings-pane" id="setPane-video">';
  const paneAudioEnd = html.indexOf(paneVideoSearch, paneAudioStart);
  if (paneAudioEnd !== -1) {
    const fullAudioPane = `<!-- 4. PANE: AUDIO (MICROPHONE & SOUND OUTPUT) -->
        <div class="settings-pane" id="setPane-audio">
          <!-- 1. MICROPHONE INPUT -->
          <div class="tgme-card">
            <div class="tgme-card-title"><i class="fa-solid fa-microphone"></i> Микрофон (устройство ввода)</div>
            <select id="setMicSelect" class="device-select-field" onchange="onSelectMicDevice(this.value)">
              <option value="">По умолчанию (системный микрофон)</option>
            </select>
            <div class="tgme-hint">Выберите микрофон для записи голосовых сообщений, видео-кружочков и звонков.</div>

            <!-- MIC GAIN SLIDER -->
            <div style="margin-top:14px;padding:12px 14px;background:var(--card2);border-radius:10px;border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:12.5px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px;">
                  <i class="fa-solid fa-gauge-high" style="color:var(--acc);"></i> Чувствительность микрофона:
                </span>
                <span id="setMicGainVal" style="font-size:12px;font-weight:700;color:var(--acc);background:rgba(56,189,248,0.12);padding:2px 8px;border-radius:6px;">100%</span>
              </div>
              <input type="range" id="setMicGainRange" min="0" max="200" value="100" class="audio-range-slider" oninput="onMicGainChange(this.value)">
              <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-top:2px;">
                <span>0% (тихо)</span>
                <span>100% (стандарт)</span>
                <span>200% (усиление)</span>
              </div>
            </div>

            <!-- REAL-TIME VU-METER & TEST -->
            <div class="mic-test-box">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div style="font-size:12px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:6px;">
                  <i class="fa-solid fa-chart-simple" style="color:var(--acc);"></i> Индикатор уровня сигнала:
                </div>
                <span id="setMicDbText" style="font-size:12px;font-weight:600;color:var(--text2);">Уровень: 0%</span>
              </div>
              <div class="mic-meter-track"><div id="setMicLevelBar" class="mic-meter-fill"></div></div>

              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;flex-wrap:wrap;gap:8px;">
                <label style="display:inline-flex;align-items:center;gap:7px;font-size:12px;color:var(--text);cursor:pointer;user-select:none;">
                  <input type="checkbox" id="setMicLoopback" onchange="toggleMicLoopback(this.checked)" style="accent-color:var(--acc);cursor:pointer;width:15px;height:15px;">
                  <span><i class="fa-solid fa-headphones"></i> Слушать себя в наушниках</span>
                </label>
                <button type="button" class="settings-btn-action" id="setMicTestBtn" onclick="toggleMicTest()"><i class="fa-solid fa-play"></i> Проверить микрофон</button>
              </div>
            </div>
          </div>

          <!-- 2. SPEAKER / AUDIO OUTPUT -->
          <div class="tgme-card">
            <div class="tgme-card-title"><i class="fa-solid fa-volume-high"></i> Динамики и наушники (устройство вывода)</div>
            <select id="setSpeakerSelect" class="device-select-field" onchange="onSelectSpeakerDevice(this.value)">
              <option value="">По умолчанию (системный вывод)</option>
            </select>
            <div class="tgme-hint" id="setSpeakerHint">Выберите аудиовыход для воспроизведения входящих звонков и голосовых.</div>

            <!-- SPEAKER VOLUME SLIDER -->
            <div style="margin-top:14px;padding:12px 14px;background:var(--card2);border-radius:10px;border:1px solid var(--border);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-size:12.5px;font-weight:600;color:var(--text);display:flex;align-items:center;gap:6px;">
                  <i class="fa-solid fa-volume-low" style="color:var(--acc);"></i> Общая громкость звонков:
                </span>
                <span id="setSpeakerVolVal" style="font-size:12px;font-weight:700;color:var(--acc);background:rgba(56,189,248,0.12);padding:2px 8px;border-radius:6px;">100%</span>
              </div>
              <input type="range" id="setSpeakerVolRange" min="0" max="100" value="100" class="audio-range-slider" oninput="onSpeakerVolChange(this.value)">
            </div>

            <!-- SPEAKER TEST BUTTON -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding:10px 14px;background:var(--card2);border-radius:10px;border:1px solid var(--border);">
              <div style="font-size:12px;color:var(--text2);display:flex;align-items:center;gap:8px;">
                <i class="fa-solid fa-music" style="color:var(--acc);"></i>
                <span>Тестовый сигнал через выбранный динамик</span>
              </div>
              <button type="button" class="settings-btn-action" id="setSpeakerTestBtn" onclick="testSpeakerSound()"><i class="fa-solid fa-play"></i> Проверить звук</button>
            </div>
          </div>

          <!-- 3. AUDIO PROCESSING & QUALITY -->
          <div class="tgme-card">
            <div class="tgme-card-title"><i class="fa-solid fa-wand-magic-sparkles"></i> Обработка и фильтрация звука</div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:6px;">
                  <span>Шумоподавление</span>
                  <span style="font-size:10px;background:linear-gradient(135deg,#0284c7,#38bdf8);color:#fff;padding:1px 6px;border-radius:4px;font-weight:700;">ClearVoice</span>
                </div>
                <div style="font-size:11.5px;color:var(--text2);margin-top:2px;">Удаляет фоновый шум кулеров, клавиатуры и улицы</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <button type="button" class="btn-clean" onclick="if(window.NoiseSuppressor)window.NoiseSuppressor.togglePanel()" title="Открыть панель ClearVoice AI" style="font-size:11.5px;color:var(--acc);cursor:pointer;padding:3px 8px;border-radius:6px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.25);"><i class="fa-solid fa-sliders"></i> AI</button>
                <label class="tg-switch">
                  <input type="checkbox" id="setNoiseSupp" onchange="toggleAudioSetting('noiseSupp', this.checked)">
                  <span class="tg-slider"></span>
                </label>
              </div>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13.5px;font-weight:600;">Эхоподавление</div>
                <div style="font-size:11.5px;color:var(--text2);margin-top:2px;">Предотвращает эхо и обратную связь из динамиков</div>
              </div>
              <label class="tg-switch">
                <input type="checkbox" id="setEchoCanc" onchange="toggleAudioSetting('echoCanc', this.checked)">
                <span class="tg-slider"></span>
              </label>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border);">
              <div>
                <div style="font-size:13.5px;font-weight:600;">Автоусиление громкости (AGC)</div>
                <div style="font-size:11.5px;color:var(--text2);margin-top:2px;">Автоматически выравнивает громкость тихого и громкого голоса</div>
              </div>
              <label class="tg-switch">
                <input type="checkbox" id="setAudioAGC" onchange="toggleAudioSetting('autoGain', this.checked)">
                <span class="tg-slider"></span>
              </label>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;">
              <div>
                <div style="font-size:13.5px;font-weight:600;display:flex;align-items:center;gap:6px;">
                  <span>Студийный звук (Hi-Fi 48 кГц)</span>
                  <span style="font-size:10px;background:rgba(34,197,94,0.15);color:#22c55e;padding:1px 6px;border-radius:4px;font-weight:700;">HD</span>
                </div>
                <div style="font-size:11.5px;color:var(--text2);margin-top:2px;">Высокий битрейт и стерео для музыки и подкастов</div>
              </div>
              <label class="tg-switch">
                <input type="checkbox" id="setHiFiAudio" onchange="toggleAudioSetting('hifiAudio', this.checked)">
                <span class="tg-slider"></span>
              </label>
            </div>
          </div>
        </div>\n\n        `;
    html = html.slice(0, paneAudioStart) + fullAudioPane + html.slice(paneAudioEnd);
    console.log('[Step 4] Replaced setPane-audio with comprehensive sound & mic card');
  } else {
    console.error('Could not find paneVideoSearch');
  }
} else {
  console.error('Could not find paneAudioSearch');
}

// 5. Replace and enhance the Audio JS logic
const jsSearch = 'async function refreshMediaDevices() {';
const jsStart = html.indexOf(jsSearch);
if (jsStart === -1) {
  console.error('Could not find refreshMediaDevices in JS');
  process.exit(1);
}

// Find end of stopCamTest()
const stopCamSearch = 'window.stopCamTest = stopCamTest;';
const jsEnd = html.indexOf(stopCamSearch, jsStart);
if (jsEnd === -1) {
  console.error('Could not find stopCamTest in JS');
  process.exit(1);
}
const jsEndPos = jsEnd + stopCamSearch.length;

const newMediaJS = `let _micTestStream = null;
    let _micTestAudioCtx = null;
    let _micTestGainNode = null;
    let _micTestLoopbackNode = null;
    let _micTestAnimFrame = null;
    let _micTestLoopback = false;

    async function applyAudioOutputDevice(element) {
      const el = element || document.getElementById('rtcRemoteAudio');
      if (!el) return;
      const speakerId = localStorage.getItem('pref_speaker_id') || '';
      if (typeof el.setSinkId === 'function') {
        try {
          await el.setSinkId(speakerId);
          console.log('[WebRTC] Audio output sink set to:', speakerId || 'default');
        } catch (e) {
          console.warn('[WebRTC] setSinkId error:', e);
        }
      }
    }
    window.applyAudioOutputDevice = applyAudioOutputDevice;

    function applyAudioOutputVolume() {
      const vol = parseFloat(localStorage.getItem('pref_speaker_vol') || '1');
      const audioEl = document.getElementById('rtcRemoteAudio');
      if (audioEl) audioEl.volume = Math.max(0, Math.min(1, vol));
    }
    window.applyAudioOutputVolume = applyAudioOutputVolume;

    async function refreshMediaDevices() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const micSelect = document.getElementById('setMicSelect');
        const callMicSelect = document.getElementById('callMicSelect');
        const speakerSelect = document.getElementById('setSpeakerSelect');
        const callSpeakerSelect = document.getElementById('callSpeakerSelect');
        const camSelect = document.getElementById('setCamSelect');
        const speakerHint = document.getElementById('setSpeakerHint');

        const mics = devices.filter(d => d.kind === 'audioinput');
        const speakers = devices.filter(d => d.kind === 'audiooutput');
        const cams = devices.filter(d => d.kind === 'videoinput');

        const savedMic = localStorage.getItem('pref_mic_id') || '';
        const savedSpeaker = localStorage.getItem('pref_speaker_id') || '';
        const savedCam = localStorage.getItem('pref_cam_id') || '';

        // Check setSinkId support
        const supportsSinkId = typeof HTMLMediaElement.prototype.setSinkId === 'function';
        if (speakerHint) {
          if (supportsSinkId) {
            speakerHint.textContent = 'Устройство вывода звука поддерживается браузером и активно для звонков.';
            speakerHint.style.color = 'var(--text2)';
          } else {
            speakerHint.textContent = 'В данном браузере аудиовыход управляется системой (setSinkId не поддерживается).';
            speakerHint.style.color = '#eab308';
          }
        }

        // Populate Microphones
        [micSelect, callMicSelect].forEach(sel => {
          if (!sel) return;
          sel.innerHTML = '<option value="">По умолчанию (системный микрофон)</option>';
          mics.forEach((m, idx) => {
            const opt = document.createElement('option');
            opt.value = m.deviceId;
            opt.textContent = m.label || ('Микрофон ' + (idx + 1));
            if (m.deviceId === savedMic) opt.selected = true;
            sel.appendChild(opt);
          });
        });

        // Populate Speakers
        [speakerSelect, callSpeakerSelect].forEach(sel => {
          if (!sel) return;
          sel.innerHTML = '<option value="">По умолчанию (системный вывод)</option>';
          if (speakers.length > 0) {
            speakers.forEach((s, idx) => {
              const opt = document.createElement('option');
              opt.value = s.deviceId;
              opt.textContent = s.label || ('Динамик/Наушники ' + (idx + 1));
              if (s.deviceId === savedSpeaker) opt.selected = true;
              sel.appendChild(opt);
            });
          }
        });

        // Populate Cameras
        if (camSelect) {
          camSelect.innerHTML = '<option value="">По умолчанию (автовыбор камеры)</option>';
          cams.forEach((c, idx) => {
            const opt = document.createElement('option');
            opt.value = c.deviceId;
            opt.textContent = c.label || ('Камера ' + (idx + 1));
            if (c.deviceId === savedCam) opt.selected = true;
            camSelect.appendChild(opt);
          });
        }

        // Restore Sliders & Toggles
        const savedGain = localStorage.getItem('pref_mic_gain') || '100';
        const gainRange = document.getElementById('setMicGainRange');
        const gainVal = document.getElementById('setMicGainVal');
        if (gainRange) gainRange.value = savedGain;
        if (gainVal) gainVal.textContent = savedGain + '%';

        const savedVol = Math.round(parseFloat(localStorage.getItem('pref_speaker_vol') || '1') * 100);
        const volRange = document.getElementById('setSpeakerVolRange');
        const volVal = document.getElementById('setSpeakerVolVal');
        const callVolRange = document.getElementById('callPartnerVolRange');
        const callVolVal = document.getElementById('callPartnerVolVal');
        if (volRange) volRange.value = savedVol;
        if (volVal) volVal.textContent = savedVol + '%';
        if (callVolRange) callVolRange.value = savedVol;
        if (callVolVal) callVolVal.textContent = savedVol + '%';

        const noiseCb = document.getElementById('setNoiseSupp');
        const echoCb = document.getElementById('setEchoCanc');
        const agcCb = document.getElementById('setAudioAGC');
        const hifiCb = document.getElementById('setHiFiAudio');
        const callNoiseCb = document.getElementById('callSheetNoiseSupp');
        const callEchoCb = document.getElementById('callSheetEchoCanc');

        const noiseVal = localStorage.getItem('pref_noise_supp') !== '0';
        const echoVal = localStorage.getItem('pref_echo_canc') !== '0';
        const agcVal = localStorage.getItem('pref_audio_agc') !== '0';
        const hifiVal = localStorage.getItem('pref_high_quality_audio') === '1';

        if (noiseCb) noiseCb.checked = noiseVal;
        if (echoCb) echoCb.checked = echoVal;
        if (agcCb) agcCb.checked = agcVal;
        if (hifiCb) hifiCb.checked = hifiVal;
        if (callNoiseCb) callNoiseCb.checked = noiseVal;
        if (callEchoCb) callEchoCb.checked = echoVal;

      } catch (err) {
        console.warn('enumerateDevices error:', err);
      }
    }
    window.refreshMediaDevices = refreshMediaDevices;

    function onSelectMicDevice(deviceId) {
      if (deviceId) localStorage.setItem('pref_mic_id', deviceId);
      else localStorage.removeItem('pref_mic_id');

      const s1 = document.getElementById('setMicSelect');
      const s2 = document.getElementById('callMicSelect');
      if (s1 && s1.value !== deviceId) s1.value = deviceId;
      if (s2 && s2.value !== deviceId) s2.value = deviceId;

      if (_micTestStream) {
        stopMicTest();
        startMicTest();
      }
      if (typeof window.switchActiveCallMic === 'function') {
        window.switchActiveCallMic(deviceId);
      }
    }
    window.onSelectMicDevice = onSelectMicDevice;

    function onSelectSpeakerDevice(deviceId) {
      if (deviceId) localStorage.setItem('pref_speaker_id', deviceId);
      else localStorage.removeItem('pref_speaker_id');

      const s1 = document.getElementById('setSpeakerSelect');
      const s2 = document.getElementById('callSpeakerSelect');
      if (s1 && s1.value !== deviceId) s1.value = deviceId;
      if (s2 && s2.value !== deviceId) s2.value = deviceId;

      applyAudioOutputDevice();
    }
    window.onSelectSpeakerDevice = onSelectSpeakerDevice;

    function onMicGainChange(val) {
      localStorage.setItem('pref_mic_gain', val);
      const gainVal = document.getElementById('setMicGainVal');
      if (gainVal) gainVal.textContent = val + '%';
      if (_micTestGainNode) {
        _micTestGainNode.gain.value = parseFloat(val) / 100;
      }
    }
    window.onMicGainChange = onMicGainChange;

    function onSpeakerVolChange(val) {
      const floatVal = parseFloat(val) / 100;
      localStorage.setItem('pref_speaker_vol', String(floatVal));
      const volVal = document.getElementById('setSpeakerVolVal');
      const callVolVal = document.getElementById('callPartnerVolVal');
      const callVolRange = document.getElementById('callPartnerVolRange');
      if (volVal) volVal.textContent = val + '%';
      if (callVolVal) callVolVal.textContent = val + '%';
      if (callVolRange && callVolRange.value !== val) callVolRange.value = val;
      applyAudioOutputVolume();
    }
    window.onSpeakerVolChange = onSpeakerVolChange;

    function testSpeakerSound() {
      const btn = document.getElementById('setSpeakerTestBtn');
      const speakerId = localStorage.getItem('pref_speaker_id') || '';
      const vol = parseFloat(localStorage.getItem('pref_speaker_vol') || '1');

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        if (typeof ctx.setSinkId === 'function' && speakerId) {
          ctx.setSinkId(speakerId).catch(() => {});
        }

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(vol * 0.16, ctx.currentTime);
        masterGain.connect(ctx.destination);

        // Play smooth musical chord: C5 -> E5 -> G5 -> C6
        const notes = [
          { freq: 523.25, time: 0.00, dur: 0.45 },
          { freq: 659.25, time: 0.12, dur: 0.45 },
          { freq: 783.99, time: 0.24, dur: 0.55 },
          { freq: 1046.50, time: 0.36, dur: 0.75 }
        ];

        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
          g.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
          g.gain.exponentialRampToValueAtTime(1.0, ctx.currentTime + n.time + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
          osc.connect(g);
          g.connect(masterGain);
          osc.start(ctx.currentTime + n.time);
          osc.stop(ctx.currentTime + n.time + n.dur);
        });

        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Играет...';
          btn.classList.add('active');
        }

        setTimeout(() => {
          try { ctx.close(); } catch (_) {}
          if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-play"></i> Проверить звук';
            btn.classList.remove('active');
          }
        }, 1300);
      } catch (err) {
        console.warn('testSpeakerSound error:', err);
      }
    }
    window.testSpeakerSound = testSpeakerSound;

    function toggleMicLoopback(enable) {
      _micTestLoopback = !!enable;
      if (_micTestGainNode && _micTestAudioCtx) {
        if (_micTestLoopback) {
          try { _micTestGainNode.connect(_micTestAudioCtx.destination); } catch (_) {}
        } else {
          try { _micTestGainNode.disconnect(_micTestAudioCtx.destination); } catch (_) {}
        }
      }
    }
    window.toggleMicLoopback = toggleMicLoopback;

    async function toggleMicTest() {
      if (_micTestStream) stopMicTest();
      else await startMicTest();
    }
    window.toggleMicTest = toggleMicTest;

    async function startMicTest() {
      const btn = document.getElementById('setMicTestBtn');
      const levelBar = document.getElementById('setMicLevelBar');
      const dbText = document.getElementById('setMicDbText');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (dbText) dbText.textContent = 'Микрофон не поддерживается браузером';
        return;
      }

      try {
        const micId = localStorage.getItem('pref_mic_id');
        const noiseSupp = localStorage.getItem('pref_noise_supp') !== '0';
        const echoCanc = localStorage.getItem('pref_echo_canc') !== '0';
        const autoGain = localStorage.getItem('pref_audio_agc') !== '0';
        const gainVal = parseFloat(localStorage.getItem('pref_mic_gain') || '100') / 100;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: micId ? { ideal: micId } : undefined,
            noiseSuppression: noiseSupp,
            echoCancellation: echoCanc,
            autoGainControl: autoGain
          }
        });
        _micTestStream = stream;
        refreshMediaDevices();

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        _micTestAudioCtx = new AudioCtx();

        const speakerId = localStorage.getItem('pref_speaker_id');
        if (typeof _micTestAudioCtx.setSinkId === 'function' && speakerId) {
          _micTestAudioCtx.setSinkId(speakerId).catch(() => {});
        }

        const source = _micTestAudioCtx.createMediaStreamSource(stream);
        _micTestGainNode = _micTestAudioCtx.createGain();
        _micTestGainNode.gain.setValueAtTime(gainVal, _micTestAudioCtx.currentTime);

        const analyser = _micTestAudioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;

        source.connect(_micTestGainNode);
        _micTestGainNode.connect(analyser);

        const loopbackCb = document.getElementById('setMicLoopback');
        if (loopbackCb && loopbackCb.checked) {
          _micTestLoopback = true;
          _micTestGainNode.connect(_micTestAudioCtx.destination);
        }

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-stop"></i> Остановить тест';
          btn.classList.add('active');
        }

        function updateMeter() {
          if (!_micTestStream) return;
          _micTestAnimFrame = requestAnimationFrame(updateMeter);
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          let peak = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
            if (dataArray[i] > peak) peak = dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Weighted metric giving realistic responsive VU reading
          const val = (avg * 0.6) + (peak * 0.4);
          const pct = Math.min(100, Math.round((val / 160) * 100));

          if (levelBar) levelBar.style.width = pct + '%';
          if (dbText) {
            const dbApprox = pct > 0 ? Math.round((pct * 0.6) - 60) : -60;
            dbText.textContent = pct + '% (' + dbApprox + ' dB)';
          }
        }
        updateMeter();
      } catch (err) {
        console.warn('Mic test error:', err);
        if (dbText) dbText.textContent = 'Ошибка доступа к микрофону';
        stopMicTest();
      }
    }

    function stopMicTest() {
      if (_micTestAnimFrame) { cancelAnimationFrame(_micTestAnimFrame); _micTestAnimFrame = null; }
      if (_micTestGainNode) {
        try { _micTestGainNode.disconnect(); } catch (_) {}
        _micTestGainNode = null;
      }
      if (_micTestAudioCtx) {
        try { _micTestAudioCtx.close(); } catch (_) {}
        _micTestAudioCtx = null;
      }
      if (_micTestStream) {
        try { _micTestStream.getTracks().forEach(t => t.stop()); } catch (_) {}
        _micTestStream = null;
      }
      const btn = document.getElementById('setMicTestBtn');
      const levelBar = document.getElementById('setMicLevelBar');
      const dbText = document.getElementById('setMicDbText');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Проверить микрофон';
        btn.classList.remove('active');
      }
      if (levelBar) levelBar.style.width = '0%';
      if (dbText) dbText.textContent = 'Уровень: 0%';
    }
    window.stopMicTest = stopMicTest;

    /* In-Call Quick Device Sheet Controls */
    function toggleCallDeviceSheet() {
      const sheet = document.getElementById('callDeviceSheet');
      if (!sheet) return;
      if (sheet.style.display === 'none' || !sheet.style.display) {
        refreshMediaDevices();
        sheet.style.display = 'block';
      } else {
        sheet.style.display = 'none';
      }
    }
    window.toggleCallDeviceSheet = toggleCallDeviceSheet;

    function closeCallDeviceSheet() {
      const sheet = document.getElementById('callDeviceSheet');
      if (sheet) sheet.style.display = 'none';
    }
    window.closeCallDeviceSheet = closeCallDeviceSheet;

    function onCallChangeMic(deviceId) {
      onSelectMicDevice(deviceId);
    }
    window.onCallChangeMic = onCallChangeMic;

    function onCallChangeSpeaker(deviceId) {
      onSelectSpeakerDevice(deviceId);
    }
    window.onCallChangeSpeaker = onCallChangeSpeaker;

    function onCallChangeVolume(val) {
      onSpeakerVolChange(val);
    }
    window.onCallChangeVolume = onCallChangeVolume;

    function onCallToggleNoise(checked) {
      toggleAudioSetting('noiseSupp', checked);
      const mainCb = document.getElementById('setNoiseSupp');
      if (mainCb) mainCb.checked = checked;
    }
    window.onCallToggleNoise = onCallToggleNoise;

    function onCallToggleEcho(checked) {
      toggleAudioSetting('echoCanc', checked);
      const mainCb = document.getElementById('setEchoCanc');
      if (mainCb) mainCb.checked = checked;
    }
    window.onCallToggleEcho = onCallToggleEcho;

    function onSelectCamDevice(deviceId) {
      if (deviceId) localStorage.setItem('pref_cam_id', deviceId);
      else localStorage.removeItem('pref_cam_id');
      if (_camTestStream) {
        stopCamTest();
        startCamTest();
      }
    }
    window.onSelectCamDevice = onSelectCamDevice;

    async function toggleCamTest() {
      if (_camTestStream) stopCamTest();
      else await startCamTest();
    }
    window.toggleCamTest = toggleCamTest;

    async function startCamTest() {
      const btn = document.getElementById('setCamTestBtn');
      const videoEl = document.getElementById('setCamPreviewVideo');
      const placeholder = document.getElementById('setCamPlaceholder');
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

      try {
        const camId = localStorage.getItem('pref_cam_id');
        const quality = parseInt(localStorage.getItem('pref_round_quality') || '480', 10);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: camId ? { ideal: camId } : undefined,
            width: { ideal: quality === 720 ? 1280 : (quality === 1080 ? 1920 : 640) },
            height: { ideal: quality === 720 ? 720 : (quality === 1080 ? 1080 : 480) },
            facingMode: 'user'
          }
        });
        _camTestStream = stream;
        refreshMediaDevices();

        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.style.display = 'block';
          videoEl.play().catch(() => {});
        }
        if (placeholder) placeholder.style.display = 'none';
        if (btn) {
          btn.innerHTML = '<i class="fa-solid fa-stop"></i> Выключить камеру';
          btn.classList.add('active');
        }
      } catch (err) {
        console.warn('Cam test error:', err);
        stopCamTest();
      }
    }

    function stopCamTest() {
      if (_camTestStream) {
        try { _camTestStream.getTracks().forEach(t => t.stop()); } catch (_) {}
        _camTestStream = null;
      }
      const btn = document.getElementById('setCamTestBtn');
      const videoEl = document.getElementById('setCamPreviewVideo');
      const placeholder = document.getElementById('setCamPlaceholder');
      if (videoEl) {
        videoEl.srcObject = null;
        videoEl.style.display = 'none';
      }
      if (placeholder) placeholder.style.display = 'flex';
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-camera"></i> Проверить кружочек';
        btn.classList.remove('active');
      }
    }
    window.stopCamTest = stopCamTest;`;

html = html.slice(0, jsStart) + newMediaJS + html.slice(jsEndPos);
console.log('[Step 5] Replaced Media JS logic');

// 6. Update toggleAudioSetting to handle autoGain and hifiAudio
const toggleAudioSearch = 'function toggleAudioSetting(type, checked) {';
const toggleAudioIdx = html.indexOf(toggleAudioSearch);
if (toggleAudioIdx !== -1) {
  const toggleAudioEnd = html.indexOf('window.toggleAudioSetting = toggleAudioSetting;', toggleAudioIdx) + 'window.toggleAudioSetting = toggleAudioSetting;'.length;
  const newToggleAudio = `function toggleAudioSetting(type, checked) {
      if (type === 'noiseSupp') localStorage.setItem('pref_noise_supp', checked ? '1' : '0');
      if (type === 'echoCanc') localStorage.setItem('pref_echo_canc', checked ? '1' : '0');
      if (type === 'autoGain') localStorage.setItem('pref_audio_agc', checked ? '1' : '0');
      if (type === 'hifiAudio') localStorage.setItem('pref_high_quality_audio', checked ? '1' : '0');
      if (typeof window.applyAudioConstraintsToActiveCall === 'function') {
        window.applyAudioConstraintsToActiveCall();
      }
    }
    window.toggleAudioSetting = toggleAudioSetting;`;
  html = html.slice(0, toggleAudioIdx) + newToggleAudio + html.slice(toggleAudioEnd);
  console.log('[Step 6] Updated toggleAudioSetting');
}

// 7. Add switchActiveCallMic and update getCallMedia & applyAudioConstraintsToActiveCall
const getCallMediaSearch = 'async function getCallMedia(video = false) {';
const getCallMediaIdx = html.indexOf(getCallMediaSearch);
if (getCallMediaIdx !== -1) {
  const applyConstraintsSearch = 'window.applyAudioConstraintsToActiveCall = applyAudioConstraintsToActiveCall;';
  const applyConstraintsEnd = html.indexOf(applyConstraintsSearch, getCallMediaIdx) + applyConstraintsSearch.length;

  const newCallMediaLogic = `async function switchActiveCallMic(newMicId) {
      if (!rtcPC || !rtcLocalStream) return;
      try {
        const oldAudioTrack = rtcLocalStream.getAudioTracks()[0];
        const noiseSupp = localStorage.getItem('pref_noise_supp') !== '0';
        const echoCanc = localStorage.getItem('pref_echo_canc') !== '0';
        const autoGain = localStorage.getItem('pref_audio_agc') !== '0';
        const isClearVoice = window.NoiseSuppressor && window.NoiseSuppressor.enabled;
        const hiFi = localStorage.getItem('pref_high_quality_audio') === '1';

        const newStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            deviceId: newMicId ? { exact: newMicId } : undefined,
            echoCancellation: echoCanc,
            noiseSuppression: noiseSupp || isClearVoice,
            autoGainControl: autoGain,
            sampleRate: hiFi ? 48000 : undefined,
            channelCount: hiFi ? 2 : 1
          }
        });

        const newAudioTrack = newStream.getAudioTracks()[0];
        if (newAudioTrack) {
          newAudioTrack.enabled = !rtcMuted;
          if (oldAudioTrack) {
            rtcLocalStream.removeTrack(oldAudioTrack);
            oldAudioTrack.stop();
          }
          rtcLocalStream.addTrack(newAudioTrack);

          const senders = rtcPC.getSenders();
          const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
          if (audioSender) {
            await audioSender.replaceTrack(newAudioTrack);
            console.log('[WebRTC] Swapped active audio track with mic device:', newMicId || 'default');
          }
        }
      } catch (err) {
        console.warn('[WebRTC] switchActiveCallMic error, falling back to applyConstraints:', err);
        if (rtcLocalStream) {
          const track = rtcLocalStream.getAudioTracks()[0];
          if (track && track.applyConstraints) {
            track.applyConstraints({ deviceId: newMicId ? { ideal: newMicId } : undefined }).catch(() => {});
          }
        }
      }
    }
    window.switchActiveCallMic = switchActiveCallMic;

    /* Native High-Definition Audio/Video Capture */
    async function getCallMedia(video = false) {
      const micId = localStorage.getItem('pref_mic_id');
      const camId = localStorage.getItem('pref_cam_id');
      const noiseSupp = localStorage.getItem('pref_noise_supp') !== '0';
      const echoCanc = localStorage.getItem('pref_echo_canc') !== '0';
      const autoGain = localStorage.getItem('pref_audio_agc') !== '0';
      const isClearVoice = window.NoiseSuppressor && window.NoiseSuppressor.enabled;
      const hiFi = localStorage.getItem('pref_high_quality_audio') === '1';

      const audioConstraints = {
        deviceId: micId ? { ideal: micId } : undefined,
        echoCancellation: echoCanc,
        noiseSuppression: noiseSupp || isClearVoice,
        autoGainControl: autoGain,
        sampleRate: hiFi ? 48000 : undefined,
        channelCount: hiFi ? 2 : 1
      };

      const videoConstraints = video ? {
        deviceId: camId ? { ideal: camId } : undefined,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user'
      } : false;

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints
        });
      } catch (err) {
        if (video) {
          console.warn('Camera failed or unavailable, falling back to audio-only stream:', err);
          return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: false
          });
        }
        throw err;
      }
    }

    async function applyAudioConstraintsToActiveCall() {
      if (!rtcLocalStream) return;
      const audioTrack = rtcLocalStream.getAudioTracks()[0];
      if (!audioTrack) return;

      const micId = localStorage.getItem('pref_mic_id');
      const noiseSupp = localStorage.getItem('pref_noise_supp') !== '0';
      const echoCanc = localStorage.getItem('pref_echo_canc') !== '0';
      const autoGain = localStorage.getItem('pref_audio_agc') !== '0';
      const isClearVoice = window.NoiseSuppressor && window.NoiseSuppressor.enabled;
      const hiFi = localStorage.getItem('pref_high_quality_audio') === '1';

      try {
        await audioTrack.applyConstraints({
          deviceId: micId ? { ideal: micId } : undefined,
          echoCancellation: echoCanc,
          noiseSuppression: noiseSupp || isClearVoice,
          autoGainControl: autoGain,
          sampleRate: hiFi ? 48000 : undefined,
          channelCount: hiFi ? 2 : 1
        });
        console.log('[WebRTC] Applied updated audio constraints to active call');
      } catch (e) {
        console.warn('applyConstraints warning:', e);
      }
    }
    window.applyAudioConstraintsToActiveCall = applyAudioConstraintsToActiveCall;`;

  html = html.slice(0, getCallMediaIdx) + newCallMediaLogic + html.slice(applyConstraintsEnd);
  console.log('[Step 7] Updated getCallMedia & applyAudioConstraintsToActiveCall');
}

// 8. Ensure ontrack applies audio output sink and volume
const ontrackAudioSearch = 'audioEl.autoplay = true;';
const ontrackAudioIdx = html.indexOf(ontrackAudioSearch);
if (ontrackAudioIdx !== -1) {
  const insertSink = `\n          applyAudioOutputVolume();\n          applyAudioOutputDevice(audioEl);`;
  html = html.slice(0, ontrackAudioIdx + ontrackAudioSearch.length) + insertSink + html.slice(ontrackAudioIdx + ontrackAudioSearch.length);
  console.log('[Step 8] Connected sinkId and volume in ontrack');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully written updated index.html! New length:', html.length);
