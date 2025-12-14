
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { start, end } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'Missing start or end' });

    const durationSeconds = Math.floor((new Date(end) - new Date(start)) / 1000);

    const client = await getRedisClient();
    const raw = await client.get('app_data');
    const data = raw ? JSON.parse(raw) : {};

    if (!data.sessionStats) data.sessionStats = [];
    if (!data.dailyStudyTime) data.dailyStudyTime = {};

    // Thêm session
    data.sessionStats.push({ start, end, durationSeconds });

    // Cập nhật dailyStudyTime
    const dayKey = start.slice(0, 10);
    data.dailyStudyTime[dayKey] = (data.dailyStudyTime[dayKey] || 0) + durationSeconds;

    // Lưu vào Redis
    await client.set('app_data', JSON.stringify(data));

    // Trả về đầy đủ thông tin cho frontend
    res.status(200).json({
      ok: true,
      durationSeconds,
      day: dayKey,
      totalTodaySeconds: data.dailyStudyTime[dayKey]
    });

  } catch (err) {
    console.error('❌ /api/session-end error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
