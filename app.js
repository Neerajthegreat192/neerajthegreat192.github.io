// ==========================================
// CORE APP MODULE (app.js)
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
const lobbyScreen = $('lobby'), callScreen = $('call');
const contactsList = $('contactsList'), callLogsList = $('callLogsList'), myHeaderName = $('myHeaderName'), adminBtn = $('adminBtn');
const incomingDialog = $('incomingDialog'), outgoingDialog = $('outgoingDialog');
const callTimer = $('callTimer'), controlsBar = $('controlsBar'), topPill = $('topPill');
const remoteGrid = $('remoteGrid'), localVideo = $('localVideo'), pipWrap = $('pipWrap');
const pipRestoreBtn = $('pipRestoreBtn');
const networkBanner = $('networkBanner'), searchInput = $('searchInput');

let currentLang = localStorage.getItem('vc_lang') || 'hi';
window.currentLang = currentLang;

const translations = {
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
window.translations = translations;

function applyLanguage(lang) {
  currentLang = lang;
  window.currentLang = lang;
  localStorage.setItem('vc_lang', lang);
  if ($('langSelect')) $('langSelect').value = lang;
  const t = translations[lang];
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
  if (typeof renderContacts === 'function') renderContacts();
}

let myUserId = localStorage.getItem('vc_user_id') || '';
let myUserName = localStorage.getItem('vc_user_name') || '';
window.myUserId = myUserId;
window.myUserName = myUserName;
let myFcmToken = localStorage.getItem('vc_fcm_token') || null;

let allOnlineUsers = {};
let latestChatSnippets = {};
let unreadCounts = {};
let allCallLogs = [];

try {
  allOnlineUsers = JSON.parse(localStorage.getItem('cached_users') || '{}');
  latestChatSnippets = JSON.parse(localStorage.getItem('cached_snippets') || '{}');
  unreadCounts = JSON.parse(localStorage.getItem('cached_unreads') || '{}');
  allCallLogs = JSON.parse(localStorage.getItem('cached_call_logs') || '[]');
  window.allOnlineUsers = allOnlineUsers;
  window.latestChatSnippets = latestChatSnippets;
  window.unreadCounts = unreadCounts;
} catch(e) {}

let localStream = null, activeCallId = null, currentChatTargetId = null, currentChatTargetName = null;
window.activeCallId = activeCallId;
window.currentChatTargetId = currentChatTargetId;
window.currentChatTargetName = currentChatTargetName;

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

function ensureAudioContext() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  } catch(e) { return null; }
}

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
        if ($('incomingDialog') && $('incomingDialog').hidden) { stopIncomingRingtone(); return; }
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
        if ($('incomingDialog') && $('incomingDialog').hidden) { stopVibration(); return; }
        navigator.vibrate([500, 300, 500, 300, 800]);
      }, 2500);
    }
  }
}
function stopVibration() { if ('vibrate' in navigator) navigator.vibrate(0); if (vibrationInterval) { clearInterval(vibrationInterval); vibrationInterval = null; } }

function toast(msg) {
  const t = $('toast'); 
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
window.toast = toast;

function safeName(n) { return String(n||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
window.safeName = safeName;
function isNeerajBadola(n) { const s = (n||'').toLowerCase().replace(/\s+/g,' ').trim(); return (s.includes('neeraj')&&s.includes('badola'))||(s.includes('नीरज')&&s.includes('बडोला')); }

function formatClockTime(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true });
}
window.formatClockTime = formatClockTime;
function formatLastSeen(ts) {
  if (!ts) return '';
  return `Last seen ${formatClockTime(ts)}`;
}
window.formatLastSeen = formatLastSeen;

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

async function acquireCallMedia(audioOnly = false) {
  if (localStream) {
    if (!audioOnly && localStream.getVideoTracks().length === 0) {
      try {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }
        });
        const vt = vStream.getVideoTracks()[0];
        localStream.addTrack(vt);
      } catch(e) {}
    }
    if (localVideo) localVideo.srcObject = localStream;
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
    if (localVideo) localVideo.srcObject = localStream;
    return localStream;
  } catch(e) {
    toast(currentLang === 'hi' ? 'कैमरा/माइक अनुमति उपलब्ध नहीं है' : 'Camera/Mic permission unavailable');
    return null;
  }
}

async function checkMediaPermissions(showNotice = false) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(t => t.stop());
    if (showNotice) toast(currentLang === 'hi' ? '✅ कैमरा एवं माइक तैयार हैं' : '✅ Camera & Mic are ready');
    return true;
  } catch(e) {
    if (showNotice) toast(currentLang === 'hi' ? '⚠️ सेटिंग्स में जाकर कैमरा और माइक की अनुमति दें' : '⚠️ Grant camera/mic permissions in settings');
    return false;
  }
}

// ----------------------------------------------
// FCM SERVICE WORKER REGISTRATION (ROOT SCOPE FIX)
// ----------------------------------------------
async function requestNotificationPermission() {
  if (isNative && PushNotifications) {
    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
      if (perm.receive === 'granted') await PushNotifications.register();
    } catch(e) { console.warn("Native Push Warning:", e); }
    return;
  }

  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      console.warn("Notification permission denied!");
      return;
    }

    // Fix: Root path '/firebase-messaging-sw.js'
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const { getMessaging, getToken } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    const messaging = getMessaging(app);

    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY, 
      serviceWorkerRegistration: swReg 
    });

    if (token) {
      console.log("FCM Token Generated Successfully");
      myFcmToken = token;
      localStorage.setItem('vc_fcm_token', token);
      const currentUid = myUserId || localStorage.getItem('vc_user_id');
      if (currentUid) await update(ref(db, `users/${currentUid}`), { fcmToken: token });
    }
  } catch(err) {
    console.error("FCM Token Error:", err);
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

function setupNativePushListeners() {
  if (!isNative || !PushNotifications) return;
  PushNotifications.addListener('registration', async (token) => {
    myFcmToken = token.value;
    localStorage.setItem('vc_fcm_token', myFcmToken);
    const currentUid = myUserId || localStorage.getItem('vc_user_id');
    if (currentUid) await update(ref(db, `users/${currentUid}`), { fcmToken: myFcmToken }).catch(()=>{});
  });
  
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    const data = notification.data || {};
    if (data.callId && data.callId !== 'null' && String(data.callId).trim() !== '') {
      handleIncomingCallNotification(data);
    }
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data || {};
    const rawCallId = data?.callId;
    const isRealCall = rawCallId && rawCallId !== 'null' && rawCallId !== 'undefined' && String(rawCallId).trim() !== '';

    if (isRealCall) {
      handleIncomingCallNotification(data);
    } else if (data && data.chatTargetId) {
      if (typeof window.openChat === 'function') window.openChat(data.chatTargetId, data.chatTargetName || 'उपयोगकर्ता', false);
    }
  });
}

function handleIncomingCallNotification(data) {
  if (!data || !data.callId) return;
  if (activeCallId === data.callId && incomingDialog && !incomingDialog.hidden) return;

  activeCallId = data.callId;
  window.activeCallId = activeCallId;
  currentCallType = 'incoming';
  currentCallTargetId = data.callerId || '';
  currentCallTargetName = data.callerName || 'कोई';
  window.currentChatTargetId = currentCallTargetId;
  window.currentChatTargetName = currentCallTargetName;
  
  isAudioOnlyCall = data.audioOnly === true || data.audioOnly === 'true' || data.audioOnly === '1';

  if (lobbyScreen) lobbyScreen.hidden = true;
  if ($('chatScreen')) { $('chatScreen').hidden = true; $('chatScreen').style.setProperty('display', 'none', 'important'); }
  if ($('incomingName')) $('incomingName').textContent = currentCallTargetName + (isAudioOnlyCall ? (currentLang==='hi'?' (ऑडियो कॉल)...':' (Audio Call)...') : (currentLang==='hi'?' (वीडियो कॉल)...':' (Video Call)...'));
  if (incomingDialog) incomingDialog.hidden = false;
  startIncomingRingtone();
  update(ref(db, `call_sessions/${activeCallId}`), { status: 'ringing' }).catch(()=>{});
}

function updateHeaderTitle() {
  if (myHeaderName) myHeaderName.textContent = myUserName || (currentLang === 'hi' ? 'एचडी कॉलिंग' : 'HD Calling');
  if (adminBtn) adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
}

async function initPresence() {
  updateHeaderTitle();
  const userRef = ref(db, `users/${myUserId}`);
  const inboxRef = ref(db, `user_inbox/${myUserId}`);
  const connectedRef = ref(db, '.info/connected');

  await onDisconnect(userRef).update({
    online: false, lastSeen: serverTimestamp(), onlineSince: null,
    activeCallId: null, isBusy: false, typingTo: null
  }).catch(()=>{});
  await onDisconnect(inboxRef).remove().catch(()=>{});

  await update(userRef, {
    id: myUserId, name: myUserName, online: true,
    onlineSince: serverTimestamp(), lastSeen: serverTimestamp(), activeCallId: null
  });
  if (myFcmToken) await update(userRef, { fcmToken: myFcmToken });

  if (!isNative && 'Notification' in window && Notification.permission === 'granted') {
    requestNotificationPermission().catch(()=>{});
  }

  onValue(connectedRef, async snap => {
    if (snap.val() === true) {
      if (networkBanner) networkBanner.hidden = true;
      await update(userRef, { online: true, onlineSince: serverTimestamp() }).catch(()=>{});
    } else {
      if (networkBanner) networkBanner.hidden = false;
    }
  });

  onValue(ref(db, 'users'), snap => {
    allOnlineUsers = snap.val() || {};
    window.allOnlineUsers = allOnlineUsers;
    try { localStorage.setItem('cached_users', JSON.stringify(allOnlineUsers)); } catch(e) {}
    if (typeof renderContacts === 'function') renderContacts();
  });

  listenSelfAccountStatus();
  listenForIncoming();
  if (typeof window.listenForLatestChatPreviews === 'function') window.listenForLatestChatPreviews();
  listenForCallLogs();
}

function listenSelfAccountStatus() {
  if (selfStatusUnsub) selfStatusUnsub();
  selfStatusUnsub = onValue(ref(db, `users/${myUserId}`), (snap) => {
    if (!snap.exists() && myUserId) {
      if (selfStatusUnsub) { selfStatusUnsub(); selfStatusUnsub = null; }
      hangup(true); localStorage.clear();
      myUserId = ''; myUserName = '';
      window.myUserId = ''; window.myUserName = '';
      if (myHeaderName) myHeaderName.textContent = '...';
      if ($('chatScreen')) { $('chatScreen').hidden = true; $('chatScreen').style.setProperty('display', 'none', 'important'); }
      if (callScreen) callScreen.hidden = true;
      if (lobbyScreen) { lobbyScreen.hidden = false; lobbyScreen.style.setProperty('display', 'flex', 'important'); }
      if ($('nameInput')) $('nameInput').value = '';
      if ($('nameModal')) $('nameModal').hidden = false;
      toast(currentLang === 'hi' ? '⚠️ आपकी आईडी रीसेट हो गई है।' : '⚠️ Your ID was reset.');
    }
  });
}

function checkUser() {
  if (!myUserId || !myUserName) {
    if ($('nameModal')) $('nameModal').hidden = false;
  } else {
    if ($('nameModal')) $('nameModal').hidden = true;
    initPresence();
  }
}

// ----------------------------------------------
// CONTACT RENDERER WITH GLOBAL CLICK HANDLER FIX
// ----------------------------------------------
window.renderContacts = function() {
  if (!contactsList) return;
  contactsList.innerHTML = '';
  const amIAdmin = isNeerajBadola(myUserName);
  const q = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let userIds = Object.keys(allOnlineUsers).filter(id => {
    const u = allOnlineUsers[id];
    const match = !q || (u && u.name && u.name.toLowerCase().includes(q));
    return u && u.name && id !== myUserId && u.name !== 'User' && (!u.hidden || amIAdmin) && match;
  });

  if (!userIds.length) {
    contactsList.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px">${currentLang==='hi'?'कोई संपर्क उपलब्ध नहीं है':'No contacts available'}</div>`;
    return;
  }
  userIds.sort((a, b) => {
    const timeA = latestChatSnippets[a]?.time || allOnlineUsers[a]?.lastSeen || 0;
    const timeB = latestChatSnippets[b]?.time || allOnlineUsers[b]?.lastSeen || 0;
    return timeB - timeA;
  });

  userIds.forEach(id => {
    const u = allOnlineUsers[id], isOnline = !!u.online;
    const isTyping = u.typingTo === myUserId;
    const unread = unreadCounts[id] || 0;
    const snippet = latestChatSnippets[id];
    const card = document.createElement('div');
    card.className = 'contact-card';

    const statusText = isTyping ? translations[currentLang].typing : (isOnline ? translations[currentLang].online : formatLastSeen(u.lastSeen));
    const statusClass = (isTyping || isOnline) ? 'online' : '';
    let tickBadge = '';
    if (snippet && snippet.senderId === myUserId) {
        if (snippet.read) tickBadge = '<span class="tick-mark tick-read">✓✓</span>';
        else if (snippet.delivered) tickBadge = '<span class="tick-mark tick-delivered">✓✓</span>';
        else tickBadge = '<span class="tick-mark tick-sent">✓</span>';
    }
    const lastMsgHtml = isTyping
      ? `<span class="typing-pulse">${translations[currentLang].typing}</span>`
      : (snippet ? `${tickBadge} <span>${safeName(snippet.text)}</span>` : `<span style="color:#64748b;font-style:italic">${currentLang==='hi'?'बातचीत शुरू करें...':'Start a conversation...'}</span>`);

    const timeHtml = snippet?.time ? formatClockTime(snippet.time) : '';

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${safeName(u.name)}</span><div class="contact-last-msg">${lastMsgHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${timeHtml}</span><span class="contact-live-status ${statusClass}">${statusText}</span>${unread > 0 ? `<div class="badge-unread">${unread}</div>` : `<div style="height:20px"></div>`}</div>
      </div>
    `;
    card.onclick = (e) => {
      e.preventDefault();
      if (typeof window.openChat === 'function') {
        window.openChat(id, u.name, isOnline);
      } else {
        toast('Chat module is loading...');
      }
    };
    contactsList.appendChild(card);
  });
}
if (searchInput) searchInput.oninput = window.renderContacts;
setInterval(() => { if (lobbyScreen && !lobbyScreen.hidden && Object.keys(allOnlineUsers).length) window.renderContacts(); }, 60000);


function listenForCallLogs() {
  onValue(ref(db, `call_logs/${myUserId}`), snap => {
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
  if (!callLogsList) return;
  callLogsList.innerHTML = '';
  if (!allCallLogs.length) {
    callLogsList.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px">${currentLang==='hi'?'कोई कॉल लॉग नहीं है':'No call logs yet'}</div>`;
    return;
  }
  allCallLogs.forEach(l => {
    const card = document.createElement('div');
    card.className = 'contact-card';
    let iconHtml = '';
    const isVoice = l.callMode === 'audio';
    const tag = isVoice ? '📞 ' : '📹 ';
    if (l.type === 'missed') iconHtml = `<span class="call-log-badge call-missed">↙ ${tag} ${currentLang==='hi'?'मिस्ड कॉल':'Missed Call'}</span>`;
    else if (l.type === 'incoming') iconHtml = `<span class="call-log-badge call-incoming">↙ ${tag} (${l.duration || '00:00'})</span>`;
    else iconHtml = `<span class="call-log-badge call-outgoing">↗ ${tag} (${l.duration || '00:00'})</span>`;

    const actionIconSvg = isVoice
      ? `<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M16 7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2.5l4.3 2.87A1 1 0 0 0 22 18.53V5.47a1 1 0 0 0-1.7-.84L16 7.5V7z"/></svg>`;

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${safeName(l.name)}</span><div>${iconHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${formatClockTime(l.time)}</span></div>
      </div>
      <button class="call-action-btn" title="कॉल करें">${actionIconSvg}</button>
    `;
    card.querySelector('.call-action-btn').onclick = (e) => { e.stopPropagation(); if (typeof window.startCall === 'function') window.startCall(l.targetId, l.name, isVoice); };
    card.onclick = () => { if (typeof window.startCall === 'function') window.startCall(l.targetId, l.name, isVoice); };
    callLogsList.appendChild(card);
  });
}

function listenForIncoming() {
  const incomingRef = ref(db, `user_inbox/${myUserId}`);
  
  get(incomingRef).then(snap => {
    const data = snap.val();
    if (data && data.status === 'calling' && !activeCallId) {
      handleIncomingCallNotification(data);
    }
  }).catch(()=>{});

  onValue(incomingRef, async (snap) => {
    const data = snap.val(); if (!data) return;
    if (data.status === 'calling') {
      if (isCallConnected || (activeCallId && callScreen && !callScreen.hidden)) {
        await update(ref(db, `call_sessions/${data.callId}`), { status: 'busy' }).catch(()=>{});
        await remove(incomingRef).catch(()=>{});
        return;
      }
      handleIncomingCallNotification(data);
      await update(ref(db, `users/${myUserId}`), { activeCallId: data.callId }).catch(()=>{});
      await update(incomingRef, { status: 'ringing' }).catch(()=>{});
      await update(ref(db, `call_sessions/${data.callId}`), { status: 'ringing' }).catch(()=>{});
    } else if (data.status === 'cancelled' || data.status === 'ended') {
      clearOngoingCallNotification();
      if (!isCallConnected && currentCallType === 'incoming') {
        if (typeof window.recordCallLog === 'function') {
          window.recordCallLog({
            callId: activeCallId, targetId: currentCallTargetId, name: currentCallTargetName,
            type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now()
          });
        }
      }
      stopAllCallTones(); 
      if (incomingDialog) incomingDialog.hidden = true; 
      if (typeof window.hangup === 'function') window.hangup(true);
    }
  });
}

function initCoreDomEvents() {
  if ($('grantPermsBtn')) {
    $('grantPermsBtn').onclick = async () => {
      if ($('permNoticeModal')) $('permNoticeModal').hidden = true;
      localStorage.setItem('perms_requested', 'true');
      await checkMediaPermissions(true);
      await requestNotificationPermission();
      ensureAudioContext();
    };
  }

  if ($('saveNameBtn')) {
    $('saveNameBtn').onclick = async () => {
      const inp = $('nameInput');
      const val = inp ? inp.value.trim() : ''; 
      if (!val) return;
      myUserName = val;
      myUserId = val.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random()*900);
      window.myUserId = myUserId;
      window.myUserName = myUserName;
      localStorage.setItem('vc_user_id', myUserId); 
      localStorage.setItem('vc_user_name', myUserName);
      if ($('nameModal')) $('nameModal').hidden = true;
      
      // Ensure explicit DB save on signup
      await update(ref(db, `users/${myUserId}`), {
        id: myUserId, name: myUserName, online: true,
        onlineSince: serverTimestamp(), lastSeen: serverTimestamp()
      });

      await checkMediaPermissions();
      await requestNotificationPermission();
      initPresence();
    };
  }

  if ($('profileBtn')) {
    $('profileBtn').onclick = () => {
      if ($('nameEditArea')) $('nameEditArea').hidden = true;
      if ($('toggleEditNameBtn')) $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
      if ($('profileModal')) $('profileModal').hidden = false;
    };
  }
  if ($('closeProfileBtn')) $('closeProfileBtn').onclick = () => { if ($('profileModal')) $('profileModal').hidden = true; };

  if ($('toggleEditNameBtn')) {
    $('toggleEditNameBtn').onclick = () => {
      const editArea = $('nameEditArea');
      if (!editArea) return;
      const isH = editArea.hidden;
      editArea.hidden = !isH;
      if (!isH) {
        $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
      } else {
        if ($('editNameInput')) {
          $('editNameInput').value = myUserName;
          $('editNameInput').focus();
        }
        $('toggleEditNameBtn').textContent = currentLang === 'hi' ? 'छिपाएँ' : 'Hide';
      }
    };
  }

  if ($('saveEditedNameBtn')) {
    $('saveEditedNameBtn').onclick = async () => {
      const inp = $('editNameInput');
      const val = inp ? inp.value.trim() : ''; 
      if (!val) return;
      myUserName = val;
      window.myUserName = myUserName;
      localStorage.setItem('vc_user_name', myUserName);
      await update(ref(db, `users/${myUserId}`), { name: myUserName });
      updateHeaderTitle();
      if ($('nameEditArea')) $('nameEditArea').hidden = true;
      if ($('toggleEditNameBtn')) $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
      toast(currentLang === 'hi' ? '✅ नाम सुरक्षित कर लिया गया' : '✅ Name saved');
    };
  }

  if ($('recheckPermsBtn')) {
    $('recheckPermsBtn').onclick = async () => {
      if ($('profileModal')) $('profileModal').hidden = true;
      await checkMediaPermissions(true);
      await requestNotificationPermission();
      toast(currentLang === 'hi' ? 'अनुमतियाँ जाँची गईं' : 'Permissions checked');
    };
  }

  if ($('clearChatHistoryBtn')) {
    $('clearChatHistoryBtn').onclick = async () => {
      const confirmMsg = currentLang === 'hi' ? 'क्या आप अपनी सभी चैट हिस्ट्री साफ़ करना चाहते हैं?' : 'Clear all chat history?';
      if (!confirm(confirmMsg)) return;
      try {
        localStorage.removeItem('cached_snippets');
        localStorage.removeItem('cached_unreads');
        latestChatSnippets = {}; unreadCounts = {};
        window.latestChatSnippets = latestChatSnippets; window.unreadCounts = unreadCounts;
        const chatsSnap = await get(ref(db, 'chats'));
        if (chatsSnap.exists()) {
          const allChats = chatsSnap.val() || {};
          const updates = {};
          Object.keys(allChats).forEach(roomId => {
            if (roomId.includes(myUserId)) updates[`chats/${roomId}/messages`] = null;
          });
          if (Object.keys(updates).length > 0) await update(ref(db), updates);
        }
        if (typeof window.renderContacts === 'function') window.renderContacts();
        if ($('chatBody'))$('chatBody').innerHTML = '';
        toast(currentLang === 'hi' ? '✅ सभी चैट साफ़ कर दी गई' : '✅ All chats cleared');
        if ($('profileModal'))$('profileModal').hidden = true;
      } catch(e) {}
    };
  }

  if ($('resetProfileBtn')) {$('resetProfileBtn').onclick = async () => {
      if (!confirm('क्या आप अपनी आईडी हटाकर रीसेट करना चाहते हैं?')) return;
      try { await remove(ref(db, `users/${myUserId}`)); await remove(ref(db, `user_inbox/${myUserId}`)); } catch(e) {}
      localStorage.clear(); location.href = location.pathname;
    };
  }

  if ($('tabChatsBtn')) {
    $('tabChatsBtn').onclick = () => {$('tabChatsBtn').className = 'tab-btn active-chat';
      if ($('tabCallsBtn'))$('tabCallsBtn').className = 'tab-btn';
      if ($('tabChatsContent'))$('tabChatsContent').hidden = false;
      if ($('tabCallsContent'))$('tabCallsContent').hidden = true;
    };
  }

  if ($('tabCallsBtn')) {
    $('tabCallsBtn').onclick = () => {$('tabCallsBtn').className = 'tab-btn active-call';
      if ($('tabChatsBtn'))$('tabChatsBtn').className = 'tab-btn';
      if ($('tabCallsContent'))$('tabCallsContent').hidden = false;
      if ($('tabChatsContent'))$('tabChatsContent').hidden = true;
      renderCallLogs();
    };
  }
}

function handleDeepLinks() {
  try {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'NEW_CHAT_MESSAGE' && data.senderId) {
          if (latestChatSnippets[data.senderId]) {
            latestChatSnippets[data.senderId].text = data.text;
            latestChatSnippets[data.senderId].time = Date.now();
            if (typeof window.renderContacts === 'function') window.renderContacts();
          }
        } else if (data.type === 'OPEN_CHAT' && data.targetId) {
          if (typeof window.openChat === 'function') window.openChat(data.targetId, data.senderName || 'उपयोगकर्ता', true);
        } else if (data.type === 'ACCEPT_CALL' && data.callId) {
          if (!isCallConnected) {
            activeCallId = data.callId;
            window.activeCallId = activeCallId;
            isAudioOnlyCall = !!data.isAudio;
            if (await acquireCallMedia(isAudioOnlyCall)) {
              if (typeof window.joinCallSession === 'function') window.joinCallSession();
            }
          }
        }
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const openChatId = urlParams.get('chatTargetId');
    const openChatName = urlParams.get('chatTargetName');
    const acceptCallId = urlParams.get('acceptCallId');
    const isAudioUrl = urlParams.get('isAudio') === 'true';

    if (openChatId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => { if (typeof window.openChat === 'function') window.openChat(openChatId, openChatName || 'उपयोगकर्ता', true); }, 800);
    } else if (acceptCallId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(async () => {
        if (!isCallConnected) {
          activeCallId = acceptCallId;
          window.activeCallId = activeCallId;
          isAudioOnlyCall = isAudioUrl;
          if (await acquireCallMedia(isAudioOnlyCall)) {
             if (typeof window.joinCallSession === 'function') window.joinCallSession();
          }
        }
      }, 800);
    }
  } catch (e) {}
}

async function initApp() {
  try {
    initCoreDomEvents();
    applyLanguage(currentLang);
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
