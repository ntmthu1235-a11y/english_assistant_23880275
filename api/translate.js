//translate.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.query;
  if (!word) return res.status(400).json({ error: 'Missing word' });

  try {
    // 1️⃣ Lấy từ điển tiếng Anh
    const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const dictJson = await dictRes.json();

    let englishMeaning = '', ipa = '', audio = '';
    if (Array.isArray(dictJson) && dictJson.length > 0) {
      const entry = dictJson[0];

      // safe phonetics
      const phoneticsArray = Array.isArray(entry.phonetics) ? entry.phonetics : [];
      ipa = phoneticsArray.find(p => p.text)?.text || '';
      audio = phoneticsArray.find(p => p.audio)?.audio || '';

      // safe meaning
      englishMeaning = Array.isArray(entry.meanings) && entry.meanings.length > 0
        ? entry.meanings[0].definitions?.[0]?.definition || ''
        : '';
    }

    // 2️⃣ Dịch sang tiếng Việt
    const transRes = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`);
    const transJson = await transRes.json();
    const vietnameseMeaning = transJson.responseData?.translatedText || '';

    // 3️⃣ Lưu vào Redis vocab
    const client = await getRedisClient();
    const rawVocab = await client.get('vocabList');
    const vocab = rawVocab ? JSON.parse(rawVocab) : [];

    const exists = vocab.find(v => v.word.toLowerCase() === word.toLowerCase());
    if (!exists) {
      vocab.push({
        word,
        translation: vietnameseMeaning,
        ipa,
        audio,
        timeSaved: Date.now(),
        isLearned: false
      });
      await client.set('vocabList', JSON.stringify(vocab));
    }

    // 4️⃣ Trả dữ liệu về frontend (luôn đầy đủ)
    res.status(200).json({
      word,
      englishMeaning,
      vietnameseMeaning,
      ipa,
      audio
    });

  } catch (err) {
    console.error('❌ /api/translate error:', err);

    // trả mặc định để popup vẫn hiển thị
    res.status(200).json({
      word: word || '',
      englishMeaning: '',
      vietnameseMeaning: '',
      ipa: '',
      audio: ''
    });
  }
}
