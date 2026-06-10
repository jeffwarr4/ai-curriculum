export const QUESTIONS = [
  {
    id: "familiarity",
    question: "How familiar are you with how AI actually works?",
    type: "single",
    options: [
      { value: 0, label: "I've heard the terms but don't really know how it works" },
      { value: 1, label: "I use ChatGPT or Claude regularly but don't understand what's underneath" },
      { value: 2, label: "I understand concepts like LLMs, tokens, and prompting" },
      { value: 3, label: "I have hands-on experience — fine-tuning, APIs, agents" },
    ],
  },
  {
    id: "role",
    question: "Which best describes your current situation?",
    type: "single",
    options: [
      { value: "hs-student", label: "High school student" },
      { value: "college-nontechnical", label: "College student — non-technical major" },
      { value: "cs-student", label: "College student — CS or engineering" },
      { value: "nontechnical-professional", label: "Non-technical professional (marketing, operations, HR, etc.)" },
      { value: "technical-professional", label: "Technical professional (developer, data analyst, engineer)" },
      { value: "other", label: "Other / career changer" },
    ],
  },
  {
    id: "goal",
    question: "What are your main goals with AI right now?",
    type: "multi",
    maxSelect: 2,
    options: [
      { value: "use-ai-at-work", label: "Use AI tools more effectively at work or school — no coding" },
      { value: "automate-tasks", label: "Automate repetitive tasks in my current job" },
      { value: "build-apps", label: "Build AI-powered apps or tools" },
      { value: "understand-ai", label: "Understand AI deeply — research, policy, or genuine curiosity" },
      { value: "side-project", label: "Start a product or side project using AI" },
    ],
  },
  {
    id: "devBackground",
    question: "What's your coding background?",
    type: "single",
    options: [
      { value: 0, label: "No coding experience" },
      { value: 1, label: "Some coding — learned basics, haven't built real projects" },
      { value: 2, label: "Comfortable with one language (Python, JS, etc.)" },
      { value: 3, label: "Professional developer" },
    ],
  },
  {
    id: "timePerWeek",
    question: "How much time can you realistically invest per week?",
    type: "single",
    options: [
      { value: 0, label: "Under 3 hours" },
      { value: 1, label: "3–7 hours" },
      { value: 2, label: "7+ hours" },
    ],
  },
  {
    id: "learningStyle",
    question: "How do you learn best? Pick up to two.",
    type: "multi",
    maxSelect: 2,
    options: [
      { value: "video", label: "I prefer watching video lectures" },
      { value: "reading", label: "I learn best by reading and doing exercises" },
      { value: "build-fast", label: "I want to build something as fast as possible" },
      { value: "structured", label: "I like structured courses with clear progress tracking" },
    ],
  },
];
