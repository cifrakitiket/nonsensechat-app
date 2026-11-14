// server/patch-1on1-screen-listener.js
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

console.log('[patch-1on1-screen-listener] Loaded index.html, size:', html.length);

// 1. In acceptIncomingCall: listen for screen sharing & video visibility
const oldAcceptSessionHandler = `          const sessionRef = fdb.ref('call_sessions/' + sessionId);
          _sessionStatusHandler = sessionRef.on('value', snap => {
            const data = snap.val();
            if (data && data.status === 'ended') {
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Звонок завершён');
              setTimeout(cleanupCallState, 1200);
            }
          });`;

const newAcceptSessionHandler = `          const sessionRef = fdb.ref('call_sessions/' + sessionId);
          _sessionStatusHandler = sessionRef.on('value', snap => {
            const data = snap.val();
            if (!data) return;
            if (data.status === 'ended') {
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Звонок завершён');
              setTimeout(cleanupCallState, 1200);
              return;
            }

            // Remote screen sharing state update
            const vCont = document.getElementById('callVideoContainer');
            const aStage = document.getElementById('callAvatarStage');
            const remVid = document.getElementById('rtcRemoteVideo');
            if (data.isScreenOn && data.screenUid !== me?.uid) {
              if (vCont) vCont.style.display = 'block';
              if (aStage) aStage.style.display = 'none';
              if (remVid) remVid.style.objectFit = 'contain';
            } else if (!data.isVideo && !rtcCamActive && !rtcScreenActive) {
              if (vCont) vCont.style.display = 'none';
              if (aStage) aStage.style.display = 'flex';
              if (remVid) remVid.style.objectFit = 'cover';
            }

            // Handle renegotiation offer from caller (e.g. screen share started mid-call)
            if (data.offer && data.renegotiatedAt && rtcPC && rtcPC.signalingState === 'stable') {
              rtcPC.setRemoteDescription(new RTCSessionDescription(data.offer)).then(async () => {
                const answer = await rtcPC.createAnswer();
                if (typeof optimizeOpusSdp === 'function') answer.sdp = optimizeOpusSdp(answer.sdp);
                await rtcPC.setLocalDescription(answer);
                fdb.ref('call_sessions/' + sessionId).update({
                  answer: { type: answer.type, sdp: answer.sdp },
                  renegotiateAnswerAt: Date.now()
                }).catch(() => {});
              }).catch(e => console.warn('1-on-1 renegotiate error:', e));
            }
          });`;

if (html.includes(oldAcceptSessionHandler)) {
  html = html.replace(oldAcceptSessionHandler, newAcceptSessionHandler);
  console.log('[patch-1on1-screen-listener] Updated acceptIncomingCall listener for screen share & renegotiation');
}

// 2. In startCall listener: handle screen sharing display update and renegotiation answers
const oldStartCallAnswer = `if (data.answer && rtcPC && !rtcPC.currentRemoteDescription) {
              if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
              stopCallTones();
              rtcPC.setRemoteDescription(new RTCSessionDescription(data.answer))
                .then(() => {
                  drainQueuedCandidates();
                  setCallStatus('Соединение...');
                })
                .catch(err => console.warn('setRemoteDescription error:', err));
            }`;

const newStartCallAnswer = `if (data.answer && rtcPC && (!rtcPC.currentRemoteDescription || rtcPC.signalingState === 'have-local-offer')) {
              if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
              stopCallTones();
              rtcPC.setRemoteDescription(new RTCSessionDescription(data.answer))
                .then(() => {
                  drainQueuedCandidates();
                  setCallStatus('Соединение...');
                })
                .catch(err => console.warn('setRemoteDescription error:', err));
            }

            // Remote screen sharing state update
            const vCont = document.getElementById('callVideoContainer');
            const aStage = document.getElementById('callAvatarStage');
            const remVid = document.getElementById('rtcRemoteVideo');
            if (data.isScreenOn && data.screenUid !== me?.uid) {
              if (vCont) vCont.style.display = 'block';
              if (aStage) aStage.style.display = 'none';
              if (remVid) remVid.style.objectFit = 'contain';
            } else if (!data.isVideo && !rtcCamActive && !rtcScreenActive) {
              if (vCont) vCont.style.display = 'none';
              if (aStage) aStage.style.display = 'flex';
              if (remVid) remVid.style.objectFit = 'cover';
            }`;

if (html.includes(oldStartCallAnswer)) {
  html = html.replace(oldStartCallAnswer, newStartCallAnswer);
  console.log('[patch-1on1-screen-listener] Updated startCall listener for screen share & renegotiation');
}

// 3. Validate syntax of all scripts
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
  console.error('[patch-1on1-screen-listener] ABORTING: Found', errors, 'syntax errors!');
  process.exit(1);
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-1on1-screen-listener] SUCCESS! Updated public/index.html (', html.length, 'bytes)');
