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

  const goal = goalLabels[answers.goal] || answers.goal;
  const background = backgroundLabels[answers.devBackground] ?? "an unspecified background";
  const existingTitles = (existingCourses || [])
    .map((c) => `- ${c.title} (${c.provider})`)
    .join("\n");

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are a curriculum researcher. Find additional FREE AI learning resources for a specific learner profile.

Use web_search to find current, real courses. Only recommend courses you have verified exist.

Return ONLY a valid JSON array — no markdown, no explanation, no prose. Just the raw JSON array starting with [ and ending with ].`,
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages: [
        {
          role: "user",
          content: `Find 3–5 additional FREE AI courses or learning resources for someone who wants to ${goal} and has ${background}.

They already have these courses in their curated path — do not duplicate them:
${existingTitles}

Search for current, high-quality free resources from platforms like Coursera (free audit), edX (free audit), fast.ai, Hugging Face, DeepLearning.AI free short courses, MIT OpenCourseWare, or credible YouTube series.

Return a JSON array with 3–5 items. Each item must have exactly these fields:
{
  "title": "string",
  "provider": "string",
  "url": "string — a real working URL",
  "duration_hours": number,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "description": "1–2 sentence description",
  "access_model": "free" | "free_account" | "free_with_upsell" | "free_audit"
}`,
        },
      ],
    });

    console.log(`[discover] stop_reason=${response.stop_reason} content_types=${response.content.map(b=>b.type).join(",")}`);
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) {
      console.log("[discover] no text block in response");
      return res.json({ courses: [], error: false });
    }
    console.log(`[discover] text preview: ${textBlock.text.slice(0, 200)}`);

    const parsed = extractJSON(textBlock.text);
    if (!parsed || !Array.isArray(parsed)) {
      console.log(`[discover] extractJSON failed, raw text: ${textBlock.text.slice(0, 500)}`);
      return res.json({ courses: [], error: false });
    }

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

// Fallback for SPA in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../src/frontend/dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
