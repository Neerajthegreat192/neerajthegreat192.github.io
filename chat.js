// ==========================================
// CHAT & MEDIA MODULE (chat.js)
// ==========================================
import { ref, set, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const $ = id => document.getElementById(id);
const getDb = () => window._vc_db;

let chatUnsub = null;
let targetStatusUnsub = null;
let activePlayingAudio = null;
let activePlayingBtn = null;
let typingTimeout = null;
let isSendingMsg = false;

let dockMediaRecorder = null, dockAudioChunks = [], dockStream = null, dockTimer = null, dockSeconds = 0;
let dockAudioContext = null, dockAnalyser = null, dockAnimFrame = null, isDockPaused = false;

// --- चैट खोलना (Screen Toggle Guaranteed) ---
window.openChat = function(tId, tName, isOnline) {
  if (!tId) return;

  window.currentChatTargetId = tId;
  window.currentChatTargetName = tName || 'User';

  if (window.unreadCounts) window.unreadCounts[tId] = 0;
  if (typeof window.renderContacts === 'function') window.renderContacts();

  const nameEl = $('chatTargetName');
  if (nameEl) nameEl.textContent = window.currentChatTargetName;

  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  
  const currentDb = getDb();
  if (currentDb) {
    targetStatusUnsub = onValue(ref(currentDb, `users/${tId}`), (snap) => {
      const u = snap.val() || {};
      const statusEl = $('chatTargetStatus');
      if (!statusEl) return;
      const isTyping = u.typingTo === window.myUserId;
      const online = !!u.online;
      if (isTyping) { 
        statusEl.textContent = (window.translations && window.translations[window.currentLang]) ? window.translations[window.currentLang].typing : 'लिख रहे हैं...'; 
        statusEl.style.color = 'var(--success)'; 
      } else if (online) { 
        statusEl.textContent = (window.translations && window.translations[window.currentLang]) ? window.translations[window.currentLang].online : 'ऑनलाइन'; 
        statusEl.style.color = 'var(--success)'; 
      } else { 
        statusEl.textContent = window.formatLastSeen ? window.formatLastSeen(u.lastSeen) : 'ऑफलाइन'; 
        statusEl.style.color = '#94a3b8'; 
      }
    });
  }

  // स्क्रीन स्विच
  const lScreen = $('lobby');
  const cScreen = $('chatScreen');
  if (lScreen) {
    lScreen.hidden = true;
    lScreen.style.setProperty('display', 'none', 'important');
  }
  if (cScreen) {
    cScreen.hidden = false;
    cScreen.style.setProperty('display', 'flex', 'important');
  }

  const cInput = $('chatInput');
  if (cInput) {
    cInput.value = ''; 
    cInput.style.height = '44px';
  }

  updateActionBtnState(); 
  loadChatMessages();
};

window.closeChat = function() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  if (typeof window.discardRecording === 'function') window.discardRecording();
  if (activePlayingAudio) { activePlayingAudio.pause(); activePlayingAudio = null; }
  
  window.currentChatTargetId = null;
  const currentDb = getDb();
  if (currentDb && window.myUserId) {
    update(ref(currentDb, `users/${window.myUserId}`), { typingTo: null }).catch(()=>{});
  }

  const lScreen = $('lobby');
  const cScreen = $('chatScreen');
  if (cScreen) {
    cScreen.hidden = true;
    cScreen.style.setProperty('display', 'none', 'important');
  }
  if (lScreen) {
    lScreen.hidden = false;
    lScreen.style.setProperty('display', 'flex', 'important');
  }
};

function loadChatMessages() {
  const body = $('chatBody'); 
  if (!body) return;
  body.innerHTML = '';
  if (chatUnsub) chatUnsub();
  const currentDb = getDb();
  if (!currentDb || !window.myUserId || !window.currentChatTargetId) return;

  const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, window.currentChatTargetId) : [window.myUserId, window.currentChatTargetId].sort().join('__');
  const roomPath = `chats/${roomId}/messages`;

  chatUnsub = onValue(ref(currentDb, roomPath), snap => {
    body.innerHTML = '';
    const msgs = snap.val() || {};
    const sortedKeys = Object.keys(msgs).sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));

    sortedKeys.forEach(msgId => {
      const m = msgs[msgId];
      if (m.senderId !== window.myUserId && !m.read) {
        update(ref(currentDb, `${roomPath}/${msgId}`), { read: true, delivered: true, readAt: Date.now() }).catch(()=>{});
      }

      const b = document.createElement('div');
      if (m.type === 'system-call') {
        b.className = 'chat-bubble system-call';
        b.textContent = `${m.text} • ${window.formatClockTime ? window.formatClockTime(m.time) : ''}`;
        body.appendChild(b); 
        return;
      }

      b.className = `chat-bubble ${m.senderId === window.myUserId ? 'me' : 'them'}`;
      let tick = '';
      if (m.senderId === window.myUserId) {
        if (m.read) tick = '<span class="tick-mark tick-read">✓✓</span>';
        else if (m.delivered) tick = '<span class="tick-mark tick-delivered">✓✓</span>';
        else tick = '<span class="tick-mark tick-sent">✓</span>';
      }

      let contentHtml = '';
      if (m.type === 'image') {
        contentHtml = `<img src="${m.data}" class="chat-img-thumb" onclick="window.open('${m.data}')">`;
      } else if (m.type === 'audio') {
        contentHtml = `
          <div class="voice-note-bubble" id="vn_${msgId}">
            <button class="voice-play-circle" data-url="${m.data}" data-dur="${m.durationSec || 5}">▶</button>
            <div class="voice-meta-area">
              <div class="voice-progress-bg" data-dur="${m.durationSec || 5}"><div class="voice-progress-bar"></div></div>
              <div class="voice-meta-row"><span class="voice-time-label">${m.duration || '0:05'}</span><button class="voice-spd-btn">1x</button></div>
            </div>
          </div>
        `;
      } else {
        contentHtml = `<div>${window.safeName ? window.safeName(m.text) : m.text}</div>`;
      }

      b.innerHTML = `${contentHtml}<div class="chat-meta"><span>${(m.time && window.formatClockTime) ? window.formatClockTime(m.time) : ''}</span>${tick}</div>`;
      body.appendChild(b);
    });

    body.querySelectorAll('.voice-play-circle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const url = btn.dataset.url, totalDurSec = Number(btn.dataset.dur) || 5;
        const bubble = btn.closest('.voice-note-bubble');
        const pBar = bubble.querySelector('.voice-progress-bar'), tLabel = bubble.querySelector('.voice-time-label');

        if (activePlayingAudio && activePlayingAudio.src === url) {
          if (!activePlayingAudio.paused) { activePlayingAudio.pause(); btn.textContent = '▶'; }
          else { activePlayingAudio.play(); btn.textContent = '⏸'; }
          return;
        }
        if (activePlayingAudio) { activePlayingAudio.pause(); if (activePlayingBtn) activePlayingBtn.textContent = '▶'; }

        const audio = new Audio(url);
        activePlayingAudio = audio; activePlayingBtn = btn; btn.textContent = '⏸';
        audio.ontimeupdate = () => {
          const curTime = audio.currentTime;
          pBar.style.width = Math.min((curTime / totalDurSec) * 100, 100) + '%';
          tLabel.textContent = `${Math.floor(curTime / 60)}:${String(Math.floor(curTime % 60)).padStart(2,'0')}`;
        };
        audio.onended = () => {
          btn.textContent = '▶'; pBar.style.width = '0%';
          tLabel.textContent = `${Math.floor(totalDurSec / 60)}:${String(Math.floor(totalDurSec % 60)).padStart(2,'0')}`;
          activePlayingAudio = null; activePlayingBtn = null;
        };
        audio.play().catch(()=>{ btn.textContent = '▶'; });
      };
    });

    body.querySelectorAll('.voice-progress-bg').forEach(bg => {
      bg.onclick = (e) => {
        e.stopPropagation();
        if (activePlayingAudio) {
          const rect = bg.getBoundingClientRect();
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          activePlayingAudio.currentTime = pct * (Number(bg.dataset.dur) || 5);
        }
      };
    });

    body.querySelectorAll('.voice-spd-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (activePlayingAudio) {
          let spd = activePlayingAudio.playbackRate;
          spd = spd === 1 ? 1.5 : (spd === 1.5 ? 2 : 1);
          activePlayingAudio.playbackRate = spd; btn.textContent = spd + 'x';
        }
      };
    });
    body.scrollTop = body.scrollHeight;
  });
}

function updateActionBtnState() {
  const cInput = $('chatInput'), mSvg =$('micSvg'), sSvg = $('sendSvg'), aBtn =$('actionBtn');
  if (!cInput || !mSvg || !sSvg || !aBtn) return;
  const hasText = cInput.value.trim().length > 0;
  if (hasText) { 
    mSvg.style.display = 'none'; 
    sSvg.style.display = 'block'; 
    aBtn.classList.add('send-mode'); 
  } else { 
    mSvg.style.display = 'block'; 
    sSvg.style.display = 'none'; 
    aBtn.classList.remove('send-mode'); 
  }
}

async function sendChatMessagePush(targetId, textContent, roomId, msgId) {
  try {
    const currentDb = getDb();
    if (!currentDb) return;
    const tSnap = await get(ref(currentDb, `users/${targetId}`));
    const token = tSnap.val()?.fcmToken;
    if (!token) return;

    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title: window.myUserName,
        body: textContent,
        callerName: window.myUserName,
        callId: "CHAT_" + window.myUserId
      })
    }).catch(()=>{});
  } catch(e) {}
}

async function sendChatMessage() {
  const cInput = $('chatInput');
  if (!cInput) return;
  const txt = cInput.value.trim();
  const currentDb = getDb();
  if (!txt || !window.currentChatTargetId || !currentDb) return;
  if (typeof window.playMessageTickSound === 'function') window.playMessageTickSound();

  const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, window.currentChatTargetId) : [window.myUserId, window.currentChatTargetId].sort().join('__');
  const roomPath = `chats/${roomId}/messages`;
  cInput.value = ''; 
  cInput.style.height = '44px';
  updateActionBtnState(); 
  cInput.focus();
  update(ref(currentDb, `users/${window.myUserId}`), { typingTo: null }).catch(()=>{});

  const targetOnline = !!(window.allOnlineUsers && window.allOnlineUsers[window.currentChatTargetId]?.online);
  const newMsgRef = push(ref(currentDb, roomPath));
  const newMsgId = newMsgRef.key;

  if (window.latestChatSnippets) {
    window.latestChatSnippets[window.currentChatTargetId] = { text: txt, time: Date.now(), senderId: window.myUserId, read: false, delivered: targetOnline };
    localStorage.setItem('cached_snippets', JSON.stringify(window.latestChatSnippets));
  }
  if (typeof window.renderContacts === 'function') window.renderContacts();

  await set(newMsgRef, {
    senderId: window.myUserId, senderName: window.myUserName, text: txt, time: Date.now(), delivered: targetOnline, read: false
  });
  sendChatMessagePush(window.currentChatTargetId, txt, roomId, newMsgId);
}

window.recordCallLog = async function(entry) {
  const currentDb = getDb();
  if (!currentDb || !window.myUserId) return;
  try {
    const logId = entry.callId || `call_${Date.now()}`;
    const myLogEntry = {
      callId: logId, targetId: entry.targetId, name: entry.name || 'उपयोगकर्ता',
      type: entry.type, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
    };
    
    await set(ref(currentDb, `call_logs/${window.myUserId}/${logId}`), myLogEntry);

    if (entry.targetId && entry.targetId !== window.myUserId) {
      const remoteType = entry.type === 'outgoing' ? 'incoming' : (entry.type === 'incoming' ? 'outgoing' : 'missed');
      const remoteLogEntry = {
        callId: logId, targetId: window.myUserId, name: window.myUserName,
        type: remoteType, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
      };
      await set(ref(currentDb, `call_logs/${entry.targetId}/${logId}`), remoteLogEntry).catch(()=>{});
    }

    if (entry.targetId) {
      const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, entry.targetId) : [window.myUserId, entry.targetId].sort().join('__');
      const roomPath = `chats/${roomId}/messages`;
      const isVoice = entry.callMode === 'audio';
      const label = isVoice ? (window.currentLang === 'hi' ? 'ऑडियो कॉल' : 'Audio Call') : (window.currentLang === 'hi' ? 'वीडियो कॉल' : 'Video Call');
      let callText = entry.type === 'missed' 
        ? `${isVoice ? '📞' : '📹'} ${window.currentLang === 'hi' ? 'मिस्ड' : 'Missed'} ${label}` 
        : `${isVoice ? '📞' : '📹'} ${label} (${entry.duration || '00:01'})`;

      await push(ref(currentDb, roomPath), {
        senderId: window.myUserId, senderName: window.myUserName, type: 'system-call',
        text: callText, time: Date.now(), delivered: true, read: false
      }).catch(()=>{});
    }
  } catch(e) {}
};

async function openVoiceDock() {
  try {
    dockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    dockAudioChunks = []; dockMediaRecorder = new MediaRecorder(dockStream);
    dockMediaRecorder.ondataavailable = e => { if (e.data.size > 0) dockAudioChunks.push(e.data); };
    dockMediaRecorder.start(100);
    isDockPaused = false; dockSeconds = 0; 
    
    const dTimer = $('dockTimerText'), dPauseIco = $('dockPauseIco'), dPauseTxt =$('dockPauseText'), dBlink = $('dockBlinkDot'), vDock =$('voiceDock');
    if (dTimer) dTimer.textContent = '0:00';
    if (dPauseIco) dPauseIco.textContent = '⏸'; 
    if (dPauseTxt) dPauseTxt.textContent = window.currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
    if (dBlink) dBlink.style.animationPlayState = 'running';
    if (vDock) vDock.hidden = false;
    setupWaveformVisualizer(dockStream);

    dockTimer = setInterval(() => {
      if (!isDockPaused) {
        dockSeconds++;
        const timerEl = $('dockTimerText');
        if (timerEl) timerEl.textContent = `${Math.floor(dockSeconds / 60)}:${String(dockSeconds % 60).padStart(2,'0')}`;
        if (dockSeconds >= 120) sendVoiceDock();
      }
    }, 1000);
  } catch(e) { if (window.toast) window.toast('माइक की अनुमति नहीं मिल सकी'); }
}

function setupWaveformVisualizer(stream) {
  try {
    dockAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = dockAudioContext.createMediaStreamSource(stream);
    dockAnalyser = dockAudioContext.createAnalyser(); dockAnalyser.fftSize = 64;
    source.connect(dockAnalyser);
    const bufferLength = dockAnalyser.frequencyBinCount, dataArray = new Uint8Array(bufferLength);
    const wCanvas = $('waveCanvas');
    const wCtx = wCanvas ? wCanvas.getContext('2d') : null;

    function drawWave() {
      dockAnimFrame = requestAnimationFrame(drawWave);
      dockAnalyser.getByteFrequencyData(dataArray);
      if (!wCanvas || !wCtx) return;
      wCanvas.width = wCanvas.offsetWidth; wCanvas.height = wCanvas.offsetHeight;
      wCtx.clearRect(0, 0, wCanvas.width, wCanvas.height);
      const barWidth = (wCanvas.width / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = isDockPaused ? 2 : (dataArray[i] / 255) * wCanvas.height;
        wCtx.fillStyle = '#10b981';
        wCtx.fillRect(x, (wCanvas.height - barHeight)/2, barWidth - 1, Math.max(barHeight, 2));
        x += barWidth;
      }
    }
    drawWave();
  } catch(e) {}
}

function stopWaveformVisualizer() {
  if (dockAnimFrame) { cancelAnimationFrame(dockAnimFrame); dockAnimFrame = null; }
  if (dockAudioContext) { dockAudioContext.close().catch(()=>{}); dockAudioContext = null; }
}

window.discardRecording = function() {
  if (dockTimer) { clearInterval(dockTimer); dockTimer = null; }
  stopWaveformVisualizer();
  if (dockStream) { dockStream.getTracks().forEach(t => t.stop()); dockStream = null; }
  if (dockMediaRecorder && dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  dockAudioChunks = []; 
  const vDock = $('voiceDock');
  if (vDock) vDock.hidden = true; 
  updateActionBtnState();
};

function sendVoiceDock() {
  if (!dockMediaRecorder) return;
  const durSec = Math.max(dockSeconds, 1);
  clearInterval(dockTimer); dockTimer = null;
  stopWaveformVisualizer();

  dockMediaRecorder.onstop = async () => {
    if (dockStream) dockStream.getTracks().forEach(t => t.stop());
    const currentDb = getDb();
    if (dockAudioChunks.length > 0 && window.currentChatTargetId && currentDb) {
      if (typeof window.playMessageTickSound === 'function') window.playMessageTickSound();
      const audioBlob = new Blob(dockAudioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, window.currentChatTargetId) : [window.myUserId, window.currentChatTargetId].sort().join('__');
        const roomPath = `chats/${roomId}/messages`;
        const durStr = `${Math.floor(durSec/60)}:${String(durSec%60).padStart(2,'0')}`;
        const targetOnline = !!(window.allOnlineUsers && window.allOnlineUsers[window.currentChatTargetId]?.online);
        const newMsgRef = push(ref(currentDb, roomPath));
        const newMsgId = newMsgRef.key;

        if (window.latestChatSnippets) {
          window.latestChatSnippets[window.currentChatTargetId] = {
            text: '🎙 ' + (window.currentLang==='hi'?'वॉयस नोट':'Voice Note'), time: Date.now(), senderId: window.myUserId, read: false, delivered: targetOnline
          };
          localStorage.setItem('cached_snippets', JSON.stringify(window.latestChatSnippets));
        }
        if (typeof window.renderContacts === 'function') window.renderContacts();

        await set(newMsgRef, {
          senderId: window.myUserId, senderName: window.myUserName, type: 'audio', data: base64Audio,
          duration: durStr, durationSec: durSec, time: Date.now(), delivered: targetOnline, read: false
        });
        sendChatMessagePush(window.currentChatTargetId, '🎙 Voice Note', roomId, newMsgId);
      };
      reader.readAsDataURL(audioBlob);
    }
    dockAudioChunks = [];
  };
  if (dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  const vDock = $('voiceDock');
  if (vDock) vDock.hidden = true; 
  updateActionBtnState();
}

function initChatEvents() {
  const backBtn = $('chatBackBtn');
  if (backBtn) backBtn.onclick = window.closeChat;

  const chatCallBtn = $('chatCallBtn');
  if (chatCallBtn) {
    chatCallBtn.onclick = () => { 
      if (window.currentChatTargetId && typeof window.startCall === 'function') {
        window.startCall(window.currentChatTargetId, window.currentChatTargetName, false); 
      } 
    };
  }

  const chatVoiceCallBtn = $('chatVoiceCallBtn');
  if (chatVoiceCallBtn) {
    chatVoiceCallBtn.onclick = () => { 
      if (window.currentChatTargetId && typeof window.startCall === 'function') {
        window.startCall(window.currentChatTargetId, window.currentChatTargetName, true); 
      }
    };
  }

  const cInput = $('chatInput');
  if (cInput) {
    cInput.oninput = () => {
      cInput.style.height = '44px';
      cInput.style.height = Math.min(cInput.scrollHeight, 100) + 'px';
      updateActionBtnState();
      const currentDb = getDb();
      if (window.currentChatTargetId && currentDb && window.myUserId) {
        update(ref(currentDb, `users/${window.myUserId}`), { typingTo: window.currentChatTargetId }).catch(()=>{});
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => { update(ref(currentDb, `users/${window.myUserId}`), { typingTo: null }).catch(()=>{}); }, 1800);
      }
    };
    ['keyup', 'change', 'paste', 'compositionend'].forEach(ev => cInput.addEventListener(ev, updateActionBtnState));
    cInput.onkeydown = e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isSendingMsg) return;
        isSendingMsg = true;
        sendChatMessage();
        setTimeout(() => { isSendingMsg = false; }, 800);
      }
    };
  }

  const aBtn = $('actionBtn');
  if (aBtn) {
    aBtn.onpointerdown = e => { if (cInput && cInput.value.trim().length > 0) e.preventDefault(); };
    aBtn.onmousedown = e => { if (cInput && cInput.value.trim().length > 0) e.preventDefault(); };
    aBtn.onclick = async e => {
      e.preventDefault();
      if (isSendingMsg) return;
      if (cInput && cInput.value.trim().length > 0) {
        isSendingMsg = true;
        await sendChatMessage();
        cInput.focus();
        setTimeout(() => { isSendingMsg = false; }, 800);
      } else {
        if (cInput) cInput.blur();
        openVoiceDock();
      }
    };
  }

  const pauseBtn = $('dockPauseResumeBtn');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      if (!dockMediaRecorder) return;
      const dIco = $('dockPauseIco'), dTxt = $('dockPauseText'), dDot =$('dockBlinkDot');
      if (!isDockPaused) {
        dockMediaRecorder.pause(); isDockPaused = true;
        if (dIco) dIco.textContent = '🎙'; 
        if (dTxt) dTxt.textContent = window.currentLang === 'hi' ? 'जारी रखें' : 'Resume';
        if (dDot) dDot.style.animationPlayState = 'paused';
      } else {
        dockMediaRecorder.resume(); isDockPaused = false;
        if (dIco) dIco.textContent = '⏸'; 
        if (dTxt) dTxt.textContent = window.currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
        if (dDot) dDot.style.animationPlayState = 'running';
      }
    };
  }

  const trashBtn = $('dockTrashBtn');
  if (trashBtn) trashBtn.onclick = window.discardRecording;

  const sendBtn = $('dockSendBtn');
  if (sendBtn) sendBtn.onclick = sendVoiceDock;

  const attBtn = $('attachBtn');
  if (attBtn) attBtn.onclick = () => { const p = $('photoFileInput'); if (p) p.click(); };

  const photoInput = $('photoFileInput');
  if (photoInput) {
    photoInput.onchange = e => {
      const file = e.target.files[0];
      const currentDb = getDb();
      if (!file || !window.currentChatTargetId || !currentDb) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const img = new Image();
        img.onload = async () => {
          if (typeof window.playMessageTickSound === 'function') window.playMessageTickSound();
          const canvas = document.createElement('canvas');
          const maxDim = 900;
          let w = img.width, h = img.height;
          if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
          else if (h > maxDim) { w = Math.round(h * (maxDim / h)); w = maxDim; }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const compressedData = canvas.toDataURL('image/jpeg', 0.65);
          const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, window.currentChatTargetId) : [window.myUserId, window.currentChatTargetId].sort().join('__');
          const roomPath = `chats/${roomId}/messages`;
          const targetOnline = !!(window.allOnlineUsers && window.allOnlineUsers[window.currentChatTargetId]?.online);
          const newMsgRef = push(ref(currentDb, roomPath));
          const newMsgId = newMsgRef.key;

          if (window.latestChatSnippets) {
            window.latestChatSnippets[window.currentChatTargetId] = {
              text: '📷 ' + (window.currentLang==='hi'?'फ़ोटो':'Photo'), time: Date.now(), senderId: window.myUserId, read: false, delivered: targetOnline
            };
            localStorage.setItem('cached_snippets', JSON.stringify(window.latestChatSnippets));
          }
          if (typeof window.renderContacts === 'function') window.renderContacts();

          await set(newMsgRef, {
            senderId: window.myUserId, senderName: window.myUserName, type: 'image', data: compressedData,
            time: Date.now(), delivered: targetOnline, read: false
          });
          if (window.toast) window.toast(window.currentLang==='hi'?'फ़ोटो भेज दी गई':'Photo sent');
          sendChatMessagePush(window.currentChatTargetId, '📷 Photo', roomId, newMsgId);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file); 
      e.target.value = '';
    };
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatEvents);
} else {
  initChatEvents();
}
