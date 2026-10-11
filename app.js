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
    netOnline: "हाई", netMedium: "मीडियम"
  },
  en: {
    pageTitle: "VideoCallApp", welcome: "Welcome!", enterName: "Enter your name to start calling and chatting",
    btnProceed: "Continue", chkUpdate: "🔄 Check New Update (OTA)", settingsTitle: "⚙️ Settings & Profile",
    btnChangeName: "✏️ Change / Update Name", btnRecheckPerm: "🛡️ Recheck Permissions", btnClearChat: "🗑️ Clear All Chats",
    btnResetProfile: "Delete / Reset ID", btnCancel: "✕ Cancel", searchPlaceholder: "Search contacts or chats...",
    tabChats: "💬 Chats", tabCalls: "📞 Calls", inputPlaceholder: "Type a message...", incomingSub: "Tap to answer the call",
    reject: "Decline", accept: "Answer", cancelCall: "Cancel", mic: "Mic", cam: "Camera", speaker: "Speaker", flip: "Flip",
    hang: "End", online: "Online", offline: "Offline", typing: "typing...",
    netOnline: "High", netMedium: "Medium"
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('vc_lang', lang);
  $('langSelect').value = lang;
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
$('langSelect').onchange = (e) => applyLanguage(e.target.value);

let myUserId = localStorage.getItem('vc_user_id') || '';
let myUserName = localStorage.getItem('vc_user_name') || '';
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
} catch(e) {}

if (myUserName) {
  myHeaderName.textContent = myUserName;
  adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
}

if (Object.keys(allOnlineUsers).length > 0) renderContacts();
if (allCallLogs.length > 0) renderCallLogs();

let localStream = null, activeCallId = null, currentChatTargetId = null, currentChatTargetName = null;
let isCaller = false, callStartTime = 0, timerTimer = null, facingMode = 'user';
let micEnabled = true, camEnabled = true, speakerEnabled = true, isCallConnected = false;
let isAudioOnlyCall = false;
let autoHideTimer = null, peerConnections = {}, unsubs = [];
let callSessionUnsub = null, callTimeoutTimer = null, selfStatusUnsub = null;
let targetStatusUnsub = null;
const MAX_CALL_MEMBERS = 4;
let qualityLevel = 'high', qualityTimer = null, wakeLock = null, vibrationInterval = null;
let isHangingUp = false, typingTimeout = null;
let ignoreBackUntil = 0;
let isScreenSharing = false;

// ===================================================
// हार्डवेयर ऑडियो कंट्रोल (Loudspeaker / Earpiece Bridge)
// ===================================================
function setHardwareSpeaker(enableSpeaker) {
  speakerEnabled = enableSpeaker;
  if (window.AndroidAudio && typeof window.AndroidAudio.setSpeakerphone === 'function') {
    try {
      window.AndroidAudio.setSpeakerphone(enableSpeaker);
    } catch(e) {
      console.warn("AndroidAudio setSpeakerphone error:", e);
    }
  }
  remoteGrid.querySelectorAll('video').forEach(v => { v.muted = false; });
  $('speakerBtn').classList.toggle('off', !speakerEnabled);
}

function resetHardwareAudio() {
  if (window.AndroidAudio && typeof window.AndroidAudio.resetAudioMode === 'function') {
    try {
      window.AndroidAudio.resetAudioMode();
    } catch(e) {
      console.warn("AndroidAudio resetAudioMode error:", e);
    }
  }
}

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
        if ($('incomingDialog').hidden) { stopIncomingRingtone(); return; }
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
        if ($('incomingDialog').hidden) { stopVibration(); return; }
        navigator.vibrate([500, 300, 500, 300, 800]);
      }, 2500);
    }
  }
}
function stopVibration() { if ('vibrate' in navigator) navigator.vibrate(0); if (vibrationInterval) { clearInterval(vibrationInterval); vibrationInterval = null; } }

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}
function safeName(n) { return String(n||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function isNeerajBadola(n) { const s = (n||'').toLowerCase().replace(/\s+/g,' ').trim(); return (s.includes('neeraj')&&s.includes('badola'))||(s.includes('नीरज')&&s.includes('बडोला')); }

function formatClockTime(ts) {
  if (!ts) return '';
  return new Date(Number(ts)).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', hour12:true });
}
function formatLastSeen(ts) {
  if (!ts) return '';
  return `Last seen ${formatClockTime(ts)}`;
}

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

// डायरेक्ट WhatsApp शेयर
const shareBtn = $('shareAppBtn');
if (shareBtn) {
  shareBtn.onclick = () => {
    const shareText = "डायरेक्ट फुल एचडी कॉल (वीडियो/ऑडियो) के लिए यहाँ से ऐप डाउनलोड करें: 👇 \n\n" + GITHUB_APK_URL;
    const waUrl = "whatsapp://send?text=" + encodeURIComponent(shareText);
    const webWaUrl = "https://api.whatsapp.com/send?text=" + encodeURIComponent(shareText);
    window.location.href = waUrl;
    setTimeout(() => {
      if (document.hidden) return;
      window.open(webWaUrl, '_blank');
    }, 1200);
  };
}

const apkDlBtn = $('directApkDlBtn');
if (apkDlBtn) {
  apkDlBtn.onclick = () => {
    toast(currentLang === 'hi' ? '📥 APK डाउनलोड शुरू हो रहा है...' : '📥 Downloading APK...');
    const a = document.createElement('a');
    a.href = GITHUB_APK_URL;
    a.download = 'VideoCallApp.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
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
    localVideo.srcObject = localStream;
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
    localVideo.srcObject = localStream;
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

async function requestNotificationPermission() {
  if (isNative && PushNotifications) {
    try {
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') perm = await PushNotifications.requestPermissions();
      if (perm.receive === 'granted') await PushNotifications.register();
    } catch(e) {
      console.warn("Native Push Warning:", e);
    }
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

    const token = await getToken(messaging, { 
      vapidKey: VAPID_KEY, 
      serviceWorkerRegistration: swReg 
    });

    if (token) {
      myFcmToken = token;
      localStorage.setItem('vc_fcm_token', token);
      const currentUid = myUserId || localStorage.getItem('vc_user_id');
      if (currentUid) {
        await update(ref(db, `users/${currentUid}`), { fcmToken: token });
      }
    }
  } catch(err) {
    console.warn("FCM Token Silent Error:", err);
  }
}

async function triggerAutoPermissionGate() {
  const permGranted = localStorage.getItem('perms_requested');
  if (permGranted) return;

  const hasMedia = await checkMediaPermissions(false);
  let hasNotif = false;
  if ('Notification' in window) hasNotif = Notification.permission === 'granted';

  if (!hasMedia || !hasNotif) {
    $('permNoticeModal').hidden = false;
  }
}

$('grantPermsBtn').onclick = async () => {
  $('permNoticeModal').hidden = true;
  localStorage.setItem('perms_requested', 'true');
  await checkMediaPermissions(true);
  await requestNotificationPermission();
  ensureAudioContext();
};

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
      openChat(data.chatTargetId, data.chatTargetName || 'उपयोगकर्ता', false);
    }
  });
}

function handleIncomingCallNotification(data) {
  if (!data || !data.callId) return;
  if (activeCallId === data.callId && !incomingDialog.hidden) return;

  activeCallId = data.callId;
  currentCallType = 'incoming';
  currentCallTargetId = data.callerId || '';
  currentCallTargetName = data.callerName || 'कोई';
  
  isAudioOnlyCall = data.audioOnly === true || data.audioOnly === 'true' || data.audioOnly === '1';

  lobbyScreen.hidden = true;
  chatScreen.hidden = true;
  $('incomingName').textContent = currentCallTargetName + (isAudioOnlyCall ? (currentLang==='hi'?' (ऑडियो कॉल)...':' (Audio Call)...') : (currentLang==='hi'?' (वीडियो कॉल)...':' (Video Call)...'));
  incomingDialog.hidden = false;
  startIncomingRingtone();
  update(ref(db, `call_sessions/${activeCallId}`), { status: 'ringing' }).catch(()=>{});
}

function updateHeaderTitle() {
  myHeaderName.textContent = myUserName || (currentLang === 'hi' ? 'एचडी कॉलिंग' : 'HD Calling');
  adminBtn.style.display = isNeerajBadola(myUserName) ? 'block' : 'none';
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
      networkBanner.hidden = true;
      await onDisconnect(userRef).update({ online: false, lastSeen: serverTimestamp(), onlineSince: null, activeCallId: null, isBusy: false, typingTo: null }).catch(()=>{});
      await onDisconnect(inboxRef).remove().catch(()=>{});
      await update(userRef, { online: true, onlineSince: serverTimestamp() }).catch(()=>{});
    } else {
      networkBanner.hidden = false;
    }
  });

  onValue(ref(db, 'users'), snap => {
    allOnlineUsers = snap.val() || {};
    try { localStorage.setItem('cached_users', JSON.stringify(allOnlineUsers)); } catch(e) {}
    renderContacts();
  });

  listenSelfAccountStatus();
  listenForIncoming();
  listenForLatestChatPreviews();
  listenForCallLogs();
}

function listenSelfAccountStatus() {
  if (selfStatusUnsub) selfStatusUnsub();
  selfStatusUnsub = onValue(ref(db, `users/${myUserId}`), (snap) => {
    if (!snap.exists() && myUserId) {
      if (selfStatusUnsub) { selfStatusUnsub(); selfStatusUnsub = null; }
      hangup(true); localStorage.clear();
      myUserId = ''; myUserName = '';
      myHeaderName.textContent = '...';
      chatScreen.hidden = true; callScreen.hidden = true; lobbyScreen.hidden = false;
      $('nameInput').value = ''; $('nameModal').hidden = false;
      toast(currentLang === 'hi' ? '⚠️ आपकी आईडी रीसेट हो गई है।' : '⚠️ Your ID was reset.');
    }
  });
}

function checkUser() {
  if (!myUserId || !myUserName) $('nameModal').hidden = false;
  else { $('nameModal').hidden = true; initPresence(); }
}

$('saveNameBtn').onclick = async () => {
  const val = $('nameInput').value.trim(); if (!val) return;
  myUserName = val;
  myUserId = val.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(100 + Math.random()*900);
  localStorage.setItem('vc_user_id', myUserId); localStorage.setItem('vc_user_name', myUserName);
  $('nameModal').hidden = true;
  await checkMediaPermissions();
  await requestNotificationPermission();
  initPresence();
};

$('profileBtn').onclick = () => {
  $('nameEditArea').hidden = true;
  $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  $('profileModal').hidden = false;
};
$('closeProfileBtn').onclick = () => { $('profileModal').hidden = true; };

$('toggleEditNameBtn').onclick = () => {
  const isH = $('nameEditArea').hidden;
  $('nameEditArea').hidden = !isH;
  if (!isH) {
    $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  } else {
    $('editNameInput').value = myUserName;
    $('editNameInput').focus();
    $('toggleEditNameBtn').textContent = currentLang === 'hi' ? 'छिपाएँ' : 'Hide';
  }
};

$('saveEditedNameBtn').onclick = async () => {
  const val = $('editNameInput').value.trim(); if (!val) return;
  myUserName = val;
  localStorage.setItem('vc_user_name', myUserName);
  await update(ref(db, `users/${myUserId}`), { name: myUserName });
  updateHeaderTitle();
  $('nameEditArea').hidden = true;
  $('toggleEditNameBtn').textContent = translations[currentLang].btnChangeName;
  toast(currentLang === 'hi' ? '✅ नाम सुरक्षित कर लिया गया' : '✅ Name saved');
};

$('recheckPermsBtn').onclick = async () => {
  $('profileModal').hidden = true;
  await checkMediaPermissions(true);
  await requestNotificationPermission();
  toast(currentLang === 'hi' ? 'अनुमतियाँ जाँची गईं' : 'Permissions checked');
};

$('clearChatHistoryBtn').onclick = async () => {
  const confirmMsg = currentLang === 'hi' 
    ? 'क्या आप अपनी सभी चैट हिस्ट्री (लोकल और ऑनलाइन) साफ़ करना चाहते हैं?' 
    : 'Do you want to permanently clear all chat history (local & online)?';
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
        if (roomId.includes(myUserId)) {
          updates[`chats/${roomId}/messages`] = null;
        }
      });
      if (Object.keys(updates).length > 0) {
        await update(ref(db), updates);
      }
    }

    renderContacts();
    if (!chatScreen.hidden) $('chatBody').innerHTML = '';
    toast(currentLang === 'hi' ? '✅ सभी चैट साफ़ कर दी गई' : '✅ All chats cleared');
    $('profileModal').hidden = true;
  } catch(e) {
    toast('त्रुटि: चैट साफ नहीं हो सकी');
  }
};

$('resetProfileBtn').onclick = async () => {
  if (!confirm('क्या आप अपनी आईडी हटाकर रीसेट करना चाहते हैं?')) return;
  try { await remove(ref(db, `users/${myUserId}`)); await remove(ref(db, `user_inbox/${myUserId}`)); } catch(e) {}
  localStorage.clear(); location.href = location.pathname;
};

adminBtn.onclick = () => { $('adminPinInput').value = ''; $('adminPinModal').hidden = false; };
$('closePinBtn').onclick = () => { $('adminPinModal').hidden = true; };
$('verifyPinBtn').onclick = () => {
  if ($('adminPinInput').value.trim() === ADMIN_SECRET_PIN) { $('adminPinModal').hidden = true; openAdminPanel(); }
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
        toast(`${u.name} को हटा दिया गया`); openAdminPanel();
      }
    };
    list.appendChild(row);
  });
  $('adminPanelModal').hidden = false;
}
$('closeAdminPanelBtn').onclick = () => { $('adminPanelModal').hidden = true; };

$('tabChatsBtn').onclick = () => {
  $('tabChatsBtn').className = 'tab-btn active-chat';
  $('tabCallsBtn').className = 'tab-btn';
  $('tabChatsContent').hidden = false;
  $('tabCallsContent').hidden = true;
};

$('tabCallsBtn').onclick = () => {
  $('tabCallsBtn').className = 'tab-btn active-call';
  $('tabChatsBtn').className = 'tab-btn';
  $('tabCallsContent').hidden = false;
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

    if (entry.targetId) {
      const roomPath = `chats/${getChatRoomId(myUserId, entry.targetId)}/messages/${logId}`;
      const isVoice = entry.callMode === 'audio';
      const label = isVoice ? (currentLang === 'hi' ? 'ऑडियो कॉल' : 'Audio Call') : (currentLang === 'hi' ? 'वीडियो कॉल' : 'Video Call');
      let callText = entry.type === 'missed' 
        ? `${isVoice ? '📞' : '📹'} ${currentLang === 'hi' ? 'मिस्ड' : 'Missed'} ${label}` 
        : `${isVoice ? '📞' : '📹'} ${label} (${entry.duration || '00:01'})`;

      await set(ref(db, roomPath), {
        senderId: myUserId, senderName: myUserName, type: 'system-call',
        text: callText, time: Date.now(), delivered: true, read: false
      }).catch(()=>{});
    }
  } catch(e) {
    console.warn("Record call log error:", e);
  }
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
    const tag = isVoice ? '📞 ' : '📹 ';
    if (l.type === 'missed') iconHtml = `<span class="call-log-badge call-missed">↙ ${tag} ${currentLang==='hi'?'मिस्ड कॉल':'Missed Call'}</span>`;
    else if (l.type === 'incoming') iconHtml = `<span class="call-log-badge call-incoming">↙ ${tag} (${l.duration || '00:00'})</span>`;
    else iconHtml = `<span class="call-log-badge call-outgoing">↗ ${tag} (${l.duration || '00:00'})</span>`;

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

const getChatRoomId = (a, b) => [a, b].sort().join('__');

function getTickBadge(snippet) {
  if (!snippet || snippet.senderId !== myUserId) return '';
  if (snippet.read) return '<span class="tick-mark tick-read">✓✓</span>';
  if (snippet.delivered) return '<span class="tick-mark tick-delivered">✓✓</span>';
  return '<span class="tick-mark tick-sent">✓</span>';
}

let isInitialLoad = true;
function listenForLatestChatPreviews() {
  onValue(ref(db, 'chats'), snap => {
    const rooms = snap.val() || {};
    let hasUpdates = false;

    Object.keys(rooms).forEach(key => {
      if (!key.includes(myUserId)) return;
      const parts = key.split('__');
      const targetId = parts[0] === myUserId ? parts[1] : parts[0];
      const msgs = rooms[key]?.messages || {};
      const keys = Object.keys(msgs);
      if (!keys.length) return;

      const sortedKeys = keys.sort((a,b) => (msgs[a].time||0) - (msgs[b].time||0));
      const lastMsg = msgs[sortedKeys[sortedKeys.length - 1]];

      let unread = 0;
      keys.forEach(k => {
        const m = msgs[k];
        if (m.senderId !== myUserId && !m.read && currentChatTargetId !== targetId) unread++;
        if (m.senderId !== myUserId && !m.delivered) update(ref(db, `chats/${key}/messages/${k}`), { delivered: true }).catch(()=>{});
      });
      unreadCounts[targetId] = unread;

      const prevTime = latestChatSnippets[targetId]?.time || 0;
      const isNew = !isInitialLoad && lastMsg.time > prevTime && lastMsg.senderId !== myUserId && currentChatTargetId !== targetId;

      let msgText = lastMsg.text;
      if (lastMsg.type === 'image') msgText = '📷 ' + (currentLang==='hi'?'फ़ोटो':'Photo');
      else if (lastMsg.type === 'audio') msgText = '🎙 ' + (currentLang==='hi'?'वॉयस नोट':'Voice Note');
      else if (lastMsg.type === 'system-call') msgText = lastMsg.text;

      latestChatSnippets[targetId] = { text: msgText, time: lastMsg.time, senderId: lastMsg.senderId, read: !!lastMsg.read, delivered: !!lastMsg.delivered };
      hasUpdates = true;
      if (isNew) triggerSystemMessageNotification(lastMsg.senderName || 'New message', latestChatSnippets[targetId].text, targetId);
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
  if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(reg => {
      reg.showNotification(sender, { body: text, icon: 'icon.png', badge: 'icon.png', vibrate: [100, 50, 100], data: { targetId, senderName: sender } });
    }).catch(() => { new Notification(sender, { body: text }); });
  } else {
    toast(`💬 ${sender}: ${text}`);
  }
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.targetId) {
    window.focus();
    openChat(event.data.targetId, event.data.senderName || 'उपयोगकर्ता', false);
  }
});

function renderContacts() {
  contactsList.innerHTML = '';
  const amIAdmin = isNeerajBadola(myUserName);
  const q = searchInput.value.trim().toLowerCase();

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
    const lastMsgHtml = isTyping
      ? `<span class="typing-pulse">${translations[currentLang].typing}</span>`
      : (snippet ? `${getTickBadge(snippet)} <span>${safeName(snippet.text)}</span>` : `<span style="color:#64748b;font-style:italic">${currentLang==='hi'?'बातचीत शुरू करें...':'Start a conversation...'}</span>`);

    const timeHtml = snippet?.time ? formatClockTime(snippet.time) : '';

    card.innerHTML = `
      <div class="contact-avatar"><svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
      <div class="contact-content">
        <div class="contact-left-col"><span class="contact-name">${safeName(u.name)}</span><div class="contact-last-msg">${lastMsgHtml}</div></div>
        <div class="contact-right-col"><span class="msg-time-label">${timeHtml}</span><span class="contact-live-status ${statusClass}">${statusText}</span>${unread > 0 ? `<div class="badge-unread">${unread}</div>` : `<div style="height:20px"></div>`}</div>
      </div>
    `;
    card.onclick = () => openChat(id, u.name, isOnline);
    contactsList.appendChild(card);
  });
}
searchInput.oninput = renderContacts;
setInterval(() => { if (!lobbyScreen.hidden && Object.keys(allOnlineUsers).length) renderContacts(); }, 60000);

let chatUnsub = null;
let activePlayingAudio = null;
let activePlayingBtn = null;
let isInitialChatOpen = true;

function openChat(tId, tName, isOnline) {
  currentChatTargetId = tId; currentChatTargetName = tName;
  unreadCounts[tId] = 0; renderContacts();
  $('chatTargetName').textContent = tName;
  isInitialChatOpen = true;

  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  targetStatusUnsub = onValue(ref(db, `users/${tId}`), (snap) => {
    const u = snap.val() || {};
    const statusEl = $('chatTargetStatus');
    const isTyping = u.typingTo === myUserId;
    const online = !!u.online;
    if (isTyping) { statusEl.textContent = translations[currentLang].typing; statusEl.style.color = 'var(--success)'; }
    else if (online) { statusEl.textContent = translations[currentLang].online; statusEl.style.color = 'var(--success)'; }
    else { statusEl.textContent = formatLastSeen(u.lastSeen) || translations[currentLang].offline; statusEl.style.color = '#94a3b8'; }
  });

  lobbyScreen.hidden = true; chatScreen.hidden = false;
  chatInput.value = ''; chatInput.style.height = '44px';
  updateActionBtnState(); loadChatMessages();
}

function closeChat() {
  if (chatUnsub) { chatUnsub(); chatUnsub = null; }
  if (targetStatusUnsub) { targetStatusUnsub(); targetStatusUnsub = null; }
  discardRecording();
  if (activePlayingAudio) { activePlayingAudio.pause(); activePlayingAudio = null; }
  currentChatTargetId = null;
  update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{});
  chatScreen.hidden = true; lobbyScreen.hidden = false;
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
        activePlayingAudio.playbackRate = spd; spdBtn.textContent = spd + 'x';
      }
    };
  }
}

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
      if (m.senderId !== myUserId && !m.read) {
        update(ref(db, `${roomPath}/${msgId}`), { read: true, delivered: true, readAt: Date.now() }).catch(()=>{});
      }

      let el = document.getElementById(`msg_${msgId}`);
      let tickHtml = '';
      if (m.senderId === myUserId) {
        if (m.read) tickHtml = '<span class="tick-mark tick-read">✓✓</span>';
        else if (m.delivered) tickHtml = '<span class="tick-mark tick-delivered">✓✓</span>';
        else tickHtml = '<span class="tick-mark tick-sent">✓</span>';
      }

      if (el) {
        const metaEl = el.querySelector('.chat-meta');
        if (metaEl && m.senderId === myUserId) {
          metaEl.innerHTML = `<span>${m.time ? formatClockTime(m.time) : ''}</span>${tickHtml}`;
        }
      } else {
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

        el.className = `chat-bubble ${m.senderId === myUserId ? 'me' : 'them'}`;
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
          contentHtml = `<div>${safeName(m.text)}</div>`;
        }

        el.innerHTML = `${contentHtml}<div class="chat-meta"><span>${m.time ? formatClockTime(m.time) : ''}</span>${tickHtml}</div>`;
        if (m.type === 'audio') attachVoiceBubbleEvents(el);
        body.appendChild(el);
        shouldScroll = true;
      }
    });

    if (shouldScroll && (isNearBottom || isInitialChatOpen)) {
      body.scrollTop = body.scrollHeight;
      isInitialChatOpen = false;
    }
  });
}

function updateActionBtnState() {
  const hasText = chatInput.value.trim().length > 0;
  if (hasText) { micSvg.style.display = 'none'; sendSvg.style.display = 'block'; actionBtn.classList.add('send-mode'); }
  else { micSvg.style.display = 'block'; sendSvg.style.display = 'none'; actionBtn.classList.remove('send-mode'); }
}

chatInput.addEventListener('input', () => {
  chatInput.style.height = '44px';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + 'px';
  updateActionBtnState();
  if (currentChatTargetId) {
    update(ref(db, `users/${myUserId}`), { typingTo: currentChatTargetId }).catch(()=>{});
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => { update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{}); }, 1800);
  }
});
['keyup', 'change', 'paste', 'compositionend'].forEach(ev => chatInput.addEventListener(ev, updateActionBtnState));

async function sendChatMessagePush(targetId, textContent, roomId, msgId) {
  try {
    const tSnap = await get(ref(db, `users/${targetId}`));
    const token = tSnap.val()?.fcmToken;
    if (!token) return;

    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        title: myUserName,
        body: textContent,
        callerName: myUserName,
        callId: "CHAT_" + myUserId
      })
    }).catch(()=>{});
  } catch(e) {}
}

async function sendChatMessage() {
  const txt = chatInput.value.trim();
  if (!txt || !currentChatTargetId) return;
  playMessageTickSound();

  const roomId = getChatRoomId(myUserId, currentChatTargetId);
  const roomPath = `chats/${roomId}/messages`;
  chatInput.value = ''; chatInput.style.height = '44px';
  updateActionBtnState(); chatInput.focus();
  update(ref(db, `users/${myUserId}`), { typingTo: null }).catch(()=>{});

  const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
  const newMsgRef = push(ref(db, roomPath));
  const newMsgId = newMsgRef.key;

  latestChatSnippets[currentChatTargetId] = { text: txt, time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline };
  localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
  renderContacts();

  await set(newMsgRef, {
    senderId: myUserId, senderName: myUserName, text: txt, time: Date.now(), delivered: targetOnline, read: false
  });
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

let dockMediaRecorder = null, dockAudioChunks = [], dockStream = null, dockTimer = null, dockSeconds = 0;
let dockAudioContext = null, dockAnalyser = null, dockAnimFrame = null, isDockPaused = false;
const voiceDock = $('voiceDock'), dockTimerText = $('dockTimerText'), dockPauseResumeBtn = $('dockPauseResumeBtn');
const dockPauseIco = $('dockPauseIco'), dockPauseText = $('dockPauseText'), dockBlinkDot = $('dockBlinkDot');
const waveCanvas = $('waveCanvas'), waveCtx = waveCanvas.getContext('2d');

async function openVoiceDock() {
  try {
    dockStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    dockAudioChunks = []; dockMediaRecorder = new MediaRecorder(dockStream);
    dockMediaRecorder.ondataavailable = e => { if (e.data.size > 0) dockAudioChunks.push(e.data); };
    dockMediaRecorder.start(100);
    isDockPaused = false; dockSeconds = 0; dockTimerText.textContent = '0:00';
    dockPauseIco.textContent = '⏸'; dockPauseText.textContent = currentLang === 'hi' ? 'पॉज़ करें' : 'Pause';
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
  } catch(e) { toast('माइक की अनुमति नहीं मिल सकी'); }
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
  dockAudioChunks = []; voiceDock.hidden = true; updateActionBtnState();
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
        const newMsgId = newMsgRef.key;

        latestChatSnippets[currentChatTargetId] = {
          text: '🎙 ' + (currentLang==='hi'?'वॉयस नोट':'Voice Note'), time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline
        };
        localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
        renderContacts();

        await set(newMsgRef, {
          senderId: myUserId, senderName: myUserName, type: 'audio', data: base64Audio,
          duration: durStr, durationSec: durSec, time: Date.now(), delivered: targetOnline, read: false
        });
        sendChatMessagePush(currentChatTargetId, '🎙 Voice Note', roomId, newMsgId);
      };
      reader.readAsDataURL(audioBlob);
    }
    dockAudioChunks = [];
  };
  if (dockMediaRecorder.state !== 'inactive') dockMediaRecorder.stop();
  voiceDock.hidden = true; updateActionBtnState();
}
$('dockSendBtn').onclick = sendVoiceDock;

$('attachBtn').onclick = () => $('photoFileInput').click();
$('photoFileInput').onchange = e => {
  const file = e.target.files[0];
  if (!file || !currentChatTargetId) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const img = new Image();
    img.onload = async () => {
      playMessageTickSound();
      const canvas = document.createElement('canvas');
      const maxDim = 900;
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * (maxDim / w)); w = maxDim; }
      else if (h > maxDim) { w = Math.round(h * (maxDim / h)); h = maxDim; }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const compressedData = canvas.toDataURL('image/jpeg', 0.65);
      const roomId = getChatRoomId(myUserId, currentChatTargetId);
      const roomPath = `chats/${roomId}/messages`;
      const targetOnline = !!allOnlineUsers[currentChatTargetId]?.online;
      const newMsgRef = push(ref(db, roomPath));
      const newMsgId = newMsgRef.key;

      latestChatSnippets[currentChatTargetId] = {
        text: '📷 ' + (currentLang==='hi'?'फ़ोटो':'Photo'), time: Date.now(), senderId: myUserId, read: false, delivered: targetOnline
      };
      localStorage.setItem('cached_snippets', JSON.stringify(latestChatSnippets));
      renderContacts();

      await set(newMsgRef, {
        senderId: myUserId, senderName: myUserName, type: 'image', data: compressedData,
        time: Date.now(), delivered: targetOnline, read: false
      });
      toast(currentLang==='hi'?'फ़ोटो भेज दी गई':'Photo sent');
      sendChatMessagePush(currentChatTargetId, '📷 Photo', roomId, newMsgId);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file); e.target.value = '';
};

let currentCallType = 'outgoing', currentCallTargetId = null, currentCallTargetName = null;

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
      if (isCallConnected || (activeCallId && !callScreen.hidden)) {
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
        recordCallLog({
          callId: activeCallId, targetId: currentCallTargetId, name: currentCallTargetName,
          type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now()
        });
      }
      stopAllCallTones(); incomingDialog.hidden = true; hangup(true);
      remove(incomingRef).catch(()=>{});
    }
  });
}

async function sendPushNotification(token, callerName, isVoice = false) {
  try {
    fetch("https://neeraj.neerajthegreat192.workers.dev/", {
      method: "POST", headers: { "Content-Type": "application/json" },
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
  try {
    const bSnap = await get(ref(db, `users/${remoteId}/activeCallId`));
    if (bSnap.exists() && bSnap.val()) { 
      toast(`${remoteName} ${currentLang==='hi'?'अभी दूसरी कॉल में व्यस्त है':'is busy on another call'}`); 
      return; 
    }
  } catch(e) {}

  isAudioOnlyCall = audioOnly;
  const stream = await acquireCallMedia(audioOnly);
  if (!stream) return;

  activeCallId = `call_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  isCaller = true;
  currentCallType = 'outgoing';
  currentCallTargetId = remoteId;
  currentCallTargetName = remoteName;

  $('outgoingName').textContent = remoteName + (audioOnly ? (currentLang==='hi'?' (ऑडियो)...':' (Audio)...') : (currentLang==='hi'?' (वीडियो)...':' (Video)...'));
  $('outgoingStatusText').textContent = currentLang==='hi'?'कनेक्ट किया जा रहा है...':'Connecting...';
  outgoingDialog.hidden = false;
  startOutgoingCallTone();

  await update(ref(db, `users/${myUserId}`), { activeCallId }).catch(()=>{});
  
  const sessionRef = ref(db, `call_sessions/${activeCallId}`);
  onDisconnect(sessionRef).update({ status: 'ended' });

  await set(sessionRef, {
    callId: activeCallId, callerId: myUserId, callerName: myUserName, targetId: remoteId, audioOnly: !!audioOnly, status: 'calling', createdAt: serverTimestamp()
  });
  await set(ref(db, `user_inbox/${remoteId}`), { callId: activeCallId, callerId: myUserId, callerName: myUserName, audioOnly: !!audioOnly, status: 'calling' });

  const unsubSession = onValue(sessionRef, (snap) => {
    const d = snap.val(); if (!d) return;
    if (d.status === 'ringing') $('outgoingStatusText').textContent = currentLang==='hi'?'घंटी बज रही है... (Ringing)':'Ringing...';
    if (d.status === 'busy') { stopAllCallTones(); unsubSession(); outgoingDialog.hidden = true; toast(currentLang==='hi'?'📵 सामने वाला अभी व्यस्त है':'📵 User is busy'); hangup(true); }
    if (d.status === 'rejected') { stopAllCallTones(); unsubSession(); outgoingDialog.hidden = true; toast(currentLang==='hi'?'❌ कॉल अस्वीकार कर दी गई':'❌ Call declined'); hangup(true); }
    if (d.status === 'ended' && isCallConnected) { unsubSession(); toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended'); hangup(true); }
  });
  unsubs.push(unsubSession);

  clearTimeout(callTimeoutTimer);
  callTimeoutTimer = setTimeout(() => {
    if (activeCallId && !isCallConnected) { toast(currentLang==='hi'?'⏱ कॉल का जवाब नहीं मिला':'⏱ No answer'); hangup(true); }
  }, 45000);

  try {
    const tSnap = await get(ref(db, `users/${remoteId}`));
    const td = tSnap.val();
    if (td && td.fcmToken) sendPushNotification(td.fcmToken, myUserName, audioOnly);
  } catch(e) {}

  const unsubAns = onValue(ref(db, `call_sessions/${activeCallId}/members/${remoteId}`), (snap) => {
    if (snap.exists()) { stopAllCallTones(); outgoingDialog.hidden = true; unsubAns(); joinCallSession(); }
  });
  unsubs.push(unsubAns);
}

$('btnCancelCall').onclick = () => {
  stopAllCallTones();
  outgoingDialog.hidden = true;
  if (currentCallTargetId) {
    const roomId = getChatRoomId(myUserId, currentCallTargetId);
    const label = isAudioOnlyCall ? '📞 मिस्ड ऑडियो कॉल' : '📹 मिस्ड वीडियो कॉल';
    const logId = activeCallId || `call_${Date.now()}`;
    set(ref(db, `chats/${roomId}/messages/${logId}`), { senderId: myUserId, senderName: myUserName, type: 'system-call', text: label, time: Date.now(), delivered: true, read: false }).catch(()=>{});

    update(ref(db, `user_inbox/${currentCallTargetId}`), { status: 'cancelled' }).catch(()=>{});
    setTimeout(() => {
      remove(ref(db, `user_inbox/${currentCallTargetId}`)).catch(()=>{});
    }, 3000);

    get(ref(db, `users/${currentCallTargetId}`)).then(snap => {
      const token = snap.val()?.fcmToken;
      if (token) {
        fetch("https://neeraj.neerajthegreat192.workers.dev/", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, title: "Cancel", body: "Call Cancelled", callId: "CANCEL_" + activeCallId })
        }).catch(()=>{});
      }
    }).catch(()=>{});
  }
  hangup();
};

$('btnAccept').onclick = async () => { stopAllCallTones(); incomingDialog.hidden = true; if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession(); };
$('btnReject').onclick = async () => {
  stopAllCallTones(); incomingDialog.hidden = true;
  clearOngoingCallNotification();
  recordCallLog({
    callId: activeCallId, targetId: currentCallTargetId, name: currentCallTargetName,
    type: 'missed', callMode: isAudioOnlyCall ? 'audio' : 'video', duration: '00:00', time: Date.now()
  });
  if (activeCallId) await update(ref(db, `call_sessions/${activeCallId}`), { status: 'rejected' }).catch(()=>{});
  await update(ref(db, `user_inbox/${myUserId}`), { status: 'rejected' }).catch(()=>{});
  setTimeout(() => remove(ref(db, `user_inbox/${myUserId}`)).catch(()=>{}), 2500);
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
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }
        });
        vTrack = vStream.getVideoTracks()[0];
        if (localStream) localStream.addTrack(vTrack);
      } else vTrack.enabled = true;

      localVideo.srcObject = localStream;
      isAudioOnlyCall = false; camEnabled = true;
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
      camEnabled = false; isAudioOnlyCall = true;
      updateCallModeVisuals(true);
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), { camEnabled: false, audioOnly: true }).catch(()=>{});
      setHardwareSpeaker(false);
      toast(currentLang === 'hi' ? '📞 ऑडियो मोड चालू (इयरपीस)' : '📞 Voice mode active (Earpiece)');
    }
  } catch(e) { toast('कैमरा स्विच नहीं हो सका'); }
}

$('audioModeBtn').onclick = (e) => {
  e.stopPropagation();
  isAudioOnlyCall = !isAudioOnlyCall;
  toggleVideoTrackMode(!isAudioOnlyCall);
  scheduleAutoHide();
};

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

// ==========================================
// 🪄 फन मोड बॉटम स्लाइड-अप ट्रे हैंडलर्स
// ==========================================
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
  if (e.target === $('funModeTray')) {
    $('funModeTray').hidden = true;
  }
};

// ===================================================
// [यहाँ से शुरू: 🎯 मॉड्यूल KIDS QUIZ & 15S TIMER LOGIC]
// ===================================================
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
  } catch(e) {
    console.warn("Quiz questions load error:", e);
  }
  return null;
}

function startQuizTimerBar(durationSec = 15) {
  stopQuizTimerBar();
  const bar = $('quizTimerBar');
  if (!bar) return;

  let timeLeft = durationSec;
  bar.style.transition = 'none';
  bar.style.width = '100%';

  setTimeout(() => {
    if (bar) bar.style.transition = 'width 1s linear';
  }, 50);

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
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
  const bar = $('quizTimerBar');
  if (bar) bar.style.width = '100%';
}

async function sendQuizQuestion(category = 'lkg_ukg') {
  if (!activeCallId) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही क्विज़ चलाएँ' : 'Start quiz during active call');
    return;
  }

  const data = await fetchQuizQuestions();
  if (!data || !data[category] || data[category].length === 0) {
    toast(currentLang === 'hi' ? 'सवाल लोड नहीं हो सके!' : 'Failed to load questions');
    return;
  }

  const list = data[category];
  const randomQ = list[Math.floor(Math.random() * list.length)];

  const quizRef = ref(db, `call_sessions/${activeCallId}/quiz_state`);
  await set(quizRef, {
    category,
    question: randomQ.q,
    options: randomQ.opts,
    answer: randomQ.ans,
    selectedAnswer: null,
    isCorrect: null,
    updatedAt: Date.now()
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

    if (!qState || !qState.question) {
      box.hidden = true;
      stopQuizTimerBar();
      return;
    }

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

    if (!qState.selectedAnswer) {
      startQuizTimerBar(15);
    } else {
      stopQuizTimerBar();
    }

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
        if (isRight) playCheerSound();
        else playOopsSound();

        update(quizRef, {
          selectedAnswer: opt,
          isCorrect: isRight
        }).catch(()=>{});
      };
      optsArea.appendChild(btn);
    });
  });
}

async function closeKidsQuiz() {
  stopQuizTimerBar();
  if (activeCallId) {
    await remove(ref(db, `call_sessions/${activeCallId}/quiz_state`)).catch(()=>{});
  }
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
  if (!isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही क्विज़ शुरू करें' : 'Start quiz when call is connected');
    return;
  }
  const box = $('kidsQuizBox');
  if (box.hidden) {
    const cat = $('quizCategorySelect').value || 'lkg_ukg';
    sendQuizQuestion(cat);
  } else {
    closeKidsQuiz();
  }
  scheduleAutoHide();
};
// ===================================================
// [यहाँ पर समाप्त: 🎯 मॉड्यूल KIDS QUIZ & 15S TIMER LOGIC]
// ===================================================

// ===================================================
// [यहाँ से शुरू: 🎨 मॉड्यूल LIVE COLLABORATIVE WHITEBOARD]
// ===================================================
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
    x, y,
    action,
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

    if (pt.action === 'start') {
      ctx.beginPath();
      ctx.moveTo(absX, absY);
    } else if (pt.action === 'draw') {
      ctx.lineTo(absX, absY);
      ctx.stroke();
    } else if (pt.action === 'stop') {
      ctx.closePath();
    } else if (pt.action === 'clear') {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    }
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
      if (!wb.hidden) {
        wb.hidden = true;
      }
    }
  });
}

function clearLiveCanvas() {
  if (ctx && canvasEl) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }
  if (activeCallId) {
    set(ref(db, `call_sessions/${activeCallId}/canvas_draw`), {
      action: 'clear',
      ts: Date.now()
    }).catch(()=>{});
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
  if (activeCallId) {
    update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
  }
  $('kidsWhiteboardModal').hidden = true;
};

$('btnWhiteboard').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही बोर्ड खोलें' : 'Open whiteboard during active call');
    return;
  }
  const wb = $('kidsWhiteboardModal');
  const willOpen = wb.hidden;
  if (activeCallId) {
    update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: willOpen }).catch(()=>{});
  }
  scheduleAutoHide();
};
// ===================================================
// [यहाँ पर समाप्त: 🎨 मॉड्यूल LIVE COLLABORATIVE WHITEBOARD]
// ===================================================

// ===================================================
// [यहाँ से शुरू: ❌⭕ मॉड्यूल TIC-TAC-TOE 2-PLAYER ENGINE]
// ===================================================
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
  if (board.every(cell => cell !== "")) {
    return { winner: 'draw', pattern: [] };
  }
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

  box.querySelector('#closeTttBtn').onclick = (e) => {
    e.stopPropagation();
    closeTictactoeGame();
  };

  box.querySelector('#tttResetBtn').onclick = (e) => {
    e.stopPropagation();
    resetTictactoeGame();
  };
}

async function startOrToggleTictactoe() {
  if (!activeCallId || !isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही खेल शुरू करें' : 'Connect call to play');
    return;
  }
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

    if (!state || !state.active) {
      box.hidden = true;
      return;
    }

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
          if (lastAnnouncedTttWinId !== state.updatedAt) {
            playCheerSound();
            lastAnnouncedTttWinId = state.updatedAt;
          }
        } else {
          statusEl.textContent = `सामने वाला (${state.winner}) जीत गया!`;
          if (lastAnnouncedTttWinId !== state.updatedAt) {
            playOopsSound();
            lastAnnouncedTttWinId = state.updatedAt;
          }
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

  if (state.currentTurn !== mySymbol) {
    toast(currentLang === 'hi' ? 'अभी आपकी बारी नहीं है!' : 'Not your turn!');
    return;
  }
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

  await update(tttRef, {
    board: Array(9).fill(""),
    currentTurn: "X",
    winner: null,
    winPattern: [],
    updatedAt: Date.now()
  });
  toast(currentLang === 'hi' ? 'नया खेल शुरू हुआ!' : 'New game started!');
}

async function closeTictactoeGame() {
  if (activeCallId) {
    await update(ref(db, `call_sessions/${activeCallId}/tictactoe_state`), { active: false }).catch(()=>{});
  }
  const box = $('kidsTictactoeBox');
  if (box) box.hidden = true;
}

$('trayBtnTictactoe').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  startOrToggleTictactoe();
};
// ===================================================
// [यहाँ पर समाप्त: ❌⭕ मॉड्यूल TIC-TAC-TOE 2-PLAYER ENGINE]
// ===================================================

// ===================================================
// [यहाँ से शुरू: ✨ मॉड्यूल LIVE VIDEO DRAWING (ANNOTATION)]
// ===================================================
let annotCanvasEl = null;
let annotCtx = null;
let isAnnotDrawing = false;
let annotColor = '#f59e0b';
let annotSessionUnsub = null;
let annotEventsAttached = false;
let annotDisappearTimer = null;

function ensureAnnotationDOM() {
  if ($('liveAnnotationOverlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'liveAnnotationOverlay';
  overlay.className = 'annotation-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <canvas id="annotationCanvas"></canvas>
    <div class="annotation-toolbar" id="annotToolbar">
      <div style="display:flex;align-items:center;gap:6px">
        <button class="annot-color-dot active" data-color="#f59e0b" style="background:#f59e0b"></button>
        <button class="annot-color-dot" data-color="#ef4444" style="background:#ef4444"></button>
        <button class="annot-color-dot" data-color="#38bdf8" style="background:#38bdf8"></button>
        <button class="annot-color-dot" data-color="#22c55e" style="background:#22c55e"></button>
      </div>
      <button id="annotClearBtn" class="annot-btn annot-btn-clear">🗑️ साफ़</button>
      <button id="annotCloseBtn" class="annot-btn annot-btn-close">✕</button>
    </div>
  `;
  callScreen.appendChild(overlay);

  overlay.querySelectorAll('.annot-color-dot').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      overlay.querySelectorAll('.annot-color-dot').forEach(d => d.classList.remove('active'));
      btn.classList.add('active');
      annotColor = btn.dataset.color || '#f59e0b';
    };
  });

  overlay.querySelector('#annotClearBtn').onclick = (e) => {
    e.stopPropagation();
    clearLiveAnnotation();
  };

  overlay.querySelector('#annotCloseBtn').onclick = (e) => {
    e.stopPropagation();
    closeLiveAnnotation();
  };
}

function initLiveAnnotation() {
  ensureAnnotationDOM();
  annotCanvasEl = $('annotationCanvas');
  if (!annotCanvasEl) return;
  annotCtx = annotCanvasEl.getContext('2d');

  function resizeAnnotCanvas() {
    if (!annotCanvasEl) return;
    annotCanvasEl.width = annotCanvasEl.offsetWidth || window.innerWidth;
    annotCanvasEl.height = annotCanvasEl.offsetHeight || window.innerHeight;
  }
  setTimeout(resizeAnnotCanvas, 50);

  if (!annotEventsAttached) {
    const getPoint = (e) => {
      const rect = annotCanvasEl.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height
      };
    };

    annotCanvasEl.addEventListener('pointerdown', (e) => {
      isAnnotDrawing = true;
      const pt = getPoint(e);
      broadcastAnnotPoint(pt.x, pt.y, 'start');
    });

    annotCanvasEl.addEventListener('pointermove', (e) => {
      if (!isAnnotDrawing) return;
      const pt = getPoint(e);
      broadcastAnnotPoint(pt.x, pt.y, 'draw');
    });

    const stopAnnot = () => {
      if (!isAnnotDrawing) return;
      isAnnotDrawing = false;
      broadcastAnnotPoint(0, 0, 'stop');
    };

    annotCanvasEl.addEventListener('pointerup', stopAnnot);
    annotCanvasEl.addEventListener('pointercancel', stopAnnot);
    annotEventsAttached = true;
  }

  listenRemoteAnnotation();
}

function broadcastAnnotPoint(x, y, action) {
  if (!activeCallId) return;
  set(ref(db, `call_sessions/${activeCallId}/annotation_draw`), {
    x, y, action, color: annotColor, sender: myUserId, ts: Date.now()
  }).catch(()=>{});
}

function listenRemoteAnnotation() {
  if (!activeCallId) return;
  if (annotSessionUnsub) annotSessionUnsub();

  annotSessionUnsub = onValue(ref(db, `call_sessions/${activeCallId}/annotation_draw`), snap => {
    const pt = snap.val();
    if (!pt || !annotCtx || !annotCanvasEl) return;

    const absX = pt.x * annotCanvasEl.width;
    const absY = pt.y * annotCanvasEl.height;

    annotCtx.strokeStyle = pt.color || '#f59e0b';
    annotCtx.lineWidth = 5;
    annotCtx.lineCap = 'round';
    annotCtx.lineJoin = 'round';

    if (pt.action === 'start') {
      annotCtx.beginPath();
      annotCtx.moveTo(absX, absY);
    } else if (pt.action === 'draw') {
      annotCtx.lineTo(absX, absY);
      annotCtx.stroke();
    } else if (pt.action === 'stop') {
      annotCtx.closePath();
      clearTimeout(annotDisappearTimer);
      annotDisappearTimer = setTimeout(() => {
        if (annotCtx && annotCanvasEl) {
          annotCtx.clearRect(0, 0, annotCanvasEl.width, annotCanvasEl.height);
        }
      }, 3500);
    } else if (pt.action === 'clear') {
      annotCtx.clearRect(0, 0, annotCanvasEl.width, annotCanvasEl.height);
    }
  });

  onValue(ref(db, `call_sessions/${activeCallId}/annotation_active`), snap => {
    const isActive = !!snap.val();
    const overlay = $('liveAnnotationOverlay');
    if (!overlay) return;
    if (isActive) {
      if (overlay.hidden) {
        overlay.hidden = false;
        initLiveAnnotation();
        controlsBar.classList.add('fade-out');
      }
    } else {
      overlay.hidden = true;
    }
  });
}

function clearLiveAnnotation() {
  if (annotCtx && annotCanvasEl) annotCtx.clearRect(0, 0, annotCanvasEl.width, annotCanvasEl.height);
  if (activeCallId) {
    set(ref(db, `call_sessions/${activeCallId}/annotation_draw`), { action: 'clear', ts: Date.now() }).catch(()=>{});
  }
}

function closeLiveAnnotation() {
  if (activeCallId) {
    update(ref(db, `call_sessions/${activeCallId}`), { annotation_active: false }).catch(()=>{});
  }
  const overlay = $('liveAnnotationOverlay');
  if (overlay) overlay.hidden = true;
}

$('trayBtnAnnotation').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!activeCallId || !isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही ड्रॉइंग चालू करें' : 'Connect call to draw');
    return;
  }
  ensureAnnotationDOM();
  const overlay = $('liveAnnotationOverlay');
  const willOpen = overlay.hidden;
  update(ref(db, `call_sessions/${activeCallId}`), { annotation_active: willOpen }).catch(()=>{});
};
// ===================================================
// [यहाँ पर समाप्त: ✨ मॉड्यूल LIVE VIDEO DRAWING (ANNOTATION)]
// ===================================================

// ===================================================
// [यहाँ से शुरू: 🎙️ मॉड्यूल LIVE VOICE CHANGER (6 PRESETS)]
// ===================================================
let voiceAudioCtx = null;
let voiceSourceNode = null;
let voiceDestinationNode = null;
let voiceOscillatorNode = null;
let activeVoicePreset = 'normal';

const VOICE_PRESETS = [
  { id: 'normal', name: 'सामान्य', sub: 'Original Voice', icon: '👤' },
  { id: 'cartoon', name: 'कार्टून / चिपमंक', sub: 'High Pitch Cute', icon: '🐿️' },
  { id: 'robot', name: 'रोबोट', sub: 'Metallic Ring Mod', icon: '🤖' },
  { id: 'monster', name: 'मॉन्स्टर / शेर', sub: 'Heavy Bass Roar', icon: '👹' },
  { id: 'girl', name: 'लड़की', sub: 'Bright Sweet Tone', icon: '👧' },
  { id: 'man', name: 'एडल्ट पुरुष', sub: 'Deep Chest Voice', icon: '👨' }
];

function ensureVoiceChangerDOM() {
  if ($('voiceChangerBox')) return;
  const box = document.createElement('div');
  box.id = 'voiceChangerBox';
  box.className = 'voice-changer-box';
  box.hidden = true;
  box.innerHTML = `
    <div class="vc-header">
      <div class="vc-title">🎙️ वॉइस चेंजर (6 साउंड प्रेसेट्स)</div>
      <button id="closeVcBtn" class="vc-close-btn" title="बंद करें">✕</button>
    </div>
    <div class="vc-grid" id="vcGrid"></div>
  `;
  callScreen.appendChild(box);

  const grid = box.querySelector('#vcGrid');
  VOICE_PRESETS.forEach(p => {
    const btn = document.createElement('button');
    btn.className = `vc-preset-btn ${p.id === activeVoicePreset ? 'active' : ''}`;
    btn.dataset.preset = p.id;
    btn.innerHTML = `
      <span class="vc-icon">${p.icon}</span>
      <div class="vc-label-group">
        <span class="vc-label">${p.name}</span>
        <span class="vc-sublabel">${p.sub}</span>
      </div>
    `;
    btn.onclick = (e) => {
      e.stopPropagation();
      box.querySelectorAll('.vc-preset-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyVoicePreset(p.id);
    };
    grid.appendChild(btn);
  });

  box.querySelector('#closeVcBtn').onclick = (e) => {
    e.stopPropagation();
    box.hidden = true;
  };
}

async function applyVoicePreset(presetId) {
  activeVoicePreset = presetId;
  if (!localStream) return;
  const origAudioTrack = localStream.getAudioTracks()[0];
  if (!origAudioTrack) return;

  try {
    if (presetId === 'normal') {
      for (const pId of Object.keys(peerConnections)) {
        const pc = peerConnections[pId];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) await sender.replaceTrack(origAudioTrack);
      }
      toast('👤 सामान्य आवाज़ चालू');
      return;
    }

    if (!voiceAudioCtx) {
      voiceAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (voiceAudioCtx.state === 'suspended') await voiceAudioCtx.resume();

    if (voiceOscillatorNode) {
      try { voiceOscillatorNode.stop(); voiceOscillatorNode.disconnect(); } catch(e){}
      voiceOscillatorNode = null;
    }
    if (voiceSourceNode) {
      try { voiceSourceNode.disconnect(); } catch(e){}
    }

    const audioStream = new MediaStream([origAudioTrack]);
    voiceSourceNode = voiceAudioCtx.createMediaStreamSource(audioStream);
    voiceDestinationNode = voiceAudioCtx.createMediaStreamDestination();

    let lastNode = voiceSourceNode;

    if (presetId === 'cartoon') {
      const hp = voiceAudioCtx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 400;
      const peak = voiceAudioCtx.createBiquadFilter();
      peak.type = 'peaking'; peak.frequency.value = 2800; peak.gain.value = 8; peak.Q.value = 1.8;
      lastNode.connect(hp); hp.connect(peak); lastNode = peak;
    } 
    else if (presetId === 'robot') {
      const ringGain = voiceAudioCtx.createGain(); ringGain.gain.value = 0.5;
      const osc = voiceAudioCtx.createOscillator();
      const oscGain = voiceAudioCtx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = 65;
      oscGain.gain.value = 0.5;
      osc.connect(oscGain); oscGain.connect(ringGain.gain);
      osc.start(); voiceOscillatorNode = osc;
      lastNode.connect(ringGain); lastNode = ringGain;
    } 
    else if (presetId === 'monster') {
      const lp = voiceAudioCtx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 1000;
      const bass = voiceAudioCtx.createBiquadFilter();
      bass.type = 'peaking'; bass.frequency.value = 120; bass.gain.value = 10; bass.Q.value = 1.0;
      lastNode.connect(lp); lp.connect(bass); lastNode = bass;
    } 
    else if (presetId === 'girl') {
      const lowCut = voiceAudioCtx.createBiquadFilter();
      lowCut.type = 'highpass'; lowCut.frequency.value = 260;
      const highPeak = voiceAudioCtx.createBiquadFilter();
      highPeak.type = 'peaking'; highPeak.frequency.value = 2400; highPeak.gain.value = 7; highPeak.Q.value = 1.4;
      const shelf = voiceAudioCtx.createBiquadFilter();
      shelf.type = 'highshelf'; shelf.frequency.value = 4500; shelf.gain.value = 6;
      lastNode.connect(lowCut); lowCut.connect(highPeak); highPeak.connect(shelf); lastNode = shelf;
    } 
    else if (presetId === 'man') {
      const chest = voiceAudioCtx.createBiquadFilter();
      chest.type = 'peaking'; chest.frequency.value = 150; chest.gain.value = 9; chest.Q.value = 1.1;
      const warm = voiceAudioCtx.createBiquadFilter();
      warm.type = 'peaking'; warm.frequency.value = 400; warm.gain.value = 4; warm.Q.value = 1.2;
      const tameHigh = voiceAudioCtx.createBiquadFilter();
      tameHigh.type = 'lowpass'; tameHigh.frequency.value = 3200;
      lastNode.connect(chest); chest.connect(warm); warm.connect(tameHigh); lastNode = tameHigh;
    }

    // आवाज को फटने (Distortion/Clipping) से बचाने के लिए डायनामिक कम्प्रेसर
    const compressor = voiceAudioCtx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-20, voiceAudioCtx.currentTime);
    compressor.knee.setValueAtTime(25, voiceAudioCtx.currentTime);
    compressor.ratio.setValueAtTime(10, voiceAudioCtx.currentTime);
    compressor.attack.setValueAtTime(0.003, voiceAudioCtx.currentTime);
    compressor.release.setValueAtTime(0.25, voiceAudioCtx.currentTime);

    lastNode.connect(compressor);
    compressor.connect(voiceDestinationNode);

    const modTrack = voiceDestinationNode.stream.getAudioTracks()[0];

    for (const pId of Object.keys(peerConnections)) {
      const pc = peerConnections[pId];
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
      if (sender) await sender.replaceTrack(modTrack);
    }
    toast(`🎙️ आवाज़: ${VOICE_PRESETS.find(x => x.id === presetId)?.name}`);
  } catch(e) {
    console.warn("Voice modulator error:", e);
  }
}

$('trayBtnVoiceChanger').onclick = (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!activeCallId || !isCallConnected) {
    toast(currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही वॉइस चेंजर खोलें' : 'Connect call to change voice');
    return;
  }
  ensureVoiceChangerDOM();
  $('voiceChangerBox').hidden = !$('voiceChangerBox').hidden;
};
// ===================================================
// [यहाँ पर समाप्त: 🎙️ मॉड्यूल LIVE VOICE CHANGER (6 PRESETS)]
// ===================================================

$('trayBtnColoring').onclick = (e) => {
  e.stopPropagation();
  toast(currentLang === 'hi' ? '🖍️ कलरिंग बुक अगले अपडेट में आएगी!' : '🖍️ Coloring book coming soon!');
};
$('trayBtnReactions').onclick = (e) => {
  e.stopPropagation();
  toast(currentLang === 'hi' ? '🎉 लाइव रिएक्शन अगले अपडेट में!' : '🎉 Live reactions coming soon!');
};

$('trayBtnScreenShare').onclick = async (e) => {
  e.stopPropagation();
  $('funModeTray').hidden = true;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    toast(currentLang === 'hi' ? 'इस डिवाइस पर स्क्रीन शेयरिंग उपलब्ध नहीं है' : 'Screen sharing not supported');
    return;
  }
  try {
    if (!isScreenSharing) {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];
      
      for (const pId of Object.keys(peerConnections)) {
        const pc = peerConnections[pId];
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }
      localVideo.srcObject = screenStream;
      isScreenSharing = true;
      toast(currentLang === 'hi' ? '🖥️ स्क्रीन शेयरिंग चालू हो गई' : '🖥️ Screen sharing started');

      screenTrack.onended = () => {
        toggleVideoTrackMode(true);
        isScreenSharing = false;
        toast(currentLang === 'hi' ? 'स्क्रीन शेयरिंग बंद हुई' : 'Screen share ended');
      };
    } else {
      toggleVideoTrackMode(true);
      isScreenSharing = false;
      toast(currentLang === 'hi' ? 'स्क्रीन शेयरिंग बंद हुई' : 'Screen share ended');
    }
  } catch(err) {
    console.warn("Screen share error:", err);
  }
};

function cleanupKidsModules() {
  stopQuizTimerBar();
  if (quizSessionUnsub) { quizSessionUnsub(); quizSessionUnsub = null; }
  if (canvasSessionUnsub) { canvasSessionUnsub(); canvasSessionUnsub = null; }
  if (whiteboardSyncUnsub) { whiteboardSyncUnsub(); whiteboardSyncUnsub = null; }
  if (tttSessionUnsub) { tttSessionUnsub(); tttSessionUnsub = null; }
  if (annotSessionUnsub) { annotSessionUnsub(); annotSessionUnsub = null; }

  if (voiceOscillatorNode) {
    try { voiceOscillatorNode.stop(); voiceOscillatorNode.disconnect(); } catch(e){}
    voiceOscillatorNode = null;
  }
  activeVoicePreset = 'normal';

  const box = $('kidsQuizBox');
  if (box) box.hidden = true;
  const wb = $('kidsWhiteboardModal');
  if (wb) wb.hidden = true;
  const ttt = $('kidsTictactoeBox');
  if (ttt) ttt.hidden = true;
  const annot = $('liveAnnotationOverlay');
  if (annot) annot.hidden = true;
  const vc = $('voiceChangerBox');
  if (vc) vc.hidden = true;
  if ($('funModeTray')) $('funModeTray').hidden = true;

  if (ctx && canvasEl) ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (annotCtx && annotCanvasEl) annotCtx.clearRect(0, 0, annotCanvasEl.width, annotCanvasEl.height);
  isScreenSharing = false;
}

async function joinCallSession() {
  clearTimeout(callTimeoutTimer); callTimeoutTimer = null;
  lobbyScreen.hidden = true; chatScreen.hidden = true; callScreen.hidden = false;
  isCallConnected = true; isHangingUp = false;
  ignoreBackUntil = Date.now() + 2000;
  await requestWakeLock();
  startNetworkQualityMonitor();
  pipWrap.classList.remove('pip-hidden'); pipRestoreBtn.hidden = true;
  localVideo.srcObject = localStream; localVideo.play().catch(()=>{});

  updateCallModeVisuals(isAudioOnlyCall);

  // वॉइस कॉल डिफ़ॉल्ट रूप से इयरपीस (कान वाले स्पीकर) पर, वीडियो कॉल लाउडस्पीकर पर
  if (isAudioOnlyCall) {
    setHardwareSpeaker(false);
  } else {
    setHardwareSpeaker(true);
  }

  startTimer(); scheduleAutoHide();

  initKidsQuizListener();
  listenRemoteCanvas();
  listenWhiteboardAutoSync();
  listenTictactoeSession();
  listenRemoteAnnotation();

  const sessionRef = ref(db, `call_sessions/${activeCallId}`);
  onDisconnect(sessionRef).update({ status: 'ended' });

  await set(ref(db, `call_sessions/${activeCallId}/members/${myUserId}`), {
    name: myUserName, camEnabled: !isAudioOnlyCall, micEnabled, audioOnly: isAudioOnlyCall, joinedAt: Date.now()
  });

  if (callSessionUnsub) callSessionUnsub();
  callSessionUnsub = onValue(ref(db, `call_sessions/${activeCallId}/status`), snap => {
    if (snap.val() === 'ended') { toast(currentLang==='hi'?'कॉल समाप्त हो गई है':'Call ended'); hangup(true); }
  });

  onValue(ref(db, `call_sessions/${activeCallId}/members`), snap => {
    const members = snap.val() || {}, ids = Object.keys(members);
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
  
  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }
  if (isAudioOnlyCall && (!localStream || localStream.getVideoTracks().length === 0)) {
    try { pc.addTransceiver('video', { direction: 'sendrecv' }); } catch(e){}
  }
  boostPeerBitrate(pc);

  pc.ontrack = e => {
    addRemoteVideoCell(peerId, e.streams[0], peerName);
    updateRemoteGridClass();
  };

  const myPath = `call_sessions/${activeCallId}/signals/${myUserId}__${peerId}`;
  const peerPath = `call_sessions/${activeCallId}/signals/${peerId}__${myUserId}`;

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

  if (myUserId < peerId) {
    pc.createOffer().then(o => pc.setLocalDescription(new RTCSessionDescription({ type: o.type, sdp: applySDPBitrate(o.sdp) })))
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
  v.srcObject = stream; v.muted = false; v.play().catch(()=>{});
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
  removeRemoteVideoCell(id); updateRemoteGridClass();
}

$('btnAddPerson').onclick = (e) => {
  e.stopPropagation();
  const list = $('addContactsList'); list.innerHTML = '';
  const amIAdmin = isNeerajBadola(myUserName);
  const avail = Object.keys(allOnlineUsers).filter(id => id !== myUserId && !peerConnections[id] && (!allOnlineUsers[id].hidden || amIAdmin));
  if (!avail.length) { list.innerHTML = `<div style="font-size:12px;color:#94a3b8;padding:10px">${currentLang==='hi'?'अन्य कोई संपर्क उपलब्ध नहीं है':'No other contacts available'}</div>`; }
  else {
    avail.forEach(id => {
      const u = allOnlineUsers[id], row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.05);padding:8px 12px;border-radius:12px;border:1px solid var(--line)';
      row.innerHTML = `<span style="font-size:14px;font-weight:700">${safeName(u.name)}</span><button style="background:var(--c-call-tab);border:0;color:#fff;font-size:12px;font-weight:800;padding:6px 14px;border-radius:12px">जोड़ें</button>`;
      row.querySelector('button').onclick = async () => {
        const snap = await get(ref(db, `call_sessions/${activeCallId}/members`));
        if (snap.exists() && Object.keys(snap.val()||{}).length >= MAX_CALL_MEMBERS) { toast(`Max ${MAX_CALL_MEMBERS} members allowed`); return; }
        await update(ref(db, `users/${id}`), { activeCallId }).catch(()=>{});
        await set(ref(db, `user_inbox/${id}`), { callId: activeCallId, callerId: myUserId, callerName: myUserName + ' (ग्रुप)', audioOnly: isAudioOnlyCall, status: 'calling' });
        const uSnap = await get(ref(db, `users/${id}`));
        if (uSnap.val()?.fcmToken) sendPushNotification(uSnap.val().fcmToken, myUserName, isAudioOnlyCall);
        toast(`${u.name} को कॉल भेजा गया!`); $('addParticipantModal').hidden = true;
      };
      list.appendChild(row);
    });
  }
  $('addParticipantModal').hidden = false;
};
$('closeAddModalBtn').onclick = () => {$('addParticipantModal').hidden = true; };

// ===================================================
// PiP विंडो टैप (Swap Fullscreen) एवं स्वाइप हैंडलर
// ===================================================
let pipTouchStartX = 0, pipTouchStartY = 0;
pipWrap.addEventListener('touchstart', e => {
  pipTouchStartX = e.changedTouches[0].clientX;
  pipTouchStartY = e.changedTouches[0].clientY;
}, {passive:true});

pipWrap.addEventListener('touchend', e => {
  e.stopPropagation();
  const dx = e.changedTouches[0].clientX - pipTouchStartX;
  const dy = e.changedTouches[0].clientY - pipTouchStartY;

  // दाएँ स्वाइप करने पर PiP छिप जाएगा
  if (dx > 35 && Math.abs(dx) > Math.abs(dy)) {
    pipWrap.classList.add('pip-hidden');
    pipRestoreBtn.hidden = false;
  } else if (Math.abs(dx) < 12 && Math.abs(dy) < 12) {
    // टैप करने पर अपनी और सामने वाले की वीडियो स्वैप होगी
    callScreen.classList.toggle('video-swapped');
    toast(callScreen.classList.contains('video-swapped') 
      ? (currentLang === 'hi' ? '🔄 आपकी वीडियो बड़ी स्क्रीन पर' : '🔄 Your video Fullscreen') 
      : (currentLang === 'hi' ? '🔄 सामान्य व्यू' : '🔄 Normal View'));
  }
  scheduleAutoHide();
});

// स्वैप होने के बाद जब यूज़र कोने वाले रिमोट ग्रिड पर टैप करे तो वापस सामान्य व्यू हो जाए
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
    const isAnnotOpen = $('liveAnnotationOverlay') && !$('liveAnnotationOverlay').hidden;
    const isVcOpen = $('voiceChangerBox') && !$('voiceChangerBox').hidden;

    if (isCallConnected && $('kidsQuizBox').hidden && $('kidsWhiteboardModal').hidden && $('funModeTray').hidden && !isTttOpen && !isAnnotOpen && !isVcOpen) {
      controlsBar.classList.add('fade-out');
      $('callTopBar').classList.add('fade-out');
    }
  }, 3500);
}

callScreen.addEventListener('click', e => {
  if (e.target.closest('.ctl-box') || e.target.closest('.modal-box') || e.target.closest('#pipWrap') || e.target.closest('#pipRestoreBtn') || e.target.closest('#kidsQuizBox') || e.target.closest('#kidsWhiteboardModal') || e.target.closest('#callTopBar') || e.target.closest('#funModeTray') || e.target.closest('#kidsTictactoeBox') || e.target.closest('#voiceChangerBox') || e.target.closest('.annotation-toolbar')) return;
  const isH = controlsBar.classList.contains('fade-out');
  controlsBar.classList.toggle('fade-out', !isH);
  $('callTopBar').classList.toggle('fade-out', !isH);
  if (isH) scheduleAutoHide();
});

$('micBtn').onclick = async (e) => {
  e.stopPropagation(); micEnabled = !micEnabled;
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

// लाउडस्पीकर / इयरपीस टॉगल बटन
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
      video: { facingMode: { ideal: facingMode }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 }, frameRate: { ideal: 30, min: 24 } }, audio: false
    });
    const newTrack = newStream.getVideoTracks()[0], oldTrack = localStream.getVideoTracks()[0];
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
  e.stopPropagation(); e.preventDefault();
  if (isHangingUp) return;
  isHangingUp = true; hangup();
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
    stopAllCallTones(); 
    stopTimer(); 
    releaseWakeLock();
    clearTimeout(autoHideTimer); 
    clearTimeout(callTimeoutTimer); 
    callTimeoutTimer = null;
    stopNetworkQualityMonitor();

    cleanupKidsModules();
    resetHardwareAudio();

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
    unsubs.forEach(fn => { try { fn(); } catch(e){} }); unsubs = [];
    if (callSessionUnsub) { callSessionUnsub(); callSessionUnsub = null; }
    Object.keys(peerConnections).forEach(id => closePeer(id)); peerConnections = {};

    if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
    remoteGrid.innerHTML = ''; activeCallId = null; isCallConnected = false; isAudioOnlyCall = false;
    callStartTime = 0;

    callScreen.classList.remove('video-swapped');
    controlsBar.classList.remove('fade-out');
    $('callTopBar').classList.remove('fade-out');
    pipWrap.classList.remove('pip-hidden'); pipRestoreBtn.hidden = true;
    pipWrap.style.opacity = '1';
    $('camBtn').classList.remove('off');
    $('micBtn').classList.remove('off');$('speakerBtn').classList.remove('off');
    if ($('voiceCallArea')) $('voiceCallArea').hidden = true;
    remoteGrid.style.display = 'grid';
    pipWrap.style.display = 'block';
    
    callScreen.hidden = true; incomingDialog.hidden = true; outgoingDialog.hidden = true; lobbyScreen.hidden = false;
    isHangingUp = false;
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
function stopTimer() { if (timerTimer) { clearInterval(timerTimer); timerTimer = null; } $('callTimer').textContent = '00:00'; }

async function requestWakeLock() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch(e) {}
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release().catch(()=>{}); wakeLock = null; } }

let backPressedOnce = false;
function setupHardwareBackButton() {
  window.addEventListener('popstate', (e) => {
    if (Date.now() < ignoreBackUntil) {
      history.pushState(null, '', window.location.href);
      e.preventDefault();
      return;
    }
    const openModals = [$('adminPanelModal'), $('adminPinModal'),$('profileModal'), $('addParticipantModal'),$('permNoticeModal')];
    for (const m of openModals) {
      if (!m.hidden) {
        m.hidden = true;
        history.pushState(null, '', window.location.href);
        e.preventDefault();
        return;
      }
    }
    if ($('voiceChangerBox') && !$('voiceChangerBox').hidden) {$('voiceChangerBox').hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('liveAnnotationOverlay') && !$('liveAnnotationOverlay').hidden) { closeLiveAnnotation(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!$('funModeTray').hidden) {$('funModeTray').hidden = true; history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!$('kidsWhiteboardModal').hidden) {$('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      history.pushState(null, '', window.location.href); e.preventDefault(); return; 
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!voiceDock.hidden) { discardRecording(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!chatScreen.hidden) { closeChat(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!callScreen.hidden) { if (confirm('क्या आप कॉल काटना चाहते हैं?')) hangup(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); history.pushState(null, '', window.location.href); e.preventDefault(); return; }
  });

  history.pushState(null, '', window.location.href);

  if (!isNative || !App) return;
  App.addListener('backButton', () => {
    if (Date.now() < ignoreBackUntil) return;
    const openModals = [$('adminPanelModal'), $('adminPinModal'),$('profileModal'), $('addParticipantModal'),$('permNoticeModal')];
    for (const m of openModals) { if (!m.hidden) { m.hidden = true; return; } }
    if ($('voiceChangerBox') && !$('voiceChangerBox').hidden) {$('voiceChangerBox').hidden = true; return; }
    if ($('liveAnnotationOverlay') && !$('liveAnnotationOverlay').hidden) { closeLiveAnnotation(); return; }
    if ($('kidsTictactoeBox') && !$('kidsTictactoeBox').hidden) { closeTictactoeGame(); return; }
    if (!$('funModeTray').hidden) {$('funModeTray').hidden = true; return; }
    if (!$('kidsWhiteboardModal').hidden) {$('kidsWhiteboardModal').hidden = true;
      if (activeCallId) update(ref(db, `call_sessions/${activeCallId}/whiteboard_state`), { active: false }).catch(()=>{});
      return; 
    }
    if (!$('kidsQuizBox').hidden) { closeKidsQuiz(); return; }
    if (!voiceDock.hidden) { discardRecording(); return; }
    if (!chatScreen.hidden) { closeChat(); return; }
    if (!callScreen.hidden) { if (confirm('क्या आप कॉल काटना चाहते हैं?')) hangup(); return; }
    if (!outgoingDialog.hidden) { $('btnCancelCall').click(); return; }
    if (!incomingDialog.hidden) { $('btnReject').click(); return; }

    if (backPressedOnce) { App.exitApp(); }
    else {
      backPressedOnce = true;
      toast(currentLang === 'hi' ? 'बाहर निकलने के लिए दोबारा बैक दबाएँ' : 'Press back again to exit');
      setTimeout(() => { backPressedOnce = false; }, 2000);
    }
  });
}

if (window.visualViewport) {
  const syncViewport = () => {
    if (!chatScreen.hidden) {
      window.scrollTo(0, 0);
      chatScreen.style.height = `${window.visualViewport.height}px`;
      const body = $('chatBody');
      if (body) body.scrollTop = body.scrollHeight;
    }
  };
  window.visualViewport.addEventListener('resize', syncViewport);
  window.visualViewport.addEventListener('scroll', () => {
    if (!chatScreen.hidden) window.scrollTo(0, 0);
  });
}

chatInput.addEventListener('focus', () => {
  setTimeout(() => {
    window.scrollTo(0, 0);
    const body = $('chatBody');
    if (body) body.scrollTop = body.scrollHeight;
  }, 150);
});
chatInput.addEventListener('blur', () => {
  if (!chatScreen.hidden) {
    chatScreen.style.height = '100%';
    window.scrollTo(0, 0);
  }
});

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
          openChat(data.targetId, data.senderName || 'उपयोगकर्ता', true);
        } else if (data.type === 'ACCEPT_CALL' && data.callId) {
          if (!isCallConnected) {
            activeCallId = data.callId;
            isAudioOnlyCall = !!data.isAudio;
            if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
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
      setTimeout(() => openChat(openChatId, openChatName || 'उपयोगकर्ता', true), 800);
    } else if (acceptCallId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setTimeout(async () => {
        if (!isCallConnected) {
          activeCallId = acceptCallId;
          isAudioOnlyCall = isAudioUrl;
          if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
        }
      }, 800);
    }

    if (isNative && App) {
      App.addListener('appUrlOpen', async (event) => {
        try {
          const url = new URL(event.url);
          const accId = url.searchParams.get('acceptCallId');
          const isAud = url.searchParams.get('isAudio') === 'true';
          const chatTgtId = url.searchParams.get('chatTargetId');
          const chatTgtName = url.searchParams.get('chatTargetName');

          if (accId && !isCallConnected) {
            activeCallId = accId;
            isAudioOnlyCall = isAud;
            if (await acquireCallMedia(isAudioOnlyCall)) joinCallSession();
          } else if (chatTgtId) {
            openChat(chatTgtId, chatTgtName || 'उपयोगकर्ता', true);
          }
        } catch(e) {}
      });
    }
  } catch (e) {
    console.warn('Deep link error:', e);
  }
}

async function initApp() {
  try {
    applyLanguage(currentLang);
    setupHardwareBackButton();
    setupNativePushListeners();
    checkUser();
    await triggerAutoPermissionGate();
    handleDeepLinks();
  } catch (err) {
    console.error('UI init error:', err);
  }

  setTimeout(() => checkWebOtaUpdate(false), 2500);
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initApp, { once: true });
} else {
  initApp();
}
