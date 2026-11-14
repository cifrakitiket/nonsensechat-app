// server/apply-webrtc-fix.js
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// 1. Fix audio element: add autoplay and preload="auto"
html = html.replace(
  '<audio id="rtcRemoteAudio" playsinline preload="none"></audio>',
  '<audio id="rtcRemoteAudio" autoplay playsinline preload="auto"></audio>'
);

// 2. Expose window._fbDb = _fbDb
if (!html.includes('window._fbDb = _fbDb;')) {
  html = html.replace(
    `_fbDb = window.firebase.database();\n    } catch (dbErr) {`,
    `_fbDb = window.firebase.database();\n      window._fbDb = _fbDb;\n    } catch (dbErr) {`
  );
}

// 3. Relax device exact constraints to ideal in test & recording
html = html.replace(
  `audio: micId ? { deviceId: { exact: micId } } : true`,
  `audio: micId ? { deviceId: { ideal: micId } } : true`
);
html = html.replace(
  `{ deviceId: { exact: micId }, noiseSuppression: noiseSupp, echoCancellation: echoCanc }`,
  `{ deviceId: { ideal: micId }, noiseSuppression: noiseSupp, echoCancellation: echoCanc }`
);
html = html.replace(
  `deviceId: camId ? { exact: camId } : undefined,`,
  `deviceId: camId ? { ideal: camId } : undefined,`
);

// 4. Construct complete, rock-solid WebRTC engine
const newWebRtcBlock = `    // High-performance public STUN servers (verified ultra-low latency & open access in RU and worldwide)
    const RTC_DEFAULT_ICE_SERVERS = [
      { urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302'
      ]},
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.sipnet.ru:3478' },
      { urls: 'stun:stun.sipgate.net:3478' },
      { urls: 'stun:stun.voip.blackberry.com:3478' },
      { urls: 'stun:stun.solcon.nl:3478' }
    ];

    // Optional user-customizable TURN configuration (e.g. self-hosted Coturn or Metered)
    function getRtcIceServers() {
      try {
        const custom = localStorage.getItem('pref_custom_turn_config');
        if (custom) {
          const parsed = JSON.parse(custom);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return [...RTC_DEFAULT_ICE_SERVERS, ...parsed];
          }
        }
      } catch (_) {}
      return RTC_DEFAULT_ICE_SERVERS;
    }

    const RTC_CONFIG = {
      iceServers: getRtcIceServers(),
      iceCandidatePoolSize: 2
    };

    let rtcPC = null;
    let rtcLocalStream = null;
    let rtcRemoteStream = null;
    let rtcCallTimerInterval = null;
    let rtcRingingTimeout = null;
    let rtcCallSeconds = 0;
    let rtcIsVideo = false;
    let rtcCamActive = false;
    let rtcScreenActive = false;
    let rtcMuted = false;
    let rtcActiveChatId = null;
    let rtcActiveSessionId = null;
    let rtcActivePartnerUid = null;
    let rtcCurrentCallToken = null;

    let _toneCtx = null;
    let _toneInterval = null;
    let _activeCallNotif = null;
    let _titleFlashInterval = null;
    let _incomingCall = null;
    let _sessionStatusHandler = null;
    let _partnerCandsHandler = null;
    let _queuedCandidates = [];
    let _callListeners = {};
    let _userIncomingCallHandler = null;
    let _userIncomingSubUid = null;

    function getFbDb() {
      if (typeof _fbDb !== 'undefined' && _fbDb) return _fbDb;
      if (window._fbDb) return window._fbDb;
      if (typeof firebase !== 'undefined' && typeof firebase.database === 'function') return firebase.database();
      return null;
    }

    // Deterministic Canonical Session ID for direct calls between two users
    function getDmCallSessionId(uidA, uidB) {
      if (!uidA || !uidB) return null;
      const sorted = [String(uidA), String(uidB)].sort();
      return 'call_' + sorted[0] + '_' + sorted[1];
    }
    window.getDmCallSessionId = getDmCallSessionId;

    /* Sound FX (Web Audio API Synthesizer) */
    function getToneAudioCtx() {
      if (!_toneCtx || _toneCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) _toneCtx = new AudioCtx();
      }
      return _toneCtx;
    }

    function playDialTone() {
      stopCallTones();
      const ctx = getToneAudioCtx();
      if (!ctx) return;
      function beep() {
        try {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(425, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.95);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.95);
        } catch (_) {}
      }
      beep();
      _toneInterval = setInterval(beep, 3000);
    }

    function playIncomingRingTone() {
      stopCallTones();
      const ctx = getToneAudioCtx();
      if (!ctx) return;
      function ring() {
        try {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(425, ctx.currentTime);
          osc2.frequency.setValueAtTime(475, ctx.currentTime);
          gain.gain.setValueAtTime(0.09, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.2);
          osc2.stop(ctx.currentTime + 1.2);
        } catch (_) {}
      }
      ring();
      _toneInterval = setInterval(ring, 3000);
    }

    function playDisconnectSound() {
      stopCallTones();
      const ctx = getToneAudioCtx();
      if (!ctx) return;
      try {
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.28);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } catch (_) {}
    }

    function stopCallTones() {
      if (_toneInterval) {
        clearInterval(_toneInterval);
        _toneInterval = null;
      }
    }

    /* Flashing Page Title on Incoming Call */
    function startTitleFlash(callerName) {
      stopTitleFlash();
      const orig = document.title || 'Беспонтовый Чат';
      let state = false;
      _titleFlashInterval = setInterval(() => {
        document.title = state ? ('[ 📞 ' + callerName + ' звонит... ]') : orig;
        state = !state;
      }, 1000);
    }

    function stopTitleFlash() {
      if (_titleFlashInterval) {
        clearInterval(_titleFlashInterval);
        _titleFlashInterval = null;
        document.title = 'Беспонтовый Чат';
      }
    }

    /* Native Web Notification on Incoming Call */
    function showSystemCallNotification(callerNick, isVideo, callData) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          if (_activeCallNotif) { _activeCallNotif.close(); _activeCallNotif = null; }
          const title = isVideo ? ('📹 Видеозвонок от ' + callerNick) : ('📞 Входящий звонок от ' + callerNick);
          const options = {
            body: 'Нажмите, чтобы ответить на звонок в Беспонтовом Чате',
            icon: (callData && callData.callerAvatar && !callData.callerAvatar.startsWith('data:image/svg')) ? callData.callerAvatar : '/logo.png',
            badge: '/favicon-96x96.png',
            tag: 'incoming_call',
            requireInteraction: true,
            vibrate: [400, 200, 400, 200, 800]
          };
          const notif = new Notification(title, options);
          notif.onclick = () => {
            window.focus();
            notif.close();
            acceptIncomingCall();
          };
          _activeCallNotif = notif;
        } catch (e) {
          console.warn('System call notification error:', e);
        }
      }
    }

    function closeSystemCallNotification() {
      if (_activeCallNotif) {
        try { _activeCallNotif.close(); } catch (_) {}
        _activeCallNotif = null;
      }
    }

    /* Native High-Definition Audio/Video Capture */
    async function getCallMedia(video = false) {
      const micId = localStorage.getItem('pref_mic_id');
      const camId = localStorage.getItem('pref_cam_id');
      const noiseSupp = localStorage.getItem('pref_noise_supp') !== '0';
      const echoCanc = localStorage.getItem('pref_echo_canc') !== '0';
      const isClearVoice = window.NoiseSuppressor && window.NoiseSuppressor.enabled;

      const audioConstraints = {
        deviceId: micId ? { ideal: micId } : undefined,
        echoCancellation: echoCanc,
        noiseSuppression: noiseSupp || isClearVoice,
        autoGainControl: true
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
      const isClearVoice = window.NoiseSuppressor && window.NoiseSuppressor.enabled;

      try {
        await audioTrack.applyConstraints({
          deviceId: micId ? { ideal: micId } : undefined,
          echoCancellation: echoCanc,
          noiseSuppression: noiseSupp || isClearVoice,
          autoGainControl: true
        });
      } catch (e) {
        console.warn('applyConstraints warning:', e);
      }
    }
    window.applyAudioConstraintsToActiveCall = applyAudioConstraintsToActiveCall;

    /* Candidate Queuing & Robust Insertion */
    function addOrQueueCandidate(candidateData) {
      if (!rtcPC) return;
      if (rtcPC.remoteDescription && rtcPC.remoteDescription.type) {
        try {
          rtcPC.addIceCandidate(new RTCIceCandidate(candidateData)).catch(e => {
            console.warn('addIceCandidate warning:', e);
          });
        } catch (e) {
          console.warn('addIceCandidate err:', e);
        }
      } else {
        _queuedCandidates.push(candidateData);
      }
    }

    function drainQueuedCandidates() {
      if (!rtcPC || !rtcPC.remoteDescription) return;
      while (_queuedCandidates.length > 0) {
        const c = _queuedCandidates.shift();
        try {
          rtcPC.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        } catch (_) {}
      }
    }

    /* UI Helpers */
    function showCallOverlay(name, ava, isVideo) {
      const ov = document.getElementById('callOverlay');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) minBar.style.display = 'none';

      const displayName = (name && String(name).trim()) ? String(name).trim() : 'Собеседник';
      const resolvedAva = (ava && String(ava).trim() && !String(ava).endsWith('#')) ? (typeof optImg === 'function' ? optImg(ava, 200) : ava) : DEFAULT_CALL_AVA;

      const uTitle = document.getElementById('callUserTitle');
      const sName = document.getElementById('callStageName');
      const sText = document.getElementById('callStatusText');
      const timer = document.getElementById('callTimer');
      const avaImg = document.getElementById('callAvatarImg');
      if (uTitle) uTitle.textContent = displayName;
      if (sName) sName.textContent = displayName;
      if (sText) sText.textContent = 'Соединение...';
      if (timer) timer.textContent = '00:00';
      if (avaImg) {
        avaImg.alt = '';
        avaImg.src = resolvedAva;
      }

      const bg = document.getElementById('callBackdrop');
      if (bg) {
        bg.style.backgroundImage = (resolvedAva && resolvedAva !== DEFAULT_CALL_AVA) ? 'url("' + resolvedAva + '")' : '';
      }

      const vCont = document.getElementById('callVideoContainer');
      const aStage = document.getElementById('callAvatarStage');
      if (isVideo) {
        if (vCont) vCont.style.display = 'block';
        if (aStage) aStage.style.display = 'none';
      } else {
        if (vCont) vCont.style.display = 'none';
        if (aStage) aStage.style.display = 'flex';
      }

      const btnCam = document.getElementById('callBtnCam');
      if (btnCam) btnCam.classList.toggle('active', isVideo);
      const btnMic = document.getElementById('callBtnMic');
      if (btnMic) {
        btnMic.classList.remove('active');
        btnMic.innerHTML = '<i class="fa-solid fa-microphone"></i>';
      }

      if (ov) ov.classList.add('open');
    }

    function setCallStatus(text) {
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
    window.maximizeCall = maximizeCall;

    function toggleCallBar() {
      const ov = document.getElementById('callOverlay');
      if (ov && ov.classList.contains('open')) minimizeCall();
      else maximizeCall();
    }
    window.toggleCallBar = toggleCallBar;

    /* START CALL */
    async function startCall(type = 'voice', joinExisting = false, customChatId = null, partnerOverride = null) {
      const fdb = getFbDb();
      if (!me) return;
      const chatId = customChatId || activeId;
      if (!chatId) return;

      // Multi-layer partner resolution
      let partnerUid = partnerOverride?.uid || null;
      let partnerName = partnerOverride?.nick || null;
      let partnerAva = partnerOverride?.ava || partnerOverride?.avatar || null;

      if (!partnerUid && activeChat && Array.isArray(activeChat.members)) {
        partnerUid = activeChat.members.find(m => m !== me.uid);
      }
      if (!partnerUid && chatId && chatId.includes('_')) {
        partnerUid = chatId.split('_').find(u => u !== me.uid);
      }
      if (!partnerUid && window._chatPeerUser && window._chatPeerUser.uid !== me.uid) {
        partnerUid = window._chatPeerUser.uid;
      }
      if (!partnerUid && typeof allChats !== 'undefined' && Array.isArray(allChats)) {
        const foundC = allChats.find(c => c.id === chatId);
        if (foundC && Array.isArray(foundC.members)) {
          partnerUid = foundC.members.find(m => m !== me.uid);
        }
      }

      // Canonical session room id: for DMs it's always derived deterministically
      const sessionId = partnerUid ? getDmCallSessionId(me.uid, partnerUid) : ('call_' + chatId);

      // ANTI-GLARE / AUTO-ANSWER: If partner is ALREADY calling in this room, answer immediately!
      if (fdb) {
        try {
          const snap = await fdb.ref('call_sessions/' + sessionId).once('value');
          const sess = snap.val();
          if (sess && sess.status === 'ringing' && sess.callerUid !== me.uid) {
            const age = Date.now() - (sess.createdAt || 0);
            if (age < 45000) {
              console.log('[startCall] Active incoming call detected in room, auto-accepting!');
              acceptIncomingCall({ chatId: chatId, sessionId: sessionId, data: sess });
              return;
            }
          }
        } catch (_) {}
      }

      cleanupCallState();

      rtcActiveChatId = chatId;
      rtcActiveSessionId = sessionId;
      rtcActivePartnerUid = partnerUid;
      rtcIsVideo = (type === 'video');
      rtcCamActive = rtcIsVideo;
      rtcMuted = false;
      _queuedCandidates = [];
      rtcCurrentCallToken = Date.now();

      const cachedPartner = partnerUid ? (
        (typeof uCache !== 'undefined' && uCache[partnerUid]) ||
        (window.uCache && window.uCache[partnerUid]) ||
        (window._chatPeerUser && window._chatPeerUser.uid === partnerUid ? window._chatPeerUser : null)
      ) : (window._chatPeerUser || null);

      if (!partnerName) {
        const headerNameEl = document.getElementById('chName');
        const headerName = headerNameEl ? headerNameEl.innerText.split('\\n')[0].trim() : '';
        partnerName = cachedPartner?.nick ||
          (partnerUid && activeChat ? activeChat[partnerUid + '_nick'] : null) ||
          activeChat?.name ||
          (headerName && headerName !== 'Чат' ? headerName : null) ||
          (customChatId ? 'Звонок по ссылке' : 'Собеседник');
      }

      if (!partnerAva) {
        const headerAvaEl = document.getElementById('chAva');
        const headerAva = (headerAvaEl && headerAvaEl.src && !headerAvaEl.src.endsWith('#') && !headerAvaEl.src.endsWith('/')) ? headerAvaEl.src : '';
        partnerAva = cachedPartner?.avatar ||
          cachedPartner?.ava ||
          (partnerUid && activeChat ? activeChat[partnerUid + '_ava'] : null) ||
          activeChat?.avatar ||
          headerAva ||
          '';
      }

      showCallOverlay(partnerName, partnerAva, rtcIsVideo);
      setCallStatus('Вызов...');
      playDialTone();

      // Async upgrade partner info if was uncached
      if (partnerUid && (!cachedPartner || !cachedPartner.nick)) {
        if (typeof getUser === 'function') {
          getUser(partnerUid).then(u => {
            if (u && rtcActiveSessionId === sessionId) {
              if (u.nick) {
                const uTitle = document.getElementById('callUserTitle');
                const sName = document.getElementById('callStageName');
                if (uTitle) uTitle.textContent = u.nick;
                if (sName) sName.textContent = u.nick;
              }
              if (u.avatar && !u.avatar.startsWith('data:image/svg')) {
                const avaImg = document.getElementById('callAvatarImg');
                if (avaImg) avaImg.src = optImg ? optImg(u.avatar, 200) : u.avatar;
              }
            }
          }).catch(() => {});
        }
      }

      try {
        rtcLocalStream = await getCallMedia(rtcIsVideo);
        const locVid = document.getElementById('rtcLocalVideo');
        if (locVid && rtcIsVideo) {
          locVid.srcObject = rtcLocalStream;
          locVid.play().catch(() => {});
        }

        rtcPC = new RTCPeerConnection(RTC_CONFIG);
        setupRtcPeer(rtcPC, sessionId, true, partnerUid, rtcCurrentCallToken);

        rtcLocalStream.getTracks().forEach(t => rtcPC.addTrack(t, rtcLocalStream));

        const offer = await rtcPC.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await rtcPC.setLocalDescription(offer);

        if (fdb) {
          const myNick = me.nick || 'Пользователь';
          const myAva = (me.avatar && !me.avatar.startsWith('data:')) ? me.avatar : ((me.ava && !me.ava.startsWith('data:')) ? me.ava : '');

          // Clear this user's previous candidates for fresh session
          await fdb.ref('call_sessions/' + sessionId + '/candidates/' + me.uid).remove().catch(() => {});

          // Set call session data
          await fdb.ref('call_sessions/' + sessionId).set({
            status: 'ringing',
            token: rtcCurrentCallToken,
            type: type,
            isVideo: rtcIsVideo,
            callerUid: me.uid,
            callerNick: myNick,
            callerAvatar: myAva,
            targetUid: partnerUid || null,
            chatId: chatId,
            sessionId: sessionId,
            offer: { type: offer.type, sdp: offer.sdp },
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });

          // Notify partner directly in their personal incoming mailbox
          if (partnerUid && partnerUid !== me.uid) {
            fdb.ref('user_incoming_calls/' + partnerUid).set({
              sessionId: sessionId,
              chatId: chatId,
              token: rtcCurrentCallToken,
              callerUid: me.uid,
              callerNick: myNick,
              callerAvatar: myAva,
              type: type,
              isVideo: rtcIsVideo,
              offer: { type: offer.type, sdp: offer.sdp },
              createdAt: firebase.database.ServerValue.TIMESTAMP
            }).catch(() => {});
          }

          // 35s Ringing timeout
          if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
          rtcRingingTimeout = setTimeout(() => {
            if (rtcPC && !rtcCallTimerInterval) {
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Не отвечает');
              setTimeout(cleanupCallState, 2200);
              if (fdb) {
                fdb.ref('call_sessions/' + sessionId).update({ status: 'ended', reason: 'no-answer' }).catch(() => {});
                if (partnerUid) fdb.ref('user_incoming_calls/' + partnerUid).remove().catch(() => {});
              }
            }
          }, 35000);

          // Listen for callee's answer and status changes
          const sessionRef = fdb.ref('call_sessions/' + sessionId);
          _sessionStatusHandler = sessionRef.on('value', snap => {
            const data = snap.val();
            if (!data) return;

            if (data.status === 'declined') {
              if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Звонок отклонён');
              setTimeout(cleanupCallState, 1500);
              return;
            }
            if (data.status === 'ended') {
              if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Звонок завершён');
              setTimeout(cleanupCallState, 1200);
              return;
            }

            if (data.answer && rtcPC && !rtcPC.currentRemoteDescription) {
              if (rtcRingingTimeout) clearTimeout(rtcRingingTimeout);
              stopCallTones();
              rtcPC.setRemoteDescription(new RTCSessionDescription(data.answer))
                .then(() => {
                  drainQueuedCandidates();
                  setCallStatus('Соединение...');
                })
                .catch(err => console.warn('setRemoteDescription error:', err));
            }
          });

          // Listen for partner ICE candidates (keyed by partner UID)
          if (partnerUid) {
            const candsRef = fdb.ref('call_sessions/' + sessionId + '/candidates/' + partnerUid);
            _partnerCandsHandler = candsRef.on('child_added', snap => {
              const c = snap.val();
              if (c && c.candidate) addOrQueueCandidate(c.candidate);
            });
          }
        }
      } catch (err) {
        console.error('startCall initialization error:', err);
        stopCallTones();
        playDisconnectSound();
        setCallStatus('Ошибка доступа к микрофону/камере');
        setTimeout(cleanupCallState, 2500);
      }
    }
    window.startCall = startCall;

    /* ACCEPT INCOMING CALL */
    async function acceptIncomingCall(customCallData = null) {
      const fdb = getFbDb();
      const ic = customCallData || _incomingCall;
      if (!ic) return;
      _incomingCall = null;
      hideIncomingCallPopup();
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();

      if (fdb && me) {
        fdb.ref('user_incoming_calls/' + me.uid).remove().catch(() => {});
      }

      cleanupCallState();

      const callData = ic.data || ic;
      const callerUid = callData.callerUid || null;
      const chatId = ic.chatId || callData.chatId || activeId;
      const sessionId = ic.sessionId || callData.sessionId || (callerUid ? getDmCallSessionId(me.uid, callerUid) : ('call_' + chatId));

      rtcActiveChatId = chatId;
      rtcActiveSessionId = sessionId;
      rtcActivePartnerUid = callerUid;
      rtcIsVideo = (callData.type === 'video' || !!callData.isVideo);
      rtcCamActive = rtcIsVideo;
      rtcMuted = false;
      _queuedCandidates = [];
      rtcCurrentCallToken = callData.token || Date.now();

      const partnerName = callData.callerNick || 'Собеседник';
      const partnerAva = callData.callerAvatar || '';

      showCallOverlay(partnerName, partnerAva, rtcIsVideo);
      setCallStatus('Соединение...');

      try {
        rtcLocalStream = await getCallMedia(rtcIsVideo);
        const locVid = document.getElementById('rtcLocalVideo');
        if (locVid && rtcIsVideo) {
          locVid.srcObject = rtcLocalStream;
          locVid.play().catch(() => {});
        }

        rtcPC = new RTCPeerConnection(RTC_CONFIG);
        setupRtcPeer(rtcPC, sessionId, false, callerUid, rtcCurrentCallToken);

        rtcLocalStream.getTracks().forEach(t => rtcPC.addTrack(t, rtcLocalStream));

        // Retrieve offer: either from callData or directly from RTDB
        let offer = callData.offer;
        if (!offer || !offer.sdp) {
          if (fdb) {
            const snap = await fdb.ref('call_sessions/' + sessionId).once('value');
            const sess = snap.val();
            if (sess && sess.offer) offer = sess.offer;
          }
        }
        if (!offer || !offer.sdp) throw new Error('No offer SDP in call session');

        await rtcPC.setRemoteDescription(new RTCSessionDescription(offer));
        drainQueuedCandidates();

        const answer = await rtcPC.createAnswer();
        await rtcPC.setLocalDescription(answer);

        if (fdb) {
          // Clear this user's previous candidates
          await fdb.ref('call_sessions/' + sessionId + '/candidates/' + me.uid).remove().catch(() => {});

          await fdb.ref('call_sessions/' + sessionId).update({
            answer: { type: answer.type, sdp: answer.sdp },
            status: 'connected',
            calleeUid: me.uid,
            token: rtcCurrentCallToken,
            connectedAt: firebase.database.ServerValue.TIMESTAMP
          });

          // Listen for caller ICE candidates (keyed by caller UID)
          if (callerUid) {
            const candsRef = fdb.ref('call_sessions/' + sessionId + '/candidates/' + callerUid);
            _partnerCandsHandler = candsRef.on('child_added', snap => {
              const c = snap.val();
              if (c && c.candidate) addOrQueueCandidate(c.candidate);
            });
          }

          // Listen for call termination
          const sessionRef = fdb.ref('call_sessions/' + sessionId);
          _sessionStatusHandler = sessionRef.on('value', snap => {
            const data = snap.val();
            if (data && data.status === 'ended') {
              stopCallTones();
              playDisconnectSound();
              setCallStatus('Звонок завершён');
              setTimeout(cleanupCallState, 1200);
            }
          });
        }
      } catch (err) {
        console.error('acceptIncomingCall error:', err);
        stopCallTones();
        playDisconnectSound();
        setCallStatus('Ошибка подключения');
        setTimeout(cleanupCallState, 2200);
      }
    }
    window.acceptIncomingCall = acceptIncomingCall;

    /* DECLINE INCOMING CALL */
    async function declineIncomingCall() {
      const fdb = getFbDb();
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();
      hideIncomingCallPopup();

      const ic = _incomingCall;
      _incomingCall = null;

      if (fdb && me) {
        fdb.ref('user_incoming_calls/' + me.uid).remove().catch(() => {});
      }

      if (ic && fdb) {
        const callData = ic.data || ic;
        const sessionId = ic.sessionId || callData.sessionId;
        if (sessionId) {
          fdb.ref('call_sessions/' + sessionId).update({
            status: 'declined',
            endedAt: firebase.database.ServerValue.TIMESTAMP
          }).catch(() => {});
        }
      }
    }
    window.declineIncomingCall = declineIncomingCall;

    /* WebRTC Peer Connection Event Handlers */
    function setupRtcPeer(pc, sessionId, isCaller, partnerUid, callToken) {
      const fdb = getFbDb();

      pc.onicecandidate = e => {
        if (e.candidate && fdb && me) {
          fdb.ref('call_sessions/' + sessionId + '/candidates/' + me.uid).push({
            candidate: e.candidate.toJSON(),
            token: callToken,
            at: Date.now()
          }).catch(() => {});
        }
      };

      pc.ontrack = e => {
        console.log('[WebRTC] ontrack received:', e.track.kind);
        const stream = e.streams[0] || new MediaStream([e.track]);
        rtcRemoteStream = stream;

        const audioEl = document.getElementById('rtcRemoteAudio');
        if (audioEl) {
          audioEl.srcObject = stream;
          audioEl.autoplay = true;
          audioEl.play().catch(err => {
            console.warn('[WebRTC] audio play blocked by browser policy:', err);
            const resumeOnInteract = () => {
              audioEl.play().catch(() => {});
              window.removeEventListener('click', resumeOnInteract);
              window.removeEventListener('touchstart', resumeOnInteract);
            };
            window.addEventListener('click', resumeOnInteract);
            window.addEventListener('touchstart', resumeOnInteract);
          });
        }

        if (e.track.kind === 'video') {
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
        }

        // NOTE: Timer and "Звонок идёт" status are triggered on connectionState/iceConnectionState 'connected'
      };

      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          stopCallTones();
          startCallTimer();
          setCallStatus('Звонок идёт');
          const audioEl = document.getElementById('rtcRemoteAudio');
          if (audioEl && audioEl.paused) audioEl.play().catch(() => {});
        } else if (pc.connectionState === 'connecting') {
          setCallStatus('Соединение...');
        } else if (pc.connectionState === 'disconnected') {
          setCallStatus('Связь прервана...');
        } else if (pc.connectionState === 'failed') {
          setCallStatus('Ошибка связи');
          stopCallTones();
          playDisconnectSound();
          setTimeout(cleanupCallState, 2500);
        } else if (pc.connectionState === 'closed') {
          cleanupCallState();
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          stopCallTones();
          startCallTimer();
          setCallStatus('Звонок идёт');
          const audioEl = document.getElementById('rtcRemoteAudio');
          if (audioEl && audioEl.paused) audioEl.play().catch(() => {});
        } else if (pc.iceConnectionState === 'failed') {
          console.warn('[WebRTC] ICE failed, attempting ICE restart');
          if (pc.restartIce) {
            try { pc.restartIce(); } catch (_) {}
          }
        }
      };
    }

    /* END CALL */
    async function endCall() {
      const fdb = getFbDb();
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();
      playDisconnectSound();

      if (rtcActiveSessionId && fdb) {
        try {
          await fdb.ref('call_sessions/' + rtcActiveSessionId).update({
            status: 'ended',
            endedAt: firebase.database.ServerValue.TIMESTAMP,
            duration: rtcCallSeconds
          });
        } catch (_) {}
      }
      if (me && fdb) {
        fdb.ref('user_incoming_calls/' + me.uid).remove().catch(() => {});
      }
      if (rtcActivePartnerUid && fdb) {
        fdb.ref('user_incoming_calls/' + rtcActivePartnerUid).remove().catch(() => {});
      }
      cleanupCallState();
    }
    window.endCall = endCall;

    function cleanupCallState() {
      const fdb = getFbDb();
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();

      if (rtcCallTimerInterval) { clearInterval(rtcCallTimerInterval); rtcCallTimerInterval = null; }
      if (rtcRingingTimeout) { clearTimeout(rtcRingingTimeout); rtcRingingTimeout = null; }

      if (fdb && rtcActiveSessionId) {
        if (_sessionStatusHandler) {
          fdb.ref('call_sessions/' + rtcActiveSessionId).off('value', _sessionStatusHandler);
          _sessionStatusHandler = null;
        }
        if (_partnerCandsHandler && rtcActivePartnerUid) {
          fdb.ref('call_sessions/' + rtcActiveSessionId + '/candidates/' + rtcActivePartnerUid).off('child_added', _partnerCandsHandler);
          _partnerCandsHandler = null;
        }
      }

      if (rtcLocalStream) {
        rtcLocalStream.getTracks().forEach(t => t.stop());
        rtcLocalStream = null;
      }
      if (rtcRemoteStream) {
        rtcRemoteStream.getTracks().forEach(t => t.stop());
        rtcRemoteStream = null;
      }
      if (rtcPC) {
        try { rtcPC.close(); } catch (_) {}
        rtcPC = null;
      }

      const ov = document.getElementById('callOverlay');
      if (ov) ov.classList.remove('open');
      const minBar = document.getElementById('minimizedCallBar');
      if (minBar) minBar.style.display = 'none';

      const locVid = document.getElementById('rtcLocalVideo');
      if (locVid) locVid.srcObject = null;
      const remVid = document.getElementById('rtcRemoteVideo');
      if (remVid) remVid.srcObject = null;
      const remAud = document.getElementById('rtcRemoteAudio');
      if (remAud) remAud.srcObject = null;

      rtcActiveChatId = null;
      rtcActiveSessionId = null;
      rtcActivePartnerUid = null;
      rtcCurrentCallToken = null;
      rtcMuted = false;
      rtcCamActive = false;
      rtcScreenActive = false;
      _queuedCandidates = [];
    }

    /* CONTROLS: MIC, CAM, SCREEN SHARE */
    function toggleCallMic() {
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
    }
    window.toggleCallMic = toggleCallMic;

    async function toggleCallCam() {
      if (!rtcPC) return;
      rtcCamActive = !rtcCamActive;

      const btn = document.getElementById('callBtnCam');
      if (btn) btn.classList.toggle('active', rtcCamActive);

      const vCont = document.getElementById('callVideoContainer');
      const aStage = document.getElementById('callAvatarStage');
      if (vCont) vCont.style.display = rtcCamActive ? 'block' : 'none';
      if (aStage) aStage.style.display = rtcCamActive ? 'none' : 'flex';

      try {
        if (rtcCamActive) {
          const camId = localStorage.getItem('pref_cam_id');
          const videoStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: camId ? { ideal: camId } : undefined }
          });
          const newVideoTrack = videoStream.getVideoTracks()[0];
          const sender = rtcPC.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            rtcPC.addTrack(newVideoTrack, rtcLocalStream);
          }
          const locVid = document.getElementById('rtcLocalVideo');
          if (locVid) {
            locVid.srcObject = videoStream;
            locVid.play().catch(() => {});
          }
        } else {
          const sender = rtcPC.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) {
            sender.track.stop();
            rtcPC.removeTrack(sender);
          }
          const locVid = document.getElementById('rtcLocalVideo');
          if (locVid) locVid.srcObject = null;
        }
      } catch (e) {
        console.warn('toggleCallCam error:', e);
      }
    }
    window.toggleCallCam = toggleCallCam;

    async function toggleCallScreenShare() {
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
    window.toggleCallScreenShare = toggleCallScreenShare;

    /* INCOMING CALL MONITORING ACROSS CHATS & DIRECT USER MAILBOX */
    function subscribeIncomingCalls(targetUid) {
      const fdb = getFbDb();
      const myId = targetUid || (typeof me !== 'undefined' && me?.uid) || (typeof _fbAuth !== 'undefined' && _fbAuth?.currentUser?.uid);
      if (!fdb || !myId) return;

      // 1. Direct incoming call listener for this user (Instant Push to personal mailbox)
      if (_userIncomingSubUid !== myId || !_userIncomingCallHandler) {
        if (_userIncomingCallHandler && _userIncomingSubUid) {
          try { fdb.ref('user_incoming_calls/' + _userIncomingSubUid).off('value', _userIncomingCallHandler); } catch (_) {}
        }
        _userIncomingSubUid = myId;
        const userCallRef = fdb.ref('user_incoming_calls/' + myId);
        _userIncomingCallHandler = userCallRef.on('value', snap => {
          const data = snap.val();
          if (!data) {
            hideIncomingCallPopup();
            return;
          }

          const now = Date.now();
          const created = data.createdAt || now;
          // Expire calls older than 60 seconds
          if (Math.abs(now - created) > 60000) {
            userCallRef.remove().catch(() => {});
            hideIncomingCallPopup();
            return;
          }

          // Don't interrupt if we are already in an active connected call
          if (rtcPC && rtcCallTimerInterval) {
            return;
          }

          // Anti-Glare: if we were actively calling the SAME partner right now:
          if (rtcPC && !rtcCallTimerInterval && (data.sessionId === rtcActiveSessionId || data.callerUid === rtcActivePartnerUid)) {
            // Lower UID politely yields and accepts the partner's offer
            if (myId < data.callerUid) {
              console.log('[WebRTC Anti-Glare] Lower UID yields, accepting partner call');
              acceptIncomingCall(data);
              return;
            } else {
              console.log('[WebRTC Anti-Glare] Higher UID maintains call, waiting for partner answer');
              return;
            }
          }

          showIncomingCall(data.chatId || data.sessionId, data);
        });
      }

      // 2. Chat session room listeners (for active call badges in chat list)
      if (typeof allChats !== 'undefined' && Array.isArray(allChats)) {
        allChats.forEach(chat => {
          if (chat && chat.type !== 'channel' && !_callListeners[chat.id]) {
            _callListeners[chat.id] = initCallSessionListener(chat.id);
          }
        });
      }
    }
    window.subscribeIncomingCalls = subscribeIncomingCalls;
    window._callListenersRefresh = subscribeIncomingCalls;

    function initCallSessionListener(chatId) {
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
    }

    function showIncomingCall(chatId, data) {
      _incomingCall = { chatId, sessionId: data.sessionId || chatId, data };
      const pop = document.getElementById('incomingCallPopup');
      if (!pop) return;

      const callerNick = data.callerNick || 'Собеседник';
      const isVideo = (data.type === 'video' || data.isVideo);

      const nameEl = document.getElementById('icCallerName');
      const typeEl = document.getElementById('icCallType');
      if (nameEl) nameEl.textContent = callerNick;
      if (typeEl) typeEl.textContent = isVideo ? 'Входящий видеозвонок...' : 'Входящий аудиозвонок...';

      const ava = document.getElementById('icAva');
      if (ava) {
        ava.alt = '';
        const rawAva = data.callerAvatar;
        ava.src = (rawAva && rawAva.trim() && !rawAva.startsWith('data:image/svg'))
          ? (typeof optImg === 'function' ? optImg(rawAva, 120) : rawAva)
          : DEFAULT_CALL_AVA;
      }

      // Unlock audio pipeline on popup display
      getToneAudioCtx();

      pop.classList.add('open');
      playIncomingRingTone();
      startTitleFlash(callerNick);
      showSystemCallNotification(callerNick, isVideo, data);

      if (navigator.vibrate) {
        try { navigator.vibrate([400, 200, 400, 200, 800]); } catch (_) {}
      }
    }

    function hideIncomingCallPopup() {
      stopCallTones();
      stopTitleFlash();
      closeSystemCallNotification();
      const pop = document.getElementById('incomingCallPopup');
      if (pop) pop.classList.remove('open');
    }

    // Auto-subscribe immediately if me is already defined or auth is ready
    if (window._pendingCallSubUid) {
      subscribeIncomingCalls(window._pendingCallSubUid);
      window._pendingCallSubUid = null;
    } else if (typeof me !== 'undefined' && me && me.uid) {
      subscribeIncomingCalls(me.uid);
    } else if (typeof _fbAuth !== 'undefined' && _fbAuth.currentUser) {
      subscribeIncomingCalls(_fbAuth.currentUser.uid);
    }`;

// Replace between the start of RTC_CONFIG and the EMOJI picker
const startMarker = '// Public STUNs + Metered OpenRelay Free TURN Servers (UDP, TCP, TLS)';
const pickerIndex = html.indexOf('EMOJI & TELEGRAM PICKER ENGINE');

const startIndex = html.indexOf(startMarker);
if (startIndex === -1) {
  console.error('ERROR: Could not find startMarker in index.html');
  process.exit(1);
}
if (pickerIndex === -1) {
  console.error('ERROR: Could not find EMOJI picker in index.html');
  process.exit(1);
}
const endIndex = html.lastIndexOf('/*', pickerIndex);

html = html.substring(0, startIndex) + newWebRtcBlock + '\n\n    ' + html.substring(endIndex);

fs.writeFileSync(indexPath, html, 'utf8');
console.log('Successfully updated WebRTC engine in public/index.html');
