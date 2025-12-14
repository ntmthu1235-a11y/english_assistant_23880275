// _redis.js
import { createClient } from 'redis';

let redisClient;

export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: retries => Math.min(retries * 50, 1000)
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error', err);
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}
