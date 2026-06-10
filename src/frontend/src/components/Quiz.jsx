import { useState } from "react";
import { QUESTIONS } from "../questions";
import "./Quiz.css";

export default function Quiz({ onComplete }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  const question = QUESTIONS[step];
  const current = answers[question.id];
  const total = QUESTIONS.length;

  const canAdvance =
    question.type === "single"
      ? current !== undefined && current !== null
      : Array.isArray(current) && current.length > 0;

  function handleSingleSelect(value) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }

  function handleMultiSelect(value) {
    const max = question.maxSelect || 2;
    setAnswers((prev) => {
      const existing = prev[question.id] || [];
      if (existing.includes(value)) {
        return { ...prev, [question.id]: existing.filter((v) => v !== value) };
      }
      if (existing.length >= max) return prev;
      return { ...prev, [question.id]: [...existing, value] };
    });
  }

  function handleNext() {
    if (!canAdvance) return;
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete(answers);
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  const isSelected = (value) => {
    if (question.type === "single") return current === value;
    return Array.isArray(current) && current.includes(value);
  };

  return (
    <div className="quiz">
      <header className="quiz-header">
        <div className="quiz-logo">pathfinder<span className="logo-dot">.</span>ai</div>
        <div className="quiz-progress-text">
          Step {step + 1} of {total}
        </div>
      </header>

      <div className="quiz-progress-bar">
        <div
          className="quiz-progress-fill"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>

      <main className="quiz-main">
        <div className="quiz-question-block">
          <p className="quiz-step-label">Question {step + 1}</p>
          <h2 className="quiz-question">{question.question}</h2>
          {question.type === "multi" && (
            <p className="quiz-multi-hint">Pick up to {question.maxSelect}</p>
          )}
        </div>

        <div className="quiz-options">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              className={`quiz-option ${isSelected(opt.value) ? "selected" : ""}`}
              onClick={() =>
                question.type === "single"
                  ? handleSingleSelect(opt.value)
                  : handleMultiSelect(opt.value)
              }
            >
              <span className="option-indicator">
                {isSelected(opt.value) ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" fill="var(--accent)" />
                    <path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="var(--border-hover)" strokeWidth="1.5" />
                  </svg>
                )}
              </span>
              <span className="option-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="quiz-nav">
          {step > 0 && (
            <button className="quiz-back" onClick={handleBack}>
              ← Back
            </button>
          )}
          <button
            className={`quiz-next ${canAdvance ? "active" : ""}`}
            onClick={handleNext}
            disabled={!canAdvance}
          >
            {step < total - 1 ? "Continue" : "Show my path"}
            <span> →</span>
          </button>
        </div>
      </main>
    </div>
  );
}
