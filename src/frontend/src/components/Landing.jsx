import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing({ onStart }) {
  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-logo">pathfinder<span className="logo-dot">.</span>ai</div>
      </header>

      <main className="landing-main">
        <div className="landing-content">
          <p className="landing-eyebrow">Free · No sign-up · No upsells</p>
          <h1 className="landing-headline">
            An honest learning path<br />
            <span className="headline-accent">for people who want to actually understand AI</span>
          </h1>
          <p className="landing-subhead">
            Six questions. A personalized curriculum built from real, free courses.
            Not a certificate farm — an actual path to building something.
          </p>

          <button className="landing-cta" onClick={onStart}>
            Build my learning path
            <span className="cta-arrow">→</span>
          </button>

          <p className="landing-meta">Takes about 2 minutes · No email required</p>

          <Link to="/discover" className="landing-secondary-link">
            Rather learn by building something?
            <span className="cta-arrow">→</span>
          </Link>
        </div>

        <div className="landing-sources">
          <p className="sources-label">Curated from</p>
          <div className="sources-list">
            {[
              "Anthropic Academy",
              "fast.ai",
              "DeepLearning.AI",
              "Kaggle",
              "Harvard CS50",
              "Google ML",
              "Karpathy",
              "Hugging Face",
            ].map((s) => (
              <span key={s} className="source-chip">{s}</span>
            ))}
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <p>Built as an alternative to low-quality "get rich with AI" courses. All courses linked are genuinely free.</p>
      </footer>
    </div>
  );
}
