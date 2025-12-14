import { readData, saveData } from '../../_utils.js';

export default function handler(req, res) {
  if (req.method === 'GET') {
    const data = readData();
    res.status(200).json({ vocab: data.vocabulary });
  } else if (req.method === 'POST') {
    // nếu muốn thêm từ mới
    const { word, translation, ipa, audio } = req.body;
    if (!word) return res.status(400).json({ error: "Missing word" });
    const data = readData();
    data.vocabulary.unshift({
      word,
      translation: translation || '',
      ipa: ipa || '',
      audio: audio || '',
      timeSaved: Date.now(),
      isLearned: false
    });
    saveData(data);
    res.status(200).json({ ok: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
