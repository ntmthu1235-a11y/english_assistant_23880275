import { getRedisClient } from '../../_redis.js';

export default async function handler(req, res) {
  const client = await getRedisClient();
  const { word } = req.query;

  if (!word) return res.status(400).json({ error: "Missing word" });

  if (req.method === 'DELETE') {
    try {
      // Lấy danh sách hiện tại từ Redis
      const data = await client.get('vocabList');
      const vocab = data ? JSON.parse(data) : [];

      // Lọc bỏ từ cần xóa
      const updatedVocab = vocab.filter(v => v.word.toLowerCase() !== word.toLowerCase());

      // Lưu lại vào Redis
      await client.set('vocabList', JSON.stringify(updatedVocab));

      return res.status(200).json({ ok: true, deleted: word, vocab: updatedVocab });
    } catch (err) {
      console.error("Error deleting vocab:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
