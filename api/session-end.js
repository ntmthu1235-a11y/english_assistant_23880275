// api/session-end.js
import { readData, saveData } from '../_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { start, end } = req.body;
  if (!start || !end) return res.status(400).json({ error: "Missing start/end" });

  const data = await readData();
  const durationSeconds = Math.floor((new Date(end) - new Date(start)) / 1000);

  if (!data.sessionStats) data.sessionStats = [];
  if (!data.dailyStudyTime) data.dailyStudyTime = {};

  data.sessionStats.push({ start, end, durationSeconds });
  const dayKey = start.slice(0, 10);
  data.dailyStudyTime[dayKey] = (data.dailyStudyTime[dayKey] || 0) + durationSeconds;

  await saveData(data);
  res.json({ ok: true, durationSeconds });
}
