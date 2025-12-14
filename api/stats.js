// /api/stats.js
import { getRedisClient } from '../_redis.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const client = await getRedisClient();
    const raw = await client.get('app_data');
    const data = raw ? JSON.parse(raw) : {};

    res.status(200).json({
      stats: data.stats || {},
      sessionStats: data.sessionStats || [],
      dailyStudyTime: data.dailyStudyTime || {}
    });
  } catch (err) {
    console.error('❌ /api/stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
