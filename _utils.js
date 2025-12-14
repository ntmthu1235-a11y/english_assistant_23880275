import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", (err) => console.error("Redis Client Error", err));

// Kết nối trong async IIFE
(async () => {
  await redis.connect();
})();

export async function readData() {
  const raw = await redis.get("app_data");
  if (!raw) {
    const init = {
      messages: [],
      vocabulary: [],
      stats: { totalConversations: 0, pronunciationScores: [] },
      sessionStats: [],
      dailyStudyTime: {}
    };
    await saveData(init);
    return init;
  }
  return JSON.parse(raw);
}

export async function saveData(data) {
  await redis.set("app_data", JSON.stringify(data));
}

export default redis;
