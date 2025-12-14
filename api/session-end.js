// api/session-end.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { start, end } = req.body;
  if (!start || !end) return res.status(400).json({ error: "Missing start/end" });

  const client = await getRedisClient();

  // Lấy dữ liệu hiện tại từ Redis
  const raw = await client.get('app_data');
  let data = raw ? JSON.parse(raw) : {};

  const durationSeconds = Math.floor((new Date(end) - new Date(start)) / 1000);

  if (!data.sessionStats) data.sessionStats = [];
  if (!data.dailyStudyTime) data.dailyStudyTime = {};

  // Thêm session
  data.sessionStats.push({ start, end, durationSeconds });

  // Cập nhật dailyStudyTime
  const dayKey = start.slice(0, 10);
  data.dailyStudyTime[dayKey] = (data.dailyStudyTime[dayKey] || 0) + durationSeconds;

  // Lưu lại Redis
  await client.set('app_data', JSON.stringify(data));

  res.json({ ok: true, durationSeconds });
}
