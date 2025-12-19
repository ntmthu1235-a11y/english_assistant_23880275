//chat-grammar.js
import { OpenAI } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const userText = req.body.text;

  try {
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:`
                You analyze grammar AND continue the conversation.

                STRICT RULES (DO NOT BREAK):
                - ALWAYS reply in ENGLISH.
                - NEVER reply in Vietnamese.
                - If the user writes in Vietnamese:
                  → Translate it into natural, friendly English.
                  → Start the reply with phrases like:
                    "You can say:"
                    "A natural way to say this is:"
                    "In English, you can say:"
                - Keep the tone friendly and conversational, like a language tutor.
                - Do NOT explain in Vietnamese.
                - Do NOT repeat Vietnamese text.

                Always respond ONLY with valid JSON (no markdown, no commentary):

                {
                  "grammar": {
                    "errors": [],
                    "explanation": "",
                    "suggestion": ""
                  },
                  "reply": ""
                }
                `
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

    res.json(json);
  } catch (e) {
    console.error("🔥 /chat-grammar error:", e);
    res.status(500).json({
      grammar: { errors: ["Server Error"], explanation: "Internal error", suggestion: userText },
      reply: "Sorry, something went wrong."
    });
  }
}


