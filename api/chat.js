// //chat.js
// import { OpenAI } from "openai";
// import { readData, saveData } from "../_utils.js";

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { message } = req.body;
//   if (!message) return res.status(400).json({ error: "Missing message" });

//   try {
//     const completion = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         { role: "system", content: "You are a friendly English speaking assistant." },
//         { role: "user", content: message }
//       ]
//     });

//     const reply = completion.choices[0].message.content;

//     const data = await readData();
//     data.messages.push({ user: message, ai: reply, time: new Date().toISOString() });
//     data.stats.totalConversations += 1;
//     await saveData(data);

//     res.json({ reply });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "OpenAI API error" });
//   }
// }
// api/chat.js
import { OpenAI } from "openai";
import { getRedisClient } from "../_redis.js";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    // 1️⃣ Gọi OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a friendly English speaking assistant." },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    // 2️⃣ Kết nối Redis
    const redis = await getRedisClient();

    // 3️⃣ Lưu message vào Redis
    const chatItem = {
      user: message,
      ai: reply,
      time: new Date().toISOString()
    };

    await redis.rPush("chat:messages", JSON.stringify(chatItem));

    // 4️⃣ Tăng tổng số cuộc hội thoại
    await redis.incr("stats:totalConversations");

    // (tuỳ chọn) Giữ tối đa 200 messages
    await redis.lTrim("chat:messages", -200, -1);

    // 5️⃣ Trả kết quả
    res.json({ reply });

  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: "OpenAI API error" });
  }
}
