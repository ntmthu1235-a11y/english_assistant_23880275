import { readData } from '../_utils.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const range = parseInt(req.query.range || "7");
  const data = readData();
  const daily = data.dailyStudyTime || {};

  const today = new Date();
  let days = [];
  let hours = [];

  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const seconds = daily[key] || 0;

    days.push(key.slice(5)); // MM-DD
    hours.push((seconds / 3600).toFixed(2));
  }

  res.status(200).json({ days, hours });
}
