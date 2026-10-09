// ==========================================
// CHAT & MEDIA MODULE (chat.js)
// ==========================================
import { ref, set, get, update, push, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// सुरक्षित $ हेल्पर
const $ = id => document.getElementById(id);
// डेटाबेस रेफरेंस फंक्शन (ताकि app.js से db मिलते ही काम करे)
const getDb = () => window._vc_db;

const lobbyScreen = $('lobby'), chatScreen =$('chatScreen');
const chatInput = $('chatInput'), actionBtn =$('actionBtn'), micSvg = $('micSvg'), sendSvg =$('sendSvg');

let chatUnsub = null;
let targetStatusUnsub = null;
let activePlayingAudio = null;
let activePlayingBtn = null;
let typingTimeout = null;
let isSendingMsg = false;

// वॉयस डॉक रिकॉर्डर वैरियेबल्स
let dockMediaRecorder = null, dockAudioChunks = [], dockStream = null, dockTimer = null, dockSeconds = 0;
let dockAudioContext = null, dockAnalyser = null, dockAnimFrame = null, isDockPaused = false;
const voiceDock = $('voiceDock'), dockTimerText = $('dockTimerText'), dockPauseResumeBtn =$('dockPauseResumeBtn');
const dockPauseIco = $('dockPauseIco'), dockPauseText = $('dockPauseText'), dockBlinkDot =$('dockBlinkDot');
const waveCanvas = $('waveCanvas'), waveCtx = waveCanvas ? waveCanvas.getContext('2d') : null;

// --- चैट खोलना (100% Safe) ---
window.openChat = function(tId, tName, isOnline) {
  if (!tId) return;

  window.currentChatTargetId = tId;
  window.currentChatTargetName = tName || 'User';

  if (window.unreadCounts) window.unreadCounts[tId] = 0;
  if (typeof window.renderContacts === 'function') window.renderContacts();

  const nameEl = document.getElementById('chatTargetName');
  if (nameEl) nameEl.textContent = window.currentChatTargetName;

  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  
  const currentDb = getDb();
  if (currentDb) {
    targetStatusUnsub = onValue(ref(currentDb, `users/${tId}`), (snap) => {
      const u = snap.val() || {};
      const statusEl = document.getElementById('chatTargetStatus');
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

  // Screens toggle
  const lobbyScreenEl = document.getElementById('lobby');
  const chatScreenEl = document.getElementById('chatScreen');
  if (lobbyScreenEl) lobbyScreenEl.hidden = true;
  if (chatScreenEl) chatScreenEl.hidden = false;

  const chatInputEl = document.getElementById('chatInput');
  if (chatInputEl) {
    chatInputEl.value = ''; 
    chatInputEl.style.height = '44px';
  }

  updateActionBtnState(); 
  loadChatMessages();
};

// --- चैट बंद करना ---
window.closeChat = function() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  window.discardRecording();
  if (activePlayingAudio) { activePlayingAudio.pause(); activePlayingAudio = null; }
  window.currentChatTargetId = null;
  const currentDb = getDb();
  if (currentDb && window.myUserId) {
    update(ref(currentDb, `users/${window.myUserId}`), { typingTo: null }).catch(()=>{});
  }
  if (chatScreen) chatScreen.hidden = true; 
  if (lobbyScreen) lobbyScreen.hidden = false;
};

// बटन्स को बाइंड करना
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

// --- चैट मैसेजेस लोड करना ---
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

    // वॉयस प्लेबैक कंट्रोल्स
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

// --- सेंड / माइक बटन टॉगल ---
function updateActionBtnState() {
  if (!chatInput || !micSvg || !sendSvg || !actionBtn) return;
  const hasText = chatInput.value.trim().length > 0;
  if (hasText) { 
    micSvg.style.display = 'none'; 
    sendSvg.style.display = 'block'; 
    actionBtn.classList.add('send-mode'); 
  } else { 
    micSvg.style.display = 'block'; 
    sendSvg.style.display = 'none'; 
    actionBtn.classList.remove('send-mode'); 
  }
}

if (chatInput) {
  chatInput.addEventListener('input', () => {
    chatInput.style.height = '44px';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
    updateActionBtnState();
    const currentDb = getDb();
    if (window.currentChatTargetId && currentDb && window.myUserId) {
      update(ref(currentDb, `users/${window.myUserId}`), { typingTo: window.currentChatTargetId }).catch(()=>{});
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { update(ref(currentDb, `users/${window.myUserId}`), { typingTo: null }).catch(()=>{}); }, 1800);
    }
  });
  ['keyup', 'change', 'paste', 'compositionend'].forEach(ev => chatInput.addEventListener(ev, updateActionBtnState));
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
  if (!chatInput) return;
  const txt = chatInput.value.trim();
  const currentDb = getDb();
  if (!txt || !window.currentChatTargetId || !currentDb) return;
  if (typeof window.playMessageTickSound === 'function') window.playMessageTickSound();

  const roomId = window.getChatRoomId ? window.getChatRoomId(window.myUserId, window.currentChatTargetId) : [window.myUserId, window.currentChatTargetId].sort().join('__');
  const roomPath = `chats/${roomId}/messages`;
  chatInput.value = ''; 
  chatInput.style.height = '44px';
  updateActionBtnState(); 
  chatInput.focus();
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

if (actionBtn) {
  actionBtn.addEventListener('pointerdown', (e) => { if (chatInput && chatInput.value.trim().length > 0) e.preventDefault(); });
  actionBtn.addEventListener('mousedown', (e) => { if (chatInput && chatInput.value.trim().length > 0) e.preventDefault(); });

  actionBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (isSendingMsg) return; 
    if (chatInput && chatInput.value.trim().length > 0) {
      isSendingMsg = true;
      await sendChatMessage();
      chatInput.focus();
      setTimeout(() => { isSendingMsg = false; }, 800);
    } else {
      if (chatInput) chatInput.blur();
      openVoiceDock();
    }
  });
}

if (chatInput) {
  chatInput.addEventListener('keydown', e => { 
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      if (isSendingMsg) return; 
      isSendingMsg = true;
      sendChatMessage(); 
      setTimeout(() => { isSendingMsg = false; }, 800);
    } 
  });
}

// --- वॉयस डॉक लॉजिक ---
async function openVoiceDock() {
  try {
    dockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    dockAudioChunks = []; dockMediaRecorder = new MediaRecorder(dockStream);
    dockMediaRecorder.ondataavailable = e => { if (e.data.size > 0) dockAudioChunks.push(e.data); };
    dockMediaRecorder.start(100);
    isDockPaused = false; dockSeconds = 0; 
    if (dockTimerText) dockTimerText.textContent = '0:00';
    if (dockPauseIco) dockPauseIco.textContent = '⏸'; 
    if (dockPauseText) dockPauseText.textContent = window.currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
    if (dockBlinkDot) dockBlinkDot.style.animationPlayState = 'running';
    if (voiceDock) voiceDock.hidden = false;
    setupWaveformVisualizer(dockStream);

    dockTimer = setInterval(() => {
      if (!isDockPaused) {
        dockSeconds++;
        if (dockTimerText) dockTimerText.textContent = `${Math.floor(dockSeconds / 60)}:${String(dockSeconds % 60).padStart(2,'0')}`;
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

    function drawWave() {
      dockAnimFrame = requestAnimationFrame(drawWave);
      dockAnalyser.getByteFrequencyData(dataArray);
      if (!waveCanvas || !waveCtx) return;
      waveCanvas.width = waveCanvas.offsetWidth; waveCanvas.height = waveCanvas.offsetHeight;
      waveCtx.clearRect(0, 0, waveCanvas.width, waveCanvas.height);
      const barWidth = (waveCanvas.width / bufferLength) * 1.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = isDockPaused ? 2 : (dataArray[i] / 255) * waveCanvas.height;
        waveCtx.fillStyle = '#10b981';
        waveCtx.fillRect(x, (waveCanvas.height - barHeight)/2, barWidth - 1, Math.max(barHeight, 2));
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

if (dockPauseResumeBtn) {
  dockPauseResumeBtn.onclick = () => {
    if (!dockMediaRecorder) return;
    if (!isDockPaused) {
      dockMediaRecorder.pause(); isDockPaused = true;
      if (dockPauseIco) dockPauseIco.textContent = '🎙'; 
      if (dockPauseText) dockPauseText.textContent = window.currentLang === 'hi' ? 'जारी रखें' : 'Resume';
      if (dockBlinkDot) dockBlinkDot.style.animationPlayState = 'paused';
    } else {
      dockMediaRecorder.resume(); isDockPaused = false;
      if (dockPauseIco) dockPauseIco.textContent = '⏸'; 
      if (dockPauseText) dockPauseText.textContent = window.currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
      if (dockBlinkDot) dockBlinkDot.style.animationPlayState = 'running';
    }
  };
}

window.discardRecording = function() {
  if (dockTimer) { clearInterval(dockTimer); dockTimer = null; }
  stopWaveformVisualizer();
  if (dockStream) { dockStream.getTracks().forEach(t => t.stop()); dockStream = null; }
  if (dockMediaRecorder && dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  dockAudioChunks = []; 
  if (voiceDock) voiceDock.hidden = true; 
  updateActionBtnState();
};

const trashBtn = $('dockTrashBtn');
if (trashBtn) trashBtn.onclick = window.discardRecording;

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
  if (voiceDock) voiceDock.hidden = true; 
  updateActionBtnState();
}

const sendDockBtn = $('dockSendBtn');
if (sendDockBtn) sendDockBtn.onclick = sendVoiceDock;

// --- फ़ोटो भेजना ---
const attachBtn = $('attachBtn');
if (attachBtn) attachBtn.onclick = () => $('photoFileInput').click();

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
if (typeof window.renderContacts === 'function') {
  window.renderContacts();
}
