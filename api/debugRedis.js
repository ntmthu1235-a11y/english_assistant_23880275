import { getRedisClient } from '../../_redis.js';

export default async function handler(req, res) {
  try {
    const client = await getRedisClient();
    const keys = await client.keys('*'); // Lấy tất cả key

    const data = {};

    for (const key of keys) {
      const type = await client.type(key);
      let value;

      switch (type) {
        case 'string':
          value = await client.get(key);
          break;
        case 'hash':
          value = await client.hGetAll(key);
          break;
        case 'list':
          value = await client.lRange(key, 0, -1);
          break;
        case 'set':
          value = await client.sMembers(key);
          break;
        case 'zset':
          value = await client.zRange(key, 0, -1, { WITHSCORES: true });
          break;
        default:
          value = null;
      }

      data[key] = { type, value };
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
