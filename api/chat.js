import { OpenAI } from "openai";
import { readData, saveData } from "../_utils.js";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a friendly English speaking assistant." },
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;

    const data = await readData();
    data.messages.push({ user: message, ai: reply, time: new Date().toISOString() });
    data.stats.totalConversations += 1;
    await saveData(data);

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI API error" });
  }
}
