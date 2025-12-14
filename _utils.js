import { createClient } from "redis";

const redis = createClient({
  url: process.env.REDIS_URL
});

redis.on("error", (err) => console.error("Redis Client Error", err));

(async () => {
  try {
    await redis.connect();
    console.log("✅ Redis connected successfully");

    // --- Optional: test key ---
    const testKey = "test_key";
    await redis.set(testKey, "hello");
    const val = await redis.get(testKey);
    console.log("Redis test value:", val); // nên in ra "hello"
    await redis.del(testKey);
  } catch (err) {
    console.error("❌ Redis connection/test error:", err);
  }
})();

// ---------- Helper đọc/ghi data ----------
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
