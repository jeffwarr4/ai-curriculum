require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const Anthropic = require("@anthropic-ai/sdk");
const { recommend, generateProfileSummary, getProjectCard } = require("./recommend");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve built frontend in production
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(__dirname, "../../src/frontend/dist");
  app.use(express.static(distPath));
}

app.post("/api/recommend", (req, res) => {
  try {
    const answers = req.body;
    const courses = recommend(answers);
    const profileSummary = generateProfileSummary(answers);
    const projectCard = getProjectCard(answers);

    res.json({ courses, profileSummary, projectCard });
  } catch (err) {
    console.error("Recommend error:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

app.post("/api/feedback", (req, res) => {
  try {
    const { answers, feedback } = req.body;
    if (!feedback || feedback.trim().length === 0) {
      return res.status(400).json({ error: "Feedback is empty" });
    }

    const entry = {
      timestamp: new Date().toISOString(),
      feedback: feedback.trim(),
      answers,
    };

    const feedbackPath = path.join(__dirname, "../../feedback.json");
    let existing = [];
    if (fs.existsSync(feedbackPath)) {
      try {
        existing = JSON.parse(fs.readFileSync(feedbackPath, "utf8"));
      } catch {}
    }
    existing.push(entry);
    fs.writeFileSync(feedbackPath, JSON.stringify(existing, null, 2));

    res.json({ ok: true });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

function extractJSON(text) {
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  const block = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) { try { return JSON.parse(block[1].trim()); } catch {} }
  const arr = t.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]); } catch {} }
  return null;
}

app.post("/api/discover", async (req, res) => {
  const { answers, courses: existingCourses } = req.body;

  const goalLabels = {
    "use-ai-at-work": "use AI tools more effectively at work or school",
    "automate-tasks": "automate repetitive tasks",
    "build-apps": "build AI-powered apps and tools",
    "understand-ai": "understand AI deeply",
    "side-project": "start a product or side project using AI",
  };

  const backgroundLabels = {
    0: "no coding background",
    1: "some coding familiarity",
    2: "a solid coding background",
    3: "a professional developer background",
  };

  const answerGoals = Array.isArray(answers.goal) ? answers.goal : (answers.goal ? [answers.goal] : []);
  const goal = answerGoals.map((g) => goalLabels[g] || g).join(" and ");
  const background = backgroundLabels[answers.devBackground] ?? "an unspecified background";
  const existingTitles = (existingCourses || [])
    .map((c) => `- ${c.title} (${c.provider})`)
    .join("\n");

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You are a curriculum researcher. Find 3 FREE AI learning resources.

Rules:
- Do AT MOST 2 web searches total, then stop and return results immediately
- Only recommend courses you have confirmed exist
- Return ONLY a raw JSON array — no markdown fences, no prose, nothing else`,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Do ONE web search for "free AI courses ${goal}" and return the 3 best results that are NOT already in this list:
${existingTitles}

Learner: ${background}, goal: ${goal}.

Return a JSON array of exactly 3 objects with these fields:
{"title":"string","provider":"string","url":"string","duration_hours":number,"difficulty":"beginner"|"intermediate"|"advanced","description":"1-2 sentences","access_model":"free"|"free_account"|"free_with_upsell"|"free_audit"}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) return res.json({ courses: [], error: false });

    const parsed = extractJSON(textBlock.text);
    if (!parsed || !Array.isArray(parsed)) return res.json({ courses: [], error: false });

    const validCourses = parsed
      .filter((c) => c.title && c.url && c.provider)
      .map((c, i) => ({
        id: `discovered-${Date.now()}-${i}`,
        title: String(c.title),
        provider: String(c.provider),
        url: String(c.url),
        duration_hours: Number(c.duration_hours) || 4,
        difficulty: ["beginner", "intermediate", "advanced"].includes(c.difficulty)
          ? c.difficulty
          : "intermediate",
        type: "course",
        description: String(c.description || ""),
        access_model: ["free", "free_account", "free_with_upsell", "free_audit"].includes(c.access_model)
          ? c.access_model
          : "free",
        tags: [],
        prerequisite_ids: [],
      }))
      .slice(0, 5);

    return res.json({ courses: validCourses, error: false });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] /api/discover error:`, err.message);
    return res.json({ courses: [], error: true });
  }
});

const SPARK_SYSTEM_PROMPT = `You are Spark, a friendly mentor helping teenagers discover a personal project they can build using AI tools. You guide them through 4 stages:

STAGE 1 - EXPLORE INTERESTS: Uncover what they genuinely care about through casual conversation. Ask ONE warm open question at a time. Never ask "what are your interests?" directly — that's too vague to get a real answer. Open with something sharper, like "What's something you wish was easier, felt a little broken, or that you'd love to do but feels out of reach right now?" That kind of question tends to surface something real faster than asking what they do for fun in general. If what they share is more about something they love or are curious about than an actual problem, that's great too — don't force a "fix this" framing onto a passion; follow their energy either way. As soon as they name ANY genuine interest, even a vague or broad one, that's enough — ask at most one more question to get a bit more texture on it, then move to STAGE 2. Don't keep digging for more specificity once you have a topic to work with. If they seem unsure twice in a row, stop asking and gently propose a concrete angle yourself based on whatever they've already shared. If they're stuck from the very start, offer 2-3 brief concrete examples of past teen projects as inspiration. Keep it conversational and encouraging.

STAGE 2 - SHAPE THE IDEA: Once you sense a genuine interest, help them articulate a project concept. Ask things like "What would you want to exist that doesn't right now?" or "Who would use this — just you, or other people too?" Reflect their idea back to confirm. Still ONE question at a time. Move to STAGE 3 within 2-3 exchanges once you have a rough concept — you don't need every detail nailed down first.

STAGE 3 - SCOPE IT DOWN: Help them find their v1 — the simplest version that would feel real and shareable. Ask "What's the ONE thing it absolutely has to do?" Push back gently on scope that's too big. Frame it as exciting, not limiting.

STAGE 4 - BLUEPRINT: When you have a clear scoped idea, output a blueprint using EXACTLY this format inside [BLUEPRINT]...[/BLUEPRINT] tags:

[BLUEPRINT]
PROJECT_NAME: {short catchy name}
TAGLINE: {one sentence what it does}
MILESTONES: {milestone 1 title}|{what they'll learn}||{milestone 2 title}|{what they'll learn}||{milestone 3 title}|{what they'll learn}
COLLEGE_DRAFT: {2-sentence college app description starting out}
COLLEGE_FINISHED: {2-sentence college app description when fully built}
[/BLUEPRINT]

Then add a warm 1-2 sentence message after the closing tag.

CRITICAL RULES: Ask exactly ONE question per message. Keep messages to 2-4 sentences max (not counting the blueprint). Be warm, casual, encouraging — a cool mentor not a teacher. Never lecture. Never announce stage transitions. Never use the word "curriculum." Use contractions and casual language. Don't over-ask — once you have enough to move forward in a stage, move forward instead of digging for more depth.`;

app.post("/api/spark", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages must be a non-empty array" });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SPARK_SYSTEM_PROMPT,
      messages: messages.map(({ role, content }) => ({ role, content })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    res.json({ reply: textBlock ? textBlock.text : "" });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] /api/spark error:`, err.message);
    res.status(500).json({ error: "Failed to get a response" });
  }
});

// Fallback for SPA in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../src/frontend/dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
