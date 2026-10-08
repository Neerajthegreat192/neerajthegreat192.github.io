// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBg1VC0cd1FmGiXTkMvFFG-eSL46FmgtZU",
  authDomain: "chess-e4910.firebaseapp.com",
  databaseURL: "https://chess-e4910-default-rtdb.firebaseio.com",
  projectId: "chess-e4910",
  storageBucket: "chess-e4910.firebasestorage.app",
  messagingSenderId: "62635884266",
  appId: "1:62635884266:web:0375748951994b26cb2193"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// ======================================================
// BACKGROUND MESSAGES & CALLS HANDLER
// ======================================================
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  // वास्तविक कॉल आईडी सत्यापन
  const rawCallId = data.callId;
  const isRealCall = rawCallId && rawCallId !== 'null' && rawCallId !== 'undefined' && String(rawCallId).trim() !== '';

  // 1. यदि इनकमिंग वीडियो/ऑडियो कॉल है
  if (isRealCall) {
    const caller = data.callerName || payload.notification?.title || 'कोई व्यक्ति';
    const callType = data.callType || (data.audioOnly === 'true' ? 'ऑडियो' : 'वीडियो');
    let targetUrl = data.url || '/';

    try {
      const url = new URL(targetUrl, self.location.origin);
      url.searchParams.set('callId', rawCallId);
      url.searchParams.set('callerName', caller);
      url.searchParams.set('callType', callType);
      url.searchParams.set('action', 'accept');
      targetUrl = url.href;
    } catch (e) {
      targetUrl = `/?callId=${encodeURIComponent(rawCallId)}&callerName=${encodeURIComponent(caller)}&action=accept`;
    }

    const notificationOptions = {
      body: `${caller} आपको ${callType} कॉल कर रहे हैं...`,
      icon: 'icon.png', // ध्यान दें: सुनिश्चित करें कि icon.png आपके रूट फोल्डर में हो
      badge: 'icon.png',
      tag: `incoming-call-${rawCallId}`,
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 250, 500, 250, 500, 250, 500, 250, 1000],
      sound: 'ringtone.mp3', // कस्टम रिंगटोन
      actions: [
        { action: 'accept_call', title: '📞 उठाएँ' },
        { action: 'reject_call', title: '❌ काटें' }
      ],
      data: {
        type: 'incoming_call',
        callerName: caller,
        callId: rawCallId,
        callType: callType,
        url: targetUrl
      }
    };

    return self.registration.showNotification(`📞 इनकमिंग ${callType} कॉल`, notificationOptions);
  }

  // 2. यदि सामान्य चैट मैसेज है
  const sender = data.callerName || data.chatTargetName || data.senderName || 'नया संदेश';
  const msgText = data.messageText || data.message || data.text || payload.notification?.body || 'आपको एक नया संदेश प्राप्त हुआ है';
  const senderId = data.chatTargetId || data.senderId || '';
  const roomId = data.roomId;
  const msgId = data.msgId;
  let chatUrl = data.url || '/';

  if (senderId) {
    try {
      const url = new URL(chatUrl, self.location.origin);
      url.searchParams.set('chatTargetId', senderId);
      url.searchParams.set('chatTargetName', sender);
      chatUrl = url.href;
    } catch (e) {
      chatUrl = `/?chatTargetId=${encodeURIComponent(senderId)}&chatTargetName=${encodeURIComponent(sender)}`;
    }
  }

  // बैकग्राउंड में मैसेज को डिलीवर मार्क करना (REST API URL FIXED)
  if (roomId && msgId) {
    fetch(`https://chess-e4910-default-rtdb.firebaseio.com/chats/${roomId}/${msgId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivered: true })
    }).catch(() => {});
  }

  const chatNotificationOptions = {
    body: msgText,
    icon: 'icon.png',
    badge: 'icon.png',
    tag: `chat_${senderId || 'general'}`,
    renotify: true,
    requireInteraction: false,
    vibrate: [150, 80, 150],
    data: {
      type: 'chat_message',
      targetId: senderId,
      senderName: sender,
      url: chatUrl
    }
  };

  return self.registration.showNotification(`💬 ${sender}`, chatNotificationOptions);
});

// ======================================================
// NOTIFICATION CLICK & ACTION BUTTONS HANDLER
// ======================================================
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;
  let targetUrl = data.url || '/';

  // 1. यदि यूज़र ने कॉल काटने (Reject) का बटन दबाया
  if (action === 'reject_call') {
    if (data.callId) {
      fetch(`https://chess-e4910-default-rtdb.firebaseio.com/calls/${data.callId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      }).catch((e) => console.log("Call reject failed", e));
    }
    return;
  }

  // 2. यदि यूज़र ने कॉल उठाने (Accept) या सीधे नोटिफ़िकेशन पर क्लिक किया
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // अगर ऐप/ब्राउज़र टैब पहले से खुला है
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if (data.type === 'incoming_call' && 'postMessage' in client) {
            client.postMessage({
              type: 'incoming_call_click',
              callId: data.callId,
              callerName: data.callerName || '',
              callType: data.callType || 'Video',
              action: action === 'accept_call' ? 'accept' : 'view'
            });
          } else if (data.type === 'chat_message' && 'postMessage' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              targetId: data.targetId,
              senderName: data.senderName
            });
          }
          return client.focus();
        }
      }

      // अगर ऐप बंद है, तो नया टैब/विंडो खोलें
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
});
