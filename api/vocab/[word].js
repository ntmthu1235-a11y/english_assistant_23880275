import { readData, saveData } from '../../_utils.js';

export default function handler(req, res) {
  const { word } = req.query;
  if (!word) return res.status(400).json({ error: "Missing word" });

  if (req.method === 'DELETE') {
    const data = readData();
    data.vocabulary = data.vocabulary.filter(v => v.word.toLowerCase() !== word.toLowerCase());
    saveData(data);
    return res.status(200).json({ ok: true, deleted: word });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
