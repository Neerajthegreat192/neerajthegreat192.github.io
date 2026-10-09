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

// 1. चैट खोलना (Immediate Global Assignment)
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

  // स्क्रीन स्विचिंग
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

// 2. चैट बंद करना
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

// 3. चैट संदेश लोड करना
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

  if (window.latestChatSnippets) {
    window.latestChatSnippets[window.currentChatTargetId] = { text: txt, time: Date.now(), senderId: window.myUserId, read: false, delivered: targetOnline };
    localStorage.setItem('cached_snippets', JSON.stringify(window.latestChatSnippets));
  }
  if (typeof window.renderContacts === 'function') window.renderContacts();

  await set(newMsgRef, {
    senderId: window.myUserId, senderName: window.myUserName, text: txt, time: Date.now(), delivered: targetOnline, read: false
  });
}

window.discardRecording = function() {
  if (dockTimer) { clearInterval(dockTimer); dockTimer = null; }
  if (dockStream) { dockStream.getTracks().forEach(t => t.stop()); dockStream = null; }
  if (dockMediaRecorder && dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  dockAudioChunks = []; 
  const vDock = $('voiceDock');
  if (vDock) vDock.hidden = true; 
  updateActionBtnState();
};

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
    aBtn.onclick = async e => {
      e.preventDefault();
      if (isSendingMsg) return;
      if (cInput && cInput.value.trim().length > 0) {
        isSendingMsg = true;
        await sendChatMessage();
        cInput.focus();
        setTimeout(() => { isSendingMsg = false; }, 800);
      }
    };
  }

  // जब सब तैयार हो तो कार्ड्स रिफ्रेश करें
  if (typeof window.renderContacts === 'function') {
    window.renderContacts();
  }
}

initChatEvents();
