const curriculum = require("../data/curriculum.json");

const courses = curriculum.courses;

function getCourseById(id) {
  return courses.find((c) => c.id === id);
}

function topologicalSort(selectedIds) {
  const selected = new Set(selectedIds);
  const result = [];
  const visited = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const course = getCourseById(id);
    if (!course) return;
    for (const prereq of course.prerequisite_ids) {
      if (selected.has(prereq)) visit(prereq);
    }
    result.push(id);
  }

  for (const id of selectedIds) visit(id);
  return result.map(getCourseById).filter(Boolean);
}

function recommend(answers) {
  const {
    familiarity,   // 0-3
    role,          // string
    goal,          // string
    devBackground, // 0-3
    timePerWeek,   // 0-2
    learningStyle, // array of strings
  } = answers;

  const hasCodingBackground = devBackground >= 2;
  const isCS = role === "cs-student" || devBackground >= 3;
  const wantsNoCode = goal === "use-ai-at-work" && !hasCodingBackground;
  const wantsBuildApps = goal === "build-apps";
  const wantsDeepUnderstanding = goal === "understand-ai";
  const wantsSideProject = goal === "side-project";
  const wantsAutomate = goal === "automate-tasks";

  let candidateIds = [];

  // === PATH: No-code / use AI at work ===
  if (wantsNoCode || (goal === "use-ai-at-work" && familiarity <= 1)) {
    candidateIds = [
      "ai-capabilities-limitations",
      "claude-101",
      "ai-fluency-framework",
      "project-nocode-automation",
    ];
  }

  // === PATH: Build apps / side project with dev background ===
  else if ((wantsBuildApps || wantsSideProject) && hasCodingBackground) {
    candidateIds = [
      "claude-101",
      "claude-platform-101",
      "claude-api-building",
      "claude-code-101",
      "claude-code-in-action",
      "intro-mcp",
      "project-claude-api-cli",
    ];
  }

  // === PATH: Build apps without dev background ===
  else if (wantsBuildApps || wantsSideProject) {
    candidateIds = [
      "elements-of-ai",
      "claude-101",
      "freecodecamp-python",
      "claude-platform-101",
      "claude-api-building",
      "project-claude-api-cli",
    ];
  }

  // === PATH: Deep understanding — CS/research ===
  else if (wantsDeepUnderstanding && (isCS || familiarity >= 2)) {
    candidateIds = [
      "3b1b-neural-networks",
      "google-mlcc",
      "freecodecamp-python",
      "cs50-ai-python",
      "karpathy-zero-to-hero",
      "huggingface-nlp-course",
      "anthropic-model-spec",
      "project-karpathy-reproduce",
    ];
  }

  // === PATH: Deep understanding — non-technical ===
  else if (wantsDeepUnderstanding) {
    candidateIds = [
      "elements-of-ai",
      "ai-capabilities-limitations",
      "3b1b-neural-networks",
      "google-mlcc",
      "claude-101",
      "anthropic-model-spec",
      "kaggle-intro-ml",
      "project-kaggle-classifier",
    ];
  }

  // === PATH: Automate tasks (technical) ===
  else if (wantsAutomate && hasCodingBackground) {
    candidateIds = [
      "claude-101",
      "claude-platform-101",
      "claude-api-building",
      "claude-code-101",
      "intro-agent-skills",
      "intro-subagents",
      "project-claude-api-cli",
    ];
  }

  // === PATH: Automate tasks (non-technical) ===
  else if (wantsAutomate) {
    candidateIds = [
      "ai-capabilities-limitations",
      "claude-101",
      "ai-fluency-framework",
      "anthropic-cowork-intro",
      "project-nocode-automation",
    ];
  }

  // === FALLBACK: generic beginner path ===
  else {
    candidateIds = [
      "ai-capabilities-limitations",
      "claude-101",
      "ai-fluency-framework",
      "google-mlcc",
      "project-nocode-automation",
    ];
  }

  // Deduplicate
  const unique = [...new Set(candidateIds)];

  // Sort topologically so prerequisites come first
  const sorted = topologicalSort(unique);

  // Ensure a project is last (it usually is by prereq chain)
  const projects = sorted.filter((c) => c.type === "project");
  const nonProjects = sorted.filter((c) => c.type !== "project");
  const ordered = [...nonProjects, ...projects];

  // Cap at 8
  const final = ordered.slice(0, 8);

  // Add "why this for you" reasoning
  return final.map((course) => ({
    ...course,
    whyForYou: generateWhyForYou(course, answers),
  }));
}

function generateWhyForYou(course, answers) {
  const { goal, devBackground, timePerWeek, role } = answers;
  const hasCodingBackground = devBackground >= 2;

  const map = {
    "claude-101":
      "Claude's own beginner course — the fastest way to go from curious to confident. Covers the essentials of interacting with Claude effectively, without any technical prerequisites.",
    "ai-capabilities-limitations":
      "A clear-eyed introduction to what AI can actually do and where it falls short — sets realistic expectations before you invest time in a longer learning path.",
    "ai-fluency-framework":
      "A mental model for using AI at work — what it's good at, how to fit it into your existing workflows, and how to keep improving as the tools evolve.",
    "anthropic-cowork-intro":
      "The fastest way to actually automate the tasks on your desk. Cowork lets Claude work directly on your files, folders, and apps — no coding, no setup complexity. This course gets you from first launch to confident daily use.",
    "ai-fluency-students":
      "A clear-eyed introduction to AI for students — what it can do, where it gets things wrong, and how to use it as a genuine learning tool rather than a shortcut.",
    "ai-fluency-educators":
      "Built specifically for teachers — practical ways to use AI for lesson planning, feedback, and classroom efficiency without losing the human element of good teaching.",
    "ai-fluency-nonprofits":
      "How to use Claude to amplify your mission — reducing admin overhead, improving communications, and doing more with the resources you have.",
    "ai-fluency-small-business":
      "Practical AI for running a business — from drafting customer communications to automating the administrative work that eats into your week.",
    "teaching-ai-fluency":
      "For those who want to build AI capability within their team or organization — frameworks for training others and fostering responsible, effective adoption.",
    "claude-platform-101":
      "Understand the Anthropic platform before you start building — models, APIs, rate limits, and how all the pieces fit together. The foundation everything else builds on.",
    "claude-api-building":
      "The hands-on API course that turns prompting knowledge into shipping knowledge. After this, you can build real Claude-powered tools.",
    "claude-code-101":
      "Learn Claude Code from the ground up — setup, core commands, and the workflows that make AI-assisted development actually click.",
    "claude-code-in-action":
      "Where the basics become mastery — real multi-file projects, complex edits, and the patterns that separate proficient users from casual ones.",
    "intro-mcp":
      "Model Context Protocol is how you connect Claude to your own tools and data — files, databases, external APIs. This is the foundation for serious integrations.",
    "mcp-advanced":
      "Multi-server orchestration, custom transports, and production patterns for serious MCP integrations. For developers already comfortable with the basics.",
    "intro-agent-skills":
      "Learn to build Skills — reusable, shareable workflows that extend what Claude Code can do across sessions and projects.",
    "intro-subagents":
      "Subagents let Claude Code delegate complex tasks and maintain context across large amounts of work — essential for anything that doesn't fit in a single session.",
    "claude-amazon-bedrock":
      "How to run Claude on AWS — Bedrock console, API setup, and the integration patterns that fit naturally into AWS-based production stacks.",
    "claude-vertex-ai":
      "How to run Claude on Google Cloud — Vertex AI setup, API calls, and how to fit Claude into GCP-based workflows and infrastructure.",
    "elements-of-ai":
      "A jargon-free foundation — covers the concepts that everything else builds on, without requiring any coding.",
    "fastai-practical-dl":
      "The best hands-on ML course if you want to train real models. Top-down, practical, and built by practitioners.",
    "deeplearning-chatgpt-prompt":
      "Fast and dense — covers LLM prompting from an API perspective in under 2 hours. Great if your time is limited.",
    "deeplearning-langchain":
      "Teaches you to orchestrate LLM workflows — essential for anything beyond a single API call.",
    "cs50-ai-python":
      "Harvard's rigorous take on AI fundamentals. A serious course for people who want to understand what's actually happening under the hood.",
    "google-mlcc":
      "Google's own ML fundamentals — well-structured, interactive, and free. A good first look at how models actually learn.",
    "kaggle-intro-ml":
      "Hands-on ML with real datasets from day one. Shorter and more applied than most alternatives.",
    "kaggle-intermediate-ml":
      "The step up from basics — covers the techniques that actually show up in production ML pipelines.",
    "microsoft-ai-beginners":
      "A broad survey of AI topics with Python notebooks throughout. Good if you want breadth before depth.",
    "freecodecamp-python":
      "Python is the language of ML and AI APIs. This course is thorough, free, and gets you ready for everything else on this path.",
    "karpathy-zero-to-hero":
      "If you want to truly understand how language models work — not just use them — this is the most honest path there is.",
    "coursera-ml-specialization":
      "Andrew Ng's classic. The most complete introduction to ML concepts, backed by decades of teaching experience.",
    "anthropic-model-spec":
      "Understanding how Claude is designed to think and behave gives you a real edge in building with it — and in thinking clearly about AI safety.",
    "deeplearning-finetuning":
      "When prompting isn't enough, fine-tuning lets you specialize a model on your own data. This short course covers the when and how.",
    "kaggle-nlp":
      "A practical bridge from traditional ML to modern NLP — useful context before diving into transformer-based models.",
    "3b1b-neural-networks":
      "Grant Sanderson's visual explanation of how neural networks learn. Even if you've read about it, watching this will change your mental model.",
    "huggingface-nlp-course":
      "The most practical course for working with open-weight models. Covers the full transformer pipeline from tokenization to fine-tuning.",
    "deeplearning-functions-tools":
      "Teaches you to build tool-using agents — the pattern behind most production LLM applications right now.",
    "project-nocode-automation":
      "Puts what you've learned into practice with a real task from your own life. No setup required beyond a Claude account.",
    "project-claude-api-cli":
      "A concrete first project that proves you can ship something real with Claude. Employers and collaborators will find this more interesting than any certificate.",
    "project-kaggle-classifier":
      "A portfolio-ready ML project: real data, real model, real endpoint. This is the kind of work that opens doors.",
    "project-karpathy-reproduce":
      "Reproducing a result from first principles is one of the best ways to actually learn it. This project will teach you more than most courses.",
  };

  return (
    map[course.id] ||
    "Included because it builds on what you've already learned and moves you toward your stated goal."
  );
}

function generateProfileSummary(answers) {
  const { familiarity, role, goal, devBackground, timePerWeek } = answers;

  const goalLabels = {
    "use-ai-at-work": "use AI tools more effectively at work or school",
    "automate-tasks": "automate repetitive tasks",
    "build-apps": "build AI-powered apps and tools",
    "understand-ai": "understand AI deeply",
    "side-project": "start a product or side project using AI",
  };

  const timeLabels = {
    0: "under 3 hours",
    1: "3–7 hours",
    2: "7 or more hours",
  };

  const familiarityLabels = {
    0: "new to the technical side of AI",
    1: "familiar with AI tools but not what's underneath them",
    2: "already comfortable with LLM concepts",
    3: "experienced with hands-on AI development",
  };

  const goalText = goalLabels[goal] || "learn about AI";
  const timeText = timeLabels[timePerWeek] ?? "a few hours";
  const familiarityText = familiarityLabels[familiarity] || "learning";
  const hasCoding = devBackground >= 2;

  let summary = `You're ${familiarityText}, with ${timeText} a week to invest. Your main goal is to ${goalText}.`;

  if (!hasCoding && goal !== "understand-ai") {
    summary +=
      " This path focuses on practical skills you can apply immediately — no prior coding required.";
  } else if (hasCoding) {
    summary +=
      " Because you already have a development background, this path skips the basics and moves you toward building real things with AI APIs.";
  } else {
    summary +=
      " This path builds the conceptual foundation you need before going hands-on.";
  }

  return summary;
}

function getProjectCard(answers) {
  const { goal, devBackground } = answers;
  const hasCodingBackground = devBackground >= 2;

  if (goal === "use-ai-at-work" && !hasCodingBackground) {
    return {
      title: "Your Project: Automate a Weekly Task",
      description:
        "Build a custom Claude Project that automates a task you do at least once a week. No coding required — just a Claude account and what you learned about prompting.",
      url: "https://claude.ai/",
    };
  }

  if ((goal === "build-apps" || goal === "side-project" || goal === "automate-tasks") && hasCodingBackground) {
    return {
      title: "Your Project: A Claude-Powered CLI Tool",
      description:
        "Build a Node.js or Python CLI tool that calls the Claude API to solve a real problem you have. Anthropic Academy's API courses give you everything you need to start.",
      url: "https://docs.anthropic.com/en/api/getting-started",
    };
  }

  if (goal === "understand-ai" && devBackground >= 2) {
    return {
      title: "Your Project: Reproduce a Zero to Hero Result",
      description:
        "Implement one of Karpathy's models from scratch — micrograd, makemore, or nanoGPT — and write a short plain-English explanation of what you learned and what surprised you.",
      url: "https://github.com/karpathy/nn-zero-to-hero",
    };
  }

  if (goal === "understand-ai") {
    return {
      title: "Your Project: Train and Deploy a Classifier",
      description:
        "Train a simple classifier on a Kaggle dataset and deploy it as a web endpoint using FastAPI or Flask. A real, shippable project that consolidates everything you've learned.",
      url: "https://www.kaggle.com/competitions",
    };
  }

  // Default
  return {
    title: "Your Project: Automate Something Real",
    description:
      "Take the most tedious recurring task in your work or life and build a Claude-powered solution for it. Start with prompting; add code if you want to go further.",
    url: "https://claude.ai/",
  };
}

module.exports = { recommend, generateProfileSummary, getProjectCard };
