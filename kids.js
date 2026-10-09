// ==========================================
// KIDS MODULE: QUIZ & LIVE CANVAS (kids.js)
// ==========================================
import { ref, set, update, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// सुरक्षित $ हेल्पर एवं डायनामिक DB
const $ = id => document.getElementById(id);
const getDb = () => window._vc_db;

let allQuizQuestions = null;
let quizSessionUnsub = null;
let canvasSessionUnsub = null;

// --- 1. क्विज़ डेटा लोड करना (GitHub से) ---
async function fetchQuizQuestions() {
  if (allQuizQuestions) return allQuizQuestions;
  try {
    const res = await fetch('questions.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      allQuizQuestions = await res.json();
      return allQuizQuestions;
    }
  } catch(e) {
    console.warn("Quiz questions load error:", e);
  }
  return null;
}

// --- 2. नया सवाल भेजना (होस्ट द्वारा ट्रिगर) ---
window.sendQuizQuestion = async function(category = 'lkg_ukg') {
  const currentDb = getDb();
  if (!window.activeCallId || !currentDb) {
    if (window.toast) window.toast(window.currentLang === 'hi' ? 'कॉल कनेक्ट होने पर ही क्विज़ चलाएँ' : 'Start quiz during active call');
    return;
  }

  const data = await fetchQuizQuestions();
  if (!data || !data[category] || data[category].length === 0) {
    if (window.toast) window.toast('सवाल लोड नहीं हो सके!');
    return;
  }

  const list = data[category];
  const randomQ = list[Math.floor(Math.random() * list.length)];

  // Firebase पर क्विज़ स्टेट अपडेट करें (दोनों फोन पर सिंक होगा)
  const quizRef = ref(currentDb, `call_sessions/${window.activeCallId}/quiz_state`);
  await set(quizRef, {
    category,
    question: randomQ.q,
    options: randomQ.opts,
    answer: randomQ.ans,
    selectedAnswer: null,
    isCorrect: null,
    updatedAt: Date.now()
  });
};

// --- 3. क्विज़ का लाइव लिसनर (दोनों फ़ोनों के लिए) ---
window.initKidsQuizListener = function() {
  const currentDb = getDb();
  if (!window.activeCallId || !currentDb) return;
  if (quizSessionUnsub) quizSessionUnsub();

  const quizRef = ref(currentDb, `call_sessions/${window.activeCallId}/quiz_state`);
  quizSessionUnsub = onValue(quizRef, snap => {
    const qState = snap.val();
    const box = $('kidsQuizBox');
    if (!box) return;

    if (!qState || !qState.question) {
      box.hidden = true;
      return;
    }

    box.hidden = false;
    const qText = $('quizQuestionText');
    if (qText) qText.textContent = qState.question;
    const optsArea = $('quizOptionsArea');
    if (!optsArea) return;
    optsArea.innerHTML = '';

    qState.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.textContent = opt;

      // अगर किसी ने जवाब चुन लिया हो
      if (qState.selectedAnswer) {
        if (opt === qState.answer) {
          btn.style.background = '#10b981'; // सही जवाब हरा
          btn.style.color = '#fff';
        } else if (opt === qState.selectedAnswer && !qState.isCorrect) {
          btn.style.background = '#ef4444'; // गलत जवाब लाल
          btn.style.color = '#fff';
        }
        btn.disabled = true;
      }

      btn.onclick = () => {
        const isRight = (opt === qState.answer);
        if (isRight && typeof window.playMessageTickSound === 'function') {
          window.playMessageTickSound();
        }
        update(quizRef, {
          selectedAnswer: opt,
          isCorrect: isRight
        });
      };
      optsArea.appendChild(btn);
    });
  });
};

// --- 4. क्विज़ बंद करना ---
window.closeKidsQuiz = async function() {
  const currentDb = getDb();
  if (window.activeCallId && currentDb) {
    await remove(ref(currentDb, `call_sessions/${window.activeCallId}/quiz_state`)).catch(()=>{});
  }
  const box = $('kidsQuizBox');
  if (box) box.hidden = true;
};

// ==========================================
// LIVE CANVAS / WHITEBOARD ENGINE
// ==========================================
let isDrawing = false;
let currentColor = '#10b981';
let currentLineWidth = 4;
let canvasEl = null;
let ctx = null;
let canvasEventsAttached = false;

window.initLiveCanvas = function() {
  canvasEl = $('kidsWhiteboardCanvas');
  if (!canvasEl) return;
  ctx = canvasEl.getContext('2d');

  function resizeCanvas() {
    canvasEl.width = canvasEl.offsetWidth || window.innerWidth;
    canvasEl.height = canvasEl.offsetHeight || (window.innerHeight - 80);
  }
  setTimeout(resizeCanvas, 50);

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
};

function getCanvasPoint(e) {
  if (!canvasEl) return { x: 0, y: 0 };
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) / rect.width,
    y: (e.clientY - rect.top) / rect.height
  };
}

// पॉइंट को Firebase पर ब्रॉडकास्ट करना
function broadcastDrawPoint(x, y, action) {
  const currentDb = getDb();
  if (!window.activeCallId || !currentDb) return;
  const drawRef = ref(currentDb, `call_sessions/${window.activeCallId}/canvas_draw`);
  set(drawRef, {
    x, y,
    action,
    color: currentColor,
    size: currentLineWidth,
    sender: window.myUserId,
    ts: Date.now()
  });
}

// सामने वाले के ड्रॉइंग पॉइंट्स को स्क्रीन पर रेंडर करना
function listenRemoteCanvas() {
  const currentDb = getDb();
  if (!window.activeCallId || !currentDb) return;
  if (canvasSessionUnsub) canvasSessionUnsub();

  const drawRef = ref(currentDb, `call_sessions/${window.activeCallId}/canvas_draw`);
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

// कैनवस साफ़ करना
window.clearLiveCanvas = function() {
  if (ctx && canvasEl) {
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }
  const currentDb = getDb();
  if (window.activeCallId && currentDb) {
    set(ref(currentDb, `call_sessions/${window.activeCallId}/canvas_draw`), {
      action: 'clear',
      ts: Date.now()
    });
  }
};

window.setCanvasColor = function(color) {
  currentColor = color;
};

// कॉल समाप्त होने पर क्लीनअप
window.cleanupKidsModules = function() {
  if (quizSessionUnsub) { quizSessionUnsub(); quizSessionUnsub = null; }
  if (canvasSessionUnsub) { canvasSessionUnsub(); canvasSessionUnsub = null; }
  const box = $('kidsQuizBox');
  if (box) box.hidden = true;
  const wb = $('kidsWhiteboardModal');
  if (wb) wb.hidden = true;
};
