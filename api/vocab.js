// import { readData, saveData } from '../_utils.js';

// export default function handler(req, res) {
//   if (req.method === 'GET') {
//     const data = readData();
//     res.status(200).json({ vocab: data.vocabulary });
//   } else if (req.method === 'POST') {
//     // nếu muốn thêm từ mới
//     const { word, translation, ipa, audio } = req.body;
//     if (!word) return res.status(400).json({ error: "Missing word" });
//     const data = readData();
//     data.vocabulary.unshift({
//       word,
//       translation: translation || '',
//       ipa: ipa || '',
//       audio: audio || '',
//       timeSaved: Date.now(),
//       isLearned: false
//     });
//     saveData(data);
//     res.status(200).json({ ok: true });
//   } else {
//     res.status(405).json({ error: 'Method not allowed' });
//   }
// }
// api/vocab.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  const client = await getRedisClient();

  if (req.method === 'GET') {
    const data = await client.get('vocabList');
    const vocab = data ? JSON.parse(data) : [];
    return res.status(200).json({ vocab });
  }

  if (req.method === 'POST') {
    const { word, translation, ipa, audio } = req.body; // nhận đủ thông tin
    if (!word) return res.status(400).json({ error: "Missing word" });

    const data = await client.get('vocabList');
    const vocab = data ? JSON.parse(data) : [];

    // Kiểm tra xem từ đã có chưa
    const existing = vocab.find(v => v.word.toLowerCase() === word.toLowerCase());
    if (existing) {
      // Nếu đã có, giữ nguyên dữ liệu cũ, không overwrite
      return res.status(200).json({ status: 'exists', vocab });
    }

    // Nếu chưa có → thêm object đầy đủ
    vocab.push({
      word,
      translation: translation || '',
      ipa: ipa || '',
      audio: audio || '',
      timeSaved: Date.now(),
      isLearned: false
    });

    await client.set('vocabList', JSON.stringify(vocab));
    return res.status(200).json({ status: 'ok', vocab });
  }

  res.status(405).json({ error: 'Method not allowed' });
}


