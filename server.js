// Local topic generator: serves the page and asks Gemini for a topic.
// Run with: npm start
import http from "node:http";
import fs from "node:fs";
import { GoogleGenAI, ApiError } from "@google/genai";

// Key lives in .env.local as GEMINI_API_KEY=... (get one at https://aistudio.google.com/apikey)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.5-flash-lite";

const PORT = 3000;
const HOST = "127.0.0.1"; // only this Mac can connect

if (!GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY. Add it to .env.local.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// One area is picked at random per request so topics stay varied.
const AREAS = [
  "Psychology and human behavior",
  "Character, discipline and personal philosophy",
  "Communication and social skills",
  "Health, the body and the mind",
  "Personal finance",
  "Business and economics",
  "Careers, work and negotiation",
  "Politics, power and world affairs",
  "Countries, cultures and their history",
  "Geopolitics",
  "Recent and trending world events",
  "Science and the universe",
  "Technology and the internet",
  "Everyday systems (how the modern world quietly works)",
  "Practical life skills",
  "Survival and emergencies",
  "Law and your rights",
  "History's turning points and remarkable people",
  "Philosophy and religion",
  "Art, music, film and the stories behind them",
  "Mind-blowing facts and unsolved mysteries",
  "The future and where the world is heading",
];

const SYSTEM = `You pick one research topic for a curious, ambitious person who is building their knowledge, character and worldview one topic a day. They will research the topic for about 30 minutes, then talk about it on camera to practise speaking.

What makes a great topic:
- Specific and surprising, never generic. "Why your brain replays embarrassing moments for years" beats "Memory". "How Singapore went from swamp to superpower in one lifetime" beats "Singapore".
- Something a well-rounded adult genuinely benefits from knowing: it changes how they think, act, decide, or see the world.
- Rich enough to explore for 30+ minutes and to have an opinion about out loud.
- Not academic coursework or exam material.

Return:
- title: the topic, under 12 words, phrased so it sparks curiosity.
- hook: one or two short sentences pointing at the angle worth exploring. No lists, no instructions.`;

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    hook: { type: "string" },
  },
  required: ["title", "hook"],
};

async function generateTopic(recent) {
  const area = AREAS[Math.floor(Math.random() * AREAS.length)];
  const avoid = recent.slice(-20).map((t) => `- ${String(t).slice(0, 120)}`).join("\n");

  const response = await ai.models.generateContent({
    model: MODEL,
    contents:
      `Area: ${area}\n` +
      (avoid ? `Do not repeat or closely resemble these recent topics:\n${avoid}\n` : "") +
      `Give me today's topic.`,
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned nothing, tap again");
  return { area, ...JSON.parse(text) };
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function handleTopic(req, res) {
  let body = "";
  for await (const chunk of req) body += chunk;
  let recent = [];
  try { recent = JSON.parse(body || "{}").recent || []; } catch {}

  try {
    sendJson(res, 200, await generateTopic(recent));
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError && [400, 401, 403].includes(err.status) && /key/i.test(err.message)) {
      return sendJson(res, 500, { error: "API key is invalid" });
    }
    if (err instanceof ApiError && err.status === 429) {
      return sendJson(res, 429, { error: "Free limit reached, wait a bit" });
    }
    sendJson(res, 500, { error: err.message.includes("tap again") ? err.message : "Something went wrong, tap again" });
  }
}

http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/topic") return handleTopic(req, res);
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    return res.end(fs.readFileSync(new URL("./index.html", import.meta.url)));
  }
  res.writeHead(404).end();
}).listen(PORT, HOST, () => {
  console.log(`Topic generator running at http://localhost:${PORT}`);
});
