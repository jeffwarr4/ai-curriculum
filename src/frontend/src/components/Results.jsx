import { useState, useEffect } from "react";
import "./Results.css";

const HOURS_PER_WEEK = { 0: 2, 1: 5, 2: 9 };

function paceLabel(durationHours, timePerWeek) {
  const hrs = HOURS_PER_WEEK[timePerWeek];
  if (!hrs) return null;
  const weeks = Math.ceil(durationHours / hrs);
  return `~${weeks} week${weeks === 1 ? "" : "s"} at your pace`;
}

const ACCESS_BADGES = {
  free: null,
  free_account: { label: "Free account required", color: "gray" },
  free_with_upsell: { label: "Free · expect upgrade prompts", color: "amber" },
  free_audit: { label: "Free audit · no certificate", color: "gray" },
};

const DIFFICULTY_LABELS = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function AccessBadge({ accessModel, accessNote }) {
  const badge = ACCESS_BADGES[accessModel];
  if (!badge) return null;

  return (
    <div className="access-info">
      <span className={`access-badge access-badge--${badge.color}`}>
        {badge.label}
      </span>
      {accessNote && <p className="access-note">{accessNote}</p>}
    </div>
  );
}

function CourseCard({ course, index, timePerWeek }) {
  const pace = paceLabel(course.duration_hours, timePerWeek);
  return (
    <div className="course-card">
      <div className="course-card-header">
        <span className="course-number">{String(index + 1).padStart(2, "0")}</span>
        <div className="course-card-meta">
          <div className="course-title-row">
            <a
              href={course.url}
              target="_blank"
              rel="noopener noreferrer"
              className="course-title"
            >
              {course.title}
            </a>
          </div>
          <div className="course-provider-row">
            <span className="course-provider">{course.provider}</span>
            <AccessBadge
              accessModel={course.access_model}
              accessNote={course.access_note}
            />
          </div>
        </div>
      </div>

      <div className="course-badges">
        <span className="badge badge--hours">
          {course.duration_hours}h estimated
        </span>
        {pace && (
          <span className="badge badge--pace">{pace}</span>
        )}
        <span className={`badge badge--difficulty badge--${course.difficulty}`}>
          {DIFFICULTY_LABELS[course.difficulty]}
        </span>
        <span className="badge badge--type">
          {course.type}
        </span>
      </div>

      <p className="course-description">{course.description}</p>

      {course.whyForYou && (
        <p className="course-why">
          <span className="why-label">Why this for you</span>
          {course.whyForYou}
        </p>
      )}
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <div className="project-card">
      <div className="project-card-label">Your Project</div>
      <h3 className="project-card-title">{project.title}</h3>
      <p className="project-card-desc">{project.description}</p>
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        className="project-card-link"
      >
        Get started →
      </a>
    </div>
  );
}

export default function Results({ answers }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [shareLabel, setShareLabel] = useState("Share this path");
  const [discoverState, setDiscoverState] = useState("idle");
  const [discoverCourses, setDiscoverCourses] = useState([]);

  useEffect(() => {
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Something went wrong. Please refresh and try again."))
      .finally(() => setLoading(false));
  }, [answers]);

  function handleShare() {
    const params = new URLSearchParams(
      Object.entries(answers).map(([k, v]) => [k, JSON.stringify(v)])
    );
    const url = `${window.location.origin}?answers=${encodeURIComponent(params.toString())}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareLabel("Link copied!");
      setTimeout(() => setShareLabel("Share this path"), 2000);
    });
  }

  function handleFeedbackSubmit() {
    if (!feedback.trim()) return;
    fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, feedback }),
    }).then(() => setFeedbackSent(true));
  }

  if (loading) {
    return (
      <div className="results-loading">
        <div className="loading-spinner" />
        <p>Building your path…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-error">
        <p>{error}</p>
      </div>
    );
  }

  const { courses, profileSummary, projectCard } = data;
  const nonProjectCourses = courses.filter((c) => c.type !== "project");
  const totalHours = nonProjectCourses.reduce((sum, c) => sum + c.duration_hours, 0);
  const totalPace = paceLabel(totalHours, answers.timePerWeek);

  async function handleDiscover() {
    setDiscoverState("loading");
    try {
      const r = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, courses: nonProjectCourses }),
      });
      const d = await r.json();
      if (d.error || !d.courses) {
        setDiscoverState("error");
      } else {
        setDiscoverCourses(d.courses);
        setDiscoverState("done");
      }
    } catch {
      setDiscoverState("error");
    }
  }

  return (
    <div className="results">
      <header className="results-header">
        <div className="results-logo">pathfinder<span className="logo-dot">.</span>ai</div>
        <button className="share-btn" onClick={handleShare}>
          {shareLabel}
        </button>
      </header>

      <main className="results-main">
        <div className="profile-summary">
          <p className="profile-eyebrow">Your learning profile</p>
          <p className="profile-text">{profileSummary}</p>
        </div>

        <div className="courses-section">
          <h2 className="section-title">Start Here</h2>
          <p className="section-sub">
            Ordered by prerequisite chain. Each course unlocks the next.
            {totalPace && <> Total: <strong>{totalPace}</strong>.</>}
          </p>
          <div className="courses-list">
            {nonProjectCourses.map((course, i) => (
              <CourseCard key={course.id} course={course} index={i} timePerWeek={answers.timePerWeek} />
            ))}
          </div>
        </div>

        <div className="go-deeper-section">
          <div className="go-deeper-header">
            <div>
              <h2 className="section-title">Go Deeper</h2>
              <p className="section-sub">
                Searched in real time · may include newer resources not in our curated list
              </p>
            </div>
            {discoverState === "idle" && (
              <button className="go-deeper-btn" onClick={handleDiscover}>
                Find more courses →
              </button>
            )}
          </div>

          {discoverState === "loading" && (
            <div className="go-deeper-loading">
              <div className="loading-spinner" />
              <span>Searching for more courses…</span>
            </div>
          )}

          {(discoverState === "done" || discoverState === "error") && discoverCourses.length === 0 && (
            <p className="go-deeper-empty">No additional courses found for this profile.</p>
          )}

          {discoverState === "done" && discoverCourses.length > 0 && (
            <div className="courses-list">
              {discoverCourses.map((course, i) => (
                <CourseCard key={course.id} course={course} index={i} timePerWeek={answers.timePerWeek} />
              ))}
            </div>
          )}
        </div>

        {projectCard && (
          <div className="project-section">
            <ProjectCard project={projectCard} />
          </div>
        )}

        <div className="feedback-section">
          <h3 className="feedback-title">Anything else about what you're trying to do?</h3>
          <p className="feedback-sub">
            Optional — helps improve the curriculum for everyone.
          </p>
          {feedbackSent ? (
            <p className="feedback-thanks">Thanks — noted.</p>
          ) : (
            <div className="feedback-form">
              <textarea
                className="feedback-textarea"
                placeholder="e.g. I'm a nurse trying to automate administrative tasks, not a tech person"
                rows={3}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button
                className="feedback-submit"
                onClick={handleFeedbackSubmit}
                disabled={!feedback.trim()}
              >
                Send feedback
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="results-footer">
        <p>All courses linked are free. Access badges indicate friction honestly — no surprises mid-course.</p>
      </footer>
    </div>
  );
}
