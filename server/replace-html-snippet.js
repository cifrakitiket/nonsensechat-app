const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'public', 'index.html');
let c = fs.readFileSync(file, 'utf8');

const regex = /<button type="button" class="call-ctl-btn end-call"[\s\S]*?<!-- INCOMING CALL MODAL -->/;
const match = c.match(regex);

if (!match) {
  console.error('Match not found!');
  process.exit(1);
}

const replacement = `<button type="button" class="call-ctl-btn minimize" onclick="minimizeCall()" title="Свернуть звонок">
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
  <div class="minimized-call-bar" id="minimizedCallBar" style="display:none" onclick="maximizeCall()">
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
  </div>

  <!-- INCOMING CALL MODAL -->`;

c = c.replace(match[0], replacement);
fs.writeFileSync(file, c, 'utf8');
console.log('HTML snippet successfully updated!');
