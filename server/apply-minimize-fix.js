// server/apply-minimize-fix.js
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Update CSS for minimized call bar and pulse dot
const oldCssMarker = `    .minimized-call-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;`;

const newCssBlock = `    .minimized-call-bar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: none;`;

if (html.includes(oldCssMarker)) {
  html = html.replace(oldCssMarker, newCssBlock);
}

const minBtnEndCss = `    .min-ctl-btn.end {
      background: #ef4444;
      color: #fff;
    }`;

const newMinCssExtras = `    .min-ctl-btn.end {
      background: #ef4444;
      color: #fff;
    }
    .min-ctl-btn.active {
      background: #ef4444 !important;
      color: #fff !important;
    }
    .min-call-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      margin-right: 6px;
      vertical-align: middle;
      animation: minCallDotPulse 1.4s ease-in-out infinite;
    }
    @keyframes minCallDotPulse {
      0% { transform: scale(0.85); opacity: 0.7; }
      50% { transform: scale(1.25); opacity: 1; }
      100% { transform: scale(0.85); opacity: 0.7; }
    }
    .minimized-call-bar.visible {
      display: flex !important;
    }`;

if (html.includes(minBtnEndCss) && !html.includes('minCallDotPulse')) {
  html = html.replace(minBtnEndCss, newMinCssExtras);
}

// 2. Relocate <audio id="rtcRemoteAudio"> outside #callOverlay and fix #minimizedCallBar HTML
const oldHtmlBlock = `      <button type="button" class="call-ctl-btn end-call" onclick="endCall()" title="Завершить звонок">
        <i class="fa-solid fa-phone-slash"></i>
      </button>
    </div>

    <audio id="rtcRemoteAudio" autoplay playsinline preload="auto"></audio>
  </div>

  <!-- FLOATING MINIMIZED CALL BAR -->
  <div class="minimized-call-bar hidden" id="minimizedCallBar" style="display:none" onclick="maximizeCall()">
    <div class="min-call-info">
      <img id="minCallAvatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="min-call-ava" alt="" onerror="if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}">
      <div>
        <div class="min-call-name" id="minCallName">Собеседник</div>
        <div class="min-call-timer" id="minCallTimer">00:00</div>
      </div>
    </div>
    <div class="min-call-actions" onclick="event.stopPropagation()">
      <button type="button" class="min-ctl-btn" id="minBtnMic" onclick="toggleCallMic()"><i class="fa-solid fa-microphone"></i></button>
      <button type="button" class="min-ctl-btn end" onclick="endCall()"><i class="fa-solid fa-phone-slash"></i></button>
    </div>
  </div>`;

const newHtmlBlock = `      <button type="button" class="call-ctl-btn minimize" onclick="minimizeCall()" title="Свернуть звонок">
        <i class="fa-solid fa-chevron-down"></i>
      </button>
      <button type="button" class="call-ctl-btn end-call" onclick="endCall()" title="Завершить звонок">
        <i class="fa-solid fa-phone-slash"></i>
      </button>
    </div>
  </div>

  <!-- PERMANENT BACKGROUND AUDIO ELEMENT (NEVER HIDDEN BY MODAL DISPLAY:NONE) -->
  <audio id="rtcRemoteAudio" autoplay playsinline preload="auto" style="position:fixed;bottom:-9999px;left:-9999px;width:1px;height:1px;opacity:0.001;pointer-events:none;"></audio>

  <!-- FLOATING MINIMIZED CALL BAR -->
  <div class="minimized-call-bar" id="minimizedCallBar" style="display:none;" onclick="maximizeCall()">
    <div class="min-call-info">
      <img id="minCallAvatar" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" class="min-call-ava" alt="" onerror="if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}">
      <div>
        <div class="min-call-name" id="minCallName">Собеседник</div>
        <div class="min-call-timer" id="minCallTimer"><span class="min-call-dot"></span><span id="minCallTimerText">00:00</span></div>
      </div>
    </div>
    <div class="min-call-actions" onclick="event.stopPropagation()">
      <button type="button" class="min-ctl-btn" id="minBtnMic" onclick="toggleCallMic()" title="Микрофон"><i class="fa-solid fa-microphone"></i></button>
      <button type="button" class="min-ctl-btn end" onclick="endCall()" title="Завершить"><i class="fa-solid fa-phone-slash"></i></button>
    </div>
  </div>`;

// Check if oldHtmlBlock matches (accounting for any Russian text variations)
const ctlBarEndIdx = html.indexOf('<div class="minimized-call-bar');
if (ctlBarEndIdx !== -1) {
  const startReplaceIdx = html.lastIndexOf('<button type="button" class="call-ctl-btn end-call"', ctlBarEndIdx);
  const endReplaceIdx = html.indexOf('</div>\n  </div>\n\n  <!-- INCOMING CALL MODAL -->', ctlBarEndIdx);
  if (startReplaceIdx !== -1 && endReplaceIdx !== -1) {
    const originalSlice = html.substring(startReplaceIdx, endReplaceIdx + 17);
    html = html.substring(0, startReplaceIdx) + newHtmlBlock + html.substring(endReplaceIdx + 17);
    console.log('Successfully replaced callOverlay controls & minimizedCallBar HTML');
  } else {
    console.log('Warning: Falling back to substring match for HTML block');
  }
}

// 3. Update JavaScript logic for minimizeCall, maximizeCall, startCallTimer, setCallStatus, cleanupCallState
const oldJsBlock = `    function setCallStatus(text) {
      const el = document.getElementById('callStatusText');
      if (el) el.textContent = text;
    }

    function startCallTimer() {
      if (rtcCallTimerInterval) return;
      rtcCallSeconds = 0;
      setCallStatus('Звонок идёт');
      rtcCallTimerInterval = setInterval(() => {
        rtcCallSeconds++;
        const mins = String(Math.floor(rtcCallSeconds / 60)).padStart(2, '0');
        const secs = String(rtcCallSeconds % 60).padStart(2, '0');
        const str = mins + ':' + secs;
        const t1 = document.getElementById('callTimer');
        const t2 = document.getElementById('minCallTimer');
        if (t1) t1.textContent = str;
        if (t2) t2.textContent = str;
      }, 1000);
    }

    function minimizeCall() {
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (ov) ov.classList.remove('open');
      if (minBar && rtcActiveSessionId) {
        minBar.style.display = 'flex';
        const n = document.getElementById('callUserTitle')?.textContent || 'Звонок';
        document.getElementById('minCallName').textContent = n;
        const ava = document.getElementById('callAvatarImg')?.src || DEFAULT_CALL_AVA;
        const minAva = document.getElementById('minCallAvatar');
        if (minAva) {
          minAva.alt = '';
          minAva.src = ava;
        }
      }
    }
    window.minimizeCall = minimizeCall;

    function maximizeCall() {
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) minBar.style.display = 'none';
      if (ov && rtcActiveSessionId) ov.classList.add('open');
    }
    window.maximizeCall = maximizeCall;`;

const newJsBlock = `    function setCallStatus(text) {
      const el = document.getElementById('callStatusText');
      if (el) el.textContent = text;
      if (!rtcCallTimerInterval) {
        const minTimer = document.getElementById('minCallTimerText') || document.getElementById('minCallTimer');
        if (minTimer) minTimer.textContent = text;
      }
    }

    function startCallTimer() {
      if (rtcCallTimerInterval) return;
      rtcCallSeconds = 0;
      setCallStatus('Звонок идёт');
      rtcCallTimerInterval = setInterval(() => {
        rtcCallSeconds++;
        const mins = String(Math.floor(rtcCallSeconds / 60)).padStart(2, '0');
        const secs = String(rtcCallSeconds % 60).padStart(2, '0');
        const str = mins + ':' + secs;
        const t1 = document.getElementById('callTimer');
        const t2 = document.getElementById('minCallTimerText') || document.getElementById('minCallTimer');
        if (t1) t1.textContent = str;
        if (t2) t2.textContent = str;
      }, 1000);
    }

    function minimizeCall() {
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (ov) {
        ov.classList.remove('open');
      }
      if (minBar && (rtcActiveSessionId || rtcPC)) {
        minBar.classList.remove('hidden');
        minBar.classList.add('visible');
        minBar.style.display = 'flex';
        const n = document.getElementById('callUserTitle')?.textContent || 'Звонок';
        const minName = document.getElementById('minCallName');
        if (minName) minName.textContent = n;
        const ava = document.getElementById('callAvatarImg')?.src || DEFAULT_CALL_AVA;
        const minAva = document.getElementById('minCallAvatar');
        if (minAva) {
          minAva.alt = '';
          minAva.src = ava;
        }
        const minTimer = document.getElementById('minCallTimerText') || document.getElementById('minCallTimer');
        const mainTimer = document.getElementById('callTimer');
        const statusText = document.getElementById('callStatusText');
        if (minTimer) {
          if (rtcCallTimerInterval && mainTimer && mainTimer.textContent) {
            minTimer.textContent = mainTimer.textContent;
          } else {
            minTimer.textContent = (statusText && statusText.textContent) ? statusText.textContent : 'Соединение...';
          }
        }
        const minMicBtn = document.getElementById('minBtnMic');
        if (minMicBtn) {
          minMicBtn.classList.toggle('active', rtcMuted);
          minMicBtn.innerHTML = rtcMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
        }
      }
      const audioEl = document.getElementById('rtcRemoteAudio');
      if (audioEl && audioEl.paused && rtcRemoteStream) {
        audioEl.play().catch(() => {});
      }
    }
    window.minimizeCall = minimizeCall;

    function maximizeCall() {
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) {
        minBar.classList.add('hidden');
        minBar.classList.remove('visible');
        minBar.style.display = 'none';
      }
      if (ov && (rtcActiveSessionId || rtcPC)) {
        ov.classList.add('open');
      }
      const audioEl = document.getElementById('rtcRemoteAudio');
      if (audioEl && audioEl.paused && rtcRemoteStream) {
        audioEl.play().catch(() => {});
      }
    }
    window.maximizeCall = maximizeCall;`;

if (html.includes(oldJsBlock)) {
  html = html.replace(oldJsBlock, newJsBlock);
  console.log('Successfully replaced minimizeCall/maximizeCall JS block');
} else {
  console.log('Warning: Exact oldJsBlock not found, checking with normalize');
}

// 4. Update cleanupCallState to reset minBar classes
const oldCleanup = `      const ov = document.getElementById('callOverlay');
      if (ov) ov.classList.remove('open');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) minBar.style.display = 'none';`;

const newCleanup = `      const ov = document.getElementById('callOverlay');
      if (ov) ov.classList.remove('open');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) {
        minBar.classList.add('hidden');
        minBar.classList.remove('visible');
        minBar.style.display = 'none';
      }`;

if (html.includes(oldCleanup)) {
  html = html.replace(oldCleanup, newCleanup);
  console.log('Successfully updated cleanupCallState for minBar');
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Done updating public/index.html');
