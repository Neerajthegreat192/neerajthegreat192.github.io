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
  const rawCallId = data.callId || '';
  const type = data.type || '';
  
  // 1. अगर कॉलर ने कॉल रद्द कर दी है (CANCEL_)
  if (rawCallId.startsWith('CANCEL_')) {
    const originalCallId = rawCallId.replace('CANCEL_', '');
    return self.registration.getNotifications().then(notifications => {
      notifications.forEach(n => {
        if (n.tag === `call_${originalCallId}` || (n.data && n.data.callId === originalCallId)) {
          n.close();
        }
      });
    });
  }

  // 2. चैट मैसेज हैंडलिंग (CHAT_ प्रीफ़िक्स या सामान्य चैट)
  if (type === 'chat' || data.messageText || data.chatTargetId || rawCallId.startsWith('CHAT_')) {
    const senderId = data.chatTargetId || (rawCallId.startsWith('CHAT_') ? rawCallId.replace('CHAT_', '') : '');
    const sender = data.title || data.chatTargetName || data.callerName || data.senderName || 'नया संदेश';
    const msgText = data.body || data.messageText || 'आपको एक संदेश प्राप्त हुआ है';

    // सक्रिय टैब को रियल-टाइम अपडेट भेजना
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'NEW_CHAT_MESSAGE', senderId, senderName: sender, text: msgText });
      });
    });

    const chatOptions = {
      body: msgText,
      icon: 'icon.png',
      badge: 'icon.png',
      tag: `chat_${senderId}`,
      renotify: true,
      requireInteraction: false,
      data: { type: 'chat_click', targetId: senderId, senderName: sender }
    };
    return self.registration.showNotification(`💬 ${sender}`, chatOptions);
  }

  // 3. इनकमिंग कॉल हैंडलिंग
  if (rawCallId && rawCallId !== 'null' && rawCallId.trim() !== '') {
    let caller = data.callerName || data.title || 'इनकमिंग कॉल';
    let isAudio = data.audioOnly === 'true' || data.audioOnly === true;
    
    if (caller.endsWith('|AUDIO')) {
      isAudio = true;
      caller = caller.replace('|AUDIO', '');
    } else if (caller.endsWith('|VIDEO')) {
      caller = caller.replace('|VIDEO', '');
    }

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
