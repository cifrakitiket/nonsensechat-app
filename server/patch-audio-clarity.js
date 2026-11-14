// server/patch-audio-clarity.js
// Fix audio distortion, comb-filtering vibration, robotic fluttering and background noise in WebRTC calls
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('[patch-audio-clarity] Loaded index.html, length:', html.length);

// 1. Ensure HTML <video id="rtcRemoteVideo"> is muted
const oldRemoteVideoHtml = '<video id="rtcRemoteVideo" playsinline preload="none"></video>';
const newRemoteVideoHtml = '<video id="rtcRemoteVideo" playsinline muted preload="none"></video>';
if (html.includes(oldRemoteVideoHtml)) {
  html = html.replace(oldRemoteVideoHtml, newRemoteVideoHtml);
  console.log('[patch-audio-clarity] Added muted attribute to #rtcRemoteVideo');
}

// 2. Add optimizeOpusSdp helper function before WebRTC engine
const optimizeOpusSdpCode = `
    /* ═══ OPUS AUDIO OPTIMIZER (Anti-Robot / Anti-Flutter FEC Tuning) ═══ */
    function optimizeOpusSdp(sdp) {
      if (!sdp || typeof sdp !== 'string') return sdp;
      try {
        const opusMatch = sdp.match(/a=rtpmap:(\\d+)\\s+opus\\/48000\\/2/i);
        if (!opusMatch) return sdp;
        const pt = opusMatch[1];
        const opusSettings = [
          'useinbandfec=1',          // Forward error correction: eliminates robot flutter on packet loss
          'usedtx=0',                // Disable DTX to prevent voice gating cutting off words
          'maxaveragebitrate=64000', // 64kbps crystal clear voice
          'minptime=10',
          'ptime=20',                // 20ms clean audio frame packetization
          'stereo=0',                // Strict mono speech prevents phase-cancellation vibration
          'sprop-stereo=0'
        ];
        const fmtpRegex = new RegExp('(a=fmtp:' + pt + '\\\\s+)([^\\\\r\\\\n]+)', 'i');
        if (fmtpRegex.test(sdp)) {
          return sdp.replace(fmtpRegex, (match, prefix, params) => {
            let paramList = params.split(';').map(p => p.trim()).filter(Boolean);
            const settingKeys = opusSettings.map(s => s.split('=')[0]);
            paramList = paramList.filter(p => !settingKeys.includes(p.split('=')[0]));
            return prefix + [...paramList, ...opusSettings].join(';');
          });
        } else {
          const rtpmapRegex = new RegExp('(a=rtpmap:' + pt + '\\\\s+opus\\\\/48000\\\\/2[^\\\\r\\\\n]*)', 'i');
          return sdp.replace(rtpmapRegex, '$1\\r\\na=fmtp:' + pt + ' ' + opusSettings.join(';'));
        }
      } catch (err) {
        console.warn('optimizeOpusSdp error:', err);
        return sdp;
      }
    }
    window.optimizeOpusSdp = optimizeOpusSdp;
`;

if (!html.includes('function optimizeOpusSdp(')) {
  const insertAnchor = 'const DEFAULT_CALL_AVA =';
  const pos = html.indexOf(insertAnchor);
  if (pos === -1) throw new Error('DEFAULT_CALL_AVA anchor not found');
  html = html.slice(0, pos) + optimizeOpusSdpCode + '\n    ' + html.slice(pos);
  console.log('[patch-audio-clarity] Injected optimizeOpusSdp helper');
}

// 3. Update getCallMedia() audio constraints: strict mono, crystal-clear Chrome flags
const oldGetCallMediaAudio = `      const audioConstraints = {
        deviceId: micId ? { ideal: micId } : undefined,
        echoCancellation: echoCanc,
        noiseSuppression: noiseSupp || isClearVoice,
        autoGainControl: autoGain,
        sampleRate: hiFi ? 48000 : undefined,
        channelCount: hiFi ? 2 : 1
      };`;

const newGetCallMediaAudio = `      const audioConstraints = {
        deviceId: micId ? { ideal: micId } : undefined,
        echoCancellation: echoCanc,
        noiseSuppression: noiseSupp || isClearVoice,
        autoGainControl: autoGain,
        channelCount: 1, // STRICTLY MONO: Eliminates dual-capsule stereo phase cancellation
        sampleRate: 48000,
        googEchoCancellation: echoCanc,
        googAutoGainControl: autoGain,
        googNoiseSuppression: noiseSupp || isClearVoice,
        googHighpassFilter: true,
        googAudioMirroring: false
      };`;

if (html.includes(oldGetCallMediaAudio)) {
  html = html.replace(oldGetCallMediaAudio, newGetCallMediaAudio);
  console.log('[patch-audio-clarity] Updated getCallMedia audio constraints to strict mono & Google speech clarity flags');
}

// 4. Update applyAudioConstraintsToActiveCall()
const oldApplyAudioConstraints = `      try {
        await audioTrack.applyConstraints({
          deviceId: micId ? { ideal: micId } : undefined,
          echoCancellation: echoCanc,
          noiseSuppression: noiseSupp || isClearVoice,
          autoGainControl: autoGain,
          sampleRate: hiFi ? 48000 : undefined,
          channelCount: hiFi ? 2 : 1
        });`;

const newApplyAudioConstraints = `      try {
        await audioTrack.applyConstraints({
          deviceId: micId ? { ideal: micId } : undefined,
          echoCancellation: echoCanc,
          noiseSuppression: noiseSupp || isClearVoice,
          autoGainControl: autoGain,
          channelCount: 1,
          sampleRate: 48000,
          googEchoCancellation: echoCanc,
          googAutoGainControl: autoGain,
          googNoiseSuppression: noiseSupp || isClearVoice,
          googHighpassFilter: true
        });`;

if (html.includes(oldApplyAudioConstraints)) {
  html = html.replace(oldApplyAudioConstraints, newApplyAudioConstraints);
  console.log('[patch-audio-clarity] Updated applyAudioConstraintsToActiveCall constraints');
}

// 5. Apply optimizeOpusSdp in 1-on-1 calls: startCall & acceptIncomingCall
const old1on1Offer = `const offer = await rtcPC.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await rtcPC.setLocalDescription(offer);`;
const new1on1Offer = `const offer = await rtcPC.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        if (typeof optimizeOpusSdp === 'function') offer.sdp = optimizeOpusSdp(offer.sdp);
        await rtcPC.setLocalDescription(offer);`;

if (html.includes(old1on1Offer)) {
  html = html.replace(old1on1Offer, new1on1Offer);
  console.log('[patch-audio-clarity] Applied optimizeOpusSdp to 1-on-1 startCall');
}

const old1on1Answer = `const answer = await rtcPC.createAnswer();
        await rtcPC.setLocalDescription(answer);`;
const new1on1Answer = `const answer = await rtcPC.createAnswer();
        if (typeof optimizeOpusSdp === 'function') answer.sdp = optimizeOpusSdp(answer.sdp);
        await rtcPC.setLocalDescription(answer);`;

if (html.includes(old1on1Answer)) {
  html = html.replace(old1on1Answer, new1on1Answer);
  console.log('[patch-audio-clarity] Applied optimizeOpusSdp to 1-on-1 acceptIncomingCall');
}

// 6. Apply optimizeOpusSdp in Group calls: createOffer, createAnswer, renegotiateGroupPeer
const oldGroupOffer = `const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          await pc.setLocalDescription(offer);`;
const newGroupOffer = `const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
          if (typeof optimizeOpusSdp === 'function') offer.sdp = optimizeOpusSdp(offer.sdp);
          await pc.setLocalDescription(offer);`;

if (html.includes(oldGroupOffer)) {
  html = html.replace(oldGroupOffer, newGroupOffer);
  console.log('[patch-audio-clarity] Applied optimizeOpusSdp to group initGroupPeerConnection');
}

const oldGroupAnswer = `const answer = await peerObj.pc.createAnswer();
          await peerObj.pc.setLocalDescription(answer);`;
const newGroupAnswer = `const answer = await peerObj.pc.createAnswer();
          if (typeof optimizeOpusSdp === 'function') answer.sdp = optimizeOpusSdp(answer.sdp);
          await peerObj.pc.setLocalDescription(answer);`;

if (html.includes(oldGroupAnswer)) {
  html = html.replace(oldGroupAnswer, newGroupAnswer);
  console.log('[patch-audio-clarity] Applied optimizeOpusSdp to group handleIncomingGroupSignal answer');
}

const oldGroupReneg = `const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await peer.pc.setLocalDescription(offer);`;
const newGroupReneg = `const offer = await peer.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        if (typeof optimizeOpusSdp === 'function') offer.sdp = optimizeOpusSdp(offer.sdp);
        await peer.pc.setLocalDescription(offer);`;

if (html.includes(oldGroupReneg)) {
  html = html.replace(oldGroupReneg, newGroupReneg);
  console.log('[patch-audio-clarity] Applied optimizeOpusSdp to group renegotiateGroupPeer');
}

// 7. Fix 1-on-1 setupRtcPeer: ensure vidEl is muted and audio goes strictly through audioEl
const old1on1OnTrack = `        if (e.track.kind === 'video') {
          const vidEl = document.getElementById('rtcRemoteVideo');
          const vCont = document.getElementById('callVideoContainer');
          const aStage = document.getElementById('callAvatarStage');
          if (vidEl) {
            vidEl.srcObject = stream;
            vidEl.autoplay = true;
            vidEl.play().catch(() => {});
          }
          if (vCont) vCont.style.display = 'block';
          if (aStage) aStage.style.display = 'none';
        }`;

const new1on1OnTrack = `        if (e.track.kind === 'video') {
          const vidEl = document.getElementById('rtcRemoteVideo');
          const vCont = document.getElementById('callVideoContainer');
          const aStage = document.getElementById('callAvatarStage');
          if (vidEl) {
            vidEl.muted = true;
            vidEl.volume = 0;
            const vTracks = stream.getVideoTracks();
            vidEl.srcObject = (vTracks && vTracks.length > 0) ? new MediaStream(vTracks) : stream;
            vidEl.autoplay = true;
            vidEl.play().catch(() => {});
          }
          if (vCont) vCont.style.display = 'block';
          if (aStage) aStage.style.display = 'none';
        }`;

if (html.includes(old1on1OnTrack)) {
  html = html.replace(old1on1OnTrack, new1on1OnTrack);
  console.log('[patch-audio-clarity] Muted 1-on-1 remote video element to prevent comb-filtering');
}

// 8. Fix Group Call pc.ontrack:
// Separate audio and video tracks cleanly; prevent audioEl reset on video track arrival
const oldGroupOnTrack = `      pc.ontrack = e => {
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
      };`;

const newGroupOnTrack = `      pc.ontrack = e => {
        console.log('[GroupWebRTC] ontrack from', remoteUid, e.track.kind);
        const stream = e.streams[0] || new MediaStream([e.track]);

        if (e.track.kind === 'audio') {
          peerObj.remoteAudioStream = stream;
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
          peerObj.audioEl.play().catch(err => {
            console.warn('[GroupWebRTC] audio play note:', err);
            const resumeOnClick = () => {
              if (peerObj.audioEl) peerObj.audioEl.play().catch(() => {});
              window.removeEventListener('click', resumeOnClick);
              window.removeEventListener('touchstart', resumeOnClick);
            };
            window.addEventListener('click', resumeOnClick);
            window.addEventListener('touchstart', resumeOnClick);
          });
        } else if (e.track.kind === 'video') {
          peerObj.remoteVideoStream = stream;
          updateGroupPeerTileVideo(remoteUid, stream);
        }
      };`;

if (html.includes(oldGroupOnTrack)) {
  html = html.replace(oldGroupOnTrack, newGroupOnTrack);
  console.log('[patch-audio-clarity] Cleaned up group pc.ontrack: audio and video tracks separated');
}

// 9. Update updateGroupPeerTileVideo & renderGroupGrid to ensure all tiles are STRICTLY MUTED with video-only stream
const oldUpdateGroupVideo = `    function updateGroupPeerTileVideo(remoteUid, stream) {
      const tile = document.getElementById('groupTile_' + remoteUid);
      if (tile) {
        tile.classList.add('has-video');
        const v = tile.querySelector('video');
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      }
    }`;

const newUpdateGroupVideo = `    function updateGroupPeerTileVideo(remoteUid, stream) {
      const tile = document.getElementById('groupTile_' + remoteUid);
      if (tile) {
        tile.classList.add('has-video');
        const v = tile.querySelector('video');
        if (v) {
          v.muted = true;
          v.volume = 0;
          const vTracks = stream.getVideoTracks();
          v.srcObject = (vTracks && vTracks.length > 0) ? new MediaStream(vTracks) : stream;
          v.play().catch(() => {});
        }
      }
    }`;

if (html.includes(oldUpdateGroupVideo)) {
  html = html.replace(oldUpdateGroupVideo, newUpdateGroupVideo);
  console.log('[patch-audio-clarity] Updated updateGroupPeerTileVideo to mute and use video-only tracks');
}

// 10. Update renderGroupGrid to strictly mute tile videos
const oldGridVideoAttach = `          if (isLocal && rtcLocalStream) {
            const v = tile.querySelector('video');
            if (v) { v.srcObject = rtcLocalStream; v.play().catch(() => {}); }
          } else if (rtcGroupPeers[uid] && rtcGroupPeers[uid].remoteStream) {
            const v = tile.querySelector('video');
            if (v) { v.srcObject = rtcGroupPeers[uid].remoteStream; v.play().catch(() => {}); }
          }`;

const newGridVideoAttach = `          const v = tile.querySelector('video');
          if (v) {
            v.muted = true;
            v.volume = 0;
            if (isLocal && rtcLocalStream) {
              const vTracks = rtcLocalStream.getVideoTracks();
              if (vTracks.length > 0) { v.srcObject = new MediaStream(vTracks); v.play().catch(() => {}); }
            } else if (rtcGroupPeers[uid]) {
              const vStream = rtcGroupPeers[uid].remoteVideoStream || rtcGroupPeers[uid].remoteStream;
              if (vStream) {
                const vTracks = vStream.getVideoTracks();
                if (vTracks.length > 0) { v.srcObject = new MediaStream(vTracks); v.play().catch(() => {}); }
              }
            }
          }`;

if (html.includes(oldGridVideoAttach)) {
  html = html.replace(oldGridVideoAttach, newGridVideoAttach);
  console.log('[patch-audio-clarity] Updated renderGroupGrid to attach strictly muted video tracks to tiles');
}

// 11. Replace Web Audio API Analyser in speaking detector with Native WebRTC audioLevel polling
// This eliminates the AudioContext resampling thread and buffer underflow flutter
const oldSpeakingDetector = `    function setupSpeakingDetector(uid, stream) {
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
    }`;

const newSpeakingDetector = `    /* Native WebRTC C++ Audio Level Detection (0% Audio Thread Interference) */
    let _groupSpeakingPollingInterval = null;

    function startGroupSpeakingMonitor() {
      stopGroupSpeakingMonitor();
      _groupSpeakingPollingInterval = setInterval(() => {
        if (!rtcIsGroupCall) {
          stopGroupSpeakingMonitor();
          return;
        }

        // 1. Remote peers: query native WebRTC RTP receiver audioLevel
        for (const remoteUid in rtcGroupPeers) {
          const peer = rtcGroupPeers[remoteUid];
          if (peer && peer.pc) {
            const receivers = peer.pc.getReceivers();
            const audioReceiver = receivers.find(r => r.track && r.track.kind === 'audio');
            let isSpeaking = false;
            if (audioReceiver && typeof audioReceiver.getSynchronizationSources === 'function') {
              const sources = audioReceiver.getSynchronizationSources();
              if (sources && sources.length > 0) {
                const s = sources[0];
                const lvl = (typeof s.audioLevel === 'number') ? s.audioLevel : 0;
                isSpeaking = (lvl > 0.035);
              }
            }
            const tile = document.getElementById('groupTile_' + remoteUid);
            if (tile) tile.classList.toggle('speaking', isSpeaking);
          }
        }

        // 2. Local user: query sender audioLevel stats
        if (!rtcMuted && me) {
          let audioSender = null;
          for (const remoteUid in rtcGroupPeers) {
            const peer = rtcGroupPeers[remoteUid];
            if (peer && peer.pc) {
              audioSender = peer.pc.getSenders().find(s => s.track && s.track.kind === 'audio');
              if (audioSender) break;
            }
          }
          if (audioSender && typeof audioSender.getStats === 'function') {
            audioSender.getStats().then(stats => {
              let lvl = 0;
              stats.forEach(report => {
                if (report.type === 'media-source' && typeof report.audioLevel === 'number') {
                  lvl = report.audioLevel;
                }
              });
              const myTile = document.getElementById('groupTile_' + me.uid);
              if (myTile) myTile.classList.toggle('speaking', lvl > 0.035);
            }).catch(() => {});
          }
        } else if (me) {
          const myTile = document.getElementById('groupTile_' + me.uid);
          if (myTile) myTile.classList.remove('speaking');
        }
      }, 140);
    }

    function stopGroupSpeakingMonitor() {
      if (_groupSpeakingPollingInterval) {
        clearInterval(_groupSpeakingPollingInterval);
        _groupSpeakingPollingInterval = null;
      }
    }

    function setupSpeakingDetector(uid, stream) {
      // Legacy stub for compatibility, replaced with zero-latency native WebRTC polling
    }

    function setupLocalSpeakingDetector() {
      startGroupSpeakingMonitor();
    }`;

if (html.includes(oldSpeakingDetector)) {
  html = html.replace(oldSpeakingDetector, newSpeakingDetector);
  console.log('[patch-audio-clarity] Replaced Web Audio API analyser with native WebRTC audioLevel monitor');
}

// 12. In cleanupGroupCallState: call stopGroupSpeakingMonitor()
const oldCleanupGroupState = `function cleanupGroupCallState() {
      stopCallTones();`;
const newCleanupGroupState = `function cleanupGroupCallState() {
      stopCallTones();
      stopGroupSpeakingMonitor();`;

if (html.includes(oldCleanupGroupState)) {
  html = html.replace(oldCleanupGroupState, newCleanupGroupState);
  console.log('[patch-audio-clarity] Hooked stopGroupSpeakingMonitor in cleanupGroupCallState');
}

// 13. Validate syntax of all scripts
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
  console.error('[patch-audio-clarity] ABORTING: Found', errors, 'syntax errors!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-audio-clarity] SUCCESS! Updated public/index.html (', html.length, 'bytes)');
