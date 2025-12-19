
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
    // 1️ Gọi OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {  role: "system",
          content: `
          You are an English-speaking assistant.

          STRICT RULES:
          - ALWAYS reply in English.
          - NEVER reply in Vietnamese.
          - If the user writes in Vietnamese:
            → Translate their sentence into natural English.
            → Give the English sentence only.
          - Do NOT explain in Vietnamese.
          - Do NOT repeat the Vietnamese sentence.
          `},
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    // 2️ Kết nối Redis
    const redis = await getRedisClient();

    // 3 Tăng tổng số cuộc hội thoại
    await redis.incr("stats:totalConversations");

    // 4 Trả kết quả
    res.json({ reply });

  } catch (err) {
    console.error("Chat API error:", err);
    res.status(500).json({ error: "OpenAI API error" });
  }
}
