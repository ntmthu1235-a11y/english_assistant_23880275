// import { OpenAI } from "openai";
// import { readData, saveData } from "../_utils.js";

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();
//   const userText = req.body.text;

//   try {
//     const result = await client.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [
//         {
//           role: "system",
//           content: `
// You analyze grammar AND continue the conversation.
// Always respond ONLY with valid JSON (no markdown, no commentary):

// {
//   "grammar": { "errors": [], "explanation": "", "suggestion": "" },
//   "reply": ""
// }`
//         },
//         { role: "user", content: userText }
//       ]
//     });

//     let raw = result.choices[0].message.content.trim();
//     if (raw.startsWith("```")) raw = raw.replace(/```json/i, "").replace(/```/g, "").trim();

//     let json;
//     try {
//       json = JSON.parse(raw);
//     } catch (err) {
//       console.error("❌ JSON parse error:", err, "AI returned:", raw);
//       json = {
//         grammar: {
//           errors: ["Could not parse AI grammar response."],
//           explanation: "AI returned invalid JSON.",
//           suggestion: userText
//         },
//         reply: "Sorry, I could not analyze grammar this time."
//       };
//     }

//     if (Array.isArray(json.grammar.errors)) {
//       json.grammar.errors = json.grammar.errors.map(e => {
//         if (typeof e === "string") return e;
//         if (typeof e === "object") {
//           if (e.error && e.correction) return `Use "${e.correction}" instead of "${e.error}".`;
//           return e.error || e.message || JSON.stringify(e);
//         }
//         return String(e);
//       });
//     }

//     res.json(json);
//   } catch (e) {
//     console.error("🔥 /chat-grammar error:", e);
//     res.status(500).json({
//       grammar: { errors: ["Server Error"], explanation: "Internal error", suggestion: userText },
//       reply: "Sorry, something went wrong."
//     });
//   }
// }

import { OpenAI } from "openai";
import { getRedisClient } from "../_redis.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const userText = req.body.text;
  if (!userText || !userText.trim()) return res.status(400).json({ error: "Missing text" });

  const redis = await getRedisClient();

  try {
    // --- 1️⃣ Lưu tin nhắn user vào Redis ---
    const userMsg = { role: "user", text: userText.trim(), timestamp: Date.now() };
    await redis.rPush("chat_messages", JSON.stringify(userMsg));

    // --- 2️⃣ Gọi OpenAI ---
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You analyze grammar AND continue the conversation.
Always respond ONLY with valid JSON (no markdown, no commentary):

{
  "grammar": { "errors": [], "explanation": "", "suggestion": "" },
  "reply": ""
}`
        },
        { role: "user", content: userText }
      ]
    });

    let raw = result.choices[0].message.content.trim();
    if (raw.startsWith("```")) raw = raw.replace(/```json/i, "").replace(/```/g, "").trim();

    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      console.error("❌ JSON parse error:", err, "AI returned:", raw);
      json = {
        grammar: {
          errors: ["Could not parse AI grammar response."],
          explanation: "AI returned invalid JSON.",
          suggestion: userText
        },
        reply: "Sorry, I could not analyze grammar this time."
      };
    }

    // --- Chuẩn hóa errors ---
    if (Array.isArray(json.grammar.errors)) {
      json.grammar.errors = json.grammar.errors.map(e => {
        if (typeof e === "string") return e;
        if (typeof e === "object") {
          if (e.error && e.correction) return `Use "${e.correction}" instead of "${e.error}".`;
          return e.error || e.message || JSON.stringify(e);
        }
        return String(e);
      });
    }

    // --- 3️⃣ Lưu AI reply vào Redis ---
    const aiMsg = { role: "ai", text: json.reply, timestamp: Date.now() };
    await redis.rPush("chat_messages", JSON.stringify(aiMsg));

    // --- 4️⃣ Trả về frontend ---
    res.json(json);

  } catch (e) {
    console.error("🔥 /chat-grammar error:", e);
    res.status(500).json({
      grammar: { errors: ["Server Error"], explanation: "Internal error", suggestion: userText },
      reply: "Sorry, something went wrong."
    });
  }
}

