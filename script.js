// ===== CONFIG =====
const backend = "";

/* =============================================
   AUTO LISTEN (MICROPHONE)
============================================= */
let autoListen = true;
let isAIReading = false;
let isListening = false;

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = false;
recognition.interimResults = true;

recognition.onresult = (e) => {
  const result = e.results[0];
  if(result.isFinal) sendMessage(result[0].transcript);
};
recognition.onend = () => { if(autoListen && !isAIReading) recognition.start(); };

/* =============================================
   ADD CHAT MESSAGE TO UI
============================================= */
function addMessage(text, sender) {
  const row = document.createElement("div");
  row.className = "messageRow";
  const isAI = sender === "ai";

  // 🌟 Danh sách cụm từ cố định
  const phrases = [
    "of course",
    "take care",
    "thank you",
    "by the way",
    "in fact",
    "as soon as possible",
    "good morning",
    "good night"
  ];

  // 🌟 Danh sách contraction phổ biến
  const contractions = {
    "i'd": "I would / I had",
    "i'm": "I am",
    "i've": "I have",
    "you're": "you are",
    "you've": "you have",
    "you'd": "you would / you had",
    "he's": "he is / he has",
    "she's": "she is / she has",
    "it's": "it is / it has",
    "we're": "we are",
    "we've": "we have",
    "we'd": "we would / we had",
    "they're": "they are",
    "they've": "they have",
    "they'd": "they would / they had",
    "don't": "do not",
    "doesn't": "does not",
    "can't": "cannot",
    "won't": "will not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "shouldn't": "should not",
    "wouldn't": "would not",
    "couldn't": "could not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "let's": "let us"
  };

  // 🌟 Thay cụm bằng placeholder để tránh split sai
  let content = text;
  const phraseSpans = [];
  phrases.forEach(p => {
    const regex = new RegExp(`\\b${p}\\b`, "gi");
    content = content.replace(regex, match => {
      const id = `__PHRASE_${phraseSpans.length}__`;
      phraseSpans.push({ id, phrase: match });
      return id;
    });
  });

  // 🌟 Tạo HTML từng từ
  const words = content.split(" ").map(w => {
    const foundPhrase = phraseSpans.find(p => w.includes(p.id));
    if (foundPhrase) {
      // cụm cố định
      return `<span class="word phrase highlight" data-word="${foundPhrase.phrase.toLowerCase()}">
        ${foundPhrase.phrase}
        <div class="wordPopup"></div>
      </span>`;
    }

    const clean = w.replace(/[.,!?]/g, "").toLowerCase();

    // contraction → giữ nguyên, không popup, không gạch chân
    if (contractions[clean]) {
      return `<span class="word contraction">${w}</span>`;
    }

    // từ thường → highlight + popup nghĩa
    if (clean) {
      return `<span class="word highlight" data-word="${clean}">
        ${w}
        <div class="wordPopup"></div>
      </span>`;
    }

    return w;
  });

  // 🌟 Gắn vào giao diện
  row.innerHTML = `
    ${isAI ? `<img class="avatar" src="images/avtAI.png">` : ""}
    <div class="msgBubble ${isAI ? "aiMsg" : "userMsg"}">
      ${words.join(" ")}
      ${isAI ? `<button class="ttsBtn" onclick="speakAI(this)">🔊</button>` : ""}
    </div>
    ${sender === "user" ? `<img class="avatar" src="images/avtuser.png">` : ""}
  `;

  document.querySelector("#chatContainer").appendChild(row);
  setTimeout(() => row.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
}


/* =============================================
   SEND MESSAGE TO BACKEND (GRAMMAR + REPLY)
============================================= */

async function sendMessage(text) {
  if (!text.trim()) return;

  // Hiển thị tin nhắn user
  addMessage(text, "user");
  document.getElementById("chatInput").value = "";

  // Gửi request lên backend
  const res = await fetch("./api/chat-grammar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  const data = await res.json();

  // ================================
  // 🔥 1) GRAMMAR FEEDBACK (nếu có lỗi)
  // ================================
  if (data.grammar && Array.isArray(data.grammar.errors) && data.grammar.errors.length > 0) {

    // Format lỗi thành danh sách
    const errorList = data.grammar.errors
    .map(e => `• ${typeof e === "string" ? e : e.message || JSON.stringify(e)}<br>`)
    .join("");


    addMessage(`
      <b>🌟 Grammar Check</b><br><br>

      ❌ <b>Errors:</b><br>
      ${errorList}<br>

      📝 <b>Explanation:</b><br>
      ${data.grammar.explanation || "—"}<br><br>

      ✔️ <b>Corrected Sentence:</b><br>
      ${data.grammar.suggestion || "—"}
    `, "ai");
  }

  // ================================
  // 🔥 2) AI REPLY HỘI THOẠI
  // ================================
  addMessage(data.reply, "ai");
  speak(data.reply);
}


document.getElementById("sendBtn").onclick = ()=>{
  sendMessage(document.getElementById("chatInput").value);
};
const msgInput = document.getElementById("chatInput");

//----Nhấn enter gửi message-----
msgInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const t = msgInput.value.trim();
    if (!t) return;
    sendMessage(t);
    msgInput.value = "";
  }
});
/* =============================================
   TTS – NORMAL AI SPEAK
============================================= */
function speak(text) {
  if (!text) return;

  isAIReading = true;    // <-- BẬT FLAG NGAY LẬP TỨC
  recognition.stop();    // <-- Ngắt mic NGAY LẬP TỨC
  speechSynthesis.cancel();

  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";

    u.onstart = () => {
      isAIReading = true;
    };

    u.onend = () => {
      isAIReading = false;
      if (autoListen) recognition.start();
    };

    speechSynthesis.speak(u);
  }, 150);  // <-- Chrome cần 100–150ms, bạn đang bị thiếu
}


/* =============================================
   AI TTS BUTTON 🔊 INSIDE BUBBLE
============================================= */
function speakAI(btn) {
  document.querySelectorAll(".wordPopup").forEach(p => p.style.display = "none");

  const bubble = btn.parentElement;
  const text = bubble.innerText.replace("🔊", "").trim();

  isAIReading = true;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.onend = () => { isAIReading = false; };
  speechSynthesis.speak(u);
}

/* =============================================
   MIC BUTTON LOGIC
============================================= */
const micBtn = document.getElementById("micBtn");

// trạng thái 
   isListening = false;
   isAIReading = false; // nếu AI đang đọc thì chặn mic

// SAFE: start/stop của SpeechRecognition thường không trả về Promise,
// nên không dùng await để tránh lỗi. Dùng try/catch quanh start/stop.
micBtn.addEventListener("click", () => {
  // Nếu AI đang đọc -> không cho bật mic
  if (isAIReading) {
    // Nếu đang lắng nghe mà AI vừa bật đọc -> dừng luôn
    if (isListening) {
      try { recognition.stop(); } catch (e) {}
      isListening = false;
      micBtn.classList.remove("activeMic");
    }
    return;
  }

  // Nếu đang lắng nghe -> dừng
  if (isListening) {
    try {
      recognition.stop();
    } catch (err) {
      console.warn("recognition.stop() error:", err);
    }
    isListening = false;
    micBtn.classList.remove("activeMic");
    return;
  }

  // Nếu chưa lắng nghe -> bắt đầu
  try {
    // start() thường sync (không phải Promise). Nếu browser ném lỗi, catch sẽ bắt.
    recognition.start();
    isListening = true;
    micBtn.classList.add("activeMic");
  } catch (err) {
    console.error("Mic start error:", err);
    isListening = false;
    micBtn.classList.remove("activeMic");
  }
});

// Khi recognition tự kết thúc (ví dụ user im lặng) -> cập nhật UI
recognition.onend = () => {
  if (isListening) {
    isListening = false;
    micBtn.classList.remove("activeMic");
  }
};

// Khi bắt được kết quả (bạn xử lý ở onresult riêng)
recognition.onstart = () => {
  // đảm bảo trạng thái đồng bộ
  isListening = true;
  micBtn.classList.add("activeMic");
};
recognition.onerror = (e) => {
  console.warn("recognition error:", e);
  isListening = false;
  micBtn.classList.remove("activeMic");
};

/* =============================================
   CLICK WORD → TRANSLATE POPUP (GLOBAL POPUP)
============================================= */
const globalPopup = document.getElementById("globalWordPopup");

// Play IPA without closing popup

document.body.addEventListener("click", e => {
  const btn = e.target.closest(".playIPA");
  if (btn) {
    e.stopPropagation();
    new Audio(btn.dataset.audio).play();
    return;
  }
});

document.body.addEventListener("click", async e => {
  if (isAIReading) return;
  if (e.target.closest(".playIPA")) return;
  if (e.target.closest("#globalWordPopup")) return;

  const wordEl = e.target.closest(".word");
  if (!wordEl) {
    globalPopup.style.display = "none";
    return;
  }

  const word = wordEl.dataset.word.toLowerCase();
  if(!word) return;

  // 1️⃣ Lấy nghĩa 
  const res = await fetch(`./api/translate?word=${word}`);
  const data = await res.json();

  globalPopup.innerHTML = `
    <strong>${data.word}</strong><br>
    <span style="color:#7cdfff">🇺🇸:</span><br>${data.englishMeaning || "—"}<br>
    <span style="color:#7cff94">🇻🇳:</span><br>${data.vietnameseMeaning || "—"}<br>
    <span style="color:#ff7a7a">IPA:</span> <em>${data.ipa || ""}</em><br><br>
    ${data.audio ? `<button class="playIPA" data-audio="${data.audio}">🔊 Play</button>` : ""}
  `;

  globalPopup.style.display = "block";

   
  // ---------------------------------------------------
  // 🔥 AUTO-POSITION KHÔNG BỊ CHE
  // ---------------------------------------------------
  const rect = wordEl.getBoundingClientRect();
  const popupRect = globalPopup.getBoundingClientRect();

  const headerHeight = 70;     // chiều cao header
  const inputBarHeight = 60;   // chiều cao inputBar

  // vị trí phía trên
  const topAbove = rect.top - popupRect.height - 10;

  // vị trí phía dưới
  const topBelow = rect.bottom + 10;

  // --- Ưu tiên đặt phía trên ---
  if (topAbove > headerHeight) {
    globalPopup.style.top = topAbove + "px";
  }

  // --- Nếu trên không đủ chỗ → đặt xuống ---
  else if (topBelow < window.innerHeight - inputBarHeight) {
    globalPopup.style.top = topBelow + "px";
  }

  // --- Nếu cả hai đều không đủ → đặt giữa màn hình ---
  else {
    globalPopup.style.top = (window.innerHeight - popupRect.height) / 2 + "px";
  }

  // căn trái theo từ
  globalPopup.style.left = rect.left + "px";



  // Lấy danh sách từ hiện có trong vocab table
const existingWords = Array.from(document.querySelectorAll('#vocabTbody .learnedChk'))
  .map(chk => chk.dataset.word.toLowerCase());



// Nếu từ chưa có → lưu
if (!existingWords.includes(data.word.toLowerCase())) {
  try {
    await fetch('./api/vocab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      word: data.word,
      ipa: data.ipa || "",
      translation: data.vietnameseMeaning || "",
      audio: data.audio || "",
      isLearned: false,
      timeSaved: Date.now()
    })
  });
  } catch (err) {
    console.error("❌ Error saving vocab:", err);
  }
} else {
  console.log(`"${data.word}" already exists in vocab list, skipping save.`);
}


  loadVocabList();
});

/* =============================================
   VOCAB MODAL (TABLE) 
============================================= */
const vocabModal = document.getElementById('vocabModal');
const vocabTbody = document.getElementById('vocabTbody');

document.getElementById('openVocabBtn').onclick = () => {
  vocabModal.style.display = 'flex';
  loadVocabList();
};

document.getElementById('closeVocab').onclick = () => {
  vocabModal.style.display = 'none';
};


// async function loadVocabList() {
//   const res = await fetch('./api/vocab');
//   const data = await res.json();

//   // đảm bảo data.vocab là mảng
//   const vocabArray = Array.isArray(data.vocab) ? data.vocab : [];

//   const sorted = [...vocabArray].sort((a, b) => b.timeSaved - a.timeSaved);

//   vocabTbody.innerHTML = '';
//   if (sorted.length === 0) {
//     vocabTbody.innerHTML = '<tr><td colspan="6">No saved words yet.</td></tr>';
//     return;
//   }

//   for (const v of sorted) {
//     const tr = document.createElement('tr');
//     tr.innerHTML = `
//       <td><strong>${v.word}</strong><div style="font-size:12px;color:#666">Saved: ${new Date(v.timeSaved).toLocaleString()}</div></td>
//       <td><em>${v.ipa || ''}</em></td>
//       <td>${v.translation || ''}</td>
//       <td>${v.audio ? '<button class="smallBtn playBtn" data-audio="'+v.audio+'">🔊 Play</button>' : '—'}</td>
//       <td><input type="checkbox" class="learnedChk" data-word="${v.word}" ${v.isLearned? 'checked':''}></td>
//       <td class="vocabActions">
//         <button class="smallBtn delBtn" data-word="${v.word}">Delete</button>
//       </td>
//     `;
//     vocabTbody.appendChild(tr);

//   }

//   document.querySelectorAll('.delBtn').forEach(btn =>
//   btn.addEventListener('click', async (e) => {
//     const word = e.currentTarget.dataset.word;
//     try {
//       await fetch(`./api/vocab/${word}`, { method: 'DELETE' });
//       loadVocabList(); // reload sau khi xóa
//     } catch(err) {
//       console.error('❌ Error deleting vocab:', err);
//     }
//   })
// );


//   document.querySelectorAll('.learnedChk').forEach(chk =>
//     chk.addEventListener('change', async (e) => {
//       const word = e.currentTarget.dataset.word;

//       try {
//         const res = await fetch('./api/vocab/learned', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ word })
//         });

//         const data = await res.json();
//         if (data.status === "ok") {
//           e.currentTarget.checked = data.isLearned;
//           const row = e.currentTarget.closest(".vocab-item");
//           if (row) row.classList.toggle("learned", data.isLearned);
//         } else {
//           console.error("Server error:", data.error);
//         }
//       } catch (err) {
//         console.error("Network error:", err);
//       }
//     })
//   );
// }

async function loadVocabList() {
  const res = await fetch('./api/vocab');
  const data = await res.json();

  const vocabArray = Array.isArray(data.vocab) ? data.vocab : [];
  const sorted = [...vocabArray].sort((a, b) => b.timeSaved - a.timeSaved);

  vocabTbody.innerHTML = '';
  if (sorted.length === 0) {
    vocabTbody.innerHTML = '<tr><td colspan="6">No saved words yet.</td></tr>';
    return;
  }

  for (const v of sorted) {
    const tr = document.createElement('tr');
    tr.classList.add('vocab-item'); // quan trọng cho checkbox toggle
    tr.innerHTML = `
      <td><strong>${v.word}</strong><div style="font-size:12px;color:#666">Saved: ${new Date(v.timeSaved).toLocaleString()}</div></td>
      <td><em>${v.ipa || ''}</em></td>
      <td>${v.translation || ''}</td>
      <td>${v.audio ? '<button class="smallBtn playBtn" data-audio="'+v.audio+'">🔊 Play</button>' : '—'}</td>
      <td><input type="checkbox" class="learnedChk" data-word="${v.word}" ${v.isLearned ? 'checked' : ''}></td>
      <td class="vocabActions">
        <button class="smallBtn delBtn" data-word="${v.word}">Delete</button>
      </td>
    `;
    vocabTbody.appendChild(tr);
  }
}

// --- Event delegation cho delete + play audio + checkbox learned ---
vocabTbody.addEventListener('click', async (e) => {
  const playBtn = e.target.closest('.playBtn');
  if (playBtn) {
    const url = playBtn.dataset.audio;
    if (url) new Audio(url).play();
    return;
  }

  const delBtn = e.target.closest('.delBtn');
  if (delBtn) {
    const word = delBtn.dataset.word;
    try {
      await fetch(`./api/vocab/${word}`, { method: 'DELETE' });
      loadVocabList(); // reload sau khi xóa
    } catch(err) {
      console.error('❌ Error deleting vocab:', err);
    }
    return;
  }

  const chk = e.target.closest('.learnedChk');
  if (chk) {
    const word = chk.dataset.word;
    try {
      const res = await fetch('./api/vocab/learned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word })
      });
      const data = await res.json();
      if (data.status === "ok") {
        chk.checked = data.isLearned;
        chk.closest(".vocab-item")?.classList.toggle("learned", data.isLearned);
      } else {
        console.error("Server error:", data.error);
      }
    } catch(err) {
      console.error('Network error:', err);
    }
    return;
  }
});



/* Close modal when click outside */
vocabModal.addEventListener('click', (e)=>{
  if(e.target === e.currentTarget) vocabModal.style.display='none';
});


/* =============================================
   CLOSE ALL SMALL POPUPS WHEN CLICK OUTSIDE
============================================= */
document.addEventListener("click", () => {
  document.querySelectorAll(".wordPopup").forEach(p => p.style.display = "none");
});

let chart;

// -------- LOAD DASHBOARD --------
async function loadDashboard(range = 7) {
  // Load daily study (hours)
  const res = await fetch(`./api/stats-daily-study${range === 30 ? "?range=30" : ""}`);
  const study = await res.json();

  // Load full stats
  const statsRes = await fetch(`./api/stats`);
  const fullStats = await statsRes.json();

  const sessionStats = fullStats.sessionStats ?? [];
  const daily = fullStats.dailyStudyTime ?? {};   // seconds

  // ===== CALCULATE STREAK =====
  let streak = 0;
  let today = new Date();

  while (true) {
    const key = today.toISOString().slice(0, 10);

    // nếu ngày có học > 0 giây → tính streak
    if (daily[key] && daily[key] > 0) {
      streak++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }

  document.getElementById("streakValue").textContent = streak;
  document.getElementById("sessionCount").textContent = sessionStats.length;

  // ===== TOTAL HOURS =====
  const totalSeconds = Object.values(daily).reduce((a, b) => a + b, 0);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  document.getElementById("totalHours").textContent = totalHours;

  // ===== DRAW CHART =====
  if (chart) chart.destroy();

  const ctx = document.getElementById("studyChart");

  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: study.days,   // MM-DD
      datasets: [{
        label: `Study Time (${range} days)`,
        data: study.hours,  // hours (string)
        borderRadius: 8
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Hours" }
        }
      }
    }
  });
}
/* =============================================
   SESSION TRACKING — TÍNH GIỜ HỌC
============================================= */

// Bắt đầu session khi mở trang
const sessionStart = new Date().toISOString();
console.log("🚀 Session started at:", sessionStart);

// Gửi khi đóng tab
window.addEventListener("beforeunload", () => {
  const sessionEnd = new Date().toISOString();
  console.log("🔚 Session ending at:", sessionEnd);

  const payload = {
    start: sessionStart,
    end: sessionEnd
  };

  console.log("📤 Sending session data:", payload);

  fetch("./api/session-end", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    keepalive: true,
    body: JSON.stringify(payload)
  }).then(res => {
    console.log("📥 Server response:", res);
  }).catch(err => {
    console.error("❌ Error sending session:", err);
  });
});



// --------- RANGE BUTTON EVENTS ---------
document.getElementById("btn7").onclick = () => {
  document.getElementById("btn7").classList.add("active");
  document.getElementById("btn30").classList.remove("active");
  loadDashboard(7);
};

document.getElementById("btn30").onclick = () => {
  document.getElementById("btn30").classList.add("active");
  document.getElementById("btn7").classList.remove("active");
  loadDashboard(30);
};

// Load when opening modal
document.getElementById("openDashBtn").onclick = () => {
  document.getElementById("dashModal").style.display = "flex";
  loadDashboard(7);
};

document.getElementById("closeDash").onclick = () => {
  document.getElementById("dashModal").style.display = "none";
};


