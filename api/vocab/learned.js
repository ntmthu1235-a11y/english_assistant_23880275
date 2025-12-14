import { readData, saveData } from '../../_utils.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { word } = req.body;
  if (!word) return res.status(400).json({ error: "Missing word" });

  const data = readData();
  const item = data.vocabulary.find(v => v.word === word);
  if (!item) return res.status(404).json({ error: "Word not found" });

  item.isLearned = !item.isLearned;
  saveData(data);

  res.status(200).json({ status: "ok", word, isLearned: item.isLearned });
}
