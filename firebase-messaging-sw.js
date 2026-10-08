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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const type = data.type || '';
  
  // 1. चैट मैसेज हैंडलिंग
  if (type === 'chat' || data.messageText || data.chatTargetId) {
    const sender = data.title || data.chatTargetName || data.senderName || 'नया संदेश';
    const msgText = data.body || data.messageText || 'आपको एक संदेश प्राप्त हुआ है';
    const senderId = data.chatTargetId || '';

    // मैसेज को डिलीवर मार्क करना
    if (data.roomId && data.msgId) {
      fetch(`https://chess-e4910-default-rtdb.firebaseio.com/chats/${data.roomId}/messages/${data.msgId}.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered: true })
      }).catch(() => {});
    }

    // एक्टिव टैब को रियल-टाइम अपडेट के लिए मैसेज भेजना
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'NEW_CHAT_MESSAGE', senderId, senderName: sender, text: msgText });
      });
    });

    const chatOptions = {
      body: msgText,
      icon: 'icon.png', // ध्यान दें: चैट के लिए सामान्य आइकॉन
      badge: 'icon.png',
      tag: `chat_${senderId}`,
      renotify: true,
      requireInteraction: false,
      data: { type: 'chat_click', targetId: senderId, senderName: sender }
    };
    return self.registration.showNotification(`💬 ${sender}`, chatOptions);
  }

  // 2. कॉल हैंडलिंग (ब्राउज़र के लिए)
  const rawCallId = data.callId;
  if (rawCallId && rawCallId !== 'null' && rawCallId.trim() !== '') {
    const caller = data.callerName || 'इनकमिंग कॉल';
    const isAudio = data.audioOnly === 'true' || data.audioOnly === true;
    const callLabel = isAudio ? 'ऑडियो' : 'वीडियो';
    
    const callOptions = {
      body: `${caller} आपको ${callLabel} कॉल कर रहे हैं...`,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: `call_${rawCallId}`,
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'accept_call', title: '✅ ACCEPT' },
        { action: 'reject_call', title: '❌ REJECT' }
      ],
      data: { type: 'call_click', callId: rawCallId, callerName: caller, isAudio }
    };
    return self.registration.showNotification(`📞 ${callLabel} कॉल`, callOptions);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action;

  if (action === 'reject_call' && data.callId) {
    fetch(`https://chess-e4910-default-rtdb.firebaseio.com/call_sessions/${data.callId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' })
    }).catch(() => {});
    return;
  }

  // ऐप को फोकस करना या खोलना और डीप-लिंक भेजना
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.focus();
          if (data.type === 'chat_click') {
            client.postMessage({ type: 'OPEN_CHAT', targetId: data.targetId, senderName: data.senderName });
          } else if (data.type === 'call_click' || action === 'accept_call') {
            client.postMessage({ type: 'ACCEPT_CALL', callId: data.callId, isAudio: data.isAudio });
          }
          return;
        }
      }
      
      // अगर ऐप बंद है, तो URL में पैरामीटर लगाकर खोलें
      let targetUrl = self.location.origin + '/';
      if (data.type === 'chat_click') {
        targetUrl += `?chatTargetId=${data.targetId}&chatTargetName=${encodeURIComponent(data.senderName)}`;
      } else if (data.type === 'call_click' || action === 'accept_call') {
        targetUrl += `?acceptCallId=${data.callId}&isAudio=${data.isAudio}`;
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
