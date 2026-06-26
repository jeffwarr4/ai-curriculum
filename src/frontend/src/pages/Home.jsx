import { useState, useEffect } from "react";
import Landing from "../components/Landing";
import Quiz from "../components/Quiz";
import Results from "../components/Results";

const STAGES = { landing: "landing", quiz: "quiz", results: "results" };

function parseAnswersFromURL() {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("answers");
  if (!encoded) return null;
  try {
    const inner = new URLSearchParams(encoded);
    const answers = {};
    for (const [k, v] of inner.entries()) {
      answers[k] = JSON.parse(v);
    }
    return answers;
  } catch {
    return null;
  }
}

export default function Home() {
  const [stage, setStage] = useState(STAGES.landing);
  const [answers, setAnswers] = useState(null);

  useEffect(() => {
    const prefilled = parseAnswersFromURL();
    if (prefilled) {
      setAnswers(prefilled);
      setStage(STAGES.results);
    }
  }, []);

  function handleQuizComplete(quizAnswers) {
    setAnswers(quizAnswers);
    setStage(STAGES.results);
  }

  if (stage === STAGES.results && answers) {
    return <Results answers={answers} />;
  }

  if (stage === STAGES.quiz) {
    return <Quiz onComplete={handleQuizComplete} />;
  }

  return <Landing onStart={() => setStage(STAGES.quiz)} />;
}
