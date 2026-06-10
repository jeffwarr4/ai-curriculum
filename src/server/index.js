const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
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

// Fallback for SPA in production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../src/frontend/dist/index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
