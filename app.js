/* =========================================================================
   🟢🟢🟢 [PART 1 OF 3 — START (शुरू): app.js v1.24.1] 🟢🟢🟢
   Configuration, State, Native Bridge, Ghost-User Fix, Presence & Lobby
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, onChildAdded, push, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const CURRENT_APP_VERSION = "1.24.1";
const GITHUB_APK_URL = "https://github.com/Neerajthegreat192/neerajthegreat192.github.io/releases/latest/download/app-release.apk";

try {
  const cachedJs = localStorage.getItem('ota_cached_js');
  const cachedCss = localStorage.getItem('ota_cached_css');
  const cachedVer = localStorage.getItem('ota_active_ver');

  if (cachedVer && (!cachedJs || !cachedCss || cachedJs.trim() === '' || cachedCss.trim() === '')) {
    localStorage.removeItem('ota_cached_js');
    localStorage.removeItem('ota_cached_css');
    localStorage.removeItem('ota_active_ver');
  }
} catch(e) {}

// Dynamic Capacitor Helpers
function getCapacitor() {
  return window.Capacitor || null;
}

function getPushPlugin() {
  return window.Capacitor?.Plugins?.PushNotifications || null;
}

function getAppPlugin() {
  return window.Capacitor?.Plugins?.App || null;
}

function isNativeApp() {
  const cap = getCapacitor();
  if (!cap) return false;
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform();
  if (typeof cap.getPlatform === 'function') return cap.getPlatform() !== 'web';
  return false;
}

// --- पॉइंट #4: Android PiP Mode से वापस आने या जाने पर UI को एडजस्ट करने का ग्लोबल फंक्शन ---
window.onPipModeChanged = function(isInPipMode) {
  if (isInPipMode) {
    document.body.classList.add('in-pip-mode');
  } else {
    document.body.classList.remove('in-pip-mode');
  }
};

// Firebase & WebRTC Setup
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
const lobbyScreen = $('lobby'), callScreen = $('call'), chatScreen = $('chatScreen');
const contactsList = $('contactsList'), callLogsList = $('callLogsList'), myHeaderName = $('myHeaderName'), adminBtn = $('adminBtn');
const incomingDialog = $('incomingDialog'), outgoingDialog = $('outgoingDialog');
const callTimer = $('callTimer'), controlsBar = $('controlsBar'), topPill = $('topPill');
const remoteGrid = $('remoteGrid'), localVideo = $('localVideo'), pipWrap = $('pipWrap');
const pipRestoreBtn = $('pipRestoreBtn');
const chatInput = $('chatInput'), actionBtn = $('actionBtn'), micSvg = $('micSvg'), sendSvg = $('sendSvg');
const networkBanner = $('networkBanner'), searchInput = $('searchInput');

// ✅ FIX: नाम लिखने वाले बॉक्स में हिंदी कीबोर्ड और सिंगल-टैप अनलॉक करें
['nameInput', 'editNameInput'].forEach(id => {
  const el = $(id);
  if (el) {
    el.removeAttribute('autocorrect');
    el.removeAttribute('spellcheck');
    el.removeAttribute('autocapitalize');
    el.removeAttribute('autocomplete');
  }
});

// Translations
let currentLang = localStorage.getItem('vc_lang') || 'hi';
const translations = {
  hi: {
    pageTitle: "VideoCallApp", welcome: "स्वागत है!", enterName: "कॉलिंग एवं चैट शुरू करने के लिए अपना नाम लिखें",
    btnProceed: "आगे बढ़ें", chkUpdate: "🔄 अपडेट चेक करें", settingsTitle: "⚙️ सेटिंग्स एवं प्रोफ़ाइल",
    btnChangeName: "✏️ नाम बदलें / अपडेट करें", btnRecheckPerm: "🛡️ अनुमतियाँ पुनः जांचें", btnClearChat: "🗑️ सभी चैट साफ़ करें",
    btnResetProfile: "आईडी हटाएं / रीसेट करें", btnCancel: "✕ रद्द करें", searchPlaceholder: "संपर्क या चैट खोजें...",
    tabChats: "💬 चैट", tabCalls: "📞 कॉल", inputPlaceholder: "संदेश लिखें...", incomingSub: "बात करने के लिए कॉल उठाएँ",
    reject: "काटें", accept: "उठाएँ", cancelCall: "रद्द करें", mic: "माइक", cam: "कैमरा", speaker: "स्पीकर", flip: "पलटें",
    hang: "काटें", online: "ऑनलाइन", offline: "ऑफलाइन", typing: "लिख रहे हैं...",
    netOnline: "हाई", netMedium: "मीडियम",
    sending: "भेज रहे हैं...", receiving: "डाउनलोड हो रहा है...", waiting: "इंतज़ार...",
    tapToDownload: "सहेजा गया", downloading: "डाउनलोड हो रहा है", cancel: "रद्द करें",
    fileTooBig: "फाइल बहुत बड़ी है", notConnected: "प्राप्तकर्ता ऑफलाइन है", transferComplete: "डाउनलोड पूरा हुआ",
    phoneContacts: "📱 फ़ोन के संपर्क", searchContact: "नाम या नंबर खोजें...", sendSelected: "चयनित भेजें"
  },
  en: {
    pageTitle: "VideoCallApp", welcome: "Welcome!", enterName: "Enter your name to start calling and chatting",
    btnProceed: "Continue", chkUpdate: "🔄 Check New Update (OTA)", settingsTitle: "⚙️ Settings & Profile",
    btnChangeName: "✏️ Change / Update Name", btnRecheckPerm: "🛡️ Recheck Permissions", btnClearChat: "🗑️ Clear All Chats",
    btnResetProfile: "Delete / Reset ID", btnCancel: "✕ Cancel", searchPlaceholder: "Search contacts or chats...",
    tabChats: "💬 Chats", tabCalls: "📞 Calls", inputPlaceholder: "Type a message...", incomingSub: "Tap to answer the call",
    reject: "Decline", accept: "Answer", cancelCall: "Cancel", mic: "Mic", cam: "Camera", speaker: "Speaker", flip: "Flip",
    hang: "End", online: "Online", offline: "Offline", typing: "typing...",
    netOnline: "High", netMedium: "Medium",
    sending: "Sending...", receiving: "Downloading...", waiting: "Waiting...",
    tapToDownload: "Saved", downloading: "Downloading", cancel: "Cancel",
    fileTooBig: "File too big", notConnected: "Receiver is offline", transferComplete: "Download complete",
    phoneContacts: "📱 Phone Contacts", searchContact: "Search name or number...", sendSelected: "Send Selected"
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('vc_lang', lang);
  if ($('langSelect')) $('langSelect').value = lang;
  const t = translations[lang];
  $('pageTitle').textContent = t.pageTitle;
  $('txtWelcome').textContent = t.welcome;
  $('txtEnterName').textContent = t.enterName;
  $('saveNameBtn').textContent = t.btnProceed;
  $('checkUpdateBtn').textContent = t.chkUpdate;
  $('txtSettingsTitle').textContent = t.settingsTitle;
  $('toggleEditNameBtn').textContent = t.btnChangeName;
  $('recheckPermsBtn').textContent = t.btnRecheckPerm;
  $('clearChatHistoryBtn').textContent = t.btnClearChat;
  $('resetProfileBtn').textContent = t.btnResetProfile;
  $('closeProfileBtn').textContent = t.btnCancel;
  $('searchInput').placeholder = t.searchPlaceholder;
  $('tabChatsBtn').textContent = t.tabChats;
  $('tabCallsBtn').textContent = t.tabCalls;
  $('chatInput').placeholder = t.inputPlaceholder;
  $('incomingSubText').textContent = t.incomingSub;
  $('txtReject').textContent = t.reject;
  $('txtAccept').textContent = t.accept;
  $('txtCancelCall').textContent = t.cancelCall;
  $('lblMic').textContent = t.mic;
  $('lblCam').textContent = t.cam;
  $('lblSpeaker').textContent = t.speaker;
  $('lblHang').textContent = t.hang;
  renderContacts();
}
if ($('langSelect')) $('langSelect').onchange = (e) => applyLanguage(e.target.value);

// User & Call States
let myUserId = localStorage.getItem('vc_user_id') || '';
let myUserName = localStorage.getItem('vc_user_name') || '';
let myFcmToken = localStorage.getItem('vc_fcm_token') || null;

let allOnlineUsers = {};
let latestChatSnippets = {};
let unreadCounts = {};
let allCallLogs = [];

let pinnedChats = {};
let archivedChats = {};
let currentTheme = localStorage.getItem('vc_theme') || 'dark';

try {
  allOnlineUsers = JSON.parse(localStorage.getItem('cached_users') || '{}');
  latestChatSnippets = JSON.parse(localStorage.getItem('cached_snippets') || '{}');
  unreadCounts = JSON.parse(localStorage.getItem('cached_unreads') || '{}');
  allCallLogs = JSON.parse(localStorage.getItem('cached_call_logs') || '[]');
  if (myUserId) {
    pinnedChats = JSON.parse(localStorage.getItem('vc_pinned_' + myUserId) || '{}');
    archivedChats = JSON.parse(localStorage.getItem('vc_archived_' + myUserId) || '{}');
  }
} catch(e) {}

function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('vc_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

if (myUserName) {
  myHeaderName.textContent = myUserName;
  adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
}

let localStream = null, activeCallId = null;
let currentChatTargetId = null, currentChatTargetName = null;
let currentCallType = 'outgoing', currentCallTargetId = null, currentCallTargetName = null;

let isCaller = false, callStartTime = 0, timerTimer = null, facingMode = 'user';
let micEnabled = true, camEnabled = true, speakerEnabled = true, isCallConnected = false;
let isAudioOnlyCall = false;
let autoHideTimer = null, peerConnections = {}, unsubs = [];
let callSessionUnsub = null, callTimeoutTimer = null, selfStatusUnsub = null;
let targetStatusUnsub = null;
const MAX_CALL_MEMBERS = 4;
let qualityLevel = 'high', qualityTimer = null, wakeLock = null;
let isHangingUp = false, typingTimeout = null;
let ignoreBackUntil = 0;
let callJoinedViaDirectAccept = false;

// Media States
let activeTransfers = {};
let mediaDataChannels = {};
let mediaPeerConnections = {};
let incomingChunks = {};
let localFileMemoryCache = {};
let mediaViewerState = { mediaId: null, dataUrl: null, mimeType: null, fileName: null };
const CHUNK_SIZE = 16 * 1024;
const DIRECT_SEND_MAX_SIZE = 3.5 * 1024 * 1024;
const BUFFER_HIGH_THRESHOLD = 8 * 1024 * 1024;
const BUFFER_LOW_THRESHOLD = 1 * 1024 * 1024;

let permissionCallbackCounter = 0;
let permissionCallbacks = {};
let splashHidden = false;

function hideSplashScreen() {
  if (splashHidden) return;
  splashHidden = true;
  const splash = $('splashScreen');
  if (!splash) return;
  splash.classList.add('hide');
  setTimeout(() => {
    if (splash.parentNode) splash.parentNode.removeChild(splash);
  }, 500);
}

function stopNativeRinging() {
  if (window.AndroidAudio && typeof window.AndroidAudio.stopNativeRinging === 'function') {
    try { window.AndroidAudio.stopNativeRinging(); } catch(e) {}
  }
}

function closeIfLocked() {
  if (window.AndroidAudio && typeof window.AndroidAudio.closeIfLocked === 'function') {
    try { window.AndroidAudio.closeIfLocked(); } catch(e) {}
  }
}

function setHardwareSpeaker(enableSpeaker) {
  speakerEnabled = enableSpeaker;
  if (window.AndroidAudio && typeof window.AndroidAudio.setSpeakerphone === 'function') {
    try { window.AndroidAudio.setSpeakerphone(enableSpeaker); } catch(e) {}
  }
  remoteGrid.querySelectorAll('video').forEach(v => { v.muted = false; });
  $('speakerBtn').classList.toggle('off', !speakerEnabled);
}

function resetHardwareAudio() {
  if (window.AndroidAudio && typeof window.AndroidAudio.resetAudioMode === 'function') {
    try { window.AndroidAudio.resetAudioMode(); } catch(e) {}
  }
}

function isDeviceLocked() {
  if (window.AndroidAudio && typeof window.AndroidAudio.isDeviceLocked === 'function') {
    try { return window.AndroidAudio.isDeviceLocked(); } catch(e) {}
  }
  return false;
}

async function loadPhoneContacts() {
  return new Promise((resolve) => {
    if (!isNativeApp()) { resolve([]); return; }
    if (window.AndroidAudio && typeof window.AndroidAudio.getAllPhoneContacts === 'function') {
      try {
        const json = window.AndroidAudio.getAllPhoneContacts();
        const parsed = JSON.parse(json || '[]');
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch(e) { resolve([]); }
    } else { resolve([]); }
  });
}

// ✅ FIX: फ़ाइल का सही एक्सटेंशन सुनिश्चित करें ताकि Downloads फोल्डर में इमेज/फ़ाइल सही से खुले
function ensureFileExtension(fileName, mimeType, base64Data) {
  let name = (fileName || '').trim() || ('media_' + Date.now());
  if (name.includes('.')) return name;
  let mime = (mimeType || '').toLowerCase();
  if (!mime && base64Data && base64Data.startsWith('data:')) {
    mime = base64Data.substring(5, base64Data.indexOf(';')).toLowerCase();
  }
  if (mime.includes('png')) return name + '.png';
  if (mime.includes('gif')) return name + '.gif';
  if (mime.includes('webp')) return name + '.webp';
  if (mime.startsWith('image/')) return name + '.jpg';
  if (mime.startsWith('video/')) return name + '.mp4';
  if (mime.startsWith('audio/')) return name + '.webm';
  if (mime.includes('pdf')) return name + '.pdf';
  return name + '.jpg';
}

function autoSaveMediaToDownloads(msgId, base64Data, fileName, mimeType) {
  if (!base64Data || !msgId) return;
  const cacheKey = 'auto_saved_' + msgId;
  if (localStorage.getItem(cacheKey)) return;

  const base64Only = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const safeFileName = ensureFileExtension(fileName, mimeType, base64Data);
  let saved = false;

  const uri = saveMediaViaNative(base64Only, safeFileName, mimeType || 'application/octet-stream');
  if (uri) saved = true;

  if (!saved && !isNativeApp()) {
    try {
      const a = document.createElement('a');
      a.href = base64Data;
      a.download = safeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      saved = true;
    } catch(e) {}
  }

  if (saved) {
    localStorage.setItem(cacheKey, 'true');
    toast(currentLang === 'hi' ? '📥 फ़ाइल Downloads में स्वतः सेव हो गई' : '📥 File auto-saved to Downloads');
  }
}

function saveMediaViaNative(base64Data, fileName, mimeType) {
  const cleanBase64 = base64Data && base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const safeFileName = ensureFileExtension(fileName, mimeType, base64Data);
  // Android 10+ में Downloads/VideoCallApp फोल्डर में बिना रुकावट सेव करने के लिए MediaStore.Downloads का उपयोग करें
  const downloadCompatibleMime = 'application/octet-stream';

  if (window.AndroidAudio && typeof window.AndroidAudio.saveMediaToDownloads === 'function') {
    try {
      const res = window.AndroidAudio.saveMediaToDownloads(cleanBase64, safeFileName, downloadCompatibleMime);
      if (res && String(res).trim() !== '') return res;
    } catch(e) {}
  }
  if (window.AndroidBridge?.saveMediaViaService) {
    try {
      window.AndroidBridge.saveMediaViaService(cleanBase64, safeFileName, downloadCompatibleMime);
      return 'service-started';
    } catch(e) {}
  }
  if (window.AndroidAudio?.saveMediaViaService) {
    try {
      window.AndroidAudio.saveMediaViaService(cleanBase64, safeFileName, downloadCompatibleMime);
      return 'service-started';
    } catch(e) {}
  }
  return '';
}

function openContactVcfNative(base64Vcf, fileName) {
  if (window.AndroidAudio && typeof window.AndroidAudio.openContactVcf === 'function') {
    try {
      window.AndroidAudio.openContactVcf(base64Vcf, fileName);
      return true;
    } catch(e) { return false; }
  }
  return false;
}

function requestAllPermissionsNative() {
  return new Promise((resolve) => {
    if (!window.AndroidAudio || typeof window.AndroidAudio.requestAllPermissions !== 'function') {
      requestAllPermissionsWeb().then(resolve);
      return;
    }

    const cbId = 'perm_' + (++permissionCallbackCounter);
    permissionCallbacks[cbId] = resolve;

    try {
      window.AndroidAudio.requestAllPermissions(cbId);
    } catch(e) {
      delete permissionCallbacks[cbId];
      resolve({ allGranted: false, denied: ['unknown'] });
    }
  });
}

window.__onPermissionResult = function(callbackId, allGranted, deniedList) {
  try {
    const cb = permissionCallbacks[callbackId];
    if (cb) {
      delete permissionCallbacks[callbackId];
      const denied = deniedList ? deniedList.split(',').filter(Boolean) : [];
      cb({ allGranted, denied });
    }
  } catch(e) {}
};

async function requestAllPermissionsWeb() {
  const denied = [];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach(t => t.stop());
  } catch(e) { denied.push('camera_or_mic'); }

  try {
    if ('Notification' in window && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') denied.push('notification');
    }
  } catch(e) { denied.push('notification'); }

  return { allGranted: denied.length === 0, denied };
}

function hasAllPermissionsNative() {
  if (window.AndroidAudio && typeof window.AndroidAudio.hasAllPermissions === 'function') {
    try { return window.AndroidAudio.hasAllPermissions(); } catch(e) {}
  }
  return false;
}

function openAppSettingsNative() {
  if (window.AndroidAudio && typeof window.AndroidAudio.openAppSettings === 'function') {
    try { window.AndroidAudio.openAppSettings(); } catch(e) {}
  } else {
    toast(currentLang === 'hi' ? 'सेटिंग्स में जाकर अनुमतियाँ दें' : 'Please grant permissions in settings');
  }
}

// Push Token Syncing
async function waitForPushPlugin(maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    const push = getPushPlugin();
    if (push) return push;
    await new Promise(r => setTimeout(r, 250));
  }
  return null;
}

async function saveFcmTokenToFirebase(token) {
  try {
    if (!token) return;
    myFcmToken = token;
    localStorage.setItem('vc_fcm_token', token);

    const uid = myUserId || localStorage.getItem('vc_user_id');
    if (uid) {
      await update(ref(db, `users/${uid}`), { fcmToken: token });
      if (window.AndroidBridge?.syncUser) {
        try { window.AndroidBridge.syncUser(uid); } catch(e){}
      }
      if (window.AndroidAudio?.setUserIdForFcm) {
        try { window.AndroidAudio.setUserIdForFcm(uid); } catch(e){}
      }
    }
  } catch(e) {}
}

async function setupNativePushListeners() {
  if (!isNativeApp()) return;

  const push = await waitForPushPlugin(15);
  if (!push) return;

  if (window.__pushListenersRegistered) return;
  window.__pushListenersRegistered = true;

  push.addListener('registration', async (token) => {
    if (token && token.value) {
      await saveFcmTokenToFirebase(token.value);
    }
  });

  push.addListener('pushNotificationReceived', (notification) => {
    const data = notification.data || {};
    if (data.callId && data.callId !== 'null' && String(data.callId).trim() !== '') {
      handleIncomingCallNotification(data, false);
    }
  });

  push.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data || {};
    const rawCallId = data?.callId;
    const isRealCall = rawCallId && rawCallId !== 'null' && rawCallId !== 'undefined' && String(rawCallId).trim() !== '';

    if (isRealCall) {
      if (action.actionId === 'ACTION_ACCEPT' || action.actionId === 'accept') {
        handleDirectAcceptCall(rawCallId);
      } else if (action.actionId === 'ACTION_REJECT' || action.actionId === 'reject') {
        stopAllCallTones();
        if (activeCallId) update(ref(db, `call_sessions/${activeCallId}`), { status: 'rejected' }).catch(()=>{});
        closeIfLocked();
      } else {
        handleIncomingCallNotification(data, false);
      }
    } else if (data && data.chatTargetId) {
      openChat(data.chatTargetId, data.chatTargetName || 'उपयोगकर्ता');
    }
  });

  try {
    let perm = await push.checkPermissions();
    if (perm.receive !== 'granted') perm = await push.requestPermissions();
    if (perm.receive === 'granted') await push.register();
  } catch(e) {}

  const cachedToken = localStorage.getItem('vc_fcm_token');
  if (cachedToken && myUserId) {
    await saveFcmTokenToFirebase(cachedToken);
  }
}

// Sounds & Ringtones
let audioCtx = null, outgoingRingTimer = null;

function ensureAudioContext() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
  } catch(e) { return null; }
}

function playMessageTickSound() {
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

function playCheerSound() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.25, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + idx * 0.08); osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch(e) {}
}

function playOopsSound() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.32);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);
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
function startIncomingRingtone() {}
function stopIncomingRingtone() { stopNativeRinging(); }
function stopAllCallTones() { stopOutgoingCallTone(); stopNativeRinging(); }
document.addEventListener('pointerdown', () => { ensureAudioContext(); }, {passive:true});

// Utilities
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function safeName(n) { return String(n||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function isNeerajBadola(n) { const s = (n||'').toLowerCase().replace(/\s+/g,' ').trim(); return (s.includes('neeraj')&&s.includes('badola'))||(s.includes('नीरज')&&s.includes('बडोला')); }
function formatClockTime(ts) { if (!ts) return ''; return new Date(Number(ts)).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true }); }
function formatLastSeen(ts) { if (!ts) return ''; return `Last seen ${formatClockTime(ts)}`; }
function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}
function getFileIcon(mimeType, fileName) {
  if (!mimeType) mimeType = '';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.startsWith('video/')) return '🎥';
  if (mimeType.startsWith('audio/')) return '🎵';
  if (mimeType === 'application/pdf') return '📕';
  if (mimeType.includes('word') || (fileName && fileName.endsWith('.doc'))) return '📘';
  if (mimeType.includes('excel') || (fileName && fileName.endsWith('.xls'))) return '📗';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
  return '📎';
}

function clearOngoingCallNotification() {
  stopNativeRinging();
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
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, frameRate: { ideal: 30, min: 20 } }
        });
        const vt = vStream.getVideoTracks()[0];
        localStream.addTrack(vt);
      } catch(e) {}
    }
    localVideo.srcObject = localStream;
    return localStream;
  }
  try {
    const constraints = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };
    if (!audioOnly) {
      constraints.video = { facingMode: { ideal: facingMode }, width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, frameRate: { ideal: 30, min: 20 } };
    } else {
      constraints.video = false;
    }
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = localStream;
    return localStream;
  } catch(e) {
    toast(currentLang === 'hi' ? 'कैमरा/माइक अनुमति उपलब्ध नहीं है' : 'Camera/Mic permission unavailable');
    return null;
  }
}

async function requestNotificationPermission() {
  if (isNativeApp()) {
    const push = await waitForPushPlugin(10);
    if (!push) return;
    try {
      let perm = await push.checkPermissions();
      if (perm.receive !== 'granted') perm = await push.requestPermissions();
      if (perm.receive === 'granted') await push.register();
    } catch(e) {}
    return;
  }

  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;
    await navigator.serviceWorker.register('./firebase-messaging-sw.js', { updateViaCache: 'none' });
    const swReg = await navigator.serviceWorker.ready;
    const { getMessaging, getToken } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging.js");
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
    if (token) {
      await saveFcmTokenToFirebase(token);
    }
  } catch(err) {}
}

async function runFullPermissionFlow() {
  toast(currentLang === 'hi' ? '🛡️ अनुमतियाँ जाँची जा रही हैं...' : '🛡️ Requesting permissions...');
  const result = await requestAllPermissionsNative();
  try { await requestNotificationPermission(); } catch(e) {}
  return result.allGranted;
}

function handleIncomingCallNotification(data, isFromForegroundListener = false) {
  if (!data || !data.callId) return;
  if (activeCallId === data.callId && !incomingDialog.hidden) return;

  activeCallId = data.callId;
  currentCallType = 'incoming';
  currentCallTargetId = data.callerId || '';
  currentCallTargetName = data.callerName || 'कोई';
  isAudioOnlyCall = data.audioOnly === true || data.audioOnly === 'true' || data.audioOnly === '1';

  lobbyScreen.hidden = true;
  chatScreen.hidden = true;
  callScreen.hidden = true;

  $('incomingName').textContent = currentCallTargetName + (isAudioOnlyCall ? (currentLang==='hi'?' (ऑडियो कॉल)...':' (Audio Call)...') : (currentLang==='hi'?' (वीडियो कॉल)...':' (Video Call)...'));
  incomingDialog.hidden = false;

  update(ref(db, `call_sessions/${activeCallId}`), { status: 'ringing' }).catch(()=>{});
}

async function handleDirectAcceptCall(callId) {
  try {
    stopAllCallTones();
    const sSnap = await get(ref(db, `call_sessions/${callId}`));
    const sData = sSnap.val();
    if (!sData || sData.status === 'ended') {
      toast(currentLang === 'hi' ? 'कॉल समाप्त हो चुकी है' : 'Call already ended');
      closeIfLocked();
      return;
    }
    activeCallId = callId;
    currentCallType = 'incoming';
    currentCallTargetId = sData.callerId || '';
    currentCallTargetName = sData.callerName || 'उपयोगकर्ता';
    isAudioOnlyCall = !!sData.audioOnly;

    callJoinedViaDirectAccept = true;
    remove(ref(db, `user_inbox/${myUserId}`)).catch(()=>{});

    incomingDialog.hidden = true;
    lobbyScreen.hidden = true;
    chatScreen.hidden = true;

    setTimeout(async () => {
      if (await acquireCallMedia(isAudioOnlyCall)) {
        joinCallSession();
      }
    }, 300);
  } catch(e) {}
}

function checkNativeLaunchIntent() {
  if (window.AndroidAudio && typeof window.AndroidAudio.getLaunchCallAction === 'function') {
    const action = window.AndroidAudio.getLaunchCallAction();
    const callId = window.AndroidAudio.getLaunchCallId();
    const callerName = (typeof window.AndroidAudio.getCallerName === 'function') ? window.AndroidAudio.getCallerName() : 'उपयोगकर्ता';
    const audioOnly = (typeof window.AndroidAudio.isAudioOnly === 'function') ? window.AndroidAudio.isAudioOnly() : false;

    if (action === "ACCEPT" && callId) {
      window.AndroidAudio.clearLaunchCallAction();
      stopAllCallTones();
      handleDirectAcceptCall(callId);
      return;
    } else if (action === "SHOW_INCOMING" && callId) {
      window.AndroidAudio.clearLaunchCallAction();
      handleIncomingCallNotification({ callId, callerName, audioOnly }, false);
      return;
    } else if (action === "REJECT" && callId) {
      window.AndroidAudio.clearLaunchCallAction();
      stopAllCallTones();
      update(ref(db, `call_sessions/${callId}`), { status: 'rejected' }).catch(()=>{});
      closeIfLocked();
      return;
    }
  }

  if (window.AndroidAudio && typeof window.AndroidAudio.getLaunchChatTargetId === 'function') {
    const chatTargetId = window.AndroidAudio.getLaunchChatTargetId();
    const chatTargetName = window.AndroidAudio.getLaunchChatTargetName();
    if (chatTargetId) {
      window.AndroidAudio.clearLaunchChatIntent();
      setTimeout(() => {
        openChat(chatTargetId, chatTargetName || 'उपयोगकर्ता');
      }, 600);
    }
  }
}

function updateHeaderTitle() {
  myHeaderName.textContent = myUserName || (currentLang === 'hi' ? 'एचडी कॉलिंग' : 'HD Calling');
  adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
}

// --- Call Audio Tones Manager ---
const CallAudioManager = {
  connecting: new Audio('sounds/connecting.mp3'),
  ringing: new Audio('sounds/ringing.mp3'),
  busy: new Audio('sounds/busy.mp3'),
  end: new Audio('sounds/end.mp3'),
  
  init() {
    this.connecting.loop = true;
    this.ringing.loop = true;
    this.busy.loop = false;
    this.end.loop = false;
  },

  stopAll() {
    this.connecting.pause(); this.connecting.currentTime = 0;
    this.ringing.pause(); this.ringing.currentTime = 0;
    this.busy.pause(); this.busy.currentTime = 0;
  },

  playConnecting() {
    this.stopAll();
    this.connecting.play().catch(e => console.log("Audio play blocked", e));
  },

  playRinging() {
    this.stopAll();
    this.ringing.play().catch(e => console.log("Audio play blocked", e));
  },

  playBusy() {
    this.stopAll();
    this.busy.play().catch(e => console.log("Audio play blocked", e));
    setTimeout(() => this.stopAll(), 3000); 
  },

  playEnd() {
    this.stopAll();
    this.end.play().catch(e => console.log("Audio play blocked", e));
  }
};

CallAudioManager.init(); // इसे शुरू करना ज़रूरी है

// ===================================================
// ✅ PRESENCE & LISTENERS (GHOST USER & OTA WIPE FIX)
// ===================================================
let connectedUnsub = null;
let usersListUnsub = null;
let activePresenceUserRef = null;
let activePresenceInboxRef = null;

function clearUserSessionOnly() {
  const keysToRemove = [
    'vc_user_id',
    'vc_user_name',
    'vc_fcm_token',
    'cached_users',
    'cached_snippets',
    'cached_unreads',
    'cached_call_logs'
  ];
  keysToRemove.forEach(k => localStorage.removeItem(k));
}

async function cleanupOldPresence() {
  if (connectedUnsub) { connectedUnsub(); connectedUnsub = null; }
  if (selfStatusUnsub) { selfStatusUnsub(); selfStatusUnsub = null; }
  if (activePresenceUserRef) {
    try { await onDisconnect(activePresenceUserRef).cancel(); } catch(e) {}
    activePresenceUserRef = null;
  }
  if (activePresenceInboxRef) {
    try { await onDisconnect(activePresenceInboxRef).cancel(); } catch(e) {}
    activePresenceInboxRef = null;
  }
}

async function initPresence() {
  if (!myUserId || !myUserName) return;
  await cleanupOldPresence();

  updateHeaderTitle();
  const currentUid = myUserId;
  const userRef = ref(db, `users/${currentUid}`);
  const inboxRef = ref(db, `user_inbox/${currentUid}`);
  const connectedRef = ref(db, '.info/connected');

  activePresenceUserRef = userRef;
  activePresenceInboxRef = inboxRef;

  await onDisconnect(userRef).update({
    online: false, lastSeen: serverTimestamp(), onlineSince: null,
    activeCallId: null, isBusy: false, typingTo: null
  }).catch(()=>{});
  await onDisconnect(inboxRef).remove().catch(()=>{});

  await update(userRef, {
    id: currentUid, name: myUserName, online: true,
    onlineSince: serverTimestamp(), lastSeen: serverTimestamp(), activeCallId: null
  });

  if (myFcmToken) {
    await update(userRef, { fcmToken: myFcmToken }).catch(()=>{});
  }

  if (window.AndroidBridge?.syncUser) {
    try { window.AndroidBridge.syncUser(currentUid); } catch(e){}
  }

  connectedUnsub = onValue(connectedRef, async snap => {
    if (!myUserId || myUserId !== currentUid) return;

    if (snap.val() === true) {
      networkBanner.hidden = true;
      await onDisconnect(userRef).update({ online: false, lastSeen: serverTimestamp(), onlineSince: null, activeCallId: null, isBusy: false, typingTo: null }).catch(()=>{});
      await onDisconnect(inboxRef).remove().catch(()=>{});
      await update(userRef, { id: currentUid, name: myUserName, online: true, onlineSince: serverTimestamp() }).catch(()=>{});
    } else {
      networkBanner.hidden = false;
    }
  });

  if (usersListUnsub) usersListUnsub();
  usersListUnsub = onValue(ref(db, 'users'), snap => {
    allOnlineUsers = snap.val() || {};
    Object.keys(allOnlineUsers).forEach(uid => {
      if (!allOnlineUsers[uid] || !allOnlineUsers[uid].name) {
        delete allOnlineUsers[uid];
      }
    });
    try { localStorage.setItem('cached_users', JSON.stringify(allOnlineUsers)); } catch(e) {}
    renderContacts();
    renderOnlineStrip();
  });

  listenSelfAccountStatus();
  listenForIncoming();
  listenForLatestChatPreviews();
  listenForCallLogs();
  
  if (typeof listenForIncomingMediaSignals === 'function') {
    listenForIncomingMediaSignals();
  }
}

function listenSelfAccountStatus() {
  if (selfStatusUnsub) selfStatusUnsub();
  const watchedUid = myUserId;
  if (!watchedUid) return;

  selfStatusUnsub = onValue(ref(db, `users/${watchedUid}`), async (snap) => {
    if (!snap.exists() && myUserId === watchedUid) {
      await cleanupOldPresence();
      hangup(true);
      clearUserSessionOnly();
      myUserId = ''; myUserName = '';
      myHeaderName.textContent = '...';
      chatScreen.hidden = true; callScreen.hidden = true; lobbyScreen.hidden = true;
      $('nameInput').value = '';$('nameModal').hidden = false;
      toast(currentLang === 'hi' ? '⚠️ आपकी आईडी रीसेट हो गई है।' : '⚠️ Your ID was reset.');
    }
  });
}

function checkUser() {
  lobbyScreen.hidden = true;
  chatScreen.hidden = true;
  callScreen.hidden = true;

  if (!myUserId || !myUserName) {
    $('nameModal').hidden = false;
    setTimeout(hideSplashScreen, 300);
    return;
  }

  const permsDone = localStorage.getItem('perms_done_v2') === 'true';
  const alreadyHasAll = isNativeApp() ? hasAllPermissionsNative() : true;

  if (!permsDone || !alreadyHasAll) {
    $('nameModal').hidden = true;
    $('permNoticeModal').hidden = false;
    setTimeout(hideSplashScreen, 300);
    return;
  }

  $('nameModal').hidden = true;
  $('permNoticeModal').hidden = true;
  lobbyScreen.hidden = false;
  setTimeout(hideSplashScreen, 300);
  initPresence();
}

// ✅ FIX: 'आगे बढ़ें' पर क्लिक करते ही कीबोर्ड तुरंत बंद (blur) होगा
$('saveNameBtn').onclick = async () => {
  const nameEl = $('nameInput');
  const val = nameEl.value.trim();
  if (!val) return;
  nameEl.blur();
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  myUserName = val;
  myUserId = val.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random()*900);
  localStorage.setItem('vc_user_id', myUserId);
  localStorage.setItem('vc_user_name', myUserName);

  if (window.AndroidBridge?.syncUser) {
    try { window.AndroidBridge.syncUser(myUserId); } catch(e){}
  }

  $('nameModal').hidden = true;
  $('permNoticeModal').hidden = false;
  setTimeout(async () => {
    try { await requestNotificationPermission(); } catch(e) {}
  }, 500);
};

$('grantPermsBtn').onclick = async () => {$('permNoticeModal').hidden = true;
  await runFullPermissionFlow();
  localStorage.setItem('perms_done_v2', 'true');
  lobbyScreen.hidden = false;
  initPresence();
};

$('profileBtn').onclick = () => {$('nameEditArea').hidden = true;
  $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  $('profileModal').hidden = false;
};
$('closeProfileBtn').onclick = () => {$('profileModal').hidden = true; };

$('toggleEditNameBtn').onclick = () => {
  const isH = $('nameEditArea').hidden;
  $('nameEditArea').hidden = !isH;
  if (!isH) {
    $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  } else {
    $('editNameInput').value = myUserName;
    $('editNameInput').focus();$('toggleEditNameBtn').textContent = currentLang === 'hi' ? 'छिपाएँ' : 'Hide';
  }
};

$('saveEditedNameBtn').onclick = async () => {
  const editEl = $('editNameInput');
  const val = editEl.value.trim(); if (!val) return;
  editEl.blur();
  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  myUserName = val;
  localStorage.setItem('vc_user_name', myUserName);
  await update(ref(db, `users/${myUserId}`), { name: myUserName });
  updateHeaderTitle();
  $('nameEditArea').hidden = true;
  $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  toast(currentLang === 'hi' ? '✅ नाम सुरक्षित कर लिया गया' : '✅ Name saved');
};

$('recheckPermsBtn').onclick = async () => {$('profileModal').hidden = true;
  localStorage.removeItem('perms_done_v2');
  await runFullPermissionFlow();
  localStorage.setItem('perms_done_v2', 'true');
  toast(currentLang === 'hi' ? '✅ अनुमतियाँ जाँची गईं' : '✅ Permissions checked');
};

$('clearChatHistoryBtn').onclick = async () => {
  const confirmMsg = currentLang === 'hi' ? 'क्या आप अपनी सभी चैट हिस्ट्री साफ़ करना चाहते हैं?' : 'Clear all chats?';
  if (!confirm(confirmMsg)) return;
  try {
    localStorage.removeItem('cached_snippets');
    localStorage.removeItem('cached_unreads');
    latestChatSnippets = {}; unreadCounts = {};
    const chatsSnap = await get(ref(db, 'chats'));
    if (chatsSnap.exists()) {
      const allChats = chatsSnap.val() || {};
      const updates = {};
      Object.keys(allChats).forEach(roomId => {
        if (roomId.includes(myUserId)) updates[`chats/${roomId}/messages`] = null;
      });
      if (Object.keys(updates).length > 0) await update(ref(db), updates);
    }
    renderContacts();
    if (!chatScreen.hidden) $('chatBody').innerHTML = '';
    toast(currentLang === 'hi' ? '✅ सभी चैट साफ़ कर दी गई' : '✅ All chats cleared');
    $('profileModal').hidden = true;
  } catch(e) { toast('त्रुटि: चैट साफ नहीं हो सकी'); }
};

$('resetProfileBtn').onclick = async () => {
  if (!confirm('क्या आप अपनी आईडी हटाकर रीसेट करना चाहते हैं?')) return;
  const oldId = myUserId;
  myUserId = '';
  myUserName = '';
  await cleanupOldPresence();
  try {
    if (oldId) {
      await remove(ref(db, `users/${oldId}`));
      await remove(ref(db, `user_inbox/${oldId}`));
    }
  } catch(e){}
  clearUserSessionOnly();
  location.href = location.pathname;
};

// Admin Pin & Panel
adminBtn.onclick = () => { $('adminPinInput').value = ''; $('adminPinModal').hidden = false; };$('closePinBtn').onclick = () => { $('adminPinModal').hidden = true; };$('verifyPinBtn').onclick = () => {
  if ($('adminPinInput').value.trim() === ADMIN_SECRET_PIN) {$('adminPinModal').hidden = true; openAdminPanel(); }
  else toast('गलत पिन!');
};

function openAdminPanel() {
  const list = $('adminUsersList'); list.innerHTML = '';
  Object.keys(allOnlineUsers).forEach(id => {
    if (id === myUserId) return;
    const u = allOnlineUsers[id], isHidden = !!u.hidden;
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;background:rgba(255,255,255,.05);padding:10px;border-radius:12px;border:1px solid var(--line)';
    row.innerHTML = `
      <div style="text-align:left"><div style="font-size:14px;font-weight:700">${safeName(u.name)}</div><div style="font-size:10px;color:${isHidden?'#f43f5e':'#10b981'}">${isHidden?'🔒 छिपी आईडी':'👁️ दृश्यमान'}</div></div>
      <div style="display:flex;gap:6px">
        <button class="btn-h" style="background:${isHidden?'#10b981':'#f59e0b'};border:0;color:#000;font-size:10px;font-weight:800;padding:6px 12px;border-radius:8px">${isHidden?'दिखाएँ':'छिपाएँ'}</button>
        <button class="btn-d" style="background:#f43f5e;border:0;color:#fff;font-size:10px;font-weight:800;padding:6px 12px;border-radius:8px">हटाएँ</button>
      </div>`;
    row.querySelector('.btn-h').onclick = async () => { await update(ref(db, `users/${id}`), { hidden: !isHidden }); openAdminPanel(); };
    row.querySelector('.btn-d').onclick = async () => {
      if (confirm(`क्या आप ${u.name} को स्थायी रूप से हटाना चाहते हैं?`)) {
        await remove(ref(db, `users/${id}`));
        await remove(ref(db, `user_inbox/${id}`));
        delete allOnlineUsers[id];
        delete latestChatSnippets[id];
        delete unreadCounts[id];
        renderContacts();
        toast(`${u.name} को हटा दिया गया`); openAdminPanel();
      }
    };
    list.appendChild(row);
  });
  $('adminPanelModal').hidden = false;
}
$('closeAdminPanelBtn').onclick = () => {$('adminPanelModal').hidden = true; };

// Tabs & Call Logs
$('tabChatsBtn').onclick = () => {$('tabChatsBtn').className = 'tab-btn active-chat';
  $('tabCallsBtn').className = 'tab-btn';$('tabChatsContent').hidden = false;
  $('tabCallsContent').hidden = true;
};
$('tabCallsBtn').onclick = () => {$('tabCallsBtn').className = 'tab-btn active-call';
  $('tabChatsBtn').className = 'tab-btn';$('tabCallsContent').hidden = false;
  $('tabChatsContent').hidden = true;
  renderCallLogs();
};

async function recordCallLog(entry) {
  try {
    const logId = entry.callId || `call_${Date.now()}`;
    const myLogEntry = {
      callId: logId, targetId: entry.targetId, name: entry.name || 'उपयोगकर्ता',
      type: entry.type, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
    };
    const existingIdx = allCallLogs.findIndex(x => x.callId === logId);
    if (existingIdx >= 0) allCallLogs[existingIdx] = myLogEntry;
    else allCallLogs.unshift(myLogEntry);
    localStorage.setItem('cached_call_logs', JSON.stringify(allCallLogs));
    renderCallLogs();

    await set(ref(db, `call_logs/${myUserId}/${logId}`), myLogEntry);

    if (entry.targetId && entry.targetId !== myUserId) {
      const remoteType = entry.type === 'outgoing' ? 'incoming' : (entry.type === 'incoming' ? 'outgoing' : 'missed');
      const remoteLogEntry = {
        callId: logId, targetId: myUserId, name: myUserName,
        type: remoteType, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
      };
      await set(ref(db, `call_logs/${entry.targetId}/${logId}`), remoteLogEntry).catch(()=>{});
    }
  } catch(e) {}
}

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
    
    // स्मार्ट चेक: अगर ड्यूरेशन 00:00 है या टाइप missed है
    const isMissed = l.type === 'missed' || (l.type === 'incoming' && (!l.duration || l.duration === '00:00' || l.duration === '0'));

    if (isMissed) {
      iconHtml = `<span class="call-log-badge call-missed">${currentLang==='hi'?'मिस्ड कॉल':'Missed Call'}</span>`;
    } else if (l.type === 'incoming') {
      iconHtml = `<span class="call-log-badge call-incoming">${currentLang==='hi'?'रिसीव कॉल':'Received Call'} (${l.duration || '00:00'})</span>`;
    } else {
      iconHtml = `<span class="call-log-badge call-outgoing">${currentLang==='hi'?'आउटगोइंग कॉल':'Outgoing Call'} (${l.duration || '00:00'})</span>`;
    }

    const actionIconSvg = isVoice
      ? `<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>`
      : `<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4c.39.39 1.06.11 1.06-.45V6.95c0-.56-.67-.84-1.06-.45l-4 4z"/></svg>`;

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${safeName(l.name)}</span><div>${iconHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${formatClockTime(l.time)}</span></div>
      </div>
      <button class="call-action-btn" title="कॉल करें">${actionIconSvg}</button>
    `;
    card.querySelector('.call-action-btn').onclick = (e) => { e.stopPropagation(); startCall(l.targetId, l.name, isVoice); };
    card.onclick = () => startCall(l.targetId, l.name, isVoice);
    callLogsList.appendChild(card);
  });
}

// Contacts List & Previews
const getChatRoomId = (a, b) => [a, b].sort().join('__');

function getTickBadge(snippet) {
  if (!snippet || snippet.senderId !== myUserId) return '';
  if (snippet.read) return '<span class="tick-mark tick-read" style="color:#38bdf8;font-weight:900;">✓✓</span>';
  if (snippet.delivered) return '<span class="tick-mark tick-delivered" style="color:#94a3b8;font-weight:900;">✓✓</span>';
  return '<span class="tick-mark tick-sent" style="color:#64748b;font-weight:900;">✓</span>';
}

let isInitialLoad = true;

// ✅ FIX: Real-time Lobby Snippet, Instant Delivery Ticks & Unread Count Sync
function listenForLatestChatPreviews() {
  onValue(ref(db, 'chats'), snap => {
    const rooms = snap.val() || {};
    let hasUpdates = false;

    Object.keys(rooms).forEach(key => {
      if (!key.includes(myUserId)) return;
      const parts = key.split('__');
      const targetId = parts[0] === myUserId ? parts[1] : parts[0];
      const msgs = rooms[key]?.messages || {};
      const msgKeys = Object.keys(msgs);
      if (!msgKeys.length) return;

      const sortedKeys = msgKeys.sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));
      const lastMsg = msgs[sortedKeys[sortedKeys.length - 1]];

      let unread = 0;
      msgKeys.forEach(k => {
        const m = msgs[k];
        if (m.senderId !== myUserId && !m.read && currentChatTargetId !== targetId) {
          unread++;
        }
        if (m.senderId !== myUserId && !m.delivered) {
          update(ref(db, `chats/${key}/messages/${k}`), { delivered: true }).catch(()=>{});
        }
      });
      unreadCounts[targetId] = unread;

      const prevTime = latestChatSnippets[targetId]?.time || 0;
      const isNew = !isInitialLoad && lastMsg.time > prevTime && lastMsg.senderId !== myUserId && currentChatTargetId !== targetId;

      let msgText = lastMsg.text || '';
      if (lastMsg.deleted || lastMsg.type === 'deleted') {
        msgText = '🚫 यह संदेश हटा दिया गया है';
      } else if (lastMsg.type === 'image') {
        msgText = '📷 ' + (currentLang === 'hi' ? 'फ़ोटो' : 'Photo');
      } else if (lastMsg.type === 'video') {
        msgText = '🎥 ' + (currentLang === 'hi' ? 'वीडियो' : 'Video');
      } else if (lastMsg.type === 'audio') {
        msgText = '🎙 ' + (currentLang === 'hi' ? 'वॉयस नोट' : 'Voice Note');
      } else if (lastMsg.type === 'doc') {
        msgText = '📄 ' + (lastMsg.fileName || (currentLang === 'hi' ? 'दस्तावेज़' : 'Document'));
      } else if (lastMsg.type === 'system-call') {
        msgText = lastMsg.text;
      }

      latestChatSnippets[targetId] = { 
        text: msgText, 
        time: lastMsg.time || Date.now(), 
        senderId: lastMsg.senderId, 
        read: !!lastMsg.read, 
        delivered: !!lastMsg.delivered 
      };
      hasUpdates = true;

      if (isNew) triggerSystemMessageNotification(lastMsg.senderName || 'New message', msgText, targetId);
    });

    isInitialLoad = false;
    if (hasUpdates) {
      try {
        localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
        localStorage.setItem('cached_unreads', JSON.stringify(unreadCounts));
      } catch(e) {}
      renderContacts();
    }
  });
}

function triggerSystemMessageNotification(sender, text, targetId) {
  playMessageBeep();
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(sender, { body: text, icon: 'icon.png', badge: 'icon.png', data: { targetId, senderName: sender } });
    }).catch(() => { new Notification(sender, { body: text }); });
  } else {
    toast(`💬 ${sender}: ${text}`);
  }
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.targetId) {
    window.focus();
    openChat(event.data.targetId, event.data.senderName || 'उपयोगकर्ता');
  }
});

function renderOnlineStrip() {
  const strip = $('onlineStrip');
  if (!strip) return;
  const onlineIds = Object.keys(allOnlineUsers).filter(id => id !== myUserId && allOnlineUsers[id]?.online && allOnlineUsers[id]?.name && !allOnlineUsers[id]?.hidden);
  if (!onlineIds.length) { strip.hidden = true; strip.innerHTML = ''; return; }
  strip.hidden = false;
  strip.innerHTML = onlineIds.map(id => {
    const u = allOnlineUsers[id];
    const initial = (u.name || '?').trim().charAt(0).toUpperCase();
    return `<div class="online-avatar" data-uid="${id}" title="${safeName(u.name)}"><div class="online-avatar-circle"><span>${initial}</span><span class="online-dot"></span></div><div class="online-avatar-name">${safeName(u.name.split(' ')[0])}</div></div>`;
  }).join('');
  strip.querySelectorAll('.online-avatar').forEach(el => {
    el.onclick = () => openChat(el.dataset.uid, allOnlineUsers[el.dataset.uid]?.name || 'उपयोगकर्ता');
  });
}

function renderContacts() {
  contactsList.innerHTML = '';
  const amIAdmin = isNeerajBadola(myUserName);
  const q = searchInput.value.trim().toLowerCase();
  const validUsersSet = new Set(Object.keys(allOnlineUsers));

  let userIds = Object.keys(allOnlineUsers).filter(id => {
    const u = allOnlineUsers[id];
    const match = !q || (u && u.name && u.name.toLowerCase().includes(q));
    return u && u.name && id !== myUserId && u.name !== 'User' && (!u.hidden || amIAdmin) && match && validUsersSet.has(id);
  });

  if (!userIds.length) {
    contactsList.innerHTML = `<div style="text-align:center;padding:28px;color:#94a3b8;font-size:13px">${currentLang==='hi'?'कोई संपर्क उपलब्ध नहीं है':'No contacts available'}</div>`;
    return;
  }
  userIds.sort((a, b) => {
    const pinA = pinnedChats[a] ? 1 : 0;
    const pinB = pinnedChats[b] ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;
    const timeA = latestChatSnippets[a]?.time || allOnlineUsers[a]?.lastSeen || 0;
    const timeB = latestChatSnippets[b]?.time || allOnlineUsers[b]?.lastSeen || 0;
    return timeB - timeA;
  });

  userIds.forEach(id => {
    const u = allOnlineUsers[id], isOnline = !!u.online;
    const isTyping = u.typingTo === myUserId;
    const unread = unreadCounts[id] || 0;
    const snippet = latestChatSnippets[id];
    const isPinned = !!pinnedChats[id];
    const card = document.createElement('div');
    card.className = 'contact-card' + (isPinned ? ' pinned' : '');

    const statusText = isTyping ? translations[currentLang].typing : (isOnline ? translations[currentLang].online : formatLastSeen(u.lastSeen));
    const statusClass = (isTyping || isOnline) ? 'online' : '';
    const lastMsgHtml = isTyping
      ? `<span class="typing-pulse">${translations[currentLang].typing}</span>`
      : (snippet ? `${getTickBadge(snippet)} <span>${safeName(snippet.text)}</span>` : `<span style="color:#64748b;font-style:italic">${currentLang==='hi'?'बातचीत शुरू करें...':'Start a conversation...'}</span>`);

    const timeHtml = snippet?.time ? formatClockTime(snippet.time) : '';

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${isPinned ? '📌 ' : ''}${safeName(u.name)}</span><div class="contact-last-msg">${lastMsgHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${timeHtml}</span><span class="contact-live-status ${statusClass}">${statusText}</span>${unread > 0 ? `<div class="badge-unread" data-id="${id}">${unread}</div>` : `<div style="height:20px"></div>`}</div>
      </div>
    `;
    card.onclick = () => openChat(id, u.name);
    contactsList.appendChild(card);
  });
}
searchInput.oninput = renderContacts;
setInterval(() => { if (!lobbyScreen.hidden && Object.keys(allOnlineUsers).length) renderContacts(); }, 60000);

// पॉइंट #2: WhatsApp शेयरिंग बटन
if ($('shareAppWhatsappBtn')) {$('shareAppWhatsappBtn').onclick = () => {
    const promoMsg = currentLang === 'hi' 
      ? `📱 कमाल का वीडियो कॉलिंग ऐप! इसमें फन-मोड, वाइटबोर्ड और पहेलियां (Riddles) भी हैं। अभी डाउनलोड करें: \n${GITHUB_APK_URL}` 
      : `📱 Amazing Video Calling App with Fun-Mode, Whiteboard & Riddles! Download now: \n${GITHUB_APK_URL}`;
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(promoMsg), '_blank');
  };
}

/* =========================================================================
   🔴🔴🔴 [PART 1 OF 3 — END (समाप्त): app.js v1.24.1] 🔴🔴🔴
   ========================================================================= */
/* =========================================================================
   🟢🟢🟢 [PART 2 OF 3 — START (शुरू): app.js v1.24.1] 🟢🟢🟢
   Long-press Actions, Reactions, Chat Engine, Delivery/Read Sync, Voice Dock
   ========================================================================= */

let longPressTimer = null;
let longPressStartX = 0;
let longPressStartY = 0;
let longPressMoved = false;
let currentLongPressMsgId = null;
let currentLongPressMsgData = null;
let replyToMessageId = null;
let replyToMessageData = null;

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

function attachBubbleLongPress(el, msgId, m) {
  const HOLD_TIME = 500;

  const onStart = (e) => {
    longPressStartX = e.touches ? e.touches[0].clientX : e.clientX;
    longPressStartY = e.touches ? e.touches[0].clientY : e.clientY;
    longPressMoved = false;

    clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
      if (longPressMoved) return;
      openMessageMenu(el, msgId, m);
    }, HOLD_TIME);
  };

  const onMove = (e) => {
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = Math.abs(x - longPressStartX);
    const dy = Math.abs(y - longPressStartY);
    if (dx > 10 || dy > 10) {
      longPressMoved = true;
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  };

  const onEnd = () => {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  };

  el.addEventListener('touchstart', onStart, { passive: true });
  el.addEventListener('touchmove', onMove, { passive: true });
  el.addEventListener('touchend', onEnd);
  el.addEventListener('touchcancel', onEnd);

  el.addEventListener('mousedown', onStart);
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseup', onEnd);
  el.addEventListener('mouseleave', onEnd);

  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    openMessageMenu(el, msgId, m);
  });
}

function openMessageMenu(el, msgId, m) {
  currentLongPressMsgId = msgId;
  currentLongPressMsgData = m;

  const isMine = m.senderId === myUserId;
  const isDeleted = m.deleted === true;
  const isSystemCall = m.type === 'system-call';

  const existing = $('msgLongPressMenu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'msgLongPressMenu';
  menu.className = 'msg-long-press-menu';
  menu.style.zIndex = '99999';

  const reactionsRow = (!isSystemCall && !isDeleted) ? `
    <div class="reactions-row">
      ${REACTION_EMOJIS.map(emo => {
        const mine = m.reactions && m.reactions[myUserId] === emo;
        return `<button class="reaction-pick-btn${mine?' mine':''}" data-emoji="${emo}">${emo}</button>`;
      }).join('')}
    </div>` : '';

  let itemsHtml = '';

  if (!isSystemCall && !isDeleted) {
    itemsHtml += `
      <button class="menu-item" data-action="reply">
        <span class="menu-item-ic">↩️</span>
        <span>जवाब दें (Reply)</span>
      </button>
    `;
  }

  if (!isSystemCall && !isDeleted && (!m.type || m.type === 'text')) {
    itemsHtml += `
      <button class="menu-item" data-action="copy">
        <span class="menu-item-ic">📋</span>
        <span>कॉपी करें (Copy)</span>
      </button>
    `;
  }

  if (!isSystemCall && !isDeleted) {
    itemsHtml += `
      <button class="menu-item" data-action="forward">
        <span class="menu-item-ic">➡️</span>
        <span>फॉरवर्ड करें (Forward)</span>
      </button>
    `;
  }

  if (!isSystemCall && !isDeleted) {
    const starLabel = m.starred ? 'स्टार हटाएँ (Unstar)' : 'स्टार करें (Star)';
    itemsHtml += `
      <button class="menu-item" data-action="star">
        <span class="menu-item-ic">⭐</span>
        <span>${starLabel}</span>
      </button>
    `;
  }

  if (!isDeleted) {
    itemsHtml += `
      <button class="menu-item" data-action="delete-me">
        <span class="menu-item-ic">🗑️</span>
        <span>मेरे लिए हटाएँ (Delete for me)</span>
      </button>
    `;
    if (isMine) {
      itemsHtml += `
        <button class="menu-item danger" data-action="delete-all">
          <span class="menu-item-ic">🗑️</span>
          <span>सबके लिए हटाएँ (Delete for everyone)</span>
        </button>
      `;
    }
  }

  menu.innerHTML = `
    <div class="menu-backdrop"></div>
    <div class="menu-box">${reactionsRow}${itemsHtml}</div>
  `;

  document.body.appendChild(menu);

  const menuBox = menu.querySelector('.menu-box');
  if (menuBox) {
    ['touchstart', 'touchend', 'click'].forEach(evt => {
      menuBox.addEventListener(evt, (e) => e.stopPropagation());
    });
  }

  menu.querySelectorAll('.reaction-pick-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      closeMessageMenu();
      await toggleReaction(msgId, m, emoji);
    };
  });

  menu.querySelectorAll('.menu-item').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      closeMessageMenu();
      await handleMessageAction(action, msgId, m);
    };
  });

  const backdrop = menu.querySelector('.menu-backdrop');
  if (backdrop) {
    backdrop.addEventListener('touchstart', (e) => { e.preventDefault(); closeMessageMenu(); });
    backdrop.addEventListener('click', () => closeMessageMenu());
  }
}

function closeMessageMenu() {
  const menu = $('msgLongPressMenu');
  if (menu) menu.remove();
  currentLongPressMsgId = null;
  currentLongPressMsgData = null;
}

async function handleMessageAction(action, msgId, m) {
  if (!currentChatTargetId || !msgId) return;

  const roomId = getChatRoomId(myUserId, currentChatTargetId);
  const roomPath = `chats/${roomId}/messages/${msgId}`;

  switch (action) {
    case 'copy':
      try {
        await navigator.clipboard.writeText(m.text || '');
        toast(currentLang === 'hi' ? '📋 कॉपी हो गया' : '📋 Copied');
      } catch(e) {
        const ta = document.createElement('textarea');
        ta.value = m.text || '';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); toast(currentLang === 'hi' ? '📋 कॉपी हो गया' : '📋 Copied'); } catch(e2) {}
        document.body.removeChild(ta);
      }
      break;

    case 'reply':
      startReply(msgId, m);
      break;

    case 'forward':
      openForwardDialog(msgId, m);
      break;

    case 'star':
      await toggleStarMessage(roomPath, msgId, m);
      break;

    case 'delete-me':
      await deleteMessage(roomPath, msgId, false);
      break;

    case 'delete-all':
      const confirmMsg = currentLang === 'hi'
        ? 'क्या आप सबके लिए यह मैसेज हटाना चाहते हैं?'
        : 'Delete this message for everyone?';
      if (confirm(confirmMsg)) {
        await deleteMessage(roomPath, msgId, true);
      }
      break;
  }
}

async function toggleReaction(msgId, m, emoji) {
  if (!currentChatTargetId) return;
  const roomId = getChatRoomId(myUserId, currentChatTargetId);
  const roomPath = `chats/${roomId}/messages/${msgId}/reactions`;
  const existing = m.reactions?.[myUserId];
  try {
    if (existing === emoji) await remove(ref(db, `${roomPath}/${myUserId}`));
    else await update(ref(db, roomPath), { [myUserId]: emoji });
    playMessageTickSound();
  } catch(e) { toast('त्रुटि'); }
}

function renderReactionsHtml(m, msgId) {
  if (!m.reactions) return '';
  const counts = {};
  Object.values(m.reactions).forEach(emo => { counts[emo] = (counts[emo] || 0) + 1; });
  const keys = Object.keys(counts);
  if (!keys.length) return '';
  return `<div class="bubble-reactions" data-msg-id="${msgId}">
    ${keys.map(emo => {
      const mine = m.reactions[myUserId] === emo;
      return `<span class="reaction-chip${mine?' mine':''}" data-emoji="${emo}">${emo}<span class="reaction-count">${counts[emo]}</span></span>`;
    }).join('')}
  </div>`;
}

function startReply(msgId, m) {
  replyToMessageId = msgId;
  replyToMessageData = m;

  let previewText = m.text || '';
  if (m.type === 'image') previewText = '📷 ' + (currentLang==='hi'?'फ़ोटो':'Photo');
  else if (m.type === 'video') previewText = '🎥 ' + (currentLang==='hi'?'वीडियो':'Video');
  else if (m.type === 'audio') previewText = '🎙 ' + (currentLang==='hi'?'वॉयस नोट':'Voice Note');
  else if (m.type === 'doc') previewText = '📄 ' + (currentLang==='hi'?'दस्तावेज़':'Document');

  showReplyPreview(m.senderName || 'उपयोगकर्ता', previewText);
  chatInput.focus();
}

function showReplyPreview(senderName, text) {
  let box = $('replyPreviewBox');
  if (box) box.remove();

  box = document.createElement('div');
  box.id = 'replyPreviewBox';
  box.className = 'reply-preview-box';
  box.innerHTML = `
    <div class="reply-preview-bar"></div>
    <div class="reply-preview-content">
      <div class="reply-preview-sender">↩️ ${safeName(senderName)}</div>
      <div class="reply-preview-text">${safeName(text)}</div>
    </div>
    <button class="reply-preview-close" id="closeReplyBtn">✕</button>
  `;

  const footer = document.querySelector('.chat-footer');
  if (footer) footer.insertBefore(box, footer.firstChild);

  box.querySelector('#closeReplyBtn').onclick = (e) => {
    e.stopPropagation();
    cancelReply();
  };
}

function cancelReply() {
  replyToMessageId = null;
  replyToMessageData = null;
  const box = $('replyPreviewBox');
  if (box) box.remove();
}

async function toggleStarMessage(roomPath, msgId, m) {
  const newStar = !m.starred;
  m.starred = newStar;
  try {
    await update(ref(db, roomPath), { starred: newStar });
    const el = document.getElementById(`msg_${msgId}`);
    if (el) el.classList.toggle('starred', newStar);
    toast(newStar ? '⭐ स्टार किया' : 'स्टार हटाया');
  } catch(e) {
    toast('त्रुटि');
  }
}

async function deleteMessage(roomPath, msgId, forEveryone) {
  try {
    if (forEveryone) {
      await update(ref(db, roomPath), {
        deleted: true,
        deletedAt: Date.now(),
        text: '🚫 यह संदेश हटा दिया गया है',
        data: null,
        type: 'deleted',
        senderName: myUserName
      });

      const el = document.getElementById(`msg_${msgId}`);
      if (el) {
        el.className = `chat-bubble is-deleted me`;
        el.innerHTML = `
          <div style="font-style:italic;color:#94a3b8">🚫 यह संदेश हटा दिया गया है</div>
          <div class="chat-meta"><span>${formatClockTime(Date.now())}</span></div>
        `;
      }
    } else {
      const el = $(`msg_${msgId}`);
      if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'scale(0.9)';
        setTimeout(() => el.remove(), 300);
      }

      try {
        const key = `vc_deleted_${myUserId}_${getChatRoomId(myUserId, currentChatTargetId)}`;
        const list = JSON.parse(localStorage.getItem(key) || '[]');
        if (!list.includes(msgId)) list.push(msgId);
        localStorage.setItem(key, JSON.stringify(list));
      } catch(e) {}
    }

    toast(forEveryone ? '🗑️ सबके लिए हटाया' : '🗑️ हटा दिया');
  } catch(e) {
    toast('त्रुटि');
  }
}

function isDeletedForMe(msgId) {
  try {
    const key = `vc_deleted_${myUserId}_${getChatRoomId(myUserId, currentChatTargetId)}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return list.includes(msgId);
  } catch(e) {
    return false;
  }
}

function openForwardDialog(msgId, m) {
  const users = Object.keys(allOnlineUsers).filter(id => id !== myUserId && allOnlineUsers[id]?.name);
  if (!users.length) {
    toast('कोई संपर्क नहीं');
    return;
  }

  const names = users.map((id, i) => `${i+1}. ${allOnlineUsers[id].name}`).join('\n');
  const input = prompt('किसे फॉरवर्ड करें? (नंबर लिखें)\n\n' + names);
  if (!input) return;

  const idx = parseInt(input) - 1;
  if (isNaN(idx) || idx < 0 || idx >= users.length) {
    toast('गलत नंबर');
    return;
  }

  const targetId = users[idx];
  const targetName = allOnlineUsers[targetId].name;
  forwardMessageTo(targetId, m, targetName);
}

async function forwardMessageTo(targetId, m, targetName) {
  try {
    const roomId = getChatRoomId(myUserId, targetId);
    const roomPath = `chats/${roomId}/messages`;
    const targetOnline = !!allOnlineUsers[targetId]?.online;

    const newMsgRef = push(ref(db, roomPath));
    const msgData = {
      senderId: myUserId,
      senderName: myUserName,
      time: Date.now(),
      delivered: targetOnline,
      read: false,
      forwarded: true
    };

    if (m.type === 'image' || m.type === 'video' || m.type === 'doc') {
      msgData.type = m.type;
      msgData.data = m.data || null;
      msgData.text = m.text || '';
      msgData.fileName = m.fileName;
      msgData.mimeType = m.mimeType;
      msgData.fileSize = m.fileSize;
      msgData.mediaId = m.mediaId;
    } else if (m.type === 'audio') {
      msgData.type = 'audio';
      msgData.data = m.data;
      msgData.duration = m.duration;
      msgData.durationSec = m.durationSec;
    } else {
      msgData.text = m.text || '';
    }

    await set(newMsgRef, msgData);
    toast(`${targetName} को फॉरवर्ड कर दिया`);
  } catch(e) {
    toast('फॉरवर्ड फेल');
  }
}

// Chat Open / Close
let chatUnsub = null;
let activePlayingAudio = null;
let activePlayingBtn = null;
let isInitialChatOpen = true;

function openChat(tId, tName) {
  if (!tId) {
    closeChat();
    return;
  }

  try {
    currentChatTargetId = tId;
    currentChatTargetName = tName || allOnlineUsers[tId]?.name || 'उपयोगकर्ता';
    
    // Unread count locally aur badge reset
    unreadCounts[tId] = 0;
    try {
      localStorage.setItem('cached_unreads', JSON.stringify(unreadCounts));
    } catch(e) {}
    
    try {
      const badge = document.querySelector(`.badge-unread[data-id="${tId}"]`);
      if (badge) badge.remove();
    } catch(e) {}

    renderContacts();
    
    const targetNameEl = $('chatTargetName');
    if (targetNameEl) targetNameEl.textContent = currentChatTargetName;
    isInitialChatOpen = true;

    if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
    targetStatusUnsub = onValue(ref(db, `users/${tId}`), (snap) => {
      const u = snap.val() || {};
      const statusEl = $('chatTargetStatus');
      if (!statusEl) return;
      const isTyping = u.typingTo === myUserId;
      const online = !!u.online;
      if (isTyping) { statusEl.textContent = translations[currentLang]?.typing || 'लिख रहे हैं...'; statusEl.style.color = 'var(--success)'; }
      else if (online) { statusEl.textContent = translations[currentLang]?.online || 'ऑनलाइन'; statusEl.style.color = 'var(--success)'; }
      else { statusEl.textContent = formatLastSeen(u.lastSeen) || (translations[currentLang]?.offline || 'ऑफलाइन'); statusEl.style.color = '#94a3b8'; }
    });

    if (lobbyScreen) lobbyScreen.hidden = true;
    if (chatScreen) chatScreen.hidden = false;
    
    if (chatInput) {
      chatInput.value = '';
      chatInput.style.height = '44px';
    }
    cancelReply();
    updateActionBtnState();
    loadChatMessages();
  } catch (err) {
    console.error("openChat error:", err);
    closeChat();
  }
}

function closeChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  discardRecording();
  cancelReply();
  if (activePlayingAudio) { activePlayingAudio.pause(); activePlayingAudio = null; }
  currentChatTargetId = null;
  update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{});
  if (chatScreen) chatScreen.hidden = true;
  if (lobbyScreen) lobbyScreen.hidden = false;
  renderContacts();
}
$('chatBackBtn').onclick = closeChat;
$('chatCallBtn').onclick = () => { if (currentChatTargetId) startCall(currentChatTargetId, currentChatTargetName, false); };
$('chatVoiceCallBtn').onclick = () => { if (currentChatTargetId) startCall(currentChatTargetId, currentChatTargetName, true); };

function attachVoiceBubbleEvents(container) {
  const btn = container.querySelector('.voice-play-circle');
  const bg = container.querySelector('.voice-progress-bg');
  const spdBtn = container.querySelector('.voice-spd-btn');

  if (btn) {
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
  }

  if (bg) {
    bg.onclick = (e) => {
      e.stopPropagation();
      if (activePlayingAudio) {
        const rect = bg.getBoundingClientRect();
        const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        activePlayingAudio.currentTime = pct * (Number(bg.dataset.dur) || 5);
      }
    };
  }

  if (spdBtn) {
    spdBtn.onclick = (e) => {
      e.stopPropagation();
      if (activePlayingAudio) {
        let spd = activePlayingAudio.playbackRate;
        spd = spd === 1 ? 1.5 : (spd === 1.5 ? 2 : 1);
        activePlayingAudio.playbackRate = spd;
        spdBtn.textContent = spd + 'x';
      }
    };
  }
}

// Real-time Chat Load, Delivered & Read Ticks
function loadChatMessages() {
  const body = $('chatBody');
  if (chatUnsub) chatUnsub();
  const roomPath = `chats/${getChatRoomId(myUserId, currentChatTargetId)}/messages`;

  chatUnsub = onValue(ref(db, roomPath), snap => {
    const msgs = snap.val() || {};
    const sortedKeys = Object.keys(msgs).sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));

    const currentMsgEls = body.querySelectorAll('[data-msg-id]');
    const newKeySet = new Set(sortedKeys);
    currentMsgEls.forEach(el => {
      if (!newKeySet.has(el.dataset.msgId)) el.remove();
    });

    let shouldScroll = false;
    const isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 120;

    sortedKeys.forEach(msgId => {
      const m = msgs[msgId];
      if (isDeletedForMe(msgId)) return;

      // Agar samne wale ka message hai aur open hone par read nahi hua hai to read: true set karein
      if (m.senderId !== myUserId && !m.read) {
        update(ref(db, `${roomPath}/${msgId}`), { 
          read: true, 
          delivered: true, 
          readAt: Date.now() 
        }).catch(()=>{});
      }

      if (m.data && m.senderId !== myUserId) {
        autoSaveMediaToDownloads(msgId, m.data, m.fileName, m.mimeType);
      }

      let el = document.getElementById(`msg_${msgId}`);

      if (el) {
        el.classList.toggle('starred', !!m.starred);

        if (m.deleted || m.type === 'deleted') {
          if (!el.classList.contains('is-deleted')) {
            el.className = `chat-bubble is-deleted ${m.senderId === myUserId ? 'me' : 'them'}`;
            el.innerHTML = `
              <div style="font-style:italic;color:#94a3b8">🚫 ${safeName(m.text || 'यह संदेश हटा दिया गया है')}</div>
              <div class="chat-meta"><span>${m.time ? formatClockTime(m.time) : ''}</span></div>
            `;
          }
          return;
        }

        if (m.senderId === myUserId) {
          applyTickSafely(msgId, m);
        }
        return;
      }

      el = document.createElement('div');
      el.id = `msg_${msgId}`;
      el.dataset.msgId = msgId;

      if (m.type === 'system-call') {
        el.className = 'chat-bubble system-call';
        el.textContent = `${m.text} • ${formatClockTime(m.time)}`;
        body.appendChild(el);
        shouldScroll = true;
        return;
      }

      if (m.type === 'deleted' || m.deleted) {
        el.className = `chat-bubble is-deleted ${m.senderId === myUserId ? 'me' : 'them'}`;
        el.innerHTML = `
          <div style="font-style:italic;color:#94a3b8">🚫 ${safeName(m.text || 'यह संदेश हटा दिया गया है')}</div>
          <div class="chat-meta"><span>${m.time ? formatClockTime(m.time) : ''}</span></div>
        `;
        body.appendChild(el);
        shouldScroll = true;
        return;
      }

      el.className = `chat-bubble ${m.senderId === myUserId ? 'me' : 'them'}`;
      if (m.starred) el.classList.add('starred');

      let contentHtml = '';
      if (m.replyTo) {
        contentHtml += `
          <div class="chat-reply-preview">
            <div class="chat-reply-bar"></div>
            <div class="chat-reply-body">
              <div class="chat-reply-sender">${safeName(m.replyTo.senderName || 'उपयोगकर्ता')}</div>
              <div class="chat-reply-text">${safeName(m.replyTo.text || '')}</div>
            </div>
          </div>
        `;
      }

      if (m.type === 'image') {
        if (m.data) {
          contentHtml += `<div class="media-bubble"><img src="${m.data}" alt="image" data-media-id="${m.mediaId || msgId}"></div>`;
        } else {
          contentHtml += buildMediaPlaceholderHtml(msgId, m);
        }
      } else if (m.type === 'video') {
        if (m.data) {
          contentHtml += `
            <div class="media-bubble">
              <div class="media-video-thumb">
                <video src="${m.data}" preload="metadata" playsinline></video>
                <div class="media-play-overlay">▶</div>
              </div>
            </div>
          `;
        } else {
          contentHtml += buildMediaPlaceholderHtml(msgId, m);
        }
      } else if (m.type === 'doc' || m.type === 'file') {
        contentHtml += buildDocBubbleHtml(msgId, m);
      } else if (m.type === 'audio') {
        contentHtml += `
          <div class="voice-note-bubble" id="vn_${msgId}">
            <button class="voice-play-circle" data-url="${m.data}" data-dur="${m.durationSec || 5}">▶</button>
            <div class="voice-meta-area">
              <div class="voice-progress-bg" data-dur="${m.durationSec || 5}"><div class="voice-progress-bar"></div></div>
              <div class="voice-meta-row"><span class="voice-time-label">${m.duration || '0:05'}</span><button class="voice-spd-btn">1x</button></div>
            </div>
          </div>
        `;
      } else {
        contentHtml += `<div>${safeName(m.text)}</div>`;
      }

      contentHtml += renderReactionsHtml(m, msgId);

      let tickHtml = '';
      if (m.senderId === myUserId) {
        if (m.read) tickHtml = '<span class="tick-mark tick-read" style="color:#38bdf8;font-weight:900;">✓✓</span>';
        else if (m.delivered) tickHtml = '<span class="tick-mark tick-delivered" style="color:#94a3b8;font-weight:900;">✓✓</span>';
        else tickHtml = '<span class="tick-mark tick-sent" style="color:#64748b;font-weight:900;">✓</span>';
      }

      el.innerHTML = `${contentHtml}<div class="chat-meta"><span>${m.time ? formatClockTime(m.time) : ''}</span>${tickHtml}</div>`;

      if (m.type === 'audio') attachVoiceBubbleEvents(el);
      if (m.type === 'image' && m.data) {
        const img = el.querySelector('img');
        if (img) img.onclick = () => openMediaViewer(m.data, m.mimeType || 'image/jpeg', m.fileName || 'image');
      }
      if (m.type === 'video' && m.data) {
        const thumb = el.querySelector('.media-video-thumb');
        if (thumb) thumb.onclick = () => openMediaViewer(m.data, m.mimeType || 'video/mp4', m.fileName || 'video');
      }
      if (m.type === 'doc' || m.type === 'file') {
        const docBubble = el.querySelector('.media-doc-bubble');
        if (docBubble) docBubble.onclick = () => handleDocDownload(msgId, m);
      }

      attachBubbleLongPress(el, msgId, m);
      body.appendChild(el);
      shouldScroll = true;
    });

    if (shouldScroll && (isNearBottom || isInitialChatOpen)) {
      body.scrollTop = body.scrollHeight;
      isInitialChatOpen = false;
    }
  });
}

function applyTickSafely(msgId, m) {
  const el = document.getElementById(`msg_${msgId}`);
  if (el) {
    const metaEl = el.querySelector('.chat-meta');
    if (metaEl) {
      let tickHtml = '';
      if (m.read) tickHtml = '<span class="tick-mark tick-read" style="color:#38bdf8;font-weight:900;">✓✓</span>';
      else if (m.delivered) tickHtml = '<span class="tick-mark tick-delivered" style="color:#94a3b8;font-weight:900;">✓✓</span>';
      else tickHtml = '<span class="tick-mark tick-sent" style="color:#64748b;font-weight:900;">✓</span>';
      metaEl.innerHTML = `<span>${m.time ? formatClockTime(m.time) : ''}</span>${tickHtml}`;
    }
  }
}

function buildMediaPlaceholderHtml(msgId, m) {
  const sizeText = m.fileSize ? formatFileSize(m.fileSize) : '';
  const icon = m.type === 'image' ? '🖼️' : (m.type === 'video' ? '🎥' : '📎');
  const label = m.type === 'image' ? 'फ़ोटो' : (m.type === 'video' ? 'वीडियो' : 'फ़ाइल');

  return `
    <div class="media-download-overlay" data-media-id="${m.mediaId || msgId}" data-msg-id="${msgId}">
      <div class="media-download-icon">${icon}</div>
      <div class="media-file-name">${safeName(m.fileName || label)}</div>
      <div class="media-file-size">${sizeText}</div>
      <button class="media-download-btn">⬇ स्वतः डाउनलोड हो रहा है...</button>
    </div>
  `;
}

function buildDocBubbleHtml(msgId, m) {
  const icon = getFileIcon(m.mimeType, m.fileName);
  const size = m.fileSize ? formatFileSize(m.fileSize) : '';
  return `
    <div class="media-doc-bubble" data-msg-id="${msgId}">
      <div class="media-doc-icon">${icon}</div>
      <div class="media-doc-info">
        <div class="media-doc-name">${safeName(m.fileName || 'document')}</div>
        <div class="media-doc-size">${size} • सहेजा गया</div>
      </div>
    </div>
  `;
}

function updateActionBtnState() {
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

chatInput.addEventListener('input', () => {
  chatInput.style.height = '44px';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  updateActionBtnState();
  if (currentChatTargetId) {
    update(ref(db, `users/${myUserId}`), { typingTo: currentChatTargetId }).catch(()=>{});
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{});
    }, 1800);
  }
});
['keyup', 'change', 'paste', 'compositionend'].forEach(ev => chatInput.addEventListener(ev, updateActionBtnState));

async function sendChatMessagePush(targetId, textContent, roomId, msgId, mediaMeta = null) {
  try {
    const tSnap = await get(ref(db, `users/${targetId}`));
    const token = tSnap.val()?.fcmToken;
    if (!token) return;

    const payload = {
      token,
      title: myUserName,
      body: textContent,
      callerName: myUserName,
      callId: "CHAT_" + myUserId,
      senderId: myUserId,
      roomId: roomId,
      messageId: msgId
    };

    if (mediaMeta) {
      payload.mediaType = mediaMeta.mediaType;
      payload.mediaSize = mediaMeta.mediaSize;
      payload.mediaId = mediaMeta.mediaId;
      payload.fileName = mediaMeta.fileName;
      payload.mimeType = mediaMeta.mimeType;
    }

    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(()=>{});
  } catch(e) {}
}

async function sendChatMessage() {
  const txt = chatInput.value.trim();
  if (!txt || !currentChatTargetId) return;
  playMessageTickSound();

  const roomId = getChatRoomId(myUserId, currentChatTargetId);
  const roomPath = `chats/${roomId}/messages`;
  chatInput.value = '';
  chatInput.style.height = '44px';
  updateActionBtnState();
  chatInput.focus();
  update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{});

  const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
  const newMsgRef = push(ref(db, roomPath));
  const newMsgId = newMsgRef.key;

  const msgData = {
    senderId: myUserId,
    senderName: myUserName,
    text: txt,
    time: Date.now(),
    delivered: targetOnline,
    read: false
  };

  if (replyToMessageId && replyToMessageData) {
    let previewText = replyToMessageData.text || '';
    if (replyToMessageData.type === 'image') previewText = '📷 फ़ोटो';
    else if (replyToMessageData.type === 'video') previewText = '🎥 वीडियो';
    else if (replyToMessageData.type === 'audio') previewText = '🎙 वॉयस नोट';
    else if (replyToMessageData.type === 'doc') previewText = '📄 दस्तावेज़';

    msgData.replyTo = {
      msgId: replyToMessageId,
      senderName: replyToMessageData.senderName || 'उपयोगकर्ता',
      text: previewText
    };
    cancelReply();
  }

  latestChatSnippets[currentChatTargetId] = { text: txt, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  await set(newMsgRef, msgData);
  sendChatMessagePush(currentChatTargetId, txt, roomId, newMsgId);
}

actionBtn.addEventListener('pointerdown', (e) => {
  if (chatInput.value.trim().length > 0) e.preventDefault();
});
actionBtn.addEventListener('mousedown', (e) => {
  if (chatInput.value.trim().length > 0) e.preventDefault();
});

let isSendingMsg = false;
actionBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (isSendingMsg) return;
  if (chatInput.value.trim().length > 0) {
    isSendingMsg = true;
    await sendChatMessage();
    chatInput.focus();
    setTimeout(() => { isSendingMsg = false; }, 800);
  } else {
    chatInput.blur();
    openVoiceDock();
  }
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (isSendingMsg) return;
    isSendingMsg = true;
    sendChatMessage();
    setTimeout(() => { isSendingMsg = false; }, 800);
  }
});

// Media Sender & Attachments
async function sendMediaMessage(file) {
  if (!file || !currentChatTargetId) return;

  const targetId = currentChatTargetId;
  const roomId = getChatRoomId(myUserId, targetId);
  const roomPath = `chats/${roomId}/messages`;
  const mediaType = getMediaTypeFromMime(file.type);
  const mediaId = `media_${Date.now()}_${Math.floor(Math.random()*10000)}`;
  const label = mediaType === 'image' ? '📷 फ़ोटो' : (mediaType === 'video' ? '🎥 वीडियो' : (mediaType === 'audio' ? '🎙 वॉयस नोट' : '📄 दस्तावेज़'));

  localFileMemoryCache[mediaId] = file;

  latestChatSnippets[targetId] = { text: label, time: Date.now(), senderId: myUserId, read: false, delivered: false };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  if (file.size <= DIRECT_SEND_MAX_SIZE) {
    toast(currentLang === 'hi' ? '📤 फ़ाइल भेजी जा रही है...' : '📤 Sending file...');
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      const newMsgRef = push(ref(db, roomPath));
      const newMsgId = newMsgRef.key;

      await set(newMsgRef, {
        senderId: myUserId,
        senderName: myUserName,
        type: mediaType,
        text: label,
        data: base64Data,
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
        mediaId,
        time: Date.now(),
        delivered: true,
        read: false
      });

      sendChatMessagePush(targetId, label, roomId, newMsgId, {
        mediaType, mediaSize: file.size, mediaId, fileName: file.name, mimeType: file.type
      });
      toast(currentLang === 'hi' ? '✅ फ़ाइल सफलतापूर्वक भेज दी गई' : '✅ File sent successfully');
    };
    reader.readAsDataURL(file);
    return;
  }

  const newMsgRef = push(ref(db, roomPath));
  const newMsgId = newMsgRef.key;

  await set(newMsgRef, {
    senderId: myUserId,
    senderName: myUserName,
    type: mediaType,
    text: label,
    fileName: file.name,
    mimeType: file.type,
    fileSize: file.size,
    mediaId,
    time: Date.now(),
    delivered: false,
    read: false
  });

  sendChatMessagePush(targetId, label, roomId, newMsgId, {
    mediaType, mediaSize: file.size, mediaId, fileName: file.name, mimeType: file.type
  });

  toast(currentLang === 'hi' ? '⏫ बड़ी फ़ाइल P2P से भेजी जा रही है...' : '⏫ Sending large file via P2P...');
  const sentMediaId = await sendMediaFileOverDataChannel(targetId, file);
  if (sentMediaId) {
    update(ref(db, `${roomPath}/${newMsgId}`), { delivered: true }).catch(()=>{});
    toast(currentLang === 'hi' ? '✅ भेज दिया' : '✅ Sent');
  } else {
    toast(currentLang === 'hi' ? '❌ भेजने में समस्या आई' : '❌ Failed to send');
  }
}

async function getOrCreateMediaDataChannel(peerId) {
  if (mediaDataChannels[peerId] && mediaDataChannels[peerId].readyState === 'open') {
    return mediaDataChannels[peerId];
  }

  const pc = new RTCPeerConnection(ICE_SERVERS);
  mediaPeerConnections[peerId] = pc;

  const targetSignalsPath = `media_signals/${peerId}/${myUserId}`;
  const mySignalsPath = `media_signals/${myUserId}/${peerId}`;

  pc.onicecandidate = e => {
    if (e.candidate) push(ref(db, `${targetSignalsPath}/candidates`), e.candidate.toJSON()).catch(()=>{});
  };

  pc.pendingIce = [];
  onChildAdded(ref(db, `${mySignalsPath}/candidates`), async snap => {
    const c = snap.val(); if (!c) return;
    const cand = new RTCIceCandidate(c);
    if (pc.remoteDescription) { try { await pc.addIceCandidate(cand); } catch(e){} }
    else pc.pendingIce.push(cand);
  });

  pc.flushIce = async () => {
    const p = pc.pendingIce || []; pc.pendingIce = [];
    for (const cand of p) { try { await pc.addIceCandidate(cand); } catch(e){} }
  };

  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      try { pc.close(); } catch(e) {}
      delete mediaPeerConnections[peerId];
      reject(new Error("Media channel timeout"));
    }, 25000);

    const dc = pc.createDataChannel('media', { ordered: true });
    setupMediaDataChannel(peerId, dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await set(ref(db, `${targetSignalsPath}/offer`), { sdp: offer.sdp, type: offer.type, ts: Date.now() });

    const unsubAns = onValue(ref(db, `${mySignalsPath}/answer`), async snap => {
      const a = snap.val();
      if (a && !pc.currentRemoteDescription) {
        unsubAns();
        await pc.setRemoteDescription(new RTCSessionDescription(a));
        await pc.flushIce();

        if (dc.readyState === 'open') {
          clearTimeout(timeout);
          mediaDataChannels[peerId] = dc;
          resolve(dc);
        } else {
          dc.onopen = () => {
            clearTimeout(timeout);
            mediaDataChannels[peerId] = dc;
            resolve(dc);
          };
        }
      }
    });
  });
}

function listenForIncomingMediaSignals() {
  const incomingMediaRef = ref(db, `media_signals/${myUserId}`);

  onValue(incomingMediaRef, async snap => {
    const allSenders = snap.val() || {};
    for (const senderId of Object.keys(allSenders)) {
      if (!senderId || senderId === myUserId) continue;

      const signalData = allSenders[senderId];
      if (!signalData || !signalData.offer || signalData.answered) continue;

      if (mediaPeerConnections[senderId] && mediaPeerConnections[senderId].connectionState === 'connected') {
        continue;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      mediaPeerConnections[senderId] = pc;

      const senderSignalsPath = `media_signals/${senderId}/${myUserId}`;

      pc.onicecandidate = e => {
        if (e.candidate) push(ref(db, `${senderSignalsPath}/candidates`), e.candidate.toJSON()).catch(()=>{});
      };

      pc.pendingIce = [];
      onChildAdded(ref(db, `media_signals/${myUserId}/${senderId}/candidates`), async cSnap => {
        const c = cSnap.val(); if (!c) return;
        const cand = new RTCIceCandidate(c);
        if (pc.remoteDescription) { try { await pc.addIceCandidate(cand); } catch(e){} }
        else pc.pendingIce.push(cand);
      });

      pc.flushIce = async () => {
        const p = pc.pendingIce || []; pc.pendingIce = [];
        for (const cand of p) { try { await pc.addIceCandidate(cand); } catch(e){} }
      };

      pc.ondatachannel = (event) => {
        const dc = event.channel;
        setupMediaDataChannel(senderId, dc);
        if (dc.readyState === 'open') {
          mediaDataChannels[senderId] = dc;
        } else {
          dc.onopen = () => { mediaDataChannels[senderId] = dc; };
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
      await pc.flushIce();
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      
      await set(ref(db, `${senderSignalsPath}/answer`), { sdp: ans.sdp, type: ans.type, ts: Date.now() });
      await update(ref(db, `media_signals/${myUserId}/${senderId}`), { answered: true }).catch(()=>{});
    }
  });
}

function setupMediaDataChannel(peerId, dc) {
  dc.binaryType = 'arraybuffer';

  dc.onmessage = (event) => {
    const data = event.data;
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        handleMediaControlMessage(peerId, msg);
      } catch(e) {}
      return;
    }
    if (data instanceof ArrayBuffer) {
      handleIncomingChunk(peerId, data);
    }
  };

  dc.onclose = () => { delete mediaDataChannels[peerId]; };
  dc.onerror = (err) => { console.warn('Data channel error:', err); };
}

function handleMediaControlMessage(peerId, msg) {
  const mediaId = msg.mediaId;
  if (!mediaId) return;

  switch (msg.type) {
    case 'media-start':
      incomingChunks[mediaId] = [];
      activeTransfers[mediaId] = {
        mediaId, peerId, direction: 'receive',
        fileName: msg.fileName || 'file', mimeType: msg.mimeType || 'application/octet-stream',
        totalSize: msg.totalSize || 0, totalChunks: msg.totalChunks || 0,
        receivedChunks: 0, receivedBytes: 0, startedAt: Date.now(), status: 'receiving'
      };
      renderTransferQueue();
      break;

    case 'media-end':
      if (incomingChunks[mediaId]) {
        const transfer = activeTransfers[mediaId];
        const chunks = incomingChunks[mediaId];
        const blob = new Blob(chunks, { type: transfer?.mimeType || 'application/octet-stream' });

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result;
          updateChatMediaMessageWithData(mediaId, base64Data, transfer?.mimeType, transfer?.fileName);
          autoSaveMediaToDownloads(mediaId, base64Data, transfer.fileName, transfer.mimeType);
        };
        reader.readAsDataURL(blob);

        if (activeTransfers[mediaId]) {
          activeTransfers[mediaId].status = 'complete';
          renderTransferQueue();
          setTimeout(() => { delete activeTransfers[mediaId]; renderTransferQueue(); }, 2000);
        }
        delete incomingChunks[mediaId];
      }
      break;

    case 'media-request':
      if (localFileMemoryCache[mediaId]) {
        sendMediaFileOverDataChannel(peerId, localFileMemoryCache[mediaId]);
      }
      break;
  }
}

function handleIncomingChunk(peerId, arrayBuffer) {
  const activeMediaIds = Object.keys(activeTransfers).filter(id => {
    const t = activeTransfers[id];
    return t.peerId === peerId && t.direction === 'receive' && t.status === 'receiving';
  });

  if (activeMediaIds.length === 0) return;
  const mediaId = activeMediaIds[0];

  if (!incomingChunks[mediaId]) incomingChunks[mediaId] = [];
  incomingChunks[mediaId].push(arrayBuffer);

  const transfer = activeTransfers[mediaId];
  transfer.receivedChunks = (transfer.receivedChunks || 0) + 1;
  transfer.receivedBytes = (transfer.receivedBytes || 0) + arrayBuffer.byteLength;

  if (transfer.receivedChunks % 10 === 0 || transfer.receivedBytes >= transfer.totalSize) {
    renderTransferQueue();
  }
}

async function sendMediaFileOverDataChannel(peerId, file) {
  let dc;
  try {
    dc = await getOrCreateMediaDataChannel(peerId);
  } catch(e) {
    return null;
  }

  const mediaId = `media_${Date.now()}_${Math.floor(Math.random()*10000)}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  activeTransfers[mediaId] = {
    mediaId, peerId, direction: 'send', fileName: file.name || 'file',
    mimeType: file.type || 'application/octet-stream', totalSize: file.size,
    totalChunks, sentChunks: 0, sentBytes: 0, startedAt: Date.now(), status: 'sending'
  };
  renderTransferQueue();

  dc.send(JSON.stringify({
    type: 'media-start', mediaId, fileName: file.name, mimeType: file.type,
    totalSize: file.size, totalChunks
  }));

  await new Promise(r => setTimeout(r, 100));

  const arrayBuffer = await file.arrayBuffer();
  let offset = 0;

  while (offset < file.size) {
    if (dc.readyState !== 'open') {
      activeTransfers[mediaId].status = 'failed';
      renderTransferQueue();
      return null;
    }

    if (dc.bufferedAmount > BUFFER_HIGH_THRESHOLD) {
      await waitForBufferDrain(dc);
    }

    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const chunk = arrayBuffer.slice(offset, end);
    dc.send(chunk);

    offset = end;
    activeTransfers[mediaId].sentChunks++;
    activeTransfers[mediaId].sentBytes = offset;

    if (activeTransfers[mediaId].sentChunks % 10 === 0 || offset >= file.size) {
      renderTransferQueue();
    }
  }

  dc.send(JSON.stringify({ type: 'media-end', mediaId }));
  activeTransfers[mediaId].status = 'complete';
  renderTransferQueue();
  setTimeout(() => { delete activeTransfers[mediaId]; renderTransferQueue(); }, 2000);

  return mediaId;
}

function waitForBufferDrain(dc) {
  return new Promise(resolve => {
    const checkInterval = setInterval(() => {
      if (dc.bufferedAmount < BUFFER_LOW_THRESHOLD || dc.readyState !== 'open') {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);
  });
}

function getMediaTypeFromMime(mime) {
  if (!mime) return 'doc';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'doc';
}

function renderTransferQueue() {
  const queue = $('transferQueue');
  if (!queue) return;
  const transfers = Object.values(activeTransfers);

  if (transfers.length === 0) { queue.innerHTML = ''; return; }

  queue.innerHTML = transfers.map(t => {
    const isSend = t.direction === 'send';
    const current = isSend ? (t.sentBytes || 0) : (t.receivedBytes || 0);
    const pct = t.totalSize > 0 ? Math.min(100, Math.round(current * 100 / t.totalSize)) : 0;
    const arrow = isSend ? '⬆' : '⬇';
    const icon = getFileIcon(t.mimeType, t.fileName);

    return `
      <div class="transfer-item" data-media-id="${t.mediaId}">
        <div class="transfer-item-title">
          <span class="transfer-item-name">${arrow} ${icon} ${safeName(t.fileName)}</span>
          <span class="transfer-item-pct">${pct}%</span>
        </div>
        <div class="transfer-item-bar"><div class="transfer-item-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function updateChatMediaMessageWithData(mediaId, base64Data, mimeType = '', fileName = '') {
  const overlay = document.querySelector(`.media-download-overlay[data-media-id="${mediaId}"]`);
  if (overlay) {
    const isVideo = (mimeType && mimeType.startsWith('video/')) || base64Data.startsWith('data:video');
    const parent = overlay.parentNode;
    if (isVideo) {
      overlay.outerHTML = `
        <div class="media-bubble">
          <div class="media-video-thumb">
            <video src="${base64Data}" preload="metadata" playsinline></video>
            <div class="media-play-overlay">▶</div>
          </div>
        </div>`;
      const thumb = parent?.querySelector('.media-video-thumb');
      if (thumb) thumb.onclick = () => openMediaViewer(base64Data, mimeType || 'video/mp4', fileName || 'video');
    } else {
      overlay.outerHTML = `<div class="media-bubble"><img src="${base64Data}" alt="image" data-media-id="${mediaId}"></div>`;
      const img = parent?.querySelector(`img[data-media-id="${mediaId}"]`);
      if (img) img.onclick = () => openMediaViewer(base64Data, mimeType || 'image/jpeg', fileName || 'image');
    }
  }
}

function handleDocDownload(msgId, m) {
  if (m.data && (m.data.includes('maps.google.com') || m.fileName === 'लोकेशन')) {
    const openMaps = confirm('📍 लोकेशन Google Maps में खोलें?');
    if (openMaps) window.open(m.data, '_blank');
    else navigator.clipboard.writeText(m.data).then(() => toast('📋 लिंक कॉपी हो गया'));
    return;
  }

  if (m.mimeType === 'text/vcard' || (m.fileName && m.fileName.endsWith('.vcf'))) {
    const rawBase64 = m.data ? m.data.replace(/^data:text\/vcard;base64,/, '') : '';
    const handled = openContactVcfNative(rawBase64, m.fileName || 'contact.vcf');
    if (!handled && m.data) {
      saveMediaViaNative(rawBase64, m.fileName || 'contact.vcf', 'text/x-vcard');
      toast('👤 संपर्क VCF डाउनलोड हुआ');
    }
    return;
  }

  if (m.data) {
    openMediaViewer(m.data, m.mimeType || 'application/octet-stream', m.fileName || 'document');
  }
}

function openMediaViewer(dataUrl, mimeType, fileName) {
  mediaViewerState = { dataUrl, mimeType, fileName };
  const viewer = $('mediaViewer');
  const content = $('mediaViewerContent');
  content.innerHTML = '';

  if (mimeType.startsWith('image/')) {
    const img = document.createElement('img');
    img.src = dataUrl;
    content.appendChild(img);
  } else if (mimeType.startsWith('video/')) {
    const vid = document.createElement('video');
    vid.src = dataUrl;
    vid.controls = true; vid.autoplay = true; vid.playsInline = true;
    content.appendChild(vid);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = dataUrl;
    iframe.style.cssText = 'width:100%;height:100%;border:0;background:#fff';
    content.appendChild(iframe);
  }

  viewer.hidden = false;
}

$('closeMediaViewerBtn').onclick = () => {$('mediaViewer').hidden = true;
  $('mediaViewerContent').innerHTML = '';
  mediaViewerState = { mediaId: null, dataUrl: null, mimeType: null, fileName: null };
};

$('saveMediaBtn').onclick = () => {
  if (!mediaViewerState.dataUrl) return;
  const { dataUrl, mimeType, fileName } = mediaViewerState;
  const base64Only = dataUrl.split(',')[1] || dataUrl;
  saveMediaViaNative(base64Only, fileName || 'media', mimeType || 'application/octet-stream');
  toast('✅ Downloads में सहेज दिया गया');
};

const attachBtn = $('attachBtn');
const attachMenu = $('attachMenu');

attachBtn.onclick = (e) => {
  e.stopPropagation();
  attachMenu.hidden = !attachMenu.hidden;
};

document.addEventListener('click', (e) => {
  if (!attachMenu.hidden && !e.target.closest('#attachMenu') && !e.target.closest('#attachBtn')) {
    attachMenu.hidden = true;
  }
});

attachMenu.querySelectorAll('.attach-menu-item').forEach(btn => {
  btn.onclick = () => {
    const action = btn.dataset.action;
    attachMenu.hidden = true;

    if (action === 'camera') $('cameraCaptureInput').click();
    else if (action === 'image') $('photoFileInput').click();
    else if (action === 'doc') $('docFileInput').click();
    else if (action === 'location') sendLocationMessage();
    else if (action === 'contact') sendContactMessage();
    else if (action === 'phone') openPhoneContactsPicker();
  };
});

$('photoFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('videoFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };$('docFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('anyFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };$('cameraCaptureInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };

function sendLocationMessage() {
  if (!currentChatTargetId) return;
  if (!navigator.geolocation) { toast('लोकेशन सपोर्ट नहीं है'); return; }
  toast('📍 लोकेशन प्राप्त कर रहे हैं...');

  navigator.geolocation.getCurrentPosition(async (pos) => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
    const roomId = getChatRoomId(myUserId, currentChatTargetId);
    const roomPath = `chats/${roomId}/messages`;
    const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
    const newMsgRef = push(ref(db, roomPath));
    const label = '📍 लोकेशन';

    latestChatSnippets[currentChatTargetId] = { text: label, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
    localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
    renderContacts();

    await set(newMsgRef, {
      senderId: myUserId, senderName: myUserName, type: 'doc', text: label,
      fileName: 'लोकेशन', mimeType: 'text/plain', fileSize: mapsUrl.length,
      data: mapsUrl, time: Date.now(), delivered: targetOnline, read: false
    });

    sendChatMessagePush(currentChatTargetId, label, roomId, newMsgRef.key, { mediaType: 'doc', fileName: 'लोकेशन' });
    toast('✅ लोकेशन भेज दी गई');
  }, () => { toast('लोकेशन प्राप्त नहीं हुई'); });
}

async function sendContactMessage() {
  if (!currentChatTargetId) return;
  const list = Object.keys(allOnlineUsers).filter(id => id !== myUserId && allOnlineUsers[id]?.name);
  if (!list.length) { toast('कोई संपर्क नहीं'); return; }

  const names = list.map((id, i) => `${i+1}. ${allOnlineUsers[id].name}`).join('\n');
  const input = prompt('कौन सा संपर्क भेजें? (नंबर लिखें)\n\n' + names);
  if (!input) return;

  const idx = parseInt(input) - 1;
  if (isNaN(idx) || idx < 0 || idx >= list.length) { toast('गलत नंबर'); return; }

  const contact = allOnlineUsers[list[idx]];
  const vcfData = `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\nUID:${list[idx]}\nEND:VCARD`;
  const roomId = getChatRoomId(myUserId, currentChatTargetId);
  const roomPath = `chats/${roomId}/messages`;
  const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
  const newMsgRef = push(ref(db, roomPath));
  const label = `👤 ${contact.name}`;

  latestChatSnippets[currentChatTargetId] = { text: label, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  await set(newMsgRef, {
    senderId: myUserId, senderName: myUserName, type: 'doc', text: label,
    fileName: contact.name + '.vcf', mimeType: 'text/vcard', fileSize: vcfData.length,
    data: 'data:text/vcard;base64,' + btoa(vcfData), time: Date.now(), delivered: targetOnline, read: false
  });

  sendChatMessagePush(currentChatTargetId, label, roomId, newMsgRef.key, { mediaType: 'doc', fileName: contact.name + '.vcf', mimeType: 'text/vcard' });
  toast('✅ संपर्क भेज दिया गया');
}

let phoneContactsCache = [];

async function openPhoneContactsPicker() {
  if (!currentChatTargetId) return;
  if (!isNativeApp()) { toast(currentLang === 'hi' ? 'यह सिर्फ ऐप में काम करता है' : 'Only works in app'); return; }
  const modal = $('phoneContactsModal');
  if (!modal) return;
  modal.hidden = false;
  const list = $('phoneContactsList');
  const searchIn = $('phoneContactsSearch');
  const sendBtn = $('phoneContactsSendBtn');
  list.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">${currentLang==='hi'?'संपर्क लोड हो रहे हैं...':'Loading contacts...'}</div>`;
  searchIn.value = '';
  const selected = new Set();

  phoneContactsCache = await loadPhoneContacts();
  const seen = new Set();
  phoneContactsCache = phoneContactsCache.filter(c => {
    if (!c || !c.phone) return false;
    const k = c.phone.replace(/[^0-9]/g,'');
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });

  const updateSendBtn = () => {
    const n = selected.size;
    sendBtn.textContent = n > 0 ? `${translations[currentLang].sendSelected} (${n})` : translations[currentLang].sendSelected;
    sendBtn.disabled = n === 0;
  };

  const renderList = (filter) => {
    const q = (filter || '').toLowerCase().trim();
    const items = phoneContactsCache.filter(c => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
    if (!items.length) { list.innerHTML = `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">${currentLang==='hi'?'कोई संपर्क नहीं मिला':'No contacts found'}</div>`; return; }
    list.innerHTML = items.slice(0, 300).map((c) => {
      const initials = (c.name || '?').trim().charAt(0).toUpperCase();
      const isSel = selected.has(c.phone);
      return `<div class="phone-contact-row${isSel?' selected':''}" data-phone="${c.phone}">
        <div class="pc-avatar">${initials}</div>
        <div class="pc-info"><div class="pc-name">${safeName(c.name)}</div><div class="pc-phone">${c.phone}</div></div>
        <div class="pc-check">${isSel ? '✓' : ''}</div>
      </div>`;
    }).join('');
    list.querySelectorAll('.phone-contact-row').forEach(row => {
      row.onclick = () => {
        const ph = row.dataset.phone;
        if (selected.has(ph)) selected.delete(ph); else selected.add(ph);
        row.classList.toggle('selected', selected.has(ph));
        row.querySelector('.pc-check').textContent = selected.has(ph) ? '✓' : '';
        updateSendBtn();
      };
    });
  };

  searchIn.oninput = () => renderList(searchIn.value);
  sendBtn.onclick = async () => {
    if (!selected.size) return;
    const items = phoneContactsCache.filter(c => selected.has(c.phone));
    modal.hidden = true;
    for (const c of items) {
      const vcfData = `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\nTEL;TYPE=CELL:${c.phone}\nEND:VCARD`;
      await sendVcfMessage(vcfData, c.name.replace(/[^a-zA-Z0-9]/g,'_') + '.vcf');
    }
    toast(`✅ ${items.length} संपर्क भेजे गए`);
  };

  const cb = $('closePhoneContactsBtn');
  if (cb) cb.onclick = () => { $('phoneContactsModal').hidden = true; };
  updateSendBtn();
  renderList('');
}

async function sendVcfMessage(vcfData, fileName) {
  const targetId = currentChatTargetId;
  if (!targetId) return;
  const roomId = getChatRoomId(myUserId, targetId);
  const roomPath = `chats/${roomId}/messages`;
  const targetOnline = !!allOnlineUsers[targetId]?.online;
  const newMsgRef = push(ref(db, roomPath));
  const label = `👤 ${fileName.replace('.vcf','')}`;
  latestChatSnippets[targetId] = { text: label, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();
  await set(newMsgRef, {
    senderId: myUserId, senderName: myUserName, type: 'doc', text: label,
    fileName, mimeType: 'text/vcard', fileSize: vcfData.length,
    data: 'data:text/vcard;base64,' + btoa(unescape(encodeURIComponent(vcfData))),
    time: Date.now(), delivered: targetOnline, read: false
  });
  sendChatMessagePush(targetId, label, roomId, newMsgRef.key, { mediaType: 'doc', fileName, mimeType: 'text/vcard' });
}

// Voice Dock Recording
let dockMediaRecorder = null, dockAudioChunks = [], dockStream = null, dockTimer = null, dockSeconds = 0;
let dockAudioContext = null, dockAnalyser = null, dockAnimFrame = null, isDockPaused = false;
const voiceDock = $('voiceDock'), dockTimerText = $('dockTimerText'), dockPauseResumeBtn =$('dockPauseResumeBtn');
const dockPauseIco = $('dockPauseIco'), dockPauseText = $('dockPauseText'), dockBlinkDot =$('dockBlinkDot');
const waveCanvas = $('waveCanvas'), waveCtx = waveCanvas.getContext('2d');

async function openVoiceDock() {
  try {
    dockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    dockAudioChunks = [];
    dockMediaRecorder = new MediaRecorder(dockStream);
    dockMediaRecorder.ondataavailable = e => { if (e.data.size > 0) dockAudioChunks.push(e.data); };
    dockMediaRecorder.start(100);
    isDockPaused = false; dockSeconds = 0;
    dockTimerText.textContent = '0:00';
    dockPauseIco.textContent = '⏸';
    dockPauseText.textContent = currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
    dockBlinkDot.style.animationPlayState = 'running';
    voiceDock.hidden = false;
    setupWaveformVisualizer(dockStream);

    dockTimer = setInterval(() => {
      if (!isDockPaused) {
        dockSeconds++;
        dockTimerText.textContent = `${Math.floor(dockSeconds / 60)}:${String(dockSeconds % 60).padStart(2,'0')}`;
        if (dockSeconds >= 120) sendVoiceDock();
      }
    }, 1000);
  } catch(e) {
    toast('माइक की अनुमति नहीं मिल सकी');
  }
}

function setupWaveformVisualizer(stream) {
  try {
    dockAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = dockAudioContext.createMediaStreamSource(stream);
    dockAnalyser = dockAudioContext.createAnalyser();
    dockAnalyser.fftSize = 64;
    source.connect(dockAnalyser);
    const bufferLength = dockAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function drawWave() {
      dockAnimFrame = requestAnimationFrame(drawWave);
      dockAnalyser.getByteFrequencyData(dataArray);
      waveCanvas.width = waveCanvas.offsetWidth;
      waveCanvas.height = waveCanvas.offsetHeight;
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

dockPauseResumeBtn.onclick = () => {
  if (!dockMediaRecorder) return;
  if (!isDockPaused) {
    dockMediaRecorder.pause(); isDockPaused = true;
    dockPauseIco.textContent = '🎙'; dockPauseText.textContent = currentLang === 'hi' ? 'जारी रखें' : 'Resume';
    dockBlinkDot.style.animationPlayState = 'paused';
  } else {
    dockMediaRecorder.resume(); isDockPaused = false;
    dockPauseIco.textContent = '⏸'; dockPauseText.textContent = currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
    dockBlinkDot.style.animationPlayState = 'running';
  }
};

function discardRecording() {
  if (dockTimer) { clearInterval(dockTimer); dockTimer = null; }
  stopWaveformVisualizer();
  if (dockStream) { dockStream.getTracks().forEach(t => t.stop()); dockStream = null; }
  if (dockMediaRecorder && dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  dockAudioChunks = [];
  voiceDock.hidden = true;
  updateActionBtnState();
}
$('dockTrashBtn').onclick = discardRecording;

function sendVoiceDock() {
  if (!dockMediaRecorder) return;
  const durSec = Math.max(dockSeconds, 1);
  clearInterval(dockTimer); dockTimer = null;
  stopWaveformVisualizer();

  dockMediaRecorder.onstop = async () => {
    if (dockStream) dockStream.getTracks().forEach(t => t.stop());
    if (dockAudioChunks.length > 0 && currentChatTargetId) {
      playMessageTickSound();
      const audioBlob = new Blob(dockAudioChunks, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        const roomId = getChatRoomId(myUserId, currentChatTargetId);
        const roomPath = `chats/${roomId}/messages`;
        const durStr = `${Math.floor(durSec/60)}:${String(durSec%60).padStart(2,'0')}`;
        const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
        const newMsgRef = push(ref(db, roomPath));
        const voiceLabel = '🎙 ' + (currentLang==='hi'?'वॉयस नोट':'Voice Note');

        latestChatSnippets[currentChatTargetId] = { text: voiceLabel, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
        localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
        renderContacts();

        await set(newMsgRef, {
          senderId: myUserId, senderName: myUserName, type: 'audio',
          data: base64Audio, duration: durStr, durationSec: durSec,
          time: Date.now(), delivered: targetOnline, read: false
        });

        sendChatMessagePush(currentChatTargetId, voiceLabel, roomId, newMsgRef.key, {
          mediaType: 'audio', mediaSize: audioBlob.size, fileName: 'voice_note.webm', mimeType: 'audio/webm'
        });
      };
      reader.readAsDataURL(audioBlob);
    }
    dockAudioChunks = [];
  };
  if (dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  voiceDock.hidden = true;
  updateActionBtnState();
}
$('dockSendBtn').onclick = sendVoiceDock;

/* =========================================================================
   🔴🔴🔴 [PART 2 OF 3 — END (समाप्त): app.js v1.24.1] 🔴🔴🔴
   ========================================================================= */
/* =========================================================================
   🟢🟢🟢 [PART 3 OF 3 — START (शुरू): app.js v1.24.1] 🟢🟢🟢
   Call Engine, Controls, Strict Viewport & Touch-Slide Lock Fix, Hardware Back & Init
   ========================================================================= */

currentCallType = 'outgoing';

function listenForIncoming() {
  const incomingRef = ref(db, `user_inbox/${myUserId}`);

  get(incomingRef).then(snap => {
    const data = snap.val();
    if (data && data.status === 'calling' && !activeCallId) {
      handleIncomingCallNotification(data, true);
    }
  }).catch(()=>{});

  onValue(incomingRef, async (snap) => {
    const data = snap.val();
    if (!data) return;

    if (callJoinedViaDirectAccept && activeCallId === data.callId) {
      remove(incomingRef).catch(()=>{});
      return;
    }

    if (data.status === 'calling') {
      if (activeCallId === data.callId && isCallConnected) {
        remove(incomingRef).catch(()=>{});
        return;
      }
      if (isCallConnected || (activeCallId && !callScreen.hidden)) {
        await update(ref(db, `call_sessions/${data.callId}`), { status: 'busy' }).catch(()=>{});
        await remove(incomingRef).catch(()=>{});
        return;
      }
      handleIncomingCallNotification(data, true);
      await update(ref(db, `users/${myUserId}`), { activeCallId: data.callId }).catch(()=>{});
      await update(incomingRef, { status: 'ringing' }).catch(()=>{});
      await update(ref(db, `call_sessions/${data.callId}`), { status: 'ringing' }).catch(()=>{});
    } else if (data.status === 'cancelled' || data.status === 'ended') {
      clearOngoingCallNotification();
      if (!isCallConnected && currentCallType === 'incoming') {
        recordCallLog({
          callId: activeCallId,
          targetId: currentCallTargetId,
          name: currentCallTargetName,
          type: 'missed',
          callMode: isAudioOnlyCall ? 'audio' : 'video',
          duration: '00:00',
          time: Date.now()
        });

        if (!document.hidden) {
          triggerMissedCallNotification(currentCallTargetName, 1);
        }
      }
      stopAllCallTones();
      incomingDialog.hidden = true;
      hangup(true);
      remove(incomingRef).catch(()=>{});
      closeIfLocked();
    }
  });
}

function triggerMissedCallNotification(callerName, count) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const body = count === 1
    ? `आपको ${callerName} से 1 मिस्ड कॉल आई है`
    : `${callerName} से ${count} मिस्ड कॉल आई हैं`;

  navigator.serviceWorker?.ready.then(reg => {
    reg.showNotification('📵 मिस्ड कॉल', {
      body,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: `missed_${callerName}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: { type: 'missed_call' }
    });
  }).catch(() => {});
}

async function sendPushNotification(token, callerName, isVoice = false) {
  try {
    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title: "इनकमिंग कॉल...",
        body: `${callerName} आपको कॉल कर रहे हैं`,
        callerName: callerName + (isVoice ? "|AUDIO" : "|VIDEO"),
        callId: activeCallId
      })
    }).catch(()=>{});
  } catch(e) {}
}

async function startCall(remoteId, remoteName, audioOnly = false) {
  // कॉल मिलाते ही कनेक्टिंग टोन चालू करें
  CallAudioManager.playConnecting();
  
  try {
    const bSnap = await get(ref(db, `users/${remoteId}/activeCallId`));
    if (bSnap.exists() && bSnap.val()) {
      CallAudioManager.stopAll(); // अगर बिज़ी है तो टोन बंद कर दें
      toast(`${remoteName} ${currentLang==='hi'?'अभी दूसरी कॉल में व्यस्त है':'is busy on another call'}`);
      return;
    }
  } catch(e) {}

  isAudioOnlyCall = audioOnly;
  const stream = await acquireCallMedia(audioOnly);
  if (!stream) {
    CallAudioManager.stopAll();
    return;
  }

  activeCallId = `call_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  isCaller = true;
  currentCallType = 'outgoing';
  currentCallTargetId = remoteId;
  currentCallTargetName = remoteName;

  $('outgoingName').textContent = remoteName + (audioOnly ? (currentLang==='hi'?' (ऑडियो)...':' (Audio)...') : (currentLang==='hi'?' (वीडियो)...':' (Video)...'));
  $('outgoingStatusText').textContent = currentLang==='hi'?'कनेक्ट किया जा रहा है...':'Connecting...';
  outgoingDialog.hidden = false;

  await update(ref(db, `users/${myUserId}`), { activeCallId }).catch(()=>{});

  const sessionRef = ref(db, `call_sessions/${activeCallId}`);
  await set(sessionRef, {
    callId: activeCallId,
    callerId: myUserId,
    callerName: myUserName,
    targetId: remoteId,
    audioOnly: !!audioOnly,
    status: 'calling',
    createdAt: serverTimestamp()
  });

  await set(ref(db, `user_inbox/${remoteId}`), {
    callId: activeCallId,
    callerId: myUserId,
    callerName: myUserName,
    audioOnly: !!audioOnly,
    status: 'calling'
  });

  const unsubSession = onValue(sessionRef, (snap) => {
    const d = snap.val();
    if (!d) return;
    
    // jab samne wala ringing status set kare
    if (d.status === 'ringing' && !isCallConnected) {
      $('outgoingStatusText').textContent = currentLang==='hi'?'घंटी बज रही है... (Ringing)':'Ringing...';
      CallAudioManager.playRinging();
    }
    
    // jab samne wale ne call utha li ho
    if (d.status === 'answered') {
      CallAudioManager.stopAll();
    }
    // जब सामने वाला बिज़ी हो 
    if (d.status === 'busy') { 
      unsubSession(); 
      toast(currentLang==='hi'?'📵 सामने वाला अभी व्यस्त है':'📵 User is busy'); 
      CallAudioManager.playBusy();
      setTimeout(() => {
        outgoingDialog.hidden = true; 
        hangup(true);
      }, 2500); // 2.5 सेकंड बिज़ी टोन बजाकर काट दें
    }
    
    // जब सामने वाला कॉल काट (Reject) दे
    if (d.status === 'rejected') { 
      unsubSession(); 
      toast(currentLang==='hi'?'❌ कॉल अस्वीकार कर दी गई':'❌ Call declined'); 
      CallAudioManager.playBusy();
      setTimeout(() => {
        outgoingDialog.hidden = true; 
        hangup(true);
      }, 2500); // 2.5 सेकंड बिज़ी टोन बजाकर काट दें
    }
    
    if (d.status === 'ended' && isCallConnected) { 
      unsubSession(); 
      toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended'); 
      hangup(true); 
    }
  });
  unsubs.push(unsubSession);

  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = setTimeout(() => {
    if (activeCallId && !isCallConnected) { 
      CallAudioManager.stopAll();
      toast(currentLang==='hi'?'⏱ कॉल का जवाब नहीं मिला':'⏱ No answer'); 
      hangup(true); 
    }
  }, 45000);

  try {
    const tSnap = await get(ref(db, `users/${remoteId}`));
    const td = tSnap.val();
    if (td && td.fcmToken) sendPushNotification(td.fcmToken, myUserName, audioOnly);
  } catch(e) {}

  const unsubAns = onValue(ref(db, `call_sessions/${activeCallId}/members/${remoteId}`), (snap) => {
    if (snap.exists()) { 
      CallAudioManager.stopAll(); // बात शुरू होते ही सारी टोन्स बंद
      outgoingDialog.hidden = true; 
      unsubAns(); 
      joinCallSession(); 
    }
  });
  unsubs.push(unsubAns);
}

$('btnCancelCall').onclick = () => {
  CallAudioManager.stopAll(); // कैंसिल करते ही टोन बंद
  outgoingDialog.hidden = true;
  if (currentCallTargetId) {
    const roomId = getChatRoomId(myUserId, currentCallTargetId);
    const label = isAudioOnlyCall ? '📞 मिस्ड ऑडियो कॉल' : '📹 मिस्ड वीडियो कॉल';
    const logId = activeCallId || `call_${Date.now()}`;
    set(ref(db, `chats/${roomId}/messages/${logId}`), {
      senderId: myUserId, senderName: myUserName, type: 'system-call',
      text: label, time: Date.now(), delivered: true, read: false
    }).catch(()=>{});

    update(ref(db, `user_inbox/${currentCallTargetId}`), { status: 'cancelled' }).catch(()=>{});
    setTimeout(() => {
      remove(ref(db, `user_inbox/${currentCallTargetId}`)).catch(()=>{});
    }, 3000);

    get(ref(db, `users/${currentCallTargetId}`)).then(snap => {
      const token = snap.val()?.fcmToken;
      if (token) {
        fetch("https://neeraj.neerajthegreat192.workers.dev/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title: "Cancel", body: "Call Cancelled", callId: "CANCEL_" + activeCallId, callerName: myUserName })
        }).catch(()=>{});
      }
    }).catch(()=>{});
  }
  hangup();
};

$('btnAccept').onclick = async () => {
  CallAudioManager.stopAll(); // उठाते ही रिंग टोन बंद
  incomingDialog.hidden = true;
  if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
};

$('btnReject').onclick = async () => {
  CallAudioManager.stopAll();
  incomingDialog.hidden = true;
  clearOngoingCallNotification();

  recordCallLog({
    callId: activeCallId, targetId: currentCallTargetId, name: currentCallTargetName,
    type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now()
  });

  if (activeCallId) await update(ref(db, `call_sessions/${activeCallId}`), { status: 'rejected' }).catch(()=>{});
  await update(ref(db, `user_inbox/${myUserId}`), { status: 'rejected' }).catch(()=>{});
  setTimeout(() => remove(ref(db, `user_inbox/${myUserId}`)).catch(()=>{}), 2500);

  const wasLocked = isDeviceLocked();
  if (!wasLocked) {
    activeCallId = null;
    isCallConnected = false;
    isAudioOnlyCall = false;
    currentCallTargetId = null;
    currentCallTargetName = null;
    currentCallType = 'outgoing';
    callJoinedViaDirectAccept = false;

    callScreen.hidden = true;
    chatScreen.hidden = true;
    lobbyScreen.hidden = false;
  } else {
    callScreen.hidden = true;
    chatScreen.hidden = true;
    lobbyScreen.hidden = true;
  }

  closeIfLocked();
};

function updateCallModeVisuals(isVoiceMode) {
  const voiceArea = $('voiceCallArea');
  const remoteGridEl = $('remoteGrid');
  const flipBtn = $('flipBtn');
  const modeIco = $('audioModeIco');

  if (isVoiceMode) {
    if (voiceArea) voiceArea.hidden = false;
    $('voiceCallRemoteName').textContent = currentCallTargetName || 'उपयोगकर्ता';
    remoteGridEl.style.display = 'none';
    pipWrap.style.display = 'none';
    if (flipBtn) flipBtn.style.display = 'none';
    $('camBtn').classList.add('off');
    $('audioModeBtn').classList.add('off');
    if (modeIco) {
      modeIco.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4c.39.39 1.06.11 1.06-.45V6.95c0-.56-.67-.84-1.06-.45l-4 4z"/></svg>';
    }
  } else {
    if (voiceArea) voiceArea.hidden = true;
    remoteGridEl.style.display = 'grid';
    pipWrap.style.display = 'block';
    pipWrap.style.opacity = '1';
    if (flipBtn) flipBtn.style.display = 'flex';
    $('camBtn').classList.remove('off');
    $('audioModeBtn').classList.remove('off');
    if (modeIco) {
      modeIco.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 0 0-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>';
    }
  }
}

async function toggleVideoTrackMode(enableCam) {
  try {
    if (enableCam) {
      let vTrack = localStream ? localStream.getVideoTracks()[0] : null;
      if (!vTrack) {
        const vStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, frameRate: { ideal: 30, min: 20 } }
        });
        vTrack = vStream.getVideoTracks()[0];
        if (localStream) localStream.addTrack(vTrack);
      } else vTrack.enabled = true;

      localVideo.srcObject = localStream;
      isAudioOnlyCall = false;
      camEnabled = true;
      updateCallModeVisuals(false);

      for (const pId of Object.keys(peerConnections)) {
        const pc = peerConnections[pId];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(vTrack);
        } else {
          pc.addTrack(vTrack, localStream);
          const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${pId}`;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: applySDPBitrate(offer.sdp) }));
          set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
        }
        boostPeerBitrate(pc);
      }
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { camEnabled: true, audioOnly: false }).catch(()=>{});
      setHardwareSpeaker(true);
      toast(currentLang === 'hi' ? '📹 वीडियो मोड चालू' : '📹 Video mode active');
    } else {
      if (localStream) localStream.getVideoTracks().forEach(t => { t.enabled = false; });
      camEnabled = false;
      isAudioOnlyCall = true;
      updateCallModeVisuals(true);
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { camEnabled: false, audioOnly: true }).catch(()=>{});
      setHardwareSpeaker(false);
      toast(currentLang === 'hi' ? '📞 ऑडियो मोड चालू (इयरपीस)' : '📞 Voice mode active (Earpiece)');
    }
  } catch(e) {
    toast('कैमरा स्विच नहीं हो सका');
  }
}

$('audioModeBtn').onclick = (e) => {
  e.stopPropagation();
  isAudioOnlyCall = !isAudioOnlyCall;
  toggleVideoTrackMode(!isAudioOnlyCall);
  scheduleAutoHide();
};

// --- पॉइंट #4: PiP Mode Native Call ---
if ($('btnEnterPip')) {
  $('btnEnterPip').onclick = (e) => {
    e.stopPropagation();
    if (window.AndroidBridge && window.AndroidBridge.enterPipMode) {
      window.AndroidBridge.enterPipMode();
    } else if (window.AndroidAudio && window.AndroidAudio.enterPipMode) {
      window.AndroidAudio.enterPipMode();
    } else {
      toast(currentLang === 'hi' ? 'PiP मोड केवल ऐप में समर्थित है' : 'PiP mode supported in app only');
    }
  };
}

async function boostPeerBitrate(pc) {
  try {
    for (const sender of pc.getSenders()) {
      if (sender.track && sender.track.kind === 'video') {
        const p = sender.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
        p.encodings[0].maxBitrate = 5000000;
        p.encodings[0].networkPriority = 'high';
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
        const p = s.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
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
  txt.textContent = level === 'medium' ? translations[currentLang].netMedium : translations[currentLang].netOnline;
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
  stopNetworkQualityMonitor();
  qualityLevel = '';
  updateNetworkIndicator('high');
  applyCallQuality('high').catch(()=>{});
  sampleNetworkQuality();
  qualityTimer = setInterval(sampleNetworkQuality, 3000);
}
function stopNetworkQualityMonitor() {
  if (qualityTimer) { clearInterval(qualityTimer); qualityTimer = null; }
  qualityLevel = 'high';
}

// ===================================================
// 🪄 FUN MODE & GAMES
// ===================================================
$('funModeBtn').onclick = (e) => {
  e.stopPropagation();
  if (!isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही फन मोड खोलें' : 'Connect call to open Fun Mode');
    return;
  }
  const tray = $('funModeTray');
  tray.hidden = false;
  controlsBar.classList.add('fade-out');
};

$('closeFunTrayBtn').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
};

$('funModeTray').onclick = (e) => {
  if (e.target === $('funModeTray')) $('funModeTray').hidden = true;
};

// 1. Kids Quiz Module
let allQuizQuestions = null;
let quizSessionUnsub = null;
let quizTimerInterval = null;

async function fetchQuizQuestions() {
  if (allQuizQuestions) return allQuizQuestions;
  try {
    const res = await fetch('https://neerajthegreat192.github.io/questions.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      allQuizQuestions = await res.json();
      return allQuizQuestions;
    }
  } catch(e) {}
  return null;
}

function startQuizTimerBar(durationSec = 15) {
  stopQuizTimerBar();
  const bar = $('quizTimerBar');
  if (!bar) return;
  let timeLeft = durationSec;
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => { if (bar) bar.style.transition = 'width 1s linear'; }, 50);

  quizTimerInterval = setInterval(() => {
    timeLeft--;
    const pct = Math.max(0, (timeLeft / durationSec) * 100);
    if (bar) bar.style.width = pct + '%';
    if (timeLeft <= 0) {
      clearInterval(quizTimerInterval);
      quizTimerInterval = null;
      playOopsSound();
      toast(currentLang === 'hi' ? '⏱ समय समाप्त हो गया!' : '⏱ Time up!');
      document.querySelectorAll('.quiz-opt-btn').forEach(b => { b.disabled = true; });
    }
  }, 1000);
}

function stopQuizTimerBar() {
  if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
  const bar = $('quizTimerBar');
  if (bar) bar.style.width = '100%';
}

async function sendQuizQuestion(category = 'lkg_ukg') {
  if (!activeCallId) { toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही क्विज़ चलाएँ' : 'Start quiz during active call'); return; }
  const data = await fetchQuizQuestions();
  if (!data || !data[category] || data[category].length === 0) { toast(currentLang === 'hi' ? 'सवाल लोड नहीं हो सके!' : 'Failed to load questions'); return; }
  const list = data[category];
  const randomQ = list[Math.floor(Math.random() * list.length)];
  const quizRef = ref(db, `call_sessions/${activeCallId}/quiz_state`);
  await set(quizRef, {
    category, question: randomQ.q, options: randomQ.opts, answer: randomQ.ans,
    selectedAnswer: null, isCorrect: null, updatedAt: Date.now()
  });
}

function initKidsQuizListener() {
  if (!activeCallId) return;
  if (quizSessionUnsub) quizSessionUnsub();
  const quizRef = ref(db, `call_sessions/${activeCallId}/quiz_state`);
  quizSessionUnsub = onValue(quizRef, snap => {
    const qState = snap.val();
    const box = $('kidsQuizBox');
    if (!box) return;
    if (!qState || !qState.question) { box.hidden = true; stopQuizTimerBar(); return; }
    box.hidden = false;
    $('funModeTray').hidden = true;
    controlsBar.classList.add('fade-out');

    const qText = $('quizQuestionText');
    if (qText) qText.textContent = qState.question;
    const catSelect = $('quizCategorySelect');
    if (catSelect && qState.category) catSelect.value = qState.category;

    const optsArea = $('quizOptionsArea');
    if (!optsArea) return;
    optsArea.innerHTML = '';

    if (!qState.selectedAnswer) startQuizTimerBar(15);
    else stopQuizTimerBar();

    (qState.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;
      if (qState.selectedAnswer) {
        if (opt === qState.answer) {
          btn.style.background = '#10b981';
          btn.style.color = '#fff';
          btn.style.borderColor = '#10b981';
        } else if (opt === qState.selectedAnswer && !qState.isCorrect) {
          btn.style.background = '#ef4444';
          btn.style.color = '#fff';
          btn.style.borderColor = '#ef4444';
        }
        btn.disabled = true;
      }
      btn.onclick = (e) => {
        e.stopPropagation();
        stopQuizTimerBar();
        const isRight = (opt === qState.answer);
        if (isRight) playCheerSound(); else playOopsSound();
        update(quizRef, { selectedAnswer: opt, isCorrect: isRight }).catch(()=>{});
      };
      optsArea.appendChild(btn);
    });
  });
}

async function closeKidsQuiz() {
  stopQuizTimerBar();
  if (activeCallId) await remove(ref(db, `call_sessions/${activeCallId}/quiz_state`)).catch(()=>{});
  const box = $('kidsQuizBox');
  if (box) box.hidden = true;
}

$('nextQuizBtn').onclick = (e) => {
  e.stopPropagation();
  const cat = $('quizCategorySelect').value || 'lkg_ukg';
  sendQuizQuestion(cat);
};
$('quizCategorySelect').onchange = (e) => {
  e.stopPropagation();
  sendQuizQuestion(e.target.value);
};
$('closeQuizBtn').onclick = (e) => {
  e.stopPropagation();
  closeKidsQuiz();
};

$('btnKidsQuiz').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!isCallConnected) { toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही क्विज़ शुरू करें' : 'Start quiz when call is connected'); return; }
  const box = $('kidsQuizBox');
  if (box.hidden) {
    const cat = $('quizCategorySelect').value || 'lkg_ukg';
    sendQuizQuestion(cat);
  } else {
    closeKidsQuiz();
  }
  scheduleAutoHide();
};

// --- पॉइंट #3: Riddle & GK Module ---
let riddleData = null;
let riddleSessionUnsub = null;
let riddleTimerInterval = null;

async function fetchRiddleData() {
  if (riddleData) return riddleData;
  try {
    const res = await fetch('https://neerajthegreat192.github.io/riddle.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data) { riddleData = data; return riddleData; }
    }
  } catch(e) {}
  
  // Fallback defaults
  return {
    easy_mode: [
      { q: "Which is the National Animal of India?", opts: ["Lion", "Tiger", "Elephant", "Leopard"], ans: "Tiger" },
      { q: "ऐसी कौन सी चीज है जो पानी पीते ही मर जाती है?", opts: ["पेड़", "आग", "प्यास", "नदी"], ans: "आग" }
    ],
    hard_mode: [
      { q: "ऐसी कौन सी जगह है जहाँ समुद्र है लेकिन पानी नहीं, नदियाँ हैं लेकिन मछली नहीं, और जंगल हैं लेकिन पेड़ नहीं?", ans: "नक्शा" },
      { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?", ans: "An Echo" }
    ]
  };
}

function startRiddleTimerBar(durationSec = 20) {
  stopRiddleTimerBar();
  const bar = $('riddleTimerBar');
  if (!bar) return;
  let timeLeft = durationSec;
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => { if (bar) bar.style.transition = 'width 1s linear'; }, 50);

  riddleTimerInterval = setInterval(() => {
    timeLeft--;
    const pct = Math.max(0, (timeLeft / durationSec) * 100);
    if (bar) bar.style.width = pct + '%';
    if (timeLeft <= 0) {
      clearInterval(riddleTimerInterval);
      riddleTimerInterval = null;
      playOopsSound();
      toast(currentLang === 'hi' ? '⏱ समय समाप्त हो गया!' : '⏱ Time up!');

      if (activeCallId) {
        const riddleRef = ref(db, `call_sessions/${activeCallId}/riddle_state`);
        get(riddleRef).then(snap => {
          const st = snap.val();
          if (st && !st.answered) {
            update(riddleRef, {
              answered: true,
              timedOut: true,
              wrongScore: (st.wrongScore || 0) + 1,
              updatedAt: Date.now()
            });
          }
        });
      }
    }
  }, 1000);
}

function stopRiddleTimerBar() {
  if (riddleTimerInterval) { clearInterval(riddleTimerInterval); riddleTimerInterval = null; }
  const bar = $('riddleTimerBar');
  if (bar) bar.style.width = '100%';
}

async function sendRiddleQuestion(mode = 'easy_mode') {
  if (!activeCallId) return;
  const data = await fetchRiddleData();
  const list = data[mode] || data.easy_mode;
  if (!list || list.length === 0) return;

  const randomQ = list[Math.floor(Math.random() * list.length)];
  const riddleRef = ref(db, `call_sessions/${activeCallId}/riddle_state`);

  get(riddleRef).then(snap => {
    const cur = snap.val() || {};
    let rScore = cur.rightScore || 0;
    let wScore = cur.wrongScore || 0;

    if (rScore + wScore >= 10) { rScore = 0; wScore = 0; }

    set(riddleRef, {
      mode,
      question: randomQ.q || randomQ.question,
      options: randomQ.opts || randomQ.options || null,
      answer: randomQ.ans || randomQ.answer,
      answered: false,
      buzzerPressed: false,
      timedOut: false,
      rightScore: rScore,
      wrongScore: wScore,
      updatedAt: Date.now()
    });
  });
}

function initRiddleGkListener() {
  if (!activeCallId) return;
  if (riddleSessionUnsub) riddleSessionUnsub();

  const riddleRef = ref(db, `call_sessions/${activeCallId}/riddle_state`);
  riddleSessionUnsub = onValue(riddleRef, snap => {
    const state = snap.val();
    let box = $('kidsRiddleBox');
    if (!box) return;
    if (!state || !state.question) { box.hidden = true; stopRiddleTimerBar(); return; }

    box.hidden = false;
    $('funModeTray').hidden = true;
    controlsBar.classList.add('fade-out');

    $('riddleQuestionText').textContent = state.question;
    $('riddleModeSelect').value = state.mode;

    const rScore = state.rightScore || 0;
    const wScore = state.wrongScore || 0;
    $('riddleScoreDisplay').textContent = `✅ ${rScore} | ❌ ${wScore}`;
    const totalDisp = $('riddleTotalDisplay');
    if (totalDisp) totalDisp.textContent = `प्रश्न: ${rScore + wScore}/10`;

    const optsArea = $('riddleOptionsArea');
    const hardEvalArea = $('riddleHardEvalArea');
    const buzzerWrap = $('riddleBuzzerWrap'); 
    optsArea.innerHTML = '';
    hardEvalArea.hidden = true;

    // Check if the current user is the parent/admin
    const amIParent = isNeerajBadola(myUserName) || isCaller;

    if (rScore + wScore >= 10) {
      stopRiddleTimerBar();
      if (buzzerWrap) buzzerWrap.hidden = true;
      optsArea.innerHTML = `<div style="text-align:center;font-size:16px;font-weight:800;color:#10b981;padding:15px;grid-column:1/-1;">🎉 मुकाबला समाप्त! सही: ${rScore}, गलत: ${wScore}</div>`;
      return;
    }

    if (!state.answered && !state.timedOut && !state.buzzerPressed) {
      startRiddleTimerBar(20);
    } else {
      stopRiddleTimerBar();
    }

    if (state.mode === 'easy_mode') {
      if (buzzerWrap) buzzerWrap.hidden = true; 
      if (state.options) {
        state.options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'quiz-opt-btn';
          btn.textContent = opt;

          if (state.answered) {
            if (opt === state.answer) {
              btn.style.background = '#10b981'; btn.style.color = '#fff'; btn.style.borderColor = '#10b981';
            } else if (opt === state.selectedAnswer && !state.isCorrect) {
              btn.style.background = '#ef4444'; btn.style.color = '#fff'; btn.style.borderColor = '#ef4444';
            }
            btn.disabled = true;
          }

          btn.onclick = (e) => {
            e.stopPropagation();
            if (state.answered) return;
            stopRiddleTimerBar();
            const isRight = (opt === state.answer);
            if (isRight) playCheerSound(); else playOopsSound();

            update(riddleRef, {
              answered: true,
              selectedAnswer: opt,
              isCorrect: isRight,
              rightScore: isRight ? rScore + 1 : rScore,
              wrongScore: !isRight ? wScore + 1 : wScore,
              updatedAt: Date.now()
            });
          };
          optsArea.appendChild(btn);
        });
      }
    }
    else if (state.mode === 'hard_mode') {
      if (buzzerWrap) buzzerWrap.hidden = false;

      if (amIParent) {
        hardEvalArea.hidden = false;
        const ansLabel = $('riddleHiddenAnswer');
        const showAnsBtn = $('riddleShowAnswerBtn');

        if (state.answered || state.timedOut) {
          if(showAnsBtn) showAnsBtn.hidden = true;
          ansLabel.hidden = false;
          ansLabel.textContent = `उत्तर: ${state.answer}`;
          ansLabel.style.color = state.isCorrect ? '#10b981' : '#ef4444';
          $('evalRightBtn').disabled = true;
          $('evalWrongBtn').disabled = true;
        } else {
          ansLabel.hidden = true;
          if(showAnsBtn) showAnsBtn.hidden = false;
          ansLabel.textContent = `[गुप्त उत्तर]: ${state.answer}`;
          ansLabel.style.color = '#f59e0b';
          $('evalRightBtn').disabled = false;
          $('evalWrongBtn').disabled = false;
        }
      } else {
        hardEvalArea.hidden = true; 
      }
    }

    if (state.answered || state.timedOut) {
      const info = document.createElement('div');
      info.style.cssText = 'margin-top:10px;font-size:14px;font-weight:800;text-align:center;grid-column:1/-1;';
      info.style.color = state.isCorrect ? '#10b981' : (state.timedOut ? '#f59e0b' : '#ef4444');
      info.textContent = state.timedOut ? `⏱ समय समाप्त! उत्तर: ${state.answer}` : (state.isCorrect ? '🎉 सही जवाब!' : `❌ गलत! उत्तर: ${state.answer}`);
      optsArea.appendChild(info);
    }
  });
}

async function evaluateHardAnswer(isRight) {
  if (!activeCallId) return;
  stopRiddleTimerBar();
  if (isRight) playCheerSound(); else playOopsSound();

  const riddleRef = ref(db, `call_sessions/${activeCallId}/riddle_state`);
  const snap = await get(riddleRef);
  const st = snap.val();
  if (!st || st.answered) return;

  const rScore = st.rightScore || 0;
  const wScore = st.wrongScore || 0;

  await update(riddleRef, {
    answered: true,
    isCorrect: isRight,
    rightScore: isRight ? rScore + 1 : rScore,
    wrongScore: !isRight ? wScore + 1 : wScore,
    updatedAt: Date.now()
  });
}

async function closeRiddleGame() {
  stopRiddleTimerBar();
  if (activeCallId) await remove(ref(db, `call_sessions/${activeCallId}/riddle_state`)).catch(()=>{});
  const box = $('kidsRiddleBox');
  if (box) box.hidden = true;
}

if ($('trayBtnRiddleGk')) {
  $('trayBtnRiddleGk').onclick = (e) => {
    e.stopPropagation();
    $('funModeTray').hidden = true;
    if (!isCallConnected) { toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही गेम शुरू करें' : 'Connect call to play'); return; }
    const box = $('kidsRiddleBox');
    if (box.hidden) {
      sendRiddleQuestion('easy_mode');
    } else {
      closeRiddleGame();
    }
    scheduleAutoHide();
  };
}

if ($('riddleBuzzerBtn')) {
  $('riddleBuzzerBtn').onclick = (e) => {
    e.stopPropagation();
    if (!activeCallId) return;
    playMessageTickSound();
    update(ref(db, `call_sessions/${activeCallId}/riddle_state`), { buzzerPressed: true }).catch(()=>{});
  };
}

if ($('riddleShowAnswerBtn')) {
  $('riddleShowAnswerBtn').onclick = (e) => {
    e.stopPropagation();
    const ansLabel = $('riddleHiddenAnswer');
    if (ansLabel) {
      ansLabel.hidden = false;
      $('riddleShowAnswerBtn').hidden = true;
    }
  };
}

if ($('evalRightBtn')) $('evalRightBtn').onclick = (e) => { e.stopPropagation(); evaluateHardAnswer(true); };
if ($('evalWrongBtn')) $('evalWrongBtn').onclick = (e) => { e.stopPropagation(); evaluateHardAnswer(false); };
if ($('nextRiddleBtn')) $('nextRiddleBtn').onclick = (e) => { e.stopPropagation(); sendRiddleQuestion($('riddleModeSelect').value); };
if ($('riddleModeSelect')) $('riddleModeSelect').onchange = (e) => { e.stopPropagation(); sendRiddleQuestion(e.target.value); };
if ($('closeRiddleBtn')) $('closeRiddleBtn').onclick = (e) => { e.stopPropagation(); closeRiddleGame(); };


// Whiteboard
let isDrawing = false;
let currentColor = '#10b981';
let currentLineWidth = 4;
let isEraserActive = false;
let canvasEl = null;
let ctx = null;
let canvasEventsAttached = false;
let canvasSessionUnsub = null;
let whiteboardSyncUnsub = null;

function initLiveCanvas() {
  canvasEl = $('kidsWhiteboardCanvas');
  if (!canvasEl) return;
  ctx = canvasEl.getContext('2d');

  function resizeCanvas() {
    if (!canvasEl) return;
    canvasEl.width = canvasEl.offsetWidth || window.innerWidth;
    canvasEl.height = canvasEl.offsetHeight || (window.innerHeight - 80);
  }
  setTimeout(resizeCanvas, 60);

  if (!canvasEventsAttached) {
    const startDraw = (e) => {
      isDrawing = true;
      const pt = getCanvasPoint(e);
      broadcastDrawPoint(pt.x, pt.y, 'start');
    };
    const moveDraw = (e) => {
      if (!isDrawing) return;
      const pt = getCanvasPoint(e);
      broadcastDrawPoint(pt.x, pt.y, 'draw');
    };
    const stopDraw = () => {
      if (!isDrawing) return;
      isDrawing = false;
      broadcastDrawPoint(0, 0, 'stop');
    };
    canvasEl.addEventListener('pointerdown', startDraw);
    canvasEl.addEventListener('pointermove', moveDraw);
    canvasEl.addEventListener('pointerup', stopDraw);
    canvasEl.addEventListener('pointercancel', stopDraw);
    canvasEventsAttached = true;
  }
  listenRemoteCanvas();
}

function getCanvasPoint(e) {
  if (!canvasEl) return { x: 0, y: 0 };
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  };
}

function broadcastDrawPoint(x, y, action) {
  if (!activeCallId) return;
  const drawRef = ref(db, `call_sessions/${activeCallId}/canvas_draw`);
  set(drawRef, {
    x, y, action,
    color: isEraserActive ? '#05070a' : currentColor,
    size: isEraserActive ? 18 : currentLineWidth,
    sender: myUserId,
    ts: Date.now()
  }).catch(()=>{});
}

function listenRemoteCanvas() {
  if (!activeCallId) return;
  if (canvasSessionUnsub) canvasSessionUnsub();
  const drawRef = ref(db, `call_sessions/${activeCallId}/canvas_draw`);
  canvasSessionUnsub = onValue(drawRef, snap => {
    const pt = snap.val();
    if (!pt || !ctx || !canvasEl) return;
    const absX = pt.x * canvasEl.width;
    const absY = pt.y * canvasEl.height;
    ctx.strokeStyle = pt.color || '#10b981';
    ctx.lineWidth = pt.size || 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (pt.action === 'start') { ctx.beginPath(); ctx.moveTo(absX, absY); }
    else if (pt.action === 'draw') { ctx.lineTo(absX, absY); ctx.stroke(); }
    else if (pt.action === 'stop') { ctx.closePath(); }
    else if (pt.action === 'clear') { ctx.clearRect(0, 0, canvasEl.width, canvasEl.height); }
  });
}

function listenWhiteboardAutoSync() {
  if (!activeCallId) return;
  if (whiteboardSyncUnsub) whiteboardSyncUnsub();
  whiteboardSyncUnsub = onValue(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), snap => {
    const val = snap.val();
    const wb = $('kidsWhiteboardModal');
    if (!wb) return;
    if (val && val.active) {
      if (wb.hidden) {
        wb.hidden = false;
        $('funModeTray').hidden = true;
        initLiveCanvas();
        controlsBar.classList.add('fade-out');
      }
    } else {
      if (!wb.hidden) wb.hidden = true;
    }
  });
}

function clearLiveCanvas() {
  if (ctx && canvasEl) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (activeCallId) {
    set(ref(db, `call_sessions/${activeCallId}/canvas_draw`), { action: 'clear', ts: Date.now() }).catch(()=>{});
  }
}

document.querySelectorAll('.color-dot').forEach(btn => {
  btn.onclick = (e) => {
    e.stopPropagation();
    isEraserActive = false;
    $('eraserBtn').classList.remove('active');
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    btn.classList.add('active');
    currentColor = btn.dataset.color || '#10b981';
  };
});

$('eraserBtn').onclick = (e) => {
  e.stopPropagation();
  isEraserActive = !isEraserActive;
  $('eraserBtn').classList.toggle('active', isEraserActive);
};

const brushSizes = [2, 4, 8, 16];
let brushIdx = 1;
$('brushSizeBtn').onclick = (e) => {
  e.stopPropagation();
  brushIdx = (brushIdx + 1) % brushSizes.length;
  currentLineWidth = brushSizes[brushIdx];
  $('brushSizeBtn').textContent = `✏️ ${currentLineWidth}px`;
};

$('gridBgBtn').onclick = (e) => {
  e.stopPropagation();
  const wrap = $('whiteboardCanvasWrap');
  const isGrid = wrap.classList.toggle('grid-bg');
  $('gridBgBtn').classList.toggle('active', isGrid);
};

$('clearCanvasBtn').onclick = (e) => {
  e.stopPropagation();
  clearLiveCanvas();
};

$('closeWhiteboardBtn').onclick = (e) => {
  e.stopPropagation();
  if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
  $('kidsWhiteboardModal').hidden = true;
};

$('btnWhiteboard').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!isCallConnected) { toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही बोर्ड खोलें' : 'Open whiteboard during active call'); return; }
  const wb = $('kidsWhiteboardModal');
  const willOpen = wb.hidden;
  if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: willOpen }).catch(()=>{});
  scheduleAutoHide();
};

// Tic-Tac-Toe
let tttSessionUnsub = null;
let lastAnnouncedTttWinId = null;

const TTT_WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function checkTttWinner(board) {
  for (let line of TTT_WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], pattern: line };
    }
  }
  if (board.every(cell => cell !== "")) return { winner: 'draw', pattern: [] };
  return null;
}

function ensureTictactoeDOM() {
  if ($('kidsTictactoeBox')) return;
  const box = document.createElement('div');
  box.id = 'kidsTictactoeBox';
  box.className = 'ttt-floating-box';
  box.hidden = true;
  box.innerHTML = `
    <div class="ttt-header">
      <div class="ttt-title">❌⭕ टिक-टैक-टो (Zero-Kaata)</div>
      <button id="closeTttBtn" class="ttt-close-btn" title="बंद करें">✕</button>
    </div>
    <div id="tttStatusBar" class="ttt-status-bar">खेल शुरू हो रहा है...</div>
    <div id="tttGrid" class="ttt-grid"></div>
    <button id="tttResetBtn" class="ttt-reset-btn">🔄 नया खेल (New Game)</button>
  `;
  callScreen.appendChild(box);

  const grid = box.querySelector('#tttGrid');
  for (let i = 0; i < 9; i++) {
    const cell = document.createElement('button');
    cell.className = 'ttt-cell';
    cell.dataset.index = i;
    cell.onclick = (e) => { e.stopPropagation(); handleTttCellClick(i); };
    grid.appendChild(cell);
  }

  box.querySelector('#closeTttBtn').onclick = (e) => { e.stopPropagation(); closeTictactoeGame(); };
  box.querySelector('#tttResetBtn').onclick = (e) => { e.stopPropagation(); resetTictactoeGame(); };
}

async function startOrToggleTictactoe() {
  if (!activeCallId || !isCallConnected) { toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही खेल शुरू करें' : 'Connect call to play'); return; }
  ensureTictactoeDOM();
  const tttRef = ref(db, `call_sessions/${activeCallId}/tictactoe_state`);
  const snap = await get(tttRef);
  const cur = snap.val();
  if (!cur || !cur.active) {
    const remoteId = Object.keys(peerConnections)[0] || currentCallTargetId || 'remote_user';
    await set(tttRef, {
      active: true,
      board: Array(9).fill(""),
      currentTurn: "X",
      playerX: myUserId,
      playerO: remoteId,
      winner: null,
      winPattern: [],
      updatedAt: Date.now()
    });
  } else {
    $('kidsTictactoeBox').hidden = !$('kidsTictactoeBox').hidden;
  }
}

function listenTictactoeSession() {
  if (!activeCallId) return;
  if (tttSessionUnsub) tttSessionUnsub();
  ensureTictactoeDOM();
  const tttRef = ref(db, `call_sessions/${activeCallId}/tictactoe_state`);
  tttSessionUnsub = onValue(tttRef, snap => {
    const state = snap.val();
    const box = $('kidsTictactoeBox');
    if (!box) return;
    if (!state || !state.active) { box.hidden = true; return; }
    box.hidden = false;
    $('funModeTray').hidden = true;
    controlsBar.classList.add('fade-out');

    const board = state.board || Array(9).fill("");
    const winPattern = state.winPattern || [];
    const mySymbol = (myUserId === state.playerX) ? 'X' : 'O';
    const isMyTurn = (state.currentTurn === mySymbol) && !state.winner;

    const cells = box.querySelectorAll('.ttt-cell');
    cells.forEach((cell, idx) => {
      const val = board[idx] || "";
      cell.textContent = val;
      cell.className = 'ttt-cell';
      if (val === 'X') cell.classList.add('val-x');
      else if (val === 'O') cell.classList.add('val-o');
      if (winPattern.includes(idx)) cell.classList.add('win-highlight');
      cell.disabled = (val !== "" || !isMyTurn || !!state.winner);
    });

    const statusEl = $('tttStatusBar');
    if (statusEl) {
      statusEl.className = 'ttt-status-bar';
      if (state.winner) {
        statusEl.classList.add('win');
        if (state.winner === 'draw') {
          statusEl.textContent = '🤝 खेल बराबरी (Draw) पर समाप्त हुआ!';
        } else if (state.winner === mySymbol) {
          statusEl.textContent = `🎉 बधाई हो! आप (${mySymbol}) जीत गए!`;
          if (lastAnnouncedTttWinId !== state.updatedAt) { playCheerSound(); lastAnnouncedTttWinId = state.updatedAt; }
        } else {
          statusEl.textContent = `सामने वाला (${state.winner}) जीत गया!`;
          if (lastAnnouncedTttWinId !== state.updatedAt) { playOopsSound(); lastAnnouncedTttWinId = state.updatedAt; }
        }
      } else {
        if (isMyTurn) {
          statusEl.classList.add('my-turn');
          statusEl.textContent = `आपकी चाल है (${mySymbol}) - डिब्बा चुनें!`;
        } else {
          statusEl.classList.add('their-turn');
          const oppSymbol = mySymbol === 'X' ? 'O' : 'X';
          statusEl.textContent = `सामने वाले (${oppSymbol}) की चाल का इंतज़ार...`;
        }
      }
    }
  });
}

async function handleTttCellClick(index) {
  if (!activeCallId) return;
  const tttRef = ref(db, `call_sessions/${activeCallId}/tictactoe_state`);
  const snap = await get(tttRef);
  const state = snap.val();
  if (!state || !state.active || state.winner) return;
  const board = state.board || Array(9).fill("");
  const mySymbol = (myUserId === state.playerX) ? 'X' : 'O';
  if (state.currentTurn !== mySymbol) { toast(currentLang === 'hi' ? 'अभी आपकी बारी नहीं है!' : 'Not your turn!'); return; }
  if (board[index] !== "") return;
  board[index] = mySymbol;
  playMessageTickSound();
  const outcome = checkTttWinner(board);
  const nextTurn = mySymbol === 'X' ? 'O' : 'X';
  await update(tttRef, {
    board,
    currentTurn: nextTurn,
    winner: outcome ? outcome.winner : null,
    winPattern: outcome ? outcome.pattern : [],
    updatedAt: Date.now()
  });
}

async function resetTictactoeGame() {
  if (!activeCallId) return;
  const tttRef = ref(db, `call_sessions/${activeCallId}/tictactoe_state`);
  const snap = await get(tttRef);
  const cur = snap.val();
  if (!cur) return;
  await update(tttRef, { board: Array(9).fill(""), currentTurn: "X", winner: null, winPattern: [], updatedAt: Date.now() });
  toast('नया खेल शुरू हुआ!');
}

async function closeTictactoeGame() {
  if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/tictactoe_state`), { active: false }).catch(()=>{});
  const box = $('kidsTictactoeBox');
  if (box) box.hidden = true;
}

$('trayBtnTictactoe').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  startOrToggleTictactoe();
};

function cleanupKidsModules() {
  stopQuizTimerBar();
  stopRiddleTimerBar(); // Point #3
  if (quizSessionUnsub) { quizSessionUnsub(); quizSessionUnsub = null; }
  if (riddleSessionUnsub) { riddleSessionUnsub(); riddleSessionUnsub = null; } // Point #3
  if (canvasSessionUnsub) { canvasSessionUnsub(); canvasSessionUnsub = null; }
  if (whiteboardSyncUnsub) { whiteboardSyncUnsub(); whiteboardSyncUnsub = null; }
  if (tttSessionUnsub) { tttSessionUnsub(); tttSessionUnsub = null; }
  
  const box = $('kidsQuizBox'); if (box) box.hidden = true;
  const rBox = $('kidsRiddleBox'); if (rBox) rBox.hidden = true; // Point #3
  const wb = $('kidsWhiteboardModal'); if (wb) wb.hidden = true;
  const ttt = $('kidsTictactoeBox'); if (ttt) ttt.hidden = true;
  if ($('funModeTray'))$('funModeTray').hidden = true;
  if (ctx && canvasEl) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}

// Call Session & Peer WebRTC
async function joinCallSession() {
  CallAudioManager.stopAll(); // Sabse pehle saari ringtones forcefully band karo
  
  // Agar main call receive karne wala hoon, toh Firebase mein status 'answered' kar do
  // taaki caller ko pata chal jaye ki call uth chuki hai aur wo ringtone dobara na bajaye
  if (!isCaller && activeCallId) {
    update(ref(db, `call_sessions/${activeCallId}`), { status: 'answered' }).catch(()=>{});
  }
  // --- NAYA CODE YAHAN TAK ---

  isCallConnected = true;
  callStartTime = Date.now();
  // ... aapka baaki ka code yahan se niche same rahega ...
     
  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = null;
  stopAllCallTones();
  lobbyScreen.hidden = true;
  chatScreen.hidden = true;
  callScreen.hidden = false;
  isCallConnected = true;
  isHangingUp = false;
  ignoreBackUntil = Date.now() + 2000;
  await requestWakeLock();
  startNetworkQualityMonitor();
  pipWrap.classList.remove('pip-hidden');
  pipRestoreBtn.hidden = true;
  localVideo.srcObject = localStream;
  localVideo.play().catch(()=>{});

  updateCallModeVisuals(isAudioOnlyCall);

  if (isAudioOnlyCall) setHardwareSpeaker(false);
  else setHardwareSpeaker(true);

  startTimer();
  scheduleAutoHide();

  // --- पॉइंट #1: Call Foreground Service Start ---
  if (window.AndroidBridge && typeof window.AndroidBridge.startCallForegroundService === 'function') {
    window.AndroidBridge.startCallForegroundService(currentCallTargetName || 'उपयोगकर्ता', isAudioOnlyCall ? 'ऑडियो कॉल' : 'वीडियो कॉल');
  } else if (window.AndroidAudio && typeof window.AndroidAudio.startCallForegroundService === 'function') {
    window.AndroidAudio.startCallForegroundService(currentCallTargetName || 'उपयोगकर्ता', isAudioOnlyCall ? 'ऑडियो कॉल' : 'वीडियो कॉल');
  }

  // Games Listeners Initialize
  initKidsQuizListener();
  initRiddleGkListener(); // --- पॉइंट #3: Riddle Game Sync ---
  listenRemoteCanvas();
  listenWhiteboardAutoSync();
  listenTictactoeSession();

  const myMemberRef = ref(db, `call_sessions/${activeCallId}/members/${myUserId}`);
  onDisconnect(myMemberRef).remove().catch(()=>{});

  await set(myMemberRef, {
    name: myUserName,
    camEnabled: !isAudioOnlyCall,
    micEnabled,
    audioOnly: isAudioOnlyCall,
    joinedAt: Date.now()
  });

  callJoinedViaDirectAccept = false;

  if (callSessionUnsub) callSessionUnsub();
  callSessionUnsub = onValue(ref(db, `call_sessions/${activeCallId}/status`), snap => {
    if (snap.val() === 'ended') {
      toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended');
      hangup(true);
    }
  });

  onValue(ref(db, `call_sessions/${activeCallId}/members`), snap => {
    const members = snap.val() || {};
    const ids = Object.keys(members);
    if (ids.length > MAX_CALL_MEMBERS) { toast(`Maximum ${MAX_CALL_MEMBERS} members allowed`); return; }
    ids.forEach(pId => {
      if (pId !== myUserId) {
        if (!peerConnections[pId]) initiatePeerConnection(pId, members[pId].name);
        updateRemotePeerUI(pId, members[pId]);
      }
    });
    Object.keys(peerConnections).forEach(pId => { if (!members[pId]) closePeer(pId); });
    updateRemoteGridClass();
  });
}

function initiatePeerConnection(peerId, peerName) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  peerConnections[peerId] = pc;

  if (localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  if (isAudioOnlyCall && (!localStream || localStream.getVideoTracks().length === 0)) {
    try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch(e){}
  }
  boostPeerBitrate(pc);

  pc.ontrack = e => {
    addRemoteVideoCell(peerId, e.streams[0], peerName);
    updateRemoteGridClass();
    if (isAudioOnlyCall && !speakerEnabled) {
      setTimeout(() => { setHardwareSpeaker(false); }, 300);
      setTimeout(() => { setHardwareSpeaker(false); }, 1000);
    }
  };

  const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${peerId}`;
  const peerPath = `call_sessions/${activeCallId}/signals/${peerId}__${myUserId}`;

  pc.onicecandidate = e => { if (e.candidate) push(ref(db, `${myPath}/candidates`), e.candidate.toJSON()); };
  pc.pendingIce = [];

  onChildAdded(ref(db, `${peerPath}/candidates`), async snap => {
    const c = snap.val();
    if (!c) return;
    const cand = new RTCIceCandidate(c);
    if (pc.remoteDescription) { try { await pc.addIceCandidate(cand); } catch(e){} }
    else pc.pendingIce.push(cand);
  });

  pc.flushIce = async () => {
    const p = pc.pendingIce || [];
    pc.pendingIce = [];
    for (const cand of p) { try { await pc.addIceCandidate(cand); } catch(e){} }
  };

  if (myUserId < peerId) {
    pc.createOffer()
      .then(o => pc.setLocalDescription(new RTCSessionDescription({ type: o.type, sdp: applySDPBitrate(o.sdp) })))
      .then(() => set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type }));

    onValue(ref(db, `${peerPath}/answer`), snap => {
      const a = snap.val();
      if (a && (!pc.currentRemoteDescription || pc.currentRemoteDescription.sdp !== a.sdp)) {
        pc.setRemoteDescription(new RTCSessionDescription(a)).then(async () => { await pc.flushIce(); boostPeerBitrate(pc); });
      }
    });
  } else {
    onValue(ref(db, `${peerPath}/offer`), async snap => {
      const o = snap.val();
      if (o && (!pc.currentRemoteDescription || pc.currentRemoteDescription.sdp !== o.sdp)) {
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
        <div style="font-size:12px;font-weight:700;color:#94a3b8">${safeName(peerName || 'यूज़र')}</div>
      </div>
    `;
    remoteGrid.appendChild(cell);
  }
  const v = cell.querySelector('video');
  v.srcObject = stream;
  v.muted = false;
  v.play().catch(()=>{});
}

function updateRemotePeerUI(peerId, data) {
  if (!data) return;
  const cam = $(`cam_off_${peerId}`), mic = $(`mute_badge_${peerId}`);
  if (cam) cam.hidden = data.camEnabled !== false;
  if (mic) mic.hidden = data.micEnabled !== false;
}
function removeRemoteVideoCell(id) { const c = $(`remote_cell_${id}`); if (c) c.remove(); }
function updateRemoteGridClass() {
  const count = remoteGrid.children.length;
  remoteGrid.className = count <= 1 ? 'count-1' : count === 2 ? 'count-2' : 'count-4';
}
function closePeer(id) {
  if (peerConnections[id]) { peerConnections[id].close(); delete peerConnections[id]; }
  removeRemoteVideoCell(id);
  updateRemoteGridClass();
}

$('btnAddPerson').onclick = (e) => {
  e.stopPropagation();
  const list = $('addContactsList');
  list.innerHTML = '';
  const amIAdmin = isNeerajBadola(myUserName);
  const avail = Object.keys(allOnlineUsers).filter(id => id !== myUserId && !peerConnections[id] && (!allOnlineUsers[id].hidden || amIAdmin));
  if (!avail.length) {
    list.innerHTML = `<div style="font-size:12px;color:#94a3b8;padding:10px">${currentLang==='hi'?'अन्य कोई संपर्क उपलब्ध नहीं है':'No other contacts available'}</div>`;
  } else {
    avail.forEach(id => {
      const u = allOnlineUsers[id];
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:12px;border:1px solid var(--line)';
      row.innerHTML = `<span style="font-size:14px;font-weight:700">${safeName(u.name)}</span><button style="background:var(--c-call-tab);border:0;color:#fff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:12px">जोड़ें</button>`;
      row.querySelector('button').onclick = async () => {
        const snap = await get(ref(db, `call_sessions/${activeCallId}/members`));
        if (snap.exists() && Object.keys(snap.val()||{}).length >= MAX_CALL_MEMBERS) { toast(`Max ${MAX_CALL_MEMBERS} members allowed`); return; }
        await update(ref(db, `users/${id}`), { activeCallId }).catch(()=>{});
        await set(ref(db, `user_inbox/${id}`), { callId: activeCallId, callerId: myUserId, callerName: myUserName + ' (ग्रुप)', audioOnly: isAudioOnlyCall, status: 'calling' });
        const uSnap = await get(ref(db, `users/${id}`));
        if (uSnap.val()?.fcmToken) sendPushNotification(uSnap.val().fcmToken, myUserName, isAudioOnlyCall);
        toast(`${u.name} को कॉल भेजा गया!`);
        $('addParticipantModal').hidden = true;
      };
      list.appendChild(row);
    });
  }
  $('addParticipantModal').hidden = false;
};
$('closeAddModalBtn').onclick = () => {$('addParticipantModal').hidden = true; };

// PiP Swap Handlers
let pipTouchStartX = 0, pipTouchStartY = 0, pipMoved = false;

pipWrap.addEventListener('touchstart', e => {
  pipTouchStartX = e.changedTouches[0].clientX;
  pipTouchStartY = e.changedTouches[0].clientY;
  pipMoved = false;
}, {passive:true});

pipWrap.addEventListener('touchmove', e => {
  const dx = Math.abs(e.changedTouches[0].clientX - pipTouchStartX);
  const dy = Math.abs(e.changedTouches[0].clientY - pipTouchStartY);
  if (dx > 10 || dy > 10) pipMoved = true;
}, {passive:true});

pipWrap.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - pipTouchStartX;
  const dy = e.changedTouches[0].clientY - pipTouchStartY;

  if (dx > 45 && Math.abs(dx) > Math.abs(dy)) {
    e.stopPropagation();
    pipWrap.classList.add('pip-hidden');
    pipRestoreBtn.hidden = false;
    scheduleAutoHide();
  } else if (!pipMoved) {
    e.stopPropagation();
    callScreen.classList.toggle('video-swapped');
    toast(callScreen.classList.contains('video-swapped')
      ? (currentLang === 'hi' ? '🔄 आपकी वीडियो बड़ी स्क्रीन पर' : '🔄 Your video Fullscreen')
      : (currentLang === 'hi' ? '🔄 सामान्य व्यू' : '🔄 Normal View'));
    scheduleAutoHide();
  }
});

remoteGrid.addEventListener('click', (e) => {
  if (callScreen.classList.contains('video-swapped')) {
    e.stopPropagation();
    callScreen.classList.remove('video-swapped');
    scheduleAutoHide();
  }
});

pipRestoreBtn.onclick = e => {
  e.stopPropagation();
  pipWrap.classList.remove('pip-hidden');
  pipRestoreBtn.hidden = true;
  scheduleAutoHide();
};

function scheduleAutoHide() {
  clearTimeout(autoHideTimer);
  autoHideTimer = setTimeout(() => {
    const isTttOpen = $('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden;
    const isRiddleOpen = $('kidsRiddleBox') && !$('kidsRiddleBox').hidden; // Point #3
    if (isCallConnected && $('kidsQuizBox').hidden && $('kidsWhiteboardModal').hidden &&$('funModeTray').hidden && !isTttOpen && !isRiddleOpen) {
      controlsBar.classList.add('fade-out');
      $('callTopBar').classList.add('fade-out');
    }
  }, 3500);
}

callScreen.addEventListener('click', e => {
  if (e.target.closest('.ctl-box') || e.target.closest('.modal-box') || e.target.closest('#pipWrap') || e.target.closest('#pipRestoreBtn') || e.target.closest('#kidsQuizBox') || e.target.closest('#kidsWhiteboardModal') || e.target.closest('#callTopBar') || e.target.closest('#funModeTray') || e.target.closest('#kidsTictactoeBox') || e.target.closest('#kidsRiddleBox')) return; // Added kidsRiddleBox for Point #3
  const isH = controlsBar.classList.contains('fade-out');
  controlsBar.classList.toggle('fade-out', !isH);
  $('callTopBar').classList.toggle('fade-out', !isH);
  if (isH) scheduleAutoHide();
});

// Call Controls
$('micBtn').onclick = async (e) => {
  e.stopPropagation();
  micEnabled = !micEnabled;
  if (localStream) localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
  $('micBtn').classList.toggle('off', !micEnabled);
  if (activeCallId) await update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { micEnabled }).catch(()=>{});
  scheduleAutoHide();
};

$('camBtn').onclick = async (e) => {
  e.stopPropagation();
  if (isAudioOnlyCall) toggleVideoTrackMode(true);
  else toggleVideoTrackMode(!camEnabled);
  scheduleAutoHide();
};

$('speakerBtn').onclick = (e) => {
  e.stopPropagation();
  setHardwareSpeaker(!speakerEnabled);
  toast(speakerEnabled
    ? (currentLang === 'hi' ? '🔊 लाउडस्पीकर चालू' : '🔊 Speaker ON')
    : (currentLang === 'hi' ? '👂 इयरपीस मोड चालू (कान पर लगाएँ)' : '👂 Earpiece mode (Put to ear)'));
  scheduleAutoHide();
};

$('flipBtn').onclick = async (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (isAudioOnlyCall || !camEnabled) return;
  facingMode = facingMode === 'user' ? 'environment' : 'user';
  pipWrap.classList.toggle('mirror', facingMode === 'user');
  try {
    if (localStream) localStream.getVideoTracks().forEach(t => t.stop());
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } },
      audio: false
    });
    const newTrack = newStream.getVideoTracks()[0];
    const oldTrack = localStream.getVideoTracks()[0];
    if (oldTrack) localStream.removeTrack(oldTrack);
    localStream.addTrack(newTrack);
    localVideo.srcObject = localStream;
    Object.values(peerConnections).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) sender.replaceTrack(newTrack);
      boostPeerBitrate(pc);
    });
  } catch(e) {}
  scheduleAutoHide();
};

$('hangBtn').onclick = (e) => {
  e.stopPropagation();
  e.preventDefault();
  if (isHangingUp) return;
  isHangingUp = true;
  hangup();
};

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
    
    // --- Call End Tone Logic ---
    if (isCallConnected && !silent) {
      CallAudioManager.playEnd(); // अगर बात हो रही थी (कॉल कनेक्टेड थी), तो एंड टोन बजाएं
    } else {
      CallAudioManager.stopAll(); // अगर बात नहीं हुई (जैसे मिस्ड/रिजेक्ट), तो सब आवाज़ें बंद कर दें
    }
    // ---------------------------

    stopTimer();
    releaseWakeLock();
    clearTimeout(autoHideTimer);
    clearTimeout(callTimeoutTimer);
    callTimeoutTimer = null;
    stopNetworkQualityMonitor();
    cleanupKidsModules();
    resetHardwareAudio();
   
    // --- पॉइंट #1: Call Foreground Service Stop ---
    if (window.AndroidBridge && typeof window.AndroidBridge.stopCallForegroundService === 'function') {
      window.AndroidBridge.stopCallForegroundService();
    } else if (window.AndroidAudio && typeof window.AndroidAudio.stopCallForegroundService === 'function') {
      window.AndroidAudio.stopCallForegroundService();
    }

    if (isCallConnected && currentCallTargetId) {
      recordCallLog({
        callId: activeCallId || `call_${Date.now()}`,
        targetId: currentCallTargetId,
        name: currentCallTargetName || 'उपयोगकर्ता',
        type: isCaller ? 'outgoing' : 'incoming',
        callMode: isAudioOnlyCall ? 'audio' : 'video',
        duration: actualDuration,
        time: Date.now()
      });
    }

    if (activeCallId) {
      await update(ref(db, `users/${myUserId}`), { activeCallId: null }).catch(()=>{});
      await update(ref(db, `call_sessions/${activeCallId}`), { status: 'ended' }).catch(()=>{});
      await remove(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`)).catch(()=>{});
    }
    await remove(ref(db, `user_inbox/${myUserId}`)).catch(()=>{});
  } catch(err) {
    console.warn("Hangup warning:", err);
  } finally {
    unsubs.forEach(fn => { try { fn(); } catch(e){} });
    unsubs = [];
    if (callSessionUnsub) { callSessionUnsub(); callSessionUnsub = null; }
    Object.keys(peerConnections).forEach(id => closePeer(id));
    peerConnections = {};

    Object.keys(mediaDataChannels).forEach(pid => {
      try { mediaDataChannels[pid].close(); } catch(e) {}
    });
    mediaDataChannels = {};
    Object.keys(mediaPeerConnections).forEach(pid => {
      try { mediaPeerConnections[pid].close(); } catch(e) {}
    });
    mediaPeerConnections = {};

    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    remoteGrid.innerHTML = '';
    activeCallId = null;
    isCallConnected = false;
    isAudioOnlyCall = false;
    callStartTime = 0;
    callJoinedViaDirectAccept = false;

    callScreen.classList.remove('video-swapped');
    controlsBar.classList.remove('fade-out');
    $('callTopBar').classList.remove('fade-out');
    pipWrap.classList.remove('pip-hidden');
    pipRestoreBtn.hidden = true;
    pipWrap.style.opacity = '1';
    $('camBtn').classList.remove('off');
    $('micBtn').classList.remove('off');$('speakerBtn').classList.remove('off');
    if ($('voiceCallArea'))$('voiceCallArea').hidden = true;
    remoteGrid.style.display = 'grid';
    pipWrap.style.display = 'block';

    const wasLocked = isDeviceLocked();
    if (!wasLocked) {
      callScreen.hidden = true;
      incomingDialog.hidden = true;
      outgoingDialog.hidden = true;
      chatScreen.hidden = true;
      lobbyScreen.hidden = false;
    } else {
      callScreen.hidden = true;
      incomingDialog.hidden = true;
      outgoingDialog.hidden = true;
      chatScreen.hidden = true;
      lobbyScreen.hidden = true;
    }
    isHangingUp = false;

    closeIfLocked();
  }
}

function startTimer() {
  callStartTime = Date.now();
  if (timerTimer) clearInterval(timerTimer);
  timerTimer = setInterval(() => {
    const diff = Math.floor((Date.now() - callStartTime) / 1000);
    $('callTimer').textContent = `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
  }, 1000);
}
function stopTimer() {
  if (timerTimer) { clearInterval(timerTimer); timerTimer = null; }
  $('callTimer').textContent = '00:00';
}

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; } }

// Hardware Back Button
let backPressedOnce = false;
function setupHardwareBackButton() {
  window.addEventListener('popstate', (e) => {
    if (Date.now() < ignoreBackUntil) {
      history.pushState(null, '', window.location.href);
      e.preventDefault();
      return;
    }
    const openModals = [$('adminPanelModal'),$('adminPinModal'), $('profileModal'),$('addParticipantModal'), $('permNoticeModal'),$('phoneContactsModal')];
    for (const m of openModals) {
      if (m && !m.hidden) { m.hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    }
    if ($('msgLongPressMenu')) { closeMessageMenu(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('mediaViewer') && !$('mediaViewer').hidden) {$('closeMediaViewerBtn').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('attachMenu') && !$('attachMenu').hidden) {$('attachMenu').hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('kidsRiddleBox') && !$('kidsRiddleBox').hidden) { closeRiddleGame(); history.pushState(null, '', window.location.href); e.preventDefault(); return; } // Point #3
    if (!$('funModeTray').hidden) {$('funModeTray').hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!$('kidsWhiteboardModal').hidden) {$('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      history.pushState(null, '', window.location.href); e.preventDefault(); return;
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!voiceDock.hidden) { discardRecording(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('replyPreviewBox')) { cancelReply(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!chatScreen.hidden) { closeChat(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!callScreen.hidden) { if (confirm('क्या आप कॉल काटना चाहते हैं?')) hangup(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
  });

  history.pushState(null, '', window.location.href);

  const appPlugin = getAppPlugin();
  if (!isNativeApp() || !appPlugin) return;
  appPlugin.addListener('backButton', () => {
    if (Date.now() < ignoreBackUntil) return;
    const openModals = [$('adminPanelModal'),$('adminPinModal'), $('profileModal'),$('addParticipantModal'), $('permNoticeModal'),$('phoneContactsModal')];
    for (const m of openModals) { if (m && !m.hidden) { m.hidden = true; return; } }
    if ($('msgLongPressMenu')) { closeMessageMenu(); return; }
    if ($('mediaViewer') && !$('mediaViewer').hidden) {$('closeMediaViewerBtn').click(); return; }
    if ($('attachMenu') && !$('attachMenu').hidden) {$('attachMenu').hidden = true; return; }
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); return; }
    if ($('kidsRiddleBox') && !$('kidsRiddleBox').hidden) { closeRiddleGame(); return; } // Point #3
    if (!$('funModeTray').hidden) {$('funModeTray').hidden = true; return; }
    if (!$('kidsWhiteboardModal').hidden) {$('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      return;
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); return; }
    if (!voiceDock.hidden) { discardRecording(); return; }
    if ($('replyPreviewBox')) { cancelReply(); return; }
    if (!chatScreen.hidden) { closeChat(); return; }
    if (!callScreen.hidden) { if (confirm('क्या आप कॉल काटना चाहते हैं?')) hangup(); return; }
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); return; }

    if (backPressedOnce) { getAppPlugin().exitApp(); }
    else {
      backPressedOnce = true;
      toast(currentLang === 'hi' ? 'बाहर निकलने के लिए दोबारा बैक दबाएँ' : 'Press back again to exit');
      setTimeout(() => { backPressedOnce = false; }, 2000);
    }
  });
}

// ===================================================
// 🔒 STRICT VIEWPORT & TOUCH-SLIDE LOCK FIX
// ===================================================
function lockChatViewportHeight() {
  if (chatScreen.hidden) return;
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const px = `${vh}px`;

  document.documentElement.style.height = px;
  document.body.style.height = px;
  chatScreen.style.position = 'fixed';
  chatScreen.style.top = '0px';
  chatScreen.style.left = '0px';
  chatScreen.style.right = '0px';
  chatScreen.style.height = px;
}

function resetChatViewportHeight() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  chatScreen.style.top = '0px';
  chatScreen.style.height = '100%';
}

if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    if (!chatScreen.hidden) {
      lockChatViewportHeight();
      const body = $('chatBody');
      if (body) body.scrollTop = body.scrollHeight;
    }
  });
  window.visualViewport.addEventListener('scroll', () => {
    if (!chatScreen.hidden) {
      lockChatViewportHeight();
    }
  });
}

// Chat screen khulne ya band hone par height automatic sync karein
if (window.MutationObserver && chatScreen) {
  const chatObserver = new MutationObserver(() => {
    if (!chatScreen.hidden) {
      lockChatViewportHeight();
    } else {
      resetChatViewportHeight();
    }
  });
  chatObserver.observe(chatScreen, { attributes: true, attributeFilter: ['hidden'] });
}

// Header aur Footer par ungli rakhkar upار slide karne से screen pan hone ko rokein
document.addEventListener('touchmove', (e) => {
  if (chatScreen.hidden) return;
  const inHeader = e.target.closest('.chat-header');
  const inFooter = e.target.closest('.chat-footer');
  if (inHeader || inFooter) {
    if (e.target === chatInput && chatInput.scrollHeight > chatInput.clientHeight) {
      return;
    }
    e.preventDefault();
  }
}, { passive: false });

chatInput.addEventListener('focus', () => {
  setTimeout(() => {
    lockChatViewportHeight();
    const body = $('chatBody');
    if (body) body.scrollTop = body.scrollHeight;
  }, 150);
});

chatInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (!chatScreen.hidden) {
      lockChatViewportHeight();
    } else {
      resetChatViewportHeight();
    }
  }, 100);
});

// OTA Update
async function checkWebOtaUpdate(manual = false) {
  try {
    if (manual) toast(currentLang === 'hi' ? 'अपडेट की जांच हो रही है...' : 'Checking for update...');

    const res = await fetch('https://neerajthegreat192.github.io/ota-version.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) {
      if (manual) toast(currentLang === 'hi' ? 'सर्वर से संपर्क नहीं हो पाया' : 'Server not reachable');
      return;
    }

    const info = await res.json();
    const activeVer = localStorage.getItem('ota_active_ver');

    if (info.version && String(info.version) !== activeVer) {
      if (manual) toast(currentLang === 'hi' ? 'नया अपडेट डाउनलोड हो रहा है...' : 'Downloading new update...');

      const jsRes = await fetch('https://neerajthegreat192.github.io/app.js?t=' + Date.now(), { cache: 'no-store' });
      const cssRes = await fetch('https://neerajthegreat192.github.io/style.css?t=' + Date.now(), { cache: 'no-store' });

      if (jsRes.ok && cssRes.ok) {
        const newJs = await jsRes.text();
        const newCss = await cssRes.text();
        localStorage.setItem('ota_cached_js', newJs);
        localStorage.setItem('ota_cached_css', newCss);
        localStorage.setItem('ota_active_ver', String(info.version));

        if (manual) {
          if (confirm(currentLang === 'hi' ? 'नया अपडेट मिल गया है! क्या आप अभी ऐप रीस्टार्ट करना चाहते हैं?' : 'New update applied! Restart app now?')) {
            location.reload();
          }
        }
      } else {
        if (manual) toast('फ़ाइलें डाउनलोड करने में त्रुटि');
      }
    } else {
      if (manual) toast(`✅ App is on latest version (OTA v${info.version})`);
    }
  } catch (err) {
    if (manual) toast('अपडेट चेक फेल हो गया');
  }
}

$('checkUpdateBtn').onclick = () => {$('profileModal').hidden = true;
  checkWebOtaUpdate(true);
};

// Deep Links
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
            renderContacts();
          }
        } else if (data.type === 'OPEN_CHAT' && data.targetId) {
          openChat(data.targetId, data.senderName || 'उपयोगकर्ता');
        } else if (data.type === 'ACCEPT_CALL' && data.callId) {
          if (!isCallConnected) handleDirectAcceptCall(data.callId);
        }
      });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const openChatId = urlParams.get('chatTargetId');
    const openChatName = urlParams.get('chatTargetName');
    const accCallId = urlParams.get('acceptCallId');

    if (openChatId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(() => openChat(openChatId, openChatName || 'उपयोगकर्ता'), 800);
    } else if (accCallId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleDirectAcceptCall(accCallId);
    }

    const appPlugin = getAppPlugin();
    if (isNativeApp() && appPlugin) {
      appPlugin.addListener('appUrlOpen', async (event) => {
        try {
          const url = new URL(event.url);
          const chatTgtId = url.searchParams.get('chatTargetId');
          const chatTgtName = url.searchParams.get('chatTargetName');
          const aId = url.searchParams.get('acceptCallId');

          if (aId) handleDirectAcceptCall(aId);
          else if (chatTgtId) openChat(chatTgtId, chatTgtName || 'उपयोगकर्ता');
        } catch(e) {}
      });

      appPlugin.addListener('appStateChange', (state) => {
        if (state.isActive) checkNativeLaunchIntent();
      });
    }
  } catch (e) {
    console.warn('Deep link error:', e);
  }
}

// App Initialization
async function initApp() {
  try {
    applyLanguage(currentLang);
    applyTheme(currentTheme);
    setupHardwareBackButton();
    setupNativePushListeners();
    checkUser();
    handleDeepLinks();
    checkNativeLaunchIntent();
  } catch (err) {
    console.error('UI init error:', err);
    hideSplashScreen();
  }

  setTimeout(() => { hideSplashScreen(); }, 4000);
  setTimeout(() => checkWebOtaUpdate(false), 3000);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

/* 🟣🟣🟣 [LUDO MODULE START (शुरू): app.js] 🟣🟣🟣 */

// --- Ludo Constants ---
const LUDO_LOOP = [ [6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7], [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13], [6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8], [11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6], [9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0] ];
const LUDO_SAFE_IDX = [0, 8, 13, 21, 26, 34, 39, 47];
const LUDO_START_IDX = { r: 0, g: 13, y: 26, b: 39 };
const LUDO_HOME_COL = { r: [[7,1],[7,2],[7,3],[7,4],[7,5]], g: [[1,7],[2,7],[3,7],[4,7],[5,7]], y: [[7,13],[7,12],[7,11],[7,10],[7,9]], b: [[13,7],[12,7],[11,7],[10,7],[9,7]] };
const LUDO_HOME_POS = { r:[7,6], g:[6,7], y:[7,8], b:[8,7] };
const LUDO_YARD_POS = { r: [[1,1],[1,4],[4,1],[4,4]], g: [[1,10],[1,13],[4,10],[4,13]], y: [[10,10],[10,13],[13,10],[13,13]], b: [[10,1],[10,4],[13,1],[13,4]] };

let ludoState = null;
let ludoSessionUnsub = null;
let ludoMyColor = 'r';
let ludoOpponentColor = 'y';
let ludoAnimating = false;
let ludoVisualTokens = null;

let ludoAutoMoveTimer = null;
let ludoAutoMoveKey = '';

// --- Helpers ---
function ludoNextColor(current) { return current === 'r' ? 'y' : 'r'; }
function ludoAbsLoopIdx(color, rel) { return (LUDO_START_IDX[color] + rel) % 52; }
function ludoPositionOf(color, rel) {
  if (rel < 0) return null;
  if (rel <= 50) return LUDO_LOOP[(LUDO_START_IDX[color] + rel) % 52];
  if (rel <= 55) return LUDO_HOME_COL[color][rel - 51];
  return LUDO_HOME_POS[color];
}
function ludoNormalizeTokens(arr) {
  const out = [-1,-1,-1,-1];
  if (Array.isArray(arr)) { for (let i=0;i<4;i++) out[i] = (typeof arr[i] === 'number') ? arr[i] : -1; }
  return out;
}
function ludoGetTokensFor(color) {
  if (ludoVisualTokens && ludoVisualTokens[color]) return ludoVisualTokens[color];
  return ludoState ? ludoNormalizeTokens(ludoState.tokens[color]) : [-1,-1,-1,-1];
}
function ludoCanMove(color, tokenIdx, roll) {
  if (!ludoState) return false;
  const rel = ludoNormalizeTokens(ludoState.tokens[color])[tokenIdx];
  if (rel === 56) return false;
  if (rel === -1) return roll === 6;
  return (rel + roll) <= 56;
}

// --- Render Board ---
function renderLudoBoard() {
  const boardEl = $('ludoBoard');
  if (!boardEl) return;
  boardEl.innerHTML = '';
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const cell = document.createElement('div');
      cell.className = 'lc ' + getLudoCellClass(r, c);
      boardEl.appendChild(cell);
    }
  }
  const center = document.createElement('div');
  center.className = 'center-home';
  center.innerHTML = '<div class="ctri top"></div><div class="ctri right"></div><div class="ctri bottom"></div><div class="ctri left"></div>';
  boardEl.appendChild(center);
}

function getLudoCellClass(r, c) {
  if (r < 6 && c < 6) return ludoYardCell('r', r, c);
  if (r < 6 && c > 8) return ludoYardCell('g', r, c);
  if (r > 8 && c > 8) return ludoYardCell('y', r, c);
  if (r > 8 && c < 6) return ludoYardCell('b', r, c);
  if (r >= 6 && r <= 8 && c >= 6 && c <= 8) return 'empty';
  for (const color of ['r','g','y','b']) {
    for (const [hr,hc] of LUDO_HOME_COL[color]) if (hr === r && hc === c) return 'home-' + color;
  }
  if (r === 6 && c === 1) return 'start-r';
  if (r === 1 && c === 8) return 'start-g';
  if (r === 8 && c === 13) return 'start-y';
  if (r === 13 && c === 6) return 'start-b';
  for (let i=0; i<LUDO_LOOP.length; i++) {
    if (LUDO_LOOP[i][0] === r && LUDO_LOOP[i][1] === c) return LUDO_SAFE_IDX.includes(i) ? 'safe' : 'path';
  }
  return 'empty';
}
function ludoYardCell(color, r, c) {
  const yardOrigin = { r:[0,0], g:[0,9], y:[9,9], b:[9,0] }[color];
  const lr = r - yardOrigin[0], lc = c - yardOrigin[1];
  const isInner = lr >= 1 && lr <= 4 && lc >= 1 && lc <= 4;
  const isSlot = LUDO_YARD_POS[color].some(([sr,sc]) => sr === r && sc === c);
  let cls = 'yard-' + color;
  if (isInner) cls += ' yd-inner';
  if (isSlot) cls += ' slot-' + color;
  return cls;
}

// --- Render Tokens (सटीक अलाइनमेंट के साथ) ---
function renderLudoTokens() {
  const boardEl = $('ludoBoard');
  if (!boardEl) return;
  boardEl.querySelectorAll('.tk').forEach(el => el.remove());

  // Board और Cell के असल (Actual) DOM Size से गणित लगाना
  const firstCell = boardEl.querySelector('.lc');
  if (!firstCell) return;
  
  const boardRect = boardEl.getBoundingClientRect();
  const cellRect = firstCell.getBoundingClientRect();
  const cellPx = cellRect.width;
  const offsetX = cellRect.left - boardRect.left;
  const offsetY = cellRect.top - boardRect.top;

  if (cellPx <= 0) return;

  const byCell = {};
  for (const color of ['r', 'y']) {
    const arr = ludoGetTokensFor(color);
    for (let i=0; i<4; i++) {
      const rel = arr[i];
      const pos = (rel < 0) ? LUDO_YARD_POS[color][i] : ludoPositionOf(color, rel);
      if (!pos) continue;
      const key = pos[0] + '_' + pos[1];
      if (!byCell[key]) byCell[key] = { r: pos[0], c: pos[1], list: [] };
      byCell[key].list.push({ color, idx: i, rel });
    }
  }

  for (const key in byCell) {
    const g = byCell[key];
    const n = g.list.length;
    const inYard = (n === 1 && g.list[0].rel < 0);
    let size = cellPx * (inYard ? 1.4 : (n === 1 ? 0.95 : (n === 2 ? 0.62 : 0.46)));
    const slots = n === 1 ? [[0.5,0.5]] : n === 2 ? [[0.3,0.5],[0.7,0.5]] : [[0.28,0.28],[0.72,0.28],[0.28,0.72],[0.72,0.72]];
    
    for (let k=0; k<n; k++) {
      const tk = g.list[k];
      const slot = slots[k] || [0.5, 0.5];
      const el = document.createElement('div');
      el.className = 'tk ' + tk.color;
      el.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M 50 96 C 24 78 8 60 8 44 A 42 42 0 0 1 92 44 C 92 60 76 78 50 96 Z" fill="url(#metal-grad)" stroke="rgba(40,40,40,.85)" stroke-width="1.4" stroke-linejoin="round"/><path d="M 50 88 C 30 72 18 56 18 44 A 32 32 0 0 1 82 44 C 82 56 70 72 50 88 Z" fill="url(#pinGrad-${tk.color})" stroke="rgba(0,0,0,.28)" stroke-width="0.9"/><ellipse cx="36" cy="30" rx="9" ry="5.5" fill="rgba(255,255,255,.55)"/><ellipse cx="33" cy="27" rx="3.5" ry="2" fill="rgba(255,255,255,.92)"/></svg>`;
      
      // सटीक पोज़िशनिंग
      const cx = offsetX + (g.c + slot[0]) * cellPx;
      const cy = offsetY + (g.r + slot[1]) * cellPx;
      
      el.style.width = size + 'px'; el.style.height = size + 'px';
      el.style.left = (cx - size/2) + 'px'; 
      el.style.top  = (cy - size/2 - (size * 0.06)) + 'px';
      
      if (!ludoAnimating && ludoState && ludoState.turn === ludoMyColor && tk.color === ludoMyColor && ludoState.phase === 'move' && ludoState.dice) {
        if (ludoCanMove(tk.color, tk.idx, ludoState.dice)) {
          el.classList.add('movable');
          el.onclick = (ev) => { ev.stopPropagation(); ludoTryMove(tk.idx); };
        }
      }
      boardEl.appendChild(el);
    }
  }
}

// --- Auto-Move Logic (अगर सिर्फ एक ही गोटी चल सकती है) ---
function maybeLudoAutoMove() {
  if (!ludoState || ludoState.turn !== ludoMyColor || ludoState.phase !== 'move' || ludoAnimating || ludoState.gameOver) return;
  const roll = ludoState.dice;
  if (!roll) return;
  
  const opts = [];
  for (let i=0; i<4; i++) {
    if (ludoCanMove(ludoMyColor, i, roll)) opts.push(i);
  }
  
  // अगर सिर्फ 1 ही विकल्प है
  if (opts.length === 1) {
    const key = ludoState.updatedAt + '_' + roll + '_' + opts[0];
    if (ludoAutoMoveKey === key) return;
    ludoAutoMoveKey = key;
    
    if (ludoAutoMoveTimer) clearTimeout(ludoAutoMoveTimer);
    ludoAutoMoveTimer = setTimeout(() => {
      ludoAutoMoveTimer = null;
      if (!ludoAnimating && ludoState.turn === ludoMyColor && ludoState.phase === 'move') {
        ludoTryMove(opts[0]);
      }
    }, 350); // 350ms का डिले ताकि एनीमेशन स्मूथ दिखे
  }
}

// --- Sync & Initialization ---
async function startOrToggleLudo() {
  if (!activeCallId || !isCallConnected) { 
    if(typeof toast === 'function') toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही लूडो खेलें' : 'Connect call to play'); 
    return; 
  }

  // 1. दोनों का वीडियो ऑफ करें 2. लाउडस्पीकर चालू रखें
  if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = false);
  if (typeof camEnabled !== 'undefined') camEnabled = false;
  if (typeof updateCallModeVisuals === 'function') updateCallModeVisuals(true);
  
  // स्पीकर फोर्सफुली ON रखना
  if (typeof setHardwareSpeaker === 'function') {
    setTimeout(() => setHardwareSpeaker(true), 300);
    setTimeout(() => setHardwareSpeaker(true), 1000); 
  }
  update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { camEnabled: false }).catch(()=>{});

  ludoMyColor = isCaller ? 'r' : 'y';
  ludoOpponentColor = isCaller ? 'y' : 'r';

  const ludoRef = ref(db, `call_sessions/${activeCallId}/ludo_state`);
  const snap = await get(ludoRef);
  const cur = snap.val();

  if (!cur || !cur.active) {
    await set(ludoRef, {
      active: true, turn: 'r', dice: null, phase: 'roll', consecutiveSixes: 0,
      tokens: { r: [-1,-1,-1,-1], y: [-1,-1,-1,-1] },
      gameOver: false, winner: null, lastMove: null, updatedAt: Date.now()
    });
  } else {
    const box = $('kidsLudoBox');
    if (box) {
      box.hidden = !box.hidden;
      if (!box.hidden) renderLudoBoard();
    }
  }
}

function listenLudoSession() {
  if (!activeCallId) return;
  if (ludoSessionUnsub) ludoSessionUnsub();
  
  const ludoRef = ref(db, `call_sessions/${activeCallId}/ludo_state`);
  ludoSessionUnsub = onValue(ludoRef, async snap => {
    const state = snap.val();
    const box = $('kidsLudoBox');
    if (!box) return;
    
    if (!state || !state.active) { box.hidden = true; return; }

    if (box.hidden) {
      box.hidden = false;
      if ($('funModeTray'))$('funModeTray').hidden = true;
      if (typeof controlsBar !== 'undefined' && controlsBar) controlsBar.classList.add('fade-out');
      
      // रिसीवर साइड पर भी गेम खुलते ही वीडियो ऑफ और लाउडस्पीकर ऑन
      if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = false);
      if (typeof camEnabled !== 'undefined') camEnabled = false;
      if (typeof updateCallModeVisuals === 'function') updateCallModeVisuals(true);
      if (typeof setHardwareSpeaker === 'function') {
        setTimeout(() => setHardwareSpeaker(true), 300);
      }
      update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { camEnabled: false }).catch(()=>{});

      ludoMyColor = isCaller ? 'r' : 'y';
      ludoOpponentColor = isCaller ? 'y' : 'r';
      renderLudoBoard();
    }

    if (ludoState && state.lastMove && state.lastMove.color !== ludoMyColor && state.lastMove.ts !== (ludoState.lastMove?.ts)) {
      await animateLudoRemoteMove(state.lastMove, ludoState.tokens);
    }

    ludoState = state;
    updateLudoUI();
  });
}

function updateLudoUI() {
  if (!ludoState) return;
  renderLudoTokens();
  
  const turnLabel = $('ludoTurnLabel');
  const rollBtn = $('ludoRollBtn');
  const diceBox = $('ludoDiceBox');
  if (!turnLabel || !rollBtn || !diceBox) return;

  if (ludoState.gameOver) {
    rollBtn.disabled = true;
    turnLabel.textContent = "🏆 Game Over!";
    turnLabel.style.color = '#f5c542';
    return;
  }

  const isMyTurn = ludoState.turn === ludoMyColor;
  const turnColorEmoji = ludoState.turn === 'r' ? '🔴' : '🟡';
  const turnName = isMyTurn ? (typeof myUserName !== 'undefined' ? myUserName : 'You') : (typeof currentCallTargetName !== 'undefined' ? currentCallTargetName : 'Opponent');
  
  turnLabel.textContent = `${turnColorEmoji} ${turnName} ka turn hai`;
  turnLabel.style.color = isMyTurn ? '#10b981' : '#a89e8a';

  if (isMyTurn && ludoState.phase === 'roll') {
    rollBtn.disabled = false;
  } else {
    rollBtn.disabled = true;
  }

  if (ludoState.dice) {
    diceBox.textContent = ludoState.dice;
    diceBox.classList.add('hot');
  } else {
    diceBox.textContent = '🎲';
    diceBox.classList.remove('hot');
  }

  maybeLudoAutoMove(); // ऑटो-मूव चेक
}

// --- Gameplay Actions ---
async function ludoRollDice() {
  if (!ludoState || ludoState.turn !== ludoMyColor || ludoState.phase !== 'roll' || ludoState.gameOver || ludoAnimating) return;
  
  ludoState.phase = 'locked'; // मास्टर लॉक (ताकि डबल क्लिक काम न करे)

  const rollBtn = $('ludoRollBtn');
  if (rollBtn) {
    rollBtn.disabled = true; 
    // pointerEvents = 'none' वाली लाइन यहाँ से हटा दी गई है
  }

  if (typeof playMessageTickSound === 'function') playMessageTickSound();

  const diceBox = $('ludoDiceBox');
  if (diceBox) {
    diceBox.classList.add('rolling');
    setTimeout(() => diceBox.classList.remove('rolling'), 550);
  }

  const roll = 1 + Math.floor(Math.random() * 6);
  const newSixes = roll === 6 ? (ludoState.consecutiveSixes + 1) : 0;
  
  if (roll === 6 && newSixes >= 3) {
    await update(ref(db, `call_sessions/${activeCallId}/ludo_state`), {
      dice: roll, consecutiveSixes: 0, phase: 'roll',
      turn: ludoNextColor(ludoMyColor), updatedAt: Date.now(),
      lastMove: { color: ludoMyColor, skip: true, ts: Date.now() }
    });
    return; 
  }

  let movable = false;
  for (let i=0; i<4; i++) if (ludoCanMove(ludoMyColor, i, roll)) movable = true;

  await update(ref(db, `call_sessions/${activeCallId}/ludo_state`), {
    dice: roll, consecutiveSixes: newSixes,
    phase: movable ? 'move' : 'roll',
    lastMove: { color: ludoMyColor, skip: !movable, ts: Date.now() },
    updatedAt: Date.now()
  });

  if (!movable) {
    setTimeout(() => {
      if (ludoState && ludoState.turn === ludoMyColor) {
        update(ref(db, `call_sessions/${activeCallId}/ludo_state`), {
          turn: ludoNextColor(ludoMyColor), dice: null, consecutiveSixes: 0, phase: 'roll', updatedAt: Date.now()
        }).catch(()=>{});
      }
    }, 1200);
  } else {
    setTimeout(() => maybeLudoAutoMove(), 100);
  }
}

async function ludoTryMove(tokenIdx) {
  if (ludoAnimating || !ludoState || ludoState.turn !== ludoMyColor || ludoState.phase !== 'move') return;
  const roll = ludoState.dice;
  if (!roll || !ludoCanMove(ludoMyColor, tokenIdx, roll)) return;
  
  ludoAnimating = true;
  const startArr = ludoNormalizeTokens(ludoState.tokens[ludoMyColor]);
  const currentRel = startArr[tokenIdx];
  const finalRel = currentRel === -1 ? 0 : currentRel + roll;

  ludoVisualTokens = { r: ludoNormalizeTokens(ludoState.tokens.r), y: ludoNormalizeTokens(ludoState.tokens.y) };
  if (currentRel === -1) {
    ludoVisualTokens[ludoMyColor][tokenIdx] = 0;
    renderLudoTokens();
    await new Promise(r => setTimeout(r, 300));
  } else {
    for (let r = currentRel + 1; r <= finalRel; r++) {
      ludoVisualTokens[ludoMyColor][tokenIdx] = r;
      renderLudoTokens();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const newTokens = { r: ludoNormalizeTokens(ludoState.tokens.r), y: ludoNormalizeTokens(ludoState.tokens.y) };
  newTokens[ludoMyColor][tokenIdx] = finalRel;
  let captured = 0;

  if (finalRel >= 0 && finalRel <= 50) {
    const myGlobalIdx = ludoAbsLoopIdx(ludoMyColor, finalRel);
    if (!LUDO_SAFE_IDX.includes(myGlobalIdx)) {
      const opp = ludoOpponentColor;
      for (let j=0; j<4; j++) {
        const orel = newTokens[opp][j];
        if (orel >= 0 && orel <= 50 && ludoAbsLoopIdx(opp, orel) === myGlobalIdx) {
          newTokens[opp][j] = -1; 
          captured++;
          if (typeof playOopsSound === 'function') playOopsSound();
        }
      }
    }
  }

  const reachedHome = (finalRel === 56);
  if (reachedHome && typeof playCheerSound === 'function') playCheerSound();

  const allHome = newTokens[ludoMyColor].every(r => r === 56);
  const extraTurn = (roll === 6) || (captured > 0) || reachedHome;
  const newTurn = (allHome || extraTurn) ? ludoMyColor : ludoOpponentColor;

  ludoVisualTokens = null;
  ludoAnimating = false;

  await update(ref(db, `call_sessions/${activeCallId}/ludo_state`), {
    tokens: newTokens, turn: newTurn, dice: null, phase: 'roll',
    consecutiveSixes: extraTurn ? ludoState.consecutiveSixes : 0,
    gameOver: allHome, winner: allHome ? ludoMyColor : null,
    lastMove: { color: ludoMyColor, token: tokenIdx, from: currentRel, to: finalRel, ts: Date.now() },
    updatedAt: Date.now()
  });
}

async function animateLudoRemoteMove(move, oldTokens) {
  if (!move || move.skip || move.from === undefined || move.to === undefined) return;
  ludoAnimating = true;
  ludoVisualTokens = { r: ludoNormalizeTokens(oldTokens.r), y: ludoNormalizeTokens(oldTokens.y) };
  
  if (move.from === -1) {
    ludoVisualTokens[move.color][move.token] = 0;
    renderLudoTokens();
    await new Promise(r => setTimeout(r, 300));
  } else {
    for (let r = move.from + 1; r <= move.to; r++) {
      ludoVisualTokens[move.color][move.token] = r;
      renderLudoTokens();
      await new Promise(r => setTimeout(r, 200));
    }
  }
  ludoVisualTokens = null;
  ludoAnimating = false;
}

// --- Events Connection ---
if ($('ludoRollBtn')) {$('ludoRollBtn').onclick = (e) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    ludoRollDice(); 
  };
}

if ($('closeLudoBtn'))$('closeLudoBtn').onclick = (e) => {
  e.stopPropagation();
  if ($('kidsLudoBox'))$('kidsLudoBox').hidden = true;
};

if ($('ludoResetBtn'))$('ludoResetBtn').onclick = async (e) => {
  e.stopPropagation();
  if (confirm(currentLang === 'hi' ? "क्या आप लूडो गेम को रीसेट करके नया शुरू करना चाहते हैं?" : "Do you want to reset and start a new Ludo game?")) {
    if (activeCallId) {
      await update(ref(db, `call_sessions/${activeCallId}/ludo_state`), {
        active: true, turn: 'r', dice: null, phase: 'roll', consecutiveSixes: 0,
        tokens: { r: [-1,-1,-1,-1], y: [-1,-1,-1,-1] },
        gameOver: false, winner: null, lastMove: null, updatedAt: Date.now()
      });
    }
  }
};

window.addEventListener('resize', () => {
  if ($('kidsLudoBox') && !$('kidsLudoBox').hidden) renderLudoTokens();
});

if ($('trayBtnLudo')) {$('trayBtnLudo').onclick = (e) => {
    e.stopPropagation();
    if ($('funModeTray'))$('funModeTray').hidden = true;
    startOrToggleLudo();
    if (typeof scheduleAutoHide === 'function') scheduleAutoHide();
  };
}

const originalLudoCleanup = typeof cleanupKidsModules === 'function' ? cleanupKidsModules : null;
cleanupKidsModules = function() {
  if (originalLudoCleanup) originalLudoCleanup();
  if (ludoSessionUnsub) { ludoSessionUnsub(); ludoSessionUnsub = null; }
  const lBox = $('kidsLudoBox');
  if (lBox) lBox.hidden = true;
};

const originalJoinCallSession = typeof joinCallSession === 'function' ? joinCallSession : null;
joinCallSession = async function() {
  if (originalJoinCallSession) await originalJoinCallSession();
  listenLudoSession(); 
};

/* 🟣🟣🟣 [LUDO MODULE END (समाप्त): app.js] 🟣🟣🟣 */


/* =========================================================================
   🔴🔴🔴 [PART 3 OF 3 — END (समाप्त): app.js v1.24.1] 🔴🔴🔴
   ========================================================================= */
