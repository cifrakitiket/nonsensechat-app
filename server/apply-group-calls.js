// server/apply-group-calls.js
// Implementation of high-performance WebRTC Group Calls with Mesh Signaling & Responsive UI
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('[apply-group-calls] Read index.html, size:', html.length);

// 1. CSS for Group Call Grid, Tiles, Active Speaker, and In-Chat Banner
const groupCallCss = `
    /* ══════ WEBRTC GROUP CALL ENGINE (v3.2.0) ══════ */
    .call-group-stage {
      position: relative;
      width: 100%;
      height: 100%;
      max-width: 1240px;
      max-height: 82vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 0;
      z-index: 5;
    }
    .call-group-grid {
      display: grid;
      gap: 16px;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      padding: 12px;
      align-content: center;
      justify-content: center;
      box-sizing: border-box;
    }
    .call-group-grid[data-count="1"] {
      grid-template-columns: minmax(280px, 720px);
      grid-template-rows: minmax(260px, 540px);
    }
    .call-group-grid[data-count="2"] {
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      grid-template-rows: minmax(240px, 480px);
    }
    .call-group-grid[data-count="3"],
    .call-group-grid[data-count="4"] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(180px, 1fr));
    }
    .call-group-grid[data-count="5"],
    .call-group-grid[data-count="6"] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(160px, 1fr));
    }
    .call-group-grid[data-count="7"],
    .call-group-grid[data-count="8"],
    .call-group-grid[data-count="9"] {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(3, minmax(150px, 1fr));
    }
    @media (max-width: 768px) {
      .call-group-grid[data-count="3"],
      .call-group-grid[data-count="4"],
      .call-group-grid[data-count="5"],
      .call-group-grid[data-count="6"],
      .call-group-grid[data-count="7"],
      .call-group-grid[data-count="8"],
      .call-group-grid[data-count="9"] {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
      }
    }
    @media (max-width: 480px) {
      .call-group-grid {
        grid-template-columns: 1fr !important;
        grid-template-rows: auto !important;
      }
    }
    .call-tile {
      position: relative;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.72);
      border: 2px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(14px);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 160px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
      box-shadow: 0 10px 28px rgba(0,0,0,0.45);
    }
    .call-tile.is-local {
      border-color: rgba(56, 189, 248, 0.35);
    }
    .call-tile.speaking {
      border-color: #22c55e !important;
      box-shadow: 0 0 24px rgba(34, 197, 94, 0.55), 0 10px 28px rgba(0,0,0,0.5);
      transform: scale(1.015);
    }
    .call-tile-video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
      display: none;
      background: #000;
    }
    .call-tile.has-video .call-tile-video {
      display: block;
    }
    .call-tile.is-local .call-tile-video {
      transform: scaleX(-1);
    }
    .call-tile-avatar-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      z-index: 2;
      padding: 16px;
      text-align: center;
    }
    .call-tile.has-video .call-tile-avatar-wrap {
      display: none;
    }
    .call-tile-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      object-fit: cover;
      box-shadow: 0 8px 24px rgba(0,0,0,0.55);
      border: 2.5px solid rgba(255,255,255,0.25);
    }
    .call-tile-meta {
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.55);
      backdrop-filter: blur(10px);
      padding: 6px 12px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      pointer-events: none;
    }
    .call-tile-name {
      font-size: 13.5px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    .call-tile-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      font-size: 11.5px;
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .call-tile.muted .call-tile-badge {
      background: #ef4444;
      color: #fff;
    }

    /* Active Group Call In-Chat Banner */
    .active-group-call-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 18px;
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.16) 0%, rgba(16, 185, 129, 0.08) 100%);
      border-bottom: 1px solid rgba(34, 197, 94, 0.35);
      backdrop-filter: blur(14px);
      transition: all 0.25s ease;
      z-index: 15;
      flex-shrink: 0;
    }
    .active-group-call-bar.hidden {
      display: none !important;
    }
    .group-call-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .group-call-pulse-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulseGroupDot 1.8s infinite;
      flex-shrink: 0;
    }
    @keyframes pulseGroupDot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.45; transform: scale(0.85); }
    }
    .group-call-bar-info {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .group-call-bar-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #4ade80;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .group-call-bar-subs {
      font-size: 12px;
      color: var(--txt-sub, #94a3b8);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .group-call-bar-avatars {
      display: flex;
      align-items: center;
      margin-left: 8px;
    }
    .group-call-bar-avatars img {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--bg-main, #0f172a);
      margin-left: -9px;
      object-fit: cover;
    }
    .group-call-bar-avatars img:first-child {
      margin-left: 0;
    }
    .group-call-join-btn {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 7px 18px;
      border-radius: 20px;
      background: #22c55e;
      color: #fff;
      border: none;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);
    }
    .group-call-join-btn:hover {
      background: #16a34a;
      transform: scale(1.05);
    }
    .group-call-join-btn.in-call {
      background: rgba(56, 189, 248, 0.22);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.5);
      box-shadow: none;
    }
    .group-call-join-btn.in-call:hover {
      background: rgba(56, 189, 248, 0.35);
    }
`;

// Insert CSS if not already present
if (!html.includes('.call-group-stage')) {
  const cssAnchor = '.call-ctl-btn.end-call:hover {';
  const pos = html.indexOf(cssAnchor);
  if (pos === -1) throw new Error('CSS anchor not found');
  const insertPos = html.indexOf('}', pos) + 1;
  html = html.slice(0, insertPos) + '\n' + groupCallCss + '\n' + html.slice(insertPos);
  console.log('[apply-group-calls] Injected Group Call CSS');
}

// 2. HTML: Active Group Call Banner right below chatHeader (before pinnedBar)
const groupCallBannerHtml = `
    <!-- ACTIVE GROUP CALL IN-CHAT BANNER -->
    <div id="activeGroupCallBar" class="active-group-call-bar hidden">
      <div class="group-call-bar-left">
        <span class="group-call-pulse-dot"></span>
        <div class="group-call-bar-info">
          <div class="group-call-bar-title"><i class="fa-solid fa-users"></i> <span id="groupCallBarTitle">Групповой звонок</span></div>
          <div class="group-call-bar-subs" id="groupCallBarSubs">0 участников</div>
        </div>
        <div class="group-call-bar-avatars" id="groupCallBarAvatars"></div>
      </div>
      <div class="group-call-bar-actions">
        <button type="button" class="group-call-join-btn" id="groupCallJoinBtn" onclick="onGroupCallBarAction()">
          <i class="fa-solid fa-phone"></i> <span id="groupCallJoinBtnText">Войти</span>
        </button>
      </div>
    </div>
`;

if (!html.includes('id="activeGroupCallBar"')) {
  const bannerAnchor = '<!-- PINNED BAR -->';
  const pos = html.indexOf(bannerAnchor);
  if (pos === -1) throw new Error('Banner anchor not found');
  html = html.slice(0, pos) + groupCallBannerHtml + '\n    ' + html.slice(pos);
  console.log('[apply-group-calls] Injected Active Group Call Banner HTML');
}

// 3. HTML: Group Call Stage inside #callOverlay .call-stage-area
const groupCallStageHtml = `
      <!-- GROUP CALL STAGE (MULTI-PEER GRID) -->
      <div class="call-group-stage" id="callGroupStage" style="display:none">
        <div class="call-group-grid" id="callGroupGrid" data-count="1">
          <!-- Dynamic group participant tiles rendered by WebRTC engine -->
        </div>
      </div>
`;

if (!html.includes('id="callGroupStage"')) {
  const stageAnchor = '<div class="call-stage-timer" id="callTimer">00:00</div>\r\n      </div>';
  let pos = html.indexOf(stageAnchor);
  if (pos === -1) {
    const stageAnchorLF = '<div class="call-stage-timer" id="callTimer">00:00</div>\n      </div>';
    pos = html.indexOf(stageAnchorLF);
    if (pos !== -1) {
      pos += stageAnchorLF.length;
    }
  } else {
    pos += stageAnchor.length;
  }
  if (pos === -1) throw new Error('Stage anchor not found');
  html = html.slice(0, pos) + '\n' + groupCallStageHtml + html.slice(pos);
  console.log('[apply-group-calls] Injected Group Call Stage HTML');
}

// 4. Update JavaScript Calling Engine
// Check if Group Call Engine is already present
if (!html.includes('let rtcIsGroupCall = false;')) {
  // We will patch:
  // - startCall routing
  // - endCall routing
  // - cleanupCallState routing
  // - minimizeCall / maximizeCall handling
  // - toggleCallMic / toggleCallCam / toggleCallScreenShare
  // - applyAudioOutputVolume / applyAudioOutputDevice
  // - openChat call to watchGroupCallBar
  // - and inject complete Group Call Engine methods

  const groupEngineCode = `
    /* ═════════════════════════════════════════════════════════════════
       OFFICIAL MULTI-USER WEBRTC GROUP CALL ENGINE (v3.2.0)
       - Mesh Peer-to-Peer WebRTC Architecture for Rooms/Groups
       - In-Chat Presence & Banner Bar ('activeGroupCallBar')
       - Dynamic Responsive CSS Participant Grid (1 to 12+ members)
       - Real-time Active Speaker Glow via Web Audio API Analyser
       - Independent Volume & Output Device Routing for all Peers
       - Full Camera, Mic, Screen Share & Disconnect Protection
       ═════════════════════════════════════════════════════════════════ */
    let rtcIsGroupCall = false;
    let rtcGroupPeers = {}; // { [remoteUid]: { uid, pc, remoteStream, audioEl, isMuted, isCamOn, isScreenOn, queuedCandidates: [] } }
    let rtcGroupParticipants = {}; // { [uid]: { uid, nick, avatar, isMuted, isCamOn, isScreenOn, joinedAt } }
    let _groupCallWatchChatId = null;
    let _groupCallWatchRef = null;
    let _groupCallWatchHandler = null;
    let _groupCallSessionRef = null;
    let _groupPartAddedHandler = null;
    let _groupPartChangedHandler = null;
    let _groupPartRemovedHandler = null;
    let _groupSignalsRef = null;
    let _groupSignalAddedHandler = null;
    let _groupCandidatesRef = null;
    let _groupCandAddedHandler = null;
    let _groupAudioContext = null;
    let _groupSpeakerAnalysers = {};
    let _groupLocalAnalyserInterval = null;

    function resolveCallAva(ava) {
      if (ava && String(ava).trim() && !String(ava).endsWith('#') && !String(ava).startsWith('data:image/svg')) {
        return (typeof optImg === 'function' ? optImg(ava, 160) : ava);
      }
      return window.DEFAULT_CALL_AVA || DEFAULT_CALL_AVA;
    }
    window.resolveCallAva = resolveCallAva;

    async function startOrJoinGroupCall(chatId, type = 'voice') {
      const fdb = getFbDb();
      if (!fdb || !me || !chatId) return;

      if (rtcPC || rtcIsGroupCall) {
        if (rtcIsGroupCall && rtcActiveChatId === chatId) {
          maximizeCall();
          return;
        }
        if (rtcIsGroupCall) {
          await leaveGroupCall();
        } else {
          await endCall();
        }
      }

      cleanupCallState();

      rtcIsGroupCall = true;
      rtcActiveChatId = chatId;
      rtcActiveSessionId = 'group_' + chatId;
      rtcActivePartnerUid = null;
      rtcIsVideo = (type === 'video');
      rtcCamActive = rtcIsVideo;
      rtcScreenActive = false;
      rtcMuted = false;
      rtcGroupPeers = {};
      rtcGroupParticipants = {};
      rtcCurrentCallToken = Date.now();

      // UI Switch in Call Overlay
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) {
        minBar.classList.remove('visible');
        minBar.classList.add('hidden');
        minBar.style.display = 'none';
      }

      const vCont = document.getElementById('callVideoContainer');
      const aStage = document.getElementById('callAvatarStage');
      const gStage = document.getElementById('callGroupStage');
      if (vCont) vCont.style.display = 'none';
      if (aStage) aStage.style.display = 'none';
      if (gStage) gStage.style.display = 'flex';

      const groupName = activeChat?.name || 'Групповой звонок';
      const groupAva = resolveCallAva(activeChat?.avatar);
      const uTitle = document.getElementById('callUserTitle');
      const sText = document.getElementById('callStatusText');
      const timer = document.getElementById('callTimer');
      if (uTitle) uTitle.textContent = groupName;
      if (sText) sText.textContent = 'Подключение к группе...';
      if (timer) timer.textContent = '00:00';

      const bg = document.getElementById('callBackdrop');
      if (bg) {
        bg.style.backgroundImage = (groupAva && groupAva !== DEFAULT_CALL_AVA) ? ('url(\"' + groupAva + '\")') : '';
      }

      const btnCam = document.getElementById('callBtnCam');
      if (btnCam) btnCam.classList.toggle('active', rtcIsVideo);
      const btnMic = document.getElementById('callBtnMic');
      if (btnMic) {
        btnMic.classList.remove('active');
        btnMic.innerHTML = '<i class=\"fa-solid fa-microphone\"></i>';
      }

      if (ov) ov.classList.add('open');
      startCallTimer();

      try {
        await refreshRtcIceServers();
        rtcLocalStream = await getCallMedia(rtcIsVideo);

        renderGroupGrid();
        setupLocalSpeakingDetector();

        const roomRef = fdb.ref('group_calls/' + chatId);
        await roomRef.child('active').set(true);
        await roomRef.child('chatId').set(chatId);
        await roomRef.child('chatName').set(groupName);

        const myData = {
          uid: me.uid,
          nick: me.nick || 'Пользователь',
          avatar: (me.avatar && !me.avatar.startsWith('data:')) ? me.avatar : ((me.ava && !me.ava.startsWith('data:')) ? me.ava : ''),
          isMuted: false,
          isCamOn: rtcIsVideo,
          isScreenOn: false,
          joinedAt: firebase.database.ServerValue.TIMESTAMP
        };

        const myPartRef = roomRef.child('participants/' + me.uid);
        await myPartRef.set(myData);
        myPartRef.onDisconnect().remove();
        roomRef.child('signals/' + me.uid).onDisconnect().remove();
        roomRef.child('candidates/' + me.uid).onDisconnect().remove();

        // Query current existing participants
        const snap = await roomRef.child('participants').once('value');
        const existingParts = snap.val() || {};

        for (const pUid in existingParts) {
          if (pUid !== me.uid) {
            rtcGroupParticipants[pUid] = existingParts[pUid];
          }
        }
        renderGroupGrid();

        // Connect to each existing participant (newcomer initiates offer)
        for (const pUid in existingParts) {
          if (pUid !== me.uid) {
            initGroupPeerConnection(pUid, true).catch(err => console.warn('[GroupCall] peer init warn:', err));
          }
        }

        // Listen for new/changed/removed participants
        _groupCallSessionRef = roomRef.child('participants');
        _groupPartAddedHandler = _groupCallSessionRef.on('child_added', s => {
          const p = s.val();
          if (p && p.uid && p.uid !== me.uid) {
            rtcGroupParticipants[p.uid] = p;
            renderGroupGrid();
          }
        });

        _groupPartChangedHandler = _groupCallSessionRef.on('child_changed', s => {
          const p = s.val();
          if (p && p.uid && p.uid !== me.uid) {
            rtcGroupParticipants[p.uid] = p;
            renderGroupGrid();
          }
        });

        _groupPartRemovedHandler = _groupCallSessionRef.on('child_removed', s => {
          const p = s.val();
          const pUid = (p && p.uid) || s.key;
          if (pUid && pUid !== me.uid) {
            closeGroupPeer(pUid);
            delete rtcGroupParticipants[pUid];
            renderGroupGrid();
          }
        });

        // Listen for signals aimed at ME
        _groupSignalsRef = roomRef.child('signals/' + me.uid);
        _groupSignalAddedHandler = _groupSignalsRef.on('child_added', s => handleIncomingGroupSignal(s.key, s.val()));
        _groupSignalsRef.on('child_changed', s => handleIncomingGroupSignal(s.key, s.val()));

        // Listen for candidates aimed at ME
        _groupCandidatesRef = roomRef.child('candidates/' + me.uid);
        _groupCandAddedHandler = _groupCandidatesRef.on('child_added', s => {
          const fromUid = s.key;
          const candsObj = s.val();
          if (candsObj && typeof candsObj === 'object') {
            for (const cid in candsObj) {
              const c = candsObj[cid];
              if (c && c.candidate) addGroupCandidate(fromUid, c.candidate);
            }
          }
        });
        _groupCandidatesRef.on('child_changed', s => {
          const fromUid = s.key;
          const candsObj = s.val();
          if (candsObj && typeof candsObj === 'object') {
            for (const cid in candsObj) {
              const c = candsObj[cid];
              if (c && c.candidate) addGroupCandidate(fromUid, c.candidate);
            }
          }
        });

        updateActiveGroupCallBar(chatId, { active: true, participants: { ...rtcGroupParticipants, [me.uid]: myData } });

      } catch (err) {
        console.error('startOrJoinGroupCall error:', err);
        setCallStatus('Ошибка подключения');
        setTimeout(leaveGroupCall, 2000);
      }
    }
    window.startOrJoinGroupCall = startOrJoinGroupCall;
    window.joinGroupCall = function(cid) { return startOrJoinGroupCall(cid || activeId); };

    async function initGroupPeerConnection(remoteUid, isInitiator) {
      if (rtcGroupPeers[remoteUid] && rtcGroupPeers[remoteUid].pc) {
        return rtcGroupPeers[remoteUid];
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      const peerObj = {
        uid: remoteUid,
        pc: pc,
        remoteStream: null,
        audioEl: null,
        queuedCandidates: (rtcGroupPeers[remoteUid]?.queuedCandidates) || []
      };
      rtcGroupPeers[remoteUid] = peerObj;

      if (rtcLocalStream) {
        rtcLocalStream.getTracks().forEach(t => pc.addTrack(t, rtcLocalStream));
      }

      pc.onicecandidate = e => {
        if (e.candidate && rtcActiveChatId && me) {
          const fdb = getFbDb();
          fdb.ref('group_calls/' + rtcActiveChatId + '/candidates/' + remoteUid + '/' + me.uid).push({
            candidate: e.candidate.toJSON(),
            at: Date.now()
          }).catch(() => {});
        }
      };

      pc.ontrack = e => {
        console.log('[GroupWebRTC] ontrack from', remoteUid, e.track.kind);
        const stream = e.streams[0] || new MediaStream([e.track]);
        peerObj.remoteStream = stream;

        if (!peerObj.audioEl) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          audio.playsInline = true;
          audio.style.display = 'none';
          document.body.appendChild(audio);
          peerObj.audioEl = audio;
        }
        peerObj.audioEl.srcObject = stream;
        applyAudioOutputVolume();
        applyAudioOutputDevice(peerObj.audioEl);
        peerObj.audioEl.play().catch(() => {});

        setupSpeakingDetector(remoteUid, stream);

        if (e.track.kind === 'video') {
          updateGroupPeerTileVideo(remoteUid, stream);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log('[GroupWebRTC] Peer', remoteUid, 'state:', pc.connectionState);
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          const tile = document.getElementById('groupTile_' + remoteUid);
          if (tile) tile.classList.remove('speaking');
        }
      };

      if (isInitiator) {
        try {
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);
          const fdb = getFbDb();
          await fdb.ref('group_calls/' + rtcActiveChatId + '/signals/' + remoteUid + '/' + me.uid).set({
            type: 'offer',
            sdp: offer.sdp,
            at: Date.now()
          });
        } catch (e) {
          console.warn('[GroupWebRTC] createOffer error to', remoteUid, e);
        }
      }

      return peerObj;
    }

    async function handleIncomingGroupSignal(fromUid, signalData) {
      if (!signalData || !signalData.type || !fromUid || fromUid === me?.uid) return;
      const fdb = getFbDb();

      if (signalData.type === 'offer') {
        console.log('[GroupWebRTC] Received offer from', fromUid);
        let peerObj = rtcGroupPeers[fromUid];
        if (!peerObj || !peerObj.pc) {
          peerObj = await initGroupPeerConnection(fromUid, false);
        }

        try {
          await peerObj.pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signalData.sdp }));
          drainGroupQueuedCandidates(fromUid);

          const answer = await peerObj.pc.createAnswer();
          await peerObj.pc.setLocalDescription(answer);

          await fdb.ref('group_calls/' + rtcActiveChatId + '/signals/' + fromUid + '/' + me.uid).set({
            type: 'answer',
            sdp: answer.sdp,
            at: Date.now()
          });
        } catch (err) {
          console.warn('[GroupWebRTC] setRemoteDescription/answer error:', err);
        }
      } else if (signalData.type === 'answer') {
        console.log('[GroupWebRTC] Received answer from', fromUid);
        const peerObj = rtcGroupPeers[fromUid];
        if (peerObj && peerObj.pc && !peerObj.pc.currentRemoteDescription) {
          try {
            await peerObj.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signalData.sdp }));
            drainGroupQueuedCandidates(fromUid);
          } catch (err) {
            console.warn('[GroupWebRTC] setRemoteDescription(answer) error:', err);
          }
        }
      }
    }

    function addGroupCandidate(fromUid, candidateData) {
      const peerObj = rtcGroupPeers[fromUid];
      if (!peerObj || !peerObj.pc || !peerObj.pc.remoteDescription || !peerObj.pc.remoteDescription.type) {
        if (!rtcGroupPeers[fromUid]) {
          rtcGroupPeers[fromUid] = { queuedCandidates: [candidateData] };
        } else {
          if (!Array.isArray(rtcGroupPeers[fromUid].queuedCandidates)) rtcGroupPeers[fromUid].queuedCandidates = [];
          rtcGroupPeers[fromUid].queuedCandidates.push(candidateData);
        }
        return;
      }

      try {
        peerObj.pc.addIceCandidate(new RTCIceCandidate(candidateData)).catch(() => {});
      } catch (_) {}
    }

    function drainGroupQueuedCandidates(fromUid) {
      const peerObj = rtcGroupPeers[fromUid];
      if (!peerObj || !peerObj.pc || !peerObj.pc.remoteDescription) return;
      if (Array.isArray(peerObj.queuedCandidates)) {
        while (peerObj.queuedCandidates.length > 0) {
          const c = peerObj.queuedCandidates.shift();
          try {
            peerObj.pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
          } catch (_) {}
        }
      }
    }

    function closeGroupPeer(remoteUid) {
      const peer = rtcGroupPeers[remoteUid];
      if (peer) {
        if (peer.pc) {
          try { peer.pc.close(); } catch (_) {}
        }
        if (peer.audioEl) {
          try { peer.audioEl.pause(); peer.audioEl.remove(); } catch (_) {}
        }
        delete rtcGroupPeers[remoteUid];
      }
      if (_groupSpeakerAnalysers[remoteUid]) {
        try {
          clearInterval(_groupSpeakerAnalysers[remoteUid].interval);
          _groupSpeakerAnalysers[remoteUid].source.disconnect();
        } catch (_) {}
        delete _groupSpeakerAnalysers[remoteUid];
      }
    }

    function updateGroupPeerTileVideo(remoteUid, stream) {
      const tile = document.getElementById('groupTile_' + remoteUid);
      if (tile) {
        tile.classList.add('has-video');
        const v = tile.querySelector('video');
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      }
    }

    function setupSpeakingDetector(uid, stream) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!_groupAudioContext || _groupAudioContext.state === 'closed') {
          _groupAudioContext = new AudioCtx();
        }
        if (_groupAudioContext.state === 'suspended') {
          _groupAudioContext.resume().catch(() => {});
        }
        const audioTracks = stream.getAudioTracks();
        if (!audioTracks.length) return;

        const source = _groupAudioContext.createMediaStreamSource(stream);
        const analyser = _groupAudioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const interval = setInterval(() => {
          if (!rtcIsGroupCall || (!rtcGroupParticipants[uid] && uid !== me?.uid)) {
            clearInterval(interval);
            try { source.disconnect(); } catch (_) {}
            return;
          }
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          const isSpeaking = avg > 14;
          const tile = document.getElementById('groupTile_' + uid);
          if (tile) {
            tile.classList.toggle('speaking', isSpeaking);
          }
        }, 120);

        if (_groupSpeakerAnalysers[uid]) {
          try {
            clearInterval(_groupSpeakerAnalysers[uid].interval);
            _groupSpeakerAnalysers[uid].source.disconnect();
          } catch (_) {}
        }
        _groupSpeakerAnalysers[uid] = { source, analyser, interval };
      } catch (e) {
        console.warn('[SpeakingDetector] error:', e);
      }
    }

    function setupLocalSpeakingDetector() {
      if (!rtcLocalStream) return;
      setupSpeakingDetector(me.uid, rtcLocalStream);
    }

    function renderGroupGrid() {
      const grid = document.getElementById('callGroupGrid');
      if (!grid) return;

      const otherUids = Object.keys(rtcGroupParticipants).filter(u => u !== me.uid);
      const allUids = [me.uid, ...otherUids];
      grid.setAttribute('data-count', String(Math.min(allUids.length, 9)));

      allUids.forEach(uid => {
        let tile = document.getElementById('groupTile_' + uid);
        const isLocal = (uid === me.uid);
        const p = isLocal ? {
          uid: me.uid,
          nick: (me.nick || 'Вы') + ' (Вы)',
          avatar: me.avatar || me.ava || '',
          isMuted: rtcMuted,
          isCamOn: rtcCamActive,
          isScreenOn: rtcScreenActive
        } : (rtcGroupParticipants[uid] || {});

        if (!tile) {
          tile = document.createElement('div');
          tile.id = 'groupTile_' + uid;
          tile.className = 'call-tile' + (isLocal ? ' is-local' : '');
          const avaUrl = resolveCallAva(p.avatar);
          const safeNick = typeof escHtml === 'function' ? escHtml(p.nick || 'Участник') : (p.nick || 'Участник');
          tile.innerHTML = \`
            <video class=\"call-tile-video\" autoplay playsinline \${isLocal ? 'muted' : ''}></video>
            <div class=\"call-tile-avatar-wrap\">
              <img class=\"call-tile-avatar\" src=\"\${avaUrl}\" alt=\"\" onerror=\"if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}\">
              <div class=\"call-tile-name\">\${safeNick}</div>
            </div>
            <div class=\"call-tile-meta\">
              <span class=\"call-tile-name\">\${safeNick}</span>
              <span class=\"call-tile-badge\"><i class=\"fa-solid fa-microphone\${p.isMuted ? '-slash' : ''}\"></i></span>
            </div>
          \`;
          grid.appendChild(tile);

          if (isLocal && rtcLocalStream) {
            const v = tile.querySelector('video');
            if (v) { v.srcObject = rtcLocalStream; v.play().catch(() => {}); }
          } else if (rtcGroupPeers[uid] && rtcGroupPeers[uid].remoteStream) {
            const v = tile.querySelector('video');
            if (v) { v.srcObject = rtcGroupPeers[uid].remoteStream; v.play().catch(() => {}); }
          }
        }

        tile.classList.toggle('muted', !!p.isMuted);
        tile.classList.toggle('has-video', !!(p.isCamOn || p.isScreenOn));
        const badge = tile.querySelector('.call-tile-badge');
        if (badge) {
          badge.innerHTML = \`<i class=\"fa-solid fa-microphone\${p.isMuted ? '-slash' : ''}\"></i>\`;
        }
      });

      // Remove stale tiles
      const currentTiles = grid.querySelectorAll('.call-tile');
      currentTiles.forEach(t => {
        const tid = t.id.replace('groupTile_', '');
        if (!allUids.includes(tid)) t.remove();
      });

      const count = allUids.length;
      const countWord = count === 1 ? 'участник' : (count < 5 ? 'участника' : 'участников');
      const statusSub = document.getElementById('callStatusText');
      if (statusSub) statusSub.textContent = 'Групповой звонок • ' + count + ' ' + countWord;
    }

    async function toggleGroupCallCam() {
      rtcCamActive = !rtcCamActive;
      const btn = document.getElementById('callBtnCam');
      if (btn) btn.classList.toggle('active', rtcCamActive);

      try {
        let newVideoTrack = null;
        if (rtcCamActive) {
          const camId = localStorage.getItem('pref_cam_id');
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: camId ? { ideal: camId } : undefined, width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          newVideoTrack = stream.getVideoTracks()[0];
          if (rtcLocalStream) {
            rtcLocalStream.getVideoTracks().forEach(t => { rtcLocalStream.removeTrack(t); t.stop(); });
            rtcLocalStream.addTrack(newVideoTrack);
          }
        } else {
          if (rtcLocalStream) {
            rtcLocalStream.getVideoTracks().forEach(t => { rtcLocalStream.removeTrack(t); t.stop(); });
          }
        }

        for (const remoteUid in rtcGroupPeers) {
          const peer = rtcGroupPeers[remoteUid];
          if (peer && peer.pc) {
            const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
            if (sender) {
              if (newVideoTrack) sender.replaceTrack(newVideoTrack);
              else {
                peer.pc.removeTrack(sender);
                renegotiateGroupPeer(remoteUid);
              }
            } else if (newVideoTrack) {
              peer.pc.addTrack(newVideoTrack, rtcLocalStream);
              renegotiateGroupPeer(remoteUid);
            }
          }
        }

        const myTile = document.getElementById('groupTile_' + me.uid);
        if (myTile) {
          myTile.classList.toggle('has-video', rtcCamActive);
          const v = myTile.querySelector('video');
          if (v) {
            if (rtcCamActive) {
              v.srcObject = rtcLocalStream;
              v.play().catch(() => {});
            } else {
              v.srcObject = null;
            }
          }
        }

        const fdb = getFbDb();
        if (fdb && me && rtcActiveChatId) {
          fdb.ref('group_calls/' + rtcActiveChatId + '/participants/' + me.uid).update({ isCamOn: rtcCamActive }).catch(() => {});
        }
      } catch (err) {
        console.warn('toggleGroupCallCam error:', err);
        rtcCamActive = false;
        if (btn) btn.classList.remove('active');
      }
    }

    async function toggleGroupCallScreenShare() {
      rtcScreenActive = !rtcScreenActive;
      const btn = document.getElementById('callBtnScreen');
      if (btn) btn.classList.toggle('active', rtcScreenActive);

      if (rtcScreenActive) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = screenStream.getVideoTracks()[0];
          if (rtcLocalStream) {
            rtcLocalStream.getVideoTracks().forEach(t => { rtcLocalStream.removeTrack(t); t.stop(); });
            rtcLocalStream.addTrack(screenTrack);
          }

          for (const remoteUid in rtcGroupPeers) {
            const peer = rtcGroupPeers[remoteUid];
            if (peer && peer.pc) {
              const sender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'video');
              if (sender) sender.replaceTrack(screenTrack);
              else {
                peer.pc.addTrack(screenTrack, rtcLocalStream);
                renegotiateGroupPeer(remoteUid);
              }
            }
          }

          const myTile = document.getElementById('groupTile_' + me.uid);
          if (myTile) {
            myTile.classList.toggle('has-video', true);
            const v = myTile.querySelector('video');
            if (v) { v.srcObject = screenStream; v.play().catch(() => {}); }
          }

          const fdb = getFbDb();
          if (fdb && me && rtcActiveChatId) {
            fdb.ref('group_calls/' + rtcActiveChatId + '/participants/' + me.uid).update({ isScreenOn: true }).catch(() => {});
          }

          screenTrack.onended = () => {
            rtcScreenActive = false;
            if (btn) btn.classList.remove('active');
            toggleGroupCallCam();
          };
        } catch (err) {
          console.warn('Screen share error:', err);
          rtcScreenActive = false;
          if (btn) btn.classList.remove('active');
        }
      } else {
        toggleGroupCallCam();
      }
    }

    async function renegotiateGroupPeer(remoteUid) {
      const peer = rtcGroupPeers[remoteUid];
      if (!peer || !peer.pc || !rtcActiveChatId || !me) return;
      try {
        const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peer.pc.setLocalDescription(offer);
        const fdb = getFbDb();
        await fdb.ref('group_calls/' + rtcActiveChatId + '/signals/' + remoteUid + '/' + me.uid).set({
          type: 'offer',
          sdp: offer.sdp,
          at: Date.now()
        });
      } catch (e) {
        console.warn('renegotiateGroupPeer error:', e);
      }
    }

    async function leaveGroupCall() {
      const fdb = getFbDb();
      playDisconnectSound();

      const chatId = rtcActiveChatId;
      if (fdb && chatId && me) {
        try {
          await fdb.ref('group_calls/' + chatId + '/participants/' + me.uid).remove();
          await fdb.ref('group_calls/' + chatId + '/signals/' + me.uid).remove();
          await fdb.ref('group_calls/' + chatId + '/candidates/' + me.uid).remove();

          const snap = await fdb.ref('group_calls/' + chatId + '/participants').once('value');
          const remaining = snap.val();
          if (!remaining || Object.keys(remaining).length === 0) {
            await fdb.ref('group_calls/' + chatId).update({
              active: false,
              endedAt: firebase.database.ServerValue.TIMESTAMP
            });
          }
        } catch (_) {}
      }

      cleanupGroupCallState();
    }
    window.leaveGroupCall = leaveGroupCall;

    function cleanupGroupCallState() {
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();

      if (rtcCallTimerInterval) { clearInterval(rtcCallTimerInterval); rtcCallTimerInterval = null; }

      // Close all peers
      for (const remoteUid in rtcGroupPeers) {
        closeGroupPeer(remoteUid);
      }
      rtcGroupPeers = {};
      rtcGroupParticipants = {};

      if (_groupCallSessionRef && _groupPartAddedHandler) {
        try {
          _groupCallSessionRef.off('child_added', _groupPartAddedHandler);
          _groupCallSessionRef.off('child_changed', _groupPartChangedHandler);
          _groupCallSessionRef.off('child_removed', _groupPartRemovedHandler);
        } catch (_) {}
      }
      if (_groupSignalsRef && _groupSignalAddedHandler) {
        try { _groupSignalsRef.off('child_added', _groupSignalAddedHandler); } catch (_) {}
      }

      if (rtcLocalStream) {
        rtcLocalStream.getTracks().forEach(t => t.stop());
        rtcLocalStream = null;
      }

      const ov = document.getElementById('callOverlay');
      if (ov) ov.classList.remove('open');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) {
        minBar.classList.add('hidden');
        minBar.classList.remove('visible');
        minBar.style.display = 'none';
      }

      const gStage = document.getElementById('callGroupStage');
      if (gStage) gStage.style.display = 'none';
      const grid = document.getElementById('callGroupGrid');
      if (grid) grid.innerHTML = '';

      rtcIsGroupCall = false;
      rtcActiveChatId = null;
      rtcActiveSessionId = null;
      rtcCurrentCallToken = null;
      rtcMuted = false;
      rtcCamActive = false;
      rtcScreenActive = false;

      // Update banner if currently in chat
      if (activeId) {
        const fdb = getFbDb();
        if (fdb) {
          fdb.ref('group_calls/' + activeId).once('value').then(snap => {
            updateActiveGroupCallBar(activeId, snap.val());
          }).catch(() => {});
        }
      }
    }

    /* IN-CHAT ACTIVE GROUP CALL BANNER WATCHER */
    function watchGroupCallBar(chatId) {
      unwatchGroupCallBar();
      const fdb = getFbDb();
      if (!fdb || !chatId) return;

      _groupCallWatchChatId = chatId;
      _groupCallWatchRef = fdb.ref('group_calls/' + chatId);
      _groupCallWatchHandler = _groupCallWatchRef.on('value', snap => {
        const data = snap.val();
        updateActiveGroupCallBar(chatId, data);
      });
    }
    window.watchGroupCallBar = watchGroupCallBar;

    function unwatchGroupCallBar() {
      if (_groupCallWatchRef && _groupCallWatchHandler) {
        try { _groupCallWatchRef.off('value', _groupCallWatchHandler); } catch (_) {}
      }
      _groupCallWatchRef = null;
      _groupCallWatchHandler = null;
      _groupCallWatchChatId = null;
      const bar = document.getElementById('activeGroupCallBar');
      if (bar) bar.classList.add('hidden');
    }
    window.unwatchGroupCallBar = unwatchGroupCallBar;

    function updateActiveGroupCallBar(chatId, data) {
      const bar = document.getElementById('activeGroupCallBar');
      if (!bar) return;
      if (activeId !== chatId) {
        bar.classList.add('hidden');
        return;
      }

      if (!data || !data.active || !data.participants || Object.keys(data.participants).length === 0) {
        bar.classList.add('hidden');
        return;
      }

      const parts = Object.values(data.participants);
      const count = parts.length;
      const countWord = count === 1 ? 'участник' : (count < 5 ? 'участника' : 'участников');

      const subsEl = document.getElementById('groupCallBarSubs');
      if (subsEl) subsEl.textContent = count + ' ' + countWord;

      const avasEl = document.getElementById('groupCallBarAvatars');
      if (avasEl) {
        avasEl.innerHTML = parts.slice(0, 4).map(p => {
          const ava = resolveCallAva(p.avatar);
          return \`<img src=\"\${ava}\" alt=\"\" onerror=\"if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}\">\`;
        }).join('') + (count > 4 ? \`<span style=\"font-size:11px;color:#4ade80;font-weight:700;margin-left:4px\">+\${count - 4}</span>\` : '');
      }

      const btn = document.getElementById('groupCallJoinBtn');
      const btnText = document.getElementById('groupCallJoinBtnText');
      const isInThisCall = (rtcIsGroupCall && rtcActiveChatId === chatId);

      if (btn) btn.classList.toggle('in-call', isInThisCall);
      if (btnText) btnText.textContent = isInThisCall ? 'В звонке' : 'Войти';

      bar.classList.remove('hidden');
    }

    function onGroupCallBarAction() {
      if (!activeId) return;
      if (rtcIsGroupCall && rtcActiveChatId === activeId) {
        maximizeCall();
      } else {
        startOrJoinGroupCall(activeId, 'voice');
      }
    }
    window.onGroupCallBarAction = onGroupCallBarAction;
`;

  // Inject groupEngineCode right before `/* START CALL */`
  const startCallPos = html.indexOf('/* START CALL */');
  if (startCallPos === -1) throw new Error('START CALL anchor not found');
  html = html.slice(0, startCallPos) + groupEngineCode + '\n    ' + html.slice(startCallPos);
  console.log('[apply-group-calls] Injected Group Call Engine Code');
}

// 5. Update startCall to route group chats
const oldStartCallHead = `async function startCall(type = 'voice', joinExisting = false, customChatId = null, partnerOverride = null) {
      const fdb = getFbDb();
      if (!me) return;
      const chatId = customChatId || activeId;
      if (!chatId) return;`;

const newStartCallHead = `async function startCall(type = 'voice', joinExisting = false, customChatId = null, partnerOverride = null) {
      const fdb = getFbDb();
      if (!me) return;
      const chatId = customChatId || activeId;
      if (!chatId) return;

      // Route group chats to Group Call Room Engine
      const isGroup = (activeChat && activeChat.type === 'group') ||
                      (!partnerOverride && activeChat && Array.isArray(activeChat.members) && activeChat.members.length > 2) ||
                      (!partnerOverride && chatId && !chatId.includes('_') && !chatId.startsWith('aihub_') && !chatId.startsWith('fav_'));
      if (isGroup && !partnerOverride) {
        startOrJoinGroupCall(chatId, type);
        return;
      }`;

if (html.includes(oldStartCallHead)) {
  html = html.replace(oldStartCallHead, newStartCallHead);
  console.log('[apply-group-calls] Updated startCall for group detection');
}

// 6. Update endCall to support group calls
const oldEndCallHead = `async function endCall() {
      const fdb = getFbDb();`;

const newEndCallHead = `async function endCall() {
      if (rtcIsGroupCall) {
        await leaveGroupCall();
        return;
      }
      const fdb = getFbDb();`;

if (html.includes(oldEndCallHead)) {
  html = html.replace(oldEndCallHead, newEndCallHead);
  console.log('[apply-group-calls] Updated endCall for group calls');
}

// 7. Update toggleCallMic
const oldToggleMic = `function toggleCallMic() {
      if (!rtcLocalStream) return;
      rtcMuted = !rtcMuted;
      rtcLocalStream.getAudioTracks().forEach(t => t.enabled = !rtcMuted);

      const btn1 = document.getElementById('callBtnMic');
      const btn2 = document.getElementById('minBtnMic');
      if (btn1) {
        btn1.classList.toggle('active', rtcMuted);
        btn1.innerHTML = rtcMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
      }
      if (btn2) {
        btn2.classList.toggle('active', rtcMuted);
        btn2.innerHTML = rtcMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
      }
    }`;

const newToggleMic = `function toggleCallMic() {
      if (!rtcLocalStream) return;
      rtcMuted = !rtcMuted;
      rtcLocalStream.getAudioTracks().forEach(t => t.enabled = !rtcMuted);

      const btn1 = document.getElementById('callBtnMic');
      const btn2 = document.getElementById('minBtnMic');
      if (btn1) {
        btn1.classList.toggle('active', rtcMuted);
        btn1.innerHTML = rtcMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
      }
      if (btn2) {
        btn2.classList.toggle('active', rtcMuted);
        btn2.innerHTML = rtcMuted ? '<i class="fa-solid fa-microphone-slash"></i>' : '<i class="fa-solid fa-microphone"></i>';
      }

      if (rtcIsGroupCall && rtcActiveChatId) {
        const fdb = getFbDb();
        if (fdb && me) {
          fdb.ref('group_calls/' + rtcActiveChatId + '/participants/' + me.uid).update({ isMuted: rtcMuted }).catch(() => {});
        }
        const myTile = document.getElementById('groupTile_' + me.uid);
        if (myTile) {
          myTile.classList.toggle('muted', rtcMuted);
          const b = myTile.querySelector('.call-tile-badge');
          if (b) b.innerHTML = '<i class="fa-solid fa-microphone' + (rtcMuted ? '-slash' : '') + '"></i>';
        }
      }
    }`;

if (html.includes(oldToggleMic)) {
  html = html.replace(oldToggleMic, newToggleMic);
  console.log('[apply-group-calls] Updated toggleCallMic');
}

// 8. Update toggleCallCam & toggleCallScreenShare
const oldToggleCam = `async function toggleCallCam() {
      if (!rtcPC) return;`;

const newToggleCam = `async function toggleCallCam() {
      if (rtcIsGroupCall) {
        await toggleGroupCallCam();
        return;
      }
      if (!rtcPC) return;`;

if (html.includes(oldToggleCam)) {
  html = html.replace(oldToggleCam, newToggleCam);
  console.log('[apply-group-calls] Updated toggleCallCam');
}

const oldToggleScreen = `async function toggleCallScreenShare() {
      if (!rtcPC) return;`;

const newToggleScreen = `async function toggleCallScreenShare() {
      if (rtcIsGroupCall) {
        await toggleGroupCallScreenShare();
        return;
      }
      if (!rtcPC) return;`;

if (html.includes(oldToggleScreen)) {
  html = html.replace(oldToggleScreen, newToggleScreen);
  console.log('[apply-group-calls] Updated toggleCallScreenShare');
}

// 9. Update switchActiveCallMic for group peers
const oldSwitchMic = `if (audioSender) {
            await audioSender.replaceTrack(newAudioTrack);
            console.log('[WebRTC] Swapped active audio track with mic device:', newMicId || 'default');
          }`;

const newSwitchMic = `if (audioSender) {
            await audioSender.replaceTrack(newAudioTrack);
            console.log('[WebRTC] Swapped active audio track with mic device:', newMicId || 'default');
          }
          if (rtcIsGroupCall && typeof rtcGroupPeers !== 'undefined') {
            for (const uid in rtcGroupPeers) {
              const peer = rtcGroupPeers[uid];
              if (peer && peer.pc) {
                const snd = peer.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
                if (snd) snd.replaceTrack(newAudioTrack).catch(() => {});
              }
            }
          }`;

if (html.includes(oldSwitchMic)) {
  html = html.replace(oldSwitchMic, newSwitchMic);
  console.log('[apply-group-calls] Updated switchActiveCallMic for group peers');
}

// 10. Update applyAudioOutputVolume & applyAudioOutputDevice
const oldApplyVol = `function applyAudioOutputVolume() {
      const vol = parseFloat(localStorage.getItem('pref_speaker_vol') || '1');
      const audioEl = document.getElementById('rtcRemoteAudio');
      if (audioEl) audioEl.volume = Math.max(0, Math.min(1, vol));
    }`;

const newApplyVol = `function applyAudioOutputVolume() {
      const vol = parseFloat(localStorage.getItem('pref_speaker_vol') || '1');
      const audioEl = document.getElementById('rtcRemoteAudio');
      if (audioEl) audioEl.volume = Math.max(0, Math.min(1, vol));
      if (typeof rtcGroupPeers !== 'undefined') {
        for (const k in rtcGroupPeers) {
          if (rtcGroupPeers[k] && rtcGroupPeers[k].audioEl) {
            rtcGroupPeers[k].audioEl.volume = Math.max(0, Math.min(1, vol));
          }
        }
      }
    }`;

if (html.includes(oldApplyVol)) {
  html = html.replace(oldApplyVol, newApplyVol);
  console.log('[apply-group-calls] Updated applyAudioOutputVolume for group peers');
}

const oldApplyDev = `async function applyAudioOutputDevice(element) {
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
    }`;

const newApplyDev = `async function applyAudioOutputDevice(element) {
      const el = element || document.getElementById('rtcRemoteAudio');
      if (el) {
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
      if (!element && typeof rtcGroupPeers !== 'undefined') {
        for (const k in rtcGroupPeers) {
          if (rtcGroupPeers[k] && rtcGroupPeers[k].audioEl) {
            applyAudioOutputDevice(rtcGroupPeers[k].audioEl);
          }
        }
      }
    }`;

if (html.includes(oldApplyDev)) {
  html = html.replace(oldApplyDev, newApplyDev);
  console.log('[apply-group-calls] Updated applyAudioOutputDevice for group peers');
}

// 11. Update minimizeCall & maximizeCall for group calls
const oldMinimize = `if (minBar && (rtcActiveSessionId || rtcPC)) {
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
        }`;

const newMinimize = `if (minBar && (rtcActiveSessionId || rtcPC || rtcIsGroupCall)) {
        minBar.classList.remove('hidden');
        minBar.classList.add('visible');
        minBar.style.display = 'flex';
        const n = rtcIsGroupCall ? (activeChat?.name || document.getElementById('callUserTitle')?.textContent || 'Групповой звонок') : (document.getElementById('callUserTitle')?.textContent || 'Звонок');
        const minName = document.getElementById('minCallName');
        if (minName) minName.textContent = n;
        const ava = rtcIsGroupCall ? (typeof resolveCallAva === 'function' ? resolveCallAva(activeChat?.avatar) : (activeChat?.avatar || DEFAULT_CALL_AVA)) : (document.getElementById('callAvatarImg')?.src || DEFAULT_CALL_AVA);
        const minAva = document.getElementById('minCallAvatar');
        if (minAva) {
          minAva.alt = '';
          minAva.src = ava;
        }`;

if (html.includes(oldMinimize)) {
  html = html.replace(oldMinimize, newMinimize);
  console.log('[apply-group-calls] Updated minimizeCall for group calls');
}

const oldMaximize = `if (ov && (rtcActiveSessionId || rtcPC)) {
        ov.classList.add('open');
      }`;

const newMaximize = `if (ov && (rtcActiveSessionId || rtcPC || rtcIsGroupCall)) {
        ov.classList.add('open');
      }`;

if (html.includes(oldMaximize)) {
  html = html.replace(oldMaximize, newMaximize);
  console.log('[apply-group-calls] Updated maximizeCall for group calls');
}

// 12. Hook watchGroupCallBar inside openChat
const openChatAnchor = `updatePinnedBar(data.pinnedMsgs || []);`;
const openChatReplacement = `updatePinnedBar(data.pinnedMsgs || []);
      if (typeof watchGroupCallBar === 'function') {
        if (data.type === 'group' || (Array.isArray(data.members) && data.members.length > 2)) {
          watchGroupCallBar(id);
        } else {
          unwatchGroupCallBar();
        }
      }`;

if (html.includes(openChatAnchor) && !html.includes('watchGroupCallBar(id)')) {
  html = html.replace(openChatAnchor, openChatReplacement);
  console.log('[apply-group-calls] Hooked watchGroupCallBar in openChat');
}

// 13. Update initCallSessionListener to also monitor group calls
const oldInitCallListener = `function initCallSessionListener(chatId) {
      const fdb = getFbDb();
      if (!fdb || !chatId) return;
      const ref = fdb.ref('call_sessions/' + chatId);
      const handler = snap => {
        const data = snap.val();
        if (!data || !me) {
          if (activeCallChats.has(chatId)) {
            activeCallChats.delete(chatId);
            if (typeof renderChatList === 'function') renderChatList();
          }
          return;
        }

        if (data.status === 'ringing' || data.status === 'connected') {
          if (!activeCallChats.has(chatId)) {
            activeCallChats.add(chatId);
            if (typeof renderChatList === 'function') renderChatList();
          }
        } else {
          if (activeCallChats.has(chatId)) {
            activeCallChats.delete(chatId);
            if (typeof renderChatList === 'function') renderChatList();
          }
        }
      };
      ref.on('value', handler);
      return () => ref.off('value', handler);
    }`;

const newInitCallListener = `function initCallSessionListener(chatId) {
      const fdb = getFbDb();
      if (!fdb || !chatId) return;
      const dmRef = fdb.ref('call_sessions/' + chatId);
      const groupRef = fdb.ref('group_calls/' + chatId + '/active');

      const updateChatCallBadge = () => {
        if (typeof renderChatList === 'function') renderChatList();
      };

      let dmActive = false;
      let groupActive = false;

      const dmHandler = snap => {
        const data = snap.val();
        dmActive = !!(data && (data.status === 'ringing' || data.status === 'connected'));
        if (dmActive || groupActive) activeCallChats.add(chatId);
        else activeCallChats.delete(chatId);
        updateChatCallBadge();
      };

      const groupHandler = snap => {
        groupActive = (snap.val() === true);
        if (dmActive || groupActive) activeCallChats.add(chatId);
        else activeCallChats.delete(chatId);
        updateChatCallBadge();
      };

      dmRef.on('value', dmHandler);
      groupRef.on('value', groupHandler);

      return () => {
        dmRef.off('value', dmHandler);
        groupRef.off('value', groupHandler);
      };
    }`;

if (html.includes(oldInitCallListener)) {
  html = html.replace(oldInitCallListener, newInitCallListener);
  console.log('[apply-group-calls] Updated initCallSessionListener for group call badges');
}

// 14. Validate all scripts in the modified HTML
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let scriptIdx = 0;
let errors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  const code = match[1];
  if (!code.trim() || match[0].includes('type="application/ld+json"')) continue;
  try {
    new Function(code);
  } catch (err) {
    errors++;
    console.error('Syntax error in script #' + scriptIdx + ':', err.message);
  }
}

if (errors > 0) {
  console.error('[apply-group-calls] ABORTING: Found', errors, 'syntax errors!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[apply-group-calls] SUCCESS! Written', html.length, 'bytes to public/index.html');
