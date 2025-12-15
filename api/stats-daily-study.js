//stat-daily-study.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const range = parseInt(req.query.range || '7', 10);
    const client = await getRedisClient();

    const raw = await client.get('app_data');
    const data = raw ? JSON.parse(raw) : {};
    const daily = data.dailyStudyTime || {};

    const today = new Date();
    let days = [];
    let hours = [];

    for (let i = range - 1; i >= 0; i--) {
      let d = new Date(today);
      d.setDate(today.getDate() - i);

      const key = d.toISOString().slice(0, 10);
      const seconds = daily[key] || 0;

      days.push(key.slice(5));               // MM-DD
      hours.push((seconds / 3600).toFixed(2));
    }

    res.status(200).json({ days, hours });
  } catch (err) {
    console.error('❌ /api/stats-daily-study error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
