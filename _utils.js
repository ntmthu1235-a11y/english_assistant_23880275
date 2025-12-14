// // _utils.js
// import { createClient } from "redis";

// const redis = createClient({ url: process.env.REDIS_URL });

// redis.on("error", (err) => console.error("Redis Client Error", err));

// let connected = false;
// async function connectRedis() {
//   if (!connected) {
//     await redis.connect();
//     connected = true;
//     console.log("✅ Redis connected successfully");
//   }
// }

// export async function readData() {
//   await connectRedis();
//   const raw = await redis.get("app_data");
//   if (!raw) {
//     const init = {
//       messages: [],
//       vocabulary: [],
//       stats: { totalConversations: 0, pronunciationScores: [] },
//       sessionStats: [],
//       dailyStudyTime: {}
//     };
//     await saveData(init);
//     return init;
//   }
//   return JSON.parse(raw);
// }

// export async function saveData(data) {
//   await connectRedis();
//   await redis.set("app_data", JSON.stringify(data));
// }

// export default redis;
