// server/patch-screen-share-fullscreen.js
// Fixes:
// 1. Black screen on screen share (proper transceiver allocation + answer handling during renegotiation)
// 2. Camera unexpectedly turning on when screen share is stopped (DO NOT toggle camera, preserve camera state)
// 3. Fullscreen mode for screen share and tiles (both native OS fullscreen and in-app expand mode with double-click support)
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('[patch-screen-share] Loaded index.html, size:', html.length);

// 1. CSS for Tile Fullscreen, Screen share styling, and Fullscreen button
const fsCss = `
    /* ══════ SCREEN SHARE & FULLSCREEN UI ══════ */
    .call-tile.is-screen .call-tile-video {
      object-fit: contain !important;
      background: #000 !important;
    }
    .call-tile-fs-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      cursor: pointer;
      z-index: 12;
      opacity: 0.85;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(10px);
    }
    .call-tile-fs-btn:hover {
      opacity: 1 !important;
      background: rgba(0, 0, 0, 0.95);
      transform: scale(1.1);
    }
    .call-tile.tile-fullscreen {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      z-index: 100005 !important;
      border-radius: 0 !important;
      border: none !important;
      background: #000 !important;
    }
    .call-tile.tile-fullscreen .call-tile-video {
      object-fit: contain !important;
      background: #000 !important;
    }
    .call-tile.tile-fullscreen .call-tile-fs-btn {
      top: 24px;
      right: 24px;
      width: 44px;
      height: 44px;
      font-size: 17px;
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(255, 255, 255, 0.35);
    }
    .call-tile-screen-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(56, 189, 248, 0.25);
      border: 1px solid rgba(56, 189, 248, 0.5);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 8px;
    }
    .call-fs-btn {
      position: absolute;
      top: 18px;
      right: 18px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      cursor: pointer;
      z-index: 30;
      backdrop-filter: blur(10px);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .call-fs-btn:hover {
      background: rgba(0, 0, 0, 0.95);
      transform: scale(1.1);
    }
    .call-video-container.fullscreen {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      max-height: none !important;
      border-radius: 0 !important;
      z-index: 100005 !important;
      background: #000 !important;
    }
    .call-video-container.fullscreen video#rtcRemoteVideo {
      object-fit: contain !important;
      background: #000 !important;
    }
    .call-video-container.fullscreen .call-fs-btn {
      top: 24px;
      right: 24px;
      width: 46px;
      height: 46px;
      font-size: 18px;
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(255, 255, 255, 0.4);
    }
`;

if (!html.includes('.call-tile-fs-btn')) {
  const cssAnchor = '.call-ctl-btn.end-call:hover {';
  const pos = html.indexOf(cssAnchor);
  if (pos !== -1) {
    const endPos = html.indexOf('}', pos) + 1;
    html = html.slice(0, endPos) + '\n' + fsCss + '\n' + html.slice(endPos);
    console.log('[patch-screen-share] Injected Fullscreen & Screen share CSS');
  }
}

// 2. HTML: Add Fullscreen Button to #callVideoContainer
const oldVideoContainerHtml = `<div class="call-video-container" id="callVideoContainer" style="display:none">
        <video id="rtcRemoteVideo"`;

const newVideoContainerHtml = `<div class="call-video-container" id="callVideoContainer" style="display:none" ondblclick="toggleCallVideoFullscreen()">
        <button type="button" class="call-fs-btn" id="callVideoFsBtn" onclick="event.stopPropagation();toggleCallVideoFullscreen()" title="На весь экран">
          <i class="fa-solid fa-expand"></i>
        </button>
        <video id="rtcRemoteVideo"`;

if (html.includes(oldVideoContainerHtml)) {
  html = html.replace(oldVideoContainerHtml, newVideoContainerHtml);
  console.log('[patch-screen-share] Added Fullscreen button to #callVideoContainer');
}

// 3. Fix handleIncomingGroupSignal: apply answer during renegotiation!
const oldSignalAnswerCheck = `} else if (signalData.type === 'answer') {
        console.log('[GroupWebRTC] Received answer from', fromUid);
        const peerObj = rtcGroupPeers[fromUid];
        if (peerObj && peerObj.pc && !peerObj.pc.currentRemoteDescription) {`;

const newSignalAnswerCheck = `} else if (signalData.type === 'answer') {
        console.log('[GroupWebRTC] Received answer from', fromUid);
        const peerObj = rtcGroupPeers[fromUid];
        if (peerObj && peerObj.pc && (peerObj.pc.signalingState === 'have-local-offer' || !peerObj.pc.currentRemoteDescription)) {`;

if (html.includes(oldSignalAnswerCheck)) {
  html = html.replace(oldSignalAnswerCheck, newSignalAnswerCheck);
  console.log('[patch-screen-share] Fixed handleIncomingGroupSignal to accept renegotiation answers');
}

// 4. Pre-allocate transceivers in initGroupPeerConnection so video channel is always open without negotiation delays
const oldInitPeerStart = `const pc = new RTCPeerConnection(RTC_CONFIG);
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
      }`;

const newInitPeerStart = `const pc = new RTCPeerConnection(RTC_CONFIG);
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      } catch (_) {}

      const peerObj = {
        uid: remoteUid,
        pc: pc,
        remoteStream: null,
        remoteAudioStream: null,
        remoteVideoStream: null,
        audioEl: null,
        queuedCandidates: (rtcGroupPeers[remoteUid]?.queuedCandidates) || []
      };
      rtcGroupPeers[remoteUid] = peerObj;

      if (rtcLocalStream) {
        rtcLocalStream.getTracks().forEach(t => {
          const sender = pc.getSenders().find(s => (s.track && s.track.kind === t.kind) || s.kind === t.kind);
          if (sender) sender.replaceTrack(t).catch(() => {});
          else pc.addTrack(t, rtcLocalStream);
        });
      }`;

if (html.includes(oldInitPeerStart)) {
  html = html.replace(oldInitPeerStart, newInitPeerStart);
  console.log('[patch-screen-share] Pre-allocated transceivers in initGroupPeerConnection');
}

// 5. Replace toggleGroupCallScreenShare & stopGroupScreenShare with clean non-camera-triggering implementation
const oldGroupScreenShare = `    async function toggleGroupCallScreenShare() {
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
    }`;

const newGroupScreenShare = `    let _groupScreenStream = null;

    async function toggleGroupCallScreenShare() {
      if (rtcScreenActive) {
        stopGroupScreenShare();
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', displaySurface: 'monitor' },
          audio: false
        });
        _groupScreenStream = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        rtcScreenActive = true;
        const btn = document.getElementById('callBtnScreen');
        if (btn) btn.classList.add('active');

        // Forward screen track to all peers immediately
        for (const remoteUid in rtcGroupPeers) {
          const peer = rtcGroupPeers[remoteUid];
          if (peer && peer.pc) {
            const sender = peer.pc.getSenders().find(s => (s.track && s.track.kind === 'video') || s.kind === 'video');
            if (sender) {
              await sender.replaceTrack(screenTrack);
            } else {
              peer.pc.addTrack(screenTrack, screenStream);
              renegotiateGroupPeer(remoteUid);
            }
          }
        }

        const myTile = document.getElementById('groupTile_' + me?.uid);
        if (myTile) {
          myTile.classList.add('has-video', 'is-screen');
          const v = myTile.querySelector('video');
          if (v) {
            v.muted = true;
            v.volume = 0;
            v.srcObject = new MediaStream([screenTrack]);
            v.play().catch(() => {});
          }
        }

        const fdb = getFbDb();
        if (fdb && me && rtcActiveChatId) {
          fdb.ref('group_calls/' + rtcActiveChatId + '/participants/' + me.uid).update({
            isScreenOn: true
          }).catch(() => {});
        }

        screenTrack.onended = () => {
          stopGroupScreenShare();
        };

      } catch (err) {
        console.warn('Screen share cancelled or error:', err);
        rtcScreenActive = false;
        const btn = document.getElementById('callBtnScreen');
        if (btn) btn.classList.remove('active');
      }
    }
    window.toggleGroupCallScreenShare = toggleGroupCallScreenShare;

    function stopGroupScreenShare() {
      rtcScreenActive = false;
      const btn = document.getElementById('callBtnScreen');
      if (btn) btn.classList.remove('active');

      if (_groupScreenStream) {
        _groupScreenStream.getTracks().forEach(t => t.stop());
        _groupScreenStream = null;
      }

      // DO NOT TURN ON CAMERA: restore camera track only if camera was ALREADY on before screen sharing
      let restoreTrack = null;
      if (rtcCamActive && rtcLocalStream) {
        const camTracks = rtcLocalStream.getVideoTracks();
        if (camTracks.length > 0 && camTracks[0].readyState === 'live') {
          restoreTrack = camTracks[0];
        }
      }

      for (const remoteUid in rtcGroupPeers) {
        const peer = rtcGroupPeers[remoteUid];
        if (peer && peer.pc) {
          const sender = peer.pc.getSenders().find(s => (s.track && s.track.kind === 'video') || s.kind === 'video');
          if (sender) sender.replaceTrack(restoreTrack);
        }
      }

      const myTile = document.getElementById('groupTile_' + me?.uid);
      if (myTile) {
        myTile.classList.remove('is-screen');
        myTile.classList.toggle('has-video', !!restoreTrack);
        const v = myTile.querySelector('video');
        if (v) {
          if (restoreTrack) {
            v.muted = true;
            v.volume = 0;
            v.srcObject = new MediaStream([restoreTrack]);
            v.play().catch(() => {});
          } else {
            v.srcObject = null;
          }
        }
      }

      const fdb = getFbDb();
      if (fdb && me && rtcActiveChatId) {
        fdb.ref('group_calls/' + rtcActiveChatId + '/participants/' + me.uid).update({
          isScreenOn: false,
          isCamOn: !!restoreTrack
        }).catch(() => {});
      }
    }
    window.stopGroupScreenShare = stopGroupScreenShare;`;

if (html.includes(oldGroupScreenShare)) {
  html = html.replace(oldGroupScreenShare, newGroupScreenShare);
  console.log('[patch-screen-share] Replaced toggleGroupCallScreenShare with clean implementation');
}

// 6. Update 1-on-1 toggleCallScreenShare: proper renegotiation & DO NOT turn on camera on stop
const old1on1ScreenShare = `    async function toggleCallScreenShare() {
      if (rtcIsGroupCall) {
        await toggleGroupCallScreenShare();
        return;
      }
      if (!rtcPC) return;
      rtcScreenActive = !rtcScreenActive;
      const btn = document.getElementById('callBtnScreen');
      if (btn) btn.classList.toggle('active', rtcScreenActive);

      if (rtcScreenActive) {
        try {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = screenStream.getVideoTracks()[0];
          const sender = rtcPC.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(screenTrack);
          } else {
            rtcPC.addTrack(screenTrack, screenStream);
          }
          const locVid = document.getElementById('rtcLocalVideo');
          if (locVid) {
            locVid.srcObject = screenStream;
            locVid.play().catch(() => {});
          }

          screenTrack.onended = () => {
            rtcScreenActive = false;
            if (btn) btn.classList.remove('active');
            toggleCallCam();
          };
        } catch (e) {
          console.warn('Screen share error:', e);
          rtcScreenActive = false;
          if (btn) btn.classList.remove('active');
        }
      } else {
        toggleCallCam();
      }
    }
    window.toggleCallScreenShare = toggleCallScreenShare;`;

const new1on1ScreenShare = `    let _call1on1ScreenStream = null;

    async function toggleCallScreenShare() {
      if (rtcIsGroupCall) {
        await toggleGroupCallScreenShare();
        return;
      }
      if (!rtcPC) return;

      if (rtcScreenActive) {
        stop1on1ScreenShare();
        return;
      }

      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', displaySurface: 'monitor' },
          audio: false
        });
        _call1on1ScreenStream = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        if (!screenTrack) return;

        rtcScreenActive = true;
        const btn = document.getElementById('callBtnScreen');
        if (btn) btn.classList.add('active');

        const vCont = document.getElementById('callVideoContainer');
        const aStage = document.getElementById('callAvatarStage');
        if (vCont) vCont.style.display = 'block';
        if (aStage) aStage.style.display = 'none';

        const locVid = document.getElementById('rtcLocalVideo');
        if (locVid) {
          locVid.muted = true;
          locVid.volume = 0;
          locVid.srcObject = new MediaStream([screenTrack]);
          locVid.play().catch(() => {});
        }

        let vSender = rtcPC.getSenders().find(s => (s.track && s.track.kind === 'video') || s.kind === 'video');
        if (vSender) {
          await vSender.replaceTrack(screenTrack);
        } else {
          rtcPC.addTrack(screenTrack, screenStream);
          const offer = await rtcPC.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          if (typeof optimizeOpusSdp === 'function') offer.sdp = optimizeOpusSdp(offer.sdp);
          await rtcPC.setLocalDescription(offer);
          const fdb = getFbDb();
          if (fdb && rtcActiveSessionId) {
            fdb.ref('call_sessions/' + rtcActiveSessionId).update({
              offer: { type: offer.type, sdp: offer.sdp },
              isScreenOn: true,
              screenUid: me.uid,
              renegotiatedAt: Date.now()
            }).catch(() => {});
          }
        }

        const fdb = getFbDb();
        if (fdb && rtcActiveSessionId) {
          fdb.ref('call_sessions/' + rtcActiveSessionId).update({
            isScreenOn: true,
            isVideo: true,
            screenUid: me.uid
          }).catch(() => {});
        }

        screenTrack.onended = () => {
          stop1on1ScreenShare();
        };

      } catch (err) {
        console.warn('1-on-1 screen share cancelled or error:', err);
        rtcScreenActive = false;
        const btn = document.getElementById('callBtnScreen');
        if (btn) btn.classList.remove('active');
      }
    }
    window.toggleCallScreenShare = toggleCallScreenShare;

    function stop1on1ScreenShare() {
      rtcScreenActive = false;
      const btn = document.getElementById('callBtnScreen');
      if (btn) btn.classList.remove('active');

      if (_call1on1ScreenStream) {
        _call1on1ScreenStream.getTracks().forEach(t => t.stop());
        _call1on1ScreenStream = null;
      }

      // DO NOT TURN ON CAMERA: restore camera only if already active
      let restoreTrack = null;
      if (rtcCamActive && rtcLocalStream) {
        const camTracks = rtcLocalStream.getVideoTracks();
        if (camTracks.length > 0 && camTracks[0].readyState === 'live') {
          restoreTrack = camTracks[0];
        }
      }

      if (rtcPC) {
        const vSender = rtcPC.getSenders().find(s => (s.track && s.track.kind === 'video') || s.kind === 'video');
        if (vSender) vSender.replaceTrack(restoreTrack);
      }

      const locVid = document.getElementById('rtcLocalVideo');
      if (locVid) {
        if (restoreTrack) {
          locVid.muted = true;
          locVid.volume = 0;
          locVid.srcObject = new MediaStream([restoreTrack]);
          locVid.play().catch(() => {});
        } else {
          locVid.srcObject = null;
        }
      }

      const vCont = document.getElementById('callVideoContainer');
      const aStage = document.getElementById('callAvatarStage');
      if (!restoreTrack && !rtcIsVideo) {
        if (vCont) vCont.style.display = 'none';
        if (aStage) aStage.style.display = 'flex';
      }

      const fdb = getFbDb();
      if (fdb && rtcActiveSessionId) {
        fdb.ref('call_sessions/' + rtcActiveSessionId).update({
          isScreenOn: false,
          screenUid: null,
          isVideo: rtcCamActive
        }).catch(() => {});
      }
    }
    window.stop1on1ScreenShare = stop1on1ScreenShare;`;

if (html.includes(old1on1ScreenShare)) {
  html = html.replace(old1on1ScreenShare, new1on1ScreenShare);
  console.log('[patch-screen-share] Replaced 1-on-1 toggleCallScreenShare with clean implementation');
}

// 7. Update renderGroupGrid to add Fullscreen button and double-click to every tile
const oldTileHtml = `          tile.innerHTML = \`
            <video class="call-tile-video" autoplay playsinline \${isLocal ? 'muted' : ''}></video>
            <div class="call-tile-avatar-wrap">
              <img class="call-tile-avatar" src="\${avaUrl}" alt="" onerror="if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}">
              <div class="call-tile-name">\${safeNick}</div>
            </div>
            <div class="call-tile-meta">
              <span class="call-tile-name">\${safeNick}</span>
              <span class="call-tile-badge"><i class="fa-solid fa-microphone\${p.isMuted ? '-slash' : ''}"></i></span>
            </div>
          \`;`;

const newTileHtml = `          tile.setAttribute('ondblclick', "toggleTileFullscreen('" + uid + "')");
          tile.innerHTML = \`
            <button type="button" class="call-tile-fs-btn" onclick="event.stopPropagation();toggleTileFullscreen('\${uid}')" title="На весь экран">
              <i class="fa-solid fa-expand"></i>
            </button>
            <video class="call-tile-video" autoplay playsinline muted></video>
            <div class="call-tile-avatar-wrap">
              <img class="call-tile-avatar" src="\${avaUrl}" alt="" onerror="if(window.DEFAULT_CALL_AVA){this.onerror=null;this.src=window.DEFAULT_CALL_AVA;}">
              <div class="call-tile-name">\${safeNick}</div>
            </div>
            <div class="call-tile-meta">
              <span class="call-tile-name">\${safeNick}</span>
              <div style="display:flex;align-items:center;gap:6px;">
                \${p.isScreenOn ? '<span class="call-tile-screen-badge"><i class="fa-solid fa-display"></i> Экран</span>' : ''}
                <span class="call-tile-badge"><i class="fa-solid fa-microphone\${p.isMuted ? '-slash' : ''}"></i></span>
              </div>
            </div>
          \`;`;

if (html.includes(oldTileHtml)) {
  html = html.replace(oldTileHtml, newTileHtml);
  console.log('[patch-screen-share] Added Fullscreen button & screen badge to group tiles in renderGroupGrid');
}

// 8. Update tile classes in renderGroupGrid to include .is-screen
const oldTileClasses = `tile.classList.toggle('muted', !!p.isMuted);
        tile.classList.toggle('has-video', !!(p.isCamOn || p.isScreenOn));`;

const newTileClasses = `tile.classList.toggle('muted', !!p.isMuted);
        tile.classList.toggle('has-video', !!(p.isCamOn || p.isScreenOn));
        tile.classList.toggle('is-screen', !!p.isScreenOn);`;

if (html.includes(oldTileClasses)) {
  html = html.replace(oldTileClasses, newTileClasses);
  console.log('[patch-screen-share] Added is-screen class toggle in renderGroupGrid');
}

// 9. Inject toggleTileFullscreen & toggleCallVideoFullscreen methods
const fullscreenFunctionsCode = `
    /* ══════ FULLSCREEN ENGINE FOR VIDEO & SCREEN SHARE ══════ */
    function toggleTileFullscreen(uid) {
      const tile = document.getElementById('groupTile_' + uid);
      if (!tile) return;
      const isFs = tile.classList.contains('tile-fullscreen');

      // Exit any previous fullscreen tiles
      document.querySelectorAll('.call-tile.tile-fullscreen').forEach(t => {
        t.classList.remove('tile-fullscreen');
        const b = t.querySelector('.call-tile-fs-btn i');
        if (b) { b.classList.remove('fa-compress'); b.classList.add('fa-expand'); }
      });

      if (!isFs) {
        tile.classList.add('tile-fullscreen');
        const b = tile.querySelector('.call-tile-fs-btn i');
        if (b) { b.classList.remove('fa-expand'); b.classList.add('fa-compress'); }
        try {
          if (tile.requestFullscreen) tile.requestFullscreen().catch(() => {});
          else if (tile.webkitRequestFullscreen) tile.webkitRequestFullscreen();
        } catch (_) {}
      } else {
        try {
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        } catch (_) {}
      }
    }
    window.toggleTileFullscreen = toggleTileFullscreen;

    function toggleCallVideoFullscreen() {
      const vCont = document.getElementById('callVideoContainer');
      if (!vCont) return;
      const isFs = vCont.classList.contains('fullscreen');
      const btn = document.getElementById('callVideoFsBtn');
      const icon = btn ? btn.querySelector('i') : null;

      if (!isFs) {
        vCont.classList.add('fullscreen');
        if (icon) { icon.classList.remove('fa-expand'); icon.classList.add('fa-compress'); }
        try {
          if (vCont.requestFullscreen) vCont.requestFullscreen().catch(() => {});
          else if (vCont.webkitRequestFullscreen) vCont.webkitRequestFullscreen();
        } catch (_) {}
      } else {
        vCont.classList.remove('fullscreen');
        if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
        try {
          if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
        } catch (_) {}
      }
    }
    window.toggleCallVideoFullscreen = toggleCallVideoFullscreen;

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement) {
        document.querySelectorAll('.call-tile.tile-fullscreen').forEach(t => {
          t.classList.remove('tile-fullscreen');
          const b = t.querySelector('.call-tile-fs-btn i');
          if (b) { b.classList.remove('fa-compress'); b.classList.add('fa-expand'); }
        });
        const vCont = document.getElementById('callVideoContainer');
        if (vCont && vCont.classList.contains('fullscreen')) {
          vCont.classList.remove('fullscreen');
          const icon = document.querySelector('#callVideoFsBtn i');
          if (icon) { icon.classList.remove('fa-compress'); icon.classList.add('fa-expand'); }
        }
      }
    });
`;

if (!html.includes('function toggleTileFullscreen(')) {
  const insertPos = html.indexOf('window.toggleGroupCallScreenShare = toggleGroupCallScreenShare;');
  if (insertPos !== -1) {
    const nextLinePos = html.indexOf('\n', insertPos);
    html = html.slice(0, nextLinePos) + '\n' + fullscreenFunctionsCode + html.slice(nextLinePos);
    console.log('[patch-screen-share] Injected Fullscreen functions');
  }
}

// 10. Also update cleanupCallState to stop any active screen share
const oldCleanupCallState = `function cleanupCallState() {
      const fdb = getFbDb();`;

const newCleanupCallState = `function cleanupCallState() {
      if (typeof stop1on1ScreenShare === 'function') stop1on1ScreenShare();
      if (typeof stopGroupScreenShare === 'function') stopGroupScreenShare();
      const fdb = getFbDb();`;

if (html.includes(oldCleanupCallState)) {
  html = html.replace(oldCleanupCallState, newCleanupCallState);
  console.log('[patch-screen-share] Added stopScreenShare to cleanupCallState');
}

// 11. Validate script syntax
const scriptRegex = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let scriptIdx = 0;
let errors = 0;
while ((match = scriptRegex.exec(html)) !== null) {
  scriptIdx++;
  const code = match[1];
  if (!code.trim() || match[0].includes('application/ld+json')) continue;
  try {
    new Function(code);
  } catch (err) {
    errors++;
    console.error('Syntax error in script #' + scriptIdx + ':', err.message);
  }
}

if (errors > 0) {
  console.error('[patch-screen-share] ABORTING: Found', errors, 'syntax errors!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-screen-share] SUCCESS! Updated public/index.html (', html.length, 'bytes)');
