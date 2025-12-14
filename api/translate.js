// import { readData, saveData } from "../_utils.js";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();
//   const { word } = req.query;
//   if (!word) return res.status(400).json({ error: "Missing word" });

//   try {
//     const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
//     const dictJson = await dictRes.json();

//     let englishMeaning = "", ipa = "", audio = "";
//     if (Array.isArray(dictJson)) {
//       const entry = dictJson[0];
//       englishMeaning = entry.meanings?.[0]?.definitions?.[0]?.definition || "";
//       ipa = entry.phonetics?.find(p => p.text)?.text || "";
//       audio = entry.phonetics?.find(p => p.audio)?.audio || "";
//     }

//     const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`);
//     const transJson = await transRes.json();
//     const vietnameseMeaning = transJson.responseData?.translatedText || "";

//     const data = await readData();
//     if (!data.vocabulary.find(v => v.word === word)) {
//       data.vocabulary.unshift({
//         word, translation: vietnameseMeaning, ipa, audio,
//         timeSaved: Date.now(), isLearned: false
//       });
//       await saveData(data);
//     }

//     res.json({ word, englishMeaning, vietnameseMeaning, ipa, audio });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Translate error" });
//   }
// }
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

  // 2️⃣ Gửi request lưu từ vào vocab list
  try {
    await fetch('./api/vocab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        word: data.word,
        ipa: data.ipa,
        translation: data.vietnameseMeaning,
        audio: data.audio
      })
    });
  } catch (err) {
    console.error("❌ Error saving vocab:", err);
  }

  // 3️⃣ Load lại vocab table
  loadVocabList();
});
