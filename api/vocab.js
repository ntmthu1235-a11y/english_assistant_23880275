import { readData } from "../_utils.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const data = await readData();
  res.json({ vocab: data.vocabulary });
}
