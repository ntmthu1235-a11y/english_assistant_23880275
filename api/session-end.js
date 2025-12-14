import { readData, saveData } from '../_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

  try {
    const { start, end } = req.body;
    if (!start || !end) return res.status(400).json({ error: "Missing start or end" });

    const durationSeconds = Math.floor((new Date(end) - new Date(start)) / 1000);
    const data = await readData();

    if (!data.sessionStats) data.sessionStats = [];
    if (!data.dailyStudyTime) data.dailyStudyTime = {};

    const dayKey = start.slice(0, 10);
    data.sessionStats.push({ start, end, durationSeconds });
    data.dailyStudyTime[dayKey] = (data.dailyStudyTime[dayKey] || 0) + durationSeconds;

    await saveData(data);

    res.json({ ok: true, durationSeconds, day: dayKey, totalTodaySeconds: data.dailyStudyTime[dayKey] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
