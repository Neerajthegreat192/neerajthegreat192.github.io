// ==========================================
// CORE APP MODULE (app.js) - Presence, WebRTC & Lobby
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, onChildAdded, push, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const CURRENT_APP_VERSION = "1.20.0";
const GITHUB_APK_URL = "https://github.com/Neerajthegreat192/neerajthegreat192.github.io/releases/latest/download/app-release.apk";

const Capacitor = window.Capacitor || null;
const PushNotifications = window.Capacitor?.Plugins?.PushNotifications || null;
const App = window.Capacitor?.Plugins?.App || null;
const isNative = !!(Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());

const firebaseConfig = {
  apiKey: "AIzaSyBg1VC0cd1FmGiXTkMvFFG-eSL46FmgtZU",
  authDomain: "chess-e4910.firebaseapp.com",
  databaseURL: "https://chess-e4910-default-rtdb.firebaseio.com",
  projectId: "chess-e4910",
  storageBucket: "chess-e4910.firebasestorage.app",
  messagingSenderId: "62635884266",
  appId: "1:62635884266:web:0375748951994b26cb2193"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ग्लोबल डेटाबेस इंस्टेंस ताकि अन्य मॉड्यूल्स इसका उपयोग कर सकें
window._vc_db = db;

const VAPID_KEY = "BP5A9KX5MNPnhmwSm_lqNcO9I52Nhwprf7uknXmAiXOZmoO2jDk2dTNUhUtZ7XTv9qxM2Osz7g5KAxsO6afD7Ro";
const ADMIN_SECRET_PIN = "1990";

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ],
  iceCandidatePoolSize: 10
};

const $ = id => document.getElementById(id);

// --- 1. LANGUAGE & TRANSLATIONS ---
window.currentLang = localStorage.getItem('vc_lang') || 'hi';
window.translations = {
  hi: {
    pageTitle: "VideoCallApp", welcome: "स्वागत है!", enterName: "कॉलिंग एवं चैट शुरू करने के लिए अपना नाम लिखें",
    btnProceed: "आगे बढ़ें", chkUpdate: "🔄 अपडेट चेक करें", settingsTitle: "⚙️ सेटिंग्स एवं प्रोफ़ाइल",
    btnChangeName: "✏️ नाम बदलें / अपडेट करें", btnRecheckPerm: "🛡️ अनुमतियाँ पुनः जांचें", btnClearChat: "🗑️ सभी चैट साफ़ करें",
    btnResetProfile: "आईडी हटाएं / रीसेट करें", btnCancel: "✕ रद्द करें", searchPlaceholder: "संपर्क या चैट खोजें...",
    tabChats: "💬 चैट", tabCalls: "📞 कॉल", inputPlaceholder: "संदेश लिखें...", incomingSub: "बात करने के लिए कॉल उठाएँ",
    reject: "काटें", accept: "उठाएँ", cancelCall: "रद्द करें", mic: "माइक", cam: "कैमरा", speaker: "स्पीकर", flip: "पलटें",
    audioMode: "ऑडियो मोड", add: "जोड़ें", hang: "काटें", online: "ऑनलाइन", offline: "ऑफलाइन", typing: "लिख रहे हैं...",
    netOnline: "नेटवर्क: हाई", netMedium: "नेटवर्क: मीडियम"
  },
  en: {
    pageTitle: "VideoCallApp", welcome: "Welcome!", enterName: "Enter your name to start calling and chatting",
    btnProceed: "Continue", chkUpdate: "🔄 Check New Update (OTA)", settingsTitle: "⚙️ Settings & Profile",
    btnChangeName: "✏️ Change / Update Name", btnRecheckPerm: "🛡️ Recheck Permissions", btnClearChat: "🗑️ Clear All Chats",
    btnResetProfile: "Delete / Reset ID", btnCancel: "✕ Cancel", searchPlaceholder: "Search contacts or chats...",
    tabChats: "💬 Chats", tabCalls: "📞 Calls", inputPlaceholder: "Type a message...", incomingSub: "Tap to answer the call",
    reject: "Decline", accept: "Answer", cancelCall: "Cancel", mic: "Mic", cam: "Camera", speaker: "Speaker", flip: "Flip",
    audioMode: "Audio Mode", add: "Add", hang: "End", online: "Online", offline: "Offline", typing: "typing...",
    netOnline: "Network: High", netMedium: "Network: Medium"
  }
};

function applyLanguage(lang) {
  window.currentLang = lang;
  localStorage.setItem('vc_lang', lang);
  if ($('langSelect')) $('langSelect').value = lang;
  const t = window.translations[lang];
  if ($('pageTitle')) $('pageTitle').textContent = t.pageTitle;
  if ($('txtWelcome')) $('txtWelcome').textContent = t.welcome;
  if ($('txtEnterName')) $('txtEnterName').textContent = t.enterName;
  if ($('saveNameBtn')) $('saveNameBtn').textContent = t.btnProceed;
  if ($('checkUpdateBtn')) $('checkUpdateBtn').textContent = t.chkUpdate;
  if ($('txtSettingsTitle')) $('txtSettingsTitle').textContent = t.settingsTitle;
  if ($('toggleEditNameBtn')) $('toggleEditNameBtn').textContent = t.btnChangeName;
  if ($('recheckPermsBtn')) $('recheckPermsBtn').textContent = t.btnRecheckPerm;
  if ($('clearChatHistoryBtn')) $('clearChatHistoryBtn').textContent = t.btnClearChat;
  if ($('resetProfileBtn')) $('resetProfileBtn').textContent = t.btnResetProfile;
  if ($('closeProfileBtn')) $('closeProfileBtn').textContent = t.btnCancel;
  if ($('searchInput')) $('searchInput').placeholder = t.searchPlaceholder;
  if ($('tabChatsBtn')) $('tabChatsBtn').textContent = t.tabChats;
  if ($('tabCallsBtn')) $('tabCallsBtn').textContent = t.tabCalls;
  if ($('chatInput')) $('chatInput').placeholder = t.inputPlaceholder;
  if ($('incomingSubText')) $('incomingSubText').textContent = t.incomingSub;
  if ($('txtReject')) $('txtReject').textContent = t.reject;
  if ($('txtAccept')) $('txtAccept').textContent = t.accept;
  if ($('txtCancelCall')) $('txtCancelCall').textContent = t.cancelCall;
  if ($('lblMic')) $('lblMic').textContent = t.mic;
  if ($('lblCam')) $('lblCam').textContent = t.cam;
  if ($('lblSpeaker')) $('lblSpeaker').textContent = t.speaker;
  if ($('lblFlip')) $('lblFlip').textContent = t.flip;
  if ($('lblAudioMode')) $('lblAudioMode').textContent = t.audioMode;
  if ($('lblAdd')) $('lblAdd').textContent = t.add;
  if ($('lblHang')) $('lblHang').textContent = t.hang;
  if (typeof window.renderContacts === 'function') window.renderContacts();
}

// --- 2. GLOBAL VARIABLES ---
window.myUserId = localStorage.getItem('vc_user_id') || '';
window.myUserName = localStorage.getItem('vc_user_name') || '';
let myFcmToken = localStorage.getItem('vc_fcm_token') || null;

window.allOnlineUsers = {};
window.latestChatSnippets = {};
window.unreadCounts = {};
let allCallLogs = [];

try {
  window.allOnlineUsers = JSON.parse(localStorage.getItem('cached_users') || '{}');
  window.latestChatSnippets = JSON.parse(localStorage.getItem('cached_snippets') || '{}');
  window.unreadCounts = JSON.parse(localStorage.getItem('cached_unreads') || '{}');
  allCallLogs = JSON.parse(localStorage.getItem('cached_call_logs') || '[]');
} catch(e) {}

let localStream = null;
window.activeCallId = null;
window.currentChatTargetId = null;
window.currentChatTargetName = null;

let isCaller = false, callStartTime = 0, timerTimer = null, facingMode = 'user';
let micEnabled = true, camEnabled = true, speakerEnabled = true, isCallConnected = false;
let isAudioOnlyCall = false;
let autoHideTimer = null, peerConnections = {}, unsubs = [];
let callSessionUnsub = null, callTimeoutTimer = null, selfStatusUnsub = null;
const MAX_CALL_MEMBERS = 4;
let qualityLevel = 'high', qualityTimer = null, wakeLock = null, vibrationInterval = null;
let isHangingUp = false;

const ringtoneAudio = new Audio('ringtone.mp3');
ringtoneAudio.loop = true;
let audioCtx = null, outgoingRingTimer = null, incomingRingRetryTimer = null;

// --- 3. HELPER FUNCTIONS ---
function ensureAudioContext() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  } catch(e) { return null; }
}

window.playMessageTickSound = function() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.04);
  } catch(e) {}
};

function playMessageBeep() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(880, ctx.currentTime); osc.type = 'sine';
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.18);
  } catch(e) {}
}

function playBeepTone() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.frequency.setValueAtTime(440, ctx.currentTime); osc.type = 'sine';
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime + 1.0);
    gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
  } catch(e) {}
}

function startOutgoingCallTone() {
  stopIncomingRingtone(); stopOutgoingCallTone();
  playBeepTone(); outgoingRingTimer = setInterval(playBeepTone, 3000);
}
function stopOutgoingCallTone() { if (outgoingRingTimer) { clearInterval(outgoingRingTimer); outgoingRingTimer = null; } }

async function startIncomingRingtone() {
  stopOutgoingCallTone(); startVibration();
  if (isNative) return;
  try {
    ensureAudioContext(); ringtoneAudio.currentTime = 0; await ringtoneAudio.play();
    if (incomingRingRetryTimer) { clearInterval(incomingRingRetryTimer); incomingRingRetryTimer = null; }
  } catch(e) {
    playBeepTone();
    if (!incomingRingRetryTimer) {
      incomingRingRetryTimer = setInterval(() => {
        const incDlg = $('incomingDialog');
        if (incDlg && incDlg.hidden) { stopIncomingRingtone(); return; }
        ringtoneAudio.play().then(() => { clearInterval(incomingRingRetryTimer); incomingRingRetryTimer = null; }).catch(() => playBeepTone());
      }, 1200);
    }
  }
}

function stopIncomingRingtone() {
  stopVibration(); ringtoneAudio.pause(); ringtoneAudio.currentTime = 0;
  if (incomingRingRetryTimer) { clearInterval(incomingRingRetryTimer); incomingRingRetryTimer = null; }
}
function stopAllCallTones() { stopOutgoingCallTone(); stopIncomingRingtone(); }
document.addEventListener('pointerdown', () => { ensureAudioContext(); }, {passive:true});

function startVibration() {
  if ('vibrate' in navigator) {
    navigator.vibrate([500, 300, 500, 300, 800]);
    if (!vibrationInterval) {
      vibrationInterval = setInterval(() => {
        const incDlg = $('incomingDialog');
        if (incDlg && incDlg.hidden) { stopVibration(); return; }
        navigator.vibrate([500, 300, 500, 300, 800]);
      }, 2500);
    }
  }
}
function stopVibration() { if ('vibrate' in navigator) navigator.vibrate(0); if (vibrationInterval) { clearInterval(vibrationInterval); vibrationInterval = null; } }

window.toast = function(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
};

window.safeName = function(n) { return String(n||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); };
function isNeerajBadola(n) { const s = (n||'').toLowerCase().replace(/\s+/g,' ').trim(); return (s.includes('neeraj')&&s.includes('badola'))||(s.includes('नीरज')&&s.includes('बडोला')); }

window.formatClockTime = function(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true });
};
window.formatLastSeen = function(ts) {
  if (!ts) return '';
  return `Last seen ${window.formatClockTime(ts)}`;
};

window.getChatRoomId = (a, b) => [a, b].sort().join('__');

function clearOngoingCallNotification() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.getNotifications().then(notifications => {
        notifications.forEach(n => {
          if (n.tag && n.tag.includes('incoming-call')) n.close();
        });
      });
    }).catch(()=>{});
  }
}

// --- 4. MEDIA PERMISSIONS & FCM TOKEN (ROOT SCOPE FIX) ---
async function acquireCallMedia(audioOnly = false) {
  const localVid = $('localVideo');
  if (localStream) {
    if (!audioOnly && localStream.getVideoTracks().length === 0) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }
        });
        localStream.addTrack(vStream.getVideoTracks()[0]);
      } catch(e) {}
    }
    if (localVid) localVid.srcObject = localStream;
    return localStream;
  }
  try {
    const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } };
    if (!audioOnly) {
      constraints.video = { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } };
    } else {
      constraints.video = false;
    }
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    if (localVid) localVid.srcObject = localStream;
    return localStream;
  } catch(e) {
    window.toast(window.currentLang === 'hi' ? 'कैमरा/माइक अनुमति उपलब्ध नहीं है' : 'Camera/Mic permission unavailable');
    return null;
  }
}

async function checkMediaPermissions(showNotice = false) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(t => t.stop());
    if (showNotice) window.toast(window.currentLang === 'hi' ? '✅ कैमरा एवं माइक तैयार हैं' : '✅ Camera & Mic are ready');
    return true;
  } catch(e) {
    if (showNotice) window.toast(window.currentLang === 'hi' ? '⚠️ सेटिंग्स में जाकर कैमरा और माइक की अनुमति दें' : '⚠️ Grant camera/mic permissions in settings');
    return false;
  }
}

async function requestNotificationPermission() {
  if (isNative && PushNotifications) {
    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
      if (perm.receive === 'granted') await PushNotifications.register();
    } catch(e) {}
    return;
  }

  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      console.warn("Notification permission denied by user.");
      return;
    }

    // *FIX: Root Path Registration for FCM*
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY, 
      serviceWorkerRegistration: swReg 
    });

    if (token) {
      console.log("FCM Token Generated:", token);
      myFcmToken = token;
      localStorage.setItem('vc_fcm_token', token);
      if (window.myUserId) await update(ref(db, `users/${window.myUserId}`), { fcmToken: token });
    }
  } catch(err) {
    console.error("FCM Token Generation Failed:", err);
  }
}

async function triggerAutoPermissionGate() {
  const permGranted = localStorage.getItem('perms_requested');
  if (permGranted) return;

  const hasMedia = await checkMediaPermissions(false);
  let hasNotif = false;
  if ('Notification' in window) hasNotif = Notification.permission === 'granted';

  if (!hasMedia || !hasNotif) {
    if ($('permNoticeModal')) $('permNoticeModal').hidden = false;
  }
}

// --- 5. PRESENCE & USER DATA (HEADER FIX) ---
function updateHeaderTitle() {
  const hName = $('myHeaderName');
  if (hName) hName.textContent = window.myUserName || (window.currentLang === 'hi' ? 'एचडी कॉलिंग' : 'HD Calling');
  const admBtn = $('adminBtn');
  if (admBtn) admBtn.style.display = isNeerajBadola(window.myUserName) ? 'block' : 'none';
}

function checkUser() {
  if (!window.myUserId || !window.myUserName) {
    if ($('nameModal')) $('nameModal').hidden = false;
  } else {
    updateHeaderTitle();
    if ($('nameModal')) $('nameModal').hidden = true;
    initPresence();
  }
}

async function initPresence() {
  updateHeaderTitle();
  const userRef = ref(db, `users/${window.myUserId}`);
  const inboxRef = ref(db, `user_inbox/${window.myUserId}`);
  const connectedRef = ref(db, '.info/connected');

  await onDisconnect(userRef).update({
    online: false, lastSeen: serverTimestamp(), onlineSince: null,
    activeCallId: null, isBusy: false, typingTo: null
  }).catch(()=>{});
  await onDisconnect(inboxRef).remove().catch(()=>{});

  await update(userRef, {
    id: window.myUserId, name: window.myUserName, online: true,
    onlineSince: serverTimestamp(), lastSeen: serverTimestamp(), activeCallId: null
  });
  if (myFcmToken) await update(userRef, { fcmToken: myFcmToken });

  if (!isNative && 'Notification' in window && Notification.permission === 'granted') {
    requestNotificationPermission().catch(()=>{});
  }

  onValue(connectedRef, async snap => {
    const banner = $('networkBanner');
    if (snap.val() === true) {
      if (banner) banner.hidden = true;
      await update(userRef, { online: true, onlineSince: serverTimestamp() }).catch(()=>{});
    } else {
      if (banner) banner.hidden = false;
    }
  });

  onValue(ref(db, 'users'), snap => {
    window.allOnlineUsers = snap.val() || {};
    try { localStorage.setItem('cached_users', JSON.stringify(window.allOnlineUsers)); } catch(e) {}
    if (typeof window.renderContacts === 'function') window.renderContacts();
  });

  listenSelfAccountStatus();
  listenForIncoming();
  listenForCallLogs();
  listenForLatestChatPreviews();
}

function listenSelfAccountStatus() {
  if (selfStatusUnsub) selfStatusUnsub();
  selfStatusUnsub = onValue(ref(db, `users/${window.myUserId}`), (snap) => {
    if (!snap.exists() && window.myUserId) {
      if (selfStatusUnsub) { selfStatusUnsub(); selfStatusUnsub = null; }
      hangup(true); localStorage.clear();
      window.myUserId = ''; window.myUserName = '';
      if ($('myHeaderName')) $('myHeaderName').textContent = '...';
      if ($('chatScreen')) { $('chatScreen').hidden = true; $('chatScreen').style.setProperty('display', 'none', 'important'); }
      if ($('call')) $('call').hidden = true;
      if ($('lobby')) { $('lobby').hidden = false; $('lobby').style.setProperty('display', 'flex', 'important'); }
      if ($('nameInput')) $('nameInput').value = '';
      if ($('nameModal')) $('nameModal').hidden = false;
      window.toast(window.currentLang === 'hi' ? '⚠️ आपकी आईडी रीसेट हो गई है।' : '⚠️ Your ID was reset.');
    }
  });
}

// --- 6. RENDER CONTACTS & CALL LOGS ---
window.renderContacts = function() {
  const contactsList = $('contactsList');
  if (!contactsList) return;
  contactsList.innerHTML = '';
  const amIAdmin = isNeerajBadola(window.myUserName);
  const searchInp = $('searchInput');
  const q = searchInp ? searchInp.value.trim().toLowerCase() : '';

  let userIds = Object.keys(window.allOnlineUsers).filter(id => {
    const u = window.allOnlineUsers[id];
    const match = !q || (u && u.name && u.name.toLowerCase().includes(q));
    return u && u.name && id !== window.myUserId && u.name !== 'User' && (!u.hidden || amIAdmin) && match;
  });

  if (!userIds.length) {
    contactsList.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px">${window.currentLang==='hi'?'कोई संपर्क उपलब्ध नहीं है':'No contacts available'}</div>`;
    return;
  }
  userIds.sort((a, b) => {
    const timeA = window.latestChatSnippets[a]?.time || window.allOnlineUsers[a]?.lastSeen || 0;
    const timeB = window.latestChatSnippets[b]?.time || window.allOnlineUsers[b]?.lastSeen || 0;
    return timeB - timeA;
  });

  userIds.forEach(id => {
    const u = window.allOnlineUsers[id], isOnline = !!u.online;
    const isTyping = u.typingTo === window.myUserId;
    const unread = window.unreadCounts[id] || 0;
    const snippet = window.latestChatSnippets[id];
    const card = document.createElement('div');
    card.className = 'contact-card';

    const statusText = isTyping ? window.translations[window.currentLang].typing : (isOnline ? window.translations[window.currentLang].online : window.formatLastSeen(u.lastSeen));
    const statusClass = (isTyping || isOnline) ? 'online' : '';
    let tickBadge = '';
    if (snippet && snippet.senderId === window.myUserId) {
        if (snippet.read) tickBadge = '<span class="tick-mark tick-read">✓✓</span>';
        else if (snippet.delivered) tickBadge = '<span class="tick-mark tick-delivered">✓✓</span>';
        else tickBadge = '<span class="tick-mark tick-sent">✓</span>';
    }
    const lastMsgHtml = isTyping
      ? `<span class="typing-pulse">${window.translations[window.currentLang].typing}</span>`
      : (snippet ? `${tickBadge} <span>${window.safeName(snippet.text)}</span>` : `<span style="color:#64748b;font-style:italic">${window.currentLang==='hi'?'बातचीत शुरू करें...':'Start a conversation...'}</span>`);

    const timeHtml = snippet?.time ? window.formatClockTime(snippet.time) : '';

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${window.safeName(u.name)}</span><div class="contact-last-msg">${lastMsgHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${timeHtml}</span><span class="contact-live-status ${statusClass}">${statusText}</span>${unread > 0 ? `<div class="badge-unread">${unread}</div>` : `<div style="height:20px"></div>`}</div>
      </div>
    `;
    card.onclick = (e) => {
      e.preventDefault();
      if (typeof window.openChat === 'function') {
        window.openChat(id, u.name, isOnline);
      }
    };
    contactsList.appendChild(card);
  });
};

let isInitialLoad = true;
function listenForLatestChatPreviews() {
  onValue(ref(db, 'chats'), snap => {
    const rooms = snap.val() || {};
    let hasUpdates = false;

    Object.keys(rooms).forEach(key => {
      if (!key.includes(window.myUserId)) return;
      const parts = key.split('__');
      const targetId = parts[0] === window.myUserId ? parts[1] : parts[0];
      const msgs = rooms[key]?.messages || {};
      const keys = Object.keys(msgs);
      if (!keys.length) return;

      const sortedKeys = keys.sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));
      const lastMsg = msgs[sortedKeys[sortedKeys.length - 1]];

      let unread = 0;
      keys.forEach(k => {
        const m = msgs[k];
        if (m.senderId !== window.myUserId && !m.read && window.currentChatTargetId !== targetId) unread++;
        if (m.senderId !== window.myUserId && !m.delivered) update(ref(db, `chats/${key}/messages/${k}`), { delivered: true }).catch(()=>{});
      });
      window.unreadCounts[targetId] = unread;

      const prevTime = window.latestChatSnippets[targetId]?.time || 0;
      const isNew = !isInitialLoad && lastMsg.time > prevTime && lastMsg.senderId !== window.myUserId && window.currentChatTargetId !== targetId;

      let msgText = lastMsg.text;
      if (lastMsg.type === 'image') msgText = '📷 ' + (window.currentLang==='hi'?'फ़ोटो':'Photo');
      else if (lastMsg.type === 'audio') msgText = '🎙 ' + (window.currentLang==='hi'?'वॉयस नोट':'Voice Note');
      else if (lastMsg.type === 'system-call') msgText = lastMsg.text;

      window.latestChatSnippets[targetId] = { text: msgText, time: lastMsg.time, senderId: lastMsg.senderId, read: !!lastMsg.read, delivered: !!lastMsg.delivered };
      hasUpdates = true;
      if (isNew) {
        playMessageBeep();
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker?.ready.then(reg => {
            reg.showNotification(lastMsg.senderName || 'New message', { body: window.latestChatSnippets[targetId].text, icon: 'icon.png', badge: 'icon.png', vibrate: [100, 50, 100], data: { targetId, senderName: lastMsg.senderName } });
          }).catch(() => {});
        } else {
          window.toast(`💬 ${lastMsg.senderName}: ${window.latestChatSnippets[targetId].text}`);
        }
      }
    });

    isInitialLoad = false;
    if (hasUpdates) {
      try {
        localStorage.setItem('cached_snippets', JSON.stringify(window.latestChatSnippets));
        localStorage.setItem('cached_unreads', JSON.stringify(window.unreadCounts));
      } catch(e) {}
      window.renderContacts();
    }
  });
}

function listenForCallLogs() {
  onValue(ref(db, `call_logs/${window.myUserId}`), snap => {
    const raw = snap.val() || {};
    const list = Object.keys(raw).map(k => raw[k]);
    if (list.length > 0) {
      allCallLogs = list.sort((a,b) => (b.time||0) - (a.time||0));
      localStorage.setItem('cached_call_logs', JSON.stringify(allCallLogs));
      renderCallLogs();
    }
  });
}

function renderCallLogs() {
  const callLogsList = $('callLogsList');
  if (!callLogsList) return;
  callLogsList.innerHTML = '';
  if (!allCallLogs.length) {
    callLogsList.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px">${window.currentLang==='hi'?'कोई कॉल लॉग नहीं है':'No call logs yet'}</div>`;
    return;
  }
  allCallLogs.forEach(l => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    let iconHtml = '';
    const isVoice = l.callMode === 'audio';
    const tag = isVoice ? '📞 ' : '📹 ';
    if (l.type === 'missed') iconHtml = `<span class="call-log-badge call-missed">↙ ${tag} ${window.currentLang==='hi'?'मिस्ड कॉल':'Missed Call'}</span>`;
    else if (l.type === 'incoming') iconHtml = `<span class="call-log-badge call-incoming">↙ ${tag} (${l.duration || '00:00'})</span>`;
    else iconHtml = `<span class="call-log-badge call-outgoing">↗ ${tag} (${l.duration || '00:00'})</span>`;

    const actionIconSvg = isVoice
      ? `<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M16 7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5l4.3 2.87A1 1 0 0 0 22 18.53V5.47a1 1 0 0 0-1.7-.84L16 7.5V7z"/></svg>`;

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${window.safeName(l.name)}</span><div>${iconHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${window.formatClockTime(l.time)}</span></div>
      </div>
      <button class="call-action-btn" title="कॉल करें">${actionIconSvg}</button>
    `;
    card.querySelector('.call-action-btn').onclick = (e) => { e.stopPropagation(); window.startCall(l.targetId, l.name, isVoice); };
    card.onclick = () => window.startCall(l.targetId, l.name, isVoice);
    callLogsList.appendChild(card);
  });
}

// --- 7. WEBRTC & CALL LOGIC ---
let currentCallType = 'outgoing';

function listenForIncoming() {
  const incomingRef = ref(db, `user_inbox/${window.myUserId}`);
  get(incomingRef).then(snap => {
    const data = snap.val();
    if (data && data.status === 'calling' && !window.activeCallId) handleIncomingCallNotification(data);
  }).catch(()=>{});

  onValue(incomingRef, async (snap) => {
    const data = snap.val(); if (!data) return;
    if (data.status === 'calling') {
      const callScr = $('call');
      if (isCallConnected || (window.activeCallId && callScr && !callScr.hidden)) {
        await update(ref(db, `call_sessions/${data.callId}`), { status: 'busy' }).catch(()=>{});
        await remove(incomingRef).catch(()=>{});
        return;
      }
      handleIncomingCallNotification(data);
      await update(ref(db, `users/${window.myUserId}`), { activeCallId: data.callId }).catch(()=>{});
      await update(incomingRef, { status: 'ringing' }).catch(()=>{});
      await update(ref(db, `call_sessions/${data.callId}`), { status: 'ringing' }).catch(()=>{});
    } else if (data.status === 'cancelled' || data.status === 'ended') {
      clearOngoingCallNotification();
      if (!isCallConnected && currentCallType === 'incoming') {
        window.recordCallLog({
          callId: window.activeCallId, targetId: currentChatTargetId, name: currentChatTargetName,
          type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now()
        });
      }
      stopAllCallTones(); 
      if ($('incomingDialog')) $('incomingDialog').hidden = true; 
      hangup(true);
    }
  });
}

async function sendPushNotification(token, callerName, isVoice = false) {
  try {
    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token, title: "इनकमिंग कॉल...", body: `${callerName} आपको कॉल कर रहे हैं`,
        callerName: callerName + (isVoice ? "|AUDIO" : "|VIDEO"), callId: window.activeCallId
      })
    }).catch(()=>{});
  } catch(e) {}
}

function handleIncomingCallNotification(data) {
  if (!data || !data.callId) return;
  const incDlg = $('incomingDialog');
  if (window.activeCallId === data.callId && incDlg && !incDlg.hidden) return;

  window.activeCallId = data.callId;
  currentCallType = 'incoming';
  window.currentChatTargetId = data.callerId || '';
  window.currentChatTargetName = data.callerName || 'कोई';
  isAudioOnlyCall = data.audioOnly === true || data.audioOnly === 'true' || data.audioOnly === '1';

  if ($('lobby')) $('lobby').hidden = true;
  if ($('chatScreen')) { $('chatScreen').hidden = true; $('chatScreen').style.setProperty('display', 'none', 'important'); }
  if ($('incomingName')) $('incomingName').textContent = window.currentChatTargetName + (isAudioOnlyCall ? (window.currentLang==='hi'?' (ऑडियो कॉल)...':' (Audio Call)...') : (window.currentLang==='hi'?' (वीडियो कॉल)...':' (Video Call)...'));
  if (incDlg) incDlg.hidden = false;
  startIncomingRingtone();
  update(ref(db, `call_sessions/${window.activeCallId}`), { status: 'ringing' }).catch(()=>{});
}

window.startCall = async function(remoteId, remoteName, audioOnly = false) {
  try {
    const bSnap = await get(ref(db, `users/${remoteId}/activeCallId`));
    if (bSnap.exists() && bSnap.val()) { 
      window.toast(`${remoteName} ${window.currentLang==='hi'?'अभी दूसरी कॉल में व्यस्त है':'is busy on another call'}`); 
      return; 
    }
  } catch(e) {}

  isAudioOnlyCall = audioOnly;
  const stream = await acquireCallMedia(audioOnly);
  if (!stream) return;

  window.activeCallId = `call_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  isCaller = true; currentCallType = 'outgoing';
  window.currentChatTargetId = remoteId; window.currentChatTargetName = remoteName;

  if ($('outgoingName')) $('outgoingName').textContent = remoteName + (audioOnly ? (window.currentLang==='hi'?' (ऑडियो)...':' (Audio)...') : (window.currentLang==='hi'?' (वीडियो)...':' (Video)...'));
  if ($('outgoingStatusText')) $('outgoingStatusText').textContent = window.currentLang==='hi'?'कनेक्ट किया जा रहा है...':'Connecting...';
  if ($('outgoingDialog')) $('outgoingDialog').hidden = false;
  startOutgoingCallTone();

  await update(ref(db, `users/${window.myUserId}`), { activeCallId: window.activeCallId }).catch(()=>{});
  const sessionRef = ref(db, `call_sessions/${window.activeCallId}`);
  onDisconnect(sessionRef).update({ status: 'ended' });

  await set(sessionRef, {
    callId: window.activeCallId, callerId: window.myUserId, callerName: window.myUserName, targetId: remoteId, audioOnly: !!audioOnly, status: 'calling', createdAt: serverTimestamp()
  });
  await set(ref(db, `user_inbox/${remoteId}`), { callId: window.activeCallId, callerId: window.myUserId, callerName: window.myUserName, audioOnly: !!audioOnly, status: 'calling' });

  const unsubSession = onValue(sessionRef, (snap) => {
    const d = snap.val(); if (!d) return;
    if (d.status === 'ringing' && $('outgoingStatusText')) $('outgoingStatusText').textContent = window.currentLang==='hi'?'घंटी बज रही है... (Ringing)':'Ringing...';
    if (d.status === 'busy') { stopAllCallTones(); unsubSession(); if ($('outgoingDialog')) $('outgoingDialog').hidden = true; window.toast(window.currentLang==='hi'?'📵 सामने वाला अभी व्यस्त है':'📵 User is busy'); hangup(true); }
    if (d.status === 'rejected') { stopAllCallTones(); unsubSession(); if ($('outgoingDialog')) $('outgoingDialog').hidden = true; window.toast(window.currentLang==='hi'?'❌ कॉल अस्वीकार कर दी गई':'❌ Call declined'); hangup(true); }
    if (d.status === 'ended' && isCallConnected) { unsubSession(); window.toast(window.currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended'); hangup(true); }
  });
  unsubs.push(unsubSession);

  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = setTimeout(() => {
    if (window.activeCallId && !isCallConnected) { window.toast(window.currentLang==='hi'?'⏱ कॉल का जवाब नहीं मिला':'⏱ No answer'); hangup(true); }
  }, 45000);

  try {
    const tSnap = await get(ref(db, `users/${remoteId}`));
    if (tSnap.val()?.fcmToken) sendPushNotification(tSnap.val().fcmToken, window.myUserName, audioOnly);
  } catch(e) {}

  const unsubAns = onValue(ref(db, `call_sessions/${window.activeCallId}/members/${remoteId}`), (snap) => {
    if (snap.exists()) { stopAllCallTones(); if ($('outgoingDialog')) $('outgoingDialog').hidden = true; unsubAns(); joinCallSession(); }
  });
  unsubs.push(unsubAns);
};

window.recordCallLog = async function(entry) {
  if (!window.myUserId) return;
  try {
    const logId = entry.callId || `call_${Date.now()}`;
    const myLogEntry = {
      callId: logId, targetId: entry.targetId, name: entry.name || 'उपयोगकर्ता',
      type: entry.type, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
    };
    
    await set(ref(db, `call_logs/${window.myUserId}/${logId}`), myLogEntry);

    if (entry.targetId && entry.targetId !== window.myUserId) {
      const remoteType = entry.type === 'outgoing' ? 'incoming' : (entry.type === 'incoming' ? 'outgoing' : 'missed');
      const remoteLogEntry = {
        callId: logId, targetId: window.myUserId, name: window.myUserName,
        type: remoteType, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
      };
      await set(ref(db, `call_logs/${entry.targetId}/${logId}`), remoteLogEntry).catch(()=>{});
    }

    if (entry.targetId) {
      const roomId = window.getChatRoomId(window.myUserId, entry.targetId);
      const roomPath = `chats/${roomId}/messages`;
      const isVoice = entry.callMode === 'audio';
      const label = isVoice ? (window.currentLang === 'hi' ? 'ऑडियो कॉल' : 'Audio Call') : (window.currentLang === 'hi' ? 'वीडियो कॉल' : 'Video Call');
      let callText = entry.type === 'missed' 
        ? `${isVoice ? '📞' : '📹'} ${window.currentLang === 'hi' ? 'मिस्ड' : 'Missed'} ${label}` 
        : `${isVoice ? '📞' : '📹'} ${label} (${entry.duration || '00:01'})`;

      await push(ref(db, roomPath), {
        senderId: window.myUserId, senderName: window.myUserName, type: 'system-call',
        text: callText, time: Date.now(), delivered: true, read: false
      }).catch(()=>{});
    }
  } catch(e) {}
};

async function toggleVideoTrackMode(enableCam) {
  try {
    if (enableCam) {
      let vTrack = localStream ? localStream.getVideoTracks()[0] : null;
      if (!vTrack) {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }
        });
        vTrack = vStream.getVideoTracks()[0];
        if (localStream) localStream.addTrack(vTrack);
      } else vTrack.enabled = true;

      const localVid = $('localVideo');
      if (localVid) localVid.srcObject = localStream;
      if (pipWrap) pipWrap.style.opacity = '1';
      if ($('camBtn')) $('camBtn').classList.remove('off');
      if ($('audioModeBtn')) $('audioModeBtn').classList.remove('off');
      isAudioOnlyCall = false; camEnabled = true;

      Object.values(peerConnections).forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(vTrack);
        else pc.addTrack(vTrack, localStream);
        boostPeerBitrate(pc);
      });
      if (window.activeCallId) update(ref(db, `call_sessions/${window.activeCallId}/members/${window.myUserId}`), { camEnabled: true }).catch(()=>{});
      window.toast(window.currentLang === 'hi' ? '📹 वीडियो चालू हो गया' : '📹 Video switched ON');
    } else {
      if (localStream) localStream.getVideoTracks().forEach(t => { t.enabled = false; });
      if (pipWrap) pipWrap.style.opacity = '0.2';
      if ($('camBtn')) $('camBtn').classList.add('off');
      camEnabled = false;
      if (window.activeCallId) update(ref(db, `call_sessions/${window.activeCallId}/members/${window.myUserId}`), { camEnabled: false }).catch(()=>{});
    }
  } catch(e) { window.toast('कैमरा शुरू नहीं हो सका'); }
}

async function boostPeerBitrate(pc) {
  try {
    for (const sender of pc.getSenders()) {
      if (sender.track && sender.track.kind === 'video') {
        const p = sender.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = 5000000; p.encodings[0].networkPriority = 'high';
        await sender.setParameters(p);
      }
    }
  } catch(e) {}
}

function applySDPBitrate(sdp, bitrateKbps = 5000) {
  if (!sdp || !sdp.includes('a=mid:video')) return sdp;
  return sdp.replace(/a=mid:video(.*)/g, `a=mid:video$1\r\nb=AS:${bitrateKbps}\r\nb=TIAS:${bitrateKbps * 1000}`);
}

async function applyCallQuality(level) {
  const next = level === 'medium' ? 'medium' : 'high';
  if (qualityLevel === next) return;
  qualityLevel = next;
  try {
    const vt = localStream?.getVideoTracks?.()[0];
    if (vt) await vt.applyConstraints(next === 'high' ? { width:{ideal:1920,min:1280}, height:{ideal:1080,min:720}, frameRate:{ideal:30,min:24} } : { width:{ideal:1280,min:960}, height:{ideal:720,min:540}, frameRate:{ideal:30,min:24} });
  } catch(e) {}
  for (const pc of Object.values(peerConnections)) {
    try {
      for (const s of pc.getSenders()) {
        if (s.track?.kind !== 'video') continue;
        const p = s.getParameters(); if (!p.encodings?.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = next === 'high' ? 5000000 : 2500000;
        await s.setParameters(p);
      }
    } catch(e) {}
  }
  updateNetworkIndicator(next);
}

function updateNetworkIndicator(level, detail='') {
  const pill = $('networkPill'), txt = $('networkText');
  if (!pill || !txt) return;
  pill.className = `network-pill ${level === 'medium' ? 'medium' : 'high'}`;
  txt.textContent = level === 'medium' ? window.translations[window.currentLang].netMedium : window.translations[window.currentLang].netOnline;
  if (detail) pill.title = detail;
}

async function sampleNetworkQuality() {
  if (!isCallConnected || !Object.keys(peerConnections).length) return;
  let worstRtt = 0, lossPct = 0, lossSamples = 0;
  for (const pc of Object.values(peerConnections)) {
    try {
      const stats = await pc.getStats();
      stats.forEach(r => {
        if (r.type === 'candidate-pair' && r.state === 'succeeded' && typeof r.currentRoundTripTime === 'number') worstRtt = Math.max(worstRtt, r.currentRoundTripTime * 1000);
        if (r.type === 'inbound-rtp' && r.kind === 'video' && typeof r.packetsLost === 'number' && typeof r.packetsReceived === 'number') {
          const tot = r.packetsLost + r.packetsReceived;
          if (tot > 0) { lossPct = Math.max(lossPct, (r.packetsLost / tot) * 100); lossSamples++; }
        }
      });
    } catch(e) {}
  }
  const isMed = worstRtt > 260 || lossPct > 5;
  await applyCallQuality(isMed ? 'medium' : 'high');
  updateNetworkIndicator(isMed ? 'medium' : 'high', `${Math.round(worstRtt)}ms / ${lossSamples ? lossPct.toFixed(1) : '0.0'}% loss`);
}

function startNetworkQualityMonitor() {
  stopNetworkQualityMonitor(); qualityLevel = '';
  updateNetworkIndicator('high'); applyCallQuality('high').catch(()=>{});
  sampleNetworkQuality(); qualityTimer = setInterval(sampleNetworkQuality, 3000);
}
function stopNetworkQualityMonitor() {
  if (qualityTimer) { clearInterval(qualityTimer); qualityTimer = null; }
  qualityLevel = 'high';
}

async function joinCallSession() {
  clearTimeout(callTimeoutTimer); callTimeoutTimer = null;
  if (lobbyScreen) lobbyScreen.hidden = true; 
  if ($('chatScreen')) { $('chatScreen').hidden = true; $('chatScreen').style.setProperty('display', 'none', 'important'); }
  if (callScreen) callScreen.hidden = false;
  isCallConnected = true; isHangingUp = false;
  await requestWakeLock();
  startNetworkQualityMonitor();
  if (pipWrap) {
    pipWrap.classList.remove('pip-hidden'); 
    pipWrap.style.opacity = isAudioOnlyCall ? '0' : '1';
  }
  if (pipRestoreBtn) pipRestoreBtn.hidden = true;
  if (localVideo) { localVideo.srcObject = localStream; localVideo.play().catch(()=>{}); }
  if (isAudioOnlyCall && $('audioModeBtn')) $('audioModeBtn').classList.add('off');
  startTimer(); scheduleAutoHide();

  const sessionRef = ref(db, `call_sessions/${window.activeCallId}`);
  onDisconnect(sessionRef).update({ status: 'ended' });

  await set(ref(db, `call_sessions/${window.activeCallId}/members/${window.myUserId}`), {
    name: window.myUserName, camEnabled: !isAudioOnlyCall, micEnabled, joinedAt: Date.now()
  });

  if (callSessionUnsub) callSessionUnsub();
  callSessionUnsub = onValue(ref(db, `call_sessions/${window.activeCallId}/status`), snap => {
    if (snap.val() === 'ended') { window.toast(window.currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended'); hangup(true); }
  });

  onValue(ref(db, `call_sessions/${window.activeCallId}/members`), snap => {
    const members = snap.val() || {}, ids = Object.keys(members);
    if (ids.length > MAX_CALL_MEMBERS) { window.toast(`Maximum ${MAX_CALL_MEMBERS} members allowed`); return; }
    ids.forEach(pId => {
      if (pId !== window.myUserId) {
        if (!peerConnections[pId]) initiatePeerConnection(pId, members[pId].name);
        updateRemotePeerUI(pId, members[pId]);
      }
    });
    Object.keys(peerConnections).forEach(pId => { if (!members[pId]) closePeer(pId); });
    updateRemoteGridClass();
  });

  if (typeof window.initKidsQuizListener === 'function') window.initKidsQuizListener();
  if (typeof window.initLiveCanvas === 'function') window.initLiveCanvas();
}

function initiatePeerConnection(peerId, peerName) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  peerConnections[peerId] = pc;
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  boostPeerBitrate(pc);

  pc.ontrack = e => {
    addRemoteVideoCell(peerId, e.streams[0], peerName);
    updateRemoteGridClass();
  };

  const myPath = `call_sessions/${window.activeCallId}/signals/${window.myUserId}__${peerId}`;
  const peerPath = `call_sessions/${window.activeCallId}/signals/${peerId}__${window.myUserId}`;

  pc.onicecandidate = e => { if (e.candidate) push(ref(db, `${myPath}/candidates`), e.candidate.toJSON()); };
  pc.pendingIce = [];

  onChildAdded(ref(db, `${peerPath}/candidates`), async snap => {
    const c = snap.val(); if (!c) return;
    const cand = new RTCIceCandidate(c);
    if (pc.remoteDescription) { try { await pc.addIceCandidate(cand); } catch(e){} }
    else pc.pendingIce.push(cand);
  });

  pc.flushIce = async () => {
    const p = pc.pendingIce || []; pc.pendingIce = [];
    for (const cand of p) { try { await pc.addIceCandidate(cand); } catch(e){} }
  };

  if (window.myUserId < peerId) {
    pc.createOffer().then(o => pc.setLocalDescription(new RTCSessionDescription({ type: o.type, sdp: applySDPBitrate(o.sdp) })))
      .then(() => set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type }));
    onValue(ref(db, `${peerPath}/answer`), snap => {
      const a = snap.val();
      if (a && !pc.currentRemoteDescription) pc.setRemoteDescription(new RTCSessionDescription(a)).then(async () => { await pc.flushIce(); boostPeerBitrate(pc); });
    });
  } else {
    onValue(ref(db, `${peerPath}/offer`), async snap => {
      const o = snap.val();
      if (o && !pc.currentRemoteDescription) {
        await pc.setRemoteDescription(new RTCSessionDescription(o));
        await pc.flushIce();
        const a = await pc.createAnswer();
        await pc.setLocalDescription(new RTCSessionDescription({ type: a.type, sdp: applySDPBitrate(a.sdp) }));
        set(ref(db, `${myPath}/answer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
        boostPeerBitrate(pc);
      }
    });
  }
}

function addRemoteVideoCell(id, stream, peerName) {
  if (!remoteGrid) return;
  let cell = $(`remote_cell_${id}`);
  if (!cell) {
    cell = document.createElement('div');
    cell.id = `remote_cell_${id}`;
    cell.className = 'remote-cell';
    cell.innerHTML = `
      <video autoplay playsinline></video>
      <div class="remote-mute-badge" id="mute_badge_${id}" hidden>🔇 माइक बंद</div>
      <div class="remote-off-overlay" id="cam_off_${id}" hidden>
        <div class="remote-off-avatar">👤</div>
        <div style="font-size:12px;font-weight:700;color:#94a3b8">${window.safeName(peerName || 'यूज़र')}</div>
      </div>
    `;
    remoteGrid.appendChild(cell);
  }
  const v = cell.querySelector('video');
  v.srcObject = stream; v.muted = !speakerEnabled; v.play().catch(()=>{});
}

function updateRemotePeerUI(peerId, data) {
  if (!data) return;
  const cam = $(`cam_off_${peerId}`), mic = $(`mute_badge_${peerId}`);
  if (cam) cam.hidden = data.camEnabled !== false;
  if (mic) mic.hidden = data.micEnabled !== false;
}
function removeRemoteVideoCell(id) { const c = $(`remote_cell_${id}`); if (c) c.remove(); }
function updateRemoteGridClass() {
  if (!remoteGrid) return;
  const count = remoteGrid.children.length;
  remoteGrid.className = count <= 1 ? 'count-1' : count === 2 ? 'count-2' : 'count-4';
}
function closePeer(id) {
  if (peerConnections[id]) { peerConnections[id].close(); delete peerConnections[id]; }
  removeRemoteVideoCell(id); updateRemoteGridClass();
}

function scheduleAutoHide() {
  clearTimeout(autoHideTimer);
  autoHideTimer = setTimeout(() => {
    if (isCallConnected) {
      if (controlsBar) controlsBar.classList.add('fade-out'); 
      if (topPill) topPill.classList.add('fade-out');
    }
  }, 3500);
}

async function hangup(silent = false) {
  try {
    let actualDuration = '00:01';
    if (callStartTime > 0 && isCallConnected) {
      const elapsedSec = Math.max(1, Math.floor((Date.now() - callStartTime) / 1000));
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');
      actualDuration = `${mm}:${ss}`;
    }

    clearOngoingCallNotification();
    stopAllCallTones(); 
    stopTimer(); 
    releaseWakeLock();
    clearTimeout(autoHideTimer); 
    clearTimeout(callTimeoutTimer); 
    callTimeoutTimer = null;
    stopNetworkQualityMonitor();

    if (typeof window.cleanupKidsModules === 'function') window.cleanupKidsModules();

    if (isCallConnected && window.currentChatTargetId) {
      window.recordCallLog({
        callId: window.activeCallId || `call_${Date.now()}`,
        targetId: window.currentChatTargetId,
        name: window.currentChatTargetName || 'उपयोगकर्ता',
        type: isCaller ? 'outgoing' : 'incoming',
        callMode: isAudioOnlyCall ? 'audio' : 'video',
        duration: actualDuration,
        time: Date.now()
      });
    }

    if (window.activeCallId) {
      await update(ref(db, `users/${window.myUserId}`), { activeCallId: null }).catch(()=>{});
      await update(ref(db, `call_sessions/${window.activeCallId}`), { status: 'ended' }).catch(()=>{});
      await remove(ref(db, `call_sessions/${window.activeCallId}/members/${window.myUserId}`)).catch(()=>{});
    }
    await remove(ref(db, `user_inbox/${window.myUserId}`)).catch(()=>{});
  } catch(err) {
  } finally {
    unsubs.forEach(fn => { try { fn(); } catch(e){} }); unsubs = [];
    if (callSessionUnsub) { callSessionUnsub(); callSessionUnsub = null; }
    Object.keys(peerConnections).forEach(id => closePeer(id)); peerConnections = {};

    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    if (remoteGrid) remoteGrid.innerHTML = ''; 
    window.activeCallId = null;
    isCallConnected = false; 
    isAudioOnlyCall = false;
    callStartTime = 0;

    if (controlsBar) controlsBar.classList.remove('fade-out'); 
    if (topPill) topPill.classList.remove('fade-out');
    if (pipWrap) {
      pipWrap.classList.remove('pip-hidden'); 
      pipWrap.style.opacity = '1';
    }
    if (pipRestoreBtn) pipRestoreBtn.hidden = true;
    if ($('audioModeBtn'))$('audioModeBtn').classList.remove('off');
    if ($('camBtn'))$('camBtn').classList.remove('off');
    if ($('micBtn'))$('micBtn').classList.remove('off');
    if ($('speakerBtn'))$('speakerBtn').classList.remove('off');
    
    if (callScreen) callScreen.hidden = true; 
    if (incomingDialog) incomingDialog.hidden = true; 
    if (outgoingDialog) outgoingDialog.hidden = true; 
    if (lobbyScreen) { lobbyScreen.hidden = false; lobbyScreen.style.setProperty('display', 'flex', 'important'); }
    isHangingUp = false;
  }
}
window.hangup = hangup;

function startTimer() {
  callStartTime = Date.now();
  if (timerTimer) clearInterval(timerTimer);
  timerTimer = setInterval(() => {
    const diff = Math.floor((Date.now() - callStartTime) / 1000);
    if (callTimer) callTimer.textContent = `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
  }, 1000);
}
function stopTimer() { 
  if (timerTimer) { clearInterval(timerTimer); timerTimer = null; } 
  if (callTimer) callTimer.textContent = '00:00'; 
}

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; } }

// --- 8. DOM EVENTS BINDING (Separated for Modules) ---
let backPressedOnce = false;
function setupHardwareBackButton() {
  window.addEventListener('popstate', (e) => {
    const openModals = [$('adminPanelModal'),$('adminPinModal'), $('profileModal'),$('addParticipantModal'), $('permNoticeModal'),$('kidsMenuModal')];
    for (const m of openModals) {
      if (m && !m.hidden) {
        m.hidden = true;
        history.pushState(null, '', window.location.href);
        e.preventDefault();
        return;
      }
    }
    const wb = $('kidsWhiteboardModal');
    if (wb && !wb.hidden) { wb.hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    const vDock = $('voiceDock');
    if (vDock && !vDock.hidden) { if (typeof window.discardRecording === 'function') window.discardRecording(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    const cScr = $('chatScreen');
    if (cScr && !cScr.hidden) { if (typeof window.closeChat === 'function') window.closeChat(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (callScreen && !callScreen.hidden) { if (confirm(window.currentLang==='hi'?'क्या आप कॉल काटना चाहते हैं?':'End call?')) hangup(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (outgoingDialog && !outgoingDialog.hidden) { if ($('btnCancelCall'))$('btnCancelCall').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (incomingDialog && !incomingDialog.hidden) { if ($('btnReject'))$('btnReject').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
  });

  history.pushState(null, '', window.location.href);

  if (!isNative || !App) return;
  App.addListener('backButton', () => {
    const openModals = [$('adminPanelModal'),$('adminPinModal'), $('profileModal'),$('addParticipantModal'), $('permNoticeModal'),$('kidsMenuModal')];
    for (const m of openModals) { if (m && !m.hidden) { m.hidden = true; return; } }
    const wb = $('kidsWhiteboardModal');
    if (wb && !wb.hidden) { wb.hidden = true; return; }
    const vDock = $('voiceDock');
    if (vDock && !vDock.hidden) { if (typeof window.discardRecording === 'function') window.discardRecording(); return; }
    const cScr = $('chatScreen');
    if (cScr && !cScr.hidden) { if (typeof window.closeChat === 'function') window.closeChat(); return; }
    if (callScreen && !callScreen.hidden) { if (confirm(window.currentLang==='hi'?'क्या आप कॉल काटना चाहते हैं?':'End call?')) hangup(); return; }
    if (outgoingDialog && !outgoingDialog.hidden) { if ($('btnCancelCall'))$('btnCancelCall').click(); return; }
    if (incomingDialog && !incomingDialog.hidden) { if ($('btnReject'))$('btnReject').click(); return; }

    if (backPressedOnce) { App.exitApp(); }
    else {
      backPressedOnce = true;
      window.toast(window.currentLang === 'hi' ? 'बाहर निकलने के लिए दोबारा बैक दबाएँ' : 'Press back again to exit');
      setTimeout(() => { backPressedOnce = false; }, 2000);
    }
  });
}

function initCoreDomEvents() {
  if ($('grantPermsBtn')) {$('grantPermsBtn').onclick = async () => {
      if ($('permNoticeModal'))$('permNoticeModal').hidden = true;
      localStorage.setItem('perms_requested', 'true');
      await checkMediaPermissions(true);
      await requestNotificationPermission();
      ensureAudioContext();
    };
  }

  if ($('saveNameBtn')) {$('saveNameBtn').onclick = async () => {
      const inp = $('nameInput');
      const val = inp ? inp.value.trim() : ''; 
      if (!val) return;
      window.myUserName = val;
      window.myUserId = val.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random()*900);
      localStorage.setItem('vc_user_id', window.myUserId); 
      localStorage.setItem('vc_user_name', window.myUserName);
      if ($('nameModal'))$('nameModal').hidden = true;
      
      updateHeaderTitle();
      
      await update(ref(db, `users/${window.myUserId}`), {
        id: window.myUserId, name: window.myUserName, online: true,
        onlineSince: serverTimestamp(), lastSeen: serverTimestamp()
      });

      await checkMediaPermissions();
      await requestNotificationPermission();
      initPresence();
    };
  }

  if ($('profileBtn'))$('profileBtn').onclick = () => {
    if ($('nameEditArea'))$('nameEditArea').hidden = true;
    if ($('toggleEditNameBtn'))$('toggleEditNameBtn').textContent = window.translations[window.currentLang].btnChangeName;
    if ($('profileModal'))$('profileModal').hidden = false;
  };
  
  if ($('closeProfileBtn'))$('closeProfileBtn').onclick = () => { if ($('profileModal'))$('profileModal').hidden = true; };

  if ($('toggleEditNameBtn'))$('toggleEditNameBtn').onclick = () => {
    const editArea = $('nameEditArea');
    if (!editArea) return;
    const isH = editArea.hidden;
    editArea.hidden = !isH;
    if (!isH) {
      $('toggleEditNameBtn').textContent = window.translations[window.currentLang].btnChangeName;
    } else {
      if ($('editNameInput')) {$('editNameInput').value = window.myUserName; $('editNameInput').focus(); }$('toggleEditNameBtn').textContent = window.currentLang === 'hi' ? 'छिपाएँ' : 'Hide';
    }
  };

  if ($('saveEditedNameBtn'))$('saveEditedNameBtn').onclick = async () => {
    const inp = $('editNameInput');
    const val = inp ? inp.value.trim() : ''; 
    if (!val) return;
    window.myUserName = val;
    localStorage.setItem('vc_user_name', window.myUserName);
    await update(ref(db, `users/${window.myUserId}`), { name: window.myUserName });
    updateHeaderTitle();
    if ($('nameEditArea'))$('nameEditArea').hidden = true;
    if ($('toggleEditNameBtn'))$('toggleEditNameBtn').textContent = window.translations[window.currentLang].btnChangeName;
    window.toast(window.currentLang === 'hi' ? '✅ नाम सुरक्षित कर लिया गया' : '✅ Name saved');
  };

  if ($('recheckPermsBtn'))$('recheckPermsBtn').onclick = async () => {
    if ($('profileModal'))$('profileModal').hidden = true;
    await checkMediaPermissions(true);
    await requestNotificationPermission();
    window.toast(window.currentLang === 'hi' ? 'अनुमतियाँ जाँची गईं' : 'Permissions checked');
  };

  if ($('clearChatHistoryBtn'))$('clearChatHistoryBtn').onclick = async () => {
    const confirmMsg = window.currentLang === 'hi' ? 'क्या आप अपनी सभी चैट हिस्ट्री साफ़ करना चाहते हैं?' : 'Clear all chat history?';
    if (!confirm(confirmMsg)) return;
    try {
      localStorage.removeItem('cached_snippets'); localStorage.removeItem('cached_unreads');
      window.latestChatSnippets = {}; window.unreadCounts = {};
      const chatsSnap = await get(ref(db, 'chats'));
      if (chatsSnap.exists()) {
        const allChats = chatsSnap.val() || {};
        const updates = {};
        Object.keys(allChats).forEach(roomId => { if (roomId.includes(window.myUserId)) updates[`chats/${roomId}/messages`] = null; });
        if (Object.keys(updates).length > 0) await update(ref(db), updates);
      }
      if (typeof window.renderContacts === 'function') window.renderContacts();
      if ($('chatBody'))$('chatBody').innerHTML = '';
      window.toast(window.currentLang === 'hi' ? '✅ सभी चैट साफ़ कर दी गई' : '✅ All chats cleared');
      if ($('profileModal'))$('profileModal').hidden = true;
    } catch(e) {}
  };

  if ($('resetProfileBtn'))$('resetProfileBtn').onclick = async () => {
    if (!confirm('क्या आप अपनी आईडी हटाकर रीसेट करना चाहते हैं?')) return;
    try { await remove(ref(db, `users/${window.myUserId}`)); await remove(ref(db, `user_inbox/${window.myUserId}`)); } catch(e) {}
    localStorage.clear(); location.href = location.pathname;
  };

  if ($('tabChatsBtn')) $('tabChatsBtn').onclick = () => {$('tabChatsBtn').className = 'tab-btn active-chat';
    if ($('tabCallsBtn'))$('tabCallsBtn').className = 'tab-btn';
    if ($('tabChatsContent'))$('tabChatsContent').hidden = false;
    if ($('tabCallsContent'))$('tabCallsContent').hidden = true;
  };

  if ($('tabCallsBtn')) $('tabCallsBtn').onclick = () => {$('tabCallsBtn').className = 'tab-btn active-call';
    if ($('tabChatsBtn'))$('tabChatsBtn').className = 'tab-btn';
    if ($('tabCallsContent'))$('tabCallsContent').hidden = false;
    if ($('tabChatsContent'))$('tabChatsContent').hidden = true;
    renderCallLogs();
  };

  if ($('btnCancelCall'))$('btnCancelCall').onclick = () => {
    stopAllCallTones();
    if (outgoingDialog) outgoingDialog.hidden = true;
    if (window.currentChatTargetId) {
      const roomId = window.getChatRoomId(window.myUserId, window.currentChatTargetId);
      const label = isAudioOnlyCall ? '📞 मिस्ड ऑडियो कॉल' : '📹 मिस्ड वीडियो कॉल';
      push(ref(db, `chats/${roomId}/messages`), { senderId: window.myUserId, senderName: window.myUserName, type: 'system-call', text: label, time: Date.now(), delivered: true, read: false });

      update(ref(db, `user_inbox/${window.currentChatTargetId}`), { status: 'cancelled' }).catch(()=>{});
      get(ref(db, `users/${window.currentChatTargetId}`)).then(snap => {
        const token = snap.val()?.fcmToken;
        if (token) {
          fetch("https://neeraj.neerajthegreat192.workers.dev/", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, title: "Cancel", body: "Call Cancelled", callId: "CANCEL_" + window.activeCallId })
          }).catch(()=>{});
        }
      }).catch(()=>{});
    }
    hangup();
  };

  if ($('btnAccept'))$('btnAccept').onclick = async () => { stopAllCallTones(); if (incomingDialog) incomingDialog.hidden = true; if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession(); };
  if ($('btnReject'))$('btnReject').onclick = async () => {
    stopAllCallTones(); if (incomingDialog) incomingDialog.hidden = true;
    clearOngoingCallNotification();
    window.recordCallLog({ callId: window.activeCallId, targetId: window.currentChatTargetId, name: window.currentChatTargetName, type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now() });
    if (window.activeCallId) await update(ref(db, `call_sessions/${window.activeCallId}`), { status: 'rejected' }).catch(()=>{});
    await update(ref(db, `user_inbox/${window.myUserId}`), { status: 'rejected' }).catch(()=>{});
    setTimeout(() => remove(ref(db, `user_inbox/${window.myUserId}`)).catch(()=>{}), 2500);
  };

  if ($('audioModeBtn')) $('audioModeBtn').onclick = () => { isAudioOnlyCall = !isAudioOnlyCall; toggleVideoTrackMode(!isAudioOnlyCall);$('audioModeBtn').classList.toggle('off', isAudioOnlyCall); scheduleAutoHide(); };
  if ($('kidsFunBtn'))$('kidsFunBtn').onclick = (e) => { e.stopPropagation(); if ($('kidsMenuModal'))$('kidsMenuModal').hidden = false; scheduleAutoHide(); };
  
  if ($('micBtn'))$('micBtn').onclick = async (e) => {
    e.stopPropagation(); micEnabled = !micEnabled;
    if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
    $('micBtn').classList.toggle('off', !micEnabled);
    if (window.activeCallId) await update(ref(db, `call_sessions/${window.activeCallId}/members/${window.myUserId}`), { micEnabled }).catch(()=>{});
    scheduleAutoHide();
  };

  if ($('camBtn'))$('camBtn').onclick = async (e) => { e.stopPropagation(); if (isAudioOnlyCall) toggleVideoTrackMode(true); else toggleVideoTrackMode(!camEnabled); scheduleAutoHide(); };
  if ($('speakerBtn'))$('speakerBtn').onclick = (e) => {
    e.stopPropagation(); speakerEnabled = !speakerEnabled;
    if (remoteGrid) remoteGrid.querySelectorAll('video').forEach(v => { v.muted = !speakerEnabled; });
    $('speakerBtn').classList.toggle('off', !speakerEnabled); scheduleAutoHide();
  };

  if ($('flipBtn'))$('flipBtn').onclick = async (e) => {
    e.stopPropagation(); if (isAudioOnlyCall || !camEnabled) return; facingMode = facingMode === 'user' ? 'environment' : 'user';
    if (pipWrap) pipWrap.classList.toggle('mirror', facingMode === 'user');
    try {
      if (localStream) localStream.getVideoTracks().forEach(t => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }, audio: false });
      const newTrack = newStream.getVideoTracks()[0], oldTrack = localStream.getVideoTracks()[0];
      if (oldTrack) localStream.removeTrack(oldTrack); localStream.addTrack(newTrack);
      if (localVideo) localVideo.srcObject = localStream;
      Object.values(peerConnections).forEach(pc => { const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video'); if (sender) sender.replaceTrack(newTrack); boostPeerBitrate(pc); });
    } catch(e) {}
    scheduleAutoHide();
  };

  if ($('hangBtn'))$('hangBtn').onclick = (e) => { e.stopPropagation(); e.preventDefault(); if (isHangingUp) return; isHangingUp = true; hangup(); };

  if ($('btnAddPerson'))$('btnAddPerson').onclick = () => {
    const list = $('addContactsList'); if (!list) return; list.innerHTML = '';
    const amIAdmin = isNeerajBadola(window.myUserName);
    const avail = Object.keys(window.allOnlineUsers).filter(id => id !== window.myUserId && !peerConnections[id] && (!window.allOnlineUsers[id].hidden || amIAdmin));
    if (!avail.length) { list.innerHTML = `<div style="font-size:12px;color:#94a3b8;padding:10px">${window.currentLang==='hi'?'अन्य कोई संपर्क उपलब्ध नहीं है':'No other contacts available'}</div>`; }
    else {
      avail.forEach(id => {
        const u = window.allOnlineUsers[id], row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:12px;border:1px solid var(--line)';
        row.innerHTML = `<span style="font-size:14px;font-weight:700">${window.safeName(u.name)}</span><button style="background:var(--c-call-tab);border:0;color:#fff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:12px">${window.translations[window.currentLang].add}</button>`;
        row.querySelector('button').onclick = async () => {
          const snap = await get(ref(db, `call_sessions/${window.activeCallId}/members`));
          if (snap.exists() && Object.keys(snap.val()||{}).length >= MAX_CALL_MEMBERS) { window.toast(`Max ${MAX_CALL_MEMBERS} members allowed`); return; }
          await update(ref(db, `users/${id}`), { activeCallId: window.activeCallId }).catch(()=>{});
          await set(ref(db, `user_inbox/${id}`), { callId: window.activeCallId, callerId: window.myUserId, callerName: window.myUserName + ' (ग्रुप)', audioOnly: isAudioOnlyCall, status: 'calling' });
          const uSnap = await get(ref(db, `users/${id}`));
          if (uSnap.val()?.fcmToken) sendPushNotification(uSnap.val().fcmToken, window.myUserName, isAudioOnlyCall);
          window.toast(`${u.name} को कॉल भेजा गया!`); if ($('addParticipantModal'))$('addParticipantModal').hidden = true;
        };
        list.appendChild(row);
      });
    }
    if ($('addParticipantModal'))$('addParticipantModal').hidden = false;
  };
  if ($('closeAddModalBtn'))$('closeAddModalBtn').onclick = () => { if ($('addParticipantModal'))$('addParticipantModal').hidden = true; };

  if (pipWrap) {
    let pipStartX = 0, pipStartY = 0;
    pipWrap.addEventListener('touchstart', e => { pipStartX = e.changedTouches[0].clientX; pipStartY = e.changedTouches[0].clientY; }, {passive:true});
    pipWrap.addEventListener('touchend', e => { e.stopPropagation(); const dx = e.changedTouches[0].clientX - pipStartX, dy = e.changedTouches[0].clientY - pipStartY; if (dx > 30 && Math.abs(dx) > Math.abs(dy)) { pipWrap.classList.add('pip-hidden'); if (pipRestoreBtn) pipRestoreBtn.hidden = false; } scheduleAutoHide(); });
  }
  if (pipRestoreBtn) pipRestoreBtn.onclick = e => { e.stopPropagation(); if (pipWrap) pipWrap.classList.remove('pip-hidden'); pipRestoreBtn.hidden = true; scheduleAutoHide(); };

  if (callScreen) callScreen.addEventListener('click', e => {
    if (e.target.closest('.ctl-box') || e.target.closest('.modal-box') || e.target.closest('#pipWrap') || e.target.closest('#pipRestoreBtn')) return;
    const isH = controlsBar.classList.contains('fade-out');
    controlsBar.classList.toggle('fade-out', !isH); topPill.classList.toggle('fade-out', !isH); if (isH) scheduleAutoHide();
  });
}

function handleDeepLinks() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const data = event.data; if (!data) return;
        if (data.type === 'NEW_CHAT_MESSAGE' && data.senderId) {
          if (window.latestChatSnippets[data.senderId]) {
            window.latestChatSnippets[data.senderId].text = data.text;
            window.latestChatSnippets[data.senderId].time = Date.now();
            if (typeof window.renderContacts === 'function') window.renderContacts();
          }
        } else if (data.type === 'OPEN_CHAT' && data.targetId && typeof window.openChat === 'function') {
          window.openChat(data.targetId, data.senderName || 'उपयोगकर्ता', true);
        } else if (data.type === 'ACCEPT_CALL' && data.callId) {
          if (!isCallConnected) {
            window.activeCallId = data.callId; isAudioOnlyCall = !!data.isAudio;
            if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
          }
        }
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('chatTargetId') && typeof window.openChat === 'function') {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => window.openChat(urlParams.get('chatTargetId'), urlParams.get('chatTargetName') || 'उपयोगकर्ता', true), 800);
    } else if (urlParams.get('acceptCallId')) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(async () => {
        if (!isCallConnected) {
          window.activeCallId = urlParams.get('acceptCallId'); isAudioOnlyCall = urlParams.get('isAudio') === 'true';
          if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
        }
      }, 800);
    }
  } catch (e) {}
}

async function initApp() {
  try {
    initCoreDomEvents();
    if (window.myUserName) updateHeaderTitle();
    applyLanguage(window.currentLang);
    setupHardwareBackButton();
    setupNativePushListeners();
    checkUser();
    await triggerAutoPermissionGate();
    handleDeepLinks();
  } catch (err) {}
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
