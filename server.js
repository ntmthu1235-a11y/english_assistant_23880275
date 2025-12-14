require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { OpenAI } = require("openai");

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const DATA_FILE = './data.json';

// ---------- Helper đọc/ghi data ----------
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const init = { messages: [], vocabulary: [], stats: { totalConversations: 0, pronunciationScores: [] } };
    fs.writeFileSync(DATA_FILE, JSON.stringify(init, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ---------- Routes ----------

// Chat AI
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a friendly English speaking assistant." },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    const data = readData();
    data.messages.push({ user: message, ai: reply, time: new Date().toISOString() });
    data.stats.totalConversations += 1;
    saveData(data);

    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "OpenAI API error" });
  }
});

// ---------- Translate + IPA + Audio ----------
app.get('/translate', async (req, res) => {
  const { word } = req.query;
  if (!word) return res.status(400).json({ error: "Missing word" });

  try {
    // 1) Lấy thông tin phát âm + audio
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;
    const response = await fetch(url);
    const json = await response.json();

    let englishMeaning = "";
    let ipa = "";
    let audio = "";

    if (Array.isArray(json)) {
      const entry = json[0];
      englishMeaning = entry.meanings?.[0]?.definitions?.[0]?.definition || "";
      ipa = entry.phonetics?.find(p => p.text)?.text || "";
      audio = entry.phonetics?.find(p => p.audio)?.audio || "";
    }

    // 2) ⭐ Dịch trực tiếp từ "word" sang tiếng Việt
    const transRes = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`
    );
    const transText = await transRes.text();

    if (transText.startsWith("<")) {
      console.log("MyMemory API trả về HTML → fallback Google");
      throw new Error("HTML response");
    }

const transJson = JSON.parse(transText);

    const vietnameseMeaning = transJson.responseData?.translatedText || "";

    // ---- LƯU FILE: chỉ lưu nghĩa tiếng Việt ----
    const data = readData();

    if (!data.vocabulary.find(v => v.word === word)) {
      data.vocabulary.unshift({
        word,
        translation: vietnameseMeaning,  // chỉ lưu nghĩa tiếng Việt
        ipa,
        audio,
        timeSaved: Date.now(),
        isLearned: false
      });
      saveData(data);
    }

    // ---- TRẢ VỀ POPUP ----
    return res.json({
      word,
      englishMeaning,      // để hiển thị lên popup
      vietnameseMeaning,   // nghĩa việt
      ipa,
      audio
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translate error" });
  }
});


// Pronunciation mock
app.post('/pronounce', (req, res) => {
  const { text, userPronounce } = req.body;
  if (!text || !userPronounce) return res.status(400).json({ error: "Missing parameters" });

  const words = text.toLowerCase().split(" ");
  const user = userPronounce.toLowerCase().split(" ");
  const correct = words.filter(w => user.includes(w)).length;
  const score = Math.round((correct / words.length) * 100);

  const data = readData();
  data.stats.pronunciationScores.push({ text, userPronounce, score, time: new Date().toISOString() });
  saveData(data);

  res.json({ score, text, userPronounce });
});

// Get vocab
app.get('/vocab', (req, res) => {
  const data = readData();
  res.json({ vocab: data.vocabulary });
});

// Get messages
app.get('/messages', (req, res) => {
  const data = readData();
  res.json({ messages: data.messages });
});


// ---------- Session END (GHI THỜI GIAN HỌC) ----------
app.post('/session/end', (req, res) => {
  try {
    console.log("📩 RAW BODY RECEIVED:", req.body);

    const { start, end } = req.body;

    if (!start || !end) {
      console.log("❌ Missing start or end");
      return res.status(400).json({ error: "Missing start or end" });
    }

    // Tính thời gian học
    const durationSeconds = Math.floor(
      (new Date(end) - new Date(start)) / 1000
    );

    console.log("⏱ SESSION DURATION:", durationSeconds, "seconds");

    const data = readData();

    if (!data.sessionStats) data.sessionStats = [];
    if (!data.dailyStudyTime) data.dailyStudyTime = {};

    // YYYY-MM-DD
    const dayKey = start.slice(0, 10);

    // Lưu từng session
    data.sessionStats.push({
      start,
      end,
      durationSeconds
    });

    // Cộng dồn theo ngày
    data.dailyStudyTime[dayKey] =
      (data.dailyStudyTime[dayKey] || 0) + durationSeconds;

    saveData(data);

    console.log("💾 SAVED TO FILE:", {
      day: dayKey,
      todaySeconds: data.dailyStudyTime[dayKey]
    });

    res.json({
      ok: true,
      durationSeconds,
      day: dayKey,
      totalTodaySeconds: data.dailyStudyTime[dayKey]
    });

  } catch (err) {
    console.error("❌ Error saving session:", err);
    res.status(500).json({ error: "Server error" });
  }
});




app.post('/vocab/learned', (req, res) => {
  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing word" });

  const data = readData();
  const item = data.vocabulary.find(v => v.word === word);

  if (item) {
    // 🔁 Toggle trạng thái học
    item.isLearned = !item.isLearned;
    saveData(data);

    return res.json({
      status: "ok",
      word,
      isLearned: item.isLearned
    });
  }

  res.status(404).json({ error: "Word not found" });
});


app.delete('/vocab/:word', (req, res) => {
  const word = req.params.word.toLowerCase();
  const data = readData();

  data.vocabulary = data.vocabulary.filter(v => v.word.toLowerCase() !== word);

  saveData(data);

  res.json({ ok: true, deleted: word });
});

app.get('/stats/daily-study', (req, res) => {
  const range = parseInt(req.query.range || "7");
  const data = readData();
  const daily = data.dailyStudyTime || {};

  const today = new Date();
  let days = [];
  let hours = [];

  for (let i = range - 1; i >= 0; i--) {
    let d = new Date(today);
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0, 10);
    const seconds = daily[key] || 0;

    days.push(key.slice(5));               
    hours.push((seconds / 3600).toFixed(2)); 
  }

  res.json({ days, hours });
});


app.post('/stats/add', (req, res) => {
  const { duration } = req.body;

  const data = readData();
  data.sessionStats.push({
    duration,
    time: Date.now()
  });

  saveData(data);
  res.json({ ok: true });
});

app.get('/stats', (req, res) => {
  const data = readData();
  res.json({
    stats: data.stats,             // tổng hội thoại
    sessionStats: data.sessionStats,
    dailyStudyTime: data.dailyStudyTime
  });
});


app.post('/chat-grammar', async (req, res) => {
  const userText = req.body.text;

  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You analyze grammar AND continue the conversation.
Always respond ONLY with valid JSON (no markdown, no commentary):

{
  "grammar": {
    "errors": [],
    "explanation": "",
    "suggestion": ""
  },
  "reply": ""
}`
        },
        { role: "user", content: userText }
      ]
    });

    let raw = result.choices[0].message.content.trim();

    if (raw.startsWith("```")) {
      raw = raw.replace(/```json/i, "").replace(/```/g, "").trim();
    }

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parse error:", err);
      console.error("AI returned:", raw);

      json = {
        grammar: {
          errors: ["Could not parse AI grammar response."],
          explanation: "AI returned invalid JSON.",
          suggestion: userText
        },
        reply: "Sorry, I could not analyze grammar this time."
      };
    }

    if (Array.isArray(json.grammar.errors)) {
  json.grammar.errors = json.grammar.errors.map(e => {
    if (typeof e === "string") return e;
    if (typeof e === "object") {
      // Nếu có cả error và correction → gộp lại thành câu ngắn
      if (e.error && e.correction) {
        return `Use "${e.correction}" instead of "${e.error}".`;
      }
      // Nếu chỉ có 1 trong 2 thì fallback
      return e.error || e.message || JSON.stringify(e);
    }
    return String(e);
  });
  }

    res.json(json);

  } catch (e) {
    console.error("🔥 /chat-grammar internal ERROR:", e);

    res.status(500).json({
      grammar: {
        errors: ["Server Error"],
        explanation: "Internal server error during grammar analysis.",
        suggestion: userText
      },
      reply: "Sorry, something went wrong on the server."
    });
  }
});







app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
