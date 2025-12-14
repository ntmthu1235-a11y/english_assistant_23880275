// /api/stats-add.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { duration } = req.body;
    if (!duration || isNaN(duration)) return res.status(400).json({ error: 'Missing or invalid duration' });

    const client = await getRedisClient();
    const raw = await client.get('app_data');
    const data = raw ? JSON.parse(raw) : {};

    if (!data.sessionStats) data.sessionStats = [];

    data.sessionStats.push({
      duration,
      time: Date.now()
    });

    await client.set('app_data', JSON.stringify(data));

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('❌ /api/stats/add error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
