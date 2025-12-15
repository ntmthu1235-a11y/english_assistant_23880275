//api/vocab/learned.js
import { getRedisClient } from '../../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') 
    return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing word" });

  const client = await getRedisClient();

  // Lấy vocab hiện tại
  const data = await client.get('vocabList');
  const vocab = data ? JSON.parse(data) : [];

  // Tìm từ
  const item = vocab.find(v => v.word.toLowerCase() === word.toLowerCase());
  if (!item) return res.status(404).json({ error: "Word not found" });

  // Đổi trạng thái isLearned
  item.isLearned = !item.isLearned;

  // Lưu lại
  await client.set('vocabList', JSON.stringify(vocab));

  res.status(200).json({ status: "ok", word: item.word, isLearned: item.isLearned });
}
