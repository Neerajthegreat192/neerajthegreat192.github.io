/* ═════════════════════════════════════════════════════════════════════════
   📦 app.js v1.25.1 — REFACTORED (Comments + Firebase PIN + Network Reconnect)
   📅 Structure:
      1A → Config / Native / DOM / Translations / State
      1B → Presence / Lobby / Admin PIN (Firebase) / Call Logs / Contacts
      2A → Long-press / Reactions / Chat Engine / Ticks
      2B → Media / File transfer / Voice Dock / Location / VCF
      3A → Call Engine / WebRTC / Controls / Network Reconnect
      3B → Init / Back button / OTA / Deep links
      4  → Fun Mode & Games (Quiz, Riddle, Whiteboard, TicTacToe, Ludo)
   ═════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 01: IMPORTS & FIREBASE SDK] — START
   📌 क्या: Firebase v10.12.0 से सभी ज़रूरी functions import
   🔗 कहाँ से: app.js का सबसे पहला executable code
   ⚠️ डिपेंड: कोई नहीं
   ═══════════════════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue, onChildAdded, push, onDisconnect, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

/* ───────── 🟦 [SECTION 01: IMPORTS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 02: GLOBAL CONSTANTS] — START
   📌 क्या: App version + APK download URL
   🔗 कहाँ से: checkWebOtaUpdate(), WhatsApp share button
   ⚠️ डिपेंड: कोई नहीं
   ═══════════════════════════════════════════════════════════════════════ */

const CURRENT_APP_VERSION = "1.25.1";
const GITHUB_APK_URL = "https://github.com/Neerajthegreat192/neerajthegreat192.github.io/releases/latest/download/app-release.apk";

/* ───────── 🟦 [SECTION 02: GLOBAL CONSTANTS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 03: OTA CACHE CLEANUP] — START
   📌 क्या: पुराने/corrupt OTA cached JS/CSS को localStorage से हटाता है
           अगर version flag है लेकिन actual JS/CSS खाली है
   🔗 कहाँ से: App boot पर स्वतः चलता है
   ⚠️ डिपेंड: localStorage
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 03: OTA CACHE CLEANUP] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 04: NATIVE CAPACITOR BRIDGE HELPERS] — START
   📌 क्या: Capacitor plugin को safe तरीके से access करने के helpers
   🔗 कहाँ से: isNativeApp(), setupNativePushListeners(), getAppPlugin()
   ⚠️ डिपेंड: window.Capacitor (optional)
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 04: NATIVE BRIDGE HELPERS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 05: PiP MODE UI HANDLER] — START
   📌 क्या: Android PiP (Picture-in-Picture) में जाने/वापस आने पर
           body को class देता है ताकि CSS adjust हो सके
   🔗 कहाँ से: Native layer से window.onPipModeChanged(bool) call होता है
   ⚠️ डिपेंड: CSS class .in-pip-mode
   ═══════════════════════════════════════════════════════════════════════ */

window.onPipModeChanged = function(isInPipMode) {
  if (isInPipMode) {
    document.body.classList.add('in-pip-mode');
  } else {
    document.body.classList.remove('in-pip-mode');
  }
};

/* ───────── 🟦 [SECTION 05: PiP MODE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 06: FIREBASE INIT + CORE CONFIG] — START
   📌 क्या: Firebase app/database initialize, VAPID key, ICE servers
   🔗 कहाँ से: पूरी app का सारा Firebase call इसी db पर जाता है
   ⚠️ डिपेंड: Firebase project chess-e4910
   🔥 नोट: ADMIN_SECRET_PIN यहाँ से हटा दिया गया है।
           अब PIN Firebase (admin_config/pin) से पढ़ा जाएगा।
           देखें SECTION 1B — verifyAdminPinAsync()
   ═══════════════════════════════════════════════════════════════════════ */

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

// 🌐 STUN/TURN servers — WebRTC के लिए
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
  ],
  iceCandidatePoolSize: 10
};

/* ───────── 🟦 [SECTION 06: FIREBASE INIT] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 07: DOM ELEMENT REFS] — START
   📌 क्या: सभी major screen / dialog / button elements को एक बार cache
   🔗 कहाँ से: पूरी app में इस्तेमाल (lobbyScreen, chatScreen, callScreen आदि)
   ⚠️ डिपेंड: index.html में ये IDs मौजूद होनी चाहिए
   ═══════════════════════════════════════════════════════════════════════ */

const $ = id => document.getElementById(id);
const lobbyScreen = $('lobby'), callScreen = $('call'), chatScreen = $('chatScreen');
const contactsList = $('contactsList'), callLogsList = $('callLogsList'), myHeaderName = $('myHeaderName'), adminBtn = $('adminBtn');
const incomingDialog = $('incomingDialog'), outgoingDialog = $('outgoingDialog');
const callTimer = $('callTimer'), controlsBar = $('controlsBar'), topPill = $('topPill');
const remoteGrid = $('remoteGrid'), localVideo = $('localVideo'), pipWrap = $('pipWrap');
const pipRestoreBtn = $('pipRestoreBtn');
const chatInput = $('chatInput'), actionBtn = $('actionBtn'), micSvg = $('micSvg'), sendSvg = $('sendSvg');
const networkBanner = $('networkBanner'), searchInput = $('searchInput');

/* ───────── 🟦 [SECTION 07: DOM REFS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 08: NAME INPUT ATTRIBUTES FIX] — START
   📌 क्या: नाम वाले input से autocorrect/spellcheck/etc हटाता है
           ताकि हिंदी कीबोर्ड और single-tap सही काम करे
   🔗 कहाँ से: App boot पर स्वतः
   ⚠️ डिपेंड: nameInput, editNameInput IDs
   ═══════════════════════════════════════════════════════════════════════ */

['nameInput', 'editNameInput'].forEach(id => {
  const el = $(id);
  if (el) {
    el.removeAttribute('autocorrect');
    el.removeAttribute('spellcheck');
    el.removeAttribute('autocapitalize');
    el.removeAttribute('autocomplete');
  }
});

/* ───────── 🟦 [SECTION 08: NAME INPUT FIX] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 09: TRANSLATIONS (hi / en)] — START
   📌 क्या: दोनों भाषाओं के सभी UI strings
   🔗 कहाँ से: applyLanguage() इसका उपयोग करता है
   ⚠️ डिपेंड: कोई नहीं
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 09: TRANSLATIONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 10: LANGUAGE APPLY] — START
   📌 क्या: चुनी हुई भाषा के अनुसार सभी UI elements का text set करता है
   🔗 कहाँ से: langSelect dropdown, initApp()
   ⚠️ डिपेंड: translations, सभी UI element IDs
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 10: LANGUAGE APPLY] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 11: USER & CALL STATE VARIABLES] — START
   📌 क्या: पूरी app का runtime state — user identity, chat state,
           call state, media state, quality state
   🔗 कहाँ से: लगभग हर function इन variables को पढ़ता/लिखता है
   ⚠️ डिपेंड: localStorage (persist), Firebase (sync)
   ═══════════════════════════════════════════════════════════════════════ */

// 👤 Current user identity (localStorage से restore होती है)
let myUserId = localStorage.getItem('vc_user_id') || '';
let myUserName = localStorage.getItem('vc_user_name') || '';
let myFcmToken = localStorage.getItem('vc_fcm_token') || null;

// 👥 Lobby data (Firebase से live sync होता है)
let allOnlineUsers = {};
let latestChatSnippets = {};
let unreadCounts = {};
let allCallLogs = [];

// 📌 Chat pin/archive flags (per-user localStorage)
let pinnedChats = {};
let archivedChats = {};
let currentTheme = localStorage.getItem('vc_theme') || 'dark';

// 🧊 Cold-start cache restore (offline-first UX)
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

// 🎨 Theme apply helper
function applyTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('vc_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

// 🏷️ Header में नाम दिखाना + Admin button visibility
if (myUserName) {
  myHeaderName.textContent = myUserName;
  adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
}

// 🎥 Media & call state
let localStream = null, activeCallId = null;
let currentChatTargetId = null, currentChatTargetName = null;
let currentCallType = 'outgoing', currentCallTargetId = null, currentCallTargetName = null;

// 🎛️ Call control flags
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

// 📦 Media transfer state (P2P file sharing)
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

// 🔐 Permission callbacks tracking
let permissionCallbackCounter = 0;
let permissionCallbacks = {};
let splashHidden = false;

/* ───────── 🟦 [SECTION 11: STATE VARIABLES] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 12: SPLASH & NATIVE AUDIO HELPERS] — START
   📌 क्या: Splash screen hide करना, Native ringing/audio mode/speaker,
           lock detect, phone contacts load
   🔗 कहाँ से: App init, call lifecycle
   ⚠️ डिपेंड: window.AndroidAudio (native bridge, optional)
   ═══════════════════════════════════════════════════════════════════════ */

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
function requestDeviceUnlock() {
  if (window.AndroidAudio && typeof window.AndroidAudio.requestUnlock === 'function') {
    try { window.AndroidAudio.requestUnlock(); return true; } catch(e) {}
  }
  if (window.AndroidBridge && typeof window.AndroidBridge.requestUnlock === 'function') {
    try { window.AndroidBridge.requestUnlock(); return true; } catch(e) {}
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

/* ───────── 🟦 [SECTION 12: SPLASH & NATIVE HELPERS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 13: MEDIA SAVE HELPERS] — START
   📌 क्या: फ़ाइल का सही extension guarantee, Android Downloads में सेव,
           Web fallback (a.download), VCF contact open
   🔗 कहाँ से: autoSaveMediaToDownloads(), media bubbles, VCF messages
   ⚠️ डिपेंड: window.AndroidAudio.saveMediaToDownloads (native)
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 13: MEDIA SAVE HELPERS] — END ───────── */

/* ═══ यहाँ BATCH 1A खत्म होता है ═══ */
/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 14: PERMISSIONS FLOW (NATIVE + WEB)] — START
   📌 क्या: Native (Android) या Web दोनों में सभी permissions मांगना —
           camera, mic, notification, etc.
   🔗 कहाँ से: grantPermsBtn, recheckPermsBtn, runFullPermissionFlow()
   ⚠️ डिपेंड: window.AndroidAudio.requestAllPermissions (native),
              window.__onPermissionResult (native callback)
   ═══════════════════════════════════════════════════════════════════════ */

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

// Native layer इस global function को call करता है जब सारी permissions का result आता है
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

/* ───────── 🟦 [SECTION 14: PERMISSIONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 15: PUSH NOTIFICATION & FCM TOKEN SYNC] — START
   📌 क्या: Native Capacitor Push plugin से FCM token प्राप्त करना और
           Firebase में `users/{uid}/fcmToken` पर save करना
   🔗 कहाँ से: initApp() → setupNativePushListeners(), requestNotificationPermission()
   ⚠️ डिपेंड: getPushPlugin(), myUserId, db
   🎯 Trigger: Native push plugin से 'registration' event
   ═══════════════════════════════════════════════════════════════════════ */

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
  // 🆕 CHAT_ prefix वाली callId और isChat=true वाले push को call न समझें
  const rawCallId = data.callId ? String(data.callId) : '';
  const isRealCall = rawCallId && rawCallId !== 'null' && rawCallId !== 'undefined' && !rawCallId.startsWith('CHAT_') && !data.isChat;
  if (isRealCall) {
    handleIncomingCallNotification(data, false);
  }
});

  push.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data || {};
    const rawCallId = data?.callId;
const isRealCall = rawCallId
  && rawCallId !== 'null'
  && rawCallId !== 'undefined'
  && String(rawCallId).trim() !== ''
  && !String(rawCallId).startsWith('CHAT_')   // 🆕
  && !data.isChat;                            // 🆕
     
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

// Web FCM registration (browser notification)
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

/* ───────── 🟦 [SECTION 15: PUSH & FCM] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 16: SOUNDS & RINGTONES (Web Audio API)] — START
   📌 क्या: Web Audio API से beep/tick/cheer/oops/ringing बजाना
   🔗 कहाँ से: chat send/receive, quiz जीतना/हारना, incoming call, outgoing call
   ⚠️ डिपेंड: audioCtx (lazy init), browser autoplay policy (pointerdown unlock)
   🆕 Web incoming ringtone अब असली dual-tone "ring-ring" pattern में बजती है
   ═══════════════════════════════════════════════════════════════════════ */

let audioCtx = null, outgoingRingTimer = null;
let incomingRingTimer = null, incomingRingActive = false;

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
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 1.2);
  } catch(e) {}
}

// 🆕 Incoming ring burst — dual-tone "ring-ring" pattern (0.4s + gap + 0.4s)
function playIncomingRingBurst() {
  try {
    const ctx = ensureAudioContext(); if (!ctx) return;
    const now = ctx.currentTime;
    const tone = (start, dur) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.type = 'sine'; o1.frequency.value = 440;
      o2.type = 'sine'; o2.frequency.value = 480;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      g.gain.setValueAtTime(0.22, start + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      o1.connect(g); o2.connect(g); g.connect(ctx.destination);
      o1.start(start); o1.stop(start + dur + 0.02);
      o2.start(start); o2.stop(start + dur + 0.02);
    };
    tone(now, 0.4);
    tone(now + 0.55, 0.4);
  } catch(e) {}
}

function startOutgoingCallTone() {
  stopIncomingRingtone(); stopOutgoingCallTone();
  playBeepTone(); outgoingRingTimer = setInterval(playBeepTone, 3000);
}
function stopOutgoingCallTone() { if (outgoingRingTimer) { clearInterval(outgoingRingTimer); outgoingRingTimer = null; } }

// 🆕 अब web/browser पर असली incoming ringtone बजती है (हर 2s में ring-ring)
function startIncomingRingtone() {
  if (incomingRingActive) return;
  incomingRingActive = true;
  playIncomingRingBurst();
  incomingRingTimer = setInterval(() => {
    if (!incomingRingActive) return;
    playIncomingRingBurst();
  }, 2000);
}

function stopIncomingRingtone() {
  incomingRingActive = false;
  if (incomingRingTimer) { clearInterval(incomingRingTimer); incomingRingTimer = null; }
  stopNativeRinging();
}

function stopAllCallTones() {
  stopOutgoingCallTone();
  stopIncomingRingtone();
  stopNativeRinging();
}

document.addEventListener('pointerdown', () => { ensureAudioContext(); }, {passive:true});

/* ───────── 🟦 [SECTION 16: SOUNDS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 17: UTILITY HELPERS] — START
   📌 क्या: toast, safe HTML escape, name check, time/date format,
           file icon, call notification clear, media acquire
   🔗 कहाँ से: लगभग पूरी app
   ⚠️ डिपेंड: DOM elements (#toast etc.)
   ═══════════════════════════════════════════════════════════════════════ */

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function safeName(n) { return String(n||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function isNeerajBadola(n) { const s = (n||'').toLowerCase().replace(/\s+/g,' ').trim(); return (s.includes('neeraj')&&s.includes('badola'))||(s.includes('नीरज')&&s.includes('बडोला')); }
// 🕒 केवल समय (उदा. 05:30 PM)
function formatClockTime(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// 📅 दो तिथियों के बीच कैलेंडर दिनों का अंतर
function getCalendarDayDiff(targetTs) {
  const target = new Date(Number(targetTs));
  const now = new Date();
  
  const targetDate = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffMs = nowDate - targetDate;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// 👁️ स्मार्ट लास्ट टाइम — कॉम्पैक्ट फॉर्मेट (बिना 'Last seen' के)
function formatLastSeen(ts) {
  if (!ts) return '';
  const diffDays = getCalendarDayDiff(ts);
  const timeStr = formatClockTime(ts);

  if (diffDays === 0) {
    return `Today, ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  } else {
    const d = new Date(Number(ts));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const dateFormatted = `${day}/${month}/${year}`;
    
    return `${dateFormatted}, ${timeStr}`;
  }
}


// 💬 चैट लिस्ट (Lobby) के दाईं ओर दिखने वाला समय / तारीख
function formatSnippetTime(ts) {
  if (!ts) return '';
  const diffDays = getCalendarDayDiff(ts);

  if (diffDays === 0) {
    return formatClockTime(ts);
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(Number(ts)).getDay()];
  } else {
    const d = new Date(Number(ts));
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;
  }
}

// 🏷️ चैट स्क्रीन में संदेशों के बीच दिखने वाला डेट डिवाइडर
function formatDateDivider(ts) {
  if (!ts) return '';
  const diffDays = getCalendarDayDiff(ts);

  if (diffDays === 0) {
    return 'TODAY';
  } else if (diffDays === 1) {
    return 'YESTERDAY';
  } else {
    const d = new Date(Number(ts));
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}

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

  // 🆕 Native सिस्टम ट्रे नोटिफिकेशन तुरंत रद्द (safety-guarded)
  try {
    if (window.AndroidAudio && typeof window.AndroidAudio.cancelIncomingCallNotification === 'function') {
      window.AndroidAudio.cancelIncomingCallNotification();
    }
  } catch(e) {}
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.cancelIncomingCallNotification === 'function') {
      window.AndroidBridge.cancelIncomingCallNotification();
    }
  } catch(e) {}

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
      reg.getNotifications().then(notifications => {
        notifications.forEach(n => {
          // 🆕 'incoming-call' के अलावा 'call_' prefix वाली भी बंद करो
          if (n.tag && (n.tag.includes('incoming-call') || n.tag.startsWith('call_'))) {
            try { n.close(); } catch(e) {}
          }
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

/* ───────── 🟦 [SECTION 17: UTILS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 18: INCOMING CALL HANDLERS] — START
   ═══════════════════════════════════════════════════════════════════════ */

function handleIncomingCallNotification(data, isFromForegroundListener = false) {
  if (!data || !data.callId) return;
  if (activeCallId === data.callId && !incomingDialog.hidden) return;

  // 🆕 ringtone किसी भी हालत में मत बंद करो — user के accept/reject पर ही बंद होगा
  // (पुराना clearOngoingCallNotification यहाँ से पूरी तरह हटा दें)

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

  // 🆕 app visible हो तभी web ringtone — native भी साथ में रिंग कर रहा होगा तो कोई बात नहीं
  // (web ringtone native के बंद होने पर fallback की तरह काम करेगा)
  if (!document.hidden) {
    try { startIncomingRingtone(); } catch(e) {}
  }

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

    // Sabhi dusri screens hide karein
    if (incomingDialog) { incomingDialog.hidden = true; incomingDialog.style.display = 'none'; }
    if (outgoingDialog) { outgoingDialog.hidden = true; outgoingDialog.style.display = 'none'; }
    if (lobbyScreen) { lobbyScreen.hidden = true; lobbyScreen.style.display = 'none'; }
    if (chatScreen) { chatScreen.hidden = true; chatScreen.style.display = 'none'; }

    // Call screen ko turant visible karein taaki black screen na aaye
    if (callScreen) {
      callScreen.hidden = false;
      callScreen.style.display = 'flex';
    }

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
      // 🆕 clearOngoingCallNotification यहाँ मत कॉल करो — native ringtone चलता रहे
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
// 🆕 जब app foreground आए और incoming dialog खुला हो पर ringtone न बज रही हो
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible'
      && incomingDialog && !incomingDialog.hidden
      && !isCallConnected && !incomingRingActive) {
    try { ensureAudioContext(); startIncomingRingtone(); } catch(e) {}
  }
});

/* ───────── 🟦 [SECTION 18: INCOMING CALL HANDLERS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 19: CALL AUDIO MANAGER (HTML5 Audio)] — START
   📌 क्या: HTML5 Audio files (connecting.mp3, ringing.mp3, busy.mp3, end.mp3)
           से call lifecycle tones बजाना/बंद करना
   🔗 कहाँ से: startCall, joinCallSession, hangup, call reject/busy
   ⚠️ डिपेंड: sounds/*.mp3 files मौजूद हों
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 19: CALL AUDIO MANAGER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 20: PRESENCE & LISTENERS (GHOST USER & OTA WIPE FIX)] — START
   🆕 presenceUnsubs[] registry — सभी presence-side listeners एक जगह
       (call_logs, chat previews, media signals, incoming calls)
   ═══════════════════════════════════════════════════════════════════════ */

let connectedUnsub = null;
let usersListUnsub = null;
let activePresenceUserRef = null;
let activePresenceInboxRef = null;
let presenceUnsubs = [];   // 🆕 all presence-side listeners

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

  // 🆕 सभी presence-side listeners unsubscribe (duplicate / leak से बचाव)
  presenceUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
  presenceUnsubs = [];

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

  // Disconnect safety handlers
  await onDisconnect(userRef).update({
    online: false, lastSeen: serverTimestamp(), onlineSince: null,
    activeCallId: null, isBusy: false, typingTo: null
  }).catch(()=>{});
  await onDisconnect(inboxRef).remove().catch(()=>{});

  // शुरुआती online state
  await update(userRef, {
    id: currentUid, name: myUserName, online: true,
    onlineSince: serverTimestamp(), lastSeen: serverTimestamp(), activeCallId: null
  }).catch(e => console.warn('Presence write warning (ignored):', e));

  if (myFcmToken) {
    await update(userRef, { fcmToken: myFcmToken }).catch(()=>{});
  }

  if (window.AndroidBridge?.syncUser) {
    try { window.AndroidBridge.syncUser(currentUid); } catch(e){}
  }

  // Firebase connection status
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

  // सभी users live list
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

  // 🆕 सभी presence-side listeners — अब registry से cleanup होंगे
  listenSelfAccountStatus();
  listenForIncoming();                // Section 57 — presenceUnsubs में push करता है
  listenForLatestChatPreviews();      // Section 27 — push करता है
  listenForCallLogs();                // Section 26 — push करता है

  if (typeof listenForIncomingMediaSignals === 'function') {
    listenForIncomingMediaSignals();  // Section 43 — push करता है
  }
}

// अगर admin ने user की ID delete कर दी है — reset detect
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
      $('nameInput').value = ''; $('nameModal').hidden = false;
      toast(currentLang === 'hi' ? '⚠️ आपकी आईडी रीसेट हो गई है।' : '⚠️ Your ID was reset.');
    }
  });
}

/* ───────── 🟦 [SECTION 20: PRESENCE] — END ───────── */

/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 21: BOOT FLOW & NAME SAVE] — START
   📌 क्या: checkUser() — app को lobby/name modal/perms modal में ले जाना।
           saveNameBtn — नया user ID generate करके Firebase में भेजना।
           grantPermsBtn — permissions मांगकर lobby में जाना।
   🔗 कहाँ से: initApp() → checkUser()
   ⚠️ डिपेंड: myUserId, myUserName, initPresence, runFullPermissionFlow
   🎯 पहली बार app खोलने का पूरा flow
   ═══════════════════════════════════════════════════════════════════════ */

async function checkUser() {
  // 🆕 शुरू से ही सभी screens छिपी रहें — lobby तभी खुलेगी जब intent न हो
  lobbyScreen.hidden = true;
  lobbyScreen.style.display = 'none';
  chatScreen.hidden = true;
  chatScreen.style.display = 'none';
  callScreen.hidden = true;
  callScreen.style.display = 'none';

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

  // 🆕 Native bridge ready होने तक brief wait करके call/chat launch intent जाँचें
  // (bridge देर से inject होता है — इसलिए 600ms तक retry, ताकि लॉबी फ्लैश न हो)
  let hasLaunchIntent = false;
  const native = isNativeApp();
  const maxRetries = native ? 12 : 0;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (window.AndroidAudio) {
        let act = '', cid = '';
        if (typeof window.AndroidAudio.getLaunchCallAction === 'function') {
          act = window.AndroidAudio.getLaunchCallAction() || '';
        }
        if (typeof window.AndroidAudio.getLaunchCallId === 'function') {
          cid = window.AndroidAudio.getLaunchCallId() || '';
        }
        if ((act === "ACCEPT" || act === "SHOW_INCOMING") && cid) {
          hasLaunchIntent = true;
        }
        if (!hasLaunchIntent && typeof window.AndroidAudio.getLaunchChatTargetId === 'function') {
          const chatId = window.AndroidAudio.getLaunchChatTargetId();
          if (chatId) hasLaunchIntent = true;
        }
        break; // bridge मिल गया — loop खत्म
      }
    } catch(e) {}
    if (i < maxRetries) await new Promise(r => setTimeout(r, 50));
  }

  // 🆕 intent है तो lobby कभी नहीं खुलेगी — call/chat screen सीधे आएगी
  if (!hasLaunchIntent) {
    lobbyScreen.hidden = false;
    lobbyScreen.style.display = '';
  }

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

/* ───────── 🟦 [SECTION 21: BOOT FLOW] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 22: PROFILE MODAL ACTIONS] — START
   📌 क्या: profile modal खोलना/बंद करना, नाम बदलना, permissions recheck,
           chat clear, ID reset
   🔗 कहाँ से: profileBtn, closeProfileBtn, toggleEditNameBtn आदि
   ⚠️ डिपेंड: myUserName, myUserId, Firebase users/{uid}
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 22: PROFILE ACTIONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 23: 🔥 ADMIN PIN — FIREBASE VERIFICATION] — START
   📌 क्या: पहले PIN hardcoded ("1990") था — अब Firebase
           `admin_config/pin` से verify होता है
   🔗 कहाँ से: adminBtn click → adminPinModal → verifyPinBtn
   ⚠️ डिपेंड: Firebase path admin_config/pin (manually set किया गया)
   🔥 CHANGE: गलत PIN → "गलत पिन!" toast, सही → admin panel खुलेगा
   🛡️ Fallback: अगर Firebase में PIN नहीं मिला → panel locked (error toast)
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * 🔐 Firebase से admin PIN पढ़कर verify करता है
 * @param {string} inputPin - user ने जो PIN टाइप किया
 * @returns {Promise<boolean>} - true = match, false = गलत / नहीं मिला
 *
 * Firebase structure:
 *   admin_config/
 *     pin: "1990"   ← Console से manually set करें
 */
async function verifyAdminPinAsync(inputPin) {
  try {
    const snap = await get(ref(db, 'admin_config/pin'));
    if (!snap.exists()) {
      // PIN Firebase में set नहीं है
      console.warn('admin_config/pin not found in Firebase');
      return false;
    }
    const storedPin = String(snap.val()).trim();
    const input = String(inputPin || '').trim();
    return storedPin === input;
  } catch (err) {
    console.error('verifyAdminPinAsync error:', err);
    return false;
  }
}

// Admin button — PIN modal खोलो
adminBtn.onclick = () => { $('adminPinInput').value = ''; $('adminPinModal').hidden = false; };
$('closePinBtn').onclick = () => { $('adminPinModal').hidden = true; };

// 🔥 PIN verify — अब async Firebase check के साथ
$('verifyPinBtn').onclick = async () => {
  const input = $('adminPinInput').value.trim();
  if (!input) return;

  const btn = $('verifyPinBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ जाँच...';

  try {
    const isValid = await verifyAdminPinAsync(input);
    if (isValid) {
      $('adminPinModal').hidden = true;
      openAdminPanel();
    } else {
      toast(currentLang === 'hi' ? '❌ गलत पिन!' : '❌ Wrong PIN!');
    }
  } catch (err) {
    toast(currentLang === 'hi' ? '❌ सर्वर त्रुटि' : '❌ Server error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

/* ───────── 🟦 [SECTION 23: ADMIN PIN (Firebase)] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 24: ADMIN PANEL UI] — START
   📌 क्या: सभी users की list, hidden/visible toggle, permanent delete
   🔗 कहाँ से: verifyPinBtn सही होने पर → openAdminPanel()
   ⚠️ डिपेंड: allOnlineUsers, renderContacts()
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 24: ADMIN PANEL] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 25: TABS (Chats / Calls)] — START
   📌 क्या: bottom tab switching — Chat list ↔ Call logs
   🔗 कहाँ से: tabChatsBtn, tabCallsBtn
   ⚠️ डिपेंड: renderCallLogs()
   ═══════════════════════════════════════════════════════════════════════ */

$('tabChatsBtn').onclick = () => {$('tabChatsBtn').className = 'tab-btn active-chat';
  $('tabCallsBtn').className = 'tab-btn';$('tabChatsContent').hidden = false;
  $('tabCallsContent').hidden = true;
};
$('tabCallsBtn').onclick = () => {$('tabCallsBtn').className = 'tab-btn active-call';
  $('tabChatsBtn').className = 'tab-btn';$('tabCallsContent').hidden = false;
  $('tabChatsContent').hidden = true;
  renderCallLogs();
};

/* ───────── 🟦 [SECTION 25: TABS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 26: CALL LOGS (Record / Listen / Render)] — START
   📌 क्या: हर कॉल (incoming/outgoing/missed) को Firebase
           `call_logs/{uid}/{callId}` में save, live listen, UI render
   🔗 कहाँ से: hangup(), btnReject, listenForIncoming
   ⚠️ डिपेंड: allCallLogs, callLogsList, formatClockTime
   🎯 दोनों तरफ के logs sync होते हैं (मैं + सामने वाला)
   ═══════════════════════════════════════════════════════════════════════ */

async function recordCallLog(entry) {
  try {
    const logId = entry.callId || `call_${Date.now()}`;
    const myLogEntry = {
      callId: logId, targetId: entry.targetId, name: entry.name || 'उपयोगकर्ता',
      type: entry.type, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
    };
    // ✅ Local UI पहले तुरंत अपडेट
    const existingIdx = allCallLogs.findIndex(x => x.callId === logId);
    if (existingIdx >= 0) allCallLogs[existingIdx] = myLogEntry;
    else allCallLogs.unshift(myLogEntry);
    localStorage.setItem('cached_call_logs', JSON.stringify(allCallLogs));
    renderCallLogs();

    // 🆕 Firebase writes fire-and-forget (no await — UI already updated)
    set(ref(db, `call_logs/${myUserId}/${logId}`), myLogEntry).catch(()=>{});

    if (entry.targetId && entry.targetId !== myUserId) {
      const remoteType = entry.type === 'outgoing' ? 'incoming' : (entry.type === 'incoming' ? 'outgoing' : 'missed');
      const remoteLogEntry = {
        callId: logId, targetId: myUserId, name: myUserName,
        type: remoteType, callMode: entry.callMode || 'video', duration: entry.duration || '00:01', time: entry.time || Date.now()
      };
      set(ref(db, `call_logs/${entry.targetId}/${logId}`), remoteLogEntry).catch(()=>{});
    }
  } catch(e) {}
}

function listenForCallLogs() {
  const unsub = onValue(ref(db, `call_logs/${myUserId}`), snap => {
    const raw = snap.val() || {};
    const list = Object.keys(raw).map(k => raw[k]);
    if (list.length > 0) {
      allCallLogs = list.sort((a,b) => (b.time||0) - (a.time||0));
      localStorage.setItem('cached_call_logs', JSON.stringify(allCallLogs));
      renderCallLogs();
    }
  });
  presenceUnsubs.push(unsub);   // 🆕
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

/* ───────── 🟦 [SECTION 26: CALL LOGS] — END ───────── */

/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 27: CONTACT LIST & CHAT PREVIEWS] — START
   📌 क्या: live chat snippets, unread counts, delivered ticks,
           notification trigger, contacts list render, online strip
   ═══════════════════════════════════════════════════════════════════════ */

const getChatRoomId = (a, b) => [a, b].sort().join('__');

function getTickBadge(snippet) {
  if (!snippet || snippet.senderId !== myUserId) return '';
  if (snippet.read) return '<span class="tick-mark tick-read" style="color:#38bdf8;font-weight:900;">✓✓</span>';
  if (snippet.delivered) return '<span class="tick-mark tick-delivered" style="color:#94a3b8;font-weight:900;">✓✓</span>';
  return '<span class="tick-mark tick-sent" style="color:#64748b;font-weight:900;">✓</span>';
}

let isInitialLoad = true;
const lastKnownMessageTimes = {};

// ✅ FIX: सटीक targetId एक्सट्रैक्शन और गारंटीड लॉबी रेंडर
function listenForLatestChatPreviews() {
  const unsub = onValue(ref(db, 'chats'), snap => {
    try {
      const rooms = snap.val() || {};
      const currentUid = String(myUserId || '').trim();
      if (!currentUid) return;

      Object.keys(rooms).forEach(key => {
        try {
          // केवल वही रूम देखें जो वर्तमान यूजर से जुड़े हों
          let targetId = null;
          if (key.startsWith(currentUid + '__')) {
            targetId = key.substring(currentUid.length + 2);
          } else if (key.endsWith('__' + currentUid)) {
            targetId = key.substring(0, key.length - currentUid.length - 2);
          }

          // अगर यह रूम हमारे यूजर का नहीं है, तो आगे बढ़ें
          if (!targetId) return;

          const msgs = rooms[key]?.messages || {};
          const msgKeys = Object.keys(msgs);
          if (!msgKeys.length) return;

          // मैसेजेस को टाइम के अनुसार सॉर्ट करें (नंबर कन्वर्जन के साथ)
          const sortedKeys = msgKeys.sort((a, b) => (Number(msgs[a]?.time) || 0) - (Number(msgs[b]?.time) || 0));
          const lastMsg = msgs[sortedKeys[sortedKeys.length - 1]];
          if (!lastMsg) return;

          // 1. Unread Count और Delivered Ticks सिंक
          let unread = 0;
          msgKeys.forEach(k => {
            const m = msgs[k];
            if (!m) return;
            const isFromOther = String(m.senderId) !== currentUid;
            
            // अगर मैसेज सामने वाले का है, अनरीड है, और अभी उसकी चैट नहीं खुली है
            if (isFromOther && !m.read && currentChatTargetId !== targetId) {
              unread++;
            }
            // डिलीवरी टिक अपडेट
            if (isFromOther && !m.delivered) {
              update(ref(db, `chats/${key}/messages/${k}`), { delivered: true }).catch(() => {});
            }
          });
          unreadCounts[targetId] = unread;

          // 2. लेटेस्ट मैसेज स्निपेट तैयार करना
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

          const lastTime = Number(lastMsg.time) || Date.now();

          latestChatSnippets[targetId] = {
            text: msgText,
            time: lastTime,
            senderId: lastMsg.senderId,
            read: !!lastMsg.read,
            delivered: !!lastMsg.delivered
          };

          // 3. केवल आने वाले नए मैसेज पर नोटिफिकेशन (खुद के भेजे मैसेज पर कभी नहीं)
          const prevTime = lastKnownMessageTimes[targetId] || 0;
          const isIncomingNew = 
            !isInitialLoad &&
            lastTime > prevTime &&
            String(lastMsg.senderId) !== currentUid &&
            currentChatTargetId !== targetId;

          if (isIncomingNew) {
            try {
              triggerSystemMessageNotification(lastMsg.senderName || 'New message', msgText, targetId);
            } catch (nErr) {}
          }
          lastKnownMessageTimes[targetId] = Math.max(prevTime, lastTime);

        } catch (roomErr) {
          console.warn('Error in room:', key, roomErr);
        }
      });

      isInitialLoad = false;

      // लोकल कैश सुरक्षित करें
      try {
        localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
        localStorage.setItem('cached_unreads', JSON.stringify(unreadCounts));
      } catch (e) {}

      // 🔴 लॉबी लिस्ट को बिना किसी रुकावट के तुरंत अपडेट करें
      renderContacts();

    } catch (err) {
      console.warn('Chat listener root error:', err);
    }
  });
presenceUnsubs.push(unsub);   // 🆕
}

function triggerSystemMessageNotification(sender, text, targetId) {
  if (currentChatTargetId === targetId) return;

  playMessageBeep();

  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(sender, { 
        body: text, 
        icon: 'icon.png', 
        badge: 'icon.png', 
        tag: `chat_${targetId}`, 
        renotify: true, 
        data: { targetId, senderName: sender } 
      });
    }).catch(() => { 
      new Notification(sender, { body: text, icon: 'icon.png' }); 
    });
  } else if (!document.hidden && currentChatTargetId !== targetId) {
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

  // 1️⃣ Sabhi users ke aakhri call ka time nikalna
  const latestCallTimes = {};
  if (Array.isArray(allCallLogs)) {
    allCallLogs.forEach(log => {
      if (log.targetId) {
        const logTime = Number(log.time) || 0;
        if (!latestCallTimes[log.targetId] || logTime > latestCallTimes[log.targetId]) {
          latestCallTimes[log.targetId] = logTime;
        }
      }
    });
  }

  // 2️⃣ Helper: User ke saath aakhri interaction (Call ya Message) ka time
  const getLatestInteractionTime = (uid) => {
    const msgTime = Number(latestChatSnippets[uid]?.time) || 0;
    const callTime = Number(latestCallTimes[uid]) || 0;
    return Math.max(msgTime, callTime);
  };

  // 3️⃣ WhatsApp-Style Sorting: Pin > Latest Message/Call > Alphabetical
  userIds.sort((a, b) => {
    const pinA = pinnedChats[a] ? 1 : 0;
    const pinB = pinnedChats[b] ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA; // Pinned hamesha sabse upar

    const timeA = getLatestInteractionTime(a);
    const timeB = getLatestInteractionTime(b);

    // Agar kisi se baat ya call hui hai, to jo sabse fresh hai wo upar aayega
    if (timeA !== timeB) {
      return timeB - timeA;
    }

    // Agar dono se koi baat nahi hui (time 0 hai), to naam ke hisab se (A-Z)
    const nameA = (allOnlineUsers[a]?.name || '').toLowerCase();
    const nameB = (allOnlineUsers[b]?.name || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  userIds.forEach(id => {
    const u = allOnlineUsers[id], isOnline = !!u.online;
    const isTyping = u.typingTo === myUserId;
    const unread = Number(unreadCounts[id]) || 0;
    const snippet = latestChatSnippets[id];
    const isPinned = !!pinnedChats[id];
    const card = document.createElement('div');
    card.className = 'contact-card' + (isPinned ? ' pinned' : '');

    const statusText = isTyping ? translations[currentLang].typing : (isOnline ? translations[currentLang].online : formatLastSeen(u.lastSeen));
    const statusClass = (isTyping || isOnline) ? 'online' : '';
    const lastMsgHtml = isTyping
      ? `<span class="typing-pulse">${translations[currentLang].typing}</span>`
      : (snippet ? `${getTickBadge(snippet)} <span>${safeName(snippet.text)}</span>` : `<span style="color:#64748b;font-style:italic">${currentLang==='hi'?'बातचीत शुरू करें...':'Start a conversation...'}</span>`);

    const timeHtml = snippet?.time ? formatSnippetTime(snippet.time) : '';

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

if ($('shareAppWhatsappBtn')) {$('shareAppWhatsappBtn').onclick = () => {
    const promoMsg = currentLang === 'hi'
      ? `📱 कमाल का वीडियो कॉलिंग ऐप! इसमें फन-मोड, वाइटबोर्ड और पहेलियां (Riddles) भी हैं। अभी डाउनलोड करें: \n${GITHUB_APK_URL}`
      : `📱 Amazing Video Calling App with Fun-Mode, Whiteboard & Riddles! Download now: \n${GITHUB_APK_URL}`;
    window.open('https://api.whatsapp.com/send?text=' + encodeURIComponent(promoMsg), '_blank');
  };
}
/* ───────── 🟦 [SECTION 27: CONTACTS & PREVIEWS] — END ───────── */



/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 28: LONG-PRESS MESSAGE MENU] — START
   📌 क्या: किसी भी chat bubble पर 500ms देर तक दबाने से context menu
           खुलता है (reactions + copy/reply/forward/star/delete)
   🔗 कहाँ से: attachBubbleLongPress() हर bubble पर लगता है
   ⚠️ डिपेंड: REACTION_EMOJIS, openMessageMenu(), closeMessageMenu()
   🎯 Touch + Mouse दोनों support, scroll पर auto-cancel
   ═══════════════════════════════════════════════════════════════════════ */

let longPressTimer = null;
let longPressStartX = 0;
let longPressStartY = 0;
let longPressMoved = false;
let currentLongPressMsgId = null;
let currentLongPressMsgData = null;
let replyToMessageId = null;
let replyToMessageData = null;

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

// हर bubble पर long-press gesture attach करता है
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

  // अगर 10px से ज़्यादा move हुआ तो cancel (scroll मान लो)
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

// Menu को DOM में create + render करता है
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

  // menu box के अंदर touch events को bubble न होने दें
  const menuBox = menu.querySelector('.menu-box');
  if (menuBox) {
    ['touchstart', 'touchend', 'click'].forEach(evt => {
      menuBox.addEventListener(evt, (e) => e.stopPropagation());
    });
  }

  // Reaction click
  menu.querySelectorAll('.reaction-pick-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const emoji = btn.dataset.emoji;
      closeMessageMenu();
      await toggleReaction(msgId, m, emoji);
    };
  });

  // Menu item click
  menu.querySelectorAll('.menu-item').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      closeMessageMenu();
      await handleMessageAction(action, msgId, m);
    };
  });

  // Backdrop tap = close
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

/* ───────── 🟦 [SECTION 28: LONG-PRESS MENU] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 29: MESSAGE ACTIONS (Copy/Reply/Forward/Star/Delete)] — START
   📌 क्या: long-press menu से चुनी गई action का handler
   🔗 कहाँ से: openMessageMenu() से call
   ⚠️ डिपेंड: startReply, openForwardDialog, toggleStarMessage, deleteMessage
   ═══════════════════════════════════════════════════════════════════════ */

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
        // Fallback for old browsers
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

/* ───────── 🟦 [SECTION 29: MESSAGE ACTIONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 30: REACTIONS (Toggle + Render)] — START
   📌 क्या: किसी message पर emoji reaction add/remove, और सभी
           reactions को bubble पर chips के रूप में render
   🔗 कहाँ से: long-press menu → reaction button, loadChatMessages()
   ⚠️ डिपेंड: Firebase chats/{roomId}/messages/{msgId}/reactions/{uid}
   🎯 एक user = एक reaction (replace on new emoji)
   ═══════════════════════════════════════════════════════════════════════ */

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

// Bubble के नीचे chips बनाता है (❤️2 👍1)
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

/* ───────── 🟦 [SECTION 30: REACTIONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 31: REPLY PREVIEW BOX] — START
   📌 क्या: चैट footer के ऊपर "जवाब दे रहे हैं..." bar दिखाना + cancel
   🔗 कहाँ से: reply action, cancelReply(), sendChatMessage
   ⚠️ डिपेंड: chat-footer DOM, chatInput
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 31: REPLY PREVIEW] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 32: STAR + DELETE MESSAGE] — START
   📌 क्या: message को star/unstar, और delete (for me / for everyone)
   🔗 कहाँ से: long-press menu actions
   ⚠️ डिपेंड: Firebase updates, localStorage (delete-me tracking)
   🎯 delete-for-me = local cache only, delete-for-all = Firebase update
   ═══════════════════════════════════════════════════════════════════════ */

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
      // Firebase में deleted=true set करो, text replace करो
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
      // सिर्फ मेरे लिए — DOM से हटाओ + localStorage में blacklist करो
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

// क्या यह message मेरे द्वारा locally deleted है?
function isDeletedForMe(msgId) {
  try {
    const key = `vc_deleted_${myUserId}_${getChatRoomId(myUserId, currentChatTargetId)}`;
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    return list.includes(msgId);
  } catch(e) {
    return false;
  }
}

/* ───────── 🟦 [SECTION 32: STAR & DELETE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 33: FORWARD DIALOG] — START
   📌 क्या: message को किसी और user को forward करना (prompt-based)
   🔗 कहाँ से: long-press menu → forward action
   ⚠️ डिपेंड: allOnlineUsers, Firebase chats/{roomId}
   🎯 media (image/video/audio/doc) + text दोनों support
   ═══════════════════════════════════════════════════════════════════════ */

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

    // Type-wise copy करना
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

/* ───────── 🟦 [SECTION 33: FORWARD] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 34: CHAT OPEN / CLOSE] — START
   ═══════════════════════════════════════════════════════════════════════ */

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

    // Target user का online/last seen live
    if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
    targetStatusUnsub = onValue(ref(db, `users/${tId}`), (snap) => {
      const u = snap.val() || {};
      const statusEl = $('chatTargetStatus');
      if (!statusEl) return;
      const isTyping = u.typingTo === myUserId;
      const online = !!u.online;
      if (isTyping) { statusEl.textContent = translations[currentLang]?.typing || 'लिख रहे हैं...'; statusEl.style.color = 'var(--success)'; }
      else if (online) { statusEl.textContent = translations[currentLang]?.online || 'ऑनलाइन'; statusEl.style.color = 'var(--success)'; }
      else { statusEl.textContent = formatLastSeen(u.lastSeen) || (translations[currentLang]?.offline || 'ऑफलाइन'); statusEl.style.color = '#8696a0'; }
    });

    // 👈 स्क्रीन विजिबिलिटी
    if (lobbyScreen) {
      lobbyScreen.hidden = true;
      lobbyScreen.style.display = 'none';
    }
    if (chatScreen) {
      chatScreen.hidden = false;
      chatScreen.style.display = 'flex';
    }

    // 👈 ब्राउज़र को बाहर जाने से रोकने के लिए हिस्ट्री में सुरक्षित स्टेट जोड़ें
    history.pushState({ screen: 'chat' }, '', window.location.href);

    if (chatInput) {
      chatInput.value = '';
      chatInput.style.height = '44px';
    }
    cancelReply();
    updateActionBtnState();
    loadChatMessages();
  } catch (err) {
    console.error("openChat error:", err);
    toast("चैट लोड करने में समस्या आई");
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
  
  // 👈 चैट छिपाएँ और लॉबी स्क्रीन दिखाएँ
  if (chatScreen) {
    chatScreen.hidden = true;
    chatScreen.style.display = 'none';
  }
  if (lobbyScreen) {
    lobbyScreen.hidden = false;
    lobbyScreen.style.display = '';
  }
  renderContacts();
}

$('chatBackBtn').onclick = () => {
  closeChat();
};
$('chatCallBtn').onclick = () => { if (currentChatTargetId) startCall(currentChatTargetId, currentChatTargetName, false); };$('chatVoiceCallBtn').onclick = () => { 
  if (currentChatTargetId) startCall(currentChatTargetId, currentChatTargetName, true); 
};

/* ───────── 🟦 [SECTION 34: CHAT OPEN/CLOSE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 35: VOICE NOTE BUBBLE EVENTS] — START
   📌 क्या: voice note के play/pause, progress bar seek, speed change
   🔗 कहाँ से: loadChatMessages() → audio type bubbles पर
   ⚠️ डिपेंड: activePlayingAudio (single audio at a time)
   ═══════════════════════════════════════════════════════════════════════ */

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

      // वही audio दोबारा click → pause/play toggle
      if (activePlayingAudio && activePlayingAudio.src === url) {
        if (!activePlayingAudio.paused) { activePlayingAudio.pause(); btn.textContent = '▶'; }
        else { activePlayingAudio.play(); btn.textContent = '⏸'; }
        return;
      }
      // पुराना बंद करके नया चलाओ
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

  // Progress bar पर click = seek
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

  // Speed toggle (1x → 1.5x → 2x → 1x)
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

/* ───────── 🟦 [SECTION 35: VOICE BUBBLE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 36: CHAT MESSAGES ENGINE (MAIN)] — START
   📌 क्या: पूरी chat history को live load + render करना।
           हर message के type (text/image/video/audio/doc/system) के
           हिसाब से सही bubble बनाना।
   🔗 कहाँ से: openChat() → loadChatMessages()
   ⚠️ डिपेंड: Firebase chats/{roomId}/messages, renderReactionsHtml,
              attachBubbleLongPress, attachVoiceBubbleEvents
   🎯 Delivered/Read ticks, reply preview, reactions, deleted state
   📌 Auto-read: सामने वाले के message खुलते ही read=true set होता है
   ═══════════════════════════════════════════════════════════════════════ */

function loadChatMessages() {
  const body = $('chatBody');
  if (chatUnsub) chatUnsub();
  const roomPath = `chats/${getChatRoomId(myUserId, currentChatTargetId)}/messages`;

  chatUnsub = onValue(ref(db, roomPath), snap => {
    const msgs = snap.val() || {};
    const sortedKeys = Object.keys(msgs).sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));

    // पुराने DOM से वो messages हटाओ जो Firebase में नहीं हैं
    const currentMsgEls = body.querySelectorAll('[data-msg-id]');
    const newKeySet = new Set(sortedKeys);
    currentMsgEls.forEach(el => {
      if (!newKeySet.has(el.dataset.msgId)) el.remove();
    });

    let shouldScroll = false;
    const isNearBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 120;

     let lastRenderedDateKey = null;

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

      // Media auto-save to Downloads
      if (m.data && m.senderId !== myUserId) {
        autoSaveMediaToDownloads(msgId, m.data, m.fileName, m.mimeType);
      }

      let el = document.getElementById(`msg_${msgId}`);

      // पहले से DOM में है? सिर्फ update करो (starred, deleted, tick)
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
       
   // 📅 तारीख बदलने पर व्हाट्सएप स्टाइल डेट डिवाइडर लगाना
   if (m.time) {
     const dObj = new Date(Number(m.time));
     const dateKey = `${dObj.getFullYear()}-${dObj.getMonth()}-${dObj.getDate()}`;
     if (dateKey !== lastRenderedDateKey) {
       lastRenderedDateKey = dateKey;
       const divider = document.createElement('div');
       divider.className = 'chat-date-divider';
       divider.innerHTML = `<span>${formatDateDivider(m.time)}</span>`;
       body.appendChild(divider);
     }
   }

      // ===== नया message bubble बनाओ =====
      el = document.createElement('div');
      el.id = `msg_${msgId}`;
      el.dataset.msgId = msgId;

      // System call message (special centered bubble)
      if (m.type === 'system-call') {
        el.className = 'chat-bubble system-call';
        el.textContent = `${m.text} • ${formatClockTime(m.time)}`;
        body.appendChild(el);
        shouldScroll = true;
        return;
      }

      // Deleted message
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

      // Reply preview (quoted block)
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

      // Type-wise content
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

      // Reactions chips
      contentHtml += renderReactionsHtml(m, msgId);

      // Tick (only for my messages)
      let tickHtml = '';
      if (m.senderId === myUserId) {
        if (m.read) tickHtml = '<span class="tick-mark tick-read" style="color:#38bdf8;font-weight:900;">✓✓</span>';
        else if (m.delivered) tickHtml = '<span class="tick-mark tick-delivered" style="color:#94a3b8;font-weight:900;">✓✓</span>';
        else tickHtml = '<span class="tick-mark tick-sent" style="color:#64748b;font-weight:900;">✓</span>';
      }

      el.innerHTML = `${contentHtml}<div class="chat-meta"><span>${m.time ? formatClockTime(m.time) : ''}</span>${tickHtml}</div>`;

      // Type-wise event listeners
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

    // Auto-scroll अगर bottom के पास थे या पहली बार खुला
    if (shouldScroll && (isNearBottom || isInitialChatOpen)) {
      body.scrollTop = body.scrollHeight;
      isInitialChatOpen = false;
    }
  });
}

/* ───────── 🟦 [SECTION 36: CHAT MESSAGES ENGINE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 37: TICK UPDATER] — START
   📌 क्या: DOM में पहले से मौजूद मेरे message का tick (✓/✓✓/✓✓ blue)
           सिर्फ update करना (पूरा bubble फिर से नहीं बनाना)
   🔗 कहाँ से: loadChatMessages() जब message पहले से DOM में हो
   ⚠️ डिपेंड: msg_{id} DOM, .chat-meta class
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 37: TICK UPDATER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 38: MEDIA PLACEHOLDER & DOC BUBBLE BUILDER] — START
   📌 क्या: data अभी नहीं आया है तो "auto-downloading" placeholder,
           doc/file के लिए proper icon+name+size bubble
   🔗 कहाँ से: loadChatMessages(), updateChatMediaMessageWithData()
   ⚠️ डिपेंड: formatFileSize, getFileIcon, safeName
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 38: MEDIA PLACEHOLDER / DOC BUBBLE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 39: INPUT & ACTION BUTTON STATE] — START
   📌 क्या: chat input के auto-grow, mic↔send icon toggle, typing indicator
           (Firebase users/{uid}/typingTo) 1800ms debounce
   🔗 कहाँ से: chatInput input/keydown events, openChat()
   ⚠️ डिपेंड: chatInput, actionBtn, micSvg, sendSvg, typingTimeout
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 39: INPUT STATE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 40: CHAT SEND (Text + Push Notification)] — START
   📌 क्या: text message Firebase में save + Cloudflare worker से FCM push
           भेजना (receiver offline भी हो तो notify)
   🔗 कहाँ से: actionBtn click, Enter key
   ⚠️ डिपेंड: Firebase chats/{roomId}/messages, sendChatMessagePush
   🎯 Reply preview को भी message में embed करता है
   ═══════════════════════════════════════════════════════════════════════ */

async function sendChatMessagePush(targetId, textContent, roomId, msgId, mediaMeta = null) {
  try {
    const tSnap = await get(ref(db, `users/${targetId}`));
    const token = tSnap.val()?.fcmToken;
    if (!token) return;

    // 🆕 Chat push में अब callId नहीं — receiver इसे call नहीं समझेगा
    const payload = {
  token,
  title: myUserName,
  body: textContent,
  callerName: myUserName,             // worker के लिए
  callId: "CHAT_" + myUserId,         // 🆕 वापस जोड़ें — worker को notification trigger करने का संकेत
  senderId: myUserId,
  senderName: myUserName,
  roomId: roomId,
  messageId: msgId,
  isChat: true,
  chatTargetId: myUserId,
  chatTargetName: myUserName
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

  // Reply block
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

  // Lobby preview को तुरंत update करो (optimistic)
  latestChatSnippets[currentChatTargetId] = { text: txt, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  await set(newMsgRef, msgData);
  sendChatMessagePush(currentChatTargetId, txt, roomId, newMsgId);
}

// Pointer/mouse down पर default blur न हो — double action से बचाव
actionBtn.addEventListener('pointerdown', (e) => {
  if (chatInput.value.trim().length > 0) e.preventDefault();
});
actionBtn.addEventListener('mousedown', (e) => {
  if (chatInput.value.trim().length > 0) e.preventDefault();
});

// Action button click = send (text हो) या voice dock (text खाली हो)
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

// Enter = send, Shift+Enter = new line
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (isSendingMsg) return;
    isSendingMsg = true;
    sendChatMessage();
    setTimeout(() => { isSendingMsg = false; }, 800);
  }
});

/* ───────── 🟦 [SECTION 40: CHAT SEND] — END ───────── */

/* ═══ यहाँ BATCH 2A खत्म होता है ═══ */
/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 41: SEND MEDIA MESSAGE] — START
   📌 क्या: फ़ाइल भेजने का main entry point। छोटी (<3.5MB) → सीधा base64
           Firebase में; बड़ी → WebRTC P2P data channel से
   🔗 कहाँ से: photoFileInput, videoFileInput, docFileInput, anyFileInput,
              cameraCaptureInput, sendVcfMessage
   ⚠️ डिपेंड: DIRECT_SEND_MAX_SIZE, sendMediaFileOverDataChannel
   🎯 Optimistic lobby snippet + Firebase save + P2P fallback
   ═══════════════════════════════════════════════════════════════════════ */

async function sendMediaMessage(file) {
  if (!file || !currentChatTargetId) return;

  const targetId = currentChatTargetId;
  const roomId = getChatRoomId(myUserId, targetId);
  const roomPath = `chats/${roomId}/messages`;
  const mediaType = getMediaTypeFromMime(file.type);
  const mediaId = `media_${Date.now()}_${Math.floor(Math.random()*10000)}`;
  const label = mediaType === 'image' ? '📷 फ़ोटो' : (mediaType === 'video' ? '🎥 वीडियो' : (mediaType === 'audio' ? '🎙 वॉयस नोट' : '📄 दस्तावेज़'));

  // Local cache — file को बाद में data channel पर भेजने के लिए
  localFileMemoryCache[mediaId] = file;

  // Lobby preview तुरंत update
  latestChatSnippets[targetId] = { text: label, time: Date.now(), senderId: myUserId, read: false, delivered: false };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  // छोटी फ़ाइल → सीधे base64 से भेज दो (P2P की ज़रूरत नहीं)
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

  // बड़ी फ़ाइल → पहले placeholder message save करो, फिर P2P से data भेजो
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

/* ───────── 🟦 [SECTION 41: SEND MEDIA MESSAGE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 42: MEDIA P2P DATA CHANNEL (SENDER SIDE)] — START
   📌 क्या: बड़ी files को WebRTC data channel से भेजने के लिए connection
           setup + offer/answer signaling (Firebase media_signals path)
   🔗 कहाँ से: sendMediaFileOverDataChannel() → getOrCreateMediaDataChannel()
   ⚠️ डिपेंड: ICE_SERVERS, db, mediaDataChannels, mediaPeerConnections
   🎯 25s timeout पर fail, buffer drain के साथ chunked send
   ═══════════════════════════════════════════════════════════════════════ */

async function getOrCreateMediaDataChannel(peerId) {
  if (mediaDataChannels[peerId] && mediaDataChannels[peerId].readyState === 'open') {
    return mediaDataChannels[peerId];
  }

  const pc = new RTCPeerConnection(ICE_SERVERS);
  mediaPeerConnections[peerId] = pc;

  const targetSignalsPath = `media_signals/${peerId}/${myUserId}`;
  const mySignalsPath = `media_signals/${myUserId}/${peerId}`;

  // ICE candidates को सामने वाले के path पर भेजो
  pc.onicecandidate = e => {
    if (e.candidate) push(ref(db, `${targetSignalsPath}/candidates`), e.candidate.toJSON()).catch(()=>{});
  };

  // सामने वाले के ICE candidates सुनो
  pc.pendingIce = [];
  onChildAdded(ref(db, `${mySignalsPath}/candidates`), async snap => {
    const c = snap.val(); if (!c) return;
    const cand = new RTCIceCandidate(c);
    if (pc.remoteDescription) { try { await pc.addIceCandidate(cand); } catch(e){} }
    else pc.pendingIce.push(cand);
  });

  // Remote description मिलने के बाद pending candidates flush
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

    // सामने वाले का answer सुनो
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

/* ───────── 🟦 [SECTION 42: MEDIA DATA CHANNEL — SENDER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 43: MEDIA P2P DATA CHANNEL (RECEIVER SIDE)] — START
   📌 क्या: सामने वाले के offer को सुनकर answer भेजना, और datachannel
           receive करके mediaDataChannels में save करना
   🔗 कहाँ से: listenForIncomingMediaSignals() → initPresence()
   ⚠️ डिपेंड: media_signals/{myUserId}/{senderId}, setupMediaDataChannel
   ═══════════════════════════════════════════════════════════════════════ */

function listenForIncomingMediaSignals() {
  const incomingMediaRef = ref(db, `media_signals/${myUserId}`);

  const unsub = onValue(incomingMediaRef, async snap => {
    const allSenders = snap.val() || {};
    for (const senderId of Object.keys(allSenders)) {
      if (!senderId || senderId === myUserId) continue;

      const signalData = allSenders[senderId];
      if (!signalData || !signalData.offer || signalData.answered) continue;

      // पहले से connected है तो skip
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

      // Sender की तरफ से data channel खुलेगा, यहाँ सिर्फ receive करो
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
   presenceUnsubs.push(unsub);   // 🆕
}

/* ───────── 🟦 [SECTION 43: MEDIA DATA CHANNEL — RECEIVER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 44: DATA CHANNEL HANDLERS (Control + Chunks)] — START
   📌 क्या: datachannel पर आने वाले messages को handle करना —
           control JSON (start/end/request) और binary chunks
   🔗 कहाँ से: setupMediaDataChannel() → onmessage
   ⚠️ डिपेंड: incomingChunks, activeTransfers, handleIncomingChunk
   ═══════════════════════════════════════════════════════════════════════ */

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
      // नया transfer शुरू — chunk buffer initialize
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
      // सभी chunks आ चुके — Blob बनाकर Firebase में data भरो
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
      // सामने वाला कह रहा है — यह media फिर भेजो (retry)
      if (localFileMemoryCache[mediaId]) {
        sendMediaFileOverDataChannel(peerId, localFileMemoryCache[mediaId]);
      }
      break;
  }
}

function handleIncomingChunk(peerId, arrayBuffer) {
  // अभी जो transfer receiving state में है उसे ढूंढो
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

  // हर 10 chunks पर progress update
  if (transfer.receivedChunks % 10 === 0 || transfer.receivedBytes >= transfer.totalSize) {
    renderTransferQueue();
  }
}

/* ───────── 🟦 [SECTION 44: DATA CHANNEL HANDLERS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 45: FILE SENDING LOOP + BUFFER DRAIN] — START
   📌 क्या: फ़ाइल को छोटे chunks में बाँटकर datachannel पर भेजना,
           buffer high होने पर wait करना (backpressure)
   🔗 कहाँ से: sendMediaMessage (बड़ी files), media-request retry
   ⚠️ डिपेंड: CHUNK_SIZE, BUFFER_HIGH_THRESHOLD, BUFFER_LOW_THRESHOLD
   🎯 Progress UI भी renderTransferQueue() से live update
   ═══════════════════════════════════════════════════════════════════════ */

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

  // Start signal
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

    // Buffer भरा है — खाली होने का इंतज़ार
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

  // End signal
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

/* ───────── 🟦 [SECTION 45: FILE SENDING LOOP] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 46: TYPE HELPERS + TRANSFER QUEUE UI] — START
   📌 क्या: mime से media type पता करना, transfer progress UI render
   🔗 कहाँ से: sendMediaMessage, handleIncomingChunk, renderTransferQueue
   ⚠️ डिपेंड: activeTransfers, transferQueue DOM, getFileIcon
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 46: TYPE HELPERS + TRANSFER QUEUE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 47: MEDIA BUBBLE LIVE UPDATE] — START
   📌 क्या: placeholder overlay को असली image/video से बदलना जब
           P2P data पूरा आ जाए
   🔗 कहाँ से: handleMediaControlMessage → media-end
   ⚠️ डिपेंड: DOM .media-download-overlay[data-media-id="..."]
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 47: MEDIA BUBBLE LIVE UPDATE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 48: DOC DOWNLOAD HANDLER] — START
   📌 क्या: doc/file bubble पर click → location/vcard/full viewer
   🔗 कहाँ से: loadChatMessages → doc bubble click
   ⚠️ डिपेंड: openMediaViewer, openContactVcfNative, saveMediaViaNative
   🎯 Location (Google Maps) और VCF contacts के लिए special handling
   ═══════════════════════════════════════════════════════════════════════ */

function handleDocDownload(msgId, m) {
  // Location message
  if (m.data && (m.data.includes('maps.google.com') || m.fileName === 'लोकेशन')) {
    const openMaps = confirm('📍 लोकेशन Google Maps में खोलें?');
    if (openMaps) window.open(m.data, '_blank');
    else navigator.clipboard.writeText(m.data).then(() => toast('📋 लिंक कॉपी हो गया'));
    return;
  }

  // VCF contact
  if (m.mimeType === 'text/vcard' || (m.fileName && m.fileName.endsWith('.vcf'))) {
    const rawBase64 = m.data ? m.data.replace(/^data:text\/vcard;base64,/, '') : '';
    const handled = openContactVcfNative(rawBase64, m.fileName || 'contact.vcf');
    if (!handled && m.data) {
      saveMediaViaNative(rawBase64, m.fileName || 'contact.vcf', 'text/x-vcard');
      toast('👤 संपर्क VCF डाउनलोड हुआ');
    }
    return;
  }

  // बाकी सब कुछ — viewer में खोलो
  if (m.data) {
    openMediaViewer(m.data, m.mimeType || 'application/octet-stream', m.fileName || 'document');
  }
}

/* ───────── 🟦 [SECTION 48: DOC DOWNLOAD] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 49: MEDIA VIEWER (Fullscreen Preview)] — START
   📌 क्या: image/video/PDF/doc को fullscreen में open + save button
   🔗 कहाँ से: img click, video click, doc click
   ⚠️ डिपेंड: mediaViewer, mediaViewerContent DOM
   🎯 image → img tag, video → video controls, else → iframe
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 49: MEDIA VIEWER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 50: ATTACH MENU (Camera/Image/Doc/Location/Contact/Phone)] — START
   📌 क्या: paperclip button → attach menu popup, हर option का input trigger
   🔗 कहाँ से: attachBtn, attachMenu
   ⚠️ डिपेंड: photoFileInput, videoFileInput, docFileInput, anyFileInput,
              cameraCaptureInput, sendLocationMessage, sendContactMessage,
              openPhoneContactsPicker
   ═══════════════════════════════════════════════════════════════════════ */

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

// File inputs — एक बार file select होने पर send
$('photoFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('videoFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('docFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('anyFileInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };
$('cameraCaptureInput').onchange = (e) => { const f = e.target.files[0]; if (f) sendMediaMessage(f); e.target.value = ''; };

/* ───────── 🟦 [SECTION 50: ATTACH MENU] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 51: SEND LOCATION MESSAGE] — START
   📌 क्या: browser geolocation API से lat/lng लेकर Google Maps link
           भेजना as doc message
   🔗 कहाँ से: attach menu → location action
   ⚠️ डिपेंड: navigator.geolocation
   🎯 Receiver के लिए handleDocDownload() special case
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 51: LOCATION] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 52: SEND CONTACT MESSAGE (App Users)] — START
   📌 क्या: app users में से कोई contact चुनकर VCF की तरह भेजना
   🔗 कहाँ से: attach menu → contact action
   ⚠️ डिपेंड: allOnlineUsers, sendChatMessagePush
   🎯 Receiver: handleDocDownload → VCF open
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 52: SEND CONTACT] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 53: PHONE CONTACTS PICKER (Native)] — START
   📌 क्या: native Android से फोन contacts load करके user को select
           करने देना और multi-select VCF भेजना
   🔗 कहाँ से: attach menu → phone action
   ⚠️ डिपेंड: loadPhoneContacts() (native bridge), isNativeApp()
   🎯 Duplicate phone numbers filter, 300 max render, search
   ═══════════════════════════════════════════════════════════════════════ */

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

  // Duplicate numbers हटाओ
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

/* ───────── 🟦 [SECTION 53: PHONE CONTACTS PICKER] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 54: SEND VCF MESSAGE] — START
   📌 क्या: raw VCF content को base64 में encode करके doc message भेजना
   🔗 कहाँ से: openPhoneContactsPicker() → multi-select send
   ⚠️ डिपेंड: Firebase chats/{roomId}, sendChatMessagePush
   🎯 Unicode-safe base64 (unescape + encodeURIComponent)
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 54: SEND VCF] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 55: VOICE DOCK RECORDING (UI + WAVEFORM)] — START
   📌 क्या: mic hold पर dock popup, timer, pause/resume, live waveform
   🔗 कहाँ से: actionBtn click (empty input), dockPauseResumeBtn, dockTrashBtn
   ⚠️ डिपेंड: MediaRecorder, AudioContext analyser, waveCanvas
   🎯 120s auto-send limit, discard पर cleanup
   ═══════════════════════════════════════════════════════════════════════ */

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

// पॉज़ / जारी रखें toggle
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

// रद्द करना
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

/* ───────── 🟦 [SECTION 55: VOICE DOCK UI] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 56: VOICE DOCK SEND] — START
   📌 क्या: record किए हुए audio को base64 में बदलकर message के रूप
           में भेजना
   🔗 कहाँ से: dockSendBtn, 120s auto-trigger
   ⚠️ डिपेंड: Firebase chats, sendChatMessagePush
   🎯 audio/webm mime type
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 56: VOICE DOCK SEND] — END ───────── */



/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 57: LISTEN INCOMING CALLS + MISSED + PUSH] — START
   ═══════════════════════════════════════════════════════════════════════ */

currentCallType = 'outgoing';

function listenForIncoming() {
  const incomingRef = ref(db, `user_inbox/${myUserId}`);

  // पहली बार get (cold-start)
  get(incomingRef).then(snap => {
    const data = snap.val();
    if (data && data.status === 'calling' && !activeCallId) {
      handleIncomingCallNotification(data, true);
    }
  }).catch(()=>{});

  // Live listen (single listener, captured for cleanup)
  const unsub = onValue(incomingRef, async (snap) => {
    const data = snap.val();
    if (!data) return;

    // Direct accept — अपना inbox clear करो
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
// 🆕 lock screen पर native को रिंग करने दो, inbox को ringing पर मत बदलो
if (!document.hidden) {
  await update(incomingRef, { status: 'ringing' }).catch(()=>{});
}
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

        // ✅ backgrounded हो तभी system notification
        if (document.hidden) {
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

  presenceUnsubs.push(unsub);
}

// Missed call के लिए notification
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

// Cloudflare worker से push notification भेजना (caller side)
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
        callerId: myUserId,
        audioOnly: !!isVoice,
        callId: activeCallId,
        isChat: false
      })
    }).catch(()=>{});
  } catch(e) {}
}

/* ───────── 🟦 [SECTION 57: INCOMING CALL LISTENER] — END ───────── */



/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 58: START CALL (Outgoing)] — START
   📌 क्या: कोई user को video/audio call करना। Firebase session create,
           target के inbox में calling flag, ring tone बजाना,
           answer/reject/busy/ended की live monitoring
   🔗 कहाँ से: contact card click, call log click, chat call buttons
   ⚠️ डिपेंड: CallAudioManager, acquireCallMedia, sendPushNotification,
              restoreCallScreen
   🎯 45s timeout, busy/reject पर 2.5s busy tone फिर hangup
   ═══════════════════════════════════════════════════════════════════════ */

async function startCall(remoteId, remoteName, audioOnly = false) {
  // अगर पहले से कॉल चल रही है (बैकग्राउंड/मिनी मोड में), तो नई कॉल न लगाएँ
  if (isCallConnected && activeCallId) {
    toast(currentLang === 'hi' ? 'पहले से कॉल जारी है' : 'Call already in progress');
    if (typeof restoreCallScreen === 'function') {
      restoreCallScreen();
    }
    return;
  }

  // कॉल मिलाते ही कनेक्टिंग टोन चालू करें
  CallAudioManager.playConnecting();

  // Target busy है क्या?
  try {
    const bSnap = await get(ref(db, `users/${remoteId}/activeCallId`));
    if (bSnap.exists() && bSnap.val()) {
      CallAudioManager.stopAll();
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

  // 👈 चैट और लॉबी को छिपाएँ ताकि आउटगोइंग डायलॉग सामने आए
  if (chatScreen) {
    chatScreen.hidden = true;
    chatScreen.style.display = 'none';
  }
  if (lobbyScreen) {
    lobbyScreen.hidden = true;
    lobbyScreen.style.display = 'none';
  }

  $('outgoingName').textContent = remoteName + (audioOnly ? (currentLang==='hi'?' (ऑडियो)...':' (Audio)...') : (currentLang==='hi'?' (वीडियो)...':' (Video)...'));
  $('outgoingStatusText').textContent = currentLang==='hi'?'कनेक्ट किया जा रहा है...':'Connecting...';

  // 👈 डायलॉग को पूरी तरह विजिबल करें
  outgoingDialog.hidden = false;
  outgoingDialog.style.display = 'flex';

  await update(ref(db, `users/${myUserId}`), { activeCallId }).catch(()=>{});

  // Firebase session create
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

  // Target के inbox में incoming call
  await set(ref(db, `user_inbox/${remoteId}`), {
    callId: activeCallId,
    callerId: myUserId,
    callerName: myUserName,
    audioOnly: !!audioOnly,
    status: 'calling'
  });

  // Session status पर live watch
  const unsubSession = onValue(sessionRef, (snap) => {
    const d = snap.val();
    if (!d) return;

    // जब सामने वाला ringing status सेट करे
    if (d.status === 'ringing' && !isCallConnected) {
      $('outgoingStatusText').textContent = currentLang==='hi'?'घंटी बज रही है... (Ringing)':'Ringing...';
      CallAudioManager.playRinging();
    }

    if (d.status === 'answered') {
      CallAudioManager.stopAll();
    }

    // Busy
    if (d.status === 'busy') {
      unsubSession();
      toast(currentLang==='hi'?'📵 सामने वाला अभी व्यस्त है':'📵 User is busy');
      CallAudioManager.playBusy();
      setTimeout(() => {
        outgoingDialog.hidden = true;
        outgoingDialog.style.display = 'none';
        hangup(true);
      }, 2500);
    }

    // Reject
    if (d.status === 'rejected') {
      unsubSession();
      toast(currentLang==='hi'?'❌ कॉल अस्वीकार कर दी गई':'❌ Call declined');
      CallAudioManager.playBusy();
      setTimeout(() => {
        outgoingDialog.hidden = true;
        outgoingDialog.style.display = 'none';
        hangup(true);
      }, 2500);
    }

    if (d.status === 'ended' && isCallConnected) {
      unsubSession();
      toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended');
      hangup(true);
    }
  });
  unsubs.push(unsubSession);

  // 45s में कोई answer नहीं → cancel
  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = setTimeout(() => {
    if (activeCallId && !isCallConnected) {
      CallAudioManager.stopAll();
      toast(currentLang==='hi'?'⏱ कॉल का जवाब नहीं मिला':'⏱ No answer');
      outgoingDialog.hidden = true;
      outgoingDialog.style.display = 'none';
      hangup(true);
    }
  }, 45000);

  // FCM push भेजो
  try {
    const tSnap = await get(ref(db, `users/${remoteId}`));
    const td = tSnap.val();
    if (td && td.fcmToken) sendPushNotification(td.fcmToken, myUserName, audioOnly);
  } catch(e) {}

  // Target जब member बन जाए (answer) → session join
  const unsubAns = onValue(ref(db, `call_sessions/${activeCallId}/members/${remoteId}`), (snap) => {
    if (snap.exists()) {
      CallAudioManager.stopAll();
      outgoingDialog.hidden = true;
      outgoingDialog.style.display = 'none';
      unsubAns();
      joinCallSession();
    }
  });
  unsubs.push(unsubAns);
}

/* ───────── 🟦 [SECTION 58: START CALL] — END ───────── */

        

/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 59: CALL CANCEL/ACCEPT/REJECT BUTTONS] — START
   ═══════════════════════════════════════════════════════════════════════ */

$('btnCancelCall').onclick = () => {
  CallAudioManager.stopAll();
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
  CallAudioManager.stopAll();
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

  callScreen.hidden = true;   callScreen.style.display = 'none';
  chatScreen.hidden = true;   chatScreen.style.display = 'none';
  lobbyScreen.hidden = false; lobbyScreen.style.display = '';
} else {
  callScreen.hidden = true;   callScreen.style.display = 'none';
  chatScreen.hidden = true;   chatScreen.style.display = 'none';
  lobbyScreen.hidden = true;  lobbyScreen.style.display = 'none';
}

  closeIfLocked();
};

/* ───────── 🟦 [SECTION 59: CALL BUTTONS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 60: CALL MODE VISUALS + AUDIO-ONLY TOGGLE + PiP] — START
   📌 क्या: video ↔ audio mode switch (voiceCallArea दिखाना, remoteGrid छिपाना),
           camera track on/off (सभी peers पर replaceTrack), PiP entry
   🔗 कहाँ से: audioModeBtn, camBtn (जब audio-only हो), PiP button
   ⚠️ डिपेंड: localStream, peerConnections, ICE_SERVERS
   🎯 Audio-only में earpiece, video mode में speaker
   ═══════════════════════════════════════════════════════════════════════ */

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

// Video track को enable/disable — सभी peers पर
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

// PiP mode entry
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

/* ───────── 🟦 [SECTION 60: CALL MODE VISUALS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 61: BITRATE + QUALITY MONITOR] — START
   📌 क्या: WebRTC bitrate boost, SDP bitrate patch, हर 3s पर network
           quality (RTT + packet loss) sample करना + स्लो नेटवर्क ओवरले
   🔗 कहाँ से: initiatePeerConnection, joinCallSession → startNetworkQualityMonitor
   ⚠️ डिपेंड: peerConnections, localStream, callReconnectingOverlay
   🎯 High: 5 Mbps / Medium: 2.5 Mbps
   ═══════════════════════════════════════════════════════════════════════ */
function applySDPBitrate(sdp) {
  if (!sdp) return sdp;
  return sdp.replace(/a=mid:video\r\n/g, 'a=mid:video\r\nb=AS:1800\r\n');
}

async function boostPeerBitrate(pc) {
  try {
    for (const sender of pc.getSenders()) {
      if (sender.track && sender.track.kind === 'video') {
        const p = sender.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
        // 5 Mbps से घटाकर सेफ 1.8 Mbps किया गया (बैटरी की बचत)
        p.encodings[0].maxBitrate = 1800000;
        p.encodings[0].networkPriority = 'high';
        await sender.setParameters(p);
      }
    }
  } catch(e) {}
}

async function applyCallQuality(level) {
  const next = level === 'medium' ? 'medium' : 'high';
  if (qualityLevel === next) return;
  qualityLevel = next;
  try {
    const vt = localStream?.getVideoTracks?.()[0];
    if (vt) {
      await vt.applyConstraints(next === 'high' 
        ? { width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 }, frameRate: { ideal: 24, min: 15 } }
        : { width: { ideal: 640, min: 480 }, height: { ideal: 480, min: 360 }, frameRate: { ideal: 18, min: 12 } }
      );
    }
  } catch(e) {}

  for (const pc of Object.values(peerConnections)) {
    try {
      for (const s of pc.getSenders()) {
        if (s.track?.kind !== 'video') continue;
        const p = s.getParameters();
        if (!p.encodings?.length) p.encodings = [{}];
        // हाई पर 1.8 Mbps, मीडियम पर 600 kbps
        p.encodings[0].maxBitrate = next === 'high' ? 1800000 : 600000;
        await s.setParameters(p);
      }
    } catch(e) {}
  }
  updateNetworkIndicator(next);
}

function updateNetworkIndicator(level, detail='') {
  const pill = $('networkPill'), txt =$('networkText');
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

  // 🔄 अत्यधिक पैकेट लॉस होने पर ब्लैक स्क्रीन से बचाव हेतु ओवरले दिखाना
  const overlay = $('callReconnectingOverlay');
  if (overlay && isCallConnected) {
    overlay.hidden = !(lossPct > 25 || worstRtt > 600);
  }
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
  const overlay = $('callReconnectingOverlay');
  if (overlay) overlay.hidden = true;
}

/* ───────── 🟦 [SECTION 61: QUALITY MONITOR] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 62: 🔥 NETWORK RECOVERY (NEW) — START]
   📌 क्या: Call के दौरान network switch होने पर auto-reconnect
   🔥 NEW MODULE — group (4-member) + 1:1 दोनों के लिए
   📋 Logic:
      1. Browser 'online' event या Firebase '.info/connected' → trigger
      2. Dead localStream tracks (audio/video) re-acquire
      3. हर peer के लिए:
         - अगर मैं initiator (myUserId < peerId): ICE restart offer भेजो
         - अगर मैं answerer: Firebase में recovery request लिखो
      4. Initiator side पर recovery request सुनकर ICE restart trigger
      5. Max 5 attempts, फिर fail toast
   🔗 कहाँ से: joinCallSession() → setupCallNetworkRecovery()
              hangup() finally → teardownCallNetworkRecovery()
   ⚠️ डिपेंड: peerConnections, localStream, applySDPBitrate, callReconnectingOverlay
   🎯 Glare-free design: सिर्फ initiator ही ICE restart करता है
   ═══════════════════════════════════════════════════════════════════════ */

let networkRecoveryActive = false;
let networkRecoveryRetryCount = 0;
let networkOnlineHandler = null;
let networkOfflineHandler = null;
let networkFirebaseConnectedUnsub = null;
let networkRecoveryRequestUnsub = null;
let networkWasOffline = false;

/**
 * 🆕 Call के दौरान network recovery listeners setup
 * joinCallSession() में call होता है
 */
function setupCallNetworkRecovery() {
  if (networkRecoveryActive) return;
  networkRecoveryActive = true;
  networkRecoveryRetryCount = 0;
  networkWasOffline = false;

  // 1️⃣ Browser offline/online detection
  networkOfflineHandler = () => {
    networkWasOffline = true;
    console.log('[NetRecovery] offline event');
    const overlay = $('callReconnectingOverlay');
    if (overlay && isCallConnected) overlay.hidden = false;
  };
  window.addEventListener('offline', networkOfflineHandler);

  networkOnlineHandler = () => {
    if (!networkWasOffline) return; // spurious event ignore
    networkWasOffline = false;
    if (!activeCallId || isHangingUp || !isCallConnected) return;
    console.log('[NetRecovery] online event — scheduling recovery');
    setTimeout(() => attemptNetworkRecovery(), 600);
  };
  window.addEventListener('online', networkOnlineHandler);

  // 2️⃣ Firebase .info/connected — WebSocket reconnect
  if (networkFirebaseConnectedUnsub) networkFirebaseConnectedUnsub();
  let firebaseWasDisconnected = false;
  networkFirebaseConnectedUnsub = onValue(ref(db, '.info/connected'), (snap) => {
    if (snap.val() === false) {
      firebaseWasDisconnected = true;
    } else if (snap.val() === true && firebaseWasDisconnected) {
      firebaseWasDisconnected = false;
      if (activeCallId && isCallConnected && !isHangingUp) {
        console.log('[NetRecovery] Firebase reconnected — scheduling recovery');
        setTimeout(() => attemptNetworkRecovery(), 600);
      }
    }
  });

  // 3️⃣ Recovery requests — मैं initiator हूँ तो peer के request पर ICE restart भेजो
  if (networkRecoveryRequestUnsub) networkRecoveryRequestUnsub();
  if (!activeCallId) return;
  networkRecoveryRequestUnsub = onValue(ref(db, `call_sessions/${activeCallId}/recovery_requests`), async snap => {
    const requests = snap.val() || {};
    for (const key of Object.keys(requests)) {
      const parts = key.split('__');
      if (parts.length !== 2) continue;
      const [from, to] = parts;
      if (to !== myUserId) continue;       // request मेरे लिए नहीं है
      if (from === myUserId) continue;     // खुद से नहीं
      if (myUserId >= from) continue;      // मैं initiator नहीं हूँ

      const pc = peerConnections[from];
      if (!pc) continue;

      const reqTs = requests[key]?.requestedAt || 0;
      if (pc._lastRestartRequest && pc._lastRestartRequest >= reqTs) continue;
      pc._lastRestartRequest = reqTs;

      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: applySDPBitrate(offer.sdp) }));
        const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${from}`;
        await set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
        console.log('[NetRecovery] ICE restart offer sent on request to', from);
      } catch(e) {
        console.warn('[NetRecovery] ICE restart on request failed:', e);
      }
    }
  });

  console.log('[NetRecovery] listeners active');
}

/**
 * 🆕 Actual reconnect attempt
 * - Dead media re-acquire
 * - Peer-wise: initiator → ICE restart, answerer → Firebase recovery request
 */
async function attemptNetworkRecovery() {
  if (!activeCallId || isHangingUp || !isCallConnected) return;

  // 🔄 रिकनेक्ट शुरू होते ही ओवरले स्क्रीन पर दिखाना
  const overlay = $('callReconnectingOverlay');
  if (overlay) overlay.hidden = false;

  networkRecoveryRetryCount++;
  if (networkRecoveryRetryCount > 5) {
    toast(currentLang === 'hi' ? '❌ नेटवर्क रिकनेक्ट नहीं हो पाया' : '❌ Network reconnect failed');
    networkRecoveryRetryCount = 0;
    if (overlay) overlay.hidden = true;
    return;
  }

  toast(currentLang === 'hi' ? `🔄 नेटवर्क रिकनेक्ट... (${networkRecoveryRetryCount}/5)` : `🔄 Reconnecting... (${networkRecoveryRetryCount}/5)`);
  console.log('[NetRecovery] attempt #' + networkRecoveryRetryCount);

  // ── Step 1: Dead media re-acquire ──
  if (localStream) {
    const audioTracks = localStream.getAudioTracks();
    const audioDead = audioTracks.length === 0 || audioTracks.every(t => t.readyState === 'ended');
    const videoTracks = localStream.getVideoTracks();
    const videoDead = !isAudioOnlyCall && (videoTracks.length === 0 || videoTracks.every(t => t.readyState === 'ended'));

    if (audioDead || videoDead) {
      try {
        console.log('[NetRecovery] re-acquiring dead media (audio:' + audioDead + ', video:' + videoDead + ')');
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: isAudioOnlyCall ? false : { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        // पुराने dead tracks हटाओ
        localStream.getTracks().forEach(t => {
  try { t.stop(); } catch(e) {}
  try { localStream.removeTrack(t); } catch(e2) {}   // 🆕 track accumulation रोकता है
});
fresh.getTracks().forEach(t => localStream.addTrack(t));
        localVideo.srcObject = localStream;
        localVideo.play().catch(()=>{});
      } catch(e) {
        console.warn('[NetRecovery] media re-acquire failed:', e);
      }
    }
  }

  // ── Step 2: Peer-wise recovery ──
  for (const pId of Object.keys(peerConnections)) {
    const pc = peerConnections[pId];
    if (!pc) continue;

    // Sender tracks को fresh से replace करो
    if (localStream) {
      for (const sender of pc.getSenders()) {
        if (!sender.track) continue;
        const fresh = localStream.getTracks().find(t => t.kind === sender.track.kind);
        if (fresh && fresh !== sender.track) {
          try { await sender.replaceTrack(fresh); } catch(e) {}
        }
      }
    }

    const iAmInitiator = myUserId < pId;

    if (iAmInitiator) {
      // मैं initiator → सीधे ICE restart offer भेजो
      try {
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(new RTCSessionDescription({ type: offer.type, sdp: applySDPBitrate(offer.sdp) }));
        const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${pId}`;
        await set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
        console.log('[NetRecovery] ICE restart offer sent to', pId);
        boostPeerBitrate(pc);
      } catch(e) {
        console.warn('[NetRecovery] ICE restart failed for', pId, e);
        // अगर PC dead है तो fallback: close करके peer फिर से connect करेगा
       if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
       try { pc.close(); } catch(e2) {}
       (pc._unsubs || []).forEach(fn => { try { fn(); } catch(e3) {} });   // 🆕
       delete peerConnections[pId];
        }
      }
    } else {
      // मैं answerer → initiator को recovery request भेजो
      try {
        await set(ref(db, `call_sessions/${activeCallId}/recovery_requests/${myUserId}__${pId}`), {
          requestedAt: Date.now(),
          from: myUserId
        });
        console.log('[NetRecovery] recovery request sent to', pId);
      } catch(e) {
        console.warn('[NetRecovery] recovery request failed:', e);
      }
    }
  }

  // रिकनेक्ट पूरा होने पर 4 सेकंड बाद ओवरले छिपाएं व 8 सेकंड बाद काउंटर रीसेट करें
  setTimeout(() => {
    const ov = $('callReconnectingOverlay');
    if (ov && isCallConnected) ov.hidden = true;
  }, 4000);

  setTimeout(() => { networkRecoveryRetryCount = 0; }, 8000);
}

/**
 * 🆕 Hangup के समय listeners cleanup
 */
function teardownCallNetworkRecovery() {
  if (networkOfflineHandler) {
    window.removeEventListener('offline', networkOfflineHandler);
    networkOfflineHandler = null;
  }
  if (networkOnlineHandler) {
    window.removeEventListener('online', networkOnlineHandler);
    networkOnlineHandler = null;
  }
  if (networkFirebaseConnectedUnsub) {
    networkFirebaseConnectedUnsub();
    networkFirebaseConnectedUnsub = null;
  }
  if (networkRecoveryRequestUnsub) {
    networkRecoveryRequestUnsub();
    networkRecoveryRequestUnsub = null;
  }
  networkRecoveryActive = false;
  networkRecoveryRetryCount = 0;
  networkWasOffline = false;
  const overlay = $('callReconnectingOverlay');
  if (overlay) overlay.hidden = true;
  console.log('[NetRecovery] listeners teardown');
}

/* ───────── 🟦 [SECTION 62: NETWORK RECOVERY] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 63: JOIN CALL SESSION (Main WebRTC Entry)] — START
   ═══════════════════════════════════════════════════════════════════════ */

async function joinCallSession() {
  CallAudioManager.stopAll();

  // Caller को answer signal भेजो
  if (!isCaller && activeCallId) {
    update(ref(db, `call_sessions/${activeCallId}`), { status: 'answered' }).catch(()=>{});
  }

  isCallConnected = true;
  callStartTime = Date.now();

  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = null;
  stopAllCallTones();

  // 👈 सभी अन्य स्क्रीन और डायलॉग्स को पूरी तरह छिपाएं
  if (lobbyScreen) { lobbyScreen.hidden = true; lobbyScreen.style.display = 'none'; }
  if (chatScreen) { chatScreen.hidden = true; chatScreen.style.display = 'none'; }
  if (incomingDialog) { incomingDialog.hidden = true; incomingDialog.style.display = 'none'; }
  if (outgoingDialog) { outgoingDialog.hidden = true; outgoingDialog.style.display = 'none'; }

  // 👈 ब्लैक स्क्रीन फिक्स: कॉल स्क्रीन और कंट्रोल बार को सीधे flex डिस्प्ले दें
  if (callScreen) {
    callScreen.hidden = false;
    callScreen.style.display = 'flex';
  }
  if (controlsBar) {
    controlsBar.classList.remove('fade-out');
  }
  if ($('callTopBar')) {$('callTopBar').classList.remove('fade-out');
  }

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

  // 🆕 NETWORK RECOVERY HOOK
  setupCallNetworkRecovery();

  // Foreground service (native)
  if (window.AndroidBridge && typeof window.AndroidBridge.startCallForegroundService === 'function') {
    window.AndroidBridge.startCallForegroundService(currentCallTargetName || 'उपयोगकर्ता', isAudioOnlyCall ? 'ऑडियो कॉल' : 'वीडियो कॉल');
  } else if (window.AndroidAudio && typeof window.AndroidAudio.startCallForegroundService === 'function') {
    window.AndroidAudio.startCallForegroundService(currentCallTargetName || 'उपयोगकर्ता', isAudioOnlyCall ? 'ऑडियो कॉल' : 'वीडियो कॉल');
  }

  // Fun mode listeners
  initKidsQuizListener();
  initRiddleGkListener();
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

  // Session status watch
  if (callSessionUnsub) callSessionUnsub();
  callSessionUnsub = onValue(ref(db, `call_sessions/${activeCallId}/status`), snap => {
    if (snap.val() === 'ended') {
      toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended');
      hangup(true);
    }
  });

  // Members live — हर new member के लिए peer connection
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

/* ───────── 🟦 [SECTION 63: JOIN CALL SESSION] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 64: PEER CONNECTION (WebRTC per Peer)] — START
   ═══════════════════════════════════════════════════════════════════════ */

function initiatePeerConnection(peerId, peerName) {
  const pc = new RTCPeerConnection(ICE_SERVERS);
  pc._unsubs = [];   // 🆕 per-peer Firebase listener registry
  peerConnections[peerId] = pc;

  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }
  if (isAudioOnlyCall && (!localStream || localStream.getVideoTracks().length === 0)) {
    try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch(e){}
  }
  boostPeerBitrate(pc);

  pc.ontrack = e => {
    const stream = e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track]);
    addRemoteVideoCell(peerId, stream, peerName);
    updateRemoteGridClass();
    if (isAudioOnlyCall && !speakerEnabled) {
      setTimeout(() => { setHardwareSpeaker(false); }, 300);
      setTimeout(() => { setHardwareSpeaker(false); }, 1000);
    }
  };

  const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${peerId}`;
  const peerPath = `call_sessions/${activeCallId}/signals/${peerId}__${myUserId}`;

  pc.onicecandidate = e => {
    if (e.candidate) push(ref(db, `${myPath}/candidates`), e.candidate.toJSON()).catch(()=>{});
  };
  pc.pendingIce = [];

  // 🆕 candidate listener — captured for cleanup
  const candUnsub = onChildAdded(ref(db, `${peerPath}/candidates`), async snap => {
    const c = snap.val();
    if (!c) return;
    const cand = new RTCIceCandidate(c);
    if (pc.remoteDescription) {
      try { await pc.addIceCandidate(cand); } catch(e){}
    } else {
      pc.pendingIce.push(cand);
    }
  });
  pc._unsubs.push(candUnsub);

  pc.flushIce = async () => {
    const p = pc.pendingIce || [];
    pc.pendingIce = [];
    for (const cand of p) {
      try { await pc.addIceCandidate(cand); } catch(e){}
    }
  };

  pc.oniceconnectionstatechange = () => {
    console.log(`[ICE-State] ${peerId}: ${pc.iceConnectionState}`);
    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
      setTimeout(() => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          console.log(`[Auto-ICE-Restart] Triggering for ${peerId}`);
          if (myUserId < peerId) {
            pc.createOffer({ iceRestart: true })
              .then(o => pc.setLocalDescription(new RTCSessionDescription({ type: o.type, sdp: applySDPBitrate(o.sdp) })))
              .then(() => set(ref(db, `${myPath}/offer`), {
                sdp: pc.localDescription.sdp,
                type: pc.localDescription.type
              }))
              .catch(e => console.warn('ICE restart offer failed:', e));
          } else {
            set(ref(db, `call_sessions/${activeCallId}/recovery_requests/${myUserId}__${peerId}`), {
              requestedAt: Date.now(),
              from: myUserId
            }).catch(e => console.warn('Recovery request failed:', e));
          }
        }
      }, 2000);
    }
  };

  if (myUserId < peerId) {
    pc.createOffer()
      .then(o => pc.setLocalDescription(new RTCSessionDescription({ type: o.type, sdp: applySDPBitrate(o.sdp) })))
      .then(() => set(ref(db, `${myPath}/offer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type }))
      .catch(err => console.error("Offer error:", err));

    // 🆕 answer listener — captured for cleanup
    const ansUnsub = onValue(ref(db, `${peerPath}/answer`), snap => {
      const a = snap.val();
      if (a && (!pc.currentRemoteDescription || pc.currentRemoteDescription.sdp !== a.sdp)) {
        pc.setRemoteDescription(new RTCSessionDescription(a))
          .then(async () => {
            await pc.flushIce();
            boostPeerBitrate(pc);
          })
          .catch(err => console.error("SetRemote Answer error:", err));
      }
    });
    pc._unsubs.push(ansUnsub);
  } else {
    // 🆕 offer listener — captured for cleanup
    const offUnsub = onValue(ref(db, `${peerPath}/offer`), async snap => {
      const o = snap.val();
      if (o && (!pc.currentRemoteDescription || pc.currentRemoteDescription.sdp !== o.sdp)) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(o));
          await pc.flushIce();
          const a = await pc.createAnswer();
          await pc.setLocalDescription(new RTCSessionDescription({ type: a.type, sdp: applySDPBitrate(a.sdp) }));
          set(ref(db, `${myPath}/answer`), { sdp: pc.localDescription.sdp, type: pc.localDescription.type });
          boostPeerBitrate(pc);
        } catch(err) {
          console.error("Answer create error:", err);
        }
      }
    });
    pc._unsubs.push(offUnsub);
  }
}

/* ───────── 🟦 [SECTION 64: PEER CONNECTION] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 65: REMOTE VIDEO CELL & PEER UI] — START
   ═══════════════════════════════════════════════════════════════════════ */

function addRemoteVideoCell(id, stream, peerName) {
  let cell = $(`remote_cell_${id}`);
  if (!cell) {
    cell = document.createElement('div');
    cell.id = `remote_cell_${id}`;
    cell.className = 'remote-cell';
    cell.innerHTML = `
      <video autoplay playsinline webkit-playsinline></video>
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
  v.playsInline = true;
  v.autoplay = true;

  // 👈 ऑटोप्ले पॉलिसी फिक्स: अगर ब्राउज़र वीडियो रोके, तो तुरंत म्यूट करके वीडियो चालू करें (प्ले बटन नहीं दिखेगा)
  const playPromise = v.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      v.muted = true;
      v.play().catch(()=>{});
      
      // स्क्रीन पर टच होते ही आवाज (Audio) स्वतः चालू हो जाएगी
      const unmute = () => {
        v.muted = false;
        v.play().catch(()=>{});
        window.removeEventListener('pointerdown', unmute);
      };
      window.addEventListener('pointerdown', unmute, { once: true });
    });
  }
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
  if (peerConnections[id]) {
    // 🆕 Firebase listeners cleanup (memory leak रोकता है)
    (peerConnections[id]._unsubs || []).forEach(fn => { try { fn(); } catch(e) {} });
    peerConnections[id]._unsubs = [];
    try { peerConnections[id].close(); } catch(e) {}
    delete peerConnections[id];
  }
  removeRemoteVideoCell(id);
  updateRemoteGridClass();
}

/* ───────── 🟦 [SECTION 65: REMOTE PEER UI] — END ───────── */

/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 66: ADD PARTICIPANT MODAL] — START
   📌 क्या: चालू call में नया user जोड़ना (4 तक)
   🔗 कहाँ से: btnAddPerson (call screen)
   ⚠️ डिपेंड: allOnlineUsers, MAX_CALL_MEMBERS, Firebase
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 66: ADD PARTICIPANT] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 67: PiP SWAP GESTURES] — START
   📌 क्या: local PiP को swipe-away करना, tap पर swap, restore button
   🔗 कहाँ से: pipWrap (touch events), pipRestoreBtn, remoteGrid click
   ⚠️ डिपेंड: callScreen CSS class .video-swapped
   🎯 Local ↔ Remote video swap, swipe left = hide PiP
   ═══════════════════════════════════════════════════════════════════════ */

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
    // Swipe right — hide PiP
    e.stopPropagation();
    pipWrap.classList.add('pip-hidden');
    pipRestoreBtn.hidden = false;
    scheduleAutoHide();
  } else if (!pipMoved) {
    // Tap — swap local/remote
    e.stopPropagation();
    callScreen.classList.toggle('video-swapped');
    toast(callScreen.classList.contains('video-swapped')
      ? (currentLang === 'hi' ? '🔄 आपकी वीडियो बड़ी स्क्रीन पर' : '🔄 Your video Fullscreen')
      : (currentLang === 'hi' ? '🔄 सामान्य व्यू' : '🔄 Normal View'));
    scheduleAutoHide();
  }
});

// Remote area tap = swap back
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

/* ───────── 🟦 [SECTION 67: PiP SWAP] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 68: AUTO-HIDE CONTROLS] — START
   📌 क्या: 3.5s inactivity के बाद controlsBar और callTopBar hide
   🔗 कहाँ से: call screen interactions
   ⚠️ डिपेंड: fun-mode open states (quiz, whiteboard, ttt, riddle), controlsBar
   🎯 अगर कोई game खुला है तो hide नहीं
   ═══════════════════════════════════════════════════════════════════════ */

function scheduleAutoHide() {
  clearTimeout(autoHideTimer);
  autoHideTimer = setTimeout(() => {
    const isTttOpen = $('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden;
    const isRiddleOpen = $('kidsRiddleBox') && !$('kidsRiddleBox').hidden;
    if (isCallConnected && $('kidsQuizBox').hidden && $('kidsWhiteboardModal').hidden && $('funModeTray').hidden && !isTttOpen && !isRiddleOpen) {
      controlsBar.classList.add('fade-out');
      $('callTopBar').classList.add('fade-out');
    }
  }, 3500);
}

// Call screen tap = toggle controls
callScreen.addEventListener('click', e => {
  if (e.target.closest('.ctl-box') || e.target.closest('.modal-box') || e.target.closest('#pipWrap') || e.target.closest('#pipRestoreBtn') || e.target.closest('#kidsQuizBox') || e.target.closest('#kidsWhiteboardModal') || e.target.closest('#callTopBar') || e.target.closest('#funModeTray') || e.target.closest('#kidsTictactoeBox') || e.target.closest('#kidsRiddleBox')) return;
  const isH = controlsBar.classList.contains('fade-out');
  controlsBar.classList.toggle('fade-out', !isH);
  $('callTopBar').classList.toggle('fade-out', !isH);
  if (isH) scheduleAutoHide();
});

/* ───────── 🟦 [SECTION 68: AUTO-HIDE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 69: CALL CONTROLS (Mic/Cam/Speaker/Flip/Hang)] — START
   📌 क्या: mic toggle, cam toggle, speaker toggle, camera flip,
           hang button
   🔗 कहाँ से: call screen control bar
   ⚠️ डिपेंड: localStream, peerConnections, hardware bridge
   🎯 सभी controls Firebase में sync (camEnabled, micEnabled)
   ═══════════════════════════════════════════════════════════════════════ */

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

// Camera flip (front ↔ back)
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

// Hang button
$('hangBtn').onclick = (e) => {
  e.stopPropagation();
  e.preventDefault();
  if (isHangingUp) return;
  isHangingUp = true;
  hangup();
};

/* ───────── 🟦 [SECTION 69: CALL CONTROLS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 70: HANGUP (Full Cleanup)] — START
   ═══════════════════════════════════════════════════════════════════════ */

async function hangup(silent = false) {
  // 🆕 Cleanup से पहले ज़रूरी values capture कर लो
  let actualDuration = '00:01';
  if (callStartTime > 0 && isCallConnected) {
    const elapsedSec = Math.max(1, Math.floor((Date.now() - callStartTime) / 1000));
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const ss = String(elapsedSec % 60).padStart(2, '0');
    actualDuration = `${mm}:${ss}`;
  }

  const callIdToCleanup = activeCallId;
  const targetIdToLog = currentCallTargetId;
  const targetNameToLog = currentCallTargetName || 'उपयोगकर्ता';
  const wasConnected = isCallConnected;
  const wasCaller = isCaller;
  const wasAudioOnly = isAudioOnlyCall;

  try {
    clearOngoingCallNotification();

    if (isCallConnected && !silent) {
      CallAudioManager.playEnd();
    } else {
      CallAudioManager.stopAll();
    }

    teardownCallNetworkRecovery();
    stopTimer();
    releaseWakeLock();
    clearTimeout(autoHideTimer);
    clearTimeout(callTimeoutTimer);
    callTimeoutTimer = null;
    stopNetworkQualityMonitor();
    cleanupKidsModules();
    resetHardwareAudio();

    // Native foreground service stop
    if (window.AndroidBridge && typeof window.AndroidBridge.stopCallForegroundService === 'function') {
      window.AndroidBridge.stopCallForegroundService();
    } else if (window.AndroidAudio && typeof window.AndroidAudio.stopCallForegroundService === 'function') {
      window.AndroidAudio.stopCallForegroundService();
    }

    // ✅ सबसे पहले local cleanup (UI + media) — ताकि screen तुरंत बंद हो
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

    // UI reset
    callScreen.classList.remove('video-swapped');
    controlsBar.classList.remove('fade-out');
    $('callTopBar').classList.remove('fade-out');
    pipWrap.classList.remove('pip-hidden');
    pipRestoreBtn.hidden = true;
    pipWrap.style.opacity = '1';
    $('camBtn').classList.remove('off');
    $('micBtn').classList.remove('off');
    $('speakerBtn').classList.remove('off');
    if ($('voiceCallArea')) $('voiceCallArea').hidden = true;
    remoteGrid.style.display = 'grid';
    pipWrap.style.display = 'block';

    const overlay = $('callReconnectingOverlay');
    if (overlay) overlay.hidden = true;
    if ($('ongoingCallBanner')) $('ongoingCallBanner').hidden = true;

    const wasLocked = isDeviceLocked();

// 🆕 helper — hidden + inline display दोनों reset (inline display [hidden] को override करता है)
const hideScreen = (el) => {
  if (!el) return;
  el.hidden = true;
  el.style.display = 'none';
};
const showScreen = (el, displayValue = '') => {
  if (!el) return;
  el.hidden = false;
  el.style.display = displayValue;
};

hideScreen(callScreen);
hideScreen(incomingDialog);
hideScreen(outgoingDialog);

if (!wasLocked) {
  if (currentChatTargetId) {
    hideScreen(lobbyScreen);
    showScreen(chatScreen, 'flex');
  } else {
    hideScreen(chatScreen);
    showScreen(lobbyScreen, '');   // lobby अपनी default CSS ले
  }
} else {
  hideScreen(chatScreen);
  hideScreen(lobbyScreen);
}
    isHangingUp = false;
    closeIfLocked();
  } catch(err) {
    console.warn("Hangup warning:", err);
  }

  // 🆕 Firebase operations अब fire-and-forget — UI बंद होने के बाद background में
  if (wasConnected && targetIdToLog) {
    recordCallLog({
      callId: callIdToCleanup || `call_${Date.now()}`,
      targetId: targetIdToLog,
      name: targetNameToLog,
      type: wasCaller ? 'outgoing' : 'incoming',
      callMode: wasAudioOnly ? 'audio' : 'video',
      duration: actualDuration,
      time: Date.now()
    });
  }

 if (callIdToCleanup) {
  update(ref(db, `users/${myUserId}`), { activeCallId: null }).catch(()=>{});
  update(ref(db, `call_sessions/${callIdToCleanup}`), { status: 'ended' }).catch(()=>{});
  remove(ref(db, `call_sessions/${callIdToCleanup}/members/${myUserId}`)).catch(()=>{});
  remove(ref(db, `call_sessions/${callIdToCleanup}/recovery_requests`)).catch(()=>{});
}
remove(ref(db, `user_inbox/${myUserId}`)).catch(()=>{});

   // 🆕 अगर मैं caller हूँ और कॉल connect नहीं हुई — receiver को cancel signal भेजो
// (timeout, manually cancel, या कोई भी disconnect जहाँ मैंने उठाया नहीं)
if (wasCaller && !wasConnected && targetIdToLog) {
  update(ref(db, `user_inbox/${targetIdToLog}`), { status: 'cancelled' }).catch(()=>{});
  // थोड़ी देर बाद receiver की inbox clear कर दो
  setTimeout(() => {
    remove(ref(db, `user_inbox/${targetIdToLog}`)).catch(()=>{});
  }, 3000);
}
}

/* ───────── 🟦 [SECTION 70: HANGUP] — END ───────── */



/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 71: CALL MINIMIZE, TIMER & WAKE LOCK] — START
   ═══════════════════════════════════════════════════════════════════════ */

function minimizeCallScreen() {
  if (!isCallConnected || callScreen.hidden) return;

  callScreen.hidden = true;
  callScreen.style.display = 'none';

  // अगर पहले से किसी चैट में थे तो चैट स्क्रीन दिखाएं, नहीं तो लॉबी स्क्रीन
  if (currentChatTargetId) {
    chatScreen.hidden = false;
    chatScreen.style.display = 'flex';
    lobbyScreen.hidden = true;
    lobbyScreen.style.display = 'none';
  } else {
    lobbyScreen.hidden = false;
    lobbyScreen.style.display = '';
    chatScreen.hidden = true;
    chatScreen.style.display = 'none';
  }

  showOngoingCallBanner();
  toast(currentLang === 'hi' ? '📞 कॉल बैकग्राउंड में जारी है' : '📞 Call running in background');
}

function restoreCallScreen() {
  if (!isCallConnected) return;

  hideOngoingCallBanner();
  if (lobbyScreen) { lobbyScreen.hidden = true; lobbyScreen.style.display = 'none'; }
  if (chatScreen) { chatScreen.hidden = true; chatScreen.style.display = 'none'; }
  
  callScreen.hidden = false;
  callScreen.style.display = '';

  controlsBar.classList.remove('fade-out');
  const topBar = $('callTopBar');
  if (topBar) topBar.classList.remove('fade-out');
  scheduleAutoHide();
}

function showOngoingCallBanner() {
  const banner = $('ongoingCallBanner');
  if (!banner) return;
  banner.hidden = false;
  banner.style.display = 'flex';
  banner.onclick = restoreCallScreen;
}

function hideOngoingCallBanner() {
  const banner = $('ongoingCallBanner');
  if (banner) {
    banner.hidden = true;
    banner.style.display = 'none';
  }
}

function startTimer() {
  callStartTime = Date.now();
  if (timerTimer) clearInterval(timerTimer);
  timerTimer = setInterval(() => {
    const diff = Math.floor((Date.now() - callStartTime) / 1000);
    const timeStr = `${String(Math.floor(diff/60)).padStart(2,'0')}:${String(diff%60).padStart(2,'0')}`;
    $('callTimer').textContent = timeStr;
    const miniTimer = $('ongoingCallTimer');
    if (miniTimer) miniTimer.textContent = timeStr;
  }, 1000);
}

function stopTimer() {
  if (timerTimer) { clearInterval(timerTimer); timerTimer = null; }
  $('callTimer').textContent = '00:00';
  const miniTimer = $('ongoingCallTimer');
  if (miniTimer) miniTimer.textContent = '00:00';
}

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; } }

/* ───────── 🟦 [SECTION 71: TIMER + WAKE LOCK] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 72: HARDWARE BACK BUTTON HANDLER] — START
   📌 क्या: Android hardware back button layered close
   🆕 Web popstate में chat screen handling जोड़ी — अब chat पर बैक = lobby
   🆕 Native backButton में lock-screen prompt जोड़ा (web जैसा)
   ═══════════════════════════════════════════════════════════════════════ */

let backPressedOnce = false;

function setupHardwareBackButton() {
  // 1️⃣ Web back (popstate) — layered close
  window.addEventListener('popstate', (e) => {
    history.pushState(null, '', window.location.href);

    if (Date.now() < ignoreBackUntil) return;

    // 1. Open modals
    const openModals = [$('adminPanelModal'), $('adminPinModal'), $('profileModal'), $('addParticipantModal'), $('permNoticeModal'), $('phoneContactsModal')];
    for (const m of openModals) {
      if (m && !m.hidden && m.style.display !== 'none') {
        m.hidden = true;
        m.style.display = 'none';
        return;
      }
    }

    // 2. Sub-menu aur viewers
    if ($('msgLongPressMenu')) { closeMessageMenu(); return; }
    if ($('mediaViewer') && !$('mediaViewer').hidden) { $('closeMediaViewerBtn').click(); return; }
    if ($('attachMenu') && !$('attachMenu').hidden) { $('attachMenu').hidden = true; return; }

    // 3. Games aur drawing
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); return; }
    if ($('kidsRiddleBox') && !$('kidsRiddleBox').hidden) { closeRiddleGame(); return; }
    if (!$('funModeTray').hidden) { $('funModeTray').hidden = true; return; }
    if (!$('kidsWhiteboardModal').hidden) {
      $('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      return;
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); return; }

    // 4. Voice recording aur reply
    if (!voiceDock.hidden) { discardRecording(); return; }
    if ($('replyPreviewBox')) { cancelReply(); return; }

    // 5. Call screen — lock check पहले, फिर minimize
    if (!callScreen.hidden && callScreen.style.display !== 'none') {
      if (isDeviceLocked()) {
        toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
        requestDeviceUnlock();
        return;
      }
      minimizeCallScreen();
      return;
    }

    // 6. 🆕 Chat screen — lock check, फिर closeChat() → lobby
    const isChatOpen = (!chatScreen.hidden && chatScreen.style.display !== 'none') || currentChatTargetId !== null;
    if (isChatOpen) {
      if (isDeviceLocked()) {
        toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
        requestDeviceUnlock();
        return;
      }
      closeChat();
      return;
    }

    // 7. Calling dialogs
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); return; }

    // 8. Lobby — lock check, फिर double-back exit
    if (isDeviceLocked()) {
      toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
      requestDeviceUnlock();
      return;
    }

    if (backPressedOnce) {
      window.history.go(-2);
    } else {
      backPressedOnce = true;
      toast(currentLang === 'hi' ? 'बाहर निकलने के लिए दोबारा बैक दबाएँ' : 'Press back again to exit');
      setTimeout(() => { backPressedOnce = false; }, 2000);
    }
  });

  history.pushState(null, '', window.location.href);

  // 2️⃣ Native back button (Capacitor App plugin)
  const appPlugin = getAppPlugin();
  if (!isNativeApp() || !appPlugin) return;

  appPlugin.addListener('backButton', () => {
    if (Date.now() < ignoreBackUntil) return;

    // 1. Open modals
    const openModals = [$('adminPanelModal'), $('adminPinModal'), $('profileModal'), $('addParticipantModal'), $('permNoticeModal'), $('phoneContactsModal')];
    for (const m of openModals) {
      if (m && !m.hidden && m.style.display !== 'none') {
        m.hidden = true;
        m.style.display = 'none';
        return;
      }
    }

    // 2. Sub-menu aur viewers
    if ($('msgLongPressMenu')) { closeMessageMenu(); return; }
    if ($('mediaViewer') && !$('mediaViewer').hidden) { $('closeMediaViewerBtn').click(); return; }
    if ($('attachMenu') && !$('attachMenu').hidden) { $('attachMenu').hidden = true; return; }

    // 3. Games
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); return; }
    if ($('kidsRiddleBox') && !$('kidsRiddleBox').hidden) { closeRiddleGame(); return; }
    if (!$('funModeTray').hidden) { $('funModeTray').hidden = true; return; }
    if (!$('kidsWhiteboardModal').hidden) {
      $('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      return;
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); return; }

    // 4. Voice recording aur reply
    if (!voiceDock.hidden) { discardRecording(); return; }
    if ($('replyPreviewBox')) { cancelReply(); return; }

    // 5. 🆕 Call screen — lock check पहले, फिर minimize
    if (!callScreen.hidden && callScreen.style.display !== 'none') {
      if (isDeviceLocked()) {
        toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
        requestDeviceUnlock();
        return;
      }
      minimizeCallScreen();
      return;
    }

    // 6. 🆕 Chat screen — lock check, फिर closeChat() → lobby
    const isChatOpen = (!chatScreen.hidden && chatScreen.style.display !== 'none') || currentChatTargetId !== null;
    if (isChatOpen) {
      if (isDeviceLocked()) {
        toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
        requestDeviceUnlock();
        return;
      }
      closeChat();
      return;
    }

    // 7. Calling dialogs
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); return; }

    // 8. 🆕 Lobby — lock check, फिर double-back exit
    if (isDeviceLocked()) {
      toast(currentLang === 'hi' ? '🔒 कृपया फोन अनलॉक करें' : '🔒 Please unlock your phone');
      requestDeviceUnlock();
      return;
    }

    if (backPressedOnce) {
      getAppPlugin().exitApp();
    } else {
      backPressedOnce = true;
      toast(currentLang === 'hi' ? 'बाहर निकलने के लिए दोबारा बैक दबाएँ' : 'Press back again to exit');
      setTimeout(() => { backPressedOnce = false; }, 2000);
    }
  });
}

/* ───────── 🟦 [SECTION 72: HARDWARE BACK] — END ───────── */




/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 73: STRICT VIEWPORT LOCK (Chat Keyboard Fix)] — START
   📌 क्या: चैट में कीबोर्ड खुलने पर visualViewport को पकड़कर chat screen
           की height lock करना — ताकि पूरा screen pan न हो
   🔗 कहाँ से: chatScreen hidden toggle, chatInput focus/blur,
               visualViewport resize/scroll
   ⚠️ डिपेंड: window.visualViewport (mobile), chatScreen, chatInput
   🎯 Header/footer पर touchmove block, chatBody auto-scroll
   ═══════════════════════════════════════════════════════════════════════ */

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

// Visual viewport listeners
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

// Chat screen खुलने/बंद होने पर auto-sync height
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

// Header/footer पर finger slide = block (panning रोकना)
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

// Input focus = keyboard adjust
chatInput.addEventListener('focus', () => {
  setTimeout(() => {
    lockChatViewportHeight();
    const body = $('chatBody');
    if (body) body.scrollTop = body.scrollHeight;
  }, 150);
});

// Input blur = keyboard बंद
chatInput.addEventListener('blur', () => {
  setTimeout(() => {
    if (!chatScreen.hidden) {
      lockChatViewportHeight();
    } else {
      resetChatViewportHeight();
    }
  }, 100);
});

/* ───────── 🟦 [SECTION 73: VIEWPORT LOCK] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 74: OTA UPDATE (Web JS/CSS Caching)] — START
   📌 क्या: server पर naya version आने पर OTA cached JS/CSS download
           करके localStorage में save
   🔗 कहाँ से: checkUpdateBtn (manual), initApp (auto after 3s)
   ⚠️ डिपेंड: CURRENT_APP_VERSION, ota-version.json endpoint
   🎯 Auto = silent, Manual = user को restart prompt
   ═══════════════════════════════════════════════════════════════════════ */

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

// Manual OTA trigger (profile modal से)
$('checkUpdateBtn').onclick = () => {$('profileModal').hidden = true;
  checkWebOtaUpdate(true);
};

/* ───────── 🟦 [SECTION 74: OTA UPDATE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 75: DEEP LINKS (URL + Notification + Native)] — START
   📌 क्या: किसी URL, notification या native intent से app खुलने पर
           सही screen पर पहुँचाना — chat open या direct call accept
   🔗 कहाँ से: initApp() → handleDeepLinks()
   ⚠️ डिपेंड: openChat, handleDirectAcceptCall, getAppPlugin
   🎯 3 sources:
       1. Service Worker messages (browser notification click)
       2. URL query params (?chatTargetId=..., ?acceptCallId=...)
       3. Capacitor appUrlOpen (native deep link)
   ═══════════════════════════════════════════════════════════════════════ */

function handleDeepLinks() {
  try {
    // 1️⃣ Service Worker messages
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

    // 2️⃣ URL query params
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

    // 3️⃣ Native deep links (Capacitor)
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

      // App foreground में आने पर launch intent फिर check
      appPlugin.addListener('appStateChange', (state) => {
        if (state.isActive) checkNativeLaunchIntent();
      });
    }
  } catch (e) {
    console.warn('Deep link error:', e);
  }
}

/* ───────── 🟦 [SECTION 75: DEEP LINKS] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 76: APP INITIALIZATION (Boot Flow)] — START
   📌 क्या: पूरी app का main entry point। Language, theme, back button,
           push, user check, deep links, native intent, splash, OTA
   🔗 कहाँ से: DOM ready पर auto-run (नीचे readyState check)
   ⚠️ डिपेंड: applyLanguage, applyTheme, setupHardwareBackButton,
              setupNativePushListeners, checkUser, handleDeepLinks,
              checkNativeLaunchIntent, hideSplashScreen, checkWebOtaUpdate
   🎯 Splash 4s max, OTA check 3s delay पर auto
   ═══════════════════════════════════════════════════════════════════════ */

async function initApp() {
  try {
    applyLanguage(currentLang);
    applyTheme(currentTheme);
    setupHardwareBackButton();
    setupNativePushListeners();
    // 🆕 checkUser को await किया ताकि launch intent detection पूरी होने के बाद ही आगे बढ़े
    await checkUser();
    handleDeepLinks();
    checkNativeLaunchIntent();
  } catch (err) {
    console.error('UI init error:', err);
    hideSplashScreen();
  }

  setTimeout(() => { hideSplashScreen(); }, 4000);
  setTimeout(() => checkWebOtaUpdate(false), 3000);
}

// DOM ready होने पर initApp call
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}

/* ───────── 🟦 [SECTION 76: APP INITIALIZATION] — END ───────── */

/* ═══ यहाँ BATCH 3B खत्म होता है ═══ */
/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 77: FUN MODE TRAY OPEN/CLOSE] — START
   📌 क्या: call के दौरान fun-mode tray खोलना/बंद करना (games का hub)
   🔗 कहाँ से: funModeBtn, closeFunTrayBtn, tray backdrop
   ⚠️ डिपेंड: isCallConnected, controlsBar
   🎯 Call connect नहीं है तो toast
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 77: FUN MODE TRAY] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 78: KIDS QUIZ GAME] — START
   📌 क्या: LKG/UKG quiz — random सवाल, options, 15s timer,
           Firebase sync (दोनों तरफ same question दिखे)
   🔗 कहाँ से: btnKidsQuiz, nextQuizBtn, quizCategorySelect
   ⚠️ डिपेंड: questions.json (external), playCheerSound/playOopsSound
   🎯 Firebase: call_sessions/{id}/quiz_state
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 78: KIDS QUIZ] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 79: RIDDLE & GK GAME] — START
   📌 क्या: Riddles/GK — easy mode (MCQ, 20s timer) + hard mode
           (buzzer + parent eval), score 10 तक
   🔗 कहाँ से: trayBtnRiddleGk, riddle controls
   ⚠️ डिपेंड: riddle.json (external) + fallback defaults
   🎯 Firebase: call_sessions/{id}/riddle_state
   ═══════════════════════════════════════════════════════════════════════ */

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

    // 10 सवाल हो गए → reset
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

    // कौन parent है — admin या caller
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

/* ───────── 🟦 [SECTION 79: RIDDLE & GK] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 80: WHITEBOARD (Live Canvas)] — START
   📌 क्या: live whiteboard — दोनों users साथ में draw कर सकें
   🔗 कहाँ से: btnWhiteboard, tray, canvas tools (color/eraser/size/grid/clear)
   ⚠️ डिपेंड: Firebase canvas_draw path, whiteboard_state path
   🎯 Pointer events से point broadcast, दूसरी तरफ से draw replicate
   ═══════════════════════════════════════════════════════════════════════ */

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

// Whiteboard tools
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

/* ───────── 🟦 [SECTION 80: WHITEBOARD] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 81: TIC-TAC-TOE GAME] — START
   📌 क्या: zero-kaata (X vs O) game — turn based, win detection, reset
   🔗 कहाँ से: trayBtnTictactoe
   ⚠️ डिपेंड: Firebase tictactoe_state
   🎯 DOM dynamic create (ensureTictactoeDOM), per-cell click, win pattern highlight
   ═══════════════════════════════════════════════════════════════════════ */

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

/* ───────── 🟦 [SECTION 81: TIC-TAC-TOE] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 82: CLEANUP KIDS MODULES (Base)] — START
   📌 क्या: hangup पर सभी games (quiz/riddle/whiteboard/ttt) cleanup —
           listeners unsub + UI hide + canvas clear
   🔗 कहाँ से: hangup() (Section 70)
   ⚠️ डिपेंड: quizSessionUnsub, riddleSessionUnsub, canvasSessionUnsub,
              whiteboardSyncUnsub, tttSessionUnsub
   🎯 Ludo का cleanup बाद में override pattern से जोड़ा जाएगा
   ═══════════════════════════════════════════════════════════════════════ */

function cleanupKidsModules() {
  stopQuizTimerBar();
  stopRiddleTimerBar();
  if (quizSessionUnsub) { quizSessionUnsub(); quizSessionUnsub = null; }
  if (riddleSessionUnsub) { riddleSessionUnsub(); riddleSessionUnsub = null; }
  if (canvasSessionUnsub) { canvasSessionUnsub(); canvasSessionUnsub = null; }
  if (whiteboardSyncUnsub) { whiteboardSyncUnsub(); whiteboardSyncUnsub = null; }
  if (tttSessionUnsub) { tttSessionUnsub(); tttSessionUnsub = null; }

  const box = $('kidsQuizBox'); if (box) box.hidden = true;
  const rBox = $('kidsRiddleBox'); if (rBox) rBox.hidden = true;
  const wb = $('kidsWhiteboardModal'); if (wb) wb.hidden = true;
  const ttt = $('kidsTictactoeBox'); if (ttt) ttt.hidden = true;
  if ($('funModeTray'))$('funModeTray').hidden = true;
  if (ctx && canvasEl) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
}

/* ───────── 🟦 [SECTION 82: CLEANUP KIDS MODULES] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 83: LUDO GAME MODULE] — START
   📌 क्या: पूरा Ludo board game — 2 player (r/y), tokens, dice,
           capture, home, auto-move, remote animation
   🔗 कहाँ से: trayBtnLudo, ludoRollBtn, ludoResetBtn, closeLudoBtn
   ⚠️ डिपेंड: Firebase ludo_state, playCheerSound/playOopsSound/playMessageTickSound
   🎯 Auto video-off + speaker-on जब game खुले
   ═══════════════════════════════════════════════════════════════════════ */

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

// --- Auto-Move Logic ---
function maybeLudoAutoMove() {
  if (!ludoState || ludoState.turn !== ludoMyColor || ludoState.phase !== 'move' || ludoAnimating || ludoState.gameOver) return;
  const roll = ludoState.dice;
  if (!roll) return;

  const opts = [];
  for (let i=0; i<4; i++) {
    if (ludoCanMove(ludoMyColor, i, roll)) opts.push(i);
  }

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
    }, 350);
  }
}

// --- Sync & Initialization ---
async function startOrToggleLudo() {
  if (!activeCallId || !isCallConnected) {
    if(typeof toast === 'function') toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही लूडो खेलें' : 'Connect call to play');
    return;
  }

  // दोनों का वीडियो ऑफ + लाउडस्पीकर चालू
  if (localStream) localStream.getVideoTracks().forEach(t => t.enabled = false);
  if (typeof camEnabled !== 'undefined') camEnabled = false;
  if (typeof updateCallModeVisuals === 'function') updateCallModeVisuals(true);

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

  maybeLudoAutoMove();
}

// --- Gameplay Actions ---
async function ludoRollDice() {
  if (!ludoState || ludoState.turn !== ludoMyColor || ludoState.phase !== 'roll' || ludoState.gameOver || ludoAnimating) return;

  ludoState.phase = 'locked';

  const rollBtn = $('ludoRollBtn');
  if (rollBtn) { rollBtn.disabled = true; }

  if (typeof playMessageTickSound === 'function') playMessageTickSound();

  const diceBox = $('ludoDiceBox');
  if (diceBox) {
    diceBox.classList.add('rolling');
    setTimeout(() => diceBox.classList.remove('rolling'), 550);
  }

  const roll = 1 + Math.floor(Math.random() * 6);
  const newSixes = roll === 6 ? (ludoState.consecutiveSixes + 1) : 0;

  // लगातार 3 छक्के = turn forfeit
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

  // Yard से बाहर आने पर पहला step
  if (currentRel === -1) {
    ludoVisualTokens[ludoMyColor][tokenIdx] = 0;
    renderLudoTokens();
    await new Promise(r => setTimeout(r, 300));
  } else {
    // Step-by-step animation
    for (let r = currentRel + 1; r <= finalRel; r++) {
      ludoVisualTokens[ludoMyColor][tokenIdx] = r;
      renderLudoTokens();
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const newTokens = { r: ludoNormalizeTokens(ludoState.tokens.r), y: ludoNormalizeTokens(ludoState.tokens.y) };
  newTokens[ludoMyColor][tokenIdx] = finalRel;
  let captured = 0;

  // Capture check (safe cells पर capture नहीं होगा)
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

/* ───────── 🟦 [SECTION 83: LUDO GAME] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 84: FINAL OVERRIDES (Ludo Hooks into Cleanup & Join)] — START
   📌 क्या: Ludo module के लिए cleanup और join hooks — bina base functions
           को modify किए, override pattern से जोड़ना
   🔗 कहाँ से: Module load time (initApp से पहले)
   ⚠️ डिपेंड: cleanupKidsModules (Section 82), joinCallSession (Section 63)
   🎯 दोनों function declarations हैं — reassignment काम करता है
   ═══════════════════════════════════════════════════════════════════════ */

// cleanupKidsModules को wrap करो — Ludo का cleanup भी जोड़ो
const originalLudoCleanup = typeof cleanupKidsModules === 'function' ? cleanupKidsModules : null;
cleanupKidsModules = function() {
  if (originalLudoCleanup) originalLudoCleanup();
  if (ludoSessionUnsub) { ludoSessionUnsub(); ludoSessionUnsub = null; }
  const lBox = $('kidsLudoBox');
  if (lBox) lBox.hidden = true;
};

// joinCallSession को wrap करो — Ludo session listener भी जोड़ो
const originalJoinCallSession = typeof joinCallSession === 'function' ? joinCallSession : null;
joinCallSession = async function() {
  if (originalJoinCallSession) await originalJoinCallSession();
  listenLudoSession();
};

/* ───────── 🟦 [SECTION 84: FINAL OVERRIDES] — END ───────── */


/* ═══════════════════════════════════════════════════════════════════════
   🟦 [SECTION 85: FILE END MARKER]
   ═══════════════════════════════════════════════════════════════════════ */
// ✅ app.js v1.25.1 — ALL SECTIONS COMPLETE
// 📋 Structure recap:
//   1A: Config / Firebase / DOM / Translations / State
//   1B: Permissions / Push / Sounds / Admin PIN (Firebase) / Presence
//   2A: Long-press / Reactions / Chat Engine / Ticks
//   2B: Media / P2P Transfer / Voice Dock / Location / VCF
//   3A: Call Engine / WebRTC / Controls / NETWORK RECOVERY
//   3B: Hardware Back / Viewport Lock / OTA / Deep Links / Init
//   4:  Fun Mode + Quiz + Riddle + Whiteboard + TicTacToe + Ludo
/* ═══════════════════════════════════════════════════════════════════════ */
