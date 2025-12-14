import { readData } from '../../_utils.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const data = readData();
  res.status(200).json({
    stats: data.stats,
    sessionStats: data.sessionStats,
    dailyStudyTime: data.dailyStudyTime
  });
}
